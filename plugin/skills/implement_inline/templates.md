# implement_inline — Output Templates

Templates for the structures this skill checks and the reports it produces. Read the relevant template in full when its step directs you here; match its structure exactly.

## Beads Tracking Frontmatter Shape (Step 2)

tasks.md frontmatter must contain:

```yaml
# tasks.md frontmatter should have:
beads_epic: [epic-id]
beads_phases:
  phase1_milestone: [phase1-milestone-id]
  phase2_milestone: [phase2-milestone-id]
beads_tasks:
  phase1_setup_1: [task-id]
  phase1_setup_2: [task-id]
  phase1_impl_1: [task-id]
  # ... all tasks
```

## Modified Files Section (Step 5)

```markdown
### 📝 Modified Files

#### Code Files
- `path/to/file1.ext` - Implemented [feature]
- `path/to/file2.ext` - Added [functionality]

#### Test Files
- `path/to/test1.spec.ts` - Tests for [feature]
- `path/to/test2.test.ts` - Integration tests for [scenario]

**Quick test commands:**
```bash
# Run tests for this phase only
npm test path/to/test1.spec.ts path/to/test2.test.ts
```

```

## Manual Verification Request (Step 6 §3)

```

✅ Phase [N] Automated Verification Complete

**Automated checks passed:**

- ✅ All tests passing: [test command]
- ✅ Linting clean: [lint command]
- ✅ Build successful: [build command]

**Beads state:**

- ✅ All Phase [N] tasks closed: [list task IDs]

**Manual verification required:**

Please perform the following manual checks from design.md:

1. [Manual verification item 1]
2. [Manual verification item 2]
3. [Manual verification item 3]

Reply when manual verification is complete and I'll close the phase milestone.

```

## Phase Completion Report (Step 6 §5)

```

✅ Phase [N] Complete

**Beads tracking**:

- ✅ Phase [N] milestone closed: [phase-milestone-id]
- 🔓 Unblocked: [next-phase-milestone-id] and its initial tasks

**Progress Summary:**

- Phase [N]: [X] tasks completed
- Next phase: [Y] tasks available (run `bd ready` to see)
- Files modified: [count] code files, [count] test files

Ready to proceed to Phase [N+1].

```
