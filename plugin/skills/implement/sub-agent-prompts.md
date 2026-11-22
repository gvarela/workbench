# implement — Sub-Agent Prompts

The prompt for every agent this skill spawns. Fill in the values and use the text as written; each agent's definition carries its process, so a prompt gives only what that agent cannot find out for itself. Every agent reads its task from beads and its criteria from the plan: never paste task text or criteria into a prompt.

## Test-Writer Prompts (Step 4)

Spawn with `subagent_type: "wb:test-writer"`. One template, four modes:

- **outer**: before the worker, for criteria the task cites that have no `red(AC-n)` commit. Criteria that share a target test file go one per spawn, with the next spawn after the first one's red commit, because a commit takes the whole file.
- **task**: before the worker, once per task, for the task's own tests.
- **request**: when a worker returns `needs test:`.
- **rewrite**: for a rewrite task ("Changing an Outer Test" in [outer-tests.md](outer-tests.md)); no worker runs.

```
Write tests for this task. Mode: ${outer | task | request | rewrite}

- Task ID: ${taskId}
- Plan directory: ${planDir}  (its research.md, design.md, and tasks.md)
- Test command: ${testCommand}
- Check commands: ${the format and lint commands for changed files, or "none known"}
- Earlier test-writer reports for this task: in the task's comments
${outer:   "- Criteria: " + each criterion id with its target test file}
${request: "- The worker's request, verbatim:\n" + the worker's needs test: block}
${rewrite: "- Outer test: " + testFile + ", red commit " + redCommit + "\n- Why: " + the reason from the task's Outer test rewrite: line + "\n- Suggested fix (" + ("checked against the planted defects: apply it as written" | "not checked: a starting point") + "), word for word from the verifier's block:\n" + suggestedFix + "\n- Class-fix evidence: " + classFixEvidence}

Read the task and its criteria yourself, as your agent definition's Inputs says. Post each report on task ${taskId} and return one block per report. Do not commit.
```

## Worker Prompt (Step 4)

Spawn with `subagent_type: "wb:task-worker"` and the chosen `model`.

```
Implement one task.

- Task ID: ${taskId}
- Plan directory: ${contextPackage.planDir}  (its research.md, design.md, and tasks.md)
- Why this phase exists: ${contextPackage.why}
- Constraints: ${contextPackage.design.constraints}
- Patterns to follow: ${contextPackage.patterns}
- Relevant files: ${contextPackage.relevantFiles, the ones this task touches or must not break}
- Test commands: ${contextPackage.testCommands}
- Starting commit: ${startingCommit}
- Red commits: ${each cited criterion's id, sha, and test file}
- Tests already written for this task: in the task's comments (the test-writer's reports)

Read the task and the criteria it cites yourself, as your agent definition's Inputs says. You write no test: when you need one you do not have, stop and return a needs test: block. The coordinator commits after verification, so make `bd close ${taskId}` your last act.
```

## Verifier Prompt (Step 4)

Spawn with `subagent_type: "wb:task-verifier"` and no `model` parameter: its definition pins Opus at `medium` (measured against `high` on seeded defects: the same catches in less time), and a per-spawn model would run the gate on the worker's cheaper model.

```
Verify this task.

- Task ID: ${taskId}
- Plan directory: ${planDir}
- Test command: ${testCommand}
- Files changed: ${the worker block's Files changed line; for a rewrite task, the test file}
- Starting commit: ${startingCommit}
- Red commits: ${each cited criterion's id, sha, and test file, with "(not built)" after each whose red record says so}
${one added line when it applies:}
${"Re-verification: yes; the earlier verification report record holds the FAIL, and the defect ledger record its ledger"}
${"Targeted re-check: " + the finding, as the judge named it}
${"Also re-verify: " + ownerTaskId + " (its last verification failed only on this outer test, with its production code correct)"}

Read the task, its criteria, and the reports and records in the task's comments yourself. Post your records on the task and return your block.
```

A re-verification runs every integrity check and plants defects only for the FAIL's class, plus every ledger line whose target or test blob the fix changed. Add nothing that asks it to skip those lines.

## Fix Worker Prompt (after a verification FAIL)

Spawn with `subagent_type: "wb:task-worker"` and `model: "fable"` (`opus` when Fable is unavailable in this session).

