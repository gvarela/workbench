# Failures and Halts

What to do when a worker does not finish, a verification fails, or the plan is wrong. Part of the implement skill; read it when SKILL.md or another playbook points here.

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

5. **Changes the person's decision forces on outer tests**: when the revision, or any answer the person gives (a deviation, a variance, a plan-defect option), forces a committed outer test to change, the change needs their [Sanction](../../docs/reference/rules-and-intents.md#sanction). The usual case is a rename: the revision renames a symbol the outer test uses (a function, route, field, or message key), so the test has to change by that name only. Ask in that decision's own question, before it is answered, not in a later halt: one line per affected outer test under its options, naming the test, what it guards (its criterion and Guards against), whether that purpose still holds under the decision, the recommended re-baseline or retirement, and what stays caught, such as `Approving this also re-baselines AC-3's outer test tests/acceptance/test_totals.py by name only (calculate_total → order_total): it still guards order totals including tax, the purpose holds, and every planted defect the red commit catches stays caught; no assertion, example, or value changes.` A retirement is a criterion retired, so its line says so and the option routes through `/wb:create_design`. Choosing the option sanctions the re-baselines its lines name, and only those; one a recorded [design-forced renames](../../docs/reference/rules-and-intents.md#design-forced-renames) delegation covers is filed as "Delegations" in [outer-tests.md](outer-tests.md) says. File each as a rewrite task, in the `discovered-from` form under "Evidence in Beads" linked to the revision issue, with the line `Sanctioned rewrite: AC-n <outer test file> from red <sha>, name-only re-baseline (<old> → <new>) approved in <revision-issue-id>`, record it on that task, and run it as "Sanctioned Outer-Test Rewrite" says: its differential is every planted defect the red-commit version catches, each still caught.

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
