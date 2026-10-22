---
name: implement
description: Implement a project's tasks.md by coordinating fresh-context worker agents (one per task, model chosen per task), verifying each with a task-verifier, and escalating verified failures. The default execution path: use when the user asks to implement, build, or execute a planned phase, asks for workers or coordination, or wants the main context kept clean. Takes the project directory and a phase number or continue.
argument-hint: [project-directory] [phase-number|continue]
allowed-tools: Read
---

# Implement (Coordinated Execution)

**Next-generation task implementation using coordinator + worker agent pattern.**

You coordinate task implementation from `tasks.md` by spawning worker agents sequentially, each with focused context and fresh context window. This prevents main session context bloat.

**Recommended for**: Long phases with many tasks, sessions where context compaction would be disruptive, or when you want the main window available for monitoring/debugging. If a phase has already needed one `/compact` and is heading for another, stop at a task or phase boundary and ask the user whether to write a handoff or keep going; the "Handoff Decision" in [reference.md](reference.md) has the question.

Supporting files in this directory (read each when its step directs you to — never paraphrase from memory):

- [sub-agent-prompts.md](sub-agent-prompts.md) — verbatim worker, Outer Test, verifier, and fix-worker prompts
- [templates.md](templates.md) — output templates for aggregation, reports, notes
- [reference.md](reference.md) — context-package spec, model selection, failure playbook, evidence in beads
- [README.md](README.md) — design rationale (for humans; not needed at runtime)

## Initial Response

This stage needs from you: the phase to run, a go-ahead at each phase checkpoint after reading its test review, acknowledging each blocking item by name, a decision when a verified failure or a plan defect halts the phase, and a handoff decision when a phase that has already compacted heads for another compaction.

When invoked, check for arguments:

1. **If directory and phase provided** (e.g., `/implement docs/plans/2025-01-08-my-project/ 1`):
   - Use `$1` as project directory
   - Use `$2` as phase number (or "continue" to resume)
   - Read all documentation immediately
   - Begin coordination

2. **If partial arguments**:
   - Use provided arguments
   - Prompt only for missing ones

3. **If no arguments**:

   ```
   I'll coordinate task implementation using worker agents with fresh context. Please provide:
   1. Path to the project documentation directory (e.g., docs/plans/2025-01-08-my-project/)
   2. Which phase to implement (number or "continue" to resume from current phase)
   3. Any specific context or constraints for this implementation session (optional)

   I'll spawn worker agents sequentially to keep the main session context clean.
   ```

## Implementation Philosophy

### Core Principles

Plan discipline (TDD via the workers, beads for all status tracking, phase checkpoints, one commit per verified task) plus:

1. **Coordination Over Direct Implementation**: Main agent orchestrates, doesn't code
2. **Context Extraction**: Build minimal context packages for workers
3. **Sequential Execution**: Simple, predictable, one task at a time
4. **Worker Isolation**: Each worker operates in fresh context
5. **Model Selection**: Right model per task via per-spawn override on the task-worker agent (haiku/sonnet/opus; fable only as the escalation target)
6. **Main Session Stays Clean**: No context accumulation in coordinator

### Scope

Workers implement what tasks.md specifies and nothing else: the verifier fails extras, and each extra widens what the next phase must trust. Do not add features, refactors, error handling, or abstractions the task does not name.

If something seems missing, do not add it: record it in Implementation Notes as a follow-up. If the task cannot succeed without it, that is a plan defect; use the Plan-Defect Deviation Protocol.

## Process Steps

### Step 1: Read and Understand Context

**⛔ BARRIER 1: research.md, design.md, and tasks.md read in full — a context package built from partial reads sends gaps to every worker**

```javascript
const projectDir = $1 || /* prompt for it */;
const phase = $2 || /* prompt for it */;

// Read all project files FULLY
const researchFile = `${projectDir}/research.md`;
const designFile = `${projectDir}/design.md`;
const tasksFile = `${projectDir}/tasks.md`;
```

1. **Read project structure**:
   - Check that specified directory exists
   - Verify presence of research.md, design.md, tasks.md

2. **Read research.md FULLY**:
   - Understand what currently exists in the codebase
   - Note patterns and conventions to follow
   - Identify key file:line references
   - Extract testing framework, file structure, naming conventions

