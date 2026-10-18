---
project: rides
ticket: null
created: 2026-10-20
status: approved
last_updated: 2026-10-20
depends_on: research.md
design_approach: Fix the window constant, round half up in the view model, add a day total to the today page
---

# Design: Rides Window, Distance Rounding, and Today's Total

## Problem Statement

README Goal (with the 2026-10-20 amendment): the rides page shows the last 28 days of rides inclusive, distances round half up, and the today page shows the day's total distance.

1. **Rides window is one day short.** `WINDOW_DAYS = 27` and the cutoff `today - (WINDOW_DAYS - 1)` list today plus 26 prior days (`rides/store.py:4-10`). On Oct 28 a ride on Oct 1 is missing.
2. **Ties round to even.** `format_distance` uses built-in `round` (`rides/view_model.py:6`), so 12.25 km shows as 12.2 km where riders expect 12.3 km.
3. **No day total.** The today page lists each ride's distance and nothing else (`rides/views.py:14-17`).

### Success Metrics

- **M1**: On Oct 28 the rides page lists Oct 1 through Oct 28 inclusive. (refines: "a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)")
- **M2**: A distance exactly halfway between two tenths displays rounded up. (refines: amendment "distances round half up (12.25 km shows 12.3 km)")
- **M3**: The today page shows the sum of today's distances. (refines: amendment "the today page shows the day's total distance")
- Deferred: "the next question is visible and keyboard focus is on its first answer" (amendment: wizard work moves to a later project)

## Design Approach

- **Window**: change `WINDOW_DAYS` from 27 to 28 and keep the inclusive cutoff formula.
- **Rounding**: `format_distance` rounds through `Decimal` with `ROUND_HALF_UP`, converting the float with `str(km)` first. An `int` stays whole (`5` shows `5 km`) and a float keeps its one decimal (`10.0` shows `10.0 km`).
- **Day total**: `render_today_page` adds a `Total: <distance>` line after the list, formatted with `format_distance`.

### Why This Approach

- Each change is local to one function (research: `rides/store.py:7-11`, `rides/view_model.py:4-6`; `rides/views.py:14-17`)
- Display formatting already lives in `rides/view_model.py`, so the total reuses it (research: Patterns)
- `Decimal(str(km))` rounds the decimal the rider entered. `Decimal(km)` would round the binary float, and a float such as 1.15 is stored just below 1.15

## Technical Decisions

### Architecture

- Keep the string-built pages
  - Rationale: no page structure change beyond one line on the today page
  - Trade-off: none
  - Pattern reference: `rides/views.py:6-11`

### Data Model

- Unchanged: a ride is a dict with `date` and `km`

### Integration Points

- `render_rides_page` picks up both the window and the rounding through its existing calls
- `render_today_page` gains the total line

## Scope Definition

### In Scope

- The 28-day window in `list_rides`
- Half-up rounding in `format_distance`
- The day total on the today page

### Out of Scope

- The check-in wizard
- `load_series`
- Any new page

## Success Criteria

### Acceptance Criteria

- **AC-1 A ride 27 days before today is listed on the rides page and one 28 days before is not**
  - Given today is 2026-10-28
  - When the rides page is rendered with rides on 2026-10-01 and 2026-09-30
  - Then the page lists the 2026-10-01 ride and not the 2026-09-30 ride
  - Example: rides on 2026-10-01 (10.0 km) and 2026-09-30 (8.0 km), today 2026-10-28 → the page contains `2026-10-01` and does not contain `2026-09-30`
  - Example (edge): a ride dated today, 2026-10-28, is listed
  - Observed at: `render_rides_page` HTML
  - Refines: M1

- **AC-2 A distance halfway between two tenths rounds up on the rides page**
  - Given a ride today of 12.25 km
  - When the rides page is rendered
  - Then the ride shows as 12.3 km
  - Example: a ride on 2026-10-28 of 12.25 km, today 2026-10-28 → the page contains `12.3 km`
  - Example (edge): a ride of 1.15 km shows as `1.2 km`
  - Observed at: `render_rides_page` HTML
  - Refines: M2

- **AC-3 The today page shows the day's total distance**
  - Given rides today and on other days
  - When the today page is rendered
  - Then it shows the sum of today's distances only
  - Example: rides on 2026-10-28 of 10.0 km and 2.5 km and one on 2026-10-27 of 7.0 km, today 2026-10-28 → the page contains `Total: 12.5 km`
  - Observed at: `render_today_page` HTML
  - Refines: M3

### Harness Decisions

| Boundary | Harness present? | Decision |
| --- | --- | --- |
| Rides page HTML (`render_rides_page`) | pytest (`pyproject.toml:10-12`, `tests/`) | Use as is |
| Today page HTML (`render_today_page`) | pytest (`tests/test_today_page.py`) | Use as is |

### Non-Functional Requirements

- [ ] Performance: no change
- [ ] Reliability: existing tests pass, except expectations this design changes
- [ ] Security: not applicable

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Float values round unexpectedly | Low | Med | Convert with `Decimal(str(km))`; a test pins 1.15 → 1.2 km |
| A trailing `.0` is lost | Low | Low | Do not `normalize()` the Decimal; a test pins 10.0 → 10.0 km |

### Assumptions

- Distances are positive numbers.

## Open Questions

- None.

## References

- Research: [research.md](research.md)
- Intent: [README.md](README.md)
