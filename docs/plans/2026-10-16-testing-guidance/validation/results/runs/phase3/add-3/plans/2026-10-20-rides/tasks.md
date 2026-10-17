---
project: rides
ticket: null
created: 2026-10-20
status: not-started
last_updated: 2026-10-17
current_phase: 1
total_tasks: 6
completed_tasks: 0
depends_on: [research.md, design.md]
beads_epic: tmp_D2hvewKJsz-k9v
beads_phases:
  phase1_milestone: tmp_D2hvewKJsz-k9v.1
  phase2_milestone: tmp_D2hvewKJsz-k9v.2
beads_tasks:
  # Phase 1 tasks
  phase1_harness_1: tmp_D2hvewKJsz-k9v.3
  phase1_outer_1: tmp_D2hvewKJsz-k9v.4
  phase1_impl_1: tmp_D2hvewKJsz-k9v.5
  # Phase 2 tasks
  phase2_outer_1: tmp_D2hvewKJsz-k9v.6
  phase2_outer_2: tmp_D2hvewKJsz-k9v.7
  phase2_impl_1: tmp_D2hvewKJsz-k9v.8
---

# Execution Plan: Rides Window and Check-in Focus

## Overview

Implementing two independent fixes, as specified in design.md: the rides page window grows from 27 to 28 days inclusive, and the check-in wizard moves keyboard focus to the next question's first answer. Both get outer tests, and a pytest-playwright browser harness is added for the wizard.

**Design Approach**: a minimal in-place fix (the window constant, plus focus on reveal) with a pytest-playwright wizard harness (design.md "Design Approach").
**Target State**: from design.md Success Metrics:

- **M1**: with `today = 2026-10-28`, the `render_rides_page` HTML contains a ride dated 2026-10-01 and none dated 2026-09-30.
- **M2**: in a real browser, clicking "Good" on Sleep leaves Soreness visible and makes `document.activeElement` its "None" button. The same holds for each later question that has a following one.
- Deferred: none.

## Implementation Strategy

### Phase Rationale

Phase 1 is the wizard track and Phase 2 is the rides track, so the riskiest work comes first.

- Phase 1 carries the plan's only external risk. A new dev dependency and a Chromium launch carry design assumption `tmp_D2hvewKJsz-zya` (design.md "Assumptions").
- If Chromium cannot launch, design.md says AC-3 is demoted to a manual check and the harness decision is revisited. That has to surface before anything else is built on it.
- Phase 2 is a one-line constant change with string-level tests and no external risk.

Based on dependency analysis:

- The two tracks share no source file and no runtime link: `wizard/` has no connection to the Python package (research.md:199).
  - The rides track touches `rides/store.py` and a new `tests/test_rides_page.py`.
  - The wizard track touches `pyproject.toml`, `wizard/wizard.js` and a new `tests/test_wizard.py`.
- The two tracks could run in parallel. They are phased only so the harness risk is checked at a human checkpoint first. Phase 2 tasks have no beads edge into Phase 1; only the Phase 2 milestone waits on the Phase 1 milestone.
- The wizard critical path is: the dependency in `pyproject.toml:7-8` → install → harness smoke test → the AC-3 red test → the focus line in `wizard/wizard.js:11-13`.
- No existing test changes outcome under `WINDOW_DAYS = 28`. The existing tests use Oct 28, Oct 20, Oct 25 and Aug 1, all far from the boundary (design.md:80).
- `load_series` doesn't read `WINDOW_DAYS` (research.md:97).

### Testing Strategy

The acceptance criteria drive the tests. There is one outer-test step per criterion, and each is committed red before the code that serves it changes.

| Criterion | Boundary (Observed at) | Harness | Outer test file | Red today because |
| --- | --- | --- | --- | --- |
| AC-1 | HTML string from `render_rides_page` (`rides/views.py:6-11`) | Present: direct pytest call, as in `tests/test_today_page.py:6-8` | `tests/test_rides_page.py` (new) | Oct 1 is 27 days back and the cutoff is Oct 2 (`rides/store.py:9`), so the `<li>` is absent |
| AC-2 | same | same | `tests/test_rides_page.py` | the combined example (Oct 1 and Sep 30 together) expects Oct 1 to be present. The Sep-30-only example already passes today and stays as a guard against over-correcting |
| AC-3 | live DOM in headless Chromium, `file://` URL, no seams | **Add harness** (`phase1_harness_1`) | `tests/test_wizard.py` (new) | no code calls `focus()` (research.md:140), so `to_be_focused()` times out |

