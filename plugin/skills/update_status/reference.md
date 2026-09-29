# update_status — Reference

Error catalogs and specs consulted at specific steps. Read the relevant section in full when its step directs you here; match its structure exactly.

## Error Handling Catalog

### Invalid Transitions

If user requests invalid transition:

```
⚠️ Invalid Status Transition

Cannot transition design.md from 'draft' to 'implementing' because:
- research.md is still in 'draft' status
- No beads task issues have been claimed or completed

Valid next steps:
1. Complete research first (/create_research)
2. Move design to 'ready' status once research is complete
3. Claim a task in beads (`bd update [task-id] --claim`) to begin implementing
```

### Missing Files

If files don't exist:

```
❌ Missing Documentation Files

Expected files in [directory]:
- research.md [✓/✗]
- design.md [✓/✗]
- tasks.md [✓/✗]

Run /create_project first to initialize the documentation structure.
```

### Inconsistent State

If files have conflicting status:

```
⚠️ Inconsistent Status Detected

Current state:
- design.md: implementing
- tasks.md: not-started (0 tasks completed)

This is inconsistent. Suggesting correction:
- Set design.md back to 'ready' OR
- Claim a task in beads (`bd update [task-id] --claim`) and begin work

Which would you prefer?
```
