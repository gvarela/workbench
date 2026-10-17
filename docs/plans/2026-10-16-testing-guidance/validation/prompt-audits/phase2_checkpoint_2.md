# Prompt audit: phase2_checkpoint_2 (conventions precedence, item 4 verdict, stub wording)

- **Trigger**: Phase 2 checkpoint. The user approved three changes: a precedence list for where repository conventions come from (test-quality `SKILL.md` top, with `reference.md` step 1 pointing at it), Part 1 item 4 moved from Remove to Rewrite in the Part 3 verdict table, and the stub wording in tdd-discipline's RED section.
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/test-quality/SKILL.md plugin/skills/test-quality/reference.md plugin/skills/tdd-discipline/SKILL.md`
- **Base commit**: `b49f9a1` (the changes are uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: only the lines changed by `git diff HEAD -- plugin/`, read in the context of the three whole files:
  - `test-quality/SKILL.md:15-19` (precedence list)
  - `test-quality/SKILL.md:68-69` (Remove and Rewrite rows)
  - `test-quality/reference.md:11` (step 1 pointer)
  - `tdd-discipline/SKILL.md:36` (stub wording)
- **Target model**: Claude Opus 5.5, per the request. Both skills are `user-invocable: false` and pin no model; they are also preloaded by Sonnet-tier workers (`task-worker`, `test-writer`), so each finding notes whether a literal reading changes behavior.
- **Surface type**: coding-agent configuration (Claude Code plugin background skills). No request-building code, tool definitions, or non-Anthropic provider markers in scope.
- **Substance**: the user's wording is approved. Findings below fix consistency only and keep the substance of each change.
- **Repository facts used**: `create_research/templates.md:99` (the research Profile line cites `.claude/wb/testing.md` only when it exists, otherwise "no profile"); `create_research/sub-agent-prompts.md:60`.

## Summary

The three changes read cleanly and agree with each other. The verdict table, Part 1 wording, and the "never a minor finding" sentence line up after item 4 moved: item 4 is a test that can fail on a non-empty result but passes vacuously on an empty one, which is exactly the new Rewrite condition ("can fail but does not reliably protect its criterion"), and the closing sentence of Part 3 covers both verdicts. tdd-discipline is 93 lines (limit 94).

Two medium findings sat in the precedence list, both Sonnet-literalism risks against the list's own lead-in ("the first of these that exists"):

1. Item 1 said research "cites `.claude/wb/testing.md`" unconditionally. The research template cites it only when the file exists, otherwise writes "no profile". A literal reader in a repository without a profile could look for a citation that cannot be there. Applied: "When `.claude/wb/testing.md` exists, it cites that file".
2. Item 2 applied "when there is no plan". A plan whose research predates the Testing Conventions section has a plan but no item 1 source, so a literal reader would skip item 2 and infer conventions from tests even though a profile exists. Applied: "when there is no plan or its research has no Testing Conventions section".

One medium finding outside the changed lines: `reference.md:13` (step 3) still reads commands from "the Testing Conventions or the testing profile", either one, while the precedence list makes research authoritative and says to follow the code where research records drift. Proposed, not applied.

Counts per group:

- Group 1 (dated prompt text): 0 high, 0 medium, 0 low
- Group 2 (brittle skill and configuration files): 0 high, 3 medium, 2 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

## Checks requested by the coordinator

**(a) Precedence list against `reference.md` steps 3 and 5 and Part 4's last bullet.**

- Step 1 (`reference.md:11`) now defers to the list; consistent.
- Step 3 (`reference.md:13`): partly inconsistent (Finding 3). "when the Testing Conventions or the testing profile give a runnable command" lets a reader take a command from `.claude/wb/testing.md` when research exists and records that the code has drifted from it, which the list's item 1 says not to do. In the inferred case (list item 3) neither source exists, so step 3 runs no runtime checks and reports them as not run; that is consistent with the list, since inference from tests should not invent commands.
- Step 5 (`reference.md:15`): consistent. Reporting what was found "so the testing profile or Testing Conventions can be updated" matches the list's instruction to report drift and inferred conventions for a person to resolve. "Testing profile" is the same term the research template uses for `.claude/wb/testing.md` (`templates.md:99`, "Profile").
- Part 4 last bullet (`SKILL.md:86`): consistent; it defers to the top of the skill, which now holds the list.

**(b) Part 3 table, Part 1 wording, and the "never a minor finding" sentence after item 4 moved.** Consistent.

- Remove (`:68`) now names items 1 to 3, each of which makes a test unable to fail at all (no behavioral assertion, tautology, skipped).
- Rewrite (`:69`) names item 4 and item 5, both of which leave a test that can fail but does not reliably protect its criterion.
- `:73` ("A test that cannot fail, or that does not protect the criterion it guards, is never a minor finding") covers both rows.
- `reference.md:52` asks for objective evidence only for Remove and Consolidate; item 4 findings no longer need it, and item 4 is a mechanical check, so Part 4's majority rule for judgment-only Rewrite does not bind it.
- Residual (Finding 4, low): Part 1's heading "Can this test fail?" now holds two items (4 and 5) that lead to Rewrite rather than Remove. Item 5 already did before this change, so the pattern is not new.

**(c) tdd-discipline length.** 93 lines, within the 94-line limit.

## Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `test-quality/SKILL.md:17`, against `create_research/templates.md:99` | "It cites `.claude/wb/testing.md` and records where the code has drifted from it." | Group 2, volatile specifics (a claim the repository contradicts) | The research template cites the profile only "when `.claude/wb/testing.md` exists ... otherwise 'no profile'". Stated unconditionally, a literal (Sonnet-tier) reader may hunt for a citation that cannot exist | Medium | `rewrite`: "When `.claude/wb/testing.md` exists, it cites that file and records where the code has drifted from it." |
| 2 | `test-quality/SKILL.md:18` | "2. `.claude/wb/testing.md`, when there is no plan." | Group 2, instructions that contradict each other (item qualifier against the lead-in "the first of these that exists") | A plan whose research has no Testing Conventions section has no item 1 source but does have a plan; read literally, item 2 does not apply and the reader drops to inference while a profile exists | Medium | `rewrite`: "2. `.claude/wb/testing.md`, when there is no plan or its research has no Testing Conventions section." |
| 3 | `test-quality/reference.md:13` (outside the changed lines) | "when the Testing Conventions or the testing profile give a runnable command for them ... Run a mutation tool only when one of them declares its command." | Group 2, instructions that contradict each other (either-source rule against the precedence list) | The list makes research authoritative and says to follow the code where research records drift; step 3 still lets the profile supply a command research may have marked stale | Medium | `rewrite` (proposed only): "when the conventions source named at the top of [SKILL.md](SKILL.md) gives a runnable command for them ... Run a mutation tool only when that source declares its command." |
| 4 | `test-quality/SKILL.md:23`, `:30-31`, `:68-69` | "## Part 1: Can this test fail?" with item 4 now under Rewrite | Group 2, contract accuracy (heading broader than its verdict mapping) | Items 4 and 5 sit under "Can this test fail?" yet lead to Rewrite. The verdict table states the mapping explicitly, so a reader following the table acts correctly; item 5 already had this shape | Low | `flag` |
| 5 | `tdd-discipline/SKILL.md:36` | "adding only the stub needed to load it (an empty class or method)" | Group 1c, example over-indexing (illustrative pair read as exhaustive) | A literal reader in a module-and-function language may hesitate when the missing piece is a module or function. The parenthesis reads as examples and "only the stub needed to load it" carries the rule, so no edit | Low | `flag` |

Totals: 0 high, 3 medium, 2 low.

## Proposed diff

Findings 1 and 2 (applied):

```diff
--- a/plugin/skills/test-quality/SKILL.md
+++ b/plugin/skills/test-quality/SKILL.md
@@ -17,2 +17,2 @@
-1. The Testing Conventions section of the plan's research. It cites `.claude/wb/testing.md` and records where the code has drifted from it. Where it records drift, follow the code as research describes it and mention the drift in your report, so a person can decide which one is right.
-2. `.claude/wb/testing.md`, when there is no plan.
+1. The Testing Conventions section of the plan's research. When `.claude/wb/testing.md` exists, it cites that file and records where the code has drifted from it. Where it records drift, follow the code as research describes it and mention the drift in your report, so a person can decide which one is right.
+2. `.claude/wb/testing.md`, when there is no plan or its research has no Testing Conventions section.
```

Finding 3 (proposed, not applied):

```diff
--- a/plugin/skills/test-quality/reference.md
+++ b/plugin/skills/test-quality/reference.md
@@ -13 +13 @@
-3. Add the runtime checks the stack offers when the Testing Conventions or the testing profile give a runnable command for them: seeded random order, repeat runs on suspect tests only, a slow-test report, a factory or setup-cost profile, and per-test coverage. Run a mutation tool only when one of them declares its command. Report any check not run, with the reason.
+3. Add the runtime checks the stack offers when the conventions source named at the top of [SKILL.md](SKILL.md) gives a runnable command for them: seeded random order, repeat runs on suspect tests only, a slow-test report, a factory or setup-cost profile, and per-test coverage. Run a mutation tool only when that source declares its command. Report any check not run, with the reason.
```

## Dispositions

- **Finding 1 (medium)**: applied at `test-quality/SKILL.md:17`. Consistency with the research template; the drift instruction is unchanged.
- **Finding 2 (medium)**: applied at `test-quality/SKILL.md:18`. Makes the qualifier match the lead-in "the first of these that exists"; the order of sources is unchanged.
- **Finding 3 (medium)**: declined for now; `reference.md:13` is outside the changed lines. Proposed diff above for the user's decision at the checkpoint.
- **Finding 4 (low)**: declined; the verdict table states the mapping, and item 5 already had this shape before the change.
- **Finding 5 (low)**: declined; the parenthesis is illustrative and the rule is "only the stub needed to load it". tdd-discipline stays at 93 lines.

### Update 2026-10-17: coordinator follow-up after user direction

- **Finding 3 applied.** `reference.md` step 3 now takes runtime and mutation commands from "the conventions source named at the top of SKILL.md". This finishes the user-approved precedence change, which asked for the reference to point at the list instead of offering either source.
- **"Test Desiderata" replaced with plain wording (user-directed).**
  - Part 2's opening now names its four properties: behavioral, structure-insensitive, specific, and predictive.
  - The closing paragraph says "other properties of good tests, such as speed, readability, and isolation".
  - A source line cites Kent Beck's article (medium.com/@kentbeck_7670/test-desiderata-94150638a4b3) and testdesiderata.com. The user asked for the author and the canonical article. Both URLs were checked on 2026-10-17: testdesiderata.com links to that Medium post as the original paper. The publication date is not stated because it could not be verified.
- No new audit was run. Both changes are the user's direction or this report's own proposed diff.
