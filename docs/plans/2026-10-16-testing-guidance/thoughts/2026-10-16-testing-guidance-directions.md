---
project: testing-guidance
created: 2026-10-16
status: exploration
topic: How wb specifies, enforces, judges, and adapts test guidance across its pipeline
tags: [thoughts, exploration, testing-guidance]
---

# Exploration: Testing Guidance Directions

This session explored the four decisions behind adding testing guidance to wb, one at a time. The user approves each decision before the next is presented. Inputs:

- [research.md](../research.md): how wb handles tests today
- [test-audit.md](../test-audit.md): an evaluation of tests wb produced in sg-wholesale (Rails) and fitness-agent (Python)
- [the external research report](../external-research/LLM%20test%20writing%20practices.md): options A–J with evidence strength

No prior thoughts docs exist. The `Decide:` record is added in Synthesis once it exists.

## Decision Space

**Goal (README Intent)**: Add testing guidance to wb so worker agents write tests that check intended behavior at the right level, and the verifier can tell a protective test from a hollow one.

**Decisions** (confirmed by the user 2026-10-16, to be taken one at a time):

1. **Where the test's expected behavior comes from**: from tasks.md case lists as today, from acceptance criteria in design.md, or from a separate test-author actor.
2. **How test integrity is enforced**: prose, a verifier-run check, a blocking hook, or a combination.
3. **Where test-quality judgment lives**: in the worker, in the per-task verifier, or in a phase-level gate.
4. **How guidance adapts to the target repository's stack**: wb detects it, research records conventions and the plan carries them, or a per-repo override file.

**Constraints from research**:

- Test guidance today is prose only, with no enforcement (research.md §6).
- `task-verifier.md:161` grades weak tests "minor". This was the main reason weak tests passed in the audit.
- Background skills rarely activate inside workflow sessions. Anything a worker must know has to be preloaded or put in its prompt (README.md:61-63).
- Most test edits in the audited repos went through Bash, not Write/Edit (research.md §7).
- Changing a stage's scope or intake triggers the CLAUDE.md drift rule (help, wb-prime, the stage's intake line).
- wb has no eval harness to measure a change.
- A stored memory (wb-barrier-volume-not-discriminator): louder prompt wording did not change agent behavior; the weak point was the reporting channel.

**Already fixed by the user**:

- TDD stays part of wb.
- No mandated stack tools.
- wb does not become a test framework.

## Directions Considered

### Decision 1: Where the expected behavior comes from

**Context.**

- **Today's path.** design.md has Success Metrics and checkbox Success Criteria. It explicitly excludes "test writing tasks (HOW to test it)" (`create_design/SKILL.md:295`). The first place a test's expected behavior is written down is create_tasks. There, a coverage agent proposes unit and integration tests, and the template puts them in separate "Testing Tasks" that depend on the implementation task. The worker then gets a one-line beads description plus phase success criteria, and is told to write the test "exactly as specified, no extra cases".
- **What the audit found.**
  - Tests were strongest where a planner wrote concrete per-example case lists with literal values: sg resolver `tasks.md:358-401`, fitness activity-ingest `tasks.md:398-465`.
  - They were weakest where the plan chose a level casually ("no Playwright", "no VCR for LLM"), or where the worker supplied the expected value itself (mirrored oracles, post-red edits).
- **What the research says.** Every control with strong evidence puts the expected behavior somewhere the implementer cannot reach or weaken. Searls, Anthropic, thoughtbot, and Farley all want the check specified before implementation and judged outside the implementer.

#### Option 1A: Sharper case lists

- **Thesis**: keep tasks.md as the source of expected behavior, and make the planner write every test case well.
- **Approach**:
  - create_tasks' coverage agent and template require each test to carry three things: a concrete example with literal inputs and outputs, the boundary it is observed at (and so its level), and the break it catches.
  - Tests move into the implementation task they drive instead of trailing in separate Testing Tasks.
  - design.md is unchanged.
- **Strengths**:
  - Smallest change, and stays inside one stage, so there is no stage-scope drift.
  - Formalizes exactly what produced the best tests in both audited repos.
  - No new human checkpoint.
- **Weaknesses**:
  - Quality still depends on the planner's diligence at decomposition time.
  - The human approves design.md, but never explicitly approves the expected behavior. Tasks inherit it after the fact.
  - Level choice remains planner discretion.
- **Main risk**: the "no Playwright" style of decision keeps happening silently inside a long tasks.md.
- **Precedent**: the sg resolver and fitness activity-ingest tasks.md case lists. `implement_inline/SKILL.md:481-487` lists test-quality points.

#### Option 1B: Acceptance criteria in design

- **Thesis**: the expected behavior is part of WHAT is being built, so it is decided and human-approved in design.md before anyone plans or codes.
- **Approach**:
  - design.md gains acceptance criteria. Each has a trigger and response statement (Given/When/Then or EARS), at least one concrete example with literal values, and the boundary where it is observed (UI, HTTP, CLI, function).
  - The boundary sets the test level.
  - create_tasks turns each criterion into an outer test at that boundary first, then inner tasks.
  - Tasks cite criterion ids. Verification can audit that every criterion has a test that ran.
- **Strengths**:
  - The expected behavior is fixed and human-approved before code, which is the research's strongest common thread.
  - The test level falls out of the criterion instead of a planner's taste. That would have surfaced the fitness UI gap (criteria observable only in a browser) at design review.
  - Traceability from Intent to criterion to test.
- **Weaknesses**:
  - Changes create_design's scope and intake, which triggers the drift rule. It needs the argument that acceptance criteria are WHAT, not HOW.
  - Spec-bloat risk: Böckeler saw 16 criteria for a small bug.
  - More upfront work for small plans.
  - No evidence that EARS or Given/When/Then beats the other.
- **Main risk**: criteria become ceremony that planners pad, or that design reviewers skim.
- **Precedent**: none in wb. Kiro (requirements.md with EARS), spec-kit, BMAD.

#### Option 1C: Separate test author

- **Thesis**: the actor who writes the test is never the actor who makes it pass.
- **Approach**:
  - During implement, each slice first gets a test-author worker. It writes the failing tests from the plan and demonstrates red. Optionally a human reviews them, as thoughtbot does.
  - Only then does an implementer worker make them pass.
  - Design and tasks stages are unchanged.
