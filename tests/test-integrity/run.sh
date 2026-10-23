#!/usr/bin/env bash
# Tests for plugin/scripts/test-integrity.
#
# Builds scratch git repositories under a temporary directory and checks the
# script's JSON. The script runs under the same bash that runs this file, so
#   /bin/bash tests/test-integrity/run.sh                 (bash 3.2 on macOS)
#   /opt/homebrew/bin/bash tests/test-integrity/run.sh    (bash 5)
# exercise both. python3 is used here only to parse the JSON; the script
# itself must not need it.

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${TEST_INTEGRITY:-$HERE/../../plugin/scripts/test-integrity}"
BASH_BIN="${BASH:-bash}"

export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@example.com
export GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@example.com

TMP_ROOT="$(mktemp -d)" || exit 1
trap 'rm -rf "$TMP_ROOT"' EXIT

PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); echo "ok   - $1"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL - $1"; }

# check <json> <python expression over d> <description>
check() {
    if printf '%s' "$1" | python3 -I -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if eval(sys.argv[1]) else 1)' "$2" 2>/dev/null; then
        ok "$3"
    else
        fail "$3"
    fi
}

mtime() { python3 -I -c 'import os,sys; print(os.stat(sys.argv[1]).st_mtime_ns)' "$1"; }

run() { "$BASH_BIN" "$SCRIPT" "$@"; }

# ---------------------------------------------------------------- fixture
REPO="$TMP_ROOT/repo"
mkdir -p "$REPO" && cd "$REPO" || exit 1
git init -q .
mkdir -p spec tests src __tests__

printf 'def app; end\n' > src/app.rb
printf 'steady\n' > src/steady.rb
printf 'describe "old" do\n  it "a" do\n  end\nend\n' > spec/old_spec.rb
printf 'describe "keep" do\n  it "stays" do\n  end\n  it "drops" do\n  end\nend\n' > spec/keep_spec.rb
printf 'import pytest\n\n@pytest.mark.skip\ndef test_old():\n    pass\n' > tests/test_legacy.py
git add -A && git commit -q -m start
START="$(git rev-parse HEAD)"

printf 'describe "outer" do\n  it "works" do\n  end\nend\n' > spec/outer_spec.rb
printf 'describe "edited" do\n  it "works" do\n    expect(1).to eq(1)\n  end\nend\n' > spec/edited_outer_spec.rb
git add -A && git commit -q -m 'red(AC-1)'
RED="$(git rev-parse HEAD)"

# Working-tree changes since START
printf 'def app; 1; end\n' > src/app.rb
sed 's/eq(1)/eq(2)/' spec/edited_outer_spec.rb > spec/e.tmp && mv spec/e.tmp spec/edited_outer_spec.rb
printf 'describe "new" do\n  xit "pending thing" do\n  end\nend\n' > spec/new_spec.rb
printf 'import pytest\n\n@pytest.mark.skip\ndef test_old():\n    pass\n\n@pytest.mark.skip(reason="x")\ndef test_new():\n    pass\n' > tests/test_legacy.py
printf 'test.only("x", () => {});\n' > __tests__/a.test.js
git rm -q spec/old_spec.rb
printf 'describe "keep" do\n  it "stays" do\n  end\nend\n' > spec/keep_spec.rb
printf 'describe "q" do\n  xit "say \\"hi\\" \\\\ back" do\n  end\nend\n' > 'spec/we"ird_spec.rb'
printf '  xit "a\tb\001c" do\n' > spec/ctl_spec.rb
# Make tracked files stat-dirty so a git command that refreshes the index
# would rewrite it: one added after START, and one unchanged since START
# (diffing START against the work tree refreshes the index for that one even
# with optional locks off).
sleep 1
touch spec/outer_spec.rb src/steady.rb

DECLARED="$TMP_ROOT/declared.txt"
printf 'spec/new_spec.rb\ntests/test_legacy.py\nspec/keep_spec.rb\nspec/old_spec.rb\nspec/edited_outer_spec.rb\nspec/we"ird_spec.rb\n' > "$DECLARED"

STATUS_BEFORE="$(git --no-optional-locks status --porcelain=v1 -z | od -c)"
INDEX_BEFORE="$(mtime .git/index)"

