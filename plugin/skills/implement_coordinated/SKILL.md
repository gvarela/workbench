---
name: implement_coordinated
description: Implement a project's tasks.md by coordinating fresh-context worker agents (one per task, model chosen per task), verifying each with a task-verifier, and escalating verified failures. Use when the user asks to implement or execute a phase with workers or coordination, wants the main context kept clean, or the phase has many independent tasks. Takes the project directory and a phase number or continue.
argument-hint: [project-directory] [phase-number|continue]
allowed-tools: Read
---

# Implement Tasks (Coordinated)

**Next-generation task implementation using coordinator + worker agent pattern.**

You coordinate task implementation from `tasks.md` by spawning worker agents sequentially, each with focused context and fresh context window. This prevents main session context bloat.

**Recommended for**: Long phases with many tasks, sessions where context compaction would be disruptive, or when you want the main window available for monitoring/debugging. If a phase has already needed one `/compact` and is heading for another, stop and run `/wb:create_handoff` instead — `resume_handoff` forces a fresh doc read, while a second compaction compounds summary drift.

Supporting files in this directory (read each when its step directs you to — never paraphrase from memory):

- [sub-agent-prompts.md](sub-agent-prompts.md) — verbatim worker/verifier/fix-worker prompts
- [templates.md](templates.md) — output templates for aggregation, reports, notes
- [reference.md](reference.md) — context-package spec, model selection, failure playbook
- [README.md](README.md) — design rationale (for humans; not needed at runtime)

## Initial Response

This stage needs from you: the phase to run, a go-ahead at each phase checkpoint, and a decision when a verified failure or a plan defect halts the phase.

When invoked, check for arguments:

1. **If directory and phase provided** (e.g., `/implement_coordinated docs/plans/2025-01-08-my-project/ 1`):
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

All principles from `implement_tasks` PLUS:

1. **Coordination Over Direct Implementation**: Main agent orchestrates, doesn't code
2. **Context Extraction**: Build minimal context packages for workers
3. **Sequential Execution**: Simple, predictable, one task at a time
4. **Worker Isolation**: Each worker operates in fresh context
5. **Model Selection**: Right model per task via per-spawn override on the task-worker agent (haiku/sonnet/opus)
6. **Main Session Stays Clean**: No context accumulation in coordinator

### CRITICAL: NO SCOPE ADDITIONS - NONE

Same zero-tolerance policy as original:

- **NEVER** add features not in tasks.md
- **NEVER** refactor beyond what's specified
- **NEVER** make "improvements" not explicitly asked for
- **NEVER** add extra error handling, validation, or edge cases
- **ONLY** implement what is EXPLICITLY written in tasks.md
- If something seems missing, STOP and ask - DO NOT add it

## Process Steps

### Step 1: Read and Understand Context

**⛔⛔⛔ BARRIER 1: STOP! Read ALL documentation files FULLY - NO SHORTCUTS ⛔⛔⛔**

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

**CRITICAL**: Use beads for ALL task tracking (phases AND granular tasks).

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

**Build a minimal context package for workers** from the documentation you've read — only what workers actually need to implement tasks: patterns from research.md, this phase's goal/criteria/constraints from design.md, beads IDs from tasks.md frontmatter, test commands, and the file references relevant to this phase.

**Read [reference.md](reference.md) NOW** — its "Context Package Structure" section is the exact structure to build. Do not improvise the shape.

### Step 4: Find Available Work

**⛔ BARRIER 2: Get ready tasks from beads**

Query beads to find what's ready to work on:

```bash
# Get ready tasks (no blockers)
bd ready

# This shows tasks that:
# - Have no dependencies, OR
# - All dependencies are closed
```

**Start with the first ready task**. After each worker completes, `bd ready` will show newly unblocked tasks.

### Step 5: Spawn Worker Agents Sequentially

