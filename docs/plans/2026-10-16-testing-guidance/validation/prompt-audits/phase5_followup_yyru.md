# Prompt audit: phase5_followup_yyru (failed re-verification halts the phase)

- **Task**: `prompts-yyru`, the follow-up to phase5_impl_2 high finding 1, as the user decided at the Phase 5 checkpoint (option A, halt the phase)
- **Run**: 2026-10-18, `/claude-api prompt-audit plugin/skills/implement/SKILL.md plugin/skills/implement/reference.md`
- **Base commit**: `2a118e4` (the change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: the lines changed since HEAD (`git diff HEAD`): SKILL.md:179 (Step 5 autonomy paragraph), SKILL.md:240 (Step 6, re-verification fails), SKILL.md:403-410 (Resume step 3, renumbered steps 4 and 5), and reference.md:171-201 (new "Failed Re-verification Halt" section). Each was read in the context of its whole file. sub-agent-prompts.md was read for the re-verify flow (its Retry 1 block), and plugin/skills/implement_inline/SKILL.md for check (c).
- **Target model**: Claude Opus 5.5, the coordinator session that runs `/wb:implement`.
- **Surface type**: coding-agent configuration (one skill and its reference files). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Decision source**: the last comment on `bd show prompts-yyru` (2026-10-18): option A. The coordinator starts no further tasks, leaves the failed changes uncommitted, reopens the issue, commits nothing else, and presents a halt message with the FAIL report (file:line), the Cause label, what the fix attempt changed, and three options: continue (re-verify the working tree, commit on PASS, resume), discard to the task's starting commit and retry, or plan defect.
- **Keep-list**: SKILL.md at or under 441 lines (433 after); the decision's five halt behaviors and three options; the single automatic fix attempt for a first FAIL; the Plan-Defect Deviation Protocol unchanged; workers never commit.

## Summary

The change matches the user's decision on every point, and the halt is exempted from Step 5's autonomy rule. Three defects remained, and all three are fixed. First, the discard-and-retry instruction contradicted itself. "Restore the working tree to the starting commit, keeping the committed `red(AC-n)` tests" cannot be done literally, because the starting commit comes before the red commits (Step 5 item 5 records it, then item 6 commits the red tests). An Opus reader taking the halt message's "Discard to the task's starting commit" at its word would run `git reset --hard <startingCommit>` and drop the red commits. Second, sub-agent-prompts.md:112, which the Step 6 fix flow reads verbatim, still said "add the task to the phase checkpoint's blocking list and continue to the next task". That is the exact behavior the decision replaced. Third, Resume step 3 named a signal a fresh session cannot see ("a reopened task": bd shows only `open`), and it gave no way to recover the starting commit that the re-verification needs.

Counts per group:

- Group 1 (dated prompt text): 0
- Group 2 (brittle skill and configuration files): 2 high, 1 medium, 4 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

## Specific checks

- **(a) Fidelity to the decision**: all met. No further tasks: SKILL.md:240 and reference.md:177. Changes left in the working tree: reference.md:177. Issue reopened: reference.md:178. Nothing else committed: reference.md:177 ("commit nothing"). The halt message (reference.md:181-195) carries the FAIL findings with file:line, the Cause, what the fix attempt changed, and the three options. The Continue branch re-verifies the working tree, commits on PASS, and resumes (reference.md:199).
- **(b) Interaction with the rest of the flow**:
  - Step 5's autonomy paragraph exempts the halt (SKILL.md:179).
  - The halt replaces only the failed re-verification. A first FAIL still gets one fix attempt (SKILL.md:239), and SKILL.md:240 sits under the re-verify bullet. The stale copy at sub-agent-prompts.md:112 was the one leak (finding 2, applied).
  - Resume detects the halt before any new task (SKILL.md:403, before "Handle incomplete workers" and "Continue coordination"). The detection signal and the starting-commit recovery are finding 3 (applied). Test-writer reports that do not survive a fresh session are finding 4 (flag).
  - **Discard-and-retry safety**: the original text was not safe as written (finding 1). Ordering: Step 5 item 5 records `startingCommit = HEAD` "before any outer test or worker work". Item 6 then commits each missing outer test as `red(AC-n)`, and the coordinator commits nothing else until the task passes, because plan-doc edits land only between tasks (SKILL.md:232). At halt time, HEAD is therefore the starting commit plus this task's red commits, and every uncommitted change belongs to the task. The safe restore is to discard the uncommitted changes against HEAD (`git restore --staged --worktree .`, plus the task's untracked files) and to leave HEAD where it is. Keeping the red commits is correct: the outer tests are the human-accepted pins of the criteria, written by `wb:test-writer` and confirmed red by the coordinator, and the failed attempt's defect is in the implementation. Keeping them also keeps the outer test steps closed and consistent with beads. The retry now starts at Step 5 item 7 with the same `taskTestContext`. Restarting at item 5 would have recorded a new starting commit after the red commits, and the outer test reports would then have had no diff to match.
  - Phase checkpoint and Step 8 while a halt is pending: they are guarded. The reopened issue blocks the phase milestone (every phase task blocks it, SKILL.md:277), so BARRIER 3 (SKILL.md:247) and Step 8's `blockedBy` check (SKILL.md:273, 279) cannot pass. With the plan-defect option the issue stays open (reference.md:201), so the guard holds there too. No edit was needed.
