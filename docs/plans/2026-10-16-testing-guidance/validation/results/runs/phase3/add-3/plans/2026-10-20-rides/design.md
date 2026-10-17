---
project: rides
ticket: null
created: 2026-10-20
status: approved
last_updated: 2026-10-17
depends_on: research.md
design_approach: Minimal in-place fix (window constant + focus on reveal) with a pytest-playwright wizard harness
---

# Design: Rides Window and Check-in Focus

## Problem Statement

README Goal: "The rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered."

The problem as researched is what the Goal describes, so the Goal does not change. There are two independent defects:

1. **The rides window is one day short.**
   - `list_rides` keeps rides in `[today - (WINDOW_DAYS - 1), today]` with `WINDOW_DAYS = 27` (`rides/store.py:4`, `:9-10`). That covers 27 calendar days, not 28.
   - With today = 2026-10-28 the cutoff is Oct 2. A ride on Oct 1 (27 days back) is therefore missing from the rides page (research, "Rides window" worked case).
   - The weekly series in `load_series` already covers today−27 through today, which is 28 days (`rides/store.py:14-21`). The page and the series disagree.
   - If not fixed, the page keeps hiding the oldest day of the window and stays out of step with the series.
2. **The wizard loses keyboard focus.**
   - When an answer button is clicked, the handler hides the fieldset containing it and unhides the next one (`wizard/wizard.js:7-14`).
   - Nothing moves focus (research: no `focus()`, `tabindex`, `autofocus` or `scrollIntoView` anywhere). The focused button disappears and the browser drops focus to the document.
   - If not fixed, a keyboard user has to tab back in from the top of the page after every answer.

Neither defect has a test today. No test sits on the window boundary, and the wizard has no harness (research, Testing Conventions).

### Success Metrics

- **M1**: With `today = 2026-10-28`, the HTML returned by `render_rides_page` contains a ride dated 2026-10-01 (27 days back) and does not contain a ride dated 2026-09-30 (28 days back). (refines: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)")
- **M2**: In a real browser with `wizard/wizard.html` loaded, clicking "Good" on Sleep leaves the Soreness fieldset not hidden and makes `document.activeElement` its first button ("None"). The same holds for each later question that has a following one. (refines: "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)")
- Deferred: none

## Design Approach

Fix each defect where it lives, with the smallest change to existing code, and add the browser harness that the wizard criterion needs.

- **Rides window**: change the value of `WINDOW_DAYS` from 27 to 28. Keep the existing `WINDOW_DAYS - 1` inclusive-cutoff arithmetic and the `today` parameter unchanged.
- **Wizard focus**: when the handler reveals the next question, move focus to that question's first answer button. Focus goes in after the reveal, never before.
- **Harness**: Playwright for Python, through the `pytest-playwright` plugin, run by the existing pytest suite. It loads the static `wizard/wizard.html` from disk, and its assertions read the live DOM (`hidden`, `document.activeElement`).

### Why This Approach

- **The rides constant already means "number of days, inclusive".** The `- 1` at `rides/store.py:9` turns a count into an inclusive start date. Setting the count to 28 gives cutoff today−27, which is exactly what M1 needs. All three verification agents found that no other file reads `WINDOW_DAYS` and that `list_rides` has one production caller (`rides/views.py:9`).
- **The reveal point is the only place a question becomes visible** (`wizard/wizard.js:12`, inside `if (next)`). Putting focus there covers every transition, including keyboard activation: Enter or Space on a button fires `click`, so the same handler runs. The handler already scopes its queries to the fieldset (`question.querySelectorAll("button")`, `wizard.js:6`), so "first button of the next fieldset" follows the same idiom.
- **The harness reuses the one test runner the repo has.** The repository is Python-only: pytest and no `package.json` (research, Testing Conventions). `pytest-playwright` keeps a single `python3 -m pytest` command and adds no Node toolchain. The page loads its script by relative path (`wizard.html:21`), so a `file://` URL works without a server.
- **A unit-level proxy would not be enough for M2.** Focus and `hidden` are browser behaviors. A DOM emulator or a check of the source text cannot show that a real browser puts focus on "None".

## Technical Decisions

### Architecture

- **Window length stays one named constant in `rides/store.py`.**
  - Rationale: this is the existing pattern (`rides/store.py:4`, `:9`). Changing the value, not the shape, changes nothing else that reads it.
  - Trade-off: `load_series` keeps its own literals (`4`, `7`, `6`), so the two windows agree by coincidence rather than through shared code. Unifying them is out of scope (see below).
  - Pattern reference: `rides/store.py:9-10`.
- **The rides page keeps getting its list from `list_rides`.** There is no page-level filtering.
  - Rationale: `render_rides_page` already delegates to `list_rides` (`rides/views.py:9`). The fix in the store reaches the page with no view change.
  - Trade-off: none.
  - Pattern reference: `rides/views.py:6-11`.
