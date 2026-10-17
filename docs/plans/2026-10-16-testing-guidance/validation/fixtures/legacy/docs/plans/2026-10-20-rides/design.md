---
project: rides
ticket: null
created: 2026-10-20
status: approved
last_updated: 2026-10-20
depends_on: research.md
design_approach: Adjust the window constant and the rounding rule in place
---

# Design: Rides Window and Distance Rounding

## Problem Statement

The rides page lists the last 27 days instead of the last 28 days inclusive, and distances round half to even where riders expect half up.

### Success Metrics

- The rides page lists a ride from 27 days before today and omits one from 28 days before (refines: "a ride from 27 days before today is listed and a ride from 28 days before today is not")
- Deferred: "the next question is visible and keyboard focus is on its first answer" — wizard work is a later project

## Design Approach

Change `WINDOW_DAYS` in `rides/store.py` from 27 to 28, and make `format_distance` in `rides/view_model.py` round half up using `decimal`.

### Why This Approach

- Both changes are local to one function each (research: `rides/store.py:7-11`, `rides/view_model.py:4-6`)
- No new modules or data shapes

## Technical Decisions

### Architecture

- Keep the string-builder pages as they are
  - Rationale: the change does not touch page structure
  - Trade-off: none
  - Pattern reference: `rides/views.py:6-11`

### Data Model

- Unchanged: a ride is a dict with `date` and `km`

### Integration Points

- `render_rides_page` and `render_today_page` call the changed functions and need no edits

## Scope Definition

### In Scope

- The 28-day window in `list_rides`
- Half-up rounding in `format_distance`

### Out of Scope

- The check-in wizard
- Any new page

## Success Criteria

### Functional Requirements

- [ ] A ride 27 days before today is listed; one 28 days before is not
- [ ] 2.25 km displays as 2.3 km

### Non-Functional Requirements

- [ ] Performance: no change
- [ ] Reliability: existing tests still pass
- [ ] Security: not applicable

## Risk Analysis

### Technical Risks

| Risk                            | Impact | Likelihood | Mitigation                              |
| ------------------------------- | ------ | ---------- | --------------------------------------- |
| Float values round unexpectedly | Low    | Med        | Convert through Decimal before rounding |

### Assumptions

- Distances are positive numbers.

## Open Questions

- None.
