# Failures and Halts

What to do when a worker does not finish, a verification fails, or the plan is wrong. Part of the implement skill; read it when SKILL.md or another playbook points here.

## The Judge

You built the phase and you want it green, so you are the wrong party to decide whether a stop is real. **Before you stop to ask the person anything other than a phase checkpoint's go-ahead, consult `wb:judge`.** It reads the evidence itself and returns one outcome. Most stops in practice were about tests or records, which the person could not evaluate; the judge settles those inside stated limits and passes on only what is the person's.

**Spawn** `wb:judge` with no `model` parameter (its definition pins Fable at `high`), from the "Judge Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md). Give it ids and the kind of stop, never your account of who is right: it reads the verifier's records, the criterion, and the diff. One spawn per stop; items that arise together at a checkpoint share a spawn.

**Act on its outcome**, read from its `Outcome:` line. A report with no such line, or with two, is `person`.

- **repair**: a record or a link is missing and nothing about the tests or the code is in question. Do the steps it lists (post the returned text with `wb-records put`, add a link with `wb-records link`, correct an id and spawn the same agent again) and go on. This is never a stop and never a fix attempt.
- **settle**: a call inside its classes. Post its decision before acting, in its own words: `<plugin scripts>/wb-records put <task-id> --escaped 'judged: <its class>; <its decision>; because <its reason>; reverse with: <its reply>'`. Then do what it decided, and list it under "Decisions I made for you" in the next report. When it settles "one more fix attempt", run a fix worker from the "Fix Worker Prompt" with its guidance as one added line, and re-verify; a task gets at most three verifications of a changed tree, so a third FAIL goes to the person without another consult.
- **recheck**: it doubts a verifier's reading of one finding. Spawn `wb:task-verifier` fresh from the "Verification Agent Prompt" with one added line, `Targeted re-check: <the finding, as the judge names it>`. That verifier's verdict stands; the judge never decides the gate. One re-check per finding, outside the three-verification count.
- **person**: present its question as it wrote it, in the halt message below, and wait. In unattended mode put it on the `deferred:` ledger and park the task ([unattended.md](unattended.md)).

**It never** turns a FAIL into a PASS, waives an integrity finding (an undeclared test change, an outer test changed without proof, a weakened, skipped, or deleted test, an expected value taken from the code), changes what a criterion means, accepts lost coverage, decides product behavior or scope, approves work outside the plan, or judges a hard line ([rules-and-intents.md](../../docs/reference/rules-and-intents.md)). If its report does any of these, treat the outcome as `person`.

**While a question waits for the person**, tasks independent of the halted one may go on: park the halted task as "Parking a task" in [unattended.md](unattended.md) says, with that file's test for independence (outside its dependency closure both ways; no shared file, criterion, outer test, contract, or schema; doubt means dependent). Present the question first, and say which tasks continue.

### The halt message

Every halt that reaches the person uses this form, written as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says. The judge supplies the question and the options; offer only choices that are real for this halt.

```
⚠️ Phase Halted: ${what stopped, in plain words}

Task: ${what the task builds, in plain words} (${taskId}; ${its state: reopened, in_progress, parked at <ref>; changes left uncommitted})
What happened: ${each failing finding or blocker in plain words, then file:line; the fix attempts so far}

The question: ${the judge's question: what would go wrong in the product, as one concrete example}

**Options** (each: what it does, what it costs, how to undo it):
${the judge's options, numbered}

Recommendation: ${the judge's recommendation and its reason}
Paste-ready reply: ${the exact reply that takes it}
```

Record why the phase halted on the task, so a fresh session can find it: `bd comments add [task-id] "halted: re-verification failed"` (or `halted: plan defect`, `halted: missing context`, `halted: unfinished worker`). Record the person's reply verbatim as a `user reply:` record.

## Unfinished Worker

A worker that leaves its task `in_progress` did not finish. Verification is not run. It is one of two events with opposite remedies, so run `git status` and `git diff --stat` and look at how its output ends before acting.

- **Truncation**: files are changed, the bead is open, and the output cuts off mid-sequence with no blocker reported. Subagents stop when they exhaust their tool-call budget (observed near 70 calls), and the missing work is always the tail: the last edits, the final run, the `bd close`. Inventory what landed; a committed `red(AC-n)` outer test is expected state, since you committed it before the worker ran. Finish the remainder yourself when it is not a test, or delegate only the remaining slice to a fresh worker with a prompt that names the exact files still to change. Close the bead, post a `worker report:` comment covering the whole, and verify. Never retry the whole task: the same task with the same context truncates at the same point.
- **A reported blocker**: little landed and the worker named something it could not resolve.
  - `needs test:` is not a failure: have `wb:test-writer` write the test and continue the worker (SKILL.md Step 5).
  - `missing context:` goes to "Missing Plan Context" below.
  - Anything else, including `no route:` (a wb rule left the change it needs no route), goes to the judge.

