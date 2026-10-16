---
project: testing-guidance
created: 2026-10-16
status: complete
last_updated: 2026-10-16
tags: [audit, evaluation, testing-guidance]
---

# Audit: Tests wb Produced in sg-wholesale and fitness-agent

This is the evaluation the user asked for during `/wb:create_research`. It judges the tests that wb runs produced in two repositories against [the external research](external-research/LLM%20test%20writing%20practices.md) and each stack's accepted practice. [research.md](research.md) keeps to facts about wb itself. Judgments are labelled as judgments; everything else cites a file, commit, or session.

Two read-only Opus agents ran the audit on 2026-10-16. Neither ran a test suite: sg-wholesale's `rails_helper` flushes Redis and maintains the schema, and fitness-agent needs mise Postgres binaries. Both mined the session transcripts through forked subagents, and the sg-wholesale agent spot-checked key claims against the files.

Repository paths below are relative to each repository root. Session ids are the first eight characters of the transcript file name under `~/.claude/projects/<repo>/`.

## Scope

| | sg-wholesale | fitness-agent |
| --- | --- | --- |
| Stack | Rails 8.0.5, rspec-rails 8, factory_bot, shoulda-matchers, VCR plus WebMock, mock_redis, no system specs | Python 3.13, FastAPI, Jinja2/htmx/Alpine, SQLAlchemy async, pytest with pytest-postgresql, no browser harness |
| Plans | chat-analytics (Apr), agent-refresh (Oct 9), query-agent-entity-resolver (Oct 15), glossary-semantic-layer worktree | morning-capture, web-ui-ux, empiric activity-ingest, ui-critique-fixes |
| Sessions mined | 2c743083 (69 workers, 64 verifiers), glossary 29650d05 (27 / 26), 9af037cf, 9fa69724 | fb2626db (50 / 46), dc5b14e1 and 57a94b82 (93 / 69, plus 4 Codex reviews) |
| Sample | About 30 examples across all plans | About 25 test files, from all four plans |

## Headline

**Judgment.** Both suites are better than the LLM-test baseline the research describes:

- Tests are behavioral and sit at sensible levels.
- Both use real databases instead of mocks.
- Names say what breaks.
- Nobody skipped tests, xfailed them, or deleted assertions to force green.

Tests are strongest where the plan derived concrete cases from a spec or contract. The weaknesses fall into five recurring patterns, and each maps to a failure mode the research names:

1. The red step often proved only that a module or constant did not exist yet.
2. Expectations changed after a failing run, and nothing independent checked the new value.
3. Some oracles mirror the code (relative comparisons, production formulas, production serializers).
4. Some tests sit at the wrong level: fitness-agent tested UI behavior as source text, sg-wholesale mocked its LLM builder chain heavily. Real-data shapes went untested.
5. Verifier quality checks happened when the coordinator asked for them, and were otherwise graded "minor".

In both repositories, the defects that mattered were found with the suite green:

- In sg-wholesale, every one of the 7 verifier FAILs on Oct 15 came with a passing rspec run.
- In fitness-agent, a Phase 5 critique found seven browser-visible defects (RR-1 to RR-7, `docs/plans/2026-10-15-ui-critique-fixes/critique-2026-10-15.md:316-322`), and the suite still passed.

## Strengths

