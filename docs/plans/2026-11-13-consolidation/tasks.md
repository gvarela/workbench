---
project: consolidation
ticket: null
created: 2026-11-13
status: in-progress
last_updated: 2026-11-13
assignee: gabevarela
# progress fields below are maintained by /wb:update_status — do not hand-edit
current_phase: 1
total_tasks: 8
completed_tasks: 0
git_commit: 1ab9b7a
git_branch: 5.0-consolidation
repository: gvarela/workbench
depends_on: [research.md, design.md]
tags: [tasks, consolidation]
beads_epic: prompts-ia25
beads_phases:
  phase1_milestone: prompts-ia25.1
beads_tasks:
  phase1_setup_1: prompts-ia25.2
  phase1_impl_1: prompts-ia25.3
  phase1_impl_2: prompts-ia25.4
  phase1_impl_3: prompts-ia25.5
  phase1_impl_4: prompts-ia25.6
  phase1_impl_5: prompts-ia25.7
  phase1_integration_1: prompts-ia25.8
  phase1_test_1: prompts-ia25.9
---

# Execution Plan: 5.0 Consolidation

## Overview

This plan implements [design.md](design.md). Phase 1 is detailed here. Phases 2 to 5 are listed in order and get their own design pass and tasks when they start, because each depends on what the trials of the phase before it show.

| Phase | Delivers | Design |
| --- | --- | --- |
| 1 | The prover: proof at every checkpoint | D1 to D5 |
| 2 | Bookkeeping tool: record slips cannot halt a run | D6 |
| 3 | Proof in place of sanction for outer-test changes | D7 |
| 4 | Judge and stop routing | D8 |
| 5 | Agent graph and prompt budgets | D9 |

Status lives in beads (`bd show prompts-ia25.1`). Beads holds status; this file holds the plan.

## Testing Strategy

wb is prompts plus shell scripts.

- **Scripts** have real test suites: `tests/wb-records/run.sh`, `tests/test-integrity/run.sh`. A script change starts with a failing case there.
- **Prompt changes** are judged by a headless run on a fixture: `validation/build-fixture.sh` builds the repository, `claude -p --plugin-dir` runs the agent or stage, and `validation/check-prover.sh` checks the saved output against the acceptance criteria. The check is written first and shown failing against the alpha (no prover exists there).
- **Static**: `./plugin/scripts/lint` on touched markdown, `claude plugin validate ./plugin`, and a character count of every touched prompt file against the alpha.

## Phase 1: The Prover

### Objective

At each phase checkpoint a separate agent tries to show every delivered acceptance criterion holding in the running product, and the checkpoint shows that proof with a manual list that holds only what could not be proven.

### Changes Required

#### 1. Trial harness

**Files**: `docs/plans/2026-11-13-consolidation/validation/build-fixture.sh`, `validation/check-prover.sh`, `validation/prompts/` (new)

- `build-fixture.sh <dir>` builds a small Python repository with git history and a beads milestone:
  - a `rides` package with a command-line entry point (`python -m rides list|page|sync`);
  - a finished phase with three criteria: one wired correctly (AC-1 of design.md), one whose page command bypasses the fix while its outer test passes (AC-2), and one that needs a credential the fixture lacks (AC-3);
  - `red(AC-n)` commits before the implementing commits, with close reasons carrying the red line;
  - a plan directory whose design.md gives a Proven by line on one criterion only (AC-7).
- `check-prover.sh <out-dir>` reads the saved report and repository state and prints PASS or FAIL per criterion AC-1 to AC-5 and AC-7.

#### 2. `proof` record name

**Files**: `plugin/scripts/wb-records`, `tests/wb-records/run.sh`, `plugin/scripts/README.md`

- `RECORD_NAMES` (`plugin/scripts/wb-records:58`) gains `proof`; the header comment and README list follow.
- Test first: a `proof (1/1):` post and a `proof` manifest and read.

#### 3. `plugin/agents/prover.md` (new)

