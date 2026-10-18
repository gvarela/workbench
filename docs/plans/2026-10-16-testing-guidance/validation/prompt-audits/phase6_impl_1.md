# Prompt audit: phase6_impl_1 (wb:test-auditor agent)

- **Task**: `prompts-xplp`, create `plugin/agents/test-auditor.md` per tasks.md Phase 6 Changes Required 1 (design D8b)
- **Run**: 2026-10-18, `/claude-api prompt-audit plugin/agents/test-auditor.md`
- **Base commit**: `5131350` (the file is new and untracked in the testing-guidance worktree)

## Assumptions

- **Scope**: all of `plugin/agents/test-auditor.md` (new file). Read alongside for conflicts, not edited: the preloaded `plugin/skills/test-quality/SKILL.md`, its `reference.md`, and the sibling `plugin/agents/test-reviewer.md`, which the auditor was patterned on.
- **Target model**: Claude Opus 5.5 at `effort: high`, `maxTurns: 40` (the file's own frontmatter).
- **Surface type**: coding-agent configuration (one subagent definition plus its preloaded skill). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: design.md D8 (table) and D8b; tasks.md Phase 6 Changes Required 1 and 2, and Changes Required 5 (AC-6 read-only checks).
- **Load-bearing (keep-list)**: frontmatter `model: opus`, `effort: high`, `skills: [test-quality]` (static check 4), `tools: Read, Grep, Glob, Bash`, `maxTurns: 40`; the read-only paragraph and its reasons; the independence reason for Majority Candidates; the Not Run instruction for an oversized area; the report template, which matches test-reviewer's minus its plan-only fields.
- **Provenance**: every line is this task's (uncommitted, new file); no blame history.

## Summary

The agent carries D8b faithfully and stays read-only, but four places would read wrong to a literal Opus 5.5. First, the cold-audit paragraph told the auditor to judge "a planted defect for a criterion-guarding test" against "the conventions' harness per boundary", which has no meaning when planted defects are forbidden two paragraphs earlier; it now maps each criterion-dependent item to its cold substitute and says protection is always judged by reading. Second, custom-heuristic hits were routed to "Review these" only (reference.md's instruction), while the file also says "Review these" holds only no-verdict observations: a heuristic hit the auditor confirms as Rewrite had no home. It now goes to Majority Candidates, which is what test-quality Part 4 requires. Third, D8b has the coordinator run the custom heuristics too, so the auditor now confirms the hits its input carries instead of re-finding them. Fourth, `git blame` was offered unbounded; it is now `git blame -L` on a range, with log and show limited to a path or commit.

Counts per group:

- Group 1 (dated prompt text): 0 high, 1 medium (finding 3), 0 low
- Group 2 (brittle skill and configuration files, including the description's trigger-text split): 0 high, 3 medium (findings 1, 2, 4; finding 5 is folded into 2), 5 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 0 high, 4 medium, 5 low (flag).

## Specific checks

### (a) Design fidelity

D8b specifies the auditor as `model: opus`, `effort: high`, preloading `test-quality`, `maxTurns` sized for one area, applying Parts 1-4 to an assigned area and returning findings; Changes Required 1 adds the tools and inputs (area, stack and conventions, detector output) and "never edits or deletes tests". All are present. The pruning policy (no agent edits tests; Remove and Consolidate need objective evidence) is in step 4 and the read-only paragraph. The suite-level checks (redundancy, factory cost, flakiness, brittleness) stay with the coordinator, as D8b step 5 places them.

The two worker additions:

- **Candidates input with agree/disagree mode: sound.** Test-quality Part 4 needs three independent judgments before a judgment-only Remove or Rewrite becomes a finding, and the file's own opening paragraph says a second reading in one context is not independent. A fresh auditor given only location, rubric item, and proposed verdict, without the first auditor's reasoning, is an independent judgment, and the mode is read-only like the rest. It mirrors test-reviewer.md:27,31 word for word except "from the test and the code it exercises" in place of "its criterion", which is the right cold substitute. It gives the coordinator (phase6_impl_2) the mechanism D8b step 4's "combine" needs to settle majorities; that skill must spawn two more auditors per candidate set.
- **Dropping planted defects and all test runs: sound.** Part 1 item 5 applies only to a test that guards an acceptance criterion, and a cold audit has none (D8 table: "Code and git history only"). The objective Remove evidence D8b names ("a passing run with the test removed in a disposable worktree") is a suite-level check the coordinator runs when services exist. AC-6 requires `git worktree list` unchanged, and parallel auditors each adding and removing worktrees risks a leftover on interruption; test runs and linters write caches and some suites reset shared services. Keeping every write and run in the coordinator gives one place to check AC-6. The cost is that item 5 is always judgment-only here, which finding 1 now states plainly.

### (b) Read-only guarantee

- No instruction a literal reader could follow writes to the repository. Line 15 forbids `git stash`, `git worktree`, `git checkout` and any writing git command, and forbids the suite, the detectors, and planted defects "even in a copy outside the repository", with reasons. Step 3 limits heuristics to `grep` or reading; reference.md's "or an AST helper" is not repeated, so no interpreter or `npx` download (which writes caches) is invited.
- `git blame` was offered without bounds (finding 4, applied).
- `git status` is not mentioned; it can refresh `.git/index` (a stat refresh, not visible in `--porcelain`). Low, finding 9.
- The auditor never runs the suite or linters itself: line 15 and step 4 ("Your caller runs the suite-level checks") agree.

### (c) Rubric consistency with test-quality

- **Deterministic means a detector, a planted defect, or a diff**: step 1 names "a detector in your input, or a diff in the git history, as the skill's Part 4 names them"; the template's evidence-type line names "detector and rule, or diff". Planted defect is omitted because none runs, which is consistent.
- **Judgment-only Remove/Rewrite go to Majority Candidates**: lines 13, 34, and the template agree. Heuristic hits confirmed into a verdict did not (finding 2, applied).
- **"Review these" holds only no-verdict observations**: line 34 and the template say so; step 3 now agrees.
- **Remove/Consolidate need objective evidence**: step 4 and the template's Objective evidence field match Part 3 and reference.md.
- **A `pending` with no reason, found only by reading, under Majority Candidates: correct.** Part 1 item 3 fails, Part 3 gives Remove, and Part 4 admits a judgment-only Remove as a finding only on a majority of three, which the coordinator settles. Even after a majority it remains judgment-only on objective evidence and so not actionable (Part 3).
- **Can a grep-able `pending`/`skip` count as deterministic?** Only through a named detector. The auditor's own grep is not one: Part 4 lists named detectors, and reference.md files grep heuristics under "review these". If the coordinator passes in a detector that flags pending or skipped examples, step 1 already makes that a deterministic Finding; finding 3 removes the literal reading under which the "pending" example overrode it. reference.md's RSpec row lists `Focus` but no pending or skip rule, though its method selects the "skipped or focused tests" category. rubocop-rspec has `RSpec/Pending` and `RSpec/PendingWithoutReason` (names from the rubocop-rspec documentation; not verified against an installed gem here). Whether the coordinator selects one is a phase6_impl_2 decision (finding 6). AC-6's recall check on the `pending` construct depends on it: without a detector the hit reaches the report only via a 2-of-3 majority.

### (d) Consistency with test-reviewer.md

The shared rules agree: the opening paragraph (auditor:13 = reviewer:12), the Candidates mode (auditor:24,26 vs reviewer:27,31), the Part 1 routing sentence (auditor:34 vs reviewer:39, minus planted defect), and the Findings, Majority Candidates, Review These and Detectors template blocks (minus the Criterion field). The auditor's read-only rule is broader than the reviewer's working-tree rule, appropriate to a cold audit. The heuristic-routing gap in finding 2 also exists in reviewer:69 (finding 7, flag only).

### (e) Project-agnostic

No plan, repository, fixture, label, AC, phase, or `prompts-` references. "The plan's research" and `.claude/wb/testing.md` are wb's own conventions sources (as in test-reviewer and test-quality). "A database or Redis" names a service class, not a repository. Template paths (`tests/feature.test.ts`) are placeholders.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `test-auditor.md:28` (before) against `:15` and test-quality Part 1 item 5 | "The rubric items that depend on a criterion (a planted defect for a criterion-guarding test, ...) are judged against the conventions' harness per boundary" | Group 2, wrong degrees of freedom (instruction with no executable reading) | Line 15 forbids planted defects, so "judge a planted defect against the harness" cannot be followed; a literal reader may try to plant one or skip the item | Medium | `rewrite` (applied): maps "Observed at" to the harness per boundary, doubles to declared seams, data shapes to named shapes, and says protection is always judged by reading (no planted defect runs) and labelled judgment-only |
| 2 | `test-auditor.md:42` (before) against `:34`, test-quality Part 4, reference.md "Custom heuristics" | "report each hit as the reference.md directs" (Review these) vs "'Review these' holds only judgment-only observations that reach no verdict" | Group 2, instruction files that contradict each other | A heuristic hit the auditor confirms as Rewrite (an expected value that calls a production helper) reaches a verdict, so it cannot sit in Review These, yet the only routing given sends it there. Part 4 sends a judgment-only Rewrite to the majority process. Not a weakening: the hit still needs a 2-of-3 majority | Medium | `rewrite` (applied): unconfirmed hits under Review These; a confirmed Remove or Rewrite is judgment-only and goes under Majority Candidates |
| 3 | `test-auditor.md:34` (before) | "A Part 1 failure you found by reading, such as a test skipped or marked pending with no stated reason, is judgment-only" | Group 1c, example over-indexing | The example names exactly the construct a skip/pending detector flags. Step 1 runs before step 3 turns detector output into findings, so a literal reader can file a detector-flagged pending as judgment-only | Medium | `rewrite` (applied): "only your reading shows, ... that no detector in your input flagged" |
| 4 | `test-auditor.md:15` (before) | "for example `grep`, `git log`, `git show`, and `git blame`" | Group 2, wrong degrees of freedom | Read-only, but a whole-file blame or unbounded `git log -p` on a large repository runs for minutes and eats a 40-turn budget; the auditor needs history only for specific lines or commits | Medium | `rewrite` (applied): "`git log` and `git show` limited to a path or a commit, and `git blame -L` on a line range" with the reason |
| 5 | `test-auditor.md:42` (before) against D8b step 3 | coordinator "Run custom heuristics where no linter exists"; auditor "check the skill's custom heuristics in your area with grep" | Group 2, duplicated work across coordinator and worker | Both would run the same greps and could report the same hit twice. Applied together with finding 2 | Medium (counted under 2) | `rewrite` (applied): "confirm the hits your input carries, or find them ... when it carries none". phase6_impl_2 should pass heuristic hits per area |
| 6 | `reference.md:23` (RSpec row), outside this file | `Focus` listed; no pending or skip rule | Group 2, gap in a file outside this task | Without a selected pending/skip rule, AC-6's `pending` construct can only reach the report by majority. The method's "skipped or focused tests" category covers it, so the coordinator can select it without a reference edit | Low | `flag`: for phase6_impl_2 (detector selections) |
| 7 | `test-reviewer.md:69`, outside this file | "including its custom heuristics" | Group 2, same routing gap as finding 2 | The reviewer has the same Review These vs Majority Candidates ambiguity for confirmed heuristic hits | Low | `flag`: align when test-reviewer is next touched |
| 8 | `test-auditor.md:72-75` (Majority Candidates template) | no Objective evidence field | Group 2, field narrower than reference.md's finding shape | A Remove that wins a majority is still not actionable without objective evidence; the coordinator must add "judgment-only, not actionable". Same in test-reviewer | Low | `flag` (no edit; for phase6_impl_2's report template) |
| 9 | `test-auditor.md:15` | read-only list does not mention `git status` | Group 2, unstated edge | `git status` may refresh `.git/index`; invisible to AC-6's `--porcelain` check and not invited by the file | Low | `flag` (no edit) |
| 10 | `test-auditor.md:3` | "Spawned by /wb:test-audit" | Group 3 split, trigger text | Routing description is accurate and names the skill phase6_impl_2 creates | Low | `flag` (no edit) |

## Dispositions

- **1 (medium)**: applied. Line 28 rewritten; the criterion stays out of every finding, and protection is judgment-only.
- **2 (medium)**: applied. This is the Group 2 conflict; resolved toward test-quality Part 4, which governs both reference.md's heuristics and the auditor. reference.md is not edited (outside the task); its "review these" still holds for unconfirmed hits.
- **3 (medium)**: applied.
- **4 (medium)**: applied.
- **5 (medium, folded into 2)**: applied in the same sentence.
- **6-10 (low)**: recorded only; no edits. 6 and 8 are handed to phase6_impl_2; 7 waits for the next test-reviewer change.
- **Keep-list**: frontmatter unchanged (static check 4 passes); the read-only paragraph keeps every prohibition and reason; the Candidates mode, the independence reason, the Not Run rule, and the report template are unchanged.

## Re-run

- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: all 17 pass (check 17 passes now that this report exists).
- `./plugin/scripts/lint plugin/agents/test-auditor.md docs/plans/2026-10-16-testing-guidance/validation/prompt-audits/phase6_impl_1.md`: both clean.
- `claude plugin validate ./plugin`: passes.
