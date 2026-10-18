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
printf 'describe "b" do\n  xit "later" do\n  end\nend\n' > spec/b_spec.rb
rm -f .git/index

OUT_NOIDX="$(run --start "$START_NOIDX")"
check "$OUT_NOIDX" '[c for c in d["changed_tests"] if c["path"]=="spec/b_spec.rb"]' \
    "without an index, an untracked test file is still reported"
check "$OUT_NOIDX" '[m for m in d["added_skip_markers"] if m["path"]=="spec/b_spec.rb" and m["line"]==2]' \
    "without an index, an added skip marker is still reported"
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

echo
echo "bash $BASH_VERSION: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
