# Prompt audit: wb plugin against current model guidance (2026-09-29)

This is an audit of the wb plugin's prompt surface for dated prompting patterns (the `/claude-api prompt-audit` method), plus a check of the plugin's configuration against the current Claude Code plugin, skill, subagent, and hook documentation. This page is the summary. The four slice reports next to it hold every finding with its evidence, pattern, reason, confidence, and replacement text: [A-research](A-research.md), [B-design](B-design.md), [C-implement](C-implement.md), and [D-ops](D-ops.md).

## Assumptions

- **Scope.** The audit covers everything that reaches the model from this repository: all 25 skills and their supporting files, the 7 agents, `plugin/docs/reference/`, the text that `hooks/wb-prime.sh` prints, and the root `CLAUDE.md`. It skips `.claude/settings*.json`, because settings files can hold secrets. It also skips `~/CLAUDE.md`, which lives outside the repository. `docs/` is maintainer documentation that the model never loads, so it is out of scope, except that `docs/beads-guide.md` is updated because the repository requires it (see below).
- **Target models.** Skill and agent bodies are audited against Claude Opus 5.5, the Claude Code session default. The exceptions:
  - A file that pins `model: sonnet` is audited against Claude Sonnet 5.5, and one that pins `model: haiku` against Claude Haiku 4.5.
  - `create_tasks` and `explore_design` are also audited against Claude Fable 5.1, because they recommend it.
- **Provenance.** Three sources ground the findings:
  - The repository's own convention, CLAUDE.md "Working with Commands": mark each sync point once and give the reason in a plain sentence. It was added in 4dd28ca on 2026-09-05.
  - The blind trial of 2026-09-05, recorded in beads memory `wb-barrier-volume-not-discriminator`. Loud barrier wording did not hold a wait-for-all gate, and CAPS/NEVER performed the same as plain "Do not".
  - `git blame`: every loud barrier line dates from before the convention.

## Summary

The most important finding is **loud emphasis the repository has already decided against**. Nine skills still used `⛔⛔⛔ BARRIER n: STOP! … ⛔⛔⛔` barriers, 18 lines in all. Each one contradicted the one-marker, stated-reason convention in CLAUDE.md, and the repository's own trial showed the volume buys nothing. Around them were blocks of CRITICAL / MUST / NEVER / "ABSOLUTELY FORBIDDEN" text, and the documentarian rule was restated eight to ten times per research skill. Current models follow a once-stated instruction literally, so repetition and caps now cause rigidity and over-application rather than compliance. The proposed diff rewrites every barrier to the house form, each with a reason, and states each scope rule once in plain language. Lines in `plugin/` that carry a caps marker drop from 98 to 13.

The second is **instructions that contradict each other or the code**. Examples:

- `implement` says both "one attempt" and "up to 2 retries" for fix workers.
- `help` checks for a design status of `approved`, which does not exist. The valid values are draft, ready, implementing, and complete.
- `help` and `validate_project` give plain `bd init` as the fix. CLAUDE.md and `beads-mode.md` say `--stealth`.
- `resume_handoff` reads a `beads_in_progress` field that the handoff template never writes.
- Three places still describe checkbox status, although beads is the only status source.
- `create_tasks` summarizes its dependencies as the chained graph that the skill itself forbids.
- `CLAUDE.md` and `README.md` list a `general/` directory that has never existed.

These are high-confidence, because the repository itself contradicts them.

The third is **roster and naming**. `codebase-analyzer` and `product-behavior-analyzer` had the same tools, model, and effort, and near-duplicate prompts that differed only in audience. The diff folds them into one agent that takes an Audience input. Spawn blocks used bare agent names (`codebase-locator`) where plugin agents are registered as `wb:codebase-locator`, so the diff adds the prefix.

### Counts

Group 3 (tool descriptions) and Group 4 (request config) are not applicable: this is a configuration repository with no API calls. The one exception is the Group 4 sub-agent roster check, which produced one merge.

