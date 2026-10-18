---
project: rides
ticket: null
created: 2026-10-20
status: not-started
last_updated: 2026-10-18
current_phase: 1
total_tasks: 6
completed_tasks: 0
depends_on: [research.md, design.md]
beads_epic: work-db8
beads_phases:
  phase1_milestone: work-db8.1
beads_tasks:
  # Phase 1 tasks
  phase1_harness_1: work-db8.2
  phase1_outer_1: work-db8.3
  phase1_outer_2: work-db8.4
  phase1_outer_3: work-db8.5
  phase1_impl_1: work-db8.6
  phase1_impl_2: work-db8.7
beads_assumptions:
  playwright_headless: work-8ju
---

# Execution Plan: Rides Window and Check-in Focus

## Overview

Implementing the 28-day inclusive rides window and focus placement in the check-in wizard, as specified in design.md.

**Design Approach**: Correct the window constant (`WINDOW_DAYS` 27 → 28, inclusive cutoff formula kept), focus the revealed question's first answer in the existing click handler, and add a pytest-playwright harness that loads `wizard/wizard.html` over `file://` (design.md "Design Approach").

**Target State** (design.md Success Metrics):

- **M1**: On Oct 28 the rides page lists Oct 1 through Oct 28 inclusive. A ride 27 days back is listed and one 28 days back is not. Refines the README rides statement.
- **M2**: In a real browser, answering a non-final question leaves the next question visible with `document.activeElement` on its first answer button. Refines the README wizard statement.
- Deferred: none.

## Implementation Strategy

### Phase Rationale

The work is small, two one-line source changes plus a harness, so it is a single phase with one human checkpoint at the end.

Based on dependency analysis:

- The two features share no files and no code. The rides path is `tests/test_rides_page.py` → `rides/store.py:4`, and the wizard path is harness → `tests/test_wizard.py` → `wizard/wizard.js:11-13`. They run in parallel.
- The critical path is the wizard side: add `pytest-playwright` to the dev extra, install it, install Chromium, add the `file://` fixture, run the AC-3 red test, then make the focus change. `playwright` and `pytest-playwright` are not installed in this environment. Chromium builds already exist under `~/Library/Caches/ms-playwright/`, but no one has confirmed that their revision matches a fresh `playwright` install.
- The harness task is a starting point, so the riskiest assumption (`work-8ju`, a headless Chromium can run) is tested first.
- `bd ready` starts with two items: the harness task and the AC-1 outer test.

### Testing Strategy

From the test coverage agent:

| Criterion | Boundary | Harness | Outer test file | Red today because |
| --- | --- | --- | --- | --- |
| AC-1 | `render_rides_page` HTML (`rides/views.py:6-11`) | pytest, use as is | `tests/test_rides_page.py` (new) | cutoff is Oct 2 (`rides/store.py:4,9`), so the Oct 1 ride is absent |
| AC-2 | `render_rides_page` HTML | pytest, use as is | `tests/test_rides_page.py` | the edge example (Sep 30 + Oct 1 → exactly one `li.ride`) yields zero today. The main example (Sep 30 alone → zero) already passes and stays as the guard against a 29-day regression |
| AC-3 | browser DOM of `wizard/wizard.html` over `file://` | none → **add harness** (pytest-playwright) | `tests/test_wizard.py` (new) | `wizard/wizard.js:7-14` never calls `focus()` |

- **Rides assertions**: count `'<li class="ride">'` in the page, not the bare word `"ride"` (`<h1>Rides</h1>` would also match). Assert only on `render_rides_page` output, since `render_today_page` shares the `li.ride` class (`rides/views.py:16`).
- **Wizard assertions**: use the pytest-playwright `page` fixture, which is function-scoped so every test starts freshly loaded. Locate answers by `[data-question=…] button[data-value=…]`, because the buttons have no ids (`wizard/wizard.html:7-18`). Assert focus with `expect(locator).to_be_focused()` after the click. That catches focus being set before the unhide (design Risk 1).
- **Inner cases**: none beyond the criterion examples. Each example is one assertion at the boundary, and the code under change is one line per feature.
- **Existing tests**: none pins the 27-day boundary. `tests/test_store.py:8-21` covers today, 2026-08-01 and 10-20/10-25, and all of these give the same result at 28. `tests/test_load_series.py` and `tests/test_today_page.py` do not read `WINDOW_DAYS`.
- **Conventions** (pattern agent): files are named `tests/test_<topic>.py`. Each file defines a module-level `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`). Rides are inline dicts `{"date": date(...), "km": 10.0}` and test names are sentences (`test_lists_a_ride_from_today`). No `conftest.py` exists yet, and the harness adds the first one.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: See beads milestone `work-db8.1` - depends on 6 tasks

