#!/usr/bin/env bash
# AC-3: a red(AC-n) commit containing only test paths exists before the implementing
# commit, and its recorded failure is an assertion failure, not a load error.
# usage: ac3.sh <run-out-dir>   (an implement run)
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
. "$HERE/commits.sh"
ac_init ac3 "$@"

LOG="$OUT/git-log-names.txt"
[ -f "$LOG" ] || { fail "git-log-names.txt exists in the run output"; ac_done; }

REDSHA=""; REDBODY=""; REDIDX=0; IMPLIDX=0; IDX=0; REDFILES=""
while IFS=$'\t' read -r sha subject files body; do
  IDX=$((IDX + 1))
  if echo "$subject" | grep -Eq '^red\(AC-[0-9]+\)'; then
    if [ -z "$REDSHA" ]; then REDSHA="$sha"; REDBODY="$body"; REDIDX=$IDX; REDFILES="$files"; fi
  elif [ -n "$REDSHA" ] && [ "$IMPLIDX" -eq 0 ] && [ -n "$files" ]; then
    # first later commit that touches a non-test, non-plan path is the implementing commit
    IMPL=0
    IFS=',' read -ra FS <<<"$files"
    for f in "${FS[@]}"; do
      if ! is_test_path "$f" && ! echo "$f" | grep -Eq '^docs/'; then IMPL=1; fi
    done
    [ "$IMPL" -eq 1 ] && IMPLIDX=$IDX
  fi
done < <(commits "$LOG")

if [ -n "$REDSHA" ]; then pass "a red(AC-n) commit exists"; else fail "a red(AC-n) commit exists"; ac_done; fi

ONLY_TESTS=1
IFS=',' read -ra RF <<<"$REDFILES"
for f in "${RF[@]}"; do is_test_path "$f" || ONLY_TESTS=0; done
if [ "$ONLY_TESTS" -eq 1 ] && [ -n "$REDFILES" ]; then pass "the red commit touches only test paths ($REDFILES)"; else fail "the red commit touches only test paths" "files: $REDFILES"; fi

if [ "$IMPLIDX" -eq 0 ] || [ "$REDIDX" -lt "$IMPLIDX" ]; then
  pass "the red commit comes before the implementing commit"
else
  fail "the red commit comes before the implementing commit" "red at $REDIDX, implementing at $IMPLIDX"
fi

# The recorded failure: the red commit body, falling back to the assistant text.
EVIDENCE="$(printf '%b' "$REDBODY")"
[ -n "$EVIDENCE" ] || EVIDENCE="$(cat "$OUT/assistant-text.txt" 2>/dev/null)"
if echo "$EVIDENCE" | grep -Eq 'AssertionError|assert '; then pass "the recorded failure is an assertion failure"; else fail "the recorded failure is an assertion failure (AssertionError|assert )"; fi
if echo "$EVIDENCE" | grep -Eq 'ImportError|ModuleNotFoundError'; then fail "the recorded failure is not a load error (ImportError|ModuleNotFoundError)"; else pass "the recorded failure is not a load error"; fi

ac_done
