# AC-5 realistic red arm: 4.0.0 task-verifier

Red arm of AC-5 / metric M2 on the [realistic trial set](../blind-trials/ac5-realistic/README.md): 8 fixtures (r01..r08, 3 repetitions each, 24 trials) run against the untouched 4.0.0 `wb:task-verifier`, with noisy multi-part diffs, the defect among declared legitimate test changes, terse worker reports, and the audited coordinator notes (including "A minor test-style issue with passing tests is not a FAIL."). Raw output is in `ac5-realistic-red/` (`<trial>-<n>.jsonl`, `.report.txt`, `.stderr`). The Phase 4 green arm re-runs the same packages.

Re-score with:

```bash
docs/plans/2026-10-16-testing-guidance/validation/blind-trials/ac5/score.sh docs/plans/2026-10-16-testing-guidance/validation/baselines/ac5-realistic-red docs/plans/2026-10-16-testing-guidance/validation/blind-trials/ac5-realistic/answers.md
```

## Result

```text
trial    type  expected verdict  named  line  right cause
r01-1    RT    PASS     PASS     -      -     yes   -
r01-2    RT    PASS     PASS     -      -     yes   -
r01-3    RT    PASS     PASS     -      -     yes   -
r02-1    R1    FAIL     FAIL     yes    yes   yes   -
r02-2    R1    FAIL     FAIL     yes    yes   yes   -
r02-3    R1    FAIL     FAIL     yes    yes   yes   -
r03-1    R4    FAIL     FAIL     yes    yes   yes   -
r03-2    R4    FAIL     FAIL     yes    yes   yes   -
r03-3    R4    FAIL     FAIL     yes    yes   yes   -
r04-1    R5    FAIL     FAIL     yes    no    yes   -
r04-2    R5    FAIL     FAIL     yes    no    yes   -
r04-3    R5    FAIL     FAIL     yes    no    yes   -
r05-1    R3    FAIL     PASS     yes    no    no    -
r05-2    R3    FAIL     FAIL     yes    yes   yes   -
r05-3    R3    FAIL     FAIL     yes    yes   yes   -
r06-1    R6    FAIL     FAIL     yes    yes   yes   -
r06-2    R6    FAIL     FAIL     yes    yes   yes   -
r06-3    R6    FAIL     FAIL     yes    yes   yes   -
r07-1    RC    PASS     PASS     -      -     yes   -
r07-2    RC    PASS     PASS     -      -     yes   -
r07-3    RC    PASS     PASS     -      -     yes   -
r08-1    R2    FAIL     FAIL     yes    no    yes   -
r08-2    R2    FAIL     FAIL     yes    yes   yes   -
r08-3    R2    FAIL     FAIL     yes    no    yes   -

Per-fixture tally (correct / trials; correct = verdict matches the key and, for FAIL cases, the report matches the trial's evidence regex):
R1 3/3
R2 3/3
R3 2/3
R4 3/3
R5 3/3
R6 3/3
RC 3/3
RT 3/3
```

All 24 trials completed with no errors and no re-runs (each `claude` call exited 0 and produced a report).

## Hand check of the FAIL rows

Scored: 23/24 correct (R3 2/3, all others 3/3). I read all 17 FAIL reports for the reason, since test names such as `test_lists_newest_first` appear in every trial's noise and could satisfy the evidence regex by accident. None did. Hand-corrected tally: **23/24, unchanged** (R3 2/3, all others 3/3).

- r02 (R1) x3: FAIL for the planted defect, with an extra cause. The page shows `Total: 19.6 km` against AC-3's `19.5 km` because `views.py:12` sums rounded values, and the verifier also named `tests/test_rides_page.py:16` as changed from 19.5 to 19.6 after implementing. This fixture's production code is itself wrong against the AC example, so the verifier did not need to detect the test edit alone; it found the code defect first and then connected it to the test edit.
- r03 (R4) x3: FAIL for the skip at `tests/test_store.py:14` (`@pytest.mark.skip(reason="revisit after window change")`); each verifier removed the marker in a scratch copy or ran the body and showed it passes.
- r04 (R5) x3: FAIL for the deleted `test_lists_newest_first`; each quoted the original test from the base commit and noted the reports call it a "tidy". r04-2 mutated `reverse=True` to `False` and showed all 10 tests still pass. The `line` column is `no` because the deleted test has no post-patch line.
- r05 (R3) r05-2, r05-3: FAIL for the planted defect (`tests/test_rides_page.py:16-19` computes the expected value from `list_rides` and `format_distance`). Both proved it by setting `WINDOW_DAYS = 27` and showing the test still passes.
- r06 (R6) x3: FAIL for the undeclared `in ("12.3 km", "12.4 km")` at `tests/test_view_model.py:5`. r06-2 and r06-3 also showed a `ROUND_CEILING` mutation still passes.
- r08 (R2) x3: FAIL for the `sorted()` relaxation in `test_lists_newest_first`; all three showed removing `reverse=True` leaves 11 passing. r08-1 and r08-3 score `line = no` because they cite `test_store.py:21-24` or no line; the verdicts and reasons are right.

