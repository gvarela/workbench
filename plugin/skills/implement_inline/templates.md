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

- [each blocking item, numbered T1, T2, ... so a reply can name it (a deterministic failure in a test this phase changed): what it is in plain words (criterion, file), what it puts at risk, and that it needs your acknowledgement before the milestone closes]
- [each unexplained deviation from the phase verifier, numbered D1, D2, ..., with its options and a paste-ready reply ("Phase Verification" in [implement/reference.md](../implement/reference.md))]
- [on the final phase: each FAIL Intent verdict on a statement the plan did not defer, with what failed, its options, and a paste-ready reply (`accept fail:`, `fix:`, or `plan defect:` and the statement; "Final phase: the Intent verdicts" in [implement/reference.md](../implement/reference.md))]
- [each proposed outer-test Rewrite, numbered R1, R2, ..., with a recommendation]
- [if this phase compacted: whether to start the next phase in a fresh session, with a recommendation (Resume Logic in SKILL.md)]
- [each decision asked earlier and still pending, as its one-line reminder ("Pending decisions" in [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md)), never re-asked in full]
- [or "Nothing needs your decision"]

**Decisions I made for you:**

- [each `judged:` record posted this phase (the rule, the purpose, what was done) and each step taken under a delegation you granted, one line each with the reply that reverses it, as [rules-and-intents.md](../../docs/reference/rules-and-intents.md) says; or "none"]

**What this phase delivered** (by acceptance criterion):

- [behavior the user can now rely on] (AC-n, task [id])
- Intent progress: [one line per README Intent statement, with its status from the phase verifier (deferred, at risk, not started, awaiting the manual check, met, or met so far); on the final phase, its Intent verdict instead (PASS, FAIL, DEFERRED, or awaiting your manual check, with its evidence in one clause), as "Final phase: the Intent verdicts" in [implement/reference.md](../implement/reference.md) says]

**Manual checks** (from design.md):

1. [Manual verification item 1]
2. [Manual verification item 2]

**Test integrity** (proposals; no test was edited):

- Outer tests committed red first: [each named by the criterion it guards]
- Integrity findings: [total] ([escalated] escalated); [the reviewer's Defect checks line, copied verbatim with its route and reasons, not summarised or reworded]
- Earlier phases' tests changed: [each with the task that declared it and its reason, or "none"]
- Review findings: [each with the criterion it guards and what the weakness lets through; settled candidates marked "n of 3"; additive strengthenings proposed as R<n> for your sanction, or marked "additive, within your delegation" when you granted one, run before the milestone closes]
- Review these: [each in plain words with its file:line after]

**Follow-ups** (each: what it is, what it puts at risk, whether it blocks the phase or the release, and when to do it):

- Product and plan: [behavior gaps, explained deviations, Intent statements at risk, design questions, and risks in the code such as security or performance, or none]; on the final phase, each deferred design question still open, as [deferred-design-questions.md](../../docs/reference/deferred-design-questions.md) says (it moves to Needs your decision only when that file's rule says so)
- Test quality: [weak or brittle tests and checks that fail on correct code; a defect runner's `setup_hint`, as a `!` command for you to run; or none]

**Beads state:** all Phase [N] tasks closed; the Phase [N] milestone ([phase-milestone-id]) is ready to close.

Reply when manual verification is complete, acknowledging each blocking item above by its number (acknowledge: T1, or a set: acknowledge: T1-T3), if any, answering each deviation by its number (accept: D1, fix: D2, plan defect: D3, or a set: accept: D1-D4) and, on the final phase, each FAIL Intent verdict, and naming any outer-test Rewrite you sanction (sanction: R1), and I'll close the phase milestone. A set covers only ids listed above and still pending; one with a gap, an answered or unlisted id, or mixed kinds is not acted on.

```

## Phase Completion Report (Step 5 §6)

Written as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says, with its sections in that order.

```

✅ Phase [N] Complete

**Needs your decision:** [anything still open, with options and a recommendation, or "Nothing needs your decision"]

**Decisions I made for you:** [each `judged:` record and delegated step this phase, one line each with the reply that reverses it, or "none"]

**What this phase delivered** (by acceptance criterion):

- [behavior the user can now rely on] (AC-n, task [id])
- Intent progress: [one line per README Intent statement, with its status from the phase verifier]
- Intent verdicts (final phase only, in place of Intent progress): [each statement with the verdict written to the README and its evidence in one clause, and each still awaiting your manual check, with no suffix written; as [intent-verdicts.md](../../docs/reference/intent-verdicts.md) says]
- Deviations from the plan: [each, in plain words, with the answer given (accepted, fixed, or plan defect), or "none"]

**Test integrity:**

- Outer tests committed red first: [each named by the criterion it guards]
- Integrity findings: [total] ([escalated] escalated); [the reviewer's Defect checks line, copied verbatim with its route and reasons, not summarised or reworded]; review findings filed: [each in plain words with its criterion and issue id]
- Earlier phases' tests changed: [each with the task that declared it and its reason, or "none"]
- Outer-test rewrites run: [each with the criterion it guards, who sanctioned it (you by name, or "additive, within your delegation"), and its Not claimed list with who accepted any case on it, or "none"]
- Coordinator records: [each `re-baseline:`, `stub files:`, `checkpoint-auto:`, `deferred:`, `judged:`, and `delegation:` record posted this phase, in plain words with its task or milestone, or "none"]

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
