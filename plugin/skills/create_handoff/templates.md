# create_handoff — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## Handoff Document Template

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
4. Run the "Next command" from the Next Steps section below
```

## Current State Summary

**What we're building**: [Brief description from design.md]

**Where we are**: [Current status - e.g., "Implementing Phase 2, task 3 of 5"]

**Last completed action**: [What was just finished]

**Next immediate task**: [What to do next, and the stage command that does it]

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

### Next command

The stage command the next session's user runs after `/resume_handoff`, with its arguments filled in. Resuming restores context and stops; the stage skill does the work, so the handoff records the command and not coding instructions.

```bash
# e.g. /wb:implement <plan-dir> <phase>, /wb:implement <plan-dir> continue,
# /wb:validate_execution <plan-dir>, or the next stage's command
[exact command]
```

### Context for the next stage

What the stage and its workers should know; these are hints, not steps to run outside the stage.

1. **Current task**: [Specific task from tasks.md]
   - Where it starts: `file:line`
   - What it needs: [What to add/change]
   - Verified by: [Test command]

2. **Blocker**: [If any]
   - Suggested approach: [Specific suggestion]
   - If that fails: [Alternative]

3. **Remaining in the phase**: [N] tasks in Phase [M]

### Recommended Approach

```bash
# 1. In the new session, restore context (it stops and names the command)
/resume_handoff [this file]

# 2. Run the command it names (the "Next command" above)
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
- **Model Used**: [haiku/sonnet/opus/fable]
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
