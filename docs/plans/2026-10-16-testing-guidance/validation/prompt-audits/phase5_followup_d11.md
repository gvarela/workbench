# Prompt audit: Phase 5 follow-up, D11 (prompts-ev16)

Run 2026-10-18 with `/claude-api prompt-audit` (shared/prompt-audit.md) as the plan's prompt-audit gate for task prompts-ev16, design D11.

## Assumptions

- **Scope**: the lines changed since HEAD (`git diff HEAD`) in seven files, each read in the context of its whole file:
  - plugin/skills/implement/SKILL.md
  - plugin/skills/implement/reference.md
  - plugin/skills/implement/sub-agent-prompts.md
  - plugin/agents/task-worker.md
  - plugin/skills/implement_inline/SKILL.md
  - plugin/skills/validate_execution/SKILL.md
  - plugin/skills/validate_execution/sub-agent-prompts.md

  docs/beads-guide.md was checked for its citations only. Other agents' files (validation/checks/ac3.sh, ac8.sh, validation/fixtures/) were read where needed and not touched.
- **Target models**: Opus 5.5 for the skills. task-worker.md is read by Sonnet 5.5 at `medium` effort, from its frontmatter.
- **Inputs read**:
  - design.md `#### D11.`
  - `bd show prompts-ufsh` (the decision)
  - `bd show prompts-ev16` with both comments
  - ac3.sh's `red_evidence` parser
- **Edits**: the request asked for high and medium findings to be applied, so they are applied in the working tree. Nothing is committed.

## Summary

The diff meets D11 and every comment on prompts-ev16:

- red record format;
- reports and created-file lists as comments;
- `--json` reading;
- halt kind;
- findings filed as issues;
- commit-body recording removed;
- test-writer and test-reviewer bd-free.

The audit found five issues worth editing:

1. **Session-only Test Integrity (gap b).** implement's Step 8 reviewer read the verifiers' Test Integrity sections from the session, so a fresh session lost them.
2. **Temp file placement.** "Write it to a temporary file" did not say where. A worker that writes the file inside the repository leaves an untracked file in its own diff, and the verifier reads that as a scope or undeclared change.
3. **"Every report" contradicts `discarded:`.** The verifier and fix-worker prompts said "every report in the task's comments", while the `discarded:` rule voids earlier inner reports. Read literally, the prompts brought back the hole the marker closes.
4. **Record comments read as reports.** Nothing told a reader that `test integrity:`, `created files:`, `halted:` and `discarded:` comments are records, not reports. The reading rule now names them.
5. **validate_execution finding links.** Its finding-filing rule had no fallback when the commit that last changed a test names no task, for example a `red(AC-n)` commit. implement and implement_inline both have one.

Counts:

| Group | Findings |
| --- | --- |
| 1, dated text | 0 |
| 2, configuration files | 5 (3 high, 2 medium) |
| 3, tool descriptions | not applicable |
| 4, request config | not applicable |
| Low or flag | 4 |

## (a) Fidelity to D11 and the decision

| Requirement | Where it is met | Result |
| --- | --- | --- |
| Red record `red <sha>: <assertion line>` in `close_reason` | implement/SKILL.md:194; reference.md:210-214; implement_inline/SKILL.md:213 | Met. ac3.sh matches `^red [0-9a-f]{7,40}:` on `close_reason`. "Short sha" gives 7 or more hex characters, and "the line naming the failed assertion" carries AssertionError, `assert`, or `expect(...)` for ASSERT_RE |
| Reports posted as comments, outer by the coordinator, inner by the worker or inline session | reference.md:216-220; task-worker.md:21; implement_inline/SKILL.md:211 | Met |
| Created-file list as a comment | task-worker.md:24; reference.md:223 | Met (prompts-ev16 comment 2.1) |
| Readers use `bd comments <id> --json` | reference.md:231; implement_inline/SKILL.md:211; validate_execution/SKILL.md:104 | Met |
| Halt kind recorded | reference.md:167,179,224-228; implement/SKILL.md:240-241,403 | Met (comment 2.2). Resume finds the halted task by the latest `halted:` comment that no commit names |
| Halt "continue" and Resume read reports from comments | reference.md:200-202; implement/SKILL.md:403 | Met (comment 1) |
| Findings filed as issues linked to their task | implement/SKILL.md:297 with reference.md:232-237; implement_inline/SKILL.md:329; validate_execution/SKILL.md:106 | Met. `--deps discovered-from:` was live-tested per beads-guide |
| Commit-body recording removed | implement_inline/SKILL.md:211,325,445; validate_execution/SKILL.md:104 and its sub-agent prompt | Met. No "commit bod" text remains under plugin/ |
| test-writer and test-reviewer stay bd-free | test-writer.md and test-reviewer.md are not in the diff; every post is made by a caller | Met |