- **Focus moves inside the existing click handler, right after `next.hidden = false`.**
  - Rationale: this is the single reveal point. A hidden element cannot take focus, so focus must follow the unhide.
  - Trade-off: there is no general "focus manager". None is needed for three questions.
  - Pattern reference: `wizard/wizard.js:10-13`.
- **The last question keeps its current behavior.** After Mood is answered there is no next question, so no focus target exists and nothing new happens.
  - Rationale: both Intent statements are about the *next* question. Defining a completion state would be a new feature, and the user asked for the smallest change.
  - Trade-off: after the final answer, keyboard focus still falls back to the document, as it does today.

### Data Model

- Rides are unchanged: a dict with `date` (`datetime.date`) and `km` (float) (`rides/store.py:1`). Distance storage is untouched (Non-goal).
- Wizard state is unchanged: the module-level `answers` object and the `hidden` attribute on each fieldset. Focus is browser state and nothing new is stored.

### Integration Points

- **`list_rides(rides, today)` contract**: the signature, the newest-first order and the inclusive upper bound at `today` are unchanged. Only the lower bound moves one day earlier, from today−26 to today−27.
- **Existing tests**: tracing all 7 tests by hand under `WINDOW_DAYS = 28` shows no change in outcome. They use today (Oct 28), Oct 20 and Oct 25, and Aug 1, all far from the boundary (integration analysis).
- **Wizard markup contract**: the script keeps depending on `.question` fieldsets in document order. Each holds native `<button type="button">` answers, which are focusable without `tabindex` (`wizard/wizard.html:5-19`). No markup change is needed.
- **New dev dependency**: `pytest-playwright` (which brings in `playwright`) is added to the `dev` extra, next to `pytest` (`pyproject.toml:7-8`). It also needs a one-time Chromium download (`playwright install chromium`), a setup step outside pip.
- **Suite placement**: browser tests live under `tests/`, so the default `python3 -m pytest` run collects them (`pyproject.toml:10-12`). A missing browser makes those tests error. They are not silently skipped, so M2 cannot pass without being checked.

## Scope Definition

### In Scope

- The rides page lists rides from today−27 through today inclusive: 28 days.
- After an answer on a question that has a next question, the next question is shown and its first answer button has keyboard focus.
- A browser test harness for `wizard/` that runs from the existing pytest suite.
- Pytest coverage of the window boundary at the rides page, at both sides of the cutoff.

### Out of Scope

- Changing how distance is stored or formatted (Non-goal: "No change to how distance is stored").
- Any new page, completion screen or summary after the last question (Non-goal: "No new pages"; also not asked by the Intent).
- Making `load_series` read `WINDOW_DAYS`, or otherwise unifying the two window computations. They agree at 28 after this change, and refactoring them is not needed to meet the Intent.
- Focus or announcement behavior after the final question. Screen-reader announcement of the new fieldset's legend is also out.
- `render_today_page` and its inline `== today` filter.
- CI configuration. The repository has none (research, Testing Conventions).

## Success Criteria

### Acceptance Criteria

- **AC-1 A ride 27 days before today is listed on the rides page**
  - Given today is 2026-10-28 and the rides are `[{"date": 2026-10-01, "km": 10.0}]`
  - When the rides page is rendered with `render_rides_page(rides, today)`
  - Then the page HTML contains a ride item for 2026-10-01
  - Example: ride on 2026-10-01, 10.0 km → page contains `<li class="ride">2026-10-01 - 10.0 km</li>` (before this change it was absent)
  - Example (edge): ride on 2026-10-28 (today, 0 days back) → still listed
  - Observed at: HTML string returned by `render_rides_page`
  - Refines: M1
- **AC-2 A ride 28 days before today is not listed on the rides page**
  - Given today is 2026-10-28 and the rides are `[{"date": 2026-09-30, "km": 10.0}]`
  - When the rides page is rendered with `render_rides_page(rides, today)`
  - Then the page HTML contains no ride item for 2026-09-30
  - Example: ride on 2026-09-30 → page contains no `2026-09-30`, and its `<ul>` is empty
  - Example (edge): rides on 2026-10-01 and 2026-09-30 together → only 2026-10-01 appears
  - Observed at: HTML string returned by `render_rides_page`
  - Refines: M1
- **AC-3 Answering a question reveals the next one and focuses its first answer**
  - Given `wizard/wizard.html` is loaded in a real browser, with Sleep visible and Soreness and Mood hidden
  - When the user clicks "Good" on Sleep
  - Then the Soreness fieldset is not hidden, the Sleep fieldset is hidden, and `document.activeElement` is the Soreness "None" button
  - Example: click Good (Sleep) → Soreness visible and focus on "None" (`data-value="none"`)
  - Example (edge): after that, click "Some" on Soreness → Mood visible and focus on "Up" (`data-value="up"`)
  - Observed at: live DOM of the rendered page in a headless browser (`hidden` property, `document.activeElement`)
  - Seam: none. The real page, its script and a real browser engine (Chromium via Playwright) run unstubbed, from a `file://` URL.
  - Refines: M2

