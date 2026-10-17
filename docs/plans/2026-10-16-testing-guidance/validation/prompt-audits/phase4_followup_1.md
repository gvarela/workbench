# Prompt audit: phase4_followup_1 (harness can-fail proof routed through test-writer)

- **Task**: `prompts-k87u`, follow-up to phase4_impl_2 findings 4 and 5 and its optional tdd-discipline diff
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/agents/test-writer.md plugin/skills/tdd-discipline/SKILL.md plugin/agents/task-worker.md`
- **Base commit**: `c3e0b7c` (the change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: the lines changed since HEAD in the three files (`git diff HEAD`): test-writer.md line 38 (the harness exception), tdd-discipline/SKILL.md line 64 (the harness exception routed to wb:test-writer), task-worker.md line 40 (Expected Output item 3). Each is read in the context of its whole file. `plugin/agents/task-verifier.md` is excluded (parallel task, own audit).
- **Target models**: test-writer, Claude Sonnet 5.5 at `effort: medium` (its frontmatter). task-worker, Claude Sonnet 5.5 at `effort: medium`. tdd-discipline, Claude Sonnet 5.5 (preloaded into task-worker), and also a background skill in Opus sessions.
- **Surface type**: coding-agent configuration (two subagent definitions, one skill). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: design.md D2 (harness tasks; proof is a smoke test on existing behavior, shown to fail on a deliberately wrong expectation, then restored), D3, D4, D5. Also read: create_tasks/templates.md:111-114 and create_tasks/examples.md:43-47 (a harness task is done "when a smoke test on an existing endpoint fails with a deliberately wrong expectation and passes once restored").
- **Keep-list**: test-writer frontmatter unchanged; tdd-discipline at or under 94 lines (93 before and after); the Iron Law and named-exceptions list; task-worker's "fresh foreground spawn", verifier-trust reason, outer-test rule, item 7 verbatim, close as last act.

## Summary

The three edits agree with each other on who makes the harness edits, but the end-to-end flow had two breaks that a literal Sonnet reader would hit. First, task-worker's RED step treats "a test that passes before you write code" as a blocker and has no harness branch, while the harness proof ends, by design, in a passing smoke test on existing behavior. A worker reading its own process would report the successful proof as a blocker. Second, test-writer's exception presumed a criterion and an existing test: its Inputs, inner-mode brief rule ("restate the behavior … from the criterion's example") and report's Criterion id field all assume a criterion that a harness task does not have, and its restored-run clause ("or fail only for behavior not yet built") admitted a result D2 does not. Both files now say what stands in for the criterion (the boundary and an existing behavior) and that the restored run must pass.

Counts per group:

- Group 1 (dated prompt text): 0
- Group 2 (brittle skill and configuration files): 0 high, 3 medium, 3 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 3 medium, 3 low (flag).

## Specific checks

- **(a) Harness flow end to end**:
  1. tdd-discipline:64 names harness tasks as an exception and routes both test edits to wb:test-writer under /wb:implement and /wb:implement_inline. A Sonnet reader can follow it. The Red Flags line "Test passes immediately" is scoped by line 85 ("Outside the named exceptions"), so it does not block the restored pass.
  2. task-worker:34 forbids the worker the two edits and sends them to wb:test-writer (consistent with step 1). task-worker:19 had no harness path and its pass-before-code blocker fired on the restored run (finding 1, applied).
  3. test-writer:38 now overrides line 36's "only if the criterion's example supports the change" explicitly ("no example supports"), so the can-fail request is no longer declinable on that ground. Its criterion-shaped inputs and the restored-run hedge were the remaining blocks (findings 2 and 3, applied). Outer-mode line 28 ("or passes, stop and report blocked") does not apply: the exception sits in inner mode, and a harness task precedes the first outer test at its boundary.
  4. The worker reads the report: task-worker now says what a good report shows (assertion failure on the wrong expectation, pass once restored). Item 7 carries the report verbatim and item 3 now derives from it.
- **(b) Agreement with D2**: D2 and create_tasks describe a smoke test on existing behavior that fails on a deliberately wrong expectation and passes once restored. test-writer's restored run now must pass (finding 3); task-worker expects the same. Red as an assertion failure, and infrastructure failure as blocked, both hold (test-writer:12 and the new "report blocked with the output").
- **(c) Project-agnostic**: no plan, fixture, label, phase, AC, or `prompts-` references in any of the three files. `red(<criterion id>)` is the plugin's own commit convention.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `task-worker.md:19` against `tdd-discipline/SKILL.md:64` and `test-writer.md:38` | "Any other blocked report, or a test that passes before you write code, is a blocker" (no harness branch) | Group 2, instruction files that contradict each other at a hand-off | A harness proof ends in a passing smoke test on existing behavior, and the worker's only written path for a pass is "blocker". The worker's request template also names a criterion the harness task does not have | Medium | `add` (applied): "A harness task is a named exception to red-first: set up the harness, then ask `wb:test-writer` to prove it can fail, naming the boundary and an existing behavior to smoke-test in place of a criterion. Its report should show an assertion failure on the deliberately wrong expectation and a pass once restored; that pass is the expected result, not a blocker." |
| 2 | `test-writer.md:38` against `test-writer.md:16-21,34,47` | "Make that edit, run it …" placed after "change a test from an earlier report" | Group 2, callee contract narrower than the request it now accepts | Inputs, the inner-mode brief rule, and the Criterion id field all assume a criterion; "If you cannot find a behavior to pin, report blocked" could fire. "Make that edit" presumes an existing test, while the harness smoke test is usually new | Medium | `rewrite` (applied): the caller names the boundary and an existing behavior in place of a criterion; write a smoke test pinning it, or use one from an earlier report; report the boundary in place of the criterion id |
| 3 | `test-writer.md:38` against design D2 | "(it should pass, or fail only for behavior not yet built)" | Group 2, contradiction with the governing design | D2's proof is on existing behavior, so the restored run must pass; the hedge lets an unproven harness, or a test on unbuilt behavior, count as proof | Medium | `rewrite` (applied): "it should pass, since the behavior already exists; if it does not, report blocked with the output" |
| 4 | `test-writer.md:30` heading against `tdd-discipline/SKILL.md:64` | "Inner mode (called by a task-worker)" vs "under /wb:implement and /wb:implement_inline" | Group 2, caller not yet defined | Under /wb:implement_inline no task-worker exists, and implement_inline does not yet reference wb:test-writer (later phase). The exception says "a caller", so it still reads | Low | `flag`: when implement_inline gains its test-writer calls, state which mode the inline session uses |
| 5 | `tdd-discipline/SKILL.md:64` | "(under /wb:implement and /wb:implement_inline, wb:test-writer makes both test edits)" | Group 1c, long parenthetical in a bullet | Accurate and agrees with line 38 of the same skill; the length is the cost of naming both commands. The 94-line cap rules out splitting it | Low | `flag` (no edit) |
| 6 | `task-worker.md:40` | "(3) tests added or changed (taken from the test-writer reports in item 7; you write none)" | Group 2, duplicated field | Resolves phase4_impl_2 finding 5; it duplicates item 7 by reference, not by content, so the two cannot drift | Low | `flag` (no edit) |

## Dispositions

- **1 (medium)**: applied in task-worker.md (RED step). One added passage; the constraint at line 34 is unchanged.
- **2 (medium)**: applied in test-writer.md:38, body only.
- **3 (medium)**: applied in test-writer.md:38, together with finding 2 in one rewrite of the same paragraph.
- **4-6 (low)**: recorded only; no edits.
- **Keep-list**: test-writer frontmatter unchanged; tdd-discipline edited at :64 only (93 lines, under the 94 cap); task-worker's frontmatter, "fresh foreground spawn", verifier-trust reason, outer-test rule, item 7 verbatim, and close-as-last-act all kept.

## Re-run

- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: checks 1, 3, 5, and 9 pass. Check 4 fails only on `test-reviewer.md` and `test-auditor.md` missing (later tasks); it does not name test-writer or task-worker. Checks 2, 6, 11, 12, 13, and 15 fail on later-phase work outside these files.
- `./plugin/scripts/lint` on the three files and this report: all clean.
