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

What in the codebase bears on: the rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered? Narrowed to the success statements: which rides the rides page lists at the window boundary (27 vs 28 days before today), and what happens to visibility and keyboard focus when a check-in answer is clicked.

## Summary

The rides page is an HTML string built by `render_rides_page` in `rides/views.py:6-11`. It iterates over `list_rides(rides, today)` from `rides/store.py:7-11`, which keeps rides with `cutoff <= date <= today`, where `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` and `WINDOW_DAYS = 27` (`rides/store.py:4`). Both ends are inclusive, so the window covers 27 calendar days counting today: with `today` = 2026-10-28 the cutoff is 2026-10-02, a ride 26 days back (Oct 2) is listed, and a ride 27 days back (Oct 1) is not. `WINDOW_DAYS` is used nowhere else; `load_series` (`rides/store.py:14-21`) uses its own inline four 7-day buckets (28 days), and `render_today_page` filters on equality with `today`. Every date-aware function takes `today` as an argument; nothing reads the clock.

The check-in wizard is static HTML (`wizard/wizard.html`) with three `fieldset.question` elements (sleep, soreness, mood); soreness and mood start `hidden`. `wizard/wizard.js:5-16` attaches a click listener to every answer button that stores the answer, sets the current fieldset `hidden = true`, and sets the next fieldset `hidden = false`. There is no `focus()` call, `tabindex`, or `autofocus` anywhere in `wizard/`. The first answer of each question is the first `<button>` in its fieldset: Good (sleep), None (soreness), Up (mood).

Tests are pytest unit tests only (7 tests, all passing with `python3 -m pytest -q`), with `today` injected as `TODAY = date(2026, 10, 28)`. No test sits on the window boundary, `render_rides_page` has no test, and the wizard has no test. A `playwright.config.ts` exists (`testDir: "./e2e"`, `baseURL: "http://localhost:8000"`), but there is no `e2e/` directory, no `package.json`, and no server; `.claude/wb/testing.md:9` states "No browser tests. The wizard is checked by hand."

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)" — the window constant and cutoff in `rides/store.py:4-11`, consumed by `rides/views.py:9`, currently list Oct 2 as the oldest date for Oct 28; "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)" — the click handler in `wizard/wizard.js:7-14` toggles `hidden` and sets no focus; first answers are at `wizard/wizard.html:7,12,17`
- **Statements the findings do not touch**: none

## Detailed Findings

### Rides window

**Location**: `rides/store.py`, `rides/views.py`

**What exists**:

- Module docstring: a ride is a dict with a `date` (`datetime.date`) and `km` (float) ([`rides/store.py:1`](../../../rides/store.py))
- `WINDOW_DAYS = 27` ([`rides/store.py:4`](../../../rides/store.py)); its only code reference is `rides/store.py:9`
- `list_rides(rides, today)` computes the cutoff, filters inclusively at both ends, and sorts newest first ([`rides/store.py:7-11`](../../../rides/store.py))
- `render_rides_page(rides, today)` calls `list_rides` and renders one `<li class="ride">` per ride as `YYYY-MM-DD - {distance}` ([`rides/views.py:6-11`](../../../rides/views.py))
- No error handling or input validation; rides dated after `today` are excluded by the `<= today` bound

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

1. `render_rides_page` (`rides/views.py:6`) passes `rides` and `today` to `list_rides` (`rides/views.py:9`).
2. `list_rides` sets `cutoff = today - 26 days` (`rides/store.py:9`).
3. It keeps rides with `cutoff <= date <= today` (`rides/store.py:10`) and sorts by date descending (`rides/store.py:11`); Python's stable sort keeps same-date rides in input order.
4. Worked example, `today` = 2026-10-28: cutoff = 2026-10-02. Oct 2 (26 days before) through Oct 28 are listed — 27 days. Oct 1 (27 days before) and Sep 30 (28 days before) are not listed.
5. Each listed ride's distance is formatted by `format_distance` (`rides/view_model.py:4-6`), which returns `f"{round(km, 1)} km"`.

### Other date-aware functions

**Location**: `rides/store.py`, `rides/views.py`

**What exists**:

- `load_series(rides, today)` loops `for week in range(4)`, with `end = today - timedelta(days=7 * week)` and `start = end - timedelta(days=6)`, counting rides with `start <= date <= end`; returns four counts, most recent week first ([`rides/store.py:14-21`](../../../rides/store.py)). It does not use `WINDOW_DAYS`; 4, 7, and 6 are inline literals. Its four buckets together span 28 days. Its only caller is `tests/test_load_series.py:14`.
- `render_today_page(rides, today)` filters on `r["date"] == today` and renders distances only ([`rides/views.py:14-17`](../../../rides/views.py)).
- No `date.today()` or `datetime.now()` in `rides/` or `wizard/`.

