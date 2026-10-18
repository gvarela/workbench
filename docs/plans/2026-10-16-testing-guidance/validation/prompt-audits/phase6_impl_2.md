# Prompt audit: phase6_impl_2 (/wb:test-audit skill and help entry)

- **Task**: `prompts-4fbv`, create `plugin/skills/test-audit/` with its help entry per tasks.md Phase 6 Changes Required 2 (design D8b, D10, AC-6)
- **Run**: 2026-10-18, `/claude-api prompt-audit plugin/skills/test-audit/SKILL.md plugin/skills/test-audit/sub-agent-prompts.md plugin/skills/test-audit/templates.md plugin/skills/help/SKILL.md`
- **Base commit**: `a22525d` (the three test-audit files are new and untracked; help/SKILL.md is modified in the working tree)

## Assumptions

- **Scope**: the three new test-audit files in full; for `plugin/skills/help/SKILL.md`, only the lines in `git diff HEAD`, read in the context of the whole file. Read alongside for conflicts, not edited: `plugin/agents/test-auditor.md`, `plugin/skills/test-quality/SKILL.md` and `reference.md`, `plugin/skills/implement/SKILL.md` (Step 8 majority settling), and the phase6_impl_1 audit's handed-over flags 6 and 8.
- **Target model**: Claude Opus 5.5 at `effort: high` for the skill (its frontmatter); the spawn prompts are read by `wb:test-auditor` (Opus 5.5, high).
- **Surface type**: coding-agent configuration (one skill with two reference files, one help skill). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: design.md D8 (table), D8b, D10, AC-6; tasks.md Phase 6 Changes Required 2 and 5.
- **Load-bearing (keep-list)**: frontmatter (`argument-hint: [scope]`, `model: opus`, `effort: high`), the exact intake line, the BARRIER with its reason, "Pass no `model` parameter" (repeated in sub-agent-prompts.md; agreeing redundancy, keep-list 8), the proposals-only and read-only rules with their reasons, the pending/skip rule names given as version-tied examples, the W1/W2 statement, and help/SKILL.md at or under 302 lines (static check 1).
- **Provenance**: every line under audit is this task's (uncommitted); no blame history.

## Summary

The skill carries D8b steps 1 to 6, the pruning policy, the W1/W2 statement, and both output paths, and it settles majorities exactly as implement Step 8 does. The highest-impact gaps were all in the read-only guarantee, which AC-6 measures. First, the before/after `git status --porcelain` comparison cannot see most of what a detector or test run writes: caches, logs, coverage files, and virtualenvs are git-ignored, so the comparison was blind to the writes it existed to catch. Plain `git status` also rewrites `.git/index` (verified below). The command is now `git --no-optional-locks status --porcelain --ignored`. Second, a literal reader running `bundle exec rubocop` or `uv run ruff` could rewrite `Gemfile.lock`, `uv.lock`, or `.venv` even with caches disabled; the wrapper flags that prevent it are now named. Third, the skill forbade a git worktree for test runs while the preloaded test-quality/reference.md prescribes "a disposable worktree" for the same evidence; the skill now names that override and its reason.

Counts per group:

- Group 1 (dated prompt text): 0 findings (no caps emphasis, hedges, or step scripts for judgment work)
- Group 2 (brittle skill and configuration files): 0 high, 3 medium (findings 1 to 3), 6 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 0 high, 3 medium (all applied), 6 low (recorded).

## Specific checks

### (a) Design fidelity

