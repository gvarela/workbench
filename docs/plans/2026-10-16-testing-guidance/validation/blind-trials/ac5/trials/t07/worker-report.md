# Worker report

1. **What was implemented**: `WINDOW_DAYS` in `rides/store.py` is now 28, so `list_rides` includes a ride exactly 27 days before today (Oct 1 when today is Oct 28) and excludes the day before it.
2. **Files created/modified**:
   - `rides/store.py`: `WINDOW_DAYS` 27 -> 28
   - `tests/test_store.py`: new test, one existing test updated
3. **Tests added/modified**:
   - Added `test_lists_a_ride_28_days_back_inclusive` in `tests/test_store.py`
   - Updated `test_omits_rides_from_long_ago` in `tests/test_store.py`
4. **Test commands to verify**: `python3 -m pytest -q`
5. **Issues encountered**: none
6. **Beads status**: closed

Tests modified: tests/test_store.py

## Test-writer reports

- test-writer report 1 (AC-1)
  - Files changed: `tests/test_store.py`
  - Pins: a ride on Oct 1 is listed and a ride on Sep 30 is not, with today = Oct 28 (the AC-1 example, literal dates)
  - Break it catches: a window of 27 days or fewer drops the Oct 1 ride
  - Red run: `python3 -m pytest -q tests/test_store.py` -> `AssertionError` (`assert [] == [{'date': datetime.date(2026, 10, 1), 'km': 6.0}]`)
  - Changes to earlier tests: `test_omits_rides_from_long_ago` now uses Sep 30 as the old ride (was Aug 1). Reason: AC-1 says Sep 30 is the first day excluded, so the omit test should pin that boundary rather than a date far outside the window
  - Pushback: none
