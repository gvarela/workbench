# Workbench (wb)

A Claude Code plugin for structured software development workflows: project planning, research, design, execution, and validation with TDD enforcement and beads integration.

## Overview

A personal workbench of tools and workflows for Claude Code. Streamlines software development through structured planning, research, and persistent task tracking with [beads](https://github.com/steveyegge/beads).

**[Complete Workflow Guide](docs/workbench-workflow-guide.md)**

## Quick Start

### Installation

```bash
# Add the marketplace and install the plugin
claude plugin marketplace add gvarela/workbench
claude plugin install wb@gvarela-workbench
```

> **Using the pre-2.0 version?** The final 1.x release (v1.1.0, old `commands/` layout, pre-embedded-Dolt beads) lives on the [`1.x` branch](https://github.com/gvarela/workbench/tree/1.x). It receives critical fixes only — see [RELEASING.md](RELEASING.md) and the [2.0.0 migration notes](CHANGELOG.md) before upgrading.

For local development:

```bash
# Clone and test locally (changes take effect immediately)
git clone git@github.com:gvarela/workbench.git
claude --plugin-dir /path/to/workbench/plugin
```

### Updating

To release new commands/skills/agents:

1. Bump `version` in **both** `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` (must match)
2. Commit and push to GitHub
3. Users run from their shell (not a slash command):

   ```bash
   claude plugin update wb@gvarela-workbench
   ```

4. Restart Claude (or `/reload-plugins`) to apply

Note: `/reload-plugins` alone does NOT pull updates — the cache is keyed by version and only `claude plugin update` invalidates it.

### Using Commands

```bash
# Initialize -> Research -> Design -> Implement -> Validate
/wb:create_project my-feature docs/plans TICKET-123
/wb:create_research docs/plans/2025-01-15-TICKET-123-my-feature
/wb:create_mockup docs/plans/... "UI component"  # Optional for UI
/wb:explore_design docs/plans/...  # Optional for big architecture decisions
/wb:create_design docs/plans/...
/wb:create_tasks docs/plans/...
/wb:implement docs/plans/...
/wb:validate_execution docs/plans/...
```

**Skills** (auto-activated): `project-structure`, `mockup-iteration`, `tdd-discipline`, `verification-before-completion`, `status-sync`, `review-prep`

Auto-activation depends on the model electing these skills, which in practice happens rarely inside workflow-command sessions. During coordinated execution the discipline is guaranteed structurally instead: task-workers preload `tdd-discipline` and every task passes through `task-verifier`. The auto-activated skills primarily protect **solo and ad-hoc** changes made outside the workflow commands.

**[Full Commands Reference](docs/commands-reference.md)**

## What's Inside

### Commands (`/wb:*`)

Slash commands for project documentation and task management:

- **`/wb:create_project`** - Initialize structured documentation with rich metadata
- **`/wb:create_research`** - Document codebase using parallel research agents
- **`/wb:create_mockup`** - Research UI patterns and create HTML mockups with visual validation
- **`/wb:explore_design`** - Explore architecture directions and record the decision (optional)
- **`/wb:create_design`** - Create architectural design decisions (WHAT and WHY)
- **`/wb:create_tasks`** - Transform design into phased execution plan (HOW)
- **`/wb:implement`** - Implement the plan with coordinated worker agents (the default execution path)
- **`/wb:implement_inline`** - Implement the plan inline in this session with TDD
- **`/wb:validate_execution`** - Validate implementation matches plan
- **`/wb:validate_project`** - Validate project documentation structure
- **`/wb:create_handoff`** - Create session handoff for work continuity
- **`/wb:resume_handoff`** - Resume from handoff document
- **`/wb:update_status`** - Intelligently sync status across all documentation files
- **`/wb:help`** - Quick reference for all commands

### Agents

Specialized agents for codebase analysis:

- **`codebase-locator`** - Find specific components and files
- **`codebase-analyzer`** - Analyze implementation details with file:line references
- **`pattern-finder`** - Find similar patterns and implementations
- **`task-verifier`** - Verify task completion against requirements

### Skills (auto-activated)

Background capabilities that Claude automatically invokes:

- **`project-structure`** - Enforces document separation (research.md, design.md, tasks.md)
- **`mockup-iteration`** - Iterate on UI mockups with KEEP/REMOVE/CHANGE tracking
- **`tdd-discipline`** - Enforces RED-GREEN-REFACTOR cycle before writing production code
- **`verification-before-completion`** - Requires running verification before claiming work is done
- **`status-sync`** - Monitors for status drift and reminds to sync
- **`review-prep`** - Interactive code review walkthrough using tmux and nvim

### Hooks

- **SessionStart** - `wb-prime.sh`: orientation on startup, resume, clear, and fork (stage chain, plan layout, the beads sanity check, active plans); recovery text on compact. Override with `.claude/wb/PRIME.md`; print the default with `hooks/wb-prime.sh --export`
- **PreCompact** - `wb-prime.sh` again, so the recovery text is present when the summary is written
- **SessionEnd** - Reminds to `bd dolt push` only when a Dolt remote is configured (silent otherwise)
- **PostToolUse** - Lints markdown files after Write/Edit operations

## Plugin Structure

```
workbench/
├── .claude-plugin/     # Marketplace manifest (source: ./plugin)
├── plugin/             # The shipped runtime — the only thing installs cache
│   ├── .claude-plugin/plugin.json
│   ├── skills/<name>/SKILL.md   # /wb:* workflow commands + background capabilities
│   ├── agents/         # Specialized subagents
│   ├── hooks/          # Event handlers
│   ├── scripts/        # Utility scripts (lint)
│   └── docs/reference/ # Runtime-referenced shared docs
├── docs/               # Maintainer guides + project plans (not shipped)
└── general/            # General-purpose prompts
```

## Beads Integration

Requires [beads](https://github.com/steveyegge/beads) 1.1.0 or later for persistent task tracking (the supported version, the bd contract the plugin relies on, and the upgrade protocol are in [docs/beads-guide.md](docs/beads-guide.md)):

```bash
bd init --stealth   # any repository with collaborators who do not use beads (writes the shared .git/info/exclude)
bd init             # only a repository you own outright; .beads/ is still excluded, never committed
```

Commands create and track beads issues for phases, tasks, and UI questions. The local Dolt database is the source of truth; a Dolt remote or `bd backup` carries it across machines. Setup rule, persistence tiers, worktrees, the session-start sanity check, and hygiene: `plugin/docs/reference/beads-mode.md`.

## Core Philosophy

- **Document, Don't Judge**: Research describes what EXISTS, not what should change
- **Explicit Barriers**: Synchronization points prevent rushing ahead
- **Dual Verification**: Automated (tests, CI) + Manual (UX, edge cases)
- **Zero Scope Creep**: Tasks only from plans - no ad-hoc additions

## Development

### Linting

```bash
./plugin/scripts/lint           # Lint changed files
./plugin/scripts/lint --fix     # Auto-fix issues
./plugin/scripts/lint --all     # Lint all markdown files
```

### Testing Changes

```bash
# Run with local plugin (point at the plugin/ subdirectory)
claude --plugin-dir /path/to/this/repo/plugin

# Reload after changes (inside Claude Code)
/reload-plugins
```

## License

MIT
