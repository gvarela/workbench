#!/usr/bin/env bash
# Seed beads for the planned variant's tasks.md.
# Run INSIDE a scratch copy of the fixture (never in the real repository):
#   bash seed-beads.sh
# Initializes beads (stealth), creates the epic, the phase milestone, and one issue
# per task, wires dependencies, and rewrites the SEED_* placeholders in tasks.md
# with the created IDs. If seed-beads.vars exists next to this script, it is sourced
# after the defaults below, so a variant can replace any issue title or description.
set -euo pipefail

PLAN_DIR="docs/plans/2026-10-20-rides"
TASKS="$PLAN_DIR/tasks.md"

if [ ! -f "$TASKS" ]; then
  echo "seed-beads.sh: $TASKS not found; run this inside a scratch copy with the planned overlay applied" >&2
  exit 1
fi
if ! grep -q SEED_EPIC "$TASKS"; then
  echo "seed-beads.sh: $TASKS has no SEED_* placeholders (already seeded?)" >&2
  exit 1
fi
top=$(git rev-parse --show-toplevel 2>/dev/null) && [ "$top" != "$(pwd -P)" ] && { echo "refusing: inside git repo $top; run in a scratch copy" >&2; exit 1; }
if [ ! -d .git ]; then
  git init -q
fi

T_OUTER_1="AC-1: A ride 27 days before today is listed on the rides page and one 28 days before is not"
D_OUTER_1="Phase 1 outer-test step for AC-1, observed at the render_rides_page HTML. Examples: rides on 2026-10-01 (10.0 km) and 2026-09-30 (8.0 km), today 2026-10-28: the page contains 2026-10-01 and not 2026-09-30. Edge: a ride dated 2026-10-28 is listed. Test file: tests/test_rides_page.py (new). Done when the test fails on an assertion about the page and the red(AC-1) commit exists."
T_OUTER_2="AC-2: A distance halfway between two tenths rounds up on the rides page"
D_OUTER_2="Phase 1 outer-test step for AC-2, observed at the render_rides_page HTML. Examples: a ride on 2026-10-28 of 12.25 km, today 2026-10-28: the page contains 12.3 km. Edge: a ride of 1.15 km shows as 1.2 km. Test file: tests/test_rides_page.py; follows the AC-1 step to serialize access to that file (not a data dependency). Done when the test fails on an assertion about the page and the red(AC-2) commit exists."
T_OUTER_3="AC-3: The today page shows the day's total distance"
D_OUTER_3="Phase 1 outer-test step for AC-3, observed at the render_today_page HTML. Example: rides on 2026-10-28 of 10.0 km and 2.5 km and one on 2026-10-27 of 7.0 km, today 2026-10-28: the page contains 'Total: 12.5 km'. Test file: tests/test_today_page.py. Done when the test fails on an assertion about the page and the red(AC-3) commit exists."
T_IMPL_1="Set WINDOW_DAYS to 28 at rides/store.py:4"
D_IMPL_1="Phase 1 implementation task. Serves: AC-1. Set WINDOW_DAYS = 28 in rides/store.py:4 (tasks.md Change 1); the cutoff and range at rides/store.py:9-10 stay unchanged. Inner cases: none beyond the criterion examples. Done when python3 -m pytest -q tests/test_rides_page.py tests/test_store.py passes."
T_IMPL_2="Round half up in format_distance at rides/view_model.py:4-6"
D_IMPL_2="Phase 1 implementation task. Serves: AC-2. Round through Decimal(str(km)) with ROUND_HALF_UP; an int stays whole and a float keeps its one decimal (tasks.md Change 2). Inner cases in tests/test_view_model.py: format_distance(1.15) returns '1.2 km'; format_distance(10.0) returns '10.0 km'; format_distance(5) still returns '5 km'. Existing expectation: tests/test_view_model.py:9 expects format_distance(12.25) == '12.2 km'; under AC-2 it becomes '12.3 km'. Done when python3 -m pytest -q passes."
T_IMPL_3="Add the day total to render_today_page at rides/views.py:14-17"
D_IMPL_3="Phase 1 implementation task. Serves: AC-3. Add a total line ('Total: ' then the distance, e.g. 'Total: 12.5 km') after the list in render_today_page, summing today's rides only and formatted with format_distance (tasks.md Change 3). Inner cases: none beyond the criterion example. Done when python3 -m pytest -q tests/test_today_page.py passes."

if [ -f seed-beads.vars ]; then
  # shellcheck disable=SC1091
  . ./seed-beads.vars
fi

bd init --stealth --non-interactive --quiet >/dev/null

epic=$(bd create "Rides window, distance rounding, and today's total" -t epic --silent \
  -d "Implementation tracking for rides. See tasks.md for the detailed plan.")
milestone=$(bd create "Phase 1: Window, Rounding, and Today's Total" -t task --parent "$epic" --silent \
  -d "Phase 1 milestone; closes when all Phase 1 tasks are closed")
outer1=$(bd create "$T_OUTER_1" -t task --parent "$epic" --silent -d "$D_OUTER_1")
outer2=$(bd create "$T_OUTER_2" -t task --parent "$epic" --silent -d "$D_OUTER_2")
outer3=$(bd create "$T_OUTER_3" -t task --parent "$epic" --silent -d "$D_OUTER_3")
impl1=$(bd create "$T_IMPL_1" -t task --parent "$epic" --silent -d "$D_IMPL_1")
impl2=$(bd create "$T_IMPL_2" -t task --parent "$epic" --silent -d "$D_IMPL_2")
impl3=$(bd create "$T_IMPL_3" -t task --parent "$epic" --silent -d "$D_IMPL_3")

# The milestone is blocked by every task of the phase.
for t in "$outer1" "$outer2" "$outer3" "$impl1" "$impl2" "$impl3"; do
  bd dep add "$milestone" "$t" >/dev/null
done
# Each implementation task consumes the outer test of the criterion it serves.
bd dep add "$impl1" "$outer1" >/dev/null
bd dep add "$impl2" "$outer2" >/dev/null
bd dep add "$impl3" "$outer3" >/dev/null
# File-overlap edge: both outer steps write tests/test_rides_page.py.
bd dep add "$outer2" "$outer1" >/dev/null

sed -i.bak \
  -e "s/SEED_EPIC/$epic/g" \
  -e "s/SEED_MILESTONE/$milestone/g" \
  -e "s/SEED_OUTER_1/$outer1/g" \
  -e "s/SEED_OUTER_2/$outer2/g" \
  -e "s/SEED_OUTER_3/$outer3/g" \
  -e "s/SEED_IMPL_1/$impl1/g" \
  -e "s/SEED_IMPL_2/$impl2/g" \
  -e "s/SEED_IMPL_3/$impl3/g" \
  "$TASKS"
rm -f "$TASKS.bak"

echo "epic=$epic milestone=$milestone outer1=$outer1 outer2=$outer2 outer3=$outer3 impl1=$impl1 impl2=$impl2 impl3=$impl3"
