#!/usr/bin/env bash
# AC-7: research.md has a Testing conventions section; with a profile present it cites the
# profile and lists drift between profile and code.
# usage: ac7.sh <run-out-dir> [with-profile]   (a create_research run; name the variant to check the profile clauses)
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
ac_init ac7 "$@"
VARIANT="${2:-base}"

RESEARCH="$(research_md "$OUT")"
if [ -z "$RESEARCH" ]; then fail "a research.md exists in the run output"; ac_done; fi

if grep -Eiq '^#+ .*Testing conventions' "$RESEARCH"; then pass "research.md has a Testing conventions section"; else fail "research.md has a Testing conventions section"; fi

if [ "$VARIANT" = with-profile ]; then
  if grep -Fq '.claude/wb/testing.md' "$RESEARCH"; then pass "research.md cites the profile (.claude/wb/testing.md)"; else fail "research.md cites the profile (.claude/wb/testing.md)"; fi
  if grep -Eiq 'drift' "$RESEARCH"; then pass "research.md lists drift between profile and code"; else fail "research.md lists drift between profile and code"; fi
  if grep -Eiq 'playwright' "$RESEARCH"; then pass "the drift names the Playwright config the profile contradicts"; else fail "the drift names the Playwright config the profile contradicts"; fi
fi

ac_done
