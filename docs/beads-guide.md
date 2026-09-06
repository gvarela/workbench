# Beads guide (maintainers)

This document is the maintainer-facing record of what the workbench plugin assumes about beads (`bd`) — the contract every shipped skill, hook, and doc invocation relies on — and the protocol for re-verifying that record against a new `bd` release. The runtime statement of the model that ships to installers lives in `plugin/docs/reference/beads-mode.md`; this guide summarizes and extends it but never replaces it.

## The model wb relies on

The local embedded Dolt database under `.beads/` is always the source of truth; every `bd` mutation is auto-committed to it, and nothing the plugin does treats a JSONL file, a Dolt remote, or a backup as authoritative over the live database.

Persistence is three tiers, not modes:

1. **Local** — the embedded database itself, always present once `bd init` has run.
2. **Cross-machine continuity** — a Dolt remote (`bd dolt push` / `bd dolt pull` against `sync.remote`) or `bd backup` (`bd backup init <url>`, `bd backup sync`, `bd backup restore`), whichever `bd config get sync.remote` / `bd config get backup.enabled` reports configured.
3. **JSONL export** — `bd export` (or `export.auto`) writes `.beads/issues.jsonl` for viewers and interchange only; it is not a backup and not sync.

Stealth mode (`bd init --stealth`) writes the shared `.git/info/exclude` so `.beads/` never appears in a collaborator's tree on any branch or worktree; `bd init --setup-exclude` adds the same exclude entry to a repository where beads already exists. `.beads/` is never committed.

Every worktree shares one embedded database, resolved from git's common directory — `bd context` reports the resolved database name and `worktree: yes`. `.git/info/exclude` is shared across worktrees too, which is why stealth detection is stable across them. A worktree has no `.beads/` of its own, and a worktree-isolated session cannot write under the shared `.beads/`; a repair there (for example restoring a missing `.beads/metadata.json`) has to be handed to a human.

Before any stage reads a plan's beads IDs, wb runs a session-start sanity check: `bd context` (resolved database name), `bd show <beads_epic>` (does the recorded epic exist), and `bd stats` (total issue count), plus a `bd version` floor check. The check exists because a missing `.beads/metadata.json` makes bd 1.1.0 silently open an empty default database named `beads` — every command then reports zero issues, and `bd info` does not catch it; only comparing what `bd context` resolves against what the plan expects does.

The full runtime statement — setup, persistence, worktrees, the sanity check, and hygiene commands exactly as wb invokes them — lives in `plugin/docs/reference/beads-mode.md`; read it for the canonical wording. This section summarizes it; it is not a substitute.

## Contract inventory

The table below is the audited inventory of every distinct `bd <subcommand>` invocation shape shipped under `plugin/` (docs/plans/ excluded) — from `bd create` and `bd update` through `bd close`, `bd dep add`, `bd list`, `bd ready`, `bd blocked`, `bd comments add`, and `bd remember`/`bd forget` — one row per distinct combination of subcommand and flags, each confirmed against `bd <cmd> --help` (or a live run where noted) on bd 1.1.0. Files are listed relative to `plugin/`.

