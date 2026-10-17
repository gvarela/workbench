# Prompt audit: phase2_impl_3 (research Testing Conventions)

- **Task**: phase2_impl_3 (`prompts-bhhr`), the Testing Conventions addition to `create_research` and its mentions in `help` and `wb-prime`
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/create_research/templates.md plugin/skills/create_research/sub-agent-prompts.md plugin/skills/create_research/SKILL.md plugin/skills/help/SKILL.md plugin/hooks/wb-prime.sh`
- **Base commit**: `3f95de9` (the task's change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: only the lines this task changed (`git diff HEAD` on the five files), read in the context of each whole file:
  - `plugin/skills/create_research/templates.md:84-99` (Conventions bullet, new Testing Conventions section)
  - `plugin/skills/create_research/sub-agent-prompts.md:60` (Agent 3 brief, new testing-conventions bullet)
  - `plugin/skills/create_research/SKILL.md:10` (opening sentence)
  - `plugin/skills/help/SKILL.md:102` (create_research row, "did enough" column) and `:219` (Command Details)
  - `plugin/hooks/wb-prime.sh:17` (orientation stage line)
- **Target models**:
  - Claude Opus 5.5 for the skills (`create_research`, `help`) and the hook orientation text, per the request. The research.md template is filled by the orchestrating session.
  - Claude Sonnet 5.5 at `effort: low` for the Agent 3 brief in `sub-agent-prompts.md`: it is sent to `wb:pattern-finder`, whose frontmatter pins `model: sonnet`, `effort: low`, `maxTurns: 25`, tools `Grep, Glob, Read`. The spawn block also passes `model: "sonnet"`, so the two agree.
- **Surface type**: coding-agent configuration (Claude Code plugin skills, a sub-agent brief, a SessionStart hook). No request-building code, tool definitions, or non-Anthropic provider markers in scope.
- **Design source**: `docs/plans/2026-10-16-testing-guidance/design.md` (Testing conventions in research, the optional `.claude/wb/testing.md` profile, the test-writer and test-reviewer roles). Load-bearing per the keep-list: research stays documentarian (facts, file:line, no recommendations); the field list matches the design's profile headings; create_research's "This stage needs from you" line (`SKILL.md:33`) still corresponds to help's "You provide" cell, which this task did not change.
- **Provenance**: every in-scope line is new in this task's uncommitted diff; there is no older blame to weigh.

## Summary

The additions are plain, reasoned, and documentarian: no pressure language, no scaffolds, no prohibition clusters. The one documented-pattern finding is a contract gap between the pattern-finder brief and the template it feeds. The template's Profile field asks research to record where `.claude/wb/testing.md` and the code differ, and its Frameworks field asks for assertion and mocking libraries, but the brief asked the sub-agent only whether the profile exists and for "frameworks and versions". Sonnet 5.5 at low effort does what the brief says and no more, so the orchestrator would receive no data for those template slots and either fill them from its own unprompted reading or leave placeholders. The brief is rewritten to ask for both. Everything else is a low-confidence flag.

Counts per group:

- Group 1 (dated prompt text): 0 high, 0 medium, 2 low
- Group 2 (brittle skill and configuration files): 0 high, 1 medium, 2 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable (no request-building code; the roster check: `pattern-finder` model and effort in frontmatter agree with the spawn's `model: "sonnet"`)

Totals: 0 high, 1 medium, 4 low. No Group 2 conflict between instruction files was found: `test-quality/reference.md:11-15` reads "the research Testing Conventions or `.claude/wb/testing.md`", which matches the template's heading and profile path.

## Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `sub-agent-prompts.md:60`, against `templates.md:90` and `:99` | ":60 frameworks and versions; ... whether .claude/wb/testing.md exists" / ":90 test framework(s), assertion/mocking libraries, versions" / ":99 cite it as the baseline and record where it and the code differ" | 2, wrong degrees of freedom (brief under-specifies the output its consumer needs; a contract mismatch between two files that are always used together) | The template asks for two facts the brief never requests. Current models, Sonnet 5.5 at low effort especially, follow a brief literally and do not expand it, so the profile comparison and the assertion/mocking libraries would arrive empty. The fix is in the brief, which `SKILL.md:105` says is used verbatim | Medium | `rewrite` `:60`: "frameworks, assertion and mocking libraries, and versions; ... whether .claude/wb/testing.md exists and, if it does, where it and the code differ" |
| 2 | `templates.md:88` | "the test-writer, verifier, and test-reviewer read this section first" | 2, volatile specifics (named agents) | `plugin/agents/` has no `test-writer.md` or `test-reviewer.md` yet. They are defined in design D3 and D8a and land in later Phase 2 tasks (`tdd-discipline/SKILL.md:38` already names `wb:test-writer`), so the repository does not contradict the claim; it is a forward reference. The sentence is context for why the section matters (keep-list item 1) | Low | `flag` (re-check at phase end that both agents exist) |
| 3 | `sub-agent-prompts.md:59-60` | ":59 Testing approaches for [feature type]" / ":60 Testing conventions: ..." | 1c, near-duplicate rules | Overlapping topics, but different scope: `:59` is feature-scoped (how analogous code is tested), `:60` is repository-wide. The two agree and do not cause reconciliation errors (keep-list item 8) | Low | `flag` (no edit) |
| 4 | `sub-agent-prompts.md:60` | ten semicolon-separated items on one line, added to an existing four-item brief | 2, size tax on a constrained agent | `pattern-finder` runs at `effort: low` with `maxTurns: 25`. Ten extra facts to locate may crowd the turn budget on a large repository. Not a documented dated pattern; worth watching in the Phase 2 trial rather than trimming now, since each item maps to a template field | Low | `flag` (watch turn usage in trials) |
| 5 | `templates.md:96` | "(for example rubocop-rspec, rubocop-minitest, ruff, eslint test plugins, TestProf)" | 1c, example over-indexing | Three of five examples are Ruby. They are labeled "for example", span three ecosystems, and match the test-quality reference's "stacks as worked examples" (commit `3f95de9`), so keep-list item 7 applies | Low | `flag` (no edit) |

No findings in `create_research/SKILL.md:10`, `help/SKILL.md:102` and `:219`, or `wb-prime.sh:17`: each is a single factual clause stating that research covers testing conventions, consistent with the template.

## Proposed diff

One hunk, for finding 1 (applied; see Dispositions).

```diff
--- a/plugin/skills/create_research/sub-agent-prompts.md
+++ b/plugin/skills/create_research/sub-agent-prompts.md
@@ -57,7 +57,7 @@
   - Naming conventions for [component type]
   - Common patterns for [functionality]
   - Testing approaches for [feature type]