The coordinator is operating autonomously within this task loop. Nobody is watching in real time, so asking "Want me to…?" blocks the work. For reversible actions that follow from the plan, proceed without asking. Before ending a turn, check the last paragraph: if it is a plan, a question, or a promise about work not yet done ("I'll now run…"), do that work now with tool calls. End the turn only when the phase is complete or blocked on something only a human can decide. This does not apply to phase checkpoints or plan-defect halts — those stop for a human by design.

**For each ready task in the phase**, spawn a focused worker agent:

1. **Get next task**: Run `bd ready` to find available work
2. **Check task details**: Run `bd show [task-id]` for requirements
3. **Project delegation size** (coordinator judgment): estimate the worker's tool-call cost — reads of files it must not break (4-8) + discovery (3-6, or ~0 if the context package names the exact files) + source edits (4-10) + 1-2 calls per test file touched + suite runs (3-5) + lint/verification/close (3-5). Subagents hard-stop when they exhaust their tool-call budget (observed near ~70 calls), and the truncated work is always the finishing tail. **A task projecting past ~50 calls: split it at its natural seam before spawning** — usually source change, then test conversion — as separate beads issues (`bd create` the slices, `bd dep add` to order them, close the original with `--reason "split"`)
4. **Determine model** (coordinator judgment — read the task content and pick the tier):
   - Haiku: Mechanical only (config, docs, renames)
   - Sonnet: Standard implementation including bugs and refactors - DEFAULT when unsure
   - Opus: Architectural or cross-cutting tasks
   - Fable: never as a first spawn — the escalation target after a verified failure (Step 6)

   When spawning with sonnet or opus, set `effort: xhigh` for the coding work; fable spawns use `effort: high`. Never set effort on haiku spawns (errors on Haiku 4.5). The verify-then-retry loop below is what makes the cheap default safe — fix workers escalate to fable, one attempt.
5. **Spawn the `task-worker` agent** with the chosen model as a per-spawn override (the agent has the tdd-discipline skill preloaded and carries the TDD contract in its own definition). **Read [sub-agent-prompts.md](sub-agent-prompts.md) NOW** and build the worker prompt from its "Worker Prompt Template" — task ID/title/description, the context package, beads commands (`bd update [id] --claim`, `bd close [id]`), and the expected-output contract. Use the template verbatim with values filled in.
6. **Collect worker output** when complete
7. **Proceed to verification** (Step 6)

**Loop**: Spawn → Wait → Verify → Next task

### Step 6: After Each Worker Completes

**⛔ BARRIER 3: Collect output and verify before next task**

After each worker completes:

1. **Verify task was closed**:

   ```bash
   bd show ${taskId}  # Should show status: closed
   ```

2. **Collect worker output**:
   - Files created/modified
   - Tests added/modified
   - Test commands to verify
   - Any issues encountered

3. **Verify task completion**:

   Spawn the task-verifier agent using the "Verification Agent Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md) — read it before spawning. The agent runs tests, checks scope adherence, and returns a structured markdown report with Status: PASS or FAIL.