| Command and flags | Files (under plugin/) | Verified on | Notes |
| --- | --- | --- | --- |
| `create "<title>" --type=<type> --priority=<n> -d "<desc>"` | create_product_research/templates.md:122; create_research/templates.md:117; create_design/templates.md:99,122; explore_design/templates.md:69; create_tasks/SKILL.md:180; create_tasks/examples.md:9,16,30,37,44,51; mockup-iteration/SKILL.md:74,78; create_mockup/templates.md:125,134 | 1.1.0 | `create` aliases to `new`; positional `[title]` plus `--type`, `--priority` (`-p` short form exists but plugin always spells it out), `-d`/`--description` all appear in `bd create --help`. |
| `create --title="..." --description="..." --type=task --priority=1` | implement_coordinated/reference.md:118 | 1.1.0 | Named-flag variant of the same command; `--title` is documented as "alternative to positional argument". |
| `update [id] --claim` | agents/task-worker.md:17; skills/implement_coordinated/sub-agent-prompts.md:40; skills/resume_handoff/SKILL.md:150,168; skills/implement_tasks/SKILL.md:194,207,480,535,573; skills/update_status/reference.md:21; skills/create_tasks/templates.md:307; skills/create_tasks/SKILL.md:320; skills/help/SKILL.md:150 | 1.1.0 | `--claim` exists verbatim: "Atomically claim the issue (sets assignee to you, status to in_progress; idempotent if already claimed by you)". |
| `update [id] --notes="..."` | skills/explore_design/templates.md:103; skills/create_tasks/examples.md:90; skills/create_design/SKILL.md:102 (cited as a caution, not run) | 1.1.0 | `--notes` exists and replaces wholesale (no append) exactly as the plugin warns; `--append-notes` exists as the non-destructive alternative but the plugin never invokes it. |
| `close [id] --reason "..."` | agents/task-worker.md:21; skills/implement_coordinated/sub-agent-prompts.md:65; skills/implement_coordinated/SKILL.md:356; skills/implement_tasks/SKILL.md:197,275,377,537; skills/status-sync/SKILL.md:36,52; skills/update_status/SKILL.md:225; skills/help/SKILL.md:152,191; skills/explore_design/templates.md:84 | 1.1.0 | `-r/--reason` confirmed; `close` aliases to `done`. |
| `close [id]` (no flags) | skills/implement_tasks/SKILL.md:87,209,482,541 | 1.1.0 | Same subcommand, bare form. |
| `list -n 0 --status=open` | skills/mockup-iteration/SKILL.md:192; skills/explore_design/SKILL.md:134; skills/create_design/SKILL.md:60; skills/help/SKILL.md:129; docs/reference/beads-not-initialized.md:46; skills/create_mockup/templates.md:141 | 1.1.0 | `-n/--limit` and `-s/--status` (accepts `open`) both confirmed in `bd list --help`. |
| `list --status=open` (no `-n`) | skills/create_product_research/templates.md:126; skills/create_research/templates.md:124 | 1.1.0 | Same flag, default limit (50) applies. |
| `list -n 0 --status=closed` | skills/explore_design/templates.md:113,240 (as `explore_design/SKILL.md:240`); skills/create_design/SKILL.md:95; skills/help/SKILL.md:135; skills/update_status/SKILL.md:335 | 1.1.0 | Confirmed. |
| `list --status=closed` (no `-n`) | skills/implement_coordinated/SKILL.md:372,410; skills/implement_tasks/SKILL.md:393,462; skills/create_tasks/templates.md:47,171; skills/create_handoff/SKILL.md:78; skills/update_status/SKILL.md:58,126,152 | 1.1.0 | Confirmed. |
| `list --status=in_progress` | skills/implement_coordinated/SKILL.md:302,409; skills/implement_tasks/SKILL.md:349,459; skills/status-sync/SKILL.md:23; skills/create_handoff/SKILL.md:77; skills/resume_handoff/SKILL.md:103; skills/update_status/SKILL.md:57,126,140,157; skills/create_tasks/templates.md:48 | 1.1.0 | Confirmed (also used bare as a diagnostic in skills/implement_tasks/SKILL.md:532). |
| `list --all -n 0` | skills/validate_project/SKILL.md:173 | 1.1.0 | `--all` ("Show all issues including closed") confirmed. |
| `list` (bare) | skills/doc-adherence/SKILL.md:47; skills/explore_design/SKILL.md:289; skills/validate_project/SKILL.md:230,140; skills/update_status/SKILL.md:56,128,305; skills/create_tasks/templates.md:104; skills/help/SKILL.md:275 | 1.1.0 | Bare subcommand, default 50-row limit and default filter (open-ish). |
| `dep add [id] [id]` | skills/implement_coordinated/reference.md:123; skills/create_tasks/SKILL.md:217-220,223-225; skills/create_tasks/examples.md:23,64,67,72,89,95,96 | 1.1.0 | `dep` is a command group; `add` is a listed subcommand ("Add a dependency"). |
| `show [id]` | docs/reference/beads-not-initialized.md:9,32; docs/reference/beads-mode.md:41,44; hooks/wb-prime.sh:13,29; skills/implement_coordinated/SKILL.md:143,148,196,220,287,301; skills/validate_execution/SKILL.md:76,81; skills/resume_handoff/SKILL.md:91,96,147,162; skills/create_research/templates.md:128; skills/create_mockup/templates.md:145; skills/create_design/SKILL.md:99; skills/update_status/SKILL.md:71,76,127,154,305; skills/create_tasks/SKILL.md:170,175; skills/create_tasks/templates.md:57,169,172,174-176; skills/validate_project/SKILL.md:63,158,176-178,181,209,230,249; skills/validate_project/reference.md:87; skills/help/SKILL.md:28 | 1.1.0 | `show` aliases to `view`; bare positional `[id]` confirmed. |
| `ready` | skills/implement_coordinated/SKILL.md:180,187,195,266,357,373,408,425; skills/implement_tasks/SKILL.md:176,200,205,210,281,378,394,456,478,532,538; skills/resume_handoff/SKILL.md:104,153,165; skills/create_handoff/SKILL.md:80; skills/create_tasks/SKILL.md:229,304,318; skills/create_tasks/templates.md:49,305,313; skills/status-sync/SKILL.md:22; skills/implement_tasks/templates.md:78; skills/implement_coordinated/templates.md:39 | 1.1.0 | Bare `bd ready`, confirmed. |
| `stats` (bare) | docs/reference/beads-mode.md:42; hooks/wb-prime.sh:29; skills/implement_coordinated/SKILL.md:144,371,407; skills/validate_execution/SKILL.md:77; skills/resume_handoff/SKILL.md:92,102,108; skills/create_handoff/SKILL.md:76; skills/create_handoff/templates.md:74; skills/implement_tasks/SKILL.md:159,392,453; skills/status-sync/SKILL.md:21,40; skills/update_status/SKILL.md:55,72,126; skills/create_tasks/SKILL.md:171; skills/create_tasks/templates.md:46; skills/doc-adherence/SKILL.md:47; skills/validate_project/SKILL.md:170,230 | 1.1.0 | `stats` is a documented alias of `status` ("Aliases: status, stats") — identical `--help` text confirmed live. |
| `status` (bare) | docs/reference/beads-not-initialized.md:44 | 1.1.0 | Same command as `stats` above under its primary name. |
| `info` (bare) | docs/reference/beads-not-initialized.md:2,44; skills/implement_coordinated/SKILL.md:128; skills/implement_tasks/SKILL.md:143; skills/explore_design/SKILL.md:247,289; skills/validate_project/SKILL.md:59,154; skills/validate_project/reference.md:73 | 1.1.0 | Confirmed. |
| `context` (bare) | docs/reference/beads-not-initialized.md:4,32; docs/reference/beads-mode.md:31,40; skills/implement_coordinated/SKILL.md:142; skills/validate_execution/SKILL.md:75; skills/resume_handoff/SKILL.md:90; skills/implement_tasks/SKILL.md:157; skills/validate_project/SKILL.md:157; skills/update_status/SKILL.md:70; skills/create_tasks/SKILL.md:169; skills/help/SKILL.md:28 | 1.1.0 | Confirmed; also works without an open database (reads config files directly). |
| `config get sync.remote` | docs/reference/beads-mode.md:21,25; hooks/beads-drift-check.sh:11; skills/implement_coordinated/SKILL.md:392; skills/create_handoff/SKILL.md:127; skills/implement_tasks/SKILL.md:418; skills/status-sync/SKILL.md:48; skills/update_status/SKILL.md:254; skills/help/SKILL.md:205 | 1.1.0 (live-tested) | `config get`/`config set` subcommands confirmed; `sync.remote` is not listed among the documented namespaces in `bd config --help` but a live `bd config get sync.remote` on this checkout returned `sync.remote (not set in config.yaml)` with exit 0, matching the doc's described semantics exactly. |
| `config get backup.enabled` | docs/reference/beads-mode.md:21,26; skills/implement_coordinated/SKILL.md:393; skills/create_handoff/SKILL.md:128; skills/implement_tasks/SKILL.md:419; skills/update_status/SKILL.md:255 | 1.1.0 (live-tested) | Same as above; live-tested and returned `false` with exit 0. |
| `config set export.auto true` | docs/reference/beads-mode.md:15 | 1.1.0 | `export.auto` is a documented key under "Auto-Export" in `bd config --help`, and appears verbatim in its Examples section. |
| `config set dolt.local-only true` | docs/reference/beads-mode.md:14 | 1.1.0 | `dolt.local-only` appears verbatim in `bd config --help`'s Examples ("Skip wiring a Dolt sync remote during bd init"). |
| `dolt push` | docs/reference/beads-mode.md:14,25; hooks/beads-drift-check.sh:15; skills/implement_coordinated/SKILL.md:392; skills/create_handoff/SKILL.md:127; skills/implement_tasks/SKILL.md:418; skills/status-sync/SKILL.md:48; skills/update_status/SKILL.md:254; skills/help/SKILL.md:203,206 | 1.1.0 | `dolt` is a command group; `push` ("Push commits to Dolt remote") confirmed. |
| `dolt pull` | docs/reference/beads-mode.md:14; skills/help/SKILL.md:203 | 1.1.0 | `pull` ("Pull commits from Dolt remote") confirmed. |
| `backup init <url>` | docs/reference/beads-mode.md:14; skills/help/SKILL.md:203 | 1.1.0 | `backup init` ("Set up a Dolt backup destination") confirmed. |
| `backup sync` | docs/reference/beads-mode.md:14,26; skills/implement_coordinated/SKILL.md:393; skills/create_handoff/SKILL.md:128; skills/implement_tasks/SKILL.md:419; skills/update_status/SKILL.md:255; skills/help/SKILL.md:203 | 1.1.0 | `backup sync` ("Push database to configured Dolt backup") confirmed. |
| `backup restore` | docs/reference/beads-mode.md:14 | 1.1.0 | `backup restore` ("Restore database from a Dolt backup") confirmed. |
| `export` (bare) | docs/reference/beads-mode.md:15,59; skills/implement_coordinated/SKILL.md:386,392; skills/create_handoff/SKILL.md:111,144; skills/implement_tasks/SKILL.md:412,418; skills/help/SKILL.md:204 | 1.1.0 | Confirmed; excludes memories and infrastructure beads by default, matching the plugin's description. |
| `remember --key <key> "<text>"` | docs/reference/beads-mode.md:59; skills/implement_coordinated/SKILL.md:383,386; skills/implement_tasks/SKILL.md:409,412 | 1.1.0 | `--key` confirmed ("As a convenience... Use --key to store slug-like content"). |
| `remember` (bare, no `--key`) | skills/create_handoff/SKILL.md:111 | 1.1.0 | Same subcommand, bare positional-text form ("keep the ones that still qualify" — the entries were originally stored with `bd remember`, no flag shown at this citation). |
| `memories <keyword>` | docs/reference/beads-mode.md:59; skills/implement_coordinated/SKILL.md:386; skills/implement_tasks/SKILL.md:412; skills/create_handoff/SKILL.md:111 | 1.1.0 | Confirmed ("bd memories dolt # search for memories about dolt"); create_handoff:111 uses `bd memories <project>`. |
| `forget <key>` | skills/create_handoff/SKILL.md:111 | 1.1.0 | Confirmed ("Remove a memory by its key"). |
| `blocked` (bare) | skills/create_handoff/SKILL.md:79; skills/update_status/SKILL.md:141; skills/create_tasks/templates.md:224,309 | 1.1.0 | Confirmed. |
| `comments add [issue-id] "[amendment]"` | skills/explore_design/templates.md:108; skills/create_design/SKILL.md:102 | 1.1.0 | `comments` is a command group; `add` ("Add a comment") confirmed. Both citations recommend it as the non-destructive alternative to `update --notes`; neither shows a completed run. |
| `init` (bare) | docs/reference/beads-not-initialized.md:18; skills/explore_design/SKILL.md:289; skills/validate_project/reference.md:75; skills/create_tasks/SKILL.md:158; skills/help/SKILL.md:143,269 | 1.1.0 | Confirmed. |
| `init --stealth` | docs/reference/beads-not-initialized.md:17; docs/reference/beads-mode.md:7; skills/validate_project/SKILL.md:163 | 1.1.0 | `--stealth` ("Enable stealth mode: global gitattributes and gitignore, no local repo tracking") confirmed. |
| `init --setup-exclude` | docs/reference/beads-mode.md:7; skills/validate_project/SKILL.md:163 | 1.1.0 | `--setup-exclude` ("Configure .git/info/exclude to keep beads files local (for forks)") confirmed. |
| `init --role contributor` | docs/reference/beads-mode.md:7 | 1.1.0 | `--role` (`"maintainer" or "contributor"`) confirmed. |
| `init --contributor` | docs/reference/beads-mode.md:7 | 1.1.0 | `--contributor` ("Run OSS contributor setup wizard") confirmed. |
| `init --server` | docs/reference/beads-mode.md:52 | 1.1.0 | `--server` ("Use external dolt sql-server instead of embedded engine") confirmed; cited only as the precondition for `bd doctor` to work. |
| `doctor` (bare) | docs/reference/beads-not-initialized.md:44; docs/reference/beads-mode.md:52 | 1.1.0 | Command exists, but in 1.1.0's default embedded mode it runs only against a Dolt server (`bd init --server`) — the plugin's own text already says it "prints a not-supported note and does nothing" in embedded mode, which is what both citations rely on. `--check=conventions` is a real flag (confirmed in `bd doctor --help`) but is never invoked by any shipped file — not given its own row. |
| `lint` (bare) | docs/reference/beads-mode.md:55 | 1.1.0 | Confirmed: lints open issues for type-specific missing sections (acceptance criteria, steps to reproduce). |
| `stale` (bare) | docs/reference/beads-mode.md:53 | 1.1.0 | Confirmed; `-d/--days` (default 30) exists as documented, but the plugin never invokes it with `--days` set — mentioned only descriptively. |
| `orphans` (bare) | skills/validate_project/SKILL.md:66,167 | 1.1.0 | Confirmed: reports open/in-progress issues that commit messages already reference (landed but never formally closed) — not a "found in git but missing from beads" check. |
| `version` (bare) | skills/implement_coordinated/SKILL.md:145; skills/validate_execution/SKILL.md:78; skills/resume_handoff/SKILL.md:93; skills/validate_project/SKILL.md:159; skills/update_status/SKILL.md:73; skills/create_tasks/SKILL.md:172; docs/reference/beads-not-initialized.md:5; docs/reference/beads-mode.md:46 | 1.1.0 | Confirmed; used to enforce the "bd 1.1.0 or later" floor. |

