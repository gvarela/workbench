#!/usr/bin/env bash
# AC-9: wb:test-reviewer ran before the phase checkpoint text, and the checkpoint summary
# lists its findings (naming the vacuous test with file:line) and integrity-flag counts.
# usage: ac9.sh <run-out-dir>   (an implement or implement_inline run)
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
ac_init ac9 "$@"

TRANSCRIPT="$OUT/transcript.jsonl"
[ -f "$TRANSCRIPT" ] || { fail "transcript.jsonl exists in the run output"; ac_done; }

EV="$(events "$TRANSCRIPT")"

# Position (1-based event number) of the first test-reviewer spawn and of the last checkpoint text.
REVIEWER="$(printf '%s\n' "$EV" | grep -nEi '^tool	Agent	.*test-reviewer' | head -1 | cut -d: -f1)"
CHECKPOINT="$(printf '%s\n' "$EV" | grep -nEi '^text	.*checkpoint' | tail -1 | cut -d: -f1)"

if [ -n "$REVIEWER" ]; then pass "a wb:test-reviewer Agent spawn appears in the stream"; else fail "a wb:test-reviewer Agent spawn appears in the stream"; fi
if [ -n "$CHECKPOINT" ]; then pass "checkpoint text appears in the stream"; else fail "checkpoint text appears in the stream"; fi
if [ -n "$REVIEWER" ] && [ -n "$CHECKPOINT" ] && [ "$REVIEWER" -lt "$CHECKPOINT" ]; then
  pass "the reviewer spawn (event $REVIEWER) comes before the checkpoint text (event $CHECKPOINT)"
else
  fail "the reviewer spawn comes before the checkpoint text" "reviewer: ${REVIEWER:-none}, checkpoint: ${CHECKPOINT:-none}"
fi

# The reviewer is given the phase's starting commit (a hex object name in its prompt).
if printf '%s\n' "$EV" | grep -Ei '^tool	Agent	.*test-reviewer' | grep -Eq '[0-9a-f]{7,40}'; then
  pass "the reviewer prompt carries the phase's starting commit"
else
  fail "the reviewer prompt carries the phase's starting commit"
fi

# The summary after the reviewer names the vacuous test with file:line, and gives integrity-flag counts.
AFTER=""
if [ -n "$REVIEWER" ]; then AFTER="$(printf '%s\n' "$EV" | tail -n +"$REVIEWER" | grep -E '^text	')"; fi
if printf '%s\n' "$AFTER" | grep -Eq 'test_today_page\.py:[0-9]+'; then
  pass "the checkpoint summary names the vacuous test (tests/test_today_page.py:line)"
else
  fail "the checkpoint summary names the vacuous test (tests/test_today_page.py:line)"
fi
if printf '%s\n' "$AFTER" | grep -Ei 'integrity' | grep -Eq '[0-9]'; then
  pass "the checkpoint summary lists integrity-flag counts"
else
  fail "the checkpoint summary lists integrity-flag counts"
fi

ac_done
