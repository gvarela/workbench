---
project: implement-rename-3.0
ticket: prompts-h7c
created: 2026-09-05
created_timestamp: 2026-09-06T00:23:23Z
status: implementing
last_updated: 2026-09-06
designer: gabe@vare.la
status_note: approved by Gabe 2026-09-06 (first pass via /wb:create_tasks); revised after Phase 1 to add the beads-model realignment (D11-D16, prompts-my1i), the single-PR release shape (D9 revised), the maintainer guide (D17), wb-prime (D18), and the intent model with stateful help (D19-D20, prompts-k0ub); re-approved by Gabe 2026-09-06 with a five-phase structure
git_commit: dc801dca5e573064327832478adf7b98013cef0e
git_branch: worktree-implement-rename-3.0
repository: gvarela/workbench
tags: [design, architecture, implement-rename-3.0]
depends_on: research.md
design_approach: alias-rename-bundled-major
---

# Design: implement-rename-3.0

## Problem Statement

The two implementation skills are named by history, not by role. `implement_coordinated` is the execution path the plugin recommends (workers per task, verification, escalation) and `implement_tasks` is the path that runs on the session model; the names describe them as a base and a variant, so the recommended path reads as the special case. The `create_execution` alias has carried a promise since v2.2.0 that it is removed at 3.0.0, and no 3.0.0 has been cut. Three small defects sit open in the same files this rename sweeps: the plugin documents a JSONL auto-flush that beads does not perform by default, the lint script reports clean regardless of findings, and the coordinated skill's reference doc still names opus as the worker default when unsure.

Releasing has also been one bump per phase, three cuts in a single day for the last plan. RELEASING.md permits non-breaking phases to merge unbumped, but the process list does not say when to cut, when a breaking phase may land, or that a cut is tagged. This release is the first to exercise a bundled cut, so the process rule ships with it.

Revision 2026-09-06 (after Phase 1). The plugin's beads guidance has drifted from beads' own model. It teaches a "git mode" in which sessions commit `.beads/` to git for cross-machine persistence; that was the SQLite-plus-JSONL era, and today it means committing a binary Dolt directory, which beads never recommends. beads 1.1.0 documents a different shape (research.md §13): the local database is always the store; cross-machine sync and backups use a Dolt remote or `bd backup`; the JSONL is for viewers and interchange; stealth mode uses the shared `.git/info/exclude` so nothing reaches a team's tree; a contributor role can keep the database outside the repo entirely. Gabe's usual case is a codebase where teammates do not use beads, which is exactly the case beads' stealth mode is built for, and the plugin gives no rule for choosing it, no persistence path other than git, no session-start check that the right database is open, and no mention of worktrees, which Claude Code creates on its own. Phase 1's correction of the auto-flush claim was true but patched the old model rather than replacing it. Removing the commit-`.beads/` instruction is a workflow-contract change, so it belongs in this major.

### Success Metrics

- `/wb:implement` and `/wb:implement_inline` are the canonical commands; `/wb:implement_coordinated` and `/wb:implement_tasks` print a one-time notice and run the canonical skill unchanged
- `/wb:create_execution` no longer exists in the shipped plugin
- Every live rendering of the workflow sequence and model map names the new commands, with `implement` as the default execution path
- No live file outside CHANGELOG.md and `docs/plans/` states that beads auto-flushes `issues.jsonl`
- The lint script exits non-zero when markdownlint reports an error, in every mode
- One statement of the worker tier rule exists in the coordinated skill, and it names sonnet as the default when unsure
- RELEASING.md states when a cut happens, where a breaking phase lands, that cuts are tagged, what a major's canary period is, and that a plan ships as one PR
- No plugin file instructs a session to commit `.beads/`; every persistence instruction resolves to one question about a configured remote or backup
- The beads reference doc carries the setup decision, the three persistence tiers, the worktree facts, a session-start sanity check, and the hygiene commands, and every skill's beads step points at it
- A session whose resolved database does not contain the plan's epic stops before doing work
- Installed plugin reports 3.0.0 in a fresh session, and `v3.0.0` is tagged on the bump commit

## Design Approach

Rename by directory move plus deprecated alias stubs, exactly as v2.2.0 did, and ship it as 3.0.0 together with the scheduled alias removal, the three ride-along corrections, and the RELEASING.md amendment. The rename is non-breaking for anyone who types the old names; the removal of `create_execution` is what makes the release a major, and it was promised for this version.

### Why This Approach

