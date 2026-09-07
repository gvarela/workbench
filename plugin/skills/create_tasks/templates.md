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
[Overall approach to testing throughout implementation, incorporating test coverage agent findings]

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

#### Implementation Tasks
- Create [Component] class at `src/component.ts` → `[beads:phase1_impl_1]`
  - Implement constructor with dependency injection
  - Add [method1] for [purpose]
  - Add [method2] for [purpose]
- Modify [ExistingComponent] at `src/existing.ts:45` → `[beads:phase1_impl_2]`
  - Add integration with new component
  - Update error handling

#### Testing Tasks
(Generated from test coverage agent findings)
- Write unit tests for [Component] at `tests/component.test.ts` → `[beads:phase1_test_1]`
  - Test [scenario 1 from agent]
  - Test [edge case from agent]
  - Test [error condition from agent]
- Write integration tests at `tests/integration/feature.test.ts` → `[beads:phase1_test_2]`
  - Test [integration scenario from agent]

#### Integration Tasks
- Connect [Component] to [ExistingSystem] → `[beads:phase1_integration_1]`
- Update API endpoint at `api/routes.ts:78` → `[beads:phase1_integration_2]`
- Add database migration for new table → `[beads:phase1_integration_3]`

### Success Criteria

#### Automated Verification
- [ ] Unit tests pass: `npm test src/component.test.ts`
- [ ] Integration tests pass: `npm test:integration`
- [ ] Linting clean: `npm run lint`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`

#### Manual Verification
(From design.md success criteria)
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
- `tests/component.test.ts` - Unit tests for new component
- `tests/integration/feature.test.ts` - Integration tests

**Quick test command for this phase**:
```bash
npm test src/component.test.ts tests/integration/feature.test.ts
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

## 📝 Completed Tasks Archive

Move completed tasks here weekly to keep active list focused.

### Week of [YYYY-MM-DD]
- [x] Task description (completed YYYY-MM-DD HH:MM)

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
# Run all tests
npm test

# Run phase-specific tests
[phase test command]

# Build
npm run build

# Lint
npm run lint
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
  phase1_test_1: [task-id]
  phase1_test_2: [task-id]
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
