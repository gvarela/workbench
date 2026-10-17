---
project: rides
ticket: null
created: 2026-10-20
status: not-started
last_updated: 2026-10-17
current_phase: 1
total_tasks: 4
completed_tasks: 0
depends_on: [research.md, design.md]
beads_epic: tmp_P3GImo3QHu-8iv
beads_phases:
  phase1_milestone: tmp_P3GImo3QHu-8iv.1
beads_tasks:
  # Phase 1 tasks
  phase1_outer_1: tmp_P3GImo3QHu-8iv.2
  phase1_outer_2: tmp_P3GImo3QHu-8iv.3
  phase1_impl_1: tmp_P3GImo3QHu-8iv.4
  phase1_impl_2: tmp_P3GImo3QHu-8iv.5
---

# Execution Plan: Rides Window and Check-in Focus

## Overview

Implementing two minimal in-place fixes as specified in design.md: the rides page window grows from 27 to 28 days inclusive, and the check-in wizard moves keyboard focus to the next question's first answer.

**Design Approach**: Minimal in-place fixes (window constant to 28; focus after unhide)
**Target State**: from design.md Success Metrics:

- **M1**: with `today` = 2026-10-28, the rendered rides page lists a ride dated 2026-10-01 and does not list one dated 2026-09-30.
- **M2**: after an answer is clicked on any question that has a next question, that question is visible and `document.activeElement` is its first answer button.
- Deferred: none

## Implementation Strategy

### Phase Rationale

One phase with one checkpoint. The work is two single-line edits plus one new test file, and the dependency analysis found the two fixes share no file, symbol, import or test. Splitting them into phases would add a checkpoint without reducing risk.

Based on dependency analysis:

- `WINDOW_DAYS` is read only at `rides/store.py:9`. `load_series` (`rides/store.py:14-21`) and `render_today_page` (`rides/views.py:14-17`) don't read it, and no existing test has a ride near the 10-01/10-02 boundary, so none breaks at 28.
- Parallel work: the rides track (outer tests, then the constant) and the wizard track (`wizard/wizard.js`) are independent. `bd ready` starts with the AC-1 outer test and the wizard task together.
- Critical path: AC-1 outer test → AC-2 outer test (same file, serialized) → constant change.

### Testing Strategy

- **AC-1 and AC-2** are observed at the HTML returned by `render_rides_page` (`rides/views.py:6-11`). The harness is pytest (`pyproject.toml:10-12`), used as is. Both outer tests go in a new `tests/test_rides_page.py`, the per-view home next to `tests/test_today_page.py`. Nothing imports `render_rides_page` yet. Use the existing conventions: `from datetime import date`, a module-level `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`), inline ride dicts (`tests/test_store.py:9`), and bare `assert ... in body` / `not in body` (`tests/test_today_page.py:7-8`). There is no conftest and there are no fixtures.
- **Assertion strings**: a listed ride renders as `<li class="ride">2026-10-01 - 10.0 km</li>` (`rides/views.py:8`, `rides/view_model.py:6`). Assert on the full item string, or count `<li class="ride">`. Don't assert on the bare tag when other rides are on the page.
- **Expected RED against `WINDOW_DAYS = 27`** (current cutoff 2026-10-02):
  - AC-1 main (10-01 listed): fails.
  - AC-1 edge (today listed): passes, and stays as a pin on the upper bound.
  - AC-2 main (09-30 alone not listed): passes, and stays as a pin.
  - AC-2 edge (10-01 and 09-30 together, only 10-01 listed): fails on the 10-01 half. This is the AC-2 red evidence.
- **Inner cases**: all of them go through the inclusive filter at `rides/store.py:10`:
  - lower bound (10-01 in, 09-30 out)
  - upper bound (today in)
  - the combined render, which also passes through the sort at `rides/store.py:11`
- **AC-3** is observed in a browser, where there is no harness. The harness decision is manual: AC-3 is a Manual Verification line, with no outer-test step and no harness task.
- **Harness tasks**: none. No boundary is marked "add harness".

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `tmp_P3GImo3QHu-8iv.1` - depends on 4 tasks

Use `bd show tmp_P3GImo3QHu-8iv.1` to see which tasks block the phase milestone.

---

## Phase 1: Rides window and wizard focus fixes

### Objective

The rides page lists the last 28 days inclusive, pinned at both edges by pytest. Answering a wizard question moves focus to the next question's first answer.

### Prerequisites

- [ ] Research validated
- [ ] Design approved
- [ ] Development environment ready: `pip install -e .[dev]` (pytest), plus any desktop browser for the AC-3 check
- [ ] Baseline green: `python -m pytest` passes 7 tests (confirmed 2026-10-17)

### Changes Required

#### 1. Rides page outer tests

**File**: `tests/test_rides_page.py` (new)

**Current State** (from research.md):

