---
project: rides
ticket: null
created: 2026-10-20
status: draft
last_updated: 2026-10-16
depends_on: research.md
design_approach: Correct the window constant and focus the next question's first answer, with a pytest-driven browser harness
---

# Design: Rides Window and Check-in Focus

## Problem Statement

The README Goal is: "The rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered." Two defects stand in the way.

1. **The rides window is one day short.** `WINDOW_DAYS = 27` combined with `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` puts the oldest listed ride 26 days before today (`rides/store.py:4`, `rides/store.py:9`). On Oct 28 the cutoff is Oct 2, so a ride on Oct 1, which the Goal says should be listed, is dropped (research.md, "Rides window").
2. **The wizard never moves focus.** The click handler hides the answered question, which holds the focused button, and unhides the next one. It never calls `focus()` (`wizard/wizard.js:7-13`). Keyboard focus falls back to the document, so a keyboard or screen-reader user has to find the new question by hand.

Left as is, the rides page silently under-reports the last day of the window, and keyboard users lose their place on every step of the check-in. Neither behavior has a test today. The store tests have no case at the window edge (`tests/test_store.py:13-15` uses a ride about 88 days old), and nothing tests the wizard at all (research.md:25).

### Success Metrics

- With `today = 2026-10-28`, the rides page rendered by `render_rides_page` contains a ride dated 2026-10-01 (27 days before) and does not contain a ride dated 2026-09-30 (28 days before). An automated pytest test asserts both. (refines: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)")
- In a real browser loading `wizard/wizard.html`, clicking **Good** on Sleep leaves the Soreness question not hidden and makes `document.activeElement` the **None** button. Clicking **None** then gives the same result for Mood and **Up**. The check runs as an automated test under pytest. (refines: "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)")
- Deferred: none

## Design Approach

This is the smallest change that meets both Intent statements.

- **Rides window**: the window-length constant goes from 27 to 28. The cutoff expression and its inclusive comparison stay as they are. A 28-day window counted inclusively, with today as day 1, then reaches back to today minus 27.
- **Wizard focus**: after the next question is unhidden, focus moves to its first answer button. When no next question exists (the last question), nothing changes.
- **Verification**: the window gets boundary tests in the existing pytest style. The wizard gets a browser test harness, Playwright for Python through `pytest-playwright`, so the focus check runs in a real browser under the same `pytest` command.

### Why This Approach

- **One constant, one call.** The integration analysis found that `WINDOW_DAYS` is read in exactly one place (`rides/store.py:9`) and that `list_rides` has one production caller (`rides/views.py:9`). `load_series` and the today page do not depend on it. The focus change lives entirely inside the existing click handler.
- **Keeps the existing "N days, subtract N−1, compare inclusively" convention.** `list_rides` uses that convention (`rides/store.py:9-10`) and so does `load_series` (`rides/store.py:19-20`). Fixing the constant keeps the name `WINDOW_DAYS` meaning "number of days shown". Removing the `- 1` would get the same result but break that meaning and the shared pattern.
- **Native buttons are already focusable.** Every answer is a `<button type="button">` (`wizard/wizard.html:7-18`), so no `tabindex` or markup change is needed.
- **The harness fits the existing toolchain.** The repository is Python-only, with pytest as its only dev dependency (`pyproject.toml:7-12`), and it has no `package.json` or Node tooling (risk-precedent agent). A Python Playwright plugin adds the browser check without adding a second language toolchain or a second test runner.

## Technical Decisions

### Architecture

- **The window length is `WINDOW_DAYS = 28` and still means "days shown, counting today".**
  - Rationale: this is the only change needed. It matches the Goal's wording ("last 28 days ... inclusive"), and the cutoff arithmetic is already right for an inclusive N-day window.
  - Trade-off: none of substance. The alternative, changing the offset, gives the same result but makes the constant misleading.
  - Pattern reference: `rides/store.py:4`, `rides/store.py:9-10`
