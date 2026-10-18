#!/usr/bin/env bash
# Seed beads for the legacy variant's tasks.md.
# Run INSIDE a scratch copy of the fixture (never in the real repository):
#   bash seed-beads.sh
# Initializes beads (stealth), creates the epic, the phase milestone, and one issue
# per task, wires dependencies, and rewrites the SEED_* placeholders in tasks.md
# with the created IDs.
set -euo pipefail

PLAN_DIR="docs/plans/2026-10-20-rides"
TASKS="$PLAN_DIR/tasks.md"

if [ ! -f "$TASKS" ]; then
  echo "seed-beads.sh: $TASKS not found; run this inside a scratch copy with the legacy overlay applied" >&2
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

bd init --stealth --non-interactive --quiet >/dev/null

epic=$(bd create "Rides window and distance rounding" -t epic --silent \
  -d "Legacy fixture epic: 28-day window and half-up rounding")
milestone=$(bd create "Phase 1: Window and Rounding" -t task --parent "$epic" --silent \
  -d "Phase 1 milestone; closes when all Phase 1 tasks are closed")
impl1=$(bd create "Change the window in rides/store.py to 28 days" -t task --parent "$epic" --silent \
  -d "Set WINDOW_DAYS = 28 in rides/store.py:4. Tests: Oct 1 listed and Sep 30 not, with today = Oct 28.")
impl2=$(bd create "Round half up in rides/view_model.py" -t task --parent "$epic" --silent \
  -d "Use Decimal with ROUND_HALF_UP in format_distance (rides/view_model.py:6). format_distance(2.25) returns '2.3 km'; format_distance(10.0) still returns '10.0 km' and format_distance(5) still returns '5 km'.")
test1=$(bd create "Add tests for the window and rounding" -t task --parent "$epic" --silent \
  -d "Add tests in tests/test_store.py and tests/test_view_model.py for the 28-day window, half-up rounding, and the trailing-zero float case.")

# The milestone is blocked by every task of the phase.
for t in "$impl1" "$impl2" "$test1"; do
  bd dep add "$milestone" "$t" >/dev/null
done

sed -i.bak \
  -e "s/SEED_EPIC/$epic/g" \
  -e "s/SEED_MILESTONE/$milestone/g" \
  -e "s/SEED_IMPL_1/$impl1/g" \
  -e "s/SEED_IMPL_2/$impl2/g" \
  -e "s/SEED_TEST_1/$test1/g" \
  "$TASKS"
rm -f "$TASKS.bak"

echo "epic=$epic milestone=$milestone impl1=$impl1 impl2=$impl2 test1=$test1"
