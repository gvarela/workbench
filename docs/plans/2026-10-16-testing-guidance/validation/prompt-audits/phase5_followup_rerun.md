# Prompt audit: Phase 5 follow-up after the re-run (prompts-85o2)

Run 2026-10-18 with `/claude-api prompt-audit` (shared/prompt-audit.md) as the plan's prompt-audit gate for task prompts-85o2.

## Assumptions

- **Scope**: the lines changed since HEAD (`git diff HEAD`) in three files, each read in the context of its whole file:
  - plugin/skills/implement/SKILL.md (the pre-5.0.0 fallback paragraph, line 198)
  - plugin/skills/implement_inline/SKILL.md (the outer-test red close, lines 213-221, and the pre-5.0.0 fallback paragraph, line 225)
  - plugin/agents/test-reviewer.md (Procedure step 1, line 39, and the Review These template note, line 132)

  Read for consistency only, not edited: plugin/skills/implement/reference.md ("Evidence in Beads"), plugin/skills/test-quality/SKILL.md and its reference.md (preloaded by test-reviewer), and validation/checks/ac8.sh (another worker is editing it).
- **Target models**: Opus 5.5 for both skills (the session model the request names). test-reviewer.md is audited against its own frontmatter: Opus at `high` effort.
- **Edits**: the request asked for high and medium findings to be applied within these three files, so they are applied in the working tree. Nothing is committed. test-reviewer frontmatter is unchanged.

## Summary

The diff is small and mostly sound. The fallback wording in both skills reliably produces the phrase that ac8.sh checks for, and the inline heredoc block agrees with reference.md character for character. The two issues worth editing:

1. **test-reviewer step 1 contradicted itself and the preloaded rubric (high).** It sent items that "await the majority of three" to "Review these", but its own template (lines 122-123) and its opening paragraph (line 12) send them to Majority Candidates. It also counted "a mechanical reading of the test" as deterministic evidence. test-quality Part 4 and reference.md:50 define deterministic evidence as a named detector, a planted defect, or a diff, and reference.md:34 sends grep-heuristic hits to "review these". Under the rubric, an item-4 failure found only by reading is a judgment-only Rewrite, which needs a majority of three. The rewrite keeps the intent (an unanchored negative assertion becomes a Rewrite Finding) by getting deterministic evidence for it: plant a defect that empties the result and show that the test still passes.
2. **Inline heredoc block: column 0 was only in a pointer (medium).** In the raw markdown the block is indented 4 spaces with its list item, and the text sent the reader to reference.md for "the delimiter rule". A literal copy of the indented `WB_REPORT_END` does not end the heredoc (the phase5_followup_heredoc probe showed the command still exits 0 and posts the trailing lines as text). One clause now states the column-0 requirement where the block is shown, and the pointer still covers the rest of the rule.

Counts: Group 1: 0 findings. Group 2: 1 high, 1 medium, 3 low/flag. Group 3: not applicable (no tool descriptions; the test-reviewer `description` is unchanged). Group 4: not applicable.

## Check (a): the fallback statement against ac8.sh

ac8.sh's "says the plan predates" clause (line 26) greps the run's assistant text, case-insensitively, for:

```
predate[sd]? (the )?acceptance criteria|no acceptance criteria|without acceptance criteria|older plan
```

Both skills now say: "say in your output that the plan has no acceptance criteria because it predates 5.0.0, so outer tests are skipped and no red commits will appear (the human needs to know why)". The content to state contains "no acceptance criteria", so the most likely outputs ("the plan has no acceptance criteria because it predates 5.0.0", "No acceptance criteria: plan predates 5.0.0") match the second alternative. The instruction fixes the content, not the sentence, so it does not dictate a canned line. The pattern and the wording can meet.

The other ac8 clauses do not catch the new wording either. "skipped" and "appear" are neither a HALT_WORD nor a DEMAND_WORD. A paraphrase such as "no red(AC-n) commit is needed" is removed by NEGATED_DEMAND before the clause matches.

The residual risk is in paraphrase, not in the prompt: "lacks acceptance criteria", "has no ACs", or "predates 5.0.0" alone would miss the check (flag item L1 below).

## Findings

### H1. test-reviewer step 1: where non-deterministic Part 1 failures go (high, applied)

