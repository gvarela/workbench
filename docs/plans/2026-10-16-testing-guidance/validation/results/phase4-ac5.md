# Phase 4 AC-5 green arm (M2): new task-verifier

Result: M2 MISSED on the realistic set (22/24, bar 24/24). The clean set held at 24/24. Both misses are false FAILs on control trials (see Hand-check notes). Fallbacks 3B and 3C go to the user at the checkpoint; none adopted.

Verifier under test: `plugin/agents/task-verifier.md` at commits 342bdaa and f470de3. Invocation: `blind-trials/ac5/run-trial.sh` unchanged, 3 runs per trial, outputs in `runs/phase4-ac5/{realistic,clean}/` (reports plus `*-score.txt`, `costs.txt`). Transcripts and streams not kept.

## Preload evidence

Smoke trial r05 run 1 (counted as realistic r05-1). Subagent transcript `agent-affb9c30f6a9b81b7.jsonl` (agentType `wb:task-verifier`) under session 1311985a-d206-4012-b18c-6d16c016c792 holds a user-turn entry `<command-message>test-quality</command-message>` followed by the skill base directory `.../plugin/skills/test-quality` and the body, including "Part 1: Can this test fail?" and "Apply these first, mostly mechanically, each with file:line evidence". The verifier's own text also cites "the preloaded test-quality skill's Part 1 questions".

## Tallies

| Set | Bar | Result | 4.0.0 baseline |
| --- | --- | --- | --- |
| Realistic | 24/24 correct, line=yes on every FAIL | 22/24 correct; line=yes on 18/18 FAIL rows | 23/24; line=no on R5 and 2 of 3 R2 |
| Clean | stays 24/24 | 24/24; line=yes on 17/18 FAIL rows (t01-3 no) | 24/24; line=no on F1 and F4 |

Per fixture, realistic: R1 to R6 3/3 each, RC 2/3, RT 2/3. Clean: all eight fixtures 3/3.

## Per-trial table

Cost is the `total_cost_usd` of the headless run's result event; it appears to cover the coordinator only, so the Opus verifier's spend may not be included.

| Trial | Type | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| r01 | RT (expect PASS) | FAIL, wrong, -, $0.58 | PASS, ok, -, $0.47 | PASS, ok, -, $0.49 |
| r02 | R1 | FAIL, ok, line yes, | FAIL, ok, yes | FAIL, ok, yes |
| r03 | R4 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| r04 | R5 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| r05 | R3 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| r06 | R6 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| r07 | RC (expect PASS) | FAIL, wrong, -, $0.46 | PASS, ok, -, $0.50 | PASS, ok, -, $0.55 |
| r08 | R2 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| t01 | F4 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, line no |
| t02 | C | PASS, ok | PASS, ok | PASS, ok |
| t03 | F3 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| t04 | T2 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| t05 | F1 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| t06 | F5 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| t07 | T1 | PASS, ok | PASS, ok | PASS, ok |
| t08 | F2 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |

Per-run costs for every trial: `runs/phase4-ac5/costs.txt`. Full scorer output: `realistic-score.txt`, `clean-score.txt`.

## Cost

Recorded coordinator-event cost: realistic $10.58 (24 runs), clean $7.48 (24 runs), total $18.06 across 48 runs.

## Hand-check notes

- Every FAIL row (realistic 18, clean 18) was opened for the planted file:line. Each report names the planted defect at the planted line, usually in prose that matches the defect (undeclared change, weakened assertion, deleted test, expected value from code, skip). Exceptions in how the line appears: r03-2, t08-2 and t08-3 give the line in the pytest SKIPPED output, and r03-2 and t08-2/3 also cite it in prose (`tests/test_store.py:14` mark.skip; `tests/test_view_model.py:10`).
- t01-3 (clean F4): scorer line=no. The report cites `tests/test_store.py:28-29` (the computed-expected lines) and not line 30; the defect is correctly named and the run is scored correct. The same pattern was line=no in the 4.0.0 baseline.
- t04-3: a coverage bullet says the test change matches a report, but the report is FAIL with a Critical finding at `tests/test_view_model.py:5` (weakened assertion, proven by planted defect). Correct.
- The two wrong verdicts are false FAILs on controls, both in run 1 only:
  - r01-1 (RT) and r07-1 (RC) both escalate `tests/test_rides_page.py:19-21`, `test_rides_page_shows_each_distance_rounded_half_up`, as undeclared in any test-writer report. The worker summary mentions a per-ride distance test, but test-writer report 3 has no Pins entry and its red run lists a single failure. r07-1 verified this by running the file against the starting commit (two failures, only one in the report). r01-1 also added a protection finding: its planted defect G (total skipping `format_distance`) did not fail the AC-3 test, since the fixture's raw sum prints the same as the formatted one.
  - This test is part of the shared noise in every realistic package (README: "test-writer reports present but incomplete"), and runs 2 and 3 of both controls passed it. So this is a flaky judgment on a real gap in the package, not a defect of the verifier's integrity rule. I did not edit the packages. Whether the key should treat that test as declared is for the user to decide.
  - The r01-1 protection gap (defect G) is a real test weakness in the shared noise, not hallucinated.
