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

This stage needs from you: the phase to run, a go-ahead at each phase checkpoint after reading its test review, acknowledging each blocking item by name, and a handoff decision when a phase that has already compacted heads for another compaction.

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

You never edit test cases: `wb:test-writer` writes and changes every test, outer and inner, including harness proofs. Keeping test authorship apart from the code is what lets the phase's test review trust a test, since whoever writes the code never shapes the check on it. A harness task's support code (fakes, fixtures, factories, harness modules) is yours to write, even under a test path, because it carries no assertions of its own; the review counts it as declared on that task only. Before the task's commit, post those files as a record on the task with `bd comments add [task-id] -f /dev/stdin` and the quoted heredoc that "Evidence in Beads" in [implement/reference.md](../implement/reference.md) describes, first line `support files:` and one repository-relative path per line, so the review and a resumed session read the list from beads. You write production code, run the tests, and commit. Step 3 gives the cycle.

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

Spawn `wb:test-writer` with a complete Agent call, because the tool rejects a call without `description`: `Agent(description: "Write test for <AC-n or behavior>", subagent_type: "wb:test-writer", prompt: "<the request>")`. In an interactive session the spawn runs in the background: the call returns at once and its block arrives later as a completion notification. Do not `sleep` or poll while it runs, since the harness blocks sleep; end the turn, or continue work that does not depend on the test, until the notification arrives. Where the Agent tool offers a `run_in_background` parameter (fork mode off, as in `claude -p`), pass `run_in_background: false` so the call returns the block itself.

