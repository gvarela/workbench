# create_design — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## design.md Template

```markdown
---
project: [from existing frontmatter]
ticket: [from existing frontmatter]
created: [from existing frontmatter]
status: draft
last_updated: [YYYY-MM-DD]
depends_on: research.md
design_approach: [selected option name]
---

# Design: [Feature/Task Name]

## Problem Statement

[Clear articulation of the problem we're solving and why it matters]

### Success Metrics
- [Measurable outcome] (refines: "[Intent success statement]")
- [Measurable outcome] (refines: "[Intent success statement]")
- Deferred: "[Intent success statement]" — [reason], or "none"

## Design Approach

[High-level description of the chosen solution approach]

### Why This Approach
- [Rationale for choosing this over alternatives]
- [How it aligns with existing patterns from research]
- [How it addresses the core problem]
- [Precedents from agent findings]

## Technical Decisions

### Architecture
- [Key architectural decision 1]
  - Rationale: [Why this choice]
  - Trade-off: [What we're giving up]
  - Pattern reference: [file:line from research]

### Data Model
- [Data structure/schema decisions]
- [State management approach]
- [Data flow design]

### Integration Points
- [How this integrates with existing systems]
- [API contracts or interfaces]
- [Dependencies on other components]

## Scope Definition

### In Scope
- [Specific feature/capability 1]
- [Specific feature/capability 2]
- [Specific feature/capability 3]

### Out of Scope
- [What we explicitly won't do]
- [Features deferred to later]
- [Problems we're not solving]

## Success Criteria

### Functional Requirements
- [ ] [User-facing capability 1]
- [ ] [User-facing capability 2]
- [ ] [System behavior 1]

### Non-Functional Requirements
- [ ] Performance: [Specific metric]
- [ ] Reliability: [Specific metric]
- [ ] Security: [Specific requirement]

## Risk Analysis

### Technical Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Strategy] |

### Assumptions

Based on knowledge gaps from research - track in beads to ensure validation:

| Assumption | Beads ID | Validated? |
|------------|----------|------------|
| [gap 1] works as [description] | `[id]` | Pending |
| [gap 2] can be resolved by [approach] | `[id]` | Pending |

```bash
# Create beads issues for assumptions that need validation:
bd create "Validate: [assumption]" --type=task --priority=2 \
  -d "Assumption from design. If wrong: [impact]"
```

## Rejected Alternatives

### Option: [Alternative Approach Name]

- **Approach**: [What it would have done]
- **Rejected because**: [Specific reasons]
- **Trade-offs**: [What we would have gained/lost]

## Pending Decisions

Design decisions that need stakeholder input - track in beads:

| Decision Needed | Beads ID | Blocks |
|-----------------|----------|--------|
| [What needs to be decided] | `[id]` | [phase or "execution start"] |
| [Options and trade-offs] | `[id]` | [what can't proceed] |

```bash
# Create beads issues for pending decisions:
bd create "Decide: [brief decision]" --type=task --priority=1 \
  -d "Options: [A, B, C]. Trade-offs: [summary]. Blocks: [what]"
```

Note: Decisions blocking execution should be resolved before `/create_tasks`.

## References

- Research: [research.md](research.md)
- Related designs: [if any]
- External docs: [if any]

```
