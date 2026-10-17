#!/usr/bin/env bash

# Static checks for the testing-guidance plan (no model involved).
# Usage: bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh
#
# Run from anywhere inside the repository. Prints PASS, FAIL or SKIP per
# check and exits non-zero if any check fails. Base commit for size and
# diff comparisons is 9020332.

set -o pipefail

BASE=9020332
PLAN_DIR="docs/plans/2026-10-16-testing-guidance"
TASKS_MD="$PLAN_DIR/tasks.md"
AUDIT_DIR="$PLAN_DIR/validation/prompt-audits"

cd "$(git rev-parse --show-toplevel)" || exit 2

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
# NO_COLOR=1 (or a non-terminal stdout with NO_COLOR set) gives plain output for baselines.
if [ -n "${NO_COLOR:-}" ]; then GREEN='' RED='' YELLOW='' NC=''; fi

FAILS=0

pass() { printf "${GREEN}✓ PASS${NC}  %2s  %s\n" "$1" "$2"; }
skip() { printf "${YELLOW}⚠ SKIP${NC}  %2s  %s (%s)\n" "$1" "$2" "$3"; }
fail() {
  printf "${RED}✗ FAIL${NC}  %2s  %s\n" "$1" "$2"
  shift 2
  for line in "$@"; do printf "          %s\n" "$line"; done
  FAILS=$((FAILS + 1))
}

