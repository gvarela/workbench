---
name: create_handoff
description: Write a handoff document that carries this session's working context — decisions, discoveries, deviations from plan, beads state, next steps — into a new session, model, or agent. Use when ending or pausing a session, switching models or machines, when asked to hand off, checkpoint, or save context, or before compaction on long-running work. Takes the project directory under docs/plans/ and an optional reason.
argument-hint: [project-directory] [handoff-reason]
allowed-tools: Read
---

# Create Handoff

Creates a comprehensive handoff document to transfer your work context to another agent or resume in a new session. Captures critical context, learnings, and next steps that aren't in the formal documentation.

Supporting file: [templates.md](templates.md) — the handoff document template. Read it in full when Step 4 directs you to.

## Purpose

Handoff documents preserve:

- Work in progress and current status
- Critical learnings and discoveries
- Context not captured in formal docs
- Exact state for seamless resumption
- Blockers and their solutions
- Next steps with specific guidance

## Initial Response

This stage needs from you: the reason for handing off, and anything the next session must know that no document holds.

When invoked, check for arguments:

1. **If directory provided** (e.g., `/create_handoff docs/plans/2025-01-08-my-project/ "switching to opus for complex logic"`):
   - Use `$1` as project directory
   - Use `$2+` as handoff reason (optional)
   - Begin handoff creation

2. **If no arguments**:

   ```
   I'll create a handoff document for your current work. Please provide:
   1. Path to the project documentation directory (e.g., docs/plans/2025-01-08-my-project/)
   2. Reason for handoff (optional, e.g., "session ending", "need different model", "blocked on approval")

   I'll document the current state for seamless continuation.
   ```

## Process Steps

### Step 1: Gather Current State

**⛔⛔⛔ BARRIER 1: STOP! Read ALL project docs AND review conversation history ⛔⛔⛔**

```javascript
const projectDir = $1 || /* prompt for it */;
const handoffReason = $2 || "session transfer";

// Read all project documentation
const researchFile = `${projectDir}/research.md`;
const designFile = `${projectDir}/design.md`;
const tasksFile = `${projectDir}/tasks.md`;
```

1. **Read all project documentation** to understand:
   - Project goals and current status
   - What's been completed
   - What's in progress

2. **Review conversation history** to capture:
   - Recent changes made
   - Problems encountered and solutions
   - Decisions made during implementation
   - Any deviations from plan

3. **Check beads state** to capture:

   ```bash
   bd stats                        # Overall project progress
   bd list --status=in_progress    # Active work
   bd list --status=closed         # Completed work
   bd blocked                      # Any blocked issues
   bd ready                        # What's available next
   ```

   This shows:
   - What tasks were completed
   - What's currently in progress
   - What's ready to work on next

4. **Check for mockup state** (if mockups/ exists):

   ```bash
   ls mockups/                     # Check for mockup directory
   # If exists, read mockups/mockup-log.md for current version and pending feedback
   ```

**Identify what context would be lost if starting fresh**

### Step 2: Analyze Work State

Determine the current implementation state:

1. **Implementation Progress**:
   - Which phase are we in?
   - Which tasks are complete/in-progress/blocked?
   - Any partial implementations?

2. **Critical Discoveries**:
   - Unexpected patterns found
   - Gotchas encountered
   - Solutions to tricky problems
   - Performance considerations discovered
   - Run `bd memories <project>` and list the entries this session added with `bd remember`; keep the ones that still qualify, `bd forget` the ones that were task-specific. Memories are workspace-wide across every plan in this repository and are excluded from `bd export` by default; only a Dolt remote or `bd backup` carries them to another machine.

3. **Deviations and Decisions**:
   - Where we deviated from plan and why
   - Judgment calls made
   - Trade-offs accepted

4. **Current Blockers**:
   - What's preventing progress
   - What's been tried
   - Potential solutions identified

### Step 3: Persist Beads and Check Git State

```bash
# Persist beads state (see plugin/docs/reference/beads-mode.md)
if bd config get sync.remote 2>/dev/null | grep -qv "not set"; then bd dolt push; fi
if [ "$(bd config get backup.enabled 2>/dev/null)" = "true" ]; then bd backup sync; fi

# Check for uncommitted code changes
git diff

# Note any staged changes
git diff --staged

# Capture current HEAD for frontmatter
git rev-parse HEAD
```

