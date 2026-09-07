---
project: implement-rename-3.0
ticket: prompts-h7c
created: 2026-09-05
created_timestamp: 2026-09-06T00:23:23Z
status: complete
last_updated: 2026-09-06
researcher: gabe@vare.la
git_commit: 69b2708fa5390322a2517a972ccf54bed5380874
git_branch: worktree-implement-rename-3.0
repository: gvarela/workbench
tags: [research, codebase, implement-rename-3.0]
sources: "this repository at 447a1c6 (origin/main 70c50bd plus the handoff commit); git history including origin/archive/modernize-2.0; beads issues prompts-h7c, prompts-vwo, prompts-3ke"
---

# Research: implement-rename-3.0

**Created**: 2026-09-05
**Last Updated**: 2026-09-06
**Ticket**: prompts-h7c

## Research Question

How are `implement_coordinated` and `implement_tasks` named, referenced, aliased, and documented across the plugin, docs, and release process today, and what would a rename to `implement` and `implement_inline` with deprecation aliases (removing the `create_execution` alias) touch? Includes the release process (RELEASING.md, CHANGELOG, manifests, tags) and the three ride-along fixes: prompts-vwo (beads-mode doc), prompts-3ke (lint exit code), and the reference.md worker model selection paragraph.

Facts only. Decisions belong in design.md.

## Summary

A wb command name is the skill's directory name under `plugin/skills/`, with a matching `name:` frontmatter field in every skill in this repository; the plugin namespace supplies the `/wb:` prefix. The two implementation skills are `implement_tasks` (SKILL.md plus templates.md, 670 lines) and `implement_coordinated` (five files, 802 lines). implement_coordinated refers to implement_tasks by name in eleven places across its SKILL.md and README.md; implement_tasks never names implement_coordinated. Outside historical plan documents, 26 files carry the strings `implement_coordinated`, `implement_tasks`, or `create_execution`; 22 further files under `docs/plans/` carry them as history.

One rename precedent exists. In v2.2.0 `create_execution` became `create_tasks`: the supporting files moved, a new canonical SKILL.md was written, and the old directory was collapsed to a 24-line stub that announces the rename once and then reads the canonical SKILL.md, with three five-line pointer files left in place so sessions holding a stale skill body still resolve their reads. The stub keeps `disable-model-invocation: true`, and its own text, the CHANGELOG, and the skills guide all schedule its removal at 3.0.0. That rename commit exists as a discrete commit only on the archived branch `origin/archive/modernize-2.0`; on `origin/main` it arrived inside the v2.0.0 squash.

The release process is written in RELEASING.md: two channels (the working tree via `--plugin-dir`, and the marketplace at the manifest version), a semver rule that classifies renamed or removed commands as major, and a stated invariant that a breaking change merges together with its version bump because a fresh install copies whatever `main` holds. Eight commits have changed the manifest version; three carry tags, and only `v2.2.0` sits on its bump commit. The three ride-along sites are documented in sections 7 through 9: the JSONL auto-flush statement appears in roughly a dozen files rather than the three named in prompts-vwo; the lint script sets its `ISSUES_FOUND` flag inside a piped `while read` loop and reads it after the loop; and reference.md's Worker Model Selection paragraph names opus as the default when unsure while the SKILL.md tier list names sonnet.

## Detailed Findings

### 1. How a command name is determined

**Location**: `plugin/skills/<name>/SKILL.md`, `docs/claude-code-skills-guide.md`

**What exists**:

- `docs/claude-code-skills-guide.md:41-48` gives the layout `<plugin>/skills/<name>/SKILL.md` producing `/plugin-name:skill-name`; line 53 states the plugin namespace is added automatically, which is how `/wb:create_project` gets its prefix.
- `docs/claude-code-skills-guide.md:74` documents `name:` as optional, defaulting to the directory name; line 95 constrains it to lowercase letters, numbers, hyphens, max 64 characters.
- Every skill in this repository sets `name:` equal to its directory name (for example `plugin/skills/create_tasks/SKILL.md:2` and `plugin/skills/create_execution/SKILL.md:2`).
- The two skills under study set `name: implement_tasks` (`plugin/skills/implement_tasks/SKILL.md:2`) and `name: implement_coordinated` (`plugin/skills/implement_coordinated/SKILL.md:2`). Neither has `disable-model-invocation`; both carry `argument-hint: [project-directory] [phase-number|continue]` and `allowed-tools: Read`.

### 2. Skill naming families

**What exists** (all 24 directories under `plugin/skills/`):