- **Focus moves to the first answer of the newly shown question, after it is unhidden.**
  - Rationale: `focus()` on an element inside a `hidden` fieldset does nothing, so the move has to come after `next.hidden = false` (`wizard/wizard.js:12`). The "first answer" is the first `button` in the next fieldset, which matches the README example (Soreness → None).
  - Trade-off: focus moves silently. No live-region announcement is added; focusing a button inside a fieldset with a `<legend>` gives screen readers the question context.
  - Pattern reference: `wizard/wizard.js:7-13`, `wizard/wizard.html:10-13`
- **The last question's behavior is unchanged.**
  - Rationale: the wizard has no completion state today (no submit, no summary), and the Intent covers only advancing to the *next* question. Defining what happens after the final answer would be new UI, outside the Goal.
  - Trade-off: after the final answer, focus still falls back to the document, as it does today.
- **The browser harness is Playwright for Python (`pytest-playwright`), declared as a dev extra and running headless Chromium against `wizard/wizard.html` loaded from disk.**
  - Rationale: the user chose to add a harness (`tmp_GrYKLJxA2q-nq9`). The wizard is static HTML plus a classic script at the end of `<body>` (`wizard/wizard.html:21`), so it needs no server or build step, and a `file://` load runs it exactly as written. Under pytest-playwright, browser tests are ordinary pytest tests in `tests/`, collected by the existing `testpaths`.
  - Trade-off: the dev setup gains a browser binary download, and browser tests are slower than the current pure-Python tests.
  - Pattern reference: `pyproject.toml:7-12`, test naming in `tests/test_*.py`

### Data Model

- No data model change. A ride stays a dict with `date` and `km` (`rides/store.py:1`), and how distance is stored is untouched (Non-goal).
- Wizard state is unchanged: the `answers` object is keyed by `data-question` (`wizard/wizard.js:3`, `wizard/wizard.js:8`).

### Integration Points

- `list_rides(rides, today)` keeps its signature, its newest-first ordering, and its inclusive bounds (`rides/store.py:7-11`). `render_rides_page` picks up the wider window without changes (`rides/views.py:6-11`).
- `load_series` is unaffected. It does not read `WINDOW_DAYS` and uses its own literal week arithmetic (`rides/store.py:14-21`). Its four weeks already cover today minus 27 through today. That overlap is a numeric coincidence, not a coupling.
- The wizard keeps relying on the `.question` class, the `data-question` and `data-value` attributes, and the `button` elements. None of them is renamed. The HTML does not change.
- Browser tests depend on the Playwright Chromium binary being installed in any environment that runs the suite (see Assumptions).

## Scope Definition

### In Scope

- Widening the rides list window to 28 days counted inclusively (oldest listed ride 27 days before today)
- Boundary tests for the window at the 27-day and 28-day edges, checked through the rendered rides page
- Moving keyboard focus to the first answer of the next check-in question after an answer is clicked
- A browser test harness (pytest-playwright) and a wizard focus test that runs under `pytest`

### Out of Scope

- Any change to how distance is stored or formatted (Non-goal; `format_distance` is left as is)
- New pages (Non-goal)
- `load_series` and the today page, which do not use the window constant
- What happens after the last check-in answer (completion state, submission, or where focus goes). The Intent does not cover it.
- ARIA live regions or other accessibility work beyond moving focus
- A Node or JavaScript toolchain (package.json, Jest, or similar)
- Refactoring `load_series`'s literal 4/7/6 arithmetic into named constants

## Success Criteria

### Functional Requirements

- [ ] On 2026-10-28 the rides page lists a ride from 2026-10-01 and does not list one from 2026-09-30
- [ ] Rides from today and from inside the window are still listed newest first (existing `tests/test_store.py` cases still pass)
- [ ] After **Good** is clicked on Sleep, Soreness is visible and focus is on **None**
- [ ] After **None** is clicked on Soreness, Mood is visible and focus is on **Up**
- [ ] The wizard focus test runs in a real (headless) browser as part of `pytest`

### Non-Functional Requirements

