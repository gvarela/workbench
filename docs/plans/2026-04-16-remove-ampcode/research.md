---
project: remove-ampcode
ticket: null
created: 2026-04-16
created_timestamp: 2026-04-16T23:04:01Z
status: complete
last_updated: 2026-04-16
researcher: gvarela
git_commit: c6f37958065457aecfdde7bdca2fe27933fffb3f
git_branch: main
repository: gvarela/prompts
tags: [research, codebase, remove-ampcode]
---

# Research: Remove Ampcode

**Created**: 2026-04-16 23:04 UTC
**Last Updated**: 2026-04-16
**Ticket**: N/A

## Research Question

Find everything in the codebase related to AmpCode so it can be removed cleanly.

## Summary

AmpCode content exists in four locations: a dedicated `ampcode/` directory (14 files), the `scripts/install-commands` script (AmpCode installation logic), the root `README.md` (references on 10 lines), and `.claude/settings.local.json` (one permission entry). The `ampcode/` directory contains a parallel set of planning and action commands adapted for AmpCode's different mechanics (commands loaded into user input field, no agent spawning, copy-based installation). The install script has AmpCode-specific functions, conditional branches, and output messages throughout. All other AmpCode content is cross-references in documentation.

## Detailed Findings

### 1. The `ampcode/` Directory

**Location**: `ampcode/` (14 files total)

The entire directory is a self-contained set of AmpCode-specific commands and documentation:

```
ampcode/
├── README.md                              # AmpCode installation/usage guide
└── commands/
    ├── CLAUDE.md                          # AmpCode command authoring guidelines
    ├── planning/
    │   ├── CLAUDE.md                      # Planning-specific authoring philosophy
    │   ├── README.md                      # Planning commands reference
    │   ├── create_project.md              # /create_project command
    │   ├── create_research.md             # /create_research command
    │   ├── create_design.md               # /create_design command
    │   ├── create_execution.md            # /create_execution command
    │   ├── implement_tasks.md             # /implement_tasks command
    │   └── update_status.md               # /update_status command
    └── actions/
        ├── README.md                      # Action commands documentation
        ├── locate_code.md                 # /locate_code command
        ├── analyze_code.md                # /analyze_code command
        └── find_patterns.md               # /find_patterns command
```

