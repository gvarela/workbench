# Prompt audit: phase2_impl_1 (test-quality skill)

- **Task**: phase2_impl_1 (`prompts-tgsl`), the new `test-quality` background skill
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/test-quality/SKILL.md plugin/skills/test-quality/reference.md`
- **Base commit**: `0ba4690` (skill files uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: exactly `plugin/skills/test-quality/SKILL.md` and `plugin/skills/test-quality/reference.md`, as named in the request. No other file was audited. The four agent definitions that preload the skill (`plugin/agents/test-writer.md`, `test-reviewer.md`, `test-auditor.md`, and the `skills:` line in `task-verifier.md`) are out of scope; three of them do not exist yet (later Phase 2 tasks).
- **Target model**: Claude Opus 5.5, the session model, per the plan's Prompt audit gate (a skill is audited against the session model). The skill is also preloaded into `wb:test-writer`, which runs on Claude Sonnet 5.5 at `medium` effort (D3); each finding below notes where it would read differently there. `wb:task-verifier`, `wb:test-reviewer`, and `wb:test-auditor` run on Opus 5.5, matching the target.
- **Surface type**: coding-agent configuration (a Claude Code plugin skill, `user-invocable: false`, a shared rubric preloaded into four agents). No request-building code, tool definitions, or provider markers are in scope; no non-Anthropic provider markers were found.
- **Design source**: `docs/plans/2026-10-16-testing-guidance/design.md` D7 (the four parts) and revised D6 (integrity and criterion protection are never minor). Content that encodes those decisions (Part 1's five items, Part 2's four properties and items, the verdict conditions, deterministic vs judgment-only labelling, the majority-of-three rule, file:line evidence, conventions override) is author-only context and load-bearing; the keep-list applies to it.
- **Provenance**: the files are new and uncommitted, so `git blame` has no history; Step 2 relied on idiom-dating and the design document.

## Summary

The surface is compact and largely clean: no pressure language (zero all-caps MUST/NEVER/CRITICAL), every prohibition carries its reason, and the rubric is stated as context and checkable conditions rather than choreography. The one documented-pattern finding is the Part 4 instruction to "write the reasoning before the answer", a reasoning-before-answer output scaffold that Opus 5.5 (thinking always on) and Sonnet 5.5 (adaptive thinking) do natively; it was rewritten to keep the design's requirement (decide after the evidence, report file:line evidence and a reason) without prescribing reasoning in the output. The remaining items are low-confidence flags, the most useful being an unverifiable Ruff default-status claim in reference.md and a Part 1 item 5 / Remove-verdict interaction for the design owner.

Counts per group:

- Group 1 (dated prompt text): 1 medium, 2 low
- Group 2 (brittle skill and configuration files): 3 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable (no request-building code; the sub-agent roster lives in agent files outside the scope)

Totals: 0 high, 1 medium, 5 low.

## Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `plugin/skills/test-quality/SKILL.md:75` | "and write the reasoning before the answer, so the answer is checked rather than justified after the fact" | 1b, "Show your thinking" / required reasoning sections in the output | Opus 5.5 always thinks before answering and Sonnet 5.5 thinks adaptively, so an instruction to write reasoning before the answer is a chain-of-thought scaffold that reasoning now does natively; on Opus 5.5 and Sonnet 5.5, instructions that read as reproducing reasoning in the output are a documented `reasoning_extraction` audit item. The design's actual requirement (decide each item after the evidence, report file:line evidence) survives without it | Medium | `rewrite`: "Answer each item as a yes/no question, deciding it only after checking the file:line evidence, and give the evidence and a short reason with the answer." |
| 2 | `plugin/skills/test-quality/SKILL.md:15` and `:78` | ":15 The repository's own conventions ... override the generic style items below." / ":78 Apply the repository's conventions over the generic style items, as stated at the top of this skill." (the RSpec `aggregate_failures` example also repeats at `:15` and `:48`) | 1c, padding (repetition, "as stated above") | The copies agree and :78 is the Part 4 item D7 places there, so this is working redundancy (keep-list 8, 10), not a defect | Low | `flag` (no edit) |
| 3 | `plugin/skills/test-quality/SKILL.md:36` | "Each test names the break it catches." | 1c, over-specification (ambiguous rule for a literal reader) | Does not say where the break is named (test name, comment, or report). Opus 5.5 reviewers can read it either way; Sonnet 5.5 (`wb:test-writer`) reads rules more literally and may encode the break in every test name. Design text, no documented harm | Low | `flag` (design owner may say where the break is named, for example the test-writer report) |
| 4 | `plugin/skills/test-quality/reference.md:13-18` | Default-status claims, for example ":15 Only `PT010`, `PT014`, `PT020`, `PT025`, `PT026`, `PT031` are enabled by default" and ":13 (all enabled by default)" | 2, volatile specifics (tool claims with no verification date) | Rule names and default statuses belong to installed tools, so the repository cannot contradict them, but they rot as those tools ship. The Ruff line is ambiguous as written: Ruff's default rule selection enables no `PT` rules, so "enabled by default" presumably means something narrower (for example stable, non-preview). The instruction to run an explicit selection makes the defaults non-load-bearing for behavior | Low | `flag` (verify against current tool docs and add a verified-on date; proposed only under the Group 2 row) |
| 5 | `plugin/skills/test-quality/SKILL.md:3` | "including test-writer, task-verifier, test-reviewer, and test-auditor work" | 2, trigger-case enumeration | Trigger text (keep-list 6). Naming the four agents is redundant for agents that preload the skill, but it is short and not growing near-synonyms; three of the named agents do not exist yet, which is expected mid-plan | Low | `flag` (no edit) |
| 6 | `plugin/skills/test-quality/SKILL.md:27` with `:64` | ":27 For a test that guards an acceptance criterion, a planted defect ... makes the test fail." / ":64 Remove: Only when the test cannot fail (a Part 1 item fails)." | Out of pattern scope (design interaction) | A test that runs and can fail but misses a planted defect fails Part 1 item 5, so the table routes it to Remove, while D6 calls the same case "does not protect its criterion" (a FAIL, typically fixed by strengthening the test). Both follow D7 as written; not a dated pattern | Low | `flag`, later resolved by fix (verifier FAIL): item 5 now maps to Rewrite; see Dispositions |

Reading notes for Sonnet 5.5 (`wb:test-writer`) beyond findings 3 and 6: Part 3, Part 4, and reference.md are addressed to reviewers and say so ("Every review finding", "Reviewers propose", "read it when you review or audit"), so a literal writer should not apply them to itself; no change proposed.

## Proposed diff

Only finding 1 meets the medium-or-high threshold. It was applied to the working tree (see Dispositions).

```diff
--- a/plugin/skills/test-quality/SKILL.md
+++ b/plugin/skills/test-quality/SKILL.md
@@ -72,7 +72,7 @@
 
 ## Part 4: How reviewers judge
 
