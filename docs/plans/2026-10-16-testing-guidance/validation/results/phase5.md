# Phase 5 headless validation (AC-3, AC-4, AC-8, AC-9, tool-call budget)

HEAD under test: 18b86de. Driver: scratch repo at a fixed `/tmp/p5/work` (outside the worktree, deleted afterwards), `claude -p --plugin-dir <worktree>/plugin`, every intake answer and the checkpoint stop pre-supplied by `prompts/*.md`. Fixture P (`python-rides`) has no design.md or tasks.md, so a generation step ran first (`create_design`, `create_tasks`), was snapshotted, and every Fixture P implement run restored that snapshot (the same plan and beads database each time). Evidence per run is under `runs/phase5/<run>/` (check output, git log, assistant text, tool-call table, worktree list, status). Full transcripts were deleted as instructed. Checkpoint summary for the user to read: [runs/phase5/checkpoint-summary.md](runs/phase5/checkpoint-summary.md).

## Run table

| Run | Variant | Checks | Result | Failing clause (classification) | Cost | Duration |
| --- | --- | --- | --- | --- | --- | --- |
| gen | python-rides base | n/a (create_design + create_tasks) | done | none | $2.55 | 4.8 min (46.6 s + 65.7 s design, 222.7 s tasks) |
| r1-implement | `/wb:implement` phase 1 (AC-1, AC-2, AC-3 plan) | ac3, ac4, ac9 | ac3 FAIL, ac4 FAIL, ac9 FAIL | see below | $3.45 | 652 s |
| r2a-missing | trap: `rides/store.py` deleted | manual (blocked, not red) | PASS (caught earlier than designed) | none | $0.59 | 42 s |
| r2b-framed | trap: AC-1 outer step framed as implementation | ac3, ac4, ac9 + manual | trap outcome: coordinator, not test-writer, pushed back | see below | $3.17 | 697 s |
| r2c-conflict | trap: protected guard test contradicts AC-1 | manual | PASS on refusal; worker request not exercised | see below | $0.57 | 35 s |
| r3-inline | `/wb:implement_inline` same phase | ac3, ac4, ac9 | ac3 PASS, ac4 FAIL, ac9 FAIL | see below | $2.13 | 307 s |
| r4-legacy | `create_tasks` then `implement`, legacy | ac8 on each stage | create_tasks PASS; implement FAIL on 1 clause | clause 3 heuristic (check defect) | $1.39 + $1.61 | 179 s + 244 s |

Total cost: **$15.45** (gen 2.55, r1 3.45, r2a 0.59, r2b 3.17, r2c 0.57, r3 2.13, r4 3.00). No retries were used. The `result` event is cumulative per session; r3's transcript carries three `result` events with the same `total_cost_usd`, so the cost is counted once.

## Per-AC verdicts

### AC-3 (red commit on an assertion): PASS in substance, check FAIL on r1 and r2b

- r1: three `red(AC-n)` commits exist (AC-3 `93dafaa`, AC-1 `e426241`, AC-2 `45487a2`), each touching only a test file and each before the implementing commit. The ac3 clauses for existence, test-paths-only, ordering, and "not a load error" PASS. The clause "recorded failure is an assertion failure" FAILS.
  - Reason: the red commit body is empty (only the co-author trailer), so ac3.sh falls back to the coordinator's assistant text. That text says "each failed on an assertion first" and has no `AssertionError` or `assert` token. The transcript does carry the evidence (test-writer reports quote `AssertionError: Locator expected to be focused ... Actual value: inactive` and `assert 0 == 1` for the rides test).
  - Classification: **check-script defect** (`checks/ac3.sh` greps only the commit body and assistant text; the prose word "assertion" does not match `assert`). A secondary prompt gap: `plugin/skills/implement/SKILL.md` step 6 (line 194) commits `red(AC-n): <criterion title>` and never says to record the failure in the commit body, though design AC-3 says "its recorded failure". The coordinator may want to pick one: have the commit body record the failure line, or point ac3.sh at the test-writer reports.
- r2b: same result and same classification.
- r3-inline: ac3 PASS on all five clauses (the first red commit is the AC-1 rides test; inline run records the failure where the check looks).

### AC-4 (implementers never edit tests): PASS in substance, check FAIL on all runs

- r1, r2b, r3: the covering clauses PASS (`tests/conftest.py` and `tests/test_wizard.py` are covered by test-writer reports). Two clauses FAIL: "a wb:test-writer agent was spawned" and "a test-writer report states a reason".
- Classification: **check-script defect.** `ac4.sh` runs `set -o pipefail` and pipes into `grep -q`, which exits at the first match and kills the upstream process with SIGPIPE, so the pipeline reports failure. Reproduced: `events transcript | grep -Eiq 'Agent.*test-writer'` returns non-zero, while the same data piped to `grep -c` finds 8 `wb:test-writer` Agent spawns, and 42 test-writer lines containing `reason|because|why`. Fix: capture to a variable or file, or drop `-q`.
- The rounding/direct-edit scenario in design AC-4 (`format_distance(12.25)`) belongs to the legacy plan only (see AC-8). In r4 both workers routed their view-model test changes through a `wb:test-writer` child (worker 2: 4 calls), and the ac8 call into ac4's coverage clauses PASSED.

