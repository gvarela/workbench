---
project: rides
ticket: null
created: 2026-10-20
status: not-started
last_updated: 2026-10-17
current_phase: 1
total_tasks: 5
completed_tasks: 0
depends_on: [research.md, design.md]
beads_epic: tmp_wwWWuhu4ed-11s
beads_phases:
  phase1_milestone: tmp_wwWWuhu4ed-1tn
beads_tasks:
  # Phase 1 tasks
  phase1_harness_1: tmp_wwWWuhu4ed-247
  phase1_outer_1: tmp_wwWWuhu4ed-rz7
  phase1_outer_2: tmp_wwWWuhu4ed-agd
  phase1_impl_1: tmp_wwWWuhu4ed-cll
  phase1_impl_2: tmp_wwWWuhu4ed-pe3
---

# Execution Plan: Rides Window and Check-in Focus

## Overview

This plan implements the two fixes specified in design.md: the rides page lists 28 inclusive dates (today-27 through today), and the check-in wizard moves keyboard focus to the next question's first answer. It also adds a Playwright browser harness so the focus behavior is checked automatically.

**Design Approach**: Minimal in-place fix: change the window constant's value and add one focus call in the existing handler (design.md "Design Approach").
**Target State**: from design.md Success Metrics. Each one refines an Intent statement, and none are deferred:

- **M1**: With `today` = 2026-10-28, the rendered rides page lists a ride dated 2026-10-01 and does not list one dated 2026-09-30.
- **M2**: In a real browser, after an answer is activated on a question that has a following question, that next fieldset is not hidden and `document.activeElement` is its first answer button.

## Implementation Strategy

### Phase Rationale

The work fits in one phase. It consists of five small tasks on two independent tracks, and they share no file.

Based on dependency analysis:

- **The rides track and the wizard track touch disjoint files.**
  - Rides track: `rides/store.py`, `tests/test_rides_page.py`, `tests/test_store.py`.
  - Wizard track: `pyproject.toml`, `tests/test_wizard.py`, `wizard/wizard.js`.
  - `rides/views.py:2` imports only `rides.store` and `rides.view_model`, and nothing in Python loads `wizard/`.
  - So `bd ready` starts with two tasks in parallel: the harness and the AC-1 outer test.
- **The critical path is the wizard track: harness, then the AC-2 outer test, then the focus call.**
  - The harness is also the riskiest task, because of the browser install (design.md Risk Analysis, assumption `tmp_wwWWuhu4ed-pod`).
  - It has no prerequisites, so it can start immediately and fail fast.
- **Raising `WINDOW_DAYS` to 28 breaks no existing test.**
  - The three tests in `tests/test_store.py` use rides 0, 3, 8 and 88 days back.
  - `load_series` and `render_today_page` don't read the constant (`rides/store.py:14-21`, `rides/views.py:14-17`).

### Testing Strategy

Each acceptance criterion gets one outer test at the boundary design.md names.

**AC-1** is observed at the HTML string from `render_rides_page` (`rides/views.py:6-11`).

- A harness is already present: pytest with plain `assert` on the returned string, as in `tests/test_today_page.py:6-8`. Its harness decision is "Use as is", so it needs no harness task.
- The outer test goes in `tests/test_rides_page.py`.
- Its window example is red today. `render_rides_page` returns `<ul></ul>` for the 2026-10-01 and 2026-09-30 rides, so the test fails on the `"2026-10-01 - 5.0 km" in body` assertion, not on an error.
- Its edge example is green before and after the fix and serves as a regression guard. In that example a ride dated today is listed and a ride dated 2026-10-29 is not.
- `format_distance(5.0)` returns `"5.0 km"` (`rides/view_model.py:4-6`). The int `5` would render `"5 km"` instead (`tests/test_view_model.py:9`), so the test must use float km values.
- The inner cases sit one level down, on `list_rides` in `tests/test_store.py`: a ride from 27 days ago is listed, and one from 28 days ago is omitted. They exercise the cutoff at `rides/store.py:9` and the inclusive lower bound at `rides/store.py:10`.

