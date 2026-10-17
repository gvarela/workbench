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

What in the codebase bears on: the rides page showing the last 28 days of rides inclusive, and the morning check-in wizard moving keyboard focus to the next question's first answer when one is answered?

## Summary

The rides page is an HTML string built by `render_rides_page` in `rides/views.py:6-11`, which renders whatever `list_rides` in `rides/store.py:7-11` returns. `list_rides` uses the module constant `WINDOW_DAYS = 27` (`rides/store.py:4`) to compute `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` (26 days), then keeps rides with `cutoff <= date <= today` and sorts them newest first. The window is 27 calendar dates. With `today = 2026-10-28` the cutoff is 2026-10-02, so a ride on 2026-10-01 (27 days before) is not listed, and neither is one on 2026-09-30 (28 days before). `today` is always passed in by the caller; nothing reads the system clock. A separate function, `load_series` (`rides/store.py:14-21`), covers four 7-day weeks with literal numbers. Its oldest covered date is `today - 27 days` (2026-10-01 for the same `today`). It does not use `WINDOW_DAYS`, and nothing in `rides/` calls it.

The check-in wizard is static HTML (`wizard/wizard.html`) plus a classic script (`wizard/wizard.js`). It has three `fieldset.question` elements: Sleep, Soreness and Mood. Soreness and Mood start with the `hidden` attribute. Each question has two `type="button"` answers. One click listener per button (`wizard/wizard.js:7-14`) stores the value, sets the current fieldset's `hidden = true`, and sets the next fieldset's `hidden = false` if there is one. Nothing in `wizard/` calls `focus()`, `blur()` or `scrollIntoView`, or uses `tabindex` or `autofocus`. Keyboard focus is not managed by the script.

Tests are pytest only (pytest 9.1.1 installed, unpinned in `pyproject.toml:8`). `python3 -m pytest -q` reports `7 passed`. No test checks the edge of the `list_rides` window, and nothing tests `render_rides_page`. There is no JavaScript or browser test harness, and nothing tests the wizard.

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**:
  - "a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)". Bearing: the window constant and cutoff in `rides/store.py:4-11` currently list Oct 2 and later for `today` = Oct 28, so neither Oct 1 nor Sep 30 is listed.
  - "the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)". Bearing: the click handler at `wizard/wizard.js:7-14` unhides the next fieldset and sets no focus. "None" is the first button of Soreness (`wizard/wizard.html:12`).
- **Statements the findings do not touch**: none

## Detailed Findings

### Rides window

**Location**: `rides/store.py`, `rides/views.py`

**What exists**:

- `WINDOW_DAYS = 27` ([`rides/store.py:4`](../../../rides/store.py)). This is the only reference to the constant.
- `list_rides(rides, today)` computes the cutoff, filters with inclusive bounds on both ends, and sorts by date descending ([`rides/store.py:7-11`](../../../rides/store.py)). Rides dated after `today` are excluded. Rides on the same date keep their input order (stable sort).
- The module docstring defines a ride as `{"date": datetime.date, "km": float}` ([`rides/store.py:1`](../../../rides/store.py)).
- `render_rides_page(rides, today)` is the only caller of `list_rides`. It renders one `<li class="ride">{date.isoformat()} - {format_distance(km)}</li>` per ride ([`rides/views.py:6-11`](../../../rides/views.py)).

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

**How it works** (`today` = 2026-10-28):

1. `render_rides_page` passes `rides` and `today` straight to `list_rides` (`rides/views.py:9`).
2. `cutoff = 2026-10-28 - 26 days = 2026-10-02` (`rides/store.py:9`).
3. Rides dated 2026-10-02 through 2026-10-28 are kept (`rides/store.py:10`). That is 27 dates.

   | Ride date | Days before today | Listed? |
   | --- | --- | --- |
   | 2026-10-02 | 26 | yes |
   | 2026-10-01 | 27 | no |
   | 2026-09-30 | 28 | no |

4. The kept rides are sorted newest first (`rides/store.py:11`) and joined into `<html><body><h1>Rides</h1><ul>…</ul></body></html>` (`rides/views.py:11`).

### Other date ranges in `rides/`

**Location**: `rides/store.py:14-21`, `rides/views.py:14-17`

**What exists**:

- `load_series(rides, today)` loops `for week in range(4)`. For each week, `end = today - 7*week days` and `start = end - 6 days`, both bounds inclusive ([`rides/store.py:17-20`](../../../rides/store.py)). It returns four counts, most recent week first.
- `load_series` covers `today - 27 days` through `today` (28 dates), which is 2026-10-01 through 2026-10-28 for `today` = Oct 28. It uses the literals `4`, `7` and `6`, not `WINDOW_DAYS`.
- Nothing in `rides/` calls `load_series`. Only `tests/test_load_series.py` uses it.
- `render_today_page` filters with `r["date"] == today` and renders only the distance ([`rides/views.py:14-17`](../../../rides/views.py)).

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

