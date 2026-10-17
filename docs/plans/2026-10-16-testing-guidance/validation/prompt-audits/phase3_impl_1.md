# Prompt audit: phase3_impl_1 (acceptance criteria and harness decisions in create_design)

- **Task**: `prompts-l6oo`, add Acceptance Criteria and Harness Decisions to the design.md template, and carry the new intake through create_design, help, and wb-prime
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/create_design/templates.md plugin/skills/create_design/SKILL.md plugin/skills/help/SKILL.md plugin/hooks/wb-prime.sh`
- **Base commit**: `60611fd` (the change is uncommitted in the testing-guidance worktree; see `git diff HEAD -- <files>`)

## Assumptions

- **Scope**: the four named files, limited to the lines this task changed: `templates.md:71-93` (Acceptance Criteria, Illustration, Harness Decisions), `create_design/SKILL.md:23`, `:207`, `:286`, `:295`, `help/SKILL.md:104`, `:231`, and `wb-prime.sh:19`, `:34`. Whole files were read for context. The Pending Decisions table re-padding (`templates.md:134-137`) is a whitespace-only lint fix and is not audited.
- **Target model**: Claude Opus 5.5, as the request names. These are coding-agent configuration files (skills and a SessionStart hook whose stdout the session model reads).
- **Surface type**: coding-agent configuration. No request-building code, tool definitions, or non-Anthropic provider markers are in scope.
- **Design source**: `design.md` D1 (each criterion has Given/When/Then, an example, Observed at, a Seam "required when the boundary is behind an external service or an LLM", Refines), D2 (Harness Decisions table from research's Testing conventions), and the plan's checks `validation/checks/ac1.sh`, `ac2.sh`, `ac7.sh`.
- **Load-bearing (keep-list)**: the field labels the checks and create_tasks read (`AC-n`, `Given`, `When`, `Then`, `Example:`, `Observed at:`, `Seam:`, `Refines:`, `### Harness Decisions`, the decision vocabulary `Add harness / Manual / Lower proxy`), the "one criterion per changed behavior" granularity, and the WHAT/HOW split in SKILL.md.
- **Provenance**: all changed lines are uncommitted, so `git blame` attributes them to this task.

## Summary

The change is well-shaped: plain register, no pressure language, field labels that match the checks exactly, and the WHAT/HOW boundary stated with its reason. Two template sentences did not fit. The `Refines:` field asks for a "Success Metric id, for example M1", but the template's Success Metrics list (`templates.md:24-27`) gives metrics no ids, and nothing else in the plugin defines one; a literal reader either invents ids inconsistently or cannot satisfy BARRIER 4's "every acceptance criterion names the Success Metric it refines". And the intro called the illustration "after the template" when it sits inside the template's fence, so a model filling the template top to bottom would carry the Illustration line into design.md, where `ac1.sh` would credit its Given/When/Then/Example/Refines to the last real criterion and mask missing fields. Both were rewritten in the intro sentence (`templates.md:73`).

Counts per group:

- Group 1 (dated prompt text): 2 low
- Group 2 (brittle skill and configuration files): 2 medium, 2 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 0 high, 2 medium, 4 low (flag).

## Specific checks