**AC-2** is observed in the browser DOM: the `hidden` property on the fieldsets and `document.activeElement`, for `wizard/wizard.html` loaded by `file://`.

- No harness is present (research.md Testing Conventions), and the decision is "Add harness". The harness task therefore comes first.
  - It uses plain `playwright.sync_api`, not the `pytest-playwright` plugin, which keeps it to the single dependency design.md names.
  - Its module-scoped `page` fixture lives inside `tests/test_wizard.py`, which keeps the repo's no-`conftest.py` convention (research.md Testing Conventions).
- The harness's smoke test covers existing behavior that already passes: clicking Good reveals Soreness (`wizard/wizard.js:9`, `wizard/wizard.js:12`).
- The AC-2 outer test then fails on the `activeElement` assertion. After the click, focus falls back to `<body>`.
- AC-2 has no inner cases. The repo has no JavaScript unit harness, and the behavior is a single statement that the outer test observes directly.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `tmp_wwWWuhu4ed-1tn`. It depends on 5 tasks.

Use `bd show tmp_wwWWuhu4ed-1tn` to see which tasks block the phase milestone.

---

## Phase 1: Rides window and wizard focus

### Objective

The rides page lists rides dated today-27 through today (AC-1). Answering a check-in question that has a next question moves keyboard focus to that question's first answer, and a browser test pins this down (AC-2).

### Prerequisites

- [ ] Research validated (research.md `status: complete`)
- [ ] Design approved (design.md: Pending Decisions "None")
- [ ] Development environment ready: `python3 -m pytest -q` reports `7 passed`
- [ ] Network access to install the `playwright` package and, if the cached build doesn't match, a Chromium build. This is the harness task's first step, and it validates assumption `tmp_wwWWuhu4ed-pod`.

### Changes Required

#### 1. Rides window constant

**File**: `rides/store.py`

**Current State** (from research.md "Rides window"):

- `WINDOW_DAYS = 27` (`rides/store.py:4`) is the only definition, and `rides/store.py:9` is its only use.
- `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` (`rides/store.py:9`) gives a cutoff of 2026-10-02 for `today` = 2026-10-28. That window is 27 dates.

**Target State** (M1):

- The window is 28 dates, 2026-10-01 through 2026-10-28 for `today` = 2026-10-28.

**Implementation**:

```python
# At rides/store.py:4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

**Rationale**: the constant means "number of dates, inclusive of today", and the `- 1` at `rides/store.py:9` turns that count into an offset. Only the value was wrong, so the formula stays as it is (design.md Technical Decisions → Architecture, and Rejected Alternatives → "Change the cutoff formula").
**Pattern Reference**: an inclusive `today`-relative range with `timedelta`, at `rides/store.py:17-20`.

#### 2. Wizard focus

**File**: `wizard/wizard.js`

**Current State** (from research.md "Check-in wizard"):

- The click handler at `wizard/wizard.js:7-14` stores the answer, hides the current fieldset (line 9), and unhides the next one inside `if (next)` (lines 11-13). It never calls `focus()`.

**Target State** (M2):

- After the next fieldset is unhidden, its first `<button>` in document order has focus.

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

- An element under `hidden` cannot take focus, so the focus call comes after the unhide in the same synchronous handler (design.md Technical Decisions → Architecture).
- `querySelector("button")` returns the first answer in document order. That matches design.md's definition of "first answer".
- Keyboard activation of a `<button>` fires `click`, so one handler covers taps, clicks, and Enter/Space.

**Pattern Reference**: the `hidden` toggle at `wizard/wizard.js:9-13`. The file's style is 2-space indent, double quotes, and semicolons.

#### 3. Browser harness

**Files**: `pyproject.toml`, `tests/test_wizard.py` (new)

**Current State** (from research.md Testing Conventions):

- `dev = ["pytest"]` (`pyproject.toml:8`). The repo has no browser or JavaScript harness, and `playwright` is not importable.
- `~/Library/Caches/ms-playwright` already holds Chromium builds 1200, 1228 and 1248, which may already match the installed package.

**Target State**: the existing `python3 -m pytest -q` command drives a headless Chromium against `wizard/wizard.html` loaded by `file://`.