- [ ] Performance: no change to page-building cost (the window filter does the same work over one more day)
- [ ] Reliability: the full suite, browser tests included, passes on repeated runs without flakes, and focus assertions wait on DOM state rather than fixed sleeps
- [ ] Security: no new runtime dependencies. Playwright is a dev-only extra and is not imported by `rides/`.

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| ------ | -------- | ------------ | ------------ |
| Playwright browser binaries cannot be installed or run in some dev or CI environment | Med | Low | Tracked as `tmp_GrYKLJxA2q-0t6`. Keep the browser tests in their own test module so the Python-only tests still run. If the binaries are unavailable, re-decide the harness (manual check) rather than drop the metric silently. |
| Off-by-one regression if the cutoff expression is also "fixed" alongside the constant | Med | Low | The boundary tests pin both edges (Oct 1 listed, Sep 30 not), so either over- or under-correction fails. |
| The focus call lands before the next question is unhidden and silently does nothing | Med | Low | The browser test asserts `document.activeElement`, which catches this ordering bug. |
| Browser tests run noticeably slower than the current suite | Low | Med | One wizard test module and a single headless browser keep the cost small. |

### Assumptions

Based on knowledge gaps from research - track in beads to ensure validation:

| Assumption | Beads ID | Validated? |
|------------|----------|------------|
| Playwright for Python and its Chromium binary can be installed and run headless wherever the suite runs (not installed today) | `tmp_GrYKLJxA2q-0t6` | Pending |

```bash
# Created for this design:
bd create "Validate: Playwright Chromium can be installed and run headless in dev and CI" --type=task --priority=2 \
  -d "Assumption from rides design (docs/plans/2026-10-20-rides/design.md). Playwright is not installed today. If wrong: wizard focus check cannot run automatically; fall back to manual check and re-decide harness."
```

## Rejected Alternatives

### Option: Drop the `- 1` from the cutoff and keep `WINDOW_DAYS = 27`

- **Approach**: compute `cutoff = today - timedelta(days=WINDOW_DAYS)`.
- **Rejected because**: the behavior is identical, but the constant would no longer equal the number of days shown, and the "subtract N−1, compare inclusively" convention shared with `load_series` would be broken.
- **Trade-offs**: nothing gained.

### Option: Verify wizard focus manually only (no harness)

- **Approach**: leave the suite pytest-only and check focus by hand in a browser.
- **Rejected because**: the user chose "add harness" (`tmp_GrYKLJxA2q-nq9`). A manual-only check leaves the second success statement without a repeatable measurement, and focus regressions are easy to reintroduce.
- **Trade-offs**: no browser dependency, but no automated guard.

### Option: JavaScript harness (Node with jsdom/Jest, or Playwright Test in Node)

- **Approach**: add a `package.json` and a JS test runner for the wizard.
- **Rejected because**: it adds a second language toolchain and a second test command to a repository that has neither (no `package.json`, pytest only). jsdom also does not do real layout, which makes `hidden` and focus behavior less trustworthy than in a real browser.
- **Trade-offs**: wizard tests would sit closer to the JS, at the cost of two toolchains.

### Option: Generic "focus the next question" (focus the fieldset or its legend)

- **Approach**: give the fieldset `tabindex="-1"` and focus it.
- **Rejected because**: the Intent requires focus on the *first answer* (None), and it needs a markup change that focusing the native button avoids.
- **Trade-offs**: the screen-reader announcement might be slightly richer, but the success statement would be missed.

## Pending Decisions

Design decisions that need stakeholder input - track in beads:

| Decision Needed | Beads ID | Blocks |
|-----------------|----------|--------|
| None. The harness decision is resolved and closed as `tmp_GrYKLJxA2q-nq9`. | — | — |

Note: Decisions blocking execution should be resolved before `/create_tasks`.

## References

- Research: [research.md](research.md)
- Intent: [README.md](README.md#intent)
- Decision record: `tmp_GrYKLJxA2q-nq9` (Decide: browser test harness for rides check-in wizard focus, closed)
- External docs: Playwright for Python, pytest plugin (`pytest-playwright`)
