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
beads_epic: work-axk
beads_phases:
  phase1_milestone: work-axk.1
beads_tasks:
  # Phase 1 tasks
  phase1_impl_1: work-axk.2
  phase1_impl_2: work-axk.3
---

# Execution Plan: Rides Window and Distance Rounding

## Overview

Implementing the 28-day inclusive rides window and half-up distance rounding as specified in design.md.

**Design Approach**: Adjust the window constant and the rounding rule in place.
**Target State**: from design.md Success Metrics:

- The rides page lists a ride from 27 days before today and omits one from 28 days before (refines the README Intent's "a ride from 27 days before today is listed and a ride from 28 days before today is not").
- Deferred: "the next question is visible and keyboard focus is on its first answer". The wizard is out of scope (design.md Scope, Out of Scope).

design.md also lists a second Functional Requirement, "2.25 km displays as 2.3 km", and this plan covers it.

No acceptance criteria: plan predates 5.0.0. design.md has no Acceptance Criteria or Harness Decisions section, so this plan has no outer-test steps or harness tasks. Each implementation task pins its Functional Requirement with its own red-first test.

## Implementation Strategy

### Phase Rationale

One phase. Both changes are small, and each is local to one function (design.md "Why This Approach").

From the dependency analysis:

- **Independent changes.** The two edits share no symbol and no file:
  - The window edit is `rides/store.py:4` plus its test in `tests/test_store.py`.
  - The rounding edit is `rides/view_model.py:4-6` plus its test in `tests/test_view_model.py`.
  - Neither module imports the other.
  - They meet only in `rides/views.py:6-11`, which needs no edit (design.md Integration Points).
  - There are no task-to-task edges, so both tasks are ready at once.
- **Window edit.** `WINDOW_DAYS` is read only at `rides/store.py:9`. `load_series` (`rides/store.py:14-21`) uses hard-coded weeks and is unaffected.
- **Higher-risk task.** The rounding edit carries more risk. A plain `Decimal.quantize` changes the int output from `5 km` to `5.0 km`, which breaks `tests/test_view_model.py:8-9`. `quantize` also defaults to half-even unless `rounding=` is passed.
- **External dependencies.** None. `decimal` is stdlib, and `pyproject.toml:5` requires Python 3.10 or later.

### Testing Strategy

pytest only (research.md Summary), with no browser harness and no lint or type tooling configured (`pyproject.toml:1-12`). Each implementation task writes its failing test first, in the existing per-module test file, following the conventions there:

- module-level `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`)
- inline ride dicts `{"date": date(...), "km": 10.0}`
- one `assert` per test
- plain-words test names (`tests/test_store.py:8-21`, `tests/test_view_model.py:4-9`)

Each Functional Requirement is tested at the function that decides it:

- `list_rides` for the window (`rides/store.py:7-11`). `render_rides_page` only passes its result through.
- `format_distance` for rounding (`rides/view_model.py:4-6`).

Red-before-change was confirmed on the current code:

- `list_rides` with today = Oct 28 omits Oct 1, because the cutoff is Oct 2.
- `format_distance(2.25)` returns `"2.2 km"`.

Baseline: `python3 -m pytest -q` reports 7 passed.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `work-axk.1`, which depends on 2 tasks.

Use `bd show work-axk.1` to see which tasks block the milestone.

---

## Phase 1: Window and Rounding

### Objective

The rides page lists 28 days inclusive (with today = Oct 28, Oct 1 is listed and Sep 30 is not), and distances round half up (2.25 km shows as 2.3 km).

### Prerequisites

- [ ] Research validated (research.md `status: complete`)
- [ ] Design approved (design.md `status: approved`)
- [ ] Development environment ready: `python3 -m pytest -q` shows 7 passed
- [ ] None from dependency analysis: the two tasks have no prerequisites and can run in parallel

### Changes Required

#### 1. Rides window

**File**: `rides/store.py`

**Current State** (research.md "Rides window"):

- `WINDOW_DAYS = 27` at `rides/store.py:4`.
- `list_rides` computes `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` at `rides/store.py:9`. It keeps `cutoff <= date <= today` at line 10.
- With today = Oct 28, the cutoff is Oct 2, so a ride on Oct 1 is not listed.