- No test covers `render_rides_page`. The only "outside the window" case is 2026-08-01, 88 days back (`tests/test_store.py:13-15`), so the off-by-one went unnoticed.

**Target State** (M1):

- Four tests pin the window at both edges through the rendered page.

**Implementation** (shape; the test-writer owns final names):

```python
from datetime import date

from rides.views import render_rides_page

TODAY = date(2026, 10, 28)


def test_rides_page_lists_a_ride_from_27_days_ago():                 # AC-1
    body = render_rides_page([{"date": date(2026, 10, 1), "km": 10.0}], TODAY)
    assert '<li class="ride">2026-10-01 - 10.0 km</li>' in body


def test_rides_page_lists_a_ride_from_today():                       # AC-1 edge
    body = render_rides_page([{"date": TODAY, "km": 10.0}], TODAY)
    assert '<li class="ride">2026-10-28 - 10.0 km</li>' in body


def test_rides_page_omits_a_ride_from_28_days_ago():                 # AC-2
    body = render_rides_page([{"date": date(2026, 9, 30), "km": 10.0}], TODAY)
    assert '<li class="ride">2026-09-30 - 10.0 km</li>' not in body


def test_rides_page_lists_only_the_ride_inside_the_window():         # AC-2 edge
    rides = [{"date": date(2026, 10, 1), "km": 10.0}, {"date": date(2026, 9, 30), "km": 10.0}]
    body = render_rides_page(rides, TODAY)
    assert '<li class="ride">2026-10-01 - 10.0 km</li>' in body
    assert '<li class="ride">2026-09-30 - 10.0 km</li>' not in body
    assert body.count('<li class="ride">') == 1
```

**Rationale**: The criteria are observed at the rendered page, not at `list_rides`, so the tests call `render_rides_page`.
**Pattern Reference**: `tests/test_today_page.py:1-8` (page test layout), `tests/test_store.py:5,9` (TODAY, inline ride dicts)

#### 2. Rides window constant

**File**: `rides/store.py`

**Current State** (from research.md):

- `WINDOW_DAYS = 27` (`rides/store.py:4`), cutoff `today - timedelta(days=WINDOW_DAYS - 1)` (`rides/store.py:9`), inclusive filter (`rides/store.py:10`). The oldest listed ride is 26 days back.

**Target State** (M1):

- 28 days shown, today included. The oldest listed ride is 27 days back (2026-10-01 when today is 2026-10-28).

**Implementation**:

```python
# At line 4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

Lines 9-10 stay unchanged.

**Rationale**: The constant then means "days shown, today included", which matches the Goal. The design rejected dropping the `- 1` instead.
**Pattern Reference**: `rides/store.py:17-19` (`load_series` uses the same "N inclusive, subtract N-1" idiom)

#### 3. Wizard focus

**File**: `wizard/wizard.js`

**Current State** (from research.md):

- The click handler hides the current question and unhides the next one (`wizard/wizard.js:7-14`). There is no `focus()` call, so focus falls back to `body`.

**Target State** (M2):

- After the next question is unhidden, focus lands on its first `button`: None on Soreness, Up on Mood (`wizard/wizard.html:12,17`).

**Implementation**:

```javascript
// At lines 11-13, replace:
      if (next) {
        next.hidden = false;
      }

// With:
      if (next) {
        next.hidden = false;
        next.querySelector("button").focus();
      }
