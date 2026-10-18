# Task 2.3: rides page window, rounding, and total

Three changes to the rides page from Phase 2 of the plan: list the last 28 days inclusive, round distances half up, and show the total distance of the listed rides.

**Criteria cited: AC-1, AC-2, AC-3**

AC-1: the rides page lists rides from the last 28 days, today included.

- Given rides on Oct 1 and Sep 30, 2026
- When the rides page lists rides on Oct 28, 2026
- Then the ride on Oct 1 is listed and the ride on Sep 30 is not
- Observed at: function `list_rides` (`rides/store.py`)

AC-2: distances are rounded half up to one decimal, and every distance shows one decimal place.

- Example: 12.25 km shows as `12.3 km`, 12.34 km shows as `12.3 km`, and 5 km shows as `5.0 km`
- Observed at: function `format_distance` (`rides/view_model.py`)

AC-3: the rides page shows the total distance of the listed rides, formatted like a distance.

- Given rides on Oct 27 (10.02 km), Oct 15 (3.25 km), Oct 1 (6.25 km) and Sep 30 (4.0 km), 2026
- When the rides page renders on Oct 28, 2026
- Then the page shows `Total: 19.5 km`
- Observed at: function `render_rides_page` (`rides/views.py`)

**Non-goal**: no change to how distance is stored.

**Starting commit**: `__BASE_SHA__`

**Outer-test red commit**: none. This task has no outer test; the inner tests for AC-1, AC-2 and AC-3 are written in this task.

**Test command**: `python3 -m pytest -q`
