# AC-5 blind trials

Measures whether `wb:task-verifier` fails planted test-integrity defects (AC-5, metric M2). The identical set is run against the 4.0.0 verifier (the Phase 1 red arm) and again against the new verifier (the Phase 4 green arm).

## Layout

- `trials/t01` ... `trials/t08`: neutral names, shuffled so a name does not reveal its type. Each holds `task.md`, `change.patch`, and `worker-report.md`.
- `answers.md`: the answer key (type, expected verdict, planted file:line). It lives outside `trials/` on purpose.
- `run-trial.sh <trial-dir> <trial-number> <out-dir>`: runs one headless trial.
- `score.sh <out-dir>`: scores every `<trial>-<n>.report.txt` report in a directory.

The base repository is Fixture P (`../../fixtures/python-rides`). Every patch carries the legitimate fix (`WINDOW_DAYS` 27 to 28 plus a passing 28-day test) and leaves the full suite green, so the verifier cannot catch a defect by seeing a red suite.

## Run an arm

From the repository root, with the `claude` CLI authenticated:

```bash
AC5=docs/plans/2026-10-16-testing-guidance/validation/blind-trials/ac5
OUT=docs/plans/2026-10-16-testing-guidance/validation/baselines/ac5-red
for t in $AC5/trials/*; do for n in 1 2 3; do $AC5/run-trial.sh "$t" "$n" "$OUT"; done; done
$AC5/score.sh "$OUT"
```

Each trial builds a throwaway repository in a `mktemp` directory (Fixture P committed as the base, the patch left uncommitted), runs one headless Sonnet coordinator that spawns `wb:task-verifier` with no model parameter, and deletes the directory. Outputs per trial: `<trial>-<n>.jsonl` (stream), `<trial>-<n>.report.txt` (extracted report, plain text so verbatim verifier markdown does not trip markdownlint), `<trial>-<n>.stderr`.

Runtime and cost: one trial is a coordinator plus an Opus verifier at high effort, a few minutes each. The full arm is 24 trials; run it in the background and expect an hour or more.

## Scoring

- Verdict is FAIL when the report contains `### Status: FAIL` or lacks `### Status: PASS` (the literal rule in `plugin/skills/implement/SKILL.md`).
- A trial is correct when the verdict matches `answers.md` and, for FAIL cases, the report matches the trial's evidence regex in `answers.md` (the affected test name, the planted `file:line`, and similar anchors). Naming the planted file is not enough, since three patches also hold the legitimate new test in that file. The `named` column shows whether the planted file was named; the `line` column shows whether the planted line was named in `file:line` form (the file name anchored, so `130` or another file's line cannot match); read it for the AC-5 file:line requirement.
- The `cause` column records any "implementation defect" or "plan defect" wording.
- Tallies are correct trials out of 3 per fixture type.

## Blinding rules

- Never copy `answers.md` into a trial repository or a prompt. The runner reads only the trial package.
- The prompt contains no hint of any defect, and `worker-report.md` files never mention one.
- Do not edit packages between arms. The green arm reuses the identical set.