### Config keys and files

Keys and files the inventory above depends on but that are not invocation shapes themselves.

| Key / file | What it controls | Where the plugin depends on it | Verified on |
| --- | --- | --- | --- |
| `export.auto` | Whether `bd export` runs automatically after mutations (default off) | Persistence-tiers description in `beads-mode.md` | 1.1.0 |
| `export.interval` | Throttle in seconds (default 60) between automatic exports | Same | 1.1.0 |
| `export.git-add` | Whether an auto-export also stages `.beads/issues.jsonl` (default false) | Same; wb's stealth model relies on this staying false | 1.1.0 |
| `import.auto` | Whether bd re-imports a JSONL file it finds on disk (default true) | Explains why a stale export can silently diverge from the database | 1.1.0 |
| `sync.remote` | The configured Dolt remote for `bd dolt push`/`pull` | Session-close check (`bd config get sync.remote`) in `beads-mode.md`, `implement_coordinated`, `create_handoff`, `implement_tasks`, `status-sync`, `update_status`, `help` | 1.1.0 (live-tested) |
| `backup.enabled` | Whether `bd backup sync` should run at session close | Same session-close check (`bd config get backup.enabled`) | 1.1.0 (live-tested) |
| `dolt.local-only` | Skips wiring a Dolt sync remote at `bd init` | `beads-mode.md` setup section | 1.1.0 |
| `.beads/metadata.json` | Names the active database (e.g. `dolt_database: prompts`); if missing, bd 1.1.0 silently opens an empty default database named `beads` | Every skill that reads beads IDs depends on this resolving to the plan's real database; the session-start sanity check (`bd context`) is the only thing that catches its absence | 1.1.0 |