- The stub-plus-pointer alias is the one rename precedent in the repository (research.md §4, §11), and the decision record prompts-xn4 rejected a hard rename because it "breaks muscle memory + external users' docs"; the same reasoning holds for names that appear in every generated project README
- RELEASING.md classifies renamed commands as major (line 21), and the create_execution stub, CHANGELOG 2.2.0, and the skills guide all schedule the alias's removal at 3.0.0; cutting 3.0.0 without honoring that would leave the promise dangling
- The three ride-alongs are patch-level corrections whose sites overlap the rename sweep (implement_tasks and implement_coordinated Step 7, reference.md), so bundling them costs one grep audit each and no separate release
- Fact 2 of RELEASING.md (a breaking change merges with its bump or not at all) fixes where the breaking piece lands; the bundling rule is written down so the next multi-phase plan does not default back to a cut per phase

## Technical Decisions

### D1: Canonical names are `implement` and `implement_inline`

- Decision: `implement_coordinated` becomes `implement`; `implement_tasks` becomes `implement_inline`. Directory name and `name:` field change together, matching the convention every skill follows (research.md §1). Underscore stays the separator, matching the sixteen workflow commands (background skills use hyphens).
- Rationale: the recommended path gets the plain verb; the session-model path gets a qualifier that names what is different about it (it runs inline, on whatever model the session has). This is the reading prompts-h7c recorded: "implement (today's implement_coordinated) becomes the default execution path; implement_inline (today's implement_tasks) executes in the current session and therefore assumes the session model".
- Trade-off: `implement` is the first single-word workflow command and the most generic trigger word in the menu. Its description must carry the discrimination the two skills already have ("worker agents", "main context kept clean" versus "inline by the current session model"). Tracked as assumption prompts-zmy.
- Pattern reference: `docs/claude-code-skills-guide.md:41-53, 74`; `plugin/skills/implement_tasks/SKILL.md:3`; `plugin/skills/implement_coordinated/SKILL.md:3`

### D2: The old names become deprecated aliases in the v2.2.0 shape

- Decision: `plugin/skills/implement_coordinated/` and `plugin/skills/implement_tasks/` remain as alias directories: a stub SKILL.md that announces the rename once and then reads and follows the canonical SKILL.md with arguments passed through, plus one pointer file per supporting file the canonical skill has (five for implement, one for implement_inline), so a session holding a stale skill body still resolves its reads. Stubs carry `disable-model-invocation: true` and the same `argument-hint` and `allowed-tools` as the canonical skill.
- Rationale: identical to the precedent (`plugin/skills/create_execution/`), which has served since July with one recorded gotcha (stale cached bodies) that the pointer files exist to absorb. `disable-model-invocation` on the stubs keeps the prose router choosing between two skills, not four.
- Trade-off: two more directories in the `/wb:` menu until removal.
- Pattern reference: `plugin/skills/create_execution/SKILL.md:1-24`, `examples.md:1-5`; `CHANGELOG.md:82`

### D3: Aliases live through 3.x and are removed at 4.0.0

- Decision: the stubs state "works through 3.x, removed at 4.0.0" in their description, body, and notice, mirroring the create_execution wording with the versions advanced.
- Rationale: the precedent gave one major cycle; the promise was kept in this release, which is the evidence the pattern works.

### D4: `create_execution` is removed in this release

- Decision: the alias directory is deleted, and the three live mentions that describe it as the only user-only skill (`CLAUDE.md:13, 104`; `docs/claude-code-skills-guide.md:310`) are rewritten to describe the new aliases instead. Historical plan documents keep their text.
- Rationale: scheduled at 3.0.0 in three places; this is the change that makes the major honest under RELEASING.md's semver rule.
- Trade-off: any installer still typing `/wb:create_execution` gets an unknown command rather than a notice. The v2.2.0 notice has been printed on every use for six weeks.

### D5: `implement` is the default in every sequence rendering

- Decision: the seven workflow-sequence renderings (research.md §6) end in `/wb:implement`, and the generated project README from `create_project` templates names `/wb:implement`. `implement_inline` is documented beside it as the session-model path, in the model map, the help skill, the README command list, and the coordinated skill's README (whose "Evolution from" and "Migration from" sections describe the relationship in the new names).
- Rationale: the point of the rename is that the recommended path is the unqualified one. The handoff skills' "continue with" lines follow the same rule.
- Trade-off: the create_project template change means every project created after 3.0.0 names the new default; projects created before keep `implement_tasks` in their README, which the alias handles.
- Pattern reference: `plugin/skills/create_project/templates.md:31, 50`; `plugin/skills/help/SKILL.md:31-43`; `CLAUDE.md:86`; `docs/workbench-workflow-guide.md:73-74`

### D6: Beads persistence text states what bd does

