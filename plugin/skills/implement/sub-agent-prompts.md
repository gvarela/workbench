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
${task.sanctionedRewrite ? `
### Sanctioned Outer-Test Rewrite
This task rewrites the outer test ${task.sanctionedRewrite.testFile} from its red commit ${task.sanctionedRewrite.redCommit}, which a person sanctioned at a phase checkpoint, or the coordinator sanctioned as additive only (your task's description carries the Sanctioned rewrite: line, or the Sanctioned rewrite (additive, orchestrator): line, under which the rewrite only adds lines). Ask wb:test-writer for the rewrite in inner mode and pass on this requirement: plant one defect for each case the red-commit version catches, which the test-quality skill's Part 3 defines (every branch, pattern alternative, call form, input shape, and table row of its predicate or assertion, on shapes present in the repository or named in the criterion's examples; every other alternative goes on a written Not claimed list in the test and the report), and one for the gap the review found; run both versions against each; the rewrite must fail on all of them; list each defect with both results in the report. The review's suggested fix is a starting point: where it would stop catching something the red-commit version catches, keep that case and add the gap.
` : ""}

## Your Process

Follow your agent definition: it carries the TDD process, the constraints, and the report format. The coordinator commits after verification, so leave the commit to it and make \`bd close ${task.id}\` your last act.
`;
}
```

## Outer Test Prompt (Step 5)

Spawn with `subagent_type: "wb:test-writer"` once per task, naming every criterion the task cites that has no outer test yet, before the worker is spawned. One spawn per task rather than per criterion saves the coordinator a spawn and a return per criterion, while each criterion still gets its own report and its own red commit. The exception is criteria that share a target test file: name at most one of them per spawn and spawn again after its red commit, because `wb:test-writer` does not commit and a commit takes the whole file, so a second test written beside the first would land in the first criterion's red commit. The caller is the coordinator, so `wb:test-writer` works in outer mode.

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

The agent reads the task from beads and the cited criteria from the plan, and the worker report, the test-writer reports, and on a harness or setup task the support or setup files from the task's comments, so none of them is pasted here.

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
- Context: the Worker Prompt Template's "Context You Need" section as the first worker got it (why, constraints, patterns, file references, test commands, and its Sanctioned Outer-Test Rewrite block when the task has one, since task-worker changes an outer test only when its prompt names the rewrite)
- Starting Commit and Red Commits: as in the Verification Agent Prompt
- Verification Report: the latest `verification report:` comment on the task; read it yourself with `bd comments ${taskId} --json`, along with the earlier worker and test-writer reports there
- Earlier Test-writer Reports: in the task's comments; give `wb:test-writer` the task id and say the earlier reports are there
- Instructions: Read the task and its cited criteria as your agent definition's Inputs says, then fix the specific issues the verification report names. Where it names a class of failure, such as the cases a rewrite of an outer test stopped catching, fix the whole class, not only the instances it lists: the re-verification checks the class again, and a second automatic attempt comes only for a test gap on correct code. Close beads issue when done.
```

**Re-verify** using the task-verifier agent with the same context plus one line, `Re-verification: yes; the earlier verification report: comment holds the FAIL, and the defect ledger: comment its Defect ledger`, again with no `model` parameter. It runs every integrity check, re-plants the defects behind the FAIL and the rest of their class, and always every ledger line whose target or test blob the fix changed, and carries the rest of the ledger over, since the suite run covers the unchanged code; a survivor outside the class comes back as a follow-up, not a FAIL. Add nothing to the prompt that asks it to skip the blob-changed lines, whatever the cost or churn. It reads the test-writer reports and, on a harness or setup task, the support or setup files from the task's comments, which now include the fix worker's and its test-writer's, so the fix's test changes match a report rather than failing as undeclared.

**If re-verification fails**: check the "Bounded auto-continue" in [reference.md](reference.md) first. Only when all four of its conditions hold in the returned block, and the task has had fewer than three verifications, post the `auto-continue:` record and spawn one more fix worker from this prompt, then re-verify as above. Otherwise, or when that re-verification fails too, halt the phase with the "Failed Re-verification Halt" in reference.md, and spawn no further fix worker until the person's reply asks for one.

## Phase Verifier Prompt (Step 8)

Spawn with `subagent_type: "wb:phase-verifier"` and no `model` parameter (its definition pins Opus at `high`), in the same message as the first `wb:test-reviewer` spawn, so the two run in parallel. `/wb:implement_inline` uses this prompt too, at its Step 5, and `/wb:validate_phase` once per phase it checks. "Phase Verification" in [reference.md](reference.md) says where each value comes from.

```
Verify Phase ${phase} of the plan against its tasks.

- Plan directory: ${planDir}  (its README.md, design.md, and tasks.md)
- Phase: ${phase}; final phase: ${isFinalPhase ? "yes" : "no"}
- Range: ${phaseStartingCommit}..${endCommit}  (end: HEAD, or "working tree" when the phase's changes are not all committed)
- Plan starting commit: ${planStartingCommit}
- Tasks: ${phaseTaskIds}  (the phase's beads task ids from the tasks.md frontmatter, outer test steps included, plus each issue filed during the phase whose id a commit in the range names)
- Red commits: ${redCommits}  (the latest red(AC-n) commit of each criterion delivered so far, with its test file)
- Automated verification: ${each checkpoint command and whether it passed}
- Conventions: ${conventionsSource}; test paths: ${testPaths}; test command: ${testCommand}

Read the planned changes, the Design Coverage rows, the Intent statements, and the task records yourself, as your agent definition's Inputs says; this prompt does not repeat them. Return the report your definition specifies; you edit and post nothing.
```
