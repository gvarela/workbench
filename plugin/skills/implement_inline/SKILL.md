---
name: implement_inline
description: Implement a project's tasks.md in this session with TDD (red, green, refactor), beads claim and close per task, and a human checkpoint at each phase boundary. Use only when the user asks for the work done inline, in this session, or on the session model rather than by workers (for example a full-Fable run). Takes the project directory and a phase number or continue.
argument-hint: [project-directory] [phase-number|continue]
allowed-tools: Read
---

# Implement Inline

You are tasked with implementing tasks from a structured task list in `tasks.md`, following Test-Driven Development (TDD) practices and the phased implementation approach defined in the project documentation.

Supporting file: [templates.md](templates.md) — output templates and the beads frontmatter shape. Read the named section when a step directs you to it.

## Initial Response

This stage needs from you: the phase to run, and a go-ahead at each phase checkpoint after reading its test review, acknowledging each blocking item by name.

When invoked, check for arguments:

1. **If directory and phase provided** (e.g., `/implement_inline docs/plans/2025-01-08-my-project/ 1`):
   - Use `$1` as project directory
   - Use `$2` as phase number (or "continue" to resume)
   - Read all documentation immediately
   - Begin implementation

2. **If partial arguments**:
   - Use provided arguments
   - Prompt only for missing ones

3. **If no arguments**:

   ```
   I'll help you implement the tasks from your project. Please provide:
   1. Path to the project documentation directory (e.g., docs/plans/2025-01-08-my-project/)
   2. Which phase to implement (number or "continue" to resume from current phase)
   3. Any specific context or constraints for this implementation session (optional)

   I'll follow TDD practices and implement the tasks systematically.
   ```

## Implementation Philosophy

### Core Principles

1. **TDD Cycle**: Red → Green → Refactor for each task
2. **Phase Boundaries**: Complete phases fully before proceeding
3. **ZERO SCOPE CREEP**: Implement EXACTLY what's in tasks.md - NO additions, NO improvements, NO extras
4. **Progress Tracking**: Use beads for ALL status tracking (`bd update`, `bd close`)
5. **Verification Gates**: Respect ⛔ CHECKPOINT markers between phases
6. **Documentation First**: Read research.md and design.md for context before starting

### Scope

Implement exactly what tasks.md specifies: extras widen what the next phase must trust. Do not add features, refactors, optimizations, error handling, or abstractions the task does not name. If you think something is missing, stop and ask rather than adding it.

### Extras and edits

If you find a pre-existing bug, a performance concern, or behavior the task doesn't mention, don't fix, optimize, or extend it unless the requested behavior cannot work without it — record it in Implementation Notes as a follow-up. This is about extras only: implement every behavior the task asks for, completely.

When it will not affect the end result, edit a file in place rather than rewriting it — fewer tokens, same outcome.

### Who Writes Tests

You never edit test files: `wb:test-writer` writes and changes every test, outer and inner, including harness proofs. Keeping test authorship apart from the code is what lets the phase's test review trust a test, since whoever writes the code never shapes the check on it. You write production code, run the tests, and commit. Step 3 gives the cycle.

## Process Steps

### Step 1: Read and Understand Context

**⛔ BARRIER 1: research.md, design.md, and tasks.md read in full — implementing from partial reads produces work that misses the plan**

