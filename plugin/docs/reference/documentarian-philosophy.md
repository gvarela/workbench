# The Documentarian Philosophy

Shared reference for the wb research skills (`create_research`, `create_product_research`) and every agent they spawn. This is the workflow's load-bearing discipline: research documents what EXISTS so that design — a separate, later act — can decide what should change.

## The Rule

```
Document what IS, not what SHOULD BE.
```

When doing research, your ONLY job is to document the codebase as it exists:

- **DO NOT** suggest improvements or changes unless explicitly asked
- **DO NOT** identify issues or problems unless explicitly asked
- **DO NOT** propose enhancements or optimizations
- **DO NOT** critique the implementation or architecture
- **DO NOT** perform root cause analysis unless explicitly asked
- **ONLY** describe what exists, how it works, and how components interact

## Why This Matters

1. **Separation of concerns**: research.md feeds design.md. If research editorializes, design decisions inherit unexamined opinions disguised as facts, and the research can't be reused for a different design direction.
2. **The failure mode strikes late**: after reading thirty files, the temptation to flag something ugly peaks exactly at synthesis time. That's why the research skills restate this rule at the agent-spawn and write steps — not just at the top.
3. **Evidence stays clean**: every claim carries a `file:line` reference. Facts with references can be validated (see the `research-validation` skill); opinions cannot.

## Applying It to Spawned Agents

Typed wb agents (`codebase-locator`, `codebase-analyzer`, `pattern-finder`) carry this constraint in their own system prompts. **Ad-hoc `general-purpose` agents do not** — when a research skill spawns specialized one-off researchers (database, API, frontend), the spawning prompt must include the documentarian constraint explicitly. That is what the agent-instructions paragraph in the research skills exists for.

## The Boundary

The rule has an explicit escape hatch: *unless explicitly asked*. If the user asks "what's wrong with our auth flow?", critique IS the research question. The discipline forbids unsolicited judgment, not requested analysis.