Use `bd show work-db8.1` to see which tasks block the phase milestone.

---

## Phase 1: Rides window and wizard focus

### Objective

The rides page lists today plus the 27 prior days (AC-1, AC-2). Answering a non-final check-in question moves focus to the first answer of the revealed question, and a real-browser test pins this (AC-3).

### Prerequisites

- [ ] Research validated (research.md `status: complete`)
- [ ] Design approved (design.md Pending Decisions: none; approach, metrics, criteria and harness decision approved)
- [ ] Development environment ready: a Python ≥ 3.10 that runs `pytest`. There is no venv in the repo, and the default `python3` is the mise Python 3.13.
- [ ] Network access for `pip install pytest-playwright`, and possibly for `playwright install chromium` if the cached Chromium revision does not match

### Changes Required

#### 1. Browser test harness

**Files**: `pyproject.toml`, `tests/conftest.py` (new), `tests/test_wizard.py` (new)

**Current State** (from research.md):

- Tests run with pytest only. There is no Playwright or Selenium configuration and no wizard test (research.md:25).
- `pyproject.toml:8` is `dev = ["pytest"]`. `pyproject.toml:10-12` sets `testpaths = ["tests"]` and `pythonpath = ["."]`.

**Target State** (design.md Harness Decisions):

- `pytest-playwright` is a dev-only dependency. The suite opens `wizard/wizard.html` over `file://` in headless Chromium.

**Implementation**:

```toml
# pyproject.toml:8, replace:
dev = ["pytest"]

# With:
dev = ["pytest", "pytest-playwright"]
```

```python
# tests/conftest.py (new)
from pathlib import Path

import pytest


@pytest.fixture
def wizard_url():
    return (Path(__file__).resolve().parents[1] / "wizard" / "wizard.html").as_uri()
```

```python
# tests/test_wizard.py (new) - harness smoke test on existing behavior
from playwright.sync_api import expect


def test_wizard_opens_on_sleep_with_later_questions_hidden(page, wizard_url):
    page.goto(wizard_url)
    expect(page.locator('[data-question="sleep"]')).to_be_visible()
    expect(page.locator('[data-question="soreness"]')).to_be_hidden()
```

**Rationale**: `wizard.html:21` loads `wizard.js` by relative `src`, so `file://` needs no server (design.md "Why This Approach"). A conftest fixture keeps the browser plumbing out of the tests.
**Pattern Reference**: `pyproject.toml:7-8` (single dev extra); the test naming follows `tests/test_store.py:8`.

#### 2. Rides window constant

**File**: `rides/store.py`

**Current State** (from research.md):

- `WINDOW_DAYS = 27` (`rides/store.py:4`). `list_rides` computes `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` and keeps `cutoff <= date <= today` (`rides/store.py:9-10`). On Oct 28 the cutoff is Oct 2.

**Target State** (design.md M1):

- Today plus the 27 prior days. On Oct 28 the cutoff is Oct 1.

**Implementation**:

```python
# At rides/store.py:4, replace:
WINDOW_DAYS = 27

# With:
WINDOW_DAYS = 28
```

Lines 9-10 stay unchanged. Do not drop the `- 1` (design.md Rejected Alternatives).

**Rationale**: the constant already carries the "window length, inclusive of today" meaning, so only its value changes.
**Pattern Reference**: `rides/store.py:18-19` (`load_series` uses the same `N - 1` closed-range idiom).

#### 3. Wizard focus

**File**: `wizard/wizard.js`

**Current State** (from research.md):

- The click handler stores the answer, hides the current question, and unhides the next (`wizard/wizard.js:7-14`). Nothing calls `focus()`.

**Target State** (design.md M2):

- After the unhide, focus is on the revealed question's first answer button.

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

**Rationale**: the `if (next)` block is the only place a question becomes visible. The focus call must come after `hidden` is cleared. Buttons are natively focusable, so no `tabindex` is needed (design.md Architecture).
**Pattern Reference**: `wizard/wizard.js:6` selects answers per question with `question.querySelectorAll("button")`. The new line uses the same selector, with `querySelector` to get the first answer.

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Harness Tasks