3. **Read design.md FULLY**:
   - Understand the desired end state
   - Review success criteria for the phase
   - Note automated and manual verification requirements
   - Identify architectural constraints

4. **Read tasks.md FULLY**:
   - Identify current phase from frontmatter
   - Count completed vs remaining tasks
   - Read beads tracking configuration
   - Understand task structure and dependencies

**Work out:**

- What patterns should workers follow from research?
- What's the goal from the design?
- What EXACT tasks are specified in tasks.md?
- What minimal context does each worker need?

After reading all documentation, prepare to spawn workers sequentially.

### Step 2: Verify Beads Configuration

Use beads for all task tracking (phases and granular tasks).

#### Verify Beads is Initialized

```bash
bd info    # Check beads is initialized
```

**If beads is not initialized or has errors**: follow [docs/reference/beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) — present its standard message and stop until the user initializes beads.

#### Beads Persistence

Persistence: see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md); nothing to detect. The local database is the source of truth; a Dolt remote or `bd backup` carries it across machines.

#### Session-Start Sanity Check

Read `beads_epic` from tasks.md frontmatter. If it is present, confirm the right database is open before doing any work (see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md)):

```bash
bd context            # resolved database name and beads dir
bd show [epic-id]     # the plan's epic; must resolve
bd stats              # total issue count
bd version            # requires bd 1.1.0 or later
```