- `create_*` names the artifact written: create_project (directory skeleton), create_research (research.md), create_product_research (research.md, product view), create_design (design.md), create_tasks (tasks.md), create_mockup (mockup files), create_handoff (handoff document).
- `implement_*` names the execution mode: implement_tasks ("in this session ... inline by the current session model", SKILL.md:3) and implement_coordinated ("coordinating fresh-context worker agents", SKILL.md:3).
- `validate_*` names the thing validated: validate_execution, validate_project.
- Standalone: explore_design, resume_handoff, update_status, help, mockup-iteration, research-validation, review-prep.
- Background skills with `user-invocable: false`: doc-adherence, tdd-discipline, project-structure, status-sync, verification-before-completion.
- Deprecated alias with `disable-model-invocation: true`: create_execution.

`plugin/skills/create_execution/SKILL.md:11` states the family rule in the plugin's own words: "the `create_*` family names its artifact (create_research → research.md, create_design → design.md), and this skill writes `tasks.md` — it also pairs naturally with `/wb:implement_tasks`."

### 3. The two implementation skills

**Location**: `plugin/skills/implement_tasks/`, `plugin/skills/implement_coordinated/`

| File | Lines |
| ---- | ----- |
| implement_tasks/SKILL.md | 588 |
| implement_tasks/templates.md | 82 |
| implement_coordinated/SKILL.md | 434 |
| implement_coordinated/README.md | 55 |
| implement_coordinated/reference.md | 128 |
| implement_coordinated/sub-agent-prompts.md | 127 |
| implement_coordinated/templates.md | 58 |

**Cross-references by name**:

- implement_coordinated names implement_tasks at `SKILL.md:52` ("All principles from `implement_tasks` PLUS:"), `SKILL.md:281` ("Same verification process as original `implement_tasks`:"), `SKILL.md:424` and `:428` (best practices and prohibitions inherited from "original `implement_tasks`"), and in `README.md:5, 7, 20, 27, 49, 53` (an "Evolution from implement_tasks" section, a Sequential-versus-Coordinated comparison, and a "Migration from implement_tasks" section whose step 3 reads "Use `/wb:implement_coordinated` instead of `/wb:implement_tasks`").
- implement_tasks/SKILL.md and templates.md contain no occurrence of `implement_coordinated`.
- Both skills name `update_status` as the sole writer of tasks.md progress frontmatter (`implement_tasks/SKILL.md:280, 382`; `implement_coordinated/SKILL.md:361, 401`).
- implement_coordinated names the `task-worker` agent at `SKILL.md:58, 190`, `reference.md:60`, and `sub-agent-prompts.md:116`. The agent's own description (`plugin/agents/task-worker.md:2`) reads "Spawned by /wb:implement_coordinated with a per-task model override."
- `plugin/skills/tdd-discipline/SKILL.md:3` says "coordinated workers preload this skill; solo edits must trigger it."

### 4. The deprecated alias mechanism

**Location**: `plugin/skills/create_execution/`

**What exists**: four files.

- `SKILL.md` (24 lines). Frontmatter: `name: create_execution`, `description: Deprecated alias of create_tasks — use /wb:create_tasks (removed at 3.0.0)`, `argument-hint: [project-directory]`, `disable-model-invocation: true`, `allowed-tools: Read`. Body: one paragraph explaining the rename, a "Behavior" section that (1) prints a two-line notice once ("Note: /wb:create_execution is now /wb:create_tasks — same skill, new name. This alias works through 2.x and will be removed at 3.0.0.") and (2) reads `../create_tasks/SKILL.md` and follows it, passing arguments through unchanged and resolving supporting-file reads in `../create_tasks/`. Closing line: "Do not duplicate any behavior here; the canonical skill is the single source of truth."
- `examples.md`, `templates.md`, `sub-agent-prompts.md` (5 lines each): identical shape, a note that the skill was renamed and that the pointer "exists so sessions holding a stale pre-rename skill body still resolve their reads instead of erroring", plus a link to the corresponding file under `../create_tasks/`.

**Where the alias is still named** (outside `docs/plans/`):

- `plugin/skills/create_execution/SKILL.md:3, 11, 19` (its own text; removal at 3.0.0 stated on lines 3, 11, 19)
- `CHANGELOG.md:82` (the 2.2.0 Deprecated entry, "Removed at 3.0.0", with the stale-session gotcha)
- `CLAUDE.md:13` and `CLAUDE.md:104` (the plugin-layout bullet and the beads section note that only the alias keeps `disable-model-invocation`)
- `docs/claude-code-skills-guide.md:310` ("Only the deprecated `create_execution` alias keeps `disable-model-invocation: true`, so the model never picks it over `create_tasks`.")

Historical mentions in `docs/plans/2026-07-10-explore-design-stage/research.md:166, 168` and its thoughts doc line 89 describe the pre-rename workflow.

