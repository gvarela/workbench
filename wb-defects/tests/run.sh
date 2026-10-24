#!/usr/bin/env bash
# Tests for wb-defects/bin/wb-plant-defect.
#
# Builds scratch git repositories (Python, Node, Ruby, Go, shell) under a
# temporary directory and checks the script's JSON. The script runs under the
# same bash that runs this file, so
#   /bin/bash wb-defects/tests/run.sh                 (bash 3.2 on macOS)
#   /opt/homebrew/bin/bash wb-defects/tests/run.sh    (bash 5)
# exercise both. python3 is used here only to parse the JSON. A language
# whose toolchain is missing (Go, usually) is skipped and counted as skipped.
# The test command comes from each fixture's .claude/wb/testing.md profile.

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${PLANT_DEFECT:-$HERE/../bin/wb-plant-defect}"
BASH_BIN="${BASH:-bash}"

export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@example.com
export GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@example.com

TMP_ROOT="$(mktemp -d)" || exit 1
TMP_ROOT="$(cd "$TMP_ROOT" && pwd -P)"
export XDG_CACHE_HOME="$TMP_ROOT/cache"
mkdir -p "$XDG_CACHE_HOME"
# State lives under ${TMPDIR:-/tmp}; point it into the scratch area.
export TMPDIR="$TMP_ROOT/tmpbase"
mkdir -p "$TMPDIR"
DBASE="$TMPDIR"
TAG="pdt$$"
IDS=""

