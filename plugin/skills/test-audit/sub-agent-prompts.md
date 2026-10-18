# test-audit — Sub-Agent Prompts

Read the relevant section in full when Step 5 directs you here; match its structure exactly. Neither prompt passes a `model` parameter, because the auditor's definition pins Opus at `high` effort.

## Area audit (Step 5)

One spawn per area, all in the same turn.

```javascript
Task({
  description: "Audit tests: [area name]",
  prompt: `Audit the tests in this area against the test-quality rubric, cold.

  Area: [the area's paths]
  Depth: [top N | full]
  Ranked candidates, most suspicious first (at top N, inspect these and do not sweep the rest of the area; at full, read them first, then every other test):
  1. [file:line] - [test name] - signals: [the detector rules, heuristics, churn, or size that ranked it]
  Stack and conventions: [stack, test commands, harness per boundary, seams, data shapes, skip markers] (source: [the plan's research | .claude/wb/testing.md | detection, with what was inferred])
  Team decisions (from .claude/wb/testing.md, or "no profile"): Choices: [each with its reason]; Planned, not installed, so treat as absent: [entries]; Open: [entries]
  Detector output for this area:
  - Tools run: [tools and explicit selections, and how caches were handled]
  - Violations: [each violation in the area's files, with tool, rule, and file:line, or "none"]
  - Available but not enabled: [rules]
  - No detector in this stack: [categories]
  Custom heuristic hits for this area: [each hit with its heuristic and file:line, or "none"]

  Do not edit, delete, or create anything in the repository, and do not run the suite or the detectors, as your definition says. Return your report.`,
  subagent_type: "wb:test-auditor"
})
```

## Candidates (Step 5)

The second judgment gets every candidate from one area's report; the third gets only the candidates the first two judgments split on. Give the candidates without the first auditor's reasoning, so each judgment is independent.

```javascript
Task({
  description: "Judge candidates: [area name]",
  prompt: `Judge these majority candidates from an earlier audit of this area.

  Area: [the area's paths]
  Stack and conventions: [as in the area audit] (source: [source])
  Candidates:
  - [file:line] - rubric item: [Part 1 item, or Part 2 property and item] - proposed verdict: [Remove | Rewrite]

  Do not edit, delete, or create anything in the repository. Return one line per candidate.`,
  subagent_type: "wb:test-auditor"
})
```
