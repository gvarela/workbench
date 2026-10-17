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
