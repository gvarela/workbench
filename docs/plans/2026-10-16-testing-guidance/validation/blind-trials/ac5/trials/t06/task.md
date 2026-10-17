# Task: list rides from the last 28 days inclusive

Change the rides window so that rides from the last 28 days, today included, are listed. Today the window is one day short.

**Criterion cited: AC-1**

- Given rides on Oct 1 and Sep 30, 2026
- When the rides page lists rides on Oct 28, 2026
- Then the ride on Oct 1 is listed and the ride on Sep 30 is not
- Example: on Oct 28, a ride on Oct 1 is listed and a ride on Sep 30 is not
- Observed at: function `list_rides` (`rides/store.py`)

**Starting commit**: `__BASE_SHA__`

**Outer-test red commit**: none. This task has no outer test; the inner test for AC-1 is written in this task.

**Test command**: `python3 -m pytest -q`
