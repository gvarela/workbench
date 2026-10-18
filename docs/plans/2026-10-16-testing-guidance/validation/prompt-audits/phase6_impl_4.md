# Prompt audit: phase6_impl_4 (review-prep pointer to /wb:test-audit)

- **Task**: `prompts-xau5`, add a one-sentence pointer to `/wb:test-audit` after review-prep's TDD Check
- **Run**: 2026-10-18, `/claude-api prompt-audit plugin/skills/review-prep/SKILL.md`
- **Base commit**: `53aea1b` (review-prep/SKILL.md is modified in the working tree)

## Assumptions

- **Scope**: the changed sentence at `plugin/skills/review-prep/SKILL.md:96`, read in the context of the whole file. Read alongside, not edited: `plugin/skills/test-audit/SKILL.md` (the target of the pointer) and `plugin/skills/help/SKILL.md:113,236`.
- **Target model**: Claude Opus 5.5 (the model running the walkthrough; review-prep pins none).
- **Surface type**: coding-agent configuration (one skill). No request-building code or tool definitions; Groups 3 and 4 are not applicable.
- **Load-bearing (keep-list)**: the TDD Check checklist and the "Don't block - just note. User decides if intentional." sentence it extends, the Conversation Style section (short responses, wait for questions), and the Wrap-up TDD Status block.
- **Provenance**: the sentence is this task's (uncommitted); no blame history.

## Summary

The pointer is accurate. `/wb:test-audit` exists (`plugin/skills/test-audit/SKILL.md`, named `test-audit`, listed in help at `help/SKILL.md:113` and `:236`), and a bare invocation is handled: "Nothing: audit the whole suite of this repository" (`test-audit/SKILL.md:36`), with `[scope]` optional (`argument-hint`). It does not conflict with the TDD Check: that check is a per-diff, non-blocking flag, and the pointer is a pointer, not a gate. Its placement, as the last sentence of the TDD Check, is where a reader who has just flagged a missing test would see it.

One medium finding. The sentence is an imperative with no addressee ("run `/wb:test-audit`"). review-prep is read by the model, and test-audit is model-invocable (no `disable-model-invocation`), so a literal reader can start it itself after any TDD flag. That run is Opus at high effort, spawns parallel auditors, and writes a report, in the middle of an interactive walkthrough whose style is "short responses, wait for questions". The sentence now addresses the user and says the audit is separate.

Counts per group:

- Group 1 (dated prompt text): 0 findings
- Group 2 (brittle skill and configuration files): 0 high, 1 medium (finding 1), 2 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 0 high, 1 medium (applied), 2 low (recorded).

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `review-prep/SKILL.md:96` | "For a broader look at test quality beyond this diff, run `/wb:test-audit`." | Group 2, wrong degrees of freedom (an unaddressed imperative on a costly, model-invocable skill) | The model reads "run" as its own instruction; the audit is an Opus, parallel-agent, report-writing run that does not belong inside a walkthrough that waits for the user's questions | Medium | `rewrite` (applied): "If the user wants a broader look at test quality beyond this diff, point them to `/wb:test-audit`; it is a separate run, not part of this walkthrough." |
| 2 | `review-prep/SKILL.md:36-157` (outside the changed line) | Ordered lists renumbered to "1." and table separators respaced in `git diff HEAD` | Group 2, incidental change | These hunks are markdownlint autofix (MD029, MD060): the HEAD version fails `./plugin/scripts/lint` with 13 errors on exactly these lines. They change no wording. Reverting them would fail the lint step | Low | `flag` |
| 3 | `review-prep/SKILL.md:96` | no scope hint | Group 2, under-specification | `/wb:test-audit` also takes a path; the sentence does not say so. Not needed: a bare run works, and help documents the scope | Low | `flag` |

## Dispositions

- **1 (medium)**: applied at `review-prep/SKILL.md:96`. The sentence now addresses the user, and states that the audit is a separate run.
- **2 (low)**: recorded only. The renumbering and table spacing are lint-driven (verified by linting the HEAD version, which fails on those lines), so they stay.
- **3 (low)**: recorded only. A scope hint would add text the help entry already carries.
- **Keep-list**: the TDD Check checklist, "Don't block - just note", Conversation Style, and Wrap-up are unchanged.

## Re-run

- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: see the coordinator's report.
- `./plugin/scripts/lint` on `plugin/skills/review-prep/SKILL.md` and this report: see the coordinator's report.
