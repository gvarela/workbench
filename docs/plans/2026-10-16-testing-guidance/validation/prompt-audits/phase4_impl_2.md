# Prompt audit: phase4_impl_2 (task-worker never edits tests)

- **Task**: `prompts-ah90`, update `plugin/agents/task-worker.md` per tasks.md Phase 4 Changes Required 2 (design D4)
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/agents/task-worker.md`
- **Base commit**: `ec0c929` (the change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: the lines this task changed in `plugin/agents/task-worker.md` (`git diff HEAD`: `tools:` line 4, RED step line 19, the new Constraints item, Expected Output item 7), read in the context of the whole file. Read alongside for conflicts: the preloaded `plugin/skills/tdd-discipline/SKILL.md` and the callee `plugin/agents/test-writer.md`. Neither is edited here.
- **Target model**: Claude Sonnet 5.5. task-worker is spawned per task with a model override, and Sonnet is the default tier. Frontmatter `effort: medium`.
- **Surface type**: coding-agent configuration (one subagent definition plus its preloaded skill). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: design.md D2 (harness tasks and the can-fail proof), D3 (test-writer), D4 (task-worker), D5 (tdd-discipline). tasks.md Phase 5 line 828 (the context package gains the cited criteria with example, observed-at, and seam).
- **Load-bearing (keep-list)**: `tools:` including `Agent` (static check 4); `skills: [tdd-discipline]`; "fresh foreground spawn" (design relies on documented foreground nesting, depth 2); closing the bead as the last act; the reason "The verifier trusts a test only when someone other than the code's author wrote it."
- **Provenance**: every changed line is this task's (uncommitted). The Constraints block's caps labels predate it.

## Summary

The change carries D4 faithfully, but its request to `wb:test-writer` was under-specified against the callee's contract. test-writer's Inputs name the criterion's id, text, example, observed-at boundary, and seam, the target test file, the earlier reports, and the caller; the worker's text supplied only the earlier reports. Sonnet 5.5 follows the written brief literally, so the seam (which test-quality uses to judge doubles) and the observed-at level would be left out, and the test-writer would have to guess its mode. RED now lists every input. Second, only the "not red yet" outcome had a path: any other blocked report, or a test that passes before code is written, left the worker without instructions, the situation in which a worker is most tempted to touch the test itself. Both now route to the existing blocker handling. Third, tdd-discipline's harness exception (a deliberately wrong expectation, then restore) is a test edit, which the new constraint forbids without saying so. The constraint now names it.

Counts per group:

- Group 1 (dated prompt text): 0 high, 0 medium, 2 low
- Group 2 (brittle skill and configuration files): 1 high, 2 medium, 3 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 1 high, 2 medium, 5 low (flag).

## Specific checks

- **(a) Style**: every item in the Constraints block (lines 30-36) uses a caps label (ZERO SCOPE CREEP, FOLLOW-UPS, NOT FIXES, SURGICAL EDITS, FOLLOW PATTERNS, ONE TASK ONLY, DO NOT COMMIT). The new item's **NEVER EDIT TESTS** label follows the file's own pattern, so it is not a finding to apply. The body is in plain case and carries its reason. The label's three-fold "never" is recorded as low finding 7.
- **(b) Contract with test-writer.md**: before, the request supplied only the earlier reports (finding 1). After, RED names criterion id, text, example, observed-at boundary, seam, target test file, earlier reports, and the caller (task-worker, inner mode). The "not red yet" handoff matches test-writer:32 (worker adds only the stub, then asks for a re-run). Other blocked outcomes now have a path (finding 2). The outer-test rule matches test-writer:38 (same `red(<criterion id>)` identifier; the worker reports a blocker, the test-writer declines and records it). Expected Output item 7 carries the reports verbatim.
- **(c) Group 2 against tdd-discipline**: RED (tdd-discipline:29-38) reads "Write one minimal test", then "Under /wb:implement and /wb:implement_inline, have wb:test-writer write the test": the worker runs under /wb:implement, so the two agree. The stub remedy (tdd-discipline:36) maps to the worker, which owns production code; test-writer:32 says the same. The Iron Law and the "test passes immediately" red flag agree with finding 2's blocker path. The one real conflict was the harness exception (tdd-discipline:64), resolved in task-worker by finding 3. An optional tdd-discipline diff is proposed below for the coordinator; it is not required for consistency.
- **(d) Static check 3**: every spawn mention uses `wb:test-writer`. Check 3 passes (see Re-run).
- **(e) Project-agnostic**: no plan, fixture, repository, AC, phase, or `prompts-` references. `red(<criterion id>)` is the plugin's commit convention (create_tasks/templates.md), shared with test-writer.md.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `task-worker.md:19,34` (before) against `test-writer.md:14-21` | "request a failing inner test from `wb:test-writer`"; "carrying the task's earlier `wb:test-writer` reports" vs Inputs: criterion id, text, example, observed-at boundary, seam; target test file; earlier reports; caller | Group 2, contract narrower than its consumer's inputs | Both files are in the project and always meet at this call. The callee needs the seam to judge doubles and the observed-at level to place the test, and picks its mode by caller. Sonnet 5.5 sends what the brief names | High | `rewrite` (applied): RED now says "The request names the criterion (its id, text, example, observed-at boundary, and seam, from your task and context package), the target test file, the task's earlier `wb:test-writer` reports, and you as the caller: a task-worker, so it works in inner mode." The constraint now points at "the request described in RED" instead of restating part of it |
| 2 | `task-worker.md:19` (before) against `test-writer.md:28,34,38,52` and `tdd-discipline:80` | Only "If the report says 'not red yet' …" was handled | Group 2, unhandled outcome of a callee's status field | test-writer reports blocked for reasons other than a load error (no behavior to pin, a declined request), and a pass is tdd-discipline's "test passes immediately" red flag. With no path, a worker forbidden to edit tests has no defined move | Medium | `add` (applied): "Any other blocked report, or a test that passes before you write code, is a blocker: leave the task `in_progress` and return the report." |
| 3 | `task-worker.md:34` against `tdd-discipline/SKILL.md:64`, design D2 | "never create, edit, or delete test files" vs "Harness tasks: prove the harness by a deliberately wrong expectation failing on an assertion, then restore it" | Group 2, instruction files that contradict each other | The skill is preloaded into the worker. Under /wb:implement a harness task reaches a worker, and the can-fail proof is two test edits. Read together, the worker must either break the constraint or skip the proof. Neither side is weakened by naming the case | Medium | `rewrite` (applied): "never create, edit, or delete test files, a harness task's deliberately wrong expectation and its restoration included" |
| 4 | `test-writer.md:36` | "change it only if the criterion's example supports the change" | Group 2, gap in a file outside this task | A deliberately wrong expectation is not supported by any example, so test-writer may decline the harness proof that finding 3 routes to it. The worker then reports a blocker, which fails safe | Low | `flag`: when a phase next touches test-writer, allow the can-fail proof for a harness task explicitly |
| 5 | `task-worker.md:40` | "(3) tests added/modified" | Group 2, field whose author changed | The worker no longer writes tests, so a literal reading gives "none". Item 7 carries the authoritative list, and the verifier checks the diff | Low | `flag` (no edit) |
| 6 | `task-worker.md:19-20` | RED ends "then write the code"; GREEN is "minimal implementation to pass" | Group 1c, near-duplicate across steps | The overlap is the D4 wording and marks the hand-off from red to green; it does not disagree | Low | `flag` (no edit) |
| 7 | `task-worker.md:34` | "**NEVER EDIT TESTS**: never … Never ask …" | Group 1a, emphasis density | The caps label follows the block's pattern (check (a)), and the rule carries its reason. A positive label such as "TESTS COME FROM `wb:test-writer`" would read lighter | Low | `flag` (no edit) |
| 8 | `task-worker.md:3` | "Implements the single task it is given with strict TDD" | Group 3 split, trigger text | The description is routing text for the coordinator and remains accurate | Low | `flag` (no edit) |

## Proposed tdd-discipline diff (optional, for the coordinator)

Not applied: tdd-discipline is outside this task's files. With finding 3 applied, the worker reads the two files consistently, so this is alignment only. It extends line 38's routing to the harness exception, for implement_inline as well:

```diff
-- Harness tasks: prove the harness by a deliberately wrong expectation failing on an assertion, then restore it
+- Harness tasks: prove the harness by a deliberately wrong expectation failing on an assertion, then restore it (under /wb:implement and /wb:implement_inline, wb:test-writer makes both test edits)
```

It pairs with finding 4, since test-writer would need to accept that request.

## Dispositions

- **1 (high)**: applied. The callee's Inputs list governs, since it is the contract the worker calls into. The partial restatement in the constraint now points at RED, so the inputs are stated once.
- **2 (medium)**: applied. Uses the file's existing blocker handling (leave `in_progress`, return the error details).
- **3 (medium)**: applied in task-worker. This is the Group 2 conflict; it is resolved, not declined. The optional tdd-discipline diff above is for the coordinator to decide.
- **4-8 (low)**: recorded only; no edits.
- **Keep-list**: `tools:` still includes `Agent`; `skills`, `maxTurns`, and `effort` unchanged; "fresh foreground spawn", the verifier-trust reason, the outer-test rule, item 7 verbatim, and close-as-last-act all kept. The plan's target-state phrase "carrying the task's earlier test-writer reports" survives as a RED input, so the earlier reports are still sent with every request.

## Re-run

- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: check 3 passes. Check 4 fails only on `test-reviewer.md` and `test-auditor.md` missing (later tasks); it does not name task-worker. Check 17 fails only on phase4_impl_3 (`prompts-jz50`, task-verifier, edited in parallel), not on this task. Checks 2, 6, 11, 12, 13, and 15 fail on later-phase work.
- `./plugin/scripts/lint plugin/agents/task-worker.md docs/plans/2026-10-16-testing-guidance/validation/prompt-audits/phase4_impl_2.md`: both clean.