cleanup() {
    local id
    for id in $IDS; do
        "$BASH_BIN" "$SCRIPT" teardown --id "$id" >/dev/null 2>&1
    done
    chmod -R u+w "$TMP_ROOT" 2>/dev/null
    rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

PASS=0
FAIL=0
SKIP=0

ok()   { PASS=$((PASS + 1)); echo "ok   - $1"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL - $1"; [ -n "${LAST:-}" ] && printf '       last output: %.1500s\n' "$LAST"; }
skip() { SKIP=$((SKIP + 1)); echo "skip - $1"; }

# check <json> <python expression over d> <description>
check() {
    LAST="$1"
    if printf '%s' "$1" | python3 -I -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if eval(sys.argv[1]) else 1)' "$2" 2>/dev/null; then
        ok "$3"
    else
        fail "$3"
    fi
    LAST=""
}

# field <json> <python expression over d>: print the value.
field() { printf '%s' "$1" | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print(eval(sys.argv[1]))' "$2" 2>/dev/null; }

mtime() { python3 -I -c 'import os,sys; print(os.stat(sys.argv[1]).st_mtime_ns)' "$1"; }

pd() { "$BASH_BIN" "$SCRIPT" "$@"; }

new_id() { NEW_ID="$TAG-$1"; IDS="$IDS $NEW_ID"; }

# exit_is <code> <description> <command...>
exit_is() {
    local want="$1" desc="$2"
    shift 2
    "$@" >/dev/null 2>&1 </dev/null
    local got=$?
    [ "$got" = "$want" ] && ok "$desc" || fail "$desc (exit $got)"
}

worktree_count() { git worktree list --porcelain | grep -c '^worktree '; }

snapshot() {
    STATUS_BEFORE="$(git --no-optional-locks status --porcelain=v1 -z --untracked-files=all | od -c)"
    INDEX_BEFORE="$(mtime .git/index)"
}
untouched() {
    local status_after index_after
    status_after="$(git --no-optional-locks status --porcelain=v1 -z --untracked-files=all | od -c)"
    index_after="$(mtime .git/index)"
    [ "$STATUS_BEFORE" = "$status_after" ] && ok "$1: git status unchanged" || fail "$1: git status unchanged"
    [ "$INDEX_BEFORE" = "$index_after" ] && ok "$1: .git/index mtime unchanged" || fail "$1: .git/index mtime unchanged"
}

commit_all() {
    git add -A && git commit -q -m "$1"
}
make_stat_dirty() {
    sleep 1
    touch "$@"
}

# profile <test command> [extra profile lines...]: write the Defect sandbox
# section of .claude/wb/testing.md.
# runner <path>: a repository-local test runner (repository code, like the
# tests): runs each test file in turn.
runner() {
    printf '#!/bin/sh\nset -e\nfor t in "$@"; do sh "$t"; done\n' > "$1"
    chmod +x "$1"
}

profile() {
    local cmd="$1" line
    shift
    mkdir -p .claude/wb
    {
        printf '# Testing\n\n## Defect sandbox\n\n'
        [ -n "$cmd" ] && printf -- '- test command: `%s`\n' "$cmd"
        for line in "$@"; do printf -- '- %s\n' "$line"; done
    } > .claude/wb/testing.md
}

# ----------------------------------------------------------- generic suite
# lang_suite <name> <id> <target> <test> <guard find> <guard replace>
#            <unguarded find> <unguarded replace> <control find> <control replace>
#            <loop find> <loop replace> <pidfile> <test command> <adapter>
# Runs in the fixture repository (cwd), whose profile names <test command>.
lang_suite() {
    local name="$1" id="$2" target="$3" test="$4"
    local gf="$5" gr="$6" uf="$7" ur="$8" cf="$9" cr="${10}" lf="${11}" lr="${12}" pidfile="${13}" cmd="${14}" adapter="${15}"
    local out start end orig_copy="$TMP_ROOT/$id.orig" wt_before

    command cp -f "$target" "$orig_copy"
    wt_before="$(worktree_count)"
    snapshot

    out="$(pd setup --id "$id" --working-tree)"
    check "$out" 'd["strategy"]=="swap" and d["adapter"]=="'"$adapter"'" and d["errors"]==[]' "$name: setup chooses the $adapter swap adapter"
    check "$out" 'd["test_cmd_source"]=="profile" and d["strategy_notes"] and isinstance(d["test_argv"], list) and ("{tests}" in d["test_argv"] or "{test_dirs}" in d["test_argv"])' "$name: the profile's command is used, as an argv"
    check "$out" 'd["root"]=="'"$PWD"'" and d["repo"]=="'"$PWD"'"' "$name: swap root is the repository itself"
    [ -d "$DBASE/wb-defect-$id" ] && ok "$name: state directory is under \$TMPDIR" || fail "$name: state directory is under \$TMPDIR"

    out="$(pd baseline --id "$id" --test "$test")"
    check "$out" 'd["passed"] is True and d["exit_code"]==0 and d["timeout_s"]>=10' "$name: baseline passes, timeout at least 10s"

    out="$(pd run --id "$id" --file "$target" --find "$gf" --replace "$gr" --test "$test" --label guarded)"
    echo "       ($name guarded defect: $(field "$out" 'd["duration_s"]')s)"
    check "$out" 'd["outcome"]=="caught" and d["applied"] is True and d["strategy"]=="swap" and d["label"]=="guarded"' "$name: a defect the test guards is caught"
    check "$out" '10 <= d["timeout_s"] <= 100' "$name: run reports its timeout, from the baseline, capped at 100s"
    check "$out" 'd["target_blob"]=="'"$(git hash-object --no-filters "$target")"'" and d["test_blobs"]=={"'"$test"'":"'"$(git hash-object --no-filters "$test")"'"}' "$name: blob hashes are the original target and the test"
    check "$out" 'd["diff"].startswith("--- a/'"$target"'") and d["test"]==["'"$test"'"] and d["file"]=="'"$target"'"' "$name: diff, file, and test are reported"
    [ ! -e "$DBASE/wb-defect-$id/wt" ] && [ "$(worktree_count)" = "$wt_before" ] && ok "$name: swap caught it without any worktree" || fail "$name: swap caught it without any worktree"

    out="$(pd run --id "$id" --file "$target" --find "$uf" --replace "$ur" --test "$test" --label unguarded)"
    check "$out" 'd["outcome"]=="survived" and d["applied"] is True' "$name: a defect in code the test does not exercise survives"
    check "$out" 'd["auto_control"]=="caught" and d["control_ok"] is True and d["strategy"]=="swap"' "$name: the first survivor runs the automatic control, which proves the adapter"
    [ ! -e "$DBASE/wb-defect-$id/wt" ] && ok "$name: still no worktree after the automatic control" || fail "$name: still no worktree after the automatic control"
    out="$(pd run --id "$id" --file "$target" --find "$uf" --replace "$ur" --test "$test")"
    check "$out" 'd["outcome"]=="survived" and d["auto_control"] is None and d["control_ok"] is True' "$name: later survivors reuse the established control"

    out="$(pd run --id "$id" --file "$target" --find "$cf" --replace "$cr" --test "$test" --control)"
    check "$out" 'd["outcome"]=="caught" and d["control"] is True and d["control_ok"] is True' "$name: control break is caught (control_ok)"

    start=$SECONDS
    out="$(pd run --id "$id" --file "$target" --find "$lf" --replace "$lr" --test "$test" --timeout 3 --label loop)"
    end=$SECONDS
    check "$out" 'd["outcome"]=="timeout"' "$name: an infinite-loop defect times out"
    [ $((end - start)) -le 12 ] && ok "$name: timeout returns within its bound ($((end - start))s)" || fail "$name: timeout returns within its bound ($((end - start))s)"
    if [ -s "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
        fail "$name: the timed-out test process was killed"
        kill -9 "$(cat "$pidfile")" 2>/dev/null
    else
        [ -s "$pidfile" ] && ok "$name: the timed-out test process was killed" || fail "$name: the timed-out test process was killed (no pid recorded)"
    fi
    rm -f "$pidfile"
    cmp -s "$target" "$orig_copy" && ok "$name: target file unchanged after the timeout" || fail "$name: target file unchanged after the timeout"
    out="$(pd run --id "$id" --file "$target" --find "$gf" --replace "$gr" --test "$test")"
    check "$out" 'd["outcome"]=="caught"' "$name: runs again normally after a timeout"

    untouched "$name"

    out="$(pd teardown --id "$id")"
    check "$out" 'd["removed"] is True and d["errors"]==[]' "$name: teardown removes the state"
    [ ! -e "$DBASE/wb-defect-$id" ] && ok "$name: nothing left after teardown" || fail "$name: nothing left after teardown"
    out="$(pd teardown --id "$id")"
    check "$out" 'd["removed"] is False and d["errors"]==[]' "$name: teardown is idempotent"
}

# worktree_suite <name> <id> <target> <test> <guard find> <guard replace> <unguarded find> <unguarded replace>
#                <loop find> <loop replace>
worktree_suite() {
    local name="$1" id="$2" target="$3" test="$4" gf="$5" gr="$6" uf="$7" ur="$8" lf="$9" lr="${10}" out wt_before
    wt_before="$(worktree_count)"
    snapshot
    out="$(pd setup --id "$id" --working-tree --strategy worktree)"
    check "$out" 'd["strategy"]=="worktree" and d["root"]=="'"$DBASE"'/wb-defect-'"$id"'/wt" and d["errors"]==[]' "$name (worktree): forced worktree strategy"
    out="$(pd baseline --id "$id" --test "$test")"
    check "$out" 'd["passed"] is True' "$name (worktree): baseline passes in the worktree"
    out="$(pd run --id "$id" --file "$target" --find "$gf" --replace "$gr" --test "$test")"
    echo "       ($name worktree defect: $(field "$out" 'd["duration_s"]')s)"
    check "$out" 'd["outcome"]=="caught" and d["strategy"]=="worktree"' "$name (worktree): guarded defect caught"
    out="$(pd run --id "$id" --file "$target" --find "$uf" --replace "$ur" --test "$test")"
    check "$out" 'd["outcome"]=="survived" and d["auto_control"]=="caught" and d["control_ok"] is True' "$name (worktree): unguarded defect survives, after the automatic control proves the copy is under test"
    cmp -s "$DBASE/wb-defect-$id/wt/$target" "$target" && ok "$name (worktree): worktree copy restored after each run" || fail "$name (worktree): worktree copy restored after each run"
    out="$(pd run --id "$id" --file "$target" --find "$lf" --replace "$lr" --test "$test" --timeout 3)"
    check "$out" 'd["outcome"]=="timeout" and d["timeout_s"]==3' "$name (worktree): an infinite-loop defect times out"
    cmp -s "$DBASE/wb-defect-$id/wt/$target" "$target" && ok "$name (worktree): worktree copy restored after a timeout" || fail "$name (worktree): worktree copy restored after a timeout"
    printf 'left behind by an interrupted run\n' > "$DBASE/wb-defect-$id/wt/$target"
    out="$(pd run --id "$id" --file "$target" --find "$gf" --replace "$gr" --test "$test")"
    check "$out" 'd["outcome"]=="caught" and d["applied"] is True and [n for n in d["notes"] if "interrupted" in n]' "$name (worktree): a mutation left by an interrupted run is detected, restored, and noted"
    cmp -s "$DBASE/wb-defect-$id/wt/$target" "$target" && ok "$name (worktree): copy matches the original after the repair" || fail "$name (worktree): copy matches the original after the repair"
    untouched "$name (worktree)"
    out="$(pd teardown --id "$id")"
    check "$out" 'd["removed"] is True' "$name (worktree): teardown"
    [ ! -e "$DBASE/wb-defect-$id" ] && [ "$(worktree_count)" = "$wt_before" ] && ok "$name (worktree): no directory or worktree registration left" || fail "$name (worktree): no directory or worktree registration left"
}

PY_CMD='python3 -m pytest -q {tests}'
NODE_CMD='node --test {tests}'
RUBY_CMD='ruby -Ilib -Itest {tests}'

# ================================================================ Python flat
PYF="$TMP_ROOT/py-flat"
mkdir -p "$PYF/tests" && cd "$PYF" || exit 1
git init -q .
printf '[pytest]\ntestpaths = tests\n' > pytest.ini
# A conftest that inserts the rootdir at the front of sys.path, as many
# repositories do: an overlay on the path would lose to it.
printf 'import os, sys\nsys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n' > conftest.py
printf 'def add(a, b):\n    return a + b\n\n\ndef sub(a, b):\n    return a - b\n' > calc.py
printf 'from calc import add\n\n\ndef test_add():\n    assert add(2, 3) == 5\n' > tests/test_calc.py
profile "$PY_CMD"
commit_all start
# Uncommitted change to the target and an untracked test: --working-tree must see both.
printf 'def add(a, b):\n    return a + b  # summed\n\n\ndef sub(a, b):\n    return a - b\n\n\ndef mul(a, b):\n    return a * b\n' > calc.py
printf 'from calc import add, mul\n\n\ndef test_add():\n    assert add(2, 3) == 5\n\n\ndef test_mul():\n    assert mul(2, 3) == 6\n' > tests/test_new.py
make_stat_dirty pytest.ini conftest.py
PIDF="$TMP_ROOT/py-flat.pid"
new_id pyflat
lang_suite "python flat" "$NEW_ID" calc.py tests/test_new.py \
    'a + b  # summed' 'a - b' \
    'return a - b' 'return a + b' \
    'return a * b' 'return 0' \
    'return a + b  # summed' "open('$PIDF','w').write(str(__import__('os').getpid())); __import__('time').sleep(600)" \
    "$PIDF" "$PY_CMD" python

# ---- edits, usage errors, and paths
new_id pyflat-err
ID="$NEW_ID"
pd setup --id "$ID" --working-tree >/dev/null
out="$(pd run --id "$ID" --file calc.py --find 'return' --replace 'yield' --test tests/test_new.py)"
check "$out" 'd["applied"] is False and d["outcome"]=="error" and [e for e in d["errors"] if "more than once" in e]' "find text matching more than once is an error, not applied"
out="$(pd run --id "$ID" --file calc.py --find 'no such text' --replace 'x' --test tests/test_new.py)"
check "$out" 'd["applied"] is False and d["outcome"]=="error" and [e for e in d["errors"] if "not found" in e]' "find text not found is an error, not applied"
out="$(pd run --id "$ID" --file nope.py --find a --replace b --test tests/test_new.py)"
check "$out" 'd["applied"] is False and d["outcome"]=="error"' "missing target file is an error"
exit_is 2 "--find without --replace is a usage error (exit 2)" pd run --id "$ID" --file calc.py --find a --test tests/test_new.py
exit_is 2 "--sed was removed: a usage error (exit 2)" pd run --id "$ID" --file calc.py --sed 's/a/b/' --test tests/test_new.py
exit_is 2 "--test-cmd was removed: a usage error (exit 2)" pd setup --id "$ID" --test-cmd 'sh -c id'
exit_is 2 "an id with a slash or space is a usage error (exit 2)" pd setup --id 'bad id/x'
exit_is 2 "an id starting with '-' is a usage error (exit 2)" pd setup --id '-x'
exit_is 2 "--test-file without <path>=<source> is a usage error (exit 2)" pd baseline --id "$ID" --test tests/test_new.py --test-file 'no-equals-sign'
printf 'sentinel\n' > "$TMP_ROOT/sentinel"
exit_is 2 "--test-file from a local file is refused (exit 2)" pd baseline --id "$ID" --test tests/test_new.py --test-file "tests/test_new.py=$TMP_ROOT/sentinel"
exit_is 2 "--test-file commit starting with '-' is refused (exit 2)" pd baseline --id "$ID" --test tests/test_new.py --test-file 'tests/test_new.py=@-x'
exit_is 2 "--file with .. is refused (exit 2)" pd run --id "$ID" --file ../sentinel --find sentinel --replace x --test tests/test_new.py
exit_is 2 "an absolute --file is refused (exit 2)" pd run --id "$ID" --file "$TMP_ROOT/sentinel" --find sentinel --replace x --test tests/test_new.py
exit_is 2 "--file with an inner .. component is refused (exit 2)" pd run --id "$ID" --file 'tests/../../sentinel' --find sentinel --replace x --test tests/test_new.py
exit_is 2 "--test with .. is refused (exit 2)" pd run --id "$ID" --file calc.py --find 'return a * b' --replace 'return 0' --test ../sentinel
exit_is 2 "--test-file path with .. is refused (exit 2)" pd baseline --id "$ID" --test tests/test_new.py --test-file '../sentinel=@HEAD'
exit_is 2 "an absolute --test-file path is refused (exit 2)" pd baseline --id "$ID" --test tests/test_new.py --test-file "$TMP_ROOT/sentinel=@HEAD"
exit_is 2 "--file with a component starting with '-' is refused (exit 2)" pd run --id "$ID" --file -calc.py --find a --replace b --test tests/test_new.py
exit_is 2 "--test with a component starting with '-' is refused (exit 2)" pd run --id "$ID" --file calc.py --find 'return a * b' --replace 'return 0' --test 'tests/-x.py'
exit_is 2 "--test-file path starting with '-' is refused (exit 2)" pd baseline --id "$ID" --test tests/test_new.py --test-file '-x.py=@HEAD'
exit_is 2 "--cwd with .. is refused (exit 2)" pd setup --id "$ID" --cwd ../..
exit_is 2 "--commit starting with '-' is refused (exit 2)" pd setup --id "$ID" --commit --output=x
msg="$(pd run --id "$ID" --file ../sentinel --find sentinel --replace x --test tests/test_new.py 2>&1 >/dev/null)"
case "$msg" in *repository-relative*) ok "the refusal names the rule" ;; *) fail "the refusal names the rule" ;; esac
[ "$(cat "$TMP_ROOT/sentinel")" = sentinel ] && ok "nothing outside the repository was touched" || fail "nothing outside the repository was touched"
exit_is 2 "two --test-file reading stdin is a usage error (exit 2)" pd baseline --id "$ID" --test tests/test_new.py --test-file 'tests/a.py=-' --test-file 'tests/b.py=-'
exit_is 2 "unknown subcommand is a usage error (exit 2)" pd frobnicate
out="$(pd run --id "$TAG-never-set-up" --file calc.py --find a --replace b --test tests/test_new.py)"
check "$out" 'd["outcome"]=="not_run" and d["errors"]' "run without setup is not_run with an error"
# A failing baseline makes later runs on the same tests not_run.
printf 'def test_broken():\n    assert False\n' > tests/test_broken.py
out="$(pd baseline --id "$ID" --test tests/test_broken.py)"
check "$out" 'd["passed"] is False and d["exit_code"]!=0' "a failing baseline reports passed false"
out="$(pd run --id "$ID" --file calc.py --find 'a * b' --replace 'a + b' --test tests/test_broken.py)"
check "$out" 'd["outcome"]=="not_run" and [e for e in d["errors"] if "baseline" in e]' "a run against a failed baseline is not_run"
rm -f tests/test_broken.py

# ---- the runner's own startup: no BASH_ENV, no imported functions
printf 'touch "%s"\n' "$TMP_ROOT/bashenv-ran" > "$TMP_ROOT/bashenv.sh"
BASH_ENV="$TMP_ROOT/bashenv.sh" ENV="$TMP_ROOT/bashenv.sh" "$SCRIPT" teardown --id "$TAG-benv" >/dev/null 2>&1
[ ! -e "$TMP_ROOT/bashenv-ran" ] && ok "startup: BASH_ENV and ENV are not sourced" || fail "startup: BASH_ENV and ENV are not sourced"
(
    # The path is written into the body: TMP_ROOT is not exported.
    eval "git() { touch '$TMP_ROOT/func-ran'; command git \"\$@\"; }"
    export -f git
    "$SCRIPT" setup --id "$TAG-func" --working-tree >/dev/null 2>&1
)
[ ! -e "$TMP_ROOT/func-ran" ] && ok "startup: exported shell functions are not imported" || fail "startup: exported shell functions are not imported"
pd teardown --id "$TAG-func" >/dev/null
IDS="$IDS $TAG-func"

# ---- state integrity: values read back are validated, never trusted
out="$(pd run --id "$ID" --file calc.py --find 'return a - b' --replace 'return a + b' --test tests/test_new.py)"
check "$out" 'd["control_ok"] is True' "state: control established for the pair"
for f in "$DBASE/wb-defect-$ID/state/control-"*; do printf 'true,"pwned":1' > "$f"; done
out="$(pd run --id "$ID" --file calc.py --find 'return a - b' --replace 'return a + b' --test tests/test_new.py)"
check "$out" '"pwned" not in d and d["auto_control"]=="caught" and d["control_ok"] is True and [e for e in d["errors"] if "invalid state" in e]' "state: a tampered control value is refused (control re-established, error noted, nothing injected)"
mkdir -p "$TMP_ROOT/decoy"
printf 'keep\n' > "$TMP_ROOT/decoy/calc.py"
command cp -f "$DBASE/wb-defect-$ID/state/root" "$TMP_ROOT/root.bak"
printf '%s' "$TMP_ROOT/decoy" > "$DBASE/wb-defect-$ID/state/root"
out="$(pd run --id "$ID" --file calc.py --find keep --replace gone --test tests/test_new.py)"
check "$out" 'd["outcome"]=="not_run" and [e for e in d["errors"] if "invalid state: root" in e]' "state: a root that is not the derived path is refused"
[ "$(cat "$TMP_ROOT/decoy/calc.py")" = keep ] && ok "state: the decoy root was not written" || fail "state: the decoy root was not written"
command cp -f "$TMP_ROOT/root.bak" "$DBASE/wb-defect-$ID/state/root"
pd teardown --id "$ID" >/dev/null

# ---- the state directory: only one this script made is used or removed
mkdir -p "$TMP_ROOT/elsewhere"
ln -s "$TMP_ROOT/elsewhere" "$DBASE/wb-defect-$TAG-link"
out="$(pd setup --id "$TAG-link" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "symlink" in e]' "a state directory that is a symlink is refused"
out="$(pd teardown --id "$TAG-link")"
check "$out" 'd["removed"] is False and d["errors"]' "teardown refuses a symlinked state directory"
[ -L "$DBASE/wb-defect-$TAG-link" ] && [ -z "$(ls -A "$TMP_ROOT/elsewhere")" ] && ok "the symlink's target was not written" || fail "the symlink's target was not written"
rm -f "$DBASE/wb-defect-$TAG-link"
# An ordinary same-owner directory with state files pointing at a decoy.
DECOY="$TMP_ROOT/decoy2"
mkdir -p "$DECOY/wt" && printf 'precious\n' > "$DECOY/wt/file"
PRE="$DBASE/wb-defect-$TAG-pre"
mkdir -p "$PRE/state"
printf 'worktree' > "$PRE/state/strategy"; printf '%s' "$PYF" > "$PRE/state/repo"
printf '%s' "$DECOY/wt" > "$PRE/state/root"; printf '%s' "$DECOY/wt" > "$PRE/state/worktree"
printf '%s' "$DECOY" > "$PRE/state/sandbox"
out="$(pd setup --id "$TAG-pre" --working-tree)"
check "$out" 'd["strategy"]=="none" and d["errors"]' "a pre-existing directory not made by setup is refused by setup"
out="$(pd teardown --id "$TAG-pre")"
check "$out" 'd["removed"] is False and d["errors"]' "and by teardown"
[ -f "$DECOY/wt/file" ] && [ -d "$PRE/state" ] && ok "the decoy and the pre-existing directory both survive" || fail "the decoy and the pre-existing directory both survive"
# Even made to look like ours (mode 700, a marker), its state names no path
# that is ever removed: only the directory itself goes.
chmod 700 "$PRE"
printf 'wb-defect %s deadbeef\n' "$TAG-pre" > "$PRE/.wb-defect"
out="$(pd teardown --id "$TAG-pre")"
check "$out" 'd["removed"] is True' "a directory with our marker and mode is removed"
[ -f "$DECOY/wt/file" ] && ok "paths named in its state were never removed" || fail "paths named in its state were never removed"
rm -rf "$PRE"

# ---- profile refusals: argv only, no shell; paths and env checked
command cp -f .claude/wb/testing.md "$TMP_ROOT/profile.bak"
new_id pyflat-prof
ID="$NEW_ID"
profile "python3 -m pytest {tests}; touch $TMP_ROOT/pwned"
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "metacharacter" in e]' "profile: a ';' in the test command is refused"
profile 'python3 -m pytest $(touch pwned) {tests}'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "metacharacter" in e]' "profile: a \$(...) in the test command is refused"
profile 'python3 -m pytest {tests} > out.txt'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "metacharacter" in e]' "profile: a redirect in the test command is refused"
profile "$PY_CMD" 'setup command: `make && make install`'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="swap" and d["errors"]==[] and [n for n in d["notes"] if "setup command" in n and "ignored" in n]' "profile: a setup command is never run (ignored, with a note)"
pd teardown --id "$ID" >/dev/null
profile "$PY_CMD" "env: BASH_ENV=$TMP_ROOT/evil.sh"
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "BASH_ENV" in e]' "profile: env may not set BASH_ENV"
profile "$PY_CMD" "env: PATH=$TMP_ROOT"
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "PATH" in e]' "profile: env may not set PATH"
profile "$PY_CMD" 'cwd: ../..'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "test directory" in e]' "profile: cwd ../.. is refused"
profile "$PY_CMD" 'dependency dirs: ../x, node_modules'
out="$(pd setup --id "$ID" --working-tree --strategy worktree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "dependency dir" in e]' "profile: dependency dirs ../x is refused"
profile "$PY_CMD" 'dependency dirs: -rf'
out="$(pd setup --id "$ID" --working-tree --strategy worktree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "dependency dir" in e]' "profile: a dependency dir starting with '-' is refused"
# Shells and launchers as the test command's program are refused, as are
# interpreters given inline code.
while IFS= read -r launch; do
    profile "$launch"
    out="$(pd setup --id "$ID" --working-tree)"
    check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "refused" in e and ("launcher" in e or "inline" in e)]' "launcher: refused: $launch"
