# resume_handoff — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## Resumption Report Template

The user decides the next step from this report, so each item follows [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md): an active blocker or unfinished task comes first, named in plain words with its id in parentheses, with what it puts at risk and what the user needs to do.

```
✅ Successfully resumed from handoff

Needs your decision:
- [each active blocker or unfinished task: what it is] ([id]): [what it puts at risk]. [What you need to do: the options and a recommendation, or "nothing; the next step below continues it"]
- [or "Nothing needs your decision"]

Handoff Summary:
- Created: [date/time from handoff]
- Previous Session: [duration] with [model]
- Tasks Completed: [X]/[Y]
- Current Phase: [N] - [name]

Key Context Restored:
- [Critical learning 1]
- [Critical learning 2]

Current State:
- Git: [branch] at [commit]
- Uncommitted changes: [YES/NO]
- Tests: [PASSING/FAILING]
- Beads: [N] open, [M] in_progress, [X] closed
- Active phase: [phase name] ([phase-id]) or "none"

Next step from the handoff:
[Next immediate task from handoff, in plain words, with its id in parentheses]

Approach the handoff recommends (context for the next stage):
[Recommended approach from handoff]

Watch for:
- [Gotcha 1 from handoff]
- [Gotcha 2 from handoff]

Context is restored and nothing has been started. Implementation goes through the stage skill that enforces its discipline, and you decide when to begin. To continue, run:

  [exact command, e.g. /wb:implement <plan-dir> <phase>]
```