**On the person's reply to an unfinished-worker halt**: `retry: <context>` discards what the worker landed (as "Discard and retry" below), then spawns the worker again with the context as one added line and the same `taskTestContext`. `investigate` starts no further task and leaves the tree as it is. `continue`, after the person changed something, posts a `worker report:` naming the files they changed, closes the issue, and verifies the working tree.

## Failed Verification

The `Cause:` line of the verifier's returned block names the failure. Without one, judge from the evidence: a requirement the codebase cannot satisfy, a worker that followed the task exactly and still fails on the specified behavior, or a fix that would change design.md, is a plan defect.

- **`Cause: missing context (<what>)`**: "Missing Plan Context" below, before anything else.
- **`Cause: plan defect`**: "Plan Defect" below. No fix worker: retries cannot fix a task that is wrong as specified.
- **`Cause: implementation defect`** (the task is achievable; the work fell short, including every integrity and protection finding): one automatic fix. When the fix is to a test, pass the verifier's Suggested fix and Class-fix evidence word for word; a fix it checked against the planted defects is applied as written. When the fix is a rewrite of an outer test, the rewrite's verification can settle this task too ("Filing and running it" in [outer-tests.md](outer-tests.md)). Spawn a fix worker from the "Fix Worker Prompt" (it escalates the model), then re-verify with the Re-verification line. The re-verification plants defects only for the FAIL's class and for every ledger line whose target or test blob the fix changed, so a survivor outside the class comes back as a follow-up. Never ask a verifier to skip the blob-changed lines.

**When the re-verification fails**, the failed task's changes are uncommitted and its issue is closed. Before anything else:

1. Commit nothing; the changes stay in the working tree.
2. Reopen the issue so its dependents stay blocked: `bd update [task-id] --status=open`.
3. Consult the judge. It may settle one more fix attempt with guidance when the failure is a test gap on code that does what the criterion says; an integrity finding, a changed outer test, or a production defect it returns as `person`.

**On the person's reply to a failed-verification halt**, read the worker and fix-worker reports from the task's comments, never from memory:

- **`continue`** or **`continue: <guidance>`**: with guidance, first run a fix worker with `Guidance from the user: <guidance>` as one added line; the person asked for this attempt, so no cap limits it. Then re-verify the working tree. On PASS close the issue if it is open, commit the task, and resume. On FAIL reopen it and present the halt again.
- **`discard and retry`** (Discard and retry): `git restore --staged --worktree :/`, then delete with `rm -f` the untracked files that `git status --short` lists and the task's `created files:` comments name; ask before deleting an untracked file no comment names, since it may be the person's. Post `discarded: earlier inner reports, worker reports, created files, support files, and setup files no longer apply`. Do not move HEAD: it is the starting commit plus the task's committed red tests, and those stay. Run the task again with the same `taskTestContext`.
- **`plan defect`**: "Plan Defect" below; the issue stays open.
- **`not claimed: <cases>`** (a rewrite whose lost cases the person accepts): post `not claimed: AC-n <outer test file>: <each case>; accepted by the user's reply` on the task, have `wb:test-writer` add those cases to the rewritten test's Not claimed comment and change no assertion, and re-verify; the verifier leaves the accepted cases out of the differential.
- **An option the message named in place of these**: do what its line said. Ask before committing a task whose last verification failed, naming the findings the commit would carry.

## Missing Plan Context

An agent that cannot find its task or a criterion stops and says what it could not find: the verifier returns `Cause: missing context (<what>)`, a worker reports `missing context:` under Blockers, and `wb:test-writer` returns `blocked (criterion not found: <id>, looked in <where>)`. The gap may be in your prompt, so check your inputs first: the task id resolves with `bd show <task-id> --json`; the plan directory holds design.md and tasks.md; each criterion id you named is on the task's Serves line and in the phase's Outer Test Steps.

- **Your input was wrong**: correct it and spawn the same agent again from the same template. This is not a fix attempt.
- **Your input was right and the plan lacks it**: start no further task, commit nothing, reopen the task if the worker closed it, and consult the judge. The person's `continue`, after they add or correct it, runs this check again and then the agent that stopped.

## Plan Defect

The task cannot succeed as specified: a design assumption does not survive contact with the code. A fix worker would be spent on a task that is wrong by construction.

1. **File the defect**: `bd create --title="Design revision: [assumption that failed]" --description="Task [task-id] cannot succeed as specified: [verifier evidence]. Affected design section: [design.md reference]" --type=task --priority=1`.
2. **Block dependents**: `bd dep add [dependent-task-id] [revision-issue-id]` for every task not yet run that builds on the failed assumption.
3. **Consult the judge**, which confirms it is the plan and not a rule that left the change no route, and writes the question: the product behavior the plan promised that the code cannot deliver as specified, and the real options (revise the design, or an alternative such as narrowing the criterion).
4. **Route the fix** through `/wb:create_design` (after `/wb:explore_design` when it reopens an architectural choice), never through fix workers. When the revision renames something an outer test uses, the test changes as "Changing an Outer Test" in [outer-tests.md](outer-tests.md) says.
