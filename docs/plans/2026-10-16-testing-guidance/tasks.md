---
project: testing-guidance
ticket: null
created: 2026-10-16
created_timestamp: 2026-10-16T14:52:56Z
status: not-started
last_updated: 2026-10-16
assignee: gabevarela
# progress fields below are maintained by /wb:update_status — do not hand-edit
current_phase: 1
total_tasks: 31
completed_tasks: 0
git_commit: 9020332a011a0519887c1cde76c9cd84a6e91c22
git_branch: testing-guidance
repository: gvarela/workbench
depends_on: [research.md, design.md]
tags: [tasks, tracking, testing-guidance]
beads_epic: prompts-qhoh
beads_phases:
  phase1_milestone: prompts-65k9
  phase2_milestone: prompts-4h4v
  phase3_milestone: prompts-lpqt
  phase4_milestone: prompts-m6tv
  phase5_milestone: prompts-rgva
  phase6_milestone: prompts-9urg
  phase7_milestone: prompts-ro7i
beads_tasks:
  # Phase 1 tasks
  phase1_setup_1: prompts-3w7b
  phase1_setup_2: prompts-m1r6
  phase1_setup_3: prompts-vfha
  phase1_setup_4: prompts-jcit
  phase1_test_1: prompts-ynvp  # closed: split into phase1_test_1a and phase1_test_1b
  phase1_test_1a: prompts-kz5p
  phase1_test_1b: prompts-m9rq
  phase1_test_2: prompts-r8bb
  # Phase 2 tasks
  phase2_impl_1: prompts-tgsl
  phase2_impl_2: prompts-tvvu
  phase2_impl_3: prompts-bhhr
  # Phase 3 tasks
  phase3_impl_1: prompts-l6oo
  phase3_impl_2: prompts-54aa
  phase3_test_1: prompts-0wy4
  # Phase 4 tasks
  phase4_impl_1: prompts-i50b
  phase4_impl_2: prompts-ah90
  phase4_impl_3: prompts-jz50
  phase4_impl_4: prompts-9yda
  phase4_test_1: prompts-1xve
  # Phase 5 tasks
  phase5_impl_1: prompts-z127
  phase5_impl_2: prompts-wzoc
  phase5_impl_3: prompts-jbqm
  phase5_impl_4: prompts-jztu
  phase5_test_1: prompts-dnb3
  # Phase 6 tasks
  phase6_impl_1: prompts-xplp
  phase6_impl_2: prompts-4fbv
  phase6_impl_3: prompts-66vs
  phase6_impl_4: prompts-xau5
  phase6_test_1: prompts-szwd
  # Phase 7 tasks
  phase7_integration_1: prompts-6ztj
  phase7_integration_2: prompts-uis9
  phase7_test_1: prompts-33yh
  phase7_integration_3: prompts-0phw
---

# Execution Plan: Testing Guidance

<!-- markdownlint-disable MD024 -->

## Overview

This plan implements [design.md](design.md): criteria-first testing, separated test authorship, verifier-reviewed integrity, one shared quality rubric, and plan-carried stack conventions. It is the formalized decision `prompts-cbc3` and its four amendments.

**Design Approach**: Criteria-first, separated test authorship, verifier-reviewed integrity, one shared quality rubric.

**Target State** (design.md Success Metrics, each refining a README Intent statement):

- **M1**: on a fixture plan, every acceptance criterion has an outer test at its observed-at boundary. Each was written by `wb:test-writer` and shown to fail on an assertion before implementation.
- **M2**: `task-verifier` FAILs each planted integrity defect type in at least 2 of 3 blind trials, and PASSes a clean control 3 of 3.
- **M3**: `/wb:test-audit`, run cold on sg-wholesale and fitness-agent, states each stack correctly and recalls at least 7 of 11 and at least 10 of 16 still-present W3–W5 instances. At least 8 of 10 spot-checked findings are real, and it states that W1 and W2 are not checkable cold.
- **M4**: every design decision traces to research with its evidence strength. This is satisfied in design.md's Traceability table; no task.
- Deferred: none.

## Implementation Strategy

### Phase Rationale

The plan follows the design's own method. Expected behavior is fixed first, a harness exists before any outer check needs it, and every outer check is shown to fail before the change that makes it pass.

1. **Phase 1, the validation harness and red baselines.** The design's Harness Decisions table records "add harness": the fixture repositories and a headless driver. This phase builds them and records today's results. Every acceptance criterion except AC-8's "runs unchanged" half fails today. AC-5's blind trials against the current verifier are the red arm of the red-to-green method (memory `wb-blind-trial-skill-eval-method`). The worker tool-call baseline for `prompts-pqlw` must be measured on 4.0.0, before the worker changes.
2. **Phase 2, the shared foundation.** The `test-quality` rubric is preloaded into four agents, so it comes first. `tdd-discipline` defines red and the single list of exceptions, which the worker, test-writer, and inline skill all point to. The research Testing conventions section is read by every later consumer (dependency analysis, Layer 0).
3. **Phase 3, the planning side.** The `create_design` template, then `create_tasks`, which consumes its format. It ends with the AC-1, AC-2, and AC-7 headless checks.
4. **Phase 4, the agents and the per-task gate.** `wb:test-writer`, `task-worker`, `task-verifier`, and `wb:test-reviewer`. This is the riskiest behavior change; M2 and `prompts-bzu0` are judged here by AC-5's green arm.
5. **Phase 5, the execution side.** The `implement` coordinator, `implement_inline`, and `validate_execution`, wired to the Phase 4 agents. It ends with the AC-3, AC-4, AC-8, and AC-9 headless runs and the `prompts-pqlw` measurement.
6. **Phase 6, the cold audit.** `wb:test-auditor`, `/wb:test-audit`, `/wb:testing-profile`, and the review-prep pointer. It ends with AC-6 on the two real repositories, including the user's spot-check (`prompts-ul2x`). It depends only on Phases 2 and 4, so its beads tasks can be ready in parallel with Phase 5. The milestone order still keeps checkpoints sequential.
7. **Phase 7, release.** Docs sweep, CHANGELOG, the full static gate, the 5.0.0 bump, the installed-copy check (`prompts-sm6l`), and the canary. Per RELEASING.md, the breaking change ships last and carries the bump.

**From the dependency analysis**:

- The critical path is `test-quality` → `wb:test-writer` → `task-worker` / `task-verifier` → `implement` reference.md → sub-agent-prompts.md → SKILL.md → checkpoint `wb:test-reviewer`.
- `plugin/skills/help/SKILL.md` and `plugin/hooks/wb-prime.sh` are touched by six stage-scope bundles (CLAUDE.md:164) and two new commands. Every task that edits them takes a file-overlap edge to the previous such task, so no two run in parallel.
- `implement/SKILL.md`, `implement/reference.md`, and `implement/sub-agent-prompts.md` are each edited by exactly one task.

**Parallel width**:

- Phase 1's fixture, static-check, and blind-trial tasks are independent.
- In Phase 2, `test-quality` and `tdd-discipline` are independent.
- In Phase 4, `task-worker` and `task-verifier` run in parallel once `wb:test-writer` exists.
- Phase 6 can run alongside Phase 5.

### Testing Strategy

wb is markdown prompts plus small shell scripts and has no unit-test suite. The "tests" for this plan are three kinds of validation, all built in Phase 1 and all kept under `docs/plans/2026-10-16-testing-guidance/validation/`, never under `plugin/`:

- **Static checks** (`validation/static-checks.sh`): no model; run after every task. Line counts must not grow from the base commit. Literal verdict markers must appear only in the verifier's own status line. Spawns must use the `wb:` prefix. Agent frontmatter must match D3, D8a, and D8b. The rubric must exist in a single source. The help drift check, both manifests at a matching version, lint zero-delta, and the "predates 5.0.0" fallback strings, and the presence of prompt-audit reports round out the 17 checks.
- **Headless fixture runs** (`validation/run-headless.sh`): `claude -p --plugin-dir` against scratch copies of the fixtures, following the `wb-headless-plugin-run-recipe` memory:
  - `Skill` is in `--allowedTools`.
  - Every intake answer is pre-supplied.
  - Only assistant lines are grepped, with `grep -E`.
  - Scratch copies live in an untracked directory inside the worktree and are deleted afterwards.