- `format_distance(km)` returns `f"{round(km, 1)} km"` ([`rides/view_model.py:4-6`](../../../rides/view_model.py)). Both page renderers call it (`rides/views.py:8`, `rides/views.py:16`).
- For an int, `round(5, 1)` returns `5`, so the output is `"5 km"` (asserted at `tests/test_view_model.py:9`).

### Check-in wizard

**Location**: `wizard/wizard.html`, `wizard/wizard.js`

**What exists**:

- A `<form id="checkin">` ([`wizard/wizard.html:4`](../../../wizard/wizard.html)) holds three fieldsets ([`wizard/wizard.html:5-19`](../../../wizard/wizard.html)):

  | # | `data-question` | Initially hidden | First answer | Second answer | Lines |
  | --- | --- | --- | --- | --- | --- |
  | 1 | `sleep` | no | Good (`data-value="good"`) | Poor (`poor`) | 5-9 |
  | 2 | `soreness` | yes | None (`none`) | Some (`some`) | 10-14 |
  | 3 | `mood` | yes | Up (`up`) | Flat (`flat`) | 15-19 |

- Every answer is a `<button type="button" data-value="…">`. The form has no inputs, no submit button, and no `aria-*`, `tabindex` or `autofocus` attributes. The `hidden` attribute is the only visibility mechanism, and the file has no CSS.
- The script is loaded by a classic `<script src="wizard.js"></script>` at the end of `<body>`, after the form, with no `defer`, `async` or `type="module"` ([`wizard/wizard.html:21`](../../../wizard/wizard.html)).
- `questions` (the `.question` fieldsets in document order) and `answers` (`{}`) are top-level `const` bindings ([`wizard/wizard.js:2-3`](../../../wizard/wizard.js)). Nothing is exported.

**Key code**:

