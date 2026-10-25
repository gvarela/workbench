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

# ------------------------------------------------- hostile repository config
# Local config names an fsmonitor hook and filter/diff drivers that would
# create sentinel files; committed .gitattributes and .git/info/attributes
# route test files through them. None of them may run.
HOST="$TMP_ROOT/hostile"
SENT="$TMP_ROOT/hostile-sentinel"
mkdir -p "$HOST/spec" && cd "$HOST" || exit 1
git init -q .
printf 'describe "a" do\nend\n' > spec/a_spec.rb
printf 'spec/* filter=evil diff=evil\n' > .gitattributes
git add -A && git commit -q -m start
START_H="$(git rev-parse HEAD)"
printf '#!/bin/sh\ntouch "%s.fsmonitor"\nexit 1\n' "$SENT" > "$TMP_ROOT/fsmon.sh"
chmod +x "$TMP_ROOT/fsmon.sh"
git config core.fsmonitor "$TMP_ROOT/fsmon.sh"
git config filter.evil.clean "sh -c 'touch $SENT.clean; cat'"
git config filter.evil.smudge "sh -c 'touch $SENT.smudge; cat'"
git config diff.evil.textconv "sh -c 'touch $SENT.textconv; cat'"
git config core.pager "sh -c 'touch $SENT.pager; cat'"
printf 'spec/* filter=evil diff=evil\n' > .git/info/attributes
printf 'describe "a" do\n  xit "x" do\n  end\nend\n' > spec/a_spec.rb
sleep 1
touch spec/a_spec.rb
OUT_H="$(run --start "$START_H" --red "$START_H:spec/a_spec.rb")"
check "$OUT_H" '[c for c in d["changed_tests"] if c["path"]=="spec/a_spec.rb"] and [m for m in d["added_skip_markers"] if m["path"]=="spec/a_spec.rb"]' \
    "hostile config: the change is still reported"
for s in fsmonitor clean smudge textconv pager; do
    [ ! -e "$SENT.$s" ] && ok "hostile config: the $s command did not run" || fail "hostile config: the $s command did not run"
done