| Pattern | sg-wholesale | fitness-agent | Research mapping |
| --- | --- | --- | --- |
| Literal boundary oracles taken from the spec | `spec/lib/eval/result_equivalence_spec.rb:52-60` (1.004 vs 1.01, nil vs 0); `spec/agents/tool_loop_guard_spec.rb:31-70` (2nd vs 3rd call, caps at 30 and 39) | `tests/test_activity_counting.py:72-90` (9:59 / 10:01); `:139-157` (499 s / 500 s against design.md:193); `tests/test_capture.py:79-97` (contract vectors T1–T8, DST pair) | superpowers "name the break"; BMAD I/O matrix |
| Real database, executed rather than string-compared | `spec/agents/query_agent/entity_resolver_spec.rb:195-222` executes the filter fragments; `glossary_parity_spec.rb:19-37` compares against independent scopes | `tests/conftest.py:31-98`: a migrated throwaway Postgres per test, no SQLite substitute | GitLab "don't mock what you own"; Hora & Robbes |
| The oracle is independent by design | `spec/agents/schemas_spec.rb:138-268` (JSON-schema contract with rejection cases) | `tests/test_fingerprint_golden_vectors.py:1-23,286-301` (a hand-written canonical string and SHA-256) | Böckeler 2026; Konstantinou et al. |
| Tests of the test guards | `spec/lib/eval/entity_name_seeds_spec.rb:66-101` found that the plan's own regex missed multi-line SQL; `glossary_duplication_spec.rb:106-120` | `tests/test_page_guards.py` self-tests the scanner, which commit 997f72e strengthened after a verifier showed it was vacuous | BMAD broken-verification gap |
| Failure-path depth | `entity_resolver_spec.rb:380-389` (hostile input) | `tests/test_run_activities.py:155-242`; `tests/test_streams_ingest.py:258-296` (a 429 on the Nth fetch, then resume) | superpowers mental-mutation checklist |
| Pre-existing mirrored mocks fixed | Before P1.I1, `ask_question_spec` stubbed keys the agent never emits, and MCP returned "" (git 42107811) | — | thoughtbot "tests that test the mock" |

## Weaknesses

### W1. A red step that only proves something is missing

| | Assertion failure first | Load or import error only | Green first, or code before test |
| --- | --- | --- | --- |
| fitness-agent (93 workers) | 40 | 30 | 16 green first |
| sg-wholesale Oct 15 (69) | about 45 | 13 (11 never saw an example fail) | 4 |
| sg-wholesale glossary (27) | 17 | 7 | 1 |

- The workers who admitted it wrote things like: "I never saw them fail first" (sg P4.5a), "passed on its first run because the helper stubs the chat" (sg P2.I4), and "never saw the tests fail first" (fitness beh.11, test and module written in one Bash command).
- Several workers piped test output through `tail -5`, which hid the failure detail.
- In fitness-agent, a coordinator's `| tail` hid an exit code, and commit 513c9fb went in with a failing test. It was fixed in efae604, and `set -o pipefail` was added.
- Verifiers PASSed fitness 7.1, 6.7, and 4.3 without remarking on the missing red.
- **Good practice seen where test-after was unavoidable**: workers planted mutants (a wrong FK target, an injected import, an injected `text-[10px]`) and watched the tests fail. These were often not recorded.
- **Judgment**: tdd-discipline's "fails (not errors)" rule is stated, but nothing enforces it. The research's point applies: "Watching a test go red is only proof of anything if someone is checking why" (Böckeler 2026, failure_modes notes).

### W2. Expectations or fixtures changed after a failing run

| Case | What changed | Checked independently? |
| --- | --- | --- |
| fitness 1.10 (dc5b14e1) | `SYNC_RUNS_TOTAL = -1`, ran it, pasted the observed 22 ("I got 22 by running it") | The verifier derived 19 + 3 = 22 from the code |
| fitness beh.9 (`tests/test_load_series.py:199-200`) | `== 1` → `== 3` after `assert 3 == 1`, no reasoning given | No |
| fitness 2.1 | Fixture overlap changed from 20 to 30 minutes to reach the expected result | No (the reason is plausible) |
| fitness fix 4.2 | `sed -i` rounding expectations to match the view models | No |
| fitness 2.5, 7.2 | Ordered equality loosened to `sorted()`; one assert loosened to a regex | No |
| fitness beh.21 | Relaxed to fit the implementation | Coordinator flagged it, verifier FAILed it, fix observed red |
| sg glossary gvgc | Allow-listed 5 real violations to turn a duplication guard green | Verifier FAILed it; the fix removed the allow-list |
| sg glossary voak.5 | The spec encoded a regression ("including deleted" dropped the cancelled filter) | Verifier caught it unprompted |
| sg s2hc | Schema `required` deleted, so `{}` validated | Fix added `anyOf` with a red example |
| sg glossary j1tt | A real broken join parked as RSpec `pending` (`spec/lib/glossary_definitions_spec.rb:109-116`) | Reported, not filed |
| fitness coordinator | Renamed `…_and_has_no_title_line` → `…links_to_strava` instead of adding the assertion | No |

