---
project: implement-rename-3.0
ticket: prompts-h7c
created: 2026-09-05
created_timestamp: 2026-09-06T00:23:23Z
status: in-progress
last_updated: 2026-09-06
assignee: gabe@vare.la
# progress fields below are maintained by /wb:update_status — do not hand-edit
current_phase: 4
total_tasks: 43
completed_tasks: 34
git_commit: dc801dca5e573064327832478adf7b98013cef0e
git_branch: worktree-implement-rename-3.0
repository: gvarela/workbench
tags: [tasks, tracking, implement-rename-3.0]
depends_on: [research.md, design.md]
beads_epic: prompts-tq7
beads_phases:
  phase1_milestone: prompts-1ng
  phase2_milestone: prompts-tq7.1
  phase3_milestone: prompts-tq7.2
  phase4_milestone: prompts-tq7.3
  phase5_milestone: prompts-h1y
beads_tasks:
  # Phase 1 tasks (closed)
  phase1_impl_1: prompts-33l
  phase1_impl_2: prompts-ds5
  phase1_impl_3: prompts-4ni
  phase1_impl_4: prompts-fr8
  phase1_impl_5: prompts-nqw
  phase1_impl_6: prompts-97q
  phase1_test_1: prompts-32z
  phase1_integration_1: prompts-f00
  # Phase 2 tasks
  phase2_impl_1: prompts-kbtd
  phase2_impl_2: prompts-5gih
  phase2_impl_3: prompts-9zcc
  phase2_impl_4: prompts-xq7u
  phase2_impl_5: prompts-0f83
  phase2_impl_6: prompts-c4zv
  phase2_impl_7: prompts-w9mu
  phase2_impl_8: prompts-3x9r
  phase2_impl_9: prompts-od3u
  phase2_impl_10: prompts-htvl
  phase2_test_1: prompts-hj95
  # Phase 3 tasks
  phase3_impl_1: prompts-vza4
  phase3_impl_2: prompts-ssif
  phase3_impl_3: prompts-vja0
  phase3_impl_4: prompts-6tz5
  phase3_impl_5: prompts-nxhu
  phase3_impl_6: prompts-w34t
  phase3_impl_7: prompts-p5zx
  phase3_impl_8: prompts-tark
  phase3_test_1: prompts-kxhj
  # Phase 4 tasks
  phase4_impl_1: prompts-dfwy
  phase4_impl_2: prompts-scjh
  phase4_impl_3: prompts-kk2p
  phase4_impl_4: prompts-uadx
  phase4_impl_5: prompts-wtp5
  phase4_test_1: prompts-a9uh
  # Phase 5 tasks
  phase5_impl_1: prompts-q4fm
  phase5_impl_2: prompts-on4
  phase5_impl_3: prompts-oxe
  phase5_impl_4: prompts-mcvf
  phase5_impl_5: prompts-8d5t
  phase5_impl_6: prompts-o5q4
  phase5_impl_7: prompts-irau
  phase5_test_1: prompts-84lh
  phase5_integration_1: prompts-30s1
---

# Execution Plan: implement-rename-3.0

## Overview

Implementing the 3.0.0 release as specified in design.md (D1 through D20): the beads-model realignment and wb-prime, the intent model and stateful help, the maintainer beads guide, and the rename of `implement_coordinated` to `implement` and `implement_tasks` to `implement_inline` with aliases, plus the `create_execution` removal and the cut.

**Design Approach**: alias-rename-bundled-major, restructured 2026-09-06 into five phases on one branch and one PR (design.md D9)
**Target State**: design.md "Success Metrics", as revised 2026-09-06

## Implementation Strategy

### Phase Rationale

One branch, one PR (design.md D9): PR #27 is held as the running review surface and merges once with the bump and tag. Phase checkpoints are the phase report plus Gabe's go-ahead. Order: every content change lands on the current file paths before the directory move, so git still detects the moves as renames; the contract inventory (Phase 4) runs after the skill text is final; the cut is last.

1. **Non-breaking corrections** (done; commits 066153e through 29f6385).
2. **Beads-model realignment and wb-prime** (D11 to D16, D18): the beads reference and playbook, the mode-conditional steps in nine skills, both hooks and the manifest, validate_project, root and maintainer docs.
3. **Intent model and stateful help** (D19, D20): create_project and its README template, the per-stage obligations in five stage skills, the map in help and every stage's intake, help made stateful.
4. **Beads guide and contract audit** (D17): the audit of every bd reference, the guide, the CLAUDE.md rule, the version floor.
5. **Rename, aliases, removal, and the 3.0.0 cut** (D1 to D5, D10).

Based on dependency analysis:

- Phase 2 and Phase 3 touch the same skill files (implement_tasks, implement_coordinated, create_handoff, resume_handoff, update_status, help, create_tasks); Phase 2 finishes first, and inside each phase, tasks that edit the same file are serialized with file-overlap edges.
- wb-prime (2.6) must exist before Phase 3 adds the map summary to it (3.6) and before the docs sweep names it (2.9).
- The Intent section shape (3.1) is consumed by every obligation task (3.2 to 3.5), and the map (3.6) is written after the obligations because its "did enough" column names their evidence.
- Phase 5's sweeps (5.5, 5.6) now also cover `plugin/hooks/wb-prime.sh` and `docs/beads-guide.md`, which name the implementation skills.
- Every line number below is at HEAD of the branch on 2026-09-06 (commit fc5c0cc); re-read before editing, since earlier tasks in the same phase move lines.

### Testing Strategy

No test framework (research.md §12). Mechanisms, with recipes recorded in the verification tasks:

- **Grep audits**: each task states the grep and its expected result.
- **Per-file lint delta**: `git show <base>:<file> > $CLAUDE_JOB_DIR/tmp/baseline.md; ./plugin/scripts/lint $CLAUDE_JOB_DIR/tmp/baseline.md` versus `./plugin/scripts/lint <file>`; clean means no finding the baseline lacks. `lint --all` exits 1 on the 27-file backlog and is not a gate.
- **Hook scripts on stdin**: `echo '{"hook_event_name":"SessionStart","source":"startup"}' | time plugin/hooks/<script>` with the `startup`, `resume`, `clear`, and `compact` variants; expected stdout, exit 0, under 100ms; `grep -n '\bbd ' <script>` → none.
- **Headless `--plugin-dir` runs**: `claude --plugin-dir plugin --model sonnet -p "<prompt>" --output-format stream-json --verbose --max-turns N`, grepping for `"skill":"wb:<name>"` events and fixed phrases. Runs stop at the first write permission prompt; to observe a written file, run in a scratch git repository under `$CLAUDE_JOB_DIR/tmp/` with permission prompts disabled for that run only, or interactively.
- **Script-level stubs**: for the drift hook's remote-configured branch, a stub `bd` on PATH under `$CLAUDE_JOB_DIR/tmp/` that answers `config get sync.remote`, so no real remote is ever configured.

Suggested worker models: sonnet at `effort: xhigh` for every task; fable only on a verified failure.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status**:

- Phase 1: milestone `prompts-1ng` - 8 tasks, all closed
- Phase 2: milestone `prompts-tq7.1` - 11 tasks, all closed; milestone open pending Gabe's checkpoint go-ahead
- Phase 3: milestone `prompts-tq7.2` - 9 tasks, all closed; milestone open pending Gabe's checkpoint go-ahead
- Phase 4: milestone `prompts-tq7.3` - 6 tasks (one added at the Phase 3 checkpoint), all closed; milestone open pending Gabe's checkpoint go-ahead
- Phase 5: milestone `prompts-h1y` - 9 tasks; eight closed, the merge-and-tag task open for Gabe; milestone open pending the cut

Use `bd show [milestone-id]` to see which tasks block each phase milestone.

---

## Phase 1: Non-Breaking Corrections (done)

### Phase 1 Objective

Land the lint exit code fix, the beads persistence correction, the reference.md pointer, and the RELEASING.md bundling rule on the current paths.

### Phase 1 What Landed

- 066153e `plugin/scripts/lint`: here-string loop, `--fix` exits 1 on remaining findings (prompts-33l)
- 927466f `plugin/docs/reference/beads-mode.md`: Persistence Mechanics states the `export.auto` condition (prompts-ds5); Phase 2 rewrites this file again
- e40d84b seven skills, f324a6a three docs: auto-flush claim removed (prompts-4ni, prompts-fr8)
- e9a2a23 `implement_coordinated/reference.md`: tier paragraph replaced by a pointer (prompts-nqw)
- 29f6385 `RELEASING.md` six-item Process list; `CHANGELOG.md` Unreleased section (prompts-97q); Phase 2 amends the Process list again for the one-PR rule
- Verification (prompts-32z): fifteen checks and fourteen per-file lint deltas passed; `lint --all` backlog is 27 files
- Draft PR #27 opened (prompts-f00), then held on 2026-09-06 as the running review surface for the whole branch

### Phase 1 Tasks

