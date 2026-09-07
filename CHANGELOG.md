# Changelog

All notable changes to the wb plugin. Versions are release cuts — installers receive a version only when it's bumped here AND they run `claude plugin update wb@gvarela-workbench`. See [RELEASING.md](RELEASING.md) for the process.

## [3.0.0] — 2026-09-06

The "tools as intended" release: beads used the way beads means it, a plan that states its intent, a workflow that explains its human inputs, `implement` as the default execution path, and the alias promised for removal at 3.0.0 gone. Plan: `docs/plans/2026-09-05-prompts-h7c-implement-rename-3.0/`.

### ⚠️ Breaking / Requirements

- **Requires bd 1.1.0 or later.** The session-start sanity check compares `bd version` against this floor.
- **`/wb:create_execution` removed** (deprecated since 2.2.0). Use `/wb:create_tasks`.
- **Renamed**: `/wb:implement_coordinated` → `/wb:implement`, `/wb:implement_tasks` → `/wb:implement_inline`. `implement` is the default execution path (coordinated workers, verified per task); `implement_inline` runs the same plan inline on the session model. The old names keep working as deprecated aliases through 3.x (removed at 4.0.0): each prints a one-line notice and runs the canonical skill unchanged. **Gotcha**: a session started before this release may hold a cached pre-rename skill body — restart the session (or `/reload-skills`) after updating; the alias directories keep pointer files so stale references degrade gracefully.
- **`BEADS_MODE` and `hooks/setup-beads-mode.sh` removed.** No skill, hook, or doc branches on a beads "mode" any more; the variable was never documented as user-facing, and any local settings that referenced it stop resolving.
- **The commit-`.beads/` guidance is gone from every skill, hook, and doc.** Beads' Dolt directory is never committed. If you committed `.beads/` in any repository: stop; exclude it (`bd init --setup-exclude` or `bd init --stealth`); set up `bd backup init <url>` or a Dolt remote if you need cross-machine continuity. The old `issues.jsonl` stays importable with `bd import`. Full model: `plugin/docs/reference/beads-mode.md`.
- **`hooks/compact-recovery.sh` replaced by `hooks/wb-prime.sh`.** Same recovery text on compact; the new script also runs on startup, resume, clear, fork, and PreCompact.

### Added

