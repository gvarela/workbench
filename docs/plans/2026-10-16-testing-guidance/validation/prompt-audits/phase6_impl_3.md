# Prompt audit: phase6_impl_3 (/wb:testing-profile skill and help entry)

- **Task**: `prompts-66vs`, create `plugin/skills/testing-profile/` with its help entry per tasks.md Phase 6 Changes Required 3 (design D10)
- **Run**: 2026-10-18, `/claude-api prompt-audit plugin/skills/testing-profile/SKILL.md plugin/skills/help/SKILL.md`
- **Base commit**: `53aea1b` (testing-profile/SKILL.md is new and untracked; help/SKILL.md is modified in the working tree)

## Assumptions

- **Scope**: `plugin/skills/testing-profile/SKILL.md` in full; for `plugin/skills/help/SKILL.md`, only the lines in `git diff HEAD`, read in the context of the whole file. Read alongside for consistency, not edited: `plugin/skills/create_research/templates.md` (Testing Conventions, :86-99), `plugin/skills/test-quality/SKILL.md` (:15-19), `plugin/skills/test-quality/reference.md` (Method steps 1, 3, 5), `plugin/skills/test-audit/SKILL.md` (Step 1, Step 5). `plugin/skills/review-prep/SKILL.md` is out of scope (audited separately).
- **Target model**: Claude Opus 5.5. The skill pins no model or effort, so it runs on the session model.
- **Surface type**: coding-agent configuration (two skills). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: design.md D10; tasks.md Phase 6 Changes Required 3.
- **Load-bearing (keep-list)**: the exact intake line, the CHECKPOINT with its reason, "install nothing" and "change nothing else" with their reason, the diff-not-overwrite rule, the frontmatter description (trigger text), and help/SKILL.md at or under 302 lines.
- **Provenance**: every line under audit is this task's (uncommitted); no blame history.

## Summary

The skill carries D10 and Changes Required 3 faithfully and is short and plainly worded; Group 1 has nothing to report. Two medium gaps were in the contract with the profile's consumers. First, Step 1 lists the fields in paraphrase ("fixtures or factories", "fast and full commands", "any mutation tool") and Step 2 said only "a heading for each field above, in research's order", so a literal reader would name headings from the paraphrase, and they would drift from research's labels ("Fixtures vs factories", "Commands", "Mutation tool"). That drift is the comparison research makes when it records where the code differs from the profile. It was also unclear whether research's Profile field, which points at this file, belongs in the draft. Step 2 now names and orders the headings by research's labels and leaves Profile out. Second, on refresh the skill kept the existing file's Choices "because they are the part that cannot be re-detected", but the Mutation level is a team choice too. With no mutation tool installed, Step 2's default of `off` would replace a confirmed `advisory` level in the draft. The rule now keeps both.

Counts per group:

- Group 1 (dated prompt text): 0 findings
- Group 2 (brittle skill and configuration files): 0 high, 2 medium (findings 1 and 2), 3 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 0 high, 2 medium (both applied), 3 low (recorded).

## Specific checks

### (a) Fidelity to D10 and Changes Required 3

| Requirement | Where | Result |
| --- | --- | --- |
| Detection fills exactly research's Testing Conventions fields | Step 1 lists all nine factual fields (frameworks and versions through services), the same list test-audit Step 1 uses; Profile is correctly excluded | Pass; heading names tightened (finding 1) |
| Draft adds Choices and Mutation (`off`, or `advisory` with a command) | Step 2 bullets | Pass |
| Writes only after confirmation, behind a CHECKPOINT with a reason | Step 3, "Writing before then would present a guess as a decision the team made." | Pass |
| An existing profile is diffed, never silently overwritten | Step 3, "show the differences against it rather than the whole draft" | Pass; Mutation level now kept with Choices (finding 2) |
| Never installs anything, changes nothing else | Step 1, second paragraph; frontmatter "installs nothing" | Pass |
| Exact intake line | Initial Response, line 12 | Pass, verbatim |
| Help: Command Details entry and table row | help/SKILL.md table row and `### /wb:testing-profile` | Pass |

### (b) Consistency with the profile's consumers

- **research templates.md :99 (Profile)**: research cites `.claude/wb/testing.md` as the baseline and records drift. The comparison works best field by field, so the profile now uses research's labels and order as headings (finding 1). Consistent.
- **test-quality/SKILL.md :15-19**: precedence is plan research, then `.claude/wb/testing.md`, then inference. The skill's opening paragraph says the same ("read it before falling back to detection"). Consistent.
- **test-audit/SKILL.md Step 1**: same three-level order; its detection field list matches the skill's Step 1 list. Consistent.
- **test-quality/reference.md step 3, test-audit Step 5**: mutation runs only when the conventions source declares its command. `advisory` followed by a command declares it; `off` declares none, so no consumer runs mutation. Consistent. See low finding 3 for the one residual ambiguity.