Per design D1: inputs, the expectation-first procedure, the three states, the limits, the report, and posting. Under 10,000 characters. Pattern: `plugin/agents/phase-verifier.md` (inputs it reads itself, one plain command per call, posting through `wb-records`).

#### 4. `implement`

**Files**: `plugin/skills/implement/SKILL.md` (Step 8 items 3 and 4), `reference.md` (a "Proof" section after "Phase Verification"), `sub-agent-prompts.md` (a Prover Prompt), `templates.md` (Phase Completion Report)

- Item 3 spawns `wb:prover` in the same message as the test review and the phase verifier.
- Item 4's "Manual checks" section becomes "Proof" and "Left for you to check"; a disproven criterion is a P item under Needs your decision; the reply line gains `fix: P1` and `accept: P1`.
- The barrier in reference.md waits on the prover too.
- Unattended mode: a disproven criterion is a deferred item; a `checkpoint-auto:` record requires no disproven criterion.

#### 5. `implement_inline` and `validate_phase`

**Files**: `plugin/skills/implement_inline/SKILL.md` (Step 5), `templates.md` (Manual Verification Request), `plugin/skills/validate_phase/SKILL.md`, `templates.md`

The same spawn and report sections, pointing at implement's reference section.

#### 6. Design and profile

**Files**: `plugin/skills/create_design/templates.md` (criterion shape, `:71-90`), `SKILL.md` (one sentence), `plugin/skills/testing-profile/SKILL.md` (Step 2), `plugin/skills/create_tasks/templates.md` (Manual Verification note, `:157-158`)

- Criteria gain `Proven by:`.
- The profile gains `## Proof`: start command, address, how to place example data, allowed side effects.
- create_tasks' Manual Verification lists only criteria whose Proven by is `manual:`, plus metrics no criterion refines.

#### 7. Drift bundle and docs

**Files**: `plugin/skills/help/SKILL.md`, `plugin/hooks/wb-prime.sh`, the intake lines of implement, implement_inline, validate_phase, and create_design, `plugin/agents/phase-verifier.md` (the record list gains `proof`), `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/commands-reference.md`, `docs/beads-guide.md` (inventory, if a bd command is added)

#### 8. Trials

- Agent trial on the fixture: AC-1 to AC-5 and AC-7.
- One `/wb:implement` run on a fixture plan with one small task: AC-6.
- Results, costs, and tool-call counts in `validation/results.md`.

### Tasks

- **Build the trial harness** per Changes Required 1; run `check-prover.sh` against a report from the alpha and record the FAIL. → `[beads:phase1_setup_1]`
- **Add the `proof` record name**, test first. → `[beads:phase1_impl_1]`
- **Create `plugin/agents/prover.md`.** → `[beads:phase1_impl_2]`
- **Wire `implement`.** → `[beads:phase1_impl_3]`
- **Wire `implement_inline` and `validate_phase`.** → `[beads:phase1_impl_4]`
- **Add Proven by and the profile's Proof section.** → `[beads:phase1_impl_5]`
- **Drift bundle and docs.** → `[beads:phase1_integration_1]`
- **Run the trials** and record results. → `[beads:phase1_test_1]`

### Success Criteria

#### Automated Verification

- `bash tests/wb-records/run.sh` passes with the new cases
- `bash docs/plans/2026-11-13-consolidation/validation/check-prover.sh <run>` passes AC-1 to AC-5 and AC-7
- `./plugin/scripts/lint` clean on touched markdown; `claude plugin validate ./plugin` passes
- `plugin/agents/prover.md` under 10,000 characters

#### Manual Verification

- The person runs a checkpoint on a real plan in each trial repository and judges whether the Proof section is something they can evaluate, and whether Left for you to check is short and accurate.

### ⛔ CHECKPOINT: Phase 1 Complete

The person's trials on two projects decide whether proof at the checkpoint works, and whether Phase 2 starts as planned.

## Implementation Notes

- 2026-11-13: plan created from the review of the alpha. The person gave the go-ahead to proceed with these concepts and asked for the prover first, to test in their two projects.
- Plan-doc commits are separate from plugin commits.
