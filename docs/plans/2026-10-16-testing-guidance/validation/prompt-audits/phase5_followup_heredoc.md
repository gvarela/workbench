# Prompt audit: Phase 5 follow-up, heredoc posting (prompts-37mh)

Run 2026-10-18 with `/claude-api prompt-audit` (shared/prompt-audit.md) as the plan's prompt-audit gate for task prompts-37mh.

## Assumptions

- **Scope**: the lines changed since HEAD (`git diff HEAD`) in four files, each read in the context of its whole file:
  - plugin/agents/task-worker.md
  - plugin/skills/implement/reference.md
  - plugin/skills/implement/SKILL.md
  - plugin/skills/implement_inline/SKILL.md

  docs/beads-guide.md was checked for its citations only. validation/checks/ac3.sh was read for its close-reason parser and not touched.
- **Target models**: Sonnet 5.5 at `medium` effort for task-worker.md (its frontmatter), Opus 5.5 for the skills.
- **Edits**: the request asked for high and medium findings to be applied, so they are applied in the working tree. Nothing is committed.

## Summary

The change replaces the Write-tool temp file with a quoted heredoc for both posts: `bd comments add [id] -f /dev/stdin <<'WB_REPORT_END'` for reports, and `bd close [id] --reason-file - <<'WB_REPORT_END'` for the red record. Both forms work exactly as the files show them, in one Bash tool call, under zsh (the Bash tool's shell here) and bash. The delimiter is quoted everywhere, and every closing delimiter sits alone on its own line.

The audit found two issues worth editing:

1. **Indented closing delimiter (medium).** In the raw markdown that a model reads, each heredoc block is indented with its list item (3 spaces in task-worker.md, 2 in reference.md). A literal copy of that indentation keeps the delimiter from closing the heredoc. The scratch probe showed the effect: the command still exits 0 and prints "Comment added". The comment text then holds the indented delimiter and every later line of the command. zsh gives no warning; bash warns only on stderr. Nothing in the text said the lines go at column 0.
2. **"Every post below uses the same form" (medium).** In reference.md this contradicted the Halt kind entry just below it, which posts with an inline quoted string (`bd comments add [task-id] "halted: ..."`).

Counts: Group 1: 0. Group 2: 2 medium, 2 low/flag. Group 3: not applicable. Group 4: not applicable.

## Scratch-database results

These ran in a scratch database under the job's tmp/audit-37mh/ directory (`git init`, `bd init --stealth`, bd 1.1.0). Each form was run as the files show it, as one Bash tool call:

| Form | Input | Result |
| --- | --- | --- |
| `bd comments add [id] -f /dev/stdin <<'WB_REPORT_END'` (Bash tool, zsh) | multi-line report with backticks, `<li>`, both quote kinds, `$HOME`, `$(whoami)`, a bare `EOF` line | "Comment added". `bd comments [id] --json` returned `text` byte-for-byte, with nothing expanded, the `EOF` line kept, and one trailing newline |
| `bd close [id] --reason-file - <<'WB_REPORT_END'` (Bash tool, zsh) | `red 1a2b3c4: AssertionError: assert "<li>a</li>" == 'it''s'` | closed; `close_reason` in `bd list --all --json` is the line verbatim plus `\n` |
| same close form, run from a script under zsh | `red 5e6f7a8: AssertionError: assert "x" == 'y'` | closed, verbatim plus `\n` |
| comment form with the closing delimiter indented 3 spaces (script, under zsh and under bash) | one indented line | exit 0, "Comment added". The text held the indented delimiter and the script's next line (`echo "after-heredoc-marker"`), and that echo never ran. bash printed `warning: here-document ... delimited by end-of-file`; zsh printed nothing |

ac3.sh applies `re.match(r"red [0-9a-f]{7,40}:", reason)` to `close_reason`. The heredoc's first line is the red record and the trailing newline comes after it, so the match holds. ac3 also replaces newlines with spaces before it greps for an assertion.

## Findings

### F1: Indented closing delimiter silently corrupts the post (medium)

- **Location**: plugin/agents/task-worker.md:21-29; plugin/skills/implement/reference.md:212-227
- **Evidence**: the fenced blocks sit inside list items, so the raw text is `WB_REPORT_END` (task-worker) and `WB_REPORT_END` (reference)
- **Pattern**: Group 2, wrong degrees of freedom. This is a fragile operation, and the exact command form does not pin the one detail that breaks it.
- **Why it needs an edit**: Sonnet 5.5 at medium effort follows its agent file literally, and the file shows the block indented. The scratch run confirmed that an indented delimiter leaves the heredoc open. The command then exits 0 and posts a corrupt comment, with no error for the worker or the verifier to catch.
- **Action**: `add`. reference.md's delimiter paragraph, where the rule is stated once, now says: "Run the whole heredoc in one Bash call, with every text line and the closing `WB_REPORT_END` starting at column 0: the indentation above belongs to this list, and an indented delimiter does not end the heredoc, so the rest of the command is silently posted as text." task-worker.md gets the same sentence after its block, because the worker does not load reference.md.

### F2: "Every post below uses the same form" contradicts the Halt kind entry (medium)

- **Location**: plugin/skills/implement/reference.md:219 against reference.md:233
- **Evidence**: "Every post below uses the same form." The Halt kind entry below it posts `bd comments add [task-id] "halted: re-verification failed"`
- **Pattern**: Group 2, instructions that contradict each other on the same point (here within one file)
- **Why it needs an edit**: a literal reader cannot tell which form applies to the halt and `created files:` posts. Short fixed strings are safe inline, so the narrower statement is the right one.
- **Action**: `rewrite` to "The report and test-integrity posts below use the same form."

### F3: task-worker.md restates the delimiter rationale (low, flag)

- **Location**: plugin/agents/task-worker.md:21 (and now :29) against plugin/skills/implement/reference.md:219
- **Evidence**: "the delimiter is quoted so nothing expands, and distinctive so no report line ends it early"
- **Pattern**: Group 2, duplicated info across files. Keep-list item 8 (working redundancy) governs.
- **Why flag only**: the worker is a subagent that never loads reference.md, so it cannot refer back to the rule. The two copies agree. Everywhere else refers back to "Evidence in Beads" without restating it: implement/SKILL.md:194 and implement_inline/SKILL.md:211 and :213.

### F4: a bare `--reason-file -` without the heredoc would read empty stdin (low, flag)

- **Location**: plugin/skills/implement/SKILL.md:194; plugin/skills/implement_inline/SKILL.md:213
- **Evidence**: "`bd close [outer-step-id] --reason-file -` and the red record on stdin"; "with `red <sha>: <assertion line>` on stdin through the same quoted heredoc"
- **Pattern**: none documented. The risk is that an Opus session takes the inline mention as the whole command.
- **Why flag only**: both lines point to "Evidence in Beads", which shows the full form, and Opus 5.5 follows such links. No observed failure.

## Checks against the request

- **(a) Heredoc correctness**: the delimiter is quoted (`<<'WB_REPORT_END'`) in all four places that show a form. Each closing delimiter is alone on its own line, but indented in raw markdown; F1 adds the column-0 instruction. Both forms run as shown (see Scratch-database results).
- **(b) Bash tool**: a multi-line heredoc in one Bash tool call worked for both forms. No text suggests splitting a heredoc across calls, and the F1 sentence now says one call explicitly.
- **(c) Rule stated once**: reference.md:219 is the single statement. implement/SKILL.md and implement_inline/SKILL.md refer to it. task-worker.md restates it because it has to (F3). F2 removes the one contradiction.
- **(d) Consistency with ac3.sh**: in every form the heredoc's first line is `red <sha>: <assertion line>`, and `close_reason` begins with it.
- **(e) Project-agnostic**: the changed lines in plugin/ have no plan, fixture, label, or issue-id references. `red(AC-n)` and `phaseN_outer_n` are the plugin's own generic conventions.

## Dispositions

| Finding | Confidence | Disposition |
| --- | --- | --- |
| F1 indented closing delimiter | medium | Applied in reference.md:219 and task-worker.md:29. The text was added within existing lines, so no bd line moved |
| F2 "every post" contradiction | medium | Applied in reference.md:219 |
| F3 task-worker restatement | low | Recorded only. Keep-list item 8 applies: the worker cannot load reference.md |
| F4 bare `--reason-file -` mention | low | Recorded only. Both skills link to the full form |

Line limits: implement/SKILL.md is 433 lines (limit 441) and implement_inline/SKILL.md is 544 (limit under 587); neither changed in this audit. The docs/beads-guide.md citations were re-checked and all still resolve: task-worker.md:24, 32, 33, and reference.md:213, 223, 228, 233, 237, 241.
