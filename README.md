# Prompts Repository

A collection of reusable prompts, slash commands, and agent definitions for AI-powered development workflows with Claude Code and AmpCode.

## Overview

A personal workbench of tools and workflows for Claude Code and AmpCode. Streamlines software development through structured planning, research, and persistent task tracking with [beads](https://github.com/steveyegge/beads).

**[📖 Complete Workflow Guide →](docs/workbench-workflow-guide.md)**

## Quick Start

### Installation

Install the planning commands globally for Claude Code or AmpCode:

```bash
# Clone the repository
git clone <repository-url>
cd prompts

# Install globally for Claude Code
./scripts/install-commands --claude

# Install globally for AmpCode
./scripts/install-commands --amp

# Install for both
./scripts/install-commands --both

# Install to a specific project
./scripts/install-commands --claude --project ~/my-project
```

### How Installation Works

**Claude Code** (uses symlinks):
- Commands, agents, and skills are **symlinked** to your installation directory
- Individual `.md` files symlinked for commands and agents
- Entire directories symlinked for skills
- **Benefit**: Edits in this repository immediately reflect in Claude Code
- **Updates**: Run `git pull` in this repo - changes apply automatically, no reinstall needed

**AmpCode** (uses copies):
- Files are **copied** (not symlinked) to installation directory
- **Updates**: Re-run `./scripts/install-commands --amp` after `git pull`

### Using Commands

```bash
# Initialize → Research → Design → Implement → Validate
/wb:create_project my-feature docs/plans TICKET-123
/wb:create_research docs/plans/2025-01-15-TICKET-123-my-feature
/wb:create_mockup docs/plans/... "UI component"  # Optional for UI
/wb:create_design docs/plans/...
/wb:create_execution docs/plans/...
/wb:implement_tasks docs/plans/...
/wb:validate_execution docs/plans/...
```

**Skills** (auto-activated): `project-structure`, `mockup-iteration`, `tdd-discipline`, `verification-before-completion`, `status-sync`, `review-prep`

**[📖 Full Commands Reference →](claude-code/commands/wb/README.md)**

## What's Inside

### 📋 Workbench Commands (`/wb:*`)

Slash commands for project documentation and task management:

- **`/wb:create_project`** - Initialize structured documentation with rich metadata
- **`/wb:create_research`** - Document codebase using parallel research agents
- **`/wb:create_mockup`** - Research UI patterns and create HTML mockups with visual validation
- **`/wb:create_design`** - Create architectural design decisions (WHAT and WHY)
- **`/wb:create_execution`** - Transform design into phased execution plan (HOW)
- **`/wb:implement_tasks`** - Implement with TDD (Red-Green-Refactor)
- **`/wb:validate_execution`** - Validate implementation matches plan
- **`/wb:create_handoff`** - Create session handoff for work continuity
- **`/wb:resume_handoff`** - Resume from handoff document
- **`/wb:update_status`** - Intelligently sync status across all documentation files

**Key Features**:
- Three-document separation (research/design/tasks)
- HTML mockup workflow with visual validation
- Beads integration for persistent task tracking
- Explicit barriers and checkpoints
- TDD enforcement with phase boundaries
- Zero scope creep
- Session continuity

**[📖 Detailed Features →](docs/workbench-workflow-guide.md)**

### 🤖 Workbench Agents (`/wb:*`)

Specialized agents for codebase analysis:

- **`/wb:codebase-locator`** - Find specific components and files
- **`/wb:codebase-analyzer`** - Analyze implementation details with file:line references
- **`/wb:pattern-finder`** - Find similar patterns and implementations

### 🧠 Skills (auto-activated)

Background capabilities that Claude automatically invokes:

- **`project-structure`** - Enforces document separation (research.md, design.md, tasks.md, thoughts/)
- **`mockup-iteration`** - Iterate on UI mockups with KEEP/REMOVE/CHANGE tracking, HTML generation, and Playwright screenshots
- **`tdd-discipline`** - Enforces RED-GREEN-REFACTOR cycle before writing production code
- **`verification-before-completion`** - Requires running verification commands before claiming work is done
- **`status-sync`** - Monitors for status drift and reminds to run `/wb:update_status`
- **`review-prep`** - Interactive code review walkthrough using tmux and nvim for pair programming

[Skills Guide →](docs/claude-code-skills-guide.md)

### 🛠️ Development Scripts

Utility scripts for repository management:

- **`scripts/install-commands`** - Install commands to Claude Code/AmpCode
- **`scripts/lint`** - Markdown linting with auto-fix support
- **`scripts/lint-hook`** - Automatic linting hook for file operations

### 📚 Documentation

Comprehensive guides for using this repository:

- **[Claude Code README](claude-code/README.md)** - Using commands with Claude Code
- **[AmpCode README](ampcode/README.md)** - Using commands with AmpCode
- **[Planning Commands README](commands/planning/README.md)** - Detailed command reference

## Core Philosophy

- **Document, Don't Judge**: Research describes what EXISTS, not what should change
- **Explicit Barriers**: Synchronization points prevent rushing ahead
- **Dual Verification**: Automated (tests, CI) + Manual (UX, edge cases)
- **Zero Scope Creep**: Tasks only from plans - no ad-hoc additions

**[📖 Philosophy Details →](docs/workbench-workflow-guide.md#core-philosophy)**

### Beads Integration

Requires [beads](https://github.com/steveyegge/beads) for persistent task tracking:

```bash
bd init --stealth   # Stealth: .beads/ not committed (work repos)
bd init             # Git: .beads/ in git (personal projects)
```

**Key Features**: Persistent memory across sessions, dependency tracking, auto-detected mode (stealth/git)

**Usage**: Commands create/track beads issues for phases, tasks, and UI questions. SessionStart hook detects mode automatically.

**[📖 Detailed Beads Integration →](docs/workbench-workflow-guide.md#beads-integration)**

## Repository Structure

```
prompts/
├── commands/           # Slash command definitions
│   └── planning/       # Project documentation commands
├── agents/             # Agent definitions (future)
├── general/            # General-purpose prompts (future)
├── docs/               # Documentation and usage guides
├── scripts/            # Utility scripts
│   ├── install-commands
│   ├── lint
│   └── lint-hook
└── .claude/            # Claude Code configuration
    └── settings.local.json
```

## Installation Details

### Global Installation

Commands are installed globally and available in all projects:

**Claude Code**: `~/.claude/commands/`
**AmpCode**: `~/.config/amp/commands/` (or `$XDG_CONFIG_HOME/amp/commands/`)

### Project Installation

Commands are installed in a specific project directory:

**Claude Code**: `<project>/.claude/commands/`
**AmpCode**: `<project>/.agents/commands/`

### Symlinks vs Copies

The installation script creates **symlinks** (not copies) by default. This means:
- Commands automatically update when you `git pull`
- Single source of truth in this repository
- No need to reinstall after updates

## Quick Example

```bash
/wb:create_project feature docs/plans TICKET-123
/wb:create_research docs/plans/2025-01-15-TICKET-123-feature
/wb:create_design docs/plans/...
/wb:create_execution docs/plans/...
/wb:implement_tasks docs/plans/...
```

**[📖 Complete Workflow Example →](docs/workbench-workflow-guide.md#complete-workflow)**

## Development

### Linting

Markdown files are automatically linted via PostToolUse hooks when using Claude Code:

```bash
# Manual linting
./scripts/lint

# Auto-fix issues
./scripts/lint --fix

# Lint specific files
./scripts/lint README.md commands/planning/*.md

# Lint all markdown files
./scripts/lint --all
```

Configuration: `.markdownlintrc`

### Hooks

Claude Code hooks are configured in `.claude/settings.local.json`:
- PostToolUse hooks run linting after Write/Edit operations
- Automatic permission for linting and installation scripts

## Customization

### Modifying Commands

Commands are markdown files - edit them to customize behavior:

```bash
# Edit command
vim commands/planning/create_plan.md

# Test changes
/create_plan test-project
```

### Project-Specific Overrides

Install globally, then override specific commands per-project:

```bash
# Global installation
./scripts/install-commands --both

# Copy one command for customization
cp commands/planning/create_plan.md ~/my-project/.claude/commands/

# Edit project-specific version
vim ~/my-project/.claude/commands/create_plan.md
```

Claude Code and AmpCode check project commands first, then fall back to global.

## Best Practices

**Research**: Read files fully, document objectively, use file:line references
**Planning**: Discuss first, define out-of-scope, measurable criteria
**Implementation**: TDD cycle, beads tracking, respect phase boundaries
**Verification**: Automate CI checks, document manual steps

**[📖 Detailed Best Practices →](docs/workbench-workflow-guide.md#best-practices)**

## Contributing

This is a personal repository, but pull requests are welcome for:
- Bug fixes in existing commands
- Documentation improvements
- New utility scripts
- Additional prompt templates

Please:
1. Run `./scripts/lint --fix` before committing
2. Test commands thoroughly
3. Update documentation
4. Follow existing patterns

## Credits

Planning commands inspired by context engineering patterns and refined through real-world usage. Incorporates learnings from HumanLayer's command architecture with adaptations for general use.

## License

[Your license here]

## Support

- **Commands**: See [Planning Commands README](commands/planning/README.md)
- **Claude Code Integration**: See [Claude Code README](claude-code/README.md)
- **AmpCode Integration**: See [AmpCode README](ampcode/README.md)
- **Issues**: Open an issue in this repository