done <<'LAUNCHERS'
sh -c 'python3 -m pytest' {tests}
bash run.sh {tests}
/bin/sh run.sh {tests}
zsh run.sh {tests}
env python3 -m pytest {tests}
xargs python3 -m pytest {tests}
nohup python3 -m pytest {tests}
timeout 60 python3 -m pytest {tests}
nice python3 -m pytest {tests}
time python3 -m pytest {tests}
sudo python3 -m pytest {tests}
python3 -c 'import pytest' {tests}
python3 -Bc 'import pytest' {tests}
ruby -e 'p 1' {tests}
ruby -rjson {tests}
node -e 1 {tests}
node --eval=1 {tests}
node -r ./x.js {tests}
perl -e 1 {tests}
perl -ne 1 {tests}
php -r 1 {tests}
bundle exec sh -c x {tests}
uv run bash -c x {tests}
npx -c 'x' {tests}
yarn node -e 1 {tests}
pnpm node --eval=1 {tests}
npm exec node -e 1 {tests}
docker run --rm img pytest {tests}
podman run img pytest {tests}
nerdctl run img pytest {tests}
kubectl exec pod -- pytest {tests}
ssh host pytest {tests}
scp a b {tests}
rsync a b {tests}
flatpak-spawn --host pytest {tests}
systemd-run pytest {tests}
chroot / pytest {tests}
unshare pytest {tests}
nsenter pytest {tests}
script -q pytest {tests}
expect x {tests}
LAUNCHERS
# A wrapper renamed or reached through a symlink is dispatched on the
# program it resolves to.
mkdir -p "$TMP_ROOT/fakebin"
printf '#!/bin/sh\nexit 0\n' > "$TMP_ROOT/fakebin/bundle"
chmod +x "$TMP_ROOT/fakebin/bundle"
ln -s "$TMP_ROOT/fakebin/bundle" b-link
profile './b-link exec sh -c x {tests}'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "launcher" in e]' "launcher: a symlinked bundle is looked through (resolved name) and its sh refused"
rm -f b-link
# Repository code runners stay allowed (the trust bar: repository code).
while IFS= read -r allowed; do
    profile "$allowed"
    out="$(pd setup --id "$ID" --working-tree)"
    check "$out" 'not [e for e in d["errors"] if "refused" in e]' "launcher: allowed (repository code): $allowed"
    pd teardown --id "$ID" >/dev/null
