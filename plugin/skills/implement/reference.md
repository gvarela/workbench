# implement — Reference

Specs and playbooks consulted at specific steps. Read the relevant section in full when its step directs you here.

## Context Package Structure (Step 3)

Build exactly this structure from the documentation you've read — only what workers actually need:

```javascript
const contextPackage = {
  // From design.md - the reason behind the phase: what it delivers and who it serves
  why: "<one or two sentences from design.md: what this phase delivers and who it serves>",

  // From research.md - patterns workers must follow
  patterns: {
    testingFramework: "jest | pytest | go test | ...",
    testFileLocation: "tests/ | __tests__ | *_test.go | ...",
    fileStructure: "src/ layout | pkg/ layout | ...",
    namingConventions: "camelCase | snake_case | ...",
    importPatterns: "how modules are imported",
    errorHandling: "established patterns"
  },

  // From design.md - relevant to this phase
  design: {
    phaseGoal: "what this phase achieves",
    successCriteria: ["criterion 1", "criterion 2"],
    constraints: ["constraint 1", "constraint 2"],
    architecturalApproach: "key decisions"
  },

  // From tasks.md frontmatter
  beads: {
    epicId: "beads-xxx",
    phaseMilestoneId: "beads-yyy"
  },

  // Test commands
  testCommands: {
    unit: "npm test | pytest | go test ./...",
    specific: "npm test path/to/file | pytest tests/file.py",
    coverage: "npm test -- --coverage | pytest --cov"
  },

  // File references relevant to this phase.
  // Be precise and generous here: every file:line fact you supply is a Read the
  // worker doesn't spend, and naming the exact files a task must change removes
  // its discovery sweep entirely. Coordinator context is already loaded; worker
  // tool-call budget is scarce.
  relevantFiles: [
    "src/feature/file1.ts:123 - existing pattern to follow",
    "tests/feature/test1.spec.ts:45 - test structure example"
  ]
};
```

## Worker Model Selection (Step 5)

The `determineModel()` keyword-regex spec was retired in favor of coordinator judgment (2026-06, prompts-0my). The tier rule lives in one place, SKILL.md Step 5 item 4 ("Determine model"), and is not restated here; the choice is passed as a per-spawn model override on the `task-worker` agent.

## Worker Failure Playbook (Step 6)

If a worker leaves its task in `in_progress` (didn't close the beads issue), the worker did not finish. Verification is NOT run when the worker didn't finish — that path is for verification FAILs after successful completion.

An unfinished worker is one of **two distinct events with opposite remedies** — diagnose before acting. Run `git status` and `git diff --stat` to inventory what the worker actually landed, and look at how its output ends.

### Case A: Truncation (budget exhaustion)

Subagents stop when they exhaust their tool-call budget (observed as a hard stop near ~70 calls — measured evidence from one session/model, not a guaranteed constant; treat the symptom, not the number).

**Signature**: files ARE changed but the bead is still open; the worker's output cuts off mid-sequence rather than reporting a blocker. The missing work is always the *tail* — the last test conversions, final verification runs, the `bd close`. The worker did nothing wrong; the task was too large for one delegation.

**Remedy**:

1. Inventory the landed work (`git status`, `git diff`) — do NOT skip this; partial changes are sitting in the tree unexamined
2. **Finish the remainder directly yourself**, or re-delegate ONLY the remaining slice as a fresh worker with a smaller prompt that names the exact files still to change
3. Close the bead once the tail is done, then run verification (Step 6) on the completed whole
4. **Never retry the whole task**: same task + same context = same budget, truncating at the same point

(The reason truncation is even detectable is the worker contract making `bd close` the final action — a truncated worker surfaces as `in_progress` with partial work instead of looking finished. Keep that contract.)

### Case B: Genuine failure (crash or blocker)

**Signature**: little or nothing landed, and/or the worker explicitly reported errors or blockers it could not resolve.

Present:

```
⚠️ Worker Did Not Complete Task

Task ${taskId} status: in_progress (should be closed)
Worker reported: ${workerError}
Landed changes: ${gitStatusSummary}

**Options**:
1. Retry worker with additional context
2. Mark task as blocked, investigate
3. Manual intervention required

How should I proceed?
```

## Plan-Defect Deviation Protocol (Step 6)

For verification FAILs where the task cannot succeed AS SPECIFIED — the design assumption doesn't survive contact with the code. Retrying burns fix workers on a task that is wrong by construction; deviate instead.

**Signals it's a plan defect, not an implementation defect**:

- The verifier cites a requirement the codebase cannot satisfy (missing interface, contradicted constraint, false precondition)
- The worker followed the spec exactly and tests still fail on the specified behavior
- The fix would change design.md, not code

**Protocol**:

1. **File the defect**:

   ```bash
   bd create --title="Design revision: [assumption that failed]" \
     --description="Task [task-id] cannot succeed as specified: [verifier evidence]. Affected design section: [design.md reference]" \
     --type=task --priority=1
   ```

2. **Block dependents**: `bd dep add [dependent-task-id] [revision-issue-id]` for every not-yet-run task that builds on the failed assumption

3. **Halt the phase**: stop spawning workers; present a checkpoint to the user with the failed task, the verifier evidence, and the revision issue ID

4. **Route the fix**: the revision goes through `/wb:create_design` (preceded by `/wb:explore_design` if it reopens an architectural choice) — never through fix workers