**Implementation**:

```toml
# At pyproject.toml:8, replace:
dev = ["pytest"]

# With:
dev = ["pytest", "playwright"]
```

```python
# tests/test_wizard.py (new): harness portion
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

URL = (Path(__file__).resolve().parent.parent / "wizard" / "wizard.html").as_uri()


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        yield browser
        browser.close()


@pytest.fixture
def page(browser):
    page = browser.new_page()
    page.goto(URL)
    yield page
    page.close()


def is_hidden(page, question):
    return page.eval_on_selector(f"[data-question={question}]", "e => e.hidden")


def test_answering_reveals_the_next_question(page):
    assert is_hidden(page, "soreness")
    page.click("[data-question=sleep] button[data-value=good]")
    assert is_hidden(page, "sleep")
    assert not is_hidden(page, "soreness")
```

Install with `python3 -m pip install playwright`, then `python3 -m playwright install chromium`. Do not use `pip install -e ".[dev]"`: `pyproject.toml` has no `[build-system]`, and setuptools would stop on the multiple top-level directories (`rides`, `wizard`, `tests`, `docs`).

**Rationale**:

- The browser is module-scoped, so Chromium launches once per test module.
- Each test gets a fresh page, so the wizard's state doesn't leak between tests.
- `.resolve()` matters because the checkout sits under `/private/var` on macOS.

**Pattern Reference**: test files are `tests/test_<feature>.py` with absolute imports, descriptive `test_` names, and plain `assert` (`tests/test_store.py:1-21`).

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Harness Tasks

- Add a Playwright for Python browser harness for `wizard/wizard.html` → `[beads:phase1_harness_1]` (`tmp_wwWWuhu4ed-247`)
  - Boundary: the browser DOM for `wizard/wizard.html` loaded by `file://` (design.md Harness Decisions: "Add harness").
  - Steps:
    1. Edit `pyproject.toml:8`.
    2. Run `python3 -m pip install playwright` and `python3 -m playwright install chromium`.
    3. Create `tests/test_wizard.py` with `URL`, the `browser` and `page` fixtures, `is_hidden`, and the smoke test `test_answering_reveals_the_next_question`, all exactly as in Changes Required §3.
  - Proof that the harness can fail:
    - Change the last assertion to `assert is_hidden(page, "soreness")`.
    - Run `python3 -m pytest -q tests/test_wizard.py` and see an `AssertionError`, not a launch or navigation error.
    - Restore the assertion and see it pass.
  - Validates assumption `tmp_wwWWuhu4ed-pod`. Close that issue with the evidence: the `playwright` version and a successful Chromium launch.
  - If the install or the browser launch fails, stop and escalate. AC-2's harness decision goes back to `/wb:create_design`; do not substitute a manual check.
  - Done when `python3 -m pytest -q` reports `8 passed`.
  - Budget: about 20 tool calls.

#### Outer Test Steps

- AC-1: The rides page lists rides from the last 28 dates inclusive, observed at the HTML string returned by `render_rides_page` → `[beads:phase1_outer_1]` (`tmp_wwWWuhu4ed-rz7`)
  - Examples:
    - Rides on 2026-10-01 (5.0 km) and 2026-09-30 (7.0 km), with `today` 2026-10-28. The HTML contains `2026-10-01 - 5.0 km` and does not contain `2026-09-30`.
    - Edge: a ride dated `today` (2026-10-28) is still listed, and a ride dated 2026-10-29 is still not listed.
  - Test file: `tests/test_rides_page.py` (new).
    - It imports `render_rides_page` from `rides.views` and defines `TODAY = date(2026, 10, 28)`. Ride dicts are inline with float km, following `tests/test_store.py:1-21`.
    - Write two tests: `test_lists_rides_from_the_last_28_dates` (the window example) and `test_lists_today_and_not_the_future` (the edge example).
    - Give the edge rides distinct km values, for example 1.0 for today and 9.0 for 2026-10-29.
  - Done when the window test fails on the `"2026-10-01 - 5.0 km" in body` assertion, the edge test passes, and the `red(AC-1)` commit exists.
