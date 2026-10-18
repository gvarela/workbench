# Test Quality Reference

Supporting material for the [test-quality](SKILL.md) rubric: a detector method with worked examples, heuristics for what no linter detects, and the shape of a review finding.

## Detector selections

This section gives a method that works in any ecosystem, then worked examples of the method for a few stacks. The examples are not a supported list: a stack that is absent from the table (Mocha, node:test, or any other) gets the same method, and skipping the detector step silently because the stack is unlisted hides defects the rubric exists to catch.

### Method

1. Find the project's own tools. Read the conventions source named at the top of [SKILL.md](SKILL.md) for the linters, test runner, and mutation or coverage tools already in use. Run only what is installed in the project and never install anything, because a tool the team has not adopted produces findings the team cannot act on.
2. Select rules by category, using explicit selections rather than the project's configured rule set, because many of the highest-signal rules are off by default and a configured lint run misses them. The core categories the examples cover include: assertion-free tests, always-true or no-op assertions, skipped or focused tests, duplicate tests or titles, stubs of the subject, mocking beyond the subject (any-instance stubs, message chains, stubbed mocks), test-data and setup cost (factory cascades, unneeded persistence), sleeps and wall-clock waits, over-broad exception assertions, and conditional logic in tests. Other rule families a stack's linter offers (for example leaked state, async misuse, oversized snapshots) are selected the same way. Report rules that are available but not enabled separately from violations. Read the lint configuration only for thresholds, and run size rules (such as `RSpec/MultipleExpectations` and `RSpec/ExampleLength`) at the project's thresholds or exclude them, because their defaults conflict with common team guidance.
3. Add the runtime checks the stack offers when the conventions source named at the top of [SKILL.md](SKILL.md) gives a runnable command for them: seeded random order, repeat runs on suspect tests only, a slow-test report, a factory or setup-cost profile, and per-test coverage. Run a mutation tool only when that source declares its command. Report any check not run, with the reason.
4. Where a category has no detector in the stack, report "no detector for <category> in this stack" and fall back to the rubric and the custom heuristics below, labelled judgment-only. Do not omit the category and do not guess at rule names.
5. Include what was found (tools, selections, rules available but not enabled, categories with no detector) in your report, so the testing profile or Testing Conventions can be updated from it and the next run starts from it.

### Worked examples

These rows show the method applied to six stacks; they are examples, not the only supported stacks. No source publishes false-positive rates for any of these rules; the noise notes are inferences.

| Stack | Static selection (default status) | Runtime and suite checks | Known noise |
| --- | --- | --- | --- |
| RSpec | rubocop-rspec `RSpec/SubjectStub`, `AnyInstance`, `MessageChain`, `StubbedMock`, `NoExpectationExample`, `VoidExpect`, `IdenticalEqualityAssertion`, `UnspecifiedException`, `Be`, `RepeatedExample`, `RepeatedExampleGroupBody`, `LetSetup`, `Focus`, `LeakyConstantDeclaration` (all enabled by default); rubocop-factory_bot `FactoryBot/ExcessiveCreateList`, `FactoryAssociationWithStrategy` (pending) | TestProf `FPROF=1` (total vs top-level factory counts expose cascades), `FDOC=1` (unnecessary persistence), `RD_PROF=1`; `--seed` plus `rspec --bisect`; `mutant --since <ref>` if configured | `MultipleExpectations`, `ExampleLength`, `MultipleMemoizedHelpers`, `NestedGroups` are noisy; `VerifiedDoubles` medium. `FDOC` reports "potential" offenders |
| Minitest | rubocop-minitest `Minitest/UselessAssertion`, `AssertWithExpectedArgument`, `UnreachableAssertion`, `TestMethodName`, `DuplicateTestRun` (pending), `NoAssertions` (disabled) | `FPROF` and `FDOC` also work under Minitest | No equivalent of `SubjectStub`; mocking needs the heuristics below |
| pytest | `ruff check --select PT,B011,B017 --output-format json`, excluding style-only `PT006`, `PT007`, `PT001`, `PT023` and `S101`. Only `PT010`, `PT014`, `PT020`, `PT025`, `PT026`, `PT031` are enabled by default | `--durations`; pytest-randomly seeded order; pytest-repeat or flakefinder on suspects only; coverage contexts for overlap; mutmut if configured | No assertion-free-test rule and no static sleep rule; the heuristics below fill in |
| Jest / Vitest | Recommended: `expect-expect`, `no-conditional-expect`, `no-standalone-expect`, `valid-expect`, `no-identical-title`, `no-disabled-tests`, `no-focused-tests`. Opt-in: `no-conditional-in-test`, `no-large-snapshots`, `require-to-throw-message`, `max-expects` | `--randomize --seed`; Stryker `--incremental` | `expect-expect` misfires on custom assertion helpers until `assertFunctionNames` is set |
| Playwright / Testing Library | Playwright recommended covers `no-wait-for-timeout`, `no-force-option`, `no-networkidle`, `prefer-web-first-assertions`; `expect-expect` and `no-unnecessary-assertions` are opt-in. Testing Library `await-async-*`; `prefer-explicit-assert` is opt-in | none listed | Bare `getBy*` asserts implicitly, which confuses `expect-expect` |
| Go | testifylint `useless-assert`, `expected-actual`, `require-error` (on by default) | gremlins on small modules | gremlins is still 0.x |