done <<'ALLOWED'
npm run test -- {tests}
pnpm run test {tests}
yarn run test {tests}
node --run test {tests}
make test
just test
rake test
gradle test
mvn test
ALLOWED
ln -s /bin/sh runner-link
profile './runner-link run.sh {tests}'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "launcher" in e]' "launcher: a symlink to a shell is resolved and refused"
rm -f runner-link
profile 'python3 -W ignore -m pytest -q {tests}'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="swap" and d["errors"]==[]' "launcher: an interpreter running a module (-m) with other options is allowed"
pd teardown --id "$ID" >/dev/null
# {root} only as a whole argument or as the value of a --name= option.
profile 'python3 -m pytest --rootdir={root} -q {tests}'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="swap" and d["errors"]==[]' "{root}: allowed as --name={root}"
pd teardown --id "$ID" >/dev/null
profile 'python3 -m pytest -q {root} {tests}'
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["errors"]==[]' "{root}: allowed as a whole argument"
pd teardown --id "$ID" >/dev/null
for bad in 'python3 -m pytest -q {root}/tests {tests}' 'python3 -m pytest -o x={root} {tests}' 'python3 -m pytest -q x{root} {tests}'; do
    profile "$bad"
    out="$(pd setup --id "$ID" --working-tree)"
    check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "{root}" in e]' "{root}: refused inside another word: $bad"
done
[ ! -e "$TMP_ROOT/pwned" ] && [ ! -e pwned ] && [ ! -e out.txt ] && [ ! -e "$TMP_ROOT/x" ] && [ ! -e "$DBASE/x" ] && ok "profile: nothing ran and nothing was created outside" || fail "profile: nothing ran and nothing was created outside"
pd teardown --id "$ID" >/dev/null
command cp -f "$TMP_ROOT/profile.bak" .claude/wb/testing.md

# --commit with a dirty working tree cannot swap: it falls back to a worktree.
new_id pyflat-commit
ID="$NEW_ID"
out="$(pd setup --id "$ID" --commit HEAD)"
check "$out" 'd["strategy"]=="worktree" and [n for n in d["strategy_notes"] if "differs" in n]' "--commit with a dirty tree falls back to a worktree, with a note"
out="$(pd run --id "$ID" --file calc.py --find 'return a + b' --replace 'return a - b' --test tests/test_calc.py)"
check "$out" 'd["outcome"]=="caught"' "--commit worktree runs the commit's code"
pd teardown --id "$ID" >/dev/null

# Swap defeated by the test command (the adapter never loads): the automatic
# control survives the swap, so the setup falls back to a worktree.
profile 'python3 -m pytest -q -p no:wb_defect_swap {tests}'
new_id pyflat-defeat
ID="$NEW_ID"
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["strategy"]=="swap" and d["test_argv"][-2:]==["no:wb_defect_swap","{tests}"]' "an adapter is chosen from the profile's command"
pd baseline --id "$ID" --test tests/test_new.py >/dev/null
out="$(pd run --id "$ID" --file calc.py --find 'return a - b' --replace 'return a + b' --test tests/test_new.py)"
check "$out" 'd["outcome"]=="survived" and d["control_ok"] is True and d["strategy"]=="worktree" and [n for n in d["strategy_notes"] if "fell back" in n]' "an unproven adapter never reports a survivor: the setup falls back and the survivor is confirmed in a worktree"
out="$(pd run --id "$ID" --file calc.py --find 'a + b  # summed' --replace 'a - b' --test tests/test_new.py)"
check "$out" 'd["outcome"]=="caught" and d["strategy"]=="worktree"' "later runs use the fallback worktree"
pd teardown --id "$ID" >/dev/null
[ ! -e "$DBASE/wb-defect-$ID" ] && [ "$(worktree_count)" = 1 ] && ok "fallback worktree removed by teardown" || fail "fallback worktree removed by teardown"
new_id pyflat-defeat2
ID="$NEW_ID"
pd setup --id "$ID" --working-tree >/dev/null
out="$(pd run --id "$ID" --file calc.py --find 'return a * b' --replace 'return 0' --test tests/test_new.py --control)"
check "$out" 'd["outcome"]=="caught" and d["control"] is True and d["control_ok"] is True and d["strategy"]=="worktree"' "a --control that survives the swap falls back to a worktree and is caught there"
pd teardown --id "$ID" >/dev/null
command cp -f "$TMP_ROOT/profile.bak" .claude/wb/testing.md

# Detection is the last resort, and says so.
mv .claude/wb/testing.md "$TMP_ROOT/profile.moved"
new_id pyflat-detect
ID="$NEW_ID"
out="$(pd setup --id "$ID" --working-tree)"
check "$out" 'd["test_cmd_source"]=="detected" and "pytest" in d["test_argv"] and d["language"]=="python"' "without a profile command the command is detected (fixed argv) and test_cmd_source says so"
pd teardown --id "$ID" >/dev/null
mv "$TMP_ROOT/profile.moved" .claude/wb/testing.md

# --test-file: replacement test content (stdin or a commit), never written
# to the user's tree.
new_id pyflat-tf
ID="$NEW_ID"
printf 'from calc import add\n\n\ndef test_add():\n    assert add(2, 3) == 5\n' > "$TMP_ROOT/weaker_test.py"
WEAK_BLOB="$(git hash-object --no-filters "$TMP_ROOT/weaker_test.py")"
pd setup --id "$ID" --working-tree >/dev/null
out="$(pd baseline --id "$ID" --test tests/test_new.py --test-file 'tests/test_new.py=-' < "$TMP_ROOT/weaker_test.py")"
check "$out" 'd["passed"] is True and d["strategy"]=="worktree"' "--test-file: baseline with replacement content runs in a worktree"
out="$(pd run --id "$ID" --file calc.py --find 'return a * b' --replace 'return 0' --test tests/test_new.py --test-file 'tests/test_new.py=-' < "$TMP_ROOT/weaker_test.py")"
check "$out" 'd["outcome"]=="survived" and d["test_blobs"]["tests/test_new.py"]=="'"$WEAK_BLOB"'"' "--test-file <path>=- reads the replacement from stdin; its blob is reported"
out="$(pd run --id "$ID" --file calc.py --find 'return a * b' --replace 'return 0' --test tests/test_new.py)"
check "$out" 'd["outcome"]=="caught" and d["strategy"]=="swap"' "--test-file: without it, the real test catches the same defect, by swap"
out="$(pd run --id "$ID" --file calc.py --find 'return a + b  # summed' --replace 'return a - b' --test tests/test_calc.py --test-file 'tests/test_calc.py=@HEAD')"
check "$out" 'd["outcome"]=="caught" and d["applied"] is True' "--test-file <path>=@<commit> uses that commit's version"
out="$(pd run --id "$ID" --file calc.py --find 'return a * b' --replace 'return 0' --test tests/test_new.py --test-file 'tests/test_new.py=@HEAD')"
check "$out" 'd["outcome"]=="not_run" and [e for e in d["errors"] if "cannot read" in e]' "--test-file @<commit> for a path missing there is an error"
cmp -s "$DBASE/wb-defect-$ID/wt/tests/test_new.py" tests/test_new.py && ok "--test-file: the worktree's test is restored after the run" || fail "--test-file: the worktree's test is restored after the run"
pd teardown --id "$ID" >/dev/null

