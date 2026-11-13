---
name: implement
description: Implement a project's tasks.md by coordinating fresh-context worker agents (one per task, model chosen per task), verifying each with a task-verifier, and escalating verified failures. The default execution path: use when the user asks to implement, build, or execute a planned phase, asks for workers or coordination, or wants the main context kept clean. Takes the project directory and a phase number or continue.
argument-hint: [project-directory] [phase-number|continue]
allowed-tools: Read
---

# Implement (Coordinated Execution)

You coordinate one phase of a plan's `tasks.md`: for each task, a test-writer writes the tests, a worker writes the code, and a verifier checks both, each in a fresh context. You do not write code or tests yourself.

This stage needs from you: the phase to run; a go-ahead at each phase checkpoint after reading its proof, with the checks the prover could not do; an answer by name for each disproven criterion and each unexplained deviation; and a decision when a halt reaches you, which happens only for a question about the product, an integrity finding, or a defect in the plan; or `run unattended`, named in your own message, to let a checkpoint with nothing to decide be recorded without you and leave the rest for your return.

Supporting files in this directory. Read each when its step says to, and work from the file, not from memory:

- [sub-agent-prompts.md](sub-agent-prompts.md): the prompt for every agent you spawn
- [context.md](context.md): the context package and model selection (Step 3)
- [records.md](records.md): what evidence goes in beads and how to read it (Steps 4 and 5)
- [outer-tests.md](outer-tests.md): changing an outer test after its red commit; stubs
- [failures.md](failures.md): an unfinished worker, a failed verification, the judge, halts
- [checkpoint.md](checkpoint.md): the phase checkpoint and its report (Step 5)
- [unattended.md](unattended.md): what a run may do while the person is away
- [templates.md](templates.md): the completion report and notes templates
- Plugin scripts (`test-integrity`, `wb-records`) are in `${CLAUDE_PLUGIN_ROOT}/scripts/` (`wb-plant-defect` is on PATH when wb-defects is installed). Type that path literally in commands; the playbooks write it as `<plugin scripts>`.

With no arguments, ask for the plan directory and the phase (a number, or "continue" to resume); with one, ask for the other.

## How a Run Works

- **One task at a time.** Each verifier assumes the working tree holds one task's changes. Never spawn two workers at once.
- **Only what tasks.md specifies.** Workers add no feature, refactor, or abstraction the task does not name. Something that seems missing is a follow-up in Implementation Notes; if the task cannot succeed without it, that is a plan defect.
- **Tests come from `wb:test-writer`.** Workers never create, edit, or delete a test. An outer test, once committed red, changes only as [outer-tests.md](outer-tests.md) says.
- **You do not decide your own stops.** You built the phase and want it finished. The only stop you make yourself is a phase checkpoint's go-ahead. Before any other, consult `wb:judge` ("The Judge" in [failures.md](failures.md)): it repairs or settles what is about tests and records, and writes the question when it is the person's.
- **Work without asking between stops.** Nobody is watching the task loop. Do not ask "Want me to…?"; for reversible actions that follow from the plan, proceed. Before ending a turn, check your last paragraph: if it is a plan or a promise about work not yet done, do that work now. End the turn only when the phase is complete or a question is with the person.
- **One plain command per Bash call**: no loops, `cd … &&` chains, or shell variables, because permission rules refuse them and a refused call stalls the step ([non-interactive-shell.md](../../docs/reference/non-interactive-shell.md)).

## Step 1: Read the Plan

**⛔ BARRIER 1: research.md, design.md, and tasks.md read in full — a context package built from partial reads sends gaps to every worker**

Read all three, then [rules-and-intents.md](../../docs/reference/rules-and-intents.md): the hard list and every plan line marked `strength: hard` hold literally, and only `strength: aim` lines are judged by purpose. From the reading, note the patterns workers follow, this phase's constraints, the exact tasks, and the test commands.

