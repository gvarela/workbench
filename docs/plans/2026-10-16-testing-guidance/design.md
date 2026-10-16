---
project: testing-guidance
ticket: null
created: 2026-10-16
created_timestamp: 2026-10-16T14:52:56Z
status: draft
last_updated: 2026-10-16
designer: gabevarela
git_commit: 9020332a011a0519887c1cde76c9cd84a6e91c22
git_branch: testing-guidance
repository: gvarela/workbench
tags: [design, architecture, testing-guidance]
depends_on: research.md
design_approach: Criteria-first, separated test authorship, verifier-reviewed integrity, one shared quality rubric
---

# Design: Testing Guidance

## Problem Statement

**Goal (README Intent)**: Add testing guidance to wb so worker agents write tests that check intended behavior at the right level, and the verifier can tell a protective test from a hollow one.

wb's test guidance is prose about process only, and nothing enforces it (research.md §6). The same agent writes the expected behavior, the test, and the code, and grades its own red step. The only gate checks that tests pass and that the files changed are in scope. The audit of real wb runs ([test-audit.md](test-audit.md)) found:

| Problem | sg-wholesale | fitness-agent |
| --- | --- | --- |
| Red step was only a load or import error | 13 of 69 workers (Oct 15) | 30 of 93 workers |
| Workers that wrote code first or went green first | 4 | 16 |
| Expectations edited after a failing run, unchecked | several | about 9 |
| Over-mocking or mocking the class under test | yes, including the RubyLLM builder | low |
| UI behavior asserted as source strings | n/a | yes |
| Verifier FAILs that came with a fully green suite | all 7 | n/a |

Mirrored oracles appeared in both repos. A UI critique pass found seven browser-visible defects (RR-1 to RR-7) while the fitness-agent suite stayed green.

The external research ([external-research/LLM test writing practices.md](external-research/LLM%20test%20writing%20practices.md)) explains why. Agents tamper with tests, encode current behavior as the expected value, and over-mock. Instructions alone barely help. The controls with evidence put the expected behavior where the implementer cannot reach it, and check integrity independently.

**If not solved**: every wb plan ships tests whose protection nobody has checked, and the human checkpoints approve suites that are green while the product is broken.

### Success Metrics

- **M1.** On a fixture plan run end to end, 100% of acceptance criteria have an outer test that tests the criterion at its "observed at" boundary, was written by `wb:test-writer`, and was shown to fail on an assertion before any implementing task ran. (refines: "A wb plan's acceptance criteria become tests, at a test level chosen from where each criterion is observed")
- **M2.** In blind trials on planted-defect fixtures (a deleted test, an added skip, a loosened assertion, an expected value computed by calling the code, an undeclared test edit made through Bash), `task-verifier` FAILs each defect type in at least 2 of 3 trials, and PASSes a clean control in 3 of 3. (refines: "The task-verifier flags deleted, skipped, or weakened tests and expected values copied from the code") Tracked as `prompts-bzu0`.
- **M3.** `/wb:test-audit`, run with no plan and no profile on sg-wholesale (Rails/RSpec) and fitness-agent (Python/pytest):
  - states each repository's framework and conventions correctly;
  - uses that stack's idioms in its findings;
  - finds at least 60% of the W3–W5 instances that test-audit.md names and that still exist: at least 7 of 11 in fitness-agent and at least 10 of 16 in sg-wholesale;
  - reaches at least 8 of 10 real problems in a human spot-check of its findings;
  - states that W1 and W2 cannot be checked cold. Per test-audit.md's visibility check, they leave no trace in code or git history.

  (refines: "Test-quality and test-level guidance adapts to the target repository's stack")
- **M4.** Every technical decision in this design cites the research finding or audit observation it rests on, with evidence strength (the Traceability table below). (refines: "Every guidance change traces to a finding in the external research, with its evidence strength recorded")
- Deferred: none.

### Constraints

- **Guidance is prose, and reaches workers only through preloads or spawn prompts.** Background skills rarely auto-activate inside workflow sessions (`README.md:61-63`).
- **Workers never commit.** The coordinator commits each task after a verifier PASS (`implement/SKILL.md:242`). The verifier's scope check assumes the working tree holds only the current task's files (`task-verifier.md:142`).
- **Verdict parsing is literal.** A report counts as a FAIL if it contains `### Status: FAIL`, or if it lacks `### Status: PASS` (`implement/SKILL.md:234-239`).
- **Workers are truncated at about 70 tool calls** (`docs/subagent-tool-call-ceiling.md`). `task-worker` has `maxTurns: 60`.
- **Nested spawns work, but only as foreground spawns.** The spike showed a plugin agent can spawn another plugin agent in the foreground. A resumed agent's reply arrives asynchronously and is lost if the caller finishes first. Agents with `Agent` in their `tools:` can spawn; spawns must use the `wb:` prefix.
- **Drift rule.** A change to a stage's scope or intake updates help, wb-prime, and that stage's intake line in the same commit (`CLAUDE.md:164`). New skills or agents require bumping both version manifests.
- **Prior lessons**:
  - Louder wording does not hold a gate (memory `wb-barrier-volume-not-discriminator`).
  - Guidance duplicated across files drifts (prompt audit C-F16).
  - SKILL.md files should stay under about 500 lines; `implement_inline` is already at 601.

## Design Approach

**Criteria-first, separated test authorship, verifier-reviewed integrity, one shared quality rubric, plan-carried stack conventions.** This formalizes the closed decision `prompts-cbc3` and its two amendments. The full reasoning is in [the exploration record](thoughts/2026-10-16-testing-guidance-directions.md).

1. **Design fixes the expected behavior.** The user approves acceptance criteria at the design checkpoint. Each has a Given/When/Then statement, a concrete example, an "observed at" boundary, and a seam where needed.
2. **A dedicated test-writer writes every test.**
   - The coordinator calls it once per criterion to write the outer test, show it failing on an assertion, and land it as its own commit.
   - Implementers call it, as a fresh foreground spawn per request, for inner tests and test changes.
   - Implementers never edit test files.
