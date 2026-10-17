# create_tasks — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## tasks.md Document Template

````markdown
---
project: [from existing frontmatter]
ticket: [from existing frontmatter]
created: [from existing frontmatter]
status: not-started
last_updated: [YYYY-MM-DD]
current_phase: 1
total_tasks: [calculated count]
completed_tasks: 0
depends_on: [research.md, design.md]
---

# Execution Plan: [Feature Name]

## Overview

Implementing [brief summary] as specified in design.md

**Design Approach**: [from design.md]
**Target State**: from design.md Success Metrics (each refining an Intent statement; deferred statements listed as such)

## Implementation Strategy

### Phase Rationale
[Explain why phases are ordered this way - dependencies from agents, risk mitigation, etc.]

Based on dependency analysis:
- [Key dependency finding from agent]
- [Parallel work opportunity from agent]

### Testing Strategy
[How the acceptance criteria become outer tests, which boundaries need a harness task, and the inner cases the criterion examples imply, from the test coverage agent. Omit the criterion-based parts for a plan that predates acceptance criteria.]

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:
- Phase 1: See beads milestone `[phase1-milestone-id]` - depends on [X] tasks
- Phase 2: See beads milestone `[phase2-milestone-id]` - depends on [Y] tasks
- Phase 3: See beads milestone `[phase3-milestone-id]` - depends on [Z] tasks

Use `bd show [milestone-id]` to see which tasks block each phase milestone.

---

## Phase 1: [Descriptive Name]

### Objective
[Single clear goal for this phase]

### Prerequisites
- [ ] Research validated
- [ ] Design approved
- [ ] Development environment ready
- [ ] [Dependencies from agent analysis]

### Changes Required

#### 1. [Component/Module Name]

**File**: `path/to/file.ext`

**Current State** (from research.md):
- [How it works now]
- [Key function at line X]

**Target State** (from design.md Success Metrics, each refining an Intent statement):
- [How it should work]
- [New capability needed]

**Implementation**:
```language
// At line [X], replace:
[old code]

// With:
[new code]
```

**Rationale**: [Why this specific implementation]
**Pattern Reference**: [Similar implementation from agent at file:line]

#### 2. [Another Component]

[Similar structure...]

### Tasks

**Note**: Task status is tracked ONLY in beads. The tasks below document WHAT needs to be done (the PLAN). For task STATUS, run `bd list` or check frontmatter `beads_tasks` for IDs.

#### Setup Tasks
- Create new directory structure at `path/to/new/` → `[beads:phase1_setup_1]`
- Install dependencies: `npm install [package]` → `[beads:phase1_setup_2]`
- Set up configuration in `config/feature.json` → `[beads:phase1_setup_3]`

