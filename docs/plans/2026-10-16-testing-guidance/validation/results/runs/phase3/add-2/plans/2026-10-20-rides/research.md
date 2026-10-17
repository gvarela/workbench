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

What in the codebase bears on: the rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered? Narrowed to the two success statements: which rides the rides page lists relative to `today` (boundary at 27 and 28 days back), and what happens to visibility and keyboard focus after a check-in question is answered.

## Summary

The rides page is an HTML string built by `render_rides_page` in `rides/views.py:6-11`. Its only source of rows is `list_rides` in `rides/store.py:7-11`, which keeps rides with `cutoff <= date <= today`, where `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` and `WINDOW_DAYS = 27` (`rides/store.py:4`). Both bounds are inclusive, so the listed span is 27 calendar days: today and the 26 days before it. With `today` = Oct 28 the cutoff is Oct 2, so Oct 2 is listed and Oct 1 (27 days back) and Sep 30 (28 days back) are not. `WINDOW_DAYS` is used only in `list_rides`; `load_series` (`rides/store.py:14-21`) computes its own four 7-day buckets from literals, and `render_today_page` (`rides/views.py:14-17`) filters on `date == today`. No code reads the clock; `today` is always a parameter.

The check-in wizard is static HTML (`wizard/wizard.html`) plus a plain browser script (`wizard/wizard.js`). The form holds three `fieldset.question` elements — sleep, soreness, mood — with the second and third starting `hidden`. A click on any answer button records the answer, sets the current fieldset's `hidden = true`, and sets `hidden = false` on the next fieldset in DOM order if one exists (`wizard/wizard.js:7-14`). Nothing in `wizard/` calls `focus()` or sets `tabindex` or any `aria-*` attribute. After the last question is answered no fieldset is visible and nothing further runs.

Tests are pytest unit tests only (7 tests, all passing). `today` is supplied as a fixed `date(2026, 10, 28)`. The `list_rides` tests cover today, a far-past date (2026-08-01), and ordering; none sits at the window boundary. There is no test for `render_rides_page`, no JavaScript tooling, no browser harness, and no test of the wizard.

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**: "On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)" — the window constant and inclusive cutoff in `rides/store.py:4,9-10`, which currently list Oct 2 and exclude Oct 1 and Sep 30 for `today` = Oct 28; "After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)" — the click handler in `wizard/wizard.js:7-14`, which unhides the next fieldset and does not move focus
- **Statements the findings do not touch**: none

## Detailed Findings

### Rides window

**Location**: `rides/store.py`, `rides/views.py`

**What exists**:

- Module constant `WINDOW_DAYS = 27` ([`rides/store.py:4`](../../../rides/store.py))
- `list_rides(rides, today)` computes the cutoff, filters inclusively on both ends, and sorts newest first ([`rides/store.py:7-11`](../../../rides/store.py))
- `render_rides_page(rides, today)` is the only non-test caller of `list_rides` ([`rides/views.py:2`](../../../rides/views.py), [`rides/views.py:9`](../../../rides/views.py))
- A ride is a dict with `date` (`datetime.date`) and `km` (float), per the module docstring ([`rides/store.py:1`](../../../rides/store.py))

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

1. The caller passes `rides` and `today` to `render_rides_page` (`rides/views.py:6`).
2. `list_rides` sets `cutoff = today - 26 days` (`WINDOW_DAYS - 1`, `rides/store.py:9`).
3. It keeps rides with `cutoff <= date <= today` (`rides/store.py:10`): 27 calendar days inclusive; rides dated after `today` are dropped.
4. It sorts the kept rides by `date`, descending (`rides/store.py:11`).
5. Each ride renders as `<li class="ride">YYYY-MM-DD - N km</li>` inside `<ul>` under `<h1>Rides</h1>` (`rides/views.py:7-11`).

**Worked example, `today` = 2026-10-28** (cutoff = 2026-10-02):

| Ride date | Days before today | Listed under current code |
| --- | --- | --- |
| 2026-10-02 | 26 | yes (equals cutoff) |
| 2026-10-01 | 27 | no |
| 2026-09-30 | 28 | no |

**Error handling**: none explicit. An empty list renders `<ul></ul>`; a ride missing `date` raises `KeyError` at `rides/store.py:10`; a ride missing `km` raises at `rides/views.py:8`.

### Other date-relative logic in `rides/`

**Location**: `rides/store.py`, `rides/views.py`

**What exists**:

- `load_series(rides, today)` counts rides per week for four weeks, most recent first. For `week` in `range(4)`: `end = today - 7*week days`, `start = end - 6 days`, counting `start <= date <= end` ([`rides/store.py:14-21`](../../../rides/store.py)). Together the buckets cover 28 days inclusive. It uses literals (4, 7, 6) and does not reference `WINDOW_DAYS` or `list_rides`.
- `render_today_page(rides, today)` filters with `r["date"] == today` and renders only the distance per ride ([`rides/views.py:14-17`](../../../rides/views.py)).
- No `date.today()` or `datetime.now()` anywhere; every date-relative function takes `today` as a parameter.

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

- `format_distance(km)` returns `f"{round(km, 1)} km"` ([`rides/view_model.py:4-6`](../../../rides/view_model.py)); called from both page renderers ([`rides/views.py:8`](../../../rides/views.py), [`rides/views.py:16`](../../../rides/views.py)). An int input stays whole (`format_distance(5) == "5 km"`, `tests/test_view_model.py:9`).

### Check-in wizard

**Location**: `wizard/`

**What exists**:

- `form#checkin` with three `fieldset.question` elements, each with a `<legend>` and two `<button type="button" data-value="…">` ([`wizard/wizard.html:4-20`](../../../wizard/wizard.html)); the script loads at the end of the body ([`wizard/wizard.html:21`](../../../wizard/wizard.html))
- Plain script, no modules, framework, or build step; `answers` is module-local and never read after being written ([`wizard/wizard.js:2-3`](../../../wizard/wizard.js))
- No `focus()`, `tabindex`, or `aria-*` anywhere in `wizard/`

| Order | `data-question` | Line | Initially | First answer | Second answer |
| --- | --- | --- | --- | --- | --- |
| 1 | `sleep` | 5 | visible | Good (`good`, line 7) | Poor (`poor`, line 8) |
| 2 | `soreness` | 10 | `hidden` | None (`none`, line 12) | Some (`some`, line 13) |
| 3 | `mood` | 15 | `hidden` | Up (`up`, line 17) | Flat (`flat`, line 18) |

**Key code**:

```javascript
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

1. On load, the script collects the fieldsets in document order (`wizard/wizard.js:2`) and attaches a click listener to every button (`wizard/wizard.js:5-7`).
2. A click records `answers[<question>] = <value>` (`wizard/wizard.js:8`), e.g. tapping Good sets `answers.sleep = "good"`.
3. The current fieldset gets `hidden = true` (`wizard/wizard.js:9`). The clicked button is inside it.
4. The next fieldset, if present, gets `hidden = false` (`wizard/wizard.js:10-13`); tapping Good on Sleep makes Soreness visible.
5. Focus is not moved by the script; no line touches focus.
6. On the last question (`mood`), `questions[3]` is `undefined`, so only steps 2–3 run; no fieldset remains visible and there is no submit or completion step.

## Architecture Documentation

**Current patterns found**:

- Pages are plain f-string builders with no template engine and no HTML escaping: `items = "".join(f'<li class="ride">…</li>' …)` then a fixed `<html><body><h1>…</h1><ul>{items}</ul></body></html>` wrapper
  - Example: `rides/views.py:6-11`
  - Example: `rides/views.py:14-17`
- Date windows are inclusive on both ends, with `today` passed in
  - Example: `rides/store.py:9-10` (`WINDOW_DAYS - 1` offset)
  - Example: `rides/store.py:18-20` (`end - 6 days` for a 7-day bucket)
- Wizard advance is visibility-only through the `hidden` property, indexed by DOM order
  - Example: `wizard/wizard.js:9-13`

**Component connections**:

- `rides/views.py` → `rides/store.py`: listing
  - Entry point: `rides/views.py:9`
  - Exit point: `rides/store.py:11`
- `rides/views.py` → `rides/view_model.py`: distance text
  - Entry point: `rides/views.py:8`, `rides/views.py:16`
  - Exit point: `rides/view_model.py:6`
- `wizard/wizard.html` → `wizard/wizard.js`: `<script src="wizard.js">` at `wizard/wizard.html:21`; nothing else imports the script

**Conventions observed**:

- `rides/` package split into `store.py` (data selection), `view_model.py` (display formatting), `views.py` (HTML)
- Module-level constants in `UPPER_SNAKE` (`WINDOW_DAYS`, `rides/store.py:4`); store functions take `(rides, today)`; views are `render_<page>_page(rides, today)`; formatters are `format_<thing>(value)`
- One-line docstrings on modules and most functions
- Testing: see Testing Conventions below

## Testing Conventions

Facts about how tests are written and run here; the test-writer, verifier, and test-reviewer read this section first. Record what exists, with file:line references and no recommendations.

- **Frameworks and versions**: pytest, declared unpinned as `dev = ["pytest"]` (`pyproject.toml:7-8`); installed locally: pytest 9.1.1 on Python 3.13.14 (`requires-python >= 3.10`, `pyproject.toml:5`). Plain `assert`; no assertion or mocking libraries.
- **Commands**: fast and full are the same: `pytest` (config at `pyproject.toml:10-12`: `testpaths = ["tests"]`, `pythonpath = ["."]`). No Makefile, tox, or CI config. Current result: 7 passed.
- **Levels and harness per boundary**: unit only. Python functions are called directly and return values compared (`tests/test_store.py:8-21`); HTML is checked by substring on the returned string (`tests/test_today_page.py:6-8`). The browser/DOM boundary (`wizard/`) has no harness: no `package.json`, Jest, Vitest, Playwright, or Selenium config. No HTTP, database, or queue boundaries exist.
- **Fixtures vs factories**: neither. Ride dicts are inline literals in each test; a module constant `TODAY = date(2026, 10, 28)` (`tests/test_store.py:5`, `tests/test_load_series.py:5`) or inline `date(2026, 10, 28)` (`tests/test_today_page.py:7`). No `conftest.py`.
- **Seams and mocking patterns**: no mocks; the seam is the `today` parameter. No freezegun or clock patching.
- **Skip markers**: none (no `skip`, `xfail`, `parametrize`, or fixtures in `tests/`).
- **Test-quality linters and profilers**: none installed or configured.
- **Mutation tool**: none installed.
- **Services the suite needs**: none; all data is in memory.
- **Profile**: no profile (`.claude/wb/testing.md` does not exist).

Coverage of the areas in this research:

- `list_rides`: today listed (`tests/test_store.py:8-10`), 2026-08-01 omitted (`tests/test_store.py:13-15`), newest first (`tests/test_store.py:18-21`). No test at the cutoff day or the day before it.
- `load_series`: only index `[0]` asserted (`tests/test_load_series.py:8-15`).
- `render_rides_page`: no test.
- `render_today_page`: one test, empty list, `assert "x" not in body` (`tests/test_today_page.py:6-8`).
- `format_distance`: two tests (`tests/test_view_model.py:4-9`).
- Wizard: no test.

## Code References

Quick reference list:

- `rides/store.py:4` - `WINDOW_DAYS = 27`
- `rides/store.py:7-11` - `list_rides`: cutoff, inclusive filter, newest-first sort
- `rides/store.py:14-21` - `load_series`: four 7-day inclusive buckets
- `rides/views.py:6-11` - `render_rides_page`, sole caller of `list_rides`
- `rides/views.py:14-17` - `render_today_page`, `date == today` filter
- `rides/view_model.py:4-6` - `format_distance`
- `wizard/wizard.html:4-21` - form, three fieldsets, script tag
- `wizard/wizard.js:5-16` - click handler: record, hide current, unhide next
- `tests/test_store.py:5-21` - `list_rides` tests with `TODAY = date(2026, 10, 28)`
- `pyproject.toml:7-12` - pytest dependency and config

## Similar Implementations

Existing patterns in the codebase that might be relevant:

**Example from `rides/store.py:17-20`**:

```python
    for week in range(4):
        end = today - timedelta(days=7 * week)
        start = end - timedelta(days=6)
        counts.append(len([r for r in rides if start <= r["date"] <= end]))
```

An inclusive N-day span expressed as `end - timedelta(days=N - 1)` with `start <= date <= end`, the same shape as `list_rides`.

This pattern is also used in:

- `rides/store.py:9-10` - the rides page window (`WINDOW_DAYS - 1`)

**Example from `tests/test_store.py:13-15`** (date-window test shape):

```python
def test_omits_rides_from_long_ago():
    old = {"date": date(2026, 8, 1), "km": 10.0}
    assert list_rides([old], TODAY) == []
```

No JavaScript in the repository other than `wizard/wizard.js`; no other focus handling or DOM-visibility pattern exists to compare against.

## Open Questions

Questions that require resolution before proceeding are tracked in beads, NOT in this document.

**To add a question**:

```bash
bd create "Q: [your question]" --type=task --priority=2 \
  -d "Research question. Blocks: [what can't proceed without this answer]"
# → Returns issue ID (e.g., prompts-abc)
```

**Active questions** (reference only, beads is source of truth):

- None raised by this research. Use `bd list --status=open` to check.

## Next Steps

Based on the research findings:

1. The repository has no browser or JavaScript test harness, and only pytest is present. What exists that could observe keyboard focus in `wizard/` after a click? Nothing in the repository does today.
2. Review the research document
3. Run `/wb:create_design` to create design decisions
