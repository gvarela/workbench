# Deterministic Test-Quality Detectors for Ruby / Rails (RSpec and Minitest), 2025–2026

<!-- markdownlint-disable MD024 -->

## rubocop-rspec: which cops detect test-quality problems

### Takeaway

rubocop-rspec (docs at v3.9) has a cluster of cops that map directly onto test smells: SubjectStub (stubbing the subject), AnyInstance / MessageChain / VerifiedDoubles / StubbedMock (over-mocking or unverified mocking), NoExpectationExample / VoidExpect / IdenticalEqualityAssertion / Be / UnspecifiedException / ExpectActual (weak or missing assertions), RepeatedExample* (redundancy), LetSetup / MultipleMemoizedHelpers / NestedGroups / InstanceVariable (mystery guests and obscure setup), and Focus / PendingWithoutReason (suite hygiene). The size cops (MultipleExpectations Max 1, ExampleLength Max 5) are enabled by default and are the main source of noise.

### Cited Findings

Docs version: rubocop-rspec 3.9. "Enabled" below is the default status shown on the docs page. [rubocop-rspec cops](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)

**Over-mocking / stubbing the subject**

- `RSpec/SubjectStub`: flags stubbing the object under test (e.g. `allow(article).to receive...` where `article` is the subject). Enabled, added 1.7. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/AnyInstance`: flags `allow_any_instance_of` / `expect_any_instance_of` (global stubbing of any instance). Enabled, added 1.4. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/VerifiedDoubles`: flags plain `double` where `instance_double` / `class_double` etc. should be used. Enabled, added 1.2.1; defaults `IgnoreNameless: true`, `IgnoreSymbolicNames: false`. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/VerifiedDoubleReference`: verified doubles referencing a class by string instead of constant. Enabled, added 2.10.0; autocorrect unsafe. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/StubbedMock`: flags message expectations that also configure a response (`expect(x).to receive(:y).and_return(z)`), i.e. mixing mock and stub. Enabled, added 1.44. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/MessageSpies`: enforces a style for message expectations; default `EnforcedStyle: have_received` (spies) vs `receive`. Enabled, added 1.9. This is a style cop, not a smell detector. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/MessageChain`: flags `receive_message_chain` (stubbing chains, a Law-of-Demeter / over-mocking signal). Enabled, added 1.7. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/ReceiveNever`: prefers `not_to receive` over `.to receive(...).never`. Enabled, added 1.28. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/ReturnFromStub`: style consistency for stub return values (`and_return` vs block). Enabled, 1.16. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)

**Weak / missing assertions (low-value tests)**

- `RSpec/NoExpectationExample`: examples containing no expectation. Enabled, added 2.13; `AllowedPatterns: ^expect_, ^assert_` so custom helper names count as expectations. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/VoidExpect`: `expect(...)` with no matcher (asserts nothing). Enabled, added 1.16. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/IdenticalEqualityAssertion`: same expression on both sides of `eq`/`eql` (tautology). Enabled, added 2.4. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/Be`: bare `be` with no argument (passes for any truthy value). Enabled, added 1.25. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/UnspecifiedException`: `raise_error` with no class, message, or regex (passes on any error, including NoMethodError typos). Enabled, added 1.30. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/ExpectActual`: literal value as the actual in `expect(...)` (argument order reversed or testing a constant). Enabled, added 1.7; routing specs excluded by default. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/ExpectInHook`: `expect` inside `before`/`after`/`around`. Enabled, added 1.16. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)

**Redundancy**

- `RSpec/RepeatedExample` (duplicate examples in one group; enabled, 1.10), `RSpec/RepeatedDescription` (duplicate descriptions; enabled, 1.9), `RSpec/RepeatedExampleGroupBody` (identical describe/context bodies; enabled, 1.38), `RSpec/RepeatedExampleGroupDescription` (duplicate group descriptions; enabled, 1.38). — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- GitLab caution for RepeatedExampleGroupBody: check coverage before deleting a duplicate group. — [GitLab best practices](https://docs.gitlab.com/development/testing_guide/best_practices/)

**Obscure setup / mystery guests**

- `RSpec/LetSetup`: `let!` never referenced, used only for side-effect setup (a classic mystery guest). Enabled, added 1.7. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/MultipleMemoizedHelpers`: too many `let`/`subject` in a group; `Max: 5`, `AllowSubject: true`. Enabled, added 1.43. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/NestedGroups`: nesting beyond `Max: 3`. Enabled, added 1.7. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/InstanceVariable`: instance variables in specs; `AssignmentOnly: false`. Enabled, added 1.0. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/LeakyConstantDeclaration` (constants/classes declared in groups leak across the suite; enabled, 1.35) and `RSpec/RemoveConst` (enabled, 2.26) — both are order-dependence / flakiness sources. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)