## Findings

### F1. Step 8 Test Integrity sections live only in the session (high, applied)

- **Location**: implement/SKILL.md:218, 295, 412; reference.md "Evidence in Beads".
- **Evidence**: "Keep the report's Test Integrity section, pass or fail, for the Step 8 test review." Step 8 then passed "each task verifier's Test Integrity section".
- **Pattern**: Group 2, a volatile specific contradicted by the repository. D11's rationale is that evidence living only in the session is lost on resume. Resume step 5 recovers the phase's starting commit for this review, but it could not recover the sections.
- **Action**: rewrite (see "How (b) was implemented").

### F2. Temporary report file has no location (medium, applied)

- **Location**: task-worker.md:21; reference.md:216; implement_inline/SKILL.md:211.
- **Evidence**: "write it to a temporary file and run `bd comments add [task-id] -f <file>`".
- **Pattern**: Group 2, wrong degrees of freedom: a fragile operation left vague.
- **Why**: Sonnet at `medium` reads "a temporary file" literally and may write `report.md` beside the code. The verifier diffs the working tree against the starting commit and would see an untracked non-test file. The inline session commits the task's files and could sweep the file into the commit. The Write tool refuses to overwrite an existing file it has not read, so the name should be one no earlier report used.
- **Action**: rewrite to "write it with your Write tool to a new file outside the repository, such as `/tmp/[task-id]-report-<n>.md` (a file inside the repository would show up in your diff as an undeclared change)". The same wording, adapted, is in reference.md and implement_inline.
- **(d) answered**: the file comes from the worker's own Write tool, which task-worker's `tools:` lists, at a path outside the repository. Step 6, `bd close`, stays the worker's last act: posting happens inside RED (step 2), and the created-files comment is step 5.

### F3. "Every report" contradicts the `discarded:` rule (high, applied)

- **Location**: implement/sub-agent-prompts.md:88 and :106.
- **Evidence**: "every report in the task's comments ..." The discarded bullet in reference.md says "Readers skip the inner reports ... posted before it".
- **Pattern**: Group 2, two instruction files that disagree on the same point. Both are new in this diff, so there is no history to order them. The `discarded:` rule is the specific one and states the reason.
- **Why**: a retry worker that edits a test file directly would have its edit "declared" by a voided report from the discarded attempt. Opus reads "every" as written.
- **Action**: rewrite. The verifier input now reads "the reports in the task's comments, read as reference.md's 'Evidence in Beads' says: the outer reports, then the inner ones that no later `discarded:` comment voids, verbatim". The fix-worker input reads "the reports in the task's comments, read as for the verifier, verbatim".

### F4. The reading rule does not separate records from reports (medium, applied)

- **Location**: reference.md:231 (Reading); validate_execution/SKILL.md:104.
- **Evidence**: "A test-writer report is a comment with a Mode field." The discarded rule was stated only in its own bullet, and "created files" lists posted before a discard were still named by the discard step.
- **Pattern**: Group 2, duplicated information that drifts. With the new `test integrity:` comments, a task now carries four kinds of record comment beside the reports.
- **Action**: rewrite. The Reading bullet now names the four record prefixes and states the skip-before-latest-`discarded:` rule for both inner reports and `created files:` lists. validate_execution says the same in a parenthesis.