3. **The verifier checks integrity.** It diffs test files against the task's starting commit. Any change not covered by a test-writer report, or any weakened test, is a FAIL. For each criterion the task touches, it also asks whether a test would catch the smallest realistic regression.
4. **One test-quality rubric, applied by two kinds of review.**
   - The rubric opens with "can this test fail?" and is organized around Kent Beck's Test Desiderata.
   - It is preloaded into the test-writer, the verifier, and two new review roles:
     - **`wb:test-reviewer`**: a plan-aware review of a phase's diff. It runs automatically at every phase checkpoint in both implement modes, and in `validate_execution`.
     - **`/wb:test-audit`**: a coordinating skill that audits a whole repository cold. It runs the project's own detectors and suite-level checks, and spreads rubric review across parallel `wb:test-auditor` agents.
   - The LLM proposes; objective checks decide. Nothing is deleted automatically.
   - Mutation testing comes in stages.
5. **Research records each repository's testing conventions.** An optional testing profile per repository becomes the baseline when present.

### Why This Approach

- **The user can check the expected behavior.** Criteria are written as behavior with examples, so the user can review them at the design checkpoint. Case lists written as test code in tasks.md were judged not checkable (exploration record, decision 1).
- **It applies the research's strongest controls.** The research found the most support for a check that is fixed before code and out of the implementer's reach (Böckeler, Searls, Anthropic, Farley, ImpossibleBench).
- **It targets the most frequent audited failures.** Hollow reds and expectations edited after red were the most common problems, and both sit in the inner layer. Routing every test change through the test-writer makes its reports the record of changes. The verifier then checks that record against git rather than trusting it. Git sees edits made through Bash, which tool hooks miss: about 75% of edits in both repos.
- **It follows existing wb patterns:**
  - a single shared source for guidance, preloaded with `skills:`, as with `tdd-discipline` → `task-worker`;
  - fresh-context Opus quality gates (`task-verifier`, `research-validator`);
  - a per-repository markdown override (`.claude/wb/PRIME.md`);
  - "no section means no obligation" backward compatibility, as with the 3.0.0 Intent section.

## Technical Decisions

### Architecture

#### D1. Acceptance criteria in design.md

- **What**:
  - `create_design`'s template replaces the "Functional Requirements" checkbox list with an **Acceptance Criteria** section.
  - Each criterion has:
    - an id, such as `AC-3`;
    - a Given/When/Then statement;
    - at least one example with real input and output values;
    - **Observed at**: UI, HTTP, CLI, MCP, job, or function;
    - **Seam**, required when the boundary is behind an external service or an LLM: what is stubbed and what stays real;
    - **Refines**: the Success Metric it supports.
  - Criteria are sized to the work: one per changed behavior, so a small fix has one criterion.
  - Non-functional requirements stay as they are.
  - `create_design`'s scope text changes from excluding "test writing" to "criteria and observation boundaries are WHAT. How tests are written and sequenced is still tasks.md's job."
- **Rationale**:
  - The user can check behavior written in Given/When/Then with examples (exploration decision 1).
  - The observed-at field sets the test level, which is the fitness-agent "no browser" lesson.
  - The seam field prevents the vacuous stubbed outer test seen in sg-wholesale's `ask_question` spec.
- **Trade-offs**:
  - More design work.
  - Risk of spec bloat; Böckeler saw 16 criteria for one bug. The one-per-changed-behavior rule mitigates it.
  - Given/When/Then is chosen over EARS for readability. No study favors either.
- **Pattern reference**: `create_design/templates.md:24-27,69-79`, and the Intent `(refines: …)` traceability in `SKILL.md:130-134`.

#### D2. Harness decisions in design, and harness tasks in tasks

