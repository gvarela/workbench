#!/usr/bin/env bash
# AC-6: report-text checks for a /wb:test-audit report from a cold run on a real repository.
# The rest of AC-6 is a manual procedure (tasks.md Phase 6, Changes Required 5): instance recall
# against test-audit.md (7 of 11 fitness-agent, 10 of 16 sg-wholesale), the user's 8-of-10
# spot-check, and unchanged repository state. This script prints those as NOT CHECKED HERE.
# usage: ac6.sh <report.md> <sg-wholesale|fitness-agent>
set -o pipefail
if [ $# -ne 2 ] || [ ! -f "$1" ]; then
  echo "usage: ac6.sh <report.md> <sg-wholesale|fitness-agent>" >&2
  exit 2
fi
REPORT="$1"
REPO="$2"
FAILS=0
pass() { echo "PASS [ac6] $1"; }
fail() { FAILS=$((FAILS + 1)); echo "FAIL [ac6] $1"; }
has() { grep -Eiq "$1" "$REPORT"; }

case "$REPO" in
  sg-wholesale)
    for s in RSpec factory_bot VCR WebMock; do
      if has "$s"; then pass "report states the stack: $s"; else fail "report states the stack: $s"; fi
    done
    if has 'glossary_definitions_spec\.rb:11[0-9]'; then pass "report names the pending join test (spec/lib/glossary_definitions_spec.rb:111-118)"; else fail "report names the pending join test (spec/lib/glossary_definitions_spec.rb:111-118)"; fi
    ;;
  fitness-agent)
    for s in pytest pytest-postgresql; do
      if has "$s"; then pass "report states the stack: $s"; else fail "report states the stack: $s"; fi
    done
    ;;
  *) echo "unknown repository: $REPO" >&2; exit 2 ;;
esac

if has 'W1|hollow red' && has 'W2|edited after red|expectations? edited' && has 'not (checkable|checked|verifiable)|cannot be checked|can.?t be checked'; then
  pass "report states hollow reds (W1) and expectations edited after red (W2) are not checkable cold"
else
  fail "report states hollow reds (W1) and expectations edited after red (W2) are not checkable cold"
fi

# Every finding line (a bullet or row carrying a file:line) has a verdict and an evidence type.
NOVERDICT="$(grep -E '^([-*] |\|)' "$REPORT" | grep -E '[A-Za-z_/.-]+\.(rb|py|ts|js):[0-9]+' | grep -Eivc '(keep|rewrite|remove|consolidate).*(evidence|detector|tool|run|judgment)|(evidence|detector|tool|run|judgment).*(keep|rewrite|remove|consolidate)')"
TOTAL="$(grep -E '^([-*] |\|)' "$REPORT" | grep -Ec '[A-Za-z_/.-]+\.(rb|py|ts|js):[0-9]+')"
if [ "$TOTAL" -gt 0 ] && [ "$NOVERDICT" -eq 0 ]; then
  pass "each of $TOTAL findings has a verdict and an evidence type"
else
  fail "each finding has a verdict and an evidence type ($NOVERDICT of $TOTAL lack one)"
fi

echo "NOT CHECKED HERE [ac6] instance recall, user spot-check (8 of 10), and unchanged repository state (git status --porcelain, git stash list, git worktree list): see tasks.md Phase 6"
if [ "$FAILS" -eq 0 ]; then echo "RESULT [ac6] PASS (report-text clauses only)"; exit 0; fi
echo "RESULT [ac6] FAIL ($FAILS clause(s) failed)"
exit 1