Result: the headings the skill writes are the ones the consumers read: research's nine labels plus Choices and Mutation.

### (c) The help trim

The removed block held a lead sentence ("Both work - use whichever fits your flow") and a fenced example with two CLI commands and two slash commands, each commented with where it is used. The replacement sentence keeps "Both work", both contexts (terminal or scripts; conversation), and all four commands verbatim, including the `--reason "Done"` flag. Nothing a reader needs is lost; only the "whichever fits your flow" phrasing went, and it is implied by "Both work". The new table row fills all five columns in the table's register, and its evidence column names the file, the headings, and "nothing else changed". The Command Details entry is accurate. testing-profile is absent from the Command Workflow chain (lines 58-92); its description says "Outside the stage chain". help/SKILL.md is 297 lines.

### (d) Project-agnostic

testing-profile/SKILL.md names no plan, repository, issue, or label. In the help diff, the trimmed sentence keeps the example ID `prompts-abc`, which carries this repository's beads prefix (low finding 5).

## Findings

### 1. Medium: heading names paraphrase research's labels

- **Location**: `plugin/skills/testing-profile/SKILL.md:18`, `:24`
- **Evidence**: "Write the draft with a heading for each field above, in research's order"; the "field above" list paraphrases the labels ("fixtures or factories", "fast and full commands", "any mutation tool").
- **Pattern**: Group 2, wrong degrees of freedom (a fragile, cross-file interface given in loose prose)
- **Why**: Opus 5.5 follows the text literally and would take the headings from the paraphrase. Research compares the profile against the code field by field (templates.md :99), so mismatched labels weaken that comparison. Research's own Profile field could also be copied into the file it points at.
- **Action**: rewrite to "a heading for each field above, named and ordered as research's Testing Conventions labels them (leave out its Profile field, which points at this file)".

### 2. Medium: refresh keeps Choices but not the Mutation level

- **Location**: `plugin/skills/testing-profile/SKILL.md:31`
- **Evidence**: "keep its Choices unless the user changes them, because they are the part that cannot be re-detected."
- **Pattern**: Group 2, contradiction inside the file: the stated reason covers Mutation too, but the rule does not, and Step 2's default (`off` when no tool is installed) would override a confirmed `advisory` level.
- **Why**: the diff would show the change, but the default would put it there, and a reviewer skimming a diff can accept it without noticing.
- **Action**: rewrite to "keep its Choices and Mutation level unless the user changes them, because they are the parts that cannot be re-detected."

### 3. Low: the mutation command could appear under two headings

- **Location**: `plugin/skills/testing-profile/SKILL.md:18`, `:27`
- **Evidence**: the Mutation tool field (detected) and the Mutation heading (`off` or `advisory <command>`).
- **Why**: the consumers run mutation when the source "declares its command". If a draft writes a runnable command under Mutation tool while Mutation is `off`, a consumer could read that as declared. Step 1 asks only for the tool, so this needs the model to add a command it was not asked for. Flag only.
- **Action**: flag.

### 4. Low: the help Command Details entry does not say "outside the stage chain"

- **Location**: `plugin/skills/help/SKILL.md:240`
- **Evidence**: the test-audit entry opens with "outside the stage chain"; the testing-profile entry does not.
- **Why**: the chain at :58-92 already omits testing-profile and its description says so. This is a stylistic difference between neighbouring entries, not an error.
- **Action**: flag.

### 5. Low: example ID `prompts-abc` carries this repository's prefix

- **Location**: `plugin/skills/help/SKILL.md:185`
- **Evidence**: "`bd close prompts-abc --reason "Done"`", "`/beads:close prompts-abc`"
- **Why**: shipped files use `prompts-abc` as the placeholder in five other places (create_research and create_mockup templates, validate_project reference, create_tasks SKILL.md and examples.md). The text predates this change and was carried over verbatim. Changing it in one file would leave the placeholders inconsistent. A plugin-wide change is out of scope for this task.
- **Action**: flag.

## Proposed diff (applied)

```diff
-Write the draft with a heading for each field above, in research's order, each with file:line references where a file shows it.
+Write the draft with a heading for each field above, named and ordered as research's Testing Conventions labels them (leave out its Profile field, which points at this file), each with file:line references where a file shows it.
```

```diff
-... and keep its Choices unless the user changes them, because they are the part that cannot be re-detected.
+... and keep its Choices and Mutation level unless the user changes them, because they are the parts that cannot be re-detected.
```

## Dispositions

| # | Confidence | Disposition |
| --- | --- | --- |
| 1 | Medium | Applied: Step 2 names and orders headings by research's labels and leaves out Profile. |
| 2 | Medium | Applied: Step 3 keeps the existing Choices and Mutation level. |
| 3 | Low | Recorded only. |
| 4 | Low | Recorded only. |
| 5 | Low | Recorded only. A plugin-wide placeholder change belongs to a separate task. |

help/SKILL.md is unchanged by this audit and remains at 297 lines (limit 302).
