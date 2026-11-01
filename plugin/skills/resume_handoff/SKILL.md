---
name: resume_handoff
description: Resume work from a handoff document written by create_handoff: reload the context, decisions, discoveries, and next steps, verify the state, then stop and name the stage command to run next. Use at the start of a session when the user points at a handoff file or asks to pick up, resume, or continue prior work. Takes the handoff file path.
argument-hint: [handoff-file-path]
allowed-tools: Read
---

# Resume Handoff

Resumes work from a handoff document: restores context, verifies the current state, and stops with the exact command for the user to run next. It does not start the work itself.

Supporting files in this directory (read each when its step directs you to — never paraphrase from memory):

- [templates.md](templates.md) — output templates for resumption reports
- [reference.md](reference.md) — error handling catalog

## Purpose

This command:

- Restores full context from handoff document
- Reads all referenced project files
- Understands problems solved and blockers
- Carries discoveries and decisions forward so the next stage does not repeat them
- Hands the next step to the user as a stage command

## Initial Response

This stage needs from you: the handoff path.

When invoked, check for arguments:

1. **If handoff path provided** (e.g., `/resume_handoff docs/plans/2025-01-08-auth/handoff-2025-01-08-14-30.md`):
   - Use `$1` as handoff file path
   - Begin resumption process immediately

2. **If no arguments**:

   ```
   I'll resume work from a handoff document. Please provide:
   1. Path to the handoff document (e.g., docs/plans/project/handoff-YYYY-MM-DD-HH-MM.md)

   I'll restore the context, verify the state, and tell you which command to run next.
   ```

## Process Steps

### Step 1: Read and Validate Handoff

**⛔ BARRIER 1**: handoff read completely — a skipped section is a learning or blocker the resumed session will repeat

```javascript
const handoffPath = $1 || /* prompt for it */;
```

1. **Read handoff document fully** to understand:
   - Current state and progress
   - Critical learnings and discoveries
   - Problems already solved
   - Active blockers
   - Next step planned (the stage command, if the handoff names one)

2. **Extract key information**:
   - Project directory path
   - Current phase and task
   - Git commit reference
   - Uncommitted changes status

3. **Check whether the remote has moved**:

   ```bash
   git fetch && git status -sb   # report ahead/behind; leave pulling to the user
   ```

4. **Validate handoff currency**:

   ```bash
   # Check if we're on the right commit
   git rev-parse HEAD

   # Compare with handoff's git_commit
   # Warn if different - work may have progressed
   ```

