---
project: rides
ticket: null
created: 2026-10-20
status: draft
last_updated: 2026-10-17
depends_on: research.md
design_approach: Widen the window constant and focus the next question's first answer
---

# Design: Rides Window and Check-in Focus

## Problem Statement

The README Goal: "The rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered."

Two separate defects stand between the code and that Goal:

1. **The rides page window is one day short.** `list_rides` keeps rides with `cutoff <= date <= today` where `cutoff = today - (WINDOW_DAYS - 1)` and `WINDOW_DAYS = 27` (`rides/store.py:4,9-10`). The page therefore shows 27 calendar days, not 28: with `today` = 2026-10-28, a ride on 2026-10-01 (27 days back) is dropped. `render_rides_page` is the only non-test caller (`rides/views.py:9`), so the page inherits the short window directly.
2. **The wizard drops keyboard focus on every answer.** The click handler hides the fieldset that contains the clicked (focused) button, then unhides the next fieldset, and never calls `focus()` (`wizard/wizard.js:7-14`). The browser blurs the now-hidden button and focus falls to `document.body`, so a keyboard user has to tab back into the form after every answer.

If neither is fixed, riders miss a day of history on the rides page, and the check-in wizard cannot be completed from the keyboard without re-finding the next question each time. Both are small and independent; neither changes data storage or adds pages (README Non-goals).

### Success Metrics

- **M1**: For `today` = 2026-10-28, the rendered rides page contains a ride dated 2026-10-01 (27 days back) and does not contain a ride dated 2026-09-30 (28 days back); the full listed span is 28 calendar days, today included. (refines: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)")
- **M2**: In a real browser, after activating an answer on a question that has a following question, the following question's fieldset is visible and `document.activeElement` is that fieldset's first answer button (Good on Sleep → Soreness visible, focus on None; None or Some on Soreness → Mood visible, focus on Up). (refines: "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)")
- Deferred: none

## Design Approach

Make the smallest change that satisfies each Intent statement, and pin each with a test at the boundary the user sees.

- **Rides window**: change the window length from 27 to 28 days by changing the existing `WINDOW_DAYS` constant. The inclusive cutoff formula (`WINDOW_DAYS - 1` back, both ends inclusive) already expresses "N days including today"; only N is wrong.
- **Wizard focus**: when an answer reveals the next question, move keyboard focus to that question's first answer button, after the question is made visible.
- **Wizard test harness**: add a browser test harness driven from pytest (Playwright for Python, headless Chromium) that loads `wizard/wizard.html` from disk and observes visibility and `document.activeElement`. This keeps one test runner and one language for the whole suite.

### Why This Approach

- The research shows the window bug is purely the constant's value: the formula and the inclusive-both-ends idiom are shared with `load_series` (`rides/store.py:9-10`, `rides/store.py:19-20`) and are correct. Changing N keeps the existing pattern intact.
- `WINDOW_DAYS` has exactly one reader (`rides/store.py:9`) and `list_rides` has one production caller (`rides/views.py:9`), so the blast radius is the rides page alone. Integration analysis found no existing test whose result changes at 28 days (the test dates are 2026-10-28, 2026-10-25, 2026-10-20 and 2026-08-01).
- The wizard already advances by unhiding the next fieldset in DOM order (`wizard/wizard.js:9-13`); moving focus at the same point follows that flow and needs no new state, attributes, or markup.
- A browser harness is the only way to observe keyboard focus: focus is a property of a live document, and research found nothing in the repository that can observe it (`research.md`, Testing Conventions). Driving the browser from pytest keeps `pytest` as the single command (`pyproject.toml:10-12`) instead of adding a Node toolchain.
- Precedent from the verification agents: no prior change history exists (single `base` commit), so the code's own conventions are the precedent: the inclusive N-day idiom, `UPPER_SNAKE` module constants, flat `tests/test_<thing>.py` files with `TODAY = date(2026, 10, 28)` and inline ride literals.

## Technical Decisions

### Architecture

- **The window length stays a single named constant in `rides/store.py`, value 28.**
  - Rationale: the constant is the only thing wrong; the formula already reads "N days including today".
  - Trade-off: `load_series` still hard-codes its own four 7-day buckets; the two now agree at 28 days, but by coincidence, not by shared code.
  - Pattern reference: `rides/store.py:4`, `rides/store.py:9-10`
