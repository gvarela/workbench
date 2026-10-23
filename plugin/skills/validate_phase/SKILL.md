---
name: validate_phase
description: Validate an implemented phase, or the whole plan, against tasks.md and design.md - planned changes missing from the diff, changes no task covers, earlier phases' tests changed again, a review of the tests, and progress toward each README Intent statement - and produce a pass/fail report. With all, also writes the Intent verdicts back to the README. Use when the user asks to validate, verify, re-check, or review a finished phase or plan, to get the README verdicts a plan is missing, or after a phase that ran without a checkpoint. Takes the project directory and a phase number or all.
argument-hint: <plan-dir> [phase | all]
allowed-tools: Read
model: opus
effort: high
---

# Validate Phase

Checks one implemented phase, or every phase of a plan, against what the plan said it would build. `/wb:implement` and `/wb:implement_inline` already run the same checks at each phase checkpoint; run this to repeat them on demand, after a phase that ran outside those skills, or with `all` to get the plan's Intent verdicts into its README.

It reuses the checkpoint's agents rather than defining its own, so a phase validated here and at its checkpoint is judged the same way:

- `wb:phase-verifier`, from the "Phase Verifier Prompt" in [../implement/sub-agent-prompts.md](../implement/sub-agent-prompts.md), with values as "Phase Verification" in [../implement/reference.md](../implement/reference.md) describes them
- `wb:test-reviewer`, with the inputs in Step 3
- [templates.md](templates.md): the Validation Report template (Step 5)
- [intent-verdicts.md](../../docs/reference/intent-verdicts.md): the verdict per Intent statement and the README echo (`all` only)
- [deferred-design-questions.md](../../docs/reference/deferred-design-questions.md): the deferred design questions the report lists (`all` only)

## Initial Response

This stage needs from you: the phase to check, or all; the manual checks only you can run; an answer for each unexplained deviation by name; and, for all, your reading of the verdict per Intent statement.

When invoked:

1. **Plan directory and argument given** (e.g., `/wb:validate_phase docs/plans/2025-01-08-my-project/ 2`): `$1` is the plan directory; `$2` is a phase number or `all`.
2. **Plan directory only**: read the phase milestones in tasks.md's `beads_phases` with `bd show [milestone-id]`. When every milestone is closed, run `all`. Otherwise ask which phase to check, naming each phase with its milestone state, because checking an unfinished phase reports work that has not landed.
3. **Nothing given**: ask for the plan directory (e.g., `docs/plans/2025-01-08-my-project/`) and a phase number or `all`.

## Process Steps

### Step 1: Context Discovery

**⛔ BARRIER 1**: README.md, research.md, design.md, and tasks.md read in full before anything runs — validation against partial context reports gaps that are really unread text.

1. **tasks.md**: the phases, each phase's task keys and beads ids in the frontmatter, Outer Test Steps, Design Coverage table, automated verification commands, and Implementation Notes.

   **Session-start sanity check**: read `beads_epic` from tasks.md frontmatter. If it is present, confirm the right database is open before doing any work (see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md)):

   ```bash
   bd context            # resolved database name and beads dir
   bd show [epic-id]     # the plan's epic; must resolve
   bd stats              # total issue count
   bd version            # requires bd 1.1.0 or later
   ```

   If `bd show [epic-id]` fails, present the Wrong database case from [docs/reference/beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and stop. If the frontmatter has no `beads_epic`, note "plan predates beads tracking, sanity check skipped": the phase verifiers read task records from beads, so report the phase verifiers as not run, with that reason, and spawn none.

2. **design.md**: the Success Metrics, which Intent statement each refines (`(refines: ...)`), the Deferred list, the Acceptance Criteria, the manual checks, and the Assumptions and Pending Decisions tables (`all` reads them for deferred questions).
3. **research.md**: the Testing Conventions section (test paths and commands), or `.claude/wb/testing.md` when research has none, as the test-quality skill names the source.
4. **README.md**: the `## Intent` section's "Success looks like" statements. With none, the Intent lines carry "no Intent section (plan predates 3.0.0)".

### Step 2: Recover the Commits and Run Automated Verification

Run one plain command per Bash call, as [non-interactive-shell.md](../../docs/reference/non-interactive-shell.md) says: permission rules deny loops, `cmd; echo` chains, and shell variables, and a denied call stalls the step. Find the commits from `git log`, never from tasks.md's `git_commit`, which `/wb:update_status` rewrites at every reconciliation:

- **A phase's starting commit**: the parent of the earliest commit that names one of the phase's task ids or adds one of its criteria's `red(AC-n)` commits (criterion ids repeat across plans, so match the title too; a sanctioned rewrite's later `red(AC-n)` commit does not move it).
- **A phase's end**: the next phase's starting commit. For the last phase that has commits, the latest commit that names one of its task ids, adds one of its criteria's `red(AC-n)` commits, or touches the plan directory; HEAD only when nothing came after it. Say in the report that later commits are outside the review. "Working tree" when `git status --short` shows that phase's changes uncommitted.
- **Plan starting commit**: phase 1's starting commit.
- **Red commits**: the latest `red(AC-n)` commit of each criterion, a sanctioned rewrite's replacing the original.

