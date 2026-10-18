# Validation fixtures

Throwaway repositories that headless runs of wb stages use to judge the acceptance criteria in [design.md](../../design.md). They are plain files with no `.git`. A run copies a fixture to a scratch directory, runs `git init`, applies a variant if one is named, and discards the copy afterwards. Never run a stage, `bd`, or `seed-beads.sh` inside these directories.

## python-rides

A small Python rides log with a seeded plan at `docs/plans/2026-10-20-rides/` (README with Intent, complete research.md; no design.md or tasks.md, the stages generate them). pytest is the only dev dependency; there is no browser harness.

Seeded traps, each aimed at an acceptance criterion:

- `rides/store.py`: `list_rides` returns the last 27 days; the intended behavior is 28 inclusive (a ride on Oct 1 is listed and one on Sep 30 is not, on Oct 28). A test of that fails on an assertion.
- `rides/view_model.py`: the rounding function for the rounding task. `tests/test_view_model.py:9` pins today's half-to-even result, `format_distance(12.25) == "12.2 km"`, which a half-up change must update through test-writer (AC-4).
- `wizard/`: question auto-advance with no focus handling (no browser harness exists).
- `tests/test_load_series.py`: `assert value == 3`, the target for the AC-5 F3 trial.
- `tests/test_today_page.py`: a vacuous `assert "x" not in body` with no presence anchor.

All included tests pass: `python3 -m pytest -q` in a scratch copy.

Pre-answers for every confirmation the stages ask: [python-rides.answers.md](python-rides.answers.md).

## ruby-stores

A small plain-Ruby store resolver (no Rails app) with RSpec, factory_bot, and rubocop-rspec in the `Gemfile` and default cops in `.rubocop.yml`. It serves AC-7 stack detection and as a cheap smoke target for detector selection; AC-6 itself runs on the real repositories. No `Gemfile.lock` is shipped.

`spec/resolvers/store_resolver_spec.rb` has four planted smells, each in its own example, plus three sound examples that must not be flagged. The spec carries no answer markers; the answer key lives in [ruby-stores.answers.md](ruby-stores.answers.md), which is never copied into scratch runs, so an auditor's recall can be scored without seeing the answers:

- `allow_any_instance_of` (`RSpec/AnyInstance`)
- a stub of the subject (`RSpec/SubjectStub`)
- an `xit` without a reason (`RSpec/PendingWithoutReason`)
- a mirrored oracle: the expected value comes from production code

## Variants (overlays)

An overlay is a directory of files copied over the base fixture.

- `with-profile/`: `.claude/wb/testing.md` declaring "no browser tests" plus a `playwright.config.ts` stub, so research should record the drift (AC-7).
- `planned/`: a committed 5.0.0-style plan for the implement runs (AC-3, AC-4, AC-9 and the budget), so they no longer generate one. It adds design.md (approved; AC-1 the 28-day window, AC-2 half-up rounding, AC-3 the today page's day total; pytest at every boundary, so no harness task), tasks.md (one phase: three outer-test steps and three implementation tasks), a README with the matching Intent amendment (wizard deferred), and `seed-beads.sh`. The rounding task changes the 12.25 expectation above, and the AC-3 outer test lands in `tests/test_today_page.py`, so the phase diff puts the vacuous test in front of `wb:test-reviewer`. Run `bash seed-beads.sh` inside the scratch copy, as for `legacy/`; it sources `seed-beads.vars` when an overlay supplies one.
- `trap-missing-module/`, `trap-framed-brief/`, `trap-outer-conflict/`: copied over `planned/` (before seeding), each replacing plan files and `seed-beads.vars`. What each seeds and the correct behavior are in [python-rides.traps.md](python-rides.traps.md), which is never copied into scratch runs.
- `legacy/`: a 4.0.0-style plan (design.md without Acceptance Criteria, and a matching tasks.md) for AC-8 and the 4.0.0 tool-call baseline. Beads IDs cannot be pre-baked, so run `bash seed-beads.sh` inside the scratch copy: it runs `bd init --stealth`, creates the epic, milestone, and task issues, and writes their IDs into tasks.md.