- **The rides fix is verified at the rendered page, not only at `list_rides`.**
  - Rationale: the Intent statement is about the rides page; `render_rides_page` has no test today, and checking its HTML catches a regression in either the store or the view.
  - Trade-off: substring checks on HTML are coarser than comparing lists; acceptable because the page renders each ride's ISO date verbatim (`rides/views.py:8`).
  - Pattern reference: `tests/test_today_page.py:6-8` (substring check on returned HTML)
- **Focus moves to the next question's first answer button, after that question is unhidden.**
  - Rationale: a `hidden` element cannot take focus, so the order matters; the first button in each fieldset is the first focusable child (the `<legend>` is not focusable, `wizard/wizard.html:5-19`).
  - Trade-off: focus lands on an answer, not on the question label; screen-reader announcement of the new question relies on the fieldset/legend grouping the browser already exposes. No `aria-live` or `tabindex` is added.
  - Pattern reference: `wizard/wizard.js:10-13`
- **Wizard tests run in a real headless browser driven by pytest (Playwright for Python).**
  - Rationale: keyboard focus and `hidden` rendering are only observable in a browser engine; Python-driven keeps one runner.
  - Trade-off: adds a dev dependency and a browser binary download to the dev setup; the wizard tests are slower than the unit tests.
  - Pattern reference: `pyproject.toml:7-12` (dev extra and pytest config the harness joins)

### Data Model

- No change. A ride remains a dict with `date` and `km` (`rides/store.py:1`); distance storage is untouched (Non-goal).
- Wizard state is unchanged: `answers` stays a module-local object keyed by `data-question` (`wizard/wizard.js:3,8`).

### Integration Points

- `list_rides(rides, today)` keeps its signature, its inclusive bounds, and its newest-first ordering (`rides/store.py:7-11`).
- `render_rides_page(rides, today)` keeps its output shape: `<h1>Rides</h1><ul>` of `<li class="ride">YYYY-MM-DD - N km</li>` (`rides/views.py:6-11`); only the number of items can change.
- Wizard DOM contract is unchanged: `fieldset.question[data-question]`, `button[data-value]`, visibility through the `hidden` property, script loaded at the end of `<body>` (`wizard/wizard.html:4-21`).
- New dev-only dependency: Playwright for Python and its Chromium browser, joining `pytest` in the `dev` extra. No runtime dependency changes.

## Scope Definition

### In Scope

- Rides page lists 28 calendar days inclusive of `today`
- Wizard moves keyboard focus to the first answer of the newly revealed question
- A browser test harness for the wizard, run by `pytest`
- Tests pinning both changed behaviors at their user-facing boundary

### Out of Scope

- Focus behavior after the last question (Mood) is answered: the Intent statement covers advancing to a *next* question only, and no completion step exists to receive focus (`wizard/wizard.js:10-13`, `research.md` step 6). Leaving it unchanged means focus falls to `document.body` as today.
- Deriving `load_series` buckets from `WINDOW_DAYS`, or naming its literals: not needed for either Intent statement
- Submitting or using the recorded `answers`
- Any ARIA additions (`aria-live`, `tabindex`) to the wizard
- How distance is stored (Non-goal), and any new pages (Non-goal)
- HTML escaping in the page builders

## Success Criteria

### Acceptance Criteria

- **AC-1 Rides page lists the 28-day window inclusive of today**
  - Given rides dated 2026-10-01 and 2026-09-30, and `today` = 2026-10-28
  - When the rides page is rendered
  - Then the page lists the 2026-10-01 ride and does not list the 2026-09-30 ride
  - Example: rides `[{date: 2026-10-01, km: 12.0}, {date: 2026-09-30, km: 8.0}]`, `today` 2026-10-28 → page contains `2026-10-01 - 12.0 km` and does not contain `2026-09-30`
  - Example (edge): a ride dated `today` (2026-10-28) is still listed alongside the 2026-10-01 ride, newest first
  - Observed at: HTML string returned by `render_rides_page`
  - Refines: M1