### Check-in wizard

**Location**: `wizard/`

**What exists**:

- One `<form id="checkin">` ([`wizard/wizard.html:4`](../../../wizard/wizard.html)) holding three `fieldset.question` elements with `data-question` attributes, each containing two `<button type="button" data-value=...>` elements:

  | Question | Fieldset line | Hidden at load | First answer | Second answer |
  | --- | --- | --- | --- | --- |
  | sleep | `wizard/wizard.html:5` | no | Good (`good`), line 7 | Poor (`poor`), line 8 |
  | soreness | `wizard/wizard.html:10` | yes | None (`none`), line 12 | Some (`some`), line 13 |
  | mood | `wizard/wizard.html:15` | yes | Up (`up`), line 17 | Flat (`flat`), line 18 |

- The script is loaded as a classic script after the form: `<script src="wizard.js"></script>` ([`wizard/wizard.html:21`](../../../wizard/wizard.html)); it is not an ES module and exports nothing
- No `focus()`, `tabindex`, or `autofocus` anywhere in `wizard/`

**Key code**:

```javascript
// wizard/wizard.js:1-16
// Morning check-in: answering a question reveals the next one.
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

1. `questions` is every `.question` element in DOM order (`wizard/wizard.js:2`).
2. Each button in each question gets a click listener (`wizard/wizard.js:5-7`).
3. On click, the answer is stored in the module-level `answers` object (`wizard/wizard.js:8`); nothing submits or reads it.
4. The answered fieldset is hidden (`wizard/wizard.js:9`), so the clicked button is no longer displayed.
5. The next fieldset, if any, is unhidden (`wizard/wizard.js:10-13`). On the last question (mood) there is no next fieldset; it is hidden and nothing else happens.
6. No statement moves keyboard focus. Example: clicking Good on Sleep hides Sleep and shows Soreness; focus is not set to None.

## Architecture Documentation

**Current patterns found**:

- Pages are f-string HTML builders with no template engine, named `render_<name>_page`
  - Example: `rides/views.py:6-11`
  - Example: `rides/views.py:14-17`
- Date-aware functions take `today` as a parameter and use `timedelta` arithmetic with chained inclusive comparisons in list comprehensions
  - Example: `rides/store.py:9-10`
  - Example: `rides/store.py:18-20`
- Display formatting lives in `rides/view_model.py`, separate from views (`rides/view_model.py:4-6`)
- The wizard is static HTML plus a classic script that toggles the `hidden` attribute (`wizard/wizard.js:9,12`)

**Component connections**:

- `rides/views.py` → `rides/store.py`: listing
  - Entry point: `rides/views.py:9`
  - Exit point: `rides/store.py:11`
- `rides/views.py` → `rides/view_model.py`: distance text
  - Entry point: `rides/views.py:8`, `rides/views.py:16`
  - Exit point: `rides/view_model.py:6`
- `wizard/wizard.html` → `wizard/wizard.js`: script tag at `wizard/wizard.html:21`; the script selects `.question` elements at `wizard/wizard.js:2`
- The wizard and the `rides` package do not reference each other, and no server serves either.

**Conventions observed**:

- Modules split by role: `store.py` (data and windowing), `view_model.py` (display values), `views.py` (HTML strings)
- Functions are snake_case and verb-first (`list_rides`, `load_series`, `format_distance`); constants are UPPER_SNAKE (`WINDOW_DAYS`)
- A ride is a dict with `date` and `km` keys (`rides/store.py:1`)
- Testing: see Testing Conventions below

## Testing Conventions

- **Frameworks and versions**: pytest, unpinned (`pyproject.toml:8`, `dev = ["pytest"]`); Python `>=3.10` (`pyproject.toml:5`). Bare `assert` only; no assertion or mocking libraries, no pytest plugins. `playwright.config.ts:1` imports `@playwright/test`, but no `package.json` or Node dependency declaration exists.
- **Commands**: fast: `python3 -m pytest -q` (`.claude/wb/testing.md:5`); full: same command — no separate full command exists. Current result: 7 passed.
- **Levels and harness per boundary**: unit only, under `tests/` (`pyproject.toml:11`, `testpaths = ["tests"]`; `pythonpath = ["."]` at line 12). Tests call pure functions with in-memory dicts: `list_rides` (`tests/test_store.py`), `load_series` (`tests/test_load_series.py`), `render_today_page` (`tests/test_today_page.py`), `format_distance` (`tests/test_view_model.py`). Boundaries: no database, HTTP, or queue in the code. UI boundary: `playwright.config.ts:3-6` sets `testDir: "./e2e"` and `baseURL: "http://localhost:8000"`, but `e2e/` does not exist, there is no `webServer` entry, and nothing in the repo serves port 8000. The wizard has no test of any kind; `render_rides_page` has no test.
- **Fixtures vs factories**: neither; no `conftest.py`, no fixtures, no factories, no parametrization. Data is inline dict literals, e.g. `{"date": TODAY, "km": 10.0}` (`tests/test_store.py:9`). `today` is injected via module constant `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`, `tests/test_load_series.py:5`) or inline (`tests/test_today_page.py:7`). Window-related tests use dates 0 days (`tests/test_store.py:9`), 3 and 8 days (`tests/test_store.py:19-20`), and 88 days (`tests/test_store.py:14`) before `TODAY`; none at 26, 27, or 28 days.
- **Seams and mocking patterns**: no mocking; the seam is the `today` parameter on every date-aware function. No freezegun or monkeypatch.
- **Skip markers**: none (0 `skip`/`xfail` in `tests/`).
- **Test-quality linters and profilers**: none installed (no ruff, linters, coverage, or profilers in `pyproject.toml`).
- **Mutation tool**: none installed (`.claude/wb/testing.md:12-14`: "off").
- **Services the suite needs**: none (`.claude/wb/testing.md:10`).
- **Profile**: `.claude/wb/testing.md` is the baseline. It matches the code on the pytest command, no services, and mutation off. It differs on browser tests: line 9 says "No browser tests. The wizard is checked by hand.", while `playwright.config.ts` exists in the repo root (with no `e2e/` tests, no Node package manifest, and no server behind it).

## Code References

- `rides/store.py:4` - `WINDOW_DAYS = 27`
- `rides/store.py:7-11` - `list_rides`: cutoff, inclusive filter, newest-first sort
- `rides/store.py:14-21` - `load_series`: four inline 7-day buckets
- `rides/views.py:6-11` - `render_rides_page`, calls `list_rides` at line 9
- `rides/views.py:14-17` - `render_today_page`, equality filter on `today`
- `rides/view_model.py:4-6` - `format_distance`
- `wizard/wizard.html:5-19` - three question fieldsets; soreness and mood start `hidden`
- `wizard/wizard.html:7,12,17` - first answer buttons (Good, None, Up)
- `wizard/wizard.js:7-14` - click handler: store answer, hide current, unhide next
- `tests/test_store.py:5-21` - `list_rides` tests with `TODAY = date(2026, 10, 28)`
- `playwright.config.ts:3-6` - Playwright config pointing at nonexistent `./e2e`
- `.claude/wb/testing.md:5-14` - testing profile

## Similar Implementations

**Example from `rides/store.py:17-20`** (inclusive date range from an injected `today`):

```python
for week in range(4):
    end = today - timedelta(days=7 * week)
    start = end - timedelta(days=6)
    counts.append(len([r for r in rides if start <= r["date"] <= end]))