| Slice | Findings | High | Medium | Low / flag | Applied in diff |
| --- | --- | --- | --- | --- | --- |
| A research | 15 | 4 | 8 | 3 | 12 |
| B design & tasks | 10 | 1 | 6 | 3 | 6 (F5 is folded into F3's commit) |
| C implement | 16 | 7 | 5 | 4 | 12 |
| D ops, help, CLAUDE.md | 19 | 6 | 8 | 5 | 13 |

Most findings are in Group 1 (pressure language, repeated restatements, migration-relative and incident phrasing) and Group 2 (contradictions, stale paths and fields, duplicated rules, trigger precision).

## The proposed diff

The branch `worktree-prompt-audit-2026-09-29` holds **one commit per finding**, so you can take hunks selectively with `git cherry-pick <hash>`. Commit subjects start with the slice and finding ID (`A-F1`, `D-F14`, and so on) and match the slice reports. `*-ns` commits add the `wb:` prefix to agent names, and `*-lint` commits fix markdown lint on the lines the findings touched. Across 41 files the diff adds 218 lines and removes 590.

`docs/beads-guide.md` is re-swept in its own structural commit. CLAUDE.md requires any change to a bd command in `plugin/` to update the contract inventory. D-F3 (`bd init` to `bd init --stealth`) and D-F10 (`bd list` to `bd list --all -n 0`) move call sites between inventory rows, and the removed lines shifted citations in 31 rows. The row count stays at 47, and no verified-on value changes.

**Commits to consider separately**, because each changes behavior rather than wording:

- **A-F12, the roster merge.** It deletes `wb:product-behavior-analyzer`, which is a user-visible agent. It needs a version bump, and arguably belongs at 4.0.0 with the alias removals. Cherry-pick everything except A-F12 to defer it. If it is deferred, the product spawn block in `create_product_research/sub-agent-prompts.md` keeps the old name.
- **C-F1, one fix attempt.** It settles the contradiction in favour of "one attempt", which matches L204 and the fix-worker prompt. If two retries was the intent, invert this commit.
- **D-F11, the review-prep trigger.** The description no longer matches the bare word "review", so that word goes to the bundled `/code-review` instead.

## Flagged, not in the diff

- **The CLAUDE.md beads block (lines 229–276)** has about eight unreasoned MUST / MANDATORY / NEVER / CRITICAL markers. It is generated by `bd init` inside `BEGIN/END BEADS INTEGRATION` markers, so a hand edit would be overwritten. Any change has to go through the beads tooling.
- **The deprecated alias stubs** in `implement_coordinated/` and `implement_tasks/` are intentional 5-line pointer files, added so stale pre-rename sessions still resolve their reads. Remove them together with the alias skills at 4.0.0.
- **`task-worker` `maxTurns: 60` against the measured "~70 tool calls" ceiling** in `implement` and `docs/subagent-tool-call-ceiling.md`. One turn can make several parallel calls, so the two numbers are not the same unit, but a worker may hit `maxTurns` before the harness ceiling. Before trusting the split threshold, confirm which limit truncated the observed workers.
- **D-F6.** `update_status` closes beads phases because markdown says they are done, which inverts "beads is the source of truth". This is a product decision.
- **B-F8.** The Model Self-Check blocks make trait claims about lighter models. They are kept as a deliberate user prompt.
- **Low-confidence items.** Unprefixed `plugin/docs/reference/…` paths in comments of shipped skills do not resolve in an installed plugin. Nested code fences break in two templates. `help`'s diagram shows `implement_inline` after `implement` rather than as an alternative. `verification-before-completion`'s "I'm tired" row is dated idiom. Pre-existing lint errors (MD060, MD022/31/32) sit in `implement_inline`, `pattern-finder`, `review-prep`, and `project-structure`.

## Plugin configuration against current Claude Code docs

These findings concern configuration rather than prompt text. Both manifests pass `claude plugin validate`, and `claude plugin details` puts the always-on cost at about 3.0k tokens for 25 skills and 7 agents. None of these is in the diff. Each is a small, separate decision.

- **PreCompact registration of `wb-prime.sh` does nothing.** The hooks doc says PreCompact output never reaches the model, and neither does PostCompact output. The recovery text already arrives through SessionStart with the `compact` source, which the hook handles, so the PreCompact entry in `plugin.json` can go.
- **`implement_inline/SKILL.md` has 601 lines**, and `implement` has 451. The skills doc says to keep SKILL.md under 500 lines and move reference material into supporting files. After this diff, `implement_inline` is still over the limit.
- **`allowed-tools: Read` on about 15 skills is a no-op.** The field pre-approves tools for the invoking turn and does not restrict them, and Read never needs approval. It is harmless, but it reads like a restriction it is not.
- **Skill `model: sonnet`** on `validate_execution` and `research-validation` switches the session model for the rest of that turn. Invoking either from an Opus or Fable session runs it on Sonnet. If that is intended, it is correct. If the goal was a cheaper isolated run, `context: fork` sets the forked subagent's model instead.
- **The eval harness plan** (`docs/plans/2026-06-10-wb-eval-harness`, still skeletons) should build on `claude plugin eval`. That command is generally available and runs `evals/<case>/prompt.md` plus `graders/*.md` with a with/without-plugin baseline arm. Its `llm`, `regex`, `tool_used`, and `tool_order` graders fit this repository's blind-trial method, and `/skill-doctor` reports per-skill cost and never-invoked skills.
- **Minor items.** The two PostToolUse entries could be one `"Write|Edit"` matcher. The lint-hook failure message says `./scripts/lint`, which does not resolve in an installed plugin.

## Verifying before merge

Removing text is a hypothesis, not a conclusion. For the contested behavioral changes (A-F12, C-F1, D-F11, and the barrier rewrites), run the repository's blind-trial method, `wb-blind-trial-skill-eval-method`: 3 fixtures by 3 trials on fresh Sonnet subagents, before and after. You can also make these the first `claude plugin eval` cases. The skills are model-invocable, so the description rewrites (D-F11, D-F12, A-F11) are best checked with a routing probe. `wb-headless-plugin-run-recipe` records how to run one. Merging needs a version bump in both manifests under RELEASING.md, a minor bump at least, and a major one if A-F12 is kept.