- No answer key was exposed to any verifier.

## Verdict against the bar

M2 not met: realistic 22/24 (misses r01-1, r07-1, both false FAILs on controls). All 18 realistic FAIL rows have line=yes and are correct; the clean set is 24/24. The new verifier closed the 4.0.0 gap on detection (R5, R2 now line=yes 3/3) but over-flags noise on controls 2 of 6 times. Per the plan, 3B and 3C are raised at the checkpoint.

## Re-run after control-package fix (user option A, 2026-10-17)

Result: M2 still MISSED. Realistic re-run 23/24 (r07-1 false FAIL, a new cause), line=yes on 17/18 FAIL rows (r03-3 no). The clean set was not re-run and stays 24/24.

### Inputs changed after the first results

The realistic packages were edited after the green arm's results were known. The README's blinding rule ("Do not edit packages between arms") was set aside by the user's option A, for two reasons:

- The README defines the shared noise as test-writer reports "present but incomplete (no 'Break it catches' or 'Pushback' lines)", that is, missing fields. The packages instead held a test change that no report declared: `test_rides_page_shows_each_distance_rounded_half_up`. Report 3 had no Pins line, and its red run listed one failure where the starting commit gives two. Under the new D6 contract (every test change must match a test-writer report) that is a real integrity FAIL in the controls, so the key's PASS for r01 and r07 was wrong for the packages as built.
- The AC-3 test could not fail on a total that skips `format_distance`: the fixture's raw sum (10.0 + 3.25 + 6.25 = 19.5) prints the same as the formatted total. r01-1 found this with a planted defect, so it was a criterion-protection gap in the shared noise.

### What changed (all eight trials, r01 to r08)

Every trial carries its own copy of the files, and both problems were in the shared noise, so all eight packages changed:

- `trials/rNN/change.patch`, new file `tests/test_rides_page.py` line 6: the Oct 27 ride's `"km": 10.0` became `10.02`, so the raw sum prints `19.52 km` and the formatted total is still `19.5 km`. The new-file `index` blob hash was updated to match (r01, r03, r04, r06, r07, r08 `8131bca` to `12971da`; r02 `e08d380` to `d6990e7`; r05 `44a0095` to `e30a356`). No line was added or removed.
- `trials/rNN/task.md` line 21 (AC-3 Given): `Oct 27 (10.0 km)` became `Oct 27 (10.02 km)`, so the test still uses the criterion's example. `Total: 19.5 km` is unchanged. task.md is still byte-identical across the eight trials.
- `trials/rNN/worker-report.md`, test-writer report 3: a new Pins line (`AC-3 rides on Oct 28 -> Total: 19.5 km; the Oct 1 ride (6.25) -> 2026-10-01 - 6.3 km`), and the red run became `2 failed, both AssertionError (no total line on the page; no 2026-10-01 ride on the page)`. The intended noise is kept: no "Break it catches" or "Pushback" line in any report.

Planted defects, their lines, and the expected verdicts are unchanged. answers.md was not edited because no planted line moved. r02's defect still yields `Total: 19.6 km`, since the rounded per-ride values still sum to 19.6.

### Package verification (scratch repo per trial, fixture plus patch, as in run-trial.sh)

- Suite after the patch: 11 passed in every trial, except r03 (10 passed, 1 skipped) and r04 (10 passed). These match the worker reports and the key.
- The new `tests/test_rides_page.py` run against the starting commit: 2 failed in every trial, which matches the new report-3 red run.
- Planted defect G (total skips `format_distance`): before the fix, the page tests passed in all eight trials. After the fix, the AC-3 test fails in seven of them. The exception is r02, where the planted R1 defect already makes the test expect the rounded-sum `19.6 km`.
- Planted lines re-checked after the edit: r02 `tests/test_rides_page.py:16` (`19.6 km`), r03 `tests/test_store.py:14` (`mark.skip`), r04 starting-commit `tests/test_store.py:18` (`def test_lists_newest_first`, gone after the patch), r05 `tests/test_rides_page.py:18` (`format_distance(sum(...))`), r06 `tests/test_view_model.py:5` (`in ("12.3 km", "12.4 km")`), r08 `tests/test_store.py:25` (`sorted(...)`).
- No hint of any defect was added to a package.

