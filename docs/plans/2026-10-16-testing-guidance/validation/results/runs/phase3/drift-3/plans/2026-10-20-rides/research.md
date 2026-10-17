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

What in the codebase bears on: the rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered? Narrowed to the success statements: which rides are listed at 27 and 28 days before today, and where visibility and keyboard focus land after a check-in answer.

## Summary

The rides page is an HTML string built by `render_rides_page` in `rides/views.py:6-11`. It lists whatever `list_rides` in `rides/store.py:7-11` returns. `list_rides` keeps rides with `cutoff <= date <= today`, where `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` and `WINDOW_DAYS = 27` (`rides/store.py:4`). Both ends are inclusive, so the window is 27 calendar days and the oldest listed ride is 26 days before today. With `today` = Oct 28, the cutoff is Oct 2, so neither Oct 1 (27 days back) nor Sep 30 (28 days back) is listed. `WINDOW_DAYS` is used only in `rides/store.py`. `load_series` (`rides/store.py:14-21`) has its own inline arithmetic: four 7-day buckets covering `today - 27` through `today`.

The check-in wizard is static HTML (`wizard/wizard.html`) with three `fieldset.question` elements in the order sleep, soreness, mood. The second and third start `hidden`. `wizard/wizard.js` attaches a click listener to every answer button. The listener records the answer, hides the current fieldset, and unhides the next one if there is one. No code in `wizard/` calls `focus()` or sets `tabindex` or `aria-*` attributes. On the last question, the mood fieldset is hidden and nothing else happens.

The tests are pytest unit tests that call store, view-model, and view functions directly (7 tests, all passing). No test checks the window boundary, `render_rides_page`, or the wizard. A `playwright.config.ts` exists at the repository root, but its `testDir` (`./e2e`) does not exist and no `package.json`, `node_modules`, or server exists either. `.claude/wb/testing.md:9` says "No browser tests. The wizard is checked by hand."

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not" — `WINDOW_DAYS = 27` and the cutoff `today - (WINDOW_DAYS - 1)` in `rides/store.py:4-10`; today the cutoff falls on day 26 back, so the day-27 ride is not listed and the day-28 ride is not listed. "After answering a check-in question, the next question is visible and keyboard focus is on its first answer" — the click handler in `wizard/wizard.js:7-14` unhides the next fieldset and sets no focus.
- **Statements the findings do not touch**: none

## Detailed Findings

### Rides window

**Location**: `rides/store.py`, `rides/views.py`

**What exists**:

- The module docstring defines a ride as a dict with a `date` (`datetime.date`) and `km` (float) ([`rides/store.py:1`](../../../rides/store.py))
- `WINDOW_DAYS = 27` is a module-level constant ([`rides/store.py:4`](../../../rides/store.py))
- `list_rides(rides, today)` filters by an inclusive window and sorts newest first ([`rides/store.py:7-11`](../../../rides/store.py))
- `render_rides_page(rides, today)` is the only caller of `list_rides` ([`rides/views.py:9`](../../../rides/views.py))
- `WINDOW_DAYS` is referenced only at `rides/store.py:4` and `rides/store.py:9`

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

```python
# rides/views.py:6-11
def render_rides_page(rides, today):
    items = "".join(
        f'<li class="ride">{r["date"].isoformat()} - {format_distance(r["km"])}</li>'
        for r in list_rides(rides, today)
    )
    return f"<html><body><h1>Rides</h1><ul>{items}</ul></body></html>"
```

**How it works**:

1. The caller passes `rides` and `today`. Nothing in the code calls `date.today()`.
2. `list_rides` computes `cutoff = today - 26 days` (`rides/store.py:9`) and keeps rides with `cutoff <= date <= today` (`rides/store.py:10`). That covers 27 calendar days, and rides dated after `today` are excluded.
3. Worked example with `today` = 2026-10-28: the cutoff is Oct 2. Oct 2 (26 days back) is listed. Oct 1 (27 days back) and Sep 30 (28 days back) are not.
4. `render_rides_page` renders one `<li class="ride">` per listed ride in the form `YYYY-MM-DD - N km` (`rides/views.py:8`), inside `<h1>Rides</h1><ul>…</ul>` (`rides/views.py:11`).

### Other date logic near the window

**Location**: `rides/store.py`, `rides/views.py`

**What exists**:

- `load_series(rides, today)` loops `for week in range(4)`, with `end = today - 7*week` and `start = end - 6`. It counts rides with `start <= date <= end` and returns the counts most recent week first ([`rides/store.py:14-21`](../../../rides/store.py)). The four buckets together cover `today - 27` through `today` (28 days). The 4, 7, and 6 are inline literals and do not use `WINDOW_DAYS`.
- `render_today_page(rides, today)` filters with `r["date"] == today` and does not use `list_rides` or `WINDOW_DAYS` ([`rides/views.py:14-17`](../../../rides/views.py))

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

