# Prompt audit: phase5_impl_2 (implement SKILL.md coordinator flow and drift bundle)

- **Task**: `prompts-wzoc`, update `plugin/skills/implement/SKILL.md` per tasks.md Phase 5 Changes Required 2, with its drift bundle in `plugin/skills/help/SKILL.md` and `plugin/hooks/wb-prime.sh`; the follow-on edits to `plugin/skills/implement/sub-agent-prompts.md`
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/implement/SKILL.md plugin/skills/implement/sub-agent-prompts.md plugin/skills/help/SKILL.md plugin/hooks/wb-prime.sh`
- **Base commit**: `e8f9136` (the change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: the lines changed since HEAD (`git diff HEAD`) in the four files, read in the context of each whole file. Read alongside for contracts: `plugin/skills/implement/reference.md`, `plugin/agents/test-writer.md`, `plugin/agents/task-worker.md`, `plugin/agents/task-verifier.md`, `plugin/agents/test-reviewer.md`, `plugin/skills/create_tasks/{SKILL,templates}.md` (outer-test step format and dependency direction), `plugin/skills/implement/templates.md`.
- **Target model**: Claude Opus 5.5 for the two skills and the hook's orientation text (the coordinator session reads them).
- **Surface type**: coding-agent configuration. No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: tasks.md Phase 5 Changes Required 2; flags S1-S8 in `phase5_impl_1.md`; the majority-settling comment on `prompts-wzoc`.
- **Keep-list governs**: no `model` parameter on verifier and reviewer spawns; `bd close` as the worker's last act; FAIL-wins parsing; no literal verdict heading outside the verifier template (check 2); "predates 5.0.0" phrase (check 15); the autonomous-loop paragraph and the phase-checkpoint stop.
- **Provenance**: every changed line is this task's (uncommitted).

## Summary

The change carries Changes Required 2 and all eight S-flags. Two gaps would have broken the flow as written. First, the majority-settling spawns passed "only the Candidates input", but test-reviewer judges each candidate "from the test and its criterion", and the Candidates input carries a location, rubric item, and verdict, with no criterion text. Second, the verdict regex `^#{3} Status: ${word}\b` passed a report whose status line was the template's own `### Status: PASS | FAIL`, which contradicts the comment's "both verdicts is a FAIL". The old `includes` code had the same hole. Both are fixed.

A third gap is high but needs a user decision, so it is not applied. When re-verification fails, the task's uncommitted changes stay in the working tree. The next task's verifier then sees foreign files in its scope check and test changes no report declares. The new integrity check turns that into a guaranteed FAIL for the next task.

Counts per group:

- Group 1 (dated prompt text): 0 findings in the changed lines
- Group 2 (brittle skill and configuration files): 2 high, 5 medium, 6 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

## Specific checks

- **(a) Coordinator flow, one task**:
  - Routing (item 1): an outer-test step blocks the implementation tasks that cite its criterion (`create_tasks/SKILL.md:243`). The coordinator therefore takes the blocked task while it is not yet ready. Gap: the task can also be blocked by a harness task (finding 6, applied).
  - Starting commit (item 5) is recorded before item 6's red commit, so the verifier's `git diff <starting commit>` includes the outer test file. `outerTestReports` covers it, so the change is declared, not undeclared. An outer test from an earlier task predates the starting commit and is outside the diff. Correct.
  - Outer test-writer (item 6) against `test-writer.md:14-21,27-28,56`: the Outer Test Prompt supplies every input. The assertion-red re-run and the commit stay with the coordinator, and "blocked" goes to the coordinator. `bd close` with no id was ambiguous (finding 5, applied).
  - Worker (item 7) against `task-worker.md`: the template defers to the definition, and `taskTestContext` carries criteria text and outer reports for the RED request. Consistent.
  - Verifier against `task-verifier.md:40-50`: all eight inputs are present in the prompt. Step 6 item 3 lists them. Consistent.
  - FAIL classification: `Cause:` sits under Recommendation (`task-verifier.md:194`), with a fallback to reference.md's plan-defect signals. Consistent.
  - Fix worker and re-verify: SKILL.md:239 and sub-agent-prompts.md:110 agree on the three report sets. Consistent. A pre-existing issue: the fix worker claims and closes a task the first worker already closed (finding 11).
  - Re-verify failure: finding 1 (declined, needs a user decision).