- **Location**: plugin/agents/test-reviewer.md:39
- **Evidence**: "A failure shown deterministically (by a planted defect, a detector, or a mechanical reading of the test) is a Finding with its verdict, never a "Review these" entry: a negative or all()-style assertion with no presence anchor (item 4) is a Rewrite. "Review these" holds only judgment-only observations that reach no verdict or await the majority of three."
- **Pattern**: Group 2, instruction files that contradict each other (the agent against the preloaded test-quality skill), plus a contradiction inside the agent file.
- **Why**: (1) "or await the majority of three" conflicts with test-reviewer.md:12, :122-123 (Majority Candidates holds judgment-only Remove or Rewrite) and :132 (Review These holds only no-verdict observations). (2) "a mechanical reading of the test" adds a deterministic evidence kind that test-quality SKILL.md Part 4 (line 82) and reference.md:50 do not have, and that the reviewer's own template (line 118: "deterministic (${detector, planted defect, or diff})") cannot express. reference.md:34 sends grep-heuristic hits to "review these" because they need judgment. A Rewrite resting on a reading alone would skip Part 4's majority-of-three rule (line 83). Both files load together, so the reviewer must reconcile them on every run. The request names test-quality as the authority, so the reviewer was rewritten to match it, not the other way round.
- **Action**: rewrite to: "A Part 1 failure with deterministic evidence (a detector, a planted defect, or a diff, as the skill's Part 4 names them) is a Finding with its verdict, never a "Review these" entry. For a negative or all()-style assertion with no presence anchor (item 4), that evidence is a planted defect that empties the result while the test still passes, and the verdict is Rewrite. A judgment-only Remove or Rewrite goes under Majority Candidates; "Review these" holds only judgment-only observations that reach no verdict."
- **Consistency after the edit**: Part 1 item 4 leads to Rewrite (Part 3, line 71). Deterministic evidence is the Part 4 set. Judgment-only Remove or Rewrite goes to Majority Candidates (Part 4, line 83; agent lines 12, 122-123). "Review these" holds other judgment-only observations (Part 4, line 83; agent line 132). Grep-heuristic hits stay "review these" (reference.md:34), because a heuristic is not a detector in reference.md's terms. No Group 2 conflict remains.

### M1. Inline red close: column 0 stated only by reference (medium, applied)

- **Location**: plugin/skills/implement_inline/SKILL.md:213-219
- **Evidence**: "... in this form, because `--reason "..."` breaks on a quote in the assertion line (the delimiter rule is in "Evidence in Beads" in [implement/reference.md](../implement/reference.md)):" followed by the block indented 4 spaces, closing `WB_REPORT_END`.
- **Pattern**: Group 2, wrong degrees of freedom (a fragile operation shown in a form that fails when copied literally, with its one load-bearing constraint only in another file).
- **Why**: in the raw text a model reads, the closing delimiter is not at column 0. reference.md:218 states the column-0 rule, but the inline session reaches it only by following the link. A copied indented delimiter does not close the heredoc, and the command still exits 0.
- **Action**: rewrite the lead-in to: "... breaks on a quote in the assertion line. Run it as one Bash call with every line, the closing `WB_REPORT_END` included, at column 0, not at this list's indentation ("Evidence in Beads" in [implement/reference.md](../implement/reference.md) gives the rest of the delimiter rule):". The edit restates only the column-0 requirement, not the quoting or delimiter rationale, and adds no lines (implement_inline/SKILL.md stays at 552).
- **Agreement with reference.md**: the command, the quoted delimiter, and the `red <sha>: <assertion line>` body match reference.md:213-215 exactly. The id requirement ("a bare `bd close` closes the last issue touched") matches beads-guide row 36.

### L1. Fallback wording against ac8's pattern (low, flag)

- **Location**: plugin/skills/implement/SKILL.md:198; plugin/skills/implement_inline/SKILL.md:225
- **Evidence**: "say in your output that the plan has no acceptance criteria because it predates 5.0.0".
- **Note**: the wording makes the matched phrase likely (see Check (a)). A paraphrase ("lacks acceptance criteria", "no ACs") would miss ac8.sh line 26. That brittleness belongs to the check, which this audit does not edit. No prompt change proposed.

### L2. "Nobody is watching" against "the human needs to know why" (low, flag)

- **Location**: plugin/skills/implement/SKILL.md:179 and :198
- **Note**: Step 5 says nobody watches the loop in real time. The fallback gives the human as the reason to state the skip. These do not conflict, because the statement is read later, at the checkpoint, and it asks for no reply. No edit.

### L3. The same fallback sentence in two skills (low, keep-list item 8)

- **Location**: plugin/skills/implement/SKILL.md:198; plugin/skills/implement_inline/SKILL.md:225
- **Note**: the two skills never load together and the copies agree. This is working redundancy. No edit.

## Other checks

- **(c) Static check 5** (rubric phrases only under plugin/skills/test-quality/): PASS after the edits. The changed lines name "Part 1", "Part 4", "item 4", and "presence anchor", but not "Can this test fail" or "Structure-insensitive".
- **(d) Project-agnostic**: the changed lines name no plan, fixture, criterion label, or beads id. "5.0.0" is the plugin version that introduced acceptance criteria, which is a fact about the plugin itself. `phaseN_outer_n` and `red(AC-n)` are generic placeholders already used throughout both skills.
- **Group 1 scan of the changed lines**: no capitalised pressure words, no hedges on requirements, no step choreography, no thinking-depth prose. "never a "Review these" entry" is a classification contract with its reason, not pressure.
- **Line limits**: implement/SKILL.md 433 (≤ 441), implement_inline/SKILL.md 552 (< 587). test-reviewer frontmatter unchanged.

## Dispositions

| Finding | Confidence | Disposition |
| --- | --- | --- |
| H1 test-reviewer step 1 routing and evidence kinds | high | Applied (test-reviewer.md:39) |
| M1 inline heredoc column 0 | medium | Applied (implement_inline/SKILL.md:213) |
| L1 paraphrase can miss ac8's pattern | low | Recorded only; the check's brittleness, outside these files |
| L2 "nobody watching" against "human needs to know" | low | Recorded only; no conflict |
| L3 duplicated fallback sentence | low | Recorded only; working redundancy (keep-list item 8) |
