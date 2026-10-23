# wb-status (prototype)

A read-only [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) for the wb workflow. While a plan is being planned (project, research, explore, design, tasks), it shows which stage the plan is at and that stage's key signals. Once the plan has beads tasks, it shows where the work stands and, on a separate line, whether its tests can be trusted. Either way you need not run `/wb:help` or `bd` yourself.

It is a separate plugin from `wb` while it is a prototype. It never writes to the repository or to beads, and it never approves or denies a tool call. The one file it can write is the opt-in [reading log](#the-reading-log-opt-in), which is off by default and lives outside any repository. What it keeps lives in the session's own state: the session's pinned plan, the latest wb stage the session ran, and a `/wb:create_project` waiting for its folder.

Tested with Claude Code 2.1.309. The mods API is early access and can change between releases.

## Try it

From the marketplace (once it is added and points at a commit that has this folder):

```bash
claude plugin install wb-status@gvarela-workbench
```

Or for one session, straight from a checkout:

```bash
claude --plugin-dir ./mods/wb-status
```

Start the session in a repository with a wb plan, or run `/wb:create_project` to make one. A plan is a `docs/plans/<dir>/` with a README.md or a tasks.md whose `status` is not `complete`. A plan whose tasks.md names `beads_tasks` needs a working `bd`: when `bd` fails, the mod shows nothing for it. A plan with no beads tasks yet shows without beads; `bd` only adds its open questions and decisions.

## Which plan it shows

A repository can hold several plans, in the main checkout and in each git worktree (a worktree has its own `docs/plans`). The mod picks one, in this order:

1. **The plan this session pinned.** A `/wb:*` command that names a plan directory pins it: typed (`/wb:create_research docs/plans/<dir>/ <question>`, `/wb:create_design docs/plans/<dir>`, `/wb:implement docs/plans/<dir>/ 2`) or run through the Skill tool. The latest one wins. The path is kept as given; a relative path is looked for under the session's directory, its project root, then each worktree of the repository (`git worktree list`), so a plan that lives only in `.claude/worktrees/<name>/` is found from a session started in the main checkout. The pin lasts for the session: a compaction keeps it. When the mod loads into a session whose pin was never written (a resume, or `/reload-plugins` in a running session, which fires no session start), its first reading takes the latest `/wb:*` invocation from the transcript, scanning newest first and stopping at the first that names a plan. A pin cleared with `/wb-status auto` stays cleared.
2. **The folder `/wb:create_project` made.** That command creates its folder rather than naming it, so the mod notes the plan folders that exist when it runs. The first Write or Edit into a `docs/plans/<dir>/` that was not there (or into any plan's README.md) pins that folder. Failing that, a reading after the command (one follows each Bash call while it waits) pins a `docs/plans/<dir>` that has appeared since, the newest name when several did. A resumed session finds the same Write in its transcript.
3. **Guessed.** Among the unfinished plans of every worktree (up to 12 per worktree, newest names first):
   - a beads plan with an issue in progress under its epic or named in its frontmatter;
   - else the more recent of the beads plan whose issue was updated last and the planning plan (no beads tasks yet) whose file changed last, counting only planning plans with a file changed in the last 30 days;
   - else the newest beads plan by directory name, when no plan has any beads issue with a time on it.

A guessed plan says so: `Plan: <name> (guessed)` on the band, `wb <name> (guessed):` on the status line. The pane's **Plan** section says how the plan was chosen (`Pinned by /wb:implement at 14:05.`, `Guessed from beads activity: …`, `Guessed from the most recently changed plan file: design.md, changed …`, `Guessed from the newest plan directory name: …`), its directory, and its worktree.

To choose by hand: `/wb-status <plan dir>` pins that plan (`docs/plans/<dir>`, or a path through `.claude/worktrees/<name>/`); `/wb-status auto` clears the pin and goes back to guessing.

Everything about the chosen plan is read in that plan's own worktree: its tasks.md and design.md, and `git log` for its red commits run from that worktree's top level (`git rev-parse --show-toplevel`). Beads is one database across worktrees.

## What it shows

### While planning: the band above the prompt (terminal and Desktop)

Until the plan's tasks.md names beads tasks, line 1 is the workflow chain and line 2 is the current stage:

```text
── wb plan ─────────────────────────────────────────────────────────────────────────
Plan: <plan> · Project ✓ → Research ✓ → Design ● draft → Tasks ○ → Implement ○ → Validate ○
Design: ⚠ design.md waiting for your approval · 4 criteria, 3 with examples · harness 2/3 decided · 3/4 metrics cite Intent · 0 open decisions
```

Line 1, the stages: `✓` done, `●` current (with its document's `status`), `○` not started.

- A stage is done when its document says so: research.md `status: complete`; design.md `ready`, `approved`, `implementing` or `complete`; tasks.md naming beads tasks; validate when every README Intent statement carries a `→ PASS`, `→ FAIL` or `→ DEFERRED` verdict. Project is done once the folder exists. A stage counts as done whenever a later one is, so a research.md left at `draft` behind a finished design reads done. A complete product-research.md stands for research.md.
- **Explore** shows only when the plan has a `thoughts/*.md` doc or a closed `Decide:` issue whose close reason or description names the plan's directory or one of its thoughts docs. It is done once that record exists.
- The current stage is the one the session's latest `/wb:*` command ran for this plan (a command run before a later pin by `/wb-status` does not count). With none, it is the first stage that is not done; explore is never current on its own.

Line 2, the current stage: what needs you first, then its signals.

- **⚠ or ✓**: a stage waiting on you (a written design.md still at `draft` while design is current: `design.md waiting for your approval`; a thoughts doc with no recorded decision while explore is current), then the open `Q:` and `Decide:` issues linked to the plan's epic or opened since the plan was created.
- **Project**: how many Intent success statements and non-goals the README has, or `no Intent section`.
- **Research**: `testing conventions yes|no` (a filled `## Testing Conventions` section), `Intent n/m covered` (the statements its `## Intent Coverage` lists as borne on, against the README's), and the open questions.
- **Explore**: how many thoughts docs, and whether a decision is recorded.
- **Design**: the acceptance criteria (`- **AC-n …**`) and how many have a concrete `Example` line; Harness Decisions rows decided out of rows listed (a row is undecided when its Decision cell is empty, a placeholder, or `TBD`); Success Metrics that cite an Intent statement (`(refines: …)`), deferred ones left out; the open decisions.
- **Tasks**: phases (`## Phase n`) and planned tasks (`[beads:…]` markers), criteria with an outer-test step (`- AC-n: …`) out of design's criteria, and whether the beads epic and tasks exist yet (tasks.md frontmatter).

A stage whose document is still create_project's skeleton says `<doc> not written yet`.

When the band is narrow, line 1 drops words before symbols: the current stage's status first, then the other stages' names (`P✓ R✓ Design ● draft T○ I○ V○`), then the current stage's name (`P✓ R✓ D● T○ I○ V○`), then `Plan:`, then the plan's name. Line 2 drops signals from the last, shortening a long question's title (never below a readable stub, keeping its id and `+N more`) before a signal goes, then the stage label, and shortens the item last. The marks are colored by state (`success`, the blue `permission` accent, `inactive`) and keep their symbols.

### Once the plan has beads tasks: the band above the prompt

The 0.3.0 view, unchanged, with the chain in its narrow form at the end of line 1 when everything else fits beside it:

```text
── wb plan ─────────────────────────────────────────────────────────────────────────
Plan: <plan> · Phase 2/3 ━━━━━━──── 3/5 tasks · now: Build the reset form (ex-t2) · P✓ R✓ D✓ T✓ I● V○
Tests: ✓ nothing needs you · red-first 1/2 · verifier 3✓
```

The chain is the first thing a narrower band drops. In more detail:

```text
── wb plan ─────────────────────────────────────────────────────────────────────────
Plan: <plan> · Phase 2/3 ━━━━━━──── 3/5 tasks · 1 follow-up open · now: Build the reset form (ex-t2)
Tests: ✓ nothing needs you · red-first 1/2 · verifier 3✓
```

While a phase waits for you at its checkpoint:

```text
── wb plan ─────────────────────────────────────────────────────────────────────────
Plan: <plan> · Phase 2/3 at checkpoint ━━━━━━━━━━ 5/5 tasks · 2 follow-ups open
Tests: ⚠ Phase 2 checkpoint waiting for you · red-first 2/2 · verifier 4✓ 1✗
```

The rule: a dim `── wb plan ──` line across the band's width, so the band does not read as part of Claude's status text above it. In a band too narrow for the label it is a blank line, and when the band has fewer than three rows it is left out. One empty row sits above the rule (dropped first, when the band has fewer than five rows), and nothing is added below the `Tests:` line: when no other mod draws in the band, no empty node is drawn there, so the band ends at the prompt divider.

The bar is drawn with thin glyphs in foreground color only, so it reads as a gauge and not as a selected block: `━` filled (the `permission` accent) and `─` empty (`inactive`), ten cells.

Line 1, progress:

- **Plan**: the `project` field of the chosen plan's tasks.md, then `(guessed)` when it was not pinned, then `(worktree <name>)` when it lives in a linked worktree and the band has room (the worktree is the first thing a narrow band drops).
- **Phase N/M**: the lowest phase whose milestone (the frontmatter's `beads_phases`) is still open in beads, not the frontmatter's `current_phase`, which only `/wb:update_status` writes. `at checkpoint` when that phase's tasks are all closed: the phase is waiting for you to accept it. `done` when every milestone is closed. With no milestones, the lowest phase that still has an unclosed task.
- **Bar and closed/total**: that phase's planned tasks (the frontmatter's `beads_tasks` keys, `phaseN_...`) that beads shows closed. Follow-ups are not counted here.
- **follow-ups open**: unclosed issues that belong to the plan but are not planned tasks: every other issue under the plan's epic (a fix task, a test gap, a review finding), and anything filed `discovered-from` one of the plan's issues. `Q:` and `Decide:` issues are not follow-ups; they show on line 2.
- **now**: the issue in progress, planned task or follow-up, by title, with its beads id. `nothing in progress` while a phase is running with none claimed; left out at a checkpoint or when done.

Line 2, test integrity, with what needs you first:

- **⚠ or ✓**: what needs you, the first item and a `+N more` count: a phase checkpoint waiting (above); a plan issue with a `halted:` comment and no later `verification report:`, `test integrity:`, `resolved:` or `resumed:` comment, and not closed; an issue that was closed and reopened; an open `Q:` or `Decide:` issue linked to the plan or opened since it was created. The pane lists every item. Once every phase is done, those open questions are no longer asked of you: line 2 shows them dim as `open follow-up: <title> (id)` (with `+N more`), without the `⚠`, and the pane lists them under Follow-ups.
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
| `open follow-up: …` (a finished plan's open questions) | dim |
| `⚠ …` (checkpoint, halt, reopened, question, decision) | `warning` |
| `n✗` (verifier failures) | `error` |

Another mod that draws in the band keeps its line: this one places it below its own.

### The status line (VS Code fallback)

The VS Code extension draws no band, so while a VS Code (or mobile) surface is attached the mod pins one line under the prompt:

```text
wb <plan>: phase 2/3 3/5 · red-first 1/2 · verifier 3✓ · ✓
```

While planning:

```text
wb <plan>: design (draft) · P✓ R✓ D● T○ I○ V○ · ⚠ 1
```

### The `/wb-status` pane

`/wb-status` takes a fresh reading and opens a pane. While planning it has three sections (Plan, Planning, Needs your decision); once the plan has beads tasks, six:

- **Plan**: the plan's name and worktree, its directory, how it was chosen (pinned by which command and when, or guessed from what), and how to pin or unpin.
- **Planning**: one row per stage, with its state, its document's status and path, and its signals; then the next command to run, from help's chain (`Next: /wb:create_design docs/plans/<dir>`, or `Next: approve design.md, then /wb:create_tasks …`).
- **Needs your decision**: each blocking item, with why it is blocking.
- **What phase N delivered**: the phase's tasks grouped by the criterion each one names (`AC-n` in its title or description), then the tasks that name none. `✓` closed, `…` in progress, `○` open.
- **Test integrity**: per criterion, its red commit (or none), its latest verifier verdict and the task or follow-up it came from, and the integrity findings count from the `test integrity:` comment.
- **Follow-ups**: the open follow-ups, with the issue each was discovered from; on a finished plan, also its open `Q:` and `Decide:` issues.

Close it with ctrl+x x, or the close mark on its frame.

## When it refreshes

- Shortly after the session starts, or after the band first draws when the mod was loaded into a running session.
- After a Bash call (the main session's or a subagent's) that runs `bd close`, `bd update`, `bd reopen`, `bd create`, `bd comments add`, `git commit`, `git revert` or `git cherry-pick`, once the burst settles; after any Bash call while a `/wb:create_project` waits for its folder.
- After a Write or Edit into a `docs/plans/<dir>/`.
- Every 60 seconds.
- When you run `/wb-status`.
- Shortly after a `/wb:*` command pins a plan.

When nothing is pinned, choosing the plan adds a `git worktree list`, a listing and the tasks.md frontmatter of each worktree's plans, and, when any of them has beads tasks, two `bd list` calls (every unclosed issue, and the candidate plans' named issues). A pinned plan skips those. Every reading lists the plan's folder and reads its README.md, research.md, product-research.md, design.md and tasks.md, each only when the listing shows its size or modification time changed. A planning plan then adds two `bd list` calls (every unclosed issue, and closed `Decide:` issues). A plan with beads tasks runs three `bd list` calls (the frontmatter's ids, the epic's children, every unclosed issue), one `git log`, and `bd comments` for the issues that have comments: every one in this phase's verifier window, and up to 10 others per reading, so the pane's per-criterion verdicts fill in over a few readings. A comment read is reused until the issue's comment count or update time changes, so a settled plan costs only the three lists and the log. Drawing reads only that cache. `bd` runs with `--readonly`.

## The reading log (opt-in)

To judge how accurate the band is, you can have the mod log what it showed and compare that, by hand, with the session transcript. The log is off by default.

**Turn it on.** The mod declares a `log` option (a boolean, default `false`). Set it any one of these ways; a change reloads the mod, with no restart:

1. In a session, run `/config`, find the `wb-status.log` row and set it to true.
2. Or add it to `~/.claude/settings.json` (the key is the plugin id, `wb-status@<marketplace>`; for a `--plugin-dir` session it is `wb-status@inline`):

   ```json
   { "pluginConfigs": { "wb-status@gvarela-workbench": { "options": { "log": true } } } }
   ```

3. Or `claude plugin configure wb-status@gvarela-workbench` lists the option and whether it is set.

With the log on, the pane shows a **Reading log** section with the file's path and how many lines it holds. Set `log` back to false to stop; the existing files stay.

**Where.** `~/.claude/wb-status/logs/<session id>.jsonl`, one file per session (under `$CLAUDE_CONFIG_DIR` instead of `~/.claude` when that is set). The mods API has no append, so the mod holds the session's log in memory and rewrites the file whole on each change; the cap below keeps that small.

**What a line is.** A line is written at the session's first reading and again whenever what the band shows changes (the plan, how it was chosen, the stage, counts, what is in progress, what needs you, or the band's text). Nothing is written while it is unchanged. Each line is one JSON object:

- `ts`, `sessionId`, `event` (`start`, `change`, or `cap`)
- `plan`: `name`, `dir`, `worktree`; `source`: `pinned` with the command and time, or `guessed` with how (`beads-in-progress`, `beads-recent`, `recent-file`, `newest-directory`)
- `stage`, `phase` (`n`, `of`, `state`), `counts` (tasks closed/total, follow-ups open, red-first k/n, verifier pass/fail), `now` (id, title), `needsYou` (kind, id, text), `followUps` (the open questions a finished plan handed off; present only then), and, while planning, `signals`
- `inputs`: the beads ids and statuses the reading used, the red commits it matched per criterion, the verifier verdicts, and the document statuses
- `band`: the two lines as plain text at the width last drawn

Titles are cut to 80 characters; descriptions and comment bodies are never logged. A sample line:

```json
{"ts":"2026-10-22T14:05:00.000Z","sessionId":"sess-1","event":"start","plan":{"name":"demo-plan","dir":"docs/plans/2026-01-01-demo","worktree":null},"source":{"kind":"pinned","by":"/wb:implement","at":"2026-10-22T14:05:00.000Z"},"stage":"implement","phase":{"n":1,"of":1,"state":"running"},"counts":{"tasks":{"closed":1,"total":2},"followUpsOpen":0,"redFirst":{"k":1,"n":1},"verifier":{"pass":0,"fail":0}},"now":{"id":"ex-t2","title":"Build the reset form"},"needsYou":[{"kind":"decision","id":"ex-q1","text":"decision pending: Decide: token lifetime"}],"inputs":{"bd":{"ex-epic":"open","ex-m1":"open","ex-t1":"closed","ex-t2":"in_progress","ex-q1":"open"},"redCommits":{"AC-1":"abc1234"},"verdicts":{},"docs":{"research":"complete","design":"approved","tasks":"in-progress","thoughts":0}},"band":{"columns":100,"progress":"Plan: demo-plan · Phase 1/1 ━━━━━───── 1/2 tasks · now: Build the reset form (ex-t2)","tests":"Tests: ⚠ decision pending: token lifetime (ex-q1) · red-first 1/1 · verifier none yet"}}
```

**Cap and cleanup.** A session's file stops growing at about 1 MiB: the mod writes one final `cap` line saying so and logs no more. On start it deletes `*.jsonl` files in that folder not modified for 14 days (with `rm -f` on those exact paths, because the mods API has no delete).

**Failures.** A log failure never affects the band: errors are caught, and the first one is noted once in the debug log.

**Privacy.** The log is local and is never sent anywhere by the mod. It holds plan names and directories, task and question titles, issue ids, and commit hashes, so treat it like your transcript. It lives under `~/.claude`, outside every repository. To delete it: `rm -r ~/.claude/wb-status/logs` (or one session's file).

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

- With no pin, the plan is a guess. A session that works on a plan without a `/wb:*` command naming its directory (work started by hand, or a command given no path) is guessed; `/wb-status <plan dir>` fixes it.
- A `/wb:*` command given no path still sets the current stage, for whichever plan is pinned.
- Pinning after `/wb:create_project` assumes the next new plan folder (or plan README written) is its own. A write to another plan's README.md while it waits takes the pin, and the wait lasts until a folder is found or another `/wb:*` command names a plan.
- A planning plan unchanged for 30 days is not guessed; pin it to see it.
- Stage states come from frontmatter `status` and simple markdown patterns (`- **AC-n`, `- Example:`, `(refines:`, `## Phase n`, `[beads:…]`, `- AC-n:`, Harness Decisions table rows). A document written in another shape reads as fewer criteria, rows or phases than it has; one still at create_project's skeleton reads as not written.
- create_design leaves design.md at `draft`; it reads as done only once `/wb:update_status` marks it `ready` or tasks.md names beads tasks. Until then a written design at `draft` shows as waiting for your approval, even after you approved it in the conversation.
- The explore record is matched by the plan's directory name or a thoughts doc name in a closed `Decide:` issue's close reason or description. In the implement view it is not looked up in beads at all: a later stage being done settles it.
- Open `Q:` and `Decide:` issues opened since the plan was created count for it, so a question filed for another plan in that window shows on this one too.
- A Bash `cd` into a worktree does not move the pin; only a `/wb:*` command or `/wb-status <plan dir>` does.
- A task serves a criterion when its title or description mentions `AC-n`, so a task that mentions a criterion in passing is listed under it.
- `red(AC-n)` commits are matched by id since the plan's creation date; another plan's commit with the same id in that window would count.
- The band's verifier count covers this phase only; the pane's per-criterion verdicts for earlier phases fill in over the first few readings after a load.
- A checkpoint is inferred from beads (an open milestone whose planned tasks are all closed), not read from the session, so a phase whose milestone was left open after you accepted it shows as waiting until the milestone is closed.
- A reopened task is recognized by a `closed_at` or `close_reason` that beads kept on an unclosed task.
- The first reading after a load can take several seconds in a large plan (one `bd comments` call per commented task); the band shows nothing until it lands.