If `bd show [epic-id]` fails, present the Wrong database case from [docs/reference/beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and stop. If the frontmatter has no `beads_epic`, note "plan predates beads tracking, sanity check skipped" and continue.

#### Verify Beads Tracking Configuration

Check that tasks.md frontmatter has beads tracking:

```yaml
beads_epic: [epic-id]
beads_phases:
  phase1_milestone: [milestone-id]
beads_tasks:
  phase1_setup_1: [task-id]
  phase1_impl_1: [task-id]
  # ... all tasks
```

**If frontmatter is missing**: Tell user "Run `/wb:create_tasks` to configure beads tracking."

### Step 3: Extract Context Package

**Build a minimal context package for workers** from the documentation you've read — only your choices from the plan and this session's state: the plan directory, patterns from research.md, this phase's constraints from design.md, beads IDs from tasks.md frontmatter, test commands, and the file references relevant to this phase. Task text and criteria stay out, because each agent reads its task from beads and the cited criteria from the plan. Its `taskTestContext` is the exception: build it per task in Step 5, when the task is about to run, because it holds that task's starting commit and red commits.

**Read [reference.md](reference.md) NOW** — its "Context Package Structure" section is the exact structure to build. Do not improvise the shape.

### Step 4: Find Available Work

Find ready work in beads (a lookup, not a synchronization point). Before the phase's first task, record `git rev-parse HEAD` as the phase's starting commit; the Step 8 test review diffs from it.

```bash
bd ready   # tasks with no open dependencies
```

**Start with the first ready task**. After each worker completes, `bd ready` will show newly unblocked tasks.

### Step 5: Spawn Worker Agents Sequentially

The coordinator is operating autonomously within this task loop. Nobody is watching in real time, so asking "Want me to…?" blocks the work. For reversible actions that follow from the plan, proceed without asking. Before ending a turn, check the last paragraph: if it is a plan, a question, or a promise about work not yet done ("I'll now run…"), do that work now with tool calls. End the turn only when the phase is complete or blocked on something only a human can decide. This does not apply to phase checkpoints, plan-defect halts, the failed re-verification halt, the missing-context halt, the rule-gap halt, or the handoff decision — those stop for a human by design.

**For each ready task in the phase**, spawn a focused worker agent:

1. **Get next task**: Run `bd ready` to find available work. An outer test step (a `phaseN_outer_n` key in the tasks.md frontmatter) never goes to a worker, because workers may not edit tests. Take the implementation task it blocks (`bd show` lists it) as the next task once that task's other open blockers are only outer test steps: that task's item 6 writes the outer test and closes the step. A step that blocks no implementation task gets item 6 on its own.
2. **Check task details**: Run `bd show [task-id]` for requirements
3. **Project delegation size** (coordinator judgment): estimate the worker's tool-call cost — reads of files it must not break (4-8) + discovery (3-6, or ~0 if the context package names the exact files) + source edits (4-10) + 1-2 calls per test file touched + suite runs (3-5) + lint/verification/close (3-5). Subagents hard-stop when they exhaust their tool-call budget (observed near ~70 calls), and the truncated work is always the finishing tail. **A task projecting past ~50 calls: split it at its natural seam before spawning** — usually source change, then test conversion — as separate beads issues (`bd create` the slices, `bd dep add` to order them, close the original with `--reason "split"`)
4. **Determine model** (coordinator judgment — read the task content and pick the tier):
   - Haiku: Mechanical only (config, docs, renames)
   - Sonnet: Standard implementation including bugs and refactors - DEFAULT when unsure
   - Opus: Architectural or cross-cutting tasks
   - Fable: never as a first spawn — the escalation target after a verified failure (Step 6)

   The spawn sets only the model: the Agent tool has no effort parameter, so every worker runs at the `effort` in `task-worker.md` frontmatter (`medium`), whatever model the spawn picks and whatever effort this session runs at. Escalation raises the model, not the effort. The verify-then-retry loop below is what makes the cheap default safe — fix workers escalate to fable, one attempt.
5. **Record the starting commit**: `git rev-parse HEAD`, before any outer test or worker work, as `taskTestContext.startingCommit`; the verifier diffs against it. Build the rest of `taskTestContext` for this task as reference.md specifies.
6. **Write missing outer tests**: spawn `wb:test-writer` with the "Outer Test Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md), naming every criterion the task cites that has no `red(AC-n)` commit yet, at most one per target test file (each criterion's file is in its outer test step): criteria that share a file are written and committed one at a time, with one more spawn after each round's commits, because a commit takes the whole file and each `red(AC-n)` commit should add only its own test; criteria in separate files share the spawn. It posts one report per criterion on the task and returns one short block per criterion, which carries the test file and the red line, so do not read the full reports here (post one yourself only if its block's `Full report:` line says it was not posted). When the blocks arrive, batch the rest, because each outer test costs coordinator context per call:
   - **One red run**: run the done criteria's test files in one command per boundary's test command and confirm each fails on an assertion, matching its block's `Red:` line.
   - **One commit call**: in one Bash call, commit each test on its own as `red(AC-n): <criterion title>` (`git add <its test file> && git commit -F - -- <its test file> <<'WB_REPORT_END'`, then the message line and `WB_REPORT_END`, both at column 0, one criterion after another on separate lines; the quoted heredoc keeps a backtick or `$` in the title from expanding), so each criterion keeps its own red commit for the verifier's identity check. The pathspec keeps a commit to its own file even when an earlier commit in the call failed and left its file staged. Then read the new commits with `git log --oneline` and record each as its criterion's `redCommit`; a criterion with no commit there gets no close until its commit succeeds.
   - **One close call**: record the evidence as "Evidence in Beads" in [reference.md](reference.md) says, closing each step with `bd close [outer-step-id] --reason-file -` and its red record on stdin, one heredoc per step in one Bash call (with the id: a bare `bd close` closes the last issue touched, which is the task from item 2). Then spawn again for any criterion still waiting on a shared file, including one returned blocked with `shares <file> with <id>`, which is a deferral, not a failure.

   A block of blocked (other than `shares`), or a failure that is not an assertion (an import or setup error), proves nothing about the behavior: commit nothing for that criterion, commit and close the done ones as above, and handle it as Case B of the "Worker Failure Playbook" in [reference.md](reference.md) before spawning the task's worker. A criterion waiting behind it in the same test file waits for that decision too, because the blocked test is still in the file and the next red commit would take it in; criteria waiting on other files go on. A `criterion not found` block goes to the "Missing Context Check" in [reference.md](reference.md) instead, because the id or path you sent may be what is wrong.
7. **Spawn the `task-worker` agent** with the chosen model as a per-spawn override. **Read [sub-agent-prompts.md](sub-agent-prompts.md) NOW** and build the worker prompt from its "Worker Prompt Template": the task ID, the plan directory, and the context package with this task's starting commit and red commits; the worker reads the task text and criteria itself. The template defers the claim, the process, the constraints, and the report format to `task-worker.md`, and keeps `bd close` as the worker's last act. Use it verbatim with values filled in.
8. **Collect worker output** when complete, then verify (Step 6)

**No acceptance criteria: plan predates 5.0.0.** When the phase has no outer test steps and its tasks cite no criteria, skip item 6, and say in your output that the plan has no acceptance criteria because it predates 5.0.0, so outer tests are skipped and no red commits will appear (the human needs to know why); `taskTestContext` holds only the starting commit and conventions. Workers still never edit tests and the verifier still checks test integrity against the starting commit, because both protect the tests however the plan was written.

**Loop**: Spawn → Wait → Verify → Next task

### Step 6: After Each Worker Completes

**⛔ BARRIER 2: the worker's completion notification received and its output verified before the next task — the next worker builds on this task's landed state**

After each worker completes:

1. **Verify task was closed**:

   ```bash
   bd show ${taskId}  # Should show status: closed
   ```

2. **Collect worker output**: the worker's returned block gives a one-line summary, the files changed, tests, test command, support files, setup files, issues, and blockers. Its full report is the task's `worker report:` comment, and the test-writer reports and `support files:` and `setup files:` records are in the task's comments too, posted by the agents themselves ("Evidence in Beads" in [reference.md](reference.md)). Do not read or repost them here: the verifier reads them from the comments itself. If its `Full report:` line says the report was not posted, post the report it returned, as "Evidence in Beads" says.

3. **Verify task completion**:

   Spawn `wb:task-verifier` using the "Verification Agent Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md) — read it before spawning. Pass no `model` parameter: the verifier's definition pins Opus at `high` effort, and a per-spawn model overrides the definition, so passing the worker's model would run the quality gate on the cheaper model. Besides the task ID, the plan directory, and the files from the worker's block, it gets the task's starting commit and the red commits; it reads the task and its cited criteria itself, and the worker report, the `wb:test-writer` reports, and on a harness or setup task the support or setup files from the task's comments. It runs the tests, checks scope, and checks test integrity and criterion protection. A changed outer test, a test change that neither a report nor a harness task's declared support files nor a setup task's declared setup files cover, or a test that does not protect its criterion is a FAIL even when every test passes. The verifier posts its full report and its Test Integrity section (the `test integrity:` comment the Step 8 test review reads) on the task itself, the re-verification's included, and returns a short block. A returned report that opens with a `Not posted:` line is a failed post: post what it names, as "Evidence in Beads" says.

4. **Parse verification result autonomously**:

   The verdict is the returned block's status heading: three hashes, `Status:`, then PASS or FAIL.

   ```javascript
   // FAIL wins: a FAIL verdict, both verdicts (on two lines or one), or neither is a FAIL —
   // ambiguous verification is failed verification
   const hasVerdict = (word) => new RegExp(`^#{3} Status: ${word}\\s*$`, "m").test(verificationReport);
   const passed = hasVerdict("PASS") && !hasVerdict("FAIL");
   ```

   **If PASS**:
   - **Commit the task**: the coordinator commits that task's files with a message naming the task and its beads id. One task, one commit; a sanctioned rewrite's test is committed as its criterion's new red commit ("Sanctioned Outer-Test Rewrite" in [reference.md](reference.md)). Coordinator-side plan-doc edits (tasks.md notes, discoveries) are separate commits, made only between tasks, never while a worker or verifier runs, so they never land in a worker's diff. Structural and behavioral changes are separated at the task level (create_tasks' structure-before-behavior rule), so one commit per task keeps them apart.
   - Add to the success log and the aggregated lists: modified files, test commands, and implementation notes if the worker found issues
   - Run `bd ready` and spawn the next worker (Step 5)

   **If FAIL** — the failure type is the `Cause:` line in the returned block. When it is missing, judge from the evidence with the plan-defect signals in [reference.md](reference.md). `Cause: missing context (<what>)`, on a first verification or a re-verification, goes to the "Missing Context Check" in [reference.md](reference.md) before either branch below, because the verifier could not find its task or a criterion and the wrong input may be yours. A FAIL whose only failing findings are undeclared test changes that add setup and change no example or assertion, or a plan-defect cause where the design is sound but a wb rule left the change no route, goes to the "Rule-Gap Halt" in reference.md, because neither a fix worker nor a design revision can give the change a route.

   - **Implementation defect** (task is achievable as specified; the worker got it wrong, including every integrity and protection finding):
     - On a lost-coverage FAIL (a sanctioned rewrite that stopped catching cases), first run the "Lost-coverage Fix Check" in [reference.md](reference.md): a suggested fix that lists cases goes back to the verifier for a class fix, which does not count as the fix attempt.
     - Attempt one automatic fix using the "Fix Worker Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md), then re-verify, reading the task's comments again for the fix worker's reports; without them, its test changes read as undeclared.
     - **If re-verification fails**: halt the phase. Start no further task, because the failed task's changes are still uncommitted and every later verifier would see them as foreign changes and fail too. Follow the "Failed Re-verification Halt" in [reference.md](reference.md): reopen the task's issue, record the halt kind on it, leave its changes in the working tree, and present the halt message with its options.
   - **Plan defect** (task cannot succeed as specified, such as a wrong or ambiguous criterion, or a design assumption that doesn't survive contact with the code): do not spawn fix workers; retries cannot fix a task that is wrong as specified. Follow the "Plan-Defect Deviation Protocol" in [reference.md](reference.md) — file a design-revision issue, block dependent tasks, record the halt kind on the task, halt the phase for a human checkpoint.

**Handle unfinished workers** (worker left the task `in_progress` without closing it): this is NOT a verification failure, and verification is not run. It is one of two distinct events — **truncation** (worker exhausted its tool-call budget; partial work landed, finish the remainder — never retry whole) or **genuine failure** (crash or reported blocker; little landed). Run `git status` to tell them apart, then follow the "Worker Failure Playbook" in [reference.md](reference.md) for the matching remedy; a Blockers line that begins `missing context:` goes to the "Missing Context Check" in reference.md first, and one that begins `no route:` to its "Rule-Gap Halt". A `wb:test-writer` block that reaches you directly was meant for a worker that ended first (possible in `claude -p`): the test-writer has already posted its report on the task, so post the report only if the block's `Full report:` line says it was not posted, and handle that task as unfinished here.

### Step 7: Aggregate Results

**⛔ BARRIER 3: every phase task closed — aggregating and verifying on a partial phase reports work that has not landed**

After all workers for the phase complete, aggregate their outputs:

#### Update Modified Files Section

Collect modified files from all workers and update tasks.md using the "Modified Files Aggregation" template in [templates.md](templates.md) — read it before writing.

#### Check Phase Completion

```bash
# Verify all phase tasks are closed
bd show ${phaseMilestoneId}

# Should show: blockedBy: [] (no remaining dependencies)
```

### Step 8: Run Phase Verification

**⛔ CHECKPOINT: Phase ${phase} Complete — the next phase builds on what a human has accepted**

Phase verification (if this phase already compacted, suggest a fresh session for the next phase in the report; "Handoff Decision" in [reference.md](reference.md)):

#### 1. Verify All Phase Tasks Closed

```bash
bd show ${phaseMilestoneId}    # Authoritative: blockedBy must be empty
bd list --status=in_progress   # Should be empty for this phase
```

The milestone's dependency list is the completion check — every phase task blocks the milestone, so an empty `blockedBy` means all tasks are closed. Do not grep titles for phase membership.

**Requirement**: All phase task beads issues must be closed.

#### 2. Run Automated Verification

```bash
# Adapt these to actual commands from tasks.md
make test           # or npm test, go test ./..., pytest
make lint           # or npm run lint, golangci-lint run
make typecheck      # or npm run typecheck, go build ./...
make build          # or npm run build, go build
```

**Requirement**: All automated checks must pass.

#### 3. Review the Phase's Tests

Spawn `wb:test-reviewer` with no `model` parameter (its definition pins Opus at `high`). Give it the phase's starting commit (Step 4), the phase's criteria with their examples, observed-at boundaries, and seams, the red commits, each task verifier's Test Integrity section from the phase tasks' `test integrity:` comments, the conventions source, and mode `implement`. It reviews the phase's tests as a whole and proposes findings; it edits nothing.

Then settle its Majority Candidates, because a judgment-only Remove or Rewrite needs three independent judgments and a second reading in the reviewer's own context is not independent. Spawn `wb:test-reviewer` again with the Candidates input (each candidate's location, rubric item, and proposed verdict, without the first review's reasoning) and the criteria those candidates cite, with their examples, since each judgment weighs the test against its criterion. Spawn a third time, with the same inputs, for each candidate the first two judgments split on. A candidate that 2 of 3 judgments agree with becomes a finding, recorded as "n of 3"; any other goes under "review these". File each escalated integrity finding and each "n of 3" finding as an issue linked to its task, as "Evidence in Beads" in [reference.md](reference.md) shows, so a Rewrite or Remove proposal outlives this summary. A Rewrite of an outer test that the person sanctions by name runs as a task you file and run before closing the milestone, under "Sanctioned Outer-Test Rewrite" in reference.md, because the rewrite must keep everything the red-commit version catches.

Only the reviewer's Blocking section holds the go-ahead. It lists deterministic failures in tests this phase changed: a criterion with no outer test or one below its observed-at level, a changed outer test, an undeclared test change, a test that cannot fail, and a planted defect that survives. The evidence for a changed outer test or an undeclared change comes from the integrity script each task verifier ran; the reviewer finds the rest itself. The rule is this narrow because repositories the user does not control hold legacy tests that belong to others, so a test the phase did not change never blocks, and judgment-only findings stay advisory and inform the go-ahead without holding it. The integrity-finding counts, total and escalated, are the reviewer's Integrity line.

#### 4. Request Manual Verification

Present the checklist to the user, writing each item as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says and keeping its section order, so product progress and test housekeeping stay apart and no item is a bare id:

```
✅ Phase ${phase} Automated Verification Complete, all passing (tests: [test command]; lint: [lint command]; typecheck: [typecheck command]; build: [build command])

**Needs your decision:**
${each blocking item (a deterministic failure in a test this phase changed): what it is in plain words (criterion, file), what it puts at risk, and that it needs your acknowledgement before the milestone closes; each proposed outer-test Rewrite, with a recommendation; if this phase compacted, whether to start the next phase in a fresh session, with a recommendation ("Handoff Decision" in reference.md); or "Nothing needs your decision"}

**What this phase delivered** (by acceptance criterion):
${each criterion and task done as behavior you can now rely on, ids in parentheses: "- <behavior> (AC-n, task <id>)"}

**Manual checks** (from design.md):
${manualVerificationSteps}

**Test integrity** (proposals; no test was edited):
- Outer tests committed red first: ${each named by the criterion it guards}
- Integrity findings: ${integrityTotal} (${integrityEscalated} escalated)
- Review findings: ${reviewFindings, each with the criterion it guards and what the weakness lets through}  (settled candidates marked "n of 3")
- Review these: ${reviewThese, each in plain words with its file:line after}

**Follow-ups** (each: what it is, what it puts at risk, whether it blocks the phase or the release, and when to do it):
- Product and plan: ${behavior gaps, design questions, and risks in the code such as security or performance, or "none"}
- Test quality: ${weak or brittle tests and checks that fail on correct code, or "none"}

**Beads state:** all Phase ${phase} tasks closed; the Phase ${phase} milestone (${phaseMilestoneId}) is ready to close.

Reply when manual verification is complete, acknowledging each blocking item above by name, if any, and naming any outer-test Rewrite you sanction, and I'll close the phase milestone.
```

**Requirement**: Wait for user confirmation before proceeding. When the review listed blocking items, the confirmation must acknowledge each one by name; a general go-ahead does not clear them, because a person has to have seen each failure before the next phase builds on it.

#### 5. Close Phase Milestone

**ONLY after user confirms manual verification**:

```bash
bd close ${phaseMilestoneId} --reason "Phase ${phase} complete: ${summary}. All ${taskCount} tasks closed via worker agents, automated verification passed, manual verification confirmed."
bd ready  # Check what's now unblocked (next phase tasks)
```

#### 6. Report Completion

Report using the "Phase Completion Report" template in [templates.md](templates.md) — read it before writing the report.

### Step 9: Update Status

After phase completion:

1. **Verify beads state**:

   ```bash
   bd stats    # Check overall progress
   bd list --status=closed    # See what's complete
   bd ready    # See what's available next
   ```

2. **Reconcile tasks.md frontmatter via `/wb:update_status`**: run `/wb:update_status [project-directory]` to update `status`, `current_phase`, and `completed_tasks` from beads state — `update_status` is the sole writer of those fields, so do not hand-edit them here. It's fine to note `execution_mode: coordinated` in the frontmatter while running the reconciliation, since `update_status` doesn't own that field.

3. **Add implementation notes** with worker insights and the phase's integrity-finding counts (total and escalated) from Step 8, using the "Implementation Notes Entry" template in [templates.md](templates.md).

4. **Record durable learnings.** If this phase established something the next session would otherwise rediscover — a repository convention, a tool quirk, a constraint the plan did not state — record it:

   ```bash
   bd remember --key <project>-<slug> "<one sentence: the fact, then why it matters>"
   ```

   Qualifies: constraints and conventions. Does not qualify: task outcomes (beads has them), plan deviations (Implementation Notes has them), anything specific to one task. Search first with `bd memories <keyword>` and update in place rather than duplicating. Memories are workspace-wide, shared across every plan in this repository. They are excluded from `bd export` by default, so only a Dolt remote or `bd backup` carries them to another machine.

5. **Persist beads state** (one question; see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md)):

   ```bash
   # Persist beads state (see plugin/docs/reference/beads-mode.md)
   if bd config get sync.remote 2>/dev/null | grep -qv "not set"; then bd dolt push; fi
   if [ "$(bd config get backup.enabled 2>/dev/null)" = "true" ]; then bd backup sync; fi
   ```

   Nothing else: the Dolt directory under `.beads/` is never committed.

## Resume Logic

If you are resuming after a context compaction: everything you recall about research.md/design.md/tasks.md is paraphrase until re-read — the re-reads below are mandatory, not optional. If this phase has already been compacted once and is heading for another, ask the user before the next task ("Handoff Decision" in [reference.md](reference.md)); you write a handoff only if they say so.

When resuming work (phase = "continue"):

1. **Check beads state** (source of truth):

   ```bash
   bd stats           # Overall progress
   bd ready           # Available work
   bd list --status=in_progress  # Any workers that didn't finish?
   bd list --status=closed        # Completed work
   ```

2. **Review context**:
   - Read tasks.md "Implementation Notes" for worker insights
   - Read research.md and design.md for context
   - Check current_phase in frontmatter (reference only — beads is authoritative; reconcile via /wb:update_status if it looks stale)

3. **Check for a halt**: uncommitted changes in `git status` while no task is `in_progress` mean the phase halted, and so does a `halted: missing context` or `halted: rule gap` comment on a phase task that is not closed, since those halts can leave a clean tree and the task `in_progress`. Find the halted task by the latest `halted:` comment among the phase's tasks that no commit names, and handle it before any new task. `halted: plan defect` follows the "Plan-Defect Deviation Protocol"; `halted: missing context` follows the "Missing Context Check", from its first step; `halted: rule gap` follows the "Rule-Gap Halt"; `halted: re-verification failed` follows the "Failed Re-verification Halt" (all four in [reference.md](reference.md)): on `continue`, re-verify the working tree first, after running the fix worker on the guidance when the reply is `continue: <guidance>`, as the halt's Continue says (the verifier reads the reports and, on a harness or setup task, the `support files:` or `setup files:` records from the task's comments), with the task's starting commit recovered as the parent of its own `red(AC-n)` commits at the tip of `git log`, or HEAD when the tip has none.

4. **Handle incomplete workers**:
   - A task an earlier session left `in_progress` that item 3 did not find halted is unfinished work: inventory what landed (`git status`, `git diff`) and read its `worker report:` comments, then finish or restart it as the "Worker Failure Playbook" in [reference.md](reference.md) says (starting commit recovered as item 3 says)
   - Review worker outputs for errors
   - Retry a genuinely failed task (Case B) with adjusted context

5. **Continue coordination**:
   - Extract context package
   - Recover the phase's starting commit (Step 4) for the test review: the parent of the phase's earliest task or `red(AC-n)` commit in `git log` (a sanctioned rewrite's `red(AC-n)` commit is later, so it does not move this), or HEAD if the phase has none; the red commits to pass are the latest per criterion; the earlier verifiers' Test Integrity sections are in the phase tasks' `test integrity:` comments, and the earlier workers' summaries are in their `worker report:` comments
   - Run `bd ready` to find next task
   - Spawn worker for next available task
   - Repeat until phase complete

## Important Guidelines

### DO

- ✅ Extract minimal context packages for workers
- ✅ Spawn workers sequentially (one at a time)
- ✅ Use appropriate model for task complexity
- ✅ Wait for each worker to complete before next
- ✅ Aggregate worker outputs thoroughly
- ✅ Handle worker failures gracefully

### Do not

- Spawn workers in parallel: each verifier assumes a working tree holding only one task.
- Let a worker commit, or commit a task before its verifier passes.
- Pass entire docs to workers; extract the context package.
- Skip worker output aggregation, or close the phase milestone before manual verification.