When the plan's commits name no task ids at all (a plan built without one commit per task), ask the user for each phase's range rather than reporting the phases as unimplemented, and pass the plan start as `unknown` unless they give one. Otherwise a phase with no such commit was not implemented: report it as not run, with that reason, and spawn nothing for it.

Then run the automated verification once for the run, not per phase, because every phase verifier judges the same tree: the test suite, lint, typecheck, and build commands from tasks.md's Automated Verification sections. Record each command and whether it passed; the phase verifiers take those results as input.

### Step 3: Spawn the Verifiers

Sub-agents return findings and write nothing; you write the report after synthesizing them, so the report has one author and one voice. Spawn every agent below in one message, so they run in parallel, each with no `model` parameter: both definitions pin Opus at `high`.

- **Phase verifiers**: one `wb:phase-verifier` per phase checked (for a phase number, that phase; for `all`, every implemented phase), each from the "Phase Verifier Prompt" with its own range and task ids (issues filed during the phase included, as reference.md's Values say), the same plan starting commit, the red commits of criteria delivered up to its phase, and "final phase: yes" only for the plan's last phase.
- **Test review**: one `wb:test-reviewer` over the phase's range (`all`: from the plan starting commit to the last phase's end). The mode is `inline`: per-task verifier reports cover one task each, so the reviewer checks test integrity over the range itself. Pass the criteria in the range with their examples, observed-at boundaries, and seams (from tasks.md), the red commits, and the conventions source. Under both implement skills, `wb:test-writer` posts every report as a comment on the task it served. Read them for each task id in the range, and for the task id each sanctioned rewrite's `red(AC-n)` commit names on its second line, with `bd comments [task-id] --json`, taking each comment's `text` field (the plain `bd comments` drops backticks and `<...>` spans); a report is a comment with a Mode field (a comment beginning `worker report:`, `verification report:`, `test integrity:`, `created files:`, `support files:`, `setup files:`, `halted:`, or `discarded:` is a record, not a report), and a `discarded:` comment voids the inner reports and support-file and setup-file lists posted before it. Pass the paths in each harness task's `support files:` records too, by task with its type, and in each setup task's `setup files:` records, by task with its `Setup files:` line, because the reviewer counts support files as declared only on harness tasks and setup files only on the setup task whose line names them. Pass the reports only when every task whose commit changes a test file has at least one, and otherwise pass "none recorded" with the reason: a partial set would make the unreported tasks' test changes read as undeclared. A plan with no acceptance criteria predates 5.0.0: the reviewer still runs, without criteria.

A phase verifier that returns FAIL with `Cause: missing context (<what>)` may have been given a wrong range or task id: check what you passed against tasks.md and `git log`, correct it, and spawn it again.

Settle the reviewer's Majority Candidates as implement's phase review does, because a judgment-only Remove or Rewrite needs three independent judgments and a second reading in the reviewer's own context is not independent. Spawn `wb:test-reviewer` again with the Candidates input (each candidate's location, rubric item, and proposed verdict, without the first review's reasoning) and the criteria those candidates cite, with their examples; spawn a third time, with the same inputs, for each candidate the first two judgments split on. A candidate that 2 of 3 judgments agree with becomes a finding, recorded as "n of 3"; any other goes under "review these". File each escalated integrity finding and each "n of 3" finding as an issue linked to its task, so a Rewrite or Remove proposal outlives the report: `bd create "Test review: <verdict> <file:line>" --type=task --priority=2 --deps discovered-from:[task-id] -d "<rubric item, quoted excerpt, evidence type, and n of 3 or escalated>"`, where the task is the one whose commit last changed the test (`git log -1 -- <test file>`), or the plan's epic when that commit names no task.