- AC-2: Answering a question moves focus to the next question's first answer, observed in the browser DOM (fieldset `hidden` and `document.activeElement`) for `wizard/wizard.html` loaded by `file://` → `[beads:phase1_outer_2]` (`tmp_wwWWuhu4ed-agd`)
  - Examples:
    - Click Good on Sleep. Soreness is not hidden, and the focused element is the None button.
    - Edge: then click Some on Soreness. Mood is not hidden, and the focused element is the Up button.
  - Test file: `tests/test_wizard.py`. It uses the harness task's `page` fixture and `is_hidden` helper.
    - Add `test_answering_moves_focus_to_the_next_questions_first_answer`.
    - Activate answers with `page.click("[data-question=sleep] button[data-value=good]")` and `page.click("[data-question=soreness] button[data-value=some]")`.
    - After each click, assert `not is_hidden(page, …)`, then assert `page.evaluate("document.activeElement.dataset.value")` equals `"none"`, then `"up"`.
  - Done when the test fails on the `activeElement` assertion and the `red(AC-2)` commit exists. Before the fix, focus is on `<body>` and the value is `None`.

#### Implementation Tasks

- Set `WINDOW_DAYS` to 28 at `rides/store.py:4` → `[beads:phase1_impl_1]` (`tmp_wwWWuhu4ed-cll`)
  - Serves: AC-1
  - Make the one-line change in Changes Required §1. Leave `rides/store.py:9-11`, `render_rides_page` and `load_series` untouched.
  - Inner cases: add these to `tests/test_store.py` in its existing style.
    - `test_lists_a_ride_from_27_days_ago`: a ride dated 2026-10-01 is listed.
    - `test_omits_a_ride_from_28_days_ago`: a ride dated 2026-09-30 is omitted.
    - Each one asserts the whole `list_rides(...)` result.
  - Done when `python3 -m pytest -q tests/test_rides_page.py tests/test_store.py` passes and the full suite is green.
- Focus the next question's first answer at `wizard/wizard.js:11-13` → `[beads:phase1_impl_2]` (`tmp_wwWWuhu4ed-pe3`)
  - Serves: AC-2
  - Add `next.querySelector("button").focus();` directly after `next.hidden = false;` (Changes Required §2).
  - Make no changes to the markup, CSS, ARIA, or the last-question (Mood) path.
  - Inner cases: none beyond the AC-2 outer test. There is no JavaScript unit harness, and the no-next path is out of scope and stays unchanged.
  - Done when `python3 -m pytest -q tests/test_wizard.py` passes and the full suite is green.

#### Integration Tasks

None. `render_rides_page` → `list_rides` and `wizard.html` → `wizard.js` keep their existing signatures and wiring (design.md Integration Points).

#### Dependency graph

```
harness (-247) ──► AC-2 outer (-agd) ──► wizard focus (-pe3)
AC-1 outer (-rz7) ──► WINDOW_DAYS (-cll)
all five ──► Phase 1 milestone (-1tn)
```

Each edge follows a consumed artifact:

- The AC-2 test uses the `page` fixture and `tests/test_wizard.py` that the harness creates.
- Each implementation task turns its criterion's red outer test green.

### Success Criteria

#### Automated Verification

(Commands from research.md Testing Conventions)

- [ ] Phase tests pass: `python3 -m pytest -q tests/test_rides_page.py tests/test_store.py tests/test_wizard.py`
- [ ] Full suite passes: `python3 -m pytest -q`. Expect `13 passed`: the 7 existing tests, 1 harness smoke test, 2 from AC-1, 2 inner store tests, and 1 for AC-2.
- [ ] Each outer test of this phase passes: `python3 -m pytest -q tests/test_rides_page.py tests/test_wizard.py`
- [ ] Lint, type check, and build: none are configured (research.md Testing Conventions).

