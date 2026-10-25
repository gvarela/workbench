# implement — Output Templates

Templates for the documents and reports this skill produces. Read the relevant template in full before writing each output; match its structure exactly.

## Modified Files Aggregation (Step 7)

```markdown
### 📝 Modified Files (Phase ${phase})

#### Code Files
${aggregatedCodeFiles.map(f => `- \`${f.path}\` - ${f.description}`).join('\n')}

#### Test Files
${aggregatedTestFiles.map(f => `- \`${f.path}\` - ${f.description}`).join('\n')}

**Quick test commands:**
\`\`\`bash
# Run all tests for this phase
${generatePhaseTestCommand(aggregatedTestFiles)}
\`\`\`
```

## Phase Completion Report (Step 8)

The user reads this report to decide what to do next, so it follows [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md): its sections in that order, and each item named in plain words with its id in parentheses, saying what it means for the user and what they need to do.

```
✅ Phase ${phase} Complete (Coordinated Execution)

**Needs your decision:**
${anything still open from the checkpoint, each still-pending decision as its one-line reminder from the pending-decisions ledger (a set reply covers only pending ids shown in full earlier), or "Nothing needs your decision"}

**What this phase delivered** (by acceptance criterion):
${each criterion and task done as behavior the user can now rely on: "- <behavior> (AC-n, task <id>)"}
- Intent progress: ${one line per README Intent statement, with its status from the phase verifier ("Phase Verification" in reference.md)}
- Intent verdicts (final phase only, in place of Intent progress): ${each statement with the verdict written to the README (PASS, FAIL, or DEFERRED) and its evidence in one clause, and each still awaiting your manual check, with no suffix written; as [intent-verdicts.md](../../docs/reference/intent-verdicts.md) says}
- Deviations from the plan: ${each, in plain words, with the answer the user gave (accepted, fixed, or plan defect), or "none"}

**Test integrity:**
- Outer tests committed red first: ${each named by the criterion it guards}
- Integrity findings: ${integrityTotal} (${integrityEscalated} escalated); ${the reviewer's Defect checks line, copied verbatim with its route and reasons, not summarised or reworded}; review findings filed: ${each in plain words with its criterion and issue id}
- Earlier phases' tests changed: ${each with the task that declared it and its reason, or "none"}
- Outer-test rewrites run: ${each with the criterion it guards, who sanctioned it (you by name, or "additive, sanctioned by me"), and its Not claimed list with who accepted any case on it, or "none"}
- Coordinator records: ${each `auto-continue:`, `re-baseline:`, and `not claimed:` record posted this phase, in plain words with its task, or "none"}

**Follow-ups** (each: what it is, what it puts at risk, whether it blocks the next phase or the release, and when to do it):
- Product and plan: ${behavior gaps, design questions, and risks in the code such as security or performance, or "none"}; on the final phase, each deferred design question still open, as [deferred-design-questions.md](../../docs/reference/deferred-design-questions.md) says (it moves to Needs your decision only when that file's rule says so)
- Test quality: ${weak or brittle tests and checks that fail on correct code; a defect runner's `setup_hint`, as a `!` command for you to run; or "none"}

**Execution Statistics:**
- Worker agents spawned: ${workerCount}
- Total tasks completed: ${completedCount}
- Execution mode: sequential

**Beads tracking:**
- ✅ Phase ${phase} milestone closed (${phaseMilestoneId})
- 🔓 Unblocked: the Phase ${phase + 1} milestone (${nextPhaseMilestoneId}) and its first tasks, named in plain words

**Progress Summary:**
- Phase ${phase}: ${taskCount} tasks completed via workers
- Next phase: ${nextPhaseTaskCount} tasks available (run \`bd ready\`)
- Files modified: ${codeFileCount} code files, ${testFileCount} test files

**Context:** compactions this phase: ${compactionCount}${; when 1 or more, the fresh-session choice the user made at the checkpoint ("Handoff Decision" in reference.md)}

Ready to proceed to Phase ${phase + 1}.
```

## Implementation Notes Entry (Step 9)

The user reads these notes in tasks.md, so a learning or follow-up names its subject in plain words with any id in parentheses, as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says.

```markdown
## Implementation Notes
- [YYYY-MM-DD] Phase ${phase} complete using coordinated workers:
  - ${workerCount} workers spawned (sequential execution)
  - Compactions this phase: ${compactionCount}
  - Integrity findings: ${integrityTotal} (${integrityEscalated} escalated); ${the reviewer's Defect checks line, copied verbatim with its route and reasons, not summarised or reworded}
  - Phase verification: ${PASS, or FAIL with each deviation and the answer given}; Intent progress: ${each statement's status; on the final phase, its verdict}
  - Key learnings: ${aggregatedLearnings}
```
