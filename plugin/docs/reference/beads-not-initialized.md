# Beads Not Initialized — Standard Response

Shared reference for wb skills that require beads tracking (`implement`, `implement_inline`, `create_tasks`, and others). When `bd info` fails, beads is otherwise unavailable, or the session-start sanity check cannot resolve the plan's epic, present the matching case below and stop.

Requires bd 1.1.0 or later (`bd version`).

## Beads not initialized

```
⚠️ Beads Not Initialized

Beads is required for task tracking in the wb workflow.

To initialize beads for this project:

    cd [project-root]
    bd init --stealth  # any repository with collaborators who do not use beads (writes the shared .git/info/exclude)
    bd init            # only a repository you own outright; .beads/ is still excluded, never checked in

Then run /wb:create_tasks to set up beads issues for all tasks.
```

The setup rule, the persistence tiers, and the sanity check are in [beads-mode.md](beads-mode.md).

**Stop and wait for the user to initialize beads before proceeding.** Do not fall back to markdown checkboxes or TaskCreate/TodoWrite — beads is the only sanctioned status tracker in the wb workflow.

## Wrong database

```
⚠️ Wrong Database

The database bd resolved (`<name>`, from `bd context`) is not the one this plan was tracked in; check `.beads/metadata.json` and `bd context`, then rerun.

Plan epic: <beads_epic from tasks.md frontmatter>
Resolved database: <name>
```

A missing `.beads/metadata.json` makes bd 1.1.0 open an empty default database named `beads` silently, so every command reports zero issues and `bd info` does not catch it. In a worktree the shared `.beads/` lives under the main checkout, and a worktree-isolated session cannot write there, so hand the repair to the user.

**Stop and wait for the user to fix the database before proceeding.**

## A bd command fails

1. **Diagnose**: `bd info` (initialization), `bd context` (which database is open), `bd doctor` (installation health; server mode only in 1.1.0, a no-op in embedded mode), `bd status` (overview)
2. **Report** the specific error to the user
3. **Common fixes**: "issue not found" → `bd list -n 0` to find the right ID; "database locked" → wait and retry (parallel sessions share one embedded database)
4. **Retry** the failed command after fixing