- **Strengths**:
  - Structurally separates the expected behavior from the implementer. Directly targets mirrored oracles and post-red edits.
  - Leaves the planning stages alone.
  - Matches Anthropic's "one Claude writes tests, another writes code" guidance.
- **Weaknesses**:
  - Roughly doubles worker spawns and cost.
  - Weak evidence: no controlled study of separate authors.
  - The test author still works from the same thin task description, so the expected behavior is only as good as the plan.
  - Legitimate test corrections need a handoff back.
  - Overlaps heavily with decision 2's enforcement mechanisms.
- **Main risk**: the cost doubles, and test quality is still bounded by plan quality.
- **Precedent**: none in wb. The `/wb:implement` coordinator already sequences workers per task.

### Decision 2: Who writes the tests (added 2026-10-16)

**Context.**

- **Today.** One task-worker writes the test and the code in the same context, and reports on its own red step. A fresh-context verifier only runs the result.
- **What the audit found.**
  - Red runs were often only a load or import error: 30 of 93 fitness workers, 13 of 69 sg workers.
  - Some workers went green first or wrote code first: 16 fitness, 4 sg.
  - About 9 expectations changed after a failing run. Some oracles mirror the code.
- **What the research says.** ImpossibleBench shows editing tests as Claude's dominant shortcut. Anthropic advises "have one Claude write tests, then another write code". No controlled study measures separate authorship. Searls' dual-loop shape is one outer integration test per slice, then inner unit TDD.
- **Interaction with decision 1.** 1B makes the outer test derivable from an approved criterion without any implementation knowledge.

#### Option 2A: One worker, stronger contract

- **Thesis**: keep one author per task, but make its red step and any later test changes visible.
- **Approach**:
  - The worker writes the outer test (from the criterion) and the inner tests and code, as today.
  - Its report must carry the red run's assertion output (a load error does not count).
  - Any test change after red is declared, with a reason tied to the criterion.
- **Strengths**:
  - No added spawns or cost.
  - No coordination changes.
  - Keeps individual TDD as it is.
- **Weaknesses**:
  - The same context still writes the expected behavior and grades it.
  - Evidence is self-reported.
  - Relies on the reporting channel that the barrier trial memory says is weak.
- **Main risk**: declarations get written as asides, like the "Issues encountered: None" pattern.
- **Precedent**: today's task-worker report fields (`task-worker.md:39`).

#### Option 2B: Outer-test author per criterion

- **Thesis**: separate authorship where the expected behavior was human-approved; keep TDD inside implementation.
- **Approach**:
  - For each acceptance criterion, a test-author worker writes the outer test at the criterion's boundary, proves it fails on an assertion, and lands it.
  - Implementer workers then run ordinary inner red/green cycles, writing their own unit tests, until the outer test passes.
  - Implementers do not change the outer test. A needed change goes back through the coordinator.
  - Optional modifier: a human glances at the failing outer tests before implementation starts, as thoughtbot does.
- **Strengths**:
  - The test that encodes the approved criterion is written by someone who never implements it.
  - Costs one extra spawn per criterion, not per task.
  - Matches dual-loop BDD (Searls).
  - Keeps TDD in the worker.
- **Weaknesses**:
  - Inner unit tests are still self-authored, so mirroring risk remains there.
  - A test author may hit a missing harness (a browser, an LLM seam) before any code exists.
  - Adds sequencing to `/wb:implement`.
- **Main risk**: outer tests written without implementation knowledge come out too coarse or brittle, and implementers want to edit them.
- **Precedent**: the `/wb:implement` coordinator already sequences dependent tasks. create_tasks already has "TASK3 tests the interface TASK2 defines" edges.

#### Option 2C: Full separation per task

- **Thesis**: no implementer ever writes a test.
- **Approach**:
  - Every task gets a test-author worker (the outer and inner tests for that task, proven red), then an implementer worker that only writes production code.
  - Test corrections go back to the test author.
- **Strengths**:
  - Maximal separation. Every expected value is independent of the code that satisfies it.
  - Removes the implementer's opportunity to edit tests at all.
  - Nudges tests toward public interfaces, because the author lacks internal knowledge.
- **Weaknesses**:
  - Roughly doubles spawns and cost.
  - TDD becomes a hand-off between two workers instead of one worker's red/green loop, which changes what wb's TDD means.
  - Legitimate corrections ping-pong between workers.
  - Unit tests for internal design are awkward to write blind.
- **Main risk**: cost and churn outweigh the gain at unit level, where the audit found mostly sound tests.
- **Precedent**: none in wb.

## Discussion

- 2026-10-16: The user asked to take each decision one at a time, with three options and pros and cons each, and to approve each before seeing the next. Decision 1 is presented.
- 2026-10-16: The user is interested in parts of 1C regardless of the outcome. 1C is treated as a likely partial ingredient, not a rival. The user asked for worked examples of 1A and 1B in practice.
- The examples use three scenarios drawn from the audit:
  - **Rails service with real-data shape**: the sg-wholesale entity resolver, where a NULL `commerce_customer_id` on 227 of 425 stores was hidden by factory defaults.
  - **UI behavior**: the fitness-agent morning wizard. Focus lost to `<body>` (RR-4) was invisible to source-string tests.
  - **Small bug fix**: the fitness rides window, 27 days against 28.
- **Observations from the worked examples**:
  - (a) 1A and 1B produce similar *inner* test cases. The difference is when the expected behavior and the level are fixed, and who approves them.
  - (b) 1B forces the "observed at: browser" fact to surface at design review. In fitness it was decided silently in tasks.md:109.
  - (c) When the observation boundary sits behind an LLM (sg ask_question), a 1B outer test needs a declared seam: stub only the model call, keep the rest real. Otherwise the outer test degrades into the vacuous stubbed spec the audit found.
  - (d) 1B's overhead on a small fix can be about three lines if criteria are sized to the work.
- 2026-10-16: The user's reaction: "1B is easier to read and understand. I would have a hard time validating the correctness of 1A."
  - This is the deciding consideration for decision 1. The human approver must be able to check the expected behavior.
  - 1A's case lists are written in test vocabulary (filters, fixtures, spec files) and are buried in tasks.md.
  - 1B's criteria are written in behavior vocabulary, with examples, and arrive at the checkpoint the human already reviews.
  - Checkpoint presented for decision 1, with 1C carried forward as an ingredient for decisions 2 and 3.
