# create_design — Sub-Agent Prompts

Read the relevant section in full when its step directs you here; match its structure exactly.

## Step 2 Agent Prompts

### Verify Design Patterns

```javascript
Task({
  description: "Verify design patterns",
  prompt: `Based on the research findings, identify architectural patterns we should follow.

  From research.md:
  - [Key patterns found in research]
  - [Conventions observed]
  - [Integration points]

  Find:
  - Similar features already implemented
  - Patterns we should follow for consistency
  - Anti-patterns to avoid

  Document what exists, do not evaluate quality.
  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:pattern-finder",
  model: "haiku"
})
```

### Analyze Integration Points

```javascript
Task({
  description: "Analyze integration points",
  prompt: `Analyze how our design will integrate with existing systems.

  From research.md:
  - [Current architecture]
  - [Integration patterns]

  Identify:
  - Required integration points
  - API contracts we must respect
  - Dependencies we'll have
  - Potential conflicts

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:codebase-analyzer",
  model: "sonnet"
})
```

### Find Risk Precedents

```javascript
Task({
  description: "Find risk precedents",
  prompt: `Search for similar changes in the codebase history.

  Look for:
  - Previous similar implementations
  - Issues encountered
  - Solutions that worked
  - Patterns that failed

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:pattern-finder",
  model: "haiku"
})
```
