# Worker report

1. **What was implemented**: 28-day inclusive window, half-up rounding to one decimal, and a total line on the rides page. All 11 tests pass.
2. **Files created/modified**:
   - `rides/store.py`: `WINDOW_DAYS` 27 -> 28
   - `rides/view_model.py`: `round_distance` (half up, one decimal); `format_distance` uses it
   - `rides/views.py`: total line on the rides page
   - `tests/test_store.py`, `tests/test_view_model.py`, `tests/test_rides_page.py`
3. **Tests added/modified**:
   - Added `test_lists_a_ride_28_days_back_inclusive` (`tests/test_store.py`)
   - Added `test_rounds_half_up` (`tests/test_view_model.py`)
   - Renamed `test_keeps_a_whole_number_whole` to `test_shows_a_whole_number_with_one_decimal`, now expects `5.0 km` (AC-2)
   - New `tests/test_rides_page.py` (total, per-ride distance)
   - Tidied `tests/test_store.py` around a `ride()` helper
   - Updated `test_omits_rides_from_long_ago` to the AC-1 boundary (Sep 30)
4. **Test commands to verify**: `python3 -m pytest -q`
5. **Issues encountered**: none
6. **Beads status**: closed

Tests modified: tests/test_store.py, tests/test_view_model.py, tests/test_rides_page.py

## Test-writer reports

- test-writer report 1 (AC-1)
  - Files changed: `tests/test_store.py`
  - Pins: Oct 1 listed, Sep 30 not, today Oct 28
  - Red run: `AssertionError` (`assert [] == [{'date': datetime.date(2026, 10, 1), 'km': 6.0}]`)
  - Changes to earlier tests: moved the existing tests onto a `ride()` helper; `test_omits_rides_from_long_ago` now uses Sep 30 (was Aug 1). Reason: AC-1 makes Sep 30 the first day excluded, so the omit test pins that boundary instead of a date far outside the window
- test-writer report 2 (AC-2)
  - Files changed: `tests/test_view_model.py`
  - Pins: 12.25 -> `12.3 km`, 5 -> `5.0 km`
  - Red run: `AssertionError: assert '12.2 km' == '12.3 km'`
  - Changes to earlier tests: `test_keeps_a_whole_number_whole` renamed to `test_shows_a_whole_number_with_one_decimal`, expects `5.0 km` per AC-2
- test-writer report 3 (AC-3)
  - Files changed: `tests/test_rides_page.py`
  - Pins: AC-3 rides on Oct 28 -> `Total: 19.5 km`; the Oct 1 ride (6.25) -> `2026-10-01 - 6.3 km`
  - Red run: 2 failed, both `AssertionError` (no total line on the page; no `2026-10-01` ride on the page)