These mirror the Claude Code commands under `claude-code/commands/wb/` but adapted for AmpCode's mechanics:
- No `Task` tool — commands use direct instructions instead of agent spawning
- Commands loaded into user input field before submission — requires "User Input Section" at bottom of each file
- Copy-based installation (AmpCode doesn't follow symlinks)
- Flat namespace (`/create_project`) vs Claude Code's prefixed namespace (`/wb:create_project`)

### 2. `scripts/install-commands`

**Location**: `scripts/install-commands`

The install script contains AmpCode logic throughout:

**Header and usage** (lines 3-84):
- Line 3: Script description mentions AmpCode
- Lines 7, 10: `--amp` flag usage examples
- Lines 54, 61-62: Help text for `--amp` and `--both` flags
- Lines 77, 83-84: AmpCode installation paths documented

**Source directory function** (lines 116-117):
- `get_commands_dirs()` returns `$REPO_ROOT/ampcode/commands/planning` and `$REPO_ROOT/ampcode/commands/actions` for AmpCode

**Target directory function** (lines 142-173):
- Line 158: AmpCode uses flat directory structure
- AmpCode global target: `~/.config/amp/commands/`
- AmpCode project target: `<project>/.agents/commands/`

**Installation logic** (lines 308-394):
- Line 312: `use_symlinks` parameter — `true` for Claude Code, `false` for AmpCode
- Line 314: `prefix` parameter for AmpCode filename prefixing
- Line 338: AmpCode prefix prepending logic
- Line 371: Copy path (vs symlink) for AmpCode

**AmpCode installation functions** (lines 684-757):
- Lines 699-711: `install_to_target` calls for AmpCode planning and action commands
- Lines 735-757: Post-install messages specific to AmpCode

**Flag parsing** (line 558):
- `INSTALL_AMP` flag controls AmpCode installation

### 3. Root `README.md`

**Location**: `README.md`

AmpCode referenced on 10 lines:

| Line | Content |
|------|---------|
| 3 | Repo description includes "AmpCode" |
| 7 | Expanded description mentions AmpCode |
| 15 | "Install... for Claude Code or AmpCode" |
| 25 | `./scripts/install-commands --amp` |
| 44 | "AmpCode (uses copies)" section |
| 118 | `scripts/install-commands` described as "Install commands to Claude Code/AmpCode" |
| 127 | Link to `ampcode/README.md` |
| 178 | AmpCode global install path |
| 185 | AmpCode project install path |
| 263 | "Claude Code and AmpCode check project commands first..." |
| 300 | "AmpCode Integration" link |

### 4. `.claude/settings.local.json`

**Location**: `.claude/settings.local.json:7`

Single AmpCode-related entry in the allowed permissions list:

```json
"WebFetch(domain:ampcode.com)"
```

This grants permission to fetch from `ampcode.com`, the AmpCode documentation domain.

## Architecture Documentation

### Parallel Command Structure

The repository maintains two parallel command sets for the same workflow:

| Aspect | Claude Code | AmpCode |
|--------|-------------|---------|
| Source directory | `claude-code/commands/wb/` | `ampcode/commands/` |
| Command prefix | `/wb:` | None (flat) |
| Agent spawning | Uses `Task` tool | Direct instructions |
| Parameter input | Inline arguments | Pre-filled at bottom of prompt |
| Installation method | Symlinks | Copies |
| Global install path | `~/.claude/commands/wb/` | `~/.config/amp/commands/` |
| Project install path | `<proj>/.claude/commands/wb/` | `<proj>/.agents/commands/` |
| Agent definitions | Yes (`claude-code/agents/wb/`) | None |
| Skills | Yes (`claude-code/skills/`) | None |

### Shared Patterns

Both tools produce identical output formats:
- Same YAML frontmatter in generated docs (`project`, `ticket`, `created`, `status`, etc.)
- Same workflow: `create_project` → `create_research` → `create_design` → `create_execution` → `implement_tasks`
- Same barrier/checkpoint pattern (`⛔ BARRIER 1/2/3`)
- Same document structure for research.md, design.md, tasks.md

## Code References

Complete list of files to modify or remove:

**Delete entirely (14 files):**
- `ampcode/README.md`
- `ampcode/commands/CLAUDE.md`
- `ampcode/commands/planning/CLAUDE.md`
- `ampcode/commands/planning/README.md`
- `ampcode/commands/planning/create_project.md`
- `ampcode/commands/planning/create_research.md`
- `ampcode/commands/planning/create_design.md`
- `ampcode/commands/planning/create_execution.md`
- `ampcode/commands/planning/implement_tasks.md`
- `ampcode/commands/planning/update_status.md`
- `ampcode/commands/actions/README.md`
- `ampcode/commands/actions/locate_code.md`
- `ampcode/commands/actions/analyze_code.md`
- `ampcode/commands/actions/find_patterns.md`

**Edit to remove AmpCode references:**
- `README.md` — Remove AmpCode mentions from lines 3, 7, 15, 25, 44, 118, 127, 178, 185, 263, 300
- `scripts/install-commands` — Remove `--amp`/`--both` flags, AmpCode source/target dirs, copy logic, AmpCode install functions, AmpCode output messages
- `.claude/settings.local.json:7` — Remove `WebFetch(domain:ampcode.com)` permission

## Next Steps

1. Review the research document
2. Run `/wb:create_design docs/plans/2026-04-16-remove-ampcode` to plan the removal approach

## References

- Design: [design.md](design.md)
- Tasks: [tasks.md](tasks.md)
