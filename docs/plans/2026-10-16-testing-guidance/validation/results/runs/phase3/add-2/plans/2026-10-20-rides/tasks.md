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
beads_epic: tmp_FmFIiINWRq-aw2
beads_phases:
  phase1_milestone: tmp_FmFIiINWRq-aw2.1
beads_tasks:
  # Phase 1 tasks
  phase1_harness_1: tmp_FmFIiINWRq-aw2.2
  phase1_outer_1: tmp_FmFIiINWRq-aw2.3
  phase1_outer_2: tmp_FmFIiINWRq-aw2.4
  phase1_impl_1: tmp_FmFIiINWRq-aw2.5
  phase1_impl_2: tmp_FmFIiINWRq-aw2.6
beads_assumptions:
  playwright_installable: tmp_FmFIiINWRq-8t9
---

# Execution Plan: Rides Window and Check-in Focus

## Overview

Implementing the 28-day inclusive rides window and next-question focus in the check-in wizard, as specified in design.md.

**Design Approach**: Widen the window constant and focus the next question's first answer (design.md "Design Approach"). Wizard behavior is pinned by a new Playwright-for-Python harness run under pytest.

**Target State**: from design.md Success Metrics:

- **M1**: for `today` = 2026-10-28, the rendered rides page lists a ride dated 2026-10-01 and not one dated 2026-09-30; the listed span is 28 calendar days, today included.
- **M2**: in a real browser, after an answer on a question that has a following question, the following fieldset is visible and `document.activeElement` is its first answer button.
- Deferred: none

## Implementation Strategy

### Phase Rationale

There is one phase with two independent branches. The work is small: one constant, one line of JavaScript, a harness, and two outer tests. The dependency analysis found no shared source file, test module, or import between `rides/` and `wizard/`. Splitting into phases would put the two fixes in series behind a checkpoint without lowering risk.

Based on dependency analysis:

- **Rides branch** (no external gate): outer test for AC-1, then the `WINDOW_DAYS` change (`rides/store.py:4`). No existing test changes result at 28 days. The existing dates are 2026-10-28, 10-25, 10-20 and 08-01 (`tests/test_store.py:9-20`), and `load_series` does not read `WINDOW_DAYS` (`rides/store.py:14-21`).
- **Wizard branch** (critical path, external gate): harness, then the outer test for AC-2, then the `focus()` call (`wizard/wizard.js:11-13`). The harness needs the `playwright` package and a Chromium download. This is the riskiest step, and it is ready on day one, so a failure shows up early. The harness task validates assumption `tmp_FmFIiINWRq-8t9` first.
- **Parallel width**: `bd ready` starts with the harness task and the AC-1 outer test together.
- **Environment coupling, not a code dependency**: once `playwright` is in the `dev` extra, a full `pytest` run needs it. The browser fixtures in `tests/conftest.py` import Playwright lazily, and all wizard tests live in `tests/test_wizard.py`. That way `pytest --ignore=tests/test_wizard.py` still runs the unit tests on a machine without the browser. This is the mitigation in design.md's Risk Analysis.

### Testing Strategy

Each acceptance criterion becomes one outer test at the boundary design.md names. The coordinator runs each through `wb:test-writer` and commits it failing as `red(AC-n)`.

| Criterion | Boundary | Harness | Outer test file | RED before the fix |
| --- | --- | --- | --- | --- |
| AC-1 | HTML string from `render_rides_page` (`rides/views.py:6-11`) | Present: pytest substring checks (`tests/test_today_page.py:6-8`) | `tests/test_rides_page.py` (new) | `"2026-10-01 - 12.0 km" in body` fails, because the cutoff is 2026-10-02 at `WINDOW_DAYS = 27` |
| AC-2 | Rendered `wizard/wizard.html` in headless Chromium | Added by `phase1_harness_1` | `tests/test_wizard.py` (created by the harness task) | `to_be_focused()` on `[data-value="none"]` and on `[data-value="up"]` fails, because `wizard/wizard.js` has no `focus()` and focus falls to `body` |

