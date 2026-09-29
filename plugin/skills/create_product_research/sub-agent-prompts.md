# create_product_research — Sub-Agent Prompts

Read the relevant section in full when its step directs you here; match its structure exactly.

## Component Locator (Step 4)

```javascript
Task({
  description: "Find [feature] components",
  prompt: `Find all files related to [feature].

  Search for:
  - Source files implementing [feature]
  - Test files for [feature]
  - Configuration files
  - UI components, routes, API endpoints
  - Related documentation

  Focus on [specific directories if known].
  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:codebase-locator",
  model: "haiku"
})
```

## Product Behavior Analyzer (Step 4)

```javascript
Task({
  description: "Analyze [feature] product behaviors",
  prompt: `Audience: product manager. Understand what [feature] does from a product perspective.

  Analyze:
  - What user-visible behaviors does this feature provide?
  - What are the user flows (step by step, in plain language)?
  - What data does the user provide, and what do they see?
  - What happens when things go wrong (error states)?
  - What configuration controls this feature's behavior?

  Start with [specific files if known].

  Constraints:
  - Explain PRODUCT BEHAVIORS for a product manager, not code implementation.
  - Document what exists; no suggestions or issues.
  - Include file:line references for every behavioral claim, traced from actual code.
  - DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:codebase-analyzer",
  model: "sonnet"
})
```

## Pattern Finder (Step 4)

```javascript
Task({
  description: "Find engineering patterns and conventions",
  prompt: `Identify coding patterns and engineering conventions in the codebase.

  Find:
  - Naming conventions used
  - Architecture patterns (MVC, microservices, etc.)
  - How similar features are typically built
  - Testing approach and coverage patterns
  - Error handling conventions
  - Configuration management approach

  Summarize at a HIGH LEVEL suitable for a product manager to understand the engineering approach, not the engineering details.

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "wb:pattern-finder",
  model: "haiku"
})
```

## Validation Agent (Step 7)

```javascript
Task({
  description: "Validate product research document",
  prompt: `Validate the research document at [project-dir]/product-research.md against the actual codebase.

  Read the document fully, then check:
  1. All file paths mentioned exist
  2. All code snippets match actual file content
  3. All behavioral claims ("when X, system does Y") can be traced through code
  4. All pattern claims are accurate

  Return a structured validation report with PASS/FAIL/UNCERTAIN per claim.
  DO NOT modify the document. Only report findings.`,
  subagent_type: "wb:research-validator",
  model: "sonnet"
})
```