- Add the pytest-playwright harness for the wizard browser DOM boundary → `[beads:phase1_harness_1]`
  - Edit `pyproject.toml:8` as in Change 1.
  - Install into the environment that runs pytest: `python -m pip install -e '.[dev]'`, then `python -m playwright install chromium`.
  - Create `tests/conftest.py` with the `wizard_url` fixture (Change 1).
  - Create `tests/test_wizard.py` with `test_wizard_opens_on_sleep_with_later_questions_hidden` (Change 1).
  - Proof that the harness can fail: temporarily change the soreness expectation to `to_be_visible()`, run `pytest tests/test_wizard.py` and confirm it fails on that assertion, then restore it and confirm it passes headless.
  - Close `work-8ju` with the passing headless run as evidence. If Chromium cannot be installed or run, stop and escalate: the design's fallback is a manual check of AC-3, which is a design-level change.
  - Done when: the smoke test passes headless, `pytest` (full suite) passes, and `work-8ju` is closed.

#### Outer Test Steps

- AC-1: A ride 27 days before today is listed on the rides page, observed at the `render_rides_page` HTML string → `[beads:phase1_outer_1]`
  - Examples: rides `[{"date": date(2026, 10, 1), "km": 10.0}]`, today `date(2026, 10, 28)` → page contains `2026-10-01` and exactly one `<li class="ride">`. Edge: a ride dated 2026-10-28 (today) is also listed.
  - Test file: `tests/test_rides_page.py` (new; module-level `TODAY = date(2026, 10, 28)`)
  - Done when: the test fails on an assertion about the page and the `red(AC-1)` commit exists
- AC-2: A ride 28 days before today is not listed on the rides page, observed at the `render_rides_page` HTML string → `[beads:phase1_outer_2]`
  - Examples: rides `[{"date": date(2026, 9, 30), "km": 10.0}]` → no `2026-09-30`, zero `<li class="ride">`. Edge: rides on 2026-09-30 and 2026-10-01 together → exactly one `<li class="ride">`, and it is 2026-10-01.
  - Test file: `tests/test_rides_page.py`. It follows `phase1_outer_1` to serialize access to that file. This is not a data dependency.
  - The main example passes before the change, and that is expected: it guards the exclusion. The edge example is the red assertion.
  - Done when: the edge test fails on the `li.ride` count and the `red(AC-2)` commit exists
- AC-3: Answering a question moves focus to the next question's first answer, observed at the browser DOM of `wizard/wizard.html` over `file://` → `[beads:phase1_outer_3]`
  - Examples: click Good on Sleep → `[data-question="soreness"]` is visible and `[data-question="soreness"] button[data-value="none"]` is focused. Edge: then click Some on Soreness → `[data-question="mood"]` is visible and `[data-question="mood"] button[data-value="up"]` is focused.
  - Seam: none stubbed. The test uses a real browser and the real `wizard.html` and `wizard.js`, through the `page` and `wizard_url` fixtures.
  - Test file: `tests/test_wizard.py` (created by the harness task)
  - Done when: the test fails on the focus assertion and the `red(AC-3)` commit exists

#### Implementation Tasks

- Set `WINDOW_DAYS` to 28 at `rides/store.py:4` → `[beads:phase1_impl_1]`
  - Serves: AC-1, AC-2
  - Apply Change 2. The cutoff and range at `rides/store.py:9-10` stay unchanged.
  - Inner cases: none beyond the criterion examples
  - Done when: `pytest tests/test_rides_page.py tests/test_store.py` passes
- Focus the revealed question's first answer at `wizard/wizard.js:11-13` → `[beads:phase1_impl_2]`
  - Serves: AC-3
  - Apply Change 3. Add the focus call after `next.hidden = false;` and leave the final-question behavior alone (Out of Scope).
  - Inner cases: none beyond the criterion examples
  - Done when: `pytest tests/test_wizard.py` passes headless

### Success Criteria

#### Automated Verification

Research.md:25 says pytest only. The browser install comes from the harness task.

- [ ] Phase tests pass: `pytest tests/test_rides_page.py tests/test_wizard.py`
- [ ] Full suite passes: `pytest`
- [ ] Each outer test of this phase passes: `pytest tests/test_rides_page.py tests/test_wizard.py -v` shows the AC-1, AC-2 and AC-3 tests passing
- [ ] Lint, type check, build: none configured in this project (`pyproject.toml` has no tooling beyond pytest)

#### Manual Verification

From design.md Success Metrics and Non-Functional Requirements:

- [ ] Open `wizard/wizard.html` in a browser and use only the keyboard (Tab to Good, then Enter). Soreness appears with focus on None. Press Enter again, and Mood appears with focus on Up.
- [ ] The browser test runs headless and offline: `pytest tests/test_wizard.py` makes no network requests and starts no server.
- [ ] No regression on the today page or weekly counts: `tests/test_today_page.py` and `tests/test_load_series.py` pass unchanged.

### 📝 Modified Files

#### Code Files

- `rides/store.py` - Implemented the 28-day inclusive window (`WINDOW_DAYS` 27 → 28)
- `wizard/wizard.js` - Added a focus call on the revealed question's first answer, after the unhide
- `pyproject.toml` - Added `pytest-playwright` to the dev extra