- In both repositories, some plans pre-authorized assertion rewrites: sg glossary `tasks.md:87-95`, and the fitness MC V17 prompt ("fix the TEST"). So "a test was edited" is sometimes sanctioned.
- **Judgment**: this is the tampering pattern the research measures (ImpossibleBench: editing tests is Claude's dominant hack; BMAD: "never edit the expectation to match the code"). It is milder here, because every case gave a reason. But only about a third of the cases got an independent check of the new value against the spec, and those were the ones where a verifier or coordinator happened to look.

### W3. Mirrored or relative oracles

- **sg-wholesale**:
  - `entity_resolver_spec.rb:47,56` checks `resolve("x's") == resolve("x")`, which passes if both results are wrong.
  - `:137` checks determinism by comparing two calls with each other.
  - `spec/agents/query_agent/agent_spec.rb:54-59`: 2 of 4 prompt assertions were already true before the change (git 02bc4aab~1).
  - `sales_iq_normalizer_spec.rb:23` repeats the implementation's formula.
  - `eval_case_spec.rb` makes the constants their own oracle.
  - `runner_spec.rb:535,638` computes the git sha and the cost the same way the code does.
- **fitness-agent**:
  - `tests/test_activity_store.py:217-220` (cited as 219-221 at audit time; line numbers corrected 2026-10-16) asserts `_CHUNK_SIZE == 60_000 // len(columns)`. A Codex review flagged it; the real property (staying under the 65,535 bind limit) is never asserted.
  - `tests/test_streams_ingest.py:124` uses the production hash function as its oracle.
  - `tests/test_capture.py:668-671` uses the production serializers as oracles.
  - Migration tests are "derived from the empiric.app.db Tables" (`tests/test_migration_captures.py:15-18`), as the plan prescribed.
  - RR-1 (P0): tests pinned the wrong chart label, and the fix (40e10cb) moved the tests along with the code.
- **Research mapping**: LLM oracles "mainly capture the actual program behavior" (arXiv 2410.21136); Böckeler 2026 ("re-ran the implementation"); superpowers "derive expectations independently".

### W4. Wrong level, or mocks that act as change detectors

- **fitness-agent: UI behavior asserted as source text.**
  - There are 21 assertions on JS source, for example `"ADVANCE_DELAY_MS = 180" in script.text` (`tests/test_morning_page.py:394`) and `"MutationObserver" in script` (`:467-470`).
  - There are 48 assertions on Tailwind class strings across 11 files, for example `scroll-mt-24` standing in for "links clear the band when focused" (`tests/test_rides_page.py:477`).
  - The plans chose this (`web-ui-ux/tasks.md:109` "no Playwright"; `ui-critique-fixes/tasks.md:137-145`). Workers checked the UI in headless Chromium (`tasks.md:1022`), but those checks were never committed as tests.
  - Defects found by browser probing (RR-2 slider, RR-4 focus lost to `<body>`, RR-6 focus ring, RR-7 sticky band, verifier FAIL 3.3 `radio.form` null) were then pinned with string tests rather than behavioral ones.
- **sg-wholesale: mocked RubyLLM builder chain.**
  - The stub block in `spec/agents/query_agent/agent_spec.rb:216-225` gained a line in each of four PRs. Each change to the request shape forced edits across 6 to 8 agent specs, and P3.5 did them with `xargs perl -pi`.
  - `agent_base_spec.rb:36-192` mostly asserts `send(:build_chat)` plus `have_received`.
  - The Oct 15 worker content counts: `allow(` about 117, `have_received` 62, `instance_double` 62.
- **sg-wholesale: stubbing the subject or ActiveRecord.**
  - `stylist_metrics_spec.rb:213-219` stubs the subject's own private methods.
  - `runner_spec.rb:928-942` uses `instance_variable_set` on the runner.
  - `agent_base_spec.rb:317` stubs `LlmCall.create!` and then asserts on the mock.
  - `runner_spec.rb:920` uses `allow_any_instance_of(Store)`.
  - `trajectory_agent_spec.rb:9-11` stubs `to_prompt` to return "baseline" and expects "baseline".
- **sg-wholesale: real-data shapes hidden by factory defaults.**
  - Factories always set `commerce_customer_id`, while real data has it NULL on 227 of 425 stores (resolver `tasks.md:564`). The resulting TypeError (P2.I1) was found by a verifier, not by a test.
- **fitness-agent: over-mocking is low**. `tests/test_ingest_main.py:37-65` is wiring-only and was prescribed by the plan.
- **Research mapping**:
  - Willison: drive the app, then pin what you find with red/green.
  - acceptance_e2e notes §3: a criterion observable only in the UI gets one E2E test.
  - Searls: unit tests chase coverage while the integrated app breaks.
  - GitLab: "never mock methods of the class under test".
  - Hora & Robbes: agents over-mock.
  - DHH and GitLab argue for few system tests, so a handful of browser smoke tests would cover the fitness gaps without changing the suite's character.

### W5. Weak or vacuous assertions passed as "minor"

- **fitness-agent**:
  - `tests/test_macros.py:499-501` was true by construction at audit time. Verifier 7.5 said "always passes" and PASSed it. (A 2026-10-16 recheck found those lines no longer show the always-true comparison; the code has since changed.)
  - `tests/test_headline.py:34-55` uses loose `>= 1` inequalities on hand-worked data.
  - `tests/test_headline.py` is missing the specified case "unavailable channel not counted as quiet" (`web-ui-ux/tasks.md:271`). The verifier "reasoned this out rather than running a mutation".
  - The code has 36 uses of `assert all(...)` and 42 of `not in body` (first reported as 84; corrected by a 2026-10-16 recount), which pass silently if the content disappears. When evidence gating went in (3.4), several Today tests became vacuous this way. Verifier ae3759a caught it, and fix aabdd66 added presence anchors.
  - `tests/test_no_duplicate_cycling_types.py:17` greps a single literal (flagged by Codex, unchanged).
- **sg-wholesale**:
  - `agent_base_spec.rb:36-40` is titled "does not send a temperature" but asserts something else.
  - `spec/agents/query_agent/tools/find_entities_spec.rb:14-22` is a nearly vacuous pass-through test.
  - Negative prompt guards (`not_to include("CRITICAL")`) can never fail again once the text is gone.
- **Verifier pattern**:
  - Only 3 fitness verifier FAILs concerned test quality. Most test-quality findings were graded minor, following `plugin/agents/task-verifier.md:161`.
  - Codex reviews, not task-verifiers, caught the "pins the defect" cases.
  - In sg-wholesale, no verifier flagged over-mocking, and "stub-only spec edits" were treated as safe.

### W6. Flaky constructs (minor)

- **fitness-agent**:
  - `tests/test_responsive_proxies.py:251-318` uses wall-clock bounds (1.0 s and 0.3 s), marked `slow` but never deselected.
  - The plist drift guards skip on Ubuntu CI, which has no `plutil`, so CI never runs them.
- **sg-wholesale**:
  - No unstubbed `sleep`, correct `freeze_time` use, no Capybara.
  - Request specs inherit a pre-existing stub on the user's `any_role?` (`spec/requests/store_insights_spec.rb:15-16`), which bypasses real authorization.

## Process artifacts against output

- **Where the tests came from.**
  - Strong tests trace to concrete per-example case lists in tasks.md. The sg resolver `tasks.md:358-401` lists literal data, and the specs follow it almost one-to-one. The fitness activity-ingest `tasks.md:398-465` lists boundaries and failure tiers.
  - Weak spots also trace to plans: string-level UI tests, migration tests derived from db.py, the LLM stub policy, and test-after phase splits ("TDD RED does not apply to this task by the plan's split").
- **Worker prompts** carried the case lists and "confirm they fail for the right reason".
  - No prompt mentioned test level, mocking policy, not stubbing the subject, deriving expected values independently, or leaving expectations alone after red.
  - `task-worker.md:19` ("exactly as the task specifies — no extra cases") discourages edge cases the plan did not list.
- **Verifiers were the effective gate when asked.** About 14 of 64 sg verifier prompts and about 5 fitness verifier runs included revert-to-red, planted-defect, or weak-assertion checks. Those runs produced the quality FAILs.
- **The edit channel matters for any integrity check.** Most test edits went through Bash (fitness fb2626db: about 276 Bash edits against 15 Write/Edit calls; sg: about 75%). A hook or scan keyed on Write/Edit tool calls would miss them. A diff of test files against the task's base commit would not.

## Visibility check: what a cold audit can see (2026-10-16)

A read-only follow-up checked which findings a later audit could recover from the code and git history alone, without session transcripts.

- **W1 (hollow reds): invisible.** Both repositories commit one commit per task, with tests and code together. This held for 40 fitness-agent task commits and all 14 sampled sg-wholesale commits. Commit history cannot distinguish test-first from test-after.
- **W2 (expectations changed after a failing run): invisible.** None of the 12 named instances appears as a diff between two commits. The first committed version already holds the final expectation (for example `tests/test_load_series.py:199-200` first appears with `== 3` in `dbcfcf4`; the sg-wholesale glossary allow-list first appears with all 5 terms in `48c9ae8b`). sg-wholesale also squash-merges PRs to `main`, so its per-task commits survive only on unmerged branches.
  - The exception is a construct still present in the code: sg-wholesale's j1tt `pending` test (`spec/lib/glossary_definitions_spec.rb:111-118` in the glossary worktree) can be found by a static scan.
- **W3–W5: visible.** Of the named instances, 11 of 12 in fitness-agent and 16 of 16 in sg-wholesale still exist in the current tree.

**Consequence:** W1 and W2 can only be caught while the work is happening, from test-writer reports, red commits, and a diff against each task's starting commit. A cold audit can be held to W3–W6 only.

## What the audit adds to the research options

How the audit's evidence bears on the options in [the external report](external-research/LLM%20test%20writing%20practices.md) (its table, options A–J). This is a judgment for design to weigh, not a decision.

| Option | Audit evidence |
| --- | --- |
| A. Test-integrity diff check in the verifier | **Strengthened, with a constraint.** W2 shows real post-red expectation edits. The check must diff files in git, not watch tool calls. It also needs an "edit sanctioned by the plan" escape, because plans did pre-authorize rewrites. |
| B. Freeze tests after red with a PreToolUse hook | **Weakened as specified.** A Write/Edit matcher would miss most edits, which go through Bash. A freeze would need a git-diff check at verify time, or Bash-aware hooking. |
| C. Test-quality rules in the worker skill | **Supported.** The gaps in W3 and W4 (stubbing the subject, ActiveRecord stubs, relative oracles, production formulas as oracles) are rules no prompt carried. |
| D. Acceptance criteria in design.md feeding tests | **Supported.** Concrete case lists in tasks.md produced the best tests in both repositories. Formalizing them upstream would make that the default rather than the result of a careful planner. |
| E. One outer acceptance test per slice | **Supported, especially for UI.** The fitness RR-1 to RR-7 defects were invisible to string tests. In sg-wholesale, every verifier FAIL had a green suite. |
| F. Test-level rubric | **Supported.** Plans chose levels ad hoc: "no Playwright", "no VCR for LLM". The resulting gaps line up with those choices. |
| G. Mutation testing | **Supported as a phase gate.** Manual mutation passes found real vacuity (fitness 6.6, sg tun8 and j1tt), but only when someone thought to run them. |
| J. Verifier calibration | **Strongly supported.** Verifiers saw weak tests and passed them as "minor" under `task-verifier.md:161`. The ones that asked "would a test fail if this broke?" produced the quality FAILs. |
| New. Red-evidence requirement | **Suggested by W1.** The worker report could carry the red run's assertion output, so that a red caused only by a missing module or constant doesn't count. The verifier could then check it. |
| New. Real-data probe | **Suggested by W4.** Bugs hidden by factory defaults were found by verifiers probing real data, not by specs. |