#### Manual Verification

(From design.md success criteria. No acceptance criterion is under a "manual" harness decision.)

- [ ] Open `wizard/wizard.html` in a browser and use only the keyboard: Tab to Good, then press Enter. Soreness appears and None has a visible focus ring. Press Space on Some: Mood appears and Up is focused.
- [ ] Performance: no measurable change. The full suite still runs in a few seconds with one Chromium launch per module.
- [ ] No regression: answering Mood still hides all three fieldsets, as before. The no-next path is unchanged.
- [ ] Security: `playwright` appears only in the `dev` extra of `pyproject.toml`, and nothing at runtime imports it.

### Modified Files

#### Code Files

- `rides/store.py`: `WINDOW_DAYS` changes from 27 to 28 (line 4).
- `wizard/wizard.js`: focus call added in the `if (next)` branch (lines 11-13).
- `pyproject.toml`: `playwright` added to the `dev` extra (line 8).

#### Test Files

- `tests/test_rides_page.py`: outer tests for AC-1 (new file).
- `tests/test_store.py`: inner window-edge cases for AC-1.
- `tests/test_wizard.py`: browser harness fixtures, smoke test, and the outer test for AC-2 (new file).

**Quick test command for this phase** (from research.md's Testing Conventions):

```bash
python3 -m pytest -q tests/test_rides_page.py tests/test_store.py tests/test_wizard.py
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before closing out the project:

1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`)
2. ✅ Phase 1 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show tmp_wwWWuhu4ed-1tn` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Things to determine during implementation:

- **Chromium build match.** The `playwright` version pip resolves may expect a Chromium revision other than the cached 1200, 1228 or 1248 builds in `~/Library/Caches/ms-playwright`. `python3 -m playwright install chromium` downloads the matching build if needed. Record the version and build used here.
- **Install target.** `python3` is a mise-managed 3.13.14 with pytest 9.1.1 installed directly, and there is no venv. Install `playwright` into the same interpreter that `python3 -m pytest` uses.
- **Focus on click.** If Chromium doesn't focus a clicked button before the handler runs, the smoke and AC-2 tests are unaffected, because both observe state after the click. Note any surprise here.

Note: Update this section with findings as you implement.

---

## 🚧 Blockers & Notes

### Current Blockers

Blockers are tracked in beads. To see current blockers:

```bash
bd blocked    # Show all blocked issues and what blocks them
```

For reference, recently resolved blockers can be noted here:

- None yet.

### Implementation Notes

- Assumption `tmp_wwWWuhu4ed-pod` (Playwright and Chromium installable) is validated by the harness task. If it fails, AC-2's harness decision returns to `/wb:create_design` (design.md Risk Analysis).

---

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: tmp_wwWWuhu4ed-11s

**Phase Milestones**:

- Phase 1: tmp_wwWWuhu4ed-1tn (all Phase 1 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

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
- **Main Entry**: `rides/views.py:6` (`render_rides_page`), `wizard/wizard.html` (loads `wizard/wizard.js`)
- **Config**: `pyproject.toml:7-12`

### Common Commands

```bash
# Commands from research.md's Testing Conventions
python3 -m pytest -q                                   # full suite (fast = full)
python3 -m pytest -q tests/test_rides_page.py tests/test_store.py tests/test_wizard.py
# No build, lint, or type-check commands are configured.
```

### Design Decisions Reference

Quick lookup of key design decisions:

- Window constant: `WINDOW_DAYS` stays "number of dates, inclusive of today". Only its value changes, to 28.
- Focus: unhide first, then focus the next fieldset's first `<button>` in the same synchronous handler.
- Out of scope: focus after Mood, `load_series` refactor, distance storage, ARIA, CSS, and new pages.
- Harness: Playwright for Python, dev-only, run by `python3 -m pytest -q`, page loaded by `file://`.