OUT="$(run --start "$START" --red "$RED:spec/outer_spec.rb" --red "$RED:spec/edited_outer_spec.rb" --declared "$DECLARED")"
CODE=$?

STATUS_AFTER="$(git --no-optional-locks status --porcelain=v1 -z | od -c)"
INDEX_AFTER="$(mtime .git/index)"

# ---------------------------------------------------------------- checks
[ "$CODE" = 0 ] && ok "exits 0 on a normal run" || fail "exits 0 on a normal run (got $CODE)"
check "$OUT" 'True' "output parses as JSON"
check "$OUT" 'd["errors"] == []' "no errors on a normal run"

check "$OUT" '[o for o in d["outer_tests"] if o["path"]=="spec/outer_spec.rb" and o["identical"] is True and o["red"]=="'"$RED"'"]' \
    "unchanged outer test is identical to its red commit"
check "$OUT" '[o for o in d["outer_tests"] if o["path"]=="spec/edited_outer_spec.rb" and o["identical"] is False and o["diff_stat"]]' \
    "edited outer test is not identical and carries a diff stat"

check "$OUT" '[c for c in d["changed_tests"] if c["path"]=="spec/new_spec.rb" and c["status"]=="A" and c["tracked"] is False and c["hunks"]==1]' \
    "untracked new test file is listed as untracked"
check "$OUT" '[c for c in d["changed_tests"] if c["path"]=="tests/test_legacy.py" and c["status"]=="M" and c["tracked"] is True and c["hunks"]>=1]' \
    "modified tracked test file is listed with its hunk count"
check "$OUT" 'not [c for c in d["changed_tests"] if c["path"]=="src/app.rb"]' \
    "non-test file is not listed"

check "$OUT" '"__tests__/a.test.js" in d["undeclared_changes"]' "undeclared change is reported"
check "$OUT" '"spec/new_spec.rb" not in d["undeclared_changes"]' "declared change is not reported"

check "$OUT" '[m for m in d["added_skip_markers"] if m["path"]=="spec/new_spec.rb" and m["line"]==2 and "xit" in m["text"]]' \
    "added xit is reported with its line"
check "$OUT" '[m for m in d["added_skip_markers"] if m["path"]=="tests/test_legacy.py" and m["line"]==7 and "@pytest.mark.skip" in m["text"]]' \
    "added @pytest.mark.skip is reported with its line"
check "$OUT" 'not [m for m in d["added_skip_markers"] if m["path"]=="tests/test_legacy.py" and m["line"]==3]' \
    "skip marker already present at the start is not reported"
check "$OUT" '[m for m in d["added_skip_markers"] if m["path"]=="__tests__/a.test.js" and m["line"]==1 and ".only" in m["text"]]' \
    "added .only is reported"

check "$OUT" '[t for t in d["deleted_tests"] if t["path"]=="spec/old_spec.rb" and t["kind"]=="file"]' \
    "deleted test file is reported"
check "$OUT" '[t for t in d["deleted_tests"] if t["path"]=="spec/keep_spec.rb" and t["kind"]=="definition" and t["line"]==4 and "drops" in t["text"]]' \
    "removed test definition is reported with its line in the start commit"

check "$OUT" '[m for m in d["added_skip_markers"] if m["path"]=="spec/we\"ird_spec.rb" and m["text"]=="  xit \"say \\\"hi\\\" \\\\ back\" do"]' \
    "quotes and backslashes in paths and lines are escaped"
check "$OUT" '[m for m in d["added_skip_markers"] if m["path"]=="spec/ctl_spec.rb" and m["text"]=="  xit \"a\tb\x01c\" do"]' \
    "tabs and other control characters in lines are escaped"

[ "$STATUS_BEFORE" = "$STATUS_AFTER" ] && ok "git status unchanged by the script" || fail "git status unchanged by the script"
[ "$INDEX_BEFORE" = "$INDEX_AFTER" ] && ok ".git/index mtime unchanged by the script" || fail ".git/index mtime unchanged by the script"