- Decision: `plugin/docs/reference/beads-mode.md` becomes the single statement of persistence mechanics: the embedded Dolt database is the store; `issues.jsonl` is written only when `export.auto` is set or `bd export` is run; git mode therefore requires one of those before committing `.beads/`. Every other live site that repeats the auto-flush claim (research.md §7, roughly a dozen files) either drops the claim or points at the reference doc. The SessionEnd drift-check reminder keeps its behavior and loses nothing, since it only checks for uncommitted `.beads/` changes.
- Rationale: prompts-vwo records the observed behavior on bd 1.0.2 (export five weeks stale while the database moved on); a reference doc that all skills already link to is the right single source, and duplicated one-liners are how the claim spread to a dozen files.
- Trade-off: git-mode installers gain a one-time setup step (`bd config set export.auto true`) that the docs must name.

### D7: The lint script's exit code reflects findings

- Decision: `./plugin/scripts/lint` exits non-zero when any file had a markdownlint error, in all three modes (named files, changed files, `--all`), and has a defined exit on the `--fix` path. The PostToolUse hook keeps exiting 0 so an edit is never blocked by a lint finding.
- Rationale: prompts-3ke and research.md §8 both record that the flag is set inside a piped subshell and read outside it; RELEASING.md's pre-bump verification names `lint --all`, and the last two plans redefined "lint clean" as reading the output because the exit code was meaningless.
- Trade-off: the repository carries pre-existing findings in about 58 files (MD024, MD060), so `lint --all` will exit non-zero until those are fixed or the rules relaxed. Per-file checks against changed files stay the working gate; whether to fix the backlog is out of scope here.

### D8: One statement of the worker tier rule

- Decision: the "Worker Model Selection" section in `implement_coordinated/reference.md` no longer restates the tiers; it records that the keyword-regex spec was retired and points at the tier list in the canonical SKILL.md Step 5, which names sonnet as the default when unsure.
- Rationale: four places state the rule today and one disagrees (research.md §9). Removing the copy removes the drift path; the SKILL.md list is the one the coordinator reads at spawn time.

### D9: RELEASING.md gains a bundling rule; a plan ships as one PR (revised 2026-09-06)

- Decision: the Process section states: a plan lives on one branch; its phases are checkpoints on that branch, not merges; a draft PR opened at the first phase is the running review surface and is retitled at the cut; the branch merges once, carrying the bump, when the plan completes. A non-breaking phase may merge early only when wb sessions in another repository need it. Every cut is tagged `vX.Y.Z` on the merge commit; a major's canary is at least three real sessions on the branch through `--plugin-dir` before the merge.
- Rationale: fact 2 already forces a breaking phase to merge with its bump, and this plan now has two breaking phases (the beads contract change and the rename), so the whole plan is a release branch by the rule's own terms. Incremental merges would put Phase 1's text on main only for Phase 2 to change the same lines again, with no consumer in between: this repository's sessions run `--plugin-dir`, and installers receive nothing until the bump. One PR also means one review and one changelog entry. The last plan cut three versions in a day and tagged none of them.
- Trade-off: merge-as-checkpoint no longer confirms each phase; the phase report on the branch plus Gabe's go-ahead does. A long-lived branch costs rebases only when someone else lands on main, which does not happen in this repository. Installers wait longer between versions.

### D10: Release is 3.0.0 with a Breaking and a Migration section

- Decision: CHANGELOG 3.0.0 follows the 2.0.0 shape: a Breaking section (create_execution removed; the two renames with their aliases), Added and Changed sections for the rest, a Migration section (update the plugin, restart or reload, optionally switch to the new names). Both manifests move to 3.0.0 in the same PR as the alias removal; the tag `v3.0.0` lands on that commit.
- Rationale: RELEASING.md lines 15, 21, 28; the 2.0.0 entry is the only prior major and its shape carried the migration steps installers needed.

### D11: A setup decision, with stealth as the default

- Decision: the beads-not-initialized playbook and the beads reference doc state a rule instead of two commands. Any repository with collaborators who do not use beads: `bd init --stealth`, which writes the shared `.git/info/exclude` so nothing appears in the team's tree on any branch or worktree; `--setup-exclude` where beads already exists; the contributor role when the database should live outside the repo. Plain `bd init` only for a repository the user owns outright, and even then with `.beads/` excluded, since the Dolt directory is never committed. Ignoring `.beads/` through the committed `.gitignore` is documented as branch-dependent and second-best.
- Rationale: beads' own help text calls stealth "perfect for personal use without affecting repo collaborators", and the exclude file is what makes mode detection stable across worktrees (research.md §14). The plugin's two commands with no rule left the choice to whoever ran init, and this repository's own detection failed on a stale branch because it relied on `.gitignore`.
- Trade-off: none for stealth users. A user who wants the database in git has no supported path; that matches beads' position.

### D12: Three persistence tiers replace the two-mode model