### 5. Reference inventory for the rename

Files outside `docs/plans/` containing `implement_coordinated`, `implement_tasks`, or `create_execution`, with matching-line counts:

| File | Lines |
| ---- | ----- |
| CHANGELOG.md | 12 |
| plugin/skills/implement_coordinated/README.md | 7 |
| docs/subagent-tool-call-ceiling.md | 7 |
| plugin/skills/implement_coordinated/SKILL.md | 6 |
| docs/commands-reference.md | 6 |
| docs/beads-integration-learnings.md | 5 |
| docs/workbench-workflow-guide.md | 5 |
| plugin/skills/create_execution/SKILL.md | 3 |
| plugin/skills/help/SKILL.md | 3 |
| README.md | 3 |
| CLAUDE.md | 2 |
| docs/claude-code-skills-guide.md | 2 |
| plugin/skills/create_project/templates.md | 2 |
| plugin/skills/implement_tasks/SKILL.md | 2 |
| plugin/skills/resume_handoff/SKILL.md | 2 |
| plugin/agents/task-worker.md | 1 |
| plugin/docs/reference/beads-not-initialized.md | 1 |
| plugin/skills/create_handoff/SKILL.md | 1 |
| plugin/skills/create_project/SKILL.md | 1 |
| plugin/skills/create_tasks/SKILL.md | 1 |
| plugin/skills/implement_coordinated/reference.md | 1 |
| plugin/skills/implement_coordinated/sub-agent-prompts.md | 1 |
| plugin/skills/implement_coordinated/templates.md | 1 |
| plugin/skills/implement_tasks/templates.md | 1 |
| plugin/skills/validate_execution/SKILL.md | 1 |
| plugin/skills/validate_project/templates.md | 1 |

22 files under `docs/plans/` (excluding this project) also contain the names. No hook script (`plugin/hooks/*.sh`) or `plugin.json` names any skill; `compact-recovery.sh` and `setup-beads-mode.sh` were read in full and contain no `/wb:` command name.

### 6. Workflow sequence and model-map placements

**Sequence renderings** (every place the command chain is drawn):

- `CLAUDE.md:86`: `/wb:create_project → /wb:create_research → [/wb:explore_design (optional)] → /wb:create_design → /wb:create_tasks → /wb:implement_tasks → /wb:validate_execution`
- `plugin/skills/help/SKILL.md:31-43`: the arrow diagram ending `/wb:implement_tasks → Execute with TDD (Red → Green → Refactor)` then `/wb:validate_execution`; lines 49-51 list the session-management commands.
- `plugin/skills/create_project/templates.md:27-31` and the four generated files in every new project directory: step 6 is `Implementation (/wb:implement_tasks [directory])`; the Quick Commands block repeats it.
- `README.md:51-57` (quick-start sequence ending in `/wb:implement_tasks`) and `README.md:73-80` (bulleted list naming both `implement_tasks` and `implement_coordinated`).
- `docs/commands-reference.md:24` (chain ending `/implement_tasks → /validate_execution`) and `:732-741` (file-structure listing naming `implement_tasks/SKILL.md` but not `implement_coordinated` or `create_execution`).
- `docs/workbench-workflow-guide.md:37-56` (step sequence) and `:53-59` (quick-start chain).
- `plugin/skills/explore_design/SKILL.md:76`: `create_project → create_research → [explore_design (optional)] → create_design → create_tasks`.

**Model map**:

- `docs/workbench-workflow-guide.md:66-75`, rows: `implement_tasks | Sonnet (xhigh effort); Fable for cross-cutting phases (multi-file refactors, migrations) | The session does the coding itself` and `implement_coordinated | Opus | Coordinator judges tiers and parses reports; workers do the coding; escalation workers: Fable at high`.
- `CLAUDE.md:159-168`, the four tier bullets (haiku, sonnet, opus, fable) and the effort paragraph, quoted in full in section 9.

### 7. Ride-along A: JSONL auto-flush statements (prompts-vwo)

The issue names three sites (beads-mode.md Persistence Mechanics, implement_tasks Step 7, implement_coordinated Step 7) and records the observation, made 2026-09-05 on bd 1.0.2, that `issues.jsonl` had last been written 2026-07-31 with 92 issues while the database held 156, and that `bd config` has an `export.auto` flag, default off. The statement appears at these sites:

- `plugin/docs/reference/beads-mode.md:19` ("Beads auto-commits mutations to its embedded Dolt database and **auto-flushes `.beads/issues.jsonl`** after changes. There is no manual export step."), `:21` (auto-import after `git pull`), `:26-33` (the git-mode commit block)
- `plugin/skills/implement_tasks/SKILL.md:399, 402, 530, 566`
- `plugin/skills/implement_coordinated/SKILL.md:373, 376`
- `plugin/skills/create_handoff/SKILL.md:124, 128, 148`
- `plugin/skills/resume_handoff/SKILL.md:70, 87, 96`
- `plugin/skills/status-sync/SKILL.md:30, 48`
- `plugin/skills/update_status/SKILL.md:235, 238, 251, 252`
- `plugin/skills/help/SKILL.md:104, 152-153`
- `plugin/hooks/beads-drift-check.sh:2, 16` (the SessionEnd reminder text: "run git add .beads/ && git commit before ending the session")
- `plugin/docs/reference/beads-not-initialized.md:13` ("bd init # git mode (.beads/ committed)")
- `docs/commands-reference.md:75-76, 80`
- `docs/beads-integration-learnings.md:258`
- `docs/workbench-workflow-guide.md:429, 432, 437, 495, 497, 520, 522, 844`

`CLAUDE.md` and `README.md` at the repository root contain no auto-flush statement. `CLAUDE.md:209` and `:217` describe this repository as stealth mode with nothing to commit.

### 8. Ride-along B: the lint script (prompts-3ke)

**Location**: `plugin/scripts/lint` (222 lines), `plugin/scripts/lint-hook`

**How it works**:

1. File list by mode: named files at lines 95-111 (each `*.md` argument that exists is appended to a newline-joined string); `--all` at lines 112-125 (`find . -type f -name "*.md"` excluding node_modules, .git, vendor, tmp, .next, dist, build); changed files at lines 126-136 (staged, unstaged, and untracked `.md` paths from three git queries, deduplicated with `sort -u`).
2. Empty list exits 0 at line 141.
3. `ISSUES_FOUND=false` is declared at line 181.
4. Lines 184-200: `echo "$FILES" | while read -r file; do ... done` runs `markdownlint $AUTO_FIX $CONFIG_ARG "$file"` per file (line 186); on failure it sets `ISSUES_FOUND=true` (line 193) and, without `--fix`, prints `⚠ Issues found in: <file>` and a `--fix` hint (lines 194-197).
5. Line 209 reads `ISSUES_FOUND`: `false` prints the "All markdown files are clean!" (or "have been fixed!") line and exits 0 (line 215); `true` without `--fix` prints the issues banner and exits 1 (line 220); `true` with `--fix` has no explicit exit and falls off the end of the file.

The script runs under `set -euo pipefail` (line 13). Issue prompts-3ke records that the flag set inside the pipeline subshell does not propagate, so the script prints per-file errors and still reports clean with exit 0; the previous project's tasks.md (`docs/plans/2026-09-01-fable-5-1-rebaseline/tasks.md:75`) records the same observation and defines "lint clean" as the absence of a `⚠ Issues found in:` line in the output. Observed in this session: linting the four new plan files printed four MD060 error lines and `⚠ Issues found in:` for tasks.md, followed by `✅ All markdown files are clean!`.

`lint-hook` reads the PostToolUse JSON from stdin (line 11), extracts `.tool_input.file_path` with jq or a sed fallback (lines 13-15), and for `.md` paths calls the sibling `lint --fix <file>` and filters its output to three status lines (line 23); it exits 0 on both branches (lines 24, 27). `plugin.json:44` and `:54` register it for Write and Edit.

**References to the script**: `plugin/scripts/README.md:13-25, 66`; `CLAUDE.md:28-37, 196`; `README.md:153-155`; `RELEASING.md:29` (verification before any bump: `./plugin/scripts/lint --all`).

### 9. Ride-along C: worker model selection text

Four places state the worker tier rule. Quoted as they exist:

`plugin/skills/implement_coordinated/reference.md:58-60`:

> Retired: the `determineModel()` keyword-regex spec was replaced by coordinator judgment (2026-06, prompts-0my) — the coordinator reads the task content and picks haiku (mechanical config/docs/renames), sonnet (standard implementation), or opus (bugs/refactors/architecture; default when unsure), passing the choice as a per-spawn model override on the `task-worker` agent.

`plugin/skills/implement_coordinated/SKILL.md:183-189`:

> 1. **Determine model** (coordinator judgment — read the task content and pick the tier):
>    - Haiku: Mechanical only (config, docs, renames)
>    - Sonnet: Standard implementation including bugs and refactors - DEFAULT when unsure
>    - Opus: Architectural or cross-cutting tasks
>    - Fable: never as a first spawn — the escalation target after a verified failure (Step 6)
>
>    When spawning with sonnet or opus, set `effort: xhigh` for the coding work; fable spawns use `effort: high`. Never set effort on haiku spawns (errors on Haiku 4.5). The verify-then-retry loop below is what makes the cheap default safe — fix workers escalate to fable, one attempt.

