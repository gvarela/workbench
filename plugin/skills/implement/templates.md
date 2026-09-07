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

```
✅ Phase ${phase} Complete (Coordinated Execution)

**Execution Statistics:**
- Worker agents spawned: ${workerCount}
- Total tasks completed: ${completedCount}
- Execution mode: sequential

**Beads tracking:**
- ✅ Phase ${phase} milestone closed: ${phaseMilestoneId}
- 🔓 Unblocked: ${nextPhaseMilestoneId} and its initial tasks

**Progress Summary:**
- Phase ${phase}: ${taskCount} tasks completed via workers
- Next phase: ${nextPhaseTaskCount} tasks available (run \`bd ready\`)
- Files modified: ${codeFileCount} code files, ${testFileCount} test files

**Context Efficiency:**
- Main agent context: Constant (no accumulation)
- Worker contexts: Ephemeral (discarded after each task)
- No compaction needed during phase implementation

Ready to proceed to Phase ${phase + 1}.
```

## Implementation Notes Entry (Step 9)

```markdown
## Implementation Notes
- [YYYY-MM-DD] Phase ${phase} complete using coordinated workers:
  - ${workerCount} workers spawned (sequential execution)
  - Main context kept clean, no compaction needed
  - Key learnings: ${aggregatedLearnings}
```
