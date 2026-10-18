---
project: rides
ticket: null
created: 2026-10-20
status: not-started
last_updated: 2026-10-20
current_phase: 1
total_tasks: 3
completed_tasks: 0
depends_on: [research.md, design.md]
beads_epic: tmp_niHSfpp8MW-5hz
beads_phases:
  phase1_milestone: tmp_niHSfpp8MW-5hz.1
beads_tasks:
  phase1_impl_1: tmp_niHSfpp8MW-5hz.2
  phase1_impl_2: tmp_niHSfpp8MW-5hz.3
  phase1_test_1: tmp_niHSfpp8MW-5hz.4
---

# Execution Plan: Rides Window and Distance Rounding

## Overview

Implementing the 28-day window and half-up rounding as specified in design.md

**Design Approach**: Adjust the window constant and the rounding rule in place
**Target State**: from design.md Success Metrics (the 28-day window; the wizard statement is deferred)

## Implementation Strategy

### Phase Rationale

One phase: both changes are small, independent, and local to one function each.

### Testing Strategy

Each change gets one test in the existing test files, run with pytest.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `tmp_niHSfpp8MW-5hz.1` - depends on 3 tasks

Use `bd show tmp_niHSfpp8MW-5hz.1` to see which tasks block the milestone.

---

## Phase 1: Window and Rounding

### Objective

The rides page lists 28 days inclusive, and distances round half up.

### Prerequisites

- [ ] Research validated
- [ ] Design approved
- [ ] Development environment ready

### Changes Required

#### 1. Rides window

**File**: `rides/store.py`

**Current State** (from research.md):

- `WINDOW_DAYS = 27` at line 4
- `list_rides` computes the cutoff at line 9

**Target State** (from design.md Success Metrics):

- A ride 27 days before today is listed; one 28 days before is not

**Implementation**:

```python
# At line 4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

**Rationale**: the cutoff is `today - (WINDOW_DAYS - 1)`, so 28 gives 28 days inclusive.
**Pattern Reference**: `tests/test_store.py:1`

#### 2. Distance rounding

**File**: `rides/view_model.py`

**Current State** (from research.md):

- `format_distance` uses built-in `round` at line 6

**Target State** (from design.md Success Metrics):

- 2.25 km displays as 2.3 km, and 1.15 km as 1.2 km (the float 1.15 is stored just below 1.15, so this pins the conversion through `str`)
- The existing expectation `format_distance(12.25) == "12.2 km"` (`tests/test_view_model.py:9`) pins half-to-even; under half-up it becomes `"12.3 km"`
- Everything else displays as today: a whole-number (int) input stays whole (`5` shows `5 km`) and a float keeps its one decimal (`10.0` shows `10.0 km`)

**Implementation**:

```python
# Round half up through Decimal
from decimal import Decimal, ROUND_HALF_UP

def format_distance(km):
    if isinstance(km, int):
        return f"{km} km"
    value = Decimal(str(km)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return f"{value} km"
```

Only the tie-breaking changes. The `int` branch keeps `5` as `5 km` (the existing `test_keeps_a_whole_number_whole`), and the float path keeps the trailing `.0` (`10.0` stays `10.0 km`, as the docstring says). Do not `normalize()` the Decimal: it would turn `10.0` into `10 km`.

**Rationale**: built-in `round` rounds half to even, so 2.25 shows as 2.2.
**Pattern Reference**: `tests/test_view_model.py:1`

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Implementation Tasks

- Change the window in `rides/store.py:4` to 28 days → `[beads:phase1_impl_1]`
  - Set `WINDOW_DAYS = 28`
- Round half up in `rides/view_model.py:6` → `[beads:phase1_impl_2]`
  - Use `Decimal` with `ROUND_HALF_UP`

#### Testing Tasks

- Add tests at `tests/test_store.py` and `tests/test_view_model.py` → `[beads:phase1_test_1]`
  - A ride on Oct 1 is listed and one on Sep 30 is not, with today = Oct 28
  - `format_distance(2.25)` returns `"2.3 km"`
  - `format_distance(1.15)` returns `"1.2 km"` (fails if the float is passed to `Decimal` directly)
  - Update the existing `format_distance(12.25)` expectation at `tests/test_view_model.py:9` from `"12.2 km"` to `"12.3 km"`
  - `format_distance(10.0)` returns `"10.0 km"` (a float keeps its trailing zero)

### Success Criteria

#### Automated Verification

- [ ] Tests pass: `python3 -m pytest -q`

#### Manual Verification

- [ ] The rides page lists the expected rides

### 📝 Modified Files (Phase 1)

#### Code Files

- `rides/store.py` - `WINDOW_DAYS` 27 → 28 (tmp_niHSfpp8MW-5hz.2, 1f25f9e)
- `rides/view_model.py` - `format_distance` rounds half up through `Decimal(str(km))`; int branch keeps whole numbers whole (tmp_niHSfpp8MW-5hz.3, c2de74b)

#### Test Files

- `tests/test_store.py` - added `test_lists_a_ride_from_27_days_ago` (Oct 1) and `test_omits_a_ride_from_28_days_ago` (Sep 30)
- `tests/test_view_model.py` - added 2.25, 1.15, and 10.0 cases; updated the 12.25 expectation to `"12.3 km"`

**Quick test commands:**

```bash
# Run all tests for this phase
python3 -m pytest -q tests/test_store.py tests/test_view_model.py
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before proceeding:

1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`)
2. ✅ Phase 1 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show tmp_niHSfpp8MW-5hz.1` to confirm all blocking tasks are closed.

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

**Epic**: tmp_niHSfpp8MW-5hz

**Phase Milestones**:

- Phase 1: tmp_niHSfpp8MW-5hz.1 (all Phase 1 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.
