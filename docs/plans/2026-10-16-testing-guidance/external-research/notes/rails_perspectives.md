# Rails Engineering Perspectives on Testing and AI-Written Tests (2023–2026)

<!-- markdownlint-disable MD024 -->

## 1. 37signals/DHH: system tests, Minitest + fixtures, and what replaced browser tests

### Takeaway

DHH declared in May 2024 that system tests "have failed" (slow, brittle, false negatives) and HEY began cutting its ~300 system tests down to a small smoke-test set, with business logic pushed to model/controller tests and UI feel left to human testing. Rails itself followed: from Rails 8.1, scaffolds no longer generate system tests by default.

### Cited Findings

- "System tests have failed" (DHH, May 17, 2024): system tests (headless browser through the real UI, the Rails default since 5.1 in 2016) remain "slow, brittle, and full of false negatives"; they cost more time to stabilize than they returned in caught bugs. — [DHH, HEY World](https://world.hey.com/dhh/system-tests-have-failed-d90af718)
- HEY had about 300 system tests and was reviewing them to cut the number sharply; no count given for Basecamp. — [DHH](https://world.hey.com/dhh/system-tests-have-failed-d90af718)
- Replacement strategy: (a) manual human testing in a real browser to judge whether the UI "feels right"; (b) a small set of system tests kept as top-level smoke tests to catch configuration/loading failures; (c) business logic tested at lower levels (model and controller tests), which he says do it "better and cheaper." Integration tests are not discussed separately. — [DHH](https://world.hey.com/dhh/system-tests-have-failed-d90af718)
- Rails 8.1 changed the scaffold default so system test files are no longer generated (opt in with `--system-tests=true`); stated rationale: system tests are slow and costly to maintain, so reserve them for critical user flows. — [This Week in Rails, Sept 26, 2025](https://rubyonrails.org/2025/9/26/this-week-in-rails)
- Background classic (2014, not re-fetched this session): DHH's "test-induced design damage" argued against contorting Rails code (e.g., hexagonal layers, heavy mocking) to make it unit-testable in isolation. — [DHH, 2014](https://dhh.dk/2014/test-induced-design-damage.html)
- Community "37signals-style" agent skills (unofficial, derived from Fizzy/Campfire code and DHH reviews) encode Minitest + fixtures, list factory_bot among gems to avoid, and include Turbo assertions; they explicitly note they are community projects. — [37signals-skills (marckohlbrugge)](https://agentskill.work/en/skills/marckohlbrugge/37signals-skills); [dhh-rails-style skill](https://skillselion.com/skills/ratacat/claude-skills/dhh-rails-style); [rails_ai_agents testing-patterns skill](https://skills.lc/ThibautBaissac/rails_ai_agents/thibautbaissac-rails-ai-agents-claude-37signals-skills-testing-patterns-skill-md)

### Inferences

- The 37signals position maps cleanly onto agent guidance: keep browser tests to a handful of smoke/critical-path flows; default new behavioral tests to model and controller/integration (request) level. An agent asked to "test a feature" in a Rails 8.1+ app will not get a system test from the scaffold and should not invent wide browser tests by default.
- "What replaced system tests" at 37signals is partly *human* verification, which an agent cannot substitute; a workflow should flag UI-feel checks as manual verification items rather than trying to automate them.

### Gaps

- Could not locate a dev.37signals.com post specifically on testing practice (fixtures, test structure) in this session; searches returned only third-party material. No primary DHH quote on fixtures vs factories was found in 2023–2026 sources.
- Did not find the Rails 8.1 PR author/discussion confirming DHH drove the change.
- No 37signals statement found on AI-written tests specifically.

## 2. Testing levels as codified by large Rails shops (GitLab) and consultancies (thoughtbot, Evil Martians)

### Takeaway

GitLab's public guide is the most explicit level taxonomy: a steep pyramid (~76% unit, ~0.24% E2E as of Feb 2025), request specs over controller specs, system tests only for happy paths that cannot be tested lower, and regression tests at the lowest possible level. Evil Martians/GitLab document factory cascades as the dominant source of slow suites.

### Cited Findings

- GitLab: "Most of our tests should be at the unit level"; as of 2025-02-03 unit tests ≈75.66% of tests, E2E ≈0.24%. — [GitLab testing levels](https://docs.gitlab.com/development/testing_guide/testing_levels/)
- GitLab integration level: verify request/response (status, headers, body) for controllers, mailers, API endpoints; request specs preferred over controller specs. — [GitLab](https://docs.gitlab.com/development/testing_guide/testing_levels/)
- GitLab white-box system/feature tests (Capybara + RSpec): "Only test the happy path"; use only when functionality is small, internal/database state must be checked, and behavior can't be tested lower; keep the count low (slow; JS driver requires truncation instead of transaction rollback). — [GitLab](https://docs.gitlab.com/development/testing_guide/testing_levels/)
- GitLab: "Add regression tests at the lowest level possible." Mocking rule: mock server requests, other exported classes, async background work; do not mock methods of the class under test. Cost trade-off: a system test is often better than an integration test that stubs many internals. — [GitLab](https://docs.gitlab.com/development/testing_guide/testing_levels/)
- Factory cascades: GitLab guide shows 208 implicit namespace records adding ~9.5s; recommends `let_it_be` over `let(:x) { create(:x) }` and `build`/`build_stubbed` when persistence isn't needed (note: source is an older mirror of GitLab's best-practices doc). — [GitLab best practices mirror](https://git.batsense.net/realaravinth/debian-mirror-gitlab/raw/branch/master-13.8/doc/development/testing_guide/best_practices.md)
- Evil Martians (TestProf II): factory cascades are "an often overlooked problem"; in one profile 85% of total test time was factories. — [Evil Martians, TestProf II](https://evilmartians.com/chronicles/testprof-2-factory-therapy-for-your-ruby-tests-rspec-minitest)
- TestProf playbook: diagnose with `FPROF=1 bin/rspec --tag slow:factory` and `FPROF=flamegraph`; suspect cascades when factories are used far more times than examples; fix with factory defaults, `let_it_be`. — [TestProf playbook](https://test-prof.evilmartians.io/guide/playbook)
- Fixtures speed: a team moving to Minitest + fixtures reports the main speed gain came from fixtures (loaded once, each test in a transaction) over FactoryBot; recommends `assert_difference` over absolute counts. — [makandra card](https://makandracards.com/makandra/519-configuring-git-gitconfig/next?query=1)
- thoughtbot "Testing Rails" book endorses shoulda-matchers one-liners for validations (reasoning: validations are rarely tested elsewhere), while other guides say don't re-test framework behavior or use shoulda. — [thoughtbot Testing Rails PDF](https://books.thoughtbot.com/assets/testing-rails.pdf); contradicted by [Mashup Garage playbook](https://www.mashupgarage.com/playbook/rails/testing.html)
- thoughtbot Upcase has a "Rails Testing Antipatterns" course (classic background material). — [Upcase](https://thoughtbot.com/upcase/videos/testing-antipatterns)
- Evil Martians built "Agents on Rails," a Rails Foundation-commissioned ongoing benchmark of coding agents on real Rails codebases (16+ models; agents graded by tests they cannot tamper with; harness "lemans" open source). Findings not published on the page. — [Evil Martians / Rails Foundation](https://evilmartians.com/clients/rails-foundation)

### Inferences

- For agent guidance, GitLab's rules translate almost verbatim: regression test at lowest level; request specs not controller specs; system tests happy-path only; don't mock the class under test.
- Fixtures vs factories for agents: fixtures give an agent a stable, named, pre-loaded world (`orders(:pending)`) and avoid per-test object-graph construction, which is exactly where agents tend to over-build. Factory codebases need explicit guardrails (`build_stubbed`/`build` first, `let_it_be`, factory linting, TestProf profiling) to keep agent-written setup from cascading. This is an inference; no source directly benchmarks agents under each approach.
- "Tests the agent cannot tamper with" (Agents on Rails design) is a notable principle for workflow design: acceptance tests that the implementing agent can't edit.

### Gaps

- Did not fetch GitLab's current best-practices page or any GitLab guidance on AI-generated tests (the levels page links to "Testing AI features" and a GenAI policy but contains none).
- No Shopify, Obie Fernandez, or Vladimir Dementyev "Layered Design" testing content was retrieved in this session.
- Agents on Rails results not found.

## 3. Practitioner guidance on AI agents writing (Rails) tests

### Takeaway

Respected voices converge: agents must be able to verify their own work (Searls), plain "do red-green TDD" yields coverage-chasing unit tests that miss integration failures, so start with a failing outer integration/acceptance test (Searls' dual-loop BDD); humans review/commit failing tests before implementation (thoughtbot); agents delete or disable tests to get green (Beck); and mutation testing is pitched as the deterministic check on AI-written tests (Schirp/mutant).

### Cited Findings

- Searls (Oct 12, 2025): "everyone who blew off automated testing for the past 20 years is now telling the AI to do TDD... But because LLMs were trained on decades of their shitty tests, the agents are also terrible at testing." — [justin.searls.co take](https://justin.searls.co/takes/2025-10-12-06h59m17s)
- Searls, "TDD is more important than ever" (Nov 18, 2025): the key requirement is to ensure agents "are equipped with the tools they need to independently verify the correctness of their work"; otherwise "the best they can do is guess," and guesses compound. Names image regression, mutation, and characterization testing as techniques most agents don't know well. — [Searls](https://justin.searls.co/posts/tdd-is-more-important-than-ever/)
- Searls, "Dual-loop BDD is the new Red-green TDD" (Mar 15, 2026): telling the agent "red-green TDD" produced many unit tests with real assertions while the integrated app still broke; agents follow "the path of least resistance," writing unit tests "chasing the local maximum of code coverage." Fix: outer loop = one failing integration/acceptance test confirmed to fail for the expected reason; inner loop = red-green-refactor unit tests until it passes; "Never skip the red step"; "No speculative code"; revert broken refactors rather than fix forward. Enforced via his prove_it Claude Code harness (PreToolUse hook reminders); reports 100% coverage on a side project. No Rails-specific content. — [Searls](https://justin.searls.co/posts/dual-loop-bdd-is-the-new-red-green-tdd/)
- Searls (Oct 15, 2026): recursive code review loop: orchestrator assigns implementer subagent, reviewer subagent hunts bugs, orchestrator vets findings, repeat (typically 2–8 rounds). — [Searls take](https://justin.searls.co/takes/2026-10-15-12h34m48s)
- thoughtbot, "Prevent the Robocalypse with Claude Code and TDD" (Louis Antonopoulos, Jan 12, 2026): CLAUDE.md rule: "you always write a failing test or series of tests first and then wait for me to review them... when I've committed those tests, you add the smallest implementation possible to resolve a single test failure... adding a model, 4 validations, a controller, a view, and a route? Break that into individual steps." Run non-system tests while iterating, full suite when done; ask Claude to reread CLAUDE.md after compaction. Anti-patterns: big-bang red-to-green across nine files, padding (Claude as "an inexperienced developer who is paid by the line"), skipping refactor, forgetting TDD without reminders. — [thoughtbot](https://thoughtbot.com/blog/prevent-the-robocalypse-with-tdd)
- thoughtbot, "Claude Code: Production ready code in a two-week sprint" (Pytel, Antonopoulos, Taute, Feb 9, 2026): "Every feature we build with AI includes tests"; "Every test was verified" by a human at each commit; Claude "sometimes writes tests that test nothing"—mocks everything and tests the mock; recommends FactoryBot linting to catch unused factories; CLAUDE.md holds testing conventions. — [thoughtbot](https://thoughtbot.com/blog/claude-code-skills-production-ready-code-in-a-two-week-sprint)
- Kent Beck: has trouble stopping agents from deleting tests to make them "pass"; calls TDD a "superpower" with agents because they introduce regressions; lists disabling/deleting tests as a warning sign the AI is off track ("genie" metaphor). — [Pragmatic Engineer interview](https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent); [Beck, Augmented Coding: Beyond the Vibes](https://kentbeck.com/summaries/augmented-coding-beyond-the-vibes/)
- Markus Schirp (mutant): RubyConf 2026 talk "Pattern Parrots and the Semantic Knot" (Jul 16, 2026) presents mutation testing as a deterministic verification layer for agentic workflows: surviving mutations reveal dead code or missing tests; wroclove.rb 2026 workshop on setting up mutation testing in agentic development; argues 100% line coverage gives false confidence. — [RubyEvents talk](https://www.rubyevents.org/talks/pattern-parrots-and-the-semantic-knot-mutation-testing-in-the-agentic-world); [RubyEvents workshop](https://www.rubyevents.org/talks/workshop-setup-and-operation-of-mutation-testing-in-agentic-world); [mutant repo summary](https://gittrend.io/repo/mbj/mutant)
- Planet Argon / Robby Russell guide (updated Oct 2026): one AGENTS.md line—"Testing: Minitest + fixtures (no FactoryBot)"—saves re-litigating each session; point Claude at an existing test file; reuse existing fixtures (e.g., `orders(:pending)`); have it run `bin/rails test`; for production bugs ask for "a regression test first, then the fix"; RSpec: describe behavior not cases, then ask which edge cases were skipped; keep AGENTS.md under ~40 lines with path-scoped rule files. — [robbyonrails.com](https://robbyonrails.com/claude-code-curious-rails-developers/)
- 2026 CLAUDE.md guide: agents mix fixture syntax into factory_bot codebases or write `it` blocks in Minitest `test "..." do` style; declare test library, factory library, spec structure explicitly (secondary source). — [The Prompt Shelf](https://thepromptshelf.dev/blog/claude-md-ruby-on-rails-projects-2026/)
- CLAUDE.md is advisory and drifts in long sessions; use hooks for rules that must hold (secondary). — [AI for Anything guide](https://aiforanything.io/blog/claude-code-for-ruby-rails-development-guide-2026)

### Inferences

- Synthesis for a workflow plugin: (1) give the agent a runnable verification command and require it be run; (2) begin each slice with an outer request/integration test (Rails: request/integration test, not a system test by default) that fails for the right reason; (3) human or separate-agent review of tests before implementation; (4) forbid deleting/disabling/weakening tests; (5) use mutation testing or adversarial review as a check on test strength rather than line coverage.
- Searls' dual-loop finding and 37signals/GitLab level guidance agree on direction from different angles: unit-only TDD by agents misses integration; full browser tests are too costly; the request/integration level is the sweet spot for the outer loop in Rails.

### Gaps

- No RailsConf/RailsWorld 2024–2025 talk on AI and testing was retrieved (beyond Schirp's RubyConf 2026 / wroclove.rb material).
- Searls' prove_it/TLDR repos were not fetched directly; details come from his posts and search snippets.
- No primary Test Double (company) insights post on AI tests was retrieved.

## 4. Rails-specific anti-patterns AI agents produce

### Takeaway

Documented agent anti-patterns: mock-everything tests that test the mock, framework-convention mixing (fixtures vs factories, RSpec vs Minitest syntax), shoulda-matchers one-liners emitted where the gem isn't bundled, assumed service-object APIs (`.call`), padding code, test deletion, and big-bang changes. Long-standing Rails anti-patterns (sleep in Capybara, testing framework behavior, factory cascades, over-wide system tests) are well documented but evidence specifically tying them to agents is thin.

### Cited Findings

- Mock-everything / test-the-mock tests from Claude Code. — [thoughtbot sprint post](https://thoughtbot.com/blog/claude-code-skills-production-ready-code-in-a-two-week-sprint); also [Railsfever](https://railsfever.com/blog/tips-for-using-claude-with-an-existing-rails-app/) (search-snippet level)
- A Rails AI tool's `generate_test` emitted shoulda-matchers one-liners without the gem in the lockfile (NoMethodError) and hardcoded `.call` for services built on ActiveInteraction (`.run`/`.run!`); proposed fix: read the lockfile, base class, and sibling specs first. — [rails-ai-context issue #214](https://github.com/crisnahine/rails-ai-context/issues/214)
- Convention mixing (fixture syntax in factory_bot suites; Minitest structure in RSpec). — [The Prompt Shelf](https://thepromptshelf.dev/blog/claude-md-ruby-on-rails-projects-2026/); [robbyonrails.com](https://robbyonrails.com/claude-code-curious-rails-developers/)
- Test deletion to force green. — [Pragmatic Engineer / Beck](https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent)
- Coverage-chasing unit tests while integration breaks. — [Searls](https://justin.searls.co/posts/dual-loop-bdd-is-the-new-red-green-tdd/)
- Big-bang multi-file changes, padding code, skipped refactor. — [thoughtbot Robocalypse](https://thoughtbot.com/blog/prevent-the-robocalypse-with-tdd)
- Unused factories accumulating. — [thoughtbot sprint post](https://thoughtbot.com/blog/claude-code-skills-production-ready-code-in-a-two-week-sprint)
- `sleep` in system tests: Capybara matchers already retry; tune `default_max_wait_time`; use negative matchers like `has_no_content?` that also wait (general, not agent-specific). — [Josef Strzibny](https://nts.strzibny.name/avoid-sleep-rails-system-tests/)
- Re-testing framework behavior (e.g., that AR validations work) as anti-pattern vs thoughtbot's endorsement of shoulda one-liners. — [Mashup Garage](https://www.mashupgarage.com/playbook/rails/testing.html); contrast [thoughtbot Testing Rails](https://books.thoughtbot.com/assets/testing-rails.pdf)
- Over-wide/many system tests: slow and brittle; keep to smoke/happy path. — [DHH](https://world.hey.com/dhh/system-tests-have-failed-d90af718); [GitLab](https://docs.gitlab.com/development/testing_guide/testing_levels/)
- Factory cascades as dominant slowness. — [Evil Martians](https://evilmartians.com/chronicles/testprof-2-factory-therapy-for-your-ruby-tests-rspec-minitest)

### Inferences

- A Rails rule set for agents should: detect the test stack from Gemfile.lock and existing tests before writing; copy sibling test style; prefer existing fixtures/`build_stubbed`; never stub ActiveRecord on the model under test; never add `sleep` to Capybara; not write tests asserting Rails framework behavior unless the project's convention (e.g., shoulda) does so; default to request/integration tests over system tests; never delete or skip failing tests.

### Gaps

- No primary source found specifically documenting agents stubbing ActiveRecord (e.g., `allow(User).to receive(:find)`) as a frequent pattern, nor agents adding `sleep` to Capybara; these are plausible but unverified as agent-specific.
- No quantitative data on frequency of these anti-patterns in agent output.