`plugin/skills/implement_coordinated/README.md:47`:

> **Coordinated**: Right model per task — haiku for mechanical config/docs only, sonnet (at `effort: xhigh`) for standard implementation including bugs and refactors (default when unsure), opus for architectural, cross-cutting, or previously-failed tasks. Cost optimization per task; verified failures escalate once to a fable fix worker.

`CLAUDE.md:163-166`:

> - `haiku`: File searches, pattern matching, mechanical tasks. No `effort` support — never annotate haiku agents or spawns
> - `sonnet`: Default for analysis AND implementation (near-Opus coding quality at lower cost)
> - `opus`: Design and architectural or cross-cutting implementation
> - `fable`: Architecture-critical discussion (explore_design), decomposition (create_tasks), and escalation after verified failure. Fable spawns use `effort: high`, never `xhigh`

The reference.md paragraph is dated 2026-06 and names opus as the default when unsure; the SKILL.md list, README.md sentence, and CLAUDE.md bullet name sonnet. CHANGELOG 2.2.0 records the sonnet default ("sonnet (at `effort: xhigh`) is the default when unsure"). The previous project's handoff lists the reference.md paragraph under Technical Debt as not fixed, out of scope.

### 10. Release process as written

**Location**: `RELEASING.md`, `CHANGELOG.md`, `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

**What exists**:

- Two channels (`RELEASING.md:9-10`): Dev is the working tree via `claude --plugin-dir <repo>/plugin`, which "always serves current files, shadows any installed version (even an equal one), no bump needed"; Release is the `plugin/` subtree at the manifest version, delivered "only when the version bumps AND they run `claude plugin update wb@gvarela-workbench`".
- Fact 2 (`RELEASING.md:15`): "`main` is effectively the install channel even between bumps ... a *fresh* `claude plugin install` copies whatever `main` currently holds under the current version label. Therefore: **main must always be releasable, and a breaking change merges together with its version bump or not at all.**"
- Semver (`RELEASING.md:19-21`): patch for prompt bugfixes and doc fixes; minor for new skills, agents, hooks, additive behavior; major for "removed/renamed commands, changed workflow contracts, changed invocation behavior, or new environment requirements". Line 23: bump both manifests, which must match.
- Process (`RELEASING.md:27-31`): one concern per branch or PR, merged without a bump only if non-breaking; cutting a release moves the CHANGELOG Unreleased section to a dated version with Migration notes if anything breaks, bumps both manifests, merges, pushes; verification before any bump is `lint --all`, the grep audits, and a `--plugin-dir` smoke session; "Canary for majors: maintainer is the standing canary via `--plugin-dir`; one volunteer installer updates first; announce to the rest after a quiet interval"; announce with version, one-line summary, migration steps.
- Rollback (`RELEASING.md:35`): revert plus a new patch version; no downgrade mechanism.
- Maintenance branch `1.x` (`RELEASING.md:39-41`): critical fixes only; users install by pointing at the branch via `--plugin-dir` "or a marketplace registration targeting that branch".
- Cache mechanics (`RELEASING.md:45`): the cache is keyed by version at `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
- Manifests: `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` both read `"version": "2.6.0"`. The marketplace file has a single `plugins` entry (`wb`, `source: ./plugin`).
- CHANGELOG: entries from 1.0.0 through 2.6.0; the head note says versions are release cuts. There is no Unreleased section at 447a1c6. The 2.2.0 entry is the rename precedent: an Added bullet for `skills/create_tasks` ("Identical behavior; all docs and cross-references updated") and a Deprecated bullet for `/wb:create_execution` with the stale-session gotcha. The 2.0.0 entry has a "⚠️ Breaking / Requirements" section and a numbered "Migration" section.

**Version-bump commits on `origin/main`** (every commit that changed `version` in the plugin manifest):