OUT_SUB="$(cd src && run --start "$START" --red "$RED:spec/outer_spec.rb" --red "$RED:spec/edited_outer_spec.rb" --declared "$DECLARED")"
[ -n "$OUT" ] && [ "$OUT" = "$OUT_SUB" ] && ok "running from a subdirectory gives the same result" || fail "running from a subdirectory gives the same result"

OUT_NODECL="$(run --start "$START")"
check "$OUT_NODECL" 'd["undeclared_changes"] is None' "undeclared_changes is null when no declared list is given"

# --declared-path: declared paths as arguments, no list file.
OUT_DPATH="$(run --start "$START" --red "$RED:spec/outer_spec.rb" --red "$RED:spec/edited_outer_spec.rb" \
    --declared-path spec/new_spec.rb --declared-path tests/test_legacy.py --declared-path spec/keep_spec.rb \
    --declared-path spec/old_spec.rb --declared-path spec/edited_outer_spec.rb --declared-path 'spec/we"ird_spec.rb')"
[ -n "$OUT" ] && [ "$OUT" = "$OUT_DPATH" ] && ok "--declared-path gives the same result as the same list in --declared" ||
    fail "--declared-path gives the same result as the same list in --declared"
OUT_MIX="$(run --start "$START" --declared-path ./spec/new_spec.rb --declared "$DECLARED")"
check "$OUT_MIX" '"spec/new_spec.rb" not in d["undeclared_changes"] and "spec/keep_spec.rb" not in d["undeclared_changes"] and "__tests__/a.test.js" in d["undeclared_changes"]' \
    "--declared-path combines with --declared (a leading ./ is dropped)"
OUT_ONE="$(run --start "$START" --declared-path spec/new_spec.rb)"
check "$OUT_ONE" '"spec/new_spec.rb" not in d["undeclared_changes"] and "tests/test_legacy.py" in d["undeclared_changes"]' \
    "--declared-path alone: only the named path counts as declared"
OUT_NONE="$(run --start "$START" --declared-none)"
check "$OUT_NONE" 'd["undeclared_changes"] is not None and "spec/new_spec.rb" in d["undeclared_changes"] and "__tests__/a.test.js" in d["undeclared_changes"]' \
    "--declared-none: an empty declared set, so every changed test file is undeclared"
run --start "$START" --declared-path >/dev/null 2>&1
CODE=$?
[ "$CODE" = 2 ] && ok "--declared-path without a value is a usage error (exit 2)" || fail "--declared-path without a value is a usage error (exit 2, got $CODE)"
run --start "$START" --declared-path "" >/dev/null 2>&1
CODE=$?
[ "$CODE" = 2 ] && ok "--declared-path with an empty value is a usage error (exit 2)" || fail "--declared-path with an empty value is a usage error (exit 2, got $CODE)"

# --test-paths naming an existing directory without its trailing slash means that directory.
check "$(run --start "$START" --test-paths tests)" '[c for c in d["changed_tests"] if c["path"]=="tests/test_legacy.py"]' \
    "--test-paths naming a directory without a trailing slash counts files under it"
check "$(cd src && run --start "$START" --test-paths tests)" '[c for c in d["changed_tests"] if c["path"]=="tests/test_legacy.py"]' \
    "--test-paths directory without a slash is resolved from the repository root"

run --red "$RED:spec/outer_spec.rb" >/dev/null 2>&1
CODE=$?
[ "$CODE" = 2 ] && ok "missing --start is a usage error (exit 2)" || fail "missing --start is a usage error (exit 2, got $CODE)"

check "$OUT" '[o for o in d["outer_tests"] if o["path"]=="spec/edited_outer_spec.rb" and o["diff_stat"]=="+1 -1"]' \
    "edited outer test's diff stat counts the changed line"

# ---------------------------------------------------------------- no index
NOIDX="$TMP_ROOT/noidx"
mkdir -p "$NOIDX/spec" && cd "$NOIDX" || exit 1
git init -q .
printf 'describe "a" do\nend\n' > spec/a_spec.rb
git add -A && git commit -q -m start
START_NOIDX="$(git rev-parse HEAD)"
printf 'describe "c" do\nend\n' > spec/c_spec.rb
git add -A && git commit -q -m 'after start'
printf 'describe "b" do\n  xit "later" do\n  end\nend\n' > spec/b_spec.rb
rm -f .git/index

