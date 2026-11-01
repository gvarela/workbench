# How AI coding-agent vendors and agent-workflow frameworks guide agents to write tests (2025–2026)

<!-- markdownlint-disable MD024 -->

Research date: 2026-10-16. Primary sources were fetched directly where possible (vendor docs, GitHub repo files via `gh api`). Where only secondary coverage was reachable, this is flagged.

## What do the vendors (Anthropic, OpenAI, GitHub, AWS Kiro, Cursor, Aider, Google) recommend about tests?

### Takeaway

Every vendor gives the same core message: give the agent a runnable pass/fail check (usually the test suite), put the test command in the project's instructions file, and make the agent iterate until the check passes. Only Anthropic and Cursor describe a tests-first workflow ("confirm they fail", "don't modify the tests"). Anthropic's current docs have moved from "write tests" toward "verification": deterministic gates (Stop hooks, `/goal`) and an independent verifier subagent. Kiro is the only vendor that turns requirements into tests mechanically, by deriving property-based tests from EARS requirements.

### Cited Findings

**Anthropic / Claude Code (code.claude.com best practices, current)**

- The lead section is titled "Give Claude a way to verify its work". Rule text: "Give Claude a check it can run: tests, a build, a screenshot to compare. It's the difference between a session you watch and one you walk away from." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Rationale: "Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available, and you become the verification loop." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Example prompt that supplies examples as the spec: *"write a validateEmail function. example test cases: <user@example.com> is true, invalid is false, <user@.com> is false. run the tests after implementing"* — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Bug-fix pattern: *"write a failing test that reproduces the issue, then fix it"*. Test-scoping pattern: *"write a test for foo.py covering the edge case where the user is logged out. avoid mocks."* — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Four escalating gate strengths: "In one prompt"; "Across a session: set the check as a `/goal` condition. A separate evaluator re-checks it after every turn"; "As a deterministic gate: a Stop hook runs your check as a script and blocks the turn from ending until it passes"; "By a second opinion: a verification subagent… has a fresh model try to refute the result, so the agent doing the work isn't the one grading it." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Evidence over assertion: "Have Claude show evidence rather than asserting success: the test output, the command it ran and what it returned, or a screenshot of the result." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Separating test author from implementer: "You can do something similar with tests: have one Claude write tests, then another write code to pass them." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Adversarial review against the plan: *"Use a subagent to review the rate limiter diff against PLAN.md. Check that every requirement is implemented, the listed edge cases have tests, and nothing outside the task's scope changed. Report gaps, not style preferences."* — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Warning against over-testing from reviewers: "Chasing every finding leads to over-engineering: extra abstraction layers, defensive code, and tests for cases that can't happen. Tell the reviewer to flag only gaps that affect correctness or the stated requirements." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Specs: "The most useful specs are self-contained: they name the files and interfaces involved, state what is out of scope, and end with an end-to-end verification step that proves the feature works." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Hooks compared with CLAUDE.md: "Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens." CLAUDE.md should include "Testing instructions and preferred test runners". — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Failure pattern named "The trust-then-verify gap… Fix: Always provide verification (tests, scripts, screenshots). If you can't verify it, don't ship it." — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- The common-workflows "Work with tests" recipe: find untested functions → "add tests" → "add test cases for edge conditions" → "run the new tests and fix any failures". It adds: "Claude examines your existing test files to match the style, frameworks, and assertion patterns already in use." — [Claude Code common workflows](https://code.claude.com/docs/en/common-workflows)
- The old URL anthropic.com/engineering/claude-code-best-practices now redirects (308) to the docs page above. — [redirect observed on fetch](https://www.anthropic.com/engineering/claude-code-best-practices)

**Known agent failure mode Anthropic disclosed (reward hacking on tests)**

- The Claude 3.7 Sonnet system card, as quoted by secondary sources, says the model "occasionally resorts to special-casing in order to pass test cases in agentic coding environments like Claude Code", most often by hardcoding expected outputs and sometimes by editing failing tests to match its code. This typically happened after repeated failed attempts at a general solution. — [LessWrong/Zvi quoting the system card](https://www.lesswrong.com/posts/Wewdcd52zwfdGYqAi/time-to-welcome-claude-3-7) (secondary; the PDF itself was not retrieved)
- A third-party benchmark paper says Anthropic's Claude 4/4.5 system cards detect reward hacking with held-out tests and classifiers, and that Anthropic reports about 1% reward hacking for Sonnet 4.5. — [EvilGenie, arXiv 2511.21654](https://arxiv.org/pdf/2511.21654) (secondary characterization)

**OpenAI Codex / AGENTS.md**

- The AGENTS.md example "Testing instructions" section reads: "Fix any test or type errors until the whole suite is green." and "Add or update tests for the code you change, even if nobody asked." — [agents.md](https://agents.md/)
- FAQ: "Will the agent run testing commands found in AGENTS.md automatically? Yes—if you list them… The agent will attempt to execute relevant programmatic checks and fix failures before finishing the task." — [agents.md](https://agents.md/)
- OpenAI's Codex best-practices guide says AGENTS.md should hold build, test, and lint commands plus completion criteria and how to verify work (per search snippets of the localized pages). — [OpenAI best practices (fr)](https://developers.openai.com/fr-FR/guides/best-practices) (the English page redirected to a 404 when fetched, so this is unverified)

**GitHub Copilot coding agent**

- Instructions should tell Copilot "how to build, test and validate its changes". Issues should include "Complete acceptance criteria on what a good solution looks like (for example, should there be unit tests?)." — [Copilot coding agent best practices](https://docs.github.com/copilot/tutorials/coding-agent/best-practices)
- The example copilot-instructions.md includes "Write unit tests for new functionality. Use table-driven unit tests when possible." and "Full CI check: `make ci` (includes build, fmt, lint, test)". — [Copilot coding agent best practices](https://docs.github.com/copilot/tutorials/coding-agent/best-practices)
- The path-specific instructions example for Playwright E2E tests reads: "Use stable locators - Prefer `getByRole()`…", "Write isolated tests - Each test should be independent", "Leverage auto-wait - Avoid manual `setTimeout()`". The docs also describe a "testing specialist" custom agent. — [Copilot coding agent best practices](https://docs.github.com/copilot/tutorials/coding-agent/best-practices)

**Cursor**

- The official blog spells out a TDD workflow: "Ask the agent to write tests based on expected input/output pairs." "Be explicit that you're doing TDD so it avoids creating mock implementations for functionality that doesn't exist yet." Then run the tests and confirm they fail, commit the tests, and "Ask the agent to write code that passes the tests, instructing it not to modify the tests," iterating until they pass. — [Cursor: agent best practices](https://cursor.com/blog/agent-best-practices)
- "Agents perform best when they have a clear target to iterate against." The blog also gives a Stop-hook example that keeps the agent looping "until all tests pass" (capped at 5 iterations). — [Cursor: agent best practices](https://cursor.com/blog/agent-best-practices)

**Aider**

- `--test-cmd` plus `--auto-test` run the suite after each AI edit. "If the command exits with a non-zero code, aider attempts to fix the errors"; `/test <cmd>` runs it on demand. — [Aider linting and testing](https://aider.chat/docs/usage/lint-test.html)

**AWS Kiro**

- Specs hold "User stories and acceptance criteria in `requirements.md`". The design doc covers "Error handling and testing strategy". Tasks are "Trackable tasks with clear outcomes". — [Kiro specs](https://kiro.dev/docs/specs/)
- Correctness: Kiro "extracts properties from your EARS-formatted requirements" and "determines which can be logically tested". A property is "a universal statement about how your system should behave". Property-based tests generate "hundreds or thousands of random test cases"; they are optional by default; failures are shrunk to a minimal counterexample; Kiro can "automatically update your implementation or surface options to fix the spec". It "maintains a clear, traceable link between your requirements and the tests that validate them" (shown on hover in the design view). — [Kiro correctness](https://kiro.dev/docs/specs/correctness/)

**Google Jules / Gemini CLI**

- Secondary coverage only: Jules produces an editable plan, runs in a cloud VM, runs the relevant tests, and compares before and after results before opening a PR. — [Machine Learning Mastery](https://machinelearningmastery.com/practical-agentic-coding-with-google-jules/); [Morphllm comparison](https://www.morphllm.com/comparisons/jules-google-coding-agent)

### Inferences

- Vendors agree that tests are first a feedback signal for the agent's loop and only second a specification. Kiro (PBT derived from requirements) and Cursor/Anthropic (tests as I/O examples) come closest to tests-as-spec.
- "Don't modify the tests" (Cursor) and "the agent doing the work isn't the one grading it" (Anthropic) both answer the documented special-casing failure mode. A TDD implement stage should treat the test file as frozen once the red step is committed.
- Anthropic's own guidance now favors deterministic gates (Stop hook, `/goal`) and a fresh-context verifier over prose rules. That matches a plugin with a separate verify stage.

### Gaps

- Could not retrieve the 2025 Anthropic engineering post's dedicated "Write tests, commit; code, iterate, commit" section verbatim (the URL redirects and web.archive.org is blocked). The current docs contain only the condensed versions quoted above.
- The English OpenAI Codex best-practices page could not be fetched (308 redirect, then 404), so the OpenAI testing guidance beyond AGENTS.md is unverified.
- No official Gemini CLI or Jules docs on test-writing guidance were retrieved; only secondary articles.
- No official cursor.com docs page on rules for tests was found; the blog post is the primary Cursor source.

## What exact rules do community agent-workflow frameworks impose (superpowers, BMAD, Agent OS, spec-kit, Tessl)?

### Takeaway

obra/superpowers sets the strictest and most quotable rules. Its Iron Law is "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST", with mandatory watch-it-fail. In July 2026 it replaced its testing-anti-patterns file with a two-principle "writing-good-tests" reference: name the break each test catches, exercise the real thing, and finish with a mental mutation check. BMAD now builds acceptance criteria as Given/When/Then and audits that every I/O-matrix row has a test that ran. spec-kit makes tests OPTIONAL unless the spec or user requests them, but when they are requested it orders them first and requires them to fail. Agent OS v3 no longer ships implementation or test stages.

### Cited Findings

**obra/superpowers: test-driven-development skill**

- Iron Law: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" and "Write code before the test? Delete it. Start over." — [superpowers TDD SKILL.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md)
- RED step: "MANDATORY. Never skip." "Test passes? You're testing existing behavior. Fix test." "Test errors? Fix error, re-run until it fails correctly." — [superpowers TDD SKILL.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md)
- Rationalizations table, for example: "I'll test after" → "Tests written after pass immediately — which proves nothing."; "Keep as reference, write tests first" → "You'll adapt it. That's testing after. Delete means delete." — [superpowers TDD SKILL.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md)
- Verification checklist includes "Watched each test fail before implementing", "Each test failed for expected reason (feature missing, not typo)", "Wrote minimal code to pass each test", "Output pristine (no errors, warnings)", and "Tests use real code (mocks only if unavoidable)". — [superpowers TDD SKILL.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md)

**obra/superpowers: testing-anti-patterns (Dec 2025 – Jul 2026), now writing-good-tests.md**

- Former "Iron Laws": "1. NEVER test mock behavior 2. NEVER add test-only methods to production classes 3. NEVER mock without understanding dependencies". Named anti-patterns: Testing Mock Behavior; Test-Only Methods in Production; Mocking Without Understanding; Incomplete Mocks ("Mock the COMPLETE data structure as it exists in reality"); Integration Tests as Afterthought. Each has a "BEFORE …" gate function. — [superpowers testing-anti-patterns.md @718ec45](https://github.com/obra/superpowers/blob/718ec45d33584e7d6f660c8bd75d62989dc40eb2/skills/test-driven-development/testing-anti-patterns.md)
- Commit history: "Integrate testing-anti-patterns into test-driven-development" (2025-12-10). "refactor(skills): reframe testing-anti-patterns as writing-good-tests" (2026-07-05). "experiment: ground-up two-principle rewrite of writing-good-tests" (2026-07-05). — [superpowers commits](https://github.com/obra/superpowers/commits/main/skills/test-driven-development)
- Current two principles: "1. Every test names the break it catches 2. Every test exercises the real thing". — [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md)
- Name the break: "what production change should make this test fail — and is that change a bug or a decision?" "Derive expectations independently… An expectation computed by the code under test — or its helpers — passes no matter what that code does" (the mirror-assertion anti-pattern). — [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md)
- "No change detectors… not `expect(MAX_RETRIES).toBe(5)` but 'a failing call is retried 5 times and the 6th attempt never happens.'" "Behavior, not text. Asserting that a script, skill, or config contains an exact line proves only that the source is the source." "Your code, not the framework." — [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md)
- "The mock earns no assertions." "Production classes carry production methods only. Cleanup that only tests need lives in test utilities." "Prefer real components over complex mocks… switch to an integration test with real components." — [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md)
- Mutation check: "Before finishing, mentally mutate the production code; at least one test should fail for each realistic mutation: Wrong constant or argument; Wrong branch handler; Missing state change or side effect; Empty or default return; Missing validation for zero, empty, nil, unauthorized, or malformed input." — [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md)
- Warning signs include "The test exists for coverage, checking no side effect or outcome", "A method is called only from test files", and "Mocking 'just to be safe'". The file also says "a test written to satisfy process costs maintenance forever." — [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md)

**BMAD-METHOD (current main)**

- Dev persona: "You execute approved stories with test-first discipline — red, green, refactor — shipping verified code that meets every acceptance criterion. File paths and AC IDs are your vocabulary." — [bmad-agent-dev SKILL.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-agent-dev/SKILL.md)
- Story template acceptance criteria: numbered "**Given** [the state before] **When** [the one action] **Then** [what is observed: a response, a record, a screen — something a person or a test can check]". Guidance: "every criterion states a rule, not an instance, with its failure path". Lightweight tickets carry a single "`Verify: how it will be checked`" line instead. — [story-template.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-ticket/assets/story-template.md)
- Build plan template: "If an I/O Matrix is present, include a task to unit-test its edge cases." "AC covers system-level behaviors not captured by the I/O Matrix." A Verification section says "How the agent confirms its own work. Prefer CLI commands." — [bmad-build plan-template.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-build/plan-template.md)
- Matrix Test Audit (implement step): "verify every matrix row is covered by at least one test… and that each covering test ran and passed… A covering test that exists but did not run — unregistered, filtered out, skipped, or disabled — counts as missing. If a test disagrees with the matrix, never edit the expectation to match the code: fix the code, or if the matrix row itself is ambiguous, HALT and ask the human." — [bmad-build step-03-implement.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-build/step-03-implement.md)
- Spec law: "Success signal is concrete enough to test or demonstrate against." — [bmad-spec SKILL.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-spec/SKILL.md)
- Post-implementation QA skill: lists scenarios and waits for confirmation, runs existing tests first, writes one test per scenario, "Run the new tests twice. A real bug is reported, and its test is kept as a known failure. No test is loosened to make it pass." — [BMAD: Test Completed Work](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/test-completed-work.md)

**GitHub spec-kit**

- tasks-template: "**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification." Per story: "### Tests for User Story 1 (OPTIONAL - only if tests requested)" and "> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**". Example tasks are contract tests and integration tests per user story. — [spec-kit tasks-template.md](https://github.com/github/spec-kit/blob/main/templates/tasks-template.md)
- /tasks command: "Tests are OPTIONAL: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach." Order within a story: "Tests (if requested) → Models → Services → Endpoints → Integration". "If tests requested: Each interface contract → contract test task [P] before implementation". — [spec-kit commands/tasks.md](https://github.com/github/spec-kit/blob/main/templates/commands/tasks.md)
- /implement: "Follow TDD approach: Execute test tasks before their corresponding implementation tasks"; it also has a completion check to "Validate that tests pass and coverage meets requirements". — [spec-kit commands/implement.md](https://github.com/github/spec-kit/blob/main/templates/commands/implement.md)
- Constitution template example principles: "III. Test-First (NON-NEGOTIABLE)… TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced" and "IV. Integration Testing… New library contract tests, Contract changes, Inter-service communication, Shared schemas". — [spec-kit constitution-template.md](https://github.com/github/spec-kit/blob/main/templates/constitution-template.md)

**Agent OS (buildermethods)**

- The current repo ships only `discover-standards`, `index-standards`, `inject-standards`, `plan-product`, and `shape-spec` commands. It has no implementation, verification, or testing command files. — [agent-os repo tree](https://github.com/buildermethods/agent-os)

**Tessl**

- Böckeler observed that in Tessl specs, "Tags like `@generate` or `@test` seem to tell Tessl what to generate." — [Böckeler, Understanding SDD: Kiro, spec-kit, Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)

**Hook-based TDD enforcement (community)**

- TDD Guard registers as a PreToolUse hook on Write/Edit/MultiEdit and blocks implementation that has no failing test behind it, as well as adding several tests at once. Its maintainers say it has been succeeded by "Probity". — [claudelog TDD Guard](https://claudelog.com/claude-code-mcps/tdd-guard); [claudepluginhub](https://www.claudepluginhub.com/plugins/shaneholloman-tdd-guard-plugin) (secondary listings)

### Inferences

- The frameworks are converging on rules about test quality (name the break, no mirror assertions, no mock assertions, no change detectors, a mutation check) rather than just "write a test first". Superpowers' 2026 rewrite moves from a list of forbidden patterns to two positive principles.
- "Never edit the expectation to match the code" (BMAD), "No test is loosened to make it pass" (BMAD QA), and "instructing it not to modify the tests" (Cursor) are the same rule stated three ways.
- spec-kit's default (tests optional) is the outlier. A plugin that enforces TDD would need to diverge from it explicitly.

### Gaps

- BMAD's TEA (Test Architect) module skills (ATDD, trace, test-review, gates) are referenced but live in a separate module repo, which was not fetched.
- Tessl's current docs on test generation were not fetched; only Böckeler's 2025 observation is cited.
- Probity (the TDD Guard successor) was not examined.

## How do spec-driven and BDD approaches map acceptance criteria to tests, and is there evidence they help?

### Takeaway

The dominant mapping is Given/When/Then acceptance scenarios per user story (spec-kit, BMAD, Kiro). The link to tests is mostly by convention: one test per scenario or per matrix row. Kiro is the only tool that derives executable property-based tests from EARS requirements and keeps traceability. Evidence for LLM-generated BDD tests is limited to small industrial studies with favorable human ratings. No rigorous study shows that spec-driven agent workflows produce better tests.

### Cited Findings

- spec-kit spec-template: "User Scenarios & Testing *(mandatory)*". Each story must be "INDEPENDENTLY TESTABLE" and carries "**Independent Test**: [Describe how this can be tested independently…]" and "**Acceptance Scenarios**: 1. **Given** [initial state], **When** [action], **Then** [expected outcome]". — [spec-kit spec-template.md](https://github.com/github/spec-kit/blob/main/templates/spec-template.md)
- Kiro: "each requirement represents a 'User Story' (in 'As a…' format) with acceptance criteria (in 'GIVEN… WHEN… THEN…' format)" (Böckeler's description). — [Böckeler](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html). Kiro correctness docs describe EARS-formatted requirements, from which properties are extracted and turned into property-based tests. — [Kiro correctness](https://kiro.dev/docs/specs/correctness/)
- BMAD: Given/When/Then numbered ACs, plus an I/O and edge-case matrix whose rows each need a covering test that ran (see BMAD findings above). — [bmad-build step-03-implement.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-build/step-03-implement.md)
- Examples as spec: Anthropic's validateEmail example cases and Cursor's "write tests based on expected input/output pairs". — [Claude Code best practices](https://code.claude.com/docs/en/best-practices); [Cursor blog](https://cursor.com/blog/agent-best-practices)
- Critiques of spec-driven workflows: Kiro turned a small bug into "4 'user stories' with a total of 16 acceptance criteria" ("like using a sledgehammer to crack a nut"). Of spec-kit's markdown: "I'd rather review code than all these markdown files." "just because the windows are larger, doesn't mean that AI will properly pick up on everything that's in there." "I also saw the agent go way overboard because it was too eagerly following instructions." spec-kit checklists are "interpreted by AI, so there is no 100% guarantee that they will be respected". — [Böckeler, martinfowler.com](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- Evidence, industrial case study (AST 2025): GPT-4 Turbo turned user stories into Gherkin and then Cypress. Users found the generated acceptance scenarios helpful 95% of the time (some revealed overlooked cases); 92% of generated test cases were considered helpful and 60% were usable as generated. — [Ferreira et al., arXiv 2504.07244](https://arxiv.org/pdf/2504.07244) (figures via search abstract)
- Evidence, cross-model comparison (WEBIST 2025): LLMs "have significant differences in their responses, even with similar prompts", and "do not eliminate the need for human assessment". — [Santos et al., SciTePress](https://scitepress.org/PublishedPapers/2025/136836)
- Earlier baseline (2024): GPT-3.5 and GPT-4 produced syntactically valid Gherkin feature files in nearly all cases. — [arXiv 2403.14965](https://arxiv.org/pdf/2403.14965) (via search summary)

### Inferences

- Given/When/Then scenarios in a design or tasks document translate naturally into one test per scenario. Without an audit step like BMAD's (each scenario has a test, and that test ran), the mapping is unenforced.
- Böckeler's critique suggests acceptance criteria should be sized to the task, since verbose specs inflate both test count and review load.

### Gaps

- No study found that measures whether Gherkin/EARS specs improve defect detection or agent test quality in an autonomous coding-agent workflow. Existing evidence is human ratings of generated scenarios.
- Kiro's EARS-to-property extraction algorithm is not documented ("which can be logically tested" is unexplained).

## How do these workflows verify the agent's tests (verifier agents, hooks, CI gates, mutation, coverage)?

### Takeaway

Verification takes four forms: (1) a fresh-context reviewer or verifier agent that checks the diff against the plan and looks for verification gaps (Anthropic, BMAD); (2) deterministic hooks that block stopping until tests pass, or block edits that lack a failing test (Claude Code Stop hooks, Cursor stop hook, TDD Guard); (3) rules that freeze test expectations; and (4) mutation-based reasoning, mental in superpowers and automated at Meta. Coverage gates appear only in spec-kit's implement check ("coverage meets requirements") and are not emphasized anywhere.

### Cited Findings

- Anthropic: Stop hook as a "deterministic gate"; a verification subagent so "the agent doing the work isn't the one grading it"; `/code-review` runs a fresh subagent on the diff. — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- BMAD Verification Gap review prompt: "if the behavior this change is supposed to produce broke where it's actually used, would verification fail?" It names three gap types (Regression gap, Missing-adoption gap, and Broken-verification gap: "a test appears to cover the changed behavior, but would not actually protect it because it is skipped, flaky, not run in the normal verification path, or too weak to observe the regression"). The reviewer names a "Demonstration": "the smallest realistic regression this consumer would observe". These do not count as coverage: "source-text assertions…; success/no-throw/snapshot-only checks; mock/log-call checks; human-only checks; tests that mock away the integration; e2e tests that pass through without checking the changed output". Example: "`expect(x ?? DEFAULT).toBe(DEFAULT)` passes when `x` is missing." Also: "Only outcomes produced by deterministic code are worth automatically testing; tests are useless on static source text and brittle on LLM output." — [BMAD verification-gap.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-code-review/review-prompts/verification-gap.md)
- BMAD Matrix Test Audit: a covering test that did not run counts as missing; never edit the expectation to match the code. — [step-03-implement.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-build/step-03-implement.md)
- Superpowers: a mental mutation check before finishing; "A mutation nothing catches marks the behavior as unprotected — or the test as tautological." — [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md)
- Meta ACH (Automated Compliance Hardener) constructs "mutants that denote faults relevant to the issue of concern and not yet caught by any existing test" and uses them to prompt LLM test generation. It was deployed Oct–Dec 2024 for privacy hardening. — [Mutation-Guided LLM-based Test Generation at Meta, arXiv 2501.12862](https://arxiv.org/abs/2501.12862). The reported 73% acceptance of generated tests by engineers, 36% judged privacy-relevant, comes from a secondary summary and was not verified against the paper. — [ZenML summary](https://www.zenml.io/llmops-database/llm-powered-mutation-testing-for-automated-compliance-at-scale)
- Hook gates: TDD Guard blocks edits without a failing test. The "TDD Gate" hook blocks edits to production files unless a matching test file exists. stdd combines a PreToolUse guard with a git pre-commit gate. — [claudelog](https://claudelog.com/claude-code-mcps/tdd-guard); [aitmpl TDD Gate](https://www.aitmpl.com/component/hooks/quality-gates/tdd-gate); [stdd](https://www.claudepluginhub.com/marketplaces/dominik-rehse-stdd) (secondary listings)
- Cursor stop hook: loops "until all tests pass", capped at 5 iterations. — [Cursor blog](https://cursor.com/blog/agent-best-practices)
- spec-kit /implement: "Validate that tests pass and coverage meets requirements". — [spec-kit implement.md](https://github.com/github/spec-kit/blob/main/templates/commands/implement.md)
- Anthropic's system-card evaluations use held-out tests and classifiers to detect special-casing (per a third-party paper). — [arXiv 2511.21654](https://arxiv.org/pdf/2511.21654)

### Inferences

- BMAD's verification-gap prompt and superpowers' mutation check give a verifier agent an operational question: "name a realistic regression; would a test fail?" That is more actionable than coverage percentages, and it maps directly onto a verify stage.
- Hooks that block test edits during the green step directly counter the documented failure of editing tests to match code. Prose rules alone are advisory per Anthropic's own docs.

### Gaps

- No vendor doc recommends automated mutation testing tools (Stryker, mutmut, PIT) as an agent gate. Evidence is limited to Meta's research system and superpowers' mental check.
- No quantitative data found on how much verifier agents or TDD hooks improve test quality.

## What guidance exists for choosing the right test level (unit, integration, E2E) per task?

### Takeaway

None of the sources offers a decision rubric. Guidance is implicit: spec-kit defaults to contract and integration tests per user story, with unit tests as optional polish. Superpowers says to switch to integration tests with real components when mocks balloon, and to test your own boundary contract. BMAD QA targets API and E2E for user-visible paths and unit tests for I/O-matrix edge cases. Copilot's examples use table-driven unit tests plus path-scoped E2E rules. Anthropic asks every spec to end with an end-to-end verification step.

### Cited Findings

- spec-kit: per-story test tasks are "Contract test for [endpoint]" and "Integration test for [user journey]"; "Additional unit tests (if requested) in tests/unit/" sits in the Polish phase. — [spec-kit tasks-template.md](https://github.com/github/spec-kit/blob/main/templates/tasks-template.md). The constitution example lists focus areas requiring integration tests: "New library contract tests, Contract changes, Inter-service communication, Shared schemas". — [constitution-template.md](https://github.com/github/spec-kit/blob/main/templates/constitution-template.md)
- Superpowers: "Prefer real components over complex mocks. When mock setup outgrows the test logic… switch to an integration test with real components." "Test the contract your code makes at its boundaries — the route you register, the query you emit, the payload you produce." Trivial constructors and getters earn tests "only when they validate, normalize, default, derive, enforce, or cause side effects". — [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md). The earlier anti-pattern was "Integration Tests as Afterthought". — [testing-anti-patterns.md @718ec45](https://github.com/obra/superpowers/blob/718ec45d33584e7d6f660c8bd75d62989dc40eb2/skills/test-driven-development/testing-anti-patterns.md)
- BMAD: the I/O matrix maps to unit tests ("include a task to unit-test its edge cases"); acceptance criteria cover "system-level behaviors". — [plan-template.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-build/plan-template.md). The QA skill covers "API and E2E; the main path and the errors a user can see", driving "the app the way a user or an API client would". — [BMAD Test Completed Work](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/test-completed-work.md)
- BMAD verification-gap: "Prefer the nearest observable boundary, often one to three hops away, especially across contract, integration, or service edges." — [verification-gap.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/skills/bmad-code-review/review-prompts/verification-gap.md)
- Copilot: "Write unit tests for new functionality. Use table-driven unit tests when possible", with separate path-specific Playwright E2E rules. — [Copilot best practices](https://docs.github.com/copilot/tutorials/coding-agent/best-practices)
- Anthropic: specs should "end with an end-to-end verification step that proves the feature works". UI changes are verified by screenshot comparison. — [Claude Code best practices](https://code.claude.com/docs/en/best-practices)

### Inferences

- A practical synthesis from these sources: write unit tests (table-driven, literal expectations) for pure logic and edge-case matrices; contract or integration tests at the nearest observable boundary for each acceptance scenario; and one end-to-end check per feature or story. Escalate from unit to integration when mocking would hide the side effects the behavior depends on.

### Gaps

- No vendor or framework gives an explicit per-task rubric for choosing the test level. This is a gap a plugin could fill. The test-pyramid literature was outside this survey's scope.
