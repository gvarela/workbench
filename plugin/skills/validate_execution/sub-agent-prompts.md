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
  description: "Verify test coverage",
  prompt: `Verify that all tests specified in the plan were implemented.

  From tasks.md, these tests were required:
  [List test requirements]

  Check:
  - Do all specified tests exist?
  - Do they test the right scenarios?
  - Are there gaps in coverage?
  - Do all tests pass?

  Run test commands and analyze coverage.
  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "general-purpose",
  model: "sonnet"
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