- **AC-2 Answering a question reveals the next one and focuses its first answer**
  - Given the check-in wizard loaded in a browser, with Sleep visible and Soreness and Mood hidden
  - When the Good button on Sleep is activated
  - Then Soreness is visible, Sleep is hidden, and the focused element is Soreness's None button
  - Example: activate Good on Sleep → Soreness visible, `document.activeElement` is the button with `data-value="none"`
  - Example (edge): then activate Some on Soreness (the second answer, not the first) → Mood visible, `document.activeElement` is the button with `data-value="up"`
  - Observed at: the rendered wizard page in a headless browser (element visibility and `document.activeElement`)
  - Seam: none stubbed; the real `wizard.html` and `wizard.js` load from disk in a real browser engine
  - Refines: M2

### Harness Decisions

| Boundary | Harness present? | Decision |
|----------|------------------|----------|
| Rendered rides page HTML (`render_rides_page` return value) | Yes: pytest unit tests calling functions directly and substring-checking HTML (`tests/test_today_page.py:6-8`) | Use as is |
| Browser DOM: wizard visibility and keyboard focus | None: no `package.json`, Jest, Vitest, Playwright, or Selenium config (`research.md`, Testing Conventions) | Add harness: Playwright for Python with headless Chromium, run under `pytest`, loading `wizard/wizard.html` from disk |

### Non-Functional Requirements

- [ ] Performance: the default `pytest` run (unit plus wizard browser tests) completes in under 30 seconds on a developer machine once the browser is installed
- [ ] Reliability: wizard tests wait on element state (visibility, focus), not fixed sleeps, and pass on 10 consecutive runs
- [ ] Security: no change; the wizard harness loads only local files and makes no network requests

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| ------ | -------- | ------------ | ------------ |
| Focus is set before the next fieldset is visible and silently does nothing | High | Med | AC-2 asserts `document.activeElement` in a real browser, which fails if the order is wrong |
| Browser binary not installable in some environments (CI, sandbox) | Med | Low | Tracked as an assumption (below); the unit tests stay runnable with `pytest` alone if the wizard tests are selected out |
| `load_series` and the rides window drift apart again later | Low | Low | Out of scope; recorded here so a later change sees that the two are not linked in code |
| A boundary regression goes unnoticed because existing tests never sat on the cutoff | Med | Med | AC-1 pins both sides of the boundary (27 and 28 days back) |

### Assumptions

| Assumption | Beads ID | Validated? |
|------------|----------|------------|
| Playwright for Python with a headless Chromium can be installed and run under pytest in this repository's dev environment | `tmp_FmFIiINWRq-8t9` | Pending |

## Rejected Alternatives

### Option: Change the cutoff formula instead of the constant

- **Approach**: keep `WINDOW_DAYS = 27` and compute `cutoff = today - timedelta(days=WINDOW_DAYS)`.
- **Rejected because**: the constant would then mean "days before today" rather than "days shown", breaking the inclusive N-day idiom shared with `load_series` (`rides/store.py:19-20`) and leaving a misleading 27 next to a 28-day window.
- **Trade-offs**: same behavior; worse readability.

### Option: Share one window constant between `list_rides` and `load_series`

- **Approach**: derive `load_series`'s four 7-day buckets from `WINDOW_DAYS`.
- **Rejected because**: neither Intent statement needs it, and it changes a second function with thin test coverage (`tests/test_load_series.py` asserts only index `[0]`).
- **Trade-offs**: would prevent future drift; costs scope and risk now.

### Option: Node-based harness (jsdom with Jest or Vitest)

- **Approach**: add `package.json` and test the wizard in jsdom.
- **Rejected because**: adds a second toolchain and test command to a pytest-only repo, and jsdom only approximates rendering, so focus on a `hidden` element is not a faithful check.
- **Trade-offs**: faster tests; less faithful focus behavior and two runners.

### Option: Manual check for wizard focus

- **Approach**: verify AC-2 by hand in a browser.
- **Rejected because**: the harness decision for this criterion is to add a browser harness; a manual check leaves the focus behavior unpinned against regression.
- **Trade-offs**: no new dependency; no automated guard.

### Option: Focus the next question's fieldset or legend

- **Approach**: make the fieldset focusable with `tabindex="-1"` and focus it.
- **Rejected because**: the Intent statement names the first answer as the focus target ("focus is on None").
- **Trade-offs**: would announce the question label first; one extra keypress per question.

## Pending Decisions

Design decisions that need stakeholder input - track in beads:

| Decision Needed | Beads ID | Blocks |
|-----------------|----------|--------|
| None | - | - |

## References

- Research: [research.md](research.md)
- Intent: [README.md](README.md)
- Related designs: none
