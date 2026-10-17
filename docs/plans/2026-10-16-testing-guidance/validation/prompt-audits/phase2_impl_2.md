# Prompt audit: phase2_impl_2 (tdd-discipline skill)

- **Task**: phase2_impl_2, the D5 reframe of the `tdd-discipline` background skill
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/tdd-discipline/SKILL.md`
- **Base commit**: `fe6efea` (the task's change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: exactly `plugin/skills/tdd-discipline/SKILL.md`, as named in the request. No other file was audited. `plugin/agents/task-worker.md` (which preloads the skill) and `implement_inline`'s "When to Skip TDD" section (which D5 points at this skill) are out of scope.
- **Target model**: Claude Sonnet 5.5, per the request: the skill is preloaded into `wb:task-worker` (`skills: [tdd-discipline]`, `effort: medium`), whose default tier is Sonnet 5.5. The skill is `user-invocable: false` and also auto-activates in interactive sessions, which run on Claude Opus 5.5; findings note where the text reads differently there.
- **Surface type**: coding-agent configuration (a Claude Code plugin background skill). No request-building code, tool definitions, or non-Anthropic provider markers are in scope.
- **Design source**: `docs/plans/2026-10-16-testing-guidance/design.md` D5. Load-bearing per the keep-list: the Iron Law, red defined as an assertion failure on the intended behavior ("not red yet" for load, import, or missing-constant errors), the single Named exceptions list (harness tasks with the can-fail proof, configuration, documentation, build scripts, refactors covered by existing tests), and "under the implement modes, `wb:test-writer` writes the test".
- **Trigger text**: the frontmatter `description` is routing text; calibrated urgency there is allowed (keep-list item 6).
- **Provenance**: `git log` shows one prior commit (`cf86f75`, the v2.0.0 modernization); the body's idioms (Iron Law code block, rationalization table, red-flag list) date from the imported TDD skill it was based on. `git diff HEAD` shows this task's change: the red definition, the test-writer line, the Named exceptions section, the scoping of "no exceptions", and removal of two rationalization rows and the Quick Reference table.

## Summary

The task's own additions (red as an assertion failure, the Named exceptions list, the test-writer line) are plain, reasoned, and clean. The two documented-pattern findings are in the surrounding imported text. The main one: the unconditional "delete it, start over" rules at `:21` and `:85` read, for a literal model, as overriding the new Named exceptions list. A refactor covered by existing tests trips the red flag "Test passes immediately", and a configuration edit trips "Code before test". Sonnet 5.5 and Opus 5.5 both follow instructions literally, so the two rules are rewritten to defer to the list, which D5 makes the single authority. The second is an all-caps `STOP` heading over a section whose closing line already states the action. Everything else is a low-confidence flag.

Counts per group:

- Group 1 (dated prompt text): 2 medium, 7 low
- Group 2 (brittle skill and configuration files): 2 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable (no request-building code; the roster lives in agent files outside the scope)

Totals: 0 high, 2 medium, 9 low.

## Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `SKILL.md:21` and `:85`, against `:60-66` | ":21 Code written before its test has no exceptions:" / ":85 All of these mean: Delete code. Start over with TDD." / ":62 This is the only list of work that skips test-first." | 1a/1c, unconditional rule that a literal reader applies past its intent (Group 2 contradiction row, within one file) | Current models follow instructions closely and literally. Read that way, ":85" fires on named exceptions: a refactor covered by existing tests passes immediately (red flag 2), and configuration or documentation is written with no test (red flag 1). ":21" still says "no exceptions" beside a section titled Named exceptions. D5 makes the list the single authority, so both rules should defer to it | Medium | `rewrite`: ":21" to "Outside the named exceptions below, code written before its test is never kept:"; ":85" to "Outside the named exceptions, each of these means: delete the code and start over with TDD." |
| 2 | `SKILL.md:77` | "## Red Flags - STOP and Start Over" | 1a, pressure language (all-caps emphasis, no adjacent reason) | The caps add volume, not information: ":85" states the action. On current models inflated emphasis over-applies, and in an interactive Opus 5.5 session it pushes toward deleting code in gray cases | Medium | `rewrite`: "## Red Flags - Start Over" |
| 3 | `SKILL.md:16` | "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" | 1a, all-caps emphasis | The Iron Law is a single scoped emphasis that D5 keeps word for word, and it guards a demonstrated failure (the audit's hollow and missing reds), so keep-list items 5 and 6 apply | Low | `flag` (no edit) |
| 4 | `SKILL.md:19`, `:25`, `:85` | ":19 Delete it. Start over." / ":25 Delete means delete" | 1c, repetition as reinforcement | Three statements of the same action. It is part of the Iron Law block D5 keeps and the copies agree (keep-list items 8 and 10); finding 1 already scopes the two that could misfire | Low | `flag` (no edit) |
| 5 | `SKILL.md:3` | "writing ANY production code in this session" / "solo edits must trigger it" | 3, trigger text | Routing text. Calibrated urgency is allowed there because skills under-trigger (keep-list item 6). It is not tuned against a trigger eval | Low | `flag` (no edit) |
| 6 | `SKILL.md:36` | "make the code importable, then re-run" | 1c, ambiguous rule for a literal reader | Sonnet 5.5 may read "make importable" as licence to write the real implementation before seeing red. "Add only the stub needed to load (an empty class or method)" would close that. This is a D5 wording question, not a dated pattern | Low | `flag` (design owner) |
| 7 | `SKILL.md:38` | "have wb:test-writer write the test" | 2, volatile specifics (named agent) | `plugin/agents/test-writer.md` does not exist yet, and `task-worker.md` has no `Agent` tool. Both are later Phase 2 tasks; the nested-spawn risk is tracked as `prompts-sm6l`. The design's "fresh foreground spawn" detail (D3) belongs in the agent files, not here | Low | `flag` (re-check at phase end) |
| 8 | `SKILL.md:44-48` | "Don't: Add features beyond the test / Refactor other code / 'Improve' beyond what test requires" | 1c, prohibition list | Three scope prohibitions with no stated reason. They encode the TDD green-step rule, a real constraint, not an output-style tic | Low | `flag` (no edit) |
| 9 | `SKILL.md:70-75` | "Too simple to test / Simple code breaks. Test takes 30 seconds." | 1c, prohibition-by-rationalization table | An anti-rationalization table written for models that argued their way out of rules. A model that does not hold these excuses could be anchored toward them, but nothing shows harm on the target | Low | `flag` (re-test candidate) |
| 10 | `SKILL.md:82-83` | "'Just this once'" / "'This is different because...'" | 1c, prohibition list (rationalization tics) | Same idiom as finding 9; with finding 1 applied, these defer to the Named exceptions | Low | `flag` (no edit) |
| 11 | `SKILL.md:89-93` | "Must mock everything / Code too coupled. Refactor." | 1c, strategy coaching | Heuristics, not rules, but brief and useful context for a stuck worker | Low | `flag` (no edit) |

Reading notes for Opus 5.5 (interactive sessions, where the skill auto-activates): ":19" ("Write code before the test? Delete it.") refers to code written in this session. A literal reader working in untested legacy code should not read it as an order to delete existing code. With finding 1 applied the rule is scoped further, so no change is proposed.

## Proposed diff

Findings 1 and 2 meet the medium-or-high threshold. Both were applied to the working tree (see Dispositions).

```diff
--- a/plugin/skills/tdd-discipline/SKILL.md
+++ b/plugin/skills/tdd-discipline/SKILL.md
@@ -18,7 +18,7 @@
 
 Write code before the test? Delete it. Start over.
 
