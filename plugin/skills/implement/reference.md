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

5. **Changes the person's decision forces on outer tests**: when the revision, or any answer the person gives (a deviation, a variance, a plan-defect option), forces a committed outer test to change, the change needs their [Sanction](../../docs/reference/rules-and-intents.md#sanction). The usual case is a rename: the revision renames a symbol the outer test uses (a function, route, field, or message key), so the test has to change by that name only. Ask in that decision's own question, before it is answered, not in a later halt: one line per affected outer test under its options, naming the test, what it guards (its criterion and Guards against), whether that purpose still holds under the decision, the recommended re-baseline or retirement, and what stays caught, such as `Approving this also re-baselines AC-3's outer test tests/acceptance/test_totals.py by name only (calculate_total → order_total): it still guards order totals including tax, the purpose holds, and every planted defect the red commit catches stays caught; no assertion, example, or value changes.` A retirement is a criterion retired, so its line says so and the option routes through `/wb:create_design`. Choosing the option sanctions the re-baselines its lines name, and only those; one a recorded [design-forced renames](../../docs/reference/rules-and-intents.md#design-forced-renames) delegation covers is filed as "Delegations" below says. File each as a rewrite task, in the `discovered-from` form under "Evidence in Beads" linked to the revision issue, with the line `Sanctioned rewrite: AC-n <outer test file> from red <sha>, name-only re-baseline (<old> → <new>) approved in <revision-issue-id>`, record it on that task, and run it as "Sanctioned Outer-Test Rewrite" says: its differential is every planted defect the red-commit version catches, each still caught.

   ```bash
   bd comments add [task-id] "re-baseline: AC-n <outer test file>, name only (<old> → <new>), approved in revision <revision-issue-id>"
   ```

   When the approved question did not name a re-baseline and no recorded delegation covers it, there is no sanction for it: a verifier that later fails a task because an outer test changed for the rename is a changed outer test, and the phase halts. Ask the person to sanction each named re-baseline (criterion, file, old → new symbol) in the halt. The verifier's proof that only the name changed and every planted defect is still caught shows the change is safe; it does not authorize it. Anything beyond the rename is a changed outer test as before.

## Failed Re-verification Halt (Step 6)

A re-verification runs every integrity check but plants only for the FAIL's class: the defects behind the FAIL and the rest of their class, plus, always, every ledger line whose target or test blob the fix changed (task-verifier Step 6). It costs a fraction of the first verification; the suite run covers the rest, and the phase test review plants for the fix's other new tests at the checkpoint. A survivor outside the class comes back on the block's Follow-ups line, not as a FAIL. Never ask a verifier to skip the blob-changed lines to save time or churn: they are how a fix that weakened a test gets caught.

### Bounded auto-continue

Most re-verification FAILs on correct code are test gaps: the code does what the criterion says, and a test misses a case. Halting on those sends the person a decision with nothing to decide. So before halting, read the re-verification's returned block, and run one more fix worker instead of halting only when all four of these hold, each read from that block's own fields and never inferred from the findings:

1. `Production code: correct`: every failing finding is a test gap on code that does what the criterion's statement and examples say, and `Production evidence:` gives, for each failing finding, the criterion or example, the command run and its observed result, and the production file:line that shows the code satisfies it.
2. `Suggested fix:` is a class fix that the verifier says it checked against the planted defects, with the count, and `Class-fix evidence:` names the planted-defect labels it was checked against and the caught control of each pair.
3. `Outer tests: unchanged`: no outer test changed, a sanctioned rewrite included, and the fix touches none.
4. `Integrity findings:` shows 0 escalated.

Then read the posted full report (the re-verification's `verification report` record, with `wb-records read` as "Evidence in Beads" says) and check that the block's fields match it: the Production evidence against its failing findings and Criterion Check, the Class-fix evidence against its Defect ledger (its `defect ledger` record; each label present, run, and its control caught), the outer-test result against its Test Integrity section, and the integrity count. Any mismatch, a check the report lists as not run, a conclusion labelled judgment-only, a report that was not posted, or a record that does not read back usable (`ok` or `ok_with_newer_invalid`) halts, because a block is a summary and the auto-continue rests on the evidence behind it.

A task that changed no test file and no production code gets the same second attempt on conditions 3 and 4 alone, with its Suggested fix in place of the class fix.

**Cap**: three verifications of a changed working tree per task, which leaves room for one auto-continue: the first verification, the re-verification after the automatic fix, and the one after the auto-continue fix. Count the task's verification reports posted after its latest `discarded:` comment (one per `verification manifest:`, or per older single `verification report:` comment), counting reports with the same text once (a retried post is one verification, not two), leaving out a verification its `fingerprint:` record marks `void`, and leaving out a re-check of an unchanged tree (a Lost-coverage re-check, or a record-only re-check below; its `test integrity:` comment says so). A `continue` the person gives after a halt is their attempt, outside this cap and this check.

**Record-only re-check**: when a verification failed only because a record an agent wrote was missing from the comments (a report, or a `support files:` or `setup files:` record, that the agent returned unposted and you have since posted verbatim), and nothing in the working tree changed since, spawn the verifier again outside the cap and without spending the fix attempt, because no fix ran. Nothing changed means the tree fingerprint you take now (`<plugin scripts>/test-integrity --fingerprint`, with the same `--include-ignored` directories, as "Tree fingerprints" under "Evidence in Beads" says) equals the `after` value in the failing verification's `fingerprint:` record, and only coordinator records (comments you posted) differ. Any other change, a failing verification with no `fingerprint:` record or with `fingerprint: error`, or a fingerprint you cannot take now, means the lane does not apply and the re-verification counts. The record you posted must be the agent's own returned text, never one you wrote: a report written after the change is not the record of who made it. The prompt is the Verification Agent Prompt with one added line: `This is a record-only re-check of an unchanged working tree: begin your test integrity: comment by saying so.` In unattended mode the lane applies the same way; it decides nothing.

**Still halts**: any escalated integrity finding, any changed outer test, `Production code: defect`, a missing or unparseable field, evidence that does not match the posted report, the cap reached, or a Cause other than implementation defect. Those are the findings a person must see, and an extra fix worker on them would be the orchestrator settling a question about cheating or about the product.

**Recording and running it**: post the record first, so the extra attempt is auditable, then reopen the task as halt action 2 does (so a session that ends mid-attempt resumes it as unfinished work), spawn the fix worker from the "Fix Worker Prompt" on the latest report, and re-verify with the Re-verification line, as Step 6 does for the first fix:

```bash
bd comments add [task-id] "auto-continue: <the test gap, in a few words>; verification <n> of 3; report <comment id of the re-verification's verification report:>"
```

If that re-verification passes, commit as on PASS. If it fails, halt below; the halt message names both fix attempts.

### The halt

When the re-verification after the automatic fix attempt fails and the bounded auto-continue does not apply, or the auto-continue's re-verification fails, the failed task's changes are still uncommitted and its issue is closed (the worker closed it). Moving on would make every later verifier see another task's files and undeclared test changes, so each later task would fail, and the closed issue would unblock its dependents. The phase stops for a human instead.

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
   Fix attempts: ${each automatic attempt (the first fix, and the auto-continue when one ran, with its auto-continue: record) and what it changed}

   Quality question: ${the product behavior the failing check guards, and what could ship broken if the phase went on}
   Judgment or friction: ${a real trade-off for you, or the process got stuck (for example, the one fix attempt went on a fix that listed cases); if stuck, what the plugin should have done}

   **Options** (each: what it means here, what it buys for testing or quality, its cost and risk, how hard it is to undo):
   1. Fix it yourself and say "continue", or give guidance as "continue: <guidance>" and a fix worker applies it. I re-verify the working tree, commit on PASS, and resume the phase. ${the guidance that would make it pass, such as the verifier's class fix, saying whether its report checked it against the planted defects}
   2. Discard the task's uncommitted changes, back to its starting commit (${startingCommit}) plus its committed red(AC-n) tests, and retry the task.
   3. Treat it as a plan defect: I follow the Plan-Defect Deviation Protocol.
   ${on a sanctioned rewrite whose second lost-coverage round this is: 4. Write the limits down: the cases still lost (${each, in plain words}) go on the rewrite's Not claimed list, as a comment in the test and a `not claimed:` record on the task, and the rewrite stops claiming them. Cost: those cases go unguarded, on record. Undo: run the rewrite again without the list.}

   Recommendation: ${option and the reason; after the second lost-coverage round on a sanctioned rewrite, recommend option 4, because a third round of listing cases rarely converges, unless a case still lost is one the criterion's examples name}. How should I proceed?
   Paste-ready reply: ${the exact reply that takes the recommended option, in one of the forms the reply handling accepts: "continue", "continue: <guidance>", "discard and retry", "plan defect", "not claimed: <cases>", or the words of an option named above}
   ```

   A lost-coverage round is a verification of the rewrite that failed for lost coverage; the verifier's Rewrite differential line gives the count. Accepting lost coverage stays the person's decision, so option 4 is offered, never taken for them, unless the task's sanction line delegates a not-claimed budget (see "Sanctioned Outer-Test Rewrite"): then, checked before the halt actions, when the second round's cases still lost all fit within that budget, write them down as the "not claimed" reply below does, recording that the budget covered them, instead of halting.

**On the reply**:

The worker and fix-worker reports live only in the task's comments once the session ends, so every reply below reads them from there ("Evidence in Beads"), never from memory.

- **Continue** (`continue`, or `continue: <guidance>`): when the reply carries guidance after `continue:`, such as the verifier's class fix (which its report says it ran, as the fixed test's full text, against every planted defect, or says it could not), first run a fix worker from the "Fix Worker Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md), adding the guidance as one line: `Guidance from the user: <guidance>`. The user asked for this attempt, so the one automatic fix attempt in Step 6 does not limit it. Then re-verify the working tree with the "Verification Agent Prompt", using the same starting commit and red commits and the Re-verification line its Re-verify paragraph adds. The verifier reads the worker reports, the test-writer reports, and on a harness or setup task the `support files:` or `setup files:` records from the task's comments itself; with the comments missing, every inner-test change and every support or setup file reads as undeclared. On PASS, close the issue again unless the fix worker already did, commit the task, and resume at Step 5. On FAIL, reopen the issue as halt action 2 does if the fix worker closed it, and present the halt message again.
- **Discard and retry**: discard only the uncommitted changes: `git restore --staged --worktree :/` (the `:/` pathspec covers the whole repository even when the session runs from a subdirectory), then delete with `rm -f` the untracked files that `git status --short` lists and that the task's `created files:` comments name; ask before deleting an untracked file no comment names, since it may be the user's. Post the `discarded:` comment. Do not move HEAD (no `git reset` to the starting commit): HEAD is the starting commit plus the task's committed `red(AC-n)` tests, and those stay. Then run the task again from Step 5 item 7 with the same `taskTestContext`, so the verifier still diffs from the original starting commit.
- **Plan defect**: follow the protocol above; the reopened issue stays open.
- **Not claimed** (`not claimed: <cases>`, or the delegated budget above): only the cases the reply or the budget names. Post the record, reopen the task as halt action 2 does if it is closed, then run a fix worker as Continue does, with the guidance `Guidance from the user: add these cases to the rewritten test's Not claimed comment; change no assertion` (for the budget, `Guidance:` and the same text), and re-verify as Continue does; the verifier leaves the accepted cases out of the differential:

  ```bash
  bd comments add [task-id] "not claimed: AC-n <outer test file>: <each case>; accepted by the user's reply"   # or "; within the not-claimed budget in the sanction line"
  ```

- **An option the message named in place of the generic three**: do what that option's line said it would do, because that line is what the user agreed to. When the option drops the task's changes, discard them as Discard and retry does, asking before deleting an untracked file no comment names, and post the `discarded:` comment. Ask before committing a task whose last verification failed, naming the failing findings the commit would carry, because a commit makes the task look done to every later reader.

## Evidence in Beads (Steps 5, 6, 8, and Resume)

git and the verifier decide whether a test is red or green. Beads keeps the evidence behind that decision, because a fresh session, a resumed phase, and `/wb:validate_phase` cannot read what lived only in this session.

- **Red record**: after committing `red(AC-n)`, close the criterion's outer test step with that commit's short sha and the one assertion-failure line from your own re-run (the line naming the failed assertion, not the whole output):

  Write the reason, `red <sha>: <assertion line>`, with the Write tool to a new scratch file `<tmp>/wb-<outer-step-id>-coordinator-<nonce>.txt` (named as "Posting text to beads" in [non-interactive-shell.md](../../docs/reference/non-interactive-shell.md) says), then close the step from it and confirm `close_reason` with `bd show [outer-step-id] --json`:

  ```bash
  bd close [outer-step-id] --reason-file <tmp>/wb-<outer-step-id>-coordinator-<nonce>.txt
  ```

  The file keeps the assertion line exactly as printed: a quoted `--reason "..."` would break on a double quote in it, and a heredoc is refused in a worktree-isolated session.

- **When heredocs are refused**: a worktree-isolated session refuses every heredoc, Step 5's commit call included. Then write the text with the Write tool to a scratch file and pass its path, as "Posting text to beads" in [non-interactive-shell.md](../../docs/reference/non-interactive-shell.md) says (`<tmp>/wb-<id>-coordinator-<nonce>.txt`, a fresh file per post): `bd close <id> --reason-file <path>`, `git commit -F <path> -- <test file>`, `bd update <id> --body-file <path>`, `bd comments add <id> -f <path>`. Every multi-line record you post (a `checkpoint-auto:` or `deferred:` ledger, a `user reply:`, a report an agent returned unposted) takes the file form in any session, and you confirm it with `bd comments <id> --json` as that section says.
- **Agents post their own reports**: `wb:test-writer`, `task-worker`, and `task-verifier` each post their full report as a comment on the task, through a scratch file as their definitions give, confirm it took, and return a short block naming that comment, so a report enters your context at most once. Do not post them again. Read a report from the comments only when you need its detail: for a fix worker, a halt, the Step 8 review, and Resume.
  - **Test-writer reports**: each `wb:test-writer` run posts its reports verbatim, outer and inner, given the task id in its prompt: one comment per criterion, so an outer spawn that covers several criteria still leaves one report for each.
  - **Worker reports**: the worker, and a fix worker, post theirs with `worker report:` as the first line.
  - **Verification reports**: the verifier posts three records on the task, the re-verification's included: its Defect ledger (one line per planted defect: test, target, both blobs, kind and location, outcome, and whether that pair's control was caught), then its report, then its Test Integrity section, named `defect ledger`, `verification report`, and `test integrity`. Each is posted through the plugin's `wb-records` helper as numbered parts of at most 6 KB (`<record> (i/n):`) and a manifest, as task-verifier's "Posting and returning" says. Read a record with `<plugin scripts>/wb-records read <task-id> '<record>'` (`<plugin scripts>` being the directory SKILL.md gives), which takes the latest complete parts after the latest `discarded:`, checks them against the manifest, and prints `{"status": ..., "text": ...}`. Status `ok` is usable, and so is `ok_with_newer_invalid` (it fell back past a newer invalid or incomplete manifest), whose `newer_invalid` ids you name in the checkpoint report under Test integrity; any other status (`missing`, `mismatch`, `incomplete`) counts as missing. Records are text only: `wb-records post` refuses a NUL byte, and refuses text that begins like a manifest, since manifests go only through `wb-records manifest`. Wherever this skill says the `verification report:`, `defect ledger:`, or `test integrity:` comment, it means that record, read this way. The Step 8 test review reads the ledger to skip defects already checked on unchanged code, and a re-verification reads the earlier one to re-plant the FAIL's class and every line whose blob the fix changed.
  - **Test integrity**: the Step 8 test review reads every verifier's Test Integrity record after the session ends. A later `discarded:` comment does not void these, because an integrity finding stays part of the phase's counts.
  - **Failed post**: an agent whose post was refused or did not show in its read-back says what was not posted. A worker or `wb:test-writer` returns its whole report on a `Full report: not posted` line: post it in the file form above, verbatim. A verifier (task or phase) returns a first `Not posted:` line and, for each record it names, the exact parts, each with its header line: post those exact strings, each in order, with `<plugin scripts>/wb-records post <issue> --escaped '<the part>'` in the escaped single-line form non-interactive-shell.md gives (base64 only for bytes the escapes cannot express), then `<plugin scripts>/wb-records manifest <issue> '<record>' <the sha256 each post printed>...`, and read it back with `wb-records read`. Never compose, edit, reword, or summarise a verifier's record, and never post one it did not return: the manifest is how a reader tells the verifier's text from yours. A record that still does not read back usable is a failed post: say so to the person (or, in unattended mode, park the task) rather than retrying with other text.
  - **Tree fingerprints**: immediately before spawning each task verifier, and again as soon as it returns, run `<plugin scripts>/test-integrity --fingerprint` (`<plugin scripts>` is the plugin scripts directory SKILL.md gives, typed out literally), with one `--include-ignored <dir>` per directory in the effective list, and read the `fingerprint` field. The list is the profile's Defect sandbox `dependency dirs` and `build output dirs`; when the profile names none, take the runner's defaults, which `wb-plant-defect setup` prints as `dep_dirs` and `build_dirs`. Post both on the task, before acting on the verdict: `fingerprint: before <sha> after <sha>; verification manifest <comment id>`. Equal fingerprints mean the verifier judged the tree that is there now. A difference means something changed the tree while it ran, so that verification is void: write `void` at the end of the record, read nothing from that verification, and run it again; it does not count toward the cap. A second void verification on the same task halts it (in unattended mode, parks it), because a tree that keeps changing under its verifier is not one anyone can vouch for. A fingerprint the script cannot take (an error, such as a size cap exceeded) fails closed: record it as `fingerprint: error <message>`, take no record-only re-check that would need it, and in unattended mode stop the run, because without the fingerprint nobody can show the verifier saw the tree that is there. The cost is two full hashes of the working tree and the listed ignored directories per verification, which is why the list names only the directories a test run can read.
- **Created files**: the worker posts one comment beginning `created files:` that lists every file created during the task, its own and `wb:test-writer`'s.
- **Support files**: on a harness task, the worker posts a comment whose first line is `support files:`, followed by each support file it wrote, one repository-relative path per line, in the file form above. A fix worker that writes more posts its own. The declared support files are every path in the task's `support files:` records, and they count as declared on harness tasks only.
- **Setup files**: on a setup task whose description carries a `Setup files:` line, the worker posts a comment whose first line is `setup files:`, followed by each test file whose setup it edited, in the same form. They count as declared only on such a task, and only the files its line names.
- **Halt kind**: when a phase halts on a task, record why, so Resume can find the task and tell the halts apart:

  ```bash
  bd comments add [task-id] "halted: re-verification failed"   # or "halted: plan defect", "halted: missing context", "halted: rule gap"
  ```

- **Discarded attempt**: when a halted task's uncommitted changes are discarded, post `discarded: earlier inner reports, worker reports, created files, support files, and setup files no longer apply`. Readers skip the inner reports, worker reports, created-file lists, support-file lists, and setup-file lists posted before it; the outer reports still apply, because the red commits stay.
- **Coordinator records**: each step you take on your own authority, or on an approval the person gave earlier, leaves a record the person can audit, posted before acting: `auto-continue:` for the one extra fix attempt ("Bounded auto-continue"), `re-baseline:` for a name-only outer-test re-baseline the person approved, each one named, in a revision's question (Plan-Defect Deviation Protocol, step 5, and "Earlier Outer Tests the Design Renames"), `not claimed:` for cases a rewrite stops claiming, accepted by the person's reply or within a budget they delegated ("Failed Re-verification Halt"), `stub files:` for an empty stub the person approved ("Stub Files Route"), `fingerprint:` for the tree before and after each verification ("Tree fingerprints" above), `checkpoint-auto:` and `deferred:` on a phase milestone in unattended mode ("Unattended Mode"), `user reply:` for each reply to a decision, in the person's words ("Pending decisions" in [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md)), `judged:` for an aim you acted on within its purpose, and `delegation:` on the epic for a delegation the person granted by name, never one you grant yourself ([Acting within purpose](../../docs/reference/rules-and-intents.md#acting-within-purpose) and [Delegations](../../docs/reference/rules-and-intents.md#delegations)). An additive strengthening filed within a delegation is recorded in its task's description line ("Sanctioned Outer-Test Rewrite").
- **Reading**: `bd comments [task-id] --json`, taking each comment's `text` field. The plain `bd comments` and `bd show` render the text as markdown and drop backticks and `<...>` spans, which loses parts of a report. A comment that begins with `worker report:`, `verification report` (`verification report:` or a numbered part), `defect ledger` (`defect ledger:`, a numbered part, or its manifest), `test integrity` (`test integrity:` or a numbered part, its manifest included), `verification manifest:`, `created files:`, `support files:`, `setup files:`, `stub files:`, `fingerprint:`, `halted:`, `discarded:`, `auto-continue:`, `re-baseline:`, `not claimed:`, `checkpoint-auto:`, `deferred:`, `user reply:`, `judged:`, or `delegation:` is that record, not a test-writer report. A test-writer report is a comment with a Mode field: the outer reports first, then the inner reports in the order posted, skipping the inner reports, worker reports, `created files:` lists, `support files:` lists, and `setup files:` lists posted before the latest `discarded:` comment.
- **Review findings that outlive the checkpoint**: after the majority settling in Step 8, file each escalated integrity finding and each finding a majority promoted as an issue linked to the task whose commit last changed the test (`git log -1 -- <test file>`), or to the phase milestone when no task did. The `discovered-from` link records where it came from without blocking anything:

  ```bash
  bd create "Test review: <verdict> <file:line>" --type=task --priority=2 \
    --deps discovered-from:[task-id] -d "<rubric item, quoted excerpt, evidence type, and n of 3 or escalated>"
  ```

  Every issue you file in this `discovered-from` form (follow-ups, review findings, rewrite tasks, `fix:` tasks) then gets two checks. Confirm the link took: `bd dep list <new-id> --json` lists a dependency of type `discovered-from` on [task-id]; when it does not, add it with `bd dep add <new-id> [task-id] --type discovered-from`, because an unlinked issue loses where it came from and a sanctioned rewrite without the link reads as unsanctioned to the verifier. And add no blocks link beside it (no plain `bd dep add` between the two): a blocks link makes a finding hold up the task or milestone it was only found in, and `bd ready` then hides work that is free to run.

## Sanctioned Outer-Test Rewrite (Step 8)

A phase test review can find an outer test too weak and propose a Rewrite. An outer test changes only by [Sanction](../../docs/reference/rules-and-intents.md#sanction) (a Rewrite that keeps the purpose and replaces only the mechanism is put as "same purpose, better check", as [Purpose and mechanism](../../docs/reference/rules-and-intents.md#purpose-and-mechanism) says): here, when the person sanctions that Rewrite at the checkpoint, in a reply that names it (its file:line, its review issue, or its number in the report); a general go-ahead sanctions nothing. "Implement", "go", "continue", "looks good", or a reply that names other items does not name a rewrite, however the phase was going.

**Additive strengthening**: a review finding with the verdict `Rewrite (additive)` (an outer test that survives a defect a test this plan added already catches) is a rewrite proposal like any other: it goes under Needs your decision as R<n>, and runs only when the person sanctions it by name, because the inner test's catch shows the criterion is protected and never authorizes changing the outer test ([Sanction](../../docs/reference/rules-and-intents.md#sanction)). Only when the epic carries a `delegation:` record for `additive outer-test strengthening` may you file it without asking, with the line and the three proofs that [Additive strengthening](../../docs/reference/rules-and-intents.md#additive-strengthening) gives; commit it only when the task verifier's report shows all three, and otherwise take it to the person by name. List a delegated one under Test integrity, "Outer-test rewrites run", marked "additive, within your delegation", and under "Decisions I made for you".

**A not-claimed budget the person delegates**: when sanctioning a rewrite by name, the person may add a budget for what it need not keep, such as `sanction R1, not-claimed budget: 3 cases on shapes absent from the repository`. Append it to that task's line (`...; not-claimed budget: <what the person said>`), because the budget holds for that one rewrite only and is the record of what they delegated. It lets you write lost cases down at the halt, within its limit, as the Failed Re-verification Halt says; past the limit, the person decides.

- **Filing**: only you file it, and only after that reply (or, for an additive strengthening within a recorded delegation, after the review), because the description line below is what lets a test change. Use the `discovered-from` form in "Evidence in Beads", linked to the review finding's issue, or, for a Blocking item, which is not filed as an issue, to the task whose commit last changed the test (`git log -1 -- <test file>`), titled `Rewrite outer test <file> (AC-n)`, with a description that cites the criterion on its Serves line and carries `Sanctioned rewrite: AC-n <outer test file> from red <sha>, approved at the phase <N> checkpoint`, followed by the review's proof and Suggested fix. No worker or agent writes that line, and `wb:test-writer` and the verifier treat a rewrite as sanctioned only when the task description carries it.
- **Running**: run the task through Steps 5 and 6 before closing the phase milestone, filling the Worker Prompt Template's `task.sanctionedRewrite` (test file and red commit) from that line. Step 5 item 6 writes nothing for it, since the criterion already has its red commit.
- **Committing**: on PASS, commit the rewritten test on its own as `red(AC-n): <criterion title> (rewrite sanctioned at the phase <N> checkpoint)` (a delegated additive one as `(additive strengthening at the phase <N> checkpoint, delegation <comment id>)`), with the rewrite task's beads id on a second message line, in the commit form of Step 5 item 6, and any other changed files as the task commit. From then on that commit is the criterion's baseline: every reader that finds a criterion's red commit by title (Step 5's `taskTestContext`, the verifiers' `--red` lists, the phase test review, Resume, `/wb:validate_phase`) takes the latest `red(AC-n)` commit for it, so the next verifier does not report the rewrite as a changed outer test. A starting commit derived from red commits takes the earliest instead (Resume), which the later rewrite commit leaves unchanged.

The brief carries a differential requirement, because a rewrite that drops a case the original caught loses coverage nobody agreed to lose, and a verifier that finds the loss one case at a time leaves the single fix attempt unable to succeed:

- **Who plants the defects**: the worker asks `wb:test-writer` for the rewrite in inner mode, since workers do not edit tests, and `wb:test-writer` plants them. It plants one defect for each case the red-commit version catches, as the test-quality skill's Part 3 defines them (every branch, pattern alternative, call form, input shape, and table row of its predicate or assertion, on the shapes the next bullet names), and one for the gap the review found, and runs both versions against each in a disposable copy.
- **What a case is**: an alternative on a shape present in the repository (one the code or data the test guards produces) or named in the criterion's examples. Every other alternative goes on a written Not claimed list, a comment in the rewritten test and a line in the test-writer report, which the checkpoint report shows. Each entry cites its evidence: the repository search that shows the shape is absent (the command and its empty result) and the criterion examples checked. The verifier repeats each search, and an entry with no evidence, or whose absence the search leaves uncertain, is a case in the differential, not a Not claimed entry. This keeps the differential finite: a pattern matches endless input shapes, and differentials over all of them did not converge. "Keeps everything the red-commit version catches" means every case in this sense; it never means more.
- **The bar**: the rewrite fails on every one of those defects. The red-commit version is expected to pass on the gap's defect, since that miss is why the rewrite exists. Moving a case, a shape present in the repository or the examples, onto the Not claimed list is accepting lost coverage, which only the person does, by a reply that names the cases or within a budget they delegated.
- **The record**: `wb:test-writer` lists each planted defect, with the result for both versions, in its report, and the verifier checks that differential against its own (task-verifier Step 6).
- **The suggested fix**: pass the review's Suggested fix on as a starting point, not as the specification. Where following it would stop catching something the red-commit version catches, the rewrite keeps the original's case and adds the gap, as the test-quality skill's Part 3 rule for suggested fixes says.

## Delegations (Steps 1, 6, and 8)

What a delegation is, who grants it, how it is recorded and withdrawn, and the limits of each are [Delegations](../../docs/reference/rules-and-intents.md#delegations); this section is only how you apply one. At Step 1 read the epic's latest `delegation:` record of each name (`bd comments [epic-id] --json`) and list the ones in force in the first report of the run.

- **Additive strengthening**: file a `Rewrite (additive)` finding as "Sanctioned Outer-Test Rewrite" says for one within a delegation, instead of listing it as R<n>.
- **Design-forced renames**: where a decision's question would otherwise ask for a name-only re-baseline (Plan-Defect Deviation Protocol step 5, and "Earlier Outer Tests the Design Renames"), file the rewrite task with the line ending `within delegation <delegation comment id>` and post the `re-baseline:` record citing it, instead of asking. An occurrence of the old name outside a code position is asked as before.
- **Formatter reflows**: when a task verifier PASSes with an `outer test reflow, mechanical (<kind>), within delegation <comment id>` line in its Test Integrity section (implement_inline: when your own run of the integrity script shows the [safe reflow](../../docs/reference/rules-and-intents.md#safe-reflow) proof), commit that outer test file alone first, as `red(AC-n): <criterion title> (formatter reflow, delegation <comment id>)` with the task's beads id on a second line, in the commit form of Step 5 item 6, then the task's other files as the task commit. That commit is the criterion's new baseline, as a sanctioned rewrite's is.

List each step taken under a delegation under "Decisions I made for you".

## Lost-coverage Fix Check (Step 6)

When a verifier fails a sanctioned rewrite for lost coverage (its Failing findings or Suggested fix line names lost coverage), read its Suggested fix before spawning the fix worker, because that fix is what the one attempt is spent on. Ask one question of it: does it restore the original's reach by construction, or by listing cases? (A rewrite changes an outer test, so the bounded auto-continue never applies to it: after the second lost-coverage round the phase halts, and the halt recommends writing the limits down, as the Failed Re-verification Halt's option 4 says.)

- **By construction**: the fix covers the whole class with one rule, such as scanning the part of the source the rewrite skipped, with a pattern strict enough not to fail on correct code. Spawn the fix worker as Step 6 says.
- **By listing cases**: the fix names instances from an open-ended set, such as "skip X unless it is read back through A, B, or C". The re-verification will find a member the list left out, and there is no second attempt. Spawn `wb:task-verifier` again with the "Verification Agent Prompt" and one added line: `Your last report's suggested fix lists cases; return a class fix that removes the need for the list, checked against the planted defects as your Step 6 says, passing the fixed test's full text as --test-file <outer test file>=@esc:<escaped text> after a baseline with it. This is a re-check of an unchanged working tree: begin your test integrity: comment by saying so.` That note lets Step 8 count the re-check's integrity findings once, not twice. This re-spawn does not count as the fix attempt, because nothing in the working tree changed. Then spawn the fix worker on the new report. Ask once: if the second fix still lists cases, spawn the fix worker on it, since the Fix Worker Prompt already tells it to fix the whole class.
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

- **Declare setup files**: the reply is the person's approval, so you write the line; no worker or agent does, as with a `Sanctioned rewrite:` line. The line reads `Setup files: <path> (<setup to add>); <path> (<setup to add>); no example or assertion changes`. Read the description from `bd show [task-id] --json`, write it with the line appended (`<the current description>`, then `Setup files: <path> (<setup to add>); no example or assertion changes`) with the Write tool to a new scratch file `<tmp>/wb-<task-id>-coordinator-<nonce>.txt`, and write it back from that file, then confirm the description with `bd show [task-id] --json`:

  ```bash
  bd update [task-id] --body-file <tmp>/wb-<task-id>-coordinator-<nonce>.txt
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

## Phase Verification (Step 8, implement_inline Step 5, and validate_phase)

`wb:phase-verifier` checks the phase against its plan at every checkpoint: planned changes missing from the phase diff, changes no task covers, earlier phases' tests the phase changed again, and progress toward each README Intent statement. Without it these checks wait for a whole-plan validation that may never run, and later phases get built on a gap. It runs in parallel with the first `wb:test-reviewer` spawn, from the "Phase Verifier Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md).

**⛔ BARRIER: the phase verifier's completion notification and every test-review judgment (the first review and each majority-settling spawn) received before the checkpoint report — the report folds in all of them, and one written without any of them misses what that agent found. The majority settling waits only on the first test review, not on the phase verifier.**

**Values for the prompt**:

- **Phase starting commit**: the one Step 4 recorded (implement_inline: Step 2), or recovered as Resume says.
- **End**: HEAD, since every task is committed by the checkpoint; "working tree" only when `git status --short` shows phase changes still uncommitted.
- **Plan starting commit**: phase 1's starting commit. In phase 1 it is the phase starting commit; in a later phase or after Resume, recover it as Resume recovers a phase's starting commit, from phase 1's task ids in the tasks.md frontmatter: the parent of the earliest commit that names one of them or adds a phase 1 criterion's `red(AC-n)` whose title matches that criterion's title (criterion ids repeat across plans, so the id alone can match another plan's commit). When no commit qualifies, as in a plan whose commits name no task ids, pass `unknown`: the verifier then reports the earlier-phase test check as not run, without failing the phase. The verifier passes a known plan start to the integrity script's `--plan-start`, which lists the earlier phases' test files this phase changed again (`earlier_phase_tests`; "test-integrity" in the `README.md` of the plugin scripts directory SKILL.md gives).
- **Final phase**: yes when tasks.md has no later phase.
- **Tasks**: the phase's task ids from the tasks.md frontmatter (outer test steps included), plus each issue filed during the phase whose id a commit in the range names: split slices, sanctioned rewrites, and tasks a `fix:` answer filed. Without them, their changes read as unplanned.
- **Red commits**: the latest `red(AC-n)` commit of every criterion delivered so far, earlier phases included, since Intent progress counts them all.
- **Automated verification**: the commands from the checkpoint's automated verification, and whether each passed.

**Verdict**: the report's Status line, parsed as Step 6 item 4 parses a task verifier's: FAIL wins, and a report with both verdicts or neither is a FAIL.

**Its posted report**: the phase verifier posts its report on the milestone as the `phase verification` record, through `wb-records` (pass the milestone id in its prompt), and ends its returned report with the manifest's comment id. When it returns `Not posted: phase verification`, post only the exact parts it returns, verbatim, as "Failed post" under "Evidence in Beads" says for a verifier; never write or summarise its report yourself.

**A missing-context FAIL** (`Cause: missing context (<what>)`): the input you passed may be what is wrong, so check it first: the range and plan start against `git log`, and the task ids against the tasks.md frontmatter and `bd show <id> --json`. Correct what is wrong and spawn the verifier again. When your inputs were right and the plan lacks what the verifier named, put it under Needs your decision with the options of the "Missing Context Check" above (add or correct it, then say "continue"; or treat it as a plan defect), and keep the milestone open until it is answered. No task halted, so post no `halted:` comment.

**Folding it into the checkpoint report** (the checklist in Step 8 item 4, or implement_inline's "Manual Verification Request"), each item written as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says:

- **Needs your decision**: each unexplained deviation, numbered D1, D2, ... in report order so a reply can name it, in that file's decision form: the product behavior at risk; judgment or friction; the options; a recommendation with a paste-ready reply. The usual options, offered only when they are the real ones:
  1. Accept it: I record it and its reason in tasks.md's Implementation Notes (a missing change deferred also gets a follow-up issue, in the `discovered-from` form under "Evidence in Beads", linked to the phase milestone). Cost: the plan now differs from design.md where the deviation touches it. Reply: `accept: D1`.
  2. Make the phase match the plan before the milestone closes: the missing change runs as a task through Steps 5 and 6 (implement_inline: Step 3), filed in that same form; an unplanned change is reverted in its own commit. Cost: one more task, or lost work if the change was useful. Reply: `fix: D1`.
  3. Treat it as a plan defect, when the plan was wrong and the code is right: the "Plan-Defect Deviation Protocol" above. Reply: `plan defect: D1`.
- **What this phase delivered**: one "Intent progress" line per README Intent statement, in plain words, with its status (deferred, at risk, not started, awaiting the manual check, met, or met so far) and, for at risk, what puts it at risk.
- **Test integrity**: one "Earlier phases' tests changed" line, each test file with the task that declared it and the reason that task gave, or "none"; the quality judgment on those changes is the test review's, in its findings.
- **Follow-ups, product and plan**: each explained deviation, with the record that explains it; each statement at risk, saying whether it blocks the release; each check the verifier could not run, with its reason.

**Holding the go-ahead**: a FAIL holds it as the test review's blocking items do. The person's reply answers each unexplained deviation by its number with one of the options, and a reply that names a set (`accept: D1-D4`) answers each deviation in it the same way, as the pending-decisions ledger in [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says; a general go-ahead does not, because the next phase would build on a deviation nobody chose. Apply each answer before closing the milestone. A plan-doc edit is its own commit, made while no agent runs, as Step 6 says for coordinator-side edits.

**Final phase: the Intent verdicts**. On the plan's final phase, the checkpoint also closes the plan, so it gives every README Intent statement its verdict and writes it back to the README, as [intent-verdicts.md](../../docs/reference/intent-verdicts.md) says, with no extra agent: the phase verifiers already gathered the evidence. Map the final phase verifier's Intent Progress (met → PASS, deferred → DEFERRED, at risk, not started, or met so far → FAIL, awaiting the manual check → settled by the person's manual-check reply). Earlier phases' deviations were answered at their own checkpoints, so only the final phase's report counts here.

- **In the checkpoint report**: one "Intent verdict" line per statement under "What this phase delivered", in place of the Intent progress line; a FAIL on a statement the plan did not defer also goes under Needs your decision, because the release would ship short of what the plan set out to do.
- **Answering a FAIL verdict**: it needs an answer by name, with these options in the decision form above, offered only when they are the real ones. Once answered, it does not stop the milestone closing.
  1. Ship it short: the README records FAIL, and I file a follow-up issue in the `discovered-from` form under "Evidence in Beads", linked to the final milestone. Cost: the plan closes short of that statement. Reply: `accept fail: <statement>`.
  2. Close the gap first: I file the missing work as a task, run it through Steps 5 and 6 (implement_inline: Step 3), spawn the phase verifier again once it is committed, and take the verdict from its new report. Cost: one more task before the plan closes. Reply: `fix: <statement>`.
  3. Defer the statement: a design change, through the "Plan-Defect Deviation Protocol" above, so design.md lists it as deferred. Cost: a design revision. Reply: `plan defect: <statement>`.
- **After the reply**: write the README echo before closing the final milestone, once each manual check is answered and each deviation and verdict answer applied. When an answer adds work (a `fix:` answer, a sanctioned rewrite), spawn the phase verifier again after that work is committed and take the verdicts from its new report. The echo is a plan-doc edit, committed as one commit on its own.
- **In the Phase Completion Report**: the verdicts as written, and each statement still awaiting a manual check, with no suffix written for it.

## Earlier Outer Tests the Design Renames (Step 1, implement_inline Step 1, and create_tasks Step 4a)

An earlier plan's outer tests stay in the repository as `red(AC-n)` commits and keep guarding their criteria. When this plan's design renames or retires an identifier one of them uses (a function, class, route, field, message key, or file), that test fails on the renamed code, and nobody in the run may change it: a worker never edits an outer test, so the phase halts mid-task on a changed outer test, or the checkpoint blocks on a failing one. Find them before the phase and ask about each, together with the product-wording conflicts ("Pending decisions" in [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md)), not one at a time when a worker trips over it.

1. **Find them**, one plain command per call:
   - the renames and retirements design.md states (its decisions, Data Model, and Integration Points: an old name with its new one, or an old name removed);
   - the earlier outer tests: `git --no-pager log --format='%h %s' --grep='^red(AC-'`, keeping the commits that are not this plan's (made before this plan's first commit, or whose criterion title matches no criterion in this design.md), and each one's test file from `git --no-pager show --stat --format= <sha>`;
   - for each old identifier, `git grep -n -w '<old identifier>' -- <test path>` over the conventions' test paths, keeping the hits in those earlier outer test files.

   Leave out a hit that tasks.md already plans as a sanctioned re-baseline (create_tasks asked about it), and file, without asking, a hit that a recorded `design-forced renames` delegation covers, every occurrence in a code position ("Delegations" above).
2. **Ask about each hit**, in the decision form of [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md), naming the earlier criterion, the test file and line, and the old and new identifier. The usual options, offered when they are the real ones:
   1. Re-baseline it by name only: the test changes by that name and nothing else, run as a sanctioned rewrite whose differential is every planted defect the red-commit version catches, each still caught. Reply: `re-baseline: <test file> (<old> → <new>)`. When there is more than one name-only hit, also offer the delegation, which covers this and every later name-only re-baseline a rename design.md states, and nothing else: reply `delegate: design-forced renames` ("Delegations" above).
   2. Retire it with its criterion: the earlier plan's behavior no longer holds, which is a design change through `/wb:create_design`, and the deletion is the person's decision, never a worker's. Reply: `plan defect: <test file>`.
   3. Keep the old identifier working (an alias the design did not plan): also a design change. Reply: `plan defect: <test file>`.
3. **On a re-baseline reply**: only a reply that names the test file sanctions it, and only that one; a general go-ahead sanctions none. Record the reply (`user reply:`), file the rewrite task as step 5 of the "Plan-Defect Deviation Protocol" files one (the `discovered-from` form linked to the task that makes the rename, a description carrying `Sanctioned rewrite: AC-n <outer test file> from red <sha>, name-only re-baseline (<old> → <new>) approved in <the user reply: comment's issue>`, and a `re-baseline:` record on it), and post the same `re-baseline:` record on the renaming task before its worker runs. That task's verifier then treats the named earlier outer test's failure on the old identifier as expected, citing the record, rather than as a regression (task-verifier Step 2); every other failure counts as usual. Run the rewrite as "Sanctioned Outer-Test Rewrite" says, immediately after the renaming task is committed, before any other task. In unattended mode this question waits for the person: the renaming task and every task depending on it wait with it ("Unattended Mode").

create_tasks asks the same question at Step 4a, before any beads issue exists, and on a re-baseline reply plans the rewrite task in the phase that makes the rename, after the renaming task, with that `Sanctioned rewrite:` line in its description, records the reply as a `user reply:` on the epic once it exists, and files the task in the `discovered-from` form linked to the renaming task, blocking only its phase milestone like every phase task (the run posts the `re-baseline:` record on both tasks and takes the rewrite immediately after the renaming task, as item 3 says). The run then finds the task planned and does not ask again.

## Stub Files Route (Step 5, attended mode only)

An outer test for a criterion whose class or module does not exist yet cannot go red: the test file fails to load, which is "not red yet", and a red commit must prove an assertion fails. When `wb:test-writer` returns `blocked (not red yet: <name> does not exist; planned at <path>)` and a task in this phase plans to create that path, the person may approve an empty stub there, so the test loads and reaches its assertion.

- **Approval**: ask in the decision form, naming the criterion, the planned path, and the declaration the stub would hold (an empty class or module), with these options: approve the stub (reply `stub files: <path>`); plan a task that creates the class before the outer test (a plan change); or treat it as a plan defect. Only a reply that names the path approves it. You never grant it yourself, and it is never available in unattended mode: the stub is production code written by the party that wants the red, which is the shaping of both sides of a check that keeping tests and code apart exists to prevent, so the person has to see each one.
- **Writing it**: record the reply (`user reply:`). Confirm the path does not exist yet (the Read tool finds no file there, and `git ls-files -- <path>` prints nothing); if it exists, there is no stub to write, so tell the person. Write the stub with the Write tool holding only the declaration the test needs to load: no method, no return value, no behavior. Take its blob with `git hash-object --no-filters <path>`, then post the record on the task: `stub files: <path>; pre-state: absent; stub blob: <blob>; owner: <task-id>; declaration: <the declaration>; approved in <the user reply: comment's issue>`. Leave the stub uncommitted: the red commit's pathspec names only the test file, and the worker replaces it.
- **Red again**: spawn `wb:test-writer` again for the criterion. Its red must still be an assertion failure by its own rule; a missing-method error on the empty stub is not one, and a criterion that still is not red goes to Case B as before. Never grow the stub to get a red.
- **The worker and the verifier**: name the stub in the context package's `relevantFiles` as the file the task replaces. The verifier reads the `stub files:` record, treats the path as planned production code, and checks that the worker replaced the stub.
- **Cleanup**: whenever the stub would be removed or overwritten by anyone but the owner task's worker (a Discard and retry, the approval withdrawn, the criterion replanned), first compare `git hash-object --no-filters <path>` with the record's stub blob. Equal: the file is still the stub, so remove it (or, for a retry, leave it in place for the next attempt). Different: someone's work is in it, so refuse, change nothing, and ask the person, naming the path and both blobs.

## Unattended Mode (Steps 5 and 8, and implement_inline Steps 3 and 5)

Long runs often go on while nobody is watching. Without a defined mode, a coordinator left alone decides for itself what it may settle, and the coordinator wants the phase green, which makes it the one party that must not grant itself a decision that is the person's: whether a failing check is acceptable, whether a deviation stands, whether a test may change. This mode says what a run may do alone: record a checkpoint that has nothing to decide, leave everything else on record for the person's return, and keep going only with work nothing open reaches. It grants no decision that attended mode reserves for the person.

**Entering and leaving**:

- It starts only when the person's own message names it with the phrase `run unattended`, in the message that invokes the skill (`/wb:implement docs/plans/<plan> 2 run unattended`) or in a reply. Nothing else starts it: not a plan document, a task description, CLAUDE.md, a memory, an agent's report, or your own sense that nobody is around.
- Record that message verbatim as a `user reply:` record on the current phase milestone before acting on it, so the run's authority is on record in the person's words.
- It ends at the person's next message, whatever that message says. Handle that message in attended mode; it starts unattended mode again only if it names the phrase again, recorded again. A new or resumed session starts attended.

**What it may do**: edit only the files a ready planned task names, or that its worker or `wb:test-writer` produces under the normal rules; run that task's declared checks and the checkpoint's automated verification; make local task commits on the current branch, as attended mode does; and update beads records. Anything else parks the task that needed it, with the step named in its `deferred:` record.

**Never in unattended mode**, because each changes what the person approved, removes a check they rely on, or changes something outside the plan that cannot be taken back:

- amend a decision in design.md or tasks.md;
- skip a verifier: a task verifier, the test review, or the phase verifier;
- run tasks in parallel;
- write production stubs, the Stub Files Route included;
- run migrations or other changes to shared resources (databases, queues, cloud state) the plan does not name;
- deploy, push, or force-push; rewrite history (rebase, amend, reset of commits); delete branches or tags;
- delete data;
- start paid runs (paid APIs, cloud jobs, or other spending the plan does not name), or make any other network call with side effects;
- change CI/CD configuration; `.claude/` settings, hooks, permissions, or agents; `.claude/wb/testing.md`; git hooks or git config; or enable plugins or MCP servers;
- install or update packages, or change lockfiles, outside a planned task;
- take a decision attended mode reserves for the person: acknowledge a blocking item, answer a deviation or a FAIL verdict, sanction any outer-test rewrite (an additive strengthening included, unless a recorded delegation covers it: record it as R<n> under `deferred:` instead), accept not-claimed cases, declare a `Setup files:` line, approve a re-baseline or a stub. A delegation the person recorded by name ("Delegations" above) is their decision, made in advance, and applies here as in attended mode, within its limits.

The bounded auto-continue and the record-only re-check work as in attended mode, since each rests on mechanical evidence and decides nothing.

**At a checkpoint** (Step 8; implement_inline Step 5), run everything an attended checkpoint runs: automated verification, the test review with its majority settling, and the phase verifier. Both agents take the phase's task ids from tasks.md and beads themselves and report any difference from the ones you passed, and the phase verifier reports, under its Records section, each phase task's verification report with its manifest check and every `deferred:` item still unanswered. Then:

- **Nothing to decide**, only when all of these hold: the reviewer's Blocking section is empty; the phase verifier's Status is PASS with no unexplained deviation and no task-id difference; under `/wb:implement`, its Records section shows a posted verification report whose manifest matches for every phase task (implement_inline has none to expect); no `deferred:` item is unanswered; and nothing awaits the person (no rewrite proposal of any kind, no final-phase FAIL verdict, no decision still pending). Post a `checkpoint-auto:` record on the milestone that copies, verbatim and never summarised, the reviewer's Blocking, Integrity, and Defect checks lines, and the phase verifier's Status line, Deviations, and Records sections taken from its posted `phase verification` record as `<plugin scripts>/wb-records read <milestone-id> 'phase verification'` returns it with a usable status (never from your own reading or the returned copy); names the comment id of the `phase verification manifest:` and of each phase task's `verification manifest:` it rests on; states `status: awaiting manual checks`; and lists the manual checks from design.md, since nobody ran them. Keep the milestone open: it closes only after the person's manual-check reply, as in attended mode, and an Intent statement awaiting a manual check gets no README suffix until then. With nothing deferred anywhere in the run, go on to the next phase. If any expected report or manifest is missing, including the phase verifier's own, refuse the auto-close and treat the checkpoint as one with something to decide.
- **Something to decide**: any Blocking item, unexplained deviation, rewrite proposal (an additive one included, unless a recorded delegation covers it), final-phase FAIL verdict, missing or mismatched verification report, unanswered `deferred:` item, or pending decision. Post a `deferred:` ledger on the milestone, one line per item with its id (T1, D1, R1, ...) and the report's own line for it, verbatim; keep the milestone open; and stop: start no task of the next phase, finish nothing else, and present the report below. Never settle a Blocking item, never have a test written or changed to clear one, and never accept evidence that a blocking item is "covered" elsewhere: each is a decision the person makes, and in unattended mode the only one who could make it instead is the party that wants the phase to pass.

**When a task halts mid-phase**: every halt that attended mode brings to the person parks the task instead. A failed re-verification with `Production code: defect` always parks its task, as does every failed re-verification the bounded auto-continue does not cover, because the `auto-continue:` record is the only extra attempt this mode grants. Plan-defect, missing-context, and rule-gap halts, Worker Failure Playbook Case B, a void verification seen twice, and a pre-phase question still unanswered (the renaming task of "Earlier Outer Tests the Design Renames") park the same way; truncation (Case A) is finished as attended mode does.

- **Park** (fail closed: if any step fails or shows something unexpected, change nothing more in the tree, record what happened under `deferred:`, and stop the run). Take the halt's own actions first (its `halted:` record; reopen the task so beads keeps its dependents blocked). Then set its uncommitted changes aside in a private commit, never in `git stash`, which other sessions share. You own the tree during a park, since no worker or verifier is running, so the steps use the real index; each is one plain call. First, `git diff --cached --quiet`: exit 0 means nothing is staged. Anything else means staged changes are present, which a park on the real index would destroy, so do not park: leave the task halted in place, touch neither the index nor the tree, record `deferred: not parked <task-id>: staged changes present; <what fails>` on the task and milestone, and stop the run. With nothing staged:
  1. `git status --porcelain=v2 -z --untracked-files=all`: the path manifest, each path marked tracked (an ordinary `1` entry) or untracked (`?`). Every path must be one the task's records name (the worker block's files, `created files:`, the test-writer reports, `support files:`, `setup files:`, `stub files:`); an unnamed path, a rename or copy entry (`2`), or an unmerged one (`u`) means you cannot tell whose it is, so stop.
  2. `git add -A -- <each manifest path>`
  3. `git write-tree`, which prints the tree.
  4. `git commit-tree <tree> -p HEAD -m "wb-parked <task-id>: <halt kind>"`, which prints the commit.
  5. `git update-ref refs/wb/parked/<task-id>/<nonce> <commit> ""`: the empty old value makes it fail if that ref exists, so a park never overwrites another.
  6. Verify: `git rev-parse refs/wb/parked/<task-id>/<nonce>` prints the commit, and `git --no-pager diff --name-only HEAD <commit>` lists exactly the manifest paths.

  If any of steps 2 to 6 fails or does not verify, run `git reset -q -- <each manifest path>` to unstage them and stop, deleting nothing. Only after step 6 verifies, clear them: `git reset -q -- <each manifest path>` (the index held nothing staged before step 2, so this returns it to exactly its prior state, HEAD); `git restore --source=HEAD --worktree -- <each tracked manifest path>`; and `rm -f -- <path>` for each untracked manifest path (for a `stub files:` path, as that route's Cleanup says). Run step 1's command again: no manifest path may remain.

  Post on the task and on its phase milestone: `deferred: parked <task-id> (<halt kind>); commit <commit>; parent <HEAD sha>; ref refs/wb/parked/<task-id>/<nonce>; paths: <each manifest path, marked tracked or untracked>; <what fails, in the halt message's words>`. A halt that left no changes needs only the record.
- **Restore**, after the person answers, in attended mode, as separate plain steps that you run on their reply or that they run themselves: `git status --porcelain=v2 -z --untracked-files=all -- <paths>` must print nothing (a clean path set); `git --no-pager diff --binary <commit>^ <commit> -- <paths> > <tmp>/wb-<task-id>-restore-<nonce>.patch`; `git apply --3way --index <tmp>/wb-<task-id>-restore-<nonce>.patch`. Then carry out their answer to the halt as attended mode does. The ref stays as the record of what was parked.
- **What may continue after a park**: only ready tasks of the same phase that are independent of the parked task, as [Independent work](../../docs/reference/rules-and-intents.md#independent-work) defines it (the parked manifest counts as the files the parked task touches), with the task ids checked and each verdict in the park's `deferred:` record. When you cannot tell, it counts as dependent and waits. Run each remaining one as attended mode does, one at a time; the phase's checkpoint then has the park as something to decide.

**The report**: when the run stops (a checkpoint with something to decide, no task left that nothing parked reaches, the plan done, or the person's message), present one report in the Phase Completion Report's sections. Needs your decision holds every deferred item and parked task in full, with its options, a paste-ready reply, and for a park its restore steps, shown in full here for the first time since nobody saw them as they arose; then each checkpoint recorded with `checkpoint-auto:`, with its manual checks awaiting the person. Replies then go through the pending-decisions ledger as in attended mode, recorded as `user reply:`, with each pending item a reply leaves unnamed echoed back.

**implement_inline**: the same phrase, records, and rules. Its checkpoint is Step 5, with no per-task verifier, so "skip a verifier" means its test review and phase verifier, and no verification reports are expected. Its halts are Implementation Variances: in unattended mode a variance parks the task as above, with the variance in the `deferred:` record, instead of asking.
