# Phase 3 validation: AC-1, AC-2, AC-7 (bead prompts-0wy4)

Plugin at HEAD cbd1c46. Fixture python-rides, driven by a chain script (`research -> design -> tasks` in one scratch copy; the stock `run-headless.sh` runs one stage per scratch copy and cannot chain). Pre-answers from `validation/prompts/`; the manual variant swaps only the harness answer. Each run's check output, design.md, tasks.md and research.md are under `runs/phase3/<run-id>/`; transcripts were not kept.

## Runs

Cost is the last `total_cost_usd` reported per stage, summed; duration is the last reported `duration_ms` per stage (stage durations in seconds, in order). No infrastructure retries were needed.

| Run | Variant | Check | Verdict | Failing clause | Cost (USD) | Stage durations (s) |
| ----- | --------- | ------- | --------- | ---------------- | ----------- | --------------------- |
| add-1 | add harness, research+design+tasks | ac1, ac2 | PASS, PASS | none | 3.68 | 66, 67, 240 |
| add-2 | add harness, research+design+tasks | ac1, ac2 | PASS, PASS | none | 3.64 | 76, 76, 144 |
| add-3 | add harness, research+design+tasks | ac1, ac2 | PASS, PASS | none | 3.78 | 70, 95, 274 |
| manual-1 | manual, design+tasks (seeded research) | ac2 | PASS | none | 3.00 | 58, 108 |
| drift-1 | with-profile, research | ac7 | FAIL | research.md lists drift between profile and code | 0.88 | 136 |
| drift-2 | with-profile, research | ac7 | FAIL | research.md lists drift between profile and code | 0.92 | 66 |
| drift-3 | with-profile, research | ac7 | FAIL | research.md lists drift between profile and code | 0.93 | 72 |
| bloat-1 | design only, one-line bug fix | manual count | 1 criterion | n/a | 0.79 | 48 |

Total cost about 17.6 USD.

## AC verdicts against the pass bar

- AC-1: PASS, 3 of 3 repeats (bar: at least 2 of 3).
- AC-2: PASS, 3 of 3 add-harness repeats (harness task precedes the focus criterion's outer test; every non-manual criterion has an outer-test line) and PASS on the manual variant (no UI harness task).
- AC-7: FAIL, 0 of 3 repeats on the drift clause (bar: at least 2 of 3). The other three ac7 clauses pass in every repeat: Testing conventions section present, profile `.claude/wb/testing.md` cited, Playwright named.

## AC-7 failure evidence and classification

The only failing clause is `grep -Eiq 'drift'` on research.md. All three research.md files record the profile-versus-code difference in substance, without the word "drift". Example, drift-1 `research.md`, Testing Conventions, Profile bullet:

> It differs on browser tests: line 9 says "No browser tests. The wizard is checked by hand.", while `playwright.config.ts` exists in the repo root (with no `e2e/` tests, no Node package manifest, and no server behind it).

drift-2: "The profile and the code differ in one place: `playwright.config.ts` exists at the repository root, but the profile does not mention it." drift-3 is in the same form.

The create_research template (`plugin/skills/create_research/templates.md:99`) and sub-agent prompt (`sub-agent-prompts.md:60`) instruct "record where it and the code differ" and never use the word "drift", so the model cannot be expected to emit it. Classification: check-script defect (ac7.sh is over-literal: it greps for a word the prompt never asks for), with a secondary option that the coordinator may prefer to make the template say "drift" explicitly so the plan's AC-7 wording ("records the drift") and the prompt agree. Behaviorally the AC is met. Either loosen the grep (for example `drift|differ`) or add the word to the template; this task changed neither.

## Criteria-bloat check

Design for a one-line bug fix (28-day-old ride dropped): exactly 1 acceptance criterion (AC-1: the rides page includes the oldest day of the 28-day window and excludes the day before it). Expected count 1. Matches.

## Design for the user to read at the checkpoint

`docs/plans/2026-10-16-testing-guidance/validation/results/runs/phase3/add-1-design.md` (copy of `add-1/plans/2026-10-20-rides/design.md`, the add-harness chain). Matching tasks.md is at `runs/phase3/add-1/plans/2026-10-20-rides/tasks.md`.

## Re-grade of AC-7 after a check-script fix (coordinator, 2026-10-17)

The AC-7 drift clause failed 0/3 because `checks/ac7.sh` grepped research.md for the literal word "drift". All three research files record the profile-versus-code difference in substance, on the template's Profile line. For example, drift-1:180: "It differs on browser tests: line 9 says 'No browser tests…', while `playwright.config.ts` exists in the repo root (with no `e2e/` tests, no Node package manifest, and no server behind it)". The template asks research to "record where it and the code differ" and never says "drift", so the check tested a word, not the behavior.

Fix: the clause now requires the `**Profile**` line to state a difference (`drift` or `differ`). Re-grading the three existing outputs needed no new runs:

| Run | ac7 (re-graded) |
| --- | --- |
| drift-1 | PASS (4/4 clauses) |
| drift-2 | PASS (4/4 clauses) |
| drift-3 | PASS (4/4 clauses) |

Negative controls on a copy of drift-1:

- a Profile line that says the profile matches the code: FAIL;
- no Profile line at all: FAIL.

So the clause still separates a run that records drift from one that doesn't. Each run's re-grade output is in `runs/phase3/drift-N/ac7-regrade.txt`.

**Revised AC-7 verdict**: PASS, 3 of 3 (bar: at least 2 of 3).

`runs/phase3/chain.sh` is the worker's chain driver. `run-headless.sh` runs one stage per scratch copy, so the chain was scripted separately. It is saved here so the runs can be reproduced; it references the session's tmp paths.