-  - Testing conventions: frameworks and versions; fast and full test commands; levels present and the harness per boundary; fixtures vs factories; seam and mocking patterns; skip markers; installed test-quality linters and profilers and what they enable; any installed mutation tool; services the suite needs (for example Postgres or Redis); whether .claude/wb/testing.md exists
+  - Testing conventions: frameworks, assertion and mocking libraries, and versions; fast and full test commands; levels present and the harness per boundary; fixtures vs factories; seam and mocking patterns; skip markers; installed test-quality linters and profilers and what they enable; any installed mutation tool; services the suite needs (for example Postgres or Redis); whether .claude/wb/testing.md exists and, if it does, where it and the code differ
 
   DO NOT write any files. Return your findings as a report.`,
   subagent_type: "wb:pattern-finder",
```

## Dispositions

- **Finding 1 (medium)**: applied. `sub-agent-prompts.md:60` now asks for assertion and mocking libraries and, when the profile exists, where it and the code differ, so the brief supplies every Testing Conventions field the template asks for. The brief stays documentarian (facts about what exists); line counts unchanged (create_research/SKILL.md 214, help/SKILL.md 302); help's create_research row and SKILL.md's "This stage needs from you" line untouched.
- No high-confidence findings. Findings 2-5 are low confidence and recorded as flags only.