- 2026-10-16: **Decision 1 APPROVED by the user: 1B, acceptance criteria in design**, as presented at the checkpoint:
  - Each criterion has a Given/When/Then statement, at least one concrete example with real values, and an "observed at" boundary (UI, HTTP, CLI, MCP, function).
  - A criterion whose boundary sits behind an external service or LLM also names the seam.
  - Criteria are human-approved at the design checkpoint. create_tasks turns each into an outer test at its boundary, then inner cases. Tasks cite criterion ids.
  - Criteria are sized one per changed behavior.
  - Deferred to design: Given/When/Then vs EARS, the exact sizing rule, the seam wording.
- 2026-10-16: **Reframing at the user's request.** "1C is not necessarily the same decision here." Who *expects* (decision 1) differs from who *writes* the test.
  - New **Decision 2: who writes the tests** is inserted.
  - The former decisions 2–4 become 3–5: integrity enforcement, quality-judgment placement, stack adaptation.
- 2026-10-16: Decision 2 presented (2A, 2B, 2C). The user asked to go deeper on the harness problem: how it manifests and how TDD would resolve it.

**The harness problem.**

- **How it manifests.** An outer test needs infrastructure the project lacks: a browser driver, an LLM seam or fake, recorded HTTP cassettes (which need credentials), a CLI runner. With no harness, the first run fails on a load or driver error, not an assertion. That is the hollow red the audit counted.
- **What a worker can do at that point** (each one seen in or implied by the audit):
  - (i) Build the harness inside the task. This is scope creep against "zero scope creep", and adding a dependency is a hard-to-reverse choice no worker should make alone.
  - (ii) Silently drop a level: string or source tests. This is the fitness pattern.
  - (iii) Park the test as pending or skipped, or call a manual check done. This is the sg j1tt pattern.