- `hooks/wb-prime.sh`, modeled on `bd prime`: on SessionStart `startup`, `resume`, `clear`, and `fork` it prints a session orientation (the stage chain and what each stage requires, the `docs/plans/<date>-<name>/` layout, beads holds status and markdown holds the plan, checkpoints stop for a human, the session-start sanity check, the active plans in the repository, a pointer to `/wb:help`); on `compact` and on PreCompact it prints the compaction recovery text. A repository replaces the orientation with `.claude/wb/PRIME.md`; `wb-prime.sh --export` prints the default. Under 100ms, no bd calls.
- Session-start sanity check (`bd context`, `bd show <beads_epic>`, `bd stats`, `bd version`) in every stage that reads a plan's beads IDs: resume_handoff, implement_tasks, implement_coordinated, update_status, validate_execution, and create_tasks on a re-run. A plan whose epic does not resolve stops with the new Wrong database case in `plugin/docs/reference/beads-not-initialized.md`.
- `bd doctor` in the session close protocol (server mode; embedded mode is a no-op in bd 1.1.0, so the protocol falls back to `bd stale` and `bd orphans`) (CLAUDE.md, the reference doc's Hygiene section); `bd orphans` reported by validate_project's beads check, alongside its existing frontmatter orphan check.
- Handoffs state what is portable: without a Dolt remote or backup, the handoff document is the only artifact that crosses machines and the plan's beads IDs will not resolve elsewhere (create_handoff). Memory facts in both implementation skills and create_handoff: `bd remember` memories are workspace-wide and excluded from `bd export` by default.
- The README gains an `## Intent` section written by `create_project` at creation: a Goal, two to four "Success looks like" statements (observable, not numeric), Non-goals, and an Amendments list. `create_project` takes the intent from the invoking prose when present and confirms it in one exchange, asks for it otherwise, and never writes files while any part is empty; the confirmation echoes it back.
- Per-stage obligations to the Intent: `create_research` derives its question from the Goal when none is given, decomposes against the success statements, and writes an `## Intent Coverage` section naming the statements its findings bear on and the ones they do not touch; `explore_design` frames the decision space against the Goal, cites it first in the `Decide:` record, and records a Goal or Non-goal change as a dated Amendments line; `create_design` refines each statement into a metric marked `(refines: "...")` with a Deferred list for the rest, traces the problem statement to the Goal, and treats a Goal or Non-goal change as a `Decide:` record plus an Amendments line before design.md is written (BARRIER 4); `create_tasks` copies the Intent-refining metrics as the Target State; `validate_execution` reports a verdict per Intent statement and writes it back beside each README statement as `→ PASS`, `→ FAIL`, or `→ DEFERRED` with the date. Plans created before 3.0.0 have no Intent section; every stage treats that as "no obligation" and says so.
- The human-input map: `/wb:help` renders "What each stage needs from you" (what you provide, decide, and confirm, and how you know the stage did enough); `hooks/wb-prime.sh`'s orientation carries a six-line summary; every workflow stage opens with one line, "This stage needs from you: ...".
- `/wb:help` is stateful: in a repository with an active plan, or when asked "where am I" or "what's next", it reports the plan's position (documents and their status, epic and milestone state, open `Q:` and `Decide:` issues), the next stage and what it needs from you, and what the previous stage left undone, read from the Intent evidence; without an active plan, or for a plan without an Intent section, it says which case it is in.
- `docs/beads-guide.md` (maintainers): the model wb relies on, a contract inventory of every bd invocation under `plugin/` verified on bd 1.1.0 (with embedded-mode caveats and command semantics), the config keys and the `.beads/metadata.json` dependency, the supported version and the upgrade protocol, interpretation notes, a doc map, and a version log. CLAUDE.md rule: a change to a bd command in a shipped file updates the inventory.
- Development rule that keeps help current: a change to a workflow stage's existence, name, scope, or intake updates help's Command Workflow, its "What each stage needs from you" table, and its Command Details, wb-prime's orientation, and the stage's intake line, in the same commit (CLAUDE.md); RELEASING.md's pre-bump verification greps for drift; the skills guide calls it a four-copy change. Nothing in shipped help or wb-prime changed for this.
- Commit discipline for execution: `implement_coordinated` commits each task after its verifier passes (one task, one commit; plan-doc edits are separate commits between tasks); workers never commit (worker prompt and `agents/task-worker.md`); `agents/task-verifier.md` checks scope against the working tree rather than the previous commit; `implement_tasks` commits once per task after verification. Structural and behavioral changes stay apart at the task level through create_tasks' Tidy First edge rule.

### Changed

- `RELEASING.md` Process: non-breaking phases merge unbumped under Unreleased; a cut happens when a plan completes; the breaking phase goes last and carries the bump; every cut is tagged; majors get a three-session canary on the release branch.
- Beads persistence: `plugin/docs/reference/beads-mode.md` is the single statement. `issues.jsonl` is written only with `export.auto` on or an explicit `bd export`; the auto-flush claim is removed from ten skill and doc sites (prompts-vwo).
- `implement_coordinated/reference.md` "Worker Model Selection" points at the SKILL.md Step 5 tier list instead of restating it with opus as the default when unsure.
- `plugin/docs/reference/beads-mode.md` rewritten around beads' model: the setup rule (`bd init --stealth` for any repository with collaborators who do not use beads; plain `bd init` only for a repository you own, still with `.beads/` excluded), three persistence tiers (local database; Dolt remote or `bd backup`; JSONL for interchange), the one-question close step, worktree facts, the sanity check, hygiene commands, memory facts. `beads-not-initialized.md` shows `bd init --stealth` first and gains the Wrong database case and the bd 1.1.0 floor.
- Every skill's persist step is one question: `bd config get sync.remote` set → `bd dolt push`; `backup.enabled` true → `bd backup sync`; otherwise nothing. help's "Beads + Git Workflow" block is now "Beads persistence" (the three tiers).
- `hooks/beads-drift-check.sh` (SessionEnd) reminds to `bd dolt push` only when a Dolt remote is configured; it no longer inspects git for `.beads/` changes.
- validate_project's beads check warns when `.beads/` is neither excluded nor ignored instead of validating a mode.
- Root and maintainer docs (README, CLAUDE.md, commands reference, workflow guide) render the three-tier model and the stealth-first setup rule; `bd update --claim` replaces `--status in_progress` in the examples.
- `create_design`'s Success Metrics refine the README Intent's success statements rather than originate them; each metric names the statement it refines, and a statement no metric covers is listed as deferred with a reason.
- Every live rendering of the workflow (help, wb-prime's orientation, the generated project README, README.md, CLAUDE.md, the commands reference, the workflow guide) names `implement` as the default execution path with `implement_inline` beside it.

### Fixed

- `plugin/scripts/lint` exits 1 when markdownlint reports an error, in named-file, changed-files, and `--all` modes, and exits 1 from `--fix` when findings remain; it had always exited 0 (prompts-3ke). The PostToolUse hook still exits 0.
- `help`'s "database locked" troubleshooting named `.beads/daemon.lock` and `bd daemon`, which do not exist on embedded Dolt; it now says a lock clears when the other session's command finishes, that `bd context` shows the open database, and that `bd doctor` runs only against a Dolt server in bd 1.1.0.

### Migration

1. `claude plugin update wb@gvarela-workbench` from your shell, then restart Claude (or `/reload-plugins`).
2. If you committed `.beads/` in any repository: stop; exclude it (`bd init --setup-exclude` or `bd init --stealth`); set up `bd backup init <url>` or a Dolt remote if you need continuity. The old `issues.jsonl` stays importable with `bd import`.
3. Optionally switch to the new command names; the old ones print a notice until 4.0.0. Replace any `/wb:create_execution` with `/wb:create_tasks`.
4. Existing plans have no Intent section; stages treat that as "no obligation" and help says so. Add one by hand to a plan you want the new checks on.

## [2.6.0] — 2026-09-05

Every wb workflow skill is now model-invocable. A prose request to plan, research, design, break down, implement, validate, sync status, or hand off is honored without a typed `/wb:` command; the slash commands still work as before.

### Changed

- `disable-model-invocation` removed from all workflow skills except the deprecated `create_execution` alias. Descriptions rewritten as trigger text (what the skill does, when to use it, what it takes) since the model now loads them. Each skill's Initial Response still gates on its arguments, and checkpoints still stop for a human.
- `update_status` had been the sole writer of tasks.md progress frontmatter since v2.3.0 while user-only, so no phase could reconcile its own status; that is now possible.
- `CLAUDE.md` and `docs/claude-code-skills-guide.md` record the decision.

## [2.5.0] — 2026-09-05

Fable 5.1 re-baseline, phase 2: the CLAUDE.md command root rewritten, the budget-keyword directives converted, and the two deferred prompt-modernization trims decided on blind-trial evidence. Plan: `docs/plans/2026-09-01-fable-5-1-rebaseline/` (trials in `trials/2026-09-05-blind-trials.md`).

### Changed

- `CLAUDE.md` "Working with Commands": one marker per real synchronization point with its reason stated; name what a decision is about instead of instructing thinking depth; spawn in parallel and synthesize only after every agent returns. The Command Structure Patterns example carries a reason per marker.
- R1 (prompt-modernization): the 21 `think deeply` / `ultrathink` directives across the stage skills become the directive they introduced (Decide…, Document…, Identify…, Work out…); the two bare ones (create_project, update_status) are deleted. Thinking depth is the session's effort setting, not prompt text.

### Skipped on evidence

- R3 barrier normalization (triple ⛔ → single ⛔ with reason): on a trap fixture with two of three agent reports back and the third streaming a near-complete partial, Sonnet synthesized anyway under both wordings (WAIT 0/3 baseline, 1/3 trimmed). Volume is not what holds the barrier; no barrier text changed.
- R4 scope-block softening (CRITICAL/NEVER → Scope/Do not): both wordings left a trap bug in the edited function untouched 3/3; the trimmed wording surfaced it 2/3 against 3/3 baseline. No scope block changed. The documentarian-placement half of R4 was already at target since the v2.0.0 relocations.

## [2.4.0] — 2026-09-05

Fable 5.1 re-baseline, phase 1: guardrails and uplifts the new model needs in implementation contexts, plus Fable routed into the two places it pays for itself — escalation after a verified failure and the create_tasks decomposition stage. Nothing removed. Plan: `docs/plans/2026-09-01-fable-5-1-rebaseline/`.

### Added

- `task-worker` agent: FOLLOW-UPS, NOT FIXES and SURGICAL EDITS constraints (pre-existing bugs are reported, not fixed; targeted edits over whole-file rewrites), and an Operating Mode section for autonomous runs that explicitly excludes phase checkpoints and plan-defect halts.
- `implement_tasks`: "Extras and edits" rules after the scope block; "Record durable learnings" step (`bd remember` with a qualification rule) at phase completion.
- `implement_coordinated`: autonomy paragraph at the top of the task loop; "Record durable learnings" step at phase completion; `why:` field leading the worker context package, rendered first in the Worker Prompt Template.
- `create_tasks`: Model Self-Check (Fable recommended at high effort, Opus the comfortable minimum; warns below Opus, never blocks) — same shape as explore_design's.
- `create_handoff`: Critical Discoveries reviews the session's `bd remember` entries.

### Changed

- `implement_coordinated`: verified failures escalate once to a `fable` fix worker at `effort: high` (opus fallback when fable is unavailable); no second retry — the task goes to the checkpoint's blocking list. Opus tier is architectural/cross-cutting work; Fable is never a first spawn.
- Model map: `docs/workbench-workflow-guide.md` rows for create_tasks (Fable, Opus fallback), implement_tasks (Fable for cross-cutting phases), implement_coordinated (escalation workers Fable at high); `CLAUDE.md` tier list gives `fable` decomposition and escalation, and the rule that Fable spawns use `effort: high`, never `xhigh`.

### Removed

- `AGENTS.md`: duplicated CLAUDE.md's session protocol with a stale pre-1.0.2 step; references repointed.

## [2.3.0] — 2026-08-26

Compaction and drift hardening: a recovery hook for compacted sessions, a background skill that keeps plan-doc claims grounded in the current context, and a single authoritative writer for plan-doc progress frontmatter.

### Added

- `hooks/compact-recovery.sh` (SessionStart, `compact` trigger): re-anchors a compacted session on the active plan directory. Empirically validated with a live `/compact` marker test — the model quoted the recovery block verbatim (evidence on `prompts-6du`).
- `doc-adherence` background skill: plan-doc claims require a read in the current context window before they can be asserted. Blind-trial validated 9/9 on first run (evidence on `prompts-2x7`).

### Changed

- Plan-doc progress frontmatter consolidated to a single writer, `/wb:update_status`; `implement_tasks`, `implement_coordinated`, and their templates now defer to it instead of writing frontmatter themselves. `status-sync` gains a frontmatter-drift indicator.
- Handoff-over-compact guidance: a phase that would need a second `/compact` now hands off instead (`implement_coordinated`, `create_handoff`, `help`).

## [2.2.0] — 2026-07-31

The create_tasks rename, plus the model-strategy recalibration.

### Added

- `skills/create_tasks`: canonical name for the execution-planning skill (the `create_*` family names its artifact — this one writes `tasks.md` — and it pairs with `implement_tasks`). Identical behavior; all docs and cross-references updated.

### Changed

- `implement_coordinated` worker tiers recalibrated: sonnet (at `effort: xhigh`) is the default when unsure, including bugs and refactors; haiku is mechanical-only; opus is reserved for architectural, cross-cutting, or previously-failed tasks. Fix workers stay opus.
- `implement_coordinated` verification FAILs now distinguish implementation defects (fix-worker retries) from plan defects — a new Plan-Defect Deviation Protocol files a design-revision issue, blocks dependents, and halts the phase instead of burning retries on tasks that are wrong as specified.
- `create_mockup` research agents moved from haiku to sonnet at `effort: low`; analyzer/verifier agents carry explicit `effort` annotations.
- `create_tasks` gains a must-NOT-contain list (no new scope, no re-deciding design, no invented requirements).
- Per-stage session-model guidance added to the workflow guide (Fable for explore_design, Opus for decomposition/coordination, Sonnet elsewhere).

### Deprecated

- `/wb:create_execution` — now a stub that redirects to `/wb:create_tasks`. Removed at 3.0.0. **Gotcha**: a session started before this rename may hold a cached pre-rename skill body and reference supporting files by their old paths — restart the session (or `/reload-skills`) after updating; the stub directory keeps pointer files for its old supporting files so stale references degrade gracefully instead of erroring.

## [2.1.0] — 2026-07-31

The explore_design release. Adds an optional architecture-discussion stage between research and design, with durable decision records the rest of the pipeline consumes.

### Added

- `skills/explore_design`: optional, user-only facilitated architecture discussion (frame → diverge → discuss → converge → record). Produces an elastic exploration record under `thoughts/` and a fixed-shape decision record as a closed `Decide:` beads issue. Recommended model: Fable (Opus fallback); the skill self-checks and surfaces lighter models without blocking.
- `create_design` cold-start consumption: BARRIER 1 checks `bd list -n 0 --status=closed | grep "Decide:"` and reads referenced thoughts docs; Step 4 formalizes the recorded decision on confirmation instead of generating options. With no record, behavior is byte-identical to 2.0.0 (verified against a pre-edit parity baseline).
- `create_research` and `create_product_research` completion summaries conditionally suggest `/wb:explore_design` — only when findings show multiple viable approaches.
- `validate_project` orphan detection exempts planning-prefix issues (`Q:`, `Decide:`, `Validate:`, `UI Q:`) — planning-phase records are intentionally not anchored in tasks.md frontmatter.
- Documentation sweep: the optional stage appears in every workflow rendering (help, CLAUDE.md, README, commands reference, workflow guide, generated project templates); help additionally documents `Decide:` lifecycle semantics (open = pending, closed = decided, rationale in close reason).

## [2.0.0] — 2026-07-31

The modernization release. One coordinated breaking change covering the Claude Code skills unification, the beads 1.0.2 CLI migration, and a repository restructure.

### ⚠️ Breaking / Requirements

- **Requires beads ≥ 1.0.2** (embedded-Dolt backend). The prompts now use `bd info`, `bd update --claim`, and auto-flush semantics; `bd sync` and `bd doctor` are gone from all guidance. **Update beads before updating the plugin** — old beads + new prompts will produce failing commands.
- **Repository layout changed**: the runtime plugin now lives in `plugin/`; installs cache only that subtree. If you reference repo paths directly (scripts, `--plugin-dir`), point at `plugin/`. All `/wb:*` command names are unchanged.
- **Workflow commands no longer auto-trigger**: the 13 `/wb:create_*`/`implement_*`/`validate_*`/`*_handoff`/`update_status` skills carry `disable-model-invocation` — you invoke them; Claude won't fire them spontaneously. Background discipline skills (tdd-discipline, verification-before-completion, status-sync, project-structure) are now Claude-only (hidden from the `/` menu).

### Changed

- All 14 workflow commands migrated from `commands/*.md` to canonical `skills/<name>/SKILL.md` form (skills/commands unification).
- Skill cores restructured for context economy: 8,439 → ~5,275 lines loaded at invocation (−37.5%); templates, sub-agent prompts, and reference material moved to on-demand supporting files with verified output parity (structural dry-run comparison + independent content-conservation audit).
- `implement_coordinated` workers are now a defined `task-worker` agent with the tdd-discipline skill preloaded; model selection moved from keyword regex to coordinator judgment with per-spawn overrides.
- Agents carry explicit `model:` selections (haiku for search, sonnet for analysis/verification) and `maxTurns` caps on search agents.
- Verification skills (`validate_execution`, `research-validation`) pinned to `model: sonnet` + `effort: high`.
- `status-sync` skill re-scoped to interactive deep-checks; the deterministic session-end reminder moved to a SessionEnd hook.

### Fixed

- `bd list` decision pipelines no longer silently truncate at 50 issues (`-n 0` added at 8 gating sites).
- Task claiming is atomic (`bd update --claim`) — closes the double-claim window in coordinated execution (14 sites).
- `validate_project` mode checks now use the same `git check-ignore` predicate as the SessionStart hook (the old tracked-file check false-warned before first commit).
- Phase-completion checks use the milestone's `blockedBy` (authoritative) instead of fragile title greps.
- Phantom barrier references removed from three sync summaries; two real pre-report gates added to the validation skills (validate_execution BARRIER 3, validate_project BARRIER 2).
- PostToolUse lint hook reads hook input from stdin JSON — it had been silently no-opping since Claude Code stopped setting `CLAUDE_TOOL_ARGS`.

- Workflow skills carry `allowed-tools: Read` — pre-approves file reads while the skill is active, so the on-demand supporting files (templates, sub-agent prompts, reference) load without permission prompts when your session is in a different project. Found in release testing; reads outside the active skill still follow your normal permission settings once the skill completes.

### Added

- `hooks/beads-drift-check.sh` (SessionEnd): one-line reminder when `.beads/` has uncommitted changes; silent when clean.
- `agents/task-worker.md`: focused single-task TDD worker for coordinated execution.
- `plugin/docs/reference/`: shared runtime docs (beads modes, documentarian philosophy, beads-not-initialized playbook) referenced by skills instead of duplicated in them.
- `displayName: Workbench` in the plugin manifest.

### Migration

1. Update beads first: `brew upgrade bd` (or equivalent) to ≥ 1.0.2, then in each beads project let it migrate (`bd info` to confirm; if it errors, `bd export` then `bd init --force --prefix <prefix>` then `bd import`).
2. `claude plugin update wb@gvarela-workbench` from your shell, then restart Claude (or `/reload-plugins`).
3. Nothing else changes day-to-day: same `/wb:*` names, same workflow sequence.

## [1.1.0] — 2026

- Added product-manager research flow: `/wb:create_product_research`, `product-behavior-analyzer` and `research-validator` agents, `research-validation` skill, portable Claude Desktop prompt.

## [1.0.0]

- Initial plugin release: wb workflow commands, agents, skills, hooks, beads integration.
