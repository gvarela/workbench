---
project: rides
ticket: null
created: 2026-10-20
status: draft
last_updated: 2026-10-18
depends_on: research.md
design_approach: Correct the window constant; focus the revealed question
---

# Design: Rides Window and Check-in Focus

## Problem Statement

README Goal: "The rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered."

Two small behaviors fall short of that Goal:

1. **Rides window is one day short.** `WINDOW_DAYS = 27` and the cutoff `today - (WINDOW_DAYS - 1)` list today plus 26 prior days (`rides/store.py:4-10`). On Oct 28 the cutoff is Oct 2, so a ride on Oct 1 is missing from the rides page, even though the Goal says it should be listed.
2. **Wizard drops keyboard focus.** Answering a question hides its fieldset, which holds the focused button, and unhides the next one. Nothing places focus there (`wizard/wizard.js:6-16`, and there is no `focus()` anywhere in `wizard/`). A keyboard user is left with focus on a hidden element and has to tab around to find the next question.

If these stay unfixed, the rides page keeps under-reporting recent riding by one day, and the check-in stays awkward without a mouse.

### Success Metrics

- **M1**: On Oct 28, the rides page lists 28 calendar days of rides, Oct 1 through Oct 28 inclusive. A ride dated 27 days before today appears and one dated 28 days before today does not. (refines: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)")
- **M2**: In a real browser, answering a non-final check-in question leaves the next question visible and `document.activeElement` on that question's first answer button. (refines: "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)")
- Deferred: none

## Design Approach

This is the smallest change that meets both success statements:

- **Rides**: change the meaning-carrying constant `WINDOW_DAYS` from 27 to 28 and keep the existing inclusive cutoff formula (`today - (WINDOW_DAYS - 1)`, closed range `cutoff <= date <= today`). After the change the constant reads as "28-day window, inclusive of today", which is exactly the Goal's wording.
- **Wizard**: in the existing click handler, after the next question is unhidden, move focus to that question's first answer button. Focus must move after the `hidden` attribute is cleared, because focusing an element inside a hidden fieldset does nothing.
- **Harness**: add a browser test harness, pytest with Playwright, that opens `wizard/wizard.html` from disk. Today no automated test can observe focus.

### Why This Approach

- **One-line semantic fix, no new concepts.** `WINDOW_DAYS` is read only at `rides/store.py:9`, and `list_rides` has one production caller (`rides/views.py:9`). No test pins the current boundary, so nothing else moves.
- **Follows the existing inclusive convention.** The `days - 1` with a closed range is the same idiom `load_series` uses for its 7-day buckets (`rides/store.py:18-19`).
- **The focus fix lives where the reveal happens.** The `if (next)` block at `wizard/wizard.js:10-12` is the single place a question becomes visible. Buttons are natively focusable, so no `tabindex` is needed.
- **A browser is the only place focus is observable.** pytest alone cannot run `wizard.js`. The page loads its script by relative `src` with no server or build (`wizard/wizard.html:21`), so a `file://` load in Playwright is enough. Python Playwright keeps the suite on a single runner (pytest).

## Technical Decisions

### Architecture

- **The window length stays a single named constant in `rides/store.py`.**
  - Rationale: the constant already owns this meaning. Changing its value keeps one source of truth.
  - Trade-off: `load_series` keeps its own hard-coded four-week literals. They also happen to span 28 days but stay independent, which is deliberate: unifying them is out of scope.
  - Pattern reference: `rides/store.py:4`, `rides/store.py:9-10`
- **Focus moves to the first answer button of the newly revealed question.**
  - Rationale: this matches the success example (Good on Sleep → focus on None) and keeps document order as the definition of "first answer".
  - Trade-off: there is no focus target after the final question (Mood). That is unspecified today and stays unspecified here (see Out of Scope).
  - Pattern reference: `wizard/wizard.js:10-12`, `wizard/wizard.html:10-13`
- **Browser harness: pytest-playwright as a dev-only dependency.**
  - Rationale: this is the user's harness decision ("add harness"). It reuses pytest discovery (`pyproject.toml:10-12`) and needs no Node toolchain.
  - Trade-off: it adds a heavyweight dev dependency and a separate browser-install step that `pyproject.toml` cannot express. Developers and CI need Chromium available.

### Data Model

- No change. A ride remains a dict with `date` and `km` (`rides/store.py:1`). Distance storage and formatting are untouched (Non-goal).
- The wizard's `answers` object and the `data-question` / `data-value` attributes are unchanged.

### Integration Points

- `list_rides(rides, today)`: the signature, the newest-first ordering and the identity of returned dicts are all preserved (`rides/store.py:7-11`, `tests/test_store.py:10,21`).
- `render_rides_page(rides, today)` HTML shape is unchanged: one `<li class="ride">` per ride (`rides/views.py:6-11`).
- `render_today_page` and `load_series` do not read the window and are unaffected.
- Wizard DOM contract is unchanged: `.question` fieldsets in document order, `button[data-value]` answers, later questions start `hidden`.
- `pyproject.toml` dev extra gains the browser-test dependency. The pytest config otherwise stays as is.

## Scope Definition

### In Scope

