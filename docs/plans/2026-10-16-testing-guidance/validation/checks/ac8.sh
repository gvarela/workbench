#!/usr/bin/env bash
# AC-8: on a plan whose design.md has no Acceptance Criteria (the legacy variant), create_tasks
# and implement proceed as today and say the plan predates acceptance criteria; the verifier
# integrity step still runs and no red(AC-n) commit is demanded.
# usage: ac8.sh <run-out-dir>   (a create_tasks or implement run on the legacy variant)
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

if grep -Eiq 'stopp?ed|cannot proceed|blocked|plan defect' "$TEXT" && ! grep -Eiq 'proceed' "$TEXT"; then
  fail "the stage proceeded rather than stopping for the missing criteria"
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
  if [ -n "$COVERAGE" ] && ! echo "$COVERAGE" | grep -Eq '^FAIL '; then
    pass "the no-test-edit rule still applies (ac4 coverage clauses pass)"
  else
    fail "the no-test-edit rule still applies (ac4 coverage clauses pass)" "$(echo "$COVERAGE" | grep -E '^FAIL ' | tr '\n' ';')"
  fi
fi

# Applies when the run is an implement run (a task-verifier spawn is expected there).
if [ -f "$OUT/transcript.jsonl" ] && tool_uses "$OUT/transcript.jsonl" | grep -Eq '^Agent	'; then
  if tool_uses "$OUT/transcript.jsonl" | grep -Eiq '^Agent	.*task-verifier'; then
    pass "the verifier integrity step still runs (wb:task-verifier spawned)"
  else
    fail "the verifier integrity step still runs (wb:task-verifier spawned)"
  fi
fi

ac_done
