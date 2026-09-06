# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Claude Code plugin (`wb`) providing structured software development workflows: project planning, research, design, execution, and validation with TDD enforcement and beads integration.

## Repository Structure (Plugin Layout)

- `.claude-plugin/` - Marketplace manifest (plugin manifest lives in `plugin/.claude-plugin/`)
- `plugin/` - The shipped runtime: everything below is what installers receive
- `plugin/skills/` - All skills (`skills/<name>/SKILL.md`): workflow commands (`/wb:*`, invocable by the user or by the model from a prose request — descriptions are written as trigger text; only the deprecated `create_execution` alias is user-only) and auto-activated background capabilities (`user-invocable: false`, e.g. `doc-adherence`)
- `plugin/agents/` - Specialized subagent definitions
- `plugin/hooks/` - Event handlers: `wb-prime.sh` (SessionStart on every trigger and PreCompact: orientation on a fresh start, recovery text on compact; `.claude/wb/PRIME.md` overrides the orientation, `--export` prints the default), `beads-drift-check.sh` (SessionEnd: reminds to `bd dolt push` only when a Dolt remote is configured), `lint-hook` (PostToolUse)
- `plugin/scripts/` - Utility scripts (lint, lint-hook)
- `plugin/docs/reference/` - Runtime-referenced shared docs (skills link to these)
- `docs/` - Maintainer documentation, guides, and project plans (never shipped to installs)
- `general/` - General-purpose prompts and templates
- `.claude/` - Local development configuration

## Development Tools

### Markdown Linting

```bash
# Lint changed markdown files
./plugin/scripts/lint

# Auto-fix markdown issues
./plugin/scripts/lint --fix

# Lint specific files
./plugin/scripts/lint file1.md file2.md

# Lint all markdown files
./plugin/scripts/lint --all
```

**Automatic Linting**: PostToolUse hooks automatically lint markdown files after Write/Edit operations.

### Configuration

**Markdown Lint Rules** (`.markdownlintrc`):

- Line length checking disabled (MD013)
- Inline HTML allowed (MD033)
- Emphasis as heading allowed (MD036)
- Fenced code blocks without language allowed (MD040)

### Testing the Plugin

```bash
# Test locally (NOTE: point at the plugin/ subdirectory, not the repo root)
claude --plugin-dir /path/to/this/repo/plugin

# Reload after changes
/reload-plugins
```

### Releasing New Commands/Skills/Agents