The selections come from the rubocop-rspec, rubocop-factory_bot, rubocop-minitest, Ruff, eslint-plugin-jest, @vitest/eslint-plugin, eslint-plugin-playwright, eslint-plugin-testing-library, and testifylint documentation.

## Custom heuristics

No linter in any ecosystem detects mocking volume or a mirrored oracle. Check these with grep or an AST helper, and present each hit as "review these" with line evidence, because each needs judgment to confirm and has no validated threshold. A hit that is a pattern rule is a prompt for the counterexample or planted defect that [SKILL.md](SKILL.md) Part 3 describes, and reaches a verdict only when that confirms it. A `sleep` or wall-clock hit reaches Rewrite only with a false failure, as SKILL.md Part 3 describes:

- stubs of the subject, or of ActiveRecord, outside RSpec;
- interaction-only assertions (only `have_received` or `toHaveBeenCalled`-style assertions in a test);
- assertions on source text or CSS class strings;
- `sleep` or wall-clock bounds;
- expected values that call production helpers;
- assertion-free tests in Python.

## Review finding

Each finding from a reviewer or auditor has these fields:

- **Verdict**: Remove, Rewrite, Consolidate, or Keep (rubric Part 3).
- **Rubric item**: the Part 1 item, or the Part 2 property and item.
- **Location**: file:line and a quoted excerpt.
- **Evidence type**: deterministic (the named detector, planted defect, diff, or a counterexample or false failure reproduced by an actual run) or judgment-only (SKILL.md Part 4).
- **Majority**: for a judgment-only Remove or Rewrite, the majority result (for example 3 of 3).
- **Proof**: for Remove or Rewrite, the detector, diff, planted defect, or counterexample (applied to the whole assertion) that shows the test cannot fail or does not protect its criterion, or, for a Rewrite only, the false failure: the input or condition under which correct code fails the test (SKILL.md Part 3). Proof also states the reason for the verdict, and that reason matches the verdict (SKILL.md Part 3); where a template gives Reason its own field, the reason goes there instead.
- **Suggested fix**: for a Rewrite, a relation built from test-owned inputs, or a specified literal with its derivation shown (SKILL.md Part 3).
- **Objective evidence**: for Remove or Consolidate, the evidence (no unique killed mutants, or no unique coverage, plus a passing run with the test removed in a disposable worktree), or "judgment-only, not actionable".
- **Criterion**: the criterion id, when the review runs inside a plan.

Each "review these" observation carries a location and exactly one evidence label, deterministic (naming the detector and rule) or judgment-only (naming the heuristic or rubric item). An observation without a label leaves the reader unable to weigh it.