- **Blind trials** for AC-5: fresh contexts get only the verbatim verifier text plus a synthesized fixture, never the expected answer. There are 3 trials per fixture, run first against the 4.0.0 verifier (red) and then against the new verifier (green).

- **Prompt audit gate** (added at the user's request): every task that creates or meaningfully modifies prompt text runs the claude-api skill's `prompt-audit` subcommand on the files it touched, before closing its beads issue.
  - **What counts as prompt text**: anything under `plugin/` that a model reads, meaning `SKILL.md` and its supporting files (`templates.md`, `sub-agent-prompts.md`, `reference.md`, `examples.md`), `plugin/agents/*.md`, the orientation text in `plugin/hooks/wb-prime.sh`, plus the repository `CLAUDE.md`.
  - **What counts as meaningful**: a new file, or any change to instruction or behavior text. Purely mechanical edits are exempt: link or path fixes, renames, version strings, line counts, a help table row that only mirrors a stage's intake sentence. The exemption is stated in the task's close reason.
  - **How to run it**: `/claude-api prompt-audit <the touched files>`.
    - The scope is exactly the files the task touched.
    - The target model is the model that reads the file: an agent's frontmatter `model` (test-writer → Sonnet 5.5; test-reviewer, test-auditor and task-verifier → Opus 5.5; task-worker → its per-spawn model, audited against Sonnet 5.5 as the default tier). A skill is audited against the session model, Opus 5.5.
    - The audit is non-interactive and produces a report and a proposed diff. It applies nothing on its own.
  - **Recording**: save the report to `validation/prompt-audits/<task-key>.md`, for example `phase4_impl_1.md`.
  - **Handling findings**:
    - Every **high- or medium-confidence** finding is either applied in the same task, or declined with a one-line reason in that report. A Group 2 conflict between instruction files must be resolved, not declined.
    - **Low-confidence and `flag`** items are recorded only.
    - The keep-list governs: context, tool contracts, load-bearing trigger text, and prohibitions against current failures stay.
  - **Who checks**: the task-verifier for that task confirms the report exists and every high or medium finding has a disposition.
  - **Applicable tasks**: phase2_impl_1, 2 and 3; phase3_impl_1 and 2; phase4_impl_1 to 4; phase5_impl_1 to 4; phase6_impl_1 to 4; phase7_integration_1 (the `CLAUDE.md` portion).
  - **One extra audit at the end**: the Phase 7 gate also audits the whole changed prompt surface as one scope, to catch contradictions that only appear across files.

Each phase's last task runs that phase's acceptance criteria. Because Phase 1 recorded each criterion failing first, a phase's validation task shows the change turned it green. That is the design's own "the outer test is red on an assertion before implementation" applied to wb itself.

## Progress Overview

Progress is tracked in beads. To check current status:

```bash
bd stats                    # Overall project statistics
bd list --status=closed     # See completed tasks
bd list --status=in_progress # See active work
bd ready                    # See available work
```

**Phase status** (milestone IDs are in the frontmatter `beads_phases`):

- Phase 1: milestone `prompts-65k9`, depends on 6 tasks
- Phase 2: milestone `prompts-4h4v`, depends on 3 tasks
- Phase 3: milestone `prompts-lpqt`, depends on 3 tasks
- Phase 4: milestone `prompts-m6tv`, depends on 5 tasks
- Phase 5: milestone `prompts-rgva`, depends on 5 tasks
- Phase 6: milestone `prompts-9urg`, depends on 5 tasks
- Phase 7: milestone `prompts-ro7i`, depends on 4 tasks

Use `bd show <milestone-id>` to see which tasks block each phase milestone.

## Beads Issue Tracking

This project uses beads for all task tracking across sessions.

**Epic**: `prompts-qhoh`. The phase milestones are its children.

**Phase Milestones**: listed above. Each phase milestone depends on all of its phase's tasks and on the previous milestone.

**Granular Tasks**: see frontmatter `beads_tasks` for all task IDs.

**Related validation issues**: `prompts-sm6l` (nested spawn in installs), `prompts-pqlw` (worker budget), `prompts-bzu0` (verifier consistency), `prompts-ul2x` (judgment calibration). They close from Phase 4, 5, 6 and 7 results.

**Essential Commands**:

- `bd ready`: see what's ready to work on (no blockers)
- `bd show <id>`: view task details and dependencies
- `bd update <id> --claim`: claim a task
- `bd close <id>`: complete a task
- `bd blocked`: see what's currently blocked
- `bd list --status=in_progress`: see your active work

**Status Source**: beads is the source of truth for all task status. Do not use markdown checkboxes for tracking.

---

## Phase 1: Validation Harness and Red Baselines

### Objective

Build the fixtures, scripts, and blind-trial set that judge the design's acceptance criteria, and record that today's plugin fails them.

### Prerequisites

- Research complete (research.md `status: complete`)
- Design approved (design.md `status: ready`)
- `claude` CLI available for headless runs; `bd` 1.1.0 or later

### Changes Required

#### 1. Static checks

**File**: `docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh` (new)

**Current state**: no scripted checks beyond `plugin/scripts/lint` and RELEASING.md's manual greps (RELEASING.md:31).

**Target state**: one bash script, run from the repository root. It prints PASS or FAIL per check and exits non-zero on any FAIL. It records the base-commit line counts it compares against (base = `9020332`). The checks are the 16 in the Testing Strategy:

1. No touched SKILL.md is longer than at the base commit. Base lengths: implement 441, implement_inline 587, create_tasks 422, create_design 333, create_research 214, validate_execution 232, help 302, review-prep 158, tdd-discipline 94.
2. `### Status: (PASS|FAIL)` appears only in `plugin/agents/task-verifier.md`'s report template.
3. Every spawn of `test-writer`, `test-reviewer`, or `test-auditor` uses the `wb:` prefix.
4. Agent frontmatter: test-writer `sonnet`/`medium`/`skills: [test-quality]` with no `Agent` tool; test-reviewer and test-auditor `opus`/`high`/`skills: [test-quality]`; task-worker's `tools:` includes `Agent`.
5. Rubric phrases ("Can this test fail", "Structure-insensitive") appear only under `plugin/skills/test-quality/`.
6. `implement_inline` has no exception list of its own.
7. RELEASING.md's help drift check for every user-invocable skill.
8. Both manifests carry the same version.
9. Lint zero-delta on touched files.
10. `claude plugin validate ./plugin` passes.
11. `validate_execution` has no general-purpose coverage agent and references `wb:test-reviewer`.
12. `implement/reference.md` names a committed red outer test as expected state.
13. `implement/sub-agent-prompts.md` no longer contains "NO additional test cases not specified".
14. If a bd command changed under `plugin/`, `docs/beads-guide.md` changed too.
15. The "predates 5.0.0" fallback appears in create_tasks, implement, and implement_inline.
16. No file under `plugin/` references `validation/`.
17. Every task in the prompt-audit gate's applicable list that is closed in beads has a `validation/prompt-audits/<task-key>.md` report, or its close reason states the mechanical-edit exemption.

**Pattern reference**: RELEASING.md:31 (verification gate); `plugin/scripts/lint` (script style, colored PASS/FAIL).

#### 2. Fixture P (Python)

**Directory**: `docs/plans/2026-10-16-testing-guidance/validation/fixtures/python-rides/` (new, plain files with no `.git`; `run-headless.sh` copies it to scratch and runs `git init`)

**Content**, kept minimal:

- **Package files**:
  - `pyproject.toml`: pytest only, no browser harness.
  - `rides/store.py`: an importable `list_rides(rides, today)` that returns rides from the last 27 days, so the 28-day criterion fails on an assertion, not an import.
  - `rides/views.py`: the rides page HTML as a string.
  - `rides/view_model.py`: a rounding function.
  - `wizard/wizard.html` and `wizard/wizard.js`: question auto-advance, with no focus handling.
- **Tests**:
  - `tests/test_store.py` and `tests/test_view_model.py`: sound tests.
  - `tests/test_load_series.py`: contains `assert value == 3`, the target for the AC-5 F3 fixture.
  - `tests/test_today_page.py`: one vacuous `assert "x" not in body` with no presence anchor, for AC-9.
- **Seeded plan** at `docs/plans/2026-10-20-rides/`:
  - README with Intent.
  - research.md complete.
  - A pre-answered intake file (`validation/fixtures/python-rides.answers.md`) carrying every confirmation the stages ask for.
- **Variants**:
  - `with-profile/`: `.claude/wb/testing.md` declaring "no browser tests", plus a `playwright.config.ts` stub (AC-7 drift).
  - `legacy/`: a design.md without Acceptance Criteria and a matching tasks.md (AC-8).

#### 3. Fixture R (Ruby)

**Directory**: `docs/plans/2026-10-16-testing-guidance/validation/fixtures/ruby-stores/` (new)

**Content**:

- `Gemfile` with rspec, factory_bot, rubocop-rspec.
- `app/resolvers/store_resolver.rb`.
- `spec/resolvers/store_resolver_spec.rb` containing an `allow_any_instance_of`, a stub of the subject, a `pending` example, and a mirrored oracle.
- `.rubocop.yml` enabling only the default cops.

It is used for AC-7 stack detection and as a cheap smoke target for D8b detector selection. AC-6 itself runs on the real repositories.

#### 4. Headless driver

**File**: `docs/plans/2026-10-16-testing-guidance/validation/run-headless.sh` (new)

**Target state**:

- `run-headless.sh <fixture> <variant> <prompt-file> <out-dir>`.
- Copies the fixture to `.scratch/<run-id>/` inside the worktree (untracked; `.scratch/` added to `.git/info/exclude`), runs `git init` and an initial commit, then runs:

  ```bash
  claude -p "$(cat <prompt-file>)" --plugin-dir "$REPO/plugin" \
    --allowedTools "Skill" "Agent" "Read" "Write" "Edit" "Bash" "Grep" "Glob" \
    --permission-mode acceptEdits --output-format stream-json --verbose
  ```

- Saves the transcript and a copy of the fixture's resulting `docs/plans/` and `git log --stat`, then deletes the scratch copy.
- The memory notes that a slash-prompt run emits no skill event, so checks read assistant text and Agent tool_use events.
- Companion `validation/checks/` scripts, one per acceptance criterion (`ac1.sh` … `ac9.sh`), grep the saved outputs for the AC's Then-clauses as listed in the test coverage analysis. Examples: `ac1.sh` checks each `AC-n` block has Given, When, Then, `Example:` with a digit, `Observed at:`, and `Refines:`; `ac3.sh` checks a `red(AC-` commit touching only test paths whose recorded failure matches `AssertionError|assert` and not `ImportError|ModuleNotFoundError`.

#### 5. AC-5 blind-trial set

**Directory**: `docs/plans/2026-10-16-testing-guidance/validation/blind-trials/ac5/` (new)

**Content**:

- One tiny Python repository template with a green suite.
- Eight fixture packages, each holding a task statement, the cited criterion and example, the starting commit, the diff, the worker report with its Test-writer reports field, and red-commit info:
  - **F1** deleted test, undeclared
  - **F2** added `@pytest.mark.skip`
  - **F3** `== 3` → `>= 1`
  - **F4** expected value computed with the production function, declared
  - **F5** spec changed by `sed -i` with the reports field empty
  - **C** clean control
  - **T1** legitimate declared test change
  - **T2** loosened assertion declared with a reason not tied to the criterion
- A runner prompt that spawns `wb:task-verifier` against each fixture in a fresh context with no hint of the defect.
- A scorer. A trial counts as FAIL only on the literal `### Status: FAIL` and only if the Test Integrity section names the planted file:line. It records the cause classification.

#### 6. Worker tool-call baseline

**Output**: `docs/plans/2026-10-16-testing-guidance/validation/baselines/4.0.0-worker-tool-calls.md` (new). It holds tool calls per worker and per task from one `/wb:implement` phase on Fixture P under the current 4.0.0 plugin, with the evidence attached to `prompts-pqlw`.

### Tasks

**Note**: Task status is tracked only in beads. The tasks below document what needs to be done; run `bd list` or check the frontmatter `beads_tasks` for IDs.

#### Setup Tasks

- **Write `validation/static-checks.sh`** with the 17 checks above. → `[beads:phase1_setup_1]`
  - Run it at this commit. Record which checks FAIL today (the red baseline) in `validation/baselines/static-4.0.0.txt`.
  - Projected about 30 tool calls.
- **Build Fixture P and its variants** (`python-rides/`, `with-profile/`, `legacy/`, answers file) as specified in Changes Required 2. → `[beads:phase1_setup_2]`
  - Run `pytest` on a scratch copy and confirm the sound tests pass and the 28-day behavior is absent.
  - Projected about 40 calls.
- **Build Fixture R** as specified in Changes Required 3. → `[beads:phase1_setup_3]`
  - Projected about 15 calls.
- **Write `validation/run-headless.sh` and `validation/checks/ac1.sh` … `ac9.sh`.** → `[beads:phase1_setup_4]`
  - **Can-fail proof**: run `/wb:create_design` on Fixture P with the current 4.0.0 plugin and confirm `ac1.sh` FAILs because there is no Acceptance Criteria section. Record the run in `validation/baselines/`.
  - Projected about 45 calls; depends on Fixture P.
- **Build the AC-5 blind-trial set and run the red arm** against the current `plugin/agents/task-verifier.md` (8 fixtures × 3 trials). → `[beads:phase1_test_1]`
  - Record the tallies in `validation/baselines/ac5-red.md` and as a comment on `prompts-bzu0`.
  - Expected: most defect fixtures PASS today (the verifier grades test quality "minor", `task-verifier.md:161`).
  - Projected about 45 calls. If the trial runs exceed that, split into a fixture-building task and a trial-run task at that seam.
- **Measure the worker tool-call baseline**: one `/wb:implement` phase on Fixture P under 4.0.0, via `run-headless.sh`. → `[beads:phase1_test_2]`
  - Count tool calls per worker and per task from the stream.
  - Write `validation/baselines/4.0.0-worker-tool-calls.md` and comment on `prompts-pqlw`.
  - Depends on Fixture P and the driver.

### Success Criteria

#### Automated Verification

- `bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh` runs and reports today's FAILs (non-zero exit expected in Phase 1)
- `bash docs/plans/2026-10-16-testing-guidance/validation/checks/ac1.sh <baseline-run>` exits non-zero on the 4.0.0 run
- `./plugin/scripts/lint` is clean on the new markdown in `validation/`

#### Manual Verification

- The fixture plans read as realistic. The user skims `python-rides/docs/plans/2026-10-20-rides/research.md`.
- The AC-5 red tallies are recorded on `prompts-bzu0`.

### Modified Files

- **Validation (new, docs-only)**:
  - `docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`
  - `validation/run-headless.sh`
  - `validation/checks/ac1.sh` … `ac9.sh`
  - `validation/fixtures/python-rides/`, `validation/fixtures/ruby-stores/`
  - `validation/blind-trials/ac5/`
  - `validation/baselines/`
- **Local only**: `.git/info/exclude` gains `.scratch/`. It is not committed.

**Quick check command for this phase**:

```bash
bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh
```

### ⛔ CHECKPOINT: Phase 1 Complete

The harness is what every later phase is judged against, so a human confirms it before anything in `plugin/` changes.

1. All Phase 1 task beads issues closed (`bd list --status=closed`)
2. Phase 1 milestone beads issue closed
3. Red baselines recorded: static checks, AC-1 on 4.0.0, AC-5 red arm, worker tool calls
4. The user has confirmed the fixtures and baselines
5. Plan-doc status reconciled via `/wb:update_status`

**Verification**: `bd show prompts-65k9` shows every blocking task closed.

---

## Phase 2: Shared Foundation

### Objective

Create the single test-quality rubric, reframe `tdd-discipline`, and add the research Testing conventions section that every later consumer reads.

### Prerequisites

- Phase 1 complete and confirmed

### Changes Required

#### 1. `test-quality` background skill (D7)

**Files**:

- `plugin/skills/test-quality/SKILL.md` (new)
- `plugin/skills/test-quality/reference.md` (new)

**Target state**:

- **SKILL.md** frontmatter:
  - `name: test-quality`
  - `description: Use when writing, changing, verifying, reviewing, or auditing automated tests …` (trigger text, per the background-skill pattern)
  - `user-invocable: false`
- **Body**: the four parts of design.md D7:
  1. "Can this test fail?", the mechanical first pass.
  2. Checkable items under Behavioral, Structure-insensitive, Specific, and Predictive.
  3. Verdicts: Remove, Rewrite, Consolidate, Keep, each with its condition.
  4. How reviewers judge:
     - yes/no items with file:line evidence;
     - deterministic vs judgment-only labels;
     - a majority of three for judgment-only Remove or Rewrite;
     - repository conventions override generic style items.
- **reference.md** holds:
  - the per-stack detector selections table (from [Test quality verification](external-research/Test%20quality%20verification.md), section "Detectors catch …");
  - the custom heuristics list;
  - the Review finding shape from design.md's Data Model.
- State each rule once, in plain language with a reason (prompt-audit convention; no caps emphasis).

**Pattern reference**:

- `plugin/skills/tdd-discipline/SKILL.md:1-25` (background-skill frontmatter and opening)
- `plugin/docs/reference/documentarian-philosophy.md` (a single source linked from several places)

#### 2. `tdd-discipline` reframe (D5)

**File**: `plugin/skills/tdd-discipline/SKILL.md` (94 lines)

**Current state** (research.md §3): the Iron Law at :13-25; RED verify bullets at :29-37 ("Test fails (not errors)", "Fails because feature missing (not typos)"); red flags at :70-78; no list of exceptions. `implement_inline/SKILL.md:489-498` names four exceptions on its own.

**Target state**:

- RED defines red as an assertion failure on the intended behavior. A load, import, or missing-constant error is "not red yet: make the code importable, then re-run".
- A new "Named exceptions" section: harness tasks, proven by a deliberately wrong expectation failing and then restored; configuration; documentation; refactors covered by existing tests; build scripts.
- One line: "Under `/wb:implement` and `/wb:implement_inline`, have `wb:test-writer` write the test; see the test-quality skill."
- Net length stays at or under 94 lines; condense the rationalization table if needed.

#### 3. Research Testing conventions section (D10)

**Files**:

- `plugin/skills/create_research/templates.md` (140 lines; the template's "Conventions observed" at :84 has only "Testing uses [observed approach]")
- `plugin/skills/create_research/sub-agent-prompts.md` (75)
- `plugin/skills/create_research/SKILL.md` (214)

**Target state**:

- **templates.md**: a required `## Testing Conventions` section with factual fields:
  - frameworks and versions;
  - fast and full commands;
  - the levels present and the harness per boundary;
  - fixtures vs factories;
  - seams and mocking patterns in use;
  - skip markers;
  - installed test-quality linters and profilers and what they enable;
  - installed mutation tool;
  - services the suite needs.

  Add a profile line: when `.claude/wb/testing.md` exists, cite it as the baseline and list any drift from the code.
- **sub-agent-prompts.md**: the pattern-finder prompt asks for these fields.
- **SKILL.md**: one scope line naming the section. Length stays at or under 214.
- **Drift bundle** (CLAUDE.md:164, scope change), all in the same commit:
  - `plugin/skills/help/SKILL.md`: create_research's Command Details line and the "What each stage needs from you" row (`help/SKILL.md:95+`) mention testing conventions;
  - `plugin/hooks/wb-prime.sh` (orientation stage-chain line, about line 17);
  - create_research's "This stage needs from you" line (`SKILL.md:33`), unchanged in substance, confirmed to still match the help row.

### Tasks

#### Implementation Tasks

- **Create `plugin/skills/test-quality/SKILL.md` and `reference.md`** per Changes Required 1. → `[beads:phase2_impl_1]`
  - Confirm `static-checks.sh` check 5 (single-source rubric) PASSes and lint is clean.
  - Projected about 30 calls.
- **Reframe `plugin/skills/tdd-discipline/SKILL.md`** per Changes Required 2. → `[beads:phase2_impl_2]`
  - Check 1 (no growth) PASSes for tdd-discipline.
  - Projected about 15 calls.
- **Add the Testing Conventions section to `create_research`**, with its drift bundle in `help/SKILL.md` and `wb-prime.sh`, per Changes Required 3. → `[beads:phase2_impl_3]`
  - Check 7 (help drift) and check 1 PASS for create_research.
  - Projected about 30 calls.

### Success Criteria

#### Automated Verification

- `static-checks.sh`: checks 1, 5, and 7 PASS for touched files
- `./plugin/scripts/lint plugin/skills/test-quality/*.md plugin/skills/tdd-discipline/SKILL.md plugin/skills/create_research/*.md plugin/skills/help/SKILL.md` is clean
- `claude plugin validate ./plugin` passes

#### Manual Verification

- The user reads `test-quality/SKILL.md`. Each Part 2 item is a yes/no question a reviewer could answer from a file.

### Modified Files

- **New**: `plugin/skills/test-quality/SKILL.md`, `plugin/skills/test-quality/reference.md`.
- **Modified**:
  - `plugin/skills/tdd-discipline/SKILL.md`
  - `plugin/skills/create_research/{SKILL,templates,sub-agent-prompts}.md`
  - `plugin/skills/help/SKILL.md`
  - `plugin/hooks/wb-prime.sh`

**Quick check command for this phase**:

```bash
bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh
```

### ⛔ CHECKPOINT: Phase 2 Complete

The rubric and the red definition are what every later agent preloads, so a human confirms them before the agents are written.

1. All Phase 2 task issues and the milestone closed
2. Automated verification passing
3. The user has confirmed the rubric's wording
4. `/wb:update_status` run

---

## Phase 3: Planning Side

### Objective

Make design produce acceptance criteria and harness decisions, and make tasks turn them into outer-test steps and harness tasks.

### Prerequisites

- Phase 2 complete (the Testing Conventions headings exist; design's harness table reads them)

### Changes Required

#### 1. `create_design` acceptance criteria and harness decisions (D1, D2)

**Files**:

- `plugin/skills/create_design/templates.md` (134; Success Criteria at :69-79)
- `plugin/skills/create_design/SKILL.md` (333; scope list at :286 and :295; intake line at :23; BARRIER 4 at :207)

**Target state**:

- **templates.md**:
  - Replace "Functional Requirements" with an **Acceptance Criteria** section using the design.md Data Model shape: id, Given/When/Then, an example with real values, Observed at, Seam when external or an LLM, Refines.
  - Add a **Harness Decisions** table: boundary, harness present (from research Testing Conventions), and a decision of add harness, manual, or lower proxy with the loss stated.
  - Keep Non-Functional Requirements.
- **SKILL.md**:
  - Replace "Test writing tasks (HOW to test it)" at :295 with: "Acceptance criteria and their observation boundaries are WHAT; how tests are written and sequenced belongs in tasks.md."
  - Add the sizing rule, one criterion per changed behavior.
  - Extend BARRIER 4 so every criterion names the Success Metric it refines.
  - The intake line becomes "approval of the approach, the refined metrics, and the acceptance criteria with their harness decisions".
- **Backward compatibility**: none needed here; old designs are simply older files.
- **Drift bundle**, scope and intake in the same commit:
  - help's "What each stage needs from you" row for create_design and its Command Details;
  - wb-prime's six-line summary line for create_design (`wb-prime.sh` about :33).

#### 2. `create_tasks` outer tests and harness tasks

**Files**:

- `plugin/skills/create_tasks/templates.md` (304; Testing Tasks block at :120-127)
- `plugin/skills/create_tasks/sub-agent-prompts.md` (73; coverage agent at :32-53)
- `plugin/skills/create_tasks/examples.md`
- `plugin/skills/create_tasks/SKILL.md` (422; task types at :203; sizing at :401-414; Step 6 at :268-276)

**Target state**:

- **templates.md**:
  - Remove the trailing Testing Tasks block.
  - Each phase gains:
    - **Harness Tasks**: before the first outer test at a boundary marked "add harness"; proven by can-fail;
    - **Outer Test Steps**: one per acceptance criterion; executed by the coordinator via `wb:test-writer`; produces a `red(AC-n)` commit;
    - **Implementation Tasks**: each cites the criterion ids it serves.
  - Automated Verification uses the commands from research Testing Conventions, not npm placeholders.
- **sub-agent-prompts.md**: the coverage agent maps each criterion to its boundary, harness presence, and the inner cases implied by its examples. It no longer proposes a separate unit and integration test list.
- **examples.md**: bd examples for an outer-test step and a harness task, with the edge "implementation task depends on the outer-test step" (the outer test is the artifact consumed).
- **SKILL.md**:
  - Task types gain `harness` and `outer-test`.
  - Sizing adds about 3 calls per expected test-writer request to the tool-call table.
  - Step 6 checks that every acceptance criterion has an outer-test step.
  - Fallback: "no acceptance criteria: plan predates 5.0.0", planning as today.
  - Length stays at or under 422; move detail to templates.md and examples.md.
- **Drift bundle**: help Command Details and row for create_tasks; wb-prime line if its wording names testing tasks.

#### 3. Validation of AC-1, AC-2, AC-7

Run `run-headless.sh` chains on Fixture P and the `with-profile` variant, and check with `checks/ac1.sh`, `ac2.sh`, and `ac7.sh`:

- research → design → tasks, with no browser harness and "add harness" pre-answered;
- a second design run with "manual" pre-answered, which must emit no harness task;
- research on `with-profile`, which must record the drift.

Repeat AC-1 and the AC-7 drift check 3 times each.

### Tasks

#### Implementation Tasks

- **Update `create_design`** templates.md and SKILL.md, with its drift bundle, per Changes Required 1. → `[beads:phase3_impl_1]`
  - Projected about 35 calls.
- **Update `create_tasks`** templates.md, sub-agent-prompts.md, examples.md, and SKILL.md, with its drift bundle, per Changes Required 2. → `[beads:phase3_impl_2]`
  - It consumes the Acceptance Criteria and Harness Decisions format from phase3_impl_1, and serializes `help/SKILL.md` access after it.
  - Projected about 45 calls.

#### Testing Tasks

- **Run the AC-1, AC-2, and AC-7 headless validations** per Changes Required 3. → `[beads:phase3_test_1]`
  - Record PASS or FAIL per AC in `validation/results/phase3.md`.
  - A failing AC returns to the responsible task as a verified failure. A failure caused by the design itself is a plan defect.

### Success Criteria

#### Automated Verification

- `checks/ac1.sh`, `ac2.sh`, and `ac7.sh` pass on the Phase 3 runs. AC-1 and the AC-7 drift check pass in at least 2 of 3 repeats.
- `static-checks.sh`: checks 1, 7, and 15 PASS
- Lint is clean on touched files

#### Manual Verification

- The user reads one generated Fixture P design.md. The criteria are checkable, and the UI row in the Harness Decisions table is right.
- A one-line-bug-fix variant yields exactly one criterion (the criteria-bloat risk).

### Modified Files

- `plugin/skills/create_design/{SKILL,templates}.md`
- `plugin/skills/create_tasks/{SKILL,templates,sub-agent-prompts,examples}.md`
- `plugin/skills/help/SKILL.md`, `plugin/hooks/wb-prime.sh`
- `validation/results/phase3.md`

**Quick check command for this phase**:

```bash
bash docs/plans/2026-10-16-testing-guidance/validation/checks/ac1.sh docs/plans/2026-10-16-testing-guidance/validation/results/runs/phase3
```

### ⛔ CHECKPOINT: Phase 3 Complete

Workers and verifiers will consume these templates, so a human confirms generated criteria are readable before the execution side is wired.

1. All Phase 3 task issues and the milestone closed
2. AC-1, AC-2, and AC-7 PASS, recorded in `validation/results/phase3.md`
3. The user has confirmed one generated design.md
4. `/wb:update_status` run

---

## Phase 4: Agents and the Per-Task Gate

### Objective

Add `wb:test-writer` and `wb:test-reviewer`, change `task-worker` to never edit tests, and give `task-verifier` its integrity and criterion checks. Prove M2 with AC-5's green arm.

### Prerequisites

- Phase 2 complete (rubric and red definition); Phase 3 complete (criterion format)

### Changes Required

#### 1. `wb:test-writer` agent (D3)

**File**: `plugin/agents/test-writer.md` (new)

**Target state**:

- **Frontmatter**: `name: test-writer`; a description ending "Spawned by /wb:implement, /wb:implement_inline, and task-worker."; `tools: Read, Write, Edit, Grep, Glob, Bash` with no `Agent` tool, so it cannot nest further; `model: sonnet`; `effort: medium`; `skills: [test-quality, tdd-discipline]`.
- **Body**:
  - Its inputs: the criterion id and text, example, observed-at, and seam; the target test file; prior test-writer reports; and whether the caller is the coordinator (outer) or a worker (inner).
  - **Outer**: write only from the criterion text and example; run it; the failure must be an assertion failure, otherwise report blocked; never edit an outer test at a worker's request, and say so in the report.
  - **Inner**: write or update the requested test; push back on briefs framed in implementation terms.
  - Report in the Data Model's test-writer report shape.

**Pattern reference**: `plugin/agents/task-worker.md` (contract and report style); `plugin/agents/task-verifier.md:1-7` (frontmatter).

#### 2. `task-worker` (D4)

**File**: `plugin/agents/task-worker.md` (41 lines)

**Target state**:

- `tools:` (line 4) gains `Agent`.
- A new constraint in the Constraints block (lines 30-37): "Never create, edit, or delete test files; every test change goes through `wb:test-writer` as a fresh foreground spawn, carrying the task's earlier test-writer reports."
- RED step (line 19): "Request a failing inner test from `wb:test-writer`, confirm its red is an assertion failure, then write the code."
- "exactly as specified — no extra cases" becomes "test what the task's criteria and examples specify; propose extra cases as follow-ups".
- Expected Output (line 39) gains item 7, **Test-writer reports** (verbatim).
- Closing the beads issue stays the last act.

#### 3. `task-verifier` (D6)

**File**: `plugin/agents/task-verifier.md` (187 lines)

**Target state**:

- **Inputs** (lines 34-40) gain: the task's starting commit, the red commit for each outer test touched, the cited criteria, and the worker's Test-writer reports.
- **New Step: Test Integrity**:
  - `git diff <start> -- <test paths>`;
  - outer tests byte-identical to their red commit;
  - every changed test file covered by a report;
  - flag added skip, pending, or xfail markers (using the research Testing Conventions markers), removed or loosened assertions, expected values computed by calling the code under test, and harness failures presented as red.
- **New Step: Criterion Check**: for each criterion touched, name the smallest realistic regression and the test that would fail.
- **Report format** (lines 95-127) gains `### Test Integrity` (every flag, escalated or not) and `### Criterion Check` sections. They must contain no literal status markers.
- **Boundaries** (line 161): "Integrity and criterion protection are in scope; other quality findings are minor."
- **FAIL classification**: integrity defects are implementation defects (one fix attempt); a wrong or ambiguous criterion is a plan defect.
- Remove the npm-only examples (lines 48, 51, 83) in favor of "the test command from research Testing Conventions".

#### 4. `wb:test-reviewer` agent (D8a)

**File**: `plugin/agents/test-reviewer.md` (new)

**Target state**:

- **Frontmatter**: `name: test-reviewer`, `tools: Read, Grep, Glob, Bash`, `model: opus`, `effort: high`, `skills: [test-quality]`.
- **Inputs**: the phase's starting commit, criteria with seams, red commits, task integrity flags, conventions, and mode (`implement` or `inline`).
- **Procedure**, D8a steps 1–5:
  1. Part 1 checks, with planted defects in a disposable `git worktree add` of HEAD, removed afterwards.
  2. Criterion-to-outer-test coverage.
  3. Part 2 items on changed tests, including the seam comparison.
  4. Detectors on changed test files, from `test-quality/reference.md`.
  5. In `inline` mode, the Test Integrity checks across the phase.
- Level 1 mutation runs when the conventions or profile declare it, advisory only.
- **Output**: Review findings plus integrity-flag counts, with no literal status markers.

#### 5. AC-5 green arm

Re-run the Phase 1 blind-trial set against the new `task-verifier.md`: 8 fixtures × 3 trials, with the same scorer. Record results in `validation/results/phase4-ac5.md` and on `prompts-bzu0`. Pass: each of F1–F5 at least 2 of 3 FAIL naming the planted file:line; C and T1 3 of 3 PASS; T2 at least 2 of 3 FAIL.

### Tasks

#### Implementation Tasks

- **Create `plugin/agents/test-writer.md`** per Changes Required 1. → `[beads:phase4_impl_1]`
  - It consumes the `test-quality` skill and the red definition from Phase 2.
  - Projected about 20 calls.
- **Update `plugin/agents/task-worker.md`** per Changes Required 2. → `[beads:phase4_impl_2]`
  - It consumes the test-writer report format from phase4_impl_1.
  - Projected about 15 calls.
- **Update `plugin/agents/task-verifier.md`** per Changes Required 3. → `[beads:phase4_impl_3]`
  - It consumes the test-writer report format from phase4_impl_1.
  - Projected about 30 calls.
- **Create `plugin/agents/test-reviewer.md`** per Changes Required 4. → `[beads:phase4_impl_4]`
  - It reuses the Test Integrity step text from phase4_impl_3 for inline mode.
  - Projected about 25 calls.

#### Testing Tasks

- **Run the AC-5 green arm** per Changes Required 5. → `[beads:phase4_test_1]`
  - If it misses M2, the task stays open with a FAIL report. The design's fallbacks 3B and 3C are the escalation, raised at the checkpoint, not adopted silently.

### Success Criteria

#### Automated Verification

- `static-checks.sh`: checks 2, 3, and 4 PASS
- AC-5 green arm meets M2 (`validation/results/phase4-ac5.md`)
- `claude plugin validate ./plugin` passes with the two new agents

#### Manual Verification

- The user compares the AC-5 red and green tallies and accepts the verifier's FAIL explanations as specific enough to act on.

### Modified Files

- **New**: `plugin/agents/test-writer.md`, `plugin/agents/test-reviewer.md`.
- **Modified**: `plugin/agents/task-worker.md`, `plugin/agents/task-verifier.md`.
- **Results**: `validation/results/phase4-ac5.md`.

### ⛔ CHECKPOINT: Phase 4 Complete

M2 is the decision point for 3A. If it fails, the user decides on 3B or 3C before Phase 5 wires the verifier into every task.

1. All Phase 4 task issues and the milestone closed
2. AC-5 results reviewed; `prompts-bzu0` updated (closed if M2 is met)
3. `/wb:update_status` run

---

## Phase 5: Execution Side

### Objective

Wire the coordinator, the inline skill, and validate_execution to the new agents, and prove AC-3, AC-4, AC-8, and AC-9 end to end.

### Prerequisites

- Phase 4 complete and M2 met (or a user decision on 3B or 3C recorded)

### Changes Required

#### 1. `implement` reference and prompts

**Files**:

- `plugin/skills/implement/reference.md` (127; context package at :5-55; worker failure playbook at :61-101)
- `plugin/skills/implement/sub-agent-prompts.md` (129; worker template at :5-92, verifier prompt at :94-111, fix worker at :113-129)

**Target state**:

- **reference.md**:
  - The context package gains `taskTestContext`: cited criteria with example, observed-at, and seam; the outer red commit for each; the task's starting commit; and test commands, skip markers, and harness per boundary from research Testing Conventions.
  - `testCommands` placeholders name the conventions source instead of npm.
  - The truncation playbook treats a committed `red(AC-n)` outer test as expected state.
- **sub-agent-prompts.md**:
  - The worker template is reduced to the task, the context package, and "follow your agent definition". It no longer restates the RED/GREEN/REFACTOR process (prompt-audit C-F16).
  - A new **Outer Test Prompt** for coordinator spawns of `wb:test-writer`.
  - The verifier prompt passes the starting commit, red commits, criteria, and Test-writer reports.
  - The fix-worker prompt carries the same `taskTestContext` and starting commit.

#### 2. `implement` SKILL.md (coordinator flow)

**File**: `plugin/skills/implement/SKILL.md` (441)

**Target state**:

- **Step 5**:
  1. Record `git rev-parse HEAD` as the task's starting commit.
  2. For each criterion the task cites that has no outer test yet, spawn `wb:test-writer` (outer), re-run the test, confirm an assertion failure, and commit `red(AC-n): <criterion title>` containing only the test.
  3. Spawn the worker.
- **Step 6**: the verifier spawn passes the new inputs; FAIL classification follows the verifier's label.
- **Step 8** (phase checkpoint, :288-358): after the automated commands, spawn `wb:test-reviewer` with the phase's starting commit (mode `implement`). Its findings and integrity-flag counts join the checkpoint summary, and the integrity-flag counts are copied into tasks.md Implementation Notes.
- **Fallback**: "no acceptance criteria: plan predates 5.0.0". There are no outer-test steps, but the no-test-edit rule and verifier integrity still apply.
- **Length**: at or under 441; detail lives in reference.md and sub-agent-prompts.md.
- **Drift bundle**: help row and Command Details for implement; wb-prime line.

#### 3. `implement_inline` (D9)

**Files**: `plugin/skills/implement_inline/SKILL.md` (587), `plugin/skills/implement_inline/templates.md` (90)

**Target state**:

- The session calls `wb:test-writer` for outer and inner tests and never edits test files.
- Step 4 "Handle Testing Tasks" (:291-305) is removed.
- "When to Skip TDD" (:489-498) becomes a one-line pointer to tdd-discipline's Named exceptions.
- The test-quality list (:481-487) is removed in favor of the `test-quality` skill.
- The phase checkpoint spawns `wb:test-reviewer` (mode `inline`).
- The "predates 5.0.0" fallback is added.
- Net length is below 587.
- **Drift bundle**: help row and Command Details; wb-prime line.

#### 4. `validate_execution`

**Files**: `plugin/skills/validate_execution/sub-agent-prompts.md` (78; coverage agent at :27-44), `SKILL.md` (232), `templates.md` (162; the "Unit Tests: [X]% coverage" line at :62-65)

**Target state**:

- `wb:test-reviewer` replaces the general-purpose "Verify test coverage" agent; the count stays at four.
- The report template's Test Coverage section becomes "Test Review" (findings with verdicts and evidence types).
- **Drift bundle**: help Command Details; wb-prime line if it names coverage.

#### 5. Validation of AC-3, AC-4, AC-8, AC-9, and the budget

- `/wb:implement` on a Fixture P phase containing a criterion (the 28-day window), a view-model rounding task seeded to tempt a direct expectation edit, and the vacuous `not in body` test.
- Trap variants:
  - the module missing, so the red would be an ImportError (must be reported blocked, not red);
  - an implementation-framed brief (must draw pushback);
  - a worker request to change an outer test (must be refused).
- Then `/wb:implement_inline` on the same phase.
- Then `/wb:create_tasks` and `/wb:implement` on the `legacy` variant.
- Check with `ac3.sh`, `ac4.sh`, `ac8.sh`, and `ac9.sh`. After reviewer runs, `git worktree list` shows no extra worktrees and the fixture's working tree is unmodified.
- Count tool calls per worker against the Phase 1 baseline (`prompts-pqlw`).

### Tasks

#### Implementation Tasks

- **Update `implement/reference.md` and `implement/sub-agent-prompts.md`** per Changes Required 1. → `[beads:phase5_impl_1]`
  - It consumes the agent contracts from phase4_impl_1, phase4_impl_2, and phase4_impl_3.
  - Projected about 30 calls.
- **Update `implement/SKILL.md`**, with its drift bundle, per Changes Required 2. → `[beads:phase5_impl_2]`
  - It consumes phase5_impl_1's package and prompt names, phase4_impl_4's reviewer, and phase3_impl_2's outer-test step format.
  - Projected about 35 calls.
- **Update `implement_inline`**, with its drift bundle, per Changes Required 3. → `[beads:phase5_impl_3]`
  - It consumes phase4_impl_1 and phase4_impl_4.
  - It serializes `help/SKILL.md` and `wb-prime.sh` access after phase5_impl_2.
  - Projected about 40 calls.
- **Update `validate_execution`**, with its drift bundle, per Changes Required 4. → `[beads:phase5_impl_4]`
  - It consumes phase4_impl_4.
  - It serializes help and wb-prime access after phase5_impl_3.
  - Projected about 20 calls.

#### Testing Tasks

- **Run the AC-3, AC-4, AC-8, and AC-9 headless validations and the budget comparison** per Changes Required 5. → `[beads:phase5_test_1]`
  - Record results in `validation/results/phase5.md`.
  - Comment the tool-call comparison on `prompts-pqlw` (close it if workers stay under the ~50-call sizing threshold).
  - Split per run if one session cannot hold all runs.

### Success Criteria

#### Automated Verification

- `checks/ac3.sh`, `ac4.sh`, `ac8.sh`, and `ac9.sh` pass
- `static-checks.sh`: checks 1, 7, 11, 12, 13, and 15 PASS
- No extra worktrees and a clean fixture tree after each run

#### Manual Verification

- The user reads one checkpoint summary from the AC-9 run. The reviewer's findings name the vacuous test with file:line and read as actionable.
- The `red(AC-n)` commit pattern is acceptable in practice.

### Modified Files

- `plugin/skills/implement/{SKILL,reference,sub-agent-prompts}.md`
- `plugin/skills/implement_inline/{SKILL,templates}.md`
- `plugin/skills/validate_execution/{SKILL,sub-agent-prompts,templates}.md`
- `plugin/skills/help/SKILL.md`, `plugin/hooks/wb-prime.sh`
- `validation/results/phase5.md`

### ⛔ CHECKPOINT: Phase 5 Complete

This is the first end-to-end run of the new contract, so a human reviews a real checkpoint summary before release work begins.

1. All Phase 5 task issues and the milestone closed
2. AC-3, AC-4, AC-8, and AC-9 PASS; budget compared
3. `/wb:update_status` run

---

## Phase 6: Cold Audit

### Objective

Ship `/wb:test-audit` with `wb:test-auditor`, the optional `/wb:testing-profile`, and the review-prep pointer. Prove AC-6 on the two real repositories.

### Prerequisites

- Phase 2 complete (rubric, conventions) and Phase 4's reviewer exists (the detector selections are shared). Phase 6 tasks can start in parallel with Phase 5; the milestone follows Phase 5's.

### Changes Required

#### 1. `wb:test-auditor` agent (D8b)

**File**: `plugin/agents/test-auditor.md` (new)

**Target state**:

- **Frontmatter**: `tools: Read, Grep, Glob, Bash`, `model: opus`, `effort: high`, `skills: [test-quality]`, `maxTurns: 40`.
- **Inputs**: an assigned area, the stack and conventions, and detector output for the area.
- **Body**: applies test-quality Parts 1–4 and returns Review findings. It never edits or deletes tests.

#### 2. `/wb:test-audit` coordinating skill (D8b)

**Files**: `plugin/skills/test-audit/SKILL.md`, `sub-agent-prompts.md`, `templates.md` (new)

**Target state**:

- **SKILL.md**: frontmatter with a trigger description, `argument-hint: [scope]`, `model: opus`, `effort: high`; an intake line "This stage needs from you: the scope (a plan directory, a path, or nothing for the whole repository), and your spot-check of the findings".
- **Steps 1–6 of D8b**:
  1. Stack precedence: plan, profile, then detection, stated in the report.
  2. Detector selections from `test-quality/reference.md`, plus "available but not enabled" rules.
  3. Custom heuristics.
  4. Parallel `wb:test-auditor` spawns per area, with a BARRIER waiting on every completion notification.
  5. Suite-level checks, each run only if its command and services exist, otherwise "not run" with the reason.
  6. The report.
- **Pruning policy**: never edit or delete tests. Remove and Consolidate verdicts need objective evidence or are labelled judgment-only.
- **The report states** that W1 and W2 cannot be checked cold, and the services it lacked.
- **Output path**: the plan directory, or `docs/test-audits/YYYY-MM-DD-<scope>.md`.
- **templates.md**: the report shape after [test-audit.md](test-audit.md): Scope, Headline, findings per verdict with evidence type, Not checked.
- **Help**: a `### /wb:test-audit` Command Details entry and a table row (RELEASING drift check). It is not added to the stage chain.

#### 3. `/wb:testing-profile` skill (D10)

**File**: `plugin/skills/testing-profile/SKILL.md` (new)

**Target state**:

- Detects the stack, as research's Testing Conventions fields would.
- Drafts `.claude/wb/testing.md` with those headings plus Choices and Mutation (`off` or `advisory`, with the command).
- Shows the draft and writes it only after the user confirms.
- Intake line: "This stage needs from you: confirmation or edits to the drafted profile."
- **Help**: Command Details entry and table row.

#### 4. `review-prep` pointer

**File**: `plugin/skills/review-prep/SKILL.md` (158; the TDD Check at :83-95)

**Target state**: one line after the TDD Check, "For a broader look at test quality beyond this diff, run `/wb:test-audit`." Net length at or under 159.

#### 5. Validation of AC-6

- Pin and record the HEAD commit of sg-wholesale and fitness-agent.
- Re-verify that the W3–W5 instance lists from test-audit.md still exist at those commits.
- Run `/wb:test-audit` cold, with no plan and no profile, in each repository. `.claude/wb/testing.md` must be absent.
- Check with `ac6.sh`:
  - the stack strings;
  - instance recall of at least 7 of 11 and at least 10 of 16;
  - the `pending` construct at `spec/lib/glossary_definitions_spec.rb:111-118` (glossary worktree);
  - the W1/W2 statement;
  - a verdict and evidence type on every finding;
  - `git status --porcelain`, `git stash list`, and `git worktree list` unchanged.
- The user spot-checks 10 findings, sampled with a fixed seed. At least 8 must be real.
- Record results in `validation/results/phase6-ac6.md` and on `prompts-ul2x`.

### Tasks

#### Implementation Tasks

- **Create `plugin/agents/test-auditor.md`** per Changes Required 1. → `[beads:phase6_impl_1]`
  - It consumes the `test-quality` skill.
  - Projected about 15 calls.
- **Create `plugin/skills/test-audit/`**, with its help entry, per Changes Required 2. → `[beads:phase6_impl_2]`
  - It consumes phase6_impl_1, the Phase 2 conventions headings, and `test-quality/reference.md`.
  - It serializes `help/SKILL.md` access after phase5_impl_4.
  - Projected about 45 calls.
- **Create `plugin/skills/testing-profile/`**, with its help entry, per Changes Required 3. → `[beads:phase6_impl_3]`
  - It consumes the Phase 2 conventions headings.
  - It serializes `help/SKILL.md` access after phase6_impl_2.
  - Projected about 25 calls.
- **Add the review-prep pointer** per Changes Required 4. → `[beads:phase6_impl_4]`
  - It consumes phase6_impl_2's command name.
  - Projected about 5 calls.

#### Testing Tasks

- **Run AC-6 on sg-wholesale and fitness-agent**, including the user's spot-check, per Changes Required 5. → `[beads:phase6_test_1]`
  - The audit is read-only: no file in either repository may change.

### Success Criteria

#### Automated Verification

- `checks/ac6.sh` passes for both repositories
- `static-checks.sh`: checks 3, 4, and 7 PASS
- Both repositories unchanged (`git status --porcelain` identical before and after)

#### Manual Verification

- The user's spot-check: at least 8 of 10 findings real, per repository
- The user reads both reports and judges the verdicts actionable

### Modified Files

- **New**: `plugin/agents/test-auditor.md`, `plugin/skills/test-audit/{SKILL,sub-agent-prompts,templates}.md`, `plugin/skills/testing-profile/SKILL.md`.
- **Modified**: `plugin/skills/review-prep/SKILL.md`, `plugin/skills/help/SKILL.md`.
- **Results**: `validation/results/phase6-ac6.md`.

### ⛔ CHECKPOINT: Phase 6 Complete

The spot-check is the only measure of the judgment layer's reliability (`prompts-ul2x`), and only the user can do it.

1. All Phase 6 task issues and the milestone closed
2. AC-6 recorded; `prompts-ul2x` updated with the spot-check result
3. `/wb:update_status` run

---

## Phase 7: Release

### Objective

Bring the docs up to date, write the CHANGELOG, pass the full gate, and ship 5.0.0.

### Prerequisites

- Phases 1–6 complete

### Changes Required

#### 1. Docs sweep

**Files**:

- `docs/commands-reference.md` (870)
- `docs/workbench-workflow-guide.md`
- `CLAUDE.md`: the repository structure and agent list, and the model tiers (test-writer sonnet; test-reviewer and test-auditor opus)
- `README.md`: the command list
- `docs/beads-guide.md`: only if a bd command changed under `plugin/` (static check 14)

#### 2. CHANGELOG

**File**: `CHANGELOG.md`

**Target state**: an `## [Unreleased]` entry with these sections:

- **⚠️ Breaking**: the worker no longer edits tests; the verifier's FAIL boundary changes; the design template changes.
- **Added**: the agents, skills, and commands.
- **Changed**: the stages.
- **Migration**:
  1. `claude plugin update wb@gvarela-workbench`, then restart.
  2. Existing plans run without acceptance criteria and say so.
  3. Optionally run `/wb:testing-profile`.
  4. `red(AC-n)` commits appear mid-phase.

Cite the evidence inline: the AC-5 tallies and the AC-6 results.

#### 3. Full gate

- `static-checks.sh` all PASS.
- A whole-surface `/claude-api prompt-audit` over every prompt file changed since base commit `9020332` (`git diff --name-only 9020332 -- plugin/ CLAUDE.md`), target Opus 5.5. It catches contradictions that per-task audits can't see. High- and medium-confidence findings are applied or declined with a reason in `validation/prompt-audits/phase7-whole-surface.md`.
- `claude plugin validate ./plugin`.
- `claude plugin details` for context cost: four agents preload the rubric.
- A `--plugin-dir` smoke session: the `/wb:` menu, `/wb:help`, and one intake.

#### 4. Bump and canary

- `plugin/.claude-plugin/plugin.json:4` and `.claude-plugin/marketplace.json:12` both move from `4.0.0` to `5.0.0`.
- Move Unreleased to `## [5.0.0] — <date>`.
- After merge to `dev`, the dev → main release PR (RELEASING.md).
- From an installed copy (`claude plugin update`, not `--plugin-dir`), run Fixture P through one implement task. This confirms `task-worker` spawns `wb:test-writer` (`prompts-sm6l`).
- The canary: three real sessions per RELEASING.md for majors.

### Tasks

#### Integration Tasks

- **Docs sweep** per Changes Required 1. → `[beads:phase7_integration_1]`
- **CHANGELOG Unreleased entry with Migration** per Changes Required 2. → `[beads:phase7_integration_2]`
  - It consumes the Phase 4 to 6 results files for its evidence.
- **Run the full gate** per Changes Required 3. → `[beads:phase7_test_1]`
  - It consumes phase7_integration_1 and phase7_integration_2.
- **Bump to 5.0.0, run the installed-copy check and the canary** per Changes Required 4. → `[beads:phase7_integration_3]`
  - It consumes phase7_test_1.
  - Closing `prompts-sm6l` requires the installed-copy result. If the check fails, release halts and the design's fallback (the original 2B hybrid) goes to `/wb:create_design`.

### Success Criteria

#### Automated Verification

- `static-checks.sh` exits 0
- `claude plugin validate ./plugin` passes
- Both manifests read 5.0.0

#### Manual Verification

- The smoke session renders `/wb:help` with both new commands
- The installed-copy run shows a `wb:test-writer` spawn from a worker
- Three canary sessions completed without contract errors

### Modified Files

- `docs/commands-reference.md`, `docs/workbench-workflow-guide.md`, `CLAUDE.md`, `README.md`, possibly `docs/beads-guide.md`
- `CHANGELOG.md`
- `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

### ⛔ CHECKPOINT: Phase 7 Complete

1. All Phase 7 task issues and the milestone closed; the epic closable
2. `prompts-sm6l`, `prompts-pqlw`, `prompts-bzu0`, and `prompts-ul2x` closed or carrying a recorded user decision
3. `/wb:update_status` run; `/wb:validate_execution` run against this plan

---

## Implementation Discoveries

Things to determine during implementation:

- Whether `claude -p` runs that end at a checkpoint question leave enough transcript for `ac9.sh`. If not, the prompt pre-answers the go-ahead with "stop after printing the summary".
- Whether the fixture suites need any services. Fixture P is chosen to need none; record in Phase 1 if this changes.
- The trial cost per AC-5 arm with real git tool calls in the verifier. The memory figure of about 27k tokens per trial is for tool-less trials.
- The `maxTurns` value that fits one `wb:test-auditor` area on sg-wholesale's spec tree (40 is the starting point).

Note: update this section with findings during implementation.

---

## 🚧 Blockers & Notes

### Current Blockers

Blockers are tracked in beads:

```bash
bd blocked
```

### Implementation Notes

- Project initialized 2026-10-16. External research is in `external-research/`; the audit is in [test-audit.md](test-audit.md); the exploration record is in `thoughts/`.
- The size baseline is the base commit `9020332`, not design.md's figures: implement_inline is 587 lines, not the 601 the design cites.
- Integrity-flag counts per phase are copied here at each checkpoint from Phase 5 onward (design D6).
- **2026-10-17, Phase 1**: phase1_test_1 (`prompts-ynvp`) was split at its natural seam before spawning, because the projection exceeded the ~50-call budget: `prompts-kz5p` builds the trial set, runner, and scorer, with one smoke trial; `prompts-m9rq` runs the 24-trial red arm.
- **Static checks, notes for later phases**:
  - Check 11 locates the validate_execution coverage agent by its literal `description: "Verify test coverage"`. Phase 5 must keep that description or update the check.
  - Check 3 fails any spawn line that names a test agent without the `wb:` prefix, including prose such as "spawn the test-reviewer".
- **Fixtures**: Fixture R's answer key lives in `validation/fixtures/ruby-stores.answers.md`, outside the fixture, so audits cannot read it. pytest 9.1.1 was installed with `pip --user` for Fixture P.
- **2026-10-17, Phase 1 checkpoint decisions** (user): build a realistic AC-5 set and re-run the red arm (option a); apply the AC-1 placeholder fix (a second fix round on `prompts-jcit`); run the tool-call baseline. Added tasks `prompts-0a65` (build) and `prompts-32qp` (run). AC-4's example in design.md was made concrete after ac1.sh flagged it.
- **Phase 1 results**:
  - AC-5 red arms against 4.0.0:
    - clean set: 24/24 correct;
    - realistic set: 23/24 correct (defect trials 17/18, controls 6/6).
  - The single miss (r05-1): the verifier saw an expected value computed from production code and graded it "minor, not blocking". The two other reps ran a mutation (`WINDOW_DAYS=27`) and FAILed it.
  - Several FAIL reports lacked an exact file:line.
  - Conclusion: detection is already strong in 4.0.0. The gaps are the "minor" grading and running a mutation inconsistently. This bears on design D6; the user decides at the Phase 1 checkpoint.
- **Phase 1 worker tool-call baseline on 4.0.0**: workers 6, 9, and 5 calls (max 9), verifiers 2, 3, and 2, coordinator 23, 270 s, $1.29. The fixture's tasks are small, so this is a floor.
- **Follow-ups filed** (both block `prompts-dnb3`):
  - `prompts-vwv8`: nested-agent attribution in count-tool-calls.sh.
  - `prompts-iyqq`: the legacy fixture plan's `normalize()` change drops `.0` untested; the 4.0.0 coordinator halted on it as a plan defect in baseline run 1.
- **Phase 1 process notes**:
  - One worker ran two unplanned headless trials (about $0.80) while a stub was not executable; its output was kept out of the repo.
  - The realistic set's shared coordinator notes initially carried a line that pointed at one trial's defect. A verifier caught it, and it was neutralized before the red arm.
  - Paid runs in Phase 1 total roughly $35–40.

---

## 🔗 Quick Reference

### Key Files

- **Research**: [research.md](research.md), current state
- **Design**: [design.md](design.md), target state
- **Validation**: `docs/plans/2026-10-16-testing-guidance/validation/`
- **Decision record**: `prompts-cbc3`

### Common Commands

```bash
# Static checks (every task)
bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh

# Lint touched markdown
./plugin/scripts/lint <files>

# Plugin manifest validation
claude plugin validate ./plugin

# Headless fixture run
bash docs/plans/2026-10-16-testing-guidance/validation/run-headless.sh python-rides base <prompt-file> <out-dir>
```

### Design Decisions Reference

- D1: acceptance criteria in design.md (Given/When/Then, example, observed at, seam, refines)
- D2: harness decisions at design; harness tasks proven by can-fail
- D3: `wb:test-writer` writes every test; outer via the coordinator with a `red(AC-n)` commit, inner via the worker as a fresh foreground spawn
- D4: workers never edit tests; test-writer reports are the declaration channel
- D5: red means an assertion failure; tdd-discipline holds the single list of exceptions
- D6: the verifier diffs tests against the task's starting commit; undeclared or weakened changes FAIL
- D7: the `test-quality` rubric (can-fail first, Desiderata items, verdicts, judging rules)
- D8a: `wb:test-reviewer` at every phase checkpoint; D8b: `/wb:test-audit` with `wb:test-auditor` agents, never auto-delete
- D9: inline uses the test-writer and phase-level integrity
- D10: research Testing Conventions; optional `.claude/wb/testing.md`