### F5. validate_execution's finding link has no fallback (high, applied)

- **Location**: validate_execution/SKILL.md:106.
- **Evidence**: "where the task is the one whose commit last changed the test (`git log -1 -- <test file>`)". implement and implement_inline add "or to the phase milestone when no task did".
- **Pattern**: Group 2. The three skills disagree, and the repository shows the gap: a `red(AC-n)` commit names no task id, so `git log -1` can return a commit with no task to link.
- **Action**: rewrite with "..., or the plan's epic when that commit names no task". validate_execution runs plan-wide and has no single phase milestone, so it uses the epic.

### Low findings and flags (not edited)

- **L1. Quotes in the red close reason.** An assertion line often contains double quotes (`assert "Sep 30" not in body`), and `--reason "red <sha>: <line>"` with those quotes breaks the shell. Opus usually escapes them. Flag; revisit if a headless run shows a truncated `close_reason`.
- **L2. Which item-7 report counts as missing.** "Post any item 7 report the comments lack" does not say how to match a report to a comment. Matching by the report's criterion and Files field is the obvious reading. Flag.
- **L3. validate_execution ignores the `test integrity:` comments.** It now could pass them to its reviewer, but its mode stays `inline`, so the reviewer re-checks integrity over the range itself. Using them would be a scope change outside D11. Flag.
- **L4. A plan-defect halt leaves the worker's closed issue closed.** The Failed Re-verification Halt reopens its task; the Plan-Defect protocol does not, and relies on `bd dep add` against the revision issue for dependents. This predates the diff; the new `halted: plan defect` comment makes the task findable. Flag.

## (b) How the gap was implemented

- **implement/SKILL.md Step 6 item 3** (line 218). When each verifier report arrives, the re-verification's included, the coordinator posts its Test Integrity section, pass or fail, as a `test integrity:` comment on the task, as "Evidence in Beads" says, because the report itself does not survive the session. This replaces "Keep the report's Test Integrity section".
- **Step 8 item 3** (line 295). The reviewer gets "each task verifier's Test Integrity section from the phase tasks' `test integrity:` comments".
- **Resume step 5** (line 412). "the earlier verifiers' Test Integrity sections are in the phase tasks' `test integrity:` comments".
- **reference.md "Evidence in Beads"**, a new **Test integrity** bullet (line 222). Post the section the same way as a report: the `-f` file form, the first line `test integrity:`. Post the re-verification's section too. A later `discarded:` comment does not void these, because an integrity finding stays part of the phase's counts (design: "Integrity flags logged per task").
- **Reading bullet** (line 231). Names `test integrity:` among the record prefixes.

All edits were in place: implement/SKILL.md stays at 433 lines (limit 441).

## (c) The two rules beyond the spec

- **`discarded:` marker: sound, and needed.** Without it, after "discard and retry":
  - the voided attempt's inner reports would still read as declarations, so a retry worker's direct test edit to the same file would pass the verifier's undeclared-change check;
  - its `created files:` list would name paths the retry may legitimately recreate.

  Keeping the outer reports is right, because the `red(AC-n)` commits stay. Clarity was the weak point: the verifier and fix-worker prompts said "every report", and the reading rule did not repeat the skip. Both are fixed (F3, F4). The rule now lives in one place, the Reading bullet, and both prompts point there.
- **The coordinator posts any item-7 report the comments lack: sound.** It covers the cases where a Sonnet worker skips the post or runs out of budget before making it. Without the safety net, the verifier would get fewer reports than the worker wrote, and declared test changes would FAIL as undeclared. A duplicate post is harmless, because the same declaration appears twice. Trust does not change: the worker authors both its comment and its item 7. One clarity gap, which report counts as missing, is recorded as L2.