new_id pyflat-wt
worktree_suite "python flat" "$NEW_ID" calc.py tests/test_new.py 'a + b  # summed' 'a - b' 'return a - b' 'return a + b' \
    'return a + b  # summed' "__import__('time').sleep(600)"

# ================================================================ Python src
PYS="$TMP_ROOT/py-src"
mkdir -p "$PYS/src/pkg" "$PYS/tests" && cd "$PYS" || exit 1
git init -q .
printf '[tool.pytest.ini_options]\npythonpath = ["src"]\n' > pyproject.toml
printf '' > src/pkg/__init__.py
printf 'def add(a, b):\n    return a + b\n\n\ndef sub(a, b):\n    return a - b\n\n\ndef neg(a):\n    return -a\n' > src/pkg/calc.py
printf 'from pkg.calc import add, neg\n\n\ndef test_add():\n    assert add(2, 3) == 5\n\n\ndef test_neg():\n    assert neg(2) == -2\n' > tests/test_calc.py
profile "$PY_CMD"
commit_all start
PIDF="$TMP_ROOT/py-src.pid"
new_id pysrc
lang_suite "python src layout" "$NEW_ID" src/pkg/calc.py tests/test_calc.py \
    'return a + b' 'return a * b' \
    'return a - b' 'return a + b' \
    'return -a' 'return a' \
    'return a + b' "open('$PIDF','w').write(str(__import__('os').getpid())); __import__('time').sleep(600)" \
    "$PIDF" "$PY_CMD" python
new_id pysrc-wt
worktree_suite "python src layout" "$NEW_ID" src/pkg/calc.py tests/test_calc.py 'return a + b' 'return a * b' 'return a - b' 'return a + b' \
    'return a + b' "__import__('time').sleep(600)"

# ================================================================ Node (CommonJS)
NODE_CJS="$TMP_ROOT/node-cjs"
if command -v node >/dev/null 2>&1; then
    mkdir -p "$NODE_CJS/src" "$NODE_CJS/test" "$NODE_CJS/node_modules/fake-dep" && cd "$NODE_CJS" || exit 1
    git init -q .
    printf 'node_modules/\n' > .gitignore
    printf '{"name":"fixture","version":"1.0.0","private":true,"scripts":{"test":"node --test"}}\n' > package.json
    printf 'module.exports = { twice: (x) => x * 2 };\n' > node_modules/fake-dep/index.js
    printf '{"name":"fake-dep","main":"index.js"}\n' > node_modules/fake-dep/package.json
    printf 'const { twice } = require("fake-dep");\nfunction add(a, b) {\n  return a + b;\n}\nfunction sub(a, b) {\n  return a - b;\n}\nfunction dbl(a) {\n  return twice(a);\n}\nmodule.exports = { add, sub, dbl };\n' > src/calc.js
    printf 'const test = require("node:test");\nconst assert = require("node:assert");\nconst { add, dbl } = require("../src/calc");\ntest("add", () => { assert.strictEqual(add(2, 3), 5); });\ntest("dbl", () => { assert.strictEqual(dbl(4), 8); });\n' > test/calc.test.js
    profile "$NODE_CMD"
    commit_all start
    make_stat_dirty package.json
    PIDF="$TMP_ROOT/node-cjs.pid"
    new_id nodecjs
    lang_suite "node commonjs" "$NEW_ID" src/calc.js test/calc.test.js \
        'return a + b;' 'return a - b;' \
        'return a - b;' 'return a + b;' \
        'return twice(a);' 'return a;' \
        'return a + b;' "require('fs').writeFileSync('$PIDF', String(process.pid)); while (true) {}" \
        "$PIDF" "$NODE_CMD" node
    new_id nodecjs-wt
    worktree_suite "node commonjs" "$NEW_ID" src/calc.js test/calc.test.js 'return a + b;' 'return a - b;' 'return a - b;' 'return a + b;' \
        'return a + b;' 'while (true) {}'
    new_id nodecjs-wt2
    ID="$NEW_ID"
    pd setup --id "$ID" --strategy worktree >/dev/null
    [ -L "$DBASE/wb-defect-$ID/wt/node_modules" ] && ok "node (worktree): node_modules is linked, not copied" || fail "node (worktree): node_modules is linked, not copied"
    out="$(pd run --id "$ID" --file src/calc.js --find 'return twice(a);' --replace 'return a;' --test test/calc.test.js)"
    check "$out" 'd["outcome"]=="caught"' "node (worktree): code using a linked dependency runs and the defect is caught"
    command cp -f "$NODE_CJS/node_modules/fake-dep/index.js" "$TMP_ROOT/dep.orig"
    out="$(pd run --id "$ID" --file node_modules/fake-dep/index.js --find 'x * 2' --replace 'x * 3' --test test/calc.test.js)"
    check "$out" 'd["outcome"]=="not_run" and d["applied"] is False and [e for e in d["errors"] if "linked directory" in e]' "node (worktree): a target under a linked dependency directory is refused"
    cmp -s "$NODE_CJS/node_modules/fake-dep/index.js" "$TMP_ROOT/dep.orig" && ok "node (worktree): the user's real dependency file is unchanged" || fail "node (worktree): the user's real dependency file is unchanged"
    out="$(pd run --id "$ID" --file src/calc.js --find 'return a + b;' --replace 'return a - b;' --test test/calc.test.js --test-file 'node_modules/fake-dep/index.js=@HEAD')"
    check "$out" 'd["outcome"]=="not_run" and [e for e in d["errors"] if "linked directory" in e]' "node (worktree): a --test-file under a linked directory is refused"
    cmp -s "$NODE_CJS/node_modules/fake-dep/index.js" "$TMP_ROOT/dep.orig" && ok "node (worktree): the dependency file is still unchanged" || fail "node (worktree): the dependency file is still unchanged"
    pd teardown --id "$ID" >/dev/null
    [ -d "$NODE_CJS/node_modules/fake-dep" ] && [ ! -L "$NODE_CJS/node_modules" ] && ok "node: the user's node_modules is intact after teardown" || fail "node: the user's node_modules is intact after teardown"
else
    skip "node commonjs: node not on PATH"
fi

# ================================================================ Node (ESM)
NODE_ESM="$TMP_ROOT/node-esm"
if command -v node >/dev/null 2>&1; then
    mkdir -p "$NODE_ESM/src" "$NODE_ESM/test" && cd "$NODE_ESM" || exit 1
    git init -q .
    printf '{"name":"fixture-esm","version":"1.0.0","private":true,"type":"module"}\n' > package.json
    printf 'export function add(a, b) {\n  return a + b;\n}\nexport function sub(a, b) {\n  return a - b;\n}\nexport function neg(a) {\n  return -a;\n}\n' > src/calc.js
    printf 'import test from "node:test";\nimport assert from "node:assert";\nimport { add, neg } from "../src/calc.js";\ntest("add", () => { assert.strictEqual(add(2, 3), 5); });\ntest("neg", () => { assert.strictEqual(neg(2), -2); });\n' > test/calc.test.js
    profile "$NODE_CMD"
    commit_all start
    PIDF="$TMP_ROOT/node-esm.pid"
    new_id nodeesm
    lang_suite "node esm" "$NEW_ID" src/calc.js test/calc.test.js \
        'return a + b;' 'return a * b;' \
        'return a - b;' 'return a + b;' \
        'return -a;' 'return a;' \
        'return a + b;' "process.getBuiltinModule('node:fs').writeFileSync('$PIDF', String(process.pid)); while (true) {}" \
        "$PIDF" "$NODE_CMD" node
else
    skip "node esm: node not on PATH"
fi

# ================================================================ Ruby (minitest)
RB="$TMP_ROOT/ruby"
if command -v ruby >/dev/null 2>&1 && ruby -e 'require "minitest"' >/dev/null 2>&1; then
    mkdir -p "$RB/lib" "$RB/test" && cd "$RB" || exit 1
    git init -q .
    printf 'require_relative "helper"\n\nmodule Calc\n  def self.add(a, b)\n    a + b\n  end\n\n  def self.sub(a, b)\n    a - b\n  end\n\n  def self.neg(a)\n    Helper.flip(a)\n  end\nend\n' > lib/calc.rb
    printf 'module Helper\n  def self.flip(a)\n    -a\n  end\nend\n' > lib/helper.rb
    printf 'require "minitest/autorun"\nrequire_relative "../lib/calc"\n\nclass CalcTest < Minitest::Test\n  def test_add\n    assert_equal 5, Calc.add(2, 3)\n  end\n\n  def test_neg\n    assert_equal(-2, Calc.neg(2))\n  end\nend\n' > test/calc_test.rb
    profile "$RUBY_CMD"
    commit_all start
    make_stat_dirty lib/helper.rb
    PIDF="$TMP_ROOT/ruby.pid"
    new_id ruby
    ID="$NEW_ID"
    out="$(pd setup --id "$ID" --commit HEAD)"
    check "$out" 'd["strategy"]=="swap" and d["adapter"]=="ruby"' "ruby: --commit on a clean tree chooses swap"
    pd teardown --id "$ID" >/dev/null
    lang_suite "ruby minitest" "$ID" lib/calc.rb test/calc_test.rb \
        '    a + b' '    a * b' \
        '    a - b' '    a + b' \
        'Helper.flip(a)' 'a' \
        '    a + b' "    File.write('$PIDF', Process.pid.to_s); sleep 600" \
        "$PIDF" "$RUBY_CMD" ruby
    new_id ruby-wt
    worktree_suite "ruby minitest" "$NEW_ID" lib/calc.rb test/calc_test.rb '    a + b' '    a * b' '    a - b' '    a + b' \
        '    a + b' '    sleep 600'