# report <n> <name> <detail...>: PASS when there are no detail lines, FAIL otherwise.
report() {
  local n=$1 name=$2 d
  shift 2
  local details=()
  for d in "$@"; do [ -n "$d" ] && details+=("$d"); done
  if [ ${#details[@]} -eq 0 ]; then pass "$n" "$name"; else fail "$n" "$name" "${details[@]}"; fi
}

# frontmatter_field <file> <key>: value of a top-level frontmatter key.
frontmatter_field() {
  awk -v key="$2" '
    NR == 1 && $0 == "---" { infm = 1; next }
    infm && $0 == "---" { exit }
    infm && index($0, key ":") == 1 { sub("^" key ":[ \t]*", ""); print; exit }
  ' "$1" 2>/dev/null
}

has_agent_tool() { grep -qE '(^|[ ,])Agent([ ,]|$)'; }

user_invocable_skills() {
  local f
  for f in plugin/skills/*/SKILL.md; do
    grep -qE '^(user-invocable: false|disable-model-invocation: true)' "$f" && continue
    basename "$(dirname "$f")"
  done
}

check_01() {
  local out=() s now base
  for s in implement implement_inline create_tasks create_design create_research \
    validate_execution help review-prep tdd-discipline; do
    now=$(wc -l <"plugin/skills/$s/SKILL.md" | tr -d ' ')
    base=$(git show "$BASE:plugin/skills/$s/SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
    [ "$now" -gt "$base" ] && out+=("$s grew: $base -> $now lines")
  done
  report 1 "No touched SKILL.md is longer than at base $BASE" "${out[@]}"
}

check_02() {
  local hits
  hits=$(grep -rlE '### Status: (PASS|FAIL)' plugin/ 2>/dev/null | grep -vE '^plugin/agents/(task-verifier|research-validator).md$')
  report 2 "Verdict marker '### Status: PASS|FAIL' only in verifier report templates (task-verifier, research-validator)" $hits
}

check_03() {
  local out=() a hits
  # Spawn-looking lines anywhere under plugin/ (agents included: task-worker spawns
  # test-writer) that name an agent without the wb: prefix. Only the agent's own
  # definition file is exempt from its own name.
  for a in test-writer test-reviewer test-auditor; do
    hits=$(grep -rnE 'subagent_type|[Ss]pawn' plugin/ --include='*.md' --include='*.sh' 2>/dev/null |
      grep -vE "^plugin/agents/$a\.md:" |
      grep -E "(^|[^:a-z-])$a([^.a-z-]|$)")
    [ -n "$hits" ] && out+=("$hits")
  done
  report 3 "Spawns of test-writer/test-reviewer/test-auditor use the wb: prefix" "${out[@]}"
}

check_04() {
  local out=() f a
  f=plugin/agents/test-writer.md
  if [ ! -f "$f" ]; then out+=("$f missing"); else
    [ "$(frontmatter_field $f model)" = sonnet ] || out+=("test-writer model != sonnet")
    [ "$(frontmatter_field $f effort)" = medium ] || out+=("test-writer effort != medium")
    [ "$(frontmatter_field $f skills)" = "[test-quality]" ] || out+=("test-writer skills != [test-quality]")
    frontmatter_field $f tools | has_agent_tool && out+=("test-writer tools include Agent")
  fi
  for a in test-reviewer test-auditor; do
    f=plugin/agents/$a.md
    if [ ! -f "$f" ]; then out+=("$f missing"); continue; fi
    [ "$(frontmatter_field $f model)" = opus ] || out+=("$a model != opus")
    [ "$(frontmatter_field $f effort)" = high ] || out+=("$a effort != high")
    [ "$(frontmatter_field $f skills)" = "[test-quality]" ] || out+=("$a skills != [test-quality]")
  done
  frontmatter_field plugin/agents/task-worker.md tools | has_agent_tool || out+=("task-worker tools lack Agent")
  report 4 "Agent frontmatter matches D3, D8a, D8b" "${out[@]}"
}

check_05() {
  local out=() hits
  grep -rqE 'Can this test fail' plugin/skills/test-quality/ 2>/dev/null ||
    out+=("rubric phrase absent from plugin/skills/test-quality/")
  hits=$(grep -rnE 'Can this test fail|Structure-insensitive' plugin/ 2>/dev/null | grep -v '^plugin/skills/test-quality/')
  [ -n "$hits" ] && out+=("rubric phrases outside test-quality:" "$hits")
  report 5 "Rubric phrases live only under plugin/skills/test-quality/" "${out[@]}"
}

check_06() {
  local hits
  hits=$(grep -nEi 'named exceptions|exception list' \
    plugin/skills/implement_inline/SKILL.md plugin/skills/implement_inline/templates.md)
  report 6 "implement_inline has no exception list of its own" "$hits"
}

check_07() {
  # Stages are user-invocable skills carrying a "needs from you" line. These
  # user-invocable skills are not stages (the help reference itself, review-prep,
  # and deprecated aliases) and are exempt from the line, heading and row.
  local exempt=" help mockup-iteration research-validation review-prep "
  local out=() help=plugin/skills/help/SKILL.md s table
  table=$(awk '/^## What each stage needs from you/ {on=1; next} on && /^## / {exit} on' "$help")
  for s in $(user_invocable_skills); do
    case "$exempt" in *" $s "*) continue ;; esac
    grep -q "needs from you" "plugin/skills/$s/SKILL.md" || out+=("$s: SKILL.md lacks 'needs from you' line")
    grep -qE "^### \`/wb:$s([ \`])" "$help" || out+=("$s: no Command Details heading in help")
    echo "$table" | grep -qE "^\|.*\`$s\`" || out+=("$s: no row in 'What each stage needs from you'")
  done
  report 7 "Help drift check for every user-invocable skill" "${out[@]}"
}

check_08() {
  local a b
  a=$(jq -r .version plugin/.claude-plugin/plugin.json)
  b=$(jq -r '.plugins[0].version' .claude-plugin/marketplace.json)
  report 8 "plugin.json and marketplace.json versions match" \
    "$([ "$a" = "$b" ] || echo "plugin.json=$a marketplace.json=$b")"
}

check_09() {
  local files out=() f
  # Tracked changes since base plus new untracked files under plugin/.
  files=$( { git diff --name-only "$BASE" -- plugin/; git ls-files --others --exclude-standard -- plugin/; } |
    grep -E '\.md$' | sort -u)
  for f in $files; do
    [ -f "$f" ] || continue
    ./plugin/scripts/lint "$f" >/dev/null 2>&1 || out+=("lint errors: $f")
  done
  report 9 "Lint zero-delta on markdown touched under plugin/" "${out[@]}"
}

check_10() {
  local name="claude plugin validate ./plugin" out
  if ! command -v claude >/dev/null 2>&1; then skip 10 "$name" "claude CLI absent"; return; fi
  if out=$(claude plugin validate ./plugin 2>&1); then pass 10 "$name"
  else fail 10 "$name" "$(echo "$out" | tail -3)"; fi
}

check_11() {
  local out=() dir=plugin/skills/validate_execution f block
  f=$dir/sub-agent-prompts.md
  # Only the "Verify test coverage" Task block must drop general-purpose; the
  # regressions agent in the same file may keep it.
  block=$(awk '
    /^Task\(\{/ { buf = ""; on = 1 }
    on { buf = buf $0 "\n" }
    on && /^\}\)/ { on = 0; if (buf ~ /description: "Verify test coverage"/) print buf }
  ' "$f" 2>/dev/null)
  echo "$block" | grep -q 'subagent_type: "general-purpose"' &&
    out+=("'Verify test coverage' Task block in $f still uses general-purpose")
  grep -rq 'wb:test-reviewer' "$dir/" || out+=("validate_execution does not reference wb:test-reviewer")
  report 11 "validate_execution has no general-purpose coverage agent and uses wb:test-reviewer" "${out[@]}"
}

check_12() {
  local f=plugin/skills/implement/reference.md name="implement/reference.md names a committed red outer test as expected state"
  if grep -qiE 'committed.*red.*outer test|red outer test.*committed' "$f"; then pass 12 "$name"
  else fail 12 "$name" "no such statement in $f"; fi
}

check_13() {
  local hits
  hits=$(grep -n 'NO additional test cases not specified' plugin/skills/implement/sub-agent-prompts.md)
  report 13 "sub-agent-prompts.md lacks 'NO additional test cases not specified'" "$hits"
}

check_14() {
  local name="beads-guide updated when plugin bd commands changed" changed
  # Changed lines since base plus every line of new untracked files under plugin/.
  changed=$( { git diff "$BASE" -- plugin/ | grep -E '^[+-][^+-]'
    git ls-files --others --exclude-standard -z -- plugin/ | xargs -0 grep -h . 2>/dev/null; } |
    grep -E '\bbd [a-z]')
  if [ -z "$changed" ]; then pass 14 "$name (no bd command changes)"; return; fi
  if git diff --quiet "$BASE" -- docs/beads-guide.md; then
    fail 14 "$name" "plugin/ changes bd commands but docs/beads-guide.md is unchanged"
  else pass 14 "$name"; fi
}

check_15() {
  local out=() s
  for s in create_tasks implement implement_inline; do
    grep -rq 'predates 5.0.0' "plugin/skills/$s/" || out+=("$s: no 'predates 5.0.0' fallback")
  done
  report 15 "'predates 5.0.0' fallback in create_tasks, implement, implement_inline" "${out[@]}"
}

check_16() {
  local hits
  hits=$(grep -rnE 'validation/(static-checks|run-headless|fixtures|baselines|checks|blind-trials|prompt-audits)|testing-guidance/validation' plugin/ 2>/dev/null)
  report 16 "No file under plugin/ references validation/" "$hits"
}

check_17() {
  local name="Closed applicable tasks have a prompt-audit report or the mechanical exemption"
  if ! command -v bd >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
    skip 17 "$name" "bd or jq absent"
    return
  fi
  local keys="phase2_impl_1 phase2_impl_2 phase2_impl_3 phase3_impl_1 phase3_impl_2
    phase4_impl_1 phase4_impl_2 phase4_impl_3 phase4_impl_4
    phase5_impl_1 phase5_impl_2 phase5_impl_3 phase5_impl_4
    phase6_impl_1 phase6_impl_2 phase6_impl_3 phase6_impl_4 phase7_integration_1"
  local out=() closed=0 key id json reason
  for key in $keys; do
    id=$(awk -v k="  $key:" 'index($0, k) == 1 { print $2; exit }' "$TASKS_MD")
    if [ -z "$id" ]; then out+=("$key: no beads id in tasks.md frontmatter"); continue; fi
    json=$(bd show "$id" --json 2>/dev/null) || continue
    [ "$(echo "$json" | jq -r '.[0].status // empty')" = closed ] || continue
    closed=$((closed + 1))
    [ -f "$AUDIT_DIR/$key.md" ] && continue
    reason=$(echo "$json" | jq -r '.[0].close_reason // ""')
    echo "$reason" | grep -qi mechanical && continue
    out+=("$key ($id): closed with no $AUDIT_DIR/$key.md and no mechanical exemption")
  done
  if [ ${#out[@]} -gt 0 ]; then fail 17 "$name" "${out[@]}"
  elif [ "$closed" -eq 0 ]; then skip 17 "$name" "no applicable tasks closed yet"
  else pass 17 "$name"; fi
}

for n in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17; do "check_$n"; done

echo
if [ "$FAILS" -gt 0 ]; then
  printf "${RED}%d check(s) failed${NC}\n" "$FAILS"
  exit 1
fi
printf "${GREEN}All checks passed${NC}\n"
