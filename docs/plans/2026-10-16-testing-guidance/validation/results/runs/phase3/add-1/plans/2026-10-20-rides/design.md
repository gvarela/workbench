---
project: rides
ticket: null
created: 2026-10-20
status: draft
last_updated: 2026-10-17
depends_on: research.md
design_approach: Minimal in-place fix (window constant + focus in existing handler)
---

# Design: Rides Window and Check-in Focus

## Problem Statement

README Goal: "The rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered."

The problem as researched is the problem the Goal names. There are two independent defects:

1. **Rides window is one date short.** `list_rides` uses `WINDOW_DAYS = 27` with `cutoff = today - (WINDOW_DAYS - 1)` (`rides/store.py:4-10`). The window is therefore 27 dates, today-26 through today. For `today` = 2026-10-28 the page starts at Oct 2, so a ride on Oct 1 (27 days before) is missing. The Goal asks for 28 dates, today-27 through today.
2. **Wizard focus is lost on each answer.** The click handler hides the fieldset that contains the focused button and unhides the next one, but never moves focus (`wizard/wizard.js:7-14`). A keyboard user is dropped to `<body>` after every answer and has to tab back into the form.

If we leave these alone, the rides page keeps undercounting the recent window, and the check-in stays awkward to use by keyboard on every step.

### Success Metrics

- **M1**: With `today` = 2026-10-28, the rendered rides page lists a ride dated 2026-10-01 (today-27) and does not list a ride dated 2026-09-30 (today-28). (refines: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)")
- **M2**: In a real browser, after activating an answer on a question that has a following question, that next fieldset is not hidden and `document.activeElement` is its first answer button. For example, after Good on Sleep, Soreness is visible and the focused element is None. (refines: "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)")
- Deferred: none

## Design Approach

Fix each defect where it lives, using the mechanism already there. Add no new abstractions.

- **Rides**: `WINDOW_DAYS` is a count of dates, because the existing `- 1` in the cutoff turns a count into an inclusive offset. Its value becomes 28. The filter, sort, and `render_rides_page` stay as they are.
- **Wizard**: inside the existing `if (next)` branch, after the next fieldset is unhidden, focus moves to that fieldset's first answer button. Visibility still works only through the `hidden` toggle.
- **Verification**: M2 is about focus in a browser, and the repo has no browser harness. A browser test harness is added that runs under pytest and loads `wizard/wizard.html` from disk.

### Why This Approach

- It is the smallest change that meets both Intent statements. That is one constant value and one focus call in a branch that already exists.
- It keeps the patterns research recorded. Date filters take an explicit `today` with inclusive bounds (`rides/store.py:9-10`), and the wizard advances by toggling `hidden` on sibling fieldsets indexed by position (`wizard/wizard.js:9-13`).
- All three verification agents confirmed that `WINDOW_DAYS` and `list_rides` have no other dependents: `WINDOW_DAYS` is only used at `store.py:9`, the only production caller is `rides/views.py:9`, and no existing test sits on the 27-date edge. So the constant change breaks nothing.
- The integration agent confirmed that keyboard activation of a `<button>` fires `click`. One handler therefore covers taps, clicks, and Enter/Space.

## Technical Decisions

### Architecture

- **The window stays a single module constant meaning "number of dates, inclusive of today".**
  - Rationale: the name and the `- 1` formula already say that. Only the value was wrong. Changing the value instead of the formula keeps the constant's meaning.
  - Trade-off: `load_series` still covers the same 28 dates with its own literals (`4`, `7`, `6`) and does not share the constant. The two spans now agree, but nothing enforces it.
  - Pattern reference: `rides/store.py:4-10`.
- **Focus moves after the unhide, in the same synchronous handler.**
  - Rationale: an element under `hidden` (display: none) cannot take focus, so the next fieldset has to be unhidden first. Nothing is animated or deferred, so no timer is needed.
  - Trade-off: none at this scope.
  - Pattern reference: `wizard/wizard.js:10-13`.
- **"First answer" means the first answer button in document order within the next fieldset.**
  - Rationale: the buttons have no ids or classes, and their order in the markup is the order they are shown in (`wizard/wizard.html:10-19`).
  - Trade-off: reordering the buttons in the markup changes which answer gets focus. That is intended.

### Data Model

- No change. A ride stays `{"date": datetime.date, "km": float}`, and distance storage is untouched (README Non-goal).
- The wizard's `answers` object and its `data-question` / `data-value` identity are unchanged.

### Integration Points

- `render_rides_page(rides, today)` → `list_rides(rides, today)`: the signatures are unchanged. Only the set of returned rides grows, by one date at the old edge.
- `wizard.html` → `wizard.js`: still a classic script tag with no build step. The markup does not change.
- The new browser harness is a dev-only dependency recorded next to pytest in `pyproject.toml`. It opens the page by `file://` URL, so no server is needed.

## Scope Definition

### In Scope

- Rides page window of 28 inclusive dates (today-27 through today).
- Moving focus to the next question's first answer after an answer, for every question that has a next one.
- A browser test harness for the wizard (Playwright for Python, driven from pytest).
- Tests for the rides window edge and the wizard focus behavior.

### Out of Scope

