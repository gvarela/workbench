# Prompt audit: phase2_checkpoint_1 (test-quality conventions sentence)

- **Trigger**: Phase 2 checkpoint. The user said the conventions sentence near the top of `plugin/skills/test-quality/SKILL.md` "doesn't make sense", and that shipped skills must not reference this project or any test project, because the skill is used across many repositories by many people. The coordinator rewrote line 15 and the last bullet of Part 4.
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/test-quality/SKILL.md`
- **Base commit**: `8244936` (the change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: only the lines changed by `git diff HEAD -- plugin/skills/test-quality/SKILL.md`, read in the context of the whole file and of `plugin/skills/test-quality/reference.md`:
  - `SKILL.md:15` (conventions sentence)
  - `SKILL.md:78` (last bullet of Part 4)
- **Target model**: Claude Opus 5.5, per the request. The skill is `user-invocable: false` and pins no model; it is preloaded by agents on several tiers, and nothing in the changed lines is tier-sensitive.
- **Surface type**: coding-agent configuration (a Claude Code plugin background skill). No request-building code, tool definitions, or non-Anthropic provider markers in scope.
- **Design source**: `design.md:259` ("The repository's conventions (research or profile) override generic style items"), `design.md:246` (Specific row), `design.md:375` and `:415` (the optional profile at `.claude/wb/testing.md`, a path the plugin defines for every repository, not a file of this project).
- **Provenance**: both lines are new in the uncommitted diff; there is no older blame to weigh.

## Summary

The rewrite fixes what the user objected to. The old line 15 used an RSpec `aggregate_failures` example to carry its meaning, which a reader in a non-Ruby repository could not map to anything; the new sentence states the rule in rubric terms (conventions win on style, never on whether a test can fail or checks behavior) and names no project. Both examples it gives ("how assertions are grouped", "how setup is shared") point at real Part 2 items (`:48` Specific, `:43` Structure-insensitive), and the closing sentence lines up with Part 1 and the Behavioral heading. The Part 4 bullet is a consistent one-line recap.

One medium finding: the sentence pointed at "the plan's research", while `reference.md:11` and `:13`, which the same reviewers read, and the research template (`create_research/templates.md:86`) name the section "Testing Conventions". Naming the section in the skill gives the reader the exact heading to open and one vocabulary across the two files. Applied.

One observation outside the changed lines is worth the coordinator's attention: `:48` frames RSpec `aggregate_failures` as an exception to the Specific item, but `aggregate_failures` is a way to satisfy that item, not to break it. It is flagged, not edited, because it is outside scope and `design.md:246` carries the same text.

Counts per group:

- Group 1 (dated prompt text): 0 high, 0 medium, 1 low
- Group 2 (brittle skill and configuration files): 0 high, 1 medium, 2 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

## Checks requested by the coordinator

**(a) Is the new sentence clear to a reader in an arbitrary repository?** Yes. It is conditional ("When the repository has its own testing conventions"), so a repository with no plan and no profile simply gets the generic items. It names no project, test project, or framework. Its two sources are the plugin's own artifacts: the research Testing Conventions section that `/wb:create_research` writes, and `.claude/wb/testing.md`, the per-repository profile path the plugin defines (as `.claude/wb/PRIME.md` is for wb-prime). The boundary is stated in rubric terms a reader can apply without knowing any stack. Residual gray area: whether a convention about test doubles counts as "style" is not spelled out, but the closing sentence ("never excuse a test that ... does not check behavior") covers the case that matters, an assertion on a mock (Part 1 item 1).

**(b) Is it consistent with Part 2's Specific item and with the Part 4 bullet?** Yes, with one caveat on `:48` itself:

- `:15` "how assertions are grouped" matches `:48` "unless the project's convention says otherwise", so the two agree that grouping is convention-governed.
- `:78` "Apply the repository's conventions on matters of style, as stated at the top of this skill" restates `:15` and defers to it for the boundary; no disagreement.
- Caveat (outside scope, Finding 3): `:48` reads "Assertions are not bundled so that the first failure hides the rest, unless the project's convention says otherwise (for example RSpec `aggregate_failures`)". `aggregate_failures` reports every failure in the block, so a test using it does not hide failures and already passes the item; the "unless" clause presents it as an exception. A reader could infer that a convention may permit bundling that does hide failures. Terminology also drifts: `:48` says "the project's convention", `:15` and `:78` say "the repository's".

## Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `SKILL.md:15`, against `reference.md:11`, `:13` | ":15 recorded in the plan's research or in `.claude/wb/testing.md`" / "reference.md:11 Read the research Testing Conventions or `.claude/wb/testing.md`" | Group 2, wrong degrees of freedom (a pointer vaguer than the one its companion file gives for the same source) | The two files are read together by every reviewer (`SKILL.md:17`). One names the section, the other names the whole document; Opus 5.5 follows the pointer it is given, and a research.md is long. Naming the section matches the template heading (`create_research/templates.md:86`) | Medium | `rewrite`: "recorded in the Testing Conventions section of the plan's research or in `.claude/wb/testing.md`" |
| 2 | `SKILL.md:15` | "recorded in the ... plan's research or in `.claude/wb/testing.md`" | Group 2, volatile specifics | `.claude/wb/testing.md` does not exist in any repository until `/wb:testing-profile` ships (a later phase of this plan). The sentence is conditional and `reference.md:11` already names the same path, so nothing breaks; noted so the path is checked when that skill lands | Low | `flag` |
| 3 | `SKILL.md:48` (outside the changed lines; also `design.md:246`) | "Assertions are not bundled so that the first failure hides the rest, unless the project's convention says otherwise (for example RSpec `aggregate_failures`)." | Group 2, contract accuracy (an example that contradicts the rule it illustrates) | `aggregate_failures` makes bundled assertions report every failure, so it satisfies the item rather than excepting it. With `:15` now covering grouping conventions, a possible rewrite is "Assertions are not bundled so that the first failure hides the rest (a mechanism that reports every failure, such as RSpec `aggregate_failures`, satisfies this)." | Low | `flag` (outside scope; needs design alignment) |
| 4 | `SKILL.md:78` | "Apply the repository's conventions on matters of style, as stated at the top of this skill." | 1c, padding ("as stated above") | A single end-of-section recap of a rule Part 4 readers need, consistent with `:15`; keep-list 10 (deliberate recap) and 8 (working redundancy). Same disposition as `phase2_impl_1.md` Finding 2 | Low | `flag` (no edit) |

Totals: 0 high, 1 medium, 3 low.

## Proposed diff

```diff
--- a/plugin/skills/test-quality/SKILL.md
+++ b/plugin/skills/test-quality/SKILL.md
@@ -15 +15 @@
-When the repository has its own testing conventions, recorded in the plan's research or in `.claude/wb/testing.md`, follow them on matters of style, such as how assertions are grouped or how setup is shared. They never excuse a test that cannot fail or does not check behavior.
+When the repository has its own testing conventions, recorded in the Testing Conventions section of the plan's research or in `.claude/wb/testing.md`, follow them on matters of style, such as how assertions are grouped or how setup is shared. They never excuse a test that cannot fail or does not check behavior.
```

## Dispositions

- **Finding 1 (medium)**: applied. `SKILL.md:15` now names the Testing Conventions section, matching `reference.md:11`, `:13` and the research template heading. Line count unchanged (78).
- **Finding 2 (low)**: declined; the sentence is conditional and the path is the plugin's defined profile location, already used in `reference.md`. Re-check when `/wb:testing-profile` ships.
- **Finding 3 (low)**: declined here; outside the changed lines and mirrored in `design.md:246`. Raised to the coordinator for a decision at the checkpoint.
- **Finding 4 (low)**: declined; deliberate recap, consistent with `:15`.