```
Fix a task that failed verification.

- Task ID: ${taskId}
- Plan directory: ${planDir}
- The Worker Prompt's context lines, as the first worker got them
- Starting commit and red commits: as in the Verifier Prompt
- The verification report: the latest verification report record on the task; read it and the earlier worker and test-writer reports from the task's comments
${"Guidance: " + the judge's guidance, or "Guidance from the user: " + the person's, when there is one}

Fix what the report names. Where it names a class of failure, fix the whole class, not only the instances it lists. You write no test: for a test change, return a needs test: block. Close the beads issue when done.
```

When the fix is to a test only (the report says the production code is correct), spawn `wb:test-writer` in request mode in place of a fix worker. The request is the verifier's Suggested fix and Class-fix evidence lines, copied word for word, with whether the fix was checked: a checked fix is applied as written.

## Test Reviewer Prompt (Step 5)

Spawn with `subagent_type: "wb:test-reviewer"` and no `model` parameter.

```
Review the tests Phase ${phase} changed.

- Plan directory: ${planDir}
- Mode: ${"implement" | "inline"}
- Phase starting commit: ${phaseStartingCommit}; plan starting commit: ${planStartingCommit}
- Criteria: ${the phase's criterion ids}  (read each with its examples, observed-at boundary, and seam)
- Red commits: ${the latest red(AC-n) commit of each, with its test file}
- Phase tasks: ${phaseTaskIds}  (read each verifier's Test Integrity and Defect ledger records from them)
- Conventions: ${conventionsSource}; test paths: ${testPaths}; test command: ${testCommand}
${for a settling review: "Candidates: " + each candidate's location, rubric item, and proposed verdict}
${after gap fixes: "Confirm: " + each fixed gap's kind, location, and the defect or evidence the first review gave}
```

## Phase Verifier Prompt (Step 5)

Spawn with `subagent_type: "wb:phase-verifier"` and no `model` parameter. "The Three Agents" in [checkpoint.md](checkpoint.md) says where each value comes from.

```
Verify Phase ${phase} of the plan against its tasks.

- Plan directory: ${planDir}  (its README.md, design.md, and tasks.md)
- Milestone: ${phaseMilestoneId}  (post your report here)
- Phase: ${phase}; final phase: ${"yes" | "no"}; mode: ${"implement" | "inline"}
- Range: ${phaseStartingCommit}..${endCommit}  (end: HEAD, or "working tree" when the phase's changes are not all committed)
- Plan starting commit: ${planStartingCommit}
- Tasks: ${phaseTaskIds}
- Red commits: ${redCommits}
- Automated verification: ${each checkpoint command and whether it passed}
- Conventions: ${conventionsSource}; test paths: ${testPaths}; test command: ${testCommand}

Read the planned changes, the Design Coverage rows, the Intent statements, and the task records yourself. Post your report on the milestone and return it; you edit nothing else.
```

## Prover Prompt (Step 5)

Spawn with `subagent_type: "wb:prover"` and no `model` parameter.

```
Prove Phase ${phase} of the plan.

- Plan directory: ${planDir}  (its design.md and tasks.md)
- Milestone: ${phaseMilestoneId}  (post your report here)
- Phase: ${phase}
- Criteria: ${criterionIds}  (this phase's; on the final phase, every criterion the plan delivered; "none" for a plan without acceptance criteria)
- Red commits: ${redCommits}
- Test command: ${testCommand}
- Profile: ${".claude/wb/testing.md" when it exists, otherwise "none"}

Read each criterion and the phase's manual checks yourself. Run the product; edit nothing; post your report on the milestone and return it.
```

## Judge Prompt (before any stop but a checkpoint's go-ahead)

Spawn with `subagent_type: "wb:judge"` and no `model` parameter (its definition pins Fable at `high`). Give ids and the kind of stop. Copy the finding verbatim, and say what you would ask in one sentence without arguing for an answer: the judge reads the evidence itself.

```
Judge this stop.

- Plan directory: ${planDir}
- Stop: ${failed re-verification | unfinished worker | missing plan context | plan defect | rewrite not proven | checkpoint item | design approval}
- Task or milestone: ${id}
- Finding or item: ${the verifier's, reviewer's, prover's, or worker's line, verbatim; for several checkpoint items, each on its own line with its number}
- What the coordinator would ask: ${one sentence}
- Verifications so far: ${n}
```