- The rides page listing window becomes today plus the 27 prior days (28 days inclusive).
- After answering a non-final wizard question, focus lands on the first answer of the revealed question.
- A browser test harness capable of loading the wizard page and observing visibility and focus.

### Out of Scope

- Focus behavior after the final question (Mood). No success statement covers it. Today focus falls to a hidden element, browser-defined.
- Aligning `load_series` with `WINDOW_DAYS`.
- Any change to distance storage or `format_distance` (Non-goal: "No change to how distance is stored").
- New pages or a dev server for the wizard (Non-goal: "No new pages").
- Accessibility work beyond focus placement (ARIA live regions, announcements).

## Success Criteria

### Acceptance Criteria

- **AC-1 A ride 27 days before today is listed on the rides page**
  - Given today is 2026-10-28 and a ride dated 2026-10-01 (27 days before)
  - When the rides page is rendered
  - Then the page contains that ride's `<li class="ride">` entry
  - Example: rides `[{"date": 2026-10-01, "km": 10.0}]`, today 2026-10-28 → page contains `2026-10-01`, one `li.ride`
  - Example (edge): a ride dated 2026-10-28 (today) is also listed
  - Observed at: `render_rides_page` HTML string
  - Refines: M1

- **AC-2 A ride 28 days before today is not listed on the rides page**
  - Given today is 2026-10-28 and a ride dated 2026-09-30 (28 days before)
  - When the rides page is rendered
  - Then the page contains no `<li class="ride">` entry for it
  - Example: rides `[{"date": 2026-09-30, "km": 10.0}]`, today 2026-10-28 → no `2026-09-30`, zero `li.ride`
  - Example (edge): with rides on 2026-09-30 and 2026-10-01 together, exactly one `li.ride` (2026-10-01) is shown
  - Observed at: `render_rides_page` HTML string
  - Refines: M1

- **AC-3 Answering a question moves focus to the next question's first answer**
  - Given the check-in wizard is freshly loaded in a browser, showing Sleep
  - When the user activates "Good" on Sleep
  - Then the Soreness question is visible and the focused element is its "None" button
  - Example: click `Good` (Sleep) → Soreness fieldset visible, `document.activeElement` is the button with `data-value="none"`
  - Example (edge): then activate "Some" on Soreness → Mood is visible and focus is on "Up"
  - Observed at: browser DOM (visibility and `document.activeElement`) of `wizard/wizard.html` loaded over `file://`
  - Seam: none stubbed. Real browser, real `wizard.html` and `wizard.js`.
  - Refines: M2

### Harness Decisions

| Boundary | Harness present? | Decision |
|----------|------------------|----------|
| Rendered rides page HTML (`render_rides_page`) | pytest (`pyproject.toml:8-12`, `tests/`) | Use as is |
| Browser DOM: wizard visibility and focus | none (research: no Playwright or Selenium, no wizard test) | Add harness: pytest with Playwright, loading `wizard/wizard.html` over `file://` |

### Non-Functional Requirements

- [ ] Performance: no measurable change. The filter stays a single pass over rides.
- [ ] Reliability: the browser test runs headless and offline (no server, no network).
- [ ] Security: none. No new inputs or endpoints.

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| ------ | -------- | ------------ | ------------ |
| Focus is set before the next fieldset is unhidden and silently does nothing | Med | Med | AC-3 asserts `activeElement` in a real browser, which catches the ordering mistake |
| Playwright browser binaries are unavailable in dev or CI | Med | Low | Track as an assumption (`work-8ju`). The fallback is a manual check of AC-3. |
| Someone "fixes" the window by also dropping the `- 1`, giving 29 days | Low | Low | AC-2 pins the 28-days-before exclusion |
| `li.ride` is shared with the today page and confuses page-level assertions | Low | Low | AC-1 and AC-2 observe `render_rides_page` output only |

### Assumptions

| Assumption | Beads ID | Validated? |
|------------|----------|------------|
| A Playwright Chromium can be installed and run headless wherever the suite runs, and `file://` loading of `wizard.html` executes `wizard.js` | `work-8ju` | Pending |

## Rejected Alternatives

### Option: Keep `WINDOW_DAYS = 27`, change the cutoff to `today - WINDOW_DAYS`

- **Approach**: drop the `- 1` so the constant means "days back" instead of "window length".
- **Rejected because**: the constant would read "27" while the Goal says "28 days". It also breaks the inclusive `days - 1` idiom `load_series` shares.
- **Trade-offs**: same behavior and the same one-line diff, but worse readability.

### Option: Derive the window from `load_series` (4 × 7 days)

- **Approach**: share one window definition between listing and weekly counts.
- **Rejected because**: it couples two unrelated features and goes beyond the smallest change. No success statement asks for it.
- **Trade-offs**: one fewer magic number, but more surface changed.

### Option: Lower proxy for focus (unit-test the JS with jsdom, or a manual check)

- **Approach**: observe focus in a simulated DOM, or by hand.
- **Rejected because**: the harness decision was "add harness". jsdom would also bring in a Node toolchain, and its focus and `hidden` semantics are only an approximation of a browser.
- **Trade-offs**: lighter dependencies, but weaker evidence.

## Pending Decisions

None. The approach, metrics, criteria and harness decision were approved in the stage arguments.

## References

- Research: [research.md](research.md)
- Intent: [README.md](README.md)
