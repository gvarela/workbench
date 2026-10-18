#!/usr/bin/env bash
# AC-8: on a plan whose design.md has no Acceptance Criteria (the legacy variant), create_tasks
# and implement proceed as today and say the plan predates acceptance criteria; the verifier
# integrity step still runs and no red(AC-n) commit is demanded.
# usage: ac8.sh <run-out-dir>   (a create_tasks or implement run on the legacy variant)
# Known limit: the "proceeded rather than stopping" clause matches line by line, so a halt
# sentence wrapped across two lines ("...has no acceptance criteria section,\nI stopped here.")
# is not caught. The stage writes such sentences on one line in practice.
# Known limit: negated phrases are stripped before matching, so a double negative such as
# "I cannot not stop here: no acceptance criteria" is over-stripped and passes. Contrived English.
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
ac_init ac8 "$@"

TEXT="$OUT/assistant-text.txt"
[ -f "$TEXT" ] || { fail "assistant-text.txt exists in the run output"; ac_done; }

DESIGN="$(design_md "$OUT")"
if [ -n "$DESIGN" ] && ! grep -Eiq '^#+ .*Acceptance Criteria' "$DESIGN"; then
  pass "the run's design.md has no Acceptance Criteria section (legacy input)"
else
  fail "the run's design.md has no Acceptance Criteria section (legacy input)"
fi

if grep -Eiq 'predate[sd]? (the )?acceptance criteria|no acceptance criteria|without acceptance criteria|older plan' "$TEXT"; then
  pass "stage output says the plan predates acceptance criteria"
else
  fail "stage output says the plan predates acceptance criteria"
fi

# The claim: a pre-5.0.0 plan neither halts for the missing criteria nor demands red(AC-n).
# A halt for some other reason (a verifier's plan defect, say) does not trip this clause, so a
# line counts only when it ties a halt word to the missing criteria, or ties red(AC-n) to a demand.
# A negated halt or demand ("not stop", "no red(AC-n) commit is required") is stripped from the
# line before matching, so the rest of the line still counts ("I did not stop for the defect,
# but I stopped because there are no acceptance criteria" is a halt).
HALT_WORD='stop(p(ed|ing))?|halt(ed)?|cannot (proceed|continue)|can.t (proceed|continue)|blocked|refus|abort'
MISSING_CRITERIA='(no|missing|without|lacks?|absent|not have)[^.]{0,40}(acceptance criteria|criteria section)|criteria (are|is) (missing|absent)'
DEMAND_WORD='must|requires?|required|needs?|demand|missing'
NEGATED_HALT="(not|n't|never|without|rather than|instead of|no need to) (stop|halt|block|abort)|not (stopped|halted|blocked)"
NEGATED_DEMAND="no red\(AC-[^)]*\)( commits?)? (is |are )?(required|needed|demanded|expected)|(not|n't|never|without|nor) (be )?(require|need|demand|expect)|(is|are) not (required|needed|demanded)"
STOPPED_FOR_CRITERIA="$(sed -E "s/$NEGATED_HALT//Ig" "$TEXT" | grep -Ei "$HALT_WORD" | grep -Ei "$MISSING_CRITERIA")"
DEMANDS_RED="$(sed -E "s/$NEGATED_DEMAND//Ig" "$TEXT" | grep -Ei 'red\(AC-' | grep -Ei "$DEMAND_WORD")"
if [ -n "$STOPPED_FOR_CRITERIA$DEMANDS_RED" ]; then
  fail "the stage proceeded rather than stopping for the missing criteria" "$(printf '%s\n' "$STOPPED_FOR_CRITERIA" "$DEMANDS_RED" | sed '/^$/d' | head -2)"
else
  pass "the stage proceeded rather than stopping for the missing criteria"
fi

if [ -f "$OUT/git-log-names.txt" ] && grep -Eq '^SUBJECT red\(AC-' "$OUT/git-log-names.txt"; then
  fail "no red(AC-n) commit is demanded of a legacy plan"
else
  pass "no red(AC-n) commit is demanded of a legacy plan"
fi

# The no-test-edit rule still applies to a legacy plan: reuse ac4.sh's coverage clauses (every
# test-file change outside a red(AC-n) commit has a test-writer report) on the same run dir.
# Applies when the run is an implement run (git-log-names.txt and transcript.jsonl are present).
if [ -f "$OUT/git-log-names.txt" ] && [ -f "$OUT/transcript.jsonl" ]; then
  COVERAGE="$("$HERE/ac4.sh" "$OUT" | grep -E 'covered by a test-writer report|no test file was changed outside')"
  if [ -n "$COVERAGE" ] && ! grep -Eq '^FAIL ' <<<"$COVERAGE"; then
    pass "the no-test-edit rule still applies (ac4 coverage clauses pass)"
  else
    fail "the no-test-edit rule still applies (ac4 coverage clauses pass)" "$(grep -E '^FAIL ' <<<"$COVERAGE" | tr '\n' ';')"
  fi
fi

# Applies when the run is an implement run (a task-verifier spawn is expected there).
TOOL_USES=""
[ -f "$OUT/transcript.jsonl" ] && TOOL_USES="$(tool_uses "$OUT/transcript.jsonl")"
if grep -Eq '^Agent	' <<<"$TOOL_USES"; then
  if grep -Eiq '^Agent	.*task-verifier' <<<"$TOOL_USES"; then
    pass "the verifier integrity step still runs (wb:task-verifier spawned)"
  else
    fail "the verifier integrity step still runs (wb:task-verifier spawned)"
  fi
fi

ac_done
