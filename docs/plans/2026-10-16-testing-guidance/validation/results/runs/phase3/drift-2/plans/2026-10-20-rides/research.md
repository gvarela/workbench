---
project: rides
ticket: null
created: 2026-10-20
status: complete
last_updated: 2026-10-17
---

# Research: Rides Window and Check-in Focus

**Created**: 2026-10-20
**Last Updated**: 2026-10-17
**Ticket**: N/A

## Research Question

What in the codebase bears on: the rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered? Narrowed to the success statements: which rides the rides page lists at the 27- and 28-days-back boundary, and what visibility and keyboard focus look like after a check-in question is answered.

## Summary

`render_rides_page` in `rides/views.py` builds the rides page as an HTML string. It lists rides through `list_rides` in `rides/store.py`, which filters with the module constant `WINDOW_DAYS = 27`. The cutoff is `today - timedelta(days=WINDOW_DAYS - 1)`, which is today minus 26 days, and both ends are inclusive. The listed window therefore spans 27 calendar days. With today = 2026-10-28 the earliest listed date is 2026-10-02. Neither 2026-10-01 (27 days back) nor 2026-09-30 (28 days back) is listed. `WINDOW_DAYS` is used only in `list_rides`. `load_series` in the same file has its own hard-coded four 7-day buckets, which cover today-27 through today (28 days).

The check-in wizard is static HTML (`wizard/wizard.html`) plus a top-level script (`wizard/wizard.js`). Clicking an answer button does three things: it stores the value in an in-memory `answers` object, sets `hidden` on that button's own fieldset, and unhides the next fieldset if one exists. No code in the repository calls `focus()` or sets `tabindex` or `autofocus`. After the last question every fieldset is hidden, and `answers` is not read anywhere.

The tests are pytest unit tests of pure Python functions. All 7 pass (`python3 -m pytest -q`, pytest 9.1.1). No test exercises the window boundary or the wizard. A `playwright.config.ts` exists at the repository root and points at `./e2e`. That directory does not exist, and there is no `package.json` or `node_modules`. The testing profile `.claude/wb/testing.md` says there are no browser tests and the wizard is checked by hand.

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**:
  - "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)": the window constant and the inclusive cutoff in `rides/store.py:4-11`. With today = Oct 28, neither Oct 1 nor Sep 30 is listed today.
  - "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)": the click handler in `wizard/wizard.js:7-14` unhides the next fieldset and sets no focus.
- **Statements the findings do not touch**: none

## Detailed Findings

### Rides window

**Location**: `rides/store.py`, `rides/views.py`

**What exists**:

- The module docstring says a ride is a dict with a `date` (`datetime.date`) and a `km` (float) ([`rides/store.py:1`](../../../rides/store.py)).
- `WINDOW_DAYS = 27` is the only module constant ([`rides/store.py:4`](../../../rides/store.py)).
- `list_rides(rides, today)` filters to an inclusive window and sorts newest first ([`rides/store.py:7-11`](../../../rides/store.py)).
- `today` is always a parameter. No code calls `date.today()`.
- The only uses of `WINDOW_DAYS` in code are `rides/store.py:4` and `rides/store.py:9`.

**Key code**:

```python
# rides/store.py:4-11
WINDOW_DAYS = 27


def list_rides(rides, today):
    """Return rides from the recent window, newest first."""
    cutoff = today - timedelta(days=WINDOW_DAYS - 1)
    recent = [r for r in rides if cutoff <= r["date"] <= today]
    return sorted(recent, key=lambda r: r["date"], reverse=True)
```

**How it works**:

1. `render_rides_page(rides, today)` iterates over `list_rides(rides, today)` ([`rides/views.py:6-10`](../../../rides/views.py)).
2. `list_rides` sets `cutoff` to today minus 26 days and keeps rides with `cutoff <= date <= today`. Rides dated after `today` are excluded ([`rides/store.py:9-10`](../../../rides/store.py)).
3. Worked example with today = 2026-10-28:

   | Ride date | Days before today | Listed |
   | ----------- | ------------------- | -------- |
   | 2026-10-28 | 0 | yes |
   | 2026-10-02 | 26 | yes (the cutoff) |
   | 2026-10-01 | 27 | no |
   | 2026-09-30 | 28 | no |