- **Under 2A** the gap is silent. One worker resolves it by (ii) without anyone deciding. In fitness, workers checked the UI in headless Chromium by hand but committed string tests.
- **Under 2B and 2C** the gap is loud. The test author cannot produce an assertion red, so it must stop and report. Making the gap visible is arguably a strength of the separated-author options.
- **Proposed resolution in the TDD process** (not yet approved), in three moves:
  1. **Surface at design.** The 1B "observed at" field exposes the need. For each boundary with no harness in the project (research records what exists), design makes one of three recorded choices: add a harness (naming the project's own tool, since wb does not mandate one); accept manual verification for that criterion; or observe at a lower proxy with the loss stated.
  2. **An enabling task before the first outer test at that boundary.** create_tasks emits a harness task. Its proof is a "can fail" demonstration rather than test-first: a smoke test on behavior that already exists, then a deliberately wrong expectation to show it fails on an assertion, then restore. This is a named, bounded exception to red-first. The harness is tested, not built test-first.
  3. **Classify red.** An outer test's red counts only if it is an assertion failure on the criterion's observable. An infrastructure failure means the task is *blocked*, not red, and routes back to the harness task or to design. This classification is usable by whichever verifier decision 3 chooses.
- **Related notes**:
  - The LLM seam (sg ask_question) is the same shape: the enabling task creates the fake or fixture that stubs only the model call.
  - Cassette recording needs a human with credentials, a checkpoint item rather than a worker task.
  - Keeping browser criteria few (DHH, GitLab) bounds the cost of slow harnesses.
- 2026-10-16: **The user aligned with the harness process**: surface at design, an enabling harness task with a "can fail" proof, and red counting only as an assertion failure on the criterion's observable. The user asked to re-look at 2A, 2B, and 2C with it in place.

**Re-look at decision 2 with the harness process in place.**

- **What the harness process neutralizes.** 2B's "test author hits a missing harness" weakness largely disappears. The harness task precedes the first outer test at that boundary, so the author's job becomes well defined: criterion plus existing harness, then an assertion red.
- **A new structural difference.** Workers do not commit today; the coordinator commits after a verifier PASS.
  - Under 2A, the red run exists only inside the worker's session, so it is self-reported.
  - Under 2B and 2C, the test author's red outer test becomes a durable artifact (a commit, or a checked state before implementation). A verifier can re-run it and confirm it fails on an assertion. That is independent evidence rather than a claim.
  - This interacts strongly with decision 3, enforcement.
- **What stays the same.**
  - 2A: one context still writes and grades the expected behavior.
  - 2C: still about double the spawns, TDD becomes a hand-off, and unit tests are written blind.
  - 2B: inner unit tests are still self-authored, and outer-test brittleness is still possible.
- **A hybrid became visible**: 2B for outer tests, plus 2A's red-evidence contract for the inner tests implementers write. It is listed as a possibility, not proposed as the answer.
- **Illustrative cost** (hypothetical plan with 8 criteria and 40 tasks): 2B adds about 8 spawns (about 20%); 2C adds about 40 (about 100%).
- 2026-10-16: The user: "2B feels like a good next step. The hybrid approach seems strong too." They asked for pros and cons of plain 2B against the 2B hybrid. 2C is effectively set aside.

**Plain 2B vs the 2B hybrid.**

- **Which layer the audit failures fall in.** The audited plans had no outer tests, so every red-phase statistic is for what would be the inner layer under 2B:
  - 30 of 93 and 13 of 69 load-error reds
  - 16 and 4 green-first or code-first workers
  - the post-red edits: `load_series ==1→==3`, rounding `sed -i`, `sorted()` loosening, regex loosening

  Plain 2B does not touch these. The hybrid targets them.
- **A key mechanism.** A declared post-red test change can be *checked*: compare the worker's declarations with the git diff of the test files. An undeclared change becomes a finding. That turns the reporting channel (weak per the barrier-trial memory) from trusted into verified. It depends on decision 3 including a diff check.
- **Plain 2B strengths**:
  - Fewer moving parts.
  - One change at a time, so the outer-author effect can be observed on its own.
  - The inner rules could still arrive through decision 3 or 4 instead.
- **Plain 2B weaknesses**:
  - Leaves the most frequent measured failures unaddressed in this decision.
  - If decision 3 chooses verifier-side checks, the verifier has no declaration to compare the diff against, so it cannot tell sanctioned test edits (some plans pre-authorize rewrites) from unsanctioned ones.
- **Hybrid strengths**:
  - Each layer gets a matched control: authorship separation for the human-approved outer behavior, evidence plus declaration for the inner tests.
  - Directly targets the measured failures.
  - Gives decision 3 a declaration to verify against.
- **Hybrid weaknesses**:
  - More report fields and worker context.
  - On its own it is still self-report, and only becomes strong if decision 3 adds the independent check.
  - Partly pre-empts decision 3.
- **Reversibility.** The inner contract can be added or removed independently of 2B's authorship structure, so the choice is cheap to revisit.
- 2026-10-16: **Decision 2 APPROVED by the user ("let's do hybrid"): the 2B hybrid.**
  - For each acceptance criterion, a separate test-author worker writes the outer test at the criterion's boundary, after any harness task, and proves it fails on an assertion. That red state is preserved so it can be re-run independently.
  - Implementers run inner red/green cycles and do not change outer tests. Changes route through the coordinator.
  - Implementers' reports carry the inner red run's assertion output (a load or import error does not count). Any test change after red is declared with a reason tied to the criterion.
  - The harness process (approved earlier) applies.
  - 2A alone and 2C were not chosen. 2A leaves the approved behavior in the implementer's hands. 2C doubles cost and turns TDD into a hand-off, for the inner layer where the audit found tests mostly sound.
- 2026-10-16: Decision 3 (integrity enforcement) presented.

### Decision 3: How test integrity is enforced

**Context.** After decisions 1 and 2, five things need enforcing:

1. Outer tests are unchanged by implementers.
2. Inner red runs are real assertion failures.
3. Post-red test changes are declared.
4. No skips, pending, xfail, or deleted or loosened assertions slip in.
5. A harness failure is classified as blocked, not red.

Facts that bound the space:

- Hooks see only tool calls, and in the audited repos most test edits went through Bash (about 276 against 15 Write/Edit calls; about 75%).
- The verifier today checks `git diff --stat` only, and grades weak tests "minor".
- The coordinator commits per task after a PASS, so a task's base commit exists.
- The research says read-only tests were the strongest control for Claude, and "don't cheat" prose was nearly useless.
- The barrier-trial memory says wording volume does not change behavior.

#### Option 3A: Verifier reviews the test diff

- **Thesis**: detect after the fact, using the fresh-context Opus verifier's judgment.
- **Approach**:
  - The verifier diffs test files against the task's base commit.
  - It confirms outer tests are byte-identical to their red state, and re-runs the saved outer red where needed.
  - It matches inner test changes against the worker's declarations.
  - It flags added skip markers, removed or loosened assertions, and expected values computed by calling the code under test.
  - An undeclared change or a weakened test is a FAIL, not "minor".
- **Strengths**:
  - Git sees every edit channel.
  - No hook plumbing.
  - Extends an agent that already exists and already runs per task.
  - Semantic judgment can catch "loosened to sorted()" or "expected value from a production formula".
- **Weaknesses**:
  - After the fact, so the work is wasted when caught and a fix worker follows.
  - "Weakened" is a judgment call and can vary between runs.
  - Relies on prompt calibration of a model, which the audit showed only bit when the coordinator asked.
- **Main risk**: verifier inconsistency. The same diff passes one run and fails another.
- **Precedent**: `task-verifier.md` Step 3 scope check (`git status`, `git diff --stat`).

#### Option 3B: Prevent edits to protected tests

- **Thesis**: make the approved outer tests impossible to change by accident during implementation.
- **Approach**:
  - Before spawning implementers, the coordinator makes the slice's outer test files read-only at the filesystem level, then restores them after verification. Filesystem permissions are channel-agnostic: they stop Write, Edit, heredocs, `sed -i`, and python writes alike.
  - Optionally, a PreToolUse hook adds an explanatory denial for Write/Edit on those paths.
  - Inner tests are not protected, since implementers own them.
- **Strengths**:
  - Prevention rather than detection, the control with the strongest evidence for Claude.
  - A worker that hits it must stop and report, which is the sanctioned path.
  - No model judgment involved.
- **Weaknesses**:
  - Covers only enforcement item 1. Items 2–5 still need something else.
  - A determined worker can chmod back. That would be visible in the diff and transcript, but only if something looks.
  - Restoring permissions after interrupted runs needs care.
  - Hook-based denial alone would miss Bash edits.
- **Main risk**: a stuck read-only state after a crash or truncation confuses the next session.
- **Precedent**: none in wb. The `lint-hook` shows hook JSON parsing.

#### Option 3C: Deterministic integrity script at the commit boundary

- **Thesis**: a wb-shipped script, not a model, decides integrity before the coordinator commits.
- **Approach**:
  - wb ships an executable, like `plugin/scripts/lint`.
  - Given the task's base commit, the outer test paths, and the worker's declaration list, it checks four things: outer files unchanged; inner test-file changes all declared; no added skip/pending/xfail markers (patterns per test framework); assertion count not reduced in changed test files.
  - The coordinator runs it before commit. A non-zero exit blocks the commit and becomes a FAIL.
  - Semantic questions (is this expected value mirrored?) stay with the verifier.
- **Strengths**:
  - Deterministic and consistent between runs.
  - Cheap. Sees every channel, because it uses git.
  - Testable on its own.
  - Matches the "harness mechanism over louder text" lesson from the barrier trial.
- **Weaknesses**:
  - Patterns are stack-specific (pytest skip, RSpec `pending`/`xit`, Jest `.skip`), which ties to decision 5.
  - Cannot judge semantic weakening.
  - wb's first non-lint executable needs its own tests, and wb has no test harness of its own.
  - Assertion counting is a coarse proxy.
- **Main risk**: false positives on legitimate refactors erode trust, and coordinators learn to override.
- **Precedent**: `plugin/scripts/lint` (a shipped executable invoked by skills and hooks).

Combinations are legitimate. The three options differ in *who* enforces: model judgment, the OS, or a deterministic script.

- 2026-10-16: **Decision 3 APPROVED by the user ("let's start with 3A and then see how it goes"): 3A, the verifier reviews the test diff**, explicitly as a starting point to be evaluated in use.
  - The verifier diffs test files against the task base commit.
  - It confirms outer tests are unchanged from their red state.
  - It matches inner test changes against the worker's declarations.
  - It flags added skip markers, removed or loosened assertions, expected values computed by calling the code under test, and harness failures presented as red.
  - An undeclared change or weakened test is a FAIL, not "minor".
- **3B and 3C are not rejected; they are deferred as follow-ups** if 3A proves inconsistent in use:
  - 3B: filesystem read-only for outer tests.
  - 3C: a deterministic integrity script.
- "See how it goes" implies design should name what to observe, for example logging each verifier integrity flag per task, so 3A's consistency can be judged. That is left to design.

### Decision 4: Where test-quality judgment lives

**Context.** Decision 3 covers *integrity*: tests were not tampered with. *Quality* is separate: whether an honest test actually protects the behavior. The audit's quality failures:

- Mirrored oracles: production formulas, serializers, or relative comparisons as expected values.
- Over-mocking: stubbing the subject or ActiveRecord, and a RubyLLM builder chain acting as a change detector.
- Wrong level: UI asserted as source strings.
- Vacuous assertions: true by construction, `all()` or `not in` with no presence anchor.
- Real-data shapes hidden by factory defaults.

Today:

- No worker prompt carries quality rules. `implement_inline/SKILL.md:481-487` has a short list, but workers under `/wb:implement` do not get it.
- `task-verifier.md:161` grades quality issues "minor".
- `validate_execution` has a coverage agent but no mutation or real-data step.
- The audit found verifiers produced quality FAILs when they asked "would a test fail if this broke?", and Codex reviews caught the "pins the defect" cases.

Decision 3's 3A already adds diff review to the verifier, which bears on how much more it can carry.

#### Option 4A: Quality rules at write time

- **Thesis**: prevent weak tests where they are written.
- **Approach**:
  - A test-quality reference is preloaded into the test-author and task-worker.
  - Its rules: mock only at declared seams, never the subject or what the project owns; derive expected values from the criterion's example, never by calling the code; every negative assertion has a presence anchor; each test names the break it catches; use the level from the criterion's "observed at".
- **Strengths**:
  - Cheapest point to fix a test.
  - Covers both actors.
  - Pairs naturally with 1B's examples as the source of expected values.
- **Weaknesses**:
  - Advisory prose. The barrier-trial memory and the research both say rules alone change behavior little.
  - Costs worker context on every spawn.
- **Main risk**: the rules are read and not followed, and nothing notices.
- **Precedent**: tdd-discipline preloaded into task-worker; superpowers' writing-good-tests.

#### Option 4B: Verifier judges quality per task

- **Thesis**: a fresh context judges whether each test would catch a realistic regression.
- **Approach**:
  - The per-task verifier asks, for each criterion the task touches: "name the smallest realistic regression; would a test fail?"
  - It applies a short quality checklist (mirrored oracle, stubbed subject, vacuous assertion, wrong level).
  - A weak test that guards a criterion is a FAIL. Quality issues elsewhere stay minor.
  - The `task-verifier.md:161` boundary rule changes accordingly.
- **Strengths**:
  - Independent of the author.
  - The audit's evidence is that this question is what produced quality FAILs.
  - Catches problems before commit.
- **Weaknesses**:
  - Adds to a verifier that 3A already loads with diff review, so more time and tokens per task.
  - Run-to-run inconsistency, as with 3A.
  - More fix-worker loops.
- **Main risk**: the verifier becomes slow and noisy, and coordinators start telling it "do not FAIL on X", as happened once in fitness-agent.
- **Precedent**: BMAD's verification-gap prompt; the audit's coordinator "Check specifically" lists.

#### Option 4C: Phase-level quality gate

- **Thesis**: keep per-task checks light and judge quality once per phase, with stronger tools.
- **Approach**:
  - At the phase checkpoint or in `validate_execution`:
    - Run the project's mutation tool scoped to the phase diff, where one exists (mutant, mutmut, Stryker, PIT). Surviving mutants are test gaps.
    - Audit that every acceptance criterion has an outer test that ran.
    - Run a real-data probe where the plan names one.
  - Results go to the human checkpoint.
- **Strengths**:
  - Mutation score is the strongest-evidence quality signal in the research.
  - Deterministic where a tool exists.
  - Catches gaps that span tasks.
  - Cost is paid once per phase.
- **Weaknesses**:
  - Late feedback, so fixes come after several tasks have built on weak tests.
  - Mutation tools vary by stack, may be absent, and can be slow (ties to decision 5).
  - Equivalent-mutant noise.
- **Main risk**: phase-end findings get waved through at a tired checkpoint.
- **Precedent**: validate_execution's coverage agent and automated commands. Manual mutation passes found real vacuity in the audit (fitness 6.6, sg tun8/j1tt), but only when someone thought to run them.

- 2026-10-16: **The user reframed decision 4 as a combination.** They asked whether the options are mutually exclusive (they are not), and proposed this shape:
  - (a) The same quality guidance given to the implementer is what the verifier checks.
  - (b) validate_execution uses a test-auditor sub-agent, which could be reused in other phases.
  - (c) Mutation testing is optional: "we need to learn our way into that one."

**The emerging hybrid: one rubric, three consumers.**

- **The rubric.** A single test-quality reference, the same document for writers and checkers. It holds the write-time rules from 4A. A checker grades against exactly what the writer was told, so the two cannot drift. Precedent: shared reference docs under `plugin/docs/reference/`.
- **The consumers**:
  - At write time, the test-author and implementer workers.
  - Per task, the task-verifier asks the 4B question ("smallest realistic regression; would a test fail?") for each criterion the task touches.
  - Per phase and in validation, a new test-auditor agent applies the full rubric across the phase diff, checks criterion-to-outer-test coverage, and owns the optional mutation step.
- **Where else the test-auditor could serve**:
  - validate_execution, at the phase or plan level.
  - Ad-hoc audits like this project's [test-audit.md](../test-audit.md).
  - review-prep.
  - A fix-loop second opinion.
  - It should *not* enter create_research, which is documentarian. An auditor judges.
- **A tension to settle in design: verifier load.** 3A (diff review) plus 4B (the regression question) both land on the per-task verifier. One natural split is that the verifier does integrity plus the single criterion question, and the deep rubric review sits with the test-auditor at the phase level.
- **Learning into mutation testing** (sketch, not yet approved):
  - **Level 0 (default)**: no tool. The auditor does a "planted defect" pass on criterion-guarding tests: break the code briefly, see a test fail, restore. The audit observed this working without tooling.
  - **Level 1 (opt-in per repository)**: the repository declares a mutation command. The auditor runs it scoped to the phase diff. Findings are advisory and shown at the checkpoint, never blocking.
  - **Level 2**: promote to a gate per repository once observed results justify it.
  - Recording survivors and false positives is what the "learning" consists of.
  - **Dependencies**: where the opt-in lives belongs to decision 5 (stack adaptation). Whether the auditor may write (to plant and restore defects) is a safety question for design. wb's analysis agents are read-only today.
- 2026-10-16: **Decision 4 APPROVED by the user: one rubric, three consumers.**
  - A single test-quality reference is shared by the test-author, implementer, task-verifier, and test-auditor.
  - The per-task verifier adds the "smallest realistic regression; would a test fail?" question per criterion touched. A weak test guarding a criterion is a FAIL.
  - A new reusable test-auditor agent does the full rubric review at the phase and validation level, and is available for ad-hoc audits and review-prep.
  - Mutation testing is learned in stages: planted defects by default, opt-in advisory tool per repository, gate later.
  - Deferred to design: rubric contents, the auditor's write permission, the verifier/auditor split, the opt-in location (decision 5).
- 2026-10-16: **New requirement from the user.** A user-invocable `/wb:test-audit` that can be run in existing projects (example: sg-wholesale, fitness-agent) to audit their tests against the rubric and produce a report, like this project's test-audit.md.
  - This is a standalone entry point to the test-auditor, outside any plan.
  - **Consequence for decision 5**: stack knowledge must be available *without* a plan's research.md.
  - **Note for design**: a new user-invocable skill is a new command. It is not a workflow stage, but help's command listing and the version bump apply.
- 2026-10-16: Decision 5 (stack adaptation) presented.

### Decision 5: How guidance adapts to the target repository's stack

**Context.**

- **Today.** wb detects nothing. The test framework is "extracted" from a plan's research.md (`implement/SKILL.md:93`), and commands are adapted from tasks.md. Every example in `plugin/` is npm, make, go, or pytest; there is no RSpec.
- **What the earlier decisions now need per repository**:
  - test commands (fast and full)
  - frameworks
  - which harnesses exist per boundary (browser, LLM seam, HTTP recording): decision 1 and the harness process
  - skip and pending markers, and assertion idioms, for 3A's diff review
  - the project's seam and mocking conventions (for example "instance_double for LLM, no VCR") and fixture vs factory style, for the rubric
  - the optional mutation command and its level (decision 4)
- **What the audit observed.**
  - Plans recorded intent-level choices ("no Playwright", "no VCR for LLM") inside tasks.md, where later work could not easily find them.
  - Rails AGENTS.md guidance in the research ("Minitest + fixtures (no FactoryBot)") shows that one-line conventions matter.
- **The new requirement**: `/wb:test-audit` runs outside any plan.

#### Option 5A: Detect at runtime

- **Thesis**: no stored profile. Every consumer infers the stack from the repository each time.
- **Approach**:
  - Agents read manifests and lockfiles (Gemfile.lock, pyproject.toml/uv.lock, package.json), test config (rails_helper, conftest.py, jest config), and a few existing tests.
  - From these they infer framework, commands, markers, and conventions.
- **Strengths**:
  - Zero setup.
  - Always current.
  - Works standalone for `/wb:test-audit` and ad-hoc work.
  - Nothing to go stale.
- **Weaknesses**:
  - Repeated cost on every spawn.
  - Different agents can infer differently.
  - Captures only what exists, not intent. "We chose no browser tests" or "the LLM is a seam" cannot be detected.
- **Main risk**: inconsistent inference between the author, implementer, and verifier within one task.
- **Precedent**: none in wb. Matches the research's "copy sibling test style, detect the stack" rule.

#### Option 5B: Carried in the plan

- **Thesis**: testing conventions are facts about the codebase, so research documents them and the plan carries them.
- **Approach**:
  - create_research gains a required "Testing conventions" section: frameworks, commands, harnesses present per boundary, fixture style, seams in use, mutation tool if installed.
  - design records harness decisions against the criteria.
  - create_tasks and the context package pass them to workers and verifiers.
- **Strengths**:
  - Fits wb's existing flow; implement already extracts the framework from research.md.
  - Human-reviewed.
  - Stays documentarian.
  - No new config surface.
- **Weaknesses**:
  - Re-derived for every plan.
  - Can drift between plans.
  - Unavailable to `/wb:test-audit` and ad-hoc work outside a plan, which the new requirement needs.
- **Main risk**: two plans in one repository describe its conventions differently.
- **Precedent**: `implement/reference.md:14-22` (patterns.testingFramework from research.md).

#### Option 5C: A repository testing profile

- **Thesis**: one durable, human-confirmed testing profile per repository, read by every consumer.
- **Approach**:
  - A file in the target repository, in the spirit of `.claude/wb/PRIME.md`, holds commands (fast and full), frameworks, harnesses per boundary, seam and mocking policy, fixture or factory convention, skip markers, and the mutation command and level.
  - Created by a bootstrap: an agent drafts it from detection (5A's inference) and a human confirms it.
  - Read by the workers, verifier, auditor, and `/wb:test-audit`.
  - research.md cites it and records any discrepancy with the code.
- **Strengths**:
  - One source across plans and ad-hoc runs.
  - Captures intent as well as facts.
  - The natural home for the mutation opt-in.
  - Human-confirmed once rather than re-derived every time.
- **Weaknesses**:
  - A new file to keep current, with staleness risk.
  - A bootstrap step adds first-run friction.
  - Another configuration surface in users' repositories.
- **Main risk**: the profile goes stale and confidently misleads every consumer.
- **Precedent**: `.claude/wb/PRIME.md` (a per-repository override read by `hooks/wb-prime.sh`).

- 2026-10-16: **The user chose 5B with 5C as an option**: "I think it's 5B with 5C as an option. We would need a setup skill for 5C."
  - Plan-carried conventions in research.md are the default path.
  - A per-repository testing profile is optional, created through a dedicated setup skill.
- **A gap surfaced: `/wb:test-audit` run with no plan and no profile.** Neither 5B nor 5C supplies stack knowledge then.
  - Proposed resolution: fall back to 5A runtime detection in that one case.
  - The audit report states the stack it inferred, so a human can check it, and suggests running the setup skill.
- **Proposed precedence**:
  - When a profile exists, create_research cites it as the baseline and records any drift from the code.
  - Without a profile, research derives the conventions as today, made explicit and required.
- 2026-10-16: The final checkpoint was presented. The user asked for a reminder of the drift rule and its impact. Recorded so design can plan for it.

**Drift-rule impact.** CLAUDE.md:163-164:

- A change to a stage's existence, name, scope, or intake must update, in the same commit: help's Command Workflow chain, its "What each stage needs from you" table, and its Command Details; wb-prime's orientation (stage chain and summary); and the stage's own "This stage needs from you" line. RELEASING.md greps for drift before a version bump.
- Any change to a bd command in `plugin/` updates the contract inventory in docs/beads-guide.md.

**Impact by stage**:

| Stage | Scope change | Intake change |
| --- | --- | --- |
| create_design | Yes: acceptance criteria, observed-at, and harness choices enter design (it currently excludes "HOW to test", SKILL.md:295) | Likely: it adds approval of the acceptance criteria and harness choices to "approval of the approach, and approval of the refined metrics" |
| create_research | Yes: a required Testing conventions section, with profile-as-baseline | Probably no |
| create_tasks | Yes: an outer test per criterion first, harness tasks, criterion ids; the Testing Tasks block is replaced | Possibly: confirming harness tasks |
| implement | Yes: a test-author worker per criterion, preserved red, outer-test change routing, verifier diff review | Possibly, if the optional human glance at failing outer tests is adopted |
| implement_inline | **An open question**: an inline run has no separate author, so how 2B applies inline is undecided | Depends on the answer |
| validate_execution | Yes: test-auditor, criterion coverage, staged mutation | Probably no |
| wb-prime and help | Updates follow from each row above | n/a |

**Outside the stage rule**:

- `/wb:test-audit` and the profile setup skill are commands, not workflow stages. They do not enter the stage chain, but belong in help's Command Details.
- New skills and a new agent require bumping plugin.json and marketplace.json together.
- If the new or changed tasks introduce bd commands or flags (for example labelling criterion ids, or the test-author claiming issues), the docs/beads-guide.md inventory applies.

**Planning implication**: each stage change ships in the same commit as its help, wb-prime, and intake-line updates, so create_tasks should bundle them per stage rather than in a trailing docs task.

- 2026-10-16: The user on the drift rule: "not a con per se, just something that we have in place to make sure we keep everything up to date." It is recorded as a sequencing and bundling constraint, not a cost against the direction.
- 2026-10-16: **Decision 5 and the combined direction APPROVED by the user ("approve").**

- 2026-10-16 (after the Decide record closed): **The user reopened decision 2** with a new variant, 2D: a defined **test-writer agent that the implementer calls** whenever it wants to write or update tests, carrying the test-quality guidance. The aim is a hybrid that avoids coordinator-level coordination.
  - **Feasibility checked against the docs** (code.claude.com/docs/en/sub-agents.md, via the claude-code-guide agent):
    - Nested subagents are supported up to three layers below the main conversation, when `Agent` is listed in the agent's `tools:`.
    - The depth limit is set by `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`; a value of 1 disables nesting.
    - The coordinator is the main session, task-worker is layer 1, and a test-writer would be layer 2.
    - That plugin agents honor `Agent` in `tools:` is inferred, not stated (only `hooks`, `mcpServers`, `permissionMode`, and `initialPrompt` are documented as ignored).
  - Pros and cons are presented below. Decision 2 stays as recorded unless the user approves an amendment.
  - The user leaned to the combined option and asked for a recommendation. Recommended: combined, with four guardrails:
    1. Implementers never edit test files.
    2. One test-writer per task, resumed by SendMessage.
    3. Briefs cite criteria, not code, and outer-test changes route through the coordinator.
    4. A feasibility spike first, with the 2B hybrid as the fallback.
- 2026-10-16: **AMENDMENT to decision 2, APPROVED by the user: 2B plus 2D combined.**
  - A single `wb:test-writer` agent, carrying the test-quality rubric, replaces the separate test-author.
  - **Outer tests**: the coordinator calls it per criterion. It proves an assertion red, and the red state is preserved.
  - **Inner tests**: each implementer calls it, one instance per task, resumed via SendMessage across red, adjust, and refactor.
  - Implementers never edit test files. They cannot request outer-test changes, which route through the coordinator.
  - Briefs cite the criterion id and example, not the implementation. The test-writer derives expected values from the criterion and pushes back on briefs framed in terms of the code.
  - The test-writer's reports are the declaration channel. 3A FAILs any test change in the diff that no test-writer report covers.
  - `/wb:implement_inline` uses the same agent, which resolves the earlier deferred inline question.
  - **Conditional on a spike** confirming that a plugin task-worker with `Agent` in `tools:` can spawn `wb:test-writer`, and that SendMessage can resume it within the task. If it fails, the 2B hybrid as originally approved stands.
  - Measure test-writer calls per task and 3A bypass flags.
- 2026-10-16: **Spike run** (headless `claude -p --plugin-dir` with a throwaway two-agent plugin in the job temp directory; two runs).
  - **Nesting: CONFIRMED.**
    - A plugin agent (`spike:spike-worker`, with `Agent` and `SendMessage` in `tools:`) spawned a second plugin agent by its namespaced type `spike:spike-writer`, accepted on the first try.
    - The foreground spawn returned the writer's result synchronously ("done", plus an agentId), and the writer's file write landed.
    - Both agents were registered under namespaced names in the session's agent list.
  - **Resume: WORKS, but ASYNCHRONOUSLY.**
    - SendMessage to the writer's agentId returned `{"success":true,"message":"Resuming agent …"}` immediately.
    - The resumed writer kept its context: it recalled the first request's secret and its constraint.
    - Its reply arrived as a task-notification on the worker's *next turn*, after a 90-second Bash poll had finished, not inside the SendMessage result.
    - In run 1 the worker finished its turn before any notification, and the reply was never seen.
  - **Incidental finding**: writes under `~/.claude` are treated as sensitive and need permission, so run 1's write was denied. This is unrelated to nesting.
  - **Implication**:
    - Guardrail 2 (one test-writer per task, resumed via SendMessage) depends on the implementer waiting for an asynchronous reply before it proceeds or finishes.
    - That is the same wait-for-reply gate the barrier-trial memory found unreliable in Sonnet: wording did not hold it.
    - A synchronous alternative exists: a fresh *foreground* test-writer spawn per request, passing the prior test-writer reports forward as context. It is deterministic, at the cost of re-reading context on each call.
- 2026-10-16: **Guardrail 2 AMENDED, approved by the user.**
  - "One test-writer per task, resumed via SendMessage" is replaced by **a fresh foreground test-writer spawn per request**. Each brief carries the task's prior test-writer reports forward, the same reports that serve as the declaration channel.
  - Resuming via SendMessage is deferred as a possible later cost optimization.
  - **Spike verdict**: the condition on the decision 2 amendment is met. The combined 2B plus 2D direction stands; the 2B-hybrid fallback is not needed.
  - The task-worker needs `Agent` in its `tools:`. It does not need `SendMessage`.

## Synthesis

- **Converged direction** (approved 2026-10-16, one decision at a time): **criteria-first, separated outer tests, verifier-reviewed integrity, one shared quality rubric, plan-carried stack conventions.**
  1. **Expected behavior: 1B, acceptance criteria in design.md.**
     - Each criterion has a Given/When/Then statement, at least one concrete example with real values, and an "observed at" boundary (UI, HTTP, CLI, MCP, function). A criterion behind an external service or LLM also names its seam: what is stubbed, what stays real.
     - Criteria are human-approved at the design checkpoint and sized one per changed behavior.
     - create_tasks turns each into an outer test at its boundary first, then inner cases. Tasks cite criterion ids.
  2. **Harness process.**
     - A boundary with no harness is surfaced at design. Design records one of three choices: add the project's own harness, accept manual checking for that criterion, or observe at a lower proxy with the loss stated.
     - A harness task precedes the first outer test at that boundary. It is proven by a "can fail" demonstration, a named and bounded exception to red-first.
     - Red counts only as an assertion failure on the criterion's observable. An infrastructure failure means blocked.
  3. **Authorship: the 2B hybrid.**
     - For each criterion, a separate test-author worker writes the outer test and proves it red. The red state is preserved so it can be re-run independently.
     - Implementers run inner red/green and never change outer tests; changes route through the coordinator.
     - Implementers report their inner red's assertion output (load or import errors do not count) and declare any test change after red, with a reason.
  4. **Integrity: 3A, as a starting point.**
     - The task-verifier diffs test files against the task base commit.
     - It confirms outer tests are unchanged from red, matches inner changes to the declarations, and flags added skips, removed or loosened assertions, expected values computed by calling the code, and harness failures presented as red.
     - An undeclared or weakened change is a FAIL.
     - Its consistency is observed in use, for example by logging integrity flags per task.
  5. **Quality: one rubric, three consumers.**
     - A single test-quality reference is shared by writers and checkers. It covers mocking only at declared seams, deriving expected values from the criterion's example, presence anchors for negative assertions, naming the break each test catches, and using the criterion's level.
     - The per-task verifier asks "smallest realistic regression; would a test fail?" for each criterion touched. A weak test guarding a criterion is a FAIL.
     - A new reusable **test-auditor** agent applies the full rubric at the phase and validation level.
     - Mutation testing is learned in stages: planted defects by default, opt-in advisory tool per repository, a gate only once results justify it.
  6. **Stack adaptation: 5B plus optional 5C.**
     - create_research records a required Testing conventions section.
     - An optional setup skill creates a per-repository testing profile. Research uses it as its baseline when present and records drift.
     - `/wb:test-audit` falls back to runtime detection, and states the inferred stack, only when neither a plan nor a profile exists.
  7. **New commands.**
     - `/wb:test-audit`: a standalone audit of a repository's tests against the rubric, producing a report like [test-audit.md](../test-audit.md).
     - The testing-profile setup skill.
- **Rationale**:
  - The user must be able to read and check the expected behavior. 1B's behavior-language criteria allow that; 1A's test-language case lists did not.
  - The research's strongest common thread is a check fixed before code and kept out of the implementer's hands. 1B plus 2B places the approved behavior's test with a separate author, and preserves its red as independent evidence.
  - The audit located the most frequent failures (hollow reds, post-red edits) in the inner layer. The hybrid's declarations target them, and 3A's git diff makes the declarations checkable rather than trusted. Git sees the Bash edits that a Write/Edit hook would miss.
  - A shared rubric keeps write-time guidance and check-time grading identical.
  - Splitting depth between per-task and per-phase keeps the verifier tractable.
  - Mutation and profile machinery start optional because stack tooling varies and wb has no eval harness to prove value up front.
- **Rejected (with reasons)**:
  - 1A, sharper case lists: hard for the user to check.
  - 1C as the source of expected behavior: reframed into decision 2 instead.
  - 2A alone: leaves the approved behavior in the implementer's hands.
  - 2C: doubles cost and turns TDD into a hand-off, for the inner layer where the audit found tests mostly sound.
  - 5A as the primary mechanism: cannot capture intent ("no browser tests", "the LLM is a seam"), and agents within one task may infer differently. It is retained only as the cold fallback.
- **Deferred, not rejected**: 3B (filesystem read-only outer tests) and 3C (a deterministic integrity script), as follow-ups if 3A proves inconsistent. Mutation testing as a gate.
- **Deferred to design**:
  - Given/When/Then vs EARS
  - the criterion sizing rule
  - seam wording
  - rubric contents
  - the test-auditor's write permission for planted defects
  - the verifier/auditor split
  - where and how the outer red state is preserved
  - what to log to evaluate 3A
  - the profile's location and format
  - **how 2B applies to `/wb:implement_inline`**, which has no separate author
  - whether the optional human glance at failing outer tests is adopted
  - the drift-rule bundle: create_design (scope and intake), create_research, create_tasks, implement, and validate_execution (scope) each ship with their help, wb-prime, and intake-line updates in the same commit; help's Command Details gains the two new commands; plugin.json and marketplace.json are bumped together; docs/beads-guide.md is updated if bd commands change
- **Decide: record**: `prompts-cbc3`, "Decide: testing guidance direction for wb (criteria, authorship, integrity, quality, stack)". Created and closed 2026-10-16. The close reason carries the chosen direction, rationale, and rejections.
- **README Intent**: no amendment. The Goal and Non-goals are unchanged. The new commands, optional mutation testing, and optional profile stay within "no mandated tools" and "not a test framework".
