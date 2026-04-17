---
description: Create a handoff document to transfer work context to another session or agent
argument-hint: [project-directory] [handoff-reason]
---

# Create Handoff

Creates a comprehensive handoff document to transfer your work context to another agent or resume in a new session. Captures critical context, learnings, and next steps that aren't in the formal documentation.

## Purpose

Handoff documents preserve:
- Work in progress and current status
- Critical learnings and discoveries
- Context not captured in formal docs
- Exact state for seamless resumption
- Blockers and their solutions
- Next steps with specific guidance

## Initial Response

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

**think deeply about what context would be lost if starting fresh**

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

3. **Deviations and Decisions**:
   - Where we deviated from plan and why
   - Judgment calls made
   - Trade-offs accepted

4. **Current Blockers**:
   - What's preventing progress
   - What's been tried
   - Potential solutions identified

### Step 3: Sync Beads and Check Git State

```bash
# Sync beads state
bd sync    # Exports to .beads/issues.jsonl

# Check mode (set by SessionStart hook)
if [ "$BEADS_MODE" = "stealth" ]; then
  echo "📍 Stealth mode detected: .beads/ is gitignored"
  echo "   Beads state is local-only (not committed to repo)"
  echo "   For work handoffs, document next steps manually in handoff doc"
else
  echo "📍 Git mode detected: .beads/ is tracked"
  echo "   Committing beads state to git for cross-session persistence"

  # Verify beads state was updated
  git status    # Should show .beads/issues.jsonl as modified

  # Commit beads state (part of handoff protocol)
  git add .beads/
  git commit -m "Sync beads state before handoff"
fi

# Check for uncommitted code changes
git diff

# Note any staged changes
git diff --staged

# Capture current HEAD for frontmatter
git rev-parse HEAD
```

Document any uncommitted work and its purpose.

**Beads persistence**:
- **Git mode** (personal projects): Beads state committed to git, persists across sessions
- **Stealth mode** (work repos): Beads state local-only, document next steps manually for handoff

### Step 4: Create Handoff Document

Create handoff in the project directory:

````markdown
---
created: [YYYY-MM-DDTHH:MM:SS+TZ]
type: handoff
project: [project-name]
phase: [current phase number]
handoff_reason: [reason]
last_task: [description of last task worked on]
git_commit: [current HEAD commit]
git_branch: [current branch]
repository: [repository name]
beads_epic: [epic-id from tasks.md]
beads_active_phase: [phase-id if in_progress]
---

# Handoff: [Project Name] - [Brief Status]

**Created**: [YYYY-MM-DD HH:MM TZ]
**Reason**: [handoff reason]
**Current Phase**: Phase [N] of [Total]
**Overall Progress**: [X]% complete

## Quick Start

To resume this work:
```bash
# Resume with this handoff
/resume_handoff [this file path]

# Or manually:
1. Read this handoff document
2. Read tasks.md to see current phase
3. Check git status for uncommitted changes
4. Continue from "Next Steps" section below
```

## Current State Summary

**What we're building**: [Brief description from design.md]

**Where we are**: [Current status - e.g., "Implementing Phase 2, task 3 of 5"]

**Last completed action**: [What was just finished]

**Next immediate task**: [What to do next]

## Work Completed This Session

### Code Changes
[List with file:line references]
- Modified `src/component.ts:45-67` - Added validation logic for [feature]
- Created `tests/component.test.ts` - Unit tests for new validation
- Updated `config/settings.json:12` - Added feature flag

### Tasks Completed
[From tasks.md with checkmarks]
- [x] Implement user authentication check
- [x] Add error handling for network failures
- [x] Write unit tests for auth module

### Verification Run
- ✅ Tests passing: `npm test` (45/45 pass)
- ⚠️ Linting: 2 warnings at `src/utils.ts:34,89`
- ✅ Build successful: `npm run build`

### Beads Tracking State
```bash
# bd stats output
[total] open, [n] in_progress, [m] closed, [b] blocked

# Active phases (in_progress)
[phase-id]: [description]

# Blocked phases (if any)
[phase-id]: blocked by [blocker-id]

# Ready to work (next available)
[phase-id]: [description]
```

## Critical Learnings

### Discoveries Not in Documentation

1. **Pattern Discovery**: The codebase uses [pattern] at `file:line` which isn't documented. Must follow this for consistency.

2. **Hidden Dependency**: `ComponentX` depends on `ServiceY` being initialized first. Not obvious from code structure.

3. **Performance Gotcha**: Method at `file:line` is called frequently - optimization critical here.

4. **Workaround Required**: Standard approach doesn't work because [reason]. Using [workaround] instead.

### Problems Solved