4. The result is sorted by date, descending ([`rides/store.py:11`](../../../rides/store.py)). Rides on the same date keep their input order because Python's sort is stable.
5. Each ride becomes `<li class="ride">{date.isoformat()} - {format_distance(km)}</li>`, inside `<html><body><h1>Rides</h1><ul>…</ul></body></html>` ([`rides/views.py:8`](../../../rides/views.py), [`rides/views.py:11`](../../../rides/views.py)).

### Weekly series (same file, separate window)

**Location**: `rides/store.py:14-21`

**What exists**:

- `load_series(rides, today)` returns four counts, most recent week first. It does not use `WINDOW_DAYS`.

**Key code**:

```python
# rides/store.py:14-21
def load_series(rides, today):
    """Count rides per week, most recent week first, for the last four weeks."""
    counts = []
    for week in range(4):
        end = today - timedelta(days=7 * week)
        start = end - timedelta(days=6)
        counts.append(len([r for r in rides if start <= r["date"] <= end]))
    return counts
```

**How it works**:

1. Each bucket is an inclusive 7-day span ending at `today - 7*week`.
2. Together the four buckets cover today-27 through today, which is 28 days. With today = 2026-10-28 that is 2026-10-01 through 2026-10-28.

### Today page and distance display

**Location**: `rides/views.py:14-17`, `rides/view_model.py`

**What exists**:

- `render_today_page` filters with `r["date"] == today` and does not call `list_rides` ([`rides/views.py:15`](../../../rides/views.py)).
- `format_distance(km)` returns `f"{round(km, 1)} km"` ([`rides/view_model.py:4-6`](../../../rides/view_model.py)). Both pages call it ([`rides/views.py:8`](../../../rides/views.py), [`rides/views.py:16`](../../../rides/views.py)).

### Check-in wizard

**Location**: `wizard/`

**What exists**:

- `<form id="checkin">` contains three `<fieldset class="question" data-question="…">` elements: sleep (visible), soreness (`hidden`) and mood (`hidden`) ([`wizard/wizard.html:4-20`](../../../wizard/wizard.html)).
- Each fieldset holds two `<button type="button" data-value="…">` elements:
  - Sleep: Good, Poor ([`wizard/wizard.html:7-8`](../../../wizard/wizard.html))
  - Soreness: None, Some ([`wizard/wizard.html:12-13`](../../../wizard/wizard.html))
  - Mood: Up, Flat ([`wizard/wizard.html:17-18`](../../../wizard/wizard.html))
- `wizard.js` is loaded by a plain `<script src>` at the end of the body ([`wizard/wizard.html:21`](../../../wizard/wizard.html)).
- The script runs at top level and has no functions or exports. It collects `.question` elements into `questions` and keeps an `answers` object ([`wizard/wizard.js:2-3`](../../../wizard/wizard.js)).
- The repository code contains no `focus()`, `tabindex` or `autofocus`.

**Key code**:

```javascript
// wizard/wizard.js:5-16
questions.forEach((question, index) => {
  question.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      answers[question.dataset.question] = button.dataset.value;
      question.hidden = true;
      const next = questions[index + 1];
      if (next) {
        next.hidden = false;
      }
    });
  });
});
```

**How it works**:

1. Each answer button gets a click listener ([`wizard/wizard.js:6-7`](../../../wizard/wizard.js)).
2. On click, the listener stores `answers[question.dataset.question] = button.dataset.value` ([`wizard/wizard.js:8`](../../../wizard/wizard.js)).
3. It then hides the fieldset that contains the clicked button ([`wizard/wizard.js:9`](../../../wizard/wizard.js)).
4. If a next question exists, it unhides it ([`wizard/wizard.js:10-13`](../../../wizard/wizard.js)). Clicking Good on Sleep therefore hides Sleep and shows Soreness.
5. The listener sets no focus. The button that had focus is now inside a hidden fieldset, and no code moves focus to the newly shown fieldset's buttons. Where the browser then places `document.activeElement` (typically `document.body`) is browser behavior. This repository's code does not determine it.
6. On the last question (mood) `next` is `undefined`, so after the click every fieldset is hidden. There is no submit, completion handler or back navigation, and `answers` is not read or sent anywhere.

## Architecture Documentation

**Current patterns found**:

- Pages are built as f-string HTML by plain functions that take `(rides, today)`.
  - Example: `rides/views.py:6-11`
  - Example: `rides/views.py:14-17`
- Date windows are inclusive comparisons against a `today` parameter, and their bounds come from `timedelta`.
  - Example: `rides/store.py:9-10`
  - Example: `rides/store.py:18-20`
- Display formatting lives in `rides/view_model.py`, separate from the views.
- The wizard state is DOM `hidden` attributes plus one in-memory object, and nothing persists it (`wizard/wizard.js:2-16`).

**Component connections**:

- `rides/views.py` → `rides/store.py`: the listing (import at `rides/views.py:2`, call at `rides/views.py:9`)
- `rides/views.py` → `rides/view_model.py`: the distance text (import at `rides/views.py:3`, calls at `rides/views.py:8` and `rides/views.py:16`)
- `wizard/wizard.html` → `wizard/wizard.js`: the script tag (`wizard/wizard.html:21`). The wizard has no connection to the `rides` package.
- Nothing in the repository serves these pages over HTTP. No server module exists, including on port 8000, the `baseURL` in `playwright.config.ts`.

**Conventions observed**:

- A ride is a dict with `date` and `km` keys (`rides/store.py:1`).
- Module constants use UPPER_SNAKE_CASE (`WINDOW_DAYS`).
- Testing: see Testing Conventions below.

## Testing Conventions

Facts about how tests are written and run here; the test-writer, verifier, and test-reviewer read this section first. Record what exists, with file:line references and no recommendations.

- **Frameworks and versions**:
  - pytest 9.1.1 is installed. `pyproject.toml` lists it unpinned as `dev = ["pytest"]` (`pyproject.toml:7-8`).
  - Assertions are plain `assert`. There is no mocking library.
  - Python `>=3.10` (`pyproject.toml:5`).
- **Commands**:
  - fast: `python3 -m pytest -q` (`.claude/wb/testing.md:5`)
  - full: the same command. No separate full command is defined.
  - The pytest config sets `testpaths = ["tests"]` and `pythonpath = ["."]` (`pyproject.toml:10-12`).
  - Current result: 7 passed.
- **Levels and harness per boundary**:
  - Unit tests only.
  - Rendering functions are tested by asserting on returned HTML strings (`tests/test_today_page.py:6-8`).
  - The UI/JS boundary (the wizard) has no harness:
    - `playwright.config.ts:1-6` configures `@playwright/test` with `testDir: "./e2e"` and `baseURL: "http://localhost:8000"`.
    - `e2e/` does not exist.
    - There is no `package.json` and no `node_modules`.
    - No Playwright browsers are installed under `~/.cache/ms-playwright`.
  - There are no database, HTTP or queue boundaries.
- **Fixtures vs factories**:
  - There are none: no `conftest.py`, pytest fixtures or factories.
  - Test modules define `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`, `tests/test_load_series.py:5`). `tests/test_today_page.py:7` inlines the same date.
  - Ride dicts are built inline in each test, sometimes as named locals (`old`, `older`, `newer` in `tests/test_store.py:14-20`).
- **Seams and mocking patterns**:
  - Time is injected by passing `today` as an argument (`rides/store.py:7`, `rides/store.py:14`). Nothing is mocked.
  - Tests import functions directly, for example `from rides.store import list_rides` (`tests/test_store.py:3`).
  - Test names describe behavior (`test_lists_newest_first`, `test_omits_rides_from_long_ago`).
  - Files are named `tests/test_<module-or-feature>.py`.