**Target State** (design.md Success Metrics, refining the README Intent's window statement):

- A ride 27 days before today is listed and one 28 days before is not. With today = Oct 28, the cutoff becomes Oct 1.

**Implementation**:

```python
# At rides/store.py:4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

Line 9 stays as it is. The `- 1` already makes the window inclusive of today, so 28 gives 28 days inclusive.

Tests to add first in `tests/test_store.py`, after line 21, reusing `TODAY` from line 5:

```python
def test_lists_a_ride_from_27_days_ago():
    ride = {"date": date(2026, 10, 1), "km": 10.0}
    assert list_rides([ride], TODAY) == [ride]


def test_omits_a_ride_from_28_days_ago():
    ride = {"date": date(2026, 9, 30), "km": 10.0}
    assert list_rides([ride], TODAY) == []
```

**Rationale**: The design changes the constant in place. The first test fails before the change and passes after. The second test passes both before and after. It pins the "28 days is out" half of the requirement against an edit that widens the window too far.
**Pattern Reference**: `tests/test_store.py:13-15` (`test_omits_rides_from_long_ago`, a single ride dict and one assert).

#### 2. Distance rounding

**File**: `rides/view_model.py`

**Current State** (research.md "Distance display"):

- `format_distance(km)` returns `f"{round(km, 1)} km"` at `rides/view_model.py:6`. Built-in `round` rounds half to even, so `2.25` shows as `2.2 km`.
- Both `rides/views.py:8` and `rides/views.py:16` call it. Neither needs an edit.
- Current outputs that must not change:
  - `5` (int) shows as `5 km` (`tests/test_view_model.py:8-9`).
  - `12.34` shows as `12.3 km` (`tests/test_view_model.py:4-5`).
  - `10.0` shows as `10.0 km` (no existing test).

**Target State** (design.md Functional Requirements and the Risk Analysis mitigation):

- `2.25` shows as `2.3 km`, and the value goes through `Decimal` before rounding.
- Only the tie-breaking changes. An int stays whole and a float keeps its one decimal.

**Implementation**:

```python
# rides/view_model.py, whole file after the change:
"""Turns raw ride values into display values."""
from decimal import ROUND_HALF_UP, Decimal


def format_distance(km):
    """Distance as a display string, rounded to one decimal, e.g. 12.3 km."""
    if isinstance(km, int):
        return f"{km} km"
    value = Decimal(str(km)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return f"{value} km"
```

Notes for the implementer:

- Pass `rounding=ROUND_HALF_UP` explicitly. `quantize` otherwise uses the context default, which is half-even.
- Use `Decimal(str(km))`, not `Decimal(km)`, so the decimal value is what the user sees rather than the binary float.
- Do not call `normalize()`. It would turn `10.0` into `10 km`.
- The `int` branch keeps `5` as `5 km`. Without it, `quantize` returns `5.0`.

Tests to add first in `tests/test_view_model.py`, after line 9:

```python
def test_rounds_a_half_up():
    assert format_distance(2.25) == "2.3 km"


def test_keeps_a_float_trailing_zero():
    assert format_distance(10.0) == "10.0 km"
```

**Rationale**: Built-in `round` rounds half to even, and the design calls for half up through `Decimal`. `test_rounds_a_half_up` fails before the change. `test_keeps_a_float_trailing_zero` guards the float output against a `normalize()` slip, together with the existing int test.
**Pattern Reference**: `tests/test_view_model.py:4-9` (one assert against a literal string).

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Implementation Tasks

Each task is TDD: write the red tests, confirm they fail for the stated reason, apply the change, then run the full suite. Both tasks are well within a worker's tool-call budget (about 15 calls each), and they have no dependency on each other.

- **Change the window in `rides/store.py:4` to 28 days** → `[beads:phase1_impl_1]`
  - Serves: design.md Functional Requirement "A ride 27 days before today is listed; one 28 days before is not"
  - RED: add `test_lists_a_ride_from_27_days_ago` and `test_omits_a_ride_from_28_days_ago` to `tests/test_store.py` (Change 1). Only the first should fail, with `[] != [ride]`.
  - GREEN: set `WINDOW_DAYS = 28` at `rides/store.py:4`. Do not touch line 9.
  - Inner cases:
    - Oct 1 is listed and Sep 30 is omitted, with `TODAY = date(2026, 10, 28)`.
    - Existing tests stay green: today's ride listed, Aug 1 omitted, newest first (`tests/test_store.py:8-21`).
  - Done when `python3 -m pytest -q tests/test_store.py` and `python3 -m pytest -q` both pass.
- **Round half up in `format_distance` at `rides/view_model.py:4-6`** → `[beads:phase1_impl_2]`
  - Serves: design.md Functional Requirement "2.25 km displays as 2.3 km" and the Risk Analysis mitigation "Convert through Decimal before rounding"
  - RED: add `test_rounds_a_half_up` and `test_keeps_a_float_trailing_zero` to `tests/test_view_model.py` (Change 2). Only the first should fail, with `'2.2 km' != '2.3 km'`.
  - GREEN: rewrite `rides/view_model.py` as shown in Change 2. Keep the docstring.
  - Inner cases:
    - `2.25` shows `2.3 km`.
    - `10.0` shows `10.0 km`.
    - `12.34` shows `12.3 km` (existing test).
    - `5` shows `5 km` (existing test).
  - Done when `python3 -m pytest -q tests/test_view_model.py` and `python3 -m pytest -q` both pass.

### Success Criteria

#### Automated Verification

The commands come from research.md (pytest only) and `pyproject.toml:10-12`. No lint, type-check or build tooling is configured.

- [ ] Phase tests pass: `python3 -m pytest -q tests/test_store.py tests/test_view_model.py`
- [ ] Full suite passes: `python3 -m pytest -q`. That is 11 tests: the 7 existing tests, unchanged, plus 4 new ones (design.md Non-Functional "existing tests still pass").

#### Manual Verification

From design.md Success Criteria:

- [ ] The rides page shows Oct 1 and omits Sep 30 for today = Oct 28, and a 2.25 km ride reads `2.3 km`. Check with:
  `python3 -c "from datetime import date; from rides.views import render_rides_page as r; print(r([{'date': date(2026,10,1),'km':2.25},{'date': date(2026,9,30),'km':5.0}], date(2026,10,28)))"`
  Expected output contains `<li class="ride">2026-10-01 - 2.3 km</li>` and no `2026-09-30`.
- [ ] No regression on the today page: `render_today_page` (`rides/views.py:14-17`) still shows a 10.0 km ride as `10.0 km`.

### Modified Files

#### Code Files

- `rides/store.py`: the window constant at line 4
- `rides/view_model.py`: the `decimal` import and the half-up rounding in `format_distance`

#### Test Files

- `tests/test_store.py`: the 27-day and 28-day boundary tests
- `tests/test_view_model.py`: the half-up tie test and the float trailing-zero test

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

**Verification**: Run `bd show work-axk.1` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Things to confirm during implementation:

- Whether any caller outside the tests passes an int `km`. The `rides/store.py:1` docstring says `km` is a float. The `int` branch exists only to keep `tests/test_view_model.py:8-9` passing.

Note: Update this section with findings as you implement.

---

## 🚧 Blockers & Notes

### Current Blockers

Blockers are tracked in beads. To see current blockers:

```bash
bd blocked    # Show all blocked issues and what blocks them
```

### Implementation Notes

- 2026-10-18 re-plan: the earlier separate test task `work-axk.4` ("Add tests for the window and rounding") is closed as superseded. Its tests are now the RED steps of `work-axk.2` and `work-axk.3`. As a separate task it would have run tests after the code and touched both test files.
- `bd context` reports "BEADS_DIR points to unsafe location" for this `/private/tmp` checkout. `bd info` and `bd show work-axk` both resolve to `/private/tmp/p5/work/.beads` with prefix `work`, so the database is correct.
- 2026-10-18 coordinated run, Phase 1 halted on a plan defect:
  - `work-axk.2` passed verification and was committed (`79af505`).
  - `work-axk.3`'s implementation matches the spec, but the verifier failed it on criterion protection. The planned test values (2.25, 10.0, 12.34, 5) are all stored exactly as floats, so no test guards the "Convert through Decimal before rounding" mitigation. With `Decimal(km)` planted in place of `Decimal(str(km))`, the whole suite still passes while `format_distance(1.15)` gives `1.1 km`.
  - Design revision issue `work-axk.5` now blocks `work-axk.3` and the milestone. `work-axk.3` is reopened, and its changes to `rides/view_model.py` and `tests/test_view_model.py` are left uncommitted in the working tree.

---

## 🔗 Quick Reference

### Key Files

- **Research**: [research.md](research.md) - Current state documentation
- **Design**: [design.md](design.md) - Target state specification
- **Main Entry**: `rides/views.py` (`render_rides_page`, `render_today_page`)
- **Config**: `pyproject.toml` (pytest `testpaths`/`pythonpath`)

### Common Commands

```bash
# pytest only (research.md); no lint/type/build tooling configured
python3 -m pytest -q
python3 -m pytest -q tests/test_store.py tests/test_view_model.py
```

### Design Decisions Reference

- Window: change `WINDOW_DAYS` from 27 to 28 in place. The cutoff formula is unchanged.
- Rounding: half up through `Decimal` in `format_distance`. Pages are unchanged.
- Out of scope: the check-in wizard and any new page.

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: work-axk

**Phase Milestones**:

- Phase 1: work-axk.1 (all Phase 1 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Essential Commands**:

- `bd ready` - See what's ready to work on (no blockers)
- `bd show [id]` - View task details and dependencies
- `bd update [id] --claim` - Claim a task
- `bd close [id]` - Complete a task
- `bd blocked` - See what's currently blocked
- `bd list --status=in_progress` - See your active work

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.