```js
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

1. At load, one click listener is attached per button, six in total (`wizard/wizard.js:5-7`). There is no delegation and no listener on the form.
2. On click, the answer is stored under the question name (`wizard/wizard.js:8`). Clicking again overwrites it.
3. The clicked button's own fieldset is hidden (`wizard/wizard.js:9`).
4. The next fieldset, if there is one, is unhidden (`wizard/wizard.js:10-13`). On the last question (Mood), `questions[3]` is `undefined`. The answer is stored and Mood is hidden, so all three fieldsets end up hidden, and nothing else runs.
5. No statement in `wizard/` moves focus. After a click, the focused button is inside the fieldset that step 3 hides, and the script does nothing to focus the newly revealed fieldset or its buttons.

## Architecture Documentation

**Current patterns found**:

- Pages are built as f-strings with `"".join(...)` generators, with no templates or escaping.
  - Example: `rides/views.py:6-11`
  - Example: `rides/views.py:14-17`
- Date filters take `today` as an explicit parameter and use inclusive comparisons in list comprehensions.
  - Example: `rides/store.py:9-10`
  - Example: `rides/store.py:18-20`
- Display formatting lives in a separate module from the views: `rides/view_model.py:4-6`.
- The wizard advances steps by toggling the `hidden` property on sibling fieldsets indexed by position: `wizard/wizard.js:9-13`.

**Component connections**:

- `rides/views.py` → `rides/store.py`: ride selection
  - Entry point: `rides/views.py:9`
  - Exit point: `rides/store.py:11`
- `rides/views.py` → `rides/view_model.py`: distance text
  - Entry point: `rides/views.py:8`, `rides/views.py:16`
  - Exit point: `rides/view_model.py:6`
- `wizard/wizard.html` → `wizard/wizard.js`: the script tag at `wizard/wizard.html:21`. The script finds fieldsets by the `.question` class (`wizard/wizard.js:2`) and reads `data-question` and `data-value` (`wizard/wizard.js:8`).
- `wizard/` and `rides/` do not reference each other.

**Conventions observed**:

- The `rides/` package uses short noun module names: `store`, `view_model`, `views`. Functions are snake_case `verb_noun`, with `render_<name>_page` for pages. Constants are UPPER_SNAKE (`WINDOW_DAYS`).
- Signatures put `rides` before `today`.
- Functions and modules have one-line docstrings.
- JavaScript uses camelCase locals and `data-*` attributes for question and answer identity.
- Testing: see Testing Conventions below.

## Testing Conventions

These are facts about how tests are written and run here, with file:line references.

- **Frameworks and versions**: pytest, listed unpinned as `dev = ["pytest"]` (`pyproject.toml:7-8`). The installed version is pytest 9.1.1. Assertions are plain `assert`. There is no mocking library, lockfile or `package.json`. `requires-python = ">=3.10"` (`pyproject.toml:5`).
- **Commands**: fast and full are the same command, `python3 -m pytest -q`. pytest is configured with `testpaths = ["tests"]` and `pythonpath = ["."]` (`pyproject.toml:10-12`). The current result is `7 passed in 0.01s`.
- **Levels and harness per boundary**:
  - Python unit tests call functions directly: `tests/test_store.py`, `tests/test_load_series.py`, `tests/test_view_model.py`.
  - HTML rendering tests assert on the returned string, with no HTML parser: `tests/test_today_page.py:6-8`.
  - Browser/DOM: none. There is no jsdom, Playwright, Selenium, Jest or Vitest. No database, HTTP or queue boundary exists.
- **Fixtures vs factories**: neither is used, and there is no `conftest.py`. Test data is inline dict literals. A module constant `TODAY = date(2026, 10, 28)` is shared within a file (`tests/test_store.py:5`, `tests/test_load_series.py:5`). `tests/test_today_page.py:7` uses an inline `date(2026, 10, 28)`.
- **Seams and mocking patterns**: the only seam is the `today` parameter. Tests pass a fixed date instead of mocking a clock. There is no `monkeypatch` or `mock` usage.
- **Existing coverage of the areas in question**:
  - `tests/test_store.py:8-10`: a ride dated `TODAY` is listed.
  - `tests/test_store.py:13-15`: a ride dated 2026-08-01 is omitted.
  - `tests/test_store.py:18-21`: newest first.
  - No test uses a date near the window edge (2026-10-02, 2026-10-01 or 2026-09-30).
  - `tests/test_load_series.py:8-15` asserts only index 0 (count 3).
  - `render_rides_page` and `wizard/wizard.js` have no tests.
- **Skip markers**: none (0 `skip`/`xfail`).
- **Test-quality linters and profilers**: none installed or configured. There is no ruff, coverage, tox, `setup.cfg` or pre-commit configuration.
- **Mutation tool**: none installed.
- **Services the suite needs**: none. All tests run in-process on in-memory data.
- **Profile**: no profile (`.claude/wb/testing.md` does not exist).

## Code References

Quick reference list:

- `rides/store.py:4` - `WINDOW_DAYS = 27`
- `rides/store.py:7-11` - `list_rides`: cutoff, inclusive filter, newest-first sort
- `rides/store.py:14-21` - `load_series`: four 7-day weeks, literal constants
- `rides/views.py:6-11` - `render_rides_page`, the only caller of `list_rides`
- `rides/views.py:14-17` - `render_today_page`, exact-date filter
- `rides/view_model.py:4-6` - `format_distance`
- `wizard/wizard.html:5-19` - the three question fieldsets and their answer buttons
- `wizard/wizard.html:12` - Soreness's first answer, "None"
- `wizard/wizard.html:21` - script tag
- `wizard/wizard.js:7-14` - click handler: store, hide current, unhide next
- `tests/test_store.py:5-21` - `list_rides` tests
- `pyproject.toml:7-12` - pytest dependency and config

## Similar Implementations

Existing patterns in the codebase that might be relevant:

**Example from `rides/store.py:17-20`** (inclusive date range computed from `today` with `timedelta`):

```python
for week in range(4):
    end = today - timedelta(days=7 * week)
    start = end - timedelta(days=6)
    counts.append(len([r for r in rides if start <= r["date"] <= end]))
```

This pattern is also used in:

- `rides/store.py:9-10` - `list_rides` window
- `rides/views.py:15` - `render_today_page` (single-date equality instead of a range)

**Example from `tests/test_store.py:18-21`** (fixed `TODAY` constant, inline ride dicts, equality assertion):

```python
def test_lists_newest_first():
    older = {"date": date(2026, 10, 20), "km": 8.0}
    newer = {"date": date(2026, 10, 25), "km": 12.0}
    assert list_rides([older, newer], TODAY) == [newer, older]
```

No code in the repository sets or moves DOM focus. The `hidden` toggle at `wizard/wizard.js:9-13` is the only DOM state-change pattern.

## Open Questions

Open questions are tracked in beads, not in this document.

**To add a question**:

```bash
bd create "Q: [your question]" --type=task --priority=2 \
  -d "Research question. Blocks: [what can't proceed without this answer]"
```

**Active questions** (reference only, beads is the source of truth):

- None recorded by this research.

To see open questions: `bd list --status=open`

## Next Steps

Based on the research findings:

1. `list_rides` (cutoff at 26 days) and `load_series` (oldest date at 27 days) currently cover different spans, and `WINDOW_DAYS` is referenced only in `list_rides`. Design will need to decide whether the rides-page window is meant to relate to the `load_series` span.
2. No browser or JavaScript harness exists in the repository (see Testing Conventions). Design will need to decide how the wizard's focus behavior gets verified.
3. Review the research document.
4. Run `/wb:create_design` to create design decisions.
