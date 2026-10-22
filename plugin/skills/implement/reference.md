# implement — Reference

Specs and playbooks consulted at specific steps. Read the relevant section in full when its step directs you here.

## Context Package Structure (Step 3)

Build exactly this structure from the documentation you've read. It holds what the agents cannot read for themselves: your choices from the plan and the state of this session. Task text and criteria are not in it, because each agent reads its task with `bd show <id> --json` and the cited criteria from the plan directory, so a prompt does not paste them.

```javascript
const contextPackage = {
  // The project directory the skill was given; agents read design.md, tasks.md,
  // and research.md there
  planDir: "docs/plans/<date>-<project>/",

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

  // From design.md - the constraints that bear on this phase's tasks
  design: {
    constraints: ["constraint 1", "constraint 2"]
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

  // Per task, built when the task is about to run: the commits this session
  // made, which no plan document records, and the conventions for the red run.
  taskTestContext: {
    // The commit the task begins from (git rev-parse HEAD, recorded before any
    // outer test or worker work); the verifier diffs against it
    startingCommit: "<sha>",

    // One entry per acceptance criterion the task cites (the task's "Serves" line).
    // The criterion's text, examples, observed-at, and seam stay in design.md,
    // where each agent reads them
    criteria: [
      {
        id: "AC-n",
        title: "criterion title (for the red commit message)",
        testFile: "the test file named in its outer test step in tasks.md",
        redCommit: "<sha of the latest red(AC-n) commit for its outer test; a sanctioned rewrite's replaces the original>"
      }
    ],

    // From the conventions source above, per boundary a criterion is observed at;
    // you use them for the red run, and the agents read the same source themselves
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
3. Close the bead once the tail is done, post a `worker report:` comment covering the landed work and the remainder, then run verification (Step 6) on the completed whole
4. **Never retry the whole task**: same task + same context = same budget, truncating at the same point

(The reason truncation is even detectable is the worker contract making `bd close` the final action — a truncated worker surfaces as `in_progress` with partial work instead of looking finished. Keep that contract.)

### Case B: Genuine failure (crash or blocker)

**Signature**: little or nothing landed, and/or the worker explicitly reported errors or blockers it could not resolve. A Blockers line that begins `no route:` goes to the "Rule-Gap Halt" below instead, because the worker stopped at a wb rule, not at a fault in its work.

Present, writing each line as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says, with the four parts of its "Decision and halt messages" section: quality question, judgment or friction, options with their trade-offs, and a recommendation with a paste-ready reply. This applies to every halt message in this file and to the handoff question. The options each template lists are the usual ones: offer only those that are real choices for this halt, and name the actual ones when they differ. Each paste-ready reply is a form that halt's reply handling accepts, because a reply the handling does not recognize stalls the phase a second time; a reply that takes an option named in place of the usual ones is handled as the Failed Re-verification Halt's reply handling says for such an option. The `halted:` comments recorded in beads keep their fixed form.

```
⚠️ Worker Did Not Complete Task

Task: ${what the task builds, in plain words} (${taskId}); still in_progress
Worker reported: ${workerError, in plain words: what it could not do and why}
Landed changes: ${gitStatusSummary}

Quality question: ${the behavior this task delivers, and what stays at risk while it is unfinished}
Judgment or friction: ${whether a real trade-off needs you, or the process got stuck; if stuck, what the plugin should have done}

**Options** (each: what it means here, what it buys for testing or quality, its cost and risk, how hard it is to undo):
1. Retry worker with additional context: ${the context it would get}
2. Mark task as blocked, investigate
3. Manual intervention required: you make the change, then say "continue"