- **Focus after the last question (Mood).** No question follows it, the Intent does not define an end state, and the existing `if (next)` guard leaves this path unchanged.
- **Refactoring `load_series` to use `WINDOW_DAYS`.** Its span already matches. Unifying the two is cleanup that neither Intent statement needs.
- **Any change to how distance is stored or formatted.** This is a README Non-goal.
- **New pages, a completion screen, ARIA attributes, or CSS for the wizard.** "No new pages" is a README Non-goal, and the rest is not needed for the Intent.
- **Testing `render_today_page` or other untested areas beyond the two criteria.**

## Success Criteria

### Acceptance Criteria

- **AC-1 The rides page lists rides from the last 28 dates inclusive**
  - Given a ride list containing rides dated 2026-10-01 and 2026-09-30
  - When the rides page is rendered with `today` = 2026-10-28
  - Then the page lists the 2026-10-01 ride and does not list the 2026-09-30 ride
  - Example: rides on 2026-10-01 (5.0 km) and 2026-09-30 (7.0 km), `today` 2026-10-28 → the HTML contains `2026-10-01 - 5.0 km` and does not contain `2026-09-30`
  - Example (edge): a ride dated `today` (2026-10-28) is still listed, and a ride dated 2026-10-29 (after today) is still not listed
  - Observed at: HTML string returned by `render_rides_page`
  - Refines: M1

- **AC-2 Answering a question moves focus to the next question's first answer**
  - Given the check-in wizard loaded in a browser, with Sleep showing and Soreness and Mood hidden
  - When the user activates an answer on a question that has a next question
  - Then the next question is visible and keyboard focus is on its first answer button
  - Example: click Good on Sleep → Soreness is not hidden and the focused element is the None button
  - Example (edge): then click Some on Soreness → Mood is not hidden and the focused element is the Up button
  - Observed at: browser DOM (`hidden` state of the fieldsets and `document.activeElement`) for `wizard/wizard.html` loaded by `file://`
  - Refines: M2

### Harness Decisions

| Boundary | Harness present? | Decision |
|----------|------------------|----------|
| Rendered HTML string (`render_rides_page`) | pytest with plain `assert` on returned strings (`tests/test_today_page.py:6-8`) | Use as is |
| Browser DOM: focus and visibility in `wizard/wizard.html` | none (no Playwright, jsdom, Selenium, or browser on PATH, per research Testing Conventions) | Add harness: Playwright for Python as a dev dependency, run by the existing `python3 -m pytest -q`, loading the page via `file://` |

### Non-Functional Requirements

- [ ] Performance: no measurable change. The window filter is still one linear pass, and the wizard handler gains one focus call.
- [ ] Reliability: the existing 7 tests still pass, and the suite stays a single `python3 -m pytest -q` command.
- [ ] Security: no new inputs or network access at runtime. The browser harness is dev-only.

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| ------ | -------- | ------------ | ------------ |
| Focus is called before the next fieldset is unhidden and silently does nothing | High | Low | Ordering fixed by design (unhide, then focus). AC-2 observes `document.activeElement` in a real browser, so this would fail the test. |
| The browser binary cannot be installed where tests run, so AC-2 cannot execute | Med | Med | Tracked as assumption `tmp_wwWWuhu4ed-pod`. If it fails, revisit the harness decision before `/create_tasks`. |
| Adding the browser test makes the suite slower or flaky | Low | Low | One page loaded from disk, no server, no timers in the code under test. |
| `list_rides` and `load_series` drift apart again later | Low | Low | Out of scope. Noted under Technical Decisions → Architecture. |

### Assumptions

Based on knowledge gaps from research, tracked in beads:

| Assumption | Beads ID | Validated? |
|------------|----------|------------|
| Playwright for Python and a Chromium build can be installed where the test suite runs | `tmp_wwWWuhu4ed-pod` | Pending |

## Rejected Alternatives

### Option: Change the cutoff formula instead of the constant

- **Approach**: keep `WINDOW_DAYS = 27` and compute `cutoff = today - WINDOW_DAYS`, which makes the constant mean "days back".
- **Rejected because**: the name `WINDOW_DAYS` and the existing `- 1` already express "dates in the window". Changing the formula would change the constant's meaning to fix what is really a wrong value.
- **Trade-offs**: same behavior, but the constant would be less clear.

### Option: Share one window constant between `list_rides` and `load_series`

- **Approach**: derive `load_series`'s four 7-day weeks from `WINDOW_DAYS`, or the reverse.
- **Rejected because**: neither Intent statement needs it, and it would change a function nothing in `rides/` calls. That makes it scope creep beyond the smallest change.
- **Trade-offs**: we would gain enforced agreement between the two spans, and lose a minimal diff.

### Option: Verify wizard focus without a browser (string check on `wizard.js`, or manual check only)

- **Approach**: assert that `wizard.js` contains a `focus()` call, or leave AC-2 to a manual check.
- **Rejected because**: a string check does not observe behavior and passes even when focus is called in the wrong order. A manual check leaves the regression unguarded. The harness decision for this criterion is "add harness".
- **Trade-offs**: we avoid a new dev dependency and a browser download, at the cost of no automated check of M2.

## Pending Decisions

None. The approach, metrics, acceptance criteria, and harness decision are settled for this stage.

## References

- Research: [research.md](research.md)
- Intent: [README.md](README.md)
- Related designs: none