### Distance display

**Location**: `rides/view_model.py`

**What exists**:

- `format_distance(km)` returns `f"{round(km, 1)} km"` ([`rides/view_model.py:4-6`](../../../rides/view_model.py))
- Both `render_rides_page` (`rides/views.py:8`) and `render_today_page` (`rides/views.py:16`) call it

### Check-in wizard

**Location**: `wizard/`

**What exists**:

- One `<form id="checkin">` ([`wizard/wizard.html:4`](../../../wizard/wizard.html)) holds three `fieldset.question` elements:

| Order | `data-question` | Lines | Starts `hidden` | Buttons, in DOM order |
| --- | --- | --- | --- | --- |
| 1 | `sleep` | `wizard/wizard.html:5-9` | no | Good (`good`), Poor (`poor`) |
| 2 | `soreness` | `wizard/wizard.html:10-14` | yes | None (`none`), Some (`some`) |
| 3 | `mood` | `wizard/wizard.html:15-19` | yes | Up (`up`), Flat (`flat`) |

- Each fieldset has a `<legend>`. The buttons are `type="button"` with a `data-value` and have no `id`.
- The script is loaded as a plain classic script at the end of `<body>` (`<script src="wizard.js">`, [`wizard/wizard.html:21`](../../../wizard/wizard.html)), with no `defer` and no module.
- A search of `wizard/` finds no `focus()` call, no `tabindex`, and no `aria-*` attributes.

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

1. On load, `questions` collects the three fieldsets in DOM order (`wizard/wizard.js:2`).
2. Every button in every fieldset gets a click listener (`wizard/wizard.js:5-7`).
3. On click, the listener stores the answer in `answers` under the question name (`wizard/wizard.js:8`), hides the current fieldset (`wizard/wizard.js:9`), and unhides `questions[index + 1]` if it exists (`wizard/wizard.js:10-13`).
4. Focus is not moved. The clicked button is inside the fieldset that has just been hidden.
5. On the mood question, `next` is `undefined`. The fieldset is hidden and nothing else runs. There is no submit button, no submit handler, and no completion message, and nothing reads `answers` after it is written.

## Architecture Documentation

**Current patterns found**:

- Pages are built as Python f-strings, with `"".join(...)` over `<li>` items
  - Example: `rides/views.py:6-11`
  - Example: `rides/views.py:14-17`
- Date filters are inclusive comparisons against an injected `today`
  - Example: `rides/store.py:10`
  - Example: `rides/store.py:20`
- Display formatting is kept in `rides/view_model.py`, separate from the views
  - Example: `rides/view_model.py:4-6`
- Wizard progression is driven by DOM order and the `hidden` attribute
  - Example: `wizard/wizard.js:9-13`

**Component connections**:

- `rides/views.py` → `rides/store.py`: listing
  - Entry point: `rides/views.py:9`
  - Exit point: `rides/store.py:11`
- `rides/views.py` → `rides/view_model.py`: distance text
  - Entry point: `rides/views.py:8`, `rides/views.py:16`
  - Exit point: `rides/view_model.py:6`
- `wizard/wizard.html` → `wizard/wizard.js`: script tag at `wizard/wizard.html:21`; the script selects `.question` at `wizard/wizard.js:2`
- No Python code serves or renders the wizard, and nothing in the repository runs an HTTP server

**Conventions observed**:

- `today` is always an explicit second positional argument: `(rides, today)` on `list_rides`, `load_series`, `render_rides_page`, and `render_today_page`
- Constants are upper snake case (`WINDOW_DAYS`). Store functions are verb_noun (`list_rides`, `load_series`), views are `render_<x>_page`, and the formatter is `format_distance`
- Module docstrings are on every `rides/` module. Function docstrings are on `list_rides`, `load_series`, and `format_distance`, but not on the two view functions
- Testing: see Testing Conventions below

## Testing Conventions