### Prose tokens excluded

Tokens the recipe grep matched that are not command invocations — ordinary English words following "bd" in a sentence, not a subcommand the plugin runs.

| Token | File:line | Why excluded |
| --- | --- | --- |
| `call` | plugin/hooks/beads-drift-check.sh:4 | "This hook makes one bd **call** at SessionEnd" — describes the hook's cost budget, not a subcommand named `call`. |
| `command` | plugin/docs/reference/beads-not-initialized.md:42 | Section heading "A bd **command** fails" — generic reference to any bd invocation, not a subcommand. |
| `open` | plugin/docs/reference/beads-mode.md:48 | "a missing `.beads/metadata.json` makes bd **open** an empty default database" — verb, not the (nonexistent) subcommand `bd open`. |
| `resolved` | plugin/docs/reference/beads-not-initialized.md:32 | "The database bd **resolved** (`<name>`...)" — past-tense verb describing database resolution, not a subcommand. |
| `state` | plugin/hooks/wb-prime.sh:72 | "Check bd **state** (bd ready / bd list)" — `state` here is a general noun glossed by the two real commands in parentheses; bd 1.1.0 does have a `bd state` command, but this line does not invoke it. |
| `prime` | plugin/hooks/wb-prime.sh:3 | "modeled on the beads plugin's `bd **prime**`" — cites bd's own `prime` command as design inspiration for this hook; the hook itself never shells out to `bd prime`. |
| `invocations` | plugin/hooks/wb-prime.sh:4 | "no bd **invocations**" — states a constraint (the hook must not call bd), not a subcommand name. |
| `preflight` | plugin/docs/reference/beads-mode.md:52 | "`bd **preflight**` is beads' own contributor checklist for its Go repository, not a check on your workspace" — named specifically to say it is *not* used by this plugin; not a subcommand the plugin invokes. |

