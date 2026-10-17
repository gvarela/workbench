---
project: rides
ticket: null
created: 2026-10-20
status: approved
last_updated: 2026-10-17
depends_on: research.md
design_approach: Correct the window constant
---

# Design: Rides Window Off-by-One

## Problem Statement

The README Goal says: "The rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered." This design covers only the first half, the rides window.

The rides page drops the oldest day of the intended window. `list_rides` sets `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` with `WINDOW_DAYS = 27` (`rides/store.py:4`, `rides/store.py:9`). The listed range is therefore today plus the 26 days before it, which is 27 calendar days rather than 28. On Oct 28 the cutoff is Oct 2, so a ride on Oct 1 (27 days before today) is not shown (research.md, "Rides window"). A rider looking at the page sees a window one day short of what was promised.

The bug report describes the dropped ride as "exactly 28 days old". This design follows the README's concrete example, which is the more precise statement: on Oct 28 a ride on Oct 1 is listed and one on Sep 30 is not. "28 days" names the length of the inclusive window, not the age of the oldest ride.

### Success Metrics

- **M1**: With `today` = 2026-10-28, the rides page lists a ride dated 2026-10-01 (27 days before today) and does not list a ride dated 2026-09-30 (28 days before today). (refines: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)")
- Deferred: "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)". This run's scope is limited to the one-line rides fix. The wizard focus behavior needs its own design pass, which will also need a browser harness (research found none).

### Constraints

- The change is limited to one line, so there is no refactor of the date-window code.
- The `list_rides(rides, today)` contract stays the same: same signature, newest-first order, inclusive bounds at both ends, and no future rides (`rides/store.py:7-11`).
- Non-goals hold: no change to how distance is stored and no new pages.

## Design Approach

Change the value of `WINDOW_DAYS` from 27 to 28 and leave the cutoff expression `today - timedelta(days=WINDOW_DAYS - 1)` alone. The cutoff becomes today minus 27 days, so the inclusive range `cutoff <= date <= today` covers exactly 28 calendar days.

### Why This Approach

- It is the smallest change: one constant, one line.
- The constant then means what its name says, the window length in days.
- It matches the existing "length minus one" form for inclusive windows. `load_series` writes a 7-day week as `end - timedelta(days=6)` (`rides/store.py:18-19`), and `list_rides` already writes `WINDOW_DAYS - 1`. Only the value was wrong.
- After the fix the rides list covers the same range as the four 7-day buckets in `load_series` (today back to today minus 27), per the integration analysis.

## Technical Decisions

### Architecture

- The window length is still one module-level constant in `rides/store.py`.
  - Rationale: `WINDOW_DAYS` is read in one place only (`rides/store.py:9`), and nothing else in code or tests references it, so changing its value has no other effect.
  - Trade-off: `load_series` keeps its own literals (`4`, `7`, `6`) and is not tied to `WINDOW_DAYS`. Unifying them is out of scope.
  - Pattern reference: `rides/store.py:4`, `rides/store.py:9`, `rides/store.py:18-19`.

### Data Model

- No change. A ride is still a dict with `date` (a `datetime.date`) and `km` (a float) (`rides/store.py:1`).

### Integration Points

- `render_rides_page` (`rides/views.py:6-11`) is the only production caller of `list_rides`. Its output gains one `<li class="ride">` for a ride on the restored boundary day and is otherwise unchanged.
- `load_series` and `render_today_page` do not use the window and are not affected.
- Existing tests in `tests/test_store.py` use dates well inside the window (Oct 20, Oct 25, today) or far outside it (Aug 1), so none of them change outcome.

## Scope Definition

### In Scope

- Changing the rides page window so it lists rides from 27 days before today through today, and excludes rides from 28 or more days before.

### Out of Scope

- The check-in wizard focus behavior (`wizard/`), deferred to a separate design.
- Distance formatting (`rides/view_model.py`).
- `load_series` and its literals.
- Renaming `WINDOW_DAYS` or restructuring the cutoff expression.
- Sharing the `TODAY` test constant across test files.

## Success Criteria

### Acceptance Criteria

- **AC-1 The rides page includes the oldest day of the 28-day window and excludes the day before it**
  - Given today is 2026-10-28 and there are rides dated 2026-10-02, 2026-10-01, and 2026-09-30
  - When the rides page is rendered
  - Then the rides dated 2026-10-02 and 2026-10-01 appear as `<li class="ride">` entries, newest first, and the ride dated 2026-09-30 does not appear
  - Example: rides on 2026-10-01 (12.0 km) and 2026-09-30 (8.0 km), today 2026-10-28 → the page contains `2026-10-01 - 12.0 km` and does not contain `2026-09-30`
  - Example (edge): a ride on 2026-10-01 alone with today 2026-10-28 → exactly one `<li class="ride">` entry. Before the fix the list is empty.
  - Observed at: HTML returned by `render_rides_page(rides, today)`
  - Refines: M1

### Harness Decisions

| Boundary | Harness present? | Decision |
|----------|------------------|----------|
| Rendered rides page HTML (`render_rides_page` return value) | pytest (research: "Tests run with pytest only") | Use as is. The page is a pure string builder, so pytest observes the rendered output directly. No UI or browser harness is needed. |

### Non-Functional Requirements

- [ ] Performance: no change. The filter is still a single pass over the rides.
- [ ] Reliability: the existing tests in `tests/test_store.py` and `tests/test_load_series.py` still pass.
- [ ] Security: not applicable. No input handling changes.

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| ------ | -------- | ------------ | ------------ |
| Another reader depends on `WINDOW_DAYS` being 27 | Low | Low | The verification agents found no reader other than `rides/store.py:9`. |
| The boundary regresses again, since no test pins it today | Med | Med | AC-1 pins both sides of the boundary (Oct 1 included, Sep 30 excluded). |
| research.md lines 21 and 49 describe the pre-fix window and go stale after the fix | Low | High | Expected: research records current behavior at the time it was written. No action in this design. |

### Assumptions

None. Research reported no open questions, and the verification agents confirmed the single reader of `WINDOW_DAYS`.

## Rejected Alternatives

### Option: Drop the `- 1` from the cutoff expression

- **Approach**: Keep `WINDOW_DAYS = 27` and compute `cutoff = today - timedelta(days=WINDOW_DAYS)`.
- **Rejected because**: The constant would then mean "days back from today" rather than "window length", which conflicts with the "length minus one" form used in `load_series` and leaves the name misleading.
- **Trade-offs**: It is also a one-line change with identical bounds, so nothing is gained in behavior.

## Pending Decisions

None.

## References

- Research: [research.md](research.md)
- Intent: [README.md](README.md)