Inner cases from the criterion examples:

- **AC-1**: a ride on today (Oct 28) is still listed. This is the inclusive upper bound at `rides/store.py:10`, and it passes before and after.
- **AC-2**: a ride on Sep 30 only gives `"2026-09-30" not in body` and `"<ul></ul>" in body` (`rides/views.py:11`). With Oct 1 and Sep 30 together, only Oct 1 appears.
- **AC-3**: the Sleep → Soreness transition focuses "None". The Soreness → Mood transition focuses "Up". Both go through the same handler at `wizard/wizard.js:7-14`.

Test conventions to follow (research.md "Testing Conventions" and the pattern findings):

- Files are named `tests/test_<subject>.py`. Tests are plain functions whose names are behavior sentences, e.g. `test_lists_a_ride_from_today` (`tests/test_store.py:8`).
- `TODAY = date(2026, 10, 28)` is defined at module level (`tests/test_store.py:5`).
- Rides are inline dict literals with literal `date(...)` values (`tests/test_store.py:14`). Dates are not computed with `timedelta`.
- HTML assertions are plain substring `in` / `not in` checks on a variable named `body` (`tests/test_today_page.py:7-8`).
- There is no conftest and no fixtures, apart from pytest-playwright's built-in `page`.
- Browser tests wait only through `playwright.sync_api.expect` auto-waiting. There are no `time.sleep` or `wait_for_timeout` calls (design.md Non-Functional Requirements, "Reliability").
- Browser tests carry no skip markers and no `importorskip`. A missing browser must error, not skip (design.md:83).

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `tmp_D2hvewKJsz-k9v.1` - depends on 3 tasks
- Phase 2: See beads milestone `tmp_D2hvewKJsz-k9v.2` - depends on 3 tasks and the Phase 1 milestone

Use `bd show [milestone-id]` to see which tasks block each phase milestone.

---

## Phase 1: Wizard Browser Harness and Focus (AC-3)

### Objective

After any answer on a question that has a next question, the next question is visible and its first answer button has keyboard focus. This is proven in headless Chromium by a pytest-playwright test that runs in the default `python3 -m pytest` run.

### Prerequisites

- [ ] Research validated (research.md `status: complete`)
- [ ] Design approved (design.md `status: approved`)
- [ ] Network access for `pip install pytest-playwright`. Chromium builds are already cached under `~/Library/Caches/ms-playwright` (chromium-1200, -1228, -1248). If the installed Playwright pins a different build, `playwright install chromium` downloads it.
- [ ] Design assumption `tmp_D2hvewKJsz-zya` is open. `phase1_harness_1` validates it.

### Changes Required

#### 1. Dev dependency and setup note

**File**: `pyproject.toml`

**Current State** (from research.md:216):

- `dev = ["pytest"]` at `pyproject.toml:8`, unpinned.
- There is no setup documentation anywhere in the repo.

**Target State** (design.md "Integration Points", "New dev dependency"):

- `pytest-playwright` sits in the `dev` extra next to `pytest`.
- The one-time Chromium download is documented next to it (design.md risk table, row 2).

**Implementation**:

```toml
# At pyproject.toml:7-8, replace:
[project.optional-dependencies]
dev = ["pytest"]

# With:
[project.optional-dependencies]
# Browser tests (tests/test_wizard.py) also need, once: python3 -m playwright install chromium
dev = ["pytest", "pytest-playwright"]
```

**Rationale**: keeps a single `python3 -m pytest` command and adds no Node toolchain (design.md "Why This Approach", third bullet).
**Pattern Reference**: the existing unpinned one-line list at `pyproject.toml:8`.

#### 2. Browser harness and smoke test

**File**: `tests/test_wizard.py` (new)

**Current State**: there is no browser, DOM or JS harness (research.md:228).

**Target State**: a module-level `file://` URL to `wizard/wizard.html` and one smoke test on existing behavior. The smoke test proves three things: Chromium launches, the page loads, and `wizard.js` runs.

**Implementation**:

```python
from pathlib import Path

from playwright.sync_api import expect

WIZARD = (Path(__file__).parent.parent / "wizard" / "wizard.html").as_uri()


def test_answering_sleep_reveals_soreness(page):
    page.goto(WIZARD)
    sleep = page.locator('[data-question="sleep"]')
    soreness = page.locator('[data-question="soreness"]')
    sleep.get_by_role("button", name="Good").click()
    expect(sleep).to_be_hidden()
    expect(soreness).to_be_visible()
```

**Rationale**:

- `wizard.html:21` loads `wizard.js` by relative path, so a `file://` URL works without a server (design.md:49).
- The `page` fixture is function-scoped, so each test starts from fresh page state.

**Pattern Reference**: the module-level constant style of `TODAY` at `tests/test_store.py:5`.

#### 3. Focus on reveal

**File**: `wizard/wizard.js`

**Current State** (research.md:163-172):

- The click handler hides the current fieldset (`wizard/wizard.js:9`) and unhides the next one (`:11-13`).
- Nothing moves focus.

**Target State** (M2, AC-3): focus moves to the revealed fieldset's first button, after the unhide.

**Implementation**:

```js
// At wizard/wizard.js:11-13, replace:
      if (next) {
        next.hidden = false;
      }

// With:
      if (next) {
        next.hidden = false;
        next.querySelector("button").focus();
      }
```

**Rationale**:

- This is the single reveal point. A hidden element cannot take focus, so the focus call follows `next.hidden = false` (design.md "Architecture", third bullet).
- Keeping the call inside `if (next)` leaves the last question's behavior unchanged (design.md "Architecture", fourth bullet).

**Pattern Reference**: the fieldset-scoped query `question.querySelectorAll("button")` at `wizard/wizard.js:6`.

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Harness Tasks

- Add the pytest-playwright harness for the wizard browser boundary → `[beads:phase1_harness_1]`
  - Edit `pyproject.toml:7-8` as in Changes Required §1.
  - Install: `python3 -m pip install pytest-playwright`, then `python3 -m playwright install chromium`. The repo has no `[build-system]`, so a direct install is the safe route (see Implementation Discoveries).
  - Create `tests/test_wizard.py` with `WIZARD` and `test_answering_sleep_reveals_soreness`, as in Changes Required §2.
  - Proof the harness can fail:
    1. Temporarily change `expect(soreness).to_be_visible()` to `expect(soreness).to_be_hidden()`.
    2. Run `python3 -m pytest -q tests/test_wizard.py` and confirm it fails on an `expect` assertion timeout, not on a fixture or browser-launch error.
    3. Restore the line and confirm it passes.
    4. Do not commit the wrong expectation.
  - Close `tmp_D2hvewKJsz-zya` with the result. Example reason: "Validated: Chromium build NNNN launched headless via pytest-playwright X.Y". If Chromium cannot launch, stop. Leave `tmp_D2hvewKJsz-zya` open, and send AC-3 back to `/wb:create_design` (design.md risk row 1).
  - Done when `python3 -m pytest -q` runs 8 passed: the 7 existing tests plus the smoke test.

#### Outer Test Steps

- AC-3: Answering a question reveals the next one and focuses its first answer, observed at the live DOM in headless Chromium → `[beads:phase1_outer_1]`
  - Examples:
    - Click Good (Sleep): Soreness becomes visible and focus is on "None" (`data-value="none"`).
    - Edge: after that, click "Some" on Soreness: Mood becomes visible and focus is on "Up" (`data-value="up"`).
  - Test file: `tests/test_wizard.py`. Append to the file `phase1_harness_1` creates and reuse its `WIZARD` constant.
  - Shape: two tests, both starting with `page.goto(WIZARD)`.
    1. `test_answering_sleep_focuses_the_first_soreness_answer`
       - Before acting, assert the Given: Sleep is visible, Soreness and Mood are hidden.
       - Click `sleep.get_by_role("button", name="Good")`.
       - Assert `expect(sleep).to_be_hidden()`, `expect(soreness).to_be_visible()` and `expect(soreness.get_by_role("button", name="None")).to_be_focused()`.
    2. `test_answering_soreness_focuses_the_first_mood_answer`
       - Click Good on Sleep, then Some on Soreness.
       - Assert `expect(mood).to_be_visible()` and `expect(mood.get_by_role("button", name="Up")).to_be_focused()`.
  - Use no sleeps and no skip markers.
  - Done when both tests fail on the `to_be_focused()` assertion. Focus falls back to `body` today. The `red(AC-3)` commit must exist.

