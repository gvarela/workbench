# validate_execution — Sub-Agent Prompts

Read the relevant section in full when its step directs you here; match its structure exactly.

## Validation Agent Prompts (Step 2)

```javascript
// Spawn validation agents concurrently
Task({
  description: "Verify code changes",
  prompt: `Analyze all code changes to verify they match the execution plan.

  From tasks.md, these files should be modified:
  [List files from tasks.md]

  Check:
  - Were all listed files actually modified?
  - Do modifications match specified changes?
  - Are there unexpected modifications?
  - Were any planned changes missed?

  Use git diff to compare changes if needed.
  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:codebase-analyzer"
})

Task({
  description: "Review tests",
  prompt: `Review the tests this plan changed against the test-quality rubric.

  Starting commit: [parent of the plan's earliest task or red(AC-n) commit, per Step 2]
  Criteria with examples, observed-at, and seams: [from tasks.md]
  Red commits: [this plan's red(AC-n) commits in the range]
  Test-writer reports: [the reports from the plan tasks' comments, per Step 2, or "none recorded" with the reason]
  Conventions source: [research.md Testing Conventions]
  Mode: inline

  Do not edit any file in the working tree; planted defects go in a disposable worktree, as your definition says. Return your findings as a report.`,
  subagent_type: "wb:test-reviewer"
})

Task({
  description: "Check for regressions",
  prompt: `Verify no existing functionality was broken.

  Run comprehensive checks:
  - All existing tests still pass
  - Build succeeds without warnings
  - No performance degradation
  - No breaking changes to APIs

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "general-purpose",
  model: "haiku"
})

Task({
  description: "Analyze patterns and quality",
  prompt: `Verify implementation follows established patterns.

  From research.md, these patterns should be followed:
  [List patterns from research]

  Check:
  - Does new code follow existing patterns?
  - Are conventions maintained?
  - Is error handling consistent?
  - Are there any anti-patterns?

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:pattern-finder",
  model: "sonnet"
})
```
