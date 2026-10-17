# Prompt audit: phase2_impl_4 (ecosystem-agnostic detector step)

- **Task**: phase2_impl_4, make the test-quality detector step ecosystem-agnostic (listed platforms are worked examples; wb mandates no tools; never install tools)
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/test-quality/reference.md plugin/skills/test-quality/SKILL.md`
- **Base commit**: `d88daaf` (the change is uncommitted in the testing-guidance worktree; see `git diff HEAD -- plugin/skills/test-quality/`)

## Assumptions

- **Scope**: exactly `plugin/skills/test-quality/reference.md` and `plugin/skills/test-quality/SKILL.md`, as named in the request. Findings focus on what this task changed: the new "Detector selections" section (intro, Method steps 1 to 5, Worked examples framing, `reference.md:5-19`) and `SKILL.md:17`. Unchanged text was read for context only. Findings already dispositioned in [phase2_impl_1.md](phase2_impl_1.md) are not re-raised; none is revived by this change (its finding 4, the Ruff default-status claim at `reference.md:25`, is untouched).
- **Target model**: Claude Opus 5.5, the session model (a skill is audited against the session model). The skill is preloaded into `wb:test-writer` on Claude Sonnet 5.5; Sonnet 5.5 readings are noted per finding. `task-verifier`, `test-reviewer`, and `test-auditor` run on Opus 5.5.
- **Surface type**: coding-agent configuration (a `user-invocable: false` background skill in the `wb` Claude Code plugin). No request-building code, tool definitions, or non-Anthropic provider markers are in scope.
- **Design source**: `design.md` D7 (shared rubric), D8a (phase review: detectors scoped to the diff; mutation Level 1 opt-in, only when the repository declares a mutation command), D8b (cold audit: explicit selections, available-but-not-enabled reporting, only installed tools, suite-level checks only when the conventions give a runnable command, otherwise "not run" with the reason), and `design.md:443` (the testing profile is drafted by `/wb:testing-profile` and confirmed by the user).
- **Load-bearing (keep-list)**: the never-install rule and its reason, explicit selection over the configured rule set, available-but-not-enabled reporting, the "no detector for <category>" honesty line, the judgment-only fallback, and "do not guess at rule names" (a current failure mode for an unlisted stack, keep-list 5).
- **Provenance**: the changed lines are uncommitted, so `git blame` attributes them to this task; the table rows at `reference.md:21-28` predate it (commit `fe6efea`).

## Summary

The change itself is well-shaped for current models: it states a method with reasons rather than a per-stack script, keeps every load-bearing constraint, and uses no pressure language. Three of its new sentences do not fit the surface it lives on. The Method's category list (step 2) omits a category the worked examples cover, always-true or no-op assertions, which is Part 1 item 2 of the rubric; since step 4 keys its "no detector" reporting off that list, a reader on an unlisted stack would never look for a tautology detector. Step 3 tells every reader to run "the installed mutation tool", dropping the "if configured" gate the table rows and D8a/D8b keep. Step 5 tells every reader, reviewers and auditors included, to write into the testing profile or research Testing Conventions, files the design gives to `/wb:testing-profile` with user confirmation and to research. All three were rewritten in the working tree.

Counts per group:

- Group 1 (dated prompt text): 1 medium, 2 low
- Group 2 (brittle skill and configuration files): 1 high, 1 medium, 1 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable (no request-building code; no agent definitions in scope)

Totals: 1 high, 2 medium, 3 low.

## Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `reference.md:12` | "The categories the examples cover are: assertion-free tests, skipped or focused tests, duplicate tests or titles, stubs of the subject, sleeps and wall-clock waits, over-broad exception assertions, and conditional logic in tests." | Group 2, volatile specifics (a claim the repository contradicts) | The same file's worked examples cover always-true and no-op assertions (`IdenticalEqualityAssertion`, `VoidExpect` at `:23`; `UselessAssertion`, `UnreachableAssertion` at `:24`; `valid-expect` at `:26`; `useless-assert` at `:28`), and that category is rubric Part 1 item 2 (`SKILL.md:24`). Step 4 reports "no detector" per listed category, so on an unlisted stack the omitted category is neither searched for nor reported. Opus 5.5 and Sonnet 5.5 read "the categories ... are" as the full list | High | `rewrite`: add "always-true or no-op assertions" to the list |
| 2 | `reference.md:13` | "3. Add the runtime equivalents the stack offers: seeded random order, repeat runs on suspect tests only, a slow-test report, per-test coverage, and the installed mutation tool." | Group 2, wrong degrees of freedom (vague, ungated prose for a costly, opt-in operation) | Drops the gate the table keeps ("`mutant --since <ref>` if configured", "mutmut if configured", `:23`, `:25`) and contradicts D8a (mutation Level 1 is opt-in: only when the repository declares a mutation command) and D8b step 5 (suite-level checks only when the conventions give a runnable command, otherwise "not run" with the reason). Current models follow the imperative literally: an installed but undeclared mutation tool gets run in every review. Sonnet 5.5 reads it the same way | Medium | `rewrite` (see diff): gate runtime checks on a runnable command in the Testing Conventions or profile, run a mutation tool only when one is declared, report checks not run with the reason |
| 3 | `reference.md:15` | "5. Record what was found (tools, selections, rules available but not enabled, categories with no detector) in the testing profile or Testing Conventions, so the next run starts from it." | 1c, padding (an aside applied where it does not fit) | reference.md is read by every reviewer and auditor (`SKILL.md:17`), and current models treat each instruction as actionable, so a phase reviewer or task-verifier would edit research.md or create `.claude/wb/testing.md` mid-review. The design gives the profile to `/wb:testing-profile` with user confirmation (`design.md:443`) and research.md to research; reviewers propose (`SKILL.md:71`). The intent (the next run starts from what was found) survives as a report field | Medium | `rewrite`: "Include what was found (...) in your report, so the testing profile or Testing Conventions can be updated from it and the next run starts from it." |
| 4 | `reference.md:7` and `:19` | ":7 The examples are not a supported list" / ":19 they are examples, not the only supported stacks" | 1c, padding (repetition as reinforcement) | Two agreeing statements twelve lines apart. Working redundancy that the target reconciles (keep-list 8); the `:7` copy carries the reason, the `:19` copy frames the table | Low | `flag` (no edit) |
| 5 | `reference.md:11-15` | Method steps 1 to 5, numbered | 1c, step-by-step choreography | Steps 1 and 2 are ordered (find tools, then select); 3 to 5 are not. Each step carries a constraint and its reason rather than scripting judgment, so the numbering costs little | Low | `flag` (no edit) |
| 6 | `reference.md:19` | "These rows show the method applied to six stacks" | Group 2, volatile specifics | Correct today (six rows); the count drifts when a row is added | Low | `flag` (no edit) |

`SKILL.md:17` ("The detector method (with worked examples), custom heuristics, and the review finding shape are in reference.md; read it when you review or audit.") is clean: it matches reference.md's new framing, and "when you review or audit" keeps a literal Sonnet 5.5 test-writer from applying the review-only Method to itself.

## Proposed diff

One hunk per high or medium finding. All three were applied to the working tree (see Dispositions).

```diff
--- a/plugin/skills/test-quality/reference.md
+++ b/plugin/skills/test-quality/reference.md
@@ -12 +12 @@
-2. Select rules by category, using explicit selections rather than the project's configured rule set, because many of the highest-signal rules are off by default and a configured lint run misses them. The categories the examples cover are: assertion-free tests, skipped or focused tests, duplicate tests or titles, stubs of the subject, sleeps and wall-clock waits, over-broad exception assertions, and conditional logic in tests. Report rules that are available but not enabled separately from violations. Read the lint configuration only for thresholds, and run size rules (such as `RSpec/MultipleExpectations` and `RSpec/ExampleLength`) at the project's thresholds or exclude them, because their defaults conflict with common team guidance.
+2. Select rules by category, using explicit selections rather than the project's configured rule set, because many of the highest-signal rules are off by default and a configured lint run misses them. The categories the examples cover are: assertion-free tests, always-true or no-op assertions, skipped or focused tests, duplicate tests or titles, stubs of the subject, sleeps and wall-clock waits, over-broad exception assertions, and conditional logic in tests. Report rules that are available but not enabled separately from violations. Read the lint configuration only for thresholds, and run size rules (such as `RSpec/MultipleExpectations` and `RSpec/ExampleLength`) at the project's thresholds or exclude them, because their defaults conflict with common team guidance.
@@ -13 +13 @@
-3. Add the runtime equivalents the stack offers: seeded random order, repeat runs on suspect tests only, a slow-test report, per-test coverage, and the installed mutation tool.
+3. Add the runtime checks the stack offers when the Testing Conventions or the testing profile give a runnable command for them: seeded random order, repeat runs on suspect tests only, a slow-test report, and per-test coverage. Run a mutation tool only when one of them declares its command. Report any check not run, with the reason.
@@ -15 +15 @@
-5. Record what was found (tools, selections, rules available but not enabled, categories with no detector) in the testing profile or Testing Conventions, so the next run starts from it.
+5. Include what was found (tools, selections, rules available but not enabled, categories with no detector) in your report, so the testing profile or Testing Conventions can be updated from it and the next run starts from it.
```

## Dispositions

High- and medium-confidence findings:

- **Finding 1** (`reference.md:12`, category list omits always-true or no-op assertions, high): **applied**. Consistent with D7 Part 1 item 2 and D8b (explicit selections); adds one category, removes nothing.
- **Finding 2** (`reference.md:13`, ungated mutation run, medium): **applied**. Restores the gate D8a (Level 1 opt-in on a declared mutation command) and D8b step 5 (runnable command, otherwise "not run" with the reason) require, matching the table's "if configured"; "on changed code only" from D8a was left out because D8b's cold audit also reads this step.
- **Finding 3** (`reference.md:15`, every reader writes the profile or research, medium): **applied**. Consistent with D8b (findings go into the report) and `design.md:443` (the profile is user-confirmed via `/wb:testing-profile`); the "next run starts from it" intent is kept.

Low-confidence and flag items (findings 4 to 6): recorded only.

Verifier FAIL (coverage): added mocking-beyond-the-subject and test-data/setup-cost categories, open-ended lead-in, setup-cost profile in step 3; follows finding 1's rationale.

Post-edit verification:

- `./plugin/scripts/lint plugin/skills/test-quality/reference.md plugin/skills/test-quality/SKILL.md`: clean
- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: check 5 ("Rubric phrases live only under plugin/skills/test-quality/") PASS; check 16 ("No file under plugin/ references validation/") PASS