```

This is the same `timedelta` subtraction and chained inclusive comparison used by `list_rides` at `rides/store.py:9-10`; here a 7-day inclusive span is expressed as `end - 6 days`, the same "N − 1" form as `WINDOW_DAYS - 1`.

**Example from `tests/test_store.py:5-15`** (date-window test style):

```python
TODAY = date(2026, 10, 28)


def test_lists_a_ride_from_today():
    rides = [{"date": TODAY, "km": 10.0}]
    assert list_rides(rides, TODAY) == rides


def test_omits_rides_from_long_ago():
    old = {"date": date(2026, 8, 1), "km": 10.0}
    assert list_rides([old], TODAY) == []
```

This pattern is also used in:

- `tests/test_load_series.py:5-15` - same `TODAY` constant and inline ride dicts
- `tests/test_today_page.py:6-8` - a rendered page string checked with a substring assertion

No existing code in `wizard/` or elsewhere moves keyboard focus.

## Open Questions

Questions that require resolution before proceeding are tracked in beads, NOT in this document.

**Active questions** (reference only, beads is source of truth): none raised by this research.

## Next Steps

Based on the research findings:

1. What harness, if any, exists to run `wizard/wizard.js` in a DOM? (Findings: none in the repo; `playwright.config.ts` points at a nonexistent `e2e/`, and `.claude/wb/testing.md:9` says the wizard is checked by hand.)
2. Review the research document
3. Run `/wb:create_design` to create design decisions