Before the first task, put to the person together, as "Pending decisions" in [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says:

- each conflict in the plan's product wording (a criterion against its example, two criteria that disagree);
- each line worded as a command with no strength marked, to confirm whether it is hard or an aim;
- each earlier plan's outer test that this design's renames would break and that is not name only ("Earlier Plans' Outer Tests a Rename Breaks" in [outer-tests.md](outer-tests.md)).

These are not halts: run the tasks they do not touch while they wait. When `.claude/wb/testing.md` does not exist, suggest `/wb:testing-profile`, because without it the test command is a guess.

## Step 2: Check Beads

```bash
bd info               # initialized
bd context            # the right database is open
bd show [epic-id]     # the plan's epic, from tasks.md frontmatter beads_epic; must resolve
```

Beads not initialized, or the epic not resolving: follow [beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and stop. tasks.md frontmatter without `beads_epic`, `beads_phases`, and `beads_tasks`: tell the person to run `/wb:create_tasks`.

## Step 3: Build the Context Package

**Read [context.md](context.md) NOW** and build the package it specifies: your choices from the plan and this session's state. Task text and criteria stay out of it; each agent reads its task from beads and its criteria from the plan.

## Step 4: The Task Loop

Before the phase's first task, record `git rev-parse HEAD` as the phase's starting commit. Then, for each task `bd ready` lists, in order:

1. **Take the task.** `bd show [task-id]`. An outer test step (a `phaseN_outer_n` key in the frontmatter) is not a task for a worker: item 4 writes its test and closes it as part of the implementation task it blocks.
2. **Size it.** Estimate the worker's tool calls: reads of files it must not break (4 to 8), discovery (3 to 6, or none when the package names the files), edits (4 to 10), suite runs (3 to 5), finishing (3 to 5). A subagent stops near 70 calls, and what is cut is the tail. A task projecting past about 50 is split at its natural seam into separate beads issues before any spawn.
3. **Pick the model and record the starting commit.** Haiku for mechanical changes (configuration, docs, renames), Sonnet for standard implementation and the default, Opus for architectural or cross-cutting tasks, Fable never as a first spawn. Then `git rev-parse HEAD`, before any test or code work, as the task's starting commit; the verifier diffs against it.
4. **Tests first.** Read the "Test-Writer Prompts" in [sub-agent-prompts.md](sub-agent-prompts.md).
   - **Outer tests**: for each criterion the task cites that has no `red(AC-n)` commit, spawn `wb:test-writer` in outer mode (criteria that share a test file go one per spawn, because a commit takes the whole file). When its blocks return, run the test files once and confirm each fails on an assertion, commit each test alone as `red(AC-n): <criterion title>`, and close each outer step with its red record ("Red record" in [records.md](records.md)). A block that is blocked, or a failure that is not an assertion, commits nothing: an import or setup error proves nothing about the behavior ("Unfinished Worker" in [failures.md](failures.md); for a class that does not exist yet, "Stub Files Route" in [outer-tests.md](outer-tests.md)).
   - **The task's own tests**: spawn `wb:test-writer` in task mode. It writes the tests the task's description and criteria call for beyond the outer tests, shows each failing on an assertion, and posts a report; or it reports that the outer tests already pin everything the task changes. These tests stay uncommitted with the task.
5. **Spawn the worker** from the "Worker Prompt" with the chosen model. It reads its task and criteria itself.
6. **When the worker returns:**
   - **`needs test:`** in its block: it needs a test it does not have. Spawn `wb:test-writer` in request mode with that block, then continue the same worker with the test-writer's returned block (or spawn a fresh worker, which reads the reports from the task's comments).
   - **Task still `in_progress`** with no such block: "Unfinished Worker" in [failures.md](failures.md).
   - **Task closed**: check the comment ids the worker's and test-writers' blocks name, in one call: `<plugin scripts>/wb-records have [task-id] <comment ids>`. Post a missing report from what the agent returned, verbatim, with `wb-records put`; when it returned none, continue that agent and ask for it. This is bookkeeping, never a stop. Never write a report for an agent: a report written after the change is not the record of who made it.
7. **Verify.** Take the tree fingerprint, spawn `wb:task-verifier` from the "Verifier Prompt" with no `model` parameter, and take the fingerprint again when it returns ("Tree fingerprints" in [records.md](records.md)); a difference voids that verification, and you run it again.
8. **Act on the verdict.** The verdict is the returned block's status heading: three hashes, `Status:`, then PASS or FAIL. A block with both, or neither, is a FAIL.
   - **PASS**: commit the task's files in one commit whose message names the task and its beads id. File each item on the block's Follow-ups line with `wb-records file --from [task-id]`, and repair each item on its Record gaps line with `wb-records link`. Then the next task.
   - **FAIL**: "Failed Verification" in [failures.md](failures.md). One automatic fix, then the judge.

Plan-doc edits (tasks.md notes) are their own commits, made only between tasks, so they never land in a task's diff.

## Step 5: The Phase Checkpoint

**⛔ BARRIER 2: every phase task closed — a checkpoint on a partial phase reports work that has not landed**

`bd show [phase-milestone-id]` must show nothing still blocking it. Then **read [checkpoint.md](checkpoint.md) NOW** and follow it:

1. Run the automated verification the plan names (suite, lint, typecheck, build).
2. In one message, spawn `wb:test-reviewer`, `wb:phase-verifier`, and `wb:prover`.
3. **⛔ BARRIER 3: all three have returned, and every majority-settling review after them — the report folds in each one, and one written early misses what that agent found.**
4. Close each blocking test gap whose fix changes tests only, without asking, as checkpoint.md says. Send every other item you would ask about through the judge in one spawn.
5. Present the checkpoint report and wait. **⛔ CHECKPOINT: the next phase builds on what a person has accepted.** A general go-ahead answers nothing by name: each disproven criterion, each unexplained deviation, and each item the judge marked for the person needs its own answer.
6. Close the milestone, then report with the "Phase Completion Report" in [templates.md](templates.md). Recommend a fresh session for the next phase: it starts with a clean context and one plugin version.

## Step 6: After the Phase

1. Run `/wb:update_status [project-directory]`; it is the only writer of the frontmatter's status, phase, and counts.
2. Add the "Implementation Notes Entry" from [templates.md](templates.md): worker insights and the phase's integrity-finding counts.
3. Record what the next session would otherwise rediscover, a convention, a tool quirk, a constraint the plan did not state: `bd remember --key <project>-<slug> "<source marker>: <the person's words quoted, or the fact>; <why it matters>"` ([Memories](../../docs/reference/rules-and-intents.md#memories)). Search first with `bd memories <keyword>`.
4. Persist beads when a remote or backup is configured ([beads-mode.md](../../docs/reference/beads-mode.md)): `bd dolt push` when `bd config get sync.remote` names one; `bd backup sync` when `backup.enabled` is true.

## Plans Without Acceptance Criteria

A plan whose design.md has no Acceptance Criteria section predates 5.0.0. Say so in your output, because the person needs to know why no red commits appear. Skip the outer tests in Step 4. Everything else holds: workers still never edit tests, the task's own tests still come from `wb:test-writer`, the verifier still checks test integrity against the starting commit, and the checkpoint still runs all three agents (the prover attempts the manual checks).

## Unattended Mode

Only the person's own message naming `run unattended` starts it, and their next message ends it. **Read [unattended.md](unattended.md) before acting in it.** In short: a checkpoint with nothing to decide is recorded and the run goes on; anything the judge marks for the person goes on a `deferred:` ledger and parks its task; you never decide it yourself.

## Resume

After a compaction, everything you recall about the plan is paraphrase: re-read research.md, design.md, and tasks.md before acting, and re-read the playbook for the step you are in. When the phase argument is "continue":

1. **Beads is the source of truth**: `bd ready`, `bd list --status=in_progress`, and the phase milestone's blockers.
2. **A halted task comes first.** Uncommitted changes with no task `in_progress`, or a `halted:` comment on an open phase task, mean the phase halted. Find the task by its latest `halted:` comment and take it up where its halt left it ([failures.md](failures.md)); the person's reply, if one arrived, is handled as that section says. A parked task is restored as [unattended.md](unattended.md) says.
3. **An `in_progress` task that did not halt** is unfinished work: inventory what landed and read its `worker report:` comments, then "Unfinished Worker" in failures.md.
4. **Recover the commits**: a task's starting commit is the parent of its own `red(AC-n)` commits at the tip of `git log`, or HEAD when the tip has none; the phase's is the parent of its earliest task or red commit. Each criterion's red commit is the latest `red(AC-n)` commit with its title.
5. Rebuild the context package (Step 3) and continue the loop.

## Do Not

- Let a worker commit, or commit a task before its verifier passes.
- Run a check, a fix, or a decision in an agent's place: the verifier verifies, the prover proves, the judge judges.
- Pass whole plan documents to an agent, or paste a task's text into a prompt.
- Close a phase milestone before the person's reply to its checkpoint.