These assertions are regression guards and pass both before and after the fix:

- AC-1: `"2026-09-30" not in body` guards against widening too far.
- AC-1: today's ride is listed and sorted first (`rides/store.py:11`).
- AC-2: the visibility assertions (`wizard/wizard.js:9`, `wizard/wizard.js:12`).

Inner cases:

- AC-1: two boundary cases on `list_rides` in `tests/test_store.py`, written with the implementation task. 2026-10-01 is kept and 2026-09-30 is dropped for `TODAY`, both exercising `rides/store.py:9-10`.
- AC-2: none below the browser. The focus behavior only exists in a live document, and the two examples (Sleep→Soreness, then Soreness→Mood answered with the second button) cover both transitions.

Fixtures: the existing tests share none, and there is no `conftest.py`. AC-1 follows the convention of a module constant `TODAY = date(2026, 10, 28)` with inline ride dicts (`tests/test_store.py:5`, `tests/test_store.py:19-20`). AC-2 uses the `wizard_page` fixture the harness task adds in `tests/conftest.py`.

Activation: the AC-2 test activates answers with `locator.click()`. The ordering bug (focus called while the next fieldset is still `hidden`) still shows up. The clicked button is always inside the fieldset being hidden, so a misordered `focus()` leaves `document.activeElement` on `body`, and `to_be_focused()` fails.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `tmp_FmFIiINWRq-aw2.1`. It depends on 5 tasks and on assumption `tmp_FmFIiINWRq-8t9`.

Use `bd show tmp_FmFIiINWRq-aw2.1` to see which tasks block the phase milestone.

---

## Phase 1: Rides window and wizard focus

### Objective

The rides page lists 28 calendar days inclusive of today (AC-1). Answering a check-in question reveals the next one and focuses its first answer (AC-2). Each criterion is pinned by an outer test at its user-facing boundary.

### Prerequisites

- [ ] Research validated (research.md `status: complete`)
- [ ] Design approved (design.md)
- [ ] Development environment ready: Python ≥ 3.10 and `pytest` (currently 7 passing)
- [ ] Network access to install `playwright` and download Chromium (the harness task only; the rides branch needs nothing new)

### Changes Required

#### 1. Rides window constant

**File**: `rides/store.py`

**Current State** (from research.md):

- `WINDOW_DAYS = 27` (`rides/store.py:4`). Its only reader is `list_rides`.
- `list_rides` keeps rides with `today - (WINDOW_DAYS - 1) <= date <= today` (`rides/store.py:9-10`). That is 27 days, so with `today` = 2026-10-28 the cutoff is 2026-10-02 (research.md, worked example, lines 79-85).
- `render_rides_page` is the only production caller (`rides/views.py:9`).

**Target State** (M1):

- The window is 28 days inclusive. With `today` = 2026-10-28 the cutoff is 2026-10-01.

**Implementation**:

```python
# At rides/store.py:4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

**Rationale**: the formula already reads "N days including today", and only N is wrong (design.md, Technical Decisions → Architecture).
**Pattern Reference**: the inclusive N-day idiom is `end - timedelta(days=N - 1)` with `start <= date <= end` (`rides/store.py:9-10`, `rides/store.py:18-20`).

#### 2. Wizard focus on advance

**File**: `wizard/wizard.js`

**Current State** (from research.md):

- The click handler records the answer, hides the current fieldset, and unhides the next one (`wizard/wizard.js:7-14`). Nothing calls `focus()`.

**Target State** (M2):

- After the next fieldset is unhidden, its first `<button>` has focus. Focus on Soreness's first button is `data-value="none"` (`wizard/wizard.html:12`); on Mood's it is `data-value="up"` (`wizard/wizard.html:17`).

**Implementation**:

```javascript
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

**Rationale**: a `hidden` element cannot take focus, so the call must come after `next.hidden = false`. The first `<button>` is the fieldset's first focusable child, because `<legend>` is not focusable (design.md, Architecture). The change adds no `tabindex` or `aria-*` and no markup (design.md, Out of Scope).
**Pattern Reference**: `wizard/wizard.js:10-13`, the existing advance point.

