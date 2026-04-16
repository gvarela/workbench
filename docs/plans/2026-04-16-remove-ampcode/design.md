---
project: remove-ampcode
ticket: null
created: 2026-04-16
created_timestamp: 2026-04-16T23:04:01Z
status: approved
last_updated: 2026-04-16
designer: gvarela
git_commit: c6f37958065457aecfdde7bdca2fe27933fffb3f
git_branch: main
repository: gvarela/prompts
tags: [design, architecture, remove-ampcode]
depends_on: research.md
design_approach: single-pass-removal
---

# Design: Remove Ampcode

**Created**: 2026-04-16 23:04 UTC
**Designer**: gvarela
**Ticket**: N/A
**Status**: Approved

## Problem Statement

The repository maintains a parallel set of AmpCode commands that are no longer needed. The `ampcode/` directory (14 files), install script logic, README references, and a settings permission all add maintenance burden for an unused tool. Removing them simplifies the repo to Claude Code only.

### Success Metrics

- [ ] Zero files or directories named "ampcode" remain in the repo
- [ ] Zero references to "ampcode" or "AmpCode" in any remaining file
- [ ] `scripts/install-commands` works for Claude Code without errors
- [ ] README accurately describes a Claude Code-only repository

## Design Approach

Single-pass atomic removal: delete the `ampcode/` directory and edit the 3 files that reference it, all in one commit.

### Why This Approach

- The `ampcode/` directory is fully self-contained with no inbound dependencies from other code
- The 3 files needing edits have simple, line-level removals — no logic restructuring
- An archive branch (`archive/ampcode`) already preserves the full pre-removal state
- A broken intermediate state (e.g., README linking to deleted files) is avoided by doing it atomically

## Technical Decisions

### Deletion Strategy

- Delete the entire `ampcode/` directory tree (14 files) rather than file-by-file
- Rationale: No file in `ampcode/` is referenced by non-ampcode code; the directory is self-contained

### Install Script Simplification

- Remove `--amp` and `--both` CLI flags and all AmpCode-specific code paths
- The script becomes Claude Code-only — the `use_symlinks` parameter, `prefix` parameter, and copy-based installation logic all go away
- Rationale: These code paths only exist to serve AmpCode's different mechanics (no symlink support, flat namespace)

### README Rewrite Scope

- Remove AmpCode from the repo description and all installation/usage sections
- Keep the README structure intact — just narrow it to Claude Code
- Rationale: The README sections cleanly separate Claude Code and AmpCode content, so removal is surgical

### Settings Cleanup

- Remove the single `WebFetch(domain:ampcode.com)` permission entry
- Rationale: No remaining code needs to fetch from ampcode.com

## Scope Definition

### In Scope

- Delete `ampcode/` directory (14 files)
- Edit `scripts/install-commands` to remove AmpCode flags, source/target dirs, copy logic, install functions, output messages
- Edit `README.md` to remove all AmpCode references
- Edit `.claude/settings.local.json` to remove `WebFetch(domain:ampcode.com)`

### Out of Scope

- Modifying Claude Code commands or agents
- Changing the install script's Claude Code behavior
- Restructuring the repository layout beyond ampcode removal

## Success Criteria

### Functional Requirements

- [ ] `ampcode/` directory no longer exists
- [ ] `scripts/install-commands --claude` installs successfully
- [ ] `scripts/install-commands --amp` is no longer a valid flag
- [ ] `grep -ri ampcode` across the repo returns zero results (excluding `docs/plans/` project docs)

### Non-Functional Requirements

- [ ] Single atomic commit for the removal
- [ ] Archive branch `archive/ampcode` preserved on remote

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Install script breaks after edit | Med | Low | Test `--claude` flag after changes |
| Missed ampcode reference | Low | Low | Run `grep -ri ampcode` to verify |

### Assumptions

| Assumption | Validated? |
|------------|------------|
| No external tools depend on `ampcode/` directory | Yes — self-contained per research |
| Archive branch preserves full history | Yes — pushed to `origin/archive/ampcode` |

## Rejected Alternatives

### Option: Phased Removal

- **Approach**: Delete directory first, edit references in a second commit
- **Rejected because**: Creates a broken intermediate state where README links to deleted files; no benefit given the small scope

## References

- Research: [research.md](research.md)
- Tasks: [tasks.md](tasks.md)
- Archive: `origin/archive/ampcode` branch
