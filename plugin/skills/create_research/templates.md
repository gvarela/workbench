# create_research — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## research.md Template (Step 6)

````markdown
---
project: [from existing frontmatter]
ticket: [from existing frontmatter]
created: [from existing frontmatter]
status: complete
last_updated: [YYYY-MM-DD]
---

# Research: [Project Name]

**Created**: [original date]
**Last Updated**: [YYYY-MM-DD]
**Ticket**: [ticket-reference or N/A]

## Research Question

[Original user query]

## Summary

[High-level documentation of what was found, answering the user's question by describing what exists - 2-3 paragraphs]

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**: [statement] — [which finding, one clause]
- **Statements the findings do not touch**: [statement], or "none"

(For a plan without an Intent section: "no Intent section (plan predates 3.0.0)".)

## Detailed Findings

### [Component/Area 1]

**Location**: `path/to/component/`

**What exists**:
- Description of current implementation ([`file.ext:123`](link))
- How it connects to other components
- Current implementation details (without evaluation)

**Key code**:
```language
// Actual code snippet from file.ext:123-145
// Showing how it currently works
```

**How it works**:

1. [Step-by-step explanation of current flow]
2. [With specific file:line references]
3. [Describing actual behavior]

### [Component/Area 2]

[Continue pattern...]

## Architecture Documentation

**Current patterns found**:

- Pattern 1: [Description of pattern and where used]
  - Example: `src/auth/validator.ts:45-67`
  - Example: `src/api/middleware.ts:23-30`

**Component connections**:

- [Component A] → [Component B]: [How they interact]
  - Entry point: `file1.ext:123`
  - Exit point: `file2.ext:456`

**Conventions observed**:

- Files are organized by [observed pattern]
- Naming follows [observed convention]
- Testing uses [observed approach]

## Code References

Quick reference list:

- `path/to/file1.ext:123` - Main entry point for X
- `path/to/file2.ext:45-67` - Core validation logic
- `path/to/file3.ext:89` - Database queries for Y
- `path/to/file4.ext:200-250` - Error handling implementation

## Similar Implementations

Existing patterns in the codebase that might be relevant:

**Example from `path/to/example.ext:100-120`**:

```language
// Code showing similar pattern already in use
```

This pattern is also used in:

- `other/file.ext:50` - For feature X
- `another/file.ext:75` - For feature Y

## Open Questions

Questions that require resolution before proceeding are tracked in beads, NOT in this document.

**To add a question**:

```bash
bd create "Q: [your question]" --type=task --priority=2 \
  -d "Research question. Blocks: [what can't proceed without this answer]"
# → Returns issue ID (e.g., prompts-abc)
```

**Active questions** (reference only, beads is source of truth):

Use `bd list --status=open` to see all open questions, or reference by ID:
- `[id]`: [Brief question summary] - blocks design decisions about [area]
- `[id]`: [Brief question summary] - blocks [what it blocks]

To see full question details: `bd show [id]`

## Next Steps

Based on the research findings:

1. [Suggested next action based on findings]
2. [Another logical next step]
3. Review the research document
4. [Only when findings show multiple viable approaches: Findings show multiple viable approaches — consider `/wb:explore_design` to explore directions before `/wb:create_design`.]
5. Run `/create_design` to create design decisions

````