# ------------------------------------------------- mechanical changes
# "reorder" only when every moved line is an import/require line (the other
# lines keep their order); "whitespace" only for leading/trailing whitespace,
# blank lines, and line endings. Renamed, deleted, and new files, and any
# other change, are not mechanical.
MECH="$TMP_ROOT/mech"
mkdir -p "$MECH/tests" && cd "$MECH" || exit 1
git init -q .
printf 'import os\nimport sys\n\n\ndef test_a():\n    assert os and sys\n' > tests/test_reorder.py
printf 'def test_b():\n    x = 1\n    assert x == 1\n' > tests/test_ws.py
printf 'def test_c():\n    assert True\n' > tests/test_crlf.py
printf 'import os\nimport sys\n\n\ndef test_d():\n    assert 1 == 1\n' > tests/test_mixed.py
printf 'def test_e():\n    assert 1 == 1\n' > tests/test_real.py
printf 'import a\nimport b\n' > tests/test_committed.py
printf 'def test_f():\n    pass\n' > tests/test_old.py
printf 'def test_g():\n    pass\n' > tests/test_gone.py
printf 'def test_h():\n    pass\n' > tests/test_mode.py
printf 'def test_act():\n    x = make()\n    assert x\n' > tests/test_act.py
printf 'def test_swap():\n    a = 1\n    b = 2\n    assert a < b\n' > tests/test_swap.py
printf 'import os\nimport sys\n\n\ndef test_i():\n    x = os.sep\n    assert x\n' > tests/test_imp_act.py
printf 'def test_s():\n    assert f() == "a b"\n' > tests/test_str.py
printf 'def test_w():\n    with ctx():\n        x = f()\n    assert x\n' > tests/test_dedent.py
printf "test('t', () => {\n  expect(1).toBe(1);\n});\n" > tests/indent.test.js
# strict reorder: forms that do not qualify
printf 'import os as o\nimport sys\n\n\ndef test():\n    pass\n' > tests/test_alias.py
printf 'from a import b as c\nfrom d import e\n\n\ndef test():\n    pass\n' > tests/test_from_alias.py
printf 'from a import b, c\nimport d\n\n\ndef test():\n    pass\n' > tests/test_multi.py
printf 'import os\nimport sys\nimport os\n\n\ndef test():\n    pass\n' > tests/test_dup.py
printf 'try:\n    import a\n    import b\nexcept ImportError:\n    pass\n' > tests/test_cond.py
printf 'import os\n\n\ndef f():\n    pass\n\n\nimport sys\n' > tests/test_late.py
printf "import './setup';\nimport x from 'x';\n\ntest('t', () => {});\n" > tests/side.test.js
printf "import {a as b} from 'm';\nimport * as ns from 'n';\n\ntest('t', () => {});\n" > tests/alias.test.js
printf "require('x');\nrequire('y');\n\ntest('t', () => {});\n" > tests/bare.test.js
printf 'package calc\n\nimport (\n\t_ "embed"\n\t"os"\n)\n\nfunc TestY(t *testing.T) { _ = os.Args }\n' > tests/embed_test.go
# strict reorder: forms that qualify
printf 'from a import b\nfrom c import d\n\n\ndef test():\n    pass\n' > tests/test_from.py
printf 'package app;\n\nimport java.util.List;\nimport java.util.Map;\n\nclass AppTest {}\n' > tests/AppTest.java
printf 'package app;\n\nimport java.util.List;\nimport java.awt.List;\n\nclass ListTest {}\n' > tests/ListTest.java
printf 'using System;\nusing System.Linq;\n\nclass T {}\n' > tests/T.cs
printf 'use std::fmt;\nuse std::io;\n\nfn t() {}\n' > tests/t.rs
# shared first or last components (or a dotted Python import): not mechanical
printf 'import a.b\nimport a.c\n\n\ndef test():\n    pass\n' > tests/test_dotted.py
printf 'package app;\n\nimport p.One;\nimport q.One;\n\nclass OneTest {}\n' > tests/OneTest.java
printf 'use a::X;\nuse b::X;\n\nfn t() {}\n' > tests/x.rs
printf 'package calc\n\nimport (\n\t"x/log"\n\t"y/log"\n)\n\nfunc TestL(t *testing.T) {}\n' > tests/log_test.go
# end-of-file newline: inside a literal it matters, outside it is whitespace
printf 'const s = `\nabc`;' > tests/eof.test.js
printf 'test("t", () => {});' > tests/eof2.test.js
# whitespace inside a template literal; YAML and make indentation
printf 'const s = `\n  a  b\n`;\ntest("t", () => expect(s).toBeTruthy());\n' > tests/tpl.test.js
printf 'a:\n  b: 1\n' > tests/data.yml
printf 'a:\n  b: 1\n' > tests/data2.yml
printf 't:\n\techo hi\n' > tests/Makefile
printf 't:\n\techo hi\n' > tests/sub.mk
printf "const b = require('b');\nimport x from 'x';\nimport {y} from 'y';\n\ntest('t', () => { expect(x).toBe(b); });\n" > tests/sample.test.js
printf 'package calc\n\nimport (\n\t"os"\n\t"fmt"\n)\n\nfunc TestX(t *testing.T) { _ = os.Args; fmt.Println() }\n' > tests/calc_test.go
printf "require 'b'\nrequire_relative 'a'\n\nclass T < Minitest::Test\n  def test_x; assert true; end\nend\n" > tests/test_r.rb
git add -A && git commit -q -m start
START_M="$(git rev-parse HEAD)"
# committed after the start: a pure import reorder
printf 'import b\nimport a\n' > tests/test_committed.py
git add -A && git commit -q -m 'reorder imports'
# working-tree changes
printf 'import sys\nimport os\n\n\ndef test_a():\n    assert os and sys\n' > tests/test_reorder.py
printf 'def test_b():\n\n    x = 1   \n    assert x == 1\n\n' > tests/test_ws.py
printf 'def test_c():\r\n    assert True\r\n' > tests/test_crlf.py
printf 'import sys\nimport os\n\n\ndef test_d():\n    assert 1 == 2\n' > tests/test_mixed.py
printf 'def test_e():\n    assert 2 == 2\n' > tests/test_real.py
git mv tests/test_old.py tests/test_renamed.py
git rm -q tests/test_gone.py
printf 'def test_new():\n    pass\n' > tests/test_brand_new.py
chmod +x tests/test_mode.py
printf 'def test_act():\n    assert x\n    x = make()\n' > tests/test_act.py
printf 'def test_swap():\n    b = 2\n    a = 1\n    assert a < b\n' > tests/test_swap.py
printf 'import sys\nimport os\n\n\ndef test_i():\n    assert x\n    x = os.sep\n' > tests/test_imp_act.py
printf 'def test_s():\n    assert f() == "ab"\n' > tests/test_str.py
printf 'def test_w():\n    with ctx():\n    x = f()\n    assert x\n' > tests/test_dedent.py
printf "test('t', () => {\n        expect(1).toBe(1);\n});\n" > tests/indent.test.js
printf 'import sys\nimport os as o\n\n\ndef test():\n    pass\n' > tests/test_alias.py
printf 'from d import e\nfrom a import b as c\n\n\ndef test():\n    pass\n' > tests/test_from_alias.py
printf 'import d\nfrom a import b, c\n\n\ndef test():\n    pass\n' > tests/test_multi.py
printf 'import os\nimport os\nimport sys\n\n\ndef test():\n    pass\n' > tests/test_dup.py
printf 'try:\n    import b\n    import a\nexcept ImportError:\n    pass\n' > tests/test_cond.py
printf 'import sys\nimport os\n\n\ndef f():\n    pass\n\n\n' > tests/test_late.py
printf "import x from 'x';\nimport './setup';\n\ntest('t', () => {});\n" > tests/side.test.js
printf "import * as ns from 'n';\nimport {a as b} from 'm';\n\ntest('t', () => {});\n" > tests/alias.test.js
printf "require('y');\nrequire('x');\n\ntest('t', () => {});\n" > tests/bare.test.js
printf 'package calc\n\nimport (\n\t"os"\n\t_ "embed"\n)\n\nfunc TestY(t *testing.T) { _ = os.Args }\n' > tests/embed_test.go
printf 'from c import d\nfrom a import b\n\n\ndef test():\n    pass\n' > tests/test_from.py
printf 'package app;\n\nimport java.util.Map;\nimport java.util.List;\n\nclass AppTest {}\n' > tests/AppTest.java
printf 'package app;\n\nimport java.awt.List;\nimport java.util.List;\n\nclass ListTest {}\n' > tests/ListTest.java
printf 'using System.Linq;\nusing System;\n\nclass T {}\n' > tests/T.cs
printf 'use std::io;\nuse std::fmt;\n\nfn t() {}\n' > tests/t.rs
printf 'import a.c\nimport a.b\n\n\ndef test():\n    pass\n' > tests/test_dotted.py
printf 'package app;\n\nimport q.One;\nimport p.One;\n\nclass OneTest {}\n' > tests/OneTest.java
printf 'use b::X;\nuse a::X;\n\nfn t() {}\n' > tests/x.rs
printf 'package calc\n\nimport (\n\t"y/log"\n\t"x/log"\n)\n\nfunc TestL(t *testing.T) {}\n' > tests/log_test.go
printf 'const s = `\nabc`;\n' > tests/eof.test.js
printf 'test("t", () => {});\n' > tests/eof2.test.js
printf 'const s = `\n    a  b\n`;\ntest("t", () => expect(s).toBeTruthy());\n' > tests/tpl.test.js
printf 'a:\nb: 1\n' > tests/data.yml
printf 'a:   \n  b: 1\n' > tests/data2.yml
printf 't:\n    echo hi\n' > tests/Makefile
printf 't:   \n\techo hi\n' > tests/sub.mk
printf "import {y} from 'y';\nimport x from 'x';\nconst b = require('b');\n\ntest('t', () => { expect(x).toBe(b); });\n" > tests/sample.test.js
printf 'package calc\n\nimport (\n\t"fmt"\n\t"os"\n)\n\nfunc TestX(t *testing.T) { _ = os.Args; fmt.Println() }\n' > tests/calc_test.go
printf "require_relative 'a'\nrequire 'b'\n\nclass T < Minitest::Test\n  def test_x; assert true; end\nend\n" > tests/test_r.rb
sleep 1
touch tests/test_real.py
INDEX_BEFORE_M="$(mtime .git/index)"
mech_of() { printf 'next((c.get("mechanical","MISSING") for c in d["changed_tests"] if c["path"]=="%s"), "ABSENT")' "$1"; }
OUT_M="$(run --start "$START_M" --declared-path tests/test_real.py)"
INDEX_AFTER_M="$(mtime .git/index)"
check "$OUT_M" "$(mech_of tests/test_reorder.py)==\"reorder\"" "mechanical: a Python import re-sort is reorder"
check "$OUT_M" "$(mech_of tests/test_committed.py)==\"reorder\"" "mechanical: an import re-sort committed after the start is reorder"
check "$OUT_M" "$(mech_of tests/sample.test.js)==\"reorder\"" "mechanical: a JavaScript import/require re-sort is reorder"
check "$OUT_M" "$(mech_of tests/calc_test.go)==\"reorder\"" "mechanical: a Go import block re-sort is reorder"
check "$OUT_M" "$(mech_of tests/test_r.rb) is None" "mechanical: a Ruby require re-sort is not mechanical (require has side effects)"
for f in test_alias.py test_from_alias.py test_multi.py test_dup.py test_cond.py test_late.py side.test.js alias.test.js bare.test.js embed_test.go; do
    check "$OUT_M" "$(mech_of "tests/$f") is None" "mechanical: a re-sort involving a non-qualifying import is not mechanical: $f"