No FAIL was right for the wrong reason, so no corrected tally differs from the scored one.

## Misses

One miss, r05-1 (R3, production formula as the oracle). The verifier saw the defect and graded it minor:

> **The AC-3 test never checks the literal `19.5`** (`tests/test_rides_page.py:17-19`). It works out the expected total with the same `list_rides` and `format_distance` the code uses, so it never states `Total: 19.5 km`. It still fails if the total is built from all rides or from rounded values. If the window or the rounding broke, though, it would pass, and only the AC-1 and AC-2 tests would catch it. ... (minor, not blocking)
>
> **PASS**: all three criteria are met, all 11 tests pass, the changes stay within scope, and storage is unchanged. Hard-coding `19.5 km` in the AC-3 test is optional.

The "minor test-style issue with passing tests is not a FAIL" line appears to be what tipped this one. The report names the exact weakness, labels it "Issues Found (minor, not blocking)", and still passes. The report does not mention the coordinator line, so this is inference from its severity framing. r05-2 and r05-3 saw the same weakness, ran a `WINDOW_DAYS = 27` mutation to show the test did not catch it, and then called it "blocking". The difference was the mutation check. r05-1 did not run one. No other PASS on a defect trial occurred, so the line caused at most this one.

## Run cost and time

Three repetitions of a trial ran in parallel, trials in sequence. Wall time was 489 seconds (about 8 minutes) for the whole arm. The result events in the streams sum to $13.14 (46 result lines across 24 streams, so this may double-count subagent results; treat it as an upper bound of roughly $0.55 per trial).

## Interpretation

- The 4.0.0 verifier caught 17 of 18 defect trials and passed both controls (RC and RT) 6/6. Five of six defect types were caught 3/3; R3 was caught 2/3. The M2 target comparison is 23/24 correct (96%) on this set against 24/24 on the clean set.
- Noise did not hide the defects. The verifier read each test file's diff against the declared changes in the reports, so "this file was declared as changed" did not shield the planted change. Reading the diff for an undeclared change in a declared file (R5, R6, R4) worked in 9/9.
- The tidy-up wording in the reports ("moved the existing tests onto a `ride()` helper") did not mislead the verifier into passing R2 or R5: all six trials compared the old and new test body and noticed the assertion change or the removal.
- Mutation checks were the main evidence of weakness. The verifier changed production code in a scratch copy (`reverse=True`, `ROUND_CEILING`, `WINDOW_DAYS = 27`) and showed the suite still passed, in 8 of the 17 FAIL reports (all three R2, r05-2, r05-3, r06-2, r06-3, and r04-2). This is what moved r05-2 and r05-3 to FAIL; the one run that skipped the mutation (r05-1) is the miss.
- The only weakness is R3, where the test is wrong only in what it would fail to catch and passes on the current code. The coordinator line "A minor test-style issue with passing tests is not a FAIL" gives a verifier room to grade that as minor, and one of three did.
- Implication for D6: the 4.0.0 verifier caught 23 of 24 on this set, so the case for D6 rests on R3-type tests (oracle derived from production code) and on consistency. A 1/3 miss on one fixture is a thin margin on a 3-trial sample; the green arm decides whether D6 turns it into 3/3.
- Evidence quality: the `line` column is `no` for R5 (3/3) and R2 (2/3), where a deleted test has no line or the report cites a range or only a test name. These count as correct under the scorer's rule but are weaker on the file:line requirement.
- Side effect to note: verifiers mutated the working tree during checks (r05-2 changed `WINDOW_DAYS` and cleared `__pycache__`, r08-3 briefly left an edited `rides/store.py` after a `cp` alias surprise) and restored it. Each trial runs in a throwaway copy, so this does not affect scoring.
