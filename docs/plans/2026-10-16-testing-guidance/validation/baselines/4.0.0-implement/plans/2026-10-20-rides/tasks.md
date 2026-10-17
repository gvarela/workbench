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
beads_epic: tmp_xQiIYmhNEK-cce
beads_phases:
  phase1_milestone: tmp_xQiIYmhNEK-cce.1
beads_tasks:
  phase1_impl_1: tmp_xQiIYmhNEK-cce.2
  phase1_impl_2: tmp_xQiIYmhNEK-cce.3
  phase1_test_1: tmp_xQiIYmhNEK-cce.4
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

- Phase 1: See beads milestone `tmp_xQiIYmhNEK-cce.1` - depends on 3 tasks

Use `bd show tmp_xQiIYmhNEK-cce.1` to see which tasks block the milestone.

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

- 2.25 km displays as 2.3 km

**Implementation**:

```python
# Round half up through Decimal
from decimal import Decimal, ROUND_HALF_UP

def format_distance(km):
    value = Decimal(str(km)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return f"{value.normalize():f} km"
```

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

### Success Criteria

#### Automated Verification

- [ ] Tests pass: `python3 -m pytest -q`

#### Manual Verification

- [ ] The rides page lists the expected rides

### 📝 Modified Files (Phase 1)

#### Code Files

- `rides/store.py` - `WINDOW_DAYS` 27 → 28 (tmp_xQiIYmhNEK-cce.2, commit 153a217)
- `rides/view_model.py` - `format_distance` rounds half up through `Decimal` (tmp_xQiIYmhNEK-cce.3, commit 8d08d69)

#### Test Files

- `tests/test_store.py` - `test_window_covers_28_days_inclusive` (Oct 1 listed, Sep 30 not, today = Oct 28)
- `tests/test_view_model.py` - `test_rounds_half_up` (`format_distance(2.25) == "2.3 km"`)

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

**Verification**: Run `bd show tmp_xQiIYmhNEK-cce.1` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Note: Update this section with findings as you implement.

- [2026-10-16] **Plan deviation, accepted as written: whole-number floats lose their `.0`.** The specified `format_distance` code ends with `value.normalize()`, which strips trailing zeros. So `format_distance(10.0)` now returns `"10 km"` (was `"10.0 km"`) and `12.96` returns `"13 km"` (was `"13.0 km"`). Both `render_rides_page` and `render_today_page` are affected. This conflicts with the docstring ("rounded to one decimal") and was not a stated design goal. No test covers a whole-number float; `test_keeps_a_whole_number_whole` passes an int, which already printed as `"5 km"`. The worker followed the plan exactly, all tests pass, and the verifier reported PASS with a plan-level observation. The plan was accepted unchanged per the run's instructions. Follow-up for a human: decide whether `10.0` should display as `10.0 km` (drop `normalize()`, and decide what int input like `5` should show).
- [2026-10-16] **Task overlap: the testing task duplicated the impl tasks' tests.** The impl tasks (cce.2, cce.3) were done test-first, so they added both specified tests. The testing task (cce.4) confirmed coverage and closed with no file changes. Later plans should put each test inside its impl task instead of a separate testing task.
- [2026-10-16] The repository has no lint, typecheck, or build commands. Automated verification is `python3 -m pytest -q` only.

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

**Epic**: tmp_xQiIYmhNEK-cce

**Phase Milestones**:

- Phase 1: tmp_xQiIYmhNEK-cce.1 (all Phase 1 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.
