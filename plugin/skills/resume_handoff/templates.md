# resume_handoff — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## Resumption Report Template

```
✅ Successfully resumed from handoff

Handoff Summary:
- Created: [date/time from handoff]
- Previous Session: [duration] with [model]
- Tasks Completed: [X]/[Y]
- Current Phase: [N] - [name]

Key Context Restored:
- [Critical learning 1]
- [Critical learning 2]
- [Active blocker if any]

Current State:
- Git: [branch] at [commit]
- Uncommitted changes: [YES/NO]
- Tests: [PASSING/FAILING]
- Beads: [N] open, [M] in_progress, [X] closed
- Active phase: [phase-id] or "none"

Next step from the handoff:
[Next immediate task from handoff]

Approach the handoff recommends (context for the next stage):
[Recommended approach from handoff]

Watch for:
- [Gotcha 1 from handoff]
- [Gotcha 2 from handoff]

Context is restored and nothing has been started. Implementation goes through the stage skill that enforces its discipline, and you decide when to begin. To continue, run:

  [exact command, e.g. /wb:implement <plan-dir> <phase>]
```