- Fix the lint exit code → `[beads:phase1_impl_1]`
- Rewrite Persistence Mechanics in beads-mode.md → `[beads:phase1_impl_2]`
- Remove the auto-flush claim from seven skills → `[beads:phase1_impl_3]`
- Remove the auto-flush claim from three docs → `[beads:phase1_impl_4]`
- Replace the reference.md tier paragraph with a pointer → `[beads:phase1_impl_5]`
- Amend the RELEASING.md Process list; add CHANGELOG Unreleased → `[beads:phase1_impl_6]`
- Phase 1 verification → `[beads:phase1_test_1]`
- Open the Phase 1 PR (now the branch's running PR) → `[beads:phase1_integration_1]`

### ⛔ CHECKPOINT: Phase 1 Complete

1. ✅ All Phase 1 task beads issues closed
2. ✅ Automated verification passed (prompts-32z)
3. ✅ Human confirmation: Gabe's go-ahead on 2026-09-06 ("design approved create the tasks"), PR #27 held per D9
4. Close milestone `prompts-1ng` as the first act of Phase 2; prompts-vwo and prompts-3ke close at the cut, when their fixes ship

---

## Phase 2: Beads-Model Realignment and wb-prime

### Phase 2 Objective

Rewrite the beads reference and playbook around beads' own model; remove every commit-`.beads/` instruction and `BEADS_MODE` reference; replace the two SessionStart hooks with wb-prime and redirect the SessionEnd hook to remote-or-silence; add the session-start sanity check; update validate_project and the maintainer docs. Design D11 through D16, D18.

### Phase 2 Prerequisites

- [ ] Phase 1 checkpoint confirmed; `bd close prompts-1ng`
- [ ] Branch at or after fc5c0cc

### Phase 2 Changes Required

#### 1. beads-mode.md rewritten around the model

**File**: `plugin/docs/reference/beads-mode.md` (51 lines; headings at 1, 5, 17, 24, 39)

**Current State** (research.md §15): title "Beads Modes: Stealth vs Git"; line 3 describes the SessionStart hook and `BEADS_MODE`; lines 5-15 the two-mode table; 17-22 Persistence Mechanics (Phase 1 text); 24-37 the git-mode commit block; 39-51 mode validation against `$BEADS_MODE`.

**Target State** (design D11, D12, D14, D15, D16): title "Beads in the wb workflow". Sections, in order: **Setup** (the decision rule: `bd init --stealth` for any repository with collaborators who do not use beads, writing the shared `.git/info/exclude`; `bd init --setup-exclude` where beads already exists; the contributor role when the database should live outside the repo; plain `bd init` only for a repository the user owns, still with `.beads/` excluded; `.gitignore`-based ignoring is branch-dependent and second-best). **Persistence** (three tiers: the local database, always; a Dolt remote or `bd backup` for cross-machine, with `bd dolt push`/`pull`, `bd backup init <url>`, `bd backup sync`; JSONL export for viewers and interchange only, with the Phase 1 `export.auto` facts folded in). **What a session does at close** (one question: `bd config get sync.remote` or `bd config get backup.enabled` non-empty → `bd dolt push` or `bd backup sync`; else nothing). **Worktrees** (the four facts from research.md §14). **Session-start sanity check** (the three commands: `bd context` for the database name, `bd show <beads_epic>` from tasks.md frontmatter, `bd stats`; stop with the playbook's wrong-database message when the epic does not resolve; skipped when frontmatter has no `beads_epic`; `bd version` compared to the floor the playbook states). **Hygiene** (`bd doctor` at session close; `bd preflight` before a PR; `bd stale`, `bd orphans`, `bd lint` with one line each). **Memory** (`bd remember` is workspace-wide across every plan in the repository; memories are excluded from `bd export` by default; only a Dolt remote carries them). No `BEADS_MODE`, no two-mode table, no commit block.

#### 2. beads-not-initialized.md

**File**: `plugin/docs/reference/beads-not-initialized.md` (26 lines; init lines 13-14; diagnose step at 23 names `bd status`)

**Target State** (D11, D14, D17): the init block shows `bd init --stealth` first with the one-line rule, then `bd init` for a repository the user owns; a second case, "Wrong database", with the message the sanity check prints when `bd show <epic>` fails ("The database bd resolved (`<name>`, from `bd context`) is not the one this plan was tracked in; check `.beads/metadata.json` and `bd context`, then rerun"), and the version floor: "Requires bd 1.1.0 or later (`bd version`)". Diagnose step keeps `bd info` and adds `bd context` and `bd doctor`.

#### 3. Skills sweep A: implementation skills and create_tasks

**Files and lines**: `plugin/skills/implement_tasks/SKILL.md:148, 399-404, 530, 566`; `plugin/skills/implement_coordinated/SKILL.md:133, 373-378`; `plugin/skills/implement_coordinated/reference.md:36`; `plugin/skills/create_tasks/SKILL.md:160`.

**Target State** (D12, D16): "Mode is already detected" sentences become "Persistence: see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md); nothing to detect." The Step 7 "Persist beads state" blocks become the one-question step: `if bd config get sync.remote 2>/dev/null | grep -qv "not set"; then bd dolt push; fi` with a comment pointing at the reference doc, and no `git add`. Lines 530 and 566 become "Push to the Dolt remote if one is configured". reference.md:36 `mode: "$BEADS_MODE"` is deleted from the context package. The `bd remember` step in both implementation skills gains the two memory facts from D16.

#### 4. Skills sweep B: handoff, resume, status, help

**Files and lines**: `plugin/skills/create_handoff/SKILL.md:124-132, 148-149`; `plugin/skills/resume_handoff/SKILL.md:70, 86-87, 96-97`; `plugin/skills/update_status/SKILL.md:58, 235-253`; `plugin/skills/status-sync/SKILL.md:30, 48-49`; `plugin/skills/help/SKILL.md:104, 149-163`.

**Target State** (D12, D13, D16): create_handoff Step 3 becomes the one-question step plus D13's sentence: "Without a remote or backup, this handoff document is the only artifact that crosses machines, and the plan's beads IDs will not resolve elsewhere; see beads-mode.md to set up continuity." Lines 148-149 become the three tiers in two bullets. resume_handoff:70 drops the parenthetical; 86-87 become "Persistence: see beads-mode.md"; 96-97 become "Counts should match if no work was done since the handoff; a large mismatch or zero issues means the sanity check (Step 3) applies." update_status Step 8 becomes the one-question step; 251-253 become one sentence. status-sync:30 becomes "A Dolt remote is configured but nothing has been pushed this session"; 48-49 become the one-question reminder. help:104 becomes `# push to the Dolt remote if one is configured (see plugin/docs/reference/beads-mode.md)`; the "Beads + Git Workflow" block (149-163) becomes "Beads persistence": the three tiers in six lines, no `git add .beads/`. create_handoff's Critical Discoveries memory review gains the two memory facts.

#### 5. Session-start sanity check

**Files**: `plugin/skills/resume_handoff/SKILL.md` (Step 1 item 5, lines 83-93), `plugin/skills/implement_tasks/SKILL.md` (Step 2, near line 144), `plugin/skills/implement_coordinated/SKILL.md` (Step 2, near line 129), `plugin/skills/update_status/SKILL.md` (Step 1), `plugin/skills/validate_execution/SKILL.md` (Step 1 Context Discovery, line 51), `plugin/skills/create_tasks/SKILL.md` (Step 5a, line 153)

**Target State** (D14): each site carries the same block: read `beads_epic` from tasks.md frontmatter; if present, run `bd context`, `bd show <epic>`, `bd stats`; on a failed `bd show`, present the playbook's Wrong database message and stop; if absent, note "plan predates beads tracking, sanity check skipped" and continue. create_tasks runs it only when the frontmatter already carries an epic (a re-run). Serialized after tasks 2.3 and 2.4 (same files).

#### 6. wb-prime

**Files**: `plugin/hooks/wb-prime.sh` (new), `plugin/hooks/compact-recovery.sh` (deleted), `plugin/.claude-plugin/plugin.json:17-37` (SessionStart array), plus a new `PreCompact` array

**Current State**: manifest SessionStart has the mode hook (line 22) and compact-recovery with `matcher: "compact"` (27-36); compact-recovery.sh (32 lines) greps the payload for `"compact"`, scans `docs/plans/*/tasks.md` for non-complete status, prints the recovery block.

**Target State** (D18): one script. Contract: reads stdin; exits 0 silently on empty payload; under 100ms; no `bd`; plain text. Modes: payload containing `"compact"` (SessionStart compact) or a PreCompact event → exactly compact-recovery's current text; otherwise (startup, resume, clear) → the orientation, under forty lines: the stage chain with what each stage requires from the previous one; `docs/plans/<date>-<name>/` and the three documents; beads holds status, markdown holds the plan; checkpoints stop for a human; the sanity check (three commands); the active plans from the same scan; `/wb:help` for the long form; last line "If this output is truncated by your host, read the full persisted hook output." `--export` prints the default orientation and exits; if `.claude/wb/PRIME.md` exists in the cwd its contents replace the orientation (not the compact mode). Manifest: SessionStart entry with no matcher running wb-prime; the compact-recovery entry removed; a `PreCompact` array with the same command. The mode-hook entry is removed by task 2.7 (same file; serialize 2.7 after 2.6). Phase 3 adds the map summary; leave a marker comment `# map summary (Phase 3)` where it goes.

#### 7. Drift hook redirected; mode hook removed

**Files**: `plugin/hooks/beads-drift-check.sh` (17 lines; decision lines 6-16), `plugin/hooks/setup-beads-mode.sh` (deleted), `plugin/.claude-plugin/plugin.json:18-26` (mode hook entry deleted)

**Target State** (D12): drift check: if `bd config get sync.remote` reports a value (not "not set") and `bd dolt status` or equivalent is unavailable, emit `{"systemMessage": "📍 Beads: a Dolt remote is configured — run bd dolt push before ending the session."}`; otherwise exit 0 silently. No `git status` on `.beads/`, no `check-ignore`. Keep the SessionEnd manifest entry. Note the hook now calls bd once at SessionEnd; keep the timeout at 5.

#### 8. validate_project

**File**: `plugin/skills/validate_project/SKILL.md:144-184` (Step 2 mode check), Checklist item 7 Dependencies (line 93) and the orphan logic under it

**Target State** (D12, D16): Step 2 keeps `bd info`, adds the sanity-check commands, and replaces the mode block with one check: `if [ -d .beads ] && ! git check-ignore -q .beads/ 2>/dev/null; then echo "⚠️  .beads/ is tracked or unignored — beads' Dolt directory is never meant to be committed; run bd init --stealth (or --setup-exclude)"; fi`. The orphan check calls `bd orphans` and reports its output instead of grepping titles.

#### 9. Root and maintainer docs sweep

**Files and lines** (inventory A1, A9): `CLAUDE.md:15` (hook description → wb-prime), `:113-136` (add `bd doctor` to the session close list at 216-219; the beads rule list), `:210, 218` (already stealth; align wording to the tiers); `README.md:110-111, 130-139`; `docs/commands-reference.md:54, 75-76, 79`; `docs/workbench-workflow-guide.md:29, 420-448, 495-499, 520-527, 844, 849, 861`; `docs/beads-integration-learnings.md:154` (historical, keep) and `:258` (keep); `plugin/skills/doc-adherence/SKILL.md:61` (compact-recovery → wb-prime).

**Target State**: README hooks list: SessionStart wb-prime (orientation; recovery on compact), SessionEnd remote reminder, PostToolUse lint; Beads Integration block: `bd init --stealth` with the rule, a pointer to the reference doc, the bd floor. workflow guide 420-448: "Beads Modes" becomes "Beads persistence" with the three tiers and the setup rule, no `BEADS_MODE` snippet; 495-527 and 844-849: the one-question step. commands-reference 75-79: same. CLAUDE.md session protocol gains `bd doctor`.

#### 10. CHANGELOG Unreleased, Phase 2 entries

**File**: `CHANGELOG.md:5-16`

**Target State**: under Unreleased add `### ⚠️ Breaking / Requirements`: `BEADS_MODE` and `hooks/setup-beads-mode.sh` removed; the commit-`.beads/` guidance removed everywhere (stop committing it; exclude it; use `bd backup` or a Dolt remote for continuity); `hooks/compact-recovery.sh` replaced by `hooks/wb-prime.sh`; requires bd 1.1.0. `### Added`: wb-prime (orientation on startup/resume/clear, recovery on compact and PreCompact, `.claude/wb/PRIME.md` override, `--export`); the session-start sanity check; `bd doctor` in the close protocol; `bd orphans` in validate_project. `### Changed`: beads-mode.md rewritten (setup rule, three tiers, worktrees, hygiene, memory); drift hook now reminds only when a remote is configured. Keep the Phase 1 bullets.

### Phase 2 Tasks

**Note**: Task status is tracked ONLY in beads.

#### Phase 2 Implementation Tasks

- Rewrite `plugin/docs/reference/beads-mode.md` around beads' model (Setup, Persistence, Close, Worktrees, Sanity check, Hygiene, Memory) → `[beads:phase2_impl_1]`
  - Verify: `grep -c "^## " plugin/docs/reference/beads-mode.md` → 7; `grep -n "BEADS_MODE\|git add .beads\|Git mode\|git mode" plugin/docs/reference/beads-mode.md` → none; `grep -c "bd backup\|bd dolt push\|info/exclude\|bd context\|bd doctor" plugin/docs/reference/beads-mode.md` → 5 or more
- Rewrite `plugin/docs/reference/beads-not-initialized.md`: setup rule, Wrong database case, version floor → `[beads:phase2_impl_2]`
  - Verify: `grep -n "Wrong database\|1.1.0\|--stealth" plugin/docs/reference/beads-not-initialized.md` → 3 lines or more; `grep -n "git mode" plugin/docs/reference/beads-not-initialized.md` → none
- Skills sweep A: implement_tasks, implement_coordinated (SKILL.md and reference.md), create_tasks → `[beads:phase2_impl_3]`
  - After 2.1 (pointer wording); verify: `grep -n "BEADS_MODE\|git add .beads\|git mode\|Git mode" plugin/skills/implement_tasks/SKILL.md plugin/skills/implement_coordinated/SKILL.md plugin/skills/implement_coordinated/reference.md plugin/skills/create_tasks/SKILL.md` → none; `grep -c "sync.remote" plugin/skills/implement_tasks/SKILL.md plugin/skills/implement_coordinated/SKILL.md` → 1 each; `grep -c "excluded from" plugin/skills/implement_tasks/SKILL.md` → 1
- Skills sweep B: create_handoff, resume_handoff, update_status, status-sync, help → `[beads:phase2_impl_4]`
  - After 2.1; verify: `grep -n "BEADS_MODE\|git add .beads\|git mode\|Git mode\|Stealth mode" plugin/skills/create_handoff/SKILL.md plugin/skills/resume_handoff/SKILL.md plugin/skills/update_status/SKILL.md plugin/skills/status-sync/SKILL.md plugin/skills/help/SKILL.md` → none; `grep -c "only artifact that crosses machines" plugin/skills/create_handoff/SKILL.md` → 1; `grep -c "Beads persistence" plugin/skills/help/SKILL.md` → 1
- Insert the session-start sanity check into resume_handoff, implement_tasks, implement_coordinated, update_status, validate_execution, create_tasks → `[beads:phase2_impl_5]`
  - After 2.2 (message text), 2.3 and 2.4 (same files); verify: `grep -l "bd context" plugin/skills/{resume_handoff,implement_tasks,implement_coordinated,update_status,validate_execution,create_tasks}/SKILL.md | wc -l` → 6; `grep -c "sanity check skipped" plugin/skills/resume_handoff/SKILL.md` → 1
- Write `plugin/hooks/wb-prime.sh`, delete compact-recovery.sh, register wb-prime on SessionStart (all triggers) and PreCompact → `[beads:phase2_impl_6]`
  - Verify: startup, resume, clear payloads print the orientation (under 40 lines, first line fixed, last line the truncation sentence); compact payload prints compact-recovery's text; empty stdin exits 0 silently; `time` under 100ms; `grep -n '\bbd ' plugin/hooks/wb-prime.sh` → none; `plugin/hooks/wb-prime.sh --export | wc -l` → under 40; with `.claude/wb/PRIME.md` present in a scratch cwd the override prints instead; `jq '.hooks.SessionStart | length' plugin/.claude-plugin/plugin.json` → 2 until 2.7 removes the mode entry; `jq '.hooks.PreCompact | length'` → 1; `test -f plugin/hooks/compact-recovery.sh; echo $?` → 1
- Redirect `beads-drift-check.sh` to remote-or-silence; delete setup-beads-mode.sh and its manifest entry → `[beads:phase2_impl_7]`
  - After 2.6 (manifest file overlap); verify: `plugin/hooks/beads-drift-check.sh < /dev/null; echo $?` → empty, 0; with the stub `bd` on PATH answering a remote, stdout carries the push reminder and exit 0; `test -f plugin/hooks/setup-beads-mode.sh; echo $?` → 1; `jq '.hooks.SessionStart | length' plugin/.claude-plugin/plugin.json` → 1; `grep -c "check-ignore\|git status" plugin/hooks/beads-drift-check.sh` → 0
- validate_project: replace the mode block with the tracked-`.beads/` warning; use `bd orphans` → `[beads:phase2_impl_8]`
  - Verify: `grep -n "BEADS_MODE\|Git mode\|Stealth mode" plugin/skills/validate_project/SKILL.md` → none; `grep -c "bd orphans" plugin/skills/validate_project/SKILL.md` → 1; `grep -c "never meant to be committed" plugin/skills/validate_project/SKILL.md` → 1
- Root and maintainer docs sweep (CLAUDE.md, README.md, commands-reference, workflow guide, doc-adherence) → `[beads:phase2_impl_9]`
  - After 2.1 and 2.6 (names the new sections and script); verify: `grep -rn "BEADS_MODE\|git add .beads\|setup-beads-mode\|compact-recovery" plugin CLAUDE.md README.md docs | grep -v docs/plans | grep -v "beads-integration-learnings.md:154"` → none; `grep -c "wb-prime" README.md CLAUDE.md` → 1 or more each; `grep -c "bd doctor" CLAUDE.md` → 1 or more
- CHANGELOG Unreleased: Phase 2 Breaking, Added, Changed entries → `[beads:phase2_impl_10]`
  - After 2.6 and 2.7 (describes them); verify: `sed -n '5,40p' CHANGELOG.md | grep -c "^### "` → 4 (Breaking, Added, Changed, Fixed); `grep -c "wb-prime\|BEADS_MODE" CHANGELOG.md` → 2 or more

#### Phase 2 Testing Tasks

- Phase 2 verification → `[beads:phase2_test_1]`
  - After 2.1 through 2.10. Recipes: the two sweep greps (`git add .beads`, `BEADS_MODE`) empty outside docs/plans and the one historical learnings line; every task grep; wb-prime on all four payloads with timing; headless `-p "what is the first line of the wb orientation you received at session start"` with `--max-turns 1` shows a fixed orientation phrase in the stream; the wrong-database recipe (a scratch plan whose frontmatter names `beads_epic: prompts-doesnotexist`, headless `-p "resume the plan at docs/plans/2026-01-01-fake"`, grep for "not the one this plan was tracked in"); validate_project headless on this plan shows no mode vocabulary and no tracked warning; per-file lint deltas on every touched markdown file; three real `--plugin-dir` sessions noted toward the canary count

### Phase 2 Success Criteria

#### Phase 2 Automated Verification

- [ ] Every grep above returns its stated result
- [ ] wb-prime and the drift hook pass their stdin recipes
- [ ] Per-file lint delta zero on every touched file

#### Phase 2 Manual Verification

- [ ] Gabe reads the rewritten beads-mode.md and the orientation text and gives the go-ahead

### Phase 2 Modified Files

- `plugin/docs/reference/beads-mode.md`, `plugin/docs/reference/beads-not-initialized.md`
- `plugin/skills/{implement_tasks,implement_coordinated,create_tasks,create_handoff,resume_handoff,update_status,status-sync,help,validate_project,validate_execution,doc-adherence}/SKILL.md`, `plugin/skills/implement_coordinated/reference.md`
- `plugin/hooks/wb-prime.sh` (new), `plugin/hooks/beads-drift-check.sh`, `plugin/hooks/compact-recovery.sh` (deleted), `plugin/hooks/setup-beads-mode.sh` (deleted), `plugin/.claude-plugin/plugin.json`
- `CLAUDE.md`, `README.md`, `docs/commands-reference.md`, `docs/workbench-workflow-guide.md`, `CHANGELOG.md`

#### 📝 Modified Files (Phase 2, as landed)

Ten task commits, c472ce0 through 44581ea, 25 files, +380/−267. No test files (docs plugin).

- `plugin/docs/reference/beads-mode.md` - rewritten: seven sections (Setup, Persistence, What a session does at close, Worktrees, Session-start sanity check, Hygiene, Memory)
- `plugin/docs/reference/beads-not-initialized.md` - three cases (Beads not initialized, Wrong database, A bd command fails); bd 1.1.0 floor
- `plugin/hooks/wb-prime.sh` - new; `plugin/hooks/compact-recovery.sh` and `plugin/hooks/setup-beads-mode.sh` - deleted; `plugin/hooks/beads-drift-check.sh` - remote-or-silence; `plugin/.claude-plugin/plugin.json` - SessionStart (wb-prime, no matcher), PreCompact (wb-prime), SessionEnd unchanged
- `plugin/skills/implement_tasks/SKILL.md`, `plugin/skills/implement_coordinated/SKILL.md`, `plugin/skills/implement_coordinated/reference.md`, `plugin/skills/create_tasks/SKILL.md` - sweep A plus the sanity check
- `plugin/skills/create_handoff/SKILL.md`, `plugin/skills/resume_handoff/SKILL.md`, `plugin/skills/update_status/SKILL.md`, `plugin/skills/status-sync/SKILL.md`, `plugin/skills/help/SKILL.md` - sweep B; resume_handoff and update_status also carry the sanity check
- `plugin/skills/validate_execution/SKILL.md` - sanity check; `plugin/skills/validate_project/SKILL.md` - sanity check, unignored-`.beads/` warning, `bd orphans`; `plugin/skills/doc-adherence/SKILL.md` - wb-prime reference
- `CLAUDE.md`, `README.md`, `docs/commands-reference.md`, `docs/workbench-workflow-guide.md` - three-tier model, setup rule, hook names, `bd doctor`, `--claim`
- `CHANGELOG.md` - Unreleased: Breaking / Requirements, Added, Changed, Fixed
- `docs/plans/2026-09-05-prompts-h7c-implement-rename-3.0/tasks.md` - discoveries and notes

**Quick verification commands:**

```bash
grep -rn "BEADS_MODE\|git add .beads\|setup-beads-mode\|compact-recovery" plugin CLAUDE.md README.md docs | grep -v docs/plans   # one historical learnings line only
echo '{"hook_event_name":"SessionStart","source":"startup"}' | time plugin/hooks/wb-prime.sh
./plugin/scripts/lint --all | grep -c "Issues found in"   # 27, the pre-existing backlog
```

### ⛔ CHECKPOINT: Phase 2 Complete

1. ✅ All Phase 2 task beads issues closed; milestone `prompts-tq7.1` closed
2. ✅ Automated verification passing
3. ✅ Gabe's go-ahead on the phase report
4. ✅ Reconcile plan-doc status via `/wb:update_status`

---

## Phase 3: Intent Model and Stateful Help

### Phase 3 Objective

Give every plan an Intent section written at creation, make each stage owe it something, publish the human-input map, and make help report position and gaps. Design D19, D20.

### Phase 3 Prerequisites

- [ ] Phase 2 checkpoint confirmed; `bd close prompts-tq7.1`

### Phase 3 Changes Required

#### 1. create_project: intent intake and README Intent section

**Files**: `plugin/skills/create_project/SKILL.md:14-35` (Initial Response), `:82-102` (Step 4); `plugin/skills/create_project/templates.md:14-16` (Overview)

**Target State** (D19): Initial Response gains a fourth input, intent, taken from the invoking prose when present ("I read the goal as: … Success looks like: … Non-goals: … Correct?") and asked for otherwise, in one exchange; the skill does not write files with the section empty. templates.md: `## Overview` becomes `## Intent` with `**Goal**: [one sentence]`, `**Success looks like**:` (two to four observable statements as a list), `**Non-goals**:` (list), and a trailing `**Amendments**:` list that starts empty, followed by the existing Documentation Structure. The Step 5 confirmation prints the Intent back. Initial Response also gains the D20 line: "This stage needs from you: the goal, what success looks like, and what is out of scope."

#### 2. create_research: question from the Goal; coverage at completion

**Files**: `plugin/skills/create_research/SKILL.md:31-49` (Initial Response), `:69` (Step 3), `:176-207` (Step 8); `plugin/skills/create_research/templates.md` (research.md template)

**Target State** (D19): Step 1 reads the README Intent section when present; if the invoking prompt gives no research question, the skill derives one from the Goal and confirms it; Step 3 decomposes against the success statements. Step 8's summary gains "Intent coverage: statements the findings bear on: …; statements the findings do not touch: …". templates.md research.md gains an `## Intent Coverage` section after Summary with the same two lists. Initial Response gains "This stage needs from you: the research question, or a confirmation of the one derived from the goal." Plans without an Intent section: coverage lines say "no Intent section (plan predates 3.0.0)".

#### 3. explore_design: frame against the Goal

**File**: `plugin/skills/explore_design/SKILL.md:52` (Initial Response), `:139-160` (Step 2)

**Target State** (D19): Step 2's framing block gains a first line "Goal (from README Intent): …" and the constraint list names success statements the decision bears on; Step 6's Decide: description cites the Goal. Initial Response gains "This stage needs from you: reactions to directions and an explicit approval of one." An amendment to the Goal made here is a dated line under the README's Amendments.

#### 4. create_design: refine statements into metrics; amendment rule

**Files**: `plugin/skills/create_design/SKILL.md:27` (Initial Response), `:123-143` (Step 3); `plugin/skills/create_design/templates.md:20-27`

**Target State** (D19): Step 3 item 2 becomes "Refine each Intent success statement into a measurable metric; every metric names the statement it refines; a statement with no metric is listed as deferred with a reason"; item 1 traces the Problem Statement to the Goal; a new item 4: "If refinement changes the Goal or a Non-goal, create a Decide: issue and append a dated line under the README's Amendments before writing design.md." templates.md Success Metrics become `- [metric] (refines: [statement])`. Initial Response gains "This stage needs from you: approval of the approach and of the refined metrics."

#### 5. create_tasks and validate_execution

**Files**: `plugin/skills/create_tasks/SKILL.md:43` (Initial Response), `plugin/skills/create_tasks/templates.md:27, 82` (Target State); `plugin/skills/validate_execution/SKILL.md:31` (Initial Response), `:138-142` (Step 5), `plugin/skills/validate_execution/templates.md` (Validation Report Template)

**Target State** (D19): Target State reads "from design.md Success Metrics (each refining an Intent statement)". validate_execution's report gains a "Verdict per Intent statement" table (statement, refining metrics, PASS/FAIL, evidence) and Step 6 appends the verdict beside each statement in the README Intent section as `→ PASS (date)` or `→ FAIL (date)`; plans without an Intent section get the table with "no Intent section". Initial Response lines: create_tasks "This stage needs from you: confirmation that the phases and checkpoints match how you want to review"; validate_execution "This stage needs from you: the manual checks only you can run."

#### 6. The map, everywhere it renders

**Files**: `plugin/skills/help/SKILL.md` (new section after Command Workflow, line 62); `plugin/hooks/wb-prime.sh` (the marker from 2.6); the Initial Response of the stages not covered by 3.1 to 3.5: `create_product_research:40`, `create_mockup:26`, `implement_tasks:14`, `implement_coordinated:23`, `validate_project:12`, `create_handoff:25`, `resume_handoff:27`, `update_status:26`

**Target State** (D20): help gains `## What each stage needs from you`, a table with columns Stage, You provide, You decide, You confirm, How you know it did enough, one row per workflow stage; the "did enough" column names the evidence from 3.2 to 3.5 (intent coverage lists, traced metrics, per-statement verdicts, closed milestone). wb-prime's orientation gains a five-line summary (research needs a question, design needs approval of approach and metrics, tasks needs phase confirmation, implementation stops at checkpoints, validation needs your manual checks). Each listed stage's Initial Response gains its one "This stage needs from you" line. After 3.2 to 3.5 (their evidence names the column; file overlap on help with 3.7).

#### 7. help made stateful

**File**: `plugin/skills/help/SKILL.md:1-5` (frontmatter), new Step section before Topics

**Target State** (D20): description becomes trigger text: "Reference for the wb workflow and, in a repository with an active plan, where you are and what's next: which documents exist and their status, epic and milestone state, open Q: and Decide: issues, what the next stage needs from you, and what the previous stage left undone. Use when the user asks where they are, what's next, what a stage needs, or how wb works. Takes an optional topic." Body: a State step first: scan `docs/plans/*/tasks.md` for non-complete plans (the wb-prime scan); for the active plan read the three documents' status fields, the README Intent, research's Intent Coverage, design's metrics, beads via `bd show <epic>` and `bd list -n 0 --status=open | grep -E "Q:|Decide:|Validate:"`; reuse validate_project's structural checks by reading its Validation Checklist rather than duplicating them. Report: position, next stage and its map row, gaps (untouched statements, untraced metrics, unreported statements, open planning issues), then the topic requested if any. Three explicit cases: no docs/plans → reference card and "no active plan here"; a plan without an Intent section → position and next stage, gaps marked "not measurable without an Intent section (plan predates 3.0.0)"; a plan with one → full report. After 3.6 (same file).

#### 8. CHANGELOG Unreleased, Phase 3 entries

**File**: `CHANGELOG.md` Unreleased

**Target State**: `### Added`: the README Intent section and create_project's intake; per-stage obligations (research coverage, design traceability and the amendment rule, validation verdicts per statement); the human-input map in help, wb-prime, and every stage's intake; help made stateful. `### Changed`: create_design's Success Metrics refine Intent statements rather than originate them.

### Phase 3 Tasks

#### Phase 3 Implementation Tasks

- create_project: intent intake, README Intent section in the template, confirmation output, needs-from-you line → `[beads:phase3_impl_1]`
  - Verify: `grep -c "## Intent" plugin/skills/create_project/templates.md` → 1; `grep -n "## Overview" plugin/skills/create_project/templates.md` → none; `grep -c "Non-goals\|Success looks like\|Amendments" plugin/skills/create_project/templates.md` → 3; `grep -c "needs from you" plugin/skills/create_project/SKILL.md` → 1; headless create_project with intent in the prompt shows no question before the first write event, and without intent shows a question first
- create_research: question from the Goal, Intent Coverage in the template and the summary, needs-from-you line → `[beads:phase3_impl_2]`
  - After 3.1 (section shape); verify: `grep -c "Intent Coverage\|do not touch" plugin/skills/create_research/SKILL.md plugin/skills/create_research/templates.md` → 2 or more each; `grep -c "needs from you" plugin/skills/create_research/SKILL.md` → 1
- explore_design: framing against the Goal, amendment line, needs-from-you line → `[beads:phase3_impl_3]`
  - After 3.1; verify: `grep -c "Goal (from README Intent)" plugin/skills/explore_design/SKILL.md` → 1; `grep -c "Amendments" plugin/skills/explore_design/SKILL.md` → 1; `grep -c "needs from you" plugin/skills/explore_design/SKILL.md` → 1
- create_design: metrics refine statements with traceability, amendment rule, template, needs-from-you line → `[beads:phase3_impl_4]`
  - After 3.1; verify: `grep -c "refines:" plugin/skills/create_design/templates.md` → 1; `grep -c "Decide:" plugin/skills/create_design/SKILL.md` → 3 or more (existing plus the amendment rule); `grep -c "needs from you" plugin/skills/create_design/SKILL.md` → 1
- create_tasks Target State wording and validate_execution per-statement verdicts with README echo; needs-from-you lines → `[beads:phase3_impl_5]`
  - After 3.1 and 3.4 (metric shape); verify: `grep -c "refining an Intent statement" plugin/skills/create_tasks/templates.md` → 1; `grep -c "Verdict per Intent statement" plugin/skills/validate_execution/templates.md` → 1; `grep -c "needs from you" plugin/skills/create_tasks/SKILL.md plugin/skills/validate_execution/SKILL.md` → 1 each
- The map: help table, wb-prime summary, needs-from-you lines in the eight remaining stages → `[beads:phase3_impl_6]`
  - After 3.2, 3.3, 3.4, 3.5 (evidence column); verify: `grep -c "What each stage needs from you" plugin/skills/help/SKILL.md` → 1; `grep -rl "needs from you" plugin/skills/*/SKILL.md | wc -l` → 14; `grep -c "map summary" plugin/hooks/wb-prime.sh` → 0 and the orientation still under 40 lines
- help made stateful: trigger-text description, State step, three cases → `[beads:phase3_impl_7]`
  - After 3.6 (same file); verify: `grep -c "where you are and what's next" plugin/skills/help/SKILL.md` → 1; `grep -c "plan predates 3.0.0" plugin/skills/help/SKILL.md` → 1; headless "where am I" in this repository fires `wb:help` and names this plan directory; "what does wb do" fires `wb:help` without a plan-position report; the same prompts in a scratch repository without docs/plans render the reference card
- CHANGELOG Unreleased: Phase 3 entries → `[beads:phase3_impl_8]`
  - After 3.7; verify: `grep -c "Intent section\|stateful\|needs from you" CHANGELOG.md` → 3 or more

#### Phase 3 Testing Tasks

- Phase 3 verification → `[beads:phase3_test_1]`
  - After 3.1 through 3.8. The create_project pair (intent present versus absent); the three help prompts in two repositories; the obligation greps; per-file lint deltas on every touched file; a scratch-repository end-to-end: create_project with intent, then a headless create_research whose summary lists Intent coverage; three real `--plugin-dir` sessions noted

### Phase 3 Success Criteria

#### Phase 3 Automated Verification

- [ ] Every grep above returns its stated result; headless routing checks pass including the negative case
- [ ] Per-file lint delta zero

#### Phase 3 Manual Verification

- [ ] Gabe runs create_project on a scratch idea and reads the Intent section and help's "where am I" output, then gives the go-ahead

### Phase 3 Modified Files

- `plugin/skills/create_project/{SKILL,templates}.md`, `plugin/skills/create_research/{SKILL,templates}.md`, `plugin/skills/explore_design/SKILL.md`, `plugin/skills/create_design/{SKILL,templates}.md`, `plugin/skills/create_tasks/{SKILL,templates}.md`, `plugin/skills/validate_execution/{SKILL,templates}.md`
- `plugin/skills/help/SKILL.md`, `plugin/hooks/wb-prime.sh`
- Initial Response of create_product_research, create_mockup, implement_tasks, implement_coordinated, validate_project, create_handoff, resume_handoff, update_status
- `CHANGELOG.md`

#### 📝 Modified Files (Phase 3, as landed)

Nine task commits, f8dace2 through 0a89ea5, 24 files, +199/−27. No test files (docs plugin).

- `plugin/skills/create_project/SKILL.md`, `templates.md` - intent intake with one-exchange confirmation; README `## Intent` (Goal, Success looks like, Non-goals, Amendments); Intent echoed at confirmation
- `plugin/skills/create_research/SKILL.md`, `templates.md` - question derived from the Goal; decomposition against statements; `## Intent Coverage`
- `plugin/skills/explore_design/SKILL.md`, `templates.md` - framing against the Goal and statements; Decide description cites the Goal; dated Amendments line
- `plugin/skills/create_design/SKILL.md`, `templates.md` - `(refines:)` metrics and Deferred list; problem traced to the Goal; amendment rule with Decide record; BARRIER 4
- `plugin/skills/create_tasks/SKILL.md`, `templates.md` - Target State from Intent-refining metrics
- `plugin/skills/validate_execution/SKILL.md`, `templates.md` - verdict per Intent statement table; README verdict echo; README read in Step 1
- `plugin/skills/help/SKILL.md` - "What each stage needs from you" table; trigger-text description; State step with three cases and the routing rule
- `plugin/hooks/wb-prime.sh` - six-line map summary (orientation 25 lines)
- `plugin/skills/{create_product_research,create_mockup,implement_tasks,implement_coordinated,validate_project,create_handoff,resume_handoff,update_status}/SKILL.md` - "This stage needs from you" line (14 stage intakes in all)
- `CHANGELOG.md` - Unreleased: four Added bullets and one Changed bullet
- `docs/plans/2026-09-05-prompts-h7c-implement-rename-3.0/tasks.md` - discoveries and notes

**Quick verification commands:**

```bash
grep -rl "needs from you" plugin/skills/*/SKILL.md | wc -l   # 15: 14 stage intakes plus help's heading
grep -rn "plan predates 3.0.0" plugin/skills --include=SKILL.md -l | wc -l   # 5
plugin/hooks/wb-prime.sh --export | wc -l   # under 40
```

### ⛔ CHECKPOINT: Phase 3 Complete

1. ✅ All Phase 3 task beads issues closed; milestone `prompts-tq7.2` closed
2. ✅ Automated verification passing
3. ✅ Gabe's go-ahead on the phase report
4. ✅ Reconcile plan-doc status via `/wb:update_status`

---

## Phase 4: Beads Guide and Contract Audit

### Phase 4 Objective

Write the maintainer guide, audit every bd reference in shipped files against bd 1.1.0, add the CLAUDE.md inventory rule and the version floor. Design D17. Added 2026-09-06 at the Phase 3 checkpoint (Gabe approved both): the development-only rule that keeps help and wb-prime current when a stage changes (folded into item 3), and the commit discipline for coordinated and inline execution (item 5; decision prompts-0cn2). Both are docs-only and land before Phase 5's directory move so rename detection holds.

### Phase 4 Prerequisites

- [ ] Phase 3 checkpoint confirmed; `bd close prompts-tq7.2`

### Phase 4 Changes Required

#### 1. Contract audit

**Files**: every file under `plugin/` that references a bd command (sixteen files per the 2026-09-06 inventory: help, create_tasks and its examples and templates, implement_tasks, implement_coordinated and reference.md, update_status, create_handoff, resume_handoff, status-sync, doc-adherence, validate_project, validate_execution, create_project, beads-mode.md, beads-not-initialized.md, the two hooks)

**Current State**: eighteen subcommands referenced; `help/SKILL.md:241` names `bd daemon status` (no such subcommand in 1.1.0); `beads-not-initialized.md:25` names `.beads/daemon.lock` (pre-Dolt); `docs/workbench-workflow-guide.md:490` and `docs/commands-reference.md:72` use `bd update --status in_progress` where the skills use `--claim`.

**Target State** (D17): a table, one row per subcommand and flag combination actually invoked, with the files that use it and `verified-on: 1.1.0`; every row confirmed against `bd <cmd> --help`; references that do not exist in 1.1.0 removed or replaced in the shipped file (the daemon line, the daemon.lock hint); prose mentions excluded. The table is the raw material for the guide.

#### 2. docs/beads-guide.md

**File**: `docs/beads-guide.md` (new)

**Target State** (D17): sections: The model wb relies on (one page: database as truth, three tiers, stealth and the exclude file, worktrees, the sanity check); Contract inventory (the table from 4.1 plus config keys `export.auto`, `sync.remote`, `backup.enabled`, `no-git-ops`, and the `.beads/metadata.json` dependency); Supported version and upgrade protocol (floor 1.1.0; when `bd version` changes: `bd doctor`, diff `--help` for every inventoried command, run the headless smoke set for beads-using skills, update the verified-on column, record the requirement in README and CHANGELOG; a bd requirement change is major per RELEASING.md); Interpretation notes (`no-git-ops`, embedded versus server, `metadata.json` and the empty-default-database failure, throttled export, the beads plugin's docs lagging its CLI); Doc map (runtime truth in `plugin/docs/reference/`, maintainer knowledge here, operational facts in beads memories, history in beads-integration-learnings.md); Version log (1.0.2 migration, 1.1.0 verification 2026-09-06, with the learnings doc linked as history).

#### 3. CLAUDE.md rule, README requirement, learnings pointer, floor in the playbook

**Files**: `CLAUDE.md` (beside the update_status sole-writer note at line 157), `README.md:130-139`, `docs/beads-integration-learnings.md:1-3`, `plugin/docs/reference/beads-not-initialized.md` (floor line from 2.2 confirmed)

**Target State**: CLAUDE.md gains "Any change that adds, removes, or alters a bd command in a shipped file updates the contract inventory in docs/beads-guide.md." README states "Requires bd 1.1.0 or later" with a link to the guide. The learnings doc gains a two-line header: dated history; current guidance lives in beads-guide.md.

**Help-maintenance rule** (added 2026-09-06; development-only, nothing in shipped help or wb-prime). Three more sites: `CLAUDE.md`, a second rule beside the sole-writer note: "Any change to a workflow stage's existence, name, scope, or intake updates help's Command Workflow chain, its What-each-stage-needs-from-you table, and its Command Details, wb-prime's orientation (stage chain and the six-line summary), and that stage's intake line, in the same commit." `RELEASING.md` Process item 4 gains a help drift check as a grep recipe: every user-invocable stage under `plugin/skills/` has a Command Details heading and a table row in help, and each stage's "This stage needs from you" sentence matches its row. `docs/claude-code-skills-guide.md` "What This Means for This Repository" gains one sentence: a new or renamed skill is registered in help and wb-prime and given an intake line.

#### 4. CHANGELOG Unreleased, Phase 4 entries

`### Added`: docs/beads-guide.md; the inventory rule; the help-maintenance rule and its drift check; the commit discipline (item 5). `### Fixed`: stale bd references removed (list them).

#### 5. Commit discipline for coordinated and inline execution

**Files**: `plugin/skills/implement_coordinated/SKILL.md` (Step 6 "After Each Worker Completes", the PASS branch), `plugin/skills/implement_coordinated/sub-agent-prompts.md` (Worker Prompt Template, CRITICAL Constraints), `plugin/agents/task-worker.md` (Process and Constraints), `plugin/agents/task-verifier.md` (the scope check that diffs `HEAD~1`), `plugin/skills/implement_tasks/SKILL.md` (the Refactor step's "Commit when satisfied", around line 266)

**Current State** (inventory 2026-09-06, decision prompts-0cn2): the coordinated path states no commit rule anywhere; the worker's contract ends at `bd close`; the verifier diffs `HEAD~1` as a scope proxy, assuming a per-task commit exists; help's map row asserts "one commit each"; implement_tasks says "Commit when satisfied".

**Target State**: implement_coordinated Step 6, after PASS: "**Commit the task**: the coordinator commits that task's files with a message naming the task and its beads id. One task, one commit. Coordinator-side plan-doc edits are separate commits, made only between tasks, never while a worker or verifier runs." Worker template and task-worker.md: "Do not commit. The coordinator commits after verification; your last act is `bd close`." task-verifier.md: scope is checked against the working tree (`git status --short`, `git diff --stat`) against the coordinator's stated file list; the `HEAD~1` diff is removed. implement_tasks: "Commit when satisfied" becomes "One commit per task, after its verification; the message names the task and its beads id." One sentence in both implementation skills: "Structural and behavioral changes are separated at the task level (create_tasks' Tidy First edge rule), so one commit per task keeps them apart." help's map row is already true once these land.

### Phase 4 Tasks

- Contract audit: inventory every bd reference under plugin/ against bd 1.1.0; remove or replace stale ones → `[beads:phase4_impl_1]`
  - Verify: the recipe `grep -rhoE '\bbd [a-z][a-z-]*' plugin | awk '{print $2}' | sort -u` compared with `bd --help`'s command list via `comm -23` → only prose tokens remain, each justified in the report; `grep -rn "bd daemon\|daemon.lock" plugin` → none; the table delivered in the task report
- Write `docs/beads-guide.md` → `[beads:phase4_impl_2]`
  - After 4.1 (the table); verify: `grep -c "^## " docs/beads-guide.md` → 6; every subcommand token from 4.1's list appears in the guide (`while read c; do grep -q "bd $c" docs/beads-guide.md || echo MISSING $c; done` → none); `grep -c "verified-on\|1.1.0" docs/beads-guide.md` → 3 or more
- CLAUDE.md inventory rule; README bd requirement; learnings header; floor confirmed in the playbook → `[beads:phase4_impl_3]`
  - After 4.2; verify: `grep -c "beads-guide.md" CLAUDE.md README.md docs/beads-integration-learnings.md` → 1 or more each; `grep -c "1.1.0" README.md plugin/docs/reference/beads-not-initialized.md` → 1 each; `grep -c "workflow stage's existence" CLAUDE.md` → 1; `grep -c "drift" RELEASING.md` → 1 or more; `grep -c "registered in help" docs/claude-code-skills-guide.md` → 1
- CHANGELOG Unreleased: Phase 4 entries → `[beads:phase4_impl_4]`
  - After 4.2, 4.3, and 4.5; verify: `grep -c "beads-guide" CHANGELOG.md` → 1 or more; `grep -c "one commit" CHANGELOG.md` → 1 or more
- Commit discipline: implement_coordinated Step 6, worker template, task-worker, task-verifier, implement_tasks → `[beads:phase4_impl_5]`
  - Independent of 4.1 to 4.4 (different files); verify: `grep -c "One task, one commit" plugin/skills/implement_coordinated/SKILL.md` → 1; `grep -c "Do not commit" plugin/skills/implement_coordinated/sub-agent-prompts.md plugin/agents/task-worker.md` → 1 each; `grep -c "HEAD~1" plugin/agents/task-verifier.md` → 0; `grep -c "One commit per task" plugin/skills/implement_tasks/SKILL.md` → 1; `grep -c "Tidy First edge rule" plugin/skills/implement_coordinated/SKILL.md plugin/skills/implement_tasks/SKILL.md` → 1 each; per-file lint delta zero on all five

#### Phase 4 Testing Tasks

- Phase 4 verification → `[beads:phase4_test_1]`
  - After 4.1 through 4.5: the audit recipe returns no stale subcommand; the guide inventory grep returns none missing; the help drift grep from RELEASING.md item 4 passes on the current tree; the commit-discipline greps above; per-file lint deltas; `bd doctor` run and its output recorded in Implementation Notes (a no-op note in embedded mode)

#### 📝 Modified Files (Phase 4, as landed)

Six commits, 34a2d65 (the plan revision) through 7925f01, 14 files, +211/−21. No test files (docs plugin).

- `docs/beads-guide.md` - new: the model wb relies on, the bd 1.1.0 contract inventory (47 invocation rows, 8 config-key rows, 8 prose tokens), the upgrade protocol, interpretation notes, doc map, version log
- `plugin/skills/help/SKILL.md` - the daemon.lock and bd daemon troubleshooting line replaced
- `CLAUDE.md` - the inventory rule and the stage-change rule beside the sole-writer rule; `README.md` - bd 1.1.0 with the guide link; `docs/beads-integration-learnings.md` - dated-history header; `RELEASING.md` - help drift check in the pre-bump verification; `docs/claude-code-skills-guide.md` - the four-copy sentence
- `plugin/skills/implement_coordinated/SKILL.md`, `sub-agent-prompts.md`, `plugin/agents/task-worker.md`, `plugin/agents/task-verifier.md`, `plugin/skills/implement_tasks/SKILL.md` - commit discipline
- `CHANGELOG.md` - Unreleased: three Added bullets, one Fixed bullet
- `docs/plans/2026-09-05-prompts-h7c-implement-rename-3.0/tasks.md` - the Phase 4 additions and these notes

**Quick verification commands:**

```bash
grep -rhoE '\bbd [a-z][a-z-]*' plugin | awk '{print $2}' | sort -u   # compare with bd --help; leftovers are prose tokens and the stats alias
grep -L "needs from you" plugin/skills/*/SKILL.md   # background skills and the deprecated alias only
./plugin/scripts/lint --all | grep -c "Issues found in"   # 25 after Phase 4
```

### Phase 4 Success Criteria

- [ ] No bd subcommand referenced under plugin/ is absent from `bd --help`
- [ ] The guide's inventory covers every referenced subcommand with a verified-on version
- [ ] Gabe's go-ahead on the guide

### ⛔ CHECKPOINT: Phase 4 Complete

1. ✅ All Phase 4 task beads issues closed; milestone `prompts-tq7.3` closed
2. ✅ Gabe's go-ahead
3. ✅ Reconcile plan-doc status via `/wb:update_status`

---

## Phase 5: Rename, Aliases, Removal, and the 3.0.0 Cut

### Phase 5 Objective

Move the two skill directories to their new names, leave alias stubs with pointer files, delete `create_execution`, sweep every live rendering to the new default, cut 3.0.0 on the branch, retitle and merge PR #27, tag.

### Phase 5 Prerequisites

- [ ] Phase 4 checkpoint confirmed; `bd close prompts-tq7.3`; branch rebased on main if main moved

### Phase 5 Changes Required

#### 1. Directory move and in-file naming

**Files**: `plugin/skills/implement_coordinated/` (5 files) → `plugin/skills/implement/`; `plugin/skills/implement_tasks/` (2 files) → `plugin/skills/implement_inline/`

**Current State** (research.md §3): `name:` at `implement_coordinated/SKILL.md:2` and `implement_tasks/SKILL.md:2`; example invocations at `implement_coordinated/SKILL.md:27` and `implement_tasks/SKILL.md:18`; "original `implement_tasks`" at `implement_coordinated/SKILL.md:52, 281, 424, 428`; H1 titles at `implement_coordinated/README.md:1`, `reference.md:1`, `sub-agent-prompts.md:1`, `templates.md:1`, `implement_tasks/templates.md:1`. Internal links are same-directory or `../../docs/reference/`, so none change. Line numbers will have moved by Phase 5; re-read.

**Target State** (D1): directory and `name:` renamed together; in-file self-references in the new names; descriptions:

- `implement/SKILL.md:3`: `Implement a project's tasks.md by coordinating fresh-context worker agents (one per task, model chosen per task), verifying each with a task-verifier, and escalating verified failures. The default execution path: use when the user asks to implement, build, or execute a planned phase, asks for workers or coordination, or wants the main context kept clean. Takes the project directory and a phase number or continue.`
- `implement_inline/SKILL.md:3`: `Implement a project's tasks.md in this session with TDD (red, green, refactor), beads claim and close per task, and a human checkpoint at each phase boundary. Use only when the user asks for the work done inline, in this session, or on the session model rather than by workers (for example a full-Fable run). Takes the project directory and a phase number or continue.`

**Dry run** (prompts-7mo, before 5.5 and 5.6): headless `-p "run /wb:implement"` with `--max-turns 2` → stream contains `"skill":"wb:implement"`; same for `implement_inline`. Record and close prompts-7mo.

#### 2. Alias stubs and pointer files

**Files**: `plugin/skills/implement_coordinated/{SKILL,README,reference,sub-agent-prompts,templates}.md` (new), `plugin/skills/implement_tasks/{SKILL,templates}.md` (new)

**Pattern Reference**: `plugin/skills/create_execution/SKILL.md:1-24`, `examples.md:1-5` (research.md §4). Four pointer files for `implement`, one for `implement_inline`.

**Implementation** (`implement_coordinated/SKILL.md`; the `implement_tasks` stub is the same with `implement_inline` and "the in-session path" wording):

```markdown
---
name: implement_coordinated
description: Deprecated alias of implement — use /wb:implement (removed at 4.0.0)
argument-hint: [project-directory] [phase-number|continue]
disable-model-invocation: true
allowed-tools: Read
---

# Implement Coordinated (Deprecated Alias)

This command was renamed to `/wb:implement`: coordinated execution is the recommended path, so it takes the plain verb; the in-session path is `/wb:implement_inline`. The alias remains through 3.x and is removed at 4.0.0.

## Behavior

1. **Tell the user once, up front**:

   ```

   Note: /wb:implement_coordinated is now /wb:implement — same skill, new name.
   This alias works through 3.x and will be removed at 4.0.0.

   ```

2. **Then run the canonical skill**: Read [../implement/SKILL.md](../implement/SKILL.md) NOW and follow it exactly, passing through any arguments unchanged. Its supporting files (sub-agent-prompts.md, templates.md, reference.md, README.md) live in `../implement/` — resolve every "read X NOW" directive there.

Do not duplicate any behavior here; the canonical skill is the single source of truth.
```

Pointer file shape:

```markdown
# Moved

This skill was renamed to `implement`. This pointer file exists so sessions holding a stale pre-rename skill body still resolve their reads instead of erroring.

Read [../implement/reference.md](../implement/reference.md) and use it as directed.
```

#### 3. Remove `create_execution`

`plugin/skills/create_execution/` (4 files) deleted with the version-control remove subcommand. The sentences describing it (`CLAUDE.md:13`, `docs/claude-code-skills-guide.md:310`, `plugin/skills/help/SKILL.md:185`) are rewritten by 5.5 and 5.6 to name the two implement aliases as the user-only skills.

#### 4. Canonical skill prose in the new names

`plugin/skills/implement/README.md` (whole file): Evolution, Sequential/Coordinated, and Migration sections restated with `implement` as the default and `implement_inline` as the in-session path; Migration becomes "Choosing implement_inline"; comparison headings **Inline** (`implement_inline`) and **Coordinated** (`implement`).

#### 5. Rendering sweep, plugin side

**Files and lines** (research inventory, plus Phase 2 and 3 additions): `plugin/skills/help/SKILL.md` (diagram line, alias parenthetical, command-detail headings, the map rows); `plugin/skills/create_project/templates.md` (workflow list and quick commands); `plugin/skills/create_project/SKILL.md` (confirmation block); `plugin/skills/create_tasks/SKILL.md` (next steps); `plugin/skills/create_handoff/SKILL.md`, `plugin/skills/resume_handoff/SKILL.md`, `plugin/skills/validate_execution/SKILL.md`, `plugin/skills/validate_project/templates.md` (continue lines); `plugin/agents/task-worker.md:3`; `plugin/docs/reference/beads-not-initialized.md:3`; `plugin/hooks/wb-prime.sh` (stage chain and map summary); `plugin/docs/reference/beads-mode.md` if it names the skills.

**Target State** (D4, D5): every `/wb:implement_tasks` continue or sequence line becomes `/wb:implement`; the help diagram line reads `/wb:implement          → Execute with workers (verify, escalate)` with `/wb:implement_inline   → Same plan, coded by this session (TDD)` under it; help's alias parenthetical drops create_execution; command-detail headings in the new names with an implement_inline entry; task-worker.md ends `Spawned by /wb:implement with a per-task model override.`; beads-not-initialized.md lists `implement`, `implement_inline`, `create_tasks`; wb-prime's chain and map name the new commands.

#### 6. Rendering sweep, root and docs

**Files and lines** (research inventory): `README.md:57, 79, 80`; `CLAUDE.md:13, 86`; `docs/commands-reference.md:24, 62, 385, 392, 636, 737`; `docs/workbench-workflow-guide.md:56, 73, 74, 285, 483`; `docs/claude-code-skills-guide.md:310, 314`; `docs/subagent-tool-call-ceiling.md:6, 66, 69, 89, 133`; `docs/beads-integration-learnings.md:202, 203`; `docs/beads-guide.md` (inventory rows naming the skill paths).

**Kept as dated narrative**: `docs/subagent-tool-call-ceiling.md:4, 126`; `docs/beads-integration-learnings.md:45, 90, 248`; `docs/claude-code-skills-guide.md:310`'s history clause (its last sentence becomes "Only the deprecated `implement_coordinated` and `implement_tasks` aliases keep `disable-model-invocation: true`, so the model never picks them over `implement` and `implement_inline`.").

**Target State** (D4, D5): sequences end in `/wb:implement`; README.md:79-80 become `/wb:implement` (default, workers) and `/wb:implement_inline` (this session); the workflow-guide model-map rows keep their model text under the new names; `CLAUDE.md:13` names the two aliases as the user-only skills; commands-reference's section heading and usage in the new name with an implement_inline subsection; the file-structure listing names both new directories; beads-guide.md paths updated.

#### 7. CHANGELOG 3.0.0 and manifests

**Files**: `CHANGELOG.md` (Unreleased → `## [3.0.0] — <date>`), `plugin/.claude-plugin/plugin.json:3`, `.claude-plugin/marketplace.json:12`

**Implementation** (skeleton; the Phase 1 to 4 bullets move in under their headings):

```markdown
## [3.0.0] — YYYY-MM-DD

The "tools as intended" release: beads used the way beads means it, a plan that states its intent, a workflow that explains its human inputs, `implement` as the default execution path, and the alias promised for removal at 3.0.0 gone. Plan: `docs/plans/2026-09-05-prompts-h7c-implement-rename-3.0/`.

### ⚠️ Breaking / Requirements

- **Requires bd 1.1.0 or later.**
- **`/wb:create_execution` removed** (deprecated since 2.2.0). Use `/wb:create_tasks`.
- **Renamed**: `/wb:implement_coordinated` → `/wb:implement`, `/wb:implement_tasks` → `/wb:implement_inline`. The old names keep working as deprecated aliases through 3.x (removed at 4.0.0): each prints a one-line notice and runs the canonical skill unchanged. **Gotcha**: a session started before this release may hold a cached pre-rename skill body — restart the session (or `/reload-skills`) after updating; the alias directories keep pointer files so stale references degrade gracefully.
- **`BEADS_MODE` and `hooks/setup-beads-mode.sh` removed; the commit-`.beads/` guidance is gone.** Beads' Dolt directory is never committed. Cross-machine continuity is a Dolt remote or `bd backup`; see `plugin/docs/reference/beads-mode.md`.
- **`hooks/compact-recovery.sh` replaced by `hooks/wb-prime.sh`** (same recovery text on compact; orientation on startup, resume, and clear).

### Added / ### Changed / ### Fixed

(the Unreleased bullets, grouped)

### Migration

1. `claude plugin update wb@gvarela-workbench` from your shell, then restart Claude (or `/reload-plugins`).
2. If you committed `.beads/` in any repository: stop; exclude it (`bd init --setup-exclude` or `bd init --stealth`); set up `bd backup init <url>` or a Dolt remote if you need continuity. The old `issues.jsonl` stays importable with `bd import`.
3. Optionally switch to the new command names; the old ones print a notice until 4.0.0. Replace any `/wb:create_execution` with `/wb:create_tasks`.
4. Existing plans have no Intent section; stages treat that as "no obligation" and help says so. Add one by hand to a plan you want the new checks on.
```

Both manifests: `"version": "3.0.0"`.

### Phase 5 Tasks

#### Phase 5 Implementation Tasks

- Move the two skill directories and rename every in-file self-reference; rewrite the two descriptions; run the resolution dry run → `[beads:phase5_impl_1]`
  - Verify: `ls plugin/skills/implement plugin/skills/implement_inline` → 5 and 2 files; `grep -n "^name:" plugin/skills/implement/SKILL.md plugin/skills/implement_inline/SKILL.md` → `implement`, `implement_inline`; `grep -rn "implement_coordinated\|implement_tasks" plugin/skills/implement plugin/skills/implement_inline` → none; dry-run proof lines recorded; `bd close prompts-7mo`
- Create the alias stubs and pointer files at the old directory names → `[beads:phase5_impl_2]`
  - After 5.1; verify: `ls plugin/skills/implement_coordinated plugin/skills/implement_tasks` → 5 and 2 files; `grep -c "removed at 4.0.0" plugin/skills/implement_coordinated/SKILL.md plugin/skills/implement_tasks/SKILL.md` → 3 each; every pointer target passes `test -f`; headless `-p "run /wb:implement_coordinated"` shows `"skill":"wb:implement_coordinated"` and the notice text
- Delete `plugin/skills/create_execution/` → `[beads:phase5_impl_3]`
  - Verify: `test -d plugin/skills/create_execution; echo $?` → 1; four deletions staged
- Rewrite `plugin/skills/implement/README.md` in the new names and relationship → `[beads:phase5_impl_4]`
  - After 5.1; verify: `grep -c "implement_inline" plugin/skills/implement/README.md` → 3 or more; `grep -n "implement_tasks\|implement_coordinated" plugin/skills/implement/README.md` → none
- Sweep the plugin-side renderings, including wb-prime and the help map → `[beads:phase5_impl_5]`
  - After 5.1 (names validated); verify: `grep -rn "implement_tasks\|implement_coordinated\|create_execution" plugin | grep -v "^plugin/skills/implement_coordinated/\|^plugin/skills/implement_tasks/"` → none; `grep -c "/wb:implement_inline" plugin/skills/help/SKILL.md` → 3 or more; `grep -n "Spawned by /wb:implement " plugin/agents/task-worker.md` → 1; `grep -c "/wb:implement\b" plugin/hooks/wb-prime.sh` → 1 or more
- Sweep the root and docs renderings, including beads-guide.md → `[beads:phase5_impl_6]`
  - After 5.1; verify: `grep -rn "implement_tasks\|implement_coordinated\|create_execution" README.md CLAUDE.md docs --include=*.md | grep -v "^docs/plans/"` → exactly the kept-narrative lines and CLAUDE.md:13's alias mention; `grep -c "/wb:implement\b" CLAUDE.md README.md docs/commands-reference.md docs/workbench-workflow-guide.md` → 1 or more each
- Write the CHANGELOG 3.0.0 entry (Unreleased moved in, Breaking and Migration as above) and bump both manifests → `[beads:phase5_impl_7]`
  - After 5.2 and 5.3; verify: `grep -n "^## \[3.0.0\]\|^### ⚠️ Breaking\|^### Migration" CHANGELOG.md` → 3 lines; `grep -c "^## \[Unreleased\]" CHANGELOG.md` → 0; `jq -r .version plugin/.claude-plugin/plugin.json` = `jq -r '.plugins[0].version' .claude-plugin/marketplace.json` = `3.0.0`

#### Phase 5 Testing Tasks

- Phase 5 verification → `[beads:phase5_test_1]`
  - After 5.1 through 5.7. Sweep-miss check: `grep -rl "implement_coordinated\|implement_tasks\|create_execution" --include=*.md --include=*.sh . | grep -v "^./plugin/skills/implement_coordinated/\|^./plugin/skills/implement_tasks/\|^./CHANGELOG.md\|^./docs/plans/"` → only the kept-narrative files. Per-file lint delta zero on every touched file. Headless: `/wb:help` names `implement` and `implement_inline`; "implement phase 2 of the plan" fires `wb:implement`; "implement this phase inline in this session, no workers" fires `wb:implement_inline`; "what does implement_inline do" fires no implement skill (help may fire); record and close prompts-zmy or reopen the description question. Canary count reaches three sessions on the branch. `bd preflight` run and recorded.

#### Phase 5 Integration Tasks

- Retitle PR #27 to the 3.0.0 title, rebase on main, merge, tag v3.0.0, update the installed plugin, close out → `[beads:phase5_integration_1]`
  - After 5.7 and 5.8; PR title `wb 3.0.0: beads as intended, plan intent, stateful help, implement as the default path`; body carries the Breaking and Migration sections; merge is the final checkpoint; then create the `v3.0.0` tag on the merge commit and publish it; `claude plugin update wb@gvarela-workbench`; fresh session shows 3.0.0; `bd close prompts-h7c prompts-vwo prompts-3ke prompts-my1i`; run `/wb:update_status docs/plans/2026-09-05-prompts-h7c-implement-rename-3.0`

### Phase 5 Success Criteria

#### Phase 5 Automated Verification

- [ ] Every grep above returns its stated result; the sweep-miss grep returns only kept-narrative files
- [ ] Manifests match at 3.0.0; `git tag --points-at <merge-sha>` shows `v3.0.0`

#### Phase 5 Manual Verification

- [ ] Dry run proves both new names resolve (prompts-7mo closed); routing test recorded (prompts-zmy)
- [ ] Three canary sessions noted; PR merged; installed plugin at 3.0.0 in a fresh session

### Phase 5 Modified Files

- `plugin/skills/implement/` (moved), `plugin/skills/implement_inline/` (moved), `plugin/skills/implement_coordinated/` (5 alias files), `plugin/skills/implement_tasks/` (2 alias files), `plugin/skills/create_execution/` (deleted)
- `plugin/skills/help/SKILL.md`, `plugin/skills/create_project/{SKILL,templates}.md`, `plugin/skills/create_tasks/SKILL.md`, `plugin/skills/create_handoff/SKILL.md`, `plugin/skills/resume_handoff/SKILL.md`, `plugin/skills/validate_execution/SKILL.md`, `plugin/skills/validate_project/templates.md`, `plugin/agents/task-worker.md`, `plugin/docs/reference/beads-not-initialized.md`, `plugin/hooks/wb-prime.sh`
- `README.md`, `CLAUDE.md`, `docs/commands-reference.md`, `docs/workbench-workflow-guide.md`, `docs/claude-code-skills-guide.md`, `docs/subagent-tool-call-ceiling.md`, `docs/beads-integration-learnings.md`, `docs/beads-guide.md`
- `CHANGELOG.md`, `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

#### 📝 Modified Files (Phase 5, as landed)

Seven task commits, 22ea8a5 through b07d2b3; git counts 40 paths because the moves appear under both names. No test files (docs plugin).

- `plugin/skills/implement/` (moved from implement_coordinated, five files, rename detection 85 to 99 percent) and `plugin/skills/implement_inline/` (moved from implement_tasks, two files): names, descriptions, examples, self-references, display titles; README restated (relationship, why coordinated is the default, choosing inline)
- `plugin/skills/implement_coordinated/` (five files) and `plugin/skills/implement_tasks/` (two files) - deprecated alias stubs and pointer files, through 3.x, removed at 4.0.0
- `plugin/skills/create_execution/` - deleted (four files)
- `plugin/skills/help/SKILL.md` - chain, table row, Command Details (implement, implement_inline, create_product_research, validate_project); `plugin/hooks/wb-prime.sh` - chain; `plugin/agents/task-worker.md`, `plugin/docs/reference/beads-not-initialized.md`, and the continue lines in create_project (SKILL and templates), create_tasks, create_handoff, resume_handoff, validate_execution, validate_project templates
- `README.md`, `CLAUDE.md`, `docs/commands-reference.md`, `docs/workbench-workflow-guide.md`, `docs/claude-code-skills-guide.md`, `docs/subagent-tool-call-ceiling.md`, `docs/beads-integration-learnings.md`, `docs/beads-guide.md` - renderings and inventory paths in the new names; dated narrative kept
- `CHANGELOG.md` - Unreleased became 3.0.0 with Breaking and Migration; `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` - 3.0.0
- `docs/plans/2026-09-05-prompts-h7c-implement-rename-3.0/tasks.md` - these notes

**Quick verification commands:**

```bash
grep -rlE "implement_coordinated|implement_tasks|create_execution" --include='*.md' --include='*.sh' . | grep -vE "plugin/skills/implement_coordinated/|plugin/skills/implement_tasks/|CHANGELOG.md|docs/plans/"   # alias sentences and dated narrative only
jq -r .version plugin/.claude-plugin/plugin.json   # 3.0.0
plugin/hooks/wb-prime.sh --export | grep -c "/wb:implement"   # 2
```

### ⛔ CHECKPOINT: Phase 5 Complete

1. ✅ All Phase 5 task beads issues closed; milestone `prompts-h1y` closed; epic `prompts-tq7` closed
2. ✅ PR #27 merged, `v3.0.0` tagged, installed plugin at 3.0.0 (human confirmation)
3. ✅ Reconcile plan-doc status via `/wb:update_status`

---

## Implementation Discoveries

Things to determine during implementation:

- Resolved 2026-09-06 (Claude Code hooks reference, "SessionStart input"): the SessionStart payload always carries `source`, with values `startup`, `resume`, `clear`, `compact`, and `fork` (forks reported `resume` before 2.1.214). wb-prime branches on `source` and treats `fork` like `startup`. Plain-text stdout is added to the model's context; `hookSpecificOutput.additionalContext` is the JSON alternative.
- Resolved 2026-09-06 (same reference, "PreCompact input"): PreCompact receives `trigger` (`manual` or `auto`) and `custom_instructions`; its stdout is not added to the model's context (only UserPromptSubmit, UserPromptExpansion, SessionStart, and PostModelSwitch stdout is), and its `systemMessage` is discarded. wb-prime's PreCompact registration returns 0 and the compact-trigger SessionStart carries the recovery.
- Resolved 2026-09-06 (bd 1.1.0): `bd config get sync.remote` prints `sync.remote (not set in config.yaml)` and exits 0 when unset; a set key prints the bare value (`bd config get backup.enabled` prints `false`). The drift hook's `grep -qv "not set"` condition is sound.
- Resolved 2026-09-06 (task 3.7 headless runs): help's broadened description does not over-trigger; it under-fires. "where am I" in this repository invoked `wb:help` and reported the plan, documents, beads state, and a Next stage line. "what does wb do" here, and both prompts in a scratch directory without docs/plans, were answered correctly from the wb-prime orientation without any Skill call (case-A wording, no Next stage line, no reference card). The orientation makes generic questions self-answering, which is D18 working; the Phase 3 verification judges the routing cases on the where-am-I run and records the other three as answered-from-orientation. Louder trigger text is not the lever (blind trials, 2026-09-05).
- Resolved 2026-09-06 (commit 22ea8a5): git detected all seven Phase 5 moves as renames, 85 to 99 percent similarity (README 85, SKILL.md 97 and 98, reference 99, sub-agent-prompts 98, templates 97 and 97). `git mv` was accepted by the worktree Bash guard; the content edits were staged on top and committed together.
- The exact count of pre-existing `lint --all` findings after each phase (27 after Phase 1; 27 after Phase 2; 27 after Phase 3; 25 after Phase 4, two files cleared incidentally; 24 after Phase 5, the deleted create_execution directory carried one)
- Resolved 2026-09-06 (bd 1.1.0 `--help`, issue prompts-hsa2): `bd orphans` reports open or in-progress issues that commit messages already reference (landed but never closed), not broken dependencies and not frontmatter orphans; `bd preflight` is a checklist for contributors to the beads Go repository, not a workspace check; `bd doctor --check=conventions` is the lint-stale-orphans pass. Phase 2 kept validate_project's frontmatter orphan check and added `bd orphans` under its real meaning; beads-mode.md Hygiene lists `bd doctor --check=conventions` in place of `bd preflight`. Phase 4's contract audit inherits this correction.
- Resolved 2026-09-06 (run in this workspace, surfaced by the headless validate_project run): `bd doctor` and `bd doctor --check=conventions` are not supported in bd 1.1.0's default embedded mode; they print "not yet supported in embedded mode" and exit. They run only against a Dolt server (`bd init --server`). `bd lint`, `bd stale`, and `bd orphans` work in embedded mode. The Phase 2 text that names `bd doctor` (beads-mode.md Hygiene, the playbook's diagnose line, CLAUDE.md's session protocol, the workflow guide's session-end block, the CHANGELOG Added bullet) carries the caveat and falls back to `bd stale` and `bd orphans`. Phase 4's inventory needs a verified-on column that distinguishes embedded from server mode.
- Resolved 2026-09-06: a headless `-p "/wb:validate_project <dir>"` run emits no `"skill":"wb:..."` event (slash-command prompts do not route through a Skill tool call; prose prompts do, as the wrong-database recipe showed with `wb:implement_coordinated`), and it needs about 40 turns plus `Bash(git *)` in `--allowedTools` to reach its report. Grep the assistant lines, not the whole stream, for mode vocabulary: the stream's dump of this plan's own tasks.md contains the old words by design.

Note: update this section with findings as you implement.

---

## 📝 Completed Tasks Archive

Phase 1 tasks (prompts-33l, ds5, 4ni, fr8, nqw, 97q, 32z, f00) closed 2026-09-06.

---

## 🚧 Blockers & Notes

### Current Blockers

Blockers are tracked in beads:

```bash
bd blocked
```

### Implementation Notes

- 2026-09-06: Status reconciled via update_status after Phase 4 verification: tasks.md stays in-progress at phase 4 with 34 of 43 tasks closed (Phase 4's six tasks closed in beads; milestone prompts-tq7.3 open for the checkpoint); design.md stays implementing; git metadata at the aggregation commit.
- 2026-09-06: Phase 4 implemented by coordinated sonnet workers: five task workers, five verifier passes (one FAIL on the audit's scratch inventory: four citation errors, repaired by a fix worker that then died on a sonnet rate limit and finished by the coordinator by hand, spot-checked, and accepted), one verification worker. Six commits 34a2d65 through 7925f01, 14 files, +211/−21. Deviations and observations: (1) the two additions approved at the Phase 3 checkpoint landed as planned (help-maintenance rule in 4.3, commit discipline as 4.5); (2) the lint backlog fell from 27 to 25 because the lint hook's reformatting of `docs/claude-code-skills-guide.md` and `plugin/agents/task-verifier.md` cleared their pre-existing findings; (3) help's Command Details has 11 headings and lacks entries for implement_coordinated, create_product_research, and validate_project, which the new drift check will flag until Phase 5's help sweep adds them (recorded here so 5.5 covers it); (4) the audit found no flag the plugin uses that is absent from bd 1.1.0's help; `sync.remote` and `backup.enabled` are not in `bd config --help`'s namespace list but work (live-tested); (5) `bd stale` lists three Q: issues untouched for 34 days (prompts-cfz, 7w4, rll) and `bd orphans` lists prompts-h7c, which closes at the cut. The coordinator's verification recipes carried two wrong expectations (a table grep that matched other tables in help; the backlog expected unchanged), recorded in the verification task's close reason.
- 2026-09-06: Status reconciled via update_status after Phase 3 verification: tasks.md stays in-progress at phase 3 with 28 of 42 tasks closed (Phase 3's nine tasks closed in beads; milestone prompts-tq7.2 open for the checkpoint); design.md stays implementing; git metadata at 06a15cd.
- 2026-09-06: Phase 3 implemented by coordinated sonnet workers: eight task workers, eight verifier passes (all PASS on first verification), one verification worker that hit its 60-turn limit at the last lint step and was resumed to write its report (truncation, not failure; the remaining wb-prime re-measure was done by the coordinator: 25 lines, 43ms). Nine commits f8dace2 through 0a89ea5, 24 files, +199/−27. Deviations and observations: (1) the create_project intake confirms an inferred intent in one exchange, as D19 says; the tasks.md verify wording "no question before the first write event" was loose and is superseded by D19's text; in headless mode the run ends at the confirmation, and a prompt that states the intent is already confirmed writes the files directly (the end-to-end used that). (2) help under-fires rather than over-fires: "where am I" and "what's next" invoke wb:help and report position and next stage; "what does wb do" and both prompts in a directory without docs/plans are answered correctly from the wb-prime orientation without a Skill call (recorded in Implementation Discoveries; D18 makes those questions self-answering). (3) The "needs from you" file count is 15, not the plan's 14, because help's own heading contains the phrase. (4) Five stage skills carry the "plan predates 3.0.0" line (research, explore_design, design, validate_execution, help); create_project writes the section and create_tasks has no Intent obligation beyond the Target State wording, per the plan. Harness findings: the headless allowlist must include the Skill tool for prose-triggered skills; a nested session cannot write outside the worktree, so scratch projects were created under untracked directories inside it and deleted; verifier and worker prompts now forbid git stash. Coordinator-level facts gathered for the checkpoint: the commit-discipline inventory (prompts-0cn2).
- 2026-09-06: Status reconciled via update_status after Phase 2 verification: tasks.md stays in-progress at phase 2 with 19 of 42 tasks closed (Phase 2's eleven tasks closed in beads; milestone prompts-tq7.1 open for the checkpoint); design.md moves from approved to implementing; git metadata at f0292a1. The nine Phase 5 beads issues that still said "Phase 2" from before the re-plan were corrected in beads (descriptions, and the prompts-84lh title).
- 2026-09-06: Phase 2 implemented by coordinated sonnet workers: ten workers, ten verifier passes (all PASS on first verification), one verification worker, sequential, main context never compacted. Deviations: (1) `bd orphans` and `bd preflight` do not mean what design D16 assumed (see Implementation Discoveries; decision issue prompts-hsa2 open for Gabe at this checkpoint); (2) the workflow guide's Basic Workflow `bd update --status in_progress` at line 301 was changed to `--claim` alongside the two planned sites, pulling a Phase 4 audit correction forward; (3) the CHANGELOG per-file lint delta is +2 MD024 duplicate-heading findings of the pre-existing kind (every release section repeats Added/Changed/Fixed; the baseline had 11), because `.markdownlintrc` sets `allow_different_nesting` rather than `siblings_only`; changing lint rules is out of scope. Coordinator-level corrections landed in task commits: the Hygiene lines in beads-mode.md (task 2.1). Harness findings: the worktree Bash guard refuses `env -C` and `env PATH=` prefixes; a wrapper script under the job tmp dir (`cd`, `export PATH`, `exec`) is the working form; a plain single-file delete is accepted; one worker used `git stash` and `git stash pop` to lint a baseline, harmless only because the shared stack was empty, so worker prompts now forbid stash and prescribe `git show <rev>:<file>` to a scratch path inside the repo. The two Phase 2 unknowns were resolved from the Claude Code hooks reference (a guide agent) and `bd config get` on 1.1.0 before any worker ran. Verification worker: headless orientation prompt answered with the orientation's first line; the wrong-database fixture made `wb:implement_coordinated` stop before spawning workers; the headless validate_project recipe was rewritten (turns, git allowed, assistant-text grep) after its first run exhausted 12 turns reading the plan documents.
- 2026-09-06: Plan restructured after Phase 1 into five phases on one branch and one PR (design D9 revised): the beads-model realignment with wb-prime (D11-D16, D18), the intent model with stateful help (D19-D20), and the beads guide (D17) were added; the rename moved to Phase 5. PR #27 is held as the running review surface. Three inventory agents (sonnet, sonnet, haiku) supplied the line-level sites, the verification recipes, and the bd command inventory; corrections folded in: `bd status` exists in 1.1.0 and is not stale; `bd daemon` at help:241 and `.beads/daemon.lock` at beads-not-initialized.md:25 are; the workflow guide and commands reference still show `bd update --status in_progress` where the skills use `--claim`.
- 2026-09-06: Phase 1 implemented by coordinated sonnet workers (six tasks, six verifier passes, one FAIL that was the coordinator's own tasks.md edit landing in the worker's diff; separated into its own commit). Discoveries: the pre-existing `lint --all` backlog is 27 files, not the ~58 the previous plan estimated; the lint-hook check mutates the malformed fixture because it runs `lint --fix`, so use the clean fixture for the hook test and recreate `bad.md` before each run; the PostToolUse hook normalizes table separator rows on any save (reduces MD060 findings, never adds); `help/SKILL.md:158` carried an "auto-imports" claim the site list missed, rewritten in task 1.3; `grep -c "Issues found in"` (without the ⚠ glyph) is the reliable count because ANSI codes sit between the glyph and the text. Headless `/wb:help` ran to completion with one skill event and no permission prompt.
- 2026-09-06: Plan written from research.md and design.md with three analysis agents (dependency inventory, verification recipes, before-text). Corrections folded in: `implement` has four supporting files, so the alias carries four pointer files (design.md D2 said five, counting SKILL.md); CLAUDE.md has two name occurrences (lines 13, 86), not the 104 research §4 cited; the 67-line inventory separates dated narrative from current mentions per file.

---

## 🔗 Quick Reference

### Key Files

- **Research**: [research.md](research.md) - inventory (§5), auto-flush sites (§7), lint mechanics (§8), tier-rule copies (§9), release facts (§10), beads model (§13), worktrees (§14), plugin framing (§15)
- **Design**: [design.md](design.md) - D1 through D20
- **Exploration**: [thoughts/2026-09-06-plan-intent-and-human-input.md](thoughts/2026-09-06-plan-intent-and-human-input.md)
- **Alias precedent**: `plugin/skills/create_execution/` (until task 5.3 deletes it; quoted in full in Phase 5 item 2)
- **Release process**: `RELEASING.md`; PR #27

### Common Commands

```bash
# Old-name occurrences outside aliases, changelog, and plan history
grep -rn "implement_coordinated\|implement_tasks\|create_execution" --include=*.md --include=*.sh . | grep -v "^./plugin/skills/implement_coordinated/\|^./plugin/skills/implement_tasks/\|^./CHANGELOG.md\|^./docs/plans/"

# Beads-model sweep
grep -rn "BEADS_MODE\|git add .beads" plugin CLAUDE.md README.md docs | grep -v docs/plans

# Hook on stdin
echo '{"hook_event_name":"SessionStart","source":"startup"}' | time plugin/hooks/wb-prime.sh

# Headless skill event check
claude --plugin-dir plugin --model sonnet -p "<prompt>" --output-format stream-json --verbose --max-turns 2 | grep -o '"skill":"wb:[a-z_]*"'

# Dev session against the working tree
claude --plugin-dir "$(pwd)/plugin"
```

### Design Decisions Reference

- D1-D5: names `implement` and `implement_inline`; alias stubs; through 3.x; `create_execution` deleted; `implement` the default
- D6-D8: beads persistence text; lint exit code; reference.md pointer (Phase 1)
- D9: one branch, one PR; tags; three-session canary
- D10: 3.0.0 with Breaking and Migration
- D11-D16: setup rule; three tiers, `BEADS_MODE` removed; handoff portability; sanity check; worktrees; hygiene and memory
- D17: beads guide, contract inventory, upgrade protocol
- D18: wb-prime, modeled on bd prime
- D19: staged charter (Intent section, per-stage obligations, amendments)
- D20: human-input map; help made stateful

## Beads Issue Tracking

This project uses beads for ALL task tracking across sessions.

**Epic**: prompts-tq7

**Phase Milestones**:

- Phase 1: prompts-1ng (closed at the start of Phase 2)
- Phase 2: prompts-tq7.1 (depends on prompts-1ng)
- Phase 3: prompts-tq7.2 (depends on prompts-tq7.1)
- Phase 4: prompts-tq7.3 (depends on prompts-tq7.2)
- Phase 5: prompts-h1y (depends on prompts-tq7.3)

**Granular Tasks**: See frontmatter `beads_tasks` section for all task IDs.

**Essential Commands**:

- `bd ready` - See what's ready to work on (no blockers)
- `bd show [id]` - View task details and dependencies
- `bd update [id] --claim` - Claim a task
- `bd close [id]` - Complete a task
- `bd blocked` - See what's currently blocked
- `bd list --status=in_progress` - See your active work

**Status Source**: Beads is the source of truth for all task status. Do NOT use markdown checkboxes for tracking.
