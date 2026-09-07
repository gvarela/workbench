# Subagent tool-call ceiling — finding and recommended skill changes

**Status**: finding documented, changes NOT yet made. Ready to pick up.
**Found**: 2026-08-19, during a long `/wb:implement_coordinated` run on an unrelated project
(`~/Development/Personal/fitness-agent`, 1A-ii increment).
**Affects**: `plugin/skills/implement` primarily; `plugin/skills/create_tasks`
secondarily.

## The finding

**Subagents are cut off at roughly 70 tool calls.** What that looks like from the coordinator's
side is a worker that stops mid-sentence, leaves its beads issue `in_progress`, and has landed
*part* of its task — source changes present, the finishing work missing.

Three workers "crashed" this way in one session before it was investigated. They had not crashed.
They ran out of budget.

### Evidence

Measured across **129 subagent transcripts** from a single session
(`~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl`, counting `tool_use` blocks):

| | |
| --- | --- |
| max tool calls, any agent | **70** |
| agents above 70 | **0** |
| the two confirmed truncations | **69 and 70** |
| highest confirmed success | **67** |
| median / p75 / p90 | 27 / 39 / 58 |
| agents reaching 68–70 | 5 of 129, all implementation workers |

With n=129 you would expect a tail past 70 if nothing were capping it. There is none.

Truncated transcripts end with `stop_reason: "tool_use"` — the model was mid-sequence and intended
to continue. Completed ones end with `end_turn`.

### Context exhaustion is ruled out

This is the obvious competing explanation and it does not hold. Peak context per agent, alongside
tool count:

- the worker truncated at **70 calls** held **92K tokens**
- a worker that **survived** at **68 calls** held **150K tokens**

Peak context observed anywhere was 150K, far below any limit. A worker died with less context than
one that lived. The binding constraint is the call budget.

### Reproducing the measurement

```python
import json, pathlib
D = pathlib.Path("~/.claude/projects/<project>/<session>/subagents").expanduser()
for f in D.glob("agent-*.jsonl"):
    n = 0
    for line in f.read_text().splitlines():
        try: r = json.loads(line)
        except Exception: continue
        c = (r.get("message") or {}).get("content")
        if isinstance(c, list):
            n += sum(1 for b in c if isinstance(b, dict) and b.get("type") == "tool_use")
    print(n, f.stem)
```

## Why it hits implementation workers specifically

`implement_inline` implements directly and is unaffected. The read-only research agents spawned by
`create_research` / `create_design` sit near the median (~27 calls) and are not at risk.

The exposure is `implement`'s `task-worker`, because a realistic implementation task
costs roughly:

| step | calls |
| --- | --- |
| read the files it must not break | 4–8 |
| discovery (`grep -rl` to find affected tests) | 3–6 |
| write source + migration | 4–10 |
| convert N test files | 1–2 each |
| run the suite (RED, GREEN, after refactor, final) | 3–5 |
| lint, round-trip verification, close the bead | 3–5 |

A task touching 8 test files clears 50 before any surprise. Two of ours reached 70.

**The ceiling truncates the *tail*.** The casualties were the envelope wiring, the last test-file
conversions, and the bead close — never the beginning. So the damage is always in the finishing
work, which is also the least visible.

## Defect 1 — the failure playbook recommends something that cannot work

`plugin/skills/implement/reference.md`, "Worker Failure Playbook (Step 6)" currently
says the worker "crashed or couldn't complete" and offers as **option 1**:

> 1. Retry worker with same context

Under truncation this is the one option guaranteed to fail: same task, same context, same budget,
truncating at the same point. It also frames the event as a *worker failure*, which sends the
coordinator looking for what the worker did wrong. It did nothing wrong.

**Recommended change**: distinguish the two cases, because the remedies are opposite.

- **Truncation** — bead `in_progress`, output cut mid-sentence, work *partially landed*, tail
  missing. Remedy: **finish directly**, or re-delegate only the remaining slice. Never retry whole.
- **Genuine failure** — little or nothing landed, worker reported a blocker. Remedy: retry with
  added context, or escalate. The existing options are right here.

A cheap discriminator for the coordinator: `git status` after the worker returns. Files changed but
the bead open means truncation, not failure.

## Defect 2 — task granularity is sized in the wrong unit

`plugin/skills/create_tasks/SKILL.md:368` sizes tasks as:

> **Sized**: 1-4 hours of work typically

Wall-clock does not predict truncation; **tool calls do**. A one-hour task touching 3 files is ~20
calls, and a one-hour task touching 12 files is ~80. No skill in the repo mentions tool calls at
all — `grep -rniE "tool call|budget|split the task"` across `plugin/skills/` returns nothing.

This is the upstream cause. The task that truncated was a perfectly reasonable *task* and an
unreasonable *delegation*.

**Recommended change**: add tool-call cost as a sizing dimension alongside time in `create_tasks`,
using the rough arithmetic above, plus a rule that a task projecting past ~50 calls should be split
at its natural seam — usually **source change** then **test conversion**, which are separately
verifiable anyway.

Also worth deciding: whether `create_execution`, which produces the task list a coordinator later
delegates from, should carry the same guidance. It is the skill that actually determines delegation
size, but `create_tasks` is where the granularity rule currently lives, so the two should agree
rather than duplicate (the repo's own NF1 instinct applies).

## Optional third change — prompt hygiene

Worth considering for `implement`'s worker prompt template: every `file:line` fact the
coordinator supplies is a Read the worker does not spend, and naming the files to change removes
the discovery sweep entirely. That is the cheapest lever — it converts coordinator context (which
is already loaded) into worker budget (which is scarce).

## Caveat before hardcoding anything

**70 was measured on one machine, one session, one model.** The signal is strong — 129 samples,
zero exceptions — but it has not been verified as a universal constant rather than a configurable
limit.

Write the guidance around the **observable symptom** (truncation mid-sequence with a partially
completed task) and the **remedy**, citing 70 as measured evidence rather than baking it in as a
constant. If it is configurable or changes between model versions, a hardcoded number ages badly
and the symptom-based guidance still holds.

## What already works and should be kept

The `task-worker` contract instructs the worker to **close its beads issue as its final action**.
That is precisely why every truncation surfaced as `in_progress` with a red suite rather than
looking finished. Without it, three partially-completed tasks would have been committed as done.

Whatever changes here, keep that.

## Repo state when this was written

`git status` showed pre-existing uncommitted changes not related to this finding
(`.claude/settings.local.json`, an untracked `.claude/worktrees/`). This document was added
without committing; the branch and commit decision is the maintainer's.
