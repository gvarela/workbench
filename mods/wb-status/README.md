# wb-status (prototype)

A read-only [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) for the wb workflow. It shows where the active plan stands and, on a separate line, whether its tests can be trusted, without you running `/wb:help` or `bd` yourself.

It is a separate plugin from `wb` while it is a prototype. It never writes to the repository, to beads, or to any file, and it never approves or denies a tool call.

Tested with Claude Code 2.1.306. The mods API is early access and can change between releases.

## Try it

From the marketplace (once it is added and points at a commit that has this folder):

```bash
claude plugin install wb-status@gvarela-workbench
```

Or for one session, straight from a checkout:

```bash
claude --plugin-dir ./mods/wb-status
```

Start the session in a repository with a wb plan: a `docs/plans/<dir>/tasks.md` whose frontmatter has `beads_tasks` and a `status` other than `complete`, and a working `bd`. With no such plan, or when `bd` fails, the mod shows nothing.

## What it shows

### The band above the prompt (terminal and Desktop)

```text
Plan: <plan> · Phase 2/3 ██████░░░░ 3/5 tasks · now: Build the reset form (ex-t2)
Tests: 1/2 criteria have a red-first outer test · verifier: last 3 passed · ✓ nothing needs you
```

Line 1, progress:

- **Plan**: the `project` field of the active plan's tasks.md.
- **Phase N/M**: the lowest phase that still has an unclosed task, read from beads (not the frontmatter's `current_phase`, which only `/wb:update_status` writes), out of the plan's phases. `done` when every task is closed.
- **Bar and closed/total**: the tasks of that phase (from the frontmatter's `beads_tasks` keys, `phaseN_...`) that beads shows closed.
- **now**: the task in progress, by title, with its beads id.

Line 2, test integrity:

- **criteria with a red-first outer test**: the criteria in design.md's Acceptance Criteria (`- **AC-n Title**`) that have a `red(AC-n)` commit in `git log` since the plan was created. With no design.md criteria, the AC ids tasks.md mentions.
- **verifier**: the latest `verification report:` verdict of the most recently verified tasks, up to five, naming one that failed.
- **⚠ or ✓**: what needs you: a task with a `halted:` comment that is not closed, a task that was closed and reopened, and an open `Q:` or `Decide:` issue linked to the plan or opened since it was created.

Another mod that draws in the band keeps its line: this one places it below its own two.

### The status line (VS Code fallback)

The VS Code extension draws no band, so while a VS Code (or mobile) surface is attached the mod pins one line under the prompt:

```text
wb <plan>: phase 2/3 3/5 · red-first 1/2 · ✓
```

### The `/wb-status` pane

`/wb-status` takes a fresh reading and opens a pane with four sections:

- **Needs your decision**: each blocking item, with why it is blocking.
- **What phase N delivered**: the phase's tasks grouped by the criterion each one names (`AC-n` in its title or description), then the tasks that name none. `✓` closed, `…` in progress, `○` open.
- **Test integrity**: per criterion, its red commit (or none), its latest verifier verdict and the task it came from, and the integrity findings count from the `test integrity:` comment.
- **Follow-ups**: open issues filed `discovered-from` one of the plan's issues.

Close it with ctrl+x x, or the close mark on its frame.

## When it refreshes

- Shortly after the session starts.
- After a Bash call (the main session's or a subagent's) that runs `bd close`, `bd update`, `bd reopen`, `bd create`, `bd comments add`, `git commit`, `git revert` or `git cherry-pick`, once the burst settles.
- Every 60 seconds.
- When you run `/wb-status`.

Each reading runs two `bd list` calls, one `git log`, and `bd comments` only for the 15 most recently updated plan tasks that have comments, reusing what it read until a task's comment count or update time changes. Drawing reads only that cache. `bd` runs with `--readonly`.

## Turn it off

- In a session: `/plugin`, the **Installed** tab, select `wb-status` and disable it.
- From the shell: `claude plugin disable wb-status@gvarela-workbench`, or `claude plugin uninstall wb-status@gvarela-workbench`.
- A `--plugin-dir` session: start without the flag.

## Develop

```bash
claude plugin validate ./mods/wb-status
claude plugin test ./mods/wb-status
```

`hooks/model.mjs` holds the parsing and wording and has no `$` calls, so the tests exercise it directly; `hooks/wb-status.mjs` holds the hooks and the reads.

## Known limits

- The active plan is the newest `docs/plans/*/tasks.md` (by directory name) that is unfinished and lists beads tasks; only the session's project root is searched.
- A task serves a criterion when its title or description mentions `AC-n`, so a task that mentions a criterion in passing is listed under it.
- `red(AC-n)` commits are matched by id since the plan's creation date; another plan's commit with the same id in that window would count.
- Verifier verdicts come only from the 15 most recently updated commented tasks.
- A reopened task is recognized by a `closed_at` or `close_reason` that beads kept on an unclosed task.
- The first reading after a load can take several seconds in a large plan (one `bd comments` call per commented task); the band shows nothing until it lands.
