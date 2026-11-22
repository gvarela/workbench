---
name: implement_inline
description: Implement a project's tasks.md in this session with TDD (red, green, refactor), beads claim and close per task, and a human checkpoint at each phase boundary. Use only when the user asks for the work done inline, in this session, or on the session model rather than by workers (for example a full-Fable run). Takes the project directory and a phase number or continue.
argument-hint: [project-directory] [phase-number|continue]
allowed-tools: Read
---

# Implement Inline

You implement one phase of a plan's `tasks.md` yourself, in this session: you write the production code, and `wb:test-writer` writes every test. It is the same process as `/wb:implement` with you in the worker's place, so this file holds what differs and points at implement's playbooks for the rest. Read each playbook when its step says to, and work from the file, not from memory.

This stage needs from you: the phase to run; a go-ahead at each phase checkpoint after reading its proof, with the checks the prover could not do; an answer by name for each disproven criterion and each unexplained deviation; and a decision when a halt reaches you, which happens only for a question about the product, an integrity finding, or a defect in the plan; or `run unattended`, named in your own message, to let a checkpoint with nothing to decide be recorded without you and leave the rest for your return.

Supporting files:

- [templates.md](templates.md): the frontmatter shape, the checkpoint report, and the completion report
- implement's playbooks: [sub-agent-prompts.md](../implement/sub-agent-prompts.md), [records.md](../implement/records.md), [outer-tests.md](../implement/outer-tests.md), [failures.md](../implement/failures.md), [checkpoint.md](../implement/checkpoint.md), [unattended.md](../implement/unattended.md)
- Plugin scripts (`test-integrity`, `wb-records`) are in `${CLAUDE_PLUGIN_ROOT}/scripts/` (`wb-plant-defect` is on PATH when wb-defects is installed). Type that path literally; the playbooks write it as `<plugin scripts>`.

With no arguments, ask for the plan directory and the phase (a number, or "continue" to resume).

## What Differs From /wb:implement

- **You are the worker.** No `wb:task-worker` and no per-task `wb:task-verifier` run. Test integrity is checked once, across the whole phase, by the test review at the checkpoint (mode `inline`).
- **You still never write a test.** Every test, outer and inner, comes from `wb:test-writer`. The party that writes the code does not shape the check on it, and that holds for you as it does for a worker. On a harness task the support code is yours; on a setup task (its description carries a `Setup files:` line) the setup that line names is yours.
- **You commit each task yourself**, once its tests pass, before closing its bead.
- **You do not decide your own stops.** You built the phase and want it finished. Before any stop other than a checkpoint's go-ahead, consult `wb:judge` ("The Judge" in [failures.md](../implement/failures.md)).

The rest holds as in `/wb:implement`: only what tasks.md specifies; one plain command per Bash call ([non-interactive-shell.md](../../docs/reference/non-interactive-shell.md)); beads for all status; no asking "Want me to…?" between stops.

## Step 1: Read the Plan and Check Beads

**⛔ BARRIER 1: research.md, design.md, and tasks.md read in full — work built on partial reads carries the gaps into every task**

Read all three, then [rules-and-intents.md](../../docs/reference/rules-and-intents.md): the hard list and every line marked `strength: hard` hold literally. Before the first task, put to the person together ("Pending decisions" in [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md)) each conflict in the plan's product wording, each command-worded line with no strength marked, and each earlier plan's outer test this design's renames would break and that is not name only ("Earlier Plans' Outer Tests a Rename Breaks" in [outer-tests.md](../implement/outer-tests.md)). Run the tasks those do not touch while they wait.