OUT_NOIDX="$(run --start "$START_NOIDX")"
check "$OUT_NOIDX" '[c for c in d["changed_tests"] if c["path"]=="spec/b_spec.rb"]' \
    "without an index, an untracked test file is still reported"
check "$OUT_NOIDX" '[m for m in d["added_skip_markers"] if m["path"]=="spec/b_spec.rb" and m["line"]==2]' \
    "without an index, an added skip marker is still reported"
check "$OUT_NOIDX" 'not [t for t in d["deleted_tests"] if t["path"]=="spec/a_spec.rb"]' \
    "without an index, an unchanged tracked test is not listed as deleted"
check "$OUT_NOIDX" 'not [c for c in d["changed_tests"] if c["path"]=="spec/a_spec.rb"]' \
    "without an index, an unchanged tracked test is not listed as changed"
check "$OUT_NOIDX" '[c for c in d["changed_tests"] if c["path"]=="spec/c_spec.rb" and c["tracked"] is True]' \
    "without an index, a test committed after the start is tracked, as with a real index"
check "$OUT_NOIDX" 'd["errors"] == []' \
    "without an index, a successful rebuild leaves errors empty (every check was made)"
[ ! -e .git/index ] && ok "without an index, none is created" || fail "without an index, none is created"

# ------------------------------------------------- same-second (racy) edit
# A same-size edit whose mtime equals the index's mtime is "racily clean":
# git must compare content to see it. Pin the times so the case is exact.
RACY="$TMP_ROOT/racy"
mkdir -p "$RACY/tests" && cd "$RACY" || exit 1
git init -q .
git config core.trustctime false
printf 'aaa\n' > tests/test_r.py
touch -t 202001010000.00 tests/test_r.py
git add -A && git commit -q -m start
START_RACY="$(git rev-parse HEAD)"
printf 'bbb\n' > tests/test_r.py
touch -t 202001010000.00 tests/test_r.py .git/index

OUT_RACY="$(run --start "$START_RACY" --red "$START_RACY:tests/test_r.py")"
check "$OUT_RACY" '[o for o in d["outer_tests"] if o["path"]=="tests/test_r.py" and o["identical"] is False and o["diff_stat"]=="+1 -1"]' \
    "a same-second, same-size edit of an outer test is seen"
check "$OUT_RACY" '[c for c in d["changed_tests"] if c["path"]=="tests/test_r.py"]' \
    "a same-second, same-size edit of a test file is listed as changed"

# ------------------------------------------------- shared outer test file
# Two criteria whose outer tests share one file, committed one at a time:
# each red commit adds only its own test, so each is checked line by line.
SHARED="$TMP_ROOT/shared"
mkdir -p "$SHARED/spec" "$SHARED/src" && cd "$SHARED" || exit 1
git init -q .
printf 'describe "s" do\nend\n' > spec/shared_spec.rb
printf 'x\n' > src/x.rb
git add -A && git commit -q -m start
START_SH="$(git rev-parse HEAD)"
printf 'describe "s" do\n  it "ac1" do\n    expect(1).to eq(1)\n  end\nend\n' > spec/shared_spec.rb
printf 'describe "solo" do\nend\n' > spec/solo_spec.rb
git add -A && git commit -q -m 'red(AC-1)'
RED1="$(git rev-parse HEAD)"
printf 'describe "s" do\n  it "ac1" do\n    expect(1).to eq(1)\n  end\n  it "ac2" do\n    expect(2).to eq(2)\n  end\nend\n' > spec/shared_spec.rb
git add -A && git commit -q -m 'red(AC-2)'
RED2="$(git rev-parse HEAD)"
printf 'y\n' > src/x.rb
git add -A && git commit -q -m 'green'
GREEN_SH="$(git rev-parse HEAD)"

shared_run() { run --start "$START_SH" --red "$RED1:spec/shared_spec.rb" --red "$RED2:spec/shared_spec.rb" --red "$RED1:spec/solo_spec.rb" "$@"; }
ac() { printf 'd["outer_tests"][%s]' "$1"; }