## (d) Sonnet-literal risk in task-worker.md

See F2:

- **Source of the file**: the worker's own Write tool, which task-worker's `tools:` lists.
- **Location**: a fresh path outside the repository.
- **Close ordering**: `bd close` remains step 6, the last act. Both comment posts come before it (the reports in step 2, the created files in step 5). The Worker Prompt Template still says "make `bd close ${task.id}` your last act".

## (e) Consistency across the three skills

| Convention | implement (reference.md) | implement_inline | validate_execution |
| --- | --- | --- | --- |
| Post reports with `-f`, file outside the repository | yes | yes (F2) | not applicable (reads only) |
| Read with `bd comments <id> --json`, `text` field; plain forms drop spans | yes | yes | yes |
| Report = comment with a Mode field; record prefixes are not reports | yes (F4) | not applicable: inline posts only reports | yes (F4) |
| `discarded:` voids earlier inner reports | yes | not applicable: inline has no discard flow | yes |
| Finding issue: same title, type, priority, `--deps discovered-from:`, description fields | yes | yes | yes, with its own fallback (F5) |
| Red close reason `red <sha>: <assertion line>` | yes | yes | not applicable |

## (f) Project-agnostic

No changed line under plugin/ names a plan, fixture, criterion number, beads id, or label. A grep of the added lines for `prompts-`, `fixture`, `rides`, `validation/`, `testing-guidance` and `2026-` matched only the path `sub-agent-prompts.md`. `/tmp/...-report-<n>.md` is a generic example path.

## Dispositions

| Finding | Confidence | Disposition |
| --- | --- | --- |
| F1 Test Integrity only in the session | High | Applied: implement/SKILL.md:218, 295, 412; reference.md:222, 231 |
| F2 temp file location | Medium | Applied: task-worker.md:21; reference.md:216; implement_inline/SKILL.md:211 |
| F3 "every report" against `discarded:` | High | Applied: implement/sub-agent-prompts.md:88, 106 (Group 2 conflict resolved toward the specific, reasoned rule) |
| F4 record prefixes in the reading rule | Medium | Applied: reference.md:231; validate_execution/SKILL.md:104 |
| F5 validate_execution link fallback | High | Applied: validate_execution/SKILL.md:106 |
| L1 quotes in the close reason | Low | Recorded only |
| L2 item-7 matching | Low | Recorded only |
| L3 validate_execution and integrity comments | Low | Recorded only (scope) |
| L4 plan-defect issue stays closed | Low | Recorded only (predates the diff) |

The keep-list governed throughout:

- Reasons attached to rules were kept: why `-f`, why `--json`, why the comments survive.
- No working redundancy was removed: the inline skill restates the posting and reading rules for a session that never reads reference.md.

**Length limits**:

| File | Lines | Limit |
| --- | --- | --- |
| implement/SKILL.md | 433 | ≤ 441 |
| implement_inline/SKILL.md | 544 | < 587 |
| validate_execution/SKILL.md | 230 | ≤ 232 |

**beads-guide.md**: the new reference.md bullet shifted three cited bd lines. The citations were refreshed:

| Row | Old line | New line |
| --- | --- | --- |
| `create ... --deps discovered-from:` | 234 | 235 |
| `comments add` (halt kind) | 226 | 227 |
| `comments ... --json` | 230 | 231 |

The `comments add -f` row now notes that the same form posts the `test integrity:` comment (reference.md:222). Verified-on stays 1.1.0: `bd version` 1.1.0, and `bd comments add --help` and `bd comments --help` were re-read for `-f/--file` and `--json`.

## Checks

- `NO_COLOR=1 bash validation/static-checks.sh`: 16 of 17 pass. Check 4 fails as expected (`plugin/agents/test-auditor.md missing`).
- `./plugin/scripts/lint` on the seven changed plugin files, docs/beads-guide.md and this report: all clean.
- `claude plugin validate ./plugin`: passes (also static check 10).