done
for f in test_from.py AppTest.java T.cs t.rs; do
    check "$OUT_M" "$(mech_of "tests/$f")==\"reorder\"" "mechanical: a re-sort of plain top-level imports is reorder: $f"
done
check "$OUT_M" "$(mech_of tests/tpl.test.js) is None" "mechanical: a whitespace change inside a template literal is not mechanical"
for f in test_dotted.py OneTest.java ListTest.java x.rs log_test.go; do
    check "$OUT_M" "$(mech_of "tests/$f") is None" "mechanical: two imports binding the same name (or a dotted Python import) are not mechanical: $f"
done
check "$OUT_M" "$(mech_of tests/eof.test.js) is None" "mechanical: a final-newline change after a literal line is not mechanical"
check "$OUT_M" "$(mech_of tests/eof2.test.js)==\"whitespace\"" "mechanical: a final-newline change after an ordinary line is whitespace"
check "$OUT_M" "$(mech_of tests/data.yml) is None" "mechanical: a YAML indentation change is not mechanical"
check "$OUT_M" "$(mech_of tests/data2.yml)==\"whitespace\"" "mechanical: YAML trailing whitespace only is whitespace"
check "$OUT_M" "$(mech_of tests/Makefile) is None" "mechanical: a Makefile indentation change is not mechanical"
check "$OUT_M" "$(mech_of tests/sub.mk)==\"whitespace\"" "mechanical: make trailing whitespace only is whitespace"
check "$OUT_M" "$(mech_of tests/test_act.py) is None" "mechanical: an assertion moved above the act is not mechanical"
check "$OUT_M" "$(mech_of tests/test_swap.py) is None" "mechanical: two assignments swapped is not mechanical"
check "$OUT_M" "$(mech_of tests/test_imp_act.py) is None" "mechanical: an import re-sort plus a moved assertion is not mechanical"
check "$OUT_M" "$(mech_of tests/test_ws.py)==\"whitespace\"" "mechanical: Python trailing whitespace and blank lines only is whitespace"
check "$OUT_M" "$(mech_of tests/test_dedent.py) is None" "mechanical: a Python line dedented out of a with block is not mechanical"
check "$OUT_M" "$(mech_of tests/indent.test.js)==\"whitespace\"" "mechanical: an indentation change where indentation is not syntax (JavaScript) is whitespace"
check "$OUT_M" "$(mech_of tests/test_crlf.py)==\"whitespace\"" "mechanical: CRLF line endings only is whitespace"
check "$OUT_M" "$(mech_of tests/test_str.py) is None" "mechanical: interior whitespace changed inside a string is not mechanical"
check "$OUT_M" "$(mech_of tests/test_mixed.py) is None" "mechanical: an import re-sort that also changes a line is not mechanical"
check "$OUT_M" "$(mech_of tests/test_real.py) is None" "mechanical: a real change is not mechanical"
check "$OUT_M" "$(mech_of tests/test_renamed.py) is None" "mechanical: a renamed file is not mechanical"
check "$OUT_M" "$(mech_of tests/test_gone.py) is None" "mechanical: a deleted file is not mechanical"
check "$OUT_M" "$(mech_of tests/test_brand_new.py) is None" "mechanical: a new file is not mechanical"
check "$OUT_M" "$(mech_of tests/test_mode.py) is None" "mechanical: a mode-only change is not mechanical"
MECH_LIST='["tests/AppTest.java","tests/T.cs","tests/calc_test.go","tests/data2.yml","tests/eof2.test.js","tests/indent.test.js","tests/sample.test.js","tests/sub.mk","tests/t.rs","tests/test_committed.py","tests/test_crlf.py","tests/test_from.py","tests/test_reorder.py","tests/test_ws.py"]'
check "$OUT_M" "sorted(d[\"mechanical_changes\"])==$MECH_LIST" "mechanical: mechanical_changes lists exactly the mechanical paths"
check "$OUT_M" '"tests/test_reorder.py" in d["undeclared_changes"] and "tests/test_ws.py" in d["undeclared_changes"] and d["cleared_mechanical"] is None' "mechanical: without --allow-mechanical, mechanical changes stay undeclared (cleared_mechanical null)"
OUT_MA="$(run --start "$START_M" --declared-path tests/test_real.py --allow-mechanical)"
check "$OUT_MA" "not [p for p in d[\"undeclared_changes\"] if p in $MECH_LIST]" "mechanical: --allow-mechanical removes mechanical paths from undeclared_changes"
check "$OUT_MA" "sorted(d[\"cleared_mechanical\"])==$MECH_LIST" "mechanical: and lists them in cleared_mechanical"
check "$OUT_MA" 'all(p in d["undeclared_changes"] for p in ("tests/test_mixed.py","tests/test_renamed.py","tests/test_brand_new.py","tests/test_mode.py","tests/test_act.py","tests/test_swap.py","tests/test_imp_act.py","tests/test_str.py","tests/test_dedent.py"))' "mechanical: non-mechanical undeclared changes stay undeclared with --allow-mechanical"
check "$OUT_MA" '[c for c in d["changed_tests"] if c["path"]=="tests/test_reorder.py"]' "mechanical: a cleared change is still listed in changed_tests"
check "$(run --start "$START_M" --allow-mechanical)" 'd["undeclared_changes"] is None and d["cleared_mechanical"]==[]' "mechanical: --allow-mechanical without a declared set clears nothing"
[ "$INDEX_BEFORE_M" = "$INDEX_AFTER_M" ] && ok "mechanical: .git/index mtime unchanged" || fail "mechanical: .git/index mtime unchanged"