- Decision: the reference doc describes persistence as tiers, not modes: the local database always; a Dolt remote (`bd dolt push` / `pull`) or `bd backup` for cross-machine continuity; JSONL export for viewers and interchange only. Every skill step that today branches on `$BEADS_MODE` to commit `.beads/` becomes one question, whether a remote or backup is configured, and one action, `bd dolt push` or `bd backup sync`, else nothing. The commit-`.beads/` instruction is removed from every skill, the help skill's "Beads + Git Workflow" block, and the SessionEnd drift hook, whose reminder becomes "remote configured, push before ending" or silence. The `BEADS_MODE` variable and the SessionStart hook that sets it are removed: every consumer is the commit branch this decision deletes, a pointer to it, the informational `mode:` field in the coordinated worker's context package, or validate_project's mismatch check, which already runs the `git check-ignore` predicate itself. validate_project keeps one check, run directly: warn when `.beads/` is neither excluded nor ignored, because the Dolt directory is never meant to be tracked. The manifest's SessionStart entry for the hook goes with it; the compaction-recovery entry stays.
- Rationale: this is beads' documented model verbatim (research.md §13). A major is where contract changes batch; a variable kept only so that its `git` value can mean "misconfigured" would be the drift carried forward, not avoided.
- Trade-off: installers who did commit `.beads/` need a migration note. The CHANGELOG's Migration section tells them to stop committing it, exclude it, and set up `bd backup` if they need continuity. Any installer's local settings that reference `BEADS_MODE` stop resolving; the plugin never documented it as user-facing, and the Breaking section names it.

### D13: Handoffs say what is portable

- Decision: create_handoff states, in one sentence in its persistence step, that without a remote or backup the handoff document is the only artifact that crosses machines and that plan-document issue IDs will not resolve elsewhere; it points at the reference doc for setting up continuity. resume_handoff keeps its count comparison and adds the sanity check in D14 before it.
- Rationale: the handoff already records beads state as text, which is the right fallback; it just never says why. The previous session's handoff warned about this in prose because no skill did.

### D14: A session-start sanity check that the right database is open

- Decision: the reference doc defines a three-line check, `bd context` for the resolved database name, `bd show <epic>` for the plan's epic from tasks.md frontmatter, and `bd stats` for the total, and every stage that reads a plan's beads IDs (resume_handoff, implement, implement_inline, update_status, validate_execution, create_tasks when a plan already has an epic) runs it before work and stops with a stated message when the epic does not resolve. The beads-not-initialized playbook gains that message as a second case: the database bd resolved is not the one this plan was tracked in.
- Rationale: on 2026-09-05 a missing `metadata.json` made bd open an empty default database and every command reported zero issues; only a human comparing counts noticed. `bd info` alone did not catch it. Three commands at the start of a stage are cheap; a phase run against the wrong database is not.

### D15: Worktrees are documented

- Decision: the reference doc gains a Worktrees section with the four facts from research.md §14: one database shared by every worktree, resolved from git's common dir; the exclude file is shared too; `BEADS_MODE` is set once from the starting cwd; a worktree-isolated session cannot write files under the shared `.beads/`, so a repair there is handed to the user. Parallel sessions share one embedded database, and beads' managed server exists if lock contention appears.
- Rationale: Claude Code creates worktrees without asking; three of the four facts bit this session.

### D16: Hygiene commands are wired in; memory limits are stated