- **Frameworks and versions**: pytest only, declared unpinned as `dev = ["pytest"]` (`pyproject.toml:8`). Python `>=3.10` (`pyproject.toml:5`). Assertions are plain `assert`. There is no assertion or mocking library.
- **Commands**: fast: `python3 -m pytest -q` (`.claude/wb/testing.md:5`); full: the same command, since no separate full command is defined. Pytest config sets `testpaths = ["tests"]` and `pythonpath = ["."]` (`pyproject.toml:10-12`). The current run gives `7 passed`.
- **Levels and harness per boundary**: unit only. Store and view-model functions are called directly (`tests/test_store.py`, `tests/test_load_series.py`, `tests/test_view_model.py`). The one view test inspects the string returned by `render_today_page` (`tests/test_today_page.py:6-8`). There are no integration or end-to-end tests. UI boundary: `playwright.config.ts:1-6` imports `@playwright/test` and sets `testDir: "./e2e"` and `baseURL: "http://localhost:8000"`, with no `webServer` block. `e2e/`, `package.json`, and `node_modules` do not exist, and nothing serves port 8000. No database, HTTP, or queue boundary exists in the code.
- **Fixtures vs factories**: neither. There is no `conftest.py`. Rides are inline dict literals in each test, and `TODAY = date(2026, 10, 28)` is a module constant in `tests/test_store.py:5` and `tests/test_load_series.py:5` (inline in `tests/test_today_page.py:7`).
- **Seams and mocking patterns**: no mocking or patching. The clock seam is the injected `today` argument.
- **Skip markers**: none (no `skip`, `xfail`, or `parametrize`).
- **Test-quality linters and profilers**: none installed. `pyproject.toml` has no lint or plugin sections.
- **Mutation tool**: none installed. `.claude/wb/testing.md:12-14` sets Mutation to `off`.
- **Services the suite needs**: none (`.claude/wb/testing.md:10`: "No services: no database, no network.").
- **Profile**: `.claude/wb/testing.md` is the baseline (pytest, `python3 -m pytest -q`, no browser tests, no services, mutation off). It and the code differ in one place: the profile says "No browser tests. The wizard is checked by hand." (`.claude/wb/testing.md:9`), but `playwright.config.ts` exists at the root. That config has no test directory, no declared dependency, and no server behind its `baseURL`, so no browser test runs today.

Existing tests touching the research areas:

- `tests/test_store.py:8-10`: a ride on `TODAY` is listed
- `tests/test_store.py:13-15`: a ride on 2026-08-01 (88 days back) is omitted
- `tests/test_store.py:18-21`: Oct 25 is listed before Oct 20
- `tests/test_load_series.py:8-15`: three rides in the current week give `load_series(...)[0] == 3`
- No test uses a date 26, 27, or 28 days before `TODAY`. There is no test of `render_rides_page` and none of the wizard.

## Code References

- `rides/store.py:4` - `WINDOW_DAYS = 27`
- `rides/store.py:7-11` - `list_rides`: cutoff `today - (WINDOW_DAYS - 1)`, inclusive filter, newest first
- `rides/store.py:14-21` - `load_series`: four inline 7-day buckets
- `rides/views.py:6-11` - `render_rides_page`, the only caller of `list_rides`
- `rides/views.py:14-17` - `render_today_page`, exact-date filter
- `rides/view_model.py:4-6` - `format_distance`
- `wizard/wizard.html:5-19` - three question fieldsets; soreness and mood start `hidden`
- `wizard/wizard.html:21` - classic script include
- `wizard/wizard.js:7-14` - click handler: record, hide current, unhide next; no focus
- `playwright.config.ts:1-6` - Playwright config pointing at the missing `./e2e`
- `pyproject.toml:8-12` - pytest dependency and config
- `.claude/wb/testing.md:5-14` - testing profile
- `tests/test_store.py:5-21` - `list_rides` tests

## Similar Implementations

**Example from `rides/store.py:18-20`**:

```python
end = today - timedelta(days=7 * week)
start = end - timedelta(days=6)
counts.append(len([r for r in rides if start <= r["date"] <= end]))
```

This is the same inclusive `start <= date <= end` window built from `today` with `timedelta`, as in `list_rides`.

This pattern is also used in:

- `rides/store.py:9-10` - the rides page window
- `rides/views.py:15` - the today page's exact-date version (`r["date"] == today`)

No other JavaScript exists in the repository. `wizard/wizard.js` is the only client-side behavior, so there are no other focus-management or show/hide examples.

## Open Questions

Questions that require resolution before proceeding are tracked in beads, NOT in this document.

**To add a question**:

```bash
bd create "Q: [your question]" --type=task --priority=2 \
  -d "Research question. Blocks: [what can't proceed without this answer]"
```

**Active questions** (reference only, beads is source of truth):

- None recorded by this research.

To see full question details: `bd show [id]`

## Next Steps

Based on the research findings:

1. The wizard's focus behavior has no automated harness: `playwright.config.ts` exists, but `e2e/`, the `@playwright/test` dependency, and a server are absent, and `.claude/wb/testing.md:9` records the wizard as checked by hand. Design will need to decide how the focus statement is verified against that existing state.
2. Review the research document
3. Run `/wb:create_design` to create design decisions