Then check beads: `bd info`, `bd context`, and `bd show [epic-id]` (from tasks.md frontmatter `beads_epic`) must work; otherwise follow [beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and stop. Frontmatter without beads ids: tell the person to run `/wb:create_tasks`.

## Step 2: The Task Loop

Before the phase's first task, record `git rev-parse HEAD` as the phase's starting commit. Then for each task `bd ready` lists, in order:

1. **Take and claim it**: `bd show [task-id] --json`, then `bd update [task-id] --claim`. An outer test step (`phaseN_outer_n`) is done inside the implementation task it blocks.
2. **Tests first**, from the "Test-Writer Prompts" in [sub-agent-prompts.md](../implement/sub-agent-prompts.md):
   - **Outer tests**: for each criterion the task cites that has no `red(AC-n)` commit, spawn `wb:test-writer` in outer mode (criteria sharing a file go one per spawn). Run each returned test yourself and confirm it fails with a valid red (on an assertion, or because code this plan creates does not exist yet: "Outer Tests on Code That Does Not Exist Yet" in [outer-tests.md](../implement/outer-tests.md); write no stub for it), commit each alone as `red(AC-n): <criterion title>`, and close each outer step with its red record ("Red record" in [records.md](../implement/records.md)). A block that is blocked, or a failure that is not an assertion, commits nothing and goes to the judge; for a class that does not exist yet, "Stub Files Route" in [outer-tests.md](../implement/outer-tests.md).
   - **The task's own tests**: spawn `wb:test-writer` in task mode. It writes what the task needs beyond the outer tests and shows each failing on an assertion, or reports that none is needed.

   A spawn in an interactive session runs in the background: its block arrives as a completion notification. Do not `sleep` or poll; end the turn, or read the code you will change, until it arrives.
3. **RED**: run the tests written for the task and confirm each fails as its report or red record says: on an assertion, or because the code this task creates does not exist yet. For a not-built red, watch for the assertion failure once your code loads; if the test goes straight to green, say so at the checkpoint.
4. **GREEN**: the minimum code that passes. Run the task's tests, then the related ones for regression.
5. **REFACTOR**: clean up while the tests stay green, following the patterns in research.md. Then run the repository's format and lint commands (the Checks section of `.claude/wb/profile.md`, or research and CI) on the files you changed. Each test-writer does the same on its test files before it reports, so an outer test is clean before its red commit; a style fix after that commit is a change to an approved test.
6. **When you need a test you do not have**, spawn `wb:test-writer` in request mode, giving the behavior as inputs and observable results from the criterion's example, never as the code you plan to write. To change an existing test, ask it; an outer test changes only as "Changing an Outer Test" in [outer-tests.md](../implement/outer-tests.md) says.
7. **Record what the review needs**, with `<plugin scripts>/wb-records put [task-id] --file <path>` (the file form in "Posting text to beads", [non-interactive-shell.md](../../docs/reference/non-interactive-shell.md)): `created files:` listing every file you created; on a harness task, `support files:` with one path per line; on a setup task, `setup files:` likewise. Check the comment ids the test-writers returned with `wb-records have`; post a missing report from the text the agent returned, verbatim, never one you wrote.
8. **Commit and close**: one commit for the task, its message naming the task and its beads id, then `bd close [task-id] --reason "Implemented [feature], tests passing"`.

**When something does not fit the plan** (the code is not what research described, a task cannot succeed as written, a test-writer block is blocked): stop the task and consult the judge. It repairs or settles what is about tests and records, and writes the question when it is the person's. A plan defect follows "Plan Defect" in [failures.md](../implement/failures.md).

**No acceptance criteria: plan predates 5.0.0.** Say so in your output, skip the outer tests, and keep everything else: the task's own tests still come from `wb:test-writer`.

## Step 3: The Phase Checkpoint

**⛔ BARRIER 2: every phase task closed — a checkpoint on a partial phase reports work that has not landed**

`bd show [phase-milestone-id]` must show nothing still blocking it. Then **read [checkpoint.md](../implement/checkpoint.md) NOW** and follow it, with these differences:

- The test reviewer runs in mode `inline` and checks test integrity across the whole phase itself, since no per-task verifier did. Give it the phase task ids; it reads the test-writer reports and your `support files:` and `setup files:` records from them.
- A test gap closed without asking is fixed by `wb:test-writer` and then checked by the test reviewer's one confirming review (the `Confirm:` line in checkpoint.md), since there is no task verifier. An outer-test rewrite is checked by that reviewer as [rewrite-verification.md](../../docs/reference/rewrite-verification.md) says.
- Present the report as "The Report" in checkpoint.md gives it.

**⛔ BARRIER 3: the test reviewer, the phase verifier, the prover, and every settling review have returned before you write the report.**

**⛔ CHECKPOINT: the next phase builds on what a person has accepted.** Close the milestone only after the person's reply, with every answer applied. Recommend a fresh session for the next phase.

## Step 4: After the Phase

As `/wb:implement`'s Step 6: run `/wb:update_status [project-directory]` (the only writer of the frontmatter's status, phase, and counts); add implementation notes to tasks.md; record durable learnings with `bd remember`; persist beads when a remote or backup is configured.

## Unattended Mode

Only the person's own message naming `run unattended` starts it, and their next message ends it. **Read [unattended.md](../implement/unattended.md) before acting in it.** Its checkpoint rules apply with no verification reports to expect, and a stop the judge returns for the person parks the task.

## Resume

After a compaction, everything you recall about the plan is paraphrase: re-read research.md, design.md, and tasks.md, and the playbook for the step you are in. With "continue": beads is the source of truth (`bd ready`, `bd list --status=in_progress`); a `halted:` comment on an open phase task means the phase halted there, so take that up first; a task left `in_progress` is yours to finish, after reading what landed (`git status`, `git diff`) and its test-writer reports. Recover the phase's starting commit as the parent of its earliest task or `red(AC-n)` commit.

## Do Not

- Write, edit, or delete a test case; ask `wb:test-writer`.
- Run a check or a decision in an agent's place: the reviewer reviews, the prover proves, the judge judges.
- Update checkboxes or frontmatter counts by hand, or use TaskCreate or TodoWrite: beads holds status.
- Close a phase milestone before the person's reply to its checkpoint.