- Decision: the session-close protocol (CLAUDE.md, status-sync, create_handoff) runs `bd doctor` once and acts on what it reports; validate_project's orphan check calls `bd orphans` instead of its own grep; the reference doc lists `bd doctor`, `bd preflight`, `bd stale`, `bd orphans`, `bd lint` with one line each on when they apply. The memory guidance from v2.4.0 gains two facts: memories are workspace-wide across every plan in the repository, and they are excluded from `bd export` by default, so only a Dolt remote carries them to another machine.
- Rationale: beads ships these checks and `bd prime` lists them; the plugin reimplements one and ignores the rest. `bd doctor` checks the metadata version tracking that failed in D14's incident.
- Amendment 2026-09-06 (decision issue prompts-hsa2, closed; Gabe deferred to the coordinator's recommendation): bd 1.1.0's `--help` and a live run showed three of the named commands do not do what this decision assumed. `bd orphans` reports open or in-progress issues that commit messages already reference (work landed but never closed), so it is not a replacement for validate_project's frontmatter orphan check; validate_project keeps its own check and reports `bd orphans` beside it under its real meaning. `bd preflight` is beads' own contributor checklist for its Go repository and is not named in plugin text. `bd doctor` (including `--check=conventions`) is unsupported in the default embedded mode and runs only against a Dolt server, so the close protocol names it with that caveat and falls back to `bd stale` and `bd orphans`. The intent of D16 stands; Phase 4's contract inventory records embedded-versus-server support per command.

### D17: A maintainer guide to beads, with a contract inventory and an upgrade protocol

- Decision: a new maintainer document, `docs/beads-guide.md`, becomes the place where the workbench's understanding of beads lives. It carries five things. The model wb relies on (database as truth, the three tiers, stealth, worktrees), in a page. The contract inventory: every bd subcommand, flag, and config key any skill, agent, or hook depends on, with the files that use it and the bd version it was last verified on; the inventory is built by auditing the roughly twenty subcommands the plugin references today against `bd <cmd> --help`, and references that no longer exist (`bd daemon`, `bd state`, `bd invocations`, `bd process`, `bd status` are candidates) are removed from the skills in the same task. The supported bd version and the upgrade protocol: when `bd version` changes, run `bd doctor`, diff `--help` for every inventoried command, run the headless smoke set for the skills that use beads, update the inventory's verified-on column, and record the requirement change in README and CHANGELOG (RELEASING.md already classes a new bd requirement as major). Interpretation notes: the facts a maintainer needs to read bd's behavior correctly (`no-git-ops`, embedded versus server, `metadata.json`, throttled export, the beads plugin's own docs lagging its CLI). A doc map stating which file is the source of truth for what: `plugin/docs/reference/` for what installers and skills read at runtime, `docs/beads-guide.md` for maintainers, beads memories for operational facts about this workspace, and `docs/beads-integration-learnings.md` kept as dated history linked from the guide. CLAUDE.md gains a one-line rule beside the update_status sole-writer rule: a change that adds, removes, or alters a bd command in any shipped file updates the inventory. The D14 sanity check compares `bd version` against the minimum the playbook states and stops below it.
- Rationale: beads moved from SQLite to embedded Dolt, dropped `bd sync`, changed export semantics, and grew a role model, and each time the plugin found out by breaking or by a stale claim surviving for weeks. The workbench's knowledge of beads should be a maintained artifact with a version column, not memories of sessions. A contract inventory is also what makes the upgrade protocol mechanical enough to delegate.
- Trade-off: one more document to keep current; the CLAUDE.md rule and the verified-on column are what keep it from becoming another diary.

### D18: A session-start orientation hook (wb prime)

