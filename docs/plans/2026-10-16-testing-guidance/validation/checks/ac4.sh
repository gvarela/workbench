#!/usr/bin/env bash
# AC-4: every test-file change made outside a red(AC-n) commit is covered by a
# test-writer report in the run's output, with a reason.
# usage: ac4.sh <run-out-dir>   (an implement run)
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
. "$HERE/commits.sh"
ac_init ac4 "$@"

LOG="$OUT/git-log-names.txt"
[ -f "$LOG" ] || { fail "git-log-names.txt exists in the run output"; ac_done; }
[ -f "$OUT/transcript.jsonl" ] || { fail "transcript.jsonl exists in the run output"; ac_done; }

# Test-writer reports live in worker output (agent results), so search the whole transcript.
TRANSCRIPT="$OUT/transcript.jsonl"

if events "$TRANSCRIPT" | grep -Eiq '^tool	Agent	.*test-writer'; then
  pass "a wb:test-writer agent was spawned"
else
  fail "a wb:test-writer agent was spawned"
fi

if grep -Eiq 'Test-writer reports?' "$TRANSCRIPT"; then pass "worker output has a Test-writer reports field"; else fail "worker output has a Test-writer reports field"; fi

CHANGED=""
while IFS=$'\t' read -r sha subject files body; do
  echo "$subject" | grep -Eq '^red\(AC-[0-9]+\)' && continue
  [ "$subject" = base ] && continue
  IFS=',' read -ra FS <<<"$files"
  for f in "${FS[@]}"; do
    if is_test_path "$f"; then CHANGED="$CHANGED $f"; fi
  done
done < <(commits "$LOG")

if [ -z "$CHANGED" ]; then
  pass "no test file was changed outside a red(AC-n) commit"
else
  for f in $CHANGED; do
    base="$(basename "$f")"
    if grep -Eiq "test-writer.*$base|$base.*test-writer" "$TRANSCRIPT"; then
      pass "test change $f is covered by a test-writer report"
    else
      fail "test change $f is covered by a test-writer report"
    fi
  done
fi

if grep -Ei 'test-writer' "$TRANSCRIPT" | grep -Eiq 'reason|because|why'; then pass "a test-writer report states a reason"; else fail "a test-writer report states a reason"; fi

ac_done