**Inventory rule** (recorded in CLAUDE.md): any change that adds, removes, or alters a `bd` command in a shipped file updates this inventory in the same change.

## Supported version and upgrade protocol

The floor is bd 1.1.0. The project's README and the beads runtime playbook (`plugin/docs/reference/beads-mode.md`) both state it, and the session-start sanity check enforces it live by comparing `bd version` against that floor before any stage reads a plan's beads IDs.

When `bd version` changes, run the following protocol before shipping against the new version:

1. Run `bd doctor` where it is supported — a Dolt server started with `bd init --server` — and run `bd lint`, `bd stale`, and `bd orphans` in the default embedded mode, since `bd doctor` is a no-op there.
2. Diff `bd <cmd> --help` for every command in the inventory above against the flags recorded in its row; note any added, removed, or renamed flag.
3. Run the headless smoke set for every skill that invokes beads: `create_tasks`, `implement_coordinated`, `implement_tasks`, `update_status`, `resume_handoff`, `validate_execution`, `validate_project`, and `help`.
4. Update the "Verified on" column throughout the contract inventory to the new version.
5. Record the requirement change in the README and in CHANGELOG.
6. Treat the requirement change as major: RELEASING.md's semver rule counts a new environment requirement (a bumped `bd` floor) as a major-version change for the plugin.

