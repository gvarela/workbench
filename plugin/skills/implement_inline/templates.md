# implement_inline — Output Templates

Templates for the structures this skill checks and the reports it produces. Read the relevant template in full when its step directs you here; match its structure exactly.

## Beads Tracking Frontmatter Shape (Step 1)

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

## Modified Files Section (Step 3)

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

## Checkpoint Report (Step 3)

Use "The Report" in [implement/checkpoint.md](../implement/checkpoint.md): its sections keep decisions, delivered behavior with the prover's result, the checks left for the person, test integrity, and follow-ups apart.

## Phase Completion Report (Step 3)

Written as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says, with its sections in that order.

```

✅ Phase [N] Complete

**Needs your decision:** [anything still open, with options and a recommendation, or "Nothing needs your decision"]

**Decisions I made for you:** [each `judged:` and `rewrite:` record and each test gap closed without asking this phase, one line each with what reverses it, or "none"]

**What this phase delivered** (by acceptance criterion):

- [behavior the user can now rely on] (AC-n, task [id])
- Intent progress: [one line per README Intent statement, with its status from the phase verifier]
- Intent verdicts (final phase only, in place of Intent progress): [each statement with the verdict written to the README and its evidence in one clause, and each still awaiting your manual check, with no suffix written; as [intent-verdicts.md](../../docs/reference/intent-verdicts.md) says]
- Deviations from the plan: [each, in plain words, with the answer given (accepted, fixed, or plan defect), or "none"]

**Test integrity:**

- Outer tests committed red first: [each named by the criterion it guards]
- Integrity findings: [total] ([escalated] escalated); [the reviewer's Defect checks line, copied verbatim with its route and reasons, not summarised or reworded]; review findings filed: [each in plain words with its criterion and issue id]
- Earlier phases' tests changed: [each with the task that declared it and its reason, or "none"]
- Outer-test rewrites run: [each with the criterion it guards, its proof (mechanical, name only, or differential), and any case you accepted as not claimed, or "none"]
- Coordinator records: [each `rewrite:`, `stub files:`, `checkpoint-auto:`, `deferred:`, and `judged:` record posted this phase, in plain words with its task or milestone, or "none"]

**Follow-ups** (each: what it is, what it puts at risk, whether it blocks the next phase or the release, and when to do it):

- Product and plan: [behavior gaps, design questions, and risks in the code such as security or performance, or none]; on the final phase, each deferred design question still open, as [deferred-design-questions.md](../../docs/reference/deferred-design-questions.md) says (it moves to Needs your decision only when that file's rule says so)
- Test quality: [weak or brittle tests and checks that fail on correct code; a defect runner's `setup_hint`, as a `!` command for you to run; or none]

**Beads tracking**:

- ✅ Phase [N] milestone closed ([phase-milestone-id])
- 🔓 Unblocked: the Phase [N+1] milestone ([next-phase-milestone-id]) and its first tasks, named in plain words

**Progress Summary:**

- Phase [N]: [X] tasks completed
- Next phase: [Y] tasks available (run `bd ready` to see)
- Files modified: [count] code files, [count] test files

Ready to proceed to Phase [N+1].

```