| Requirement (D8b, Changes Required 2) | Where |
| --- | --- |
| 1. Stack precedence plan, profile, detection; stated in the report | Step 1; template Scope row "Conventions source" |
| 2. Explicit detector selections from test-quality/reference.md; available but not enabled | Step 2; template Detectors section |
| 3. Custom heuristics | Step 3 (once, across the scope; hits passed per area) |
| 4. Parallel `wb:test-auditor` per area, BARRIER on every completion notification | Step 4, line 70 |
| 5. Suite-level checks only with command and services, otherwise "not run" with reason | Step 5; template Suite-Level Checks |
| 6. One report | Step 6; templates.md |
| Pruning policy: no edits; Remove and Consolidate need objective evidence or are judgment-only | Rules, "Proposals only"; template Objective evidence fields |
| W1/W2 not checkable cold; services lacked | Step 6; template Not Checked |
| Output path: plan directory, or `docs/test-audits/YYYY-MM-DD-<scope>.md` | Step 6 |
| Intake line, frontmatter | lines 2 to 7, 28 |
| D10 precedence and detection fields | Step 1 item 3 lists every research Testing Conventions field |

One deliberate deviation: D8b and reference.md:52 say the removed-test run happens "in a disposable worktree"; the skill uses a `git archive` export outside the repository instead, because AC-6 requires `git worktree list` unchanged and a worktree writes to `.git`. This is stricter than the design and correct for AC-6; finding 3 makes the override explicit.

phase6_impl_1's handed-over flags are both resolved: flag 6 (no pending/skip rule selected) by Step 2's second bullet, and flag 8 (a promoted judgment-only Remove lacks objective evidence) by Step 4's last sentence and the template's Remove entry.

### (b) Read-only guarantee in the target repository

Every command the coordinator is told to run, traced:

| Command | Writes to the audited repository? |
| --- | --- |
| Reading manifests, helpers, tests (Step 1) | No |
| `git status --porcelain` (before) | **Yes, `.git/index`**: verified in a scratch repository (git 2.55.0): after `touch f`, `git status --porcelain` advanced `.git/index`'s mtime; `git --no-optional-locks status --porcelain` did not. The porcelain output is unchanged, so AC-6's check is unaffected, but it is a write to `.git`, takes `index.lock` (a concurrent user `git` command can fail on it), and contradicts "touched nothing". Finding 1, applied |
| `git status --porcelain` as a change detector | **Blind to ignored files**: `.ruff_cache/`, `coverage/`, `log/`, `tmp/`, `.venv/` are normally git-ignored, so a detector or run that writes them leaves porcelain unchanged. `--ignored` lists new ignored directories (collapsed). Remaining blind spot: writes inside an ignored directory that already exists (an appended `log/test.log`). Finding 1, applied |
| `git stash list`, `git worktree list` | No |
| `rubocop --cache false` | Correct flag (`-C, --cache FLAG`, per RuboCop's CLI docs; rubocop is not installed here, so not run). RuboCop's default cache root is under `~/.cache`, outside the repository, unless `CacheRootDirectory` is configured |
| `ruff --no-cache` | Verified (`uvx ruff check --help`: `-n, --no-cache  Disable cache reads`); a run in a scratch directory with `--no-cache` created no `.ruff_cache`. Despite the help text's "reads", it disables the cache write too |
| eslint without `--cache` | Correct: ESLint writes `.eslintcache` only with `--cache` (eslint not installed here) |
| `npx --no-install` (Step 2, first bullet) | Does not install. On npm 7 and later `--no-install` is deprecated and mapped to `--no`; it still refuses to download. Finding 9, low |
| `bundle exec <linter>` (implied) | **Can write `Gemfile.lock`** when Bundler re-resolves (a missing platform, for example) unless `BUNDLE_FROZEN=true`. Finding 2, applied |
| `uv run <linter>` (implied) | **Writes `.venv` and can write `uv.lock`** unless `--frozen --no-sync` (flags verified with `uv run --help`). Finding 2, applied |
| Heuristic greps (Step 3) | No; the skill forbids uninstalled interpreters and AST helpers |
| `git log` on test paths (Step 5 brittleness) | No |
| `git archive HEAD \| tar -x -C <temporary directory>` | No write to the repository: `git archive` reads objects only, and `tar -x -C` writes into the named directory, which the skill places outside the repository. The export omits uncommitted and git-ignored files (`.env`, `config/master.key`), so a suite may not start there; the skill's "report it as not run and name what would make it safe" covers that. Finding 8, low |
| Report write | The one permitted write; in a new `docs/test-audits/` directory, porcelain shows `?? docs/test-audits/`, not the file, so the exception now names "the new directory that holds only it". Applied with finding 1 |

After the applied edits, a literal Opus 5.5 reader has no instruction that writes to the audited repository other than the report.

### (c) Contract with plugin/agents/test-auditor.md

- **Area spawn supplies the Inputs**: area paths, stack and conventions with source, detector output (tools run with selections and cache handling, violations, available but not enabled, no detector), and heuristic hits. All present. The agent's Inputs list does not name heuristic hits, though its step 3 consumes "the hits your input carries" (finding 6, low, agent file outside scope).
- **Candidates spawn**: location, rubric item, proposed verdict, area, and conventions, and no first-auditor reasoning. It does not pass the code exercised; the agent reads it itself ("each from the test and the code it exercises"), which keeps the judgment independent. Correct.
- **Aggregation reads the auditor's sections**: Step 4 consumes Majority Candidates and Not Run; Step 6 and the template map Findings, Review These, and Detectors. Every section the agent returns has a destination.
- **Majority settling** matches implement/SKILL.md:297 sentence for sentence (second spawn on every candidate, third only on splits, 2 of 3 becomes a finding recorded "n of 3", any other goes to "review these") and test-quality Part 4.
- **Promoted judgment-only Remove** carries "judgment-only, not actionable" (Step 4, last sentence; template Remove entry's Objective evidence field).

### (d) BARRIER

One BARRIER (line 70), on every area auditor's completion notification, with its reason in a plain sentence, in the repository CLAUDE.md's form. Not duplicated. The later wait for candidate judgments (line 72) is a separate synchronization point stated in prose; marking it as a second BARRIER is optional (finding 7, low).

### (e) The help table merge

The merge folded "Less Common" into the main beads slash-command table: all 16 commands and every "When to Use" text are kept, in the same order (common first), under one header. Lost: only the "Less Common" label. The table reads correctly. Less invasive alternatives would cut content instead (the 5 lines saved equal the label, two blank lines, and a repeated header and separator), so the merge is the least lossy trim. No change proposed.

The new `test-audit` row in "What each stage needs from you" has all five columns, and the Command Details entry says "outside the stage chain"; the stage chain is unchanged, as Changes Required 2 requires. help/SKILL.md is 302 lines.

### (f) Project-agnostic

No plan, repository, label, AC, phase, `prompts-`, or weakness-code (W1 to W6) references in the three files. The pending/skip rule names are given as "for example, rubocop-rspec 2.x declares `RSpec/Pending` (disabled by default) and `RSpec/PendingWithoutReason` (pending status)", after "Take the exact rule name from the installed tool's configuration or documentation, not from memory", with "another version or tool may differ". The version claim matches rubocop-rspec 2.x's documented defaults (not verified against an installed gem here). Template paths are placeholders.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `SKILL.md:23`, `:56`; `templates.md:29` | "record the output of `git status --porcelain` ... compare them again ... leaving out only the report file itself" | Group 2, volatile specifics (a command that does not do what the text relies on) | Porcelain omits ignored files, so cache, log, and coverage writes pass the comparison; plain `git status` rewrites `.git/index` (verified); a new report directory shows as the directory, not the file | Medium | `rewrite` (applied): `git --no-optional-locks status --porcelain --ignored`, with the reason for each flag; the exception covers the new directory that holds only the report; Step 2 refers to "the status command from the rules above"; template row updated |
| 2 | `SKILL.md:56` | "Linters write caches, so disable them (for example `rubocop --cache false`, ...)" | Group 2, wrong degrees of freedom (fragile operation under-specified) | The common invocations `bundle exec` and `uv run` write lockfiles or a virtualenv regardless of linter cache flags | Medium | `add` (applied): "Runner wrappers write too: `bundle exec` can rewrite `Gemfile.lock` unless `BUNDLE_FROZEN=true` is set, and `uv run` syncs `.venv` and `uv.lock` unless given `--frozen --no-sync`." |
| 3 | `SKILL.md:82` against `test-quality/reference.md:52` and design D8b | "never in the repository or in a git worktree of it" vs "a passing run with the test removed in a disposable worktree" | Group 2, instruction files that contradict each other | The coordinator reads reference.md in full before Step 2, so it holds both rules; the skill's narrower rule is right (AC-6: `git worktree list` unchanged) but did not name what it overrides | Medium | `rewrite` (applied): adds "(the disposable worktree that test-quality/reference.md names is for plan reviews; here a worktree would change `git worktree list` and write to the repository's `.git`)". Direction: toward the stricter rule, so no prohibition is loosened. reference.md not edited |
| 4 | `SKILL.md:18` | "Read both in full before Step 2" | Group 2, sequencing | Step 1 cites "as the test-quality skill orders them", but Step 1 also lists the order itself, so nothing breaks | Low | `flag` |
| 5 | `templates.md:37` | Headline column "Judgment-only (n of 3)" on the Consolidate row | Group 2, field narrower than its rows | Judgment-only Consolidate is not majority-settled (Part 4 covers Remove and Rewrite only); the template's Consolidate entry correctly omits "n of 3" | Low | `flag` |
| 6 | `plugin/agents/test-auditor.md:19-24`, outside scope | Inputs list omits heuristic hits | Group 2, contract gap | The area prompt passes them and agent step 3 consumes them; only the list is incomplete | Low | `flag` (agent file) |
| 7 | `SKILL.md:72` | "wait for each completion notification before writing the report" | Group 2, unmarked synchronization point | A real wait, stated plainly; a second ⛔ marker is optional | Low | `flag` |
| 8 | `SKILL.md:82` | `git archive HEAD \| tar -x -C <temporary directory>` | Group 2, unstated edge | The export lacks uncommitted and git-ignored config, and dependencies may need installing there; the "not run, name what would make it safe" fallback covers it | Low | `flag` |
| 9 | `SKILL.md:53` | "`npx` without `--no-install`" | Group 2, volatile specifics | Deprecated on npm 7+ in favour of `--no`, but still honoured (no download) | Low | `flag` |

Also noted, no finding: `sub-agent-prompts.md` uses `Task({...})` as every other skill in the plugin does (repository convention, keep-list 8).

## Dispositions

- **1 (medium)**: applied in `SKILL.md:23`, `SKILL.md:56`, and `templates.md:29`. phase6_test_1's `ac6.sh` check of plain porcelain still holds, since the skill's comparison is a superset.
- **2 (medium)**: applied in `SKILL.md:56`.
- **3 (medium)**: applied in `SKILL.md:82`. Group 2 conflict resolved toward the stricter, newer rule (the skill), with the override named; reference.md is unchanged because plan reviews legitimately use a worktree (D8a write safety).
- **4 to 9 (low)**: recorded only. 6 waits for the next change to test-auditor.md.
- **Keep-list**: frontmatter, intake line, BARRIER, rule-name examples, W1/W2 statement, and the help merge unchanged; help/SKILL.md stays at 302 lines (no help edits made).

## Re-run

- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: all 17 pass (check 17 passes now that this report exists).
- `./plugin/scripts/lint` on the three test-audit files, help/SKILL.md, and this report: clean.
- `claude plugin validate ./plugin`: passes.

### Coordinator follow-up after verification (2026-10-18)

The verifier found two problems with how the skill excludes its own report from the before/after comparison.

1. git collapses a new directory to its topmost path, so the report may show only as `?? docs/`, and that line would also hide a stray file next to the report. `SKILL.md:23` now tells the coordinator to confirm with `--untracked-files=all` on that directory that the report is its only file.
2. The read-only row in the template named the command without `--no-optional-locks`. `templates.md:29` now matches the command in the skill.