```

**Rationale**: `.focus()` does nothing on an element inside a `hidden` ancestor, so the call must come after the unhide. The `if (next)` guard leaves the last question unchanged, which is out of scope.
**Pattern Reference**: `wizard/wizard.js:6` (`question.querySelectorAll("button")`). Style is `const`, double quotes, 2-space indent and semicolons.

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Outer Test Steps

- AC-1: A ride 27 days before today appears on the rides page, observed at HTML returned by `render_rides_page` → `[beads:phase1_outer_1]`
  - Examples:
    - today 2026-10-28, ride 2026-10-01 → listed
    - (edge) today 2026-10-28, ride 2026-10-28 → listed
  - Test file: `tests/test_rides_page.py` (new)
  - Done when: the 2026-10-01 test fails on its `in body` assertion against `WINDOW_DAYS = 27`, and the `red(AC-1)` commit exists. The today edge passes already; keep it as a pin.
- AC-2: A ride 28 days before today does not appear on the rides page, observed at HTML returned by `render_rides_page` → `[beads:phase1_outer_2]`
  - Examples:
    - today 2026-10-28, ride 2026-09-30 → not listed
    - (edge) rides on 2026-10-01 and 2026-09-30 together → only 2026-10-01 is listed
  - Test file: `tests/test_rides_page.py`
  - Done when: the combined edge test fails on its 2026-10-01 assertion against `WINDOW_DAYS = 27`, and the `red(AC-2)` commit exists. The 09-30-alone case passes already; keep it as a pin.
  - The edge to `phase1_outer_1` serializes access to `tests/test_rides_page.py`. It is not a data dependency.

#### Implementation Tasks

- Raise `WINDOW_DAYS` from 27 to 28 at `rides/store.py:4` → `[beads:phase1_impl_1]`
  - Serves: AC-1, AC-2
  - Depends on: `phase1_outer_1`, `phase1_outer_2` (it consumes their failing tests)
  - One-line change (Changes Required §2). Lines 9-10 stay untouched.
  - Inner cases: 10-01 in and 09-30 out at the lower bound (`rides/store.py:10`), today in at the upper bound
  - Done when: `python -m pytest tests/test_rides_page.py -v` and `python -m pytest` both pass
- Move focus to the next question's first answer in `wizard/wizard.js:11-13` → `[beads:phase1_impl_2]`
  - Serves: AC-3 (manual harness decision, so there is no outer-test step)
  - Depends on: nothing. Ready immediately, in parallel with the rides track.
  - Add `next.querySelector("button").focus();` after `next.hidden = false;` (Changes Required §3)
  - Done when: the AC-3 manual check below passes

### Success Criteria

#### Automated Verification

(Commands from research.md: pytest only. The repo has no lint, type-check or build commands.)

- [ ] Phase tests pass: `python -m pytest tests/test_rides_page.py -v`
- [ ] Full suite passes: `python -m pytest` (7 existing tests and 4 new, `tests/test_today_page.py` included)
- [ ] Each outer test of this phase passes: `python -m pytest tests/test_rides_page.py -v`
- [ ] Red commits `red(AC-1)` and `red(AC-2)` exist ahead of the constant change: `git log --oneline`

#### Manual Verification

- [ ] **AC-3** (harness decision: manual): open `wizard/wizard.html` in a browser and use only the keyboard. Tab to Good on Sleep and press Enter (repeat once with Space). Sleep hides, Soreness shows, and focus is on **None**. Then activate any Soreness answer: Mood shows and focus is on **Up**. Confirm focus with a visible focus ring or `document.activeElement` in the console. If a question is visible but not focused, the check fails. Record the result at validation.
- [ ] No regression: answering Mood (the last question) still hides it and throws no console error. Focus falling back to `body` here is expected and out of scope.

### Modified Files

#### Code Files

- `rides/store.py` - `WINDOW_DAYS` raised to 28
- `wizard/wizard.js` - focus call added after the unhide

#### Test Files

- `tests/test_rides_page.py` - Outer tests for AC-1 and AC-2

**Quick test command for this phase**:

```bash
python -m pytest tests/test_rides_page.py -v
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before closing the plan:

1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`)
2. ✅ Phase 1 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification (AC-3) confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show tmp_P3GImo3QHu-8iv.1` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Things to determine during implementation:

- None expected. Research and all three analysis agents confirmed the code paths, and design.md records no assumptions to validate.

Note: Update this section with findings as you implement.

---

## 🚧 Blockers & Notes

### Current Blockers

Blockers are tracked in beads. To see current blockers:

```bash
bd blocked    # Show all blocked issues and what blocks them
```

For reference, recently resolved blockers can be noted here:

- (none)

### Implementation Notes

- (none yet)

---

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: tmp_P3GImo3QHu-8iv

**Phase Milestones**:

- Phase 1: tmp_P3GImo3QHu-8iv.1 (all Phase 1 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Dependency graph**:

```
outer_1 (AC-1) ──► outer_2 (AC-2, file serialization) ──► impl_1 (WINDOW_DAYS)
      └──────────────────────────────────────────────────────┘
impl_2 (wizard focus)                         (independent, ready immediately)
all four ──► phase1_milestone
```

**Essential Commands**:

- `bd ready` - See what's ready to work on (no blockers)
- `bd show [id]` - View task details and dependencies
- `bd update [id] --claim` - Claim a task
- `bd close [id]` - Complete a task
- `bd blocked` - See what's currently blocked
- `bd list --status=in_progress` - See your active work

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.

---

## 🔗 Quick Reference

### Key Files

- **Research**: [research.md](research.md) - Current state documentation
- **Design**: [design.md](design.md) - Target state specification
- **Main Entry**: `rides/views.py` (`render_rides_page`), `wizard/wizard.html`
- **Config**: `pyproject.toml` (`[tool.pytest.ini_options]`)

### Common Commands

```bash
python -m pytest                              # full suite
python -m pytest tests/test_rides_page.py -v  # phase tests
# no build or lint commands in this repo
```

### Design Decisions Reference

- Window: `WINDOW_DAYS = 28` keeps the `- 1` cutoff, so the constant means "days shown, today included"
- Focus: `.focus()` goes inside `if (next)`, after `next.hidden = false`; the last question is unchanged
- No JS or browser harness; AC-3 is checked manually at validation