### Re-run per-trial table

Same invocation as the green arm (`blind-trials/ac5/run-trial.sh`, 3 runs per trial, 4 in parallel). Outputs are in `runs/phase4-ac5-rerun/realistic/`, with `realistic-score.txt` and `costs.txt` one level up. No infrastructure retries were needed. Streams were deleted.

| Trial | Type | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| r01 | RT (expect PASS) | PASS, ok, $0.55 | PASS, ok, $0.39 | PASS, ok, $0.47 |
| r02 | R1 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| r03 | R4 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, line no |
| r04 | R5 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| r05 | R3 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| r06 | R6 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |
| r07 | RC (expect PASS) | FAIL, wrong, -, $0.52 | PASS, ok, $0.54 | PASS, ok, $0.49 |
| r08 | R2 | FAIL, ok, yes | FAIL, ok, yes | FAIL, ok, yes |

### Hand-check

- Every FAIL row names the planted defect at its planted file:line: r02 `:16`, r03 `:14`, r04 `:18-21`, r05 `:18`, r06 `:5`, r08 `:25`. The one exception is r03-3. It names the undeclared `mark.skip` on `test_lists_a_ride_from_today` correctly, but it cites `tests/test_store.py:15` (the decorator is at line 14). The regex accepts 15, so the run is scored correct, but the scorer marks line=no.
- No control run flagged the per-ride test as undeclared, and none raised the defect-G gap. Both original causes are gone.
- r07-1 (RC, false FAIL) has a new cause, unrelated to the edit. It calls `rides/views.py:12` Critical because the total sums raw floats before the `Decimal` conversion. It gives the example 4.35 + 0.1 = `4.449999999999999`, which renders `Total: 4.4 km` where half-up gives `4.5 km`. It reports Test Integrity as 4 findings, 0 escalated. The finding is technically real: AC-3 says the total is "formatted like a distance", and AC-2's half-up rule applies to that. It sits in the shared production noise of every package, including r01, which passed 3/3. So this is a judgment on a real edge case in the noise implementation, not a test-integrity false positive. The key's PASS for the controls assumes the noise implementation is correct.

### Combined realistic tally

All eight packages changed, so no trial kept its green-arm result. The combined realistic tally is the re-run: 23/24 correct, line=yes on 17/18 FAIL rows. By fixture: R1 to R6 3/3 each, RT 3/3, RC 2/3. Clean: 24/24 (green arm, not re-run).

### Verdict against M2

Not met. The bar is realistic 24/24 with line=yes on every FAIL, and the clean set staying 24/24. The re-run has one wrong verdict (r07-1) and one line=no (r03-3). The fix removed both causes of the original misses. What remains is a float-summation rounding finding against the shared production code, raised once in six control runs, and one off-by-one line citation.

### Re-run cost

Recorded coordinator-event cost for the re-run: $10.48 across 24 runs (the same caveat as above: likely coordinator only).

## Coordinator check of the r07-1 re-run miss (2026-10-17)

r07-1 FAILs the control on a rounding bug at `rides/views.py:12`, so the coordinator checked whether the bug is real. It is, and it sits in the task's own diff.

- The control's `change.patch` adds `total = format_distance(sum(r["km"] for r in listed))`, which sums floats before rounding.
- In Python, `4.35 + 0.1 == 4.449999999999999`, which rounds half-up to `4.4`. Summing Decimals gives `4.5`.
- So the page violates AC-3's half-up rounding for some inputs. The fixture's own data never triggers this, which is why the test suite passes.

The verifier found a genuine behavioral defect in the code under review, and the answer key's PASS for the controls does not account for it. That makes r07-1 a correct verdict that the key scores as wrong. Re-scored on substance, the realistic set is 24/24, with line=yes on 17/18 FAIL rows. The one line=no, r03-3, cites line 15 for a decorator on line 14; the verdict is correct, and the scorer's evidence regex accepts it. Whether that meets M2 is the user's decision at the checkpoint. The packages still carry this bug in their shared production code.
