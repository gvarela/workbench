# implement — Sub-Agent Prompts

Verbatim prompt templates for the agents this skill spawns. Read the relevant section in full before each spawn; do not paraphrase or abbreviate these prompts.

## Worker Prompt Template (Step 5)

```markdown
function buildWorkerPrompt(task, taskDetails, contextPackage) {
  return `You are a focused implementation worker for a single task.

## Your Task
**ID**: ${task.id}
**Title**: ${task.title}
**Description**: ${taskDetails.description}

## Context You Need

**Why this phase exists**: ${contextPackage.why}

### Patterns to Follow
${formatPatterns(contextPackage.patterns)}

### Design Context
**Phase Goal**: ${contextPackage.design.phaseGoal}
**Success Criteria**: ${contextPackage.design.successCriteria}
**Constraints**: ${contextPackage.design.constraints}

### Relevant File References
${formatFileReferences(contextPackage.relevantFiles, task)}

### Test Commands
${formatTestCommands(contextPackage.testCommands)}

### Task Test Context
${formatTaskTestContext(contextPackage.taskTestContext)}

## Your Process

Follow your agent definition: it carries the TDD process, the constraints, and the report format. The coordinator commits after verification, so leave the commit to it and make \`bd close ${task.id}\` your last act.
`;
}
```

## Outer Test Prompt (Step 5)

Spawn with `subagent_type: "wb:test-writer"` once per criterion the task cites that has no outer test yet, before the worker is spawned. The caller is the coordinator, so `wb:test-writer` works in outer mode.

```markdown
function buildOuterTestPrompt(criterion, testFile, taskTestContext, earlierReports) {
  return `Write the outer acceptance test for one criterion.

## Inputs

**Caller**: the coordinator (outer mode)
**Criterion**: ${criterion.id} - ${criterion.title}
**Text**: ${criterion.text}
**Example**: ${criterion.example}
**Observed at**: ${criterion.observedAt}
**Seam**: ${criterion.seam}
**Target test file**: ${testFile}
**Earlier test-writer reports for this task**: ${earlierReports || "none"}

### Testing Conventions for this boundary
${formatConventions(taskTestContext.conventions, criterion.observedAt)}

Report as your agent definition specifies. Do not commit: the coordinator commits the test as red(${criterion.id}) once the report shows an assertion failure.
`;
}
```

## Verification Agent Prompt (Step 6)

Spawn with `subagent_type: "wb:task-verifier"` and no `model` parameter (its definition sets the model; see SKILL.md Step 6).

```
Use the task-verifier agent to verify task completion.

Provide the agent with:
- Task ID: ${taskId}
- Task Description: ${taskDetails.description}
- Test Command: ${workerOutput.testCommand}
- Files Changed: ${workerOutput.filesChanged}
- Tests Modified: ${workerOutput.testsModified}
- Worker Report: ${workerOutput.summary}
- Starting Commit: ${taskTestContext.startingCommit}
- Red Commits: ${redCommits}  (each taskTestContext.criteria[].redCommit: the red commit of each outer test the task touches)
- Criteria: ${taskTestContext.criteria}  (each with its example)
- Test-writer Reports: ${taskTestContext.outerTestReports} and ${workerOutput.testWriterReports}  (the outer reports, then the worker's item 7, verbatim)

The agent will run tests, check scope adherence, and return a structured
markdown report with Status: PASS or FAIL.
```

## Fix Worker Prompt (Step 6, on verification FAIL)

**Retry 1:**

```
Verification failed. Spawn a fix worker using the task-worker agent with a fable model override (use opus if fable is unavailable in this session).

Provide:
- Task ID: ${taskId}
- Original Task: ${taskDetails.description}
- Verification Report: ${verificationReport}
- Task Test Context: ${formatTaskTestContext(taskTestContext)}  (includes the starting commit)
- Earlier Test-writer Reports: ${workerOutput.testWriterReports}  (the first worker's item 7, verbatim)
- Instructions: Fix the specific issues identified. Close beads issue when done.
```

**Re-verify** using the task-verifier agent with the same context, again with no `model` parameter, adding the fix worker's item 7 to Test-writer Reports (the outer reports, the first worker's item 7, then the fix worker's item 7, verbatim). Without it, the fix's test changes match no report and fail as undeclared.

**If re-verification fails**: add the task to the phase checkpoint's blocking list and continue to the next task. Do not spawn a second fix worker.