- **(a) Step 8 checkpoint**: the reviewer inputs match `test-reviewer.md:18-28`, but the coordinator was never told to keep each verifier's Test Integrity section (finding 4, applied). The majority settling lacked criteria (finding 2, applied). The summary counts map onto the reviewer's Integrity line, Findings, and Review These. Step 9 item 3 copies the counts into Implementation Notes. On resume, the phase starting commit had no recovery path (finding 7, applied).
- **(b) Spec fidelity**: Step 5's three steps, Step 6's inputs and label-based classification, Step 8's reviewer in `implement` mode with counts in the summary and Implementation Notes, the "predates 5.0.0" fallback, and the drift bundle are all present. S1 (:195), S2 (:163), S3 (:193-195), S4 (:183), S5 (:214), S6 (:218), S7 (:236), S8 (:224-229), and the `:18` file list are resolved. The bead's majority comment is implemented, plus the criteria input from finding 2. Length is 431, at or under 441.
- **(c) Parse code**: tested with `node -e`. Before the fix: PASS true, FAIL false, both false, neither false, `### Status: PASS | FAIL` **true**. After `\\s*$`: PASS, PASS at EOF, trailing spaces, and CRLF are true. FAIL, both, neither, the template line, `**PASS**`, and `PASSED` are false. Check 2 still passes, since the code builds the marker with `#{3}`.
- **(d) Drift bundle**: help's implement row (intake now includes the test review; "did enough" adds `red(AC-n)`), help's Command Details, and wb-prime's stage line agree. wb-prime's six-line summary ("implementation: a go-ahead at each phase checkpoint") covers both implement skills and still holds. implement's "This stage needs from you" line did not mention the test review that help's row now names (finding 8, applied).
- **(e) Project-agnostic**: no plan, fixture, task-key, or `prompts-` references. `phaseN_outer_n`, `AC-n`, `red(AC-n)`, and "predates 5.0.0" are plugin conventions shared with create_tasks.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `SKILL.md:240` with `task-verifier.md:79-80,112,117,213`, `SKILL.md:427` | "If re-verification fails: add to blocking issues list ... and continue to the next task" | Group 2, step an agent contract cannot satisfy | The failed task's changes stay uncommitted, so the next task's starting commit has a dirty tree under it. Its verifier's scope check sees foreign files, and its `git diff <starting commit>` shows the failed task's test changes, which no report for the new task declares. That is an integrity FAIL by construction. The worker already closed the failed task, so its dependents are ready too | High | `flag`: **declined** for this task. How to set the changes aside (a labeled stash, a side-branch WIP commit, or halting the phase) changes the failure-handling design beyond Changes Required 2 and needs a user decision. Recommend a follow-up issue |
| 2 | `SKILL.md:297` (before) against `test-reviewer.md:28,32` | "Spawn `wb:test-reviewer` again with only the Candidates input" | Group 2, input the callee needs but is not given | The reviewer judges each candidate "from the test and its criterion". The Candidates input carries only location, rubric item, and proposed verdict, so the further judgments would run without the criterion's text and example | High | `rewrite` (applied): "with the Candidates input (... without the first review's reasoning) and the criteria those candidates cite, with their examples, since each judgment weighs the test against its criterion. Spawn a third time, with the same inputs" |
| 3 | `SKILL.md:227` (before) | ``new RegExp(`^#{3} Status: ${word}\\b`, "m")`` | Group 2, code contradicts its own stated rule | `### Status: PASS \| FAIL` (the verifier template line, echoed) matched PASS but not FAIL at line start, so it parsed as PASS, though the comment says both verdicts are a FAIL | Medium | `rewrite` (applied): `\\s*$` anchors the verdict to the end of the line; comment notes "both verdicts (on two lines or one)" |
| 4 | `SKILL.md:218,233,295` | Step 8 passes "each task verifier's Test Integrity section"; Step 6 never says to keep it | Group 2, input with no source | The aggregated lists name files, commands, and notes only. After a long phase or a compaction, the sections the reviewer's Integrity line counts are gone | Medium | `add` (applied) at :218: "Keep the report's Test Integrity section, pass or fail, for the Step 8 test review." |
| 5 | `SKILL.md:194` (before) against `bd close --help` | "`bd close` the outer test step" | Group 2, command whose literal form does the wrong thing | Bare `bd close` closes the last issue touched. Item 2's `bd show [task-id]` makes that the implementation task, so a literal reading closes the wrong issue | Medium | `rewrite` (applied): "run `bd close [outer-step-id]` (with the id: a bare `bd close` closes the last issue touched, which is the task from item 2)" |
| 6 | `SKILL.md:183` (before) against `create_tasks/SKILL.md:243`, `create_tasks/templates.md:112` | "Take the implementation task it blocks ... as the next task" | Group 2, routing rule wider than its precondition | The task may also wait on a harness task at its boundary. Taking it early writes an outer test before its harness exists | Medium | `rewrite` (applied): "... as the next task once that task's other open blockers are only outer test steps" |
| 7 | `SKILL.md:169`, Resume Logic `:408-412` | "Before the phase's first task, record `git rev-parse HEAD` as the phase's starting commit" | Group 2, state lost across sessions | On `continue`, the coordinator has no starting commit, so the Step 8 review range is undefined | Medium | `add` (applied) in Resume Logic item 4: "Recover the phase's starting commit (Step 4) for the test review: the parent of the phase's first task or `red(AC-n)` commit in `git log`, or HEAD if the phase has none" |
| 8 | `SKILL.md:25` against `help/SKILL.md:106` | "a go-ahead at each phase checkpoint" vs help "the phase report at each checkpoint, with the test review's findings in implement" | Group 2, drift bundle (CLAUDE.md: intake change updates the stage's line in the same commit) | help's intake changed and the stage's own line did not | Medium | `rewrite` (applied): "a go-ahead at each phase checkpoint after reading its test review" |
| 9 | `SKILL.md:194` | "handle it as Case B of the 'Worker Failure Playbook'" | Group 2, reference to a playbook shaped for another event | Case B's message reads "status: in_progress (should be closed)", which fits a worker, not an outer test-writer. Opus 5.5 adapts it | Low | `flag` |
| 10 | `SKILL.md:194` against `test-writer.md:58` | "commit only the test" | Group 2, unstated case | If test-writer also creates a fixture or helper, it stays uncommitted. It is still declared through `outerTestReports`, so it fails safe | Low | `flag` |
| 11 | `sub-agent-prompts.md:99-107` with `task-worker.md:17,21` | fix worker "Close beads issue when done" | Group 2, pre-existing | The first worker already closed the task, so the fix worker's claim and close act on a closed issue. Outside this task's hunks | Low | `flag` |
| 12 | `implement/templates.md:50-58` (outside the four files) | Implementation Notes Entry has no integrity-count line | Group 2, template behind its step | Step 9 item 3 asks for the counts, but the template has no slot for them | Low | `flag`: for a later edit to templates.md |
| 13 | `SKILL.md:297` | "recorded as 'n of 3'" | Group 2, wording | When the first two judgments agree, only two exist. "2 of 3" still reads as a majority | Low | `flag` |
| 14 | `SKILL.md:227` | regex over the whole report | Group 2, residual edge | A verdict heading inside the fenced test output could matter only if the real status line were malformed. FAIL-wins keeps every other case safe | Low | `flag` |

## Dispositions

- **1 (high)**: declined in this task. The fix changes failure handling beyond Changes Required 2 and needs a user decision. Recorded for a follow-up issue.
- **2 (high)**: applied. test-reviewer's candidate-mode instruction governs. The "without the first review's reasoning" independence rule from the bead comment is kept.
- **3-8 (medium)**: applied in SKILL.md, each within its own line or as one new Resume Logic bullet.
- **9-14 (low)**: recorded only.
- **Group 2 conflicts**: implement's intake line and help's row were reconciled (finding 8). SKILL.md:239 and sub-agent-prompts.md:110 already agreed on the re-verify report sets.
- **Keep-list**: no `model` on verifier or reviewer spawns, `bd close` as the worker's last act, FAIL wins, no literal verdict heading (check 2), and "predates 5.0.0" are all untouched. SKILL.md is 431 lines (limit 441).

## Re-run

- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: checks 1, 2, 3, 5, 7, 8, 9, 10, 12, 13, 14, 16, and 17 pass. Check 15 fails only on implement_inline (its implement part passes). Checks 4, 6, and 11 fail on later-task work (test-auditor, implement_inline, validate_execution).
- `./plugin/scripts/lint` on the changed markdown, `docs/beads-guide.md`, and this report: all clean.
- `bash -n plugin/hooks/wb-prime.sh`: OK. `claude plugin validate ./plugin`: passed.
- Beads contract inventory (`docs/beads-guide.md`): implement citations refreshed to current lines, and the `close [id]` row gained `implement/SKILL.md:194` and `sub-agent-prompts.md:39`, with the bare-close note from `bd close --help`.