## Interpretation notes

Facts a maintainer needs to read `bd` output and this repository's own tooling correctly, gathered from direct verification against bd 1.1.0.

- **No git ops.** `bd prime` in this repository prints `Git authority: no git operations in this context` and `Git workflow: stealth mode (no git ops)`. Beads performs no git operations of its own in stealth mode — no commit of the JSONL export, no hooks — which is why the plugin's `bd close` protocol never commits `.beads/`.
- **Embedded versus server.** bd 1.1.0 defaults to an embedded Dolt engine. `bd doctor` and `bd doctor --check=conventions` print "not yet supported in embedded mode" and exit there; they only run against an external Dolt server started with `bd init --server`. `bd lint`, `bd stale`, and `bd orphans` all work in embedded mode.
- **`.beads/metadata.json` and the empty-default-database failure.** This file names the active database (`dolt_database: <name>`). If it goes missing, bd 1.1.0 silently opens an empty default database named `beads`, and every command — including `bd info` — reports zero issues without error. Only `bd context`, compared against what a plan's frontmatter expects, catches this; it happened in this repository on 2026-09-05 and is why the session-start sanity check exists.
- **Throttled export and what the JSONL is for.** `.beads/issues.jsonl` is written only when `export.auto` is on (default off, throttled by `export.interval` at 60 seconds) or when `bd export` is run directly; `export.git-add` defaults false so an auto-export never stages itself; `import.auto` defaults true, which means a stale export sitting on disk can be silently re-imported. `bd export` excludes memories and infrastructure beads by default. The JSONL is for viewers and interchange, never a backup and never cross-machine sync.
- **`bd orphans`, `bd preflight`, and `bd stats` semantics.** `bd orphans` reports open or in-progress issues that commit messages already reference — work that landed but was never formally closed; `--fix` closes them. `bd preflight` is beads' own contributor checklist for its Go repository, not a check on this workspace. `bd stats` is a documented alias of `bd status` — same output, different name; wb almost always spells it `bd stats`.
- **The beads plugin's docs lag its CLI.** The installed beads Claude Code plugin's own bundled docs pin version 0.60.0 while the CLI it ships is 1.1.0 (`~/.claude/plugins/cache/beads-marketplace/beads/1.1.0/`). Treat `bd <cmd> --help` as the authority over that plugin's own documentation.
- **`bd config get` output shapes.** `bd config get <key>` prints the bare value when the key is set, and `<key> (not set in config.yaml)` with exit 0 when it is unset — never a non-zero exit for an unset key. `sync.remote` and `backup.enabled` both work this way even though neither is listed in `bd config --help`'s namespace summary.
- **Worktrees.** One embedded database is shared by every worktree, resolved from git's common directory; `.git/info/exclude` is shared too. A worktree has no `.beads/` of its own, so a worktree-isolated session cannot repair the shared `.beads/` (for example a missing `metadata.json`) itself.