#### 3. Browser test harness

**Files**: `pyproject.toml`, `tests/conftest.py` (new), `tests/test_wizard.py` (new)

**Current State** (from research.md, Testing Conventions):

- `dev = ["pytest"]` (`pyproject.toml:8`).
- `[tool.pytest.ini_options]` holds only `testpaths` and `pythonpath` (`pyproject.toml:10-12`).
- There is no `conftest.py`, no markers, and no browser tooling.

**Target State** (design.md, Harness Decisions): Playwright for Python drives headless Chromium under `pytest` and loads `wizard/wizard.html` from disk.

**Implementation**:

```toml
# pyproject.toml:7-12 becomes:
[project.optional-dependencies]
dev = ["pytest", "playwright"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
markers = ["browser: drives wizard/wizard.html in headless Chromium (needs playwright and its chromium browser)"]
```

```python
# tests/conftest.py (new)
"""Browser fixtures for the check-in wizard tests."""
from pathlib import Path

import pytest

WIZARD_URL = (Path(__file__).resolve().parent.parent / "wizard" / "wizard.html").as_uri()


@pytest.fixture(scope="session")
def browser():
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        yield browser
        browser.close()


@pytest.fixture
def wizard_page(browser):
    context = browser.new_context()
    page = context.new_page()
    errors = []
    page.on("pageerror", errors.append)
    page.goto(WIZARD_URL)
    yield page
    context.close()
    assert errors == []
```

```python
# tests/test_wizard.py (new; the smoke test, AC-2 tests are added by phase1_outer_2)
import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.browser


def test_wizard_starts_on_sleep(wizard_page):
    expect(wizard_page.locator('[data-question="sleep"]')).to_be_visible()
    expect(wizard_page.locator('[data-question="soreness"]')).to_be_hidden()
    expect(wizard_page.locator('[data-question="mood"]')).to_be_hidden()
```

**Rationale**:

- The Playwright import inside the `browser` fixture keeps `tests/conftest.py` importable without Playwright installed.
- `tests/test_wizard.py` imports `expect` at the top, so on a machine without Playwright `pytest -m "not browser"` would fail at collection. Use `pytest --ignore=tests/test_wizard.py` there instead. This is how wizard tests are "selected out", per design.md Risk Analysis.
- A full `pytest` fails loudly rather than skipping AC-2 when Playwright is missing. `pytest.importorskip` was considered and not used, because it would silently drop the only check on AC-2.
- Each test gets a fresh context, because `answers` and the `hidden` state live in the page.
- `expect()` auto-waits, so no fixed sleeps are needed (design.md, Non-Functional Requirements).
- `file://` loads only local files (design.md, Security).

**Pattern Reference**: the `dev` extra and pytest config the harness joins (`pyproject.toml:7-12`); the flat `tests/test_<thing>.py` layout (`tests/test_store.py`, `tests/test_today_page.py`).

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Harness Tasks

- Add the Playwright-for-Python browser harness for the wizard → `[beads:phase1_harness_1]` (`tmp_FmFIiINWRq-aw2.2`)
  - Serves: AC-2 (boundary "Browser DOM: wizard visibility and keyboard focus", decision "Add harness")
  - Step 1, validate assumption `tmp_FmFIiINWRq-8t9`:
    - Run `python -m pip install playwright` and `python -m playwright install chromium`.
    - Record the outcome on `tmp_FmFIiINWRq-8t9` with `bd update tmp_FmFIiINWRq-8t9 --notes=...`, then `bd close tmp_FmFIiINWRq-8t9`.
    - If install or `chromium.launch()` fails, stop and escalate. The design requires the harness choice to be revisited before wizard work.
  - Step 2: apply the `pyproject.toml` change, `tests/conftest.py`, and `tests/test_wizard.py` from Changes Required §3.
  - Proof that the harness can fail:
    - Change the smoke test to expect `soreness` visible and run `pytest tests/test_wizard.py`. It must fail on the `to_be_visible` assertion.
    - Restore the expectation. It must pass.
  - Also confirm that `pytest --ignore=tests/test_wizard.py` runs the 7 unit tests, and that the full `pytest` run passes (8 tests).
  - Estimated budget: about 25 tool calls.