**Problem 1**: [Description]
- **Symptom**: [What went wrong]
- **Root Cause**: [Why it happened]
- **Solution**: [How it was fixed]
- **Location**: `file:line`

**Problem 2**: [Description]
[Similar structure...]

### Decisions Made

1. **Decision**: Chose [approach A] over [approach B]
   - **Why**: [Reasoning]
   - **Trade-off**: [What we gave up]
   - **Impact**: [Consequences]

## Current Blockers

### Active Blockers

1. **Blocker**: [Description]
   - **Impact**: Cannot proceed with [task]
   - **Attempted Solutions**:
     - Tried [approach 1] - failed because [reason]
     - Tried [approach 2] - partial success but [issue]
   - **Potential Solutions**:
     - Could try [approach 3]
     - Might need to [alternative]
   - **Files Involved**: `file1.ts`, `file2.ts`

### Resolved Blockers (For Reference)

1. **Was Blocked**: [Previous blocker]
   - **Resolution**: [How it was solved]
   - **Key Insight**: [What unlocked it]

## Implementation Notes

### Deviations from Plan

1. **Deviation**: [What's different from tasks.md]
   - **Location**: Phase [N], Task [M]
   - **Original Plan**: [What tasks.md said]
   - **Actual Implementation**: [What was done]
   - **Reason**: [Why the change]
   - **Impact**: [None/Minor/Needs Plan Update]

### Edge Cases Discovered

1. **Edge Case**: [Description]
   - **Scenario**: [When it occurs]
   - **Handling**: [How it's handled]
   - **Test**: [Test coverage at `file:line`]

### Technical Debt Noted

1. **Debt**: [Description]
   - **Location**: `file:line`
   - **Impact**: [Current limitation]
   - **Future Fix**: [What should be done]

## Uncommitted Changes

```bash
# Git status
[Output of git status]

# Files modified but not staged:
[List files]

# Purpose of uncommitted changes:
[Explain what the changes do and why not committed]
```

## Next Steps

### Immediate Next Tasks

1. **Complete current task**: [Specific task from tasks.md]
   - Start at: `file:line`
   - Implement: [What to add/change]
   - Verify with: [Test command]

2. **Fix blocker**: [If any]
   - Try approach: [Specific suggestion]
   - If that fails: [Alternative]

3. **Continue phase**: Complete remaining [N] tasks in Phase [M]

### Recommended Approach

```bash
# 1. Resume from handoff
/resume_handoff [this file]

# 2. Check git status
git status

# 3. Run tests to verify state
npm test

# 4. Continue with next task
# [Specific guidance for next task]
```

### Watch Out For

- ⚠️ [Gotcha 1]: [What to be careful about]
- ⚠️ [Gotcha 2]: [Another thing to watch]
- ⚠️ [Gotcha 3]: [Performance/security concern]

## Mockup State (if applicable)

_Include this section if mockups/ directory exists:_

- **Current version**: v00[N]
- **Mockup log**: `mockups/mockup-log.md`
- **Pending feedback** (not yet versioned):
  - [feedback 1]
  - [feedback 2]
- **Open UI questions** (beads):
  - `[id]`: [question]

## Artifacts and References

### Project Documents
- Research: `[path]/research.md` - Original analysis
- Design: `[path]/design.md` - Architecture decisions
- Tasks: `[path]/tasks.md` - Execution plan (currently on Phase [N])
- This Handoff: `[path]/handoff-YYYY-MM-DD-HH-MM.md`

### Key Code Locations
- Main implementation: `src/feature/main.ts`
- Tests: `tests/feature/`
- Configuration: `config/feature.json`
- Related utilities: `src/utils/helper.ts`

### External References
- [Any documentation consulted]
- [Stack Overflow solutions found]
- [Design patterns referenced]

## Session Metadata

- **Session Duration**: [X hours Y minutes]
- **Model Used**: [claude-3-sonnet/opus/haiku]
- **Tasks Attempted**: [N]
- **Tasks Completed**: [M]
- **Tests Written**: [Count]
- **Lines Changed**: +[additions] -[deletions]

## Handoff Verification

Before using this handoff, verify:
- [ ] Project directory exists at specified path
- [ ] Git repository is at mentioned commit
- [ ] Tests pass as indicated
- [ ] No merge conflicts if branch changed

---

**Handoff Complete**: Ready for resumption using `/resume_handoff [path]`
````

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

## Relationship to Other Commands

Typical workflows:

**Mid-Implementation Handoff**:
1. `/implement_tasks` - Working on implementation
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

## Configuration

This command creates rich context documents for work continuity. Best used when work spans multiple sessions or needs transfer between different agents/models.

The handoff document is self-contained and includes everything needed to resume work without loss of context or discovered knowledge.