**CRITICAL**: When the plugin is installed via marketplace (not `--plugin-dir`), the plugin system caches files at `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. The cache is keyed by version — adding new files will NOT show up until the version bumps AND the user runs an update.

When adding new commands, skills, or agents:

1. Bump `version` in `plugin/.claude-plugin/plugin.json` (e.g., 1.0.0 → 1.1.0 for features, 1.0.0 → 1.0.1 for fixes)
2. Bump matching `version` in `.claude-plugin/marketplace.json` (must match plugin.json)
3. Commit and push
4. Users run `claude plugin update wb@gvarela-workbench` from the **shell** (not a slash command — it's a CLI command, run with `!` prefix or in a separate terminal)
5. After update, restart Claude (or `/reload-plugins`) to apply

**What does NOT work alone**:

- `/reload-plugins` — only re-reads the existing cache, doesn't pull updates
- Pushing to git — the marketplace clone at `~/.claude/plugins/marketplaces/<name>/` doesn't auto-pull
- Bumping version without `claude plugin update` — the cache stays at the old version

For local dev (`--plugin-dir` install), changes take effect immediately without a version bump — `--plugin-dir` always serves the working tree and shadows the installed plugin even at an equal version. **Gotcha**: a session started *without* `--plugin-dir` serves the installed (cached) version; working-tree changes are invisible to it, including to its `/reload-skills`.

## Command Workflow

The commands follow a strict sequential workflow:

```
/wb:create_project → /wb:create_research → [/wb:explore_design (optional)] → /wb:create_design → /wb:create_tasks → /wb:implement_tasks → /wb:validate_execution
```

For multi-session work:

```
[Session 1] → /wb:create_handoff → [Session 2] → /wb:resume_handoff → [Continue work]
```

Each command builds upon the previous one's output, creating structured documentation in timestamped directories under `docs/plans/`.

## Workflow Philosophy

The workflow separates three distinct concerns:

1. **Research** (`research.md`) - Document what EXISTS (facts only, no recommendations)
2. **Design** (`design.md`) - Document WHAT to build and WHY (architectural decisions)
3. **Execution** (`tasks.md`) - Document HOW to build it (phased implementation plan)

## Core Command Philosophy

### Critical Principles

1. **Document, Don't Judge**: Research describes what EXISTS, not what should be changed
2. **Explicit Barriers**: Commands implement synchronization points (⛔ BARRIER) to ensure complete context
3. **File Reading Protocol**: ALWAYS read files FULLY (no limit/offset) before analysis
4. **Dual Verification**: Separate automated checks from manual verification
5. **Zero Scope Creep**: Tasks only come from plans, no additions
6. **Beads Required**: These commands require beads 1.1.0 or later for ALL task tracking (`bd init --stealth` in any repository with collaborators who do not use beads; see `plugin/docs/reference/beads-mode.md`)
   - Use beads for phases AND granular tasks
   - Do NOT use TaskCreate, TaskUpdate, TodoWrite, or markdown checkboxes for tracking
   - Markdown files document the PLAN, beads tracks the STATUS

### Beads Error Handling

If any `bd` command fails:

1. **Diagnose**: Run `bd info`, `bd context` (which database is open), and `bd doctor`
2. **Report**: Tell the user the specific error and suggest fixes
3. **Fix**: Common fixes:
   - "beads not initialized" → `bd init --stealth`
   - "issue not found" → `bd list` to find correct ID
   - "database locked" → wait and retry
   - zero issues or an unexpected database name from `bd context` → check `.beads/metadata.json` (the Wrong database case in `plugin/docs/reference/beads-not-initialized.md`)
4. **Retry**: After fixing, re-run the failed command

### Task Tracking Philosophy

**Beads for STATUS, Markdown for PLAN**:

- **Beads issues** (`bd create`, `bd update`, `bd close`): Track live status of ALL work
- **Markdown files** (tasks.md, research.md, design.md): Document the PLAN and rationale

### Command Structure Patterns

When modifying commands, maintain these patterns:

```markdown
⛔ BARRIER 1: full context read — analysis on partial context produces placeholders
⛔ BARRIER 2: every spawned agent has returned — synthesis on a partial set misses what the missing report would have changed
⛔ BARRIER 3: no placeholder values — a placeholder that ships becomes a task nobody can execute
⛔ CHECKPOINT: human verification between phases — the next phase builds on what a human has accepted
```

### Frontmatter Standards

All generated documentation files use consistent YAML frontmatter:

- Basic: `project`, `ticket`, `created`, `status`, `last_updated`
- Git metadata: `git_commit`, `git_branch`, `repository`
- User tracking: `researcher`, `planner`, `assignee`
- Progress: `current_phase`, `total_tasks`, `completed_tasks`
- Progress fields are written only by `/wb:update_status` (sole writer); other skills and checkpoints defer to it.
- Any change that adds, removes, or alters a bd command in a shipped file (under `plugin/`) updates the contract inventory in [docs/beads-guide.md](docs/beads-guide.md), including its verified-on column.
- Any change to a workflow stage's existence, name, scope, or intake updates help's Command Workflow chain, its "What each stage needs from you" table, and its Command Details, wb-prime's orientation (stage chain and the six-line summary), and that stage's "This stage needs from you" line, in the same commit. RELEASING.md's pre-bump verification greps for drift.

## Agent Spawning with Model Selection

Commands support model hints when spawning agents. Pay for judgment, not throughput:

- `haiku`: File searches, pattern matching, mechanical tasks. No `effort` support — never annotate haiku agents or spawns
- `sonnet`: Default for analysis AND implementation (near-Opus coding quality at lower cost)
- `opus`: Design and architectural or cross-cutting implementation
- `fable`: Architecture-critical discussion (explore_design), decomposition (create_tasks), and escalation after verified failure. Fable spawns use `effort: high`, never `xhigh`

`effort` (`low` → `xhigh`) is a second cost lever on sonnet/opus spawns: "sonnet at low effort" usually beats dropping to haiku for judgment-bearing work — quality degrades gracefully instead of falling off a tier. Typical annotations: implementation workers `xhigh`, analyzers `medium`, verifiers `high`.

## Working with Commands

When creating or modifying commands:

1. Follow existing command patterns
2. Mark each real synchronization point once (⛔ BARRIER for "do not proceed until X", ⛔ CHECKPOINT for human confirmation) and state the reason in a plain sentence
3. At decision points, say what the decision is about; do not instruct the model how hard to think
4. Maintain the documentarian philosophy for research
5. Separate automated from manual verification
6. Read files fully before processing
7. Spawn independent agents in parallel; synthesize only after all have returned

## Best Practices

When creating new prompts or commands:

1. Use clear, unambiguous language
2. Include examples where helpful
3. Document any special requirements or dependencies
4. Test thoroughly before committing
5. Keep prompts focused on a single purpose

## Git Workflow

- The main branch is `main`
- Commit messages should be descriptive
- Run `./plugin/scripts/lint` before committing markdown files
- Keep the repository organized by category

## Beads Issue Tracking

This repository uses [beads](https://github.com/steveyegge/beads) for task tracking across sessions.

### Quick Reference

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
# beads state lives in the local Dolt database under .beads/, which is never committed; no remote or backup is configured here
```

### Session Protocol

See the Session Completion section at the end of this file for the full session close protocol. Key points:

1. **Before ending**: run `bd doctor` where it is supported (server mode; in embedded mode it is a no-op in bd 1.1.0, so run `bd stale` and `bd orphans` instead) and act on what it reports; close completed issues with `bd close`
2. **Persist**: one question — `bd config get sync.remote`; a configured remote means `bd dolt push`, otherwise nothing (this repository has none; see `plugin/docs/reference/beads-mode.md`)
3. **Push**: Commit and push the code and docs

### Integration with wb Commands

The workbench commands (`/wb:*`) use beads for phase tracking and run the session-start sanity check from `plugin/docs/reference/beads-mode.md` before reading a plan's issue IDs. See [docs/commands-reference.md](docs/commands-reference.md) for details.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:

   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```

5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
