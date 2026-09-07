# implement — Maintainer Notes

Human-facing rationale for this skill. Not loaded at invocation; the operative prompt is [SKILL.md](SKILL.md).

## Relationship to implement_inline

Both skills run the same plan (research.md, design.md, tasks.md, beads) with the same discipline: ⛔ BARRIER synchronization points, TDD cycle enforcement (Red → Green → Refactor), beads for ALL tracking, ZERO SCOPE CREEP, phase boundary verification, manual verification checkpoints, one commit per verified task. `implement` is the default execution path: the session coordinates and fresh-context workers implement, one task at a time, each verified. `implement_inline` runs the same plan inline on the session model. Coordinated was introduced as an evolution of inline; since 3.0.0 it is the recommended path and inline is the deliberate choice.

- **Coordinator Pattern**: Main agent orchestrates, workers implement in fresh context
- **Context Efficiency**: Main window stays clean, workers are ephemeral
- **Sequential Execution**: Simple, predictable, no coordination complexity
- **Fresh Context**: Each task starts with clean slate, no accumulation

## Why coordinated is the default

### Context Efficiency (PRIMARY BENEFIT)

**Inline** (`implement_inline`):

```
Main context grows: Research + Design + Task1 + Task2 + Task3 + ...
Token usage: Linear growth, can exhaust window, requires compaction
```

**Coordinated** (`implement`):

```
Main context: Research + Design + Coordination logic (stays constant)
Worker contexts: Minimal context per task (ephemeral, discarded after completion)
Token usage: Main stays constant, workers are isolated
```

**Result**: No context accumulation in main session, no need for compaction.

### Error Isolation

**Inline**: Error in Task 3 pollutes context for Tasks 4, 5, 6...

**Coordinated**: Error in Worker 3 isolated, doesn't affect Workers 4, 5, 6 — fresh start for each task, failures are localized.

### Model Selection

**Inline**: All tasks use the same model (usually sonnet).

**Coordinated**: Right model per task — haiku for mechanical config/docs only, sonnet (at `effort: xhigh`) for standard implementation including bugs and refactors (default when unsure), opus for architectural, cross-cutting, or previously-failed tasks. Cost optimization per task; verified failures escalate once to a fable fix worker.

## Choosing implement_inline

Use `implement_inline` when you want the work done in this session on the session model: a full-Fable run, a phase you intend to pair on, a repository where spawning workers is impractical, or when a task's context is the conversation itself. Nothing else changes: the same documents, the same beads configuration, the same checkpoints. Switch back with `/wb:implement`; the two produce the same result, and coordinated keeps the main session context clean.