```javascript
const projectDir = $1 || /* prompt for it */;
const phase = $2 || /* prompt for it */;

// Read all project files
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

3. **Read design.md FULLY**:
   - Understand the desired end state
   - Review success criteria for the phase
   - Note both automated and manual verification requirements

4. **Read tasks.md FULLY**:
   - Identify current phase from frontmatter
   - Count completed vs remaining tasks
   - Note which tasks beads reports as ready (`bd ready`)

**Implement ONLY what's specified**

After reading all documentation, synthesize:

- What patterns should I follow from research?
- What's the goal from the design?
- What EXACT tasks are specified in tasks.md?
- REMEMBER: Do NOT add anything not explicitly listed

### Step 2: Set Up Task Tracking with Beads

Use beads for all task tracking (phases and granular tasks), not TaskCreate/TaskUpdate or markdown checkboxes.

#### Verify Beads is Initialized

First, check that beads is working:

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

Check that tasks.md frontmatter has beads tracking: `beads_epic`, `beads_phases`, and `beads_tasks` must all be present. For the exact shape, read the "Beads Tracking Frontmatter Shape" section of [templates.md](templates.md).

**If frontmatter is missing beads tracking**: Tell user "Beads tracking not configured. Run `/wb:create_tasks` to set up beads issues for all tasks."

#### Find Available Work

Use beads to find what's ready to work on:

```bash
bd ready    # Show all tasks with no blockers (ready to start)
```

This shows:

- Tasks with no dependencies (can start immediately)
- Tasks whose dependencies are all closed (newly unblocked)
- Both granular tasks and phase milestones

Before the phase's first task, record `git rev-parse HEAD` as the phase's starting commit; the Step 5 test review diffs from it.

#### Claim and Track Tasks

For each task you work on:

```bash
# Review task details before starting
bd show [task-id]    # See description, dependencies, blockers

# Claim the task
bd update [task-id] --claim

# When complete
bd close [task-id] --reason "Brief description of what was done"