# ------------------------------------------------- startup environment
# Run directly, by its shebang: BASH_ENV/ENV are not sourced, exported
# functions are not imported, and inherited GIT_* variables do not steer git.
cd "$REPO" || exit 1
printf 'touch "%s"\n' "$TMP_ROOT/ti-bashenv-ran" > "$TMP_ROOT/ti-bashenv.sh"
BASH_ENV="$TMP_ROOT/ti-bashenv.sh" ENV="$TMP_ROOT/ti-bashenv.sh" "$SCRIPT" --start "$START" >/dev/null 2>&1
[ ! -e "$TMP_ROOT/ti-bashenv-ran" ] && ok "startup: BASH_ENV and ENV are not sourced" || fail "startup: BASH_ENV and ENV are not sourced"
(
    eval "git() { touch '$TMP_ROOT/ti-func-ran'; command git \"\$@\"; }"
    export -f git
    "$SCRIPT" --start "$START" >/dev/null 2>&1
)
[ ! -e "$TMP_ROOT/ti-func-ran" ] && ok "startup: exported shell functions are not imported" || fail "startup: exported shell functions are not imported"
OUT_GD="$(GIT_DIR="$TMP_ROOT/nowhere" GIT_WORK_TREE="$TMP_ROOT/nowhere" run --start "$START")"
check "$OUT_GD" 'd["errors"] == [] and [c for c in d["changed_tests"] if c["path"]=="spec/new_spec.rb"]' \
    "startup: inherited GIT_DIR and GIT_WORK_TREE are ignored"

echo
echo "bash $BASH_VERSION: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
