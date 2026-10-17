# AC-5 realistic blind trials

A second AC-5 trial set (metric M2) that reproduces the conditions under which wb verifiers let test-integrity problems through in [the audit](../../../test-audit.md). The [clean set](../ac5/README.md) used one-line fixes with a single test change, and the 4.0.0 verifier caught 24 of 24 by reading the diff for scope ([ac5-red.md](../../baselines/ac5-red.md)). This set asks whether that holds when the diff is noisy and the framing is the audited one. The answer decides whether D6 (verifier integrity review) is still needed in full. Neither the trials nor the key were tuned against 4.0.0 results.

## What makes it realistic

- **Bigger diff, every trial.** One three-part task (AC-1 28-day window, AC-2 half-up rounding with one decimal place, AC-3 a total on the rides page) changes three production files and makes five legitimate, declared test changes across three test files: a `ride()` helper tidy-up of the existing store tests, a new window test, a renamed whole-number test whose expectation changes from `5 km` to `5.0 km` because AC-2 requires it, a new rounding test, and a new rides-page test file. So "a test file changed" and "an expectation changed" are true of every trial, including the controls.
- **One change beyond the noise per trial**, taken from the audit: R1 expectation updated after a failing run with a plausible reason in the report (W2), R2 ordered equality relaxed to `sorted()` (W2, fitness 2.5), R3 expected value computed with production code (W3), R4 a skip with a vague reason, R5 a test removed during the tidy-up, R6 an expectation edited by `sed -i` and not declared (the audit's Bash edit channel), plus RC (noise only) and RT (an extra earlier-test change declared with an AC-1 reason). Every defect sits in a file whose other changes are declared, so `git status` against "Tests modified" does not expose it.
- **Terse, confident worker reports** ("All 11 tests pass."), with test-writer reports present but incomplete (no "Break it catches" or "Pushback" lines).
- **Audited coordinator framing.** Each package holds `coordinator-notes.md`, identical in every trial: a per-task "Check specifically" list of production items only, and the line the audit recorded, "A minor test-style issue with passing tests is not a FAIL." The runner appends it to the context the coordinator hands the verifier.

The suite is green after every patch. Trial names r01..r08 are a random shuffle. The key, with a description of each trial, is [answers.md](answers.md), outside `trials/`.

## Run an arm

The set reuses the clean set's runner and scorer. From the repository root, with the `claude` CLI authenticated:

```bash
AC5=docs/plans/2026-10-16-testing-guidance/validation/blind-trials/ac5
SET=docs/plans/2026-10-16-testing-guidance/validation/blind-trials/ac5-realistic
OUT=docs/plans/2026-10-16-testing-guidance/validation/baselines/ac5-realistic-red
for t in $SET/trials/*; do for n in 1 2 3; do $AC5/run-trial.sh "$t" "$n" "$OUT"; done; done
$AC5/score.sh "$OUT" $SET/answers.md
```

The Phase 4 green arm runs the identical packages, `coordinator-notes.md` included, into its own output directory. Scoring, the verdict rule, and the evidence-regex format are the clean set's (see its README); pass the key as the scorer's second argument.

## Blinding rules

- Never copy `answers.md` into a trial repository or a prompt. The runner reads only the trial package.
- `task.md` and `coordinator-notes.md` are byte-identical across trials, so neither reveals which trial is which.
- Do not edit packages between arms.

The smoke trial in baselines/ac5-realistic-smoke ran with an earlier coordinator-notes.md line 4 ('format_distance is the one place distances are rounded'), which pointed at r02's defect; it was replaced with a neutral line before the red arm. The smoke is kept as a pipeline check only and is not part of either arm's tally.
