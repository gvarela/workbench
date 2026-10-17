#!/usr/bin/env bash
# AC-2: design.md's Harness Decisions table lists the UI boundary with one of
# use as is / add harness / manual / lower proxy; with "add harness", tasks.md has a harness
# task before the task that writes the wizard focus criterion's outer test.
# usage: ac2.sh <run-out-dir>   (a create_design run for the design clauses; a create_tasks run adds the tasks clauses)
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
ac_init ac2 "$@"

DESIGN="$(design_md "$OUT")"
if [ -z "$DESIGN" ]; then
  fail "a design.md exists in the run output"
  ac_done
fi

if grep -Eiq '^#+ .*Harness Decisions' "$DESIGN"; then pass "design.md has a Harness Decisions section"; else fail "design.md has a Harness Decisions section"; fi

# Only rows inside the Harness Decisions section count: from its heading to the next heading of
# equal or higher level (a UI row in Risk Analysis or Traceability is not a harness decision).
SECTION="$(awk '
  /^#+ / {
    match($0, /^#+/); lvl = RLENGTH
    if (insec && lvl <= seclvl) { insec = 0 }
    if (!insec && tolower($0) ~ /^#+ .*harness decisions/) { insec = 1; seclvl = lvl; next }
  }
  insec { print }
' "$DESIGN")"
ROW="$(printf '%s\n' "$SECTION" | grep -E '^\|' | grep -Ei '(^|[^a-z])UI([^a-z]|$)|browser|wizard' | head -1)"
if [ -n "$ROW" ]; then pass "a Harness Decisions table row lists the UI boundary"; else fail "a Harness Decisions table row lists the UI boundary"; fi

if echo "$ROW" | grep -Eiq 'use as is|add harness|manual|lower proxy'; then
  pass "the UI row's decision is one of: use as is, add harness, manual, lower proxy"
else
  fail "the UI row's decision is one of: use as is, add harness, manual, lower proxy" "row: $ROW"
fi

if echo "$ROW" | grep -Eiq 'lower proxy'; then
  if echo "$ROW" | grep -Eiq 'loss|lose|cannot|does not|not check'; then pass "a lower-proxy decision states the loss"; else fail "a lower-proxy decision states the loss"; fi
fi

if echo "$ROW" | grep -Eiq 'add harness'; then
  TASKS="$(tasks_md "$OUT")"
  if [ -z "$TASKS" ]; then
    fail "tasks.md exists (needed when the decision is add harness)"
  else
    # Only list lines under "#### Harness Tasks" and "#### Outer Test Steps" headings count (a Testing
    # Strategy bullet that names a harness does not). Both are taken at the UI boundary, so another
    # boundary's outer-test steps in an earlier phase do not matter; a UI outer test in an earlier
    # phase than the UI harness task still fails because its line number is lower.
    BOUNDARY='(^|[^a-z])ui([^a-z]|$)|browser|wizard|focus'
    HLINE="$(awk -v re="$BOUNDARY" '
      /^#+ / { sec = (tolower($0) ~ /harness tasks/) ? "h" : "" }
      sec == "h" && /^[[:space:]]*(-|[0-9]+\.) / && tolower($0) ~ re { print NR; exit }
    ' "$TASKS")"
    OLINE="$(awk -v re="$BOUNDARY" '
      /^#+ / { sec = (tolower($0) ~ /outer test steps/) ? "o" : "" }
      sec == "o" && /^[[:space:]]*(-|[0-9]+\.) / && tolower($0) ~ re { print NR; exit }
    ' "$TASKS")"
    if [ -n "$HLINE" ]; then pass "tasks.md has a harness task"; else fail "tasks.md has a harness task"; fi
    if [ -n "$HLINE" ] && [ -n "$OLINE" ] && [ "$HLINE" -lt "$OLINE" ]; then
      pass "the harness task (line $HLINE) comes before the focus criterion's outer test (line $OLINE)"
    else
      fail "the harness task comes before the focus criterion's outer test" "harness line: ${HLINE:-none}, outer-test line: ${OLINE:-none}"
    fi
  fi
fi

ac_done
