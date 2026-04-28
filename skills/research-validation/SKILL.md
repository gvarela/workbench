---
name: research-validation
description: Validates research documents against the actual codebase. Checks file paths exist, code snippets match, and behavioral claims are accurate. Use when "validate research", "check research accuracy", "verify research", or "is this research still accurate".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Research Validation

Re-validate any research document against the current codebase. Research goes stale as code changes — this skill checks whether documented claims are still accurate.

## When to Use

- Code has changed since research was written
- Before a planning session that depends on research
- When anyone questions whether documentation is still accurate
- After a refactor or major feature change
- Periodically, to keep research trustworthy

## The Process

### 1. Find the Research Document

Look for research documents in the specified or current project directory:

- `product-research.md` (PM-focused research)
- `research.md` (engineering-focused research)

If both exist, validate whichever the user specifies. If unspecified, validate both.

### 2. Parse Verifiable Claims

Extract from the document:

- **File paths**: Every `path/to/file.ext` reference
- **Code snippets**: Every fenced code block with a source location
- **Behavioral claims**: Every "when X, system does Y" statement
- **Pattern claims**: Every "the codebase uses X pattern" statement

### 3. Run Validation

Spawn a `research-validator` agent to check all claims:

```javascript
Agent({
  description: "Validate research document",
  prompt: `Validate this research document against the actual codebase.

  Document path: [path]
  Document content:
  [full document text]

  Check every verifiable claim:
  1. File paths exist
  2. Code snippets match actual files
  3. Behavioral claims trace through code
  4. Pattern claims are accurate

  Return structured PASS/FAIL report.`,
  subagent_type: "research-validator",
  model: "sonnet"
})
```

If agent spawning is not available, perform validation directly:

**Path checks**:

```bash
# For each file path in the document
test -f "path/to/file.ext" && echo "PASS" || echo "FAIL"
```

**Snippet checks**:

- Read each referenced file
- Compare quoted content to actual content at stated lines

**Behavioral checks**:

- Grep for key functions/handlers mentioned in claims
- Read the code path to verify described behavior
- Mark UNCERTAIN if trace is incomplete

### 4. Update Document

Update the `validation_status` field in the document's frontmatter:

- `passed` — all claims verified
- `passed_with_warnings` — some STALE or UNCERTAIN items
- `failed` — inaccurate claims found

Add or update `last_validated: [YYYY-MM-DD]` in frontmatter.

### 5. Report Results

```
## Research Validation: [document name]

**Status**: [PASS / PASS WITH WARNINGS / FAIL]
**Checked**: [date]

### Results
- Paths: N/M exist
- Snippets: N/M match
- Behaviors: N/M verified, K uncertain
- Patterns: N/M confirmed

### Issues Found
[List any FAIL or STALE items with what changed]

### Action Needed
[What to update in the document, if anything]
```

## If Validation Fails

Don't silently update the document. Report to the user:

1. What claims are now inaccurate
2. What changed in the code (if determinable)
3. Whether the document needs a minor update or full re-research
4. Suggest running `/wb:create_product_research` or `/wb:create_research` to regenerate if too many claims are stale
