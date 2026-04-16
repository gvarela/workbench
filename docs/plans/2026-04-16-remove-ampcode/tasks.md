---
project: remove-ampcode
ticket: null
created: 2026-04-16
created_timestamp: 2026-04-16T23:04:01Z
status: in-progress
last_updated: 2026-04-16
assignee: gvarela
current_phase: 1
total_tasks: 9
completed_tasks: 4
git_commit: c6f37958065457aecfdde7bdca2fe27933fffb3f
git_branch: main
repository: gvarela/prompts
tags: [tasks, tracking, remove-ampcode]
depends_on: [research.md, design.md]
beads_epic: prompts-byo
beads_tasks:
  delete_ampcode_dir: prompts-yda
  clean_install_script: prompts-0hg
  clean_readme: prompts-bu5
  clean_settings: prompts-1f7
  verify_clean: prompts-2wg
---

# Execution Plan: Remove Ampcode

## Overview

Single-pass atomic removal of all AmpCode content from the repository, as specified in design.md.

**Design Approach**: Single-pass removal — delete directory, edit 3 files, one commit.
**Target State**: Zero ampcode references remain (excluding docs/plans/ project docs).

## Implementation Strategy

### Phase Rationale

All four removal tasks are independent (no ordering dependencies) and will be done atomically in one commit. The verification task runs after all removals to confirm clean state.

### Testing Strategy

No unit tests — this is a deletion. Verification is:
1. `grep -ri ampcode` returns zero results outside docs/plans/
2. `scripts/install-commands --claude` runs without error

## Progress Overview

```bash
bd ready                    # See available work
bd list --status=in_progress # See active work
bd list --status=closed     # See completed tasks
```

**Beads Epic**: `prompts-byo`

---

## Planning Phase (complete)

- [x] Create project structure (completed 2026-04-16 23:04)
- [x] Complete research (completed 2026-04-16 23:05)
- [x] Create design document (completed 2026-04-16 23:10)
- [x] Generate execution plan (completed 2026-04-16 23:15)

---

## Phase 1: Atomic Removal

### Objective

Remove all AmpCode content in a single atomic commit.

### Task 1: Delete `ampcode/` directory (`prompts-yda`)

```bash
rm -rf ampcode/
```

Removes 14 files:
- `ampcode/README.md`
- `ampcode/commands/CLAUDE.md`
- `ampcode/commands/planning/` (7 files: CLAUDE.md, README.md, create_project.md, create_research.md, create_design.md, create_execution.md, implement_tasks.md, update_status.md)
- `ampcode/commands/actions/` (4 files: README.md, locate_code.md, analyze_code.md, find_patterns.md)

### Task 2: Remove AmpCode logic from `scripts/install-commands` (`prompts-0hg`)

**Current State**: Script supports both `--claude` and `--amp` flags with separate code paths for symlinks vs copies, different source/target directories, and AmpCode-specific output messages.

**Target State**: Script supports only `--claude`. Remove:
- `--amp` and `--both` CLI flags and parsing
- `INSTALL_AMP` variable and conditionals
- AmpCode entries in `get_commands_dirs()` (lines 116-117)
- AmpCode entries in `get_target_dirs()` (lines 158+)
- Copy-based installation path in `install_to_target()` (the `use_symlinks=false` branch)
- `prefix` parameter logic for AmpCode filename prefixing
- AmpCode install functions (lines 684-757)
- AmpCode-specific output messages and examples

### Task 3: Remove AmpCode references from `README.md` (`prompts-bu5`)

**Current State**: ~10 lines reference AmpCode.

**Target State**: README describes a Claude Code-only repository. Remove/rewrite:
- Line 3: Remove "and AmpCode" from description
- Line 7: Remove "and AmpCode" from expanded description
- Line 15: Change to "Install... for Claude Code"
- Line 25: Remove `--amp` example
- Line 44: Remove "AmpCode (uses copies)" section
- Line 118: Change to "Install commands to Claude Code"
- Line 127: Remove AmpCode README link
- Line 178: Remove AmpCode global path
- Line 185: Remove AmpCode project path
- Line 263: Remove "and AmpCode" from precedence note
- Line 300: Remove AmpCode Integration link

### Task 4: Remove permission from `.claude/settings.local.json` (`prompts-1f7`)

Remove line 7: `"WebFetch(domain:ampcode.com)"`

### Task 5: Verify clean state (`prompts-2wg`)

Blocked by tasks 1-4. After all removals:

```bash
# Must return zero results (excluding docs/plans/)
grep -ri ampcode --include='*.md' --include='*.json' --include='*.sh' . | grep -v docs/plans/

# Must run without errors
./scripts/install-commands --claude --dry-run 2>&1 || echo "FAIL"

# --amp must not be recognized
./scripts/install-commands --amp 2>&1 | grep -i "invalid\|unknown\|error" && echo "PASS"
```

### Success Criteria

- [ ] `ampcode/` directory does not exist
- [ ] `grep -ri ampcode` returns zero results outside docs/plans/
- [ ] `scripts/install-commands --claude` works
- [ ] `scripts/install-commands --amp` is rejected or ignored
- [ ] Single atomic commit with all changes

---

## Quick Reference

### Key Files

- **Research**: [research.md](research.md)
- **Design**: [design.md](design.md)
- **Archive**: `origin/archive/ampcode` branch

### Next Action

**Run**: `/wb:implement_tasks docs/plans/2026-04-16-remove-ampcode`