- **Existing coverage of the areas in question**:
  - `tests/test_store.py`:
    - `test_lists_a_ride_from_today` (lines 8-10) checks a ride on today.
    - `test_omits_rides_from_long_ago` (lines 13-15) checks a ride on 2026-08-01, 88 days back.
    - `test_lists_newest_first` (lines 18-21) checks rides 8 and 3 days back.
    - None of them puts a ride at 26, 27 or 28 days back.
  - `tests/test_load_series.py:8-15` asserts only index 0 (`value == 3`).
  - `tests/test_view_model.py:4-9` has two string equality checks.
  - `tests/test_today_page.py:6-8` asserts `"x" not in body` on an empty ride list.
  - No test covers `render_rides_page` or the wizard.
- **Skip markers**: none
- **Test-quality linters and profilers**: none installed or configured. There is no ruff, no lint config and no CI config.
- **Mutation tool**: none installed. `.claude/wb/testing.md:12-14` sets Mutation to `off`.
- **Services the suite needs**: none (`.claude/wb/testing.md:10`)
- **Profile**: `.claude/wb/testing.md` is the baseline. It says pytest is run with `python3 -m pytest -q`, there are no browser tests, the wizard is checked by hand, there are no services, and mutation is off. The profile and the code differ in one place:
  - `playwright.config.ts` exists at the repository root, but the profile does not mention it.
  - The config's `testDir` (`./e2e`) is absent, and no Playwright dependency is installed.
  - So the profile's "no browser tests" matches what runs, and the Playwright config is unused scaffolding.

## Code References

- `rides/store.py:4` - `WINDOW_DAYS = 27`
- `rides/store.py:7-11` - `list_rides`: inclusive cutoff at today minus `WINDOW_DAYS - 1`, newest first
- `rides/store.py:14-21` - `load_series`: four hard-coded 7-day buckets (28 days)
- `rides/views.py:6-11` - `render_rides_page`, the rides page entry point
- `rides/views.py:14-17` - `render_today_page`, a same-day filter
- `rides/view_model.py:4-6` - `format_distance`
- `wizard/wizard.html:4-20` - three question fieldsets, two of them initially `hidden`
- `wizard/wizard.js:7-14` - click handler: store the answer, hide the current question, unhide the next
- `playwright.config.ts:1-6` - Playwright config pointing at the absent `./e2e`
- `pyproject.toml:7-12` - pytest dev dependency and config
- `.claude/wb/testing.md:1-14` - testing profile
- `tests/test_store.py:5-21` - `list_rides` tests

## Similar Implementations

**Example from `rides/store.py:17-20`**:

```python
for week in range(4):
    end = today - timedelta(days=7 * week)
    start = end - timedelta(days=6)
    counts.append(len([r for r in rides if start <= r["date"] <= end]))
```

This is the other inclusive date-range filter in the codebase. Its four buckets together reach back to today-27, a 28-day span. It uses the same `start <= r["date"] <= end` comparison form as `list_rides` (`rides/store.py:10`).

The pattern of filtering ride dicts by date against a `today` parameter also appears in:

- `rides/views.py:15` - `render_today_page`, with an equality filter on `today`

The wizard's reveal logic (`wizard/wizard.js:5-16`) is the only DOM or JavaScript behavior in the repository. There is no other focus or visibility handling to compare it with.

## Open Questions

Questions that require resolution before proceeding are tracked in beads, NOT in this document.

**Active questions** (reference only, beads is source of truth):

- None open. `bd list --status=open` returned no issues.

## Next Steps

Based on the research findings:

1. What serves `wizard/wizard.html` today? No server and no `e2e/` directory exist, so design will need to settle how the focus behavior is checked, given the profile's "checked by hand" and the unused `playwright.config.ts`.
2. Review the research document.
3. Run `/wb:create_design` to create design decisions.