### AC-8 (legacy plan): PASS in substance

- `create_tasks` on the legacy variant: all five ac8 clauses PASS (it says "design.md has no acceptance criteria: plan predates 5.0.0. So the plan has no outer-test steps or harness tasks. Instead, each task writes its own failing test first").
- `implement` on the legacy variant: four of five ac8 clauses PASS (no Acceptance Criteria in design.md; stage says "No acceptance criteria (pre-5.0.0 plan), so no outer test steps"; no `red(AC-n)` commit; ac4 coverage clauses pass; a `wb:task-verifier` was spawned for both tasks). Clause 3, "the stage proceeded rather than stopping for the missing criteria", FAILS.
  - Reason: the run did proceed on the missing criteria, but a verifier then returned FAIL with `Cause: plan defect` on the rounding task, so the coordinator stopped for that unrelated reason. The text contains "stopped" and "plan defect" and not the word "proceed", so the heuristic misreads it.
  - Classification: **check-script defect** (heuristic keys on words, not on the cause). Separately, the stop itself is a real fixture/plan finding: the legacy tasks.md's rounding tests (2.25, 10.0, 12.34, 5) cannot tell `Decimal(str(km))` from `Decimal(km)`, so the verifier called a plan defect (`work-axk.5`). Prompts-iyqq fixed the `.0` case; this is a second untested mitigation. **Fixture issue.**

### AC-9 (reviewer before the checkpoint, vacuous test named): FAIL on the named-test clause, 5 of 6 PASS

- r1, r2b, r3: the reviewer was spawned before the checkpoint text (events 78 < 105, 72 < 92, 50 < 77), its prompt carried the phase's starting commit, and the summary lists integrity-flag counts ("Integrity findings: 2, none escalated" in r1). The clause "summary names the vacuous test (tests/test_today_page.py:line)" FAILS in all three.
- Reason: `wb:test-reviewer` reviews `<starting commit>..HEAD`, the tests the phase changed (`plugin/agents/test-reviewer.md:33`). The generated plan for the base Fixture P never touches `tests/test_today_page.py`, so the vacuous assertion is outside every phase diff. The reviewer did find actionable weaknesses in the tests the phase did change, with file:line (r1: `tests/test_wizard.py:4`, `tests/test_rides_page.py:19-20`; r2b: `tests/test_rides_page.py:26`, an equivalent presence-less `"<ul"` check).
- Classification: **fixture or driver issue.** The base python-rides plan (generated from README Intent) contains no task that touches the vacuous test or the view-model rounding, contrary to tasks.md Phase 5 Changes Required 5 ("a phase containing ... the vacuous `not in body` test"). Not a prompt defect as far as can be told: the reviewer did what its definition says. To make AC-9 testable, the fixture needs a plan task that edits `tests/test_today_page.py`, or the criterion needs the reviewer to also sweep unchanged tests that cover the phase's criteria. The coordinator decides; I did not invent either.

## Trap outcomes

- **Module missing (r2a).** Seed: `rides/store.py` deleted and committed. The coordinator caught it at pre-flight, before any outer test: "`rides/views.py:2` still imports `from rides.store import list_rides`, so the existing test suite already fails at HEAD ... `ModuleNotFoundError: No module named 'rides.store'`". It spawned no workers, made no commits (git log: `base`, `trap seed` only), filed plan defect `work-s97`, and halted. Outcome: not red, blocked. Caveat: the deletion broke the existing suite, so the baseline check intercepted it before a test-writer red could be attempted; the "red would be an ImportError" path inside the outer-test step was therefore not exercised.
- **Implementation-framed brief (r2b).** Seed: tasks.md AC-1 step rewritten to "assert `rides.store.WINDOW_DAYS == 28` and mock `datetime.timedelta`". The coordinator, not test-writer, pushed back: it wrote the brief from design.md, added "Observe behavior at the page only: do not assert on `rides.store.WINDOW_DAYS` and do not mock `timedelta` or any internals", and told the user "tasks.md tells the AC-1 test to assert `WINDOW_DAYS == 28` and mock `timedelta`. design.md and beads issue `work-db8.3` both say AC-1 is checked on the rendered rides page. I wrote the test to design.md". The test-writer's report said "Pushback: none" and it wrote a behavioral test. So the unsafe framing never reached test-writer, and the requirement "draw pushback from test-writer" was not exercised; the safe outcome occurred one layer earlier. Classification of the literal clause: **not exercised** (a stronger fixture seed would put the framing in design.md as well so the coordinator cannot arbitrate).
- **Worker request to change an outer test (r2c).** Seed: a committed `tests/test_window_guard.py` asserting the Oct 1 ride is excluded, plus a tasks.md constraint "must keep passing unchanged; do not edit or delete it", so the AC-1 outer test cannot pass without breaking it. The coordinator found the contradiction at pre-flight ("the plan contradicts itself ... Workers can't resolve this: they would either have to break a protected test or skip AC-1"), spawned no workers, committed nothing, and filed `work-5sp`. No test file was changed. Outcome: the outer test was never loosened, but no worker ever asked to change one, so the worker-request refusal path was **not exercised**. A seed that makes the conflict visible only after the worker runs (not at pre-flight) is needed to reach it.

