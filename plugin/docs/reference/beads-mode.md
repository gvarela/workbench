# Beads in the wb workflow

Shared reference for all wb skills: the local embedded database is always the source of truth, and this file is where every skill's persistence, close, and hygiene steps come from.

## Setup

Run `bd init --stealth` for any repository with collaborators who do not use beads. It writes the shared `.git/info/exclude`, so `.beads/` appears in nobody's tree on any branch or worktree — beads' own help calls this "perfect for personal use without affecting repo collaborators." Where beads already exists in a repository, run `bd init --setup-exclude` to add just the exclude entry, the same step init does for forks. When the database should live outside the repository entirely, use the contributor role — `bd init --role contributor`, or the `--contributor` wizard — which routes to `routing.contributor`, defaulting to `~/.beads-planning`. Plain `bd init` is only for a repository the user owns outright, and even then `.beads/` is excluded, because the Dolt directory is never committed. Ignoring `.beads/` through the committed `.gitignore` is branch-dependent and second-best: a stale branch without that line breaks detection.

## Persistence

Three tiers, not modes:

1. **Local** — the embedded Dolt database under `.beads/`, always. This is the source of truth; every mutation is auto-committed to it.
2. **Cross-machine continuity** — either a Dolt remote (`bd dolt push` / `bd dolt pull` against `sync.remote`) or `bd backup` (`bd backup init <url>`, `bd backup sync`, `bd backup restore`). A backup is Dolt-native: it preserves tables, branches, commit history, and working-set data; DoltHub is the recommended target. `bd config set dolt.local-only true` skips wiring a remote at init.
3. **JSONL export** — for viewers and interchange only. `.beads/issues.jsonl` is written only when `export.auto` is on (`bd config set export.auto true`, default off; throttled by `export.interval`, 60s) or when `bd export` is run directly. It is not a backup and not cross-machine sync — `import.auto` defaults to true, but a stale export just sits there (observed 2026-09-05 on bd 1.0.2: five weeks stale, 92 of 156 issues).

`.beads/` is never committed to git.

## What a session does at close

One question, one action. `bd config get sync.remote` prints the bare value when set and `sync.remote (not set in config.yaml)` when unset (exit 0 either way); `bd config get backup.enabled` prints `true` or `false`. If a remote is configured, run `bd dolt push`; if backup is enabled, run `bd backup sync`; otherwise do nothing.

```bash
# Persist beads state (see plugin/docs/reference/beads-mode.md)
if bd config get sync.remote 2>/dev/null | grep -qv "not set"; then bd dolt push; fi
if [ "$(bd config get backup.enabled 2>/dev/null)" = "true" ]; then bd backup sync; fi
```

## Worktrees

- Every worktree shares one database, resolved from git's common directory — `bd context` shows `beads dir` under the main checkout and `worktree: yes`.
- The exclude file `.git/info/exclude` is shared by every worktree too, which is why stealth detection is stable across them.
- A worktree has no `.beads/` of its own.
- A worktree-isolated session cannot write files under the shared `.beads/`, so a repair there (for example restoring `.beads/metadata.json`) is handed to the user. Parallel sessions share one embedded database; beads' managed server (`bd config` `dolt` server mode) exists if lock contention appears.

## Session-start sanity check

Every stage that reads a plan's beads IDs runs three commands before doing work:

1. `bd context` — the resolved database name.
2. `bd show <beads_epic>` — the epic recorded in the plan's frontmatter.
3. `bd stats` — the total issue count.

If `bd show` fails, stop and present the wrong-database message from `beads-not-initialized.md`: "The database bd resolved (`<name>`, from `bd context`) is not the one this plan was tracked in; check `.beads/metadata.json` and `bd context`, then rerun." Skip the check when the frontmatter has no `beads_epic` — the plan predates beads tracking.

Also compare `bd version` against the floor: this workflow requires bd 1.1.0 or later.

Why the check matters: a missing `.beads/metadata.json` makes bd open an empty default database named `beads` silently. Every command then reports zero issues, and `bd info` does not catch it.

## Hygiene

- `bd doctor` at session close — checks the `.beads/` directory, database version and migrations, schema, file permissions, circular dependencies, git hooks, and metadata.json version tracking. In bd 1.1.0 it runs only against a Dolt server (`bd init --server`); in the default embedded mode it prints a not-supported note and does nothing, so run the three commands below directly. (`bd preflight` is beads' own contributor checklist for its Go repository, not a check on your workspace.)
- `bd stale` — issues not updated in 30 days (`--days` to change).
- `bd orphans` — open or in-progress issues that commit messages already reference: work that landed but was never closed; `--fix` closes them with confirmation.
- `bd lint` — open issues missing the sections their type expects (acceptance criteria for tasks, steps to reproduce for bugs).

## Memory

`bd remember` memories are workspace-wide, shared across every plan in the repository. They are excluded from `bd export` by default, since they may contain sensitive agent context, so only a Dolt remote or `bd backup` carries them to another machine. Search with `bd memories <keyword>`; update a memory in place with `bd remember --key <key>`.