4. **Parse verification result autonomously**:

   Extract pass/fail from agent's markdown report:

   ```javascript
   // Agent returns text like: "### Status: PASS" or "### Status: FAIL"
   // FAIL wins: a report containing both markers, or neither, is a FAIL —
   // ambiguous verification is failed verification
   const failed = verificationReport.includes("### Status: FAIL") ||
                  !verificationReport.includes("### Status: PASS");
   const passed = !failed;
   ```

   **If PASS**:
   - **Commit the task**: the coordinator commits that task's files with a message naming the task and its beads id. One task, one commit. Coordinator-side plan-doc edits (tasks.md notes, discoveries) are separate commits, made only between tasks, never while a worker or verifier runs, so they never land in a worker's diff. Structural and behavioral changes are separated at the task level (create_tasks' Tidy First edge rule), so one commit per task keeps them apart.
   - Add to success log
   - Collect modified files for aggregation
   - Proceed to step 5 (next task)

   **If FAIL** — first judge the failure type from the verifier report:

   - **Implementation defect** (task is achievable as specified; the worker got it wrong):
     - Attempt automatic fix (up to 2 retries) using the "Fix Worker Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md), re-verifying after each retry.
     - **After the fable retry fails**: add to blocking issues list for phase checkpoint review and continue to the next task (surface issues at the phase boundary — don't block autonomous flow on individual task failures).
   - **Plan defect** (task cannot succeed AS SPECIFIED — a design assumption doesn't survive contact with the code): do NOT spawn fix workers; retries cannot fix a task that is wrong as specified. Follow the "Plan-Defect Deviation Protocol" in [reference.md](reference.md) — file a design-revision issue, block dependent tasks, halt the phase for a human checkpoint.

5. **Add to aggregated lists** (after pass):
   - Modified files (for final reporting)
   - Test commands (for phase verification)
   - Implementation notes (if worker found issues)

6. **Check for newly ready tasks**:

   ```bash
   bd ready  # See what's now unblocked
   ```

7. **Spawn next worker** (repeat Step 5)

**Handle unfinished workers** (worker left the task `in_progress` without closing it): this is NOT a verification failure, and verification is not run. It is one of two distinct events — **truncation** (worker exhausted its tool-call budget; partial work landed, finish the remainder — never retry whole) or **genuine failure** (crash or reported blocker; little landed). Run `git status` to tell them apart, then follow the "Worker Failure Playbook" in [reference.md](reference.md) for the matching remedy.

### Step 7: Aggregate Results

**⛔ BARRIER 4: All phase tasks complete**

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

**⛔ CHECKPOINT: Phase ${phase} Complete**

Same verification process as original `implement_tasks`:

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

#### 3. Request Manual Verification

Present manual verification checklist to user:

```
✅ Phase ${phase} Automated Verification Complete

**Automated checks passed:**
- ✅ All tests passing: [test command]
- ✅ Linting clean: [lint command]
- ✅ Build successful: [build command]

**Worker agents completed:**
${workerSummaries.map(w => `- ✅ ${w.title}: ${w.summary}`).join('\n')}

**Beads state:**
- ✅ All Phase ${phase} tasks closed: [list task IDs]
- 🔓 Phase milestone ready to close: ${phaseMilestoneId}

**Manual verification required:**

Please perform the following manual checks from design.md:

${manualVerificationSteps}

Reply when manual verification is complete and I'll close the phase milestone.
```

**Requirement**: Wait for user confirmation before proceeding.

#### 4. Close Phase Milestone

**ONLY after user confirms manual verification**:

```bash
bd close ${phaseMilestoneId} --reason "Phase ${phase} complete: ${summary}. All ${taskCount} tasks closed via worker agents, automated verification passed, manual verification confirmed."
bd ready  # Check what's now unblocked (next phase tasks)
```

#### 5. Report Completion

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

3. **Add implementation notes** with worker insights, using the "Implementation Notes Entry" template in [templates.md](templates.md).

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

If you are resuming after a context compaction: everything you recall about research.md/design.md/tasks.md is paraphrase until re-read — the re-reads below are mandatory, not optional. If this phase has already been compacted once, prefer `/wb:create_handoff` + a fresh session over compacting again.

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

3. **Handle incomplete workers**:
   - If tasks are stuck in `in_progress`, investigate why
   - Review worker outputs for errors
   - Retry failed tasks with adjusted context

4. **Continue coordination**:
   - Extract context package
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
- ✅ All original `implement_tasks` best practices

### DON'T (ABSOLUTELY FORBIDDEN)

- ❌ All prohibitions from original `implement_tasks`
- ❌ **NEVER** spawn multiple workers in parallel (keep it simple)
- ❌ **NEVER** let a worker commit, and never commit a task before its verifier passes
- ❌ **NEVER** allow workers to add scope
- ❌ **NEVER** pass entire docs to workers (extract context)
- ❌ **NEVER** proceed without waiting for worker completion
- ❌ **NEVER** skip worker output aggregation
- ❌ **NEVER** close phase milestone before manual verification