#### Implementation Tasks

- Move focus to the next question's first answer in `wizard/wizard.js:11-13` → `[beads:phase1_impl_1]`
  - Serves: AC-3
  - Add `next.querySelector("button").focus();` directly after `next.hidden = false;`, inside `if (next)`, as in Changes Required §3. Never put it before the unhide.
  - Leave the markup unchanged: native `<button type="button">` elements are focusable without `tabindex` (design.md:81).
  - Inner cases:
    - Sleep → Soreness focuses "None".
    - Soreness → Mood focuses "Up".
    - Mood (last) has no `next`, so behavior is unchanged.
  - Done when the `phase1_outer_1` tests and the smoke test pass, and the full suite passes.

### Success Criteria

#### Automated Verification

(Commands come from research.md's Testing Conventions: `python3 -m pytest -q` is both the fast and the full command. The repo has no lint, type-check or build tool, per research.md:237.)

- [ ] Phase tests pass: `python3 -m pytest -q tests/test_wizard.py`
- [ ] Full suite passes: `python3 -m pytest -q` (10 passed: the 7 existing tests, plus the smoke test and the 2 AC-3 tests)
- [ ] Each outer test of this phase passes: `python3 -m pytest -q tests/test_wizard.py -k focuses`
- [ ] Reliability: three consecutive full runs pass with no flakes, each under 30 seconds: `for i in 1 2 3; do python3 -m pytest -q; done` (design.md Non-Functional Requirements)
- [ ] No fixed waits or skips: `grep -nE "time\.sleep|wait_for_timeout|skip" tests/test_wizard.py` prints nothing

#### Manual Verification

(From design.md M2)

- [ ] Open `wizard/wizard.html` in a desktop browser. Press Tab to reach "Good" and press Enter. Soreness appears and focus is on "None", so pressing Enter again answers Soreness. Then Mood appears with focus on "Up".
- [ ] Clicking with the mouse gives the same result.
- [ ] No regression: after the Mood answer, all three fieldsets are hidden, as before (design.md "Architecture", fourth bullet).

### Modified Files

#### Code Files

- `pyproject.toml` - `pytest-playwright` added to the `dev` extra, with the Chromium setup note
- `wizard/wizard.js` - focus moved to the next question's first button after the reveal

#### Test Files

- `tests/test_wizard.py` - harness smoke test and outer tests for AC-3

**Quick test command for this phase** (from research.md's Testing Conventions):

```bash
python3 -m pytest -q tests/test_wizard.py
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before proceeding to Phase 2:

1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`)
2. ✅ Assumption `tmp_D2hvewKJsz-zya` closed as validated
3. ✅ Phase 1 milestone beads issue closed
4. ✅ All automated verification passing
5. ✅ Manual verification confirmed by human
6. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show tmp_D2hvewKJsz-k9v.1` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Phase 2: Rides Window of 28 Days (AC-1, AC-2)

### Objective

With today = 2026-10-28, the rides page lists rides from Oct 1 through Oct 28 inclusive (28 days) and nothing from Sep 30 or earlier. This is pinned by page-level tests on both sides of the cutoff.

### Prerequisites

- [ ] Phase 1 complete and verified
- [ ] Phase 1 manual testing confirmed
- [ ] None from dependency analysis: this track does not use anything Phase 1 built

### Changes Required

#### 1. Rides page boundary tests

**File**: `tests/test_rides_page.py` (new)

**Current State**: no test calls `render_rides_page`, and no test sits on the window boundary (research.md:226, :234).

**Target State**: AC-1 and AC-2, each with its examples, asserted on the returned HTML string.

**Implementation** (shape; the outer-test steps run through `wb:test-writer`):

```python
from datetime import date

from rides.views import render_rides_page

TODAY = date(2026, 10, 28)


def test_lists_a_ride_from_27_days_ago():
    rides = [{"date": date(2026, 10, 1), "km": 10.0}]
    body = render_rides_page(rides, TODAY)
    assert '<li class="ride">2026-10-01 - 10.0 km</li>' in body
```

**Pattern Reference**: `tests/test_today_page.py:6-8` for the direct page-builder call and the `body` substring assertion. `tests/test_store.py:5,14` for `TODAY` and the ride literals.

#### 2. Window length

**File**: `rides/store.py`

**Current State** (research.md:21-25):

- `WINDOW_DAYS = 27` at `rides/store.py:4`.
- The cutoff `today - timedelta(days=WINDOW_DAYS - 1)` at `:9` gives today−26.

**Target State** (M1): the cutoff is today−27, so the window is 28 days inclusive.

**Implementation**:

```python
# At rides/store.py:4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

**Rationale**:

- The constant means "number of days, inclusive", and the `- 1` at `:9` turns the count into a start date (design.md "Why This Approach", first bullet).
- Leave the arithmetic, the signature and the sort untouched (design.md "Integration Points", first bullet).

**Pattern Reference**: `rides/store.py:9-10`.

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Outer Test Steps

- AC-1: A ride 27 days before today is listed on the rides page, observed at the HTML string returned by `render_rides_page` → `[beads:phase2_outer_1]`
  - Examples:
    - A ride on 2026-10-01 of 10.0 km makes the page contain `<li class="ride">2026-10-01 - 10.0 km</li>`.
    - Edge: a ride on 2026-10-28 (today) is still listed.
  - Test file: `tests/test_rides_page.py` (new). Create it with `TODAY = date(2026, 10, 28)`.
  - Shape:
    - `test_lists_a_ride_from_27_days_ago`, as in Changes Required §1.
    - `test_lists_a_ride_from_today`, asserting `'<li class="ride">2026-10-28 - 10.0 km</li>' in body`. This passes today and serves as an inner guard on the upper bound.
  - Done when `test_lists_a_ride_from_27_days_ago` fails on its `in body` assertion, because the `<ul>` is empty today, and the `red(AC-1)` commit exists.
- AC-2: A ride 28 days before today is not listed on the rides page, observed at the HTML string returned by `render_rides_page` → `[beads:phase2_outer_2]`
  - Examples:
    - A ride on 2026-09-30 means the page contains no `2026-09-30` and its `<ul>` is empty.
    - Edge: with rides on 2026-10-01 and 2026-09-30 together, only 2026-10-01 appears.
  - Test file: `tests/test_rides_page.py`. Append to the file `phase2_outer_1` creates.
  - Shape:
    - `test_omits_a_ride_from_28_days_ago`, asserting `"2026-09-30" not in body` and `"<ul></ul>" in body`. This passes today and guards against over-correcting to 29 days.
    - `test_lists_only_the_ride_inside_the_window`, with both rides, asserting `'<li class="ride">2026-10-01 - 10.0 km</li>' in body` and `"2026-09-30" not in body`.
  - Done when `test_lists_only_the_ride_inside_the_window` fails on the Oct 1 assertion, because Oct 1 is dropped today, and the `red(AC-2)` commit exists. The single-ride example passing before the fix is expected: design.md describes it as the excluded side that must stay excluded.

#### Implementation Tasks

- Set `WINDOW_DAYS = 28` at `rides/store.py:4` → `[beads:phase2_impl_1]`
  - Serves: AC-1, AC-2
  - Change only the value, as in Changes Required §2. `rides/views.py` needs no change, because `render_rides_page` already delegates to `list_rides` (`rides/views.py:9`).
  - Inner cases:
    - Oct 28 (0 days back) is listed.
    - Oct 1 (27 days back) is listed.
    - Sep 30 (28 days back) is not listed.
    - The existing `tests/test_store.py` tests stay green (design.md:80).
  - Done when all four `tests/test_rides_page.py` tests pass and the full suite passes.

### Success Criteria

#### Automated Verification

(Commands come from research.md's Testing Conventions. There is no lint, type-check or build tool.)

- [ ] Phase tests pass: `python3 -m pytest -q tests/test_rides_page.py tests/test_store.py`
- [ ] Full suite passes: `python3 -m pytest -q` (14 passed: the 10 from Phase 1 plus 4 rides-page tests)
- [ ] Each outer test of this phase passes: `python3 -m pytest -q tests/test_rides_page.py`
- [ ] `grep -rn "WINDOW_DAYS" rides tests` shows only `rides/store.py:4` and `:9`. That confirms no new reader was added.

#### Manual Verification

(From design.md M1)

- [ ] Run `python3 -c "from datetime import date; from rides.views import render_rides_page; print(render_rides_page([{'date': date(2026,10,1),'km':10.0},{'date': date(2026,9,30),'km':10.0}], date(2026,10,28)))"` and confirm the output lists only `2026-10-01 - 10.0 km`.
- [ ] No regression: `tests/test_load_series.py` is unchanged and still passes, since `load_series` keeps its own literals (design.md "Out of Scope").

### Modified Files

#### Code Files

- `rides/store.py` - `WINDOW_DAYS` changed from 27 to 28

#### Test Files

- `tests/test_rides_page.py` - outer tests for AC-1 and AC-2

**Quick test command for this phase** (from research.md's Testing Conventions):

```bash
python3 -m pytest -q tests/test_rides_page.py tests/test_store.py
```

### ⛔ CHECKPOINT: Phase 2 Complete

Before closing the epic:

1. ✅ All Phase 2 task beads issues closed (`bd list --status=closed`)
2. ✅ Phase 2 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show tmp_D2hvewKJsz-k9v.2` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Things to determine during implementation:

- **Install route.** `pyproject.toml` has no `[build-system]`, and setuptools flat-layout auto-discovery sees `rides/`, `tests/` and `wizard/`. Whether `python3 -m pip install -e ".[dev]"` works is unverified, which is why the harness task installs `pytest-playwright` directly. Record here whether the editable install works.
- **Chromium build.** Which Chromium build the installed Playwright pins, and whether it matches a cached build (1200, 1228 or 1248) or downloads a new one. Record the version in the `tmp_D2hvewKJsz-zya` close reason.
- **Suite time.** The wall time of the full suite with browser tests, measured against the 30-second budget. Red runs take longer, because each failing `to_be_focused()` waits out Playwright's default 5-second timeout.
- **Test artifacts.** Whether pytest-playwright writes a `test-results/` directory on failure in this configuration. If it does, raise it with the user rather than editing `.gitignore`, which is not in design scope.

Note: Update this section with findings as you implement.

---

## 🚧 Blockers & Notes

### Current Blockers

Blockers are tracked in beads. To see current blockers:

```bash
bd blocked    # Show all blocked issues and what blocks them
```

For reference, recently resolved blockers can be noted here:

- (none yet)

### Implementation Notes

- `tmp_D2hvewKJsz-zya` (design assumption) takes an edge to `phase1_harness_1`, because the harness task is what validates it. If validation fails, stop and return to `/wb:create_design`. Do not plan around it.

---

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: tmp_D2hvewKJsz-k9v

**Phase Milestones**:

- Phase 1: tmp_D2hvewKJsz-k9v.1 (all Phase 1 tasks must complete)
- Phase 2: tmp_D2hvewKJsz-k9v.2 (all Phase 2 tasks must complete; also waits on the Phase 1 milestone)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Dependency graph** (edges follow consumed outputs):

```
k9v.3 harness ──► k9v.4 outer AC-3 ──► k9v.5 wizard focus          ──► k9v.1 (Phase 1)
      └──► zya (design assumption, validated by the harness task)
k9v.6 outer AC-1 ──► k9v.7 outer AC-2 ──► k9v.8 WINDOW_DAYS = 28   ──► k9v.2 (Phase 2)
      └────────────────────────────────────┘
```

- `k9v.7 → k9v.6`: k9v.7 appends to `tests/test_rides_page.py`, which k9v.6 creates. The edge also serializes access to that file.
- `k9v.3` and `k9v.6` are ready together. The two tracks share no file.

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
- **Main Entry**: `rides/views.py` (`render_rides_page`), `wizard/wizard.html` (with `wizard/wizard.js`)
- **Config**: `pyproject.toml` (dev extra, pytest options)

### Common Commands

```bash
# Commands from research.md's Testing Conventions
python3 -m pytest -q                                              # full suite (also the fast command)
python3 -m pytest -q tests/test_wizard.py                         # Phase 1
python3 -m pytest -q tests/test_rides_page.py tests/test_store.py # Phase 2
python3 -m playwright install chromium                            # one-time browser setup
# No build, lint or type-check tooling exists in this repo
```

### Design Decisions Reference

Quick lookup of key design decisions:

- **Window**: change the value of `WINDOW_DAYS` only, 27 → 28. Keep the `- 1` inclusive-cutoff idiom. Do not touch `load_series`.
- **Focus**: inside the existing click handler, after `next.hidden = false`, on the next fieldset's first button. Nothing happens after the last question.
- **Harness**: pytest-playwright with headless Chromium, the `file://` URL, the default pytest run, and errors rather than skips when the browser is missing.
