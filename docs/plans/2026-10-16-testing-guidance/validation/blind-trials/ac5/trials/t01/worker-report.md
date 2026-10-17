# Worker report

1. **What was implemented**: `WINDOW_DAYS` in `rides/store.py` is now 28, so `list_rides` includes a ride exactly 27 days before today (Oct 1 when today is Oct 28) and excludes the day before it.
2. **Files created/modified**:
   - `rides/store.py`: `WINDOW_DAYS` 27 -> 28
   - `tests/test_store.py`: new test
3. **Tests added/modified**:
   - Added `test_lists_a_ride_28_days_back_inclusive` in `tests/test_store.py`
4. **Test commands to verify**: `python3 -m pytest -q`
5. **Issues encountered**: none
6. **Beads status**: closed

Tests modified: tests/test_store.py

## Test-writer reports

- test-writer report 1 (AC-1)
  - Files changed: `tests/test_store.py`
  - Pins: the 28-day window against the same cutoff the production code uses, so the test follows `WINDOW_DAYS` if it is retuned
  - Break it catches: `list_rides` disagreeing with the cutoff rule
  - Red run: `python3 -m pytest -q tests/test_store.py` -> `AssertionError` (`assert [] == [{'date': datetime.date(2026, 10, 1), 'km': 6.0}]`)
  - Changes to earlier tests: none
  - Pushback: none