Recommendation: ${option and the reason}. How should I proceed?
Paste-ready reply: ${the exact reply that takes the recommended option: "retry: <context>", "investigate", "continue", or the words of an option named above}
```

**On the reply**:

- **Retry** (`retry: <context>`): discard what the worker landed as the Failed Re-verification Halt's Discard and retry does, posting the `discarded:` comment, so the retried worker and its verifier see only this attempt. Then spawn the worker again from the Worker Prompt Template with the context as one added line, and the same `taskTestContext`.
- **Investigate**: start no further task, leave the task `in_progress` with its changes in the working tree, and report what you find; Resume treats it as unfinished work.
- **Continue** after manual intervention: post a `worker report:` comment naming the files the user changed, so the verifier and a later session have a report for the work, close the task's issue, and run verification (Step 6) on the working tree.

## Plan-Defect Deviation Protocol (Step 6)

For verification FAILs where the task cannot succeed as specified — the design assumption doesn't survive contact with the code. Retrying burns fix workers on a task that is wrong by construction; deviate instead.

**Signals it's a plan defect, not an implementation defect**:

- The verifier cites a requirement the codebase cannot satisfy (missing interface, contradicted constraint, false precondition)
- The worker followed the spec exactly and tests still fail on the specified behavior
- The fix would change design.md, not code

**Not a plan defect**: the design is sound and a wb rule left the task no route for a change it needs, such as setup added to existing test files on a task planned without a `Setup files:` line. Use the "Rule-Gap Halt" below, not this protocol: a design revision would change nothing in a design that is right, and the person would be asked to revise a plan that needs no revision.

**Protocol**:

1. **File the defect**:

   ```bash
   bd create --title="Design revision: [assumption that failed]" \
     --description="Task [task-id] cannot succeed as specified: [verifier evidence]. Affected design section: [design.md reference]" \
     --type=task --priority=1
   ```

2. **Block dependents**: `bd dep add [dependent-task-id] [revision-issue-id]` for every not-yet-run task that builds on the failed assumption

3. **Halt the phase**: stop spawning workers; record `halted: plan defect` on the failed task ("Evidence in Beads"); present:

   ```
   ⚠️ Plan Defect: Phase Halted

   Task: ${what the task builds, in plain words} (${taskId})
   Assumption that failed: ${the design assumption, in plain words} (${design.md section}); evidence: ${what the verifier found}
   Now blocked: ${each later task, in plain words}; revision issue (${revisionIssueId})

   Quality question: ${the product behavior the plan promised that the code cannot deliver as specified}
   Judgment or friction: ${a real design trade-off for you, or a gap the plan should have caught; if a gap, what the plugin should have checked earlier}

   **Options** (each: what it means here, what it buys for testing or quality, its cost and risk, how hard it is to undo):
   1. Revise the design through /wb:create_design, then resume the phase
   2. ${an alternative that is a real choice here, such as narrowing the criterion, or none}

   Recommendation: ${option and the reason}. How should I proceed?
   Paste-ready reply: ${the exact reply or command that takes the recommended option, such as /wb:create_design ${planDir}}
   ```

4. **Route the fix**: the revision goes through `/wb:create_design` (preceded by `/wb:explore_design` if it reopens an architectural choice) — never through fix workers. A reply that takes a named alternative instead does what its option's line said, as the Failed Re-verification Halt's reply handling says for such an option.

## Failed Re-verification Halt (Step 6)

When the re-verification after the one fix attempt fails, the failed task's changes are still uncommitted and its issue is closed (the worker closed it). Moving on would make every later verifier see another task's files and undeclared test changes, so each later task would fail, and the closed issue would unblock its dependents. The phase stops for a human instead.

**Halt actions**:

1. Start no further tasks, and commit nothing: the failed task's changes stay in the working tree for inspection.
2. Reopen the task's issue so its dependents stay blocked: `bd update [task-id] --status=open`.
3. Record `halted: re-verification failed` on the task ("Evidence in Beads"), so a fresh session can find it.
4. Present:

   ```
   ⚠️ Task Failed Re-verification: Phase Halted

   Task: ${what the task builds, in plain words} (${taskId}; issue reopened; changes left uncommitted)
   What fails: ${each failFinding in plain words, what it breaks, then file:line}
   Cause: ${causeLabel, explained in one plain sentence}
   Fix attempt changed: ${fixAttemptSummary}

   Quality question: ${the product behavior the failing check guards, and what could ship broken if the phase went on}
   Judgment or friction: ${a real trade-off for you, or the process got stuck (for example, the one fix attempt went on a fix that listed cases); if stuck, what the plugin should have done}

   **Options** (each: what it means here, what it buys for testing or quality, its cost and risk, how hard it is to undo):
   1. Fix it yourself and say "continue", or give guidance as "continue: <guidance>" and a fix worker applies it. I re-verify the working tree, commit on PASS, and resume the phase. ${the guidance that would make it pass, such as the verifier's checked class fix}
   2. Discard the task's uncommitted changes, back to its starting commit (${startingCommit}) plus its committed red(AC-n) tests, and retry the task.
   3. Treat it as a plan defect: I follow the Plan-Defect Deviation Protocol.

   Recommendation: ${option and the reason}. How should I proceed?
   Paste-ready reply: ${the exact reply that takes the recommended option, in one of the forms the reply handling accepts: "continue", "continue: <guidance>", "discard and retry", "plan defect", or the words of an option named above}
   ```

**On the reply**:

The worker and fix-worker reports live only in the task's comments once the session ends, so every reply below reads them from there ("Evidence in Beads"), never from memory.

- **Continue** (`continue`, or `continue: <guidance>`): when the reply carries guidance after `continue:`, such as the verifier's checked class fix, first run a fix worker from the "Fix Worker Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md), adding the guidance as one line: `Guidance from the user: <guidance>`. The user asked for this attempt, so the one automatic fix attempt in Step 6 does not limit it. Then re-verify the working tree with the "Verification Agent Prompt", using the same starting commit and red commits. The verifier reads the worker reports, the test-writer reports, and on a harness or setup task the `support files:` or `setup files:` records from the task's comments itself; with the comments missing, every inner-test change and every support or setup file reads as undeclared. On PASS, close the issue again unless the fix worker already did, commit the task, and resume at Step 5. On FAIL, reopen the issue as halt action 2 does if the fix worker closed it, and present the halt message again.
- **Discard and retry**: discard only the uncommitted changes: `git restore --staged --worktree :/` (the `:/` pathspec covers the whole repository even when the session runs from a subdirectory), then delete with `rm -f` the untracked files that `git status --short` lists and that the task's `created files:` comments name; ask before deleting an untracked file no comment names, since it may be the user's. Post the `discarded:` comment. Do not move HEAD (no `git reset` to the starting commit): HEAD is the starting commit plus the task's committed `red(AC-n)` tests, and those stay. Then run the task again from Step 5 item 7 with the same `taskTestContext`, so the verifier still diffs from the original starting commit.
- **Plan defect**: follow the protocol above; the reopened issue stays open.
- **An option the message named in place of the generic three**: do what that option's line said it would do, because that line is what the user agreed to. When the option drops the task's changes, discard them as Discard and retry does, asking before deleting an untracked file no comment names, and post the `discarded:` comment. Ask before committing a task whose last verification failed, naming the failing findings the commit would carry, because a commit makes the task look done to every later reader.

## Evidence in Beads (Steps 5, 6, 8, and Resume)

git and the verifier decide whether a test is red or green. Beads keeps the evidence behind that decision, because a fresh session, a resumed phase, and `/wb:validate_execution` cannot read what lived only in this session.

- **Red record**: after committing `red(AC-n)`, close the criterion's outer test step with that commit's short sha and the one assertion-failure line from your own re-run (the line naming the failed assertion, not the whole output):

  ```bash
  bd close [outer-step-id] --reason-file - <<'WB_REPORT_END'
  red <sha>: <assertion line>
  WB_REPORT_END
  ```

  The heredoc is quoted (`<<'WB_REPORT_END'`) so nothing in the text expands, and the delimiter is distinctive so a line of the text, even a bare `EOF`, cannot end it early. Run the whole heredoc in one Bash call, with every text line and the closing `WB_REPORT_END` starting at column 0: the indentation above belongs to this list, and an indented delimiter does not end the heredoc, so the rest of the command is silently posted as text. The agents' report posts below use the same form. A quoted `--reason "..."` would break on a double quote in the assertion line.

- **Agents post their own reports**: `wb:test-writer`, `task-worker`, and `task-verifier` each post their full report as a comment on the task, in the quoted-heredoc form with `-f /dev/stdin` that their definitions give, and return a short block naming that comment, so a report enters your context at most once. Do not post them again. Read a report from the comments only when you need its detail: for a fix worker, a halt, the Step 8 review, and Resume.
  - **Test-writer reports**: each `wb:test-writer` run posts its reports verbatim, outer and inner, given the task id in its prompt: one comment per criterion, so an outer spawn that covers several criteria still leaves one report for each.
  - **Worker reports**: the worker, and a fix worker, post theirs with `worker report:` as the first line.
  - **Verification reports**: the verifier posts its report with `verification report:` as the first line, the re-verification's included.
  - **Test integrity**: the verifier also posts its Test Integrity section, pass or fail, with `test integrity:` as the first line, so the Step 8 test review can read every verifier's section after the session ends. A later `discarded:` comment does not void these, because an integrity finding stays part of the phase's counts.
  - **Failed post**: an agent whose post failed returns the whole report and says what was not posted: a worker or `wb:test-writer` on its `Full report: not posted` line, a verifier on a first `Not posted:` line. Post what it names, in the same heredoc form: the report with the first line it carries, and for a verifier's `test integrity`, its Test Integrity section with `test integrity:` as the first line.
- **Created files**: the worker posts one comment beginning `created files:` that lists every file created during the task, its own and `wb:test-writer`'s.
- **Support files**: on a harness task, the worker posts a comment whose first line is `support files:`, followed by each support file it wrote, one repository-relative path per line, in the heredoc form above. A fix worker that writes more posts its own. The declared support files are every path in the task's `support files:` records, and they count as declared on harness tasks only.
- **Setup files**: on a setup task whose description carries a `Setup files:` line, the worker posts a comment whose first line is `setup files:`, followed by each test file whose setup it edited, in the same form. They count as declared only on such a task, and only the files its line names.
- **Halt kind**: when a phase halts on a task, record why, so Resume can find the task and tell the halts apart:

  ```bash
  bd comments add [task-id] "halted: re-verification failed"   # or "halted: plan defect", "halted: missing context", "halted: rule gap"
  ```

- **Discarded attempt**: when a halted task's uncommitted changes are discarded, post `discarded: earlier inner reports, worker reports, created files, support files, and setup files no longer apply`. Readers skip the inner reports, worker reports, created-file lists, support-file lists, and setup-file lists posted before it; the outer reports still apply, because the red commits stay.
- **Reading**: `bd comments [task-id] --json`, taking each comment's `text` field. The plain `bd comments` and `bd show` render the text as markdown and drop backticks and `<...>` spans, which loses parts of a report. A comment that begins with `worker report:`, `verification report:`, `test integrity:`, `created files:`, `support files:`, `setup files:`, `halted:`, or `discarded:` is that record, not a test-writer report. A test-writer report is a comment with a Mode field: the outer reports first, then the inner reports in the order posted, skipping the inner reports, worker reports, `created files:` lists, `support files:` lists, and `setup files:` lists posted before the latest `discarded:` comment.
- **Review findings that outlive the checkpoint**: after the majority settling in Step 8, file each escalated integrity finding and each finding a majority promoted as an issue linked to the task whose commit last changed the test (`git log -1 -- <test file>`), or to the phase milestone when no task did. The `discovered-from` link records where it came from without blocking anything:

  ```bash
  bd create "Test review: <verdict> <file:line>" --type=task --priority=2 \
    --deps discovered-from:[task-id] -d "<rubric item, quoted excerpt, evidence type, and n of 3 or escalated>"
  ```

## Sanctioned Outer-Test Rewrite (Step 8)

A phase test review can find an outer test too weak and propose a Rewrite. The outer test is the approved statement of its criterion, so it changes only when the person sanctions that Rewrite at the checkpoint, in a reply that names it (its file:line or its review issue); a general go-ahead sanctions nothing.

- **Filing**: only you file it, and only after that reply, because the description line below is what lets a test change. Use the `discovered-from` form in "Evidence in Beads", linked to the review finding's issue, or, for a Blocking item, which is not filed as an issue, to the task whose commit last changed the test (`git log -1 -- <test file>`), titled `Rewrite outer test <file> (AC-n)`, with a description that cites the criterion on its Serves line and carries `Sanctioned rewrite: AC-n <outer test file> from red <sha>, approved at the phase <N> checkpoint`, followed by the review's proof and Suggested fix. No worker or agent writes that line, and `wb:test-writer` and the verifier treat a rewrite as sanctioned only when the task description carries it.
- **Running**: run the task through Steps 5 and 6 before closing the phase milestone, filling the Worker Prompt Template's `task.sanctionedRewrite` (test file and red commit) from that line. Step 5 item 6 writes nothing for it, since the criterion already has its red commit.
- **Committing**: on PASS, commit the rewritten test on its own as `red(AC-n): <criterion title> (rewrite sanctioned at the phase <N> checkpoint)`, with the rewrite task's beads id on a second message line, in the commit form of Step 5 item 6, and any other changed files as the task commit. From then on that commit is the criterion's baseline: every reader that finds a criterion's red commit by title (Step 5's `taskTestContext`, the verifiers' `--red` lists, the phase test review, Resume, `/wb:validate_execution`) takes the latest `red(AC-n)` commit for it, so the next verifier does not report the rewrite as a changed outer test. A starting commit derived from red commits takes the earliest instead (Resume), which the later rewrite commit leaves unchanged.

The brief carries a differential requirement, because a rewrite that drops a case the original caught loses coverage nobody agreed to lose, and a verifier that finds the loss one case at a time leaves the single fix attempt unable to succeed:

- **Who plants the defects**: the worker asks `wb:test-writer` for the rewrite in inner mode, since workers do not edit tests, and `wb:test-writer` plants them. It plants one defect for each case the red-commit version catches, as the test-quality skill's Part 3 defines them (every branch, pattern alternative, call form, input shape, and table row of its predicate or assertion), and one for the gap the review found, and runs both versions against each in a disposable copy.
- **The bar**: the rewrite fails on every one of those defects. The red-commit version is expected to pass on the gap's defect, since that miss is why the rewrite exists.
- **The record**: `wb:test-writer` lists each planted defect, with the result for both versions, in its report, and the verifier checks that differential against its own (task-verifier Step 6).
- **The suggested fix**: pass the review's Suggested fix on as a starting point, not as the specification. Where following it would stop catching something the red-commit version catches, the rewrite keeps the original's case and adds the gap, as the test-quality skill's Part 3 rule for suggested fixes says.

## Lost-coverage Fix Check (Step 6)

When a verifier fails a sanctioned rewrite for lost coverage (its Failing findings or Suggested fix line names lost coverage), read its Suggested fix before spawning the fix worker, because that fix is what the one attempt is spent on. Ask one question of it: does it restore the original's reach by construction, or by listing cases?

- **By construction**: the fix covers the whole class with one rule, such as scanning the part of the source the rewrite skipped, with a pattern strict enough not to fail on correct code. Spawn the fix worker as Step 6 says.
- **By listing cases**: the fix names instances from an open-ended set, such as "skip X unless it is read back through A, B, or C". The re-verification will find a member the list left out, and there is no second attempt. Spawn `wb:task-verifier` again with the "Verification Agent Prompt" and one added line: `Your last report's suggested fix lists cases; return a class fix that removes the need for the list, checked against the planted defects as your Step 6 says. This is a re-check of an unchanged working tree: begin your test integrity: comment by saying so.` That note lets Step 8 count the re-check's integrity findings once, not twice. This re-spawn does not count as the fix attempt, because nothing in the working tree changed. Then spawn the fix worker on the new report. Ask once: if the second fix still lists cases, spawn the fix worker on it, since the Fix Worker Prompt already tells it to fix the whole class.
- **A different verdict or Cause from the re-spawn**: the tree is unchanged, so a PASS means the first FAIL was wrong: commit as on PASS, and note the disagreement between the two reports in a comment on the task. A different Cause follows that Cause's branch in Step 6.

The rule the check applies is the test-quality skill's Part 3 rule for suggested fixes (a class fix, not an enumeration), which the verifier also applies to its own suggestion before returning it.

## Missing Context Check (Steps 5 and 6, and Resume)

An agent that cannot find its task or a criterion it was told to read stops rather than guessing, and says what it could not find: the verifier returns FAIL with `Cause: missing context (<what>)`, a worker puts a `missing context:` line under Blockers and leaves the task `in_progress`, and `wb:test-writer` returns a block `blocked (criterion not found: <id>, looked in <where>)`. The gap may be in your own prompt rather than in the plan, so check your inputs before anything else. The Plan-Defect Deviation Protocol would file a design revision against a plan that may be fine, and a fix worker cannot repair a wrong id.

1. **Check what you passed**: the task id resolves with `bd show <task-id> --json`; the plan directory is the project directory this skill was given and holds design.md and tasks.md; each criterion id you named is on the task description's Serves line and in the phase's Outer Test Steps in tasks.md.
2. **Your input was wrong**: correct it and spawn the same agent again from the same prompt template. Nothing the agent did was wrong, so this is not the fix attempt in Step 6 and not a retry of the worker.
3. **Your input was right and the plan lacks it** (the task does not resolve, or a criterion the task cites is in neither design.md nor tasks.md): halt the phase for a human. Start no further task and commit nothing. If the worker closed the task, reopen it so its dependents stay blocked (`bd update [task-id] --status=open`). Record `halted: missing context` on the task when it exists ("Evidence in Beads"), and present:

   ```
   ⚠️ Missing Plan Context: Phase Halted

   Task: ${what the task builds, in plain words} (${taskId})
   Missing: ${what could not be found, in plain words, and what the agent needed it for} (${id}; looked in ${where})
   My inputs checked: task id, plan directory ${planDir}, criterion ids against tasks.md
   Landed changes: ${gitStatusSummary}

   Quality question: ${the behavior the missing criterion or task would have specified, and what goes unchecked without it}
   Judgment or friction: ${a real gap in the plan that needs your decision, or a lookup that got stuck; if stuck, what the plugin should have done}

   **Options** (each: what it means here, what it buys for testing or quality, its cost and risk, how hard it is to undo):
   1. Add or correct it in the plan or beads, then say "continue". I run the agent that stopped again.
   2. Treat it as a plan defect: I follow the Plan-Defect Deviation Protocol.

   Recommendation: ${option and the reason}. How should I proceed?
   Paste-ready reply: ${the exact reply that takes the recommended option: "continue", "plan defect", or the words of an option named above}
   ```

   On the reply: `continue` runs this check again from item 1 and then spawns the agent that stopped from the same prompt template; `plan defect` follows the Plan-Defect Deviation Protocol; an option named in place of these does what its line said, as the Failed Re-verification Halt's reply handling says for such an option.

## Rule-Gap Halt (Steps 5 and 6, and Resume)

A task can need a change the design allows and no wb rule gives a route for. The usual case is setup added to existing test files (fixtures, factories, `let`/`let!` lines, `before` blocks, test data) on a task planned without a `Setup files:` line: the worker reports `no route: <file>, <the change it needs>` under Blockers instead of making the edit, or a verifier fails an edit the worker made anyway, and every failing finding is an undeclared test change whose hunks add setup and change no example, test function, or assertion. This is neither a plan defect nor an implementation defect: the design is sound, so a design revision would change nothing, and a fix worker cannot make an undeclared edit declared, so the one fix attempt would be spent for nothing.

1. Start no further task and commit nothing. If the task is closed, reopen it as the Failed Re-verification Halt's action 2 does, so its dependents stay blocked.
2. Record `halted: rule gap` on the task ("Evidence in Beads").
3. Present:

   ```
   ⚠️ Phase halted: wb has no route for a change this task needs (${taskId})

   Task: ${what the task builds, in plain words} (${taskId}; ${still in_progress, or issue reopened}; changes left uncommitted)
   Change needed: ${the change and its files, in plain words, such as: add the product records that existing order tests need to stay valid under the new filter, in two spec files}
   Why wb stopped: ${the rule in plain words, such as: the worker that writes the code does not edit test files, so that nobody shapes the check on their own code; a planned route lets it add setup, which holds no check, but this task was planned without one}

   Quality question: ${when the change adds setup only and changes no example or assertion: "No product behavior is at risk: the design is sound, and this is about how the test change gets recorded and checked." Otherwise, the behavior the changed check guards}
   Judgment or friction: friction: a wb rule left this change no route, so the decision is about unblocking. The plugin should have ${what, such as: given the task a Setup files: line when it was planned}; worth reporting as a wb gap.

   **Options** (each: what it means here, what it buys for testing or quality, its cost and risk, how hard it is to undo):
   1. Declare the setup route and rerun the task: I add a `Setup files:` line to the task naming ${files} and ${the setup}, discard this attempt, and run the task again. The worker edits only that setup, and the verifier checks that every changed line is setup and that the affected tests pass before and after. Cost: one more worker and verification. Undo: remove the line.
   2. ${when the change touches an example or assertion: rerun the task with the change routed through the test-writer, which writes and shows red for every test case}
   3. Treat it as a plan defect: only if the design itself has to change; I follow the Plan-Defect Deviation Protocol.

   Recommendation: ${option and the reason}. How should I proceed?
   Paste-ready reply: ${the exact reply that takes the recommended option: "declare setup files", "retry: <context>", "plan defect", or the words of an option named above}
   ```

**On the reply**:

- **Declare setup files**: the reply is the person's approval, so you write the line; no worker or agent does, as with a `Sanctioned rewrite:` line. The line reads `Setup files: <path> (<setup to add>); <path> (<setup to add>); no example or assertion changes`. Read the description from `bd show [task-id] --json` and write it back with the line appended, in one Bash call with every line at column 0:

  ```bash
  bd update [task-id] --body-file - <<'WB_REPORT_END'
  <the current description>
  Setup files: <path> (<setup to add>); no example or assertion changes
  WB_REPORT_END
  ```

  Then discard the attempt as the Failed Re-verification Halt's Discard and retry does, posting the `discarded:` comment, and run the task again from Step 5 item 7 with the same `taskTestContext`.
- **Retry** (`retry: <context>`): as the Worker Failure Playbook's Retry does, with the context naming the test-writer route for the change.
- **Plan defect**: follow the Plan-Defect Deviation Protocol.
- **An option the message named in place of these**: as the Failed Re-verification Halt's reply handling says for such an option.

## Handoff Decision (Steps 5 and 8, and Resume)

A phase that has already compacted once and is heading for another compaction is a choice for the user, because the session is theirs and a handoff ends it. Stop at a task or phase boundary, not mid-task, and ask:

```
This phase has already compacted once and is heading for another. Done so far: ${tasks done, in plain words}; left: ${tasks left, in plain words}.

Quality question: a second compaction works from a summary of a summary, so the remaining tasks may be built against a drifted reading of the plan.
Judgment or friction: a real trade-off for you: the session is yours, and a handoff ends it.

**Options**:
1. Write a handoff for a fresh session: /wb:resume_handoff re-reads the plan documents in full, so the remaining tasks start from the plan, not a summary. Cost: this session ends and its working context is gone. Undo: none needed; the next session picks up from beads.
2. Keep going and compact: no restart, and I re-read the plan documents after the compaction. Risk: what I recall between tasks is paraphrase. Undo: you can still ask for a handoff at the next boundary.

I recommend ${choice}, because ${reason}.
Paste-ready reply: ${"write a handoff" or "keep going"}
```

Write the handoff with `/wb:create_handoff` only when the user says so: `resume_handoff` forces a fresh read of the plan documents, while a second compaction compounds summary drift, and the user weighs that against losing this session. If they choose to keep going, continue and re-read the plan documents after the compaction, as Resume Logic says.

At a phase boundary, when the phase already compacted, also suggest a fresh session for the next phase when you present the checkpoint report. The suggestion is advice, and the user's go-ahead decides.
