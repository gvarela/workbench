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
- **2026-11-13, the rework (Phases 3 to 5)**, on the person's direction to deliver the whole change for one trial rather than increments:
  - **Size**: instruction text is 714,016 characters against the alpha's 847,880, with `wb:prover` and `wb:judge` added. `implement/SKILL.md` 14,767 (was 46,417); the 94,000-character `reference.md` is six playbooks of 4,400 to 12,200; `task-verifier.md` 19,035 (was 49,604) plus `rewrite-verification.md` 5,040; `test-reviewer.md` 13,025 (was 29,044); `task-worker.md` 8,839 (was 14,780); `test-writer.md` 11,172 (was 16,157); `implement_inline/SKILL.md` 10,610 (was 45,356); `judge.md` 8,488. All within the budgets in D9.
  - **Judge replay**, 12 cases, records inline, Fable at high, about $0.65 a case:
    - First run: 11 as expected. The twelfth was a defect in the case: "the 27 days before today plus today" is 28 days, and the judge settled it by citing the README amendment that says so. The case was replaced with a real contradiction between a criterion's statement and its example.
    - Second run of six cases (the corrected one, and those that must reach the person): 6 of 6.
    - Across both runs, every case that must reach the person did, both times: a test edited by a worker with no report; a production defect; coverage a rewrite lost; an outer test loosened by a worker, put with pressure to proceed (six hours blocked, three workers spent, the person away); and a criterion that contradicts its example. A missing link and a report that was returned and never posted came back as repair; a test gap on correct code, a survivor outside its criterion, a rule that left setup no route, and a deviation an existing record explains came back as settle.
  - **Blind integrity trials** (the testing-guidance plan's AC-5 sets, unchanged, delivered through beads and the plan; one run per trial; scored with that plan's scorer and keys):
    - Realistic set: all 6 seeded defects failed with the evidence the key requires. Both controls failed, on a planted rounding defect that violates AC-2's statement and survives the packages' tests (their only half-value, 12.25, is one a float stores exactly), with no integrity finding escalated. The alpha's verifier, run on the same two controls, fails both the same way, with more survivors. The 24-of-24 and 23-of-24 scores in that plan predate the defect runner.
    - Clean set: all 6 seeded defects failed with the key's file and line; the clean control passed; the declared-change control failed, on a defect contrived only to separate the old and new test. The always-fail rule for a loosened assertion now requires a realistic break as proof. That change has not been re-run.
    - An earlier clean-set run is discarded: the runner extracted no criteria from that set's task format, and the verifier correctly stopped on missing context.
  - **End to end**, `/wb:implement` on the planned fixture (three tasks, Opus coordinator, about $10.50):
    - Seven test-writer spawns by the coordinator and none nested; three workers; five task verifications; the test reviewer, phase verifier, and prover at the checkpoint.
    - Task 3's first verification failed on a gap in AC-3's outer test (a ride dated after today could be counted in today's total). `wb:test-writer` rewrote the test, the verifier's differential caught 13 of 13 planted defects including the two the original missed, and the rewrite was committed as the criterion's new red commit and listed under "Decisions I made for you" with its undo. On the alpha the same fixture put this to the person as T1.
    - The checkpoint reported "Needs your decision: nothing" and "Left for you to check: nothing", with each criterion proven by running the product.
    - The judge was not spawned: nothing in this run reached a stop.
  - **End to end, three more runs** on the fixture (Opus coordinator or session):
    - `/wb:implement_inline`, planned fixture (about $4.60): the session wrote the code and no test file; six test-writer spawns (three outer, three task); the test reviewer in inline mode, the phase verifier, and the prover ran; every criterion proven; nothing left for the person; the tree ended clean.
    - `/wb:implement`, the missing-module trap (about $6.20): no `red(AC-3)` commit was made on an import error and the test-writer did not create the module. The coordinator consulted `wb:judge`, the first live consult, and it returned the question for the person in product terms with three options, among them the stub that needs approval by name and a change to where the criterion is observed. On the way, a test gap on the rounding task was closed by the test-writer in request mode and re-verified with no stop.
    - `/wb:implement`, the outer-test-conflict trap (about $10): the AC-3 outer test is unchanged since its red commit, the worker changed the implementation, and the checkpoint had nothing to decide. Whether the worker was tempted to ask for the outer test to change is not visible, so that request path may have gone unexercised.
  - **Found by these runs and fixed**: a test-writer, adding a test on code that already worked, edited a production file with `sed` to show the test could fail and then restored it. The rewritten definition stated the no-production-edits rule only for rewrite mode. It now says, for a test added on working code, that there is no red, that a failure is shown only through the defect runner, and that production code is never changed in any mode.
  - **Paths exercised live**: the test-writer's outer, task, request, and rewrite modes; a failed verification followed by a test-only fix; a rewrite landing on a differential (13 of 13); the judge returning a question for the person; the prover on every checkpoint; `wb-records put`, `have`, and `file`.
  - **Not exercised live**, and so resting on the replay or on reading alone:
    - a worker returning a `needs test:` block (the test-writer's task mode supplied what every worker needed);
    - the judge's repair, settle, and recheck outcomes (replay only), and the judge in unattended mode;
    - a disproven criterion as a P item at a real checkpoint, and a checkpoint test gap closed without asking (the gap in the first run was closed at the task verifier, before the checkpoint);
    - a name-only rename rewrite and a mechanical reflow of an outer test;
    - `/wb:validate_phase`, and `create_design`'s judge pass before approval;
    - the two text changes made after their trials: the realistic-break requirement for a loosened assertion, and the test-writer's no-red rule;
    - anything on a Rails or large repository: every run was on a small Python fixture.
  - **Spend** on validation for the rework: about $90 across the judge replay, the blind trials, and seven end-to-end runs.
  - **Stub approval removed (2026-11-15)**: on one of the trial projects a run stopped for approval of an empty stub class so an outer test could load, and the approved stub still gave no assertion failure, which led the coordinator to ask for an assertion added only to get a red (the test-writer declined). A test that stops on code the plan creates is now a valid red, recorded as `not built: <name>`; no stub is written and nothing is asked. The missing-module trap, which stopped under the old rule, ran through with no stop (about $13): the red record reads `not built: rides.totals`, the worker reported the test went straight to green, the criterion's planted defects were caught, and the checkpoint had nothing to decide. Not exercised: a not-built red in a repository with no defect runner, and a missing name that no task creates.
  - **What the examples leave out (2026-11-16)**: review comments on three pull requests built with wb showed the review agent finding what no criterion named, because every wb check is anchored to the plan: input nobody showed, a failure partway, effects on other callers, and an assumption hidden behind a stub. Two changes. `create_design` asks those three questions of each boundary and records each answer in a Beyond the Examples table as a criterion, `not handled` (listed for approval), or `cannot happen`. The prover lists, for a criterion with a stubbed seam, what only the stub has accepted, and the checkpoint report carries the list.
    - Design trial on the fixture (about $2): six rows for two boundaries, each grounded in file:line; two `not handled` cases presented for approval; four `cannot happen`; the criterion count stayed at two.
    - Prover trial (about $1): the 14 existing checks pass, and the stubbed provider got three assumptions with file:line (response shape, date format, name identity).
    - Not exercised: a question that ends in a new criterion; a boundary with real callers elsewhere in a large repository; the judge listing a `not handled` row before approval; the checkpoint report section in a full run. Not built: a cold review of the diff before the pull request, and a sweep of the run's own follow-ups.
  - **Cold review before the pull request (2026-11-16)**: `/wb:review_diff`, the plugin's first dynamic workflow (`plugin/workflows/review_diff.js`, agent `wb:diff-reviewer`, tests `node tests/review-diff/run.mjs`). Four reviewers read the change without the plan, one lens each; a merge step joins findings with one root cause; a skeptic on the stronger model gives each of the first four a state: confirmed, depends on a condition outside the repository, or not a defect. Nine agents with the defaults.
    - Trial: the shipped command, headless, on a branch as it stood before a pull request whose review comments are known (about 400 changed production lines; about $1.70). Twelve raw findings merged into seven. The one finding the pull request review had rated important came back as "depends", with the production condition named; a second known finding was confirmed; a third was raised and not confirmed; two known minor findings were missed; four findings the pull request review had not made were raised (one sorted as a documented design decision, three not verified). The working tree was unchanged.
    - What the trials changed: the first definition gave the verifier two states, and it dismissed the known important finding because nothing in the repository triggers it; "depends" is the third state. In a headless session every git command was refused and the reviewers returned empty lists, which read as a clean review; a reviewer now reports `blocked`, the lens is listed as not covered, and a run where none could read says the review did not happen (seen live: three lenses blocked and named).
    - Not exercised: `plan=` sorting a finding by criterion or as accepted in the design; an interactive launch with its approval and permission prompts; a large change; a repository in another language. Not measured: how often a confirmed finding is wrong, since no finding was checked by hand.
  - **Design in three passes (2026-11-17; rollback point: tag `v5.0.0-alpha.2`)**: decided with the person after approved mockups failed to reach a build and pull request review kept finding what no criterion named. `create_design` stays one stage and one design.md, run as product, technical, then program passes; it proposes which apply from the Intent and research and the person confirms; each pass asks only what the documents leave open; design.md records each layer as open, closed, or skipped, so a re-run resumes. Still to build: the existing-material index and design scope, conflicting guidance with `.claude/wb/profile.md`, and the layers in the status band.
    - Full run on the fixture (about $2.50, as before the change): all three layers proposed with reasons, recorded and closed; Experience, How the UI Works, Contracts, Patterns to Follow, and Operation filled in; the contract question named the one new thing a task builds and another calls; two criteria, as before.
    - Stop and resume (about $1.17, then $2.49): the first session closed the product pass and stopped; a new session read the layer state, kept the product sections, and closed the other two.
    - A plan meant to be wording-only (about $2.46): no layer was skipped, with reasons from the code (the wording's number had to agree with a window in another file; research showed two patterns for display text). So a skip proposal was not exercised, and nothing was skipped too readily.
    - Size: create_design's skill and template grew by about 10,000 characters after a trim of its closing guidance; instruction text is 736,329 characters against 847,880 at the first alpha.
    - Not exercised: a skipped layer and the judge listing it; an interview with a person answering, since every run used scripted answers; a re-run after material changed.
    - **Existing material and design scope (step 2)**: `create_project` asks once what is already designed or decided and starts the README's Existing Material list; `create_design` reads it, searches for what it lacks, and asks per item when a worker could not open something; the product pass puts one Design Scope list to the person (built to the design, left out, touched but not designed); `create_tasks` maps each to the task that builds it. Trial on a fixture with a designer's file for one of two touched screens (about $2.70 for design, $1.80 for tasks): the file was read from the README list; the scope list had all three groups, with the second screen under "touched, not designed" and an existing pattern chosen for it; tasks.md named the design file on the task that builds the screen and added a comparison line to the manual checks; two criteria, as before. The design showed more than the Goal covers, and the run listed all of that as left out, on the script's "no Intent amendment" answer; with a person present that is the question the list exists to raise. Not exercised: a design a worker cannot open; `create_project` asking the question; material found by search and added to the README.
    - **Conflicting guidance and the profile (step 3)**: one order of authority in the shared rules reference (the plan's decision, a standing rule, the prevailing pattern nearby, the rest of the repository); research and the pattern-finder record competing patterns and stated rules, both sides; the program pass asks only what the order leaves open and offers to record the answer in `.claude/wb/profile.md`; the testing rubric no longer says to follow the code over a stated rule. Trial on a fixture whose repository rule its code breaks (about $1.00 for research, $2.40 for design): research recorded both patterns with counts and quoted the rule with its location; the design followed the rule for new code, left the old literals alone, and took the mixed-file answer from the script; it composed the profile line but the write was refused by a permission prompt in the headless run, and it did not work around that. The same run proposed skipping the technical layer for a wording-only change, recorded the reason, and listed the skip at approval; an earlier run of the same plan had kept that layer because the wording's number disagreed with code elsewhere, so the skip judgment varies between runs and rests on the person's confirmation. Not exercised: the profile file being written and then read by a later plan; an `ask each time` guideline; two rules that disagree; a contract settled at design being used by the test-writer in an implementation run.
    - **Design layers in the status band (step 4, wb-status 0.4.6)**: the band reads `design_layers` and shows `layers: product ✓ technical ● program ○` while design is the current stage; a design with a layer open is not shown as waiting for approval, and the next command names the pass. Checked on the design documents the trials wrote: one with the product pass closed, one with all three closed, and one with the technical layer skipped. 105 mod tests pass; the one failure is the earlier clock-timer test.
    - **Exploration hands off by layer (2026-11-19)**: `explore_design` recorded one decision, which `create_design` used only for the approach, so a product question settled in exploration could be asked again and an exploration that settled no approach could suppress the options. It now tags each decision axis product, technical, or program, flags a technical decision that rests on an unanswered product question, records what it settled per layer in the Synthesis and the `Decide:` close reason, and adds its thoughts docs and any mockups to the README's Existing Material list; each design pass opens with what exploration settled. Trial on the fixture, exploration then design in a new session (about $0.90 and $2.90): the framing tagged two axes (one product, one technical) and said the technical one depended on the product one; the Synthesis and the close reason carried the per-layer list; the README gained the thoughts doc; the design cited the exploration decision in its scope, its approach, a criterion's narrowing, and its rejected alternatives. Not exercised: an exploration that settles only product questions; a record written before this change; mockups made during an exploration.
  - **The status band guesses only for plans tied to the session (2026-11-20, wb-status 0.4.7)**: a session with no plan (a runtime upgrade on its own branch) was shown another plan as "(guessed)", because the guess looked at every unfinished plan in the repository. A plan now needs a tie: the session's branch is the one the plan records, or the branch or the worktree names the plan. With none tied, no plan is shown and the pane lists the unfinished ones; a pin still shows its plan anywhere; outside git the old guess stands. Checked against a real repository's plans: two branches with no plan showed nothing, and two phase and worktree branches tied to their plans. 113 mod tests pass; the one failure is the earlier clock-timer test. Not done: treating a plan as finished when its milestones are closed though its document still says in progress, which keeps stale plans in the pane's list.
  - **Where the time goes, and the verifier's effort (2026-11-20)**: timing of the 15 sessions since the rework: a task takes about 11 minutes of agent time (9 when verified once, 23 when verified again, which a third are); the task verifier is half of all agent time at about 7 minutes and 63 tool calls a run, 60 percent of it model time; 49 of its 72 failures were test gaps on code that was correct or unchanged; a re-verification takes as long as a first pass and repeats nearly all of it; about half of the red commits in one repository are rewrites of outer tests. A blind trial then compared the verifier at high and medium effort on the two seeded-defect sets (16 trials an arm, one run each, about $40): both caught 12 of 12 with the right evidence; controls passed 2 of 4 at high and 3 of 4 at medium; time per verification fell from 4.8 to 2.7 minutes on the harder set and from 2.3 to 1.7 on the other; cost per trial fell 16 to 25 percent. The verifier now runs at medium. Not tested: a large change in another stack; the other reviewers. Not done: a light path for a re-verification after a test-only fix, one call that gathers the verifier's context, a short report on a pass.
  - **Rejected: one call that gathers the verifier's context (2026-11-21)**: a `wb-records context` subcommand that wrote the task, its cited criteria, its labelled comments, and the working tree summary to one file, with the verifier starting from it. Measured on the realistic blind trials at medium effort against the same trials without it: 6 of 6 seeded defects caught either way; 2.8 against 2.7 minutes a verification; 37.2 against 38.1 tool calls a run. The verifier dropped three small reads and added the call and a Read of its file, sometimes the call twice. Not shipped, and the code was discarded. What the same breakdown showed instead: a first verification reads its three earlier records though none exist, and posting three records with their manifests takes five calls on the fixture and about ten on real work. Also set aside: a light path for re-verification after a test-only fix, sized at two to three percent of agent time for a second look given up.
  - **A test gap costs fewer rounds (2026-11-22)**: on a real plan a one-line change took four task verifications and about 70 minutes, with the production code correct throughout. Two causes. The first verifier's suggested fix had been checked against six planted defects, and the test-writer, told a suggested fix is "a starting point", applied part of it, so the next verification found the next instance of the same class. And once the rewrite passed, the owning task was verified again, planting the same defects on the same code and test. Now a fix the verifier checked is passed word for word and applied as written; and a rewrite's verification, given an `Also re-verify:` line, settles the owning task from the same evidence when its production files are byte-for-byte what was verified, posting that task's passing report itself. Checks: the realistic blind trials still catch 6 of 6 seeded defects at medium effort; one end-to-end fixture run was clean (about $7.70). Not exercised: either new path. That run passed every task first time, so no fix was passed on and no rewrite ran; the first real run with a test gap is the test.
  - **Lint as backpressure, kept out of test integrity (2026-11-22)**: two real runs paid heavily for style fixes that landed after a red commit: 98 planted defects to prove a change of quote style across six outer tests, and about an hour for one lint comment on a test with 48 cases. Lint is a conformance check like the build, not test quality. Now the test-writer and worker run the repository's format and lint commands on what they touch before reporting; the coordinator runs them before each verification, and before a task touches a file that already fails it makes a `Structural: lint <file>` commit, which the phase verifier reads as explained when its diff is style only; a style failure is never a verifier finding about tests; the commands live in a Checks section of `.claude/wb/profile.md`; and `test-integrity` classes a change of lint directive comments only as mechanical (`lint-directive`; 8 new tests, 168 passing on bash 5 and 3.2). End-to-end on a fixture with a lint command and two production files that already failed it (about $10.90): each failing file got its structural commit before its task, all three tasks passed their first verification, the three red commits and the final tests were lint-clean, and the lint command ran throughout. The phase verifier flagged the two structural commits as unexplained, costing a judge consult and a second phase verification; the rule that such a commit explains itself was added after that run and has not been exercised. Also not exercised: a test file that already fails lint; a lint-directive change clearing through the verifier in a real run.
  - **Format on write is offered, not shipped (2026-11-22)**: a `PostToolUse` hook on `Edit|Write` fires for subagent writes too, so a formatter hook would keep worker and test-writer output formatted with no instruction. A plugin hook that runs a command read from a repository file would be trusted once for every repository, so wb does not ship one: `/wb:implement` offers once to add the entry to the repository's own `.claude/settings.json`, shows it, and writes only on a yes. Formatter only. Not tested: the offer in a run, and a code formatter rewriting a file inside a subagent.
