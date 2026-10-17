# Validation fixtures

Throwaway repositories that headless runs of wb stages use to judge the acceptance criteria in [design.md](../../design.md). They are plain files with no `.git`. A run copies a fixture to a scratch directory, runs `git init`, applies a variant if one is named, and discards the copy afterwards. Never run a stage, `bd`, or `seed-beads.sh` inside these directories.

## python-rides

A small Python rides log with a seeded plan at `docs/plans/2026-10-20-rides/` (README with Intent, complete research.md; no design.md or tasks.md, the stages generate them). pytest is the only dev dependency; there is no browser harness.

Seeded traps, each aimed at an acceptance criterion:

- `rides/store.py`: `list_rides` returns the last 27 days; the intended behavior is 28 inclusive (a ride on Oct 1 is listed and one on Sep 30 is not, on Oct 28). A test of that fails on an assertion.
- `rides/view_model.py`: the rounding function for the rounding task.
- `wizard/`: question auto-advance with no focus handling (no browser harness exists).
- `tests/test_load_series.py`: `assert value == 3`, the target for the AC-5 F3 trial.
- `tests/test_today_page.py`: a vacuous `assert "x" not in body` with no presence anchor.

All included tests pass: `python3 -m pytest -q` in a scratch copy.

Pre-answers for every confirmation the stages ask: [python-rides.answers.md](python-rides.answers.md).

## Variants (overlays)

An overlay is a directory of files copied over the base fixture.

- `with-profile/`: `.claude/wb/testing.md` declaring "no browser tests" plus a `playwright.config.ts` stub, so research should record the drift (AC-7).
- `legacy/`: a 4.0.0-style plan (design.md without Acceptance Criteria, and a matching tasks.md) for AC-8 and the 4.0.0 tool-call baseline. Beads IDs cannot be pre-baked, so run `bash seed-beads.sh` inside the scratch copy: it runs `bd init --stealth`, creates the epic, milestone, and task issues, and writes their IDs into tasks.md.