# Check what's now unblocked
bd ready
```

**Workflow**:

1. `bd ready` - Find available work
2. `bd show [id]` - Review task details
3. `bd update [id] --claim` - Claim it
4. Implement with TDD (Red → Green → Refactor)
5. `bd close [id]` - Mark complete
6. `bd ready` - Find next task

**Phase Milestone Tracking**:

- Phase milestones are automatically unblocked when all their task dependencies close
- Close the phase milestone only after ALL phase tasks are done AND manual verification passes
- Use `bd show [phase-milestone-id]` to see which tasks still block the milestone

| Tool     | Use Case                                                |
| -------- | ------------------------------------------------------- |
| Beads    | ALL task tracking (granular tasks AND phase milestones) |
| Markdown | Documentation only (what the plan is, not status)       |

### Step 3: Implement Phase Tasks

#### For Each Implementation Task

**A. Test First (RED)**

```markdown
🔴 Writing test for: [task description]
```

Spawn `wb:test-writer` with a complete Agent call, because the tool rejects a call without `description`: `Agent(description: "Write test for <AC-n or behavior>", subagent_type: "wb:test-writer", prompt: "<the request>")`. In an interactive session the spawn runs in the background: the call returns at once and the report arrives later as a completion notification. Do not `sleep` or poll while it runs, since the harness blocks sleep; end the turn, or continue work that does not depend on the test, until the notification arrives. Where the Agent tool offers a `run_in_background` parameter (fork mode off, as in `claude -p`), pass `run_in_background: false` so the call returns the report itself.

Post every `wb:test-writer` report verbatim as a comment on the task it served, so the Step 5 review and a resumed session can read it after this session ends. Reports run to many lines and quote backticks and angle brackets, so pipe the report in with `bd comments add [task-id] -f /dev/stdin` and the quoted heredoc that "Evidence in Beads" in [implement/reference.md](../implement/reference.md) describes (no file is written, so nothing lands in the task's commit). Read them back with `bd comments [task-id] --json`, taking each comment's `text` field; the plain `bd comments` and `bd show` render markdown and drop backticks and `<...>` spans.

1. **Write missing outer tests**: an outer test step (a `phaseN_outer_n` key in the tasks.md frontmatter) is done inside the implementation task it blocks, so when `bd ready` offers one, take that implementation task (`bd show` lists it) once its other open blockers are only outer test steps; a step that blocks no implementation task gets this item on its own. For each criterion the task cites that has no `red(AC-n)` commit yet, spawn `wb:test-writer` with caller "the inline session, outer mode", the criterion's id, text, example, observed-at boundary, and seam, the target test file named in its outer test step, the earlier `wb:test-writer` reports for this task, and the testing conventions for that boundary. When the report arrives, re-run the test yourself and confirm it fails on an assertion. Then commit only the test as `red(AC-n): <criterion title>` and close the step with that commit's short sha and the one assertion-failure line from your re-run: with the id (a bare `bd close` closes the last issue touched), in this form, because `--reason "..."` breaks on a quote in the assertion line. Run it as one Bash call with every line, the closing `WB_REPORT_END` included, at column 0, not at this list's indentation ("Evidence in Beads" in [implement/reference.md](../implement/reference.md) gives the rest of the delimiter rule):

    ```bash
    bd close [outer-step-id] --reason-file - <<'WB_REPORT_END'
    red <sha>: <assertion line>
    WB_REPORT_END
    ```

    The close reason is the durable record that the test went red on an assertion. A report of blocked, or a failure that is not an assertion (an import or setup error), proves nothing about the behavior: commit nothing and raise it as an Implementation Variance (see Handling Mismatches).
2. **Write inner tests and harness proofs**: spawn `wb:test-writer` with caller "the inline session, inner mode", the behavior to pin as inputs and observable results, the criterion and example it serves (for a harness proof, the boundary and an existing behavior there), the target test file, and the earlier reports. Inner mode is the one that covers harness proofs: outer mode reports a passing run as blocked, and a harness proof's restored run passes by design. If the run stops at a load or import error, add only the stub needed to load the code and ask for a re-run.
3. Confirm each new test fails on an assertion; a harness proof instead shows its failing run and its passing restored run in the report. To change a test later, ask `wb:test-writer`; outer tests stay as committed.

**No acceptance criteria: plan predates 5.0.0.** When the phase has no outer test steps and its tasks cite no criteria, skip item 1, and say in your output that the plan has no acceptance criteria because it predates 5.0.0, so outer tests are skipped and no red commits will appear (the human needs to know why). Inner tests still go through `wb:test-writer`, because the no-test-edit rule protects the tests however the plan was written.

**B. Implementation (GREEN)**

```markdown
🟢 Implementing: [task description]
```

1. Write minimal code to pass the test
2. Focus on making it work, not perfect
3. Run test to confirm it passes
4. Run related tests to ensure no regression

**C. Refactor (REFACTOR)**

```markdown
♻️ Refactoring: [task description]
```

1. Improve code quality while keeping tests green
2. Consider patterns from research.md
3. Run tests after each change
4. One commit per task once its tests pass, before closing the bead; the message names the task and its beads id. Structural and behavioral changes are separated at the task level (create_tasks' structure-before-behavior rule), so one commit per task keeps them apart.

**D. Update Progress**

After completing each task:

1. Close the beads issue:

   ```bash
   bd close [task-id] --reason "Implemented [feature], tests passing"
   ```

2. Check what's newly available:

   ```bash
   bd ready    # See what's now unblocked
   ```

3. Optionally add implementation notes to tasks.md:

   ```markdown
   ## Implementation Notes
   - [YYYY-MM-DD] Completed [task-id]: [brief note about discoveries or deviations]
   ```

**Do NOT**:

- ❌ Update checkboxes in tasks.md (documentation only)
- ❌ Use TaskCreate/TaskUpdate (not persisted)
- ❌ Update frontmatter counts manually (beads is source of truth; /wb:update_status is the sole writer of those fields)

### Step 4: Run Phase Verification

**⛔ BARRIER 2: every phase task closed — verification on a partial phase reports work that has not landed**

#### Automated Verification

Run all automated checks from the phase's "Automated Verification" section:

```bash
# Adapt these to actual commands from tasks.md
make test           # or npm test, go test ./..., pytest
make lint           # or npm run lint, golangci-lint run
make typecheck      # or npm run typecheck, go build ./...
make build          # or npm run build, go build
```

Fix any issues before proceeding.

#### Update Modified Files Section

After implementation, update the "Modified Files" section in tasks.md. Read the "Modified Files Section" template in [templates.md](templates.md) NOW and follow it exactly.

### Step 5: Phase Checkpoint

**⛔ CHECKPOINT: Phase [N] Complete — the next phase builds on what a human has accepted**

Complete these steps IN ORDER before proceeding to next phase:

#### 1. Verify All Phase Tasks Closed

```bash
# Check the phase milestone: blockedBy must be empty (authoritative —
# every phase task blocks the milestone, so empty means all closed)
bd show [phase-milestone-id]

