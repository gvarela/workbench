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
── wb plan ─────────────────────────────────────────────────────────────────────────
Plan: <plan> · Phase 2/3 ██████░░░░ 3/5 tasks · 1 follow-up open · now: Build the reset form (ex-t2)
Tests: ✓ nothing needs you · red-first 1/2 · verifier 3✓
```

While a phase waits for you at its checkpoint:

```text
── wb plan ─────────────────────────────────────────────────────────────────────────
Plan: <plan> · Phase 2/3 at checkpoint ██████████ 5/5 tasks · 2 follow-ups open
Tests: ⚠ Phase 2 checkpoint waiting for you · red-first 2/2 · verifier 4✓ 1✗
```

The rule: a dim `── wb plan ──` line across the band's width, so the band does not read as part of Claude's status text above it. In a band too narrow for the label it is a blank line, and when the band has fewer than three rows it is left out.

Line 1, progress:

- **Plan**: the `project` field of the active plan's tasks.md.
- **Phase N/M**: the lowest phase whose milestone (the frontmatter's `beads_phases`) is still open in beads, not the frontmatter's `current_phase`, which only `/wb:update_status` writes. `at checkpoint` when that phase's tasks are all closed: the phase is waiting for you to accept it. `done` when every milestone is closed. With no milestones, the lowest phase that still has an unclosed task.
- **Bar and closed/total**: that phase's planned tasks (the frontmatter's `beads_tasks` keys, `phaseN_...`) that beads shows closed. Follow-ups are not counted here.
- **follow-ups open**: unclosed issues that belong to the plan but are not planned tasks: every other issue under the plan's epic (a fix task, a test gap, a review finding), and anything filed `discovered-from` one of the plan's issues. `Q:` and `Decide:` issues are not follow-ups; they show on line 2.
- **now**: the issue in progress, planned task or follow-up, by title, with its beads id. `nothing in progress` while a phase is running with none claimed; left out at a checkpoint or when done.

Line 2, test integrity, with what needs you first:

- **⚠ or ✓**: what needs you, the first item and a `+N more` count: a phase checkpoint waiting (above); a plan issue with a `halted:` comment and no later `verification report:`, `test integrity:`, `resolved:` or `resumed:` comment, and not closed; an issue that was closed and reopened; an open `Q:` or `Decide:` issue linked to the plan or opened since it was created. The pane lists every item.
- **red-first n/m**: the criteria in design.md's Acceptance Criteria (`- **AC-n Title**`) that have a `red(AC-n)` commit since the plan was created. With no design.md criteria, the AC ids tasks.md mentions.
- **verifier n✓ n✗**: the latest verdict of each verified issue in this phase: its planned tasks, and the follow-ups that moved since the previous phase's milestone closed. A verdict comes from a `verification report:` comment's `### Status:` line; from an older `test integrity:` comment, by its PASS or FAIL wording, else FAIL when a finding was escalated, else PASS (used only when no report or close reason says otherwise); or from a close reason such as `Verified PASS`. The latest wins.

When the terminal is too narrow for a line, the least important parts go first. Line 1 shortens the in-progress title, then drops it, then the follow-up count, then the bar, keeping the phase and its counts. Line 2 keeps what needs you and drops the red-first count, then the verifier, then the `Tests:` label, and shortens the item last.

Color marks state only, and every state keeps its symbol, so the band reads the same without color. The colors are theme keys, so they follow your light or dark theme:

| Part | Color |
| :- | :- |
| The rule, `Plan:`, `Tests:`, `now:`, `red-first`, `verifier` | dim |
| Plan name, phase, counts, titles | default text |
| Bar, filled cells | `permission` (the theme's blue accent); empty cells `inactive` |
| `✓ nothing needs you` | `success` |
| `⚠ …` (checkpoint, halt, reopened, question, decision) | `warning` |
| `n✗` (verifier failures) | `error` |

Another mod that draws in the band keeps its line: this one places it below its own.

### The status line (VS Code fallback)

The VS Code extension draws no band, so while a VS Code (or mobile) surface is attached the mod pins one line under the prompt:

```text
wb <plan>: phase 2/3 3/5 · red-first 1/2 · verifier 3✓ · ✓
```

### The `/wb-status` pane

`/wb-status` takes a fresh reading and opens a pane with four sections:

- **Needs your decision**: each blocking item, with why it is blocking.
- **What phase N delivered**: the phase's tasks grouped by the criterion each one names (`AC-n` in its title or description), then the tasks that name none. `✓` closed, `…` in progress, `○` open.
- **Test integrity**: per criterion, its red commit (or none), its latest verifier verdict and the task or follow-up it came from, and the integrity findings count from the `test integrity:` comment.
- **Follow-ups**: the open follow-ups, with the issue each was discovered from.

Close it with ctrl+x x, or the close mark on its frame.

## When it refreshes

- Shortly after the session starts.
- After a Bash call (the main session's or a subagent's) that runs `bd close`, `bd update`, `bd reopen`, `bd create`, `bd comments add`, `git commit`, `git revert` or `git cherry-pick`, once the burst settles.
- Every 60 seconds.
- When you run `/wb-status`.

Each reading runs three `bd list` calls (the frontmatter's ids, the epic's children, every unclosed issue), one `git log`, and `bd comments` for the issues that have comments: every one in this phase's verifier window, and up to 10 others per reading, so the pane's per-criterion verdicts fill in over a few readings. A comment read is reused until the issue's comment count or update time changes, so a settled plan costs only the three lists and the log. Drawing reads only that cache. `bd` runs with `--readonly`.

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
- The band's verifier count covers this phase only; the pane's per-criterion verdicts for earlier phases fill in over the first few readings after a load.
- A checkpoint is inferred from beads (an open milestone whose planned tasks are all closed), not read from the session, so a phase whose milestone was left open after you accepted it shows as waiting until the milestone is closed.
- A reopened task is recognized by a `closed_at` or `close_reason` that beads kept on an unclosed task.
- The first reading after a load can take several seconds in a large plan (one `bd comments` call per commented task); the band shows nothing until it lands.