else
    skip "ruby minitest: ruby or minitest not available"
fi

# ================================================================ Go
GOR="$TMP_ROOT/go"
if command -v go >/dev/null 2>&1; then
    mkdir -p "$GOR/calc" && cd "$GOR" || exit 1
    git init -q .
    printf 'module example.com/fixture\n\ngo 1.21\n' > go.mod
    printf 'package calc\n\nfunc Add(a, b int) int {\n\treturn a + b\n}\n\nfunc Sub(a, b int) int {\n\treturn a - b\n}\n\nfunc Neg(a int) int {\n\treturn -a\n}\n' > calc/calc.go
    printf 'package calc\n\nimport "testing"\n\nfunc TestAdd(t *testing.T) {\n\tif Add(2, 3) != 5 {\n\t\tt.Fatal("add")\n\t}\n}\n\nfunc TestNeg(t *testing.T) {\n\tif Neg(2) != -2 {\n\t\tt.Fatal("neg")\n\t}\n}\n' > calc/calc_test.go
    profile 'go test {test_dirs}'
    commit_all start
    PIDF="$TMP_ROOT/go.pid"
    new_id golang
    lang_suite "go" "$NEW_ID" calc/calc.go calc/calc_test.go \
        'return a + b' 'return a * b' \
        'return a - b' 'return a + b' \
        'return -a' 'return a' \
        'return a + b' 'for {}' \
        "$PIDF" 'go test {test_dirs}' go
else
    skip "go: go not on PATH (go test -overlay swap untested here)"
fi

# ================================================================ Node, Yarn PnP
PNP="$TMP_ROOT/node-pnp"
if command -v node >/dev/null 2>&1; then
    mkdir -p "$PNP/src" "$PNP/test" && cd "$PNP" || exit 1
    git init -q .
    printf '{"name":"fixture-pnp","private":true,"packageManager":"yarn@4.0.0"}\n' > package.json
    printf '// stand-in for a Yarn PnP loader\n' > .pnp.cjs
    printf 'function add(a, b) {\n  return a + b;\n}\nfunction sub(a, b) {\n  return a - b;\n}\nmodule.exports = { add, sub };\n' > src/calc.js
    printf 'const test = require("node:test");\nconst assert = require("node:assert");\nconst { add } = require("../src/calc");\ntest("add", () => { assert.strictEqual(add(2, 3), 5); });\n' > test/calc.test.js
    profile "$NODE_CMD"
    commit_all start
    snapshot
    new_id pnp
    ID="$NEW_ID"
    out="$(pd setup --id "$ID" --working-tree)"
    check "$out" 'd["strategy"]=="worktree" and d["adapter"] is None and [n for n in d["strategy_notes"] if "Plug" in n]' "node pnp: swap precondition fails, worktree chosen, and the reason is given"
    out="$(pd run --id "$ID" --file src/calc.js --find 'return a + b;' --replace 'return a - b;' --test test/calc.test.js)"
    check "$out" 'd["outcome"]=="caught" and d["strategy"]=="worktree"' "node pnp: guarded defect caught in the worktree"
    out="$(pd run --id "$ID" --file src/calc.js --find 'return a - b;' --replace 'return a + b;' --test test/calc.test.js)"
    check "$out" 'd["outcome"]=="survived" and d["control_ok"] is True' "node pnp: unguarded defect survives with the control established"
    untouched "node pnp"
    pd teardown --id "$ID" >/dev/null
else
    skip "node pnp: node not on PATH"
fi

# ================================================================ shell, --cwd
SH="$TMP_ROOT/shell"
mkdir -p "$SH/pkg/tests" "$SH/other" && cd "$SH" || exit 1
git init -q .
printf 'add() { echo $(($1 + $2)); }\nsub() { echo $(($1 - $2)); }\n' > pkg/calc.sh
printf 'unused() { echo 1; }\n' > pkg/unused.sh
printf 'set -e\n. ./calc.sh\n[ "$(add 2 3)" = 5 ]\necho ok\n' > pkg/tests/test_calc.sh
# A test that leaves a background process behind after a normal exit.
printf 'sleep 30 &\necho $! > "%s"\nexit 0\n' "$TMP_ROOT/bg.pid" > pkg/tests/test_bg.sh
# A test that hangs, leaving a grandchild that ignores TERM.
printf '(trap "" TERM; sleep 60) &\necho $! > "%s"\nsleep 60\n' "$TMP_ROOT/gc.pid" > pkg/tests/test_hang.sh
printf 'not part of the package\n' > other/readme.txt
runner pkg/run-tests
profile './run-tests {tests}'
commit_all start
make_stat_dirty pkg/calc.sh
snapshot
new_id shell
ID="$NEW_ID"
out="$(pd setup --id "$ID" --working-tree --cwd pkg)"
check "$out" 'd["strategy"]=="worktree" and d["adapter"] is None and d["cwd"]=="pkg" and d["test_cmd_source"]=="profile" and [n for n in d["strategy_notes"] if "no swap adapter" in n]' "shell: no adapter matches, generic worktree path, --cwd recorded"
out="$(pd baseline --id "$ID" --test pkg/tests/test_calc.sh)"
check "$out" 'd["passed"] is True' "shell: baseline passes running in the --cwd directory with cwd-relative test paths"
out="$(pd run --id "$ID" --file pkg/calc.sh --find '$1 + $2' --replace '$1 * $2' --test pkg/tests/test_calc.sh)"
echo "       (shell worktree defect: $(field "$out" 'd["duration_s"]')s)"
check "$out" 'd["outcome"]=="caught"' "shell: guarded defect caught"
out="$(pd run --id "$ID" --file pkg/calc.sh --find '$1 - $2' --replace '$1 + $2' --test pkg/tests/test_calc.sh)"
check "$out" 'd["outcome"]=="survived" and d["auto_control"]=="caught" and d["control_ok"] is True' "shell: unguarded defect survives after the automatic control is caught"
out="$(pd run --id "$ID" --file pkg/unused.sh --find 'echo 1' --replace 'echo 2' --test pkg/tests/test_calc.sh)"
check "$out" 'd["outcome"]=="survived" and d["auto_control"]=="survived" and d["control_ok"] is False and [n for n in d["notes"] if "do not load" in n]' "shell: a file the tests never load gets its own control, which fails: not a trusted survivor"
out="$(pd run --id "$ID" --file pkg/calc.sh --find '$1 - $2' --replace '$1 + $2' --test pkg/tests/test_calc.sh)"
check "$out" 'd["outcome"]=="survived" and d["auto_control"] is None and d["control_ok"] is True' "shell: the calc.sh control still holds for calc.sh"
new_id shell2
ID2="$NEW_ID"
pd setup --id "$ID2" --working-tree --cwd pkg >/dev/null
out="$(pd run --id "$ID2" --file pkg/unused.sh --find 'echo 1' --replace 'echo 2' --test pkg/tests/test_calc.sh)"
check "$out" 'd["control_ok"] is False' "shell (reverse order): unused.sh first: control_ok false"
out="$(pd run --id "$ID2" --file pkg/calc.sh --find '$1 - $2' --replace '$1 + $2' --test pkg/tests/test_calc.sh)"
check "$out" 'd["outcome"]=="survived" and d["auto_control"]=="caught" and d["control_ok"] is True' "shell (reverse order): calc.sh then gets its own control, which holds"
# After a normal exit nothing in the test's process group is signalled.
rm -f "$TMP_ROOT/bg.pid"
out="$(pd baseline --id "$ID" --test pkg/tests/test_bg.sh)"
check "$out" 'd["passed"] is True' "shell: a test that exits normally passes"
if [ -s "$TMP_ROOT/bg.pid" ] && kill -0 "$(cat "$TMP_ROOT/bg.pid")" 2>/dev/null; then
    ok "shell: no signal is sent to the process group after a normal exit"
    kill "$(cat "$TMP_ROOT/bg.pid")" 2>/dev/null
else
    fail "shell: no signal is sent to the process group after a normal exit"
fi
# On timeout the whole group goes, even a grandchild that ignores TERM.
rm -f "$TMP_ROOT/gc.pid"
out="$(pd baseline --id "$ID" --test pkg/tests/test_hang.sh --timeout 2)"
check "$out" 'd["passed"] is False and [e for e in d["errors"] if "timed out" in e]' "shell: a hanging test times out"
if [ -s "$TMP_ROOT/gc.pid" ] && ! kill -0 "$(cat "$TMP_ROOT/gc.pid")" 2>/dev/null; then
    ok "shell: on timeout the process group is killed, TERM-ignoring grandchild included"
