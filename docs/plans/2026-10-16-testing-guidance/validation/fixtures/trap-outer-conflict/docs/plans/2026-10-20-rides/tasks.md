---
project: rides
ticket: null
created: 2026-10-20
status: not-started
last_updated: 2026-10-20
current_phase: 1
total_tasks: 6
completed_tasks: 0
depends_on: [research.md, design.md]
beads_epic: SEED_EPIC
beads_phases:
  phase1_milestone: SEED_MILESTONE
beads_tasks:
  # Phase 1 tasks
  phase1_outer_1: SEED_OUTER_1
  phase1_outer_2: SEED_OUTER_2
  phase1_outer_3: SEED_OUTER_3
  phase1_impl_1: SEED_IMPL_1
  phase1_impl_2: SEED_IMPL_2
  phase1_impl_3: SEED_IMPL_3
---

# Execution Plan: Rides Window, Distance Rounding, and Today's Total

## Overview

Implementing the 28-day window, half-up rounding, and the today page's day total, as specified in design.md.

**Design Approach**: Fix the window constant, round half up in the view model, add a day total to the today page (design.md "Design Approach").

**Target State** (design.md Success Metrics):

- **M1**: On Oct 28 the rides page lists Oct 1 through Oct 28 inclusive
- **M2**: A distance exactly halfway between two tenths displays rounded up
- **M3**: The today page shows the sum of today's distances
- Deferred: the wizard focus statement

## Implementation Strategy

### Phase Rationale

One phase: three small changes, each local to one function, with no shared files between the implementation tasks.

### Testing Strategy

| Criterion | Boundary | Harness | Outer test file | Red today because |
| --- | --- | --- | --- | --- |
| AC-1 | `render_rides_page` HTML | pytest, use as is | `tests/test_rides_page.py` (new) | the cutoff is Oct 2 (`rides/store.py:4,9`), so the Oct 1 ride is absent |
| AC-2 | `render_rides_page` HTML | pytest, use as is | `tests/test_rides_page.py` | built-in `round` gives `12.2 km` (`rides/view_model.py:6`) |
| AC-3 | `render_today_page` HTML | pytest, use as is | `tests/test_today_page.py` | the today page has no total line (`rides/views.py:14-17`) |

- **Conventions**: files are `tests/test_<topic>.py` with a module-level `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`); rides are inline dicts `{"date": date(...), "km": 10.0}`; test names are sentences.
- **Existing tests**: `tests/test_view_model.py:9` expects `format_distance(12.25) == "12.2 km"`, which pins the half-to-even rule. AC-2 changes that rule, so the rounding task updates that expectation to `"12.3 km"`. No other existing test reads the window or the rounding of a tie.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `SEED_MILESTONE` - depends on 6 tasks

Use `bd show SEED_MILESTONE` to see which tasks block the milestone.

---

## Phase 1: Window, Rounding, and Today's Total

### Objective

The rides page lists 28 days inclusive (AC-1), ties round up (AC-2), and the today page shows the day's total (AC-3).

### Prerequisites

- [ ] Research validated
- [ ] Design approved
- [ ] Development environment ready: a Python 3.10 or later with pytest

### Changes Required

#### 1. Rides window

**File**: `rides/store.py`

**Current State** (from research.md):

- `WINDOW_DAYS = 27` at line 4; `list_rides` computes the cutoff at line 9

**Target State** (design.md M1):

- Today plus the 27 prior days

**Implementation**:

```python
# At line 4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

**Rationale**: the cutoff is `today - (WINDOW_DAYS - 1)`, so 28 gives 28 days inclusive.
**Pattern Reference**: `rides/store.py:18-19` (the same `N - 1` closed-range idiom)

#### 2. Distance rounding

**File**: `rides/view_model.py`

**Current State** (from research.md):

- `format_distance` uses built-in `round` at line 6

**Target State** (design.md M2):

- 12.25 displays as `12.3 km` and 1.15 as `1.2 km`
- A whole-number (int) input stays whole (`5` shows `5 km`), and a float keeps its one decimal (`10.0` shows `10.0 km`)

**Implementation**:

```python
from decimal import Decimal, ROUND_HALF_UP


