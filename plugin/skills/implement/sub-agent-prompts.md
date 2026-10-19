# implement — Sub-Agent Prompts

Verbatim prompt templates for the agents this skill spawns. Read the relevant section in full before each spawn; do not paraphrase or abbreviate these prompts.

## Worker Prompt Template (Step 5)

```markdown
function buildWorkerPrompt(task, contextPackage) {
  return `You are a focused implementation worker for a single task.

## Your Task
**ID**: ${task.id}
**Plan directory**: ${contextPackage.planDir}  (its research.md, design.md, and tasks.md)

Read the task and the criteria it cites first, as your agent definition's Inputs says; this prompt does not repeat them.

## Context You Need

**Why this phase exists**: ${contextPackage.why}
**Constraints**: ${contextPackage.design.constraints}

### Patterns to Follow
${formatPatterns(contextPackage.patterns)}

### Relevant File References
${formatFileReferences(contextPackage.relevantFiles, task)}

### Test Commands
${formatTestCommands(contextPackage.testCommands)}

### Commits
**Starting commit**: ${contextPackage.taskTestContext.startingCommit}
**Red commits**: ${formatRedCommits(contextPackage.taskTestContext.criteria)}  (criterion id, sha, and test file of each committed outer test)

## Your Process

Follow your agent definition: it carries the TDD process, the constraints, and the report format. The coordinator commits after verification, so leave the commit to it and make \`bd close ${task.id}\` your last act.
`;
}
```

## Outer Test Prompt (Step 5)

Spawn with `subagent_type: "wb:test-writer"` once per task, naming every criterion the task cites that has no outer test yet, before the worker is spawned. One spawn per task rather than per criterion saves the coordinator a spawn and a return per criterion, while each criterion still gets its own report and its own red commit. The caller is the coordinator, so `wb:test-writer` works in outer mode.

```markdown
function buildOuterTestPrompt(task, criteria, planDir) {
  return `Write the outer acceptance test for each criterion below, one test and one report per criterion.

## Inputs

**Caller**: the coordinator (outer mode)
**Task ID**: ${task.id}
**Plan directory**: ${planDir}  (its research.md, design.md, and tasks.md)
**Earlier test-writer reports for this task**: in the task's comments

${criteria.map(c => `- ${c.id}: target test file ${c.testFile}`).join("\n")}

Read each criterion from the plan first, as your agent definition's Inputs says; this prompt does not repeat them.

Report as your agent definition specifies, posting each report on task ${task.id} and returning one block per criterion. Do not commit: the coordinator commits each test as red(<criterion id>) once its block shows an assertion failure.
`;
}
```

## Verification Agent Prompt (Step 6)

Spawn with `subagent_type: "wb:task-verifier"` and no `model` parameter (its definition sets the model; see SKILL.md Step 6).

```
Use the task-verifier agent to verify task completion.

Provide the agent with:
- Task ID: ${taskId}
- Plan Directory: ${planDir}  (its design.md and tasks.md hold the criteria the task cites)
- Test Command: ${workerOutput.testCommand}
- Files Changed: ${workerOutput.filesChanged}
- Tests Modified: ${workerOutput.testsModified}  (the worker block's Tests line)
- Starting Commit: ${taskTestContext.startingCommit}
- Red Commits: ${redCommits}  (each taskTestContext.criteria[].redCommit with its criterion id and testFile)

The agent reads the task from beads and the cited criteria from the plan, and the worker report, the test-writer reports, and on a harness task the support files from the task's comments, so none of them is pasted here.

The agent will run tests, check scope adherence, post its full report and
its Test Integrity section on the task, and return a short block with
Status: PASS or FAIL.
```

## Fix Worker Prompt (Step 6, on verification FAIL)

**Retry 1:**

```
Verification failed. Spawn a fix worker using the task-worker agent with a fable model override (use opus if fable is unavailable in this session).

Provide:
- Task ID: ${taskId}
- Plan Directory: ${planDir}
- Context: the Worker Prompt Template's "Context You Need" section as the first worker got it (why, constraints, patterns, file references, test commands)
- Starting Commit and Red Commits: as in the Verification Agent Prompt
- Verification Report: the latest `verification report:` comment on the task; read it yourself with `bd comments ${taskId} --json`, along with the earlier worker and test-writer reports there
- Earlier Test-writer Reports: in the task's comments; give `wb:test-writer` the task id and say the earlier reports are there
- Instructions: Read the task and its cited criteria as your agent definition's Inputs says, then fix the specific issues the verification report names. Close beads issue when done.
```

**Re-verify** using the task-verifier agent with the same context, again with no `model` parameter. It reads the test-writer reports and, on a harness task, the support files from the task's comments, which now include the fix worker's and its test-writer's, so the fix's test changes match a report rather than failing as undeclared.

**If re-verification fails**: halt the phase with the "Failed Re-verification Halt" in [reference.md](reference.md). Do not spawn a second fix worker.