#### Harness Tasks
(One for each boundary design marks "add harness"; place it before the first outer test at that boundary. "Manual" and "lower proxy" decisions get no harness task. Omit when no boundary needs one.)
- Add [the project's harness] for [boundary] → `[beads:phase1_harness_1]`
  - Proof that the harness can fail: a smoke test on existing behavior, shown failing on a deliberately wrong expectation, then restored

#### Outer Test Steps
(One per acceptance criterion in this phase, except a criterion under a "manual" decision, which goes under Manual Verification instead. A "lower proxy" criterion is observed at the proxy design names. The coordinator runs each through `wb:test-writer` and commits the failing test as `red(AC-n): [criterion title]`.)
- AC-[n]: [criterion title], observed at [boundary] → `[beads:phase1_outer_1]`
  - Examples: [the criterion's Example lines]
  - Test file: `[path/to/outer/test]`
  - Done when: the test fails on an assertion about the observable, and the `red(AC-n)` commit exists

#### Implementation Tasks
(Each cites the criterion ids it serves and depends on their outer-test steps.)
- Create [Component] class at `src/component.ts` → `[beads:phase1_impl_1]`
  - Serves: AC-[n]
  - Implement constructor with dependency injection
  - Add [method1] for [purpose]
  - Add [method2] for [purpose]
  - Inner cases: [cases the criterion's examples imply]
- Modify [ExistingComponent] at `src/existing.ts:45` → `[beads:phase1_impl_2]`
  - Serves: AC-[n]
  - Add integration with new component
  - Update error handling

#### Integration Tasks
- Connect [Component] to [ExistingSystem] → `[beads:phase1_integration_1]`
- Update API endpoint at `api/routes.ts:78` → `[beads:phase1_integration_2]`
- Add database migration for new table → `[beads:phase1_integration_3]`

### Success Criteria

#### Automated Verification
(Commands come from research.md's Testing Conventions, not from guesses.)
- [ ] Phase tests pass: `[fast command from research]`
- [ ] Full suite passes: `[full command from research]`
- [ ] Each outer test of this phase passes: `[command for the outer test files]`
- [ ] Lint, type check, and build commands from research pass

#### Manual Verification
(From design.md success criteria, plus each acceptance criterion under a "manual" harness decision)
- [ ] [Specific user action] works correctly
- [ ] Performance meets target: [metric]
- [ ] Error messages are clear and helpful
- [ ] No regression in [related feature]

### Modified Files

Track all files changed in this phase:

#### Code Files
- `src/component.ts` - New component implementation
- `src/existing.ts` - Integration point modified
- `config/feature.json` - Configuration added

#### Test Files
- `[path/to/outer/test]` - Outer test for AC-[n]
- `[path/to/inner/test]` - Inner tests for the new component

**Quick test command for this phase** (from research.md's Testing Conventions):
```bash
[fast command] [phase test files]
```

### ⛔ CHECKPOINT: Phase 1 Complete

Before proceeding to Phase 2:
1. ✅ All Phase 1 task beads issues closed (`bd list --status=closed`)
2. ✅ Phase 1 milestone beads issue closed
3. ✅ All automated verification passing
4. ✅ Manual verification confirmed by human
5. ✅ Reconcile plan-doc status via `/wb:update_status` (sole writer of the progress fields)

**Verification**: Run `bd show [phase1-milestone-id]` to confirm all blocking tasks are closed.

**Do not proceed without human confirmation of manual tests.**

---

## Phase 2: [Descriptive Name]

### Objective
[Clear goal for phase 2]

### Prerequisites
- [ ] Phase 1 complete and verified
- [ ] Phase 1 manual testing confirmed
- [ ] [Additional prerequisites from dependency agent]

[Continue with similar structure...]

---

## Implementation Discoveries

Things to determine during implementation:
- [Technical detail that needs investigation]
- [Configuration that needs testing]
- [Performance tuning needed]

Note: Update this section with findings as you implement.

---

## 🚧 Blockers & Notes

### Current Blockers

Blockers are tracked in beads. To see current blockers:

```bash
bd blocked    # Show all blocked issues and what blocks them
```

For reference, recently resolved blockers can be noted here:
- [Date]: [Brief description] - resolved by [solution]

### Implementation Notes
- [Important discovery during implementation]
- [Deviation from plan and why]

---

## 🔗 Quick Reference

### Key Files
- **Research**: [research.md](research.md) - Current state documentation
- **Design**: [design.md](design.md) - Target state specification
- **Main Entry**: `[from design]`
- **Config**: `[from design]`

### Common Commands
```bash
# Commands from research.md's Testing Conventions
[full test command]
[phase test command]
[build and lint commands]
```

### Design Decisions Reference
Quick lookup of key design decisions:
- [Decision 1]: [Brief reminder]
- [Decision 2]: [Brief reminder]
````

## Frontmatter Tracking Block (Step 5f)

```yaml
beads_epic: [epic-id]
beads_phases:
  phase1_milestone: [phase1-milestone-id]
  phase2_milestone: [phase2-milestone-id]
  phase3_milestone: [phase3-milestone-id]
beads_tasks:
  # Phase 1 tasks
  phase1_setup_1: [task-id]
  phase1_setup_2: [task-id]
  phase1_impl_1: [task-id]
  phase1_impl_2: [task-id]
  phase1_harness_1: [task-id]
  phase1_outer_1: [task-id]
  phase1_integration_1: [task-id]
  # Phase 2 tasks
  phase2_setup_1: [task-id]
  phase2_impl_1: [task-id]
  # ... etc for all tasks
```

## Beads Issue Tracking Section (Step 5f)

```markdown
## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: [epic-id]

**Phase Milestones**:
- Phase 1: [phase1-milestone-id] (all Phase 1 tasks must complete)
- Phase 2: [phase2-milestone-id] (all Phase 2 tasks must complete)
- Phase 3: [phase3-milestone-id] (all Phase 3 tasks must complete)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Essential Commands**:
- `bd ready` - See what's ready to work on (no blockers)
- `bd show [id]` - View task details and dependencies
- `bd update [id] --claim` - Claim a task
- `bd close [id]` - Complete a task
- `bd blocked` - See what's currently blocked
- `bd list --status=in_progress` - See your active work

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.
```
