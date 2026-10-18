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

  // Test commands, taken from the conventions source the test-quality skill names
  // (research.md's Testing Conventions section; .claude/wb/testing.md when research
  // has none), not guessed from the language
  testCommands: {
    unit: "<unit command from the conventions>",
    specific: "<command that runs one file or test, from the conventions>",
    coverage: "<coverage command from the conventions, if it names one>"
  },

  // Per task, built when the task is about to run. Workers and the verifier
  // get tests and criteria from here, so each field says where it came from.
  taskTestContext: {
    // The commit the task begins from (git rev-parse HEAD, recorded before any
    // outer test or worker work); the verifier diffs against it
    startingCommit: "<sha>",

    // One entry per acceptance criterion the task cites (the task's "Serves" line),
    // from design.md and the phase's Outer Test Steps in tasks.md
    criteria: [
      {
        id: "AC-n",
        title: "criterion title",
        text: "the criterion's Given / When / Then lines, verbatim",
        example: "the criterion's Example lines, verbatim",
        observedAt: "the boundary where the criterion is observed",
        seam: "where the behavior can be exercised",
        redCommit: "<sha of the red(AC-n) commit for its outer test>"
      }
    ],

    // The outer-mode test-writer reports written for this task, verbatim (empty when
    // its outer tests came from an earlier task), also posted as comments on the task
    // ("Evidence in Beads"). The worker passes them on as the task's earlier reports
    outerTestReports: ["<report>"],

    // From the conventions source above, per boundary a criterion is observed at
    conventions: {
      "<boundary>": {
        command: "how to run tests at this boundary",
        skipMarkers: "the skip markers the project uses",
        harness: "the harness or fixture setup the boundary needs"
      }
    }
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

### Plans without acceptance criteria

A plan that predates 5.0.0 cites no criteria. Then `taskTestContext` holds only `startingCommit` and `conventions`, and no outer tests, outer reports, or red commits exist. The rule that workers never edit tests still applies, and the verifier still checks test integrity against the starting commit, because both protect the tests regardless of how the plan was written.

## Worker Model Selection (Step 5)

Model choice is coordinator judgment. The tier rule lives in one place, SKILL.md Step 5 item 4 ("Determine model"), and is passed as a per-spawn model override on the `task-worker` agent.

## Worker Failure Playbook (Step 6)

If a worker leaves its task in `in_progress` (didn't close the beads issue), the worker did not finish. Verification is NOT run when the worker didn't finish — that path is for verification FAILs after successful completion.

An unfinished worker is one of **two distinct events with opposite remedies** — diagnose before acting. Run `git status` and `git diff --stat` to inventory what the worker actually landed, and look at how its output ends.

### Case A: Truncation (budget exhaustion)

Subagents stop when they exhaust their tool-call budget (observed as a hard stop near ~70 calls — measured evidence from one session/model, not a guaranteed constant; treat the symptom, not the number).

**Signature**: files ARE changed but the bead is still open; the worker's output cuts off mid-sequence rather than reporting a blocker. The missing work is always the *tail* — the last test conversions, final verification runs, the `bd close`. The worker did nothing wrong; the task was too large for one delegation.

**Remedy**:

1. Inventory the landed work (`git status`, `git diff`) first, because partial changes are sitting in the tree unexamined. A committed `red(AC-n)` outer test is expected state, not worker damage: the coordinator commits it before the worker is spawned, so a red outer test after a truncated worker means the implementation is unfinished, not that something broke. Keep that commit and finish the work under it
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

For verification FAILs where the task cannot succeed as specified — the design assumption doesn't survive contact with the code. Retrying burns fix workers on a task that is wrong by construction; deviate instead.

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

3. **Halt the phase**: stop spawning workers; record `halted: plan defect` on the failed task ("Evidence in Beads"); present a checkpoint to the user with the failed task, the verifier evidence, and the revision issue ID

4. **Route the fix**: the revision goes through `/wb:create_design` (preceded by `/wb:explore_design` if it reopens an architectural choice) — never through fix workers

## Failed Re-verification Halt (Step 6)

When the re-verification after the one fix attempt fails, the failed task's changes are still uncommitted and its issue is closed (the worker closed it). Moving on would make every later verifier see another task's files and undeclared test changes, so each later task would fail, and the closed issue would unblock its dependents. The phase stops for a human instead.

**Halt actions**:

1. Start no further tasks, and commit nothing: the failed task's changes stay in the working tree for inspection.
2. Reopen the task's issue so its dependents stay blocked: `bd update [task-id] --status=open`.
3. Record `halted: re-verification failed` on the task ("Evidence in Beads"), so a fresh session can find it.
4. Present:

   ```
   ⚠️ Task Failed Re-verification: Phase Halted

   Task ${taskId}: ${title} (issue reopened; changes left uncommitted)
   Verifier report: ${failFindings with file:line}
   Cause: ${causeLabel}
   Fix attempt changed: ${fixAttemptSummary}

   **Options**:
   1. Fix it or give guidance, then say "continue". I re-verify the working tree, commit on PASS, and resume the phase.
   2. Discard the task's uncommitted changes, back to its starting commit (${startingCommit}) plus its committed red(AC-n) tests, and retry the task.
   3. Treat it as a plan defect: I follow the Plan-Defect Deviation Protocol.

   How should I proceed?
   ```

**On the reply**:

The worker and fix-worker reports live only in the task's comments once the session ends, so every reply below reads them from there ("Evidence in Beads"), never from memory.

- **Continue**: re-verify the working tree with the "Verification Agent Prompt", using the same starting commit and red commits, and the test-writer reports from the task's comments; without those reports every inner-test change reads as undeclared. On PASS, close the issue again, commit the task, and resume at Step 5. On FAIL, present the halt message again.
- **Discard and retry**: discard only the uncommitted changes: `git restore --staged --worktree :/` (the `:/` pathspec covers the whole repository even when the session runs from a subdirectory), then delete the untracked files that `git status --short` lists and that the task's `created files:` comments name; ask before deleting an untracked file no comment names, since it may be the user's. Post the `discarded:` comment. Do not move HEAD (no `git reset` to the starting commit): HEAD is the starting commit plus the task's committed `red(AC-n)` tests, and those stay. Then run the task again from Step 5 item 7 with the same `taskTestContext`, so the verifier still diffs from the original starting commit.
- **Plan defect**: follow the protocol above; the reopened issue stays open.

## Evidence in Beads (Steps 5, 6, 8, and Resume)

git and the verifier decide whether a test is red or green. Beads keeps the evidence behind that decision, because a fresh session, a resumed phase, and `/wb:validate_execution` cannot read what lived only in this session.

- **Red record**: after committing `red(AC-n)`, close the criterion's outer test step with that commit's short sha and the one assertion-failure line from your own re-run (the line naming the failed assertion, not the whole output):

  ```bash
  bd close [outer-step-id] --reason-file - <<'WB_REPORT_END'
  red <sha>: <assertion line>
  WB_REPORT_END
  ```

  The heredoc is quoted (`<<'WB_REPORT_END'`) so nothing in the text expands, and the delimiter is distinctive so a line of the text, even a bare `EOF`, cannot end it early. Run the whole heredoc in one Bash call, with every text line and the closing `WB_REPORT_END` starting at column 0: the indentation above belongs to this list, and an indented delimiter does not end the heredoc, so the rest of the command is silently posted as text. The report and test-integrity posts below use the same form. A quoted `--reason "..."` would break on a double quote in the assertion line.

- **Test-writer reports**: post each report verbatim as a comment on the task it served. You post the outer reports; the worker posts its inner reports. Reports run to many lines and quote backticks and angle brackets, so pipe the report in through the quoted heredoc with `-f /dev/stdin` (`-f -` does not work for comments); this writes no file, so nothing lands in the task's diff:

  ```bash
  bd comments add [task-id] -f /dev/stdin <<'WB_REPORT_END'
  <report text>
  WB_REPORT_END
  ```

- **Test integrity**: when a verifier report arrives, post its Test Integrity section the same way, with `test integrity:` as the first line, so the Step 8 test review can read every verifier's section after the session ends. Post the re-verification's section too; a later `discarded:` comment does not void these, because an integrity finding stays part of the phase's counts.
- **Created files**: the worker posts one comment beginning `created files:` that lists every file created during the task, its own and `wb:test-writer`'s.
- **Halt kind**: when a phase halts on a task, record why, so Resume can find the task and tell the two halts apart:

  ```bash
  bd comments add [task-id] "halted: re-verification failed"   # or "halted: plan defect"
  ```

- **Discarded attempt**: when a halted task's uncommitted changes are discarded, post `discarded: earlier inner reports and created files no longer apply`. Readers skip the inner reports and created-file lists posted before it; the outer reports still apply, because the red commits stay.
- **Reading**: `bd comments [task-id] --json`, taking each comment's `text` field. The plain `bd comments` and `bd show` render the text as markdown and drop backticks and `<...>` spans, which loses parts of a report. A comment that begins with `test integrity:`, `created files:`, `halted:`, or `discarded:` is that record. A test-writer report is a comment with a Mode field: the outer reports first, then the inner reports in the order posted, skipping the inner reports and `created files:` lists posted before the latest `discarded:` comment.
- **Review findings that outlive the checkpoint**: after the majority settling in Step 8, file each escalated integrity finding and each finding a majority promoted as an issue linked to the task whose commit last changed the test (`git log -1 -- <test file>`), or to the phase milestone when no task did. The `discovered-from` link records where it came from without blocking anything:

  ```bash
  bd create "Test review: <verdict> <file:line>" --type=task --priority=2 \
    --deps discovered-from:[task-id] -d "<rubric item, quoted excerpt, evidence type, and n of 3 or escalated>"
  ```