else
    fail "shell: on timeout the process group is killed, TERM-ignoring grandchild included"
    [ -s "$TMP_ROOT/gc.pid" ] && kill -9 "$(cat "$TMP_ROOT/gc.pid")" 2>/dev/null
fi
untouched "shell"
# The profile heading may be any level; test directory sets the cwd.
command cp -f .claude/wb/testing.md "$TMP_ROOT/shell-profile.bak"
printf '# Testing\n\n### Defect sandbox\n\n- **test command**: `./run-tests {tests}`\n- test directory: pkg\n\n### Other\n\n- test command: wrong\n' > .claude/wb/testing.md
new_id shell3
out="$(pd setup --id "$NEW_ID" --working-tree)"
check "$out" 'd["test_cmd_source"]=="profile" and d["test_cmd"]=="./run-tests {tests}" and d["cwd"]=="pkg"' "profile: a ### Defect sandbox heading is read, bold keys and backticks stripped, the section ends at the next heading"
pd teardown --id "$NEW_ID" >/dev/null
command cp -f "$TMP_ROOT/shell-profile.bak" .claude/wb/testing.md
pd teardown --id "$ID" >/dev/null
pd teardown --id "$ID2" >/dev/null

# ================================================================ hostile git config
# Local config names an fsmonitor hook, filter and diff drivers, and a pager
# that would create sentinel files; committed .gitattributes and
# .git/info/attributes route every file through them. None may run, and the
# copies hold the raw committed content.
HG="$TMP_ROOT/hostile"
HS="$TMP_ROOT/hostile-sentinel"
mkdir -p "$HG/tests" && cd "$HG" || exit 1
git init -q .
printf 'add() { echo $(($1 + $2)); }\n' > calc.sh
printf 'set -e\n. ./calc.sh\n[ "$(add 2 3)" = 5 ]\n' > tests/test_calc.sh
printf '* filter=evil diff=evil\n' > .gitattributes
runner run-tests
profile './run-tests {tests}'
commit_all start
printf '#!/bin/sh\ntouch "%s.fsmonitor"\nexit 1\n' "$HS" > "$TMP_ROOT/hfsmon.sh"
chmod +x "$TMP_ROOT/hfsmon.sh"
git config core.fsmonitor "$TMP_ROOT/hfsmon.sh"
git config filter.evil.clean "sh -c 'touch $HS.clean; cat'"
git config filter.evil.smudge "sh -c 'touch $HS.smudge; sed s/add/SMUDGED/'"
git config filter.evil.required true
git config diff.evil.textconv "sh -c 'touch $HS.textconv; cat'"
git config core.pager "sh -c 'touch $HS.pager; cat'"
git config pager.status "sh -c 'touch $HS.pager; cat'"
printf '* filter=evil diff=evil\n' > .git/info/attributes
sleep 1
touch calc.sh
FAKEGIT="$TMP_ROOT/fakegit"
mkdir -p "$FAKEGIT"
printf '#!/bin/sh\nfor a in "$@"; do case "$a" in --attr-source=*) echo "unknown option: $a" >&2; exit 129 ;; esac; done\nexec "%s" "$@"\n' "$(command -v git)" > "$FAKEGIT/git"
chmod +x "$FAKEGIT/git"
for variant in commit working-tree noattr; do
    new_id "hostile-$variant"
    VPATH="$PATH"
    [ "$variant" = noattr ] && VPATH="$FAKEGIT:$PATH"
    case "$variant" in
        working-tree) out="$(pd setup --id "$NEW_ID" --working-tree)" ;;
        *)            out="$(PATH="$VPATH" pd setup --id "$NEW_ID" --commit HEAD)" ;;
    esac
    check "$out" 'd["strategy"]=="worktree" and d["errors"]==[]' "hostile ($variant): setup works"
    grep -q SMUDGED "$DBASE/wb-defect-$NEW_ID/wt/calc.sh" && fail "hostile ($variant): the copy holds raw content" || ok "hostile ($variant): the copy holds raw content"
    out="$(PATH="$VPATH" pd run --id "$NEW_ID" --file calc.sh --find '$1 + $2' --replace '$1 * $2' --test tests/test_calc.sh)"
    check "$out" 'd["outcome"]=="caught"' "hostile ($variant): the defect is caught"
    pd teardown --id "$NEW_ID" >/dev/null
    for s in fsmonitor clean smudge textconv pager; do
        [ ! -e "$HS.$s" ] && ok "hostile ($variant): the $s command did not run" || fail "hostile ($variant): the $s command did not run"
        rm -f "$HS.$s"
    done
done

# ================================================================ file names
# The working-tree copy is made name by name: leading dashes and spaces are
# copied verbatim; a name with a control character is refused.
NM="$TMP_ROOT/names"
mkdir -p "$NM/tests" && cd "$NM" || exit 1
git init -q .
printf 'dash\n' > ./-rf
printf 'evil\n' > ./--evil
printf 'space\n' > './a b.txt'
printf 'add() { echo $(($1 + $2)); }\n' > calc.sh
printf 'set -e\n. ./calc.sh\n[ "$(cat ./-rf)" = dash ]\n[ "$(cat ./--evil)" = evil ]\n[ "$(cat "./a b.txt")" = space ]\n[ "$(add 2 3)" = 5 ]\n' > tests/test_names.sh
runner run-tests
profile './run-tests {tests}'
commit_all start
printf 'untracked\n' > './-u x'
printf '[ "$(cat "./-u x")" = untracked ]\n' > tests/test_untracked.sh
new_id names-wt
out="$(pd setup --id "$NEW_ID" --working-tree)"
check "$out" 'd["strategy"]=="worktree" and d["errors"]==[]' "names: working-tree setup with dash and space names"
out="$(pd baseline --id "$NEW_ID" --test tests/test_names.sh)"
check "$out" 'd["passed"] is True' "names: -rf, --evil, and a name with a space are copied verbatim"
out="$(pd baseline --id "$NEW_ID" --test tests/test_untracked.sh)"
check "$out" 'd["passed"] is True' "names: an untracked '-u x' is copied verbatim"
[ ! -e "$DBASE/wb-defect-$NEW_ID/wt/u x" ] && ok "names: no stray file from a misread option" || fail "names: no stray file from a misread option"
pd teardown --id "$NEW_ID" >/dev/null
new_id names-commit
out="$(pd setup --id "$NEW_ID" --commit HEAD)"
out="$(pd baseline --id "$NEW_ID" --test tests/test_names.sh)"
check "$out" 'd["passed"] is True' "names: the commit copy holds dash and space names verbatim"
pd teardown --id "$NEW_ID" >/dev/null
printf 'x\n' > "$NM/$(printf 'new\nline')"
new_id names-nl
out="$(pd setup --id "$NEW_ID" --working-tree)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "control character" in e]' "names: a working-tree name with a newline is refused"
pd teardown --id "$NEW_ID" >/dev/null
rm -f "$NM/$(printf 'new\nline')"

# ================================================================ sandbox
SBR="$TMP_ROOT/sandbox"
mkdir -p "$SBR/tests" "$SBR/.claude/wb" && cd "$SBR" || exit 1
git init -q .
COUNT="$TMP_ROOT/setup-count"
cat > .claude/wb/testing.md <<EOF
# Testing profile

## Defect sandbox