- Decision: one script, `hooks/wb-prime.sh`, modeled on how the beads plugin wires `bd prime` (research: the beads manifest registers `bd prime` on SessionStart with an empty matcher, so every trigger, and again on PreCompact; `bd prime` adapts its output to the environment, honors a workspace override file, dumps its default with `--export`, and has a memories-only mode for compact contexts). wb-prime replaces both the removed mode hook and compact-recovery, registered on SessionStart for all triggers and on PreCompact. Two output modes chosen from the hook payload: on `startup`, `resume`, and `clear`, the orientation, meaning the stage chain and what each stage requires from the previous one, the `docs/plans/<date>-<name>/` convention and its three documents, beads holds status and markdown holds the plan, checkpoints stop for a human, the D14 sanity check, the active plans in this repository from the scan compact-recovery already performs, and a pointer to `/wb:help`; on `compact` and PreCompact, only the recovery text compact-recovery prints today, the analogue of `--memories-only`. A repository can replace the orientation with its own `.claude/wb/PRIME.md` (the plugin's namespace under Claude Code's project config directory, the analogue of beads' `.beads/PRIME.md`; `docs/plans/` holds plans, not configuration), and `wb-prime.sh --export` prints the default for customizing. The script is runnable by hand and the help skill says so. Contract, inherited from compact-recovery: under 100ms, no bd invocations, plain-text stdout, silent on unknown payloads; the orientation is under forty lines, and it ends with the same truncation line `bd prime` uses ("if this output is truncated by your host, read the full persisted hook output").
- Rationale: since v2.6.0 the model can invoke every stage from prose, and the only thing it sees at session start is fourteen skill descriptions written as trigger text. Nothing tells it the order, the gates between stages, or where plans live; this repository's CLAUDE.md does, but CLAUDE.md is not shipped, so an installer's session in another repository starts blind. Each skill checks its own prerequisites at invocation, which catches a wrong-order call after the fact; orientation prevents it. Following `bd prime`'s shape rather than inventing one gives the hook a proven trigger set (PreCompact means the orientation is present when the summary is written, not only after), an override path for repositories with their own conventions, and a single script instead of two.
- Trade-off: a few hundred tokens of baseline context in every session in every repository with wb installed; `bd prime`'s full mode runs one to two thousand tokens and has not been a problem, so the forty-line cap is conservative. Merging compact-recovery into the new script retires a hook that shipped in v2.3.0; its behavior is preserved as a mode, and the CHANGELOG names the file change.

### D19: A plan states its intent at creation, and every stage owes it something (the staged charter)

Formalizes decision record prompts-k0ub (closed 2026-09-06; exploration in [thoughts/2026-09-06-plan-intent-and-human-input.md](thoughts/2026-09-06-plan-intent-and-human-input.md)).

- Decision: the README gains an Intent section at the top, written by create_project, with three parts: a Goal sentence; two to four "success looks like" statements in observable, non-numeric terms; and Non-goals. Constraints are not asked for at creation; research supplies them. create_project takes the intent from the prose request that invoked it when one is present and confirms it in one exchange, and asks for it otherwise; it does not proceed with the section empty. Each later stage has a named obligation to the section. create_research derives its research question from the Goal and, at completion, names any success statement its findings never touch. explore_design frames the decision space against the Goal. create_design refines the statements into measurable Success Metrics, tracing each metric to a statement; if that refinement changes the Goal or a Non-goal, the change is a Decide: record and a dated amendment line under the Intent section. create_tasks copies the metrics as the Target State. validate_execution reports against the current metrics and writes the verdict back beside each README statement. Ownership: create_project writes the section; create_design and explore_design may amend it, only with a dated line; design.md owns the measurable form; update_status touches neither.
- Rationale: today the first intent-bearing input is the research question, and the goal first appears in design.md after research, so nothing upstream of design can be judged against it and drift between what a plan was for and what it became goes unrecorded; this plan itself drifted from a rename to a release in a day with no top-level record. Goal and non-goals are cheap to state early and are the scope-creep guard the workers already enforce. Measurable success cannot honestly precede examining the codebase, so refinement at design is the plan working, and only a goal change is loud enough to deserve a record. Validation checks the current objective because design.md is the yardstick and the README echoes it.
- Trade-off: two artifacts carry a version of success, so the skills enforce who writes which. A plan whose goal genuinely shifts pays a decision record each time. Plans created before 3.0.0 have no Intent section; the stages treat its absence as "no obligation" rather than an error, and stateful help (D20) says so.
- Pattern reference: the update_status sole-writer rule; the explore_design Decide: record; `plugin/skills/create_project/templates.md:14` (the Overview the section replaces); `plugin/skills/create_design/SKILL.md:134` (the Success Metrics step that now refines rather than originates).

### D20: The workflow explains its human inputs, and help knows where you are

Formalizes the fifth axis of prompts-k0ub.

- Decision: a map of the workflow's human inputs, one row per stage: what you provide, what you decide, what you confirm, and how you know the stage did enough. It is rendered in full in the help skill, summarized in the orientation hook (D18), and stated in one line in each stage's Initial Response ("This stage needs from you: …"). The help skill becomes stateful: invoked in a repository with an active plan, or by a prose request such as "where am I" or "what's next", it reports the plan's position (which documents exist and their status, epic and milestone state, open Q: and Decide: issues), what the next stage needs from the human per the map, and what the previous stage left undone, read from the evidence D19's obligations leave behind (untouched success statements, untraced metrics, unreported statements); with no active plan, or a plan without an Intent section, it renders the reference card and says which case it is in. The stage-readiness checks reuse validate_project's structural checks rather than duplicating them.
- Rationale: since v2.6.0 the model can run any stage from prose, so the human is the one who needs to know what each stage will ask and when architecture is discussed; the questions Gabe raised ("is intent pre-start or part of design", "how do we know we researched the right things", "when do we discuss architecture") are exactly the map's columns. A separate tutor skill was rejected in exploration: the map already lives in help, the obligations already produce the evidence a tutor would read, and one skill adds no baseline context.
- Trade-off: help's description must carry the new triggers without over-firing on ordinary questions about the plugin (the negative case in the routing test); the "did enough" column is judgment written once and maintained with the skills it describes.
- Pattern reference: `plugin/skills/help/SKILL.md:31-51` (the command diagrams the map extends); `plugin/skills/validate_project/SKILL.md` (the structural checks reused).

## Scope Definition

### In Scope

- D1 through D5: the rename, aliases, alias removal, and every live doc and template that renders the commands or the model map
- D6 through D8: the three ride-along corrections
- D9: the RELEASING.md amendment, including the one-PR-per-plan rule
- D10: the 3.0.0 cut and tag
- D11 through D16: the beads-model realignment across the reference docs, the mode-conditional steps in every skill, removal of the SessionStart mode hook and its manifest entry, the SessionEnd drift hook's new behavior, validate_project, CLAUDE.md's protocol, and a CHANGELOG migration note for installers who committed `.beads/` or referenced `BEADS_MODE`
- D17: the maintainer guide, the contract inventory audit with removal of stale bd references from shipped files, the upgrade protocol, the CLAUDE.md inventory rule, and the version floor in the sanity check
- D18: the session-start orientation hook and its manifest entry
- D19: the Intent section in the generated README, create_project's intake, and the per-stage obligations in create_research, explore_design, create_design, create_tasks, and validate_execution
- D20: the human-input map in help, the orientation hook, and each stage's intake; help made stateful

### Out of Scope

- Configuring a Dolt remote or backup for this repository (Gabe's 2026-09-05 decision: local is fine)
- Supporting the contributor-role wizard or `~/.beads-planning` routing in any skill beyond naming it in the setup decision

- Backfilling tags for 2.2.1 through 2.6.0 (commits identified in research.md §10; can be done by hand at any time)
- Fixing the pre-existing lint backlog or changing lint rules
- Changing the behavior of either implementation skill, their tier rules, or their effort defaults (prompts-yfh stays open)
- The skills guide's stated name character set (line 95 lists hyphens while every workflow skill uses underscores); noted, not changed
- Rewriting historical plan documents under `docs/plans/`
- Release candidates as a version concept (see Rejected Alternatives)
- prompts-9l1 (goal-to-design cascade) and prompts-4cn

## Success Criteria

### Functional Requirements

- [ ] `/wb:implement` runs the coordinated skill; `/wb:implement_inline` runs the inline skill; both old names print the notice and then behave identically to the canonical skill
- [ ] `/wb:create_execution` is absent from the `/wb:` menu
- [ ] The generated project README, help skill, CLAUDE.md, README.md, commands reference, and workflow guide render the new default
- [ ] `plugin/agents/task-worker.md` names `/wb:implement` as its spawner
- [ ] beads-mode.md states the export condition; no other live file claims auto-flush
- [ ] lint exits 1 on a file with a markdownlint error and 0 on a clean file, in each mode
- [ ] reference.md points at the SKILL.md tier list instead of restating it
- [ ] RELEASING.md carries the bundling rule and the one-PR-per-plan rule; CHANGELOG 3.0.0 has Breaking and Migration sections; manifests match; `v3.0.0` tag exists
- [ ] `grep -rn "git add .beads" plugin CLAUDE.md docs | grep -v docs/plans` → none; `grep -rn "BEADS_MODE" plugin CLAUDE.md docs | grep -v docs/plans` → none; `plugin/hooks/setup-beads-mode.sh` absent and unreferenced in `plugin.json`
- [ ] beads-mode.md has sections for the setup decision, persistence tiers, worktrees, the sanity check, and hygiene; beads-not-initialized.md has the wrong-database case
- [ ] Every stage that reads plan beads IDs runs the sanity check and stops on a missing epic (verified by pointing a headless run at a plan whose epic does not exist)
- [ ] A fresh `--plugin-dir` session's first context carries the orientation text; in a repository with an active plan it names the plan directory; the hook runs under 100ms with no bd call (verified with `time` and by grepping the script)
- [ ] A project created by create_project has an Intent section with Goal, success statements, and Non-goals; a headless create_project run with intent in the prompt writes it without asking, and one without intent asks before writing
- [ ] research.md written by create_research names the success statements its findings do not touch; design.md traces each Success Metric to a statement; validate_execution's report lists a verdict per statement
- [ ] help renders the map; a headless "where am I" in a repository with an active plan reports position, next-stage input, and previous-stage gaps; the same prompt in a repository without plans renders the reference card
- [ ] `docs/beads-guide.md` exists with the model, the contract inventory (every bd subcommand referenced under `plugin/` appears in it with a verified-on version), the upgrade protocol, interpretation notes, and the doc map; no bd subcommand referenced under `plugin/` is absent from `bd --help`

### Non-Functional Requirements

- [ ] Per-file lint delta against HEAD is zero on every touched file
- [ ] A `--plugin-dir` smoke session shows the `/wb:` menu with the two new names and two aliases, `/wb:help` renders, and one intake flow works (RELEASING.md line 29)
- [ ] The breaking PR is the last merge before the tag; no state exists on main where `create_execution` is gone but the version is still 2.x

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| ---- | ------ | ---------- | ---------- |
| `implement` does not resolve or collides with a harness name | High | Low | prompts-7mo dry run before the doc sweep |
| Prose requests route to the wrong mode after the rename | Med | Med | prompts-zmy headless trigger test; descriptions rewritten if it fails |
| A stale session references an old supporting-file path | Low | Med | Pointer files per supporting file; CHANGELOG gotcha repeated |
| Sweep misses a rendering site | Med | Med | The inventory in research.md §5 is the checklist; grep for the old names must return only alias stubs, CHANGELOG, and `docs/plans/` |
| `lint --all` now fails on the pre-existing backlog and blocks the pre-bump check | Med | High | The pre-bump check uses per-file deltas until the backlog is addressed; RELEASING.md wording says so |
| Installers on a git-mode beads setup act on the corrected docs and change config | Low | Low | The Migration section names the one command |
| Removing commit-`.beads/` strands an installer who relied on it for cross-machine state | Med | Low | Migration note: exclude `.beads/`, set up `bd backup` or a Dolt remote; the old JSONL stays importable via `bd import` |
| The sanity check false-stops on a plan created before beads tracking (no epic in frontmatter) | Low | Med | The check runs only when tasks.md frontmatter carries `beads_epic` |
| Two breaking phases on one branch drift from main | Low | Low | Single maintainer; rebase before the cut is part of the release task |

### Assumptions

| Assumption | Beads ID | Validated? |
| ---------- | -------- | ---------- |
| A single-word skill directory `implement` resolves as `/wb:implement` and the alias stubs redirect | `prompts-7mo` | Pending |
| The two descriptions discriminate the modes well enough that "implement phase N" routes to `implement` | `prompts-zmy` | Pending |

## Rejected Alternatives

### Option: Hard rename, no aliases

- **Approach**: move the directories and sweep the docs; old names stop working at 3.0.0.
- **Rejected because**: prompts-xn4 rejected this shape for create_execution ("breaks muscle memory + external users' docs"); every project README generated before 3.0.0 names `implement_tasks`, and the aliases cost eight small files.
- **Trade-offs**: a cleaner menu now against a broken command in every existing project directory.

### Option: Rename in a 2.x minor, remove create_execution later

- **Approach**: ship the aliases as additive in 2.7.0, defer the major.
- **Rejected because**: RELEASING.md classifies renamed commands as major regardless of aliases, and the create_execution promise already names 3.0.0. Two majors in short order would be worse than one.
- **Trade-offs**: a smaller release now against a second breaking release soon after.

### Option: Release candidates as versions

- **Approach**: cut `3.0.0-rc.1` to the marketplace for a dogfood period.
- **Rejected because**: the marketplace has one entry and one version string, so an RC on main is what every fresh install receives; a real RC track needs a branch plus a marketplace registration targeting it (the `1.x` mechanism), which is overhead with no consumer for a plugin with one maintainer. The dev channel already serves as the pre-release channel, and whether `claude plugin update` orders prerelease suffixes was not established.
- **Trade-offs**: a named pre-release against a dogfood period on a branch with the same effect.

### Option: Incremental PRs, one per phase (revised 2026-09-06)

- **Approach**: merge Phase 1 unbumped under Unreleased (PR #27 as opened), merge the beads phase the same way, then the rename with the bump.
- **Rejected because**: the beads phase is itself a workflow-contract change, so it could not merge unbumped under fact 2; Phase 2 rewrites lines Phase 1 touched, so an early merge would ship text that is replaced within the same release; nobody consumes main between bumps in this repository. PR #27 is held and becomes the 3.0.0 PR.
- **Trade-offs**: smaller review units against churn on main and two extra merge-and-rebase cycles with no reader.

### Option: Keep git mode and make it work with export.auto

- **Approach**: what Phase 1's D6 did: state the export condition and keep the commit-`.beads/` step.
- **Rejected because**: beads' docs say the JSONL is not sync and the Dolt directory is not for git; keeping the mode alive documents a path beads does not support. D6's text stays true as a description of the export flag and is folded into the tiers.
- **Trade-offs**: a smaller change against continuing to teach a model the tool has left behind.

### Option: Keep the duplicated tier-rule paragraph and correct its wording

- **Approach**: change "opus ... default when unsure" to sonnet in reference.md.
- **Rejected because**: the paragraph drifted once already; a fourth copy of the rule is the cause, not the wording.

## Pending Decisions

None. The bundle, the names, and the release shape were confirmed in conversation on 2026-09-05 and 2026-09-06 before this document was written; the beads realignment, the orientation hook, and the intent model were decided on 2026-09-06 (prompts-my1i, prompts-k0ub).

Deferred to execution planning, from the exploration record: the Intent section's exact shape and amendment line; how create_project phrases confirmation of an inferred intent; each stage's intake wording and the map's "did enough" column; whether validate_execution's per-statement echo is written into the README or only reported.

## References

- Research: [research.md](research.md)
- Prior decision: beads `prompts-xn4` (create_execution → create_tasks, additive alias, stub removed at 3.0.0)
- Related issues: `prompts-h7c`, `prompts-vwo`, `prompts-3ke`
- Release process: `RELEASING.md`; precedent entries `CHANGELOG.md` 2.0.0 and 2.2.0
- Prior plan: [../2026-09-01-fable-5-1-rebaseline/](../2026-09-01-fable-5-1-rebaseline/)

## Implementation Notes

Started: 2026-09-06

- Implementation began on Phase 1 (non-breaking corrections) and reached the Phase 2 checkpoint the same day; status moved from `approved` to `implementing` at that checkpoint (update_status is the writer)
- Phase 2 found that `bd orphans`, `bd preflight`, and `bd doctor` do not behave as D16 assumed on bd 1.1.0 (see tasks.md Implementation Discoveries and decision issue prompts-hsa2); D16's intent is kept with the commands described by what they do