#### Outer Test Steps

- AC-1: Rides page lists the 28-day window inclusive of today, observed at the HTML string returned by `render_rides_page` → `[beads:phase1_outer_1]` (`tmp_FmFIiINWRq-aw2.3`)
  - Examples:
    - Rides `[{date: 2026-10-01, km: 12.0}, {date: 2026-09-30, km: 8.0}]` with `today` 2026-10-28: the page contains `2026-10-01 - 12.0 km` and does not contain `2026-09-30`.
    - Edge: a ride dated today (2026-10-28) is still listed alongside the 2026-10-01 ride, newest first. Assert `body.index("2026-10-28") < body.index("2026-10-01")`.
  - Test file: `tests/test_rides_page.py`. Follow the `from datetime import date` / `from rides.views import render_rides_page` imports, `TODAY = date(2026, 10, 28)`, and inline ride dicts (`tests/test_store.py:1-5`).
  - Done when the test fails on the `"2026-10-01 - 12.0 km" in body` assertion and the `red(AC-1)` commit exists.
- AC-2: Answering a question reveals the next one and focuses its first answer, observed at the rendered wizard page in headless Chromium → `[beads:phase1_outer_2]` (`tmp_FmFIiINWRq-aw2.4`)
  - Examples:
    - Activate Good on Sleep: Soreness is visible, Sleep is hidden, and `document.activeElement` is the button with `data-value="none"`.
    - Edge: then activate Some on Soreness (the second answer): Mood is visible and `document.activeElement` is the button with `data-value="up"`.
  - Test file: `tests/test_wizard.py`. Use the `wizard_page` fixture.
    - Activate with `wizard_page.locator('[data-question="sleep"] [data-value="good"]').click()`.
    - Assert with `expect(...).to_be_visible()`, `.to_be_hidden()`, and `.to_be_focused()` on `[data-question="soreness"] [data-value="none"]` and `[data-question="mood"] [data-value="up"]`.
    - No sleeps.
  - Done when the test fails on a `to_be_focused` assertion (focus is on `body`) and the `red(AC-2)` commit exists.

#### Implementation Tasks

- Change `WINDOW_DAYS` from 27 to 28 at `rides/store.py:4` → `[beads:phase1_impl_1]` (`tmp_FmFIiINWRq-aw2.5`)
  - Serves: AC-1
  - Apply Changes Required §1. The cutoff formula and filter at `rides/store.py:9-10` stay unchanged.
  - Inner cases (`tests/test_store.py`, existing style):
    - `list_rides([{"date": date(2026, 10, 1), "km": 12.0}], TODAY)` returns that ride (27 days back).
    - `list_rides([{"date": date(2026, 9, 30), "km": 8.0}], TODAY) == []` (28 days back).
  - Done when `pytest tests/test_rides_page.py tests/test_store.py` passes and `pytest --ignore=tests/test_wizard.py` passes.
- Focus the next question's first answer after unhiding it at `wizard/wizard.js:11-13` → `[beads:phase1_impl_2]` (`tmp_FmFIiINWRq-aw2.6`)
  - Serves: AC-2
  - Apply Changes Required §2. Put `focus()` after `next.hidden = false`. Make no change to `wizard/wizard.html`.
  - Inner cases: none below the browser boundary (see Testing Strategy).
  - Done when `pytest tests/test_wizard.py` passes and the full `pytest` passes.

### Success Criteria

#### Automated Verification

(Commands come from research.md Testing Conventions, `pyproject.toml:10-12`, plus the marker this plan adds.)

