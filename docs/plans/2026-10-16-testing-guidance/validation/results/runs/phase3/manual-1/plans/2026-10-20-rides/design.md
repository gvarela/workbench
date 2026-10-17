---
project: rides
ticket: null
created: 2026-10-20
status: approved
last_updated: 2026-10-17
depends_on: research.md
design_approach: Minimal in-place fixes (window constant to 28; focus after unhide)
---

# Design: Rides Window and Check-in Focus

## Problem Statement

README Goal: "The rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered."

This plan fixes two unrelated defects that share one plan:

1. **The rides window is one day short.** `list_rides` keeps rides on or after `today - (WINDOW_DAYS - 1)`, and `WINDOW_DAYS = 27` (`rides/store.py:4`, `rides/store.py:9`). The page therefore lists 27 days inclusive, so the oldest listed ride is 26 days back. On Oct 28 a ride on Oct 1 is left out, but the Goal says it should be listed (research.md, "Rides window"). No existing test pins the boundary: the only "outside the window" case is Aug 1, 88 days back (`tests/test_store.py:13-15`). That is why the off-by-one went unnoticed.
2. **The wizard drops keyboard focus.** When an answer is clicked, the handler hides the question that holds the focused button and unhides the next question. It never moves focus (`wizard/wizard.js:6-16`), so focus falls back to `body`, and a keyboard user has to tab back into the page to reach the next question.

Both problems match what the Goal names, so the Goal needs no change.

### Success Metrics

- **M1**: With `today` = 2026-10-28, the rendered rides page lists a ride dated 2026-10-01 (27 days back) and does not list a ride dated 2026-09-30 (28 days back). (refines: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)")
- **M2**: After an answer is clicked on any question that has a next question, that next question is visible and `document.activeElement` is its first answer button. (refines: "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)")
- Deferred: none

### Constraints

- The Non-goals rule out changing how distance is stored and adding new pages. `format_distance` and the ride dict shape (`date`, `km`) stay as they are.
- Tests run on pytest only. Research and agent findings found no JS test tooling or browser harness, and the plan's harness decision is to add none (see Harness Decisions).
- `list_rides(rides, today)` and `render_rides_page(rides, today)` keep their signatures. `today` stays a parameter and is never read from the clock (convention in `rides/store.py` and `rides/views.py`).

## Design Approach

Make the smallest change that fixes each defect where it lives:

- **Rides window**: raise `WINDOW_DAYS` from 27 to 28 and keep the existing `today - (WINDOW_DAYS - 1)` cutoff and the inclusive `cutoff <= date <= today` filter. The constant then means "number of days shown, today included", which matches the Goal's wording.
- **Wizard focus**: in the existing click handler, after the next question is unhidden, move focus to the first `button` in that question. Nothing changes when there is no next question.

### Why This Approach

- Each fix is a single local edit in the one place that owns the behavior. `WINDOW_DAYS` is used only at `rides/store.py:9`, and the wizard has one handler (agent findings: integration analysis).
- It keeps the repo's "N days inclusive means subtract N - 1" idiom, which `load_series` also uses for its 7-day weeks (`rides/store.py:17-19`).
- The focus call goes after the unhide because `hidden` applies `display: none`, and `.focus()` on an element inside a hidden ancestor does nothing (agent findings: integration analysis).
- The first answer is the first `button` in document order in each `fieldset.question`: Good, None and Up (`wizard/wizard.html:7,12,17`). This matches the README example.

## Technical Decisions

### Architecture

- **Window size is still a single module constant, set to 28.**
  - Rationale: the constant name then says what the Goal says (28 days inclusive). No other code or test reads `WINDOW_DAYS` (agent findings: pattern finder).
  - Trade-off: none of substance. Dropping the `- 1` instead would also work, but then the constant would mean "days back" rather than "days shown".
  - Pattern reference: `rides/store.py:4`, `rides/store.py:9-10`
- **Focus moves inside the existing `if (next)` branch, after `next.hidden = false`.**
  - Rationale: focus can only land on a visible element, and the branch already guards the last-question case.
  - Trade-off: on the last question, focus still falls back to `body`. No Intent statement covers that case, so it stays out of scope.
  - Pattern reference: `wizard/wizard.js:10-12`

### Data Model

- No change. A ride is still a dict with `date` and `km`. Wizard answers are still stored in the `answers` object keyed by `dataset.question`.

### Integration Points

- `render_rides_page` (`rides/views.py:6-11`) picks up the wider window through `list_rides` without changes.
- `load_series` (`rides/store.py:14-21`) is unaffected, because it does not read `WINDOW_DAYS`.
- `render_today_page` (`rides/views.py:14-17`) is unaffected, because it filters on `date == today`.
- The rides change and the wizard change touch no shared files, imports or tests.