**⛔ BARRIER 2**: every phase verifier, the test review, and every judgment on its candidates has returned (subagents run in the background, so wait for a completion notification from each one) — the report folds in every one of them, and a missing one hides a deviation or a blocking test.

### Step 4: Verdicts and Deferred Questions (`all` only)

1. **Verdict per Intent statement**: derive each from the final phase verifier's Intent Progress and the other phases' reports, as [intent-verdicts.md](../../docs/reference/intent-verdicts.md) says. No agent is spawned for this: the phase verifiers already gathered the evidence.
2. **Deferred design questions**: find the ones still open and list them as [deferred-design-questions.md](../../docs/reference/deferred-design-questions.md) says.

For a single phase, the report carries that phase's Intent Progress instead, and writes no verdict, because a statement can be met only once its last phase is done.

### Step 5: Generate the Validation Report

**⛔ BARRIER 3**: every automated verification command from Step 2 has run in this session and its result is recorded — the report asserts those results, and an unverified claim must not appear in it.

Read [templates.md](templates.md) NOW and write the report from its "Validation Report Template", matching its structure. Each phase verifier's findings go where "Phase Verification" in [../implement/reference.md](../implement/reference.md) says they go in a checkpoint report: an unexplained deviation under Needs Your Decision with its options, numbered D1, D2, ... across the whole report so a reply can name it, and an explained one under Follow-ups with the record that explains it.

### Step 6: Apply the Answers and Update Documentation

Wait for the user's reply. A general go-ahead does not answer a deviation or a FAIL verdict, because nobody chose it. This skill changes no code, so it routes each answer rather than doing the work:

- **`accept: D1`** (or `accept fail: <statement>`): record it and its reason in tasks.md's Implementation Notes, as "Phase Verification" in [../implement/reference.md](../implement/reference.md) says, with a follow-up issue for a deferred missing change or a FAIL shipped short.
- **`fix: D1`** (or `fix: <statement>`): file the work as a task, `bd create "<the change, in plain words>" --type=task --priority=2 --deps discovered-from:[phase-milestone-id] -d "<the deviation or statement, its file:line, and what done looks like>"`, and name `/wb:implement <plan-dir> continue` as the next step.
- **`plan defect: D1`** (or `plan defect: <statement>`): file the design-revision issue as step 1 of the "Plan-Defect Deviation Protocol" in [../implement/reference.md](../implement/reference.md) says, and name `/wb:create_design <plan-dir>` as the next step. A deferred question answered in the reply is closed as deferred-design-questions.md says, with `validate_phase` as the stage.

**Verdict echo** (`all` only, pass or fail): write it after the reply from this report's verdicts, leaving out each statement a `fix:` answer touches, as [intent-verdicts.md](../../docs/reference/intent-verdicts.md) says; those get their verdict when `/wb:validate_phase <plan-dir> all` runs again after the fix. Skip it when there is no Intent section.

Then run `/wb:update_status` to reconcile tasks.md with beads (it is the sole writer of progress fields). When validation failed, name the work that remains and re-run `/wb:validate_phase` after it is done.

## What Makes a PASS vs FAIL

The overall status follows the report's sections, so the user can act from Needs Your Decision alone:

- **PASSED**: every phase verifier passed, every automated check passed, and nothing is under Needs Your Decision.
- **PASSED WITH ISSUES**: nothing is under Needs Your Decision, and Follow-ups lists what remains (explained deviations, advisory test findings, statements at risk that do not block, checks not run). Follow-ups never fail a validation.
- **FAILED**: anything is under Needs Your Decision: an unexplained deviation, a blocking test-review item, a failing automated check, or, for `all`, a FAIL verdict on a statement the plan did not defer.

Assess what IS, not what should be: cite file:line for every claim, and pair each problem with a proposed fix.

## Relationship to Other Commands

1. `/wb:create_tasks` - Plan how to build, with the Design Coverage table the phase verifier reads
2. `/wb:implement` or `/wb:implement_inline` - Build it; each checkpoint runs the phase verifier and the test review, and the final one writes the Intent verdicts
3. **`/wb:validate_phase <plan-dir> [phase | all]`** - Re-check a phase or the whole plan ← YOU ARE HERE
4. `/wb:create_handoff` - Document for the next session (if needed)
