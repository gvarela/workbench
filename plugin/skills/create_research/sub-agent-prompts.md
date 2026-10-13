# create_research — Sub-Agent Prompts

Read the relevant section in full when its step directs you here; match its structure exactly.

## Agent 1: Component Locator (Step 4)

```javascript
Task({
  description: "Find [feature] components",
  prompt: `Find all files related to [feature].

  Search for:
  - Source files implementing [feature]
  - Test files for [feature]
  - Configuration files
  - Related documentation

  Focus on [specific directories if known].
  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:codebase-locator",
  model: "haiku"
})
```

## Agent 2: Implementation Analyzer (Step 4)

```javascript
Task({
  description: "Analyze [feature] implementation",
  prompt: `Understand how [feature] works.

  Analyze:
  - Entry points and main functions
  - Data flow through the system
  - Key algorithms and logic
  - Error handling approaches

  Start with [specific files if known].

  Constraints:
  - Document what exists, with file:line references; no suggestions or issues.
  - DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:codebase-analyzer",
  model: "sonnet"
})
```

## Agent 3: Pattern Finder (Step 4)

```javascript
Task({
  description: "Find [pattern] examples",
  prompt: `Identify [pattern type] in the codebase.

  Find:
  - Similar implementations to [feature]
  - Naming conventions for [component type]
  - Common patterns for [functionality]
  - Testing approaches for [feature type]

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:pattern-finder",
  model: "sonnet"
})
```

## Additional Specialized Agents (Step 4)

Additional specialized agents based on research focus:

- Database schema investigation
- API endpoint analysis
- Frontend component exploration
- Configuration and environment analysis
- Testing pattern discovery