| Commit | Date | Version | Files in commit |
| ------ | ---- | ------- | --------------- |
| 219dbc5 | 2026-04-17 | → 1.0.0 | 35 (plugin conversion) |
| 285400e | 2026-04-28 | 1.0.0 → 1.1.0 | 2 (both manifests only) |
| cf86f75 | 2026-07-31 | 1.1.0 → 2.2.0 | 108 (v2.0.0 squash, #2) |
| 504129c | 2026-08-21 | 2.2.0 → 2.2.1 | 6 (#18; no CHANGELOG.md in the commit) |
| 4995af9 | 2026-08-26 | 2.2.1 → 2.3.0 | 20 (#19) |
| f5ed905 | 2026-09-05 | 2.3.0 → 2.4.0 | 20 (#20) |
| 31b2a38 | 2026-09-05 | 2.4.0 → 2.5.0 | 3 (both manifests and CHANGELOG, #22) |
| 70c50bd | 2026-09-05 | 2.5.0 → 2.6.0 | 19 (#25) |

**Tags**: `v1.0.0` points at 9929ed0 (2025-12-13, before plugin.json existed); `v1.1.0` points at 30594ea (2026-06-09, a later commit still carrying 1.1.0, also the tip of `origin/1.x`); `v2.2.0` points at cf86f75, its bump commit. Versions 2.2.1 through 2.6.0 have no tags. No `release/*` branch exists.

**First-parent history of `origin/main` since v2.2.0**: ten entries, eight of them PR merges (#18 through #25), plus `f2334b9` ("bd: update sync.remote") and `447a1c6` ("Reconcile plan status and add the session handoff").

### 11. The rename precedent in git

Commit `1908c26` ("Rename create_execution → create_tasks (deprecation alias) and cut v2.2.0 (#10)", 2026-07-28) exists on `origin/archive/modernize-2.0` and is not an ancestor of `origin/main`. Its shape, 25 files, +442/−398:

- Supporting files moved with rename detection: `examples.md`, `sub-agent-prompts.md`, `templates.md` from `create_execution/` to `create_tasks/`.
- `create_tasks/SKILL.md` added (374 lines); `create_execution/SKILL.md` reduced by 368 lines to the stub.
- Cross-references updated in 12 skill files (create_design SKILL and templates, create_mockup, create_project SKILL and templates, explore_design, help, implement_coordinated, implement_tasks, validate_execution, validate_project reference and templates) and in `CHANGELOG.md`, `CLAUDE.md`, `README.md`, `docs/commands-reference.md`, `docs/workbench-workflow-guide.md`, `plugin/docs/reference/beads-not-initialized.md`.
- Both manifests bumped in the same commit.

On `origin/main`, the same content arrived in `cf86f75`, whose message lists 50 bullet subjects including that one; both skill directories appear there as newly added files.

### 12. Verification methods used for skill changes

`docs/plans/2026-09-01-fable-5-1-rebaseline/tasks.md:70-76` lists the four mechanisms in use, with no test framework in the repository:

- Grep audits: each task states the grep and its expected result (line 72).
- `--plugin-dir` dry runs where behavior depends on a spawn path or model introspection; the proof is a named output line (line 73; concrete example at line 167).
- Blind trials: fresh-context Sonnet subagents, verbatim instruction block plus fixture, positive, negative, and trap fixtures, three trials each (line 74).
- Lint: output read for `⚠ Issues found in:` lines because the exit code is always 0 (line 75).

The previous handoff (`docs/plans/2026-09-01-fable-5-1-rebaseline/handoff-2026-09-05-12-37.md`, Critical Learnings item 4) records that headless `claude --plugin-dir … -p` runs execute wb skills, and that `--output-format stream-json --verbose` exposes Skill events as `"skill":"wb:<name>"`.

## Architecture Documentation

**Current patterns found**:

- Directory name equals command name equals `name:` field, in all 24 skills.
- Deprecated alias: a stub SKILL.md that prints a notice and reads the canonical skill, plus pointer files for each supporting file the canonical skill had at rename time (`plugin/skills/create_execution/`).
- Sequence renderings live in seven places (section 6); the model map in two (section 6).
- Release cut: both manifests plus a dated CHANGELOG entry, either as a dedicated commit (31b2a38) or inside the feature PR (70c50bd, f5ed905, 4995af9).

**Component connections**:

- implement_coordinated → implement_tasks: inherits principles, verification process, best practices, and prohibitions by name (`SKILL.md:52, 281, 424, 428`).
- implement_coordinated → task-worker agent → tdd-discipline skill: `SKILL.md:190`, `plugin/agents/task-worker.md:5`.
- Both implementation skills → update_status: progress frontmatter reconciliation (`implement_tasks/SKILL.md:382`, `implement_coordinated/SKILL.md:361`).
- create_project templates → generated README/tasks.md in every new project directory name `implement_tasks` (`plugin/skills/create_project/templates.md:27-31`).
- RELEASING.md → lint script: the pre-bump verification names `./plugin/scripts/lint --all` (`RELEASING.md:29`).

**Conventions observed**:

- Historical plan documents under `docs/plans/` keep the names current at the time they were written; the v2.2.0 rename left `create_execution` in the explore-design-stage research untouched.
- CHANGELOG entries for renames carry an Added bullet for the new name and a Deprecated bullet for the old one with the removal version.

## Code References

- `plugin/skills/create_execution/SKILL.md:1-24` - the alias stub, frontmatter and behavior
- `plugin/skills/create_execution/{examples,templates,sub-agent-prompts}.md` - pointer files
- `plugin/skills/implement_tasks/SKILL.md:1-6` - frontmatter
- `plugin/skills/implement_coordinated/SKILL.md:1-6` - frontmatter; `:52, 281, 424, 428` - references to implement_tasks; `:183-189` - tier rule; `:190` - task-worker spawn; `:361` - update_status reconciliation
- `plugin/skills/implement_coordinated/README.md:5-53` - Evolution and Migration sections naming implement_tasks
- `plugin/skills/implement_coordinated/reference.md:58-60` - Worker Model Selection paragraph
- `plugin/agents/task-worker.md:2` - "Spawned by /wb:implement_coordinated"
- `plugin/skills/help/SKILL.md:31-51` - command diagrams
- `plugin/skills/create_project/templates.md:27-31` - generated workflow list
- `CLAUDE.md:13, 86, 104, 159-168` - layout bullet, sequence, alias note, tier list
- `docs/claude-code-skills-guide.md:41-53, 74, 95, 310` - naming rules and the alias policy
- `docs/commands-reference.md:24, 732-741`; `docs/workbench-workflow-guide.md:37-59, 66-75`; `README.md:51-57, 73-80`
- `RELEASING.md:9-10, 15, 19-23, 27-31, 35, 39-41, 45` - channels, invariant, semver, process, rollback, 1.x, cache
- `CHANGELOG.md:64-82` - the 2.2.0 rename entry
- `plugin/scripts/lint:95-136, 141, 181, 184-200, 209-220` - file list, flag, loop, exits
- `plugin/scripts/lint-hook:11-27`; `plugin/.claude-plugin/plugin.json:44, 54`
- `plugin/docs/reference/beads-mode.md:19-33` - persistence mechanics text

## Similar Implementations

**The v2.2.0 rename** (`origin/archive/modernize-2.0` commit 1908c26; content on main in cf86f75): supporting files moved, canonical SKILL.md written under the new name, old directory collapsed to a stub plus pointer files, 18 cross-reference sites updated, manifests bumped in the same commit, CHANGELOG Added and Deprecated bullets. The stub's notice text:

```
Note: /wb:create_execution is now /wb:create_tasks — same skill, new name.
This alias works through 2.x and will be removed at 3.0.0.
```

**The v2.0.0 breaking release** (`CHANGELOG.md`, 2.0.0 entry): a "⚠️ Breaking / Requirements" section listing each requirement and contract change, followed by a numbered "Migration" section.

**Dedicated release-cut commit** (31b2a38, v2.5.0): both manifests and CHANGELOG only, merged as its own PR after the phase PR.

## Follow-up Research 2026-09-06 18:40

Scope added after Phase 1: how beads 1.1.0 documents its own persistence model, and how the plugin frames it (beads issue prompts-my1i). Sources: `bd init --help`, `bd config --help`, `bd export --help`, `bd backup --help`, `bd doctor --help`, `bd config show`, `bd context`, `bd prime`; the installed beads plugin docs at `~/.claude/plugins/cache/beads-marketplace/beads/1.1.0/`; the plugin files quoted.

### 13. What beads 1.1.0 says about persistence

- Stealth: `bd init --stealth` "configures per-repository git settings for invisible beads usage: .git/info/exclude to prevent beads files from being committed. Perfect for personal use without affecting repo collaborators." `--setup-exclude` does the exclude step alone "(for forks)"; init auto-configures the exclude when a fork is detected. `--role` sets `beads.role` to `maintainer` or `contributor` without prompting; `--contributor` runs a wizard. `bd config show` lists `routing.contributor = ~/.beads-planning` and `routing.maintainer = .` (both default), and `beads.role = maintainer` sourced from git config in this repo.
- Cross-machine: `bd init --help` and `bd config --help` both state "Cross-machine sync and backups use Dolt remotes/backups, not JSONL import/export." `bd dolt push` / `bd dolt pull` work against a configured remote (`sync.remote`); `bd backup init <url>`, `bd backup sync`, `bd backup restore` are "a Dolt-native database backup" that "preserves the database state, including tables, branches, commit history, and working-set data", with DoltHub recommended; `bd config set dolt.local-only true` skips wiring a remote at init.
- JSONL: "Optional JSONL export to .beads/issues.jsonl after write commands (throttled). Useful for viewers (bv), interchange, and issue-level migration; not a backup. It is not cross-machine sync." Keys: `export.auto` (default false), `export.interval` (60s), `export.path`, `export.git-add` (default false). `import.auto` defaults to true. `bd export` excludes memories by default "because they may contain sensitive agent context".
- Hygiene: `bd doctor` checks the `.beads/` directory, database version and migrations, schema, CLI and plugin currency, file permissions, circular dependencies, git hooks, `.beads/.gitignore`, and "Metadata.json version tracking". `bd prime` lists `bd doctor`, `bd preflight`, `bd stale`, `bd orphans`, `bd lint`.
- `bd prime` in this repo renders "Git workflow: stealth mode (no git ops)" and a session-close checklist containing only `bd close <ids>`. The installed beads plugin's own docs pin `version: "0.60.0"`; none of them describe committing `.beads/` as a close step.

### 14. Worktrees

From `plugin/skills/implement_coordinated/`'s worktree (`git worktree list` shows five worktrees of this repo, two auto-created under `.claude/worktrees/`): `bd context` reports `beads dir: /Users/gabevarela/Development/Tools/workbench/.beads`, `repo root` the main checkout, `worktree: yes`, `database: prompts`. `git rev-parse --git-path info/exclude` resolves to the common dir's file, shared by every worktree; that file is empty here (the repo ignores `.beads/` in the committed `.gitignore` instead, line 9). A worktree has no `.beads/` of its own. The SessionStart hook exports `BEADS_MODE` once from `git check-ignore -q .beads/` in the starting cwd (`plugin/hooks/setup-beads-mode.sh:5-10`). The harness refuses file writes outside a worktree-isolated session's own worktree, which includes the shared `.beads/` (observed 2026-09-05 when `metadata.json` had to be restored by hand; recorded in beads memory `wb-beads-metadata-json-not-in-git`).

### 15. How the plugin frames beads today

- `plugin/docs/reference/beads-mode.md`: two modes keyed on whether `.beads/` is gitignored (lines 5-15); Persistence Mechanics rewritten in Phase 1 (17-22); "The Only Mode-Conditional Action Skills Need" prescribes `git add .beads/ && git commit` in git mode (24-35); "Validating Mode Configuration" (39-51).
- Mode-conditional commit steps: `create_handoff/SKILL.md:124-131, 148-149`; `resume_handoff/SKILL.md:70, 87, 96-97`; `update_status/SKILL.md:235-246, 251-252`; `help/SKILL.md:104, 152-163` ("Beads + Git Workflow"); `implement_tasks/SKILL.md:399-404`; `implement_coordinated/SKILL.md:373-378`; `status-sync/SKILL.md:30, 48`.
- `plugin/hooks/beads-drift-check.sh:10-16`: silent when `.beads/` is gitignored; otherwise emits "run git add .beads/ && git commit before ending the session."
- `plugin/skills/validate_project/SKILL.md:153-171`: treats "git mode correctly configured" as `.beads/` not gitignored and warns on a `BEADS_MODE` mismatch.
- `plugin/docs/reference/beads-not-initialized.md:11-14`: offers `bd init` "(git mode, .beads/ committed)" or `bd init --stealth` with no selection rule.
- No plugin file mentions `bd backup`, `bd doctor`, `bd context`, worktrees, `.git/info/exclude` as the stealth mechanism, the contributor role, or that memories are excluded from exports. `CLAUDE.md:209-218` (this repo's own protocol) already says nothing is committed for beads.
- Session-start checks that exist: `create_tasks` Step 5a and `implement_*` Step 2 run `bd info`; `resume_handoff` compares `bd stats` with the handoff's counts (lines 80-96). None reads `bd context` or checks the database name.

## Open Questions

Questions that require resolution before proceeding are tracked in beads, NOT in this document.

**Active questions** (reference only, beads is source of truth):

- `prompts-h7c`: the rename itself (this project's ticket, claimed)
- `prompts-vwo`: the auto-flush doc statement (section 7 lists its footprint)
- `prompts-3ke`: the lint exit code (section 8)

No new questions were filed by this research. One fact was not established: whether `claude plugin update` orders versions by semver or only detects a changed string, which matters only if a prerelease suffix were ever used.

## Next Steps

1. Review the reference inventory (section 5) and the alias precedent (sections 4 and 11) against the intended bundle.
2. Review the release-process facts (section 10) that a RELEASING.md amendment would build on.
3. Run `/wb:create_design docs/plans/2026-09-05-prompts-h7c-implement-rename-3.0` to create design decisions.

## References

- Design: [design.md](design.md)
- Tasks: [tasks.md](tasks.md)
- Prior project: [../2026-09-01-fable-5-1-rebaseline/](../2026-09-01-fable-5-1-rebaseline/) (handoff and tasks.md cited above)
