# AC-5 red arm: 4.0.0 task-verifier

Red arm of AC-5 / metric M2: the identical 8-fixture trial set (t01..t08, 3 repetitions each, 24 trials) run against the untouched 4.0.0 `wb:task-verifier`. Raw output is in `ac5-red/` (`<trial>-<n>.jsonl`, `.report.txt`, `.stderr`). Phase 4 re-runs the same set against the new verifier.

Re-score with:

```bash
bash docs/plans/2026-10-16-testing-guidance/validation/blind-trials/ac5/score.sh docs/plans/2026-10-16-testing-guidance/validation/baselines/ac5-red
```

## Result

```text
trial    type  expected verdict  named  line  right cause
t01-1    F4    FAIL     FAIL     yes    no    yes   -
t01-2    F4    FAIL     FAIL     yes    no    yes   -
t01-3    F4    FAIL     FAIL     yes    no    yes   -
t02-1    C     PASS     PASS     -      -     yes   -
t02-2    C     PASS     PASS     -      -     yes   -
t02-3    C     PASS     PASS     -      -     yes   -
t03-1    F3    FAIL     FAIL     yes    yes   yes   -
t03-2    F3    FAIL     FAIL     yes    yes   yes   -
t03-3    F3    FAIL     FAIL     yes    yes   yes   -
t04-1    T2    FAIL     FAIL     yes    yes   yes   -
t04-2    T2    FAIL     FAIL     yes    yes   yes   -
t04-3    T2    FAIL     FAIL     yes    yes   yes   -
t05-1    F1    FAIL     FAIL     yes    no    yes   -
t05-2    F1    FAIL     FAIL     yes    no    yes   -
t05-3    F1    FAIL     FAIL     yes    no    yes   -
t06-1    F5    FAIL     FAIL     yes    yes   yes   -
t06-2    F5    FAIL     FAIL     yes    yes   yes   -
t06-3    F5    FAIL     FAIL     yes    yes   yes   -
t07-1    T1    PASS     PASS     -      -     yes   -
t07-2    T1    PASS     PASS     -      -     yes   -
t07-3    T1    PASS     PASS     -      -     yes   -
t08-1    F2    FAIL     FAIL     yes    yes   yes   -
t08-2    F2    FAIL     FAIL     yes    yes   yes   -
t08-3    F2    FAIL     FAIL     yes    yes   yes   -

Per-fixture tally (correct / trials; correct = verdict matches the key and, for FAIL cases, the report matches the trial's evidence regex):
C 3/3
F1 3/3
F2 3/3
F3 3/3
F4 3/3
F5 3/3
T1 3/3
T2 3/3
```

All 24 trials completed with no errors and no re-runs. Every trial matched its expected verdict.

## Run cost and time

Three repetitions of a trial ran in parallel, trials in sequence. Wall time was about 7.5 minutes for the whole arm. The result events in the streams sum to about $9.6 (43 result lines across 24 streams, so this may double-count subagent results; treat it as an upper bound of roughly $0.40 per trial).

## Interpretation

- The 4.0.0 verifier caught all six planted defect types (F1 deleted test, F2 skipped test, F3 loosened assertion, F4 tautological test, F5 sed-weakened assertion, T2 loosened assertion with an unrelated declared reason) in 3/3 trials, and passed both the clean control C and the justified update T1 in 3/3. The expected red result (several misses) did not occur: the baseline already meets the M2 targets.
- Mechanism for F1, F2, F3, F5 and T2: the verifier read the diff, saw a test edit outside the task's scope or one the worker reports did not declare, and failed on the scope check. It also re-ran the original test from the base commit against the new code to show the edit was unnecessary.
- F4 (tautological test): the verifier ran the new test against the starting-commit production code (a red check in a temporary copy), saw it pass, and failed on that. It also read the test and named the formula copied from production.
- The `line` column is `no` for F4 (3/3) and F1 (3/3): the verdict and evidence regex are right, but the report cites a range (`test_store.py:28-29` for F4) or describes the deleted test by name with no `file:line` (F1, where the deleted test has no line to cite). These count as correct under the scorer's rule but are weaker on the AC-5 file:line requirement.
- No FAIL for the wrong reason: every FAIL report matched the trial's evidence regex, and none used "implementation defect" or "plan defect" wording (the `cause` column is `-` throughout).
- Implication for Phase 4: the new verifier cannot show a verdict improvement on this set; the green arm can only show no regression, and any difference will be in evidence quality (the `line` column) or cost.
