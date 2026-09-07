# implement — Maintainer Notes

Human-facing rationale for this skill. Not loaded at invocation; the operative prompt is [SKILL.md](SKILL.md).

## Evolution from implement_inline

This command evolves the original `implement_inline` with one key improvement:

- **Coordinator Pattern**: Main agent orchestrates, workers implement in fresh context
- **Context Efficiency**: Main window stays clean, workers are ephemeral
- **Sequential Execution**: Simple, predictable, no coordination complexity
- **Fresh Context**: Each task starts with clean slate, no accumulation

All learnings preserved: ⛔ BARRIER synchronization points, TDD cycle enforcement (Red → Green → Refactor), beads for ALL tracking, ZERO SCOPE CREEP discipline, phase boundary verification, manual verification checkpoints.

## Advantages Over Sequential Implementation

### Context Efficiency (PRIMARY BENEFIT)

**Sequential** (`implement_inline`):

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

**Sequential**: Error in Task 3 pollutes context for Tasks 4, 5, 6...

**Coordinated**: Error in Worker 3 isolated, doesn't affect Workers 4, 5, 6 — fresh start for each task, failures are localized.

### Model Selection

**Sequential**: All tasks use the same model (usually sonnet).

**Coordinated**: Right model per task — haiku for mechanical config/docs only, sonnet (at `effort: xhigh`) for standard implementation including bugs and refactors (default when unsure), opus for architectural, cross-cutting, or previously-failed tasks. Cost optimization per task; verified failures escalate once to a fable fix worker.

## Migration from implement_inline

1. **No changes needed to documentation structure** (research.md, design.md, tasks.md)
2. **No changes needed to beads configuration** (epic, milestones, tasks)
3. **Switch command**: Use `/wb:implement` instead of `/wb:implement_inline`

Both commands produce identical results. The coordinated version just keeps main session context clean.