# Verify nothing is still in progress
bd list --status=in_progress
```

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

No per-task verifier ran, so this review is where test integrity gets checked, across the whole phase diff. Spawn `wb:test-reviewer` with no `model` parameter (its definition pins Opus at `high`). Give it the phase's starting commit (Step 2), the phase's criteria with their examples, observed-at boundaries, and seams, the red commits, every `wb:test-writer` report in the phase tasks' comments, the conventions source, and mode `inline`. It reviews the phase's tests as a whole and proposes findings; it edits nothing.

Then settle its Majority Candidates, because a judgment-only Remove or Rewrite needs three independent judgments and a second reading in the reviewer's own context is not independent. Spawn `wb:test-reviewer` again with the Candidates input (each candidate's location, rubric item, and proposed verdict, without the first review's reasoning) and the criteria those candidates cite, with their examples, since each judgment weighs the test against its criterion. Spawn a third time, with the same inputs, for each candidate the first two judgments split on. A candidate that 2 of 3 judgments agree with becomes a finding, recorded as "n of 3"; any other goes under "review these".

File each escalated integrity finding and each "n of 3" finding as an issue linked to the task whose commit last changed the test (`git log -1 -- <test file>`), or to the phase milestone when no task did, so a Rewrite or Remove proposal outlives the checkpoint summary: `bd create "Test review: <verdict> <file:line>" --type=task --priority=2 --deps discovered-from:[task-id] -d "<rubric item, quoted excerpt, evidence type, and n of 3 or escalated>"`. The `discovered-from` link records the source without blocking anything.

Only the reviewer's Blocking section holds the go-ahead. It lists deterministic failures in tests this phase changed: a criterion with no outer test or one below its observed-at level, a changed outer test, an undeclared test change, a test that cannot fail, and a planted defect that survives. The evidence for a changed outer test or an undeclared change comes from the integrity script, which the reviewer runs over the phase; the reviewer finds the rest itself. The rule is this narrow because repositories the user does not control hold legacy tests that belong to others, so a test the phase did not change never blocks, and judgment-only findings stay advisory and inform the go-ahead without holding it. The integrity-finding counts, total and escalated, are the reviewer's Integrity line; they go into the checkpoint summary and the Step 6 Implementation Notes.

#### 4. Request Manual Verification

Present the manual verification checklist to the user. Read the "Manual Verification Request" template in [templates.md](templates.md) NOW and follow it exactly — automated results, test review, beads state, then the manual checks from design.md.

**Requirement**: Wait for user confirmation before proceeding. When the review listed blocking items, the confirmation must acknowledge each one by name; a general go-ahead does not clear them, because a person has to have seen each failure before the next phase builds on it.

#### 5. Close Phase Milestone

**ONLY after user confirms manual verification**, close the milestone:

```bash
bd close [phase-milestone-id] --reason "Phase [N] complete: [summary]. All tasks closed, automated verification passed, manual verification confirmed."
bd ready  # Check what's now unblocked (next phase milestone tasks)
```

#### 6. Report Completion

Report using the "Phase Completion Report" template in [templates.md](templates.md) — read it before writing the report.

### Step 6: Update Status

After phase completion and verification:

1. **Verify beads state**:

   ```bash
   bd stats    # Check overall progress
   bd list --status=closed    # See what's complete
   bd ready    # See what's available next
   ```

2. **Reconcile tasks.md frontmatter via `/wb:update_status`**: run `/wb:update_status [project-directory]` to update `status`, `current_phase`, and `completed_tasks` from beads state — `update_status` is the sole writer of those fields, so do not hand-edit them here.

3. **Add implementation notes** with the phase's integrity-finding counts from Step 5 and any discoveries:

   ```markdown
   ## Implementation Notes
   - [YYYY-MM-DD] Phase [N] complete: integrity findings [total] ([escalated] escalated); [key learnings, deviations from plan]
   ```

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

## Handling Mismatches

When implementation differs from tasks:

```
⚠️ Implementation Variance Detected

**Task states**: [what the task says to do]
**Reality found**: [actual situation in code]
**Impact**: [why this matters]

**Options**:
1. Adapt implementation to match codebase reality
2. Update task to reflect necessary changes
3. Skip task with documentation of why

