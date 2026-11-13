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
| 2 | Bookkeeping in the tool: record slips cannot halt a run | D6 |
| 3 | Outer tests change on proof, not on sanction | D7 |
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

## Phase 2: Bookkeeping in the Tool

### Objective

A record-keeping slip cannot halt a run: posting and filing are single commands that cannot half-succeed, a missing link is repaired, and the tree fingerprint works on a repository with a large dependency directory.

### Changes

1. **`plugin/scripts/wb-records`**: `put`, `have`, `file`, `link` (tests first in `tests/wb-records/run.sh`, with `tests/wb-records/fake-bd` extended for `bd create`, `bd dep add`, and `bd dep list`).
2. **`plugin/scripts/test-integrity`**: `--fingerprint` covers an oversized ignored directory by metadata and reports `metadata_dirs` (tests first in `tests/test-integrity/run.sh`).
3. **Posting**: `agents/task-worker.md`, `agents/test-writer.md`, and "Posting text to beads" in `docs/reference/non-interactive-shell.md` post with `wb-records put` and return the comment id; `skills/implement/SKILL.md` Step 6 checks the returned ids with `wb-records have`.
4. **Filing**: "Evidence in Beads" in `skills/implement/reference.md`, and the filing lines in `skills/implement_inline/SKILL.md` and `skills/validate_phase/SKILL.md`, use `wb-records file`.
5. **Record gaps**: `agents/task-verifier.md` reports a missing `discovered-from` link on a Record gaps line that never fails the task.
6. **Docs**: `plugin/scripts/README.md`, `docs/beads-guide.md` inventory, CHANGELOG.

All of Phase 2 is tracked as `prompts-ia25.10`.

### Success Criteria

- `bash tests/wb-records/run.sh` and `bash tests/test-integrity/run.sh` pass on bash 5 and bash 3.2
- A smoke run of the new subcommands against a real scratch beads database matches the stand-in
- One full `/wb:implement` phase on the fixture completes with workers and test-writers posting through `wb-records put`
- Instruction text does not grow in this phase

### ⛔ CHECKPOINT: Phase 2 Complete

The person's trials show whether record slips still stop a run.

## Phases 3 to 5: The Rework

### Objective

Outer tests change on proof (D7), a judge decides what a stop is (D8), and the graph and prompts are rebuilt around both (D9). The three phases rewrite the same coordinator and verifier files, so they were designed together and each file was rewritten once. Tracked as `prompts-ia25.11`, `.12`, and `.13`.

### Changes

1. **Structural first**: `skills/implement/reference.md` split into `context.md`, `records.md`, `outer-tests.md`, `failures.md`, `checkpoint.md`, and `unattended.md`, text unchanged, with every reference repointed. Later deletions then show in the diff.
2. **`skills/implement/SKILL.md`** rewritten as one loop: tests before the worker, the worker's `needs test:` block brokered by the coordinator, one rule for stops, the checkpoint in its playbook.
3. **`agents/judge.md`** (new), and "The Judge" in `failures.md`: repair, settle, recheck, person; what it may settle and what it never does.
4. **`outer-tests.md`** and **`docs/reference/rewrite-verification.md`** (new): the proof rule, how a rewrite is filed, run, checked, and recorded.
5. **`agents/task-worker.md`**, **`test-writer.md`**, **`task-verifier.md`**, **`test-reviewer.md`** rewritten; `sub-agent-prompts.md` rewritten with the test-writer's four modes and the judge's prompt.
6. **`checkpoint.md`**: the report template; a blocking test gap whose fix is tests only closes without asking; every other item goes through the judge.
7. **`docs/reference/rules-and-intents.md`**: Outer tests and The judge replace Sanction and Delegations.
8. **`skills/implement_inline`** made thin; `validate_phase`, `create_tasks`, `create_design` (the judge before approval), help, wb-prime, and the intake lines updated.
9. **Docs**: CHANGELOG, CLAUDE.md, README, commands reference, workflow guide.

### Validation

- **Judge replay** (`validation/judge-cases.py`, `run-judge-trials.sh`): twelve stops modeled on the trial sessions', records inline, with the accepted outcomes of each.
- **Blind integrity trials** (`validation/run-ac5.sh`): the testing-guidance plan's two AC-5 sets, unchanged, delivered through beads and the plan as the verifier now reads them; scored with that plan's scorer and answer keys.
- **End to end** (`validation/run-headless.sh`): `/wb:implement` on the planned fixture and its trap variants, and `/wb:implement_inline` on the planned fixture.
- **Size** (`validation/size.sh`), lint, `claude plugin validate`, and the script test suites.