5. **Sync and check beads state**:

   **Session-start sanity check**: read `beads_epic` from tasks.md frontmatter. If it is present, confirm the right database is open before reading the plan's issue IDs (see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md)):

   ```bash
   bd context            # resolved database name and beads dir
   bd show [epic-id]     # the plan's epic; must resolve
   bd stats              # total issue count
   bd version            # requires bd 1.1.0 or later
   ```

   If `bd show [epic-id]` fails, present the Wrong database case from [docs/reference/beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and stop. If the frontmatter has no `beads_epic`, note "plan predates beads tracking, sanity check skipped" and continue.

   ```bash
   # Persistence: see plugin/docs/reference/beads-mode.md (the local database is the source of truth)

   # Check beads state
   bd stats                        # Current beads statistics
   bd list --status=in_progress    # Check active work
   bd ready                        # See what's available
   ```

   Compare with the handoff's `beads_active_phase` and its "Beads Tracking State" section:
   - Counts should match if no work was done since the handoff; a large mismatch or zero issues means the session-start sanity check in beads-mode.md applies (`bd context`, `bd show <beads_epic>`, `bd stats`)

**Absorb the context and discoveries documented**

### Step 2: Read Project Documentation

Based on handoff references, read the project files:

```javascript
// Extract project directory from handoff
const projectDir = /* extracted from handoff */;

// Read all project documentation
const researchFile = `${projectDir}/research.md`;
const designFile = `${projectDir}/design.md`;
const tasksFile = `${projectDir}/tasks.md`;
```

1. **Read research.md** to understand:
   - Original codebase state
   - Patterns to follow
   - Integration points

2. **Read design.md** to understand:
   - What we're building
   - Design decisions made
   - Success criteria

3. **Read tasks.md** to understand:
   - Current phase details
   - Specific tasks to complete
   - Success verification steps

### Step 3: Restore Working Context

**Read beads tracking state** (read-only; the stage you run next claims work itself):

```bash
# If the handoff shows an in_progress phase, check it is still in progress
bd show [phase-id-from-handoff]

# Review issues the handoff names as next
bd show [issue-id-from-handoff]

# See what's ready to work on
bd ready
```

If the phase was completed by another session, note the difference for the report; the next command follows from what `bd ready` shows.

**Check for uncommitted changes** mentioned in handoff:

```bash
# Check current git status
git status

# If uncommitted changes exist, understand their purpose from handoff
git diff
```

### Step 4: Absorb Learnings from Handoff

Before reporting, internalize the critical learnings so the summary carries them:

1. **Patterns and Conventions**:
   - Note any discovered patterns mentioned
   - Remember consistency requirements
   - Note the approaches used previously

2. **Problems Already Solved**:
   - Don't re-solve issues documented in handoff
   - List the solutions already found
   - List the workarounds mentioned

3. **Decisions Made**:
   - Note the prior decisions the next stage stays consistent with
   - Don't revisit settled trade-offs
   - Note the chosen approach

4. **Known Gotchas**:
   - Be aware of performance issues found
   - Watch for edge cases discovered
   - Avoid pitfalls documented

### Step 5: Report Active Blockers

If the handoff documents active blockers:

1. **Review attempted solutions**: list what failed and why, so the next session does not repeat it
2. **Carry the suggested solutions** into the report as input for the stage you point the user to
3. **Flag a different approach**: if the blockers suggest switching approach or expertise, say so and offer `/wb:create_handoff`

### Step 6: Stop and Hand the Next Step to the User

Resuming restores context; it does not start the work. Implementation has to go through the stage skill that enforces its discipline (workers, test-writer, verifier, beads evidence, checkpoints), and the user decides when to start. Doing the work here skips all of that.

Read [templates.md](templates.md) and present the "Resumption Report Template", ending with the exact command for the user to run. Derive the command from the handoff's next step and the beads state:

- Work remains in a phase: `/wb:implement <plan-dir> <phase>` (or `/wb:implement_inline`), or `/wb:implement <plan-dir> continue` to pick up the current phase
- The phase is complete: the next phase's `/wb:implement` command, or `/wb:validate_phase <plan-dir> all` after the last phase (`/wb:validate_phase <plan-dir> <phase>` when the phase closed without its checkpoint)
- Earlier-stage work remains: that stage's command (for example `/wb:create_tasks <plan-dir>`)

Then end the turn. Do not edit code, claim or close beads issues, or run the handed-off tasks.

## Validation Steps

Run these checks before presenting the report in Step 6; their results fill its Current State section:

1. **Code State Verification** (read-only, and cheap): report the last known test result rather than running the suite, because the next stage runs its own baseline check before any work and a full suite can take minutes. Take it from the handoff or from the latest `verification report:` or `test integrity:` comment on the phase's tasks (`bd comments [task-id] --json`), with when it ran and the commit it ran on; if commits landed since then, or none is recorded, say so and leave the run to the next stage. `git status` and `git fetch && git status -sb` (Step 2) cover the rest.

2. **Progress Verification**:
   - Confirm phase matches handoff
   - Check task completion matches
   - Verify no work was lost

3. **Context Verification**:
   - Name a learning from the handoff that the next stage needs
   - Name a solved problem the next stage should not re-solve
   - Name a discovered pattern the next stage should follow

## Output Format

When successfully resumed, read [templates.md](templates.md) and use the "Resumption Report Template" to format the output.

## Handling Stale Handoffs

If the handoff seems outdated:

1. **Check git history**:

   ```bash
   # See if work progressed since handoff
   git log --oneline -10
   ```

2. **Compare with tasks.md**:
   - More task issues closed in beads than the handoff indicates?
   - Different phase than handoff shows?

3. **If stale, analyze the delta**:
   - Determine what changed since handoff
   - Decide if handoff learnings still apply
   - Consider creating fresh handoff from current state

Alert user if handoff is stale:

```
⚠️ Warning: Handoff may be stale

Handoff created: [date]
Current date: [date]
Git commits since handoff: [count]

The handoff learnings may still be valuable, but verify current state.
Consider running /wb:validate_phase <plan-dir> <phase> to re-check the latest finished phase.
```

## Important Guidelines

### Resume Best Practices

1. **Trust the Handoff**: Previous session did the discovery work
2. **Don't Repeat**: Avoid re-solving problems documented
3. **Carry Decisions Forward**: Put the patterns and decisions made into the report
4. **Carry Learnings Forward**: Name the insights the next stage needs
5. **Stop at the Handoff Point**: Name the next command and let the user run it; don't start the work from here

### When Handoff Conflicts with Code

If handoff says one thing but code shows another:

1. **Trust the code** for current state
2. **Trust the handoff** for learnings and context
3. **Document the discrepancy**
4. **Report the discrepancy** in the resumption report
5. **Name `/wb:validate_phase <plan-dir> <phase>`** as the next command when the discrepancy is about progress, with the phase it concerns

### Quality Indicators

A successful resume shows:

- Immediate understanding of context
- No repeated discovery work
- Consistent approach with previous session
- A next command that matches the exact stopping point
- Application of documented learnings

## Relationship to Other Commands

Common workflows:

**Simple Resume**:

1. **`/resume_handoff`** - Load context; it ends with the command to run
2. `/implement` - Continue implementation (run by the user)
3. `/validate_phase <plan-dir> all` - Verify the plan once its last phase is complete

**Complex Resume with Validation**:

1. **`/resume_handoff`** - Load context
2. `/validate_phase <plan-dir> <phase>` - Check actual state
3. Resolve any discrepancies
4. `/implement` - Continue work (run by the user)

**Chain of Handoffs**:

1. **`/resume_handoff`** - Session 2 resumes from Session 1
2. Run the stage command it names
3. `/create_handoff` - Session 2 creates new handoff
4. [New session]
5. **`/resume_handoff`** - Session 3 continues chain

## Error Handling

Read [reference.md](reference.md) and use the "Error Handling Catalog" for the appropriate error block (Handoff File Not Found / Invalid Handoff Format / Git State Mismatch).