-- Answer each item as a yes/no question with file:line evidence, and write the reasoning before the answer, so the answer is checked rather than justified after the fact. Holistic scores of test quality are noisy; decomposed items with line evidence are the available mitigation.
+- Answer each item as a yes/no question, deciding it only after checking the file:line evidence, and give the evidence and a short reason with the answer. Holistic scores of test quality are noisy; decomposed items with line evidence are the available mitigation.
 - Label every finding's evidence as **deterministic** (a named detector, a planted defect, or a diff) or **judgment-only**, so the reader knows how much weight it carries.
 - Report a judgment-only Remove or Rewrite as a finding only when a majority of three independent judgments agrees, and record the result (for example 3 of 3). Report other judgment-only observations as "review these". No study validates an LLM judge of test value, so a single judgment is not enough to propose removing or rewriting a test.
```

## Dispositions

High- and medium-confidence findings:

- **Finding 1** (`SKILL.md:75`, reasoning-before-answer scaffold, medium): **applied**. Consistent with D7 Part 4 ("a yes/no question answered with file:line evidence, after reasoning"): the rewrite keeps decide-after-evidence and file:line evidence, and leaves the reasoning itself to the model's thinking.

Low-confidence and flag items (findings 2 to 5): recorded only.

- **Finding 6** (`SKILL.md:27` with `:64`, item 5 / Remove interaction, low): **resolved by fix (verifier FAIL): item 5 now maps to Rewrite**. The task-verifier failed the task on this interaction (it contradicts D7's "Remove: only when the test cannot fail" and revised D6, where a planted-defect miss is fixed by strengthening the test). The fix touched `SKILL.md:64-65` after this audit: Remove now covers only Part 1 items 1 to 4, and Rewrite adds "misses a planted defect (Part 1 item 5) and so does not protect its criterion". The gate does not require a re-audit of a two-line verdict-table edit, so none was run.

Post-edit verification:

- `./plugin/scripts/lint plugin/skills/test-quality/SKILL.md plugin/skills/test-quality/reference.md`: clean
- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: check 5 ("Rubric phrases live only under plugin/skills/test-quality/") PASS
