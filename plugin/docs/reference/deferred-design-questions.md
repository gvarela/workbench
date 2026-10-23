# Deferred Design Questions

Shared reference for the reports that close a plan: implement's final-phase checkpoint and Phase Completion Report, implement_inline's final checkpoint and Phase Completion Report, and validate_execution's report.

create_design puts each of a plan's open questions to the user. One the user defers stays open with a named owner, and design.md records what the plan assumes until it is answered. The plan then ships on that assumption, so the closing reports list each such question still open; otherwise nothing raises it again.

## Finding them

Take the `Q:` and `Decide:` ids from design.md's Assumptions and Pending Decisions tables, run `bd show [id]` for each, and keep the open ones. The owner comes from the row's Owner column, or is "no owner named" when design.md has no Owner column (a design written before the column existed).

## Where they go

Each one is a line under Follow-ups → Product and plan:

```
- Deferred design question, still open: [the question in plain words] ([id]), owner [owner, or "no owner named"]. The plan assumed [assumption]; if that is wrong, [what is at risk]. Recommendation: [answer it now, or leave it with the owner], because [reason]. Blocks: no.
```

It moves to Needs your decision, in the full decision form of [writing-for-the-user.md](writing-for-the-user.md), only when evidence from this work shows the assumption was wrong, or the question blocks the release (at a phase checkpoint: blocks that phase). An open deferred question alone does not block: the user already chose to defer it. A checkpoint before the final phase lists one only when it blocks that phase.

## When the user answers one

The reply form is `[id]: answer: <answer>`. Close the issue with the answer as the reason, naming the plan directory ([plan-dir-name], its name, for example `2025-01-08-my-project`) and the stage (`implement`, `implement_inline`, or `validate_execution`):

```bash
bd close [id] --reason "[answer] ([plan-dir-name], [stage])"
```

If the answer contradicts what the plan assumed, list it under Follow-ups → Product and plan as a plan defect: what the plan assumed, what the answer says, and what must change (the design.md decision, the tasks, or the code), with whether it blocks and when to do it.