sleep 1
touch spec/shared_spec.rb spec/solo_spec.rb
INDEX_BEFORE_SH="$(mtime .git/index)"
OUT_SH="$(shared_run)"
INDEX_AFTER_SH="$(mtime .git/index)"
check "$OUT_SH" 'd["errors"] == []' "shared file: no errors"
check "$OUT_SH" "$(ac 0)[\"identical\"] is True and $(ac 0)[\"mode\"]==\"lines\" and $(ac 0)[\"changed_lines\"]==0" \
    "shared file, untouched: AC-1 identical by lines"
check "$OUT_SH" "$(ac 1)[\"identical\"] is True and $(ac 1)[\"mode\"]==\"lines\"" \
    "shared file, untouched: AC-2 identical by lines"
check "$OUT_SH" "$(ac 2)[\"identical\"] is True and $(ac 2)[\"mode\"]==\"file\" and $(ac 2)[\"path\"]==\"spec/solo_spec.rb\"" \
    "unshared file, unchanged: identical by whole file"
[ "$INDEX_BEFORE_SH" = "$INDEX_AFTER_SH" ] && ok "shared file: .git/index mtime unchanged by the script" || fail "shared file: .git/index mtime unchanged by the script"

# A later test appended to the file (committed, then also uncommitted).
printf 'describe "s" do\n  it "ac1" do\n    expect(1).to eq(1)\n  end\n  it "ac2" do\n    expect(2).to eq(2)\n  end\n  it "later" do\n  end\nend\n' > spec/shared_spec.rb
git add -A && git commit -q -m 'later test'
printf '# trailing note\n' >> spec/shared_spec.rb
OUT_SH="$(shared_run)"
check "$OUT_SH" "$(ac 0)[\"identical\"] is True and $(ac 1)[\"identical\"] is True" \
    "shared file, unrelated test appended later: both identical"

# An uncommitted edit to one of AC-1's lines.
git checkout -q -- spec/shared_spec.rb
sed 's/eq(1)/eq(9)/' spec/shared_spec.rb > spec/s.tmp && mv spec/s.tmp spec/shared_spec.rb
OUT_SH="$(shared_run)"
check "$OUT_SH" "$(ac 0)[\"identical\"] is False and $(ac 0)[\"changed_lines\"]==1 and $(ac 0)[\"diff_stat\"]" \
    "shared file, AC-1 line edited: AC-1 not identical, one changed line"
check "$OUT_SH" "$(ac 1)[\"identical\"] is True" \
    "shared file, AC-1 line edited: AC-2 still identical"

# AC-1's test deleted.
git checkout -q -- spec/shared_spec.rb
printf 'describe "s" do\n  it "ac2" do\n    expect(2).to eq(2)\n  end\n  it "later" do\n  end\nend\n' > spec/shared_spec.rb
OUT_SH="$(shared_run)"
check "$OUT_SH" "$(ac 0)[\"identical\"] is False and $(ac 0)[\"changed_lines\"]==3" \
    "shared file, AC-1 test deleted: AC-1 not identical"
check "$OUT_SH" "$(ac 1)[\"identical\"] is True" \
    "shared file, AC-1 test deleted: AC-2 still identical"
git checkout -q -- spec/shared_spec.rb

# A red commit that does not touch the shared path, and a root red commit.
OUT_SH="$(run --start "$START_SH" --red "$RED1:spec/shared_spec.rb" --red "$GREEN_SH:spec/shared_spec.rb")"
check "$OUT_SH" "$(ac 1)[\"identical\"] is None and $(ac 1)[\"mode\"]==\"lines\" and [e for e in d[\"errors\"] if \"does not change\" in e]" \
    "shared file, red commit does not touch the path: error and null"
check "$OUT_SH" "$(ac 0)[\"identical\"] is True" \
    "shared file, the other criterion is still checked"
OUT_SH="$(run --start "$START_SH" --red "$START_SH:spec/shared_spec.rb" --red "$RED1:spec/shared_spec.rb")"
check "$OUT_SH" "$(ac 0)[\"identical\"] is None and [e for e in d[\"errors\"] if \"no parent\" in e]" \
    "shared file, root red commit: error and null"