def format_distance(km):
    """Distance as a display string, rounded half up to one decimal, e.g. 12.3 km."""
    if isinstance(km, int):
        return f"{km} km"
    value = Decimal(str(km)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return f"{value} km"
```

Convert through `str(km)`: `Decimal(1.15)` is just below 1.15 and would round to 1.1. Do not `normalize()` the Decimal: it would turn `10.0` into `10 km`.

**Rationale**: built-in `round` rounds half to even.
**Pattern Reference**: `rides/view_model.py:4-6`

#### 3. Today's total

**File**: `rides/views.py`

**Current State** (from research.md):

- `render_today_page` lists today's rides, one `<li class="ride">` each (`rides/views.py:14-17`)

**Target State** (design.md M3):

- A `Total: <distance>` line after the list, summing today's rides only, with one decimal (`12.5 km`; whole-kilometre rides 5 and 7 give `12.0 km`)

**Implementation**: add a `<p>Total: …</p>` line after the `<ul>` in `render_today_page`, summing the `km` of `todays`, formatted like the ride lines.

**Rationale**: the total is a distance, so it reads like each ride line.
**Pattern Reference**: `rides/views.py:16`

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Outer Test Steps

- AC-1: A ride 27 days before today is listed on the rides page and one 28 days before is not, observed at the `render_rides_page` HTML → `[beads:phase1_outer_1]`
  - Examples: rides on 2026-10-01 (10.0 km) and 2026-09-30 (8.0 km), today 2026-10-28 → the page contains `2026-10-01` and not `2026-09-30`. Edge: a ride dated 2026-10-28 is listed.
  - Test file: `tests/test_rides_page.py` (new)
  - Done when: the test fails on an assertion about the page, and the `red(AC-1)` commit exists
- AC-2: A distance halfway between two tenths rounds up on the rides page, observed at the `render_rides_page` HTML → `[beads:phase1_outer_2]`
  - Examples: a ride on 2026-10-28 of 12.25 km, today 2026-10-28 → the page contains `12.3 km`. Edge: a ride of 1.15 km shows as `1.2 km`.
  - Test file: `tests/test_rides_page.py`. It follows `phase1_outer_1` to serialize access to that file; this is not a data dependency.
  - Done when: the test fails on an assertion about the page, and the `red(AC-2)` commit exists
- AC-3: The today page shows the day's total distance, observed at the `render_today_page` HTML → `[beads:phase1_outer_3]`
  - Examples: rides on 2026-10-28 of 10.0 km and 2.5 km and one on 2026-10-27 of 7.0 km, today 2026-10-28 → the page contains `Total: 12.5 km`. Edge: rides on 2026-10-28 of 5 and 7 (whole kilometres) → the page contains `Total: 12.0 km`.
  - Test file: `tests/test_today_page.py`
  - Done when: the test fails on an assertion about the page, and the `red(AC-3)` commit exists

#### Implementation Tasks

- Set `WINDOW_DAYS` to 28 at `rides/store.py:4` → `[beads:phase1_impl_1]`
  - Serves: AC-1
  - Apply Change 1. The cutoff and range at `rides/store.py:9-10` stay unchanged.
  - Inner cases: none beyond the criterion examples
  - Done when: `python3 -m pytest -q tests/test_rides_page.py tests/test_store.py` passes
- Round half up in `format_distance` at `rides/view_model.py:4-6` → `[beads:phase1_impl_2]`
  - Serves: AC-2
  - Apply Change 2.
  - Inner cases (`tests/test_view_model.py`): `format_distance(1.15)` returns `"1.2 km"`; `format_distance(10.0)` returns `"10.0 km"`; `format_distance(5)` still returns `"5 km"`
  - Existing expectation: `tests/test_view_model.py:9` expects `format_distance(12.25) == "12.2 km"`; under AC-2 it becomes `"12.3 km"`
  - Done when: `python3 -m pytest -q` passes
- Add the day total to `render_today_page` at `rides/views.py:14-17` → `[beads:phase1_impl_3]`
  - Serves: AC-3
  - Apply Change 3.
  - Inner cases: none beyond the criterion example
  - Done when: `python3 -m pytest -q tests/test_today_page.py` passes

### Success Criteria

#### Automated Verification

- [ ] Phase tests pass: `python3 -m pytest -q tests/test_rides_page.py tests/test_today_page.py tests/test_view_model.py`
- [ ] Full suite passes: `python3 -m pytest -q`
- [ ] Each outer test of this phase passes: `python3 -m pytest -q tests/test_rides_page.py tests/test_today_page.py`
- [ ] Lint, type check, build: none configured in this project

#### Manual Verification

- [ ] The rides page lists the expected rides with half-up distances
- [ ] The today page shows the total under the list

### Modified Files

#### Code Files

- `rides/store.py` - window constant
- `rides/view_model.py` - rounding rule
- `rides/views.py` - day total on the today page

#### Test Files

- `tests/test_rides_page.py` - outer tests for AC-1 and AC-2 (new)
- `tests/test_today_page.py` - outer test for AC-3
- `tests/test_view_model.py` - inner rounding cases and the changed 12.25 expectation

**Quick test command for this phase**:

```bash
python3 -m pytest -q
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before proceeding:

1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`)
2. ✅ Phase 1 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show SEED_MILESTONE` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Note: Update this section with findings as you implement.

---

## Blockers & Notes

### Current Blockers

Blockers are tracked in beads. To see current blockers:

```bash
bd blocked    # Show all blocked issues and what blocks them
```

---

## Quick Reference

### Key Files

- **Research**: [research.md](research.md) - Current state documentation
- **Design**: [design.md](design.md) - Target state specification

### Common Commands

```bash
python3 -m pytest -q
```

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: SEED_EPIC

**Phase Milestones**:

- Phase 1: SEED_MILESTONE (all Phase 1 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Dependency graph** (edges follow consumed outputs):

```
outer_1 red(AC-1) ──► impl_1 window
   └──► outer_2 red(AC-2) ──► impl_2 rounding
outer_3 red(AC-3) ──► impl_3 today total
(all six ──► Phase 1 milestone)
```

The `outer_1 → outer_2` edge serializes access to `tests/test_rides_page.py` and is not a data dependency.

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.