How should I proceed?
```

Document any deviations in the "Implementation Notes" section of tasks.md.

## Resume Logic

When resuming work (phase = "continue"):

1. **Check beads state** (source of truth):

   ```bash
   # See overall progress
   bd stats

   # Find what's ready to work on
   bd ready

   # Check what's currently in progress
   bd list --status=in_progress

   # Check what's been completed
   bd list --status=closed
   ```

2. **Review context**:
   - Read tasks.md "Implementation Notes" for discoveries
   - Read research.md and design.md for context
   - Check current_phase in frontmatter (for reference)

3. **Verify previous work** (optional):

   ```bash
   # Run tests to ensure previous work is solid
   [test command from tasks.md]
   ```

4. **Continue from next available task**:
   - Recover the phase's starting commit (Step 2) for the test review: the parent of the phase's first task or `red(AC-n)` commit in `git log`, or HEAD if the phase has none; the earlier test-writer reports are in the phase tasks' comments
   - `bd ready` shows what's available (no blockers)
   - `bd show [task-id]` to review task details
   - `bd update [task-id] --claim` to claim it
   - Implement with TDD cycle
   - `bd close [task-id]` when complete
   - Trust completed work (closed beads issues) unless tests fail

## When to Skip TDD

Only the work in tdd-discipline's exceptions section skips the RED step; anything else needs a failing test first.

## Special Considerations

### Modified Files Tracking

Maintain the "Modified Files" section in tasks.md to help with:

- Targeted test running (just phase files)
- Code review focus
- Rollback if needed
- Understanding scope of changes

### Quick Test Commands

Generate phase-specific test commands to avoid running entire suite:

```bash
# Instead of running all tests
npm test

# Run just this phase's tests
npm test src/feature/*.test.ts tests/integration/feature.test.ts
```

### Daily Progress Pattern

```
1. Check beads state: `bd ready` and `bd list --status=in_progress`
2. Read tasks.md for context (what the plan is)
3. Choose next task from `bd ready` output
4. Claim task: `bd update [task-id] --claim`
5. Implement with TDD cycle (Red → Green → Refactor)
6. Close task: `bd close [task-id] --reason "..."`
7. Check what's unblocked: `bd ready`
8. Repeat steps 3-7 for next task
9. Run verification at phase boundaries
10. If phase milestone complete: close it with `bd close [milestone-id]`
11. Add implementation notes to tasks.md if needed
12. Push to the Dolt remote if one is configured (see docs/reference/beads-mode.md)
```

## Error Handling

### Test Failures During Implementation

If tests fail unexpectedly:

1. Check if codebase changed since design was written
2. Verify test is testing the right thing
3. Check for environment issues
4. Document any fixes needed in Implementation Notes

### Verification Failures

If automated verification fails after implementation:

1. Fix issues before marking phase complete
2. Re-run full verification suite
3. Update test commands if they've changed
4. Document any special setup needed

## Important Guidelines

### DO

- ✅ Follow TDD cycle: Red → Green → Refactor
- ✅ Read ALL documentation files FULLY first
- ✅ Use `bd ready` to find available work
- ✅ Use `bd update [id] --claim` to claim tasks
- ✅ Use `bd close [id]` when tasks complete
- ✅ Respect phase boundaries and checkpoints
- ✅ Track modified files for easier testing
- ✅ Generate phase-specific test commands
- ✅ Document any deviations in Implementation Notes
- ✅ Push to the Dolt remote if one is configured, at session end

### Do not

- Skip writing tests first (except for tdd-discipline's exceptions), or edit a test file yourself instead of asking `wb:test-writer`.
- Move to the next phase without verification, or implement multiple phases without checkpoints unless explicitly instructed.
- Close manual verification without user confirmation.
- Act on a partial read: if Read returns a partial view of a large file, page through the rest with offset/limit.
- Use TaskCreate/TaskUpdate/TodoWrite or markdown checkboxes for tracking; beads is the source of truth, markdown documents the plan.

## Synchronization Points

1. **⛔ BARRIER 1**: research.md, design.md, and tasks.md read in full, because implementing from partial reads produces work that misses the plan
2. **⛔ BARRIER 2**: every phase task closed, because verification on a partial phase reports work that has not landed
3. **⛔ CHECKPOINT**: between phases, because the next phase builds on what a human has accepted
