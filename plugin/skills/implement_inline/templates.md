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

## Modified Files Section (Step 4)

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

## Manual Verification Request (Step 5 §4)

The sections and each item follow [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md): an item names its subject in plain words with the id in parentheses, says what it means for the user, and says what they need to do. A section with nothing in it stays as one line.

```

✅ Phase [N] Automated Verification Complete, all passing (tests: [test command]; lint: [lint command]; typecheck: [typecheck command]; build: [build command])

**Needs your decision:**

- [each blocking item (a deterministic failure in a test this phase changed): what it is in plain words (criterion, file), what it puts at risk, and that it needs your acknowledgement before the milestone closes]
- [each proposed outer-test Rewrite, with a recommendation]
- [if this phase compacted: whether to start the next phase in a fresh session, with a recommendation (Resume Logic in SKILL.md)]
- [or "Nothing needs your decision"]

**What this phase delivered** (by acceptance criterion):

- [behavior the user can now rely on] (AC-n, task [id])

**Manual checks** (from design.md):

1. [Manual verification item 1]
2. [Manual verification item 2]

**Test integrity** (proposals; no test was edited):

- Outer tests committed red first: [each named by the criterion it guards]
- Integrity findings: [total] ([escalated] escalated)
- Review findings: [each with the criterion it guards and what the weakness lets through; settled candidates marked "n of 3"]
- Review these: [each in plain words with its file:line after]

**Follow-ups** (each: what it is, what it puts at risk, whether it blocks the phase or the release, and when to do it):

- Product and plan: [behavior gaps, design questions, and risks in the code such as security or performance, or none]; on the final phase, each deferred design question still open, as [deferred-design-questions.md](../../docs/reference/deferred-design-questions.md) says (it moves to Needs your decision only when that file's rule says so)
- Test quality: [weak or brittle tests and checks that fail on correct code, or none]

**Beads state:** all Phase [N] tasks closed; the Phase [N] milestone ([phase-milestone-id]) is ready to close.

Reply when manual verification is complete, acknowledging each blocking item above by name, if any, and naming any outer-test Rewrite you sanction, and I'll close the phase milestone.

```

## Phase Completion Report (Step 5 §6)

Written as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says, with its sections in that order.

```

✅ Phase [N] Complete

**Needs your decision:** [anything still open, with options and a recommendation, or "Nothing needs your decision"]

**What this phase delivered** (by acceptance criterion):

- [behavior the user can now rely on] (AC-n, task [id])

**Test integrity:**

- Outer tests committed red first: [each named by the criterion it guards]
- Integrity findings: [total] ([escalated] escalated); review findings filed: [each in plain words with its criterion and issue id]
- Outer-test rewrites run: [each with the criterion it guards, or "none"]

**Follow-ups** (each: what it is, what it puts at risk, whether it blocks the next phase or the release, and when to do it):

- Product and plan: [behavior gaps, design questions, and risks in the code such as security or performance, or none]; on the final phase, each deferred design question still open, as [deferred-design-questions.md](../../docs/reference/deferred-design-questions.md) says (it moves to Needs your decision only when that file's rule says so)
- Test quality: [weak or brittle tests and checks that fail on correct code, or none]

**Beads tracking**:

- ✅ Phase [N] milestone closed ([phase-milestone-id])
- 🔓 Unblocked: the Phase [N+1] milestone ([next-phase-milestone-id]) and its first tasks, named in plain words

**Progress Summary:**

- Phase [N]: [X] tasks completed
- Next phase: [Y] tasks available (run `bd ready` to see)
- Files modified: [count] code files, [count] test files

Ready to proceed to Phase [N+1].

```