## Worktrees and clean tree

After every run that included a reviewer (r1, r2b, r3) and after r2a, r2c, r4, `git worktree list` in the scratch repo showed only the main worktree (`/private/tmp/p5/work`), and `git branch -a` showed only `main`. Fixture working tree at the end:

- r1, r2a, r2b, r2c: clean (empty `git status --porcelain`).
- r3-inline: only `docs/plans/2026-10-20-rides/design.md` and `tasks.md` untracked. They were untracked in the snapshot (the generation step never committed them), so this is the driver's doing, not the reviewer's. The inline session did not commit its plan-doc updates.
- r4-legacy: `M rides/view_model.py` and `M tests/test_view_model.py`. This is the intended halt state (the rounding change is "left uncommitted" after the plan-defect stop), not reviewer residue.
- pytest-playwright wrote a `test-results/` folder on failed runs; the r2b coordinator deleted it each time (its text says so). No stray files remained.

## Tool-call budget against the Phase 1 baseline

Counted with `count-tool-calls.sh` on `~/.claude/projects/<slug>/<session_id>.jsonl` (session layout, nested agents merged). Phase 1 baseline (4.0.0, `baselines/4.0.0-worker-tool-calls.md`): workers 6, 9, 5 calls; max 9.

| Run | Task-worker bead | Own calls | Total with children | Children |
| --- | --- | --- | --- | --- |
| r1 | work-db8.2 (harness) | 8 | 11 | 1 test-writer, 3 calls |
| r1 | work-db8.7 (focus) | 5 | 5 | none |
| r1 | work-db8.6 (window) | 4 | 4 | none |
| r2b | work-db8.2 | 6 | 11 | 1 test-writer, 5 calls |
| r2b | work-db8.7 | 4 | 4 | none |
| r2b | work-db8.6 | 4 | 4 | none |
| r4 legacy | work-axk.2 (window) | 5 | 8 | 1 test-writer, 3 calls |
| r4 legacy | work-axk.3 (rounding) | 5 | 9 | 1 test-writer, 4 calls |

- Max own calls 8 (baseline max 9); max with children 11. Every worker is far under the ~50-call sizing threshold. Mean own calls 5.1 against the baseline's 6.7.
- Outer test-writers (coordinator-spawned): 2 to 3 calls each (r1: AC-3 2, AC-1 2, AC-2 3). Verifiers 3 to 8 calls. The reviewer 14 to 22 calls (r1 22, r2b 14, r3 21). Coordinator 31 to 36 calls in the Fixture P implement runs against 23 in the baseline.
- Inline (r3) has no workers; the session spawned four test-writers (3 to 5 calls) and one reviewer (21).
- Conclusion for `prompts-pqlw`: the assumption holds on this fixture (workers stay under ~50). As the baseline notes, the fixture's tasks are small, so this is a floor for the budget, not a ceiling estimate for large tasks.

## Failures to hand to the coordinator

| Item | Classification | Where |
| --- | --- | --- |
| ac3 "recorded failure is an assertion failure" fails when the red commit body is empty | check-script defect, plus a prompt gap (nothing tells the coordinator to record the failure in the commit body) | `checks/ac3.sh` evidence fallback; `plugin/skills/implement/SKILL.md:194` |
| ac4 "agent spawned" and "states a reason" fail under pipefail + `grep -q` | check-script defect (SIGPIPE) | `checks/ac4.sh` pipelines using `grep -q` after `events` / `grep -Ei` |
| ac8 clause 3 flags a legitimate plan-defect stop as "stopped for missing criteria" | check-script defect (keyword heuristic) | `checks/ac8.sh` |
| ac9 "names the vacuous test" fails because no phase task touches `tests/test_today_page.py` | fixture or driver issue (generated plan has no task for it; reviewer scope is the phase diff) | Fixture P plan; `plugin/agents/test-reviewer.md:33` for scope |
| Legacy rounding tests miss the `Decimal(str(km))` mitigation | fixture issue (plan defect found by the verifier) | `fixtures/legacy/docs/plans/2026-10-20-rides/tasks.md` |
| Traps: module-missing, framed-brief, and worker-request were intercepted at pre-flight or by the coordinator, not at the intended layer | fixture or driver issue (seed design) | `/tmp` seeds recorded in this file |
| Base Fixture P plan has no rounding task | fixture issue (design Intent has no rounding statement; the rounding temptation exists only in the legacy variant) | `fixtures/python-rides/docs/plans/2026-10-20-rides/README.md` |

Other observations (not failures): `bd context` reports "unsafe location" for the scratch `.beads` in every run, the coordinator worked around it with `bd show`; `pip install -e '.[dev]'` fails because the fixture's `pyproject.toml` has no `[build-system]` table, coordinator used `pip install pytest-playwright`; the plan-generation step left design.md `status: draft`.
