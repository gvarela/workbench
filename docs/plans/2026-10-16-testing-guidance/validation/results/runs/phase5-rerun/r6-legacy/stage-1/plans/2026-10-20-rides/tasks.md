---
project: rides
ticket: null
created: 2026-10-20
status: not-started
last_updated: 2026-10-18
current_phase: 1
total_tasks: 2
completed_tasks: 0
depends_on: [research.md, design.md]
beads_epic: tmp_Y70eOY5Qhc-46f
beads_phases:
  phase1_milestone: tmp_Y70eOY5Qhc-46f.1
beads_tasks:
  # Phase 1 tasks
  phase1_impl_1: tmp_Y70eOY5Qhc-46f.2
  phase1_impl_2: tmp_Y70eOY5Qhc-46f.3
---

# Execution Plan: Rides Window and Distance Rounding

## Overview

Implementing the 28-day inclusive rides window and half-up distance rounding as specified in design.md

**Design Approach**: Adjust the window constant and the rounding rule in place
**Target State**: from design.md Success Metrics — the rides page lists a ride from 27 days before today and omits one from 28 days before (refines the Intent's window statement). The wizard focus statement is deferred to a later project. design.md Success Criteria add: 2.25 km displays as 2.3 km; existing tests still pass.

## Implementation Strategy

### Phase Rationale

One phase. Both changes are small, each is local to one function, and they touch disjoint files, so they run in parallel with no task-to-task edge.

Based on dependency analysis:

- `WINDOW_DAYS` has exactly one reader, `rides/store.py:9`. `load_series` (`rides/store.py:14-21`) hard-codes its own four 7-day windows, so its output and `tests/test_load_series.py` are unaffected.
- `format_distance` is called at `rides/views.py:8` and `rides/views.py:16`. Both pass `r["km"]` through unchanged, so neither page needs an edit (design.md Integration Points).
- Track A (`rides/store.py` + `tests/test_store.py`) and Track B (`rides/view_model.py` + `tests/test_view_model.py`) share no files and no outputs. No external dependencies: `decimal` and `datetime` are standard library, and `pyproject.toml` is unchanged.

### Testing Strategy

The plan has no acceptance criteria because it predates 5.0.0, so it has no outer-test or harness tasks. Each implementation task carries its own tests and runs them test-first: write the failing test, make the change, then run the full suite.

- Window: the boundary pair goes in `tests/test_store.py` and calls `list_rides` directly with the module's `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`). Use the README example: Oct 1 is listed, Sep 30 is not. The Oct 1 assertion fails under `WINDOW_DAYS = 27` (cutoff Oct 2), so the test is sensitive to the constant. No existing test pins the boundary.
- Rounding: cases go in `tests/test_view_model.py` and call `format_distance` directly.
  - 2.25 → `2.3 km` is the design criterion.
  - 1.15 → `1.2 km` pins the design's risk mitigation ("convert through Decimal before rounding"). The float 1.15 is stored just below 1.15, so it gives `1.1 km` if the float goes straight into `Decimal`. That was checked locally: `Decimal(str(1.15))` rounds half up to 1.2, while `Decimal(1.15)` gives 1.1.
- Existing expectations: only `tests/test_view_model.py:9` (`format_distance(12.25) == "12.2 km"`) pins the half-to-even behavior the design replaces. It is updated to `"12.3 km"`. Every other existing test stays green unchanged, including `tests/test_view_model.py:13` (`5` → `"5 km"`) and all of `tests/test_store.py`, `tests/test_load_series.py` and `tests/test_today_page.py`.
- Test style (pattern agent): use plain module-level `def test_<behavior in plain words>()` functions with bare `assert`, inline ride dicts `{"date": date(...), "km": 10.0}`, and no fixtures, parametrize or conftest. Template: `tests/test_store.py:13-15`.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `tmp_Y70eOY5Qhc-46f.1` - depends on 2 tasks

Use `bd show tmp_Y70eOY5Qhc-46f.1` to see which tasks block the milestone.

---

## Phase 1: Window and Rounding

### Objective

The rides page lists the last 28 days inclusive, and distances round half up.

### Prerequisites

- [ ] Research validated
- [ ] Design approved
- [ ] Development environment ready (`python3 -m pytest -q` passes 8 tests on the base commit)

### Changes Required

#### 1. Rides window

**File**: `rides/store.py`

**Current State** (from research.md):

- `WINDOW_DAYS = 27` at `rides/store.py:4`
- `list_rides` computes `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` at `rides/store.py:9` and keeps `cutoff <= r["date"] <= today` at line 10, so on Oct 28 the cutoff is Oct 2

**Target State** (from design.md Success Metrics, refining the Intent's window statement):

- A ride 27 days before today is listed and one 28 days before is not. On Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not.

**Implementation**:

```python
# At rides/store.py:4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

Line 9 stays as it is. The `- 1` makes the window inclusive of today, so 28 gives a cutoff of today minus 27 days.

**Test to add first** (append to `tests/test_store.py`):

```python
def test_lists_a_ride_from_27_days_ago_and_omits_one_from_28():
    day_27 = {"date": date(2026, 10, 1), "km": 10.0}
    day_28 = {"date": date(2026, 9, 30), "km": 10.0}
    assert list_rides([day_27, day_28], TODAY) == [day_27]
```

**Rationale**: the only reader of the constant is the cutoff, so a one-line change moves the boundary by one day.
**Pattern Reference**: `tests/test_store.py:13-15` (dated dict against the module `TODAY`)

#### 2. Distance rounding

**File**: `rides/view_model.py`

**Current State** (from research.md):

- `format_distance(km)` returns `f"{round(km, 1)} km"` at `rides/view_model.py:6`. Built-in `round` rounds half to even, so 2.25 shows as `2.2 km`.
- An int input stays whole (`round(5, 1)` is the int `5`, so the output is `"5 km"`, pinned by `tests/test_view_model.py:12-13`). A float keeps one decimal (`10.0` → `"10.0 km"`).

**Target State** (from design.md Success Criteria and Risk Analysis):

- 2.25 km displays as 2.3 km
- 1.15 km displays as 1.2 km. Rounding goes through `Decimal(str(km))`, per the risk mitigation.
- Only the tie-breaking changes. `5` still shows `5 km`, `10.0` still shows `10.0 km`, and `12.34` still shows `12.3 km`.

**Implementation**:

```python
# At rides/view_model.py:1-6, replace:
"""Turns raw ride values into display values."""


def format_distance(km):
    """Distance as a display string, rounded to one decimal, e.g. 12.3 km."""
    return f"{round(km, 1)} km"

# With:
"""Turns raw ride values into display values."""
from decimal import ROUND_HALF_UP, Decimal


def format_distance(km):
    """Distance as a display string, rounded half up to one decimal, e.g. 12.3 km."""
    if isinstance(km, int):
        return f"{km} km"
    value = Decimal(str(km)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return f"{value} km"
```

- The `int` branch is required. Without it, `quantize` turns `5` into `5.0 km` and breaks `tests/test_view_model.py:13`.
- Do not call `normalize()` on the result, because it would turn `10.0` into `10 km`.
- Do not pass the float straight to `Decimal`, because `1.15` would then give `1.1 km`.

**Tests to change and add first** (in `tests/test_view_model.py`):

```python
# At tests/test_view_model.py:9, replace:
    assert format_distance(12.25) == "12.2 km"
# With:
    assert format_distance(12.25) == "12.3 km"

# Append:
def test_rounds_a_half_up():
    assert format_distance(2.25) == "2.3 km"


def test_rounds_a_float_stored_just_below_the_half_up():
    assert format_distance(1.15) == "1.2 km"


def test_keeps_the_trailing_zero_on_a_float():
    assert format_distance(10.0) == "10.0 km"
```

The first three expectations fail before the change and pass after it. The `10.0` case already passes; it guards against `normalize()`.

**Rationale**: `Decimal` with `ROUND_HALF_UP` is the design's chosen rule. Converting through `str` makes it round the decimal value the rider sees, not the float's binary value.
**Pattern Reference**: `tests/test_view_model.py:4-13` (one bare assert per behavior)

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Implementation Tasks

- Change the rides window to 28 days inclusive in `rides/store.py:4` → `[beads:phase1_impl_1]`
  - Serves: design.md Success Criterion "a ride 27 days before today is listed; one 28 days before is not"
  - Test first: add `test_lists_a_ride_from_27_days_ago_and_omits_one_from_28` to `tests/test_store.py` (code above) and see it fail on the Oct 1 ride
  - Set `WINDOW_DAYS = 28`
  - Done when: the new test passes and `python3 -m pytest -q` is green
  - Budget: about 10-15 tool calls
- Round distances half up in `rides/view_model.py:4-6` → `[beads:phase1_impl_2]`
  - Serves: design.md Success Criterion "2.25 km displays as 2.3 km", and the Risk Analysis mitigation "convert through Decimal before rounding"
  - Test first, in `tests/test_view_model.py`:
    - Update line 9 to expect `"12.3 km"`.
    - Add the 2.25, 1.15 and 10.0 cases (code above).
    - See the 12.25, 2.25 and 1.15 assertions fail.
  - Replace `round` with `Decimal(str(km)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)` and keep the `int` branch.
  - Done when: all `tests/test_view_model.py` tests pass, including the unchanged `test_keeps_a_whole_number_whole`, and `python3 -m pytest -q` is green
  - Budget: about 15-20 tool calls

No task-to-task edges: the two tasks share no files and consume no output from each other.

### Success Criteria

#### Automated Verification

(Commands from research.md: pytest only, no lint or type-check tooling configured in `pyproject.toml`.)

- [ ] Phase tests pass: `python3 -m pytest -q tests/test_store.py tests/test_view_model.py`
- [ ] Full suite passes: `python3 -m pytest -q`. Expect 12 tests: the 8 existing ones plus the 4 new ones.

#### Manual Verification

- [ ] The rides page shows the window boundary and the rounding. The `date(2026, 10, 1)` ride appears as `2026-10-01 - 2.3 km`, and `2026-09-30` does not appear:

  ```bash
  python3 -c "from datetime import date; from rides.views import render_rides_page; print(render_rides_page([{'date': date(2026,10,1), 'km': 2.25}, {'date': date(2026,9,30), 'km': 4.0}], date(2026,10,28)))"
  ```

- [ ] The today page shows the same rounding. A ride of 2.25 km on the given day renders as `<li class="ride">2.3 km</li>`:

  ```bash
  python3 -c "from datetime import date; from rides.views import render_today_page; print(render_today_page([{'date': date(2026,10,28), 'km': 2.25}], date(2026,10,28)))"
  ```

### Modified Files

#### Code Files

- `rides/store.py` - window constant (line 4)
- `rides/view_model.py` - half-up rounding through `Decimal` in `format_distance`

#### Test Files

- `tests/test_store.py` - the window boundary test (Oct 1 listed, Sep 30 omitted)
- `tests/test_view_model.py` - the 12.25 expectation updated to `"12.3 km"`, plus the 2.25, 1.15 and 10.0 cases

**Quick test command for this phase**:

```bash
python3 -m pytest -q tests/test_store.py tests/test_view_model.py
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before proceeding:

1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`)
2. ✅ Phase 1 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show tmp_Y70eOY5Qhc-46f.1` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Things to determine during implementation:

- None expected. Both changes and their effect on every existing test were traced before planning.

Note: Update this section with findings as you implement.

---

## 🚧 Blockers & Notes

### Current Blockers

Blockers are tracked in beads. To see current blockers:

```bash
bd blocked    # Show all blocked issues and what blocks them
```

### Implementation Notes

- 2026-10-18 re-plan: the earlier plan had a separate tests task, `tmp_Y70eOY5Qhc-46f.4`, written to land after the code. Its test cases are now inside the two implementation tasks so each runs test-first, and the issue is closed as superseded. No code had been written against it.
- design.md's NFR "existing tests still pass" has one deliberate exception. `tests/test_view_model.py:9` pins half-to-even (`12.25` → `"12.2 km"`), which is the behavior the design replaces, so its expectation changes to `"12.3 km"`. Every other existing test passes unchanged.

---

## 🔗 Quick Reference

### Key Files

- **Research**: [research.md](research.md) - Current state documentation
- **Design**: [design.md](design.md) - Target state specification
- **Window**: `rides/store.py:4-11`
- **Rounding**: `rides/view_model.py:4-6`

### Common Commands

```bash
python3 -m pytest -q                                              # full suite
python3 -m pytest -q tests/test_store.py tests/test_view_model.py # phase tests
```

### Design Decisions Reference

- Window: change `WINDOW_DAYS` from 27 to 28 and leave the cutoff formula alone
- Rounding: `Decimal` with `ROUND_HALF_UP`, converting through `Decimal` before rounding
- Pages stay string builders, and `rides/views.py` is not edited
- The wizard is out of scope and deferred to a later project

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: tmp_Y70eOY5Qhc-46f

**Phase Milestones**:

- Phase 1: tmp_Y70eOY5Qhc-46f.1 (all Phase 1 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Essential Commands**:

- `bd ready` - See what's ready to work on (no blockers)
- `bd show [id]` - View task details and dependencies
- `bd update [id] --claim` - Claim a task
- `bd close [id]` - Complete a task
- `bd blocked` - See what's currently blocked
- `bd list --status=in_progress` - See your active work

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.