# The same shared file spelled two ways is still one shared file.
OUT_SH="$(run --start "$START_SH" --red "$RED1:./spec/shared_spec.rb" --red "$RED2:spec//shared_spec.rb")"
check "$OUT_SH" 'd["errors"] == [] and all(o["mode"]=="lines" and o["identical"] is True and o["path"]=="spec/shared_spec.rb" for o in d["outer_tests"])' \
    "shared file named with ./ and //: one path, lines mode, both identical"

check "$OUT" '[o for o in d["outer_tests"] if o["path"]=="spec/outer_spec.rb" and o["mode"]=="file" and o["changed_lines"] is None]' \
    "unshared outer test reports mode file"

# ------------------------------------------------- earlier phases' tests
# A plan starts at PLAN_START; phase 1 changes a, b, and d; phase 2 starts at
# PHASE_START, commits a change to d, leaves an uncommitted change to a, and
# adds c. Only a and d were changed before the phase and again in it.
PHASES="$TMP_ROOT/phases"
mkdir -p "$PHASES/spec" "$PHASES/src" && cd "$PHASES" || exit 1
git init -q .
printf 'describe "a" do\nend\n' > spec/a_spec.rb
printf 'describe "b" do\nend\n' > spec/b_spec.rb
printf 'describe "d" do\nend\n' > spec/d_spec.rb
printf 'x\n' > src/x.rb
git add -A && git commit -q -m 'before the plan'
PLAN_START="$(git rev-parse HEAD)"
printf 'describe "a" do\n  it "1" do\n  end\nend\n' > spec/a_spec.rb
printf 'describe "b" do\n  it "1" do\n  end\nend\n' > spec/b_spec.rb
git add -A && git commit -q -m 'phase 1 task 1'
P1A="$(git rev-parse HEAD)"
printf 'describe "d" do\n  it "1" do\n  end\nend\n' > spec/d_spec.rb
printf 'y\n' > src/x.rb
git add -A && git commit -q -m 'phase 1 task 2'
P1B="$(git rev-parse HEAD)"
PHASE_START="$P1B"
printf 'describe "d" do\n  it "2" do\n  end\nend\n' > spec/d_spec.rb
git add -A && git commit -q -m 'phase 2 task 1'
printf 'describe "a" do\n  it "changed" do\n  end\nend\n' > spec/a_spec.rb
printf 'describe "c" do\nend\n' > spec/c_spec.rb
printf 'z\n' > src/x.rb

OUT_PH="$(run --start "$PHASE_START" --plan-start "$PLAN_START")"
check "$OUT_PH" 'd["errors"] == []' "earlier phases: no errors"
check "$OUT_PH" '[e for e in d["earlier_phase_tests"] if e["path"]=="spec/a_spec.rb" and e["earlier_commits"]==["'"$P1A"'"]]' \
    "earlier phases: a test changed before the phase and uncommitted in it is listed with its earlier commit"
check "$OUT_PH" '[e for e in d["earlier_phase_tests"] if e["path"]=="spec/d_spec.rb" and e["earlier_commits"]==["'"$P1B"'"]]' \
    "earlier phases: a test changed before the phase and committed again in it is listed"
check "$OUT_PH" 'not [e for e in d["earlier_phase_tests"] if e["path"]=="spec/b_spec.rb"]' \
    "earlier phases: a test changed only before the phase is not listed"
check "$OUT_PH" 'not [e for e in d["earlier_phase_tests"] if e["path"] in ("spec/c_spec.rb", "src/x.rb")]' \
    "earlier phases: a test new in the phase and a production file are not listed"
check "$(run --start "$PHASE_START")" 'd["earlier_phase_tests"] is None' \
    "earlier phases: null without --plan-start"
check "$(run --start "$PHASE_START" --plan-start no-such-commit)" 'd["earlier_phase_tests"] is None and [e for e in d["errors"] if "plan start commit not found" in e]' \
    "earlier phases: an unknown plan start is an error and null"
check "$(run --start "$PLAN_START" --plan-start "$PHASE_START")" 'd["earlier_phase_tests"] is None and [e for e in d["errors"] if "not an ancestor" in e]' \
    "earlier phases: a plan start after the phase start is an error and null"

echo
echo "bash $BASH_VERSION: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