### Harness Decisions

| Boundary | Harness present? | Decision |
|----------|------------------|----------|
| Rendered rides page HTML (`render_rides_page` return value) | Yes: pytest calls page builders directly and asserts on the string (`tests/test_today_page.py:6-8`) | Use as is |
| Wizard UI in a browser (DOM visibility and keyboard focus) | None: no browser, DOM or JS harness, no `package.json` (research, Testing Conventions) | Add harness: `pytest-playwright` driving headless Chromium against `wizard/wizard.html`, collected by the default pytest run |

### Non-Functional Requirements

- Performance: the default `python3 -m pytest -q` run, browser tests included, finishes in under 30 seconds locally. The current suite runs in 0.01s, and the budget is for browser launch.
- Reliability: browser tests wait on DOM state and contain no fixed sleeps. Three consecutive local runs pass with no flake.
- Security: no new network access at test time. The wizard page loads from disk; the only network access is the one-time Chromium download at setup.

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| ------ | -------- | ------------ | ------------ |
| Chromium cannot be installed or launched in a developer environment, so AC-3 cannot run | High | Low | Tracked as an assumption (`tmp_D2hvewKJsz-zya`). If it fails, AC-3 is demoted to a documented manual check and this harness decision is revisited |
| Browser tests error in a plain `pytest` run for anyone who has not installed Chromium | Med | Med | Intended: errors are louder than silent skips. The setup step is documented next to the dev dependency |
| Focus is called before the fieldset is unhidden and silently does nothing | Med | Low | Ordering is fixed by design (focus after reveal). AC-3 observes `document.activeElement` in a real browser, so the error would fail the test |
| Future changes to the window move `list_rides` and `load_series` apart again | Low | Low | Out of scope. AC-1 and AC-2 pin the page boundary; `load_series` keeps its own test |
| Off-by-one goes the wrong way (cutoff today−28) | Med | Low | AC-2 pins the excluded side at Sep 30 and AC-1 pins the included side at Oct 1 |

### Assumptions

Research left no knowledge gaps. The one assumption comes from the harness decision:

| Assumption | Beads ID | Validated? |
|------------|----------|------------|
| Playwright's Chromium can be installed and launched headless in the dev environment (macOS, Python 3.13) | `tmp_D2hvewKJsz-zya` | Pending |

## Rejected Alternatives

### Option: Drop the `- 1` and keep `WINDOW_DAYS = 27`

- **Approach**: compute `cutoff = today - timedelta(days=WINDOW_DAYS)`.
- **Rejected because**: the constant would stop meaning the number of days shown. A value of 27 producing 28 days misleads readers, and the existing idiom is a count followed by `- 1`.
- **Trade-offs**: the same behavior and the same size of change, but worse naming.

### Option: Share one window constant between `list_rides` and `load_series`

- **Approach**: derive `load_series`' four 7-day weeks from `WINDOW_DAYS`, or the reverse.
- **Rejected because**: it is not needed to meet either Intent statement, and it changes code that already behaves correctly. The user asked for the smallest change.
- **Trade-offs**: it would keep the two windows consistent by construction, at the cost of a wider change and a new coupling.

### Option: jsdom/Jest (Node) harness for the wizard

- **Approach**: add `package.json` with Jest and jsdom, and test focus in an emulated DOM.
- **Rejected because**: it brings in a second toolchain and test command in a Python-only repo. Its focus and `hidden` handling are an emulation, not a real browser, which is a weaker check of M2.
- **Trade-offs**: faster runs and no browser download, but a weaker fidelity at the very boundary M2 is about.

### Option: Selenium for the wizard

- **Approach**: drive a browser with Selenium from pytest.
- **Rejected because**: it needs a separately managed browser driver and has no first-party pytest integration. Playwright bundles a pinned browser and auto-waits on DOM state, which serves the reliability requirement.
- **Trade-offs**: wider browser coverage in exchange for more setup and more flake surface.

### Option: Manual check only for AC-3

- **Approach**: leave the wizard untested and verify focus by hand.
- **Rejected because**: the user chose "add harness". A manual check also does nothing to stop a future regression.
- **Trade-offs**: no new dependency, but no automated guard.

## Pending Decisions

None. The approach, metrics, acceptance criteria and harness decision are settled. No open `Q:` issues block design.

## References

- Research: [research.md](research.md)
- Related designs: none
- External docs: Playwright for Python and the `pytest-playwright` plugin
