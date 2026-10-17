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

What in the codebase bears on: the rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered? Narrowed to the success statements: which rides the rides page lists at the window boundary (27 vs 28 days before today), and what happens to visibility and keyboard focus after a check-in question is answered.

## Summary

The rides page is an HTML string built by `render_rides_page` in `rides/views.py:6-11`. It lists whatever `list_rides` in `rides/store.py:7-11` returns. `list_rides` keeps rides with `cutoff <= date <= today`, where `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` and `WINDOW_DAYS = 27` (`rides/store.py:4`, `:9`). Both bounds are inclusive, so the cutoff is today minus 26 days and the window covers 27 calendar days including today. With today = Oct 28, 2026:

- the cutoff is Oct 2, and a ride on Oct 2 is listed;
- a ride on Oct 1 (27 days back) is not listed;
- a ride on Sep 30 (28 days back) is not listed.

`WINDOW_DAYS` is used only at `rides/store.py:9`. `load_series` in the same module uses its own literals (`4`, `7`, `6`) and covers today−27 through today in four 7-day blocks. Nothing in `rides/views.py` calls it.

The check-in wizard is static HTML (`wizard/wizard.html`) plus a top-level script (`wizard/wizard.js`). There are three `fieldset.question` elements: Sleep, Soreness and Mood. The last two start `hidden`. A click on an answer button does three things: it stores the value in `answers`, sets the current fieldset's `hidden = true`, and sets the next fieldset's `hidden = false` (`wizard/wizard.js:7-14`). The repository contains no `focus()`, `tabindex`, `autofocus` or `scrollIntoView`, so after a click no code moves keyboard focus.

Tests are pytest only: 7 tests in 4 files, all passing, with Python 3.13.14 and pytest 9.1.1 installed locally. No test exercises the window boundary or `render_rides_page`. The wizard has no test, and the repository has no browser, DOM or JS test harness.

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**:
  - "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)": `WINDOW_DAYS` and the inclusive cutoff in `rides/store.py:4-11`. The worked Oct 28 case is under Rides window below.
  - "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)": the click handler in `wizard/wizard.js:5-16` and the markup in `wizard/wizard.html:5-19`.
- **Statements the findings do not touch**: none

## Detailed Findings

### Rides window

**Location**: `rides/store.py`

**What exists**:

- The module docstring defines a ride as a dict with a `date` (`datetime.date`) and `km` (float) ([`rides/store.py:1`](../../../rides/store.py)).
- `WINDOW_DAYS = 27` is a module constant ([`rides/store.py:4`](../../../rides/store.py)). Its only use is line 9.
- `list_rides(rides, today)` filters to the inclusive range `[today - (WINDOW_DAYS - 1), today]` and sorts newest first ([`rides/store.py:7-11`](../../../rides/store.py)).
- `today` is always a parameter. The repository never calls `date.today()`.

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

1. `render_rides_page(rides, today)` calls `list_rides(rides, today)` ([`rides/views.py:9`](../../../rides/views.py)).
2. `list_rides` computes `cutoff = today - 26 days` (`rides/store.py:9`).
3. It keeps rides with `cutoff <= r["date"] <= today` (`rides/store.py:10`). Both ends are inclusive, and future-dated rides are excluded.
4. It sorts by `date` descending (`rides/store.py:11`). Python's sort is stable, so rides on the same date keep their input order.
5. `render_rides_page` emits one `<li class="ride">{ISO date} - {format_distance(km)}</li>` per ride inside a fixed `<html><body><h1>Rides</h1><ul>…</ul></body></html>` template (`rides/views.py:7-11`).

Worked case, today = 2026-10-28 (cutoff = Oct 2):

| Ride date | Days before today | Listed by current code |
| --- | --- | --- |
| Oct 28 | 0 | Yes |
| Oct 2 | 26 | Yes (lower bound inclusive) |
| Oct 1 | 27 | No |
| Sep 30 | 28 | No |

Error handling: none. A ride missing `date` raises `KeyError`. A non-date `date` value raises `TypeError` on comparison.

### Weekly series (`load_series`)

**Location**: `rides/store.py:14-21`

**What exists**:

- `load_series` returns 4 counts, most recent week first.
- Each week is the inclusive 7-day range `[end - 6, end]`, with `end = today - 7*week`.
- Taken together, the four weeks cover today−27 through today (28 days).
- It uses the literals `4`, `7` and `6`, not `WINDOW_DAYS`.
- Its only caller is `tests/test_load_series.py:14`. `rides/views.py` doesn't call it.

**Key code**:

```python
# rides/store.py:16-21
    counts = []
    for week in range(4):
        end = today - timedelta(days=7 * week)
        start = end - timedelta(days=6)
        counts.append(len([r for r in rides if start <= r["date"] <= end]))
    return counts
```

### Distance display and the today page

**Location**: `rides/view_model.py`, `rides/views.py:14-17`

**What exists**:

- `format_distance(km)` returns `f"{round(km, 1)} km"` ([`rides/view_model.py:4-6`](../../../rides/view_model.py)).
  - `format_distance(5)` gives `"5 km"`, because `round` on an int returns an int.
  - `format_distance(12.34)` gives `"12.3 km"`.
- `render_today_page` filters with `r["date"] == today` inline and doesn't call `list_rides` ([`rides/views.py:15`](../../../rides/views.py)). It renders the distance only (`rides/views.py:16`).

### Check-in wizard

**Location**: `wizard/`

**What exists**:

- One `<form id="checkin">` holds three `<fieldset class="question" data-question="…">` elements, in document order ([`wizard/wizard.html:4-20`](../../../wizard/wizard.html)):

  | # | Lines | `data-question` | Starts hidden | Buttons (in order, `data-value`) |
  | --- | --- | --- | --- | --- |
  | 1 | 5-9 | `sleep` | no | Good (`good`), Poor (`poor`) |
  | 2 | 10-14 | `soreness` | yes | None (`none`), Some (`some`) |
  | 3 | 15-19 | `mood` | yes | Up (`up`), Flat (`flat`) |

- Every answer is a `<button type="button">`. There is no submit button.
- The script is loaded with `<script src="wizard.js">` after the form (`wizard/wizard.html:21`).
- There is no CSS. Visibility is controlled only by the `hidden` attribute.
- The repository contains no `focus()`, `tabindex`, `autofocus` or `scrollIntoView`.

**Key code**:

```js
// wizard/wizard.js:2-16
const questions = Array.from(document.querySelectorAll(".question"));
const answers = {};

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

1. At load, the script collects all `.question` elements in document order and creates an empty `answers` object (`wizard/wizard.js:2-3`).
2. It attaches a `click` listener to every button inside each question, with that question's `index` captured (`wizard/wizard.js:5-7`).
3. On click it does the following:
   - records `answers[question.dataset.question] = button.dataset.value` (line 8);
   - hides the current fieldset (line 9), which also hides the button that was just clicked;
   - unhides `questions[index + 1]` if it exists (lines 10-13).
4. No statement in the handler moves focus. After "Good" on Sleep, the Soreness fieldset becomes visible, and no code focuses its first button ("None").
5. After the last question (Mood), `questions[3]` is `undefined`, so all fieldsets are hidden and nothing else is shown.
6. `answers` is a module-level `const` that nothing else reads. The script makes no network call and doesn't submit the form.

## Architecture Documentation

**Current patterns found**:

- **Pages are f-string builders** with no template engine or escaping.
  - Example: `rides/views.py:6-11` (`render_rides_page`)
  - Example: `rides/views.py:14-17` (`render_today_page`)
- **Date windows take `today` as a parameter** and use inclusive `start <= r["date"] <= end` comparisons built with `timedelta`.
  - Example: `rides/store.py:9-10`
  - Example: `rides/store.py:18-20`
- **Display formatting lives in a separate module** from the views.
  - Example: `rides/view_model.py:4-6`
- **The wizard script is a top-level, non-module script.** It uses class and data attributes as hooks: `.question`, `data-question` and `data-value`.
  - Example: `wizard/wizard.js:2-8`

**Component connections**:

- `rides/views.py` → `rides/store.py`: the rides page listing.
  - Import: `rides/views.py:2`
  - Call: `rides/views.py:9`
- `rides/views.py` → `rides/view_model.py`: distance text.
  - Import: `rides/views.py:3`
  - Calls: `rides/views.py:8`, `rides/views.py:16`
- `wizard/wizard.html` → `wizard/wizard.js`: script tag at `wizard/wizard.html:21`. The JS selects `.question` at `wizard/wizard.js:2`.
- `wizard/` has no connection to the Python package.

**Conventions observed**:

- Modules are `rides/store.py`, `rides/view_model.py` and `rides/views.py`. `rides/__init__.py` is empty.
- Function and constant names:
  - functions are snake_case verbs: `list_rides`, `load_series`, `format_distance`;
  - page builders are `render_<name>_page`;
  - constants are UPPER_SNAKE: `WINDOW_DAYS`, and `TODAY` in the tests.
- A ride is a dict with `date` and `km` keys (`rides/store.py:1`).
- Testing: see Testing Conventions below.

## Testing Conventions

Facts about how tests are written and run here. The test-writer, verifier and test-reviewer read this section first.

- **Frameworks and versions**:
  - pytest, declared as `dev = ["pytest"]` with no pin (`pyproject.toml:7-8`). Installed locally: pytest 9.1.1 on Python 3.13.14. `requires-python = ">=3.10"` (`pyproject.toml:5`).
  - Assertions are plain `assert` with `==` or `not in`.
  - No mocking library is used: no `unittest.mock`, `pytest-mock` or `freezegun`.
- **Commands**:
  - fast: `python3 -m pytest -q` (7 passed in 0.01s);
  - full: the same command, since there is no fast/full split;
  - configuration: `testpaths = ["tests"]` and `pythonpath = ["."]` (`pyproject.toml:10-12`);
  - no Makefile, tox or CI file documents a command.
- **Levels and harness per boundary**:
  - Unit tests call pure functions directly: `tests/test_store.py`, `tests/test_load_series.py`, `tests/test_view_model.py`.
  - One page-render test calls `render_today_page` and checks the returned string with a substring assertion (`tests/test_today_page.py:6-8`). No test calls `render_rides_page`.
  - The code crosses no database, HTTP or queue boundary.
  - For the UI (the `wizard/` HTML and JS), no harness exists: no `package.json`, jest, jsdom, Playwright or Selenium configuration.
- **Fixtures vs factories**: neither is used. There is no `conftest.py`.
  - `today` is a module-level literal, `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`, `tests/test_load_series.py:5`), or is inlined (`tests/test_today_page.py:7`).
  - Rides are inline dict literals with absolute dates, e.g. `{"date": date(2026, 8, 1), "km": 10.0}` (`tests/test_store.py:14`).
- **Seams and mocking patterns**: the clock seam is the `today` parameter that every store and view function takes. Tests pass a literal date, and nothing is patched.
- **Window coverage as it exists**:
  - `tests/test_store.py` covers a ride from today (`:8-10`), Aug 1 being omitted (`:13-15`) and newest-first order with Oct 20 and Oct 25 (`:18-21`). No test sits at the cutoff, Oct 1 or Oct 2 when today is Oct 28.
  - `tests/test_load_series.py:8-15` checks index `[0]` only.
- **Skip markers**: none (0).
- **Test-quality linters and profilers**: none installed or configured. There is no `[tool.*]` section for ruff, coverage or similar.
- **Mutation tool**: none installed.
- **Services the suite needs**: none. All data is in memory.
- **Profile**: no profile. `.claude/wb/testing.md` does not exist, and there is no `.claude/` directory.

## Code References

Quick reference list:

- `rides/store.py:4` - `WINDOW_DAYS = 27`
- `rides/store.py:7-11` - `list_rides`: cutoff `today - (WINDOW_DAYS - 1)`, inclusive filter, newest-first sort
- `rides/store.py:14-21` - `load_series`: four inclusive 7-day blocks with literal constants
- `rides/views.py:6-11` - `render_rides_page`, the rides page HTML
- `rides/views.py:14-17` - `render_today_page`, an inline `== today` filter
- `rides/view_model.py:4-6` - `format_distance`
- `wizard/wizard.html:5-19` - the three question fieldsets; Soreness and Mood start `hidden`
- `wizard/wizard.js:7-14` - the click handler that stores the answer and hides/unhides fieldsets
- `tests/test_store.py:5-21` - `list_rides` tests with `TODAY = date(2026, 10, 28)`
- `pyproject.toml:10-12` - pytest configuration

## Similar Implementations

Existing patterns in the codebase that might be relevant:

**Example from `rides/store.py:17-20`**:

```python
    for week in range(4):
        end = today - timedelta(days=7 * week)
        start = end - timedelta(days=6)
        counts.append(len([r for r in rides if start <= r["date"] <= end]))
```

This inclusive date-window pattern, built with `timedelta` off a `today` parameter, is also used in:

- `rides/store.py:9-10` - the rides page window in `list_rides`
- `rides/views.py:15` - the single-day equality filter in `render_today_page`

The wizard has no other element-visibility or focus code to compare against. `wizard/wizard.js:9-13` is the only place that toggles `hidden`.

## Open Questions

Questions that require resolution before proceeding are tracked in beads, NOT in this document.

**To add a question**:

```bash
bd create "Q: [your question]" --type=task --priority=2 \
  -d "Research question. Blocks: [what can't proceed without this answer]"
```

**Active questions** (reference only, beads is source of truth):

- None raised by this research.

## Next Steps

Based on the research findings:

1. Review the research document.
2. Run `/wb:create_design` to create design decisions.