- **(c) implement_inline**: confirmed that it needs no change. The inline session has no per-task verifier, no fix worker, and no re-verify step. It runs the tests itself, commits once per task before closing the bead (implement_inline/SKILL.md:239, 245-249), and fixes failures before moving on (:286, :497-511). No path leaves a failed task's changes uncommitted while the next task starts. Test integrity is checked once, by the phase test review (:325).
- **(d) Project-agnostic**: no plan, fixture, issue-id, or phase references in the changed lines. `red(AC-n)` is the plugin's own commit convention.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | reference.md:191, :200 | "Discard to the task's starting commit (${startingCommit})"; "restore the working tree to the starting commit, keeping the committed `red(AC-n)` tests, then run the task again from Step 5 item 5" | Group 2, wrong degrees of freedom (a fragile, destructive operation in vague prose); internal contradiction | The starting commit precedes the red commits (SKILL.md:193-194), so the instruction both drops and keeps them. A literal reader resets to the starting commit and loses the red tests. Restarting at item 5 also re-records the starting commit after the red commits. | High | rewrite (applied): the option says "Discard the task's uncommitted changes, back to its starting commit plus its committed red(AC-n) tests". The branch runs `git restore --staged --worktree .`, deletes the untracked files the worker and fix-worker reports list as created, forbids moving HEAD, and retries from Step 5 item 7 with the same `taskTestContext`. |
| 2 | sub-agent-prompts.md:112 | "**If re-verification fails**: add the task to the phase checkpoint's blocking list and continue to the next task." | Group 2, instruction files that contradict each other | SKILL.md:240 (the newer text, the user's decision) halts the phase. The coordinator reads this prompt block verbatim during the fix flow, so the two rules collide at the moment they apply. | High | rewrite (applied): "halt the phase with the "Failed Re-verification Halt" in reference.md. Do not spawn a second fix worker." |
| 3 | SKILL.md:403 | "a reopened task with uncommitted changes in `git status` means the phase is halted … on `continue`, re-verify the working tree first" | Group 2, volatile specifics (a signal the tools do not expose) | `bd` reports a reopened issue as plain `open`, the same as any unstarted task, so a fresh session cannot see "reopened". The re-verification needs the task's starting commit, which only lived in the lost session. | Medium | rewrite (applied): "uncommitted changes in `git status` while no task is `in_progress` mean the phase is halted on a reopened task". The starting commit is recovered as "the parent of its own `red(AC-n)` commits at the tip of `git log`, or HEAD when the tip has none". This holds because nothing else is committed between the starting commit and the halt. Same line; no line-count change. |
| 4 | reference.md:199; SKILL.md:403 | "re-verify the working tree … using the same starting commit, red commits, and test-writer reports" | Group 2, an unenforced dependency | In the same session this works. After a fresh session, the worker's and fix worker's item 7 reports are gone, unlike in implement_inline, which copies report fields into commit bodies. Every inner-test change would then read as undeclared and FAIL. A durable carrier, such as a bd comment on the reopened issue, would add a new bd contract. | Low | flag: route to `prompts-ev16` (D11, red/green evidence in beads), which is designing where per-task evidence lives in beads. |
| 5 | reference.md:190 | "Fix it or give guidance, then say "continue". I re-verify the working tree" | Group 2, an unstated actor | When the user gives guidance instead of fixing, nothing says who acts on it before the re-verify. Opus will likely improvise one fix worker. The decision text says the same thing, so this is left to the user. | Low | flag |
| 6 | reference.md:190, :199 | Continue re-verifies with the same test-writer reports | Group 2 | A human's own edits to tests during "fix it" match no report, so the integrity check FAILs them as undeclared. The user may want such edits declared, for example by passing their description as a report. | Low | flag |
| 7 | reference.md:178 | `bd update [task-id] --status=open` | Group 2 | `--status=blocked` would keep dependents blocked just the same, and it would give resume a unique marker (`bd list --status=blocked`). The user decided "reopen", so this is kept. | Low | flag |

## Proposed diff

Applied in the worktree. One hunk per finding.

```diff
--- a/plugin/skills/implement/reference.md
+++ b/plugin/skills/implement/reference.md
@@ finding 1 (option text)
-   2. Discard to the task's starting commit (${startingCommit}) and retry the task.
+   2. Discard the task's uncommitted changes, back to its starting commit (${startingCommit}) plus its committed red(AC-n) tests, and retry the task.
@@ finding 1 (reply branch)
-- **Discard and retry**: restore the working tree to the starting commit, keeping the committed `red(AC-n)` tests, then run the task again from Step 5 item 5.
+- **Discard and retry**: discard only the uncommitted changes: `git restore --staged --worktree .`, then delete the untracked files the worker and fix-worker reports list as created. Do not move HEAD (no `git reset` to the starting commit): HEAD is the starting commit plus the task's committed `red(AC-n)` tests, and those stay. Then run the task again from Step 5 item 7 with the same `taskTestContext`, so the verifier still diffs from the original starting commit.
--- a/plugin/skills/implement/sub-agent-prompts.md
+++ b/plugin/skills/implement/sub-agent-prompts.md
@@ finding 2
-**If re-verification fails**: add the task to the phase checkpoint's blocking list and continue to the next task. Do not spawn a second fix worker.
+**If re-verification fails**: halt the phase with the "Failed Re-verification Halt" in [reference.md](reference.md). Do not spawn a second fix worker.
--- a/plugin/skills/implement/SKILL.md
+++ b/plugin/skills/implement/SKILL.md
@@ finding 3
-3. **Check for a failed re-verification halt**: a reopened task with uncommitted changes in `git status` means the phase is halted. Handle it before any new task, as the "Failed Re-verification Halt" in [reference.md](reference.md) directs: on `continue`, re-verify the working tree first.
+3. **Check for a failed re-verification halt**: uncommitted changes in `git status` while no task is `in_progress` mean the phase is halted on a reopened task. Handle it before any new task, as the "Failed Re-verification Halt" in [reference.md](reference.md) directs: on `continue`, re-verify the working tree first, with the task's starting commit recovered as the parent of its own `red(AC-n)` commits at the tip of `git log`, or HEAD when the tip has none.
```

## Dispositions

| # | Confidence | Disposition |
| --- | --- | --- |
| 1 | High | Applied (reference.md:191, :200). |
| 2 | High | Applied (sub-agent-prompts.md:112). It is outside the two named files but inside the implement skill, and it is the stale copy of the rule this task replaces. |
| 3 | Medium | Applied (SKILL.md:403, same line; SKILL.md stays at 433 lines). |
| 4 | Low | Recorded only. Needs a durable report carrier; belongs with `prompts-ev16` (D11). |
| 5 | Low | Recorded only. The wording follows the user's decision. |
| 6 | Low | Recorded only. |
| 7 | Low | Recorded only. The user chose "reopen". |

Beads inventory: no bd command line moved in these edits. `update [id] --status=open` stays at reference.md:178 (verified on 1.1.0: `bd version` 1.1.0, `-s, --status string  New status` in `bd update --help`).

### Coordinator follow-up after verification (2026-10-18)

The verifier found that `git restore --staged --worktree .` acts only on the current directory. The coordinator often runs from a subdirectory, so changes elsewhere in the repository would have survived. `reference.md:200` now uses `:/`, which covers the whole repository.

I proved the fix in a scratch repository by running the restore from `src/`:

- tracked edits in `src/` and `docs/` were reverted;
- a staged new file was removed;
- the `red(AC-1)` commit was kept.

Two other verifier notes were routed to `prompts-ev16`:

- the worker's created-file list does not survive a fresh session;
- a fresh session cannot tell a halt after a first-FAIL plan defect from a halt after a failed re-verification.
