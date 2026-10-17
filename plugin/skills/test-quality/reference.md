# Test Quality Reference

Supporting material for the [test-quality](SKILL.md) rubric: detector selections per stack, heuristics for what no linter detects, and the shape of a review finding.

## Detector selections per stack

Run these explicit selections rather than the project's configured rule set, because many of the highest-signal rules are off by default and a configured lint run misses them. Report rules that are available but not enabled separately from violations. Run only tools installed in the project; read its lint configuration only for thresholds. Size rules (such as `RSpec/MultipleExpectations` and `RSpec/ExampleLength`) run at the project's thresholds or are excluded, because their defaults conflict with common team guidance.

No source publishes false-positive rates for any of these rules; the noise notes are inferences.

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

No linter in any ecosystem detects mocking volume or a mirrored oracle. Check these with grep or an AST helper, and present each hit as "review these" with line evidence, because each needs judgment to confirm and has no validated threshold:

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
- **Evidence type**: deterministic (the named detector, planted defect, or diff) or judgment-only.
- **Majority**: for a judgment-only Remove or Rewrite, the majority result (for example 3 of 3).
- **Objective evidence**: for Remove or Consolidate, the evidence (no unique killed mutants, or no unique coverage, plus a passing run with the test removed in a disposable worktree), or "judgment-only, not actionable".
- **Criterion**: the criterion id, when the review runs inside a plan.