### ⛔ CHECKPOINT: The Rework Complete

The person runs it on their two projects, each phase in a fresh session.

## Implementation Notes

- 2026-11-13: plan created from the review of the alpha. The person gave the go-ahead to proceed with these concepts and asked for the prover first, to test in their two projects.
- Plan-doc commits are separate from plugin commits.
- The trial harness (`validation/`) is local only and ignored by git, as the repository's rule for validation harnesses and run data requires. Its results are summarized here.
- **2026-11-13, prover trials** (three headless runs of `wb:prover` on the fixture: one criterion wired correctly, one whose entry point bypasses the fix while its outer test passes, one that needs a credential):
  - All three runs passed all 14 checks: proven with the product's own command and the example's output; disproven with the observed output, the file and line, and what a test would need to assert; could not prove with a reason and steps; working tree unchanged; no process left; the `proof` record read back `ok`; the Proven by line used where present and the route derived from Observed at where absent; the runnable manual check proven and the live-account one left for the person.
  - For the credential criterion each run showed the behavior up to the stubbed seam on a throwaway copy and reported the live call as could not prove. The first version of the check wrongly failed that; the check was corrected, not the agent.
  - Cost and size: 31, 36, and 39 tool calls; 126 to 158 seconds; about $0.91 to $1.05 per run, for three criteria and two manual checks.
  - One friction: scratch files under the temporary directory did not always survive between calls. The definition now says to make, use, and remove a copy in one command.
- **2026-11-13, one full `/wb:implement` phase** on the earlier plan's three-task fixture (headless, Opus coordinator):
  - The coordinator spawned `wb:prover` with the test review and the phase verifier. The checkpoint report carried each criterion's result with what the product showed, and "Left for you to check" said nothing was required, listing both manual checks as proven. One was marked as resting on markup only, because no browser tool was available headless.
  - Not exercised end to end: a disproven criterion as a P item. This fixture's criteria all held. The agent trials cover the disproven state; the P-item wording in a real checkpoint is for the person's trials.
  - Volume: prover 30 tool calls; test reviewer 49; phase verifier 27; three task verifiers 28 to 33; coordinator 66; the whole run about $9.
  - The same checkpoint raised one test decision whose own text says "Is this a real choice? Mostly no … A rule still requires your sanction by name". That is the case Phase 3 (proof in place of sanction) removes.
- **Status fields** in this file's frontmatter are stale until `/wb:update_status` runs; all eight Phase 1 tasks are closed in beads, and the milestone stays open for the person's trials.
- **Size**: the alpha's 926,134 characters counted script code with the instruction text. Measured apart (`validation/size.sh`), instruction text is 847,880 at the alpha and script code 78,254. Phase 1 added about 19,400 characters of instruction text; `agents/prover.md` is 9,244. Later phases have to remove more than this for M4.
- **2026-11-13, Phase 2**:
  - Scripts, tests first: `wb-records` gains `put`, `have`, `file`, and `link` (26 new cases; 78 pass on bash 5 and 3.2), and `test-integrity --fingerprint` covers an oversized ignored directory by metadata (7 new cases; 160 pass on both). A smoke run of the new `wb-records` commands against a real scratch beads database matched the stand-in: the post confirmed in one call, the description stored byte for byte, the link present, and the linked task still ready.
  - One full `/wb:implement` phase on the fixture after the prompt changes: workers and test-writers made 6 `put` calls, every returned block cited its comment id, the coordinator's 3 `have` checks found every id present, 1 issue was filed with `file`, 28 posts were confirmed and none failed, and the working tree ended clean. The run cost about $8.
  - Not exercised: the task verifier's Record gaps line (no task in the fixture is a rewrite task with a missing link), and the fingerprint on the repository that showed the cap error.
  - Size: the prompt commit removes a net 439 characters of instruction text; the scripts' README grows by about 1,400 and script code by about 7,600. Instruction text stands at 868,761 against the alpha's 847,880, and script code at 85,887 against 78,254.
  - Moved to Phase 4: parking a task and continuing independent work at a verification cap in attended mode, because it changes who decides at a stop.