-**Code written before its test has no exceptions:**
+**Outside the named exceptions below, code written before its test is never kept:**
 
 - Don't keep it as "reference"
 - Don't "adapt" it while writing tests
@@ -74,7 +74,7 @@
 | "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is debt. |
 | "Need to explore first" | Fine. Throw away exploration, start with TDD. |
 
-## Red Flags - STOP and Start Over
+## Red Flags - Start Over
 
 - Code before test
 - Test passes immediately (didn't see it fail)
@@ -82,7 +82,7 @@
 - "Just this once"
 - "This is different because..."
 
-**All of these mean: Delete code. Start over with TDD.**
+**Outside the named exceptions, each of these means: delete the code and start over with TDD.**
 
 ## When Stuck
 
```

Hunks 1 and 3 are finding 1. Hunk 2 is finding 2.

## Dispositions

High- and medium-confidence findings:

- **Finding 1** (`SKILL.md:21` and `:85`, unconditional delete rules against the Named exceptions list, medium): **applied**. Consistent with D5: the list is "the single list of named exceptions", and both rules now defer to it. The Iron Law (`:16`) and the red definition are unchanged.
- **Finding 2** (`SKILL.md:77`, all-caps `STOP` heading, medium): **applied**. Consistent with D5: the heading's action is unchanged and `:85` still states it.

Low-confidence and flag items (findings 3 to 11): recorded only.

Post-edit verification:

- `wc -l plugin/skills/tdd-discipline/SKILL.md`: 93 (limit 94)
- `./plugin/scripts/lint plugin/skills/tdd-discipline/SKILL.md`: clean
- `grep -nEi "named exceptions|assertion failure" plugin/skills/tdd-discipline/SKILL.md`: `:21`, `:33` ("Red is an assertion failure on the intended behavior"), `:60` ("## Named exceptions"), and `:85`