- strategy: sandbox
- test command: \`python3 -m pytest -q {tests}\`
- setup command: \`sh -c 'echo ran >> $COUNT'\`
- lockfile: deps.lock
- dependency dirs: node_modules
- env: WB_FIXTURE_ENV=sandboxed OTHER=1

## Something else

- strategy: none
EOF
printf 'v1\n' > deps.lock
printf '[pytest]\n' > pytest.ini
printf 'def add(a, b):\n    return a + b\n' > calc.py
printf 'import os\nfrom calc import add\n\n\ndef test_add():\n    assert os.environ.get("WB_FIXTURE_ENV") == "sandboxed"\n    assert add(2, 3) == 5\n' > tests/test_calc.py
commit_all start
new_id sb-a
SB_A="$NEW_ID"
out="$(pd setup --id "$SB_A" --commit HEAD)"
SB_COPY="$(field "$out" 'd["sandbox_copy"]')"
check "$out" 'd["strategy"]=="none" and d["needs_setup"] is True and d["sandbox_copy"].startswith("'"$XDG_CACHE_HOME"'/wb-defect/")' "sandbox: dependencies not installed: setup reports none with needs_setup"
check "$out" 'd["sandbox_copy"] in d["setup_hint"] and "deps.lock" in d["setup_hint"] and "node_modules" in d["setup_hint"]' "sandbox: the hint names the copy, the lockfile, and the missing directory"
check "$out" '[n for n in d["notes"] if "setup command" in n and "ignored" in n]' "sandbox: the profile's setup command is ignored, with a note"
[ ! -e "$COUNT" ] && ok "sandbox: no setup command ever runs" || fail "sandbox: no setup command ever runs"
[ -f "$SB_COPY/calc.py" ] && ok "sandbox: the copy is prepared for the user's install" || fail "sandbox: the copy is prepared for the user's install"
case "$(ls -ld "$XDG_CACHE_HOME/wb-defect")" in drwx------*) ok "sandbox: the cache directory is private (mode 700)" ;; *) fail "sandbox: the cache directory is private (mode 700)" ;; esac
mkdir -p "$SB_COPY/node_modules/dep"
out="$(pd setup --id "$SB_A" --commit HEAD)"
check "$out" 'd["strategy"]=="sandbox" and d["root"]=="'"$SB_COPY"'" and d["needs_setup"] is False and d["errors"]==[]' "sandbox: once the user has installed, setup uses the copy"
out="$(pd baseline --id "$SB_A" --test tests/test_calc.py)"
check "$out" 'd["passed"] is True' "sandbox: baseline passes with the profile env applied"
out="$(pd run --id "$SB_A" --file calc.py --find 'a + b' --replace 'a - b' --test tests/test_calc.py)"
echo "       (sandbox defect: $(field "$out" 'd["duration_s"]')s)"
check "$out" 'd["outcome"]=="caught" and d["strategy"]=="sandbox"' "sandbox: defect caught in the sandbox"
new_id sb-b
SB_B="$NEW_ID"
out="$(WB_DEFECT_LOCK_WAIT=1 pd setup --id "$SB_B" --commit HEAD)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "lock" in e]' "sandbox: a second setup while the lock is held reports none (lock)"
pd teardown --id "$SB_B" >/dev/null
out="$(pd teardown --id "$SB_A")"
check "$out" 'd["removed"] is True' "sandbox: teardown releases"
[ -d "$SB_COPY" ] && ok "sandbox: teardown leaves the copy in place" || fail "sandbox: teardown leaves the copy in place"
out="$(pd setup --id "$SB_B" --commit HEAD)"
check "$out" 'd["strategy"]=="sandbox" and d["root"]=="'"$SB_COPY"'"' "sandbox: after release, the next setup gets the same copy"
pd teardown --id "$SB_B" >/dev/null
# The key covers the profile: a different env is a different sandbox.
command cp -f .claude/wb/testing.md "$TMP_ROOT/sb-profile.bak"
sed 's/OTHER=1/OTHER=2/' "$TMP_ROOT/sb-profile.bak" > .claude/wb/testing.md
new_id sb-e
out="$(pd setup --id "$NEW_ID" --commit HEAD)"
check "$out" 'd["needs_setup"] is True and d["sandbox_copy"]!="'"$SB_COPY"'"' "sandbox: a changed profile field gives a different sandbox"
pd teardown --id "$NEW_ID" >/dev/null
command cp -f "$TMP_ROOT/sb-profile.bak" .claude/wb/testing.md
# A new commit with the same lockfile: a fresh copy of that commit, with the
# installed dependency directories carried over.
printf 'def add(a, b):\n    return a + b  # v2\n' > calc.py
commit_all v2
new_id sb-c
SB_C="$NEW_ID"
out="$(pd setup --id "$SB_C" --commit HEAD)"
SB_COPY2="$(field "$out" 'd["root"]')"
check "$out" 'd["strategy"]=="sandbox" and d["root"]!="'"$SB_COPY"'"' "sandbox: the key includes the commit: a new commit gets its own copy"
[ -d "$SB_COPY2/node_modules/dep" ] && grep -q v2 "$SB_COPY2/calc.py" && ok "sandbox: installed dependencies carry over when the lockfile is unchanged" || fail "sandbox: installed dependencies carry over when the lockfile is unchanged"
[ ! -e "$SB_COPY" ] && ok "sandbox: the previous copy is removed" || fail "sandbox: the previous copy is removed"
pd teardown --id "$SB_C" >/dev/null
printf 'v2\n' > deps.lock
commit_all bump
out="$(pd setup --id "$SB_C" --commit HEAD)"
check "$out" 'd["strategy"]=="none" and d["needs_setup"] is True' "sandbox: a changed lockfile needs a fresh install"
SB_COPY3="$(field "$out" 'd["sandbox_copy"]')"
mkdir -p "$SB_COPY3/node_modules/dep"
out="$(pd setup --id "$SB_C" --commit HEAD)"
check "$out" 'd["strategy"]=="sandbox"' "sandbox: ready again after the user installs"
rm -rf "$DBASE/wb-defect-$SB_C"
new_id sb-d
SB_D="$NEW_ID"
out="$(WB_DEFECT_LOCK_WAIT=1 pd setup --id "$SB_D" --commit HEAD)"
check "$out" 'd["strategy"]=="sandbox" and [n for n in d["notes"] if "stale" in n]' "sandbox: a stale lock (owner gone) is renamed aside and taken over"
pd teardown --id "$SB_D" >/dev/null
ls -d "$(dirname "$(dirname "$(field "$out" 'd["root"]')")")"/lock.* "$(dirname "$(field "$out" 'd["root"]')")"/lock.* >/dev/null 2>&1 && fail "sandbox: no renamed lock is left behind" || ok "sandbox: no renamed lock is left behind"
# A symlinked cache directory is refused.
mkdir -p "$TMP_ROOT/cache2" "$TMP_ROOT/cache-target"
ln -s "$TMP_ROOT/cache-target" "$TMP_ROOT/cache2/wb-defect"
new_id sb-f
out="$(XDG_CACHE_HOME="$TMP_ROOT/cache2" pd setup --id "$NEW_ID" --commit HEAD)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "symlink" in e]' "sandbox: a symlinked cache directory is refused"
[ -z "$(ls -A "$TMP_ROOT/cache-target")" ] && ok "sandbox: nothing written through the symlinked cache" || fail "sandbox: nothing written through the symlinked cache"
pd teardown --id "$NEW_ID" >/dev/null
# An XDG_CACHE_HOME that is not a private directory of the user is not used.
mkdir -p "$TMP_ROOT/home" "$TMP_ROOT/xdg-target"
ln -s "$TMP_ROOT/xdg-target" "$TMP_ROOT/xdg-link"
new_id sb-g
out="$(HOME="$TMP_ROOT/home" XDG_CACHE_HOME="$TMP_ROOT/xdg-link" pd setup --id "$NEW_ID" --commit HEAD)"
check "$out" 'd["sandbox_copy"].startswith("'"$TMP_ROOT"'/home/.cache/wb-defect/") and [n for n in d["notes"] if "XDG_CACHE_HOME" in n]' "sandbox: a symlinked XDG_CACHE_HOME is not used (falls back to ~/.cache, with a note)"
[ -z "$(ls -A "$TMP_ROOT/xdg-target")" ] && ok "sandbox: nothing written through the symlinked XDG_CACHE_HOME" || fail "sandbox: nothing written through the symlinked XDG_CACHE_HOME"
pd teardown --id "$NEW_ID" >/dev/null
# A symlinked ancestor of XDG_CACHE_HOME (not the directory itself) is also
# refused, and the ~/.cache fallback is used.
mkdir -p "$TMP_ROOT/anc-target"
ln -s "$TMP_ROOT/anc-target" "$TMP_ROOT/anc-link"
new_id sb-h
out="$(HOME="$TMP_ROOT/home" XDG_CACHE_HOME="$TMP_ROOT/anc-link/cache" pd setup --id "$NEW_ID" --commit HEAD)"
check "$out" 'd["sandbox_copy"].startswith("'"$TMP_ROOT"'/home/.cache/wb-defect/") and [n for n in d["notes"] if "XDG_CACHE_HOME" in n]' "sandbox: an XDG_CACHE_HOME under a symlinked ancestor is not used"
[ -z "$(ls -A "$TMP_ROOT/anc-target")" ] && ok "sandbox: nothing created under the symlinked ancestor" || fail "sandbox: nothing created under the symlinked ancestor"
pd teardown --id "$NEW_ID" >/dev/null
# The ~/.cache fallback gets the same check: a symlinked HOME is refused.
mkdir -p "$TMP_ROOT/home-target"
ln -s "$TMP_ROOT/home-target" "$TMP_ROOT/home-link"
new_id sb-i
out="$(env -u XDG_CACHE_HOME HOME="$TMP_ROOT/home-link" "$BASH_BIN" "$SCRIPT" setup --id "$NEW_ID" --commit HEAD)"
check "$out" 'd["strategy"]=="none" and [e for e in d["errors"] if "cache" in e]' "sandbox: a ~/.cache under a symlinked HOME is refused (none, with an error)"
[ -z "$(ls -A "$TMP_ROOT/home-target")" ] && ok "sandbox: nothing created through the symlinked HOME" || fail "sandbox: nothing created through the symlinked HOME"
pd teardown --id "$NEW_ID" >/dev/null
# Components created one at a time are private (mode 700).
new_id sb-j
out="$(HOME="$TMP_ROOT/home" XDG_CACHE_HOME="$TMP_ROOT/fresh/a/b" pd setup --id "$NEW_ID" --commit HEAD)"
case "$(ls -ld "$TMP_ROOT/fresh/a")" in drwx------*) ok "sandbox: missing cache components are created mode 700" ;; *) fail "sandbox: missing cache components are created mode 700" ;; esac
pd teardown --id "$NEW_ID" >/dev/null
[ -z "$(git status --porcelain)" ] && ok "sandbox: user's working tree clean throughout" || fail "sandbox: user's working tree clean throughout"

echo
echo "bash $BASH_VERSION: $PASS passed, $FAIL failed, $SKIP skipped"
[ "$FAIL" = 0 ]