**Size (noisy)**

- `RSpec/MultipleExpectations`: `Max: 1`. Enabled, added 1.7. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/ExampleLength`: `Max: 5` lines, `CountAsOne: []`. Enabled, added 1.5. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- GitLab's guidance contradicts a strict one-expectation rule: "Use `:aggregate_failures` when there is more than one expectation in a test," and use `.and` chaining to combine side-effect checks; it also warns combining examples "sacrifices clarity and test independence for performance gains." — [GitLab best practices](https://docs.gitlab.com/development/testing_guide/best_practices/)

**Suite hygiene**

- `RSpec/Focus`: `focus: true`, `:focus`, `fit`/`fdescribe`. Enabled, added 1.5. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/PendingWithoutReason`: pending/skip without a reason. Enabled, added 2.16. `RSpec/Pending` (any pending/skip) is Disabled by default, added 1.25. There is no `RSpec/Skip` cop; `RSpec/SkipBlockInsideExample` (enabled, 2.19) exists. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)
- `RSpec/DescribedClass`, `RSpec/SubjectDeclaration` (enabled, 2.5), `RSpec/ExpectChange` (style; autocorrect unsafe) are style, not quality. — [docs](https://docs.rubocop.org/rubocop-rspec/latest/cops_rspec.html)

**Run**: `bundle exec rubocop --only RSpec/SubjectStub,RSpec/AnyInstance,... spec/` (standard RuboCop CLI; plugin must be loaded via the project's `.rubocop.yml`). JSON output: `--format json`. (CLI flags are general RuboCop behavior, not taken from the cop page.)

### Inferences

- High-signal, low-noise for an auditor: SubjectStub, AnyInstance, MessageChain, StubbedMock, NoExpectationExample, VoidExpect, IdenticalEqualityAssertion, UnspecifiedException, Be, RepeatedExample*, LetSetup, Focus, LeakyConstantDeclaration. These rarely fire on healthy code.
- Noisy: MultipleExpectations (Max 1), ExampleLength (Max 5), MultipleMemoizedHelpers, NestedGroups, MessageSpies; many projects raise or disable these (GitLab's aggregate_failures guidance implies tolerating multiple expectations). An auditor should read the project's `.rubocop.yml` / `.rubocop_todo.yml` and report against the project's own thresholds rather than defaults.
- VerifiedDoubles is medium-noise: it fires on every intentional duck-typed double.

### Gaps

- Exact current gem release of rubocop-rspec beyond "docs 3.9", and whether any cops listed are still "pending" for new installs, were not confirmed per cop.
- No measured false-positive rates for any cop were found.

## Sibling RuboCop plugins: rubocop-factory_bot, rubocop-capybara, rubocop-rspec_rails, rubocop-minitest

### Takeaway

rubocop-minitest (0.41) carries the Minitest analogues of the RSpec weak-assertion cops (UselessAssertion, NoAssertions, UnreachableAssertion, AssertWithExpectedArgument, LiteralAsActualArgument, DuplicateTestRun) but most are Pending or Disabled by default, so they only run if the project enables them. rubocop-factory_bot (2.28) catches over-persistence (ExcessiveCreateList, FactoryAssociationWithStrategy); rubocop-capybara (2.23) has little direct flakiness coverage on the visible page; rubocop-rspec_rails (2.32) is mostly style plus a couple of assertion-strength cops.

### Cited Findings

**rubocop-minitest 0.41** — [docs](https://docs.rubocop.org/rubocop-minitest/latest/cops_minitest.html)

- `Minitest/MultipleAssertions`: Enabled, `Max: 3`, added 0.10.
- `Minitest/NoAssertions`: tests with no assertions. **Disabled** by default, added 0.12.
- `Minitest/UselessAssertion`: assertions that always pass/fail (`assert true`). Pending, 0.26.
- `Minitest/AssertWithExpectedArgument`: `assert(3, list.length)` mistaken for `assert_equal` (always passes). Pending, 0.11.
- `Minitest/LiteralAsActualArgument`: literal in actual position. Pending, 0.10.
- `Minitest/UnreachableAssertion`: assertions after the raising call inside `assert_raises` never run. Pending, 0.14.
- `Minitest/DuplicateTestRun`: subclass inherits a parent's tests so they run twice (redundancy). Pending, 0.19.
- `Minitest/TestMethodName` (missing `test_` prefix → silently not run; Pending, 0.10), `Minitest/NonExecutableTestMethod` (Pending, 0.34), `Minitest/NoTestCases` (Disabled, 0.30).
- `Minitest/AssertionInLifecycleHook` (Pending, 0.10), `Minitest/SkipWithoutReason` (Pending, 0.24), `Minitest/Focus` (Pending, 0.35), `Minitest/ReturnInTestMethod` (Pending, 0.31).

**rubocop-factory_bot 2.28** — [docs](https://docs.rubocop.org/rubocop-factory_bot/latest/cops_factorybot.html)

- `FactoryBot/ExcessiveCreateList`: `create_list` above `MaxAmount: 10`. Pending, added 2.25. (GitLab enables it.) — also [GitLab](https://docs.gitlab.com/development/testing_guide/best_practices/)
- `FactoryBot/FactoryAssociationWithStrategy`: hard-coded strategy in associations, e.g. `profile { create(:profile) }` (forces persistence even under `build`, a cascade source). Pending, 2.23.
- `FactoryBot/CreateList` (Enabled, 1.25; style), `AssociationStyle` (Pending, 2.23; explicit mode has false positives), `RedundantFactoryOption` (Pending, 2.23), `ConsistentParenthesesStyle`, `SyntaxMethods`, `IdSequence` — style.
- GitLab also uses a custom `RSpec/FactoryBot/AvoidCreate` that flags unnecessary persistence in helper/presenter/view specs. — [GitLab](https://docs.gitlab.com/development/testing_guide/best_practices/)

**rubocop-capybara 2.23** — [docs](https://docs.rubocop.org/rubocop-capybara/latest/cops_capybara.html)

- Visible page documented `AmbiguousClick` (Disabled, 2.22), `ClickLinkOrButtonStyle` (Disabled, deprecated), `FindAllFirst` (Pending, 2.22; autocorrect unsafe), `RedundantWithinFind` (Pending, 2.20).

**rubocop-rspec_rails 2.32** — [docs](https://docs.rubocop.org/rubocop-rspec_rails/latest/cops_rspecrails.html)

- `RSpecRails/HaveHttpStatus` (eq/be on `response.status` instead of `have_http_status`; Enabled, 2.12), `RSpecRails/NegationBeValid` (Enabled, 2.23), `RSpecRails/MinitestAssertions` (Enabled, 2.17), `RSpecRails/TravelAround` (time travel in `around` hooks; Enabled, 2.19), `AvoidSetupHook`, `HttpStatus`, `InferredSpecType`, `HttpStatusNameConsistency` (2.32).

### Inferences

- Pending cops only run when the project sets `NewCops: enable` or enables them individually (standard RuboCop behavior; not stated on these pages). An auditor enabling `Minitest/UselessAssertion`, `Minitest/AssertWithExpectedArgument`, `Minitest/UnreachableAssertion`, and `Minitest/NoAssertions` ad hoc via `--only` would get high-signal findings in Minitest suites.
- Minitest/NoAssertions being Disabled by default suggests the maintainers consider it noisy (tests using custom assertion helpers).

### Gaps

- The rubocop-capybara page fetch was truncated/partial: `Capybara/CurrentPathExpectation`, `VisibilityMatcher`, `NegationMatcher`, `NegationMatcherAfterVisit`, `SpecificMatcher`, `MatchStyle` (the cops most relevant to Capybara waiting/flakiness) could not be confirmed from the page and are not described here.

## TestProf: wasteful setup, factory cascades, slow tests

### Takeaway

TestProf (Evil Martians) is the de facto tool for finding slow/wasteful setup: FactoryProf (FPROF) counts persisted factory calls and exposes cascades via total vs top-level counts and a flamegraph; FactoryDoctor (FDOC) flags examples that hit the DB unnecessarily; RSpecDissect (RD_PROF) attributes time to `before` and `let`; fixes are `let_it_be`/`before_all`, FactoryDefault, AnyFixture. All are env-var activated and emit reports, not pass/fail.

### Cited Findings

- TestProf components: Ruby profiler integration (ruby-prof, Stackprof, Vernier), Factory profiling incl. cascade detection, Event Profiler (ActiveSupport notifications), `before_all`/`let_it_be`, AnyFixture, FactoryDefault. — [test-prof.evilmartians.io](https://test-prof.evilmartians.io/)
- **FactoryProf**: `FPROF=1 rspec` or `FPROF=1 bundle exec rake test`; tracks only DB-persisted factories (`create`). Reports **total** vs **top-level** counts plus time; `FPROF_VARS=1` shows trait/override variations; `FPROF=json` writes `tmp/test_prof/test-prof.result.json`; `FPROF_THRESHOLD=30`; `FPROF=flamegraph` shows factory stacks — e.g. `[:comment, :answer, :question, :author, :author, :author]` creating 5 records from one `create(:comment)`. "Nate Heckler" mode prints share of test time spent in factories. — [factory_prof.md](https://raw.githubusercontent.com/test-prof/test-prof/master/docs/profilers/factory_prof.md)
- **FactoryDoctor**: flags tests that persist records unnecessarily (e.g. `create` just to test a validation; use `build_stubbed`). `FDOC=1 rspec`; `FDOC_STAMP="fdoc:consider"` auto-tags offenders; Minitest: `FDOC=1 ruby ...` (Minitest 6+ needs `Minitest.load :test_prof`). Config: `FDOC_EVENT` (default `sql.active_record`), `FDOC_THRESHOLD` (default 0.01s). Ignore with `:fd_ignore` tag (RSpec) or `fd_ignore` (Minitest). Docs explicitly say results are "potential" offenders with false positives and negatives; review before changing. — [factory_doctor.md](https://raw.githubusercontent.com/test-prof/test-prof/master/docs/profilers/factory_doctor.md)
- **RSpecDissect**: RSpec only; `RD_PROF=1 rspec`; reports total setup time, slowest groups split into before-hook / before-let / lazy-let time, and slowest `let` definitions with usage counts; `RD_PROF_TOP`, `RD_PROF_LET_TOP`, `RD_PROF_STAMP="slow"`. Purpose: find candidates for `before_all`/`let_it_be`. Excludes `subject`. — [rspec_dissect.md](https://raw.githubusercontent.com/test-prof/test-prof/master/docs/profilers/rspec_dissect.md)
- GitLab usage: `let_it_be` "is the most optimized option since it instantiates an object once"; objects are frozen by default (mutation raises `FrozenError`); use `let_it_be_with_reload`/`_with_refind` instead of `freeze: false`; not usable in migration/Rake/`:delete` specs. "A common cause of a large number of created factories is factory cascades"; a gap between total and top-level in FPROF output signals implicit parent creation; fix by passing parents explicitly or `create_default` (FactoryDefault, frozen). "Prefer `build_stubbed` unless the code under test persists the object"; "`after(:build)` callbacks can also call methods that save." — [GitLab best practices](https://docs.gitlab.com/development/testing_guide/best_practices/)

### Inferences

- For an auditor, FPROF and FDOC are the two outputs to parse: FDOC gives per-example "unnecessary persistence" candidates (medium noise per its own docs); FPROF total/top-level ratio > ~1 per factory indicates cascades (the ratio threshold is an inference, not a documented value).
- These require running the suite (cost = one full or partial suite run), unlike RuboCop.

### Gaps

- Per-page docs for EventProf, TagProf, StackProf integration, and `let_it_be` were not fetched (test-prof.evilmartians.io subpaths 404'd); env var names `EVENT_PROF`, `TAG_PROF` are not confirmed here.
- Current TestProf gem version not confirmed.

## factory_bot lint and shoulda-matchers trade-offs

### Takeaway

`FactoryBot.lint` is a cheap deterministic check that every factory (and with `traits: true`, every trait) builds a valid object; it should run as a pre-suite rake task, not in `before(:suite)`. shoulda-matchers one-liners are defended by thoughtbot as less brittle, but they test standard Rails validators/associations (framework configuration), not custom behavior; no strong primary critique was found.

### Cited Findings

- `FactoryBot.lint` "creates each factory and catches any exceptions"; options `traits: true`, `strategy: :build`, `verbose: true`; can lint a subset. Recommended in a rake task wrapped in a transaction with `ActiveRecord::Rollback`; "Running it in a `before(:suite)`, will negatively impact the performance of your tests when running single tests." — [factory_bot GETTING_STARTED](https://raw.githubusercontent.com/thoughtbot/factory_bot/main/GETTING_STARTED.md)
- thoughtbot argues shoulda-matchers hide the build/`valid?`/errors mechanics and that "those one-liners are less fragile." — [thoughtbot: What Shoulda Matchers Is Actually Doing For You](https://thoughtbot.com/blog/what-shoulda-matchers-is-actually-doing-for-you)
- Limitation noted in community discussion: matchers do not cover custom `validate` methods. — [GoRails forum](https://www.gorails.com/forum/how-to-test-validations-in-rails-discussion)
- shoulda-matchers 4.1.0 changed `validate_presence_of` to also check empty string; 4.1.1 patched backward-incompatible effects. — [newreleases.io 4.1.1](https://newreleases.io/project/gems/shoulda-matchers/release/4.1.1)

### Inferences

- An auditor can treat files consisting only of shoulda one-liners (`it { is_expected.to validate_presence_of(:x) }`) as low-value-but-cheap configuration tests: they catch removed validations but not business behavior; flagging them as "redundant" would be opinion, not a tool finding.

### Gaps

- No primary-source critique (e.g., from a named Rails team) of shoulda-matchers was found.

## Flakiness tools: random order, --bisect, rspec-retry, quarantine, Capybara waiting

### Takeaway

The deterministic flakiness workflow is: run in random order with a recorded seed, reproduce with `--seed`, minimize with `rspec --bisect`. GitLab is moving away from in-process rspec-retry toward process-level retries plus automated quarantine with tracking issues. Capybara flakiness is mostly controlled by using waiting `have_*`/`have_no_*` matchers rather than boolean predicates.

### Cited Findings

- `rspec --bisect` (with `--seed N` and the original options) runs the suite, confirms the failure is order-dependent, then bisects to print "The minimal reproduction command is: ..."; `--bisect=verbose` lists each command; default runner `:fork`, alternatively `c.bisect_runner = :shell`; ctrl-c reports the most minimal command found so far. — [rspec-core 3.13 bisect](https://rspec.info/features/3-13/rspec-core/command-line/bisect/)
- GitLab: new spec files run in random order; `scripts/rspec_check_order_dependence`; `rspec --bisect` for polluting specs; time-sensitive specs use `travel_to`/`:freeze_time`; reload records before comparing timestamps. — [GitLab best practices](https://docs.gitlab.com/development/testing_guide/best_practices/)
- GitLab defines a flaky test as one that "sometimes fails, but if you retry it enough times, it passes, eventually"; unfixable flaky tests get `:quarantine` metadata, skipped by default and run in allowed-to-fail jobs, each with an open issue. — [GitLab flaky tests (archive 15.8)](https://archives.docs.gitlab.com/15.8/ee/development/testing_guide/flaky_tests.html)
- GitLab issue to "Completely remove rspec-retry" notes the gem is archived and retries inside the same RSpec process; plan is to rely on new RSpec process retries and automated quarantine; feature-spec directories "are very flaky without rspec-retry." — [gitlab-org/gitlab#449030](https://gitlab.com/gitlab-org/gitlab/-/issues/449030)
- GitLab Capybara rules: use `have_no_*` negative matchers instead of `expect(page.has_link?).to be(false)`; assert a positive first before an absence check; don't use `wait_for_requests` in feature specs (enforced by custom cop `RSpec/AvoidWaitForRequests`); don't synchronize on button labels/disabled state; read model state only after a visible success indicator. — [GitLab best practices](https://docs.gitlab.com/development/testing_guide/best_practices/)
- DHH (May 17, 2024): "System tests remain as slow, brittle, and full of false negatives as they did a decade ago"; HEY has "some 300-odd system tests" and is cutting them "way down", keeping a few smoke tests and relying on model/controller tests and human testing. — [DHH, System tests have failed](https://world.hey.com/dhh/system-tests-have-failed-d90af718)

### Inferences

- A test-auditor should treat the presence of `rspec-retry` / `retry:` metadata as a smell indicator (masks flakiness) and look for quarantine tagging plus linked issues as the healthier pattern.
- Static detection of Capybara predicate misuse (`page.has_*?` inside `expect(...).to be(...)`) is feasible via grep even where the rubocop-capybara cops are unconfirmed.

### Gaps

- No independent (non-GitLab) critique of rspec-retry found. Knapsack / Knapsack Pro flaky-test tracking features were not researched within budget.

## Mutation testing: mutant

### Takeaway

mutant is the only mature Ruby mutation tester; it reports alive (surviving) mutants per subject, supports RSpec, Minitest, and Test::Unit, has an incremental `--since <git-ref>` mode that mutates only subjects whose lines changed, and is now explicitly positioned (README and 2026 workshop) as the check on AI-written tests. Commercial use is paid.

### Cited Findings

- Alive mutant = "a call to action": either the mutated code is a valid simplification, or a test is missing. `mutant session subject` lists alive/total per subject; `mutant session subject 'Foo::Bar#baz'` shows that subject's alive mutations; results stored in `.mutant/results/` (last 100). — [mbj/mutant README](https://github.com/mbj/mutant)
- Integrations: RSpec (`mutant-rspec`), Minitest, Test::Unit. Supported Ruby 3.2–4.0; Rails 7.2, 8.0, 8.1 verified in CI; Linux and macOS. — [mbj/mutant README](https://github.com/mbj/mutant)
- Licensing: free for open source (`--usage opensource`); commercial $30/month or $250/year per developer. — [mbj/mutant README](https://github.com/mbj/mutant)
- README framing: AI tools (Copilot, Claude, ChatGPT) generate code faster than it can be reviewed and can write tests that pass without being meaningful; mutant verifies them. — [mbj/mutant README](https://github.com/mbj/mutant)
- Incremental: `mutant --since master 'ProjectNamespace*'` selects subjects whose line range overlaps a `git diff <ref>` hunk; caveat: indirect effects (constant changes, A changing B's behavior) are missed; recommends nightly full runs; common refs `HEAD~1`, `master`. — [docs/incremental.md](https://raw.githubusercontent.com/mbj/mutant/main/docs/incremental.md)
- Markus Schirp workshop "Setup and operation of mutation testing in agentic world", wroclove.rb 2026, Wrocław, April 17, 2026: "AI writes your code. AI writes your tests. But who tests the tests?" — [RubyEvents](https://www.rubyevents.org/talks/setup-and-operation-of-mutation-testing-in-agentic-world)

### Inferences

- For an auditor, `mutant run --since <base> --usage <opensource|commercial> '<Namespace>*'` on the changed subjects is the most direct deterministic check that new tests actually constrain behavior; noise is low (each alive mutant is concrete) but cost is high and license-gated, so only run if the project already has mutant configured (`.mutant.yml` / `config/mutant.yml`).

### Gaps

- Exact current mutant gem version and CLI subcommand syntax (`mutant run` vs bare `mutant`) not confirmed from fetched pages. No 2025 Schirp talk recording found; podcast/Paris.rb appearances seen only via LinkedIn reposts, undated.

## Coverage (SimpleCov) and its limits

### Takeaway

SimpleCov supports branch coverage and per-file thresholds, and (per its current README) eval coverage for views and opt-in test tracking that distinguishes lines executed only at load time — but coverage still says a line ran, not that it was asserted on.

### Cited Findings

- Branch coverage: `enable_coverage :branch` plus `coverage :branch, minimum: 80, ignore: :implicit_else`. Thresholds: `coverage :line do minimum 90; maximum_drop 1; maximum_missed 5, per: :file end`; legacy option spellings still work with warnings. Views via `cover_views` (ERB, Haml, Slim). Coverage "normally tells you whether a line ran, not what ran it"; lines run only at load/setup time are tinted separately with `track_tests`, which "has a real cost." — [simplecov README](https://raw.githubusercontent.com/simplecov-ruby/simplecov/main/README.md)
- Schirp/podcast point: 100% line coverage can still give a false sense of confidence. — [RubyEvents/LinkedIn summary via search; primary not fetched](https://www.rubyevents.org/talks/workshop-setup-and-operation-of-mutation-testing-in-agentic-world)

### Inferences

- An auditor should use coverage only to find untested code (absence), never as evidence of test quality; mutation testing is the complement.
- The README's new `coverage :line do ... end` DSL and `track_tests` look recent; projects on older SimpleCov will use `minimum_coverage` / `refuse_coverage_drop` (not confirmed from fetched page).

### Gaps

- SimpleCov version introducing the new DSL / `track_tests` not confirmed.

## What respected Rails teams enable or disable

### Takeaway

GitLab is the best-documented: it leans heavily on TestProf (`let_it_be`, FactoryDefault, FPROF/FDOC), bans `any_instance` stubbing, prefers `aggregate_failures` over one-expectation-per-example, and adds custom cops (AvoidWaitForRequests, AvoidConditionalStatements, OverwritingSetup, AvoidCreate, BeforeAllRoleAssignment) plus ExcessiveCreateList. thoughtbot authored the Mystery Guest critique and factory_bot/shoulda-matchers. 37signals (DHH) de-emphasizes system tests; their Minitest/fixtures stance was not confirmed from a primary source.

### Cited Findings

- GitLab: "Avoid using `expect_any_instance_of` or `allow_any_instance_of`"; "Avoid referencing `subject` in examples" (use named subject); prefer `let` over `let!`; don't define a `let` used by only one test; "Use `:aggregate_failures` when there is more than one expectation"; custom cops `RSpec/AvoidConditionalStatements`, `RSpec/OverwritingSetup`, `RSpec/AvoidWaitForRequests` (no inline disables or todo exclusions), `RSpec/FactoryBot/AvoidCreate`, `RSpec/BeforeAllRoleAssignment`, and `FactoryBot/ExcessiveCreateList`. — [GitLab best practices](https://docs.gitlab.com/development/testing_guide/best_practices/)
- thoughtbot (Dan Croak, 2009, updated 2022): Mystery Guest = "The test reader is not able to see the cause and effect between fixture and verification logic"; culprits include Rails fixtures, fixture files, instance variables at the top of long/nested contexts, and unrevealing variable names; fix with factories overriding only relevant attributes, flat files, intention-revealing names. — [thoughtbot: Mystery Guest](https://thoughtbot.com/blog/mystery-guest)
- DHH/37signals: cutting HEY's ~300 system tests; model and controller tests preferred for business logic. — [DHH](https://world.hey.com/dhh/system-tests-have-failed-d90af718)

### Inferences

- Mystery-guest detection maps to RSpec/LetSetup, MultipleMemoizedHelpers, NestedGroups, InstanceVariable (rubocop-rspec); there is no deterministic detector for "fixture referenced by name whose relevant attributes live in YAML" — that remains a judgment call for the auditor.
- Over-mocking / subject-stub detection is fully covered statically in RSpec (SubjectStub, AnyInstance, MessageChain, StubbedMock) but has no rubocop-minitest equivalent; Minitest/Mocha suites need grep-based heuristics.

### Gaps

- No primary 37signals statement on fixtures vs factories or mocking was found (only an unofficial, Claude-generated style gist and third-party skill files, not cited as facts).
- Evil Martians' own blog guidance (evilmartians.com/chronicles) on which RuboCop cops to enable was not fetched.
- GitLab's actual `.rubocop.yml` values for MultipleExpectations / ExampleLength were not checked.