Give every `wb:test-writer` spawn the task id: it posts its report verbatim as a comment on that task, so the Step 5 review and a resumed session can read it after this session ends, and you do not post it again. It returns a short block per report, in both modes, with a `Full report:` line naming the comment; if that line says the report was not posted, post the report it returns with `bd comments add [task-id] -f /dev/stdin` and the quoted heredoc that "Evidence in Beads" in [implement/reference.md](../implement/reference.md) describes (no file is written, so nothing lands in the task's commit). Read reports back with `bd comments [task-id] --json`, taking each comment's `text` field; the plain `bd comments` and `bd show` render markdown and drop backticks and `<...>` spans.

1. **Write missing outer tests**: an outer test step (a `phaseN_outer_n` key in the tasks.md frontmatter) is done inside the implementation task it blocks, so when `bd ready` offers one, take that implementation task (`bd show` lists it) once its other open blockers are only outer test steps; a step that blocks no implementation task gets this item on its own. Spawn `wb:test-writer` for the task, with caller "the inline session, outer mode", the task id, that the earlier `wb:test-writer` reports for this task are in its comments, the plan directory, and for each criterion the task cites that has no `red(AC-n)` commit yet: the criterion's id and the target test file named in its outer test step. Name at most one criterion per test file: criteria that share a file are written and committed one at a time, with one more spawn after each round's commits, because a commit takes the whole file and each `red(AC-n)` commit should add only its own test; criteria in separate files share the spawn. It reads each criterion's text, example, observed-at boundary, and seam from the plan, and the conventions from their source, itself. It returns one block per criterion, carrying the test file and the red line, so you need not read the full reports. When the blocks arrive, re-run the done criteria's tests yourself in one command per boundary's test command and confirm each fails on an assertion. Then, in one Bash call, commit each test on its own as `red(AC-n): <criterion title>` (`git add <its test file> && git commit -F - -- <its test file> <<'WB_REPORT_END'`, then the message line and `WB_REPORT_END`, both at column 0, one criterion after another on separate lines; the quoted heredoc keeps a backtick or `$` in the title from expanding), because the phase review's identity check compares each outer test with its own red commit; the pathspec keeps a commit to its own file even when an earlier commit in the call failed and left its file staged. Read the new commits with `git log --oneline`; a criterion with no commit there gets no close until its commit succeeds. Close each step with its commit's short sha and the one assertion-failure line from your re-run: with the id (a bare `bd close` closes the last issue touched), in this form, because `--reason "..."` breaks on a quote in the assertion line; several steps can close in one Bash call, one heredoc each. Run it as one Bash call with every line, the closing `WB_REPORT_END` included, at column 0, not at this list's indentation ("Evidence in Beads" in [implement/reference.md](../implement/reference.md) gives the rest of the delimiter rule):

    ```bash
    bd close [outer-step-id] --reason-file - <<'WB_REPORT_END'
    red <sha>: <assertion line>
    WB_REPORT_END
    ```

    The close reason is the durable record that the test went red on an assertion. Then spawn again for any criterion still waiting on a shared file, including one returned blocked with `shares <file> with <id>`, which is a deferral, not a failure. Any other block of blocked, or a failure that is not an assertion (an import or setup error), proves nothing about the behavior: commit nothing for that criterion, commit and close the done ones as above, and raise it as an Implementation Variance (see Handling Mismatches) before implementing the task. A criterion waiting behind it in the same test file waits for that answer too, because the blocked test is still in the file and the next red commit would take it in; criteria waiting on other files go on. For a `criterion not found` block, first check the id and plan directory you sent against the task's Serves line and tasks.md, and spawn again with them corrected; raise the Variance only when the plan itself lacks the criterion.
2. **Write inner tests and harness proofs**: spawn `wb:test-writer` with caller "the inline session, inner mode", the task id, the behavior to pin as inputs and observable results, the id of the criterion it serves and the plan directory (for a harness proof, the boundary and an existing behavior there), the target test file, and that the earlier reports are in the task's comments. Inner mode is the one that covers harness proofs: outer mode reports a passing run as blocked, and a harness proof's restored run passes by design. If the run stops at a load or import error, add only the stub needed to load the code and ask for a re-run. A `criterion not found` block gets the same input check as in item 1.
3. Confirm each new test fails on an assertion; a harness proof instead shows its failing run and its passing restored run in the report. To change a test later, ask `wb:test-writer`; outer tests stay as committed, apart from a rewrite a person sanctions at a phase checkpoint (Step 5).

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

After completing each task (and, if the phase has already compacted once and is heading for another, ask the handoff question in Resume Logic before the next task):

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
   - [YYYY-MM-DD] Completed [what the task built, in plain words] ([task-id]): [brief note about discoveries or deviations]
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

Complete these steps IN ORDER before proceeding to next phase. If this phase already compacted, suggest a fresh session for the next phase in the report; the user's go-ahead decides:

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

No per-task verifier ran, so this review is where test integrity gets checked, across the whole phase diff. Spawn `wb:test-reviewer` with no `model` parameter (its definition pins Opus at `high`). Give it the phase's starting commit (Step 2), the phase's criteria with their examples, observed-at boundaries, and seams, the red commits (the latest per criterion), every `wb:test-writer` report in the phase tasks' comments, the support files from each harness task's `support files:` comments, by task with its type, the conventions source, and mode `inline`. It reviews the phase's tests as a whole and proposes findings; it edits nothing.

Then settle its Majority Candidates, because a judgment-only Remove or Rewrite needs three independent judgments and a second reading in the reviewer's own context is not independent. Spawn `wb:test-reviewer` again with the Candidates input (each candidate's location, rubric item, and proposed verdict, without the first review's reasoning) and the criteria those candidates cite, with their examples, since each judgment weighs the test against its criterion. Spawn a third time, with the same inputs, for each candidate the first two judgments split on. A candidate that 2 of 3 judgments agree with becomes a finding, recorded as "n of 3"; any other goes under "review these".

File each escalated integrity finding and each "n of 3" finding as an issue linked to the task whose commit last changed the test (`git log -1 -- <test file>`), or to the phase milestone when no task did, so a Rewrite or Remove proposal outlives the checkpoint summary: `bd create "Test review: <verdict> <file:line>" --type=task --priority=2 --deps discovered-from:[task-id] -d "<rubric item, quoted excerpt, evidence type, and n of 3 or escalated>"`. The `discovered-from` link records the source without blocking anything.

A Rewrite of an outer test that the person sanctions by name in their reply runs as a task before you close the milestone, filed, run, and committed as "Sanctioned Outer-Test Rewrite" in [implement/reference.md](../implement/reference.md) describes, because the rewrite must keep everything the red-commit version catches: you file it only after that reply, with the `Sanctioned rewrite:` line in its description, claim it, and on success commit the rewritten test as `red(AC-n): <criterion title> (rewrite sanctioned at the phase <N> checkpoint)`, with the task's beads id on a second message line, before closing it. From then on the latest `red(AC-n)` commit for a criterion is its baseline wherever you pass red commits; the earliest still gives a starting commit. Ask `wb:test-writer` for it yourself, with caller "the inline session, inner mode", the task id, and that section's differential requirement: it plants one defect for each case the red-commit version catches, as the test-quality skill's Part 3 defines them (every branch, pattern alternative, call form, input shape, and table row of its predicate or assertion), and one for the gap the review found, runs both versions against each, and lists each defect with both results in its report. The rewrite must fail on all of them, and the review's suggested fix is a starting point, not the specification. No per-task verifier runs here, so check that differential yourself before committing, planting your own defects across the original's predicate as task-verifier's Step 6 describes: a defect the original fails on and the rewrite passes is lost coverage, and the whole class of lost cases goes back to `wb:test-writer` in one request, not one case at a time. Before sending it, check the fix you ask for restores the original's reach by construction rather than by listing cases, as the test-quality skill's Part 3 rule for suggested fixes says (a class fix, not an enumeration): "skip X unless it is read back through A, B, or C" leaves out members of an open-ended set, so ask instead for the one rule that removes the list, and run it against your planted defects in the copy before you send it.

Only the reviewer's Blocking section holds the go-ahead. It lists deterministic failures in tests this phase changed: a criterion with no outer test or one below its observed-at level, a changed outer test, an undeclared test change, a test that cannot fail, and a planted defect that survives. The evidence for a changed outer test or an undeclared change comes from the integrity script, which the reviewer runs over the phase; the reviewer finds the rest itself. The rule is this narrow because repositories the user does not control hold legacy tests that belong to others, so a test the phase did not change never blocks, and judgment-only findings stay advisory and inform the go-ahead without holding it. The integrity-finding counts, total and escalated, are the reviewer's Integrity line; they go into the checkpoint summary and the Step 6 Implementation Notes.

#### 4. Request Manual Verification

Present the manual verification checklist to the user. Read the "Manual Verification Request" template in [templates.md](templates.md) NOW and follow it exactly: its sections keep decisions, delivered behavior, test integrity, and follow-ups apart, and every item is written as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says, so the user can decide without opening beads.

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
   - [YYYY-MM-DD] Phase [N] complete: integrity findings [total] ([escalated] escalated); [key learnings, deviations from plan, each named in plain words with any id in parentheses]
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

When implementation differs from tasks, present this, written as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says, with the four parts of its "Decision and halt messages" section. Offer only the options that are real choices for this variance, and name the actual ones when they differ:

```
⚠️ Implementation Variance Detected

**Task states**: [what the task says to do, in plain words] ([task id])
**Reality found**: [actual situation in code]
**Impact**: [what breaks or is at risk for the user if nothing changes]

**Quality question**: [the product behavior at risk, in plain words, not test mechanics]
**Judgment or friction**: [a real trade-off that needs you, or the process got stuck; if stuck, what the plugin should have done]

**Options** (each: what it means here, what it buys for testing or quality, its cost and risk, how hard it is to undo):
1. Adapt implementation to match codebase reality
2. Update task to reflect necessary changes
3. Skip task with documentation of why

Recommendation: [option and the reason]. How should I proceed?
**Paste-ready reply**: [the exact reply that takes the recommended option: "adapt", "adapt: <guidance>", "update task", "skip", or the words of an option named in place of these]
```

On the reply, because a paste-ready reply is only useful if it does what its option said:

- **adapt** (or `adapt: <guidance>`): continue the task's TDD cycle against the code as it is, following the guidance when the reply carries one.
- **update task**: edit the task's text in tasks.md to the necessary change, in its own commit between tasks, then continue the task as updated.
- **skip**: stop work on the task and leave its issue unclosed, so the tasks that depend on it stay blocked; say why in Implementation Notes and go on to the next ready task.
- **An option named in place of these**: do what its line said it would do. When it drops the task's uncommitted changes, ask before deleting an untracked file you did not create, since it may be the user's. Ask before committing work whose tests do not pass.

Document any deviations in the "Implementation Notes" section of tasks.md.

## Resume Logic

If this phase has already compacted once and is heading for another, stop at a task or phase boundary and ask the user: "This phase has already compacted once and is heading for another. Write a handoff for a fresh session, or keep going and compact?", naming the tasks done and left in plain words, with the four parts of the "Decision and halt messages" section in [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md): the quality question (a second compaction works from a summary of a summary, so later tasks may drift from the plan), that this is a real trade-off for the user rather than friction, each option with what it costs and how hard it is to undo (a handoff ends this session but the next one re-reads the plan in full; compacting keeps the session but leaves paraphrase), and one recommended choice with its reason and a paste-ready reply ("write a handoff" or "keep going"). You write a handoff with `/wb:create_handoff` only if they say so, because the session is theirs and a handoff ends it. If they choose to keep going, continue, and after the compaction re-read research.md, design.md, and tasks.md in full before the next task, because what you recall of them is paraphrase.

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

4. **Pick up unfinished tasks**: for each `in_progress` task in this phase, an earlier session left it unfinished and `bd ready` will not offer it, so inspect the landed work before any new task: `git status` and `git diff`, plus the task's comments (`bd comments [task-id] --json`: the `wb:test-writer` reports, `support files:` records, and any `worker report:` or `created files:` an earlier `/wb:implement` run left). Then finish or restart it as the "Worker Failure Playbook" in [implement/reference.md](../implement/reference.md) does for truncated work: keep landed work and a committed `red(AC-n)` test and finish the remainder, and restart only when little landed, from Step 3 with the committed `red(AC-n)` tests kept.

5. **Continue from next available task**:
   - Recover the phase's starting commit (Step 2) for the test review: the parent of the phase's earliest task or `red(AC-n)` commit in `git log` (a sanctioned rewrite's `red(AC-n)` commit is later, so it does not move this), or HEAD if the phase has none; the red commits to pass are the latest per criterion; the earlier test-writer reports are in the phase tasks' comments
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