Document any uncommitted work and its purpose.

**Beads persistence**:

- The local database under `.beads/` is the source of truth and is never committed; a Dolt remote or `bd backup` carries it across machines (see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md))
- Without a remote or backup, this handoff document is the only artifact that crosses machines, and the plan's beads IDs will not resolve elsewhere; see beads-mode.md to set up continuity

### Step 4: Create Handoff Document

Create handoff in the project directory:

Read the "Handoff Document Template" section of [templates.md](templates.md) NOW and follow it exactly, filling every field from the state you gathered.

### Step 5: Save and Confirm

Save the handoff document as:

```
[project-dir]/handoff-YYYY-MM-DD-HH-MM.md
```

Where:

- YYYY-MM-DD is current date
- HH-MM is current time (24-hour)

Present to user:

```
✅ Handoff document created successfully!

Saved to: [full path]/handoff-YYYY-MM-DD-HH-MM.md

This handoff captures:
- Current progress: Phase [N], [X]% complete
- Critical learnings: [count] discoveries
- Active blockers: [count] issues
- Next steps: [count] specific tasks

To resume this work in a new session:
/resume_handoff [full path to handoff file]

The handoff includes all context needed for seamless continuation.
```

## Important Guidelines

### What to Include

**ALWAYS Include**:

- Current phase and task status
- Recent code changes (file:line)
- Problems solved and how
- Active blockers and attempted solutions
- Critical discoveries about codebase
- Next immediate steps

**Include When Relevant**:

- Uncommitted changes and why
- Deviations from plan
- Performance considerations found
- Security issues discovered
- Architectural insights

**Don't Include**:

- Large code blocks (use file:line references)
- Obvious information from project docs
- Generic advice
- Completed and verified work from previous phases

### Handoff Quality

A good handoff should allow someone to:

1. Understand exactly where you left off
2. Know what problems you solved
3. Avoid repeating failed attempts
4. Continue without re-discovering context
5. Make the same decisions you made

### When to Create Handoffs

Create a handoff when:

- Session is ending with work incomplete
- Switching to different model for complex work
- Blocked and need different expertise
- Completed significant milestone
- Made important discoveries
- The session has already needed `/compact` once this phase and is heading for another — hand off instead; a second compaction compounds summary drift

### Why a Handoff Instead of a Second `/compact`

Compaction replaces the transcript with a model-written summary. What's on disk (docs, beads, commits) survives untouched; everything in-context — full doc reads, tool results, the ⛔ barrier instructions loaded by skills — is replaced by paraphrase, and nothing labels the paraphrase as degraded. A second compaction summarizes a context that is already partly summary, so loss compounds while confidence stays flat.

Timing matters as much as count. A `/compact` at a phase boundary (checkpoint passed, status reconciled via `/wb:update_status`, beads closed, work committed) is nearly free — everything load-bearing already lives in durable artifacts, and the SessionStart(compact) recovery hook re-anchors on the plan docs. A mid-phase compact is expensive: the summary becomes the only carrier of in-flight reasoning and active instructions.

A handoff moves that at-risk content into a durable file that is deliberate (written knowing what matters), inspectable (reviewable and correctable before resuming — a compaction summary never is), and self-repairing (`/wb:resume_handoff` forces fresh full doc reads and beads reconciliation). Its cost is one session restart — which is why this rule reserves it for the second mid-phase compact, the point of worst marginal loss, rather than every compact.

## Relationship to Other Commands

Typical workflows:

**Mid-Implementation Handoff**:

1. `/implement` - Working on implementation
2. [Hit blocker or session limit]
3. **`/create_handoff`** - Document current state
4. [New session]
5. `/resume_handoff` - Continue where left off

**Phase Completion Handoff**:

1. Complete Phase N
2. `/validate_execution` - Verify work
3. **`/create_handoff`** - Document for next phase
4. [New session]
5. `/resume_handoff` - Start Phase N+1
