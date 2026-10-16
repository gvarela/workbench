# Deterministic Test-Quality Detectors for Python and JS/TS (with Go/Java notes)

<!-- markdownlint-disable MD024 -->

Sources fetched 2026-10-16. Rule tables come from each project's current README or docs page. Where a page was truncated or did not say something, the gap is recorded instead of filled in from memory.

## Python: lint rules (Ruff PT / flake8-pytest-style and assert rules)

### Takeaway

Ruff's `PT` ruleset ports flake8-pytest-style. The rules that matter for test quality are PT011/PT010 (broad or missing `raises` exceptions), PT012/PT031 (too much code inside `raises`/`warns`), PT017 (assert inside `except`), PT018 (composite assert), PT014 (duplicate parametrize cases), PT015 (always-false assert), and PT030/PT029 (broad or missing `warns`). Only a handful are on by default, so an auditor should run `ruff check --select PT` explicitly rather than rely on the project's config.

### Cited Findings

- Ruff PT rule list and status. All stable except PT029 (preview). PT004 and PT005 were removed in 0.8.0. The default-enabled PT rules are PT010, PT014, PT020, PT025, PT026, and PT031 — [Ruff rules](https://docs.astral.sh/ruff/rules/#flake8-pytest-style-pt)
- Quality-relevant PT rules, mapped to the problem each detects — [Ruff rules](https://docs.astral.sh/ruff/rules/#flake8-pytest-style-pt):
  - **Weak or missing exception assertions:** PT010 `pytest-raises-without-exception` (no expected exception set), PT011 `pytest-raises-too-broad`, PT029 `pytest-warns-without-warning` (preview), PT030 `pytest-warns-too-broad`, PT027 `pytest-unittest-raises-assertion` (use `pytest.raises`)
  - **Assertion scope too wide (the test passes for the wrong reason):** PT012 `pytest-raises-with-multiple-statements`, PT031 `pytest-warns-with-multiple-statements`
  - **Assertion placement smell:** PT017 `pytest-assert-in-except` ("use `pytest.raises()`"). If no exception is raised, the assert never runs, so the test is effectively assertion-free on the happy path.
  - **Assertion roulette / diagnosability:** PT018 `pytest-composite-assertion` (split `assert a and b`), PT009 `pytest-unittest-assertion` (prefer a plain assert so pytest can rewrite it)
  - **Always-failing or meaningless asserts:** PT015 `pytest-assert-always-false` (use `pytest.fail()`), PT016 `pytest-fail-without-message`
  - **Redundancy:** PT014 `pytest-duplicate-parametrize-test-cases` (fixable, default)
  - **Parametrize hygiene (style, not quality):** PT006 (wrong names type) and PT007 (wrong values type)
  - **Mock misuse:** PT008 `pytest-patch-with-lambda` (use `return_value=`)
  - **Fixture hygiene:** PT019 (valueless fixture used as a parameter; use `usefixtures`), PT021 (use `yield` instead of `addfinalizer`), PT022 (useless yield fixture), PT025/PT026 (useless `usefixtures`), PT028 (test parameter with a default argument)
- Assert rules outside PT — [Ruff rules](https://docs.astral.sh/ruff/rules/):
  - B017 `assert-raises-exception`: "Don't assert on a blind exception". Stable and in the default set.
  - B011 `assert-false`: raise `AssertionError()` instead.
  - S101 `assert`: flags any use of `assert`. This must be disabled for test files, or it fires on every pytest assertion.
- flake8-pytest-style is the original flake8 plugin that Ruff's PT codes mirror — [flake8-pytest-style](https://github.com/m-burst/flake8-pytest-style)

### Inferences

- How to run regardless of the project's selection: `ruff check --select PT,B011,B017 tests/`. Add `--output-format json` to get output an agent can parse. These are AST checks, so they are cheap and deterministic.
- Expected noise:
  - PT011 and PT012 fire often in older suites, and the fix is usually real (add `match=` or narrow the block).
  - PT006, PT007, PT001, and PT023 are style-only. Keep them out of quality findings.
  - S101 is pure noise in pytest test files.

### Gaps

- I did not confirm on a primary page:
  - PT011's default list of "too broad" exceptions (the `lint.flake8-pytest-style.raises-require-match-for` setting)
  - Whether PLR0124 (comparison with itself) and RUF018 (assignment in assert) exist under those names, because the fetched page was truncated before the PL and RUF sections
- I found no maintainer statement on the false-positive rate of the PT rules.

## Python: flakiness, order dependence, slow tests

### Takeaway

pytest-randomly finds order dependence by shuffling tests and reseeding random state. pytest-repeat and pytest-flakefinder find nondeterminism by running tests many times. `--durations` finds slow tests. None of these are static checks: each one costs extra test runs.

### Cited Findings

- **pytest-randomly** — [pytest-randomly](https://github.com/pytest-dev/pytest-randomly):
  - Shuffles order by module, then class, then function.
  - Prints a seed at the start of each run.
  - Resets `random.seed()` before each test's setup, call, and teardown, and also resets Faker, factory boy, Model Bakery, NumPy's legacy random state, and Polyfactory.
  - Options:
    - `--randomly-seed=<n>` or `=last` (`last` needs the cacheprovider)
    - `--randomly-dont-reorganize`
    - `--randomly-dont-reset-seed`
    - `-p no:randomly`
  - Works with pytest-xdist.
  - Cites research that "dependent tests do exist in practice." pytest-reverse is a cheaper alternative that finds fewer dependencies.
- **pytest-repeat** — [pytest-repeat](https://github.com/pytest-dev/pytest-repeat):
  - Options: `--count=N`, `@pytest.mark.repeat(n)`, and `--repeat-scope` (session, module, class, or function, which is the default).
  - Pairs with `-x`, as in `pytest --count=1000 -x`.
  - **Does not support `unittest.TestCase`:** those tests run once, with a warning.
- **pytest-flakefinder** — [pytest-flakefinder](https://github.com/dropbox/pytest-flakefinder):
  - Options: `--flake-finder` (50 runs by default), `--flake-runs=N`, and `--flake-max-minutes`.
  - Multiplies tests within one session.
  - The README recommends combining it with pytest-xdist to expose timing flakes.
  - Activity is unclear: the build badge still points at Travis.
- **Slow tests:** `pytest --durations=10 --durations-min=1.0` lists the slowest tests above 1.0s. Durations under 0.005s are hidden unless `-vv` is passed — [pytest usage docs](https://docs.pytest.org/en/stable/how-to/usage.html)

### Inferences

- Cheap triage order for an auditor:
  1. Run `--durations=20` on a normal run (almost free).
  2. Run the suite once more under pytest-randomly with a fixed seed, or with `-p randomly` if it is installed. Note that randomly is enabled automatically once installed.
  3. Run flakefinder or repeat only on suspect tests (`-k`), because repeating the whole suite multiplies runtime.

### Gaps

- I did not fetch the pytest-xdist docs; its relevance here is as a parallelism stressor and enabler.
- There is no static Python rule for `time.sleep` in tests in Ruff's PT set. A grep or a custom rule would be needed. Ruff has `ASYNC251` for blocking sleep in async code, but I did not verify that rule in this session.

## Python: test-smell detectors (PyNose, Pytest-Smell, TEMPY)

### Takeaway

Python test-smell detectors are research tools from 2021–2022: PyNose (unittest only, PyCharm plugin), Pytest-Smell (pip, pytest, CI exit code), and TEMPY (10 smells). I found no actively maintained, widely adopted 2024–2026 Python test-smell linter. For an auditor that runs whatever the project has installed, these are unlikely to be present.

### Cited Findings

- **PyNose** (ASE 2021):
  - A PyCharm plugin for unittest-style tests that introduces a "Suboptimal Assert" smell.
  - Its study found smells in 98% of projects and 84% of test suites.
  - Sources: [ASE 2021 listing](https://conf.researchr.org/details/ase-2021/ase-2021-papers/51/PyNose-A-Test-Smell-Detector-For-Python); [arXiv 2108.04639](https://arxiv.org/abs/2108.04639v1)
- **Pytest-Smell** (ISSTA 2022 tool demo):
  - pip-installable, targets pytest, and has a CI mode that returns an exit code based on whether smells were found.
  - Its PyPI page describes it as work in progress.
  - Sources: [ISSTA 2022 listing](https://conf.researchr.org/details/issta-2022/issta-2022-tool-demonstrations/3/Pytest-Smell-A-smell-detection-tool-for-Python-unit-tests); [PyPI pytest-smell](https://pypi.org/project/pytest-smell/1.0.5/)
- **TEMPY** (SBES 2022): detects 10 smell types. The authors report 100% accuracy against their oracle and 99% agreement from 10 developers — [TEMPY](https://sol.sbc.org.br/index.php/sbes/article/view/22147)
- **AromaLIA:** a language-independent approach covering Python and four other languages for 10 smells. The authors report 97% precision and 96% recall — [AromaLIA](https://sol.sbc.org.br/index.php/cbsoft_estendido/article/view/46016)

### Inferences

- The smells these tools target can be partly approximated by Ruff PT rules plus grep:
  - assertion roulette ≈ PT018
  - exception handling ≈ PT017
  - sleepy test ≈ grep for `time.sleep`
  - assertion-free test: no Ruff rule, so it needs AST or grep logic

### Gaps

- I did not verify maintenance status, the latest release, or the exact smell list for Pytest-Smell or TEMPY.
- I found no Python equivalent of eslint's `expect-expect` (assertion-free test) in Ruff or flake8-pytest-style.

## Python: mutation testing and coverage (mutmut, cosmic-ray, coverage contexts, diff-cover)

### Takeaway

mutmut is the most practical Python mutation tool. It has incremental reruns (only functions whose source changed are retested), per-mutant test selection, a coverage filter, and a type-check filter, but it needs `fork` (POSIX, or WSL on Windows). cosmic-ray uses a resumable SQLite session but has no change-based incremental mode; re-running `init` rewrites the session. coverage.py dynamic contexts give "who tests what" data. diff-cover limits coverage gating to changed lines.

### Cited Findings

- **mutmut** — [mutmut docs](https://mutmut.readthedocs.io/en/latest/):
  - Commands:
    - `mutmut run [pattern]` (wildcards supported)
    - `mutmut browse` (TUI; retest a function, module, or single mutant)
    - `mutmut apply <mutant>`
    - `mutmut export-cicd-stats`
    - `mutmut badge`
  - State lives in `mutants/` and runs can be resumed. Between runs it retests only mutants in functions whose source changed. It tracks dependency and config changes through git or file hashes, governed by `on_dependency_change`.
  - Requires `fork`, so Windows users need WSL. `process_isolation` can be `fork` (default) or `forkserver`.
  - Speed and noise levers:
    - per-mutant test selection
    - `max_stack_depth` (only shallow call stacks count as covering a function)
    - `mutate_only_covered_lines` (uses coverage.py)
    - parallel execution
    - `type_check_command` (mypy or pyrefly; Pyright and ty are not supported), which discards mutants that fail type checking
  - Config lives in `[tool.mutmut]`: `source_paths`, `also_copy`, `only_mutate`, `do_not_mutate`, `do_not_mutate_patterns`, `pytest_add_cli_args`, and `pytest_add_cli_args_test_selection`.
  - Inline skip: `# pragma: no mutate`.
  - **Version note:** The current docs list `source_paths`, not the older `paths_to_mutate`, and do not mention `mutmut results`. Older blog posts may be out of date.
- **cosmic-ray** — [cosmic-ray tutorial](https://cosmic-ray.readthedocs.io/en/latest/tutorials/intro/index.html):
  - Steps:
    1. `cosmic-ray new-config cfg.toml`
    2. `cosmic-ray init cfg.toml session.sqlite` (about 15–30s per kloc)
    3. `cosmic-ray baseline cfg.toml`
    4. `cosmic-ray exec cfg.toml session.sqlite`
    5. `cr-report session.sqlite --show-pending`
    6. `cr-html session.sqlite > report.html`
  - `exec` resumes pending mutations.
  - Re-`init` after any code, test, or config change, because `init` "completely rewrites the session file". In other words, there is no diff-based incremental mode.
  - Distributors: `local` (default, one mutation at a time) and `http` (`cr-http-workers`).
  - The repository README describes it as Python 3 mutation testing — [cosmic-ray GitHub](https://github.com/sixty-north/cosmic-ray)
- **coverage.py contexts** — [coverage contexts](https://coverage.readthedocs.io/en/latest/contexts.html):
  - Enable with `dynamic_context = "test_function"` under `[tool.coverage.run]`, or with pytest-cov's `--cov-context=test`.
  - Report with `coverage html --show-contexts` or filter with `--contexts=<regex,...>`.
  - The main use case is "what test ran this line?"
  - Data is recorded per context, so the data file grows. The `.coverage` file is SQLite and can be queried directly.
- **diff-cover** — [diff_cover](https://github.com/Bachmann1234/diff_cover):
  - Usage: `diff-cover coverage.xml --compare-branch=origin/main --fail-under=80 --format json:report.json`
  - Reads Cobertura, Clover, JaCoCo, and LCOV.
  - `diff-quality --violations=ruff.check` (also flake8, pylint, and others) applies lint gating to changed lines only.

### Inferences

- Redundancy detection: coverage contexts can show tests whose covered-line sets are subsets of other tests' sets. Those are candidate redundant tests. This is a heuristic and is not something coverage.py reports itself.
- Mutation testing is the only listed tool that directly measures "tests that execute code but assert nothing useful": surviving mutants on covered lines mean weak assertions. It is expensive, so an auditor should scope it to changed functions, for example with `mutmut run "module.func*"`.

### Gaps

- I did not fetch the docs for cosmic-ray's `cr-filter-git` and `cr-filter-pragma` filters.
- I found no published per-kloc runtime benchmarks for mutmut.

## JS/TS: eslint-plugin-jest and @vitest/eslint-plugin

### Takeaway

Both plugins ship nearly the same rules. The `recommended` configs already include expect-expect, no-conditional-expect, no-standalone-expect, valid-expect, no-identical-title, and no-mocks-import. The higher-signal quality rules are opt-in and off by default: no-conditional-in-test, max-expects, no-large-snapshots, prefer-strict-equal, prefer-spy-on, require-to-throw-message, and prefer-expect-assertions.

### Cited Findings

- **eslint-plugin-jest configs** — [eslint-plugin-jest](https://github.com/jest-community/eslint-plugin-jest):
  - `flat/recommended` (20 rules), `flat/style`, and `flat/all`.
  - `all` "may change in any release", so it is not suited to stable gating.
  - The rules should be scoped to test files with a `files` pattern.
- **eslint-plugin-jest `recommended` rules relevant to quality** — [eslint-plugin-jest](https://github.com/jest-community/eslint-plugin-jest):
  - expect-expect
  - no-conditional-expect
  - no-standalone-expect
  - valid-expect
  - valid-expect-in-promise
  - no-identical-title
  - no-mocks-import
  - no-disabled-tests
  - no-focused-tests
  - no-commented-out-tests
  - no-done-callback
  - no-interpolation-in-snapshots
  - valid-title
- **eslint-plugin-jest opt-in rules relevant to quality** — [eslint-plugin-jest](https://github.com/jest-community/eslint-plugin-jest):
  - no-conditional-in-test
  - max-expects
  - no-large-snapshots
  - prefer-snapshot-hint
  - prefer-strict-equal
  - prefer-spy-on
  - prefer-called-with
  - prefer-expect-assertions
  - prefer-ending-with-an-expect
  - require-to-throw-message
  - no-test-return-statement
  - prefer-each
  - no-duplicate-hooks
  - require-hook
  - no-restricted-jest-methods
  - no-restricted-matchers
  - no-confusing-set-timeout
  - valid-mock-module-path
- **Typed eslint-plugin-jest rules** (need `@typescript-eslint/parser`): no-error-equal, no-unnecessary-assertion, unbound-method, and valid-expect-with-promise — [eslint-plugin-jest](https://github.com/jest-community/eslint-plugin-jest)
- **expect-expect options and false positives** — [expect-expect](https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/expect-expect.md):
  - `assertFunctionNames` defaults to `["expect"]` and supports wildcards like `request.**.expect`.
  - `additionalTestBlockFunctions` defaults to `[]`.
  - A test that asserts through a custom helper such as `expectSaga(...)` is flagged until the helper is added to `assertFunctionNames`. This is the rule's main source of false positives.
- **no-large-snapshots** — [no-large-snapshots](https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/no-large-snapshots.md):
  - `maxSize` defaults to 50 lines. `inlineMaxSize` falls back to `maxSize`.
  - `allowedSnapshots` maps a path to names or regexes.
  - Rationale: "a stored snapshot is only as good as its review".
  - The rule lints `.snap` files, which Jest rewrites and strips `eslint-disable` comments from on update. That is why `allowedSnapshots` exists.
- **@vitest/eslint-plugin** — [eslint-plugin-vitest](https://github.com/vitest-dev/eslint-plugin-vitest):
  - Configs: `vitest.configs.recommended` (17 rules), `vitest.configs.all`, and the legacy `plugin:@vitest/legacy-recommended`.
  - The recommended set includes expect-expect, no-conditional-expect, no-standalone-expect, valid-expect, no-identical-title, no-mocks-import, no-commented-out-tests, no-disabled-tests, no-focused-tests, no-interpolation-in-snapshots, no-import-node-test, no-unneeded-async-expect-function, prefer-called-exactly-once-with, require-local-test-context-for-concurrent-snapshots, valid-describe-callback, valid-expect-in-promise, and valid-title.
  - Opt-in quality rules: no-conditional-in-test, no-conditional-tests, max-expects, no-large-snapshots, prefer-strict-equal, prefer-spy-on, prefer-vi-mocked, require-awaited-expect-poll, require-test-timeout, require-to-throw-message, and prefer-strict-boolean-matchers.
  - `no-done-callback` is deprecated.

### Inferences

- How to run regardless of the project's config:

  ```bash
  npx eslint --no-config-lookup -c <tmp config enabling chosen rules> 'src/**/*.test.ts' -f json
  ```

  Alternatively, use the project's own config with extra `--rule` flags, for example `--rule 'jest/no-conditional-in-test: error'`. Note that `--rule` cannot load a plugin that is not already configured.
- Noise ranking:
  - **Low noise:** valid-expect, no-standalone-expect, no-identical-title, no-conditional-expect
  - **Moderate noise:** expect-expect (custom helpers, Testing Library implicit `getBy*` assertions, and Playwright Page Object Model wrappers), no-conditional-in-test (legitimate helpers), and max-expects (default threshold not verified)
  - **Style-leaning:** prefer-strict-equal and prefer-spy-on

### Gaps

- I did not fetch per-rule pages for the defaults of `max-expects`, `no-conditional-in-test`, or `prefer-strict-equal`.
- I found no maintainer statement on which opt-in rules are noisy.

## JS/TS: eslint-plugin-testing-library and eslint-plugin-playwright

### Takeaway

eslint-plugin-playwright's `recommended` config already targets flaky constructs: no-wait-for-timeout, no-force-option, no-networkidle, no-wait-for-selector, no-element-handle, missing-playwright-await, and prefer-web-first-assertions. Its notable surprises are that it enables `no-conditional-in-test` and `max-expects` but *not* `expect-expect`. Testing Library's framework configs (dom, react, vue, angular, svelte, marko) target async-handling and waitFor misuse, which are flakiness sources.

### Cited Findings

- **eslint-plugin-playwright `recommended` rules relevant to quality** — [eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright):
  - **Flakiness:** no-wait-for-timeout, no-wait-for-selector, no-wait-for-navigation, no-networkidle, no-force-option, no-element-handle, no-eval, no-action-timeout, no-magic-timeouts, missing-playwright-await, prefer-web-first-assertions, no-nth-methods, no-raw-locators
  - **Logic in tests:** no-conditional-in-test, max-expects
  - **Useless assertions:** no-useless-not, no-unused-locators
  - **Assertion validity:** valid-expect, valid-expect-in-promise, prefer-strict-equal
  - **Hygiene:** no-slowed-test, require-annotation-reason, no-duplicate-hooks
- **eslint-plugin-playwright opt-in rules (not in recommended)** — [eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright):
  - expect-expect, no-conditional-expect, no-standalone-expect, no-identical-title
  - no-unnecessary-assertions (a Locator assertion that can never fail)
  - require-to-pass-timeout, no-skipped-test, no-focused-test, no-page-pause, prefer-ending-with-an-expect
- **eslint-plugin-playwright configs:** `playwright.configs['flat/recommended']` and legacy `plugin:playwright/recommended`. The README gives no error or warn severity per rule — [eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright)
- **Testing Library rules on in all six framework configs** — [eslint-plugin-testing-library](https://github.com/testing-library/eslint-plugin-testing-library):
  - await-async-events, await-async-queries, await-async-utils (unawaited promises are a flake source)
  - no-wait-for-side-effects, no-wait-for-snapshot, prefer-find-by
  - no-await-sync-queries
  - no-node-access and no-global-regexp-flag-in-query are on in all six as well. no-wait-for-multiple-assertions is also on in all six, though the README excerpt did not mark it with the "all six" label.
- **Testing Library rules on in some framework configs** — [eslint-plugin-testing-library](https://github.com/testing-library/eslint-plugin-testing-library):
  - no-container, no-debugging-utils, no-render-in-lifecycle, no-dom-import, no-promise-in-fire-event
  - no-unnecessary-act (marko and react only)
  - no-manual-cleanup (react, svelte, vue)
- **Testing Library opt-in rules relevant to quality:**
  - prefer-explicit-assert, which counters the expect-expect gap: a bare `getBy*` asserts only implicitly
  - prefer-implicit-assert
  - no-test-id-queries
  - consistent-data-testid
  - Use one framework config per file.
  - Source: [eslint-plugin-testing-library](https://github.com/testing-library/eslint-plugin-testing-library)

### Gaps

- The Testing Library README was truncated after `prefer-presence-queries`, so the rest of its rules (for example prefer-screen-queries, prefer-user-event, and render-result-naming-convention) are not verified here.

## JS/TS: runtime checks (Jest flags, snapshots, Stryker)

### Takeaway

- Jest's `--randomize --seed` finds order dependence.
- `--detectOpenHandles` finds leaked handles; it is slow and serial, and meant for debugging.
- `--ci` fails on *new* (unwritten) snapshots.
- Obsolete snapshots are reported, but sources conflict on whether they fail the run.
- Stryker's incremental mode makes mutation testing affordable on Jest and Vitest, because those runners report exact test locations.

### Cited Findings

- **Jest CLI** — [Jest CLI](https://jestjs.io/docs/cli):
  - `--randomize` shuffles tests within a file (jest-circus only) and prints the seed. The seed always shuffles suite order.
  - `--seed=<n>` reproduces a run.
  - `--detectOpenHandles` "implies `--runInBand`", uses `async_hooks`, and has "a significant performance penalty", so use it for debugging only.
  - `--logHeapUsage` should be paired with `--runInBand --expose-gc`.
  - `--ci` makes a new snapshot fail the run instead of being written.
  - `--json --outputFile=` gives machine-readable results.
  - `--findRelatedTests` and `--onlyChanged` scope runs to changed code.
  - `--testTimeout` defaults to 5000 ms.
- **Obsolete snapshots:** a Jest feature request for a failing flag implies obsolete snapshots do *not* fail by default — [Jest issue mirror](https://gitlab.com/oss-integration1/jest/-/issues/12564). A secondary blog claims they do fail — [qaskills blog](https://qaskills.sh/blog/jest-snapshot-obsolete-cleanup-ci). This is unresolved.
- **Stryker incremental** — [Stryker incremental](https://stryker-mutator.io/docs/stryker-js/incremental/):
  - Enable with `--incremental`, or `"incremental": true`. Results are written to `reports/stryker-incremental.json` (`--incrementalFile`).
  - Killed mutants are reused if their killing test is unchanged. Survivors are reused if no new or changed test covers them.
  - A dry run is always needed.
  - Change detection depends on the runner:
    - **Full** (exact test locations): Jest, Vitest, CucumberJS
    - **Per file:** Mocha, Tap
    - **Test names only:** Jasmine, Karma
    - **None:** the command runner
  - Changes to dependencies, environment variables, and snapshots are **not detected**.
  - `--force` together with `--mutate src/x.ts:5-7` reruns a specific scope.
  - Interrupted runs save partial results.

### Gaps

- I found no Jest flag that fails specifically on obsolete snapshots, and the Vitest snapshot obsolescence behavior is not verified.
- Jest's `--detectLeaks` is not on the CLI docs page.

## Java and Go equivalents (brief)

### Takeaway

- **Java:** smell detection is mostly academic. tsDetect has 19 smells for JUnit, and JNose covers JUnit 4 and integrates JaCoCo. PIT's incremental history is the practical mutation tool.
- **Go:** testifylint (enabled by default in golangci-lint configs that turn it on) catches weak or misused testify assertions, including `useless-assert`. gremlins provides mutation testing for small modules.

### Cited Findings

- **tsDetect smells** (Java/JUnit) — [testsmells.org](https://testsmells.org/pages/testsmells.html):
  - Assertion Roulette, Conditional Test Logic, Constructor Initialization, Default Test, Duplicate Assert
  - Eager Test, Empty Test, Exception Handling, General Fixture, Ignored Test
  - Lazy Test, Magic Number Test, Mystery Guest, Redundant Print, Redundant Assertion
  - Resource Optimism, Sensitive Equality, **Sleepy Test** (`Thread.sleep`), **Unknown Test** (no assertion)
- **JNose:**
  - JUnit 4 smell detection with JaCoCo coverage. Results come either per class or per method and line.
  - Published on Maven Central as `io.github.arieslab:jnose-core` 0.9.3.
  - Sources: [jnose-core](https://github.com/arieslab/jnose-core); [JNose docs](https://jnose.readthedocs.io/en/latest/)
- **PIT incremental** — [PIT incremental analysis](https://pitest.org/quickstart/incremental_analysis/):
  - Options: `withHistory` (stores history in `java.io.tmpdir`), or `historyInputLocation` and `historyOutputLocation` (in Maven, `historyInputFile` and `historyOutputFile`).
  - Reuses killed and surviving results under conditions similar to Stryker's.
  - Labeled "experimental". It considers only superclass and outer-class changes, so dependency changes can make reused results wrong.
- **testifylint** — [testifylint](https://github.com/Antonboom/testifylint):
  - Run with `testifylint ./...` or through golangci-lint. `--fix` works only with the standalone CLI.
  - Quality-relevant checkers:
    - `useless-assert` (compares a value with itself)
    - `expected-actual` (swapped arguments)
    - `float-compare`
    - `require-error`
    - `go-require` (`require` in goroutines)
    - `error-is-as`
    - `suite-broken-parallel`
  - All checkers are on by default except `suite-thelper`.
- **gremlins** — [gremlins](https://github.com/go-gremlins/gremlins):
  - Run with `gremlins unleash`.
  - Mutant statuses: KILLED, LIVED, NOT COVERED, TIMED OUT, NOT VIABLE, plus RUNNABLE in dry-run mode.
  - Best on "smallish" modules, since large ones can take hours.
  - Still 0.x, so flags may change.

### Gaps

- I did not research go-mutesting's status.
- I did not verify `go vet` test-related analyzers (for example `tests` and `copylocks`) or `thelper`/`paralleltest` in this session.
- PIT's `mutationThreshold` is not on the incremental page.

## Mapping rules to test-quality problems

### Takeaway

Each problem category has at least one deterministic detector in JS/TS. Python coverage is thinner: there is no built-in assertion-free-test rule and no static sleep rule. Mutation testing (mutmut, Stryker, PIT, gremlins) is the cross-language backstop for "covered but not really asserted".

### Cited Findings

- **Assertion-free tests:**
  - jest/vitest `expect-expect` — [jest](https://github.com/jest-community/eslint-plugin-jest); [vitest](https://github.com/vitest-dev/eslint-plugin-vitest)
  - playwright `expect-expect` (opt-in) — [playwright](https://github.com/playwright-community/eslint-plugin-playwright)
  - Testing Library `prefer-explicit-assert` — [testing-library](https://github.com/testing-library/eslint-plugin-testing-library)
  - tsDetect "Unknown Test" and "Empty Test" — [testsmells.org](https://testsmells.org/pages/testsmells.html)
  - Python: no lint rule found. Mutation survivors are the proxy — [mutmut](https://mutmut.readthedocs.io/en/latest/)
- **Weak assertions:**
  - Ruff PT011, PT010, PT030, PT018 and B017 — [Ruff](https://docs.astral.sh/ruff/rules/)
  - jest `prefer-strict-equal`, `require-to-throw-message`, and typed `no-unnecessary-assertion` — [jest](https://github.com/jest-community/eslint-plugin-jest)
  - playwright `no-unnecessary-assertions`, `no-useless-not` — [playwright](https://github.com/playwright-community/eslint-plugin-playwright)
  - testifylint `useless-assert` — [testifylint](https://github.com/Antonboom/testifylint)
- **Conditional logic in tests:**
  - jest/vitest `no-conditional-expect` (recommended) and `no-conditional-in-test` (opt-in) — [jest](https://github.com/jest-community/eslint-plugin-jest)
  - playwright `no-conditional-in-test` (recommended) — [playwright](https://github.com/playwright-community/eslint-plugin-playwright)
  - Ruff PT017 — [Ruff](https://docs.astral.sh/ruff/rules/)
  - tsDetect "Conditional Test Logic" and "Exception Handling" — [testsmells.org](https://testsmells.org/pages/testsmells.html)
- **Redundant or duplicate tests:**
  - jest/vitest/playwright `no-identical-title` — [jest](https://github.com/jest-community/eslint-plugin-jest)
  - Ruff PT014 — [Ruff](https://docs.astral.sh/ruff/rules/)
  - tsDetect "Duplicate Assert" and "Redundant Assertion" — [testsmells.org](https://testsmells.org/pages/testsmells.html)
  - coverage contexts for overlap analysis — [coverage contexts](https://coverage.readthedocs.io/en/latest/contexts.html)
- **Over-mocking:**
  - jest `no-mocks-import`, `no-restricted-jest-methods`, `prefer-spy-on`, and `valid-mock-module-path` — [jest](https://github.com/jest-community/eslint-plugin-jest)
  - vitest `no-restricted-vi-methods` — [vitest](https://github.com/vitest-dev/eslint-plugin-vitest)
  - Ruff PT008 — [Ruff](https://docs.astral.sh/ruff/rules/)
  - testifylint `mock-expect` — [testifylint](https://github.com/Antonboom/testifylint)
- **Flaky constructs:**
  - playwright `no-wait-for-timeout`, `no-force-option`, `no-networkidle`, `missing-playwright-await`, and `prefer-web-first-assertions` — [playwright](https://github.com/playwright-community/eslint-plugin-playwright)
  - Testing Library `await-async-*` and `no-wait-for-side-effects` — [testing-library](https://github.com/testing-library/eslint-plugin-testing-library)
  - jest `no-done-callback` and `valid-expect-in-promise` — [jest](https://github.com/jest-community/eslint-plugin-jest)
  - tsDetect "Sleepy Test" — [testsmells.org](https://testsmells.org/pages/testsmells.html)
  - Runtime: pytest-randomly, Jest `--randomize` — [pytest-randomly](https://github.com/pytest-dev/pytest-randomly); [Jest CLI](https://jestjs.io/docs/cli)
- **Snapshot abuse:**
  - jest/vitest `no-large-snapshots` (default 50 lines), `prefer-snapshot-hint`, and `no-interpolation-in-snapshots` — [no-large-snapshots](https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/no-large-snapshots.md)
  - Testing Library `no-wait-for-snapshot` — [testing-library](https://github.com/testing-library/eslint-plugin-testing-library)
- **Slow tests:**
  - `pytest --durations` — [pytest](https://docs.pytest.org/en/stable/how-to/usage.html)
  - playwright `no-slowed-test` — [playwright](https://github.com/playwright-community/eslint-plugin-playwright)

### Inferences

- An auditor that runs only the project's installed config will miss most quality rules, because they are opt-in. It should report "rules available but not enabled" separately from violations.
- Over-mocking has no direct deterministic detector in any ecosystem. The rules above catch mock *mechanics*, not mocking *volume* or mocking the unit under test. A mock-count-per-test heuristic would need custom AST work.

### Gaps

- I found no primary source quantifying false-positive rates for any of these rules.
- I found no maintainer-recommended "quality" preset beyond each plugin's `recommended` config.
