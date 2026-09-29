# create_product_research — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## product-research.md Template

````markdown
---
project: [from existing frontmatter or research question]
created: [YYYY-MM-DD]
status: complete
audience: product
last_updated: [YYYY-MM-DD]
validation_status: not-yet-run
---

# Product Research: [Feature/Area Name]

**Created**: [YYYY-MM-DD]
**Last Updated**: [YYYY-MM-DD]
**Audience**: Product Management

## Feature Overview

[2-3 paragraph plain-language description of what this feature/area does. Written so a PM can understand the product capability without reading code.]

## User Flows

### [Flow Name] (e.g., "User Creates an Account")

1. User [action in plain language]
2. System [validates/processes/responds]
3. If [condition], then [outcome A]; otherwise [outcome B]
4. User sees [result]

**Success outcome**: [what the user experiences when everything works]
**Error outcomes**:

- [Error condition]: [what the user sees]
- [Error condition]: [what the user sees]

### [Additional flows...]

## Product Behaviors

### [Behavior Area]

| Trigger | What Happens | Configurable? |
|---------|-------------|---------------|
| [user action or event] | [system behavior in plain language] | [yes — setting name / no] |

### [Additional behavior areas...]

## Data & Integration

### What Data Is Involved

- **User provides**: [input data in business terms]
- **System stores**: [what's persisted and why]
- **User sees**: [output/display data]

### How It Connects to Other Features

- **[Feature/Service]**: [what the integration enables]
- **[External System]**: [what data flows between them]

### Configuration That Affects Behavior

| Setting | What It Controls | Default |
|---------|-----------------|---------|
| [setting name] | [plain-language description] | [value] |

## Engineering Approach

### Coding Patterns

- **[Pattern name]**: [1-sentence description of the convention]
  - Used in: [where this pattern appears]

### Architecture Style

- [High-level observation about how the codebase is organized]
- [Technology choices relevant to product decisions]

### Testing Approach

- [How this feature is tested — unit, integration, e2e]
- [Coverage level observation]

## Technical Appendix

### File References

**[Feature Area 1]**:

- `path/to/main/implementation/` — [what it handles in product terms]
- `path/to/tests/` — [test coverage for this area]

**[Feature Area 2]**:

- `path/to/files/` — [what it handles]

### Key Code (for engineering discussions)

```language
// From path/to/file.ext:NN-MM
// [Brief description of what this code does in product terms]
[actual code snippet]
```

### Validation Notes

[Any UNCERTAIN claims from validation that need human review]

- [Claim]: [What was verified, what needs manual check]

## Open Questions

Questions requiring resolution are tracked in beads:

```bash
bd create "Q: [your question]" --type=task --priority=2 \
  -d "Product research question. Context: [what this affects]"
```

**Active questions** — use `bd list --status=open` for current list.

## Next Steps

Based on the research findings:

1. [Area the findings did not cover that design will need answered, stated as a question about what exists]
2. [Another uncovered area, or omit]
3. Review with engineering team for accuracy
4. [Only when findings show multiple viable approaches: Consider `/wb:explore_design` to explore directions before design]
5. Run `/wb:create_design` when ready to make design decisions
````