- **What**:
  - Design has a **Harness Decisions** table with one row per observation boundary the criteria use: is a harness present (from research's Testing conventions)?
  - If not, design records one of three choices:
    - add the project's own harness tool (wb never names one);
    - accept manual verification for the listed criteria;
    - observe at a lower proxy, stating what is lost.
  - `create_tasks` puts a **harness task** before the first outer test at a boundary that has no harness. Its proof is a "can fail" demonstration: a smoke test on existing behavior, shown to fail on a deliberately wrong expectation, then restored.
  - Red counts only as an assertion failure on the criterion's observable. An infrastructure failure means the task is blocked, not red.
- **Rationale**:
  - In fitness-agent, "no Playwright" was decided inside tasks.md, where nobody reviewed it.
  - Workers who lack a harness quietly test at a lower level or park the test (sg j1tt).
- **Trade-offs**:
  - A named exception to red-first for harness tasks only.
  - Browser harnesses are slow, so browser criteria should stay few (DHH, GitLab).

#### D3. `wb:test-writer` agent

- **What**:
  - A new agent with frontmatter: `model: sonnet`, `effort: medium`, `tools: Read, Write, Edit, Grep, Glob, Bash`, `skills: [test-quality]`.
  - **Coordinator calls**, one per criterion, before the first implementing task that cites it:
    - The test-writer writes the outer test at the observed-at boundary from the criterion text and example only.
    - It runs the test and reports the assertion failure.
    - The coordinator re-runs the test, confirms it fails on an assertion, and commits it as `red(AC-n): …`. That commit is the preserved red state.
  - **Implementer calls**, as a fresh foreground spawn per request:
    - The brief names the criterion id and example, the behavior to pin, the target test file, and the task's earlier test-writer reports.
    - The test-writer writes or updates the inner test, runs it, and returns a report: files changed, why, red output (an assertion failure only), and any change to an earlier test with its reason.
  - The test-writer pushes back on briefs written in terms of the implementation.
  - It never edits an outer test at an implementer's request. It reports those requests back to the coordinator.
- **Rationale**:
  - Separate authorship where the user approved the behavior (2B).
  - One place for all test changes, so declarations are structural rather than self-reported (2D).
  - Foreground spawns because resumed replies are asynchronous (spike).
- **Trade-offs**:
  - More spawns: one per criterion, plus one per implementer request.
  - Inner tests are still briefed by the implementer, so the brief can carry its framing. The rubric's "expected values from the criterion" rule and the verifier mitigate this.

#### D4. `task-worker` changes

- **What**:
  - Add `Agent` to `tools:`.
  - New rule: **never create, edit, or delete test files.** Every test change goes through `wb:test-writer`.
  - Red/green stays the worker's loop: request a failing inner test, see it fail on an assertion, write the code, request changes as needed.
  - The worker report gains a **Test-writer reports** field holding every report verbatim.
  - The "exactly as specified, no extra cases" rule becomes "test what the task's criteria and examples specify; propose extra cases as follow-ups."
  - Closing the beads issue stays the last act, so truncation remains detectable.
  - The worker prompt template (`implement/sub-agent-prompts.md`) points at the agent definition instead of restating its process. That removes the duplication the audit flagged as C-F16.
- **Rationale**:
  - Keeps TDD in the worker.
  - Makes the verifier's integrity check binary: any test change in the diff that no report covers is a FAIL.
- **Trade-off**: each test change costs a spawn. Budget assumption tracked as `prompts-pqlw`.

#### D5. `tdd-discipline` reframed

- **What**:
  - The Iron Law stays: no production code without a failing test first.
  - Red is defined as **an assertion failure on the intended behavior**. A load, import, or missing-constant error is "not red yet".
  - The skill becomes the **single list of named exceptions**: harness tasks (with the can-fail proof), configuration, documentation, refactors covered by existing tests, and build scripts.
  - `implement_inline`'s "When to Skip TDD" points to that list instead of keeping its own.
  - Under `/wb:implement`, "write the test" means "have `wb:test-writer` write it".
- **Rationale**:
  - The audit's hollow reds (30 of 93, 13 of 69).
  - The existing contradiction between the two files (prompt audit F12).
- **Trade-off**: none beyond the edit.

#### D6. `task-verifier` integrity and criterion review

- **What**:
  - The verifier receives the task's starting commit, the red commit of each outer test the task touches, the criteria the task cites, and the worker's test-writer reports.
  - New **Test Integrity** step:
    - Diff the test paths against the starting commit.
    - Outer tests must be byte-identical to their red commit.
    - Every changed test file must be covered by a test-writer report.
    - Flag added skip, pending, or xfail markers (using the markers from research's Testing conventions), removed or loosened assertions, expected values computed by calling the code under test, and harness failures presented as red.
  - New **Criterion Check**: for each criterion touched, name the smallest realistic regression and say which test would fail.
  - An undeclared change, a weakened test, or a criterion with no protecting test is a **FAIL**. The boundary rule at `task-verifier.md:161` becomes: "Integrity and criterion protection are in scope. Other quality findings are minor."
  - New report sections must never contain the literal status markers.
  - For each FAIL, the verifier classifies the cause:
    - Integrity defects are implementation defects: one fix attempt.
    - A wrong or ambiguous criterion is a plan defect, handled by the existing Plan-Defect protocol.
  - The report's Test Integrity section lists every flag raised, including those not escalated to FAIL. The coordinator copies the counts into the phase checkpoint summary and tasks.md Implementation Notes, so 3A's consistency can be judged.
- **Rationale**:
  - Git-based detection sees every edit path (3A).
  - In the audit, verifiers that asked "would a test fail?" were the ones that produced quality FAILs, and "minor" grading let weak tests through.
- **Trade-offs**:
  - Verifier time and tokens go up.
  - Judgment can vary between runs. Watched through `prompts-bzu0`. Deferred fallbacks: 3B (read-only outer tests) and 3C (a deterministic integrity script).

#### D7. `test-quality` shared rubric

- **What**: a new background skill `test-quality` (`user-invocable: false`), preloaded via `skills:` into `wb:test-writer`, `wb:task-verifier`, `wb:test-reviewer`, and `wb:test-auditor`. Writers read it as rules; reviewers apply it as checks. It has four parts.
- **Part 1: "Can this test fail?"**, applied first and mostly mechanically, with file:line evidence:
  - The test has an assertion, and the assertion targets the behavior rather than a mock or the test's own setup.
  - No tautology or always-true comparison.
  - The test is not skipped, pending, or focused without a stated reason.
  - Every negative or `all()`-style assertion has a positive presence anchor.
  - For criterion-guarding tests, a planted defect (a brief break of the code under test) makes the test fail.
- **Part 2: checkable items, grouped under four Test Desiderata properties.**

  | Property | Items |
  | --- | --- |
  | **Behavioral** (the test fails when behavior breaks) | Expected values come from the criterion's example or an independent source, never from calling the code under test, a production formula, hash, or serializer. Each test names the break it catches. |
  | **Structure-insensitive** (the test survives a refactor that keeps behavior) | Assertions are on observable state, not on which calls were made, except for state-changing calls at a declared seam. No assertions on source text, CSS class strings, or private names. Test doubles are only at the criterion's declared `Seam:`; never the subject, an owned or domain class, or `any_instance`; prefer a real object or fake when a cheap one exists. Setup is not copied across files. |
  | **Specific** (a failure points at the cause) | One behavior per test. Assertions are not bundled so that the first failure hides the rest, unless the project's convention says otherwise (for example RSpec `aggregate_failures`). |
  | **Predictive** (a pass means the product works) | The test is at the level the criterion's "observed at" gives. Real-data shapes the plan names are covered, not only factory defaults. Nothing depends on the wall clock, sleeps, or test order. |

  The other eight properties are acknowledged but not scored. Their trade-offs (fast vs predictive, for example) are flagged only when they buy nothing.
- **Part 3: verdicts.** Every review finding carries one verdict:
  - **Remove**: only when the test cannot fail.
  - **Rewrite**: the test can fail, but fails a Part 2 item.
  - **Consolidate**: only with mechanical evidence of overlap (D8b).
  - **Keep**: reported only when asked.
- **Part 4: how reviewers judge.**
  - Each item is a yes/no question answered with file:line evidence, after reasoning.
  - Each finding says whether its evidence is **deterministic** (a detector, a planted defect, a diff) or **judgment-only**.
  - Judgment-only Remove or Rewrite verdicts are confirmed by a majority of three independent judgments before they are reported as findings. Others are reported as "review these".
  - The repository's conventions (research or profile) override generic style items.
- **Rationale**:
  - Writers and checkers use one text, so they cannot drift apart (decision 4; prompt audit C-F16).
  - "Can it fail?" first is the strongest-evidence check: 80.2% of agent test patches have weak or no oracle (arXiv 2606.18168), and audit W5 is this failure.
  - The Desiderata give findings a shared vocabulary. Broken into yes/no items, they avoid the noise of holistic LLM scoring (RuVerBench; rubric-bias studies).
  - Checking doubles against the declared seam turns the hardest judgment, over-mocking, into a near-mechanical comparison. No linter in any ecosystem detects mocking volume.
  - Majority voting and line evidence are the available mitigations, because no study validates an LLM judge of test value.
- **Trade-offs**:
  - Preload context on four agents.
  - Majority-of-three costs more, so it is limited to judgment-only Remove or Rewrite findings.
  - The Desiderata have no reliability study. Calibration is tracked as `prompts-ul2x`.

#### D8. Two kinds of test review

Reviewing a phase's tests during a plan and auditing a whole repository cold are different jobs:

| | Phase review | Cold audit |
| --- | --- | --- |
| Scope | The phase's diff | A repository or directory |
| Context | Criteria, test-writer reports, red commits, integrity flags | Code and git history only |
| Visible weaknesses | W1–W6 | W3–W6 only (test-audit.md, visibility check) |
| Size | Bounded: one agent | Unbounded: exceeds one agent's ~70-tool-call budget on a real repository |
| Output | Checkpoint findings | A verdict report |

They share only the rubric, so wb gives them separate shapes.

##### D8a. `wb:test-reviewer` agent (plan-aware phase review)

- **What**:
  - A new agent with frontmatter `model: opus`, `effort: high`, preloading `test-quality`.
  - It receives the phase's starting commit, the phase's criteria with their seams, the red commits, the task verifiers' integrity flags, and the conventions.
  - On the phase diff it:
    1. Applies rubric Part 1 ("can it fail?"), with a planted defect on every criterion-guarding test.
    2. Checks that every criterion has an outer test at its observed-at level that ran and is now green.
    3. Applies the Part 2 items to new or changed tests, comparing each double with the declared seam.
    4. Runs the project's detectors on changed test files (the selections from D8b, scoped to the diff).
    5. For `/wb:implement_inline` phases, runs D6's integrity checks across the whole phase.
  - Its findings carry Part 3 verdicts and Part 4 evidence labels.
  - **Mutation testing in stages**:
    - **Level 0, default**: the planted defects above.
    - **Level 1, opt-in**: the repository declares a mutation command (in research conventions or the profile). The reviewer runs it on changed code only, and results are advisory.
    - A gate is out of scope.
  - **Write safety**: planted defects and mutations run only in a disposable git worktree of the current commit, never in the user's working tree. The worktree is removed afterwards.
  - **Used by**:
    - the phase checkpoint of both `/wb:implement` and `/wb:implement_inline`, spawned automatically before the human go-ahead;
    - `validate_execution`, replacing its general-purpose "Verify test coverage" agent, so the agent count stays at four.
  - Findings join the checkpoint summary. They inform the go-ahead; they do not block it automatically.
- **Rationale**:
  - W1 and W2 are only visible with in-plan evidence, so the plan-aware review is where they are caught after the task verifiers.
  - Running at every checkpoint, rather than only in `validate_execution` (never triggered automatically), means deep review does not depend on a manual step.
  - Both implement modes get the same phase review.
  - Mutation score has the strongest evidence, but tool availability varies by stack.
- **Trade-offs**: a new agent; one Opus review per phase. Mutation stays advisory.

##### D8b. `/wb:test-audit` coordinating skill with `wb:test-auditor` agents (cold audit)

- **What**: a user-invocable skill that coordinates the audit the way `create_research` coordinates research:
  1. **Determine the stack.** Plan research, then the profile, then detection. A detected stack is stated in the report.
  2. **Run the project's own detectors with explicit rule selections**, not the project's configured rule set, and report "available but not enabled" rules separately. Only tools installed in the project are run. Selections per stack come from [Test quality verification](external-research/Test%20quality%20verification.md):
     - **RSpec**: rubocop-rspec `SubjectStub`, `AnyInstance`, `MessageChain`, `StubbedMock`, `NoExpectationExample`, `VoidExpect`, `IdenticalEqualityAssertion`, `UnspecifiedException`, `RepeatedExample`, `RepeatedExampleGroupBody`, `LetSetup`, `LeakyConstantDeclaration`, plus `FactoryBot/ExcessiveCreateList`.
     - **Minitest**: the rubocop-minitest weak-assertion cops, most of them opt-in.
     - **pytest**: `ruff --select PT,B011,B017`, without the style-only rules and S101.
     - **Jest and Vitest**: the recommended rules plus `no-conditional-in-test`, `no-large-snapshots`, `require-to-throw-message`.
     - **Playwright and Testing Library**: the recommended rules plus `expect-expect`.
     - **Go**: testifylint.
     - Size cops run at the project's thresholds or are excluded.
  3. **Run custom heuristics where no linter exists**, each presented as "review these" with line evidence:
     - stubs of the subject or of ActiveRecord outside RSpec;
     - interaction-only assertions;
     - assertions on source text or CSS class strings;
     - `sleep` or wall-clock bounds;
     - expected values that call production helpers;
     - assertion-free tests in Python.
  4. **Spread rubric review** across parallel `wb:test-auditor` agents, one per directory or area. Each stays within the tool-call budget. The skill waits for every agent's completion notification before combining.
  5. **Suite-level checks**, each only when the conventions give a runnable command and the suite's services are available. Otherwise each is reported as "not run" with the reason.
     - **Redundancy candidates**: from coverage contexts, or from a full test-by-mutant matrix when the mutation command supports one.
     - **Factory and setup cost**: from TestProf `FPROF` (total vs top-level factory counts) where present.
     - **Flakiness**: one seeded random-order run, then repeats on suspects only.
     - **Brittleness**: commits labelled structural that still edited tests, and setup blocks duplicated across files.
  6. **Write one report** in test-audit.md's shape, with a Part 3 verdict per finding. The report also states what a cold audit cannot see: hollow reds and expectations edited after red need session transcripts or in-plan evidence.
- **`wb:test-auditor`**: a new agent (`model: opus`, `effort: high`, preloading `test-quality`, `maxTurns` sized for one area) that applies Parts 1–4 to an assigned area and returns findings.
- **Pruning policy: the LLM proposes, objective checks decide.**
  - No agent deletes or edits tests.
  - A Remove or Consolidate verdict must cite evidence: no unique killed mutants, or no unique coverage, plus a passing run with the test removed in a disposable worktree. Without that evidence it is labelled judgment-only.
- **Rationale**:
  - A cold audit exceeds one agent's budget. Our own audit needed an Opus agent plus forked miners per repository.
  - Many high-signal rules are opt-in, so running only the project's configured lint misses them.
  - No linter sees mocking volume or mirrored oracles, so heuristics and the rubric cover those.
  - Meta's TestGen-LLM and Google's review practice both let objective filters, not the model, decide what stays.
  - Suite minimization loses 0% to 12.5% or more of fault detection, so removal stays a human decision.
- **Trade-offs**:
  - A coordinating skill plus an agent instead of one agent.
  - Runtime suite checks depend on the suite's services (both audited repositories need Postgres, and sg-wholesale also needs Redis) and are skipped with a stated reason when those are unavailable.
  - mutant is license-gated for commercial use; that is the project's choice, recorded in the profile.

#### D9. `implement_inline`

- **What**:
  - The inline session follows the same rules: it calls `wb:test-writer` for outer and inner tests and never edits test files.
  - It has no per-task verifier, so integrity is checked at the **phase checkpoint**: the shared `wb:test-reviewer` run (D8a) also runs D6's integrity checks across the whole phase diff.
- **Rationale**: inline is the user-chosen hands-on mode, and it gets the same phase review as coordinated mode.
- **Trade-off**: inline has no per-task gate, so integrity problems are caught at phase end rather than per task.

#### D10. Stack conventions

- **What**:
  - `create_research` gains a required **Testing conventions** section, factual only:
    - frameworks and versions;
    - fast and full test commands;
    - the levels present, and the harness that exists per boundary;
    - fixtures vs factories;
    - the seam and mocking patterns in use;
    - skip markers;
    - installed test-quality linters and profilers (rubocop-rspec, rubocop-minitest, ruff, eslint test plugins, TestProf), and what they currently enable;
    - any installed mutation tool;
    - services the suite needs to run (for example Postgres or Redis).
  - The optional profile is `.claude/wb/testing.md` in the target repository. It is markdown read verbatim, like `PRIME.md`, and holds the same headings plus **choices**, such as "no browser tests" or "the LLM is a seam: stub at the model call", and the mutation level.
  - When the profile exists, research cites it as the baseline and records drift from the code.
  - **Precedence for every consumer**: plan research, then profile, then runtime detection. Detection is used only by `/wb:test-audit` with no plan and no profile, and the report states the stack it inferred.
- **Rationale**:
  - Research stays documentarian.
  - Choices can only come from a human-confirmed file.
  - `/wb:test-audit` must work cold (decision 5).
- **Trade-offs**: profile staleness, mitigated by research recording drift. A new file in users' repositories, opt-in only.

### Data Model

**Acceptance criterion** (design.md):

```markdown
AC-3 A question naming a store is answered from that store's orders only
  Given a store "Carrie Karibo" whose orders are linked by customer id
  When someone asks the query agent "What did Carrie Karibo's buy last month?"
  Then the answer counts only that store's orders
  Example: store 812 / customer 4410 has 3 orders in Sept → answer cites 3 orders
  Example (edge): a store with no customer id still resolves
  Observed at: MCP tool response. Seam: only the LLM call is stubbed.
  Refines: M2
```

**Test-writer report** (returned to the caller and passed forward):

- criterion id
- files created or changed
- per changed test: what it pins and the break it catches
- the red run's command and assertion-failure output
- changes to earlier tests, each with a reason tied to the criterion
- any pushback

**Task test context**, added to the implement context package:

- the criteria the task cites, with their examples, observed-at, and seam
- the outer-test red commit for each
- the task's starting commit
- the testing conventions: commands, skip markers, harness per boundary

**Testing profile** (`.claude/wb/testing.md`): markdown sections mirroring research's Testing conventions, plus Choices and Mutation (`off` or `advisory`, with the command).

**Review finding** (from `wb:test-reviewer` and `wb:test-auditor`):

- verdict: Remove, Rewrite, Consolidate, or Keep
- rubric item (Part 1, or a Part 2 property and item)
- file:line and a quoted excerpt
- evidence type: deterministic (named detector, planted defect, or diff) or judgment-only
- for judgment-only Remove or Rewrite: the majority result (for example 3 of 3)
- for Remove or Consolidate: the objective evidence, or "judgment-only, not actionable"
- criterion id, when in a plan

### Integration Points

- **design → tasks**: create_tasks reads Acceptance Criteria and Harness Decisions. It emits harness tasks, a test-writer outer-test step per criterion, and implementation tasks that cite criterion ids. The outer test is the artifact implementation tasks depend on (an existing edge rule, `create_tasks/SKILL.md:219-220`). The trailing "Testing Tasks" block is removed. Tool-call sizing counts test-writer spawns.
- **implement coordinator**:
  1. Records HEAD as the task's starting commit.
  2. Runs the outer-test step for criteria not yet covered: spawn the test-writer, re-run the test, commit `red(AC-n)`.
  3. Spawns the worker.
  4. Spawns the verifier with the starting commit, red commits, criteria, and test-writer reports.

  The fix worker gets the same context and the same starting commit. Workers stay sequential.
- **Phase checkpoint, both implement modes**: after the automated commands and before the human go-ahead, spawn `wb:test-reviewer` with the phase's starting commit. Its findings and the phase's integrity-flag counts join the checkpoint summary.
- **The truncation playbook** (`implement/reference.md:61-101`) treats a committed red outer test as expected state, not a sign of truncation.
- **validate_execution**: `wb:test-reviewer` replaces the coverage agent. Its findings feed the per-Intent verdicts.
- **review-prep**: references `/wb:test-audit` for a broader look beyond the diff.
- **New commands** (outside the stage chain):
  - `/wb:test-audit [scope]`: a plan directory, a path, or nothing for the whole repository. It coordinates D8b and writes the report into the plan directory, or to `docs/test-audits/YYYY-MM-DD-<scope>.md` when there is no plan.
  - `/wb:testing-profile`: drafts `.claude/wb/testing.md` from detection and asks the user to confirm it.
- **Backward compatibility**:
  - A plan with no Acceptance Criteria section, or no Testing conventions section, runs as today. Each stage says "no acceptance criteria: plan predates 5.0.0", following the 3.0.0 Intent precedent.
  - The no-test-file-edits rule and the verifier integrity step apply to all plans, because they need no criteria.

## Scope Definition

### In Scope

- D1–D10 above.
- Three new agents (`wb:test-writer`, `wb:test-reviewer`, `wb:test-auditor`), the new background skill (`test-quality`), and the two new commands (`/wb:test-audit`, `/wb:testing-profile`).
- Drift bundles: each stage change ships with its help, wb-prime, and intake-line updates in the same commit. Affected stages:
  - create_design: scope and intake (adds approval of acceptance criteria and harness decisions)
  - create_research: scope
  - create_tasks: scope
  - implement: scope
  - implement_inline: scope
  - validate_execution: scope

  Help's Command Details also gains the two commands.
- `docs/beads-guide.md` inventory updates if bd usage changes.
- A version bump to **5.0.0**. Per RELEASING.md, changed contracts are a major bump: the worker no longer edits tests, the verifier's FAIL boundary changes, and the design template changes.
- Validating the plugin change itself, against this design's acceptance criteria below.

### Out of Scope

- 3B (read-only outer tests) and 3C (a deterministic integrity script). Deferred, to be adopted if `prompts-bzu0` fails.
- Mutation testing as a gate.
- PreToolUse or Stop hooks.
- SendMessage-resumed test-writers (a possible later cost optimization).
- Building the planned eval harness (`docs/plans/2026-06-10-wb-eval-harness/`).
- Choosing or installing any stack's test tools: wb never mandates Playwright, RSpec, and so on.
- Back-filling acceptance criteria into existing plans.

## Success Criteria

### Acceptance Criteria

This design uses its own format. The plugin's observable boundaries are its artifacts and a headless plugin run (`claude -p --plugin-dir` against a fixture repository), the harness the spike demonstrated.

- **AC-1 Design produces checkable acceptance criteria**
  - Given a project with complete research describing a behavior change
  - When `/wb:create_design` runs
  - Then design.md has an Acceptance Criteria section in which every criterion has a Given/When/Then statement, at least one example with real values, observed-at, a seam when the boundary is external or an LLM, and refines
  - Example: a fixture plan "rides page shows the last 28 days" yields one AC, observed at "rides page HTML", with the example "Oct 1 listed, Sep 30 not, on Oct 28"
  - Observed at: the design.md file from a headless run on the fixture repository
  - Refines: M1
- **AC-2 A missing harness is decided at design**
  - Given research's Testing conventions show no browser harness
  - When a criterion is observed at UI
  - Then design.md's Harness Decisions table lists the UI boundary with one of: add harness, manual, or lower proxy with the loss stated
  - And create_tasks emits a harness task before that criterion's outer test when "add harness" is chosen
  - Example: the fixture wizard criterion "focus moves to the next question" produces a UI row and a harness task
  - Observed at: design.md and tasks.md from a headless run
  - Refines: M1
- **AC-3 The outer test is red on an assertion before implementation**
  - Given an approved criterion and a task citing it
  - When `/wb:implement` runs the phase
  - Then a `red(AC-n)` commit containing only the outer test exists before the implementing task's commit
  - And its recorded failure is an assertion failure, not a load error
  - Example: AC-1 of the fixture, the 28-day window, has a red commit whose failure shows "Sep 30 ride listed"
  - Observed at: the git log of the fixture repository and the coordinator transcript
  - Refines: M1
- **AC-4 Implementers never edit tests**
  - Given a worker implementing a task
  - When it needs a new or changed test
  - Then every test-file change in the task's diff is covered by a test-writer report in the worker's output
  - Example: the fixture's view-model rounding task shows a test-writer report for the changed expectation, with its reason
  - Observed at: worker output and the git diff in a headless run
  - Refines: M1, M2
- **AC-5 The verifier fails integrity defects**
  - Given a worker output with a planted defect: a deleted test, an added skip, a loosened assertion, an expected value computed by calling the code, or an undeclared Bash edit to a spec
  - When `task-verifier` runs
  - Then its report says `### Status: FAIL` and names the defect with file:line in its Test Integrity section
  - And a clean control reports `### Status: PASS`
  - Example: `assert value == 3` changed to `assert value >= 1` with no report → FAIL, "loosened assertion, tests/test_load_series.py:199"
  - Observed at: verifier reports from blind trials (3 per fixture, fresh Sonnet coordinator, per the `wb-blind-trial-skill-eval-method` memory)
  - Refines: M2
- **AC-6 test-audit works cold on a real repository**
  - Given sg-wholesale or fitness-agent with no plan and no `.claude/wb/testing.md`
  - When `/wb:test-audit` runs
  - Then the report states the inferred stack (RSpec with factory_bot, VCR, and WebMock; pytest with pytest-postgresql) and lists findings in the stack's idiom, each with a verdict and an evidence type
  - And it finds at least 7 of the 11 still-present W3–W5 instances in fitness-agent, or at least 10 of the 16 in sg-wholesale
  - And it reports constructs still in the code that hide failures, such as sg-wholesale's `pending` join test (`spec/lib/glossary_definitions_spec.rb:111-118`)
  - And it states that hollow reds (W1) and expectations edited after red (W2) are not checkable cold
  - And in a spot-check of 10 of its findings, the user judges at least 8 to be real problems
  - And no test file is modified, in the repository or its working tree
  - Example: on fitness-agent it reports `tests/test_activity_store.py:217-220` (a `_CHUNK_SIZE` expected value computed with the production formula, W3, Rewrite) and `tests/test_morning_page.py:394` (a JS source-string UI assertion, W4, Rewrite) with file:line
  - Observed at: the generated report, compared with [test-audit.md](test-audit.md); calibration tracked as `prompts-ul2x`
  - Refines: M3
- **AC-7 Research records testing conventions; the profile becomes the baseline**
  - Given a repository with and without `.claude/wb/testing.md`
  - When `/wb:create_research` runs
  - Then research.md has a Testing conventions section
  - And with a profile present, it cites the profile and lists any drift between profile and code
  - Example: a profile declaring "no browser tests" in a repository with a Playwright config → research records the drift
  - Observed at: research.md from a headless run
  - Refines: M3
- **AC-8 Older plans run unchanged**
  - Given a plan whose design.md has no Acceptance Criteria section
  - When `/wb:create_tasks` and `/wb:implement` run
  - Then they proceed with today's behavior, and each says the plan predates acceptance criteria
  - And the no-test-edit rule and the verifier integrity step still apply
  - Example: this repository's 2026-06-10 eval-harness plan skeleton
  - Observed at: stage output in a headless run
  - Refines: M1

- **AC-9 Every phase checkpoint includes a test review**
  - Given a phase completed under `/wb:implement` or `/wb:implement_inline`
  - When the phase checkpoint is reached
  - Then `wb:test-reviewer` has run against the phase's starting commit before the go-ahead prompt
  - And the checkpoint summary lists its findings and the phase's integrity-flag counts
  - Example: a fixture phase containing a vacuous `not in body` assertion with no presence anchor produces a checkpoint summary naming that test with file:line
  - Observed at: coordinator or inline session output in a headless run
  - Refines: M1, M2

### Harness Decisions

| Boundary | Harness present? | Decision |
| --- | --- | --- |
| Headless plugin run against a fixture repository | Partly: the `claude -p --plugin-dir` recipe works (spike, memory `wb-headless-plugin-run-recipe`). No fixture repositories exist. | **Add harness**: small fixture repositories (one Python, one Ruby) with a seeded plan. These are throwaway validation assets kept under `docs/`, never shipped in `plugin/`. |
| Blind trials of the verifier | Method exists (memory `wb-blind-trial-skill-eval-method`) | Use as is |
| Real repositories for test-audit | sg-wholesale and fitness-agent exist; test-audit.md is the reference | Use as is, read-only |

### Non-Functional Requirements

- **Cost**: per plan, the added spawns are one per criterion, plus test-writer calls per task, plus one Opus test-reviewer run per phase (more when majority-of-three judgments apply). A cold `/wb:test-audit` runs only on request; its cost scales with repository size. Report the measured tool calls per worker and per task against the 4.0.0 baseline in the release notes (`prompts-pqlw`).
- **Reliability**: workers stay within the tool-call ceiling. Truncation detection keeps working, because closing the beads issue stays the worker's last act.
- **Safety**: no agent mutates the user's working tree for planted defects or mutation runs; only disposable worktrees.
- **Maintainability**: the test-quality rules exist in exactly one file. SKILL.md files touched by this work do not grow past their current length; detail moves to supporting files.

## Traceability

| Decision | Research or audit basis | Evidence strength |
| --- | --- | --- |
| D1 acceptance criteria | Spec-first checks (spec-kit, BMAD, Kiro, Anthropic); user readability judgment; audit: the best tests came from concrete examples | Moderate |
| D2 harness decisions and tasks | Audit: fitness-agent "no Playwright" and RR-1 to RR-7; sg-wholesale j1tt parked a failing test; Willison's agentic manual testing | Moderate (audit) |
| D3 test-writer | Anthropic: separate test and code authors; ImpossibleBench: test edits are the dominant hack; Searls: dual-loop BDD; spike | Weak to moderate (no controlled study) |
| D4 no test edits by workers | Audit: about 9 post-red edits; about 75% of edits through Bash | Strong (audit) |
| D4 and D6 catch W1 and W2 during the run | test-audit.md visibility check: hollow reds and post-red edits leave no trace in code or git history (one commit per task; sg-wholesale squashes PRs) | Strong (verified on both repositories) |
| D5 red means an assertion failure | Audit: 30 of 93 and 13 of 69 hollow reds; Böckeler: "red is proof only if someone checks why" | Strong (audit) |
| D6 verifier integrity | ImpossibleBench, METR, EvilGenie; audit: weak tests graded "minor" let through | Strong |
| D7 shared rubric | superpowers writing-good-tests; GitLab mocking guidance; Hora & Robbes (agents over-mock); prompt-audit drift finding | Moderate |
| D7 Part 1 "can this test fail?" first | 80.2% of agent test patches have weak or no oracle (arXiv 2606.18168); smell-severity ratings; audit W5 | Strong |
| D7 Part 2 Test Desiderata backbone | Beck's canonical definitions; Google SWE book ch. 12–13 (unchanging tests, state over interactions, real then fake then mock) | Moderate (no reliability study) |
| D7 Parts 3–4 verdicts and judging | Google and Dodds (synthesized verdicts); RuVerBench and rubric-bias studies (decompose criteria, majority vote; snippet-level) | Moderate |
| D8a reviewer and staged mutation | ACH, MutGen (mutation as the quality signal); Google surfaces surviving mutants on changed lines in review; audit: manual planted defects found vacuity | Strong as signal, weak as agent gate |
| D8a reviewer at every phase checkpoint | research.md: validate_execution is never triggered automatically; audit: verifier quality checks ran mainly when the coordinator asked | Moderate (audit) |
| D8 split into phase review and cold audit | Visibility check (different evidence available); ~70-tool-call worker ceiling; this project's own audit needed an Opus agent plus forked miners per repository | Moderate |
| D8b explicit detector selections | Primary docs for rubocop-rspec, rubocop-minitest, Ruff, eslint test plugins, testifylint: many high-signal rules are opt-in; no published false-positive rates | Strong (existence and defaults), unmeasured (noise) |
| D8b suite-level checks | Mutation subsumption and minimization studies (0% to 12.5%+ loss); coverage overlap is noisy; TestProf FPROF; Google flakiness figures; CHOSEN (co-change noise) | Moderate to weak |
| D8b the LLM proposes, objective checks decide | Meta TestGen-LLM filters (25% survived, 73% accepted); Google review practice; ImpossibleBench | Strong (precedent) |
| D9 inline at the phase checkpoint | Consequence of D3 and D6 with no inline verifier | Design inference |
| D10 conventions and profile | Research: Rails convention drift; one-line AGENTS.md conventions; audit: choices buried in tasks.md | Moderate |

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Verifier integrity judgment varies between runs | High | Medium | Integrity flags logged per task; blind trials (`prompts-bzu0`); 3C or 3B ready as fallbacks |
| Review and audit findings are noisy, and users learn to ignore them | High | Medium | Part 1 and detectors first; evidence type on every finding; majority of three on judgment-only Remove or Rewrite; calibration (`prompts-ul2x`) |
| Suite-level checks cannot run in a disposable worktree because services are missing | Medium | High | Each check reports "not run" with the reason; conventions record required services |
| An opt-in detector rule is noisy on a given codebase | Low | Medium | Violations reported per rule, so a noisy rule is visible and can be excluded in the profile |
| More spawns push workers past the tool-call ceiling | High | Medium | create_tasks sizing counts test-writer calls; measured in `prompts-pqlw`; tasks split earlier |
| Nested spawn fails in marketplace installs | High | Low | `prompts-sm6l`; fallback is the original 2B hybrid |
| Briefs carry the implementer's framing into inner tests | Medium | Medium | Rubric rule on expected values; test-writer pushes back; verifier criterion check |
| Red commits in history break CI or bisect mid-phase | Medium | Medium | Commits are labelled `red(AC-n)`; the phase ends green; documented for teams whose CI runs on every commit |
| Criteria bloat at design | Medium | Medium | One per changed behavior; a small fix gets one criterion |
| Profile goes stale | Medium | Low | Research records drift on every plan |
| Skill files grow past the size guidance | Low | High | Detail moves to supporting files and the shared rubric |
| A future Claude Code change alters nesting or depth defaults | Medium | Low | The design depends only on documented foreground nesting; depth needed is 2, limit is 3 |

### Assumptions

| Assumption | Beads ID | Validated? |
| --- | --- | --- |
| A plugin-installed task-worker can spawn `wb:test-writer` outside `--plugin-dir` | `prompts-sm6l` | Pending |
| Test-writer spawns fit the worker's tool-call budget | `prompts-pqlw` | Pending |
| Verifier test-diff review detects planted defects consistently | `prompts-bzu0` | Pending |
| Reviewer and auditor judgments agree with a human on a labeled calibration set | `prompts-ul2x` | Pending |

## Rejected Alternatives

### Option: Sharper case lists in tasks.md (1A)

- **Approach**: the planner writes literal test cases into tasks.md; design is unchanged.
- **Rejected because**: the user cannot readily check test-language case lists, and level choices stay buried in tasks.md.
- **Trade-offs**: smallest change and no stage-scope drift, lost.

### Option: One worker under a red-evidence contract (2A)

- **Approach**: the implementer writes all tests and reports red output and changes.
- **Rejected because**: the approved behavior's test stays with the implementer, and evidence is self-reported.
- **Trade-offs**: zero added spawns, lost.

### Option: Full separation per task (2C)

- **Approach**: every task has a test author and a production-only implementer.
- **Rejected because**: about double the cost, and TDD becomes a hand-off, in the inner layer where the audit found tests mostly sound.

### Option: Resumed test-writer per task via SendMessage

- **Approach**: one test-writer per task, continued by message.
- **Rejected for now because**: replies arrive asynchronously (spike), which recreates the wait-for-reply gate that failed in the barrier trial.
- **Trade-offs**: warm context and lower token cost. Deferred as a possible optimization.

### Option: Runtime detection as the primary stack source (5A)

- **Rejected because**: it cannot capture choices, and agents within one task may infer differently. Kept only as the cold fallback for `/wb:test-audit`.

### Deferred, not rejected

- 3B (filesystem read-only outer tests) and 3C (a deterministic integrity script), if 3A proves inconsistent.
- Mutation testing as a gate.

## Pending Decisions

None block execution. All five exploration decisions and their amendments are recorded in `prompts-cbc3`.

## References

- Research: [research.md](research.md)
- Audit: [test-audit.md](test-audit.md)
- Exploration: [thoughts/2026-10-16-testing-guidance-directions.md](thoughts/2026-10-16-testing-guidance-directions.md)
- Decision record: `prompts-cbc3` (closed, two amendments)
- External research: [external-research/LLM test writing practices.md](external-research/LLM%20test%20writing%20practices.md) (writing tests) and [external-research/Test quality verification.md](external-research/Test%20quality%20verification.md) (verifying written tests)
- Prior art: `docs/subagent-tool-call-ceiling.md`; `docs/audits/2026-09-29-prompt-audit/`; CHANGELOG 2.1.0 (explore_design) and 3.0.0 (Intent)
