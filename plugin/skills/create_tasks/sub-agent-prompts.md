# create_tasks — Sub-Agent Prompts

Read the relevant section in full when its step directs you here; match its structure exactly.

## Analysis Agent Prompts (Step 2)

```javascript
// Spawn analysis agents in parallel - all are read-only
Task({
  description: "Analyze file dependencies",
  prompt: `Analyze dependencies for implementing the design.

  From research.md:
  - Current file structure: [key files]
  - Integration points: [systems]

  From design.md:
  - Target architecture: [approach]
  - Components to build: [list]

  Determine:
  - Build order (what must be done first)
  - Parallel work opportunities
  - Critical path dependencies
  - External dependencies needed

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:codebase-analyzer",
  model: "sonnet"
})

Task({
  description: "Identify test coverage needs",
  prompt: `Identify testing requirements for the implementation.

  From design.md:
  - Acceptance Criteria: [each AC-n with its Observed at and Examples]
  - Harness Decisions: [table]
  - Risk areas: [risks]

  From research.md:
  - Testing Conventions: [frameworks, commands, harness per boundary]

  For each acceptance criterion, determine:
  - The boundary it is observed at, whether a harness is present there (per Testing Conventions), and where an outer test at that boundary belongs in the existing test layout
  - The inner cases its Examples imply, with the file:line of the code each exercises
  - Fixtures or factories the existing tests already offer for it

  Do not propose a separate unit or integration test list; the criteria drive the tests.

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:codebase-analyzer",
  model: "sonnet"
})

Task({
  description: "Find similar implementation patterns",
  prompt: `Find examples of similar implementations in the codebase.

  From design.md:
  - Type of change: [type]
  - Components affected: [components]

  Search for:
  - Similar features already implemented
  - Phased rollout patterns used
  - Testing approaches for similar changes
  - Configuration patterns to follow

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:pattern-finder",
  model: "sonnet"
})
```