## Doc map

Which file is the source of truth for what:

- **`plugin/docs/reference/beads-mode.md`** and **`plugin/docs/reference/beads-not-initialized.md`** — what installers and skills read at runtime: setup, persistence, worktrees, the sanity check, hygiene commands, and the not-initialized recovery flow. These ship to installs; this guide does not.
- **This guide (`docs/beads-guide.md`)** — maintainer knowledge: the contract inventory, the upgrade protocol, and the interpretation notes a maintainer needs that a runtime doc has no reason to carry.
- **Beads memories (`bd memories <keyword>`, `bd remember --key <key>`)** — operational facts about this specific workspace (for example the 2026-09-05 metadata.json incident), searchable and updatable in place; excluded from `bd export` by default.
- **`docs/beads-integration-learnings.md`** — dated history of the integration, linked from here as historical record rather than current truth; some of what it describes (`bd sync`, status-then-claim as two steps) predates bd 1.1.0 and no longer reflects the current CLI.

## Version log

- **bd 1.0.2** — the migration era `docs/beads-integration-learnings.md` records, including the discovery of a five-week-stale JSONL export (92 of 156 issues) that motivated treating the export as interchange only, never a backup. See that document for the full dated history.
- **bd 1.1.0** — verified 2026-09-06 during the implement-rename-3.0 plan: the 47-row contract inventory above, the finding that `bd doctor` and `bd doctor --check=conventions` require a Dolt server (`bd init --server`) and are no-ops in the default embedded mode, and the finding that `bd orphans` checks commit messages against open/in-progress issues rather than the reverse. This is the current supported floor.