- [ ] Phase tests pass: `pytest tests/test_rides_page.py tests/test_store.py tests/test_wizard.py`
- [ ] Full suite passes: `pytest` (7 existing tests, the new rides page tests, the inner `list_rides` cases, and the wizard smoke and AC-2 tests)
- [ ] Each outer test of this phase passes: `pytest tests/test_rides_page.py tests/test_wizard.py`
- [ ] Unit tests still run with the wizard tests selected out: `pytest --ignore=tests/test_wizard.py`
- [ ] Performance NFR: `time pytest` completes in under 30 seconds once Chromium is installed
- [ ] Reliability NFR: wizard tests pass on 10 consecutive runs: `for i in $(seq 10); do pytest -q tests/test_wizard.py || break; done`
- [ ] No lint, type-check, or build tooling is configured (research.md, Testing Conventions), so there is nothing further to run

#### Manual Verification

(From design.md M2. No acceptance criterion is under a "manual" harness decision.)

- [ ] Open `wizard/wizard.html` in a desktop browser. Tab to Good and press Enter: Soreness appears and focus is visibly on None. Press Enter on Some: Mood appears and focus is on Up.
- [ ] No regression after the last question: answering Mood hides it and nothing else changes (design.md, Out of Scope)

### Modified Files

#### Code Files

- `rides/store.py`: `WINDOW_DAYS` 27 → 28
- `wizard/wizard.js`: focus the next question's first answer
- `pyproject.toml`: `playwright` in the `dev` extra; `browser` marker registered

#### Test Files

- `tests/test_rides_page.py`: outer test for AC-1
- `tests/test_wizard.py`: harness smoke test and outer test for AC-2
- `tests/conftest.py`: `browser` and `wizard_page` fixtures
- `tests/test_store.py`: inner boundary cases for AC-1

**Quick test command for this phase** (from research.md's Testing Conventions):

```bash
pytest tests/test_rides_page.py tests/test_store.py tests/test_wizard.py
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before closing the plan:

1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`), plus assumption `tmp_FmFIiINWRq-8t9`
2. ✅ Phase 1 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show tmp_FmFIiINWRq-aw2.1` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Things to determine during implementation:

- Whether Chromium installs and launches headless in this environment (assumption `tmp_FmFIiINWRq-8t9`; settled by the first step of `phase1_harness_1`)
- Wall-clock cost of the session-scoped browser launch against the 30-second NFR

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

- (none yet)

---

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: tmp_FmFIiINWRq-aw2

**Phase Milestones**:

- Phase 1: tmp_FmFIiINWRq-aw2.1 (all Phase 1 tasks and assumption `tmp_FmFIiINWRq-8t9` must complete)

**Dependency graph** (edges follow consumed outputs):

```
phase1_harness_1 (aw2.2) ──► phase1_outer_2 (aw2.4) ──► phase1_impl_2 (aw2.6)
phase1_outer_1   (aw2.3) ──► phase1_impl_1  (aw2.5)
all five + 8t9 ──► phase1_milestone (aw2.1)
```

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
- **Main Entry**: `rides/views.py:6` (`render_rides_page`), `wizard/wizard.html`
- **Config**: `pyproject.toml`

### Common Commands

```bash
# Commands from research.md's Testing Conventions
pytest                                   # full suite (needs playwright + chromium after phase1_harness_1)
pytest --ignore=tests/test_wizard.py     # unit tests only
pytest tests/test_rides_page.py tests/test_store.py tests/test_wizard.py   # phase tests
python -m playwright install chromium    # one-time browser download
```

### Design Decisions Reference

- Rides window: change the constant to 28, keep the inclusive formula (rejected: changing the cutoff formula)
- Rides verification: at the rendered page HTML, not only at `list_rides`
- Wizard focus: the next question's first answer button, after unhiding it (rejected: focusing the fieldset or legend)
- Harness: Playwright for Python under pytest (rejected: jsdom with Jest/Vitest; manual check)
- Out of scope: focus after the last question, `load_series` sharing the constant, ARIA additions