#### Test Files

- `tests/conftest.py` - `wizard_url` fixture (new)
- `tests/test_wizard.py` - Harness smoke test and the AC-3 outer tests (new)
- `tests/test_rides_page.py` - Outer tests for AC-1 and AC-2 (new)

**Quick test command for this phase**:

```bash
pytest tests/test_rides_page.py tests/test_wizard.py
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before closing out:

1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`)
2. ✅ Phase 1 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show work-db8.1` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Implementation Discoveries

Things to determine during implementation:

- Which Python environment to install `pytest-playwright` into. The repo has no venv, and `pytest` on PATH uses the mise Python 3.13.
- Whether `pip install -e '.[dev]'` works without a `[build-system]` table. Setuptools auto-discovery should find only `rides/`. If it fails, `python -m pip install pytest-playwright` is the equivalent install.
- Whether the cached Chromium builds in `~/Library/Caches/ms-playwright/` match the revision the installed `playwright` expects. If they don't, `playwright install chromium` downloads one.
- Whether pytest-playwright writes artifacts (for example `test-results/`) on failure in this setup. If it does, record it here. Changing `.gitignore` is not in the design.

Note: Update this section with findings as you implement.

Findings (2026-10-18):

- Environment: the mise Python 3.13 (`python3`, and `pytest` on PATH) already had `playwright` 1.64.0 and `pytest-playwright` 0.10.0 installed. `python3 -m playwright install chromium` exited 0 using the cached builds.
- `pip install -e '.[dev]'` fails: "Multiple top-level packages discovered in a flat-layout: ['rides', 'wizard']". The fallback, `python -m pip install pytest-playwright`, worked. `pyproject.toml` was not changed beyond the dev extra.
- pytest-playwright wrote no artifacts on failure in this setup: no `test-results/`. It writes them only with `--screenshot`, `--video`, `--tracing` or `--output`.

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

- Assumption `work-8ju` (headless Chromium runs and `file://` executes `wizard.js`) is blocked by the harness task and is closed by it.
- [2026-10-18] Phase 1 tasks done (inline). All six tasks and `work-8ju` are closed. The milestone `work-db8.1` stays open until a human confirms the manual checks.
  - Integrity findings: 0 (0 escalated).
  - The test review proposed one Rewrite: `tests/test_rides_page.py:16-20`, `test_omits_a_ride_from_28_days_ago`. Its only assertions are negative, so it also passes on an empty page. The AC-2 edge test supplies the positive anchor. This is for a human to decide, and no test was changed.
  - No deviations from the plan, apart from the editable-install fallback recorded under Implementation Discoveries.

---

## 🔗 Quick Reference

### Key Files

- **Research**: [research.md](research.md) - Current state documentation
- **Design**: [design.md](design.md) - Target state specification
- **Main Entry**: `rides/views.py` (`render_rides_page`), `wizard/wizard.html`
- **Config**: `pyproject.toml`

### Common Commands

```bash
pytest                                                  # full suite
pytest tests/test_rides_page.py tests/test_wizard.py   # phase tests
python -m pip install -e '.[dev]' && python -m playwright install chromium   # harness setup
```

### Design Decisions Reference

Quick lookup of key design decisions:

- Window: `WINDOW_DAYS = 28` with the inclusive cutoff `today - (WINDOW_DAYS - 1)`. `load_series` stays independent.
- Focus: first answer button of the revealed question, focused after unhide. Behavior after the final question is out of scope.
- Harness: pytest-playwright as a dev-only dependency, with `wizard.html` loaded over `file://` and no server.

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: work-db8

**Phase Milestones**:

- Phase 1: work-db8.1 (all Phase 1 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Dependency graph** (edges follow consumed outputs):

```
work-db8.2 harness ──► work-db8.5 red(AC-3) ──► work-db8.7 wizard focus
        └────────────► work-8ju (assumption)
work-db8.3 red(AC-1) ──► work-db8.4 red(AC-2) ──► work-db8.6 WINDOW_DAYS
        └──────────────────────────────────────────┘
(all six ──► work-db8.1 Phase 1 milestone)
```

The `work-db8.3 → work-db8.4` edge serializes access to `tests/test_rides_page.py` and is not a data dependency.

**Essential Commands**:

- `bd ready` - See what's ready to work on (no blockers)
- `bd show [id]` - View task details and dependencies
- `bd update [id] --claim` - Claim a task
- `bd close [id]` - Complete a task
- `bd blocked` - See what's currently blocked
- `bd list --status=in_progress` - See your active work

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.