- **(a) Template fields vs checks**: match. `ac1.sh` finds the section by `^#+ .*Acceptance Criteria` (`### Acceptance Criteria`), blocks by `^- **AC-n` (`- **AC-1 ...**`), and the labels `Given`, `When`, `Then`, `Example:`, `Observed at:`, `Seam:`, `Refines:` all appear verbatim. `ac2.sh` finds `^#+ .*Harness Decisions` (`### Harness Decisions`) and accepts `add harness|manual|lower proxy`, with a lower proxy needing a loss word (`cannot` is in the placeholder). `ac7.sh` greps research for `Testing conventions` case-insensitively; the template points at research's `Testing Conventions` section, which is the heading in `create_research/templates.md:86`. No label mismatch. One semantic divergence is recorded as finding 3.
- **(b) Project-agnostic**: clean. No reference to this plan, its fixtures, audited repositories, or plan labels in any changed line; the illustration is a generic password-reset case, and `M1` / `AC-1` are generic id formats.
- **(c) Intake consistency**: create_design's "This stage needs from you" line (`SKILL.md:23`: the approach, the refined metrics, the acceptance criteria with their harness decisions) matches help's **You decide** cell (`help/SKILL.md:104`) item for item, and wb-prime's line (`wb-prime.sh:34`). help's **You provide** cell ("the approach, when no decision record exists") is unchanged and was not mirrored by the SKILL line before this task either; the SKILL line lists approvals, which is the You decide column. wb-prime's six-line summary is still six lines (header plus five stages); both wb-prime edits are in place.
- **(d) WHAT/WHY**: clean. Nothing in the new text orders tests. "One criterion per changed behavior, so each can be pinned by one test" (`SKILL.md:286`) is granularity, and `SKILL.md:295` sends test writing and sequencing to tasks.md. "Add harness" in the Harness Decisions table is a decision; when the harness task runs is left to create_tasks.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `templates.md:83` (with `:24-27`) | "Refines: [Success Metric id, for example M1]" | Group 2, volatile specifics (a claim the repository contradicts) | The template's Success Metrics bullets carry no ids and no plugin file defines a metric id format, so the field cites something that does not exist. Opus 5.5 reads the placeholder literally; BARRIER 4 (`SKILL.md:207`) then has no stable target | Medium | `rewrite` (applied at `:73`, inside the changed lines): "naming the Success Metric it refines (number the Success Metrics M1, M2, ... so criteria can cite them)" |
| 2 | `templates.md:73`, `:85` | "The illustration after the template shows the shape; do not copy its content." | Group 2, volatile specifics (the sentence misdescribes the file) / 1c example handling | The Illustration line is inside the ```markdown fence, not after it. "Do not copy its content" forbids the domain but not the line, and current models fill templates literally, so the line lands in design.md. There `ac1.sh` counts its Given/When/Then, digit-bearing Example and Refines toward the last AC block, hiding that block's missing fields | Medium | `rewrite` (applied): "The Illustration line below shows the shape only; leave it out of design.md." |
| 3 | `templates.md:81-82` | "Observed at: [... HTTP response, ...]" / "Seam: [only when the boundary is external or an LLM ...]" | Group 2, conflict between the shipped template and a plan check (not between instruction files) | The template follows design D1 (seam only for an external or LLM boundary). `ac1.sh` treats any `Observed at:` containing "http" or "api" as external, so a criterion observed at the app's own HTTP response, written faithfully without a Seam, fails AC-1. The check script is outside this audit's scope and shipped text should not bend to a check heuristic | Low | `flag`: for the plan owner, either narrow `ac1.sh`'s external trigger or accept that fixtures avoid own-HTTP boundaries |
| 4 | `templates.md:85` | the single Illustration line | 1c, example over-indexing (single gold example) | One example in one domain can anchor length and phrasing. It is labeled, pins a format-sensitive shape, and is in a different domain from any likely plan (keep-list 7) | Low | `flag` (no edit) |
| 5 | `templates.md:89` | "Take \"Harness present?\" from research's Testing Conventions section." | Group 2, volatile specifics | Plans whose research predates the Testing Conventions section have none to read; create_design states a fallback for plans that predate the Intent section (`SKILL.md:84`) but not for this one. A model will most likely write "not researched" or inspect the repository, both acceptable | Low | `flag` (no edit) |
| 6 | `SKILL.md:286`, `templates.md:73` | "one criterion per changed behavior" in both | 1c, padding (repetition) | Two agreeing statements in files loaded together; working redundancy (keep-list 8) | Low | `flag` (no edit) |

## Proposed diff (applied)

```diff
--- a/plugin/skills/create_design/templates.md
+++ b/plugin/skills/create_design/templates.md
@@ -73 +73 @@
-One criterion per changed behavior, each checkable at a boundary a test can observe and naming the Success Metric it refines. The illustration after the template shows the shape; do not copy its content.
+One criterion per changed behavior, each checkable at a boundary a test can observe and naming the Success Metric it refines (number the Success Metrics M1, M2, ... so criteria can cite them). The Illustration line below shows the shape only; leave it out of design.md.
```

Findings 1 and 2 share one sentence, so they share one hunk.

## Dispositions

- **Finding 1 (medium)**: applied at `templates.md:73`. The alternative fix, prefixing `M1:` to the Success Metrics bullets at `:25-26`, is outside the changed lines; the intro sentence carries the instruction instead.
- **Finding 2 (medium)**: applied at `templates.md:73`.
- **Finding 3 (low, flag)**: recorded only. It concerns `validation/checks/ac1.sh`, which is not shipped and not in scope; shipped text keeps design D1's seam rule.
- **Findings 4, 5, 6 (low, flag)**: recorded only.
- **Group 2 conflicts**: none between instruction files. create_design, help, and wb-prime agree on the new intake.
- **Constraints after edits**: `create_design/SKILL.md` 333 lines (≤ 333), `help/SKILL.md` 302 lines (≤ 302); neither file was edited by this audit.