## Scope Definition

### In Scope

- The rides page listing window grows to 28 days inclusive.
- The wizard moves focus to the first answer of the next question after an answer is clicked.
- An automated test that pins the window boundary at both edges.

### Out of Scope

- Focus behavior after the last question (Mood) is answered. No Intent statement covers it; the current behavior stays.
- `load_series` week arithmetic, `format_distance` rounding, and the today page.
- Any change to how distance is stored (Non-goal), and any new page (Non-goal).
- A JS or browser test harness (harness decision: manual).

## Success Criteria

### Acceptance Criteria

- **AC-1 A ride 27 days before today appears on the rides page**
  - Given `today` = 2026-10-28 and a ride `{"date": 2026-10-01, "km": 10.0}`
  - When the rides page is rendered
  - Then the page contains a `<li class="ride">` entry for that ride
  - Example: today 2026-10-28, ride 2026-10-01 → listed
  - Example (edge): today 2026-10-28, ride 2026-10-28 (today) → listed
  - Observed at: HTML returned by `render_rides_page`
  - Refines: M1

- **AC-2 A ride 28 days before today does not appear on the rides page**
  - Given `today` = 2026-10-28 and a ride `{"date": 2026-09-30, "km": 10.0}`
  - When the rides page is rendered
  - Then the page contains no `<li class="ride">` entry for that ride
  - Example: today 2026-10-28, ride 2026-09-30 → not listed
  - Example (edge): today 2026-10-28, rides on 2026-10-01 and 2026-09-30 together → only 2026-10-01 is listed
  - Observed at: HTML returned by `render_rides_page`
  - Refines: M1

- **AC-3 Answering a question moves focus to the next question's first answer**
  - Given the check-in wizard is loaded with Sleep visible and Soreness and Mood hidden
  - When the user activates Good on Sleep (by click, or by Enter or Space with the keyboard)
  - Then Sleep is hidden, Soreness is visible, and keyboard focus is on Soreness's None button
  - Example: Good on Sleep → Soreness visible and focus on None
  - Example (edge): then any answer on Soreness → Mood visible and focus on Up
  - Observed at: the wizard page in a browser (visible question and focused element), verified manually
  - Refines: M2

### Harness Decisions

| Boundary | Harness present? | Decision |
|----------|------------------|----------|
| Rendered rides page (`render_rides_page` HTML) | pytest (`pyproject.toml`, `tests/`) | Use as is |
| Wizard UI in a browser (visibility and focus) | none (no JS tooling, Playwright or Selenium) | Manual: check AC-3 by keyboard in a browser and record the result at validation. No browser harness is added. |

### Non-Functional Requirements

- [ ] Performance: no measurable change, since both fixes replace a constant or add one call
- [ ] Reliability: all existing pytest tests keep passing, including `tests/test_today_page.py`, which is unaffected
- [ ] Security: no new inputs or surfaces

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| ------ | -------- | ------------ | ------------ |
| A wizard focus regression goes unnoticed later, because no automated test covers it | Med | Med | AC-3 is checked manually at validation. A browser harness can be added in a future plan if more wizard work comes. |
| The focus call is placed before the unhide and silently does nothing | Med | Low | The design requires focus after `next.hidden = false`, and the manual check of AC-3 would catch the mistake. |
| A future off-by-one in the window goes unnoticed | Med | Low | AC-1 and AC-2 pin both edges of the window in pytest. |

### Assumptions

No assumptions need validating. Research recorded no knowledge gaps or open questions, and the agent findings confirmed the code paths above.

## Rejected Alternatives

### Option: Keep `WINDOW_DAYS = 27` and drop the `- 1` from the cutoff

- **Approach**: `cutoff = today - timedelta(days=WINDOW_DAYS)`.
- **Rejected because**: it gives the same result, but the constant would then mean "days back" while the Goal says "28 days". It would also break with the N - 1 idiom that `load_series` uses.
- **Trade-offs**: nothing gained; the constant becomes less clear.

### Option: Add a browser test harness (for example Playwright) for the wizard

- **Approach**: add JS and browser tooling so that AC-3 runs as an automated test.
- **Rejected because**: the harness decision for this plan is manual. Adding tooling would grow a two-line fix into a new test stack.
- **Trade-offs**: automated regression coverage for focus is given up in exchange for a much smaller change.

### Option: Also manage focus after the last question

- **Approach**: after Mood is answered, move focus to a summary or completion element.
- **Rejected because**: no Intent statement asks for it, and no such element exists. Adding one would go beyond the smallest change.
- **Trade-offs**: the last step keeps today's behavior, with focus falling back to `body`.

## Pending Decisions

None.

## References

- Research: [research.md](research.md)
- Intent: [README.md](README.md#intent)
