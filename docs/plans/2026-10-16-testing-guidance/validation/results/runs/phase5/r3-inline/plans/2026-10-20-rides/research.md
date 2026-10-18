---
project: rides
ticket: null
created: 2026-10-20
status: complete
last_updated: 2026-10-20
---

# Research: Rides Window and Check-in Focus

**Created**: 2026-10-20
**Last Updated**: 2026-10-20
**Ticket**: N/A

## Research Question

How does the rides page choose which rides to show, and how does the check-in wizard advance between questions?

## Summary

The rides page is built as an HTML string in `rides/views.py`. It lists rides through `list_rides` in `rides/store.py`, which keeps rides inside a window set by the constant `WINDOW_DAYS = 27`. The window start is computed as today minus `WINDOW_DAYS - 1` days, so the oldest listed ride is 26 days before today.

Distances are shown through `format_distance` in `rides/view_model.py`, which rounds to one decimal with Python's built-in `round`. The check-in wizard is static HTML plus a script: a click on an answer hides the current question and unhides the next one, and no code sets focus.

Tests run with pytest only. There is no browser test harness, no Playwright or Selenium configuration, and no test of the wizard.

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**: "a ride from 27 days before today is listed" — the window constant and cutoff in `rides/store.py:4-9`; "the next question is visible and keyboard focus is on its first answer" — the click handler in `wizard/wizard.js:6-16`
- **Statements the findings do not touch**: none

## Detailed Findings

### Rides window

**Location**: `rides/store.py`

**What exists**:

- `WINDOW_DAYS = 27` ([`rides/store.py:4`](rides/store.py))
- `list_rides(rides, today)` computes `cutoff = today - timedelta(days=WINDOW_DAYS - 1)` and keeps rides with `cutoff <= date <= today`, newest first ([`rides/store.py:7-11`](rides/store.py))
- `load_series(rides, today)` counts rides per week for four weeks ([`rides/store.py:14-21`](rides/store.py))

**How it works**:

1. `render_rides_page` in `rides/views.py:6-11` calls `list_rides` and renders one `<li class="ride">` per ride.
2. With `today` = Oct 28, the cutoff is Oct 2, so a ride on Oct 1 is not listed.

### Distance display

**Location**: `rides/view_model.py`

**What exists**:

- `format_distance(km)` returns `f"{round(km, 1)} km"` ([`rides/view_model.py:4-6`](rides/view_model.py))
- `render_rides_page` and `render_today_page` both call it ([`rides/views.py:8`](rides/views.py), [`rides/views.py:16`](rides/views.py))

### Check-in wizard

**Location**: `wizard/`

**What exists**:

- Three `fieldset.question` elements; the second and third start `hidden` ([`wizard/wizard.html:5-19`](wizard/wizard.html))
- A click handler per answer button stores the value, hides the current question, and unhides the next ([`wizard/wizard.js:6-16`](wizard/wizard.js))
- No call to `focus()` and no `tabindex` handling anywhere in `wizard/`

## Architecture Documentation

**Current patterns found**:

- Pages are plain string builders: `rides/views.py:6-17`
- Display formatting lives in `rides/view_model.py`, separate from the views

**Component connections**:

- `rides/views.py` → `rides/store.py`: listing (`rides/views.py:9`)
- `rides/views.py` → `rides/view_model.py`: distance text (`rides/views.py:8`)

**Conventions observed**:

- A ride is a dict with `date` and `km` keys.

## Open Questions

- None.
