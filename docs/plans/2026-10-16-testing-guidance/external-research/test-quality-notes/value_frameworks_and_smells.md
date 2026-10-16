# Frameworks and Evidence for Judging the Value and Quality of Written Tests (incl. LLM/agent-generated tests)

<!-- markdownlint-disable MD024 -->

## Kent Beck's Test Desiderata: definitions, trade-offs, and how they are applied in review

### Takeaway

Beck defines 12 properties a test may have. No test maximizes all of them, and the review judgment is about which trade-offs are acceptable. The properties that matter most for judging whether a test is worth keeping are Behavioral, Structure-insensitive, Specific, Predictive and Readable. Structure-insensitive pairs naturally with "don't test implementation details", and Predictive pairs with "would this catch a real bug".

### Cited Findings

- Verbatim definitions from the canonical site — [testdesiderata.com](https://testdesiderata.com/):
  - **Isolated**: "tests should return the same results regardless of the order in which they are run."
  - **Composable**: "I should be able to test different dimensions of variability separately and combine the results."
  - **Deterministic**: "if nothing changes, the test result shouldn't change."
  - **Fast**: "tests should run quickly."
  - **Writable**: "tests should be cheap to write relative to the cost of the code being tested."
  - **Readable**: "tests should be comprehensible for reader, invoking the motivation for writing this particular test."
  - **Behavioral**: "tests should be sensitive to changes in the behavior of the code under test. If the behavior changes, the test result should change."
  - **Structure-insensitive**: "tests should not change their result if the structure of the code changes."
  - **Automated**: "tests should run without human intervention."
  - **Specific**: "if a test fails, the cause of the failure should be obvious."
  - **Predictive**: "if the tests all pass, then the code under test should be suitable for production."
  - **Inspiring**: "passing the tests should inspire confidence."
- Trade-offs as Beck states them: some properties support each other ("Automating tests makes them faster to run"), some conflict ("Making tests more predictive of production behavior makes them slower"), and some apparent conflicts go away once you use composability, which can make tests both faster and more predictive — [testdesiderata.com](https://testdesiderata.com/)
- In a reply on a Substack post, Beck says the desiderata are not tied to TDD. He also says fast and predictive pull against each other in a deployment-build suite as well. The post's author argues for choosing the desired qualities before choosing a test type ("I need a fast test that is outside-in and predictive of production behavior") — [Crafting Tech Teams Substack](https://craftingtechteams.substack.com/p/embrace-test-composability-a-dive) (secondary; Beck's reply was seen via a search snippet)
- How practitioners apply it: several public agent skills now package "Test Desiderata review" as a code-review rubric. Examples are [skills.sh goblindegook/test-desiderata](https://skills.sh/goblindegook/skills/test-desiderata), [smithery eferro/test-desiderata](https://smithery.ai/skills/eferro/test-desiderata) and [skillsmp niart120 test-desiderata-review](https://skillsmp.com/creators/niart120/swbt-daemon/agents-skills-test-desiderata-review). One of them notes that structure-insensitive and predictive tend to collide in bridge or integration tests (search-snippet source; the skill contents were not inspected).

### Inferences

- For a rubric, the properties map onto audit questions. Behavioral: would a plausible bug make this test fail? Structure-insensitive: would a behavior-preserving refactor make it fail? Specific: does a failure point to one cause? Readable: is the motivation evident? Deterministic and Isolated: are there time, sleep, order or shared-state dependencies? Writable: is setup cost proportionate to the code under test?
- Beck's framing implies that a test which trades away some properties is not automatically a defect. The rubric should flag only trade-offs that buy nothing, such as a slow test that is no more predictive than a fast one.

### Gaps

- I did not retrieve Beck's original Medium or Substack essays or the per-property videos directly, so trade-off guidance beyond the testdesiderata.com summary comes from secondary sources.
- I found no empirical study that measures inter-rater reliability of reviewers who apply the desiderata.

## Test smell catalogs and evidence on how harmful smells actually are (incl. in LLM-generated tests)

### Takeaway

tsDetect/testsmells.org gives a concrete, detectable catalog of 19 to 21 smells. The empirical record is mixed: earlier work links smells to maintenance cost, but developers often do not perceive smells or rate them as severe, and severity differs a lot from smell to smell. LLM-generated tests carry many smells, especially Magic Number Test, Assertion Roulette and Lazy Test. Agent-authored tests overwhelmingly lack strong oracles.

### Cited Findings

- testsmells.org (tsDetect) catalog definitions — [testsmells.org](https://testsmells.org/pages/testsmells.html):
  - Assertion Roulette: "a test method has multiple non-documented assertions."
  - Conditional Test Logic: "Test methods need to be simple and execute all statements in the production method."
  - Constructor Initialization: the test suite uses a constructor instead of setup.
  - Default Test: an auto-generated default test class.
  - Duplicate Assert: "tests for the same condition multiple times within the same test method."
  - Eager Test: "a test method invokes several methods of the production object."
  - Empty Test: "a test method does not contain executable statements."
  - Exception Handling: the test throws or catches exceptions itself instead of using the framework's exception handling.
  - General Fixture: "a test case fixture is too general and the test methods only access part of it."
  - Ignored Test: an @Ignore'd test method or class.
  - Lazy Test: "multiple test methods invoke the same method of the production object."
  - Magic Number Test: asserts contain numeric literals.
  - Mystery Guest: "a test method utilizes external resources (e.g. files, database, etc.)."
  - Redundant Print: print statements in tests.
  - Redundant Assertion: "assertion statements that are either always true or always false."
  - Resource Optimism: the test assumes an external resource exists.
  - Sensitive Equality: "the toString method is used within a test method."
  - Sleepy Test: the test explicitly sleeps the thread.
  - Unknown Test: the test has no assertion, so it passes as long as nothing throws.
- tsDetect detects 21 smell types as used in the LLM smell study. The two smells beyond the website list are Long Test and Useless Test (named in that study) — [arXiv 2410.10628](https://arxiv.org/abs/2410.10628)
- **Smells in LLM-generated tests**: Ouédraogo et al. analyzed 20,500 LLM-generated test suites from GPT-3.5, GPT-4, Mistral 7B and Mixtral 8x7B under 5 prompting techniques, and compared them with 780,144 human-written suites from 34,637 projects. They found that LLMs often produce Magic Number Test and Assertion Roulette, and that some smells co-occur, such as Long Test with Useless Test. Prompting technique, model size and context length affect prevalence. Overlap with human tests suggests training-data leakage. EvoSuite has its own generator-specific smells — [arXiv 2410.10628](https://arxiv.org/abs/2410.10628) (summary from search result; abstract page listed)
- Siddiq et al. (EASE 2024) found Magic Number Test and Lazy Test to be the most common smells across LLM approaches, with Assertion Roulette also common — [arXiv 2305.00418](https://arxiv.org/abs/2305.00418) (search-snippet summary)
- A 2025 survey reports that guided Tree-of-Thoughts prompting cut Assertion Roulette from 54.77% to 20.94% — [arXiv 2511.21382](https://arxiv.org/html/2511.21382v1) (search-snippet summary)
- **Agent-authored tests and oracles**: Banik, Chowdhury and Shamim, "All Smoke, No Alarm: Oracle Signals in Agent-Authored Test Code". They studied 86,156 test-file patches from 33,596 agent PRs (Codex, Copilot, Devin, Cursor, Claude Code) in 2,807 repositories, using an 8-category syntactic oracle taxonomy built from a qualitative analysis of 384 patches. **80.2% of test patches contain weak or no explicit oracle signals.** Once controls are applied, strong oracles raise the odds of merge (OR = 1.28, p < 0.001). The authors argue that counting test files overstates verification strength — [arXiv 2606.18168](https://arxiv.org/abs/2606.18168)
- **Harmfulness and perception evidence**:
  - Tufano et al. (2016, 19 participants) found that developers generally do not recognize potentially harmful test smells — [summary via arXiv 2107.13902](https://arxiv.org/pdf/2107.13902) (secondary)
  - Bavota et al. (2015, "Are test smells really harmful?") report a significantly negative impact on maintenance tasks — summarized in [arXiv 2107.13902](https://arxiv.org/pdf/2107.13902) (secondary; primary not fetched)
  - In a severity study with Better Code Hub, 31 developers commented on 301 smell instances across 47 projects. They rated Empty Test, Ignored Test and Conditional Test Logic as having the greatest maintenance impact, and Empty Test, Sleepy Test and Mystery Guest as the top refactoring priorities — [arXiv 2107.13902](https://arxiv.org/pdf/2107.13902) (search-snippet summary; authorship and venue not confirmed)
  - Practitioner awareness survey — [arXiv 2003.05613](https://arxiv.org/pdf/2003.05613); Microsoft Research "An empirical investigation into the nature of test smells" — [MSR](https://microsoft.com/en-us/research/?p=771931) (titles only; contents not fetched)

### Inferences

- For an auditor, the smells with the clearest value signal are those that bear on whether a test can fail. Unknown Test (no assertion), Redundant Assertion (tautology), Empty Test, Ignored Test and Exception Handling that swallows failures all map directly to a test that cannot catch bugs. The 80% weak-oracle finding makes this the top priority for agent-written tests.
- Purely stylistic smells deserve low severity or should be suppressed. Magic Number Test and Lazy Test are the most common in LLM output but have weak harm evidence, and Lazy Test conflicts with Google's "test behaviors, not methods". Flagging them heavily would produce noise.
- Flakiness smells (Sleepy Test, Mystery Guest, Resource Optimism) map to Beck's Deterministic and Isolated, and developers rated them as refactoring priorities.

### Gaps

- xunitpatterns.com refused the connection, so Meszaros's catalog was not verified in this session. From model knowledge (unverified), it groups smells into code smells (Obscure Test, Conditional Test Logic, Hard-to-Test Code, Test Code Duplication, Test Logic in Production), behavior smells (Assertion Roulette, Erratic Test, Fragile Test, Frequent Debugging, Manual Intervention, Slow Tests) and project smells (Buggy Tests, Developers Not Writing Tests, High Test Maintenance Cost, Production Bugs). Confirm these at <http://xunitpatterns.com/Test%20Smells.html> before citing them.
- I did not fetch the primary text of Bavota 2015 or of the studies that question harmfulness, so effect sizes are unconfirmed.
- The full taxonomy of the 8 oracle categories in arXiv 2606.18168 was not extracted (the PDF text was compressed).

## Over-mocking: definitions, detection heuristics, empirical evidence, schools of thought

### Takeaway

Google's guidance orders the choices as real implementation, then fake, then stub or mock. It treats heavy interaction verification as producing "change-detector tests". Empirical work shows developers mock hard-to-test dependencies but avoid mocking domain classes. Coding agents add mocks more often than humans: 36% of agent commits versus 26% of non-agent commits (MSR 2026).

### Cited Findings

- Google SWE book, chapter 13 — [abseil.io ch13](https://abseil.io/resources/swe-book/html/ch13.html):
  - "our first choice for tests is to use the real implementations of the system under test's dependencies". "A real implementation is preferred if it is fast, deterministic, and has simple dependencies."
  - Prefer fakes when the real implementation is infeasible.
  - "overuse of stubbing can result in major losses in productivity". Stubbing makes tests unclear, brittle (it "leaks implementation details of your code into your test") and less effective, because nothing ensures a stub matches the real contract.
  - "Interaction testing should be avoided when possible". It can only confirm that calls happened. Use it when no real implementation or fake is available, or when the count or order of calls matters.
  - Verify only state-changing calls. Verifying non-state-changing calls is "usually redundant". Avoid "overspecifying which functions and arguments are validated."
  - "Some people at Google jokingly refer to tests that overuse interaction testing as change-detector tests." These fail on any production change even when behavior is unchanged.
- Spadini, Aniche, Bruntink and Bacchelli, "To Mock or Not To Mock?" (MSR 2017). Their MockExtractor tool covered 3 OSS projects and 1 industrial system, with more than 2,000 test dependencies manually analyzed and more than 100 professionals surveyed. Developers mock dependencies that make testing hard and avoid mocking classes that hold domain concepts or business rules. They report that keeping mocks consistent with real classes is hard and that mocking increases coupling between test and production code — [TU Delft SERG](https://serg.ewi.tudelft.nl/publications/to-mock-or-not-to-mock-an-empirical-study-on-mocking-practices); EMSE extension on mock evolution — [Springer](https://link.springer.com/article/10.1007/s10664-018-9663-0) (abstract-level)
- Hora and Robbes, "Are Coding Agents Generating Over-Mocked Tests? An Empirical Study" (MSR 2026, arXiv 2602.00409) — [arXiv](https://arxiv.org/abs/2602.00409):
  - Dataset: more than 1.2M commits in 2,168 repositories (TS/JS/Python, 2025), including 48,563 coding-agent commits, 169,361 commits that modify tests and 44,900 commits that add mocks.
  - Agent tests: 60% of repositories with agent activity have agent test activity. 23% of agent commits touch tests, versus 13% of non-agent commits.
  - Mocks: 68% of repositories with agent test activity have agent mock activity. **36% of agent commits add mocks to tests, versus 26% of non-agent commits.**
  - The authors argue that mocked tests are easier to generate but less effective at validating real interactions, and recommend putting mocking guidance in agent configuration files.
  - Secondary write-ups also claim that agents concentrate on a single test-double type and that their suites are more brittle — [Daniel Vaughan blog](https://codex.danielvaughan.com/2026/06/30/over-mocked-tests-coding-agents-codex-cli-agents-md-testing-guidance-mock-control/) (secondary, not verified against the paper)
- Implementation-detail testing: Kent C. Dodds defines implementation details as "things which users of your code will not typically use, see, or even know about". Testing them yields false negatives on refactor and false positives when real behavior breaks. Tests should act as the two users do (end user and developer user) — [kentcdodds.com](https://kentcdodds.com/blog/testing-implementation-details)

### Inferences

- Detection heuristics for an auditor, synthesized from the above:
  1. The system under test itself is mocked or patched.
  2. Value objects or domain classes are mocked (Spadini: developers avoid this).
  3. Mocks are verified for non-state-changing or query calls (Google).
  4. Exact argument or call-order verification where order is not part of the contract (Google: overspecification).
  5. Mocks and verifies outnumber state assertions, or the only assertions are `verify`/`toHaveBeenCalled` (Google: interaction tests "only validate that certain functions are called").
  6. A cheap, deterministic real implementation or fake exists but was not used.
  7. Stubs whose behavior has no tie to the real contract.
- Given the agent-versus-human mock gap, mocking is a priority audit dimension for agent-written tests.

### Gaps

- Fowler's "Mocks Aren't Stubs" (classicist versus mockist), the London versus Detroit school positions, and "don't mock what you don't own" (Freeman and Pryce, GOOS) were not fetched in this session. Cite <https://martinfowler.com/articles/mocksArentStubs.html> after verifying.
- I found no validated numeric threshold (such as a mocks-per-assertion ratio) for over-mocking in primary sources. One practitioner post argues over-mocking is a governance problem, not a review smell — [dev.to](https://dev.to/tmfrisinger/over-mocking-is-a-governance-problem-not-a-review-smell-4d38) (not read).

## Low-value tests: what makes a test worth keeping or deleting

### Takeaway

The Google SWE book gives the clearest criteria. A test should change only when requirements change ("unchanging tests"). It should test public APIs, state over interactions, and behaviors rather than methods, and it should be DAMP, logic-free and clear on failure. Tests that break on harmless refactors (brittle or change-detector tests) or that cannot fail on real bugs (false positives or weak oracles) are low-value.

### Cited Findings

- Google SWE book, chapter 12 — [abseil.io ch12](https://abseil.io/resources/swe-book/html/ch12.html):
  - Unchanging tests: "after it's written, it never needs to change unless the requirements of the system under test change". "Only breaking changes in a system's behavior should require going back to change its tests."
  - A brittle test "fails in the face of an unrelated change to production code that does not introduce any real bugs."
  - Public APIs: "write tests that invoke the system being tested in the same way its users would."
  - State over interactions: "interaction tests check how a system arrived at its result, whereas usually you should care only what the result is."
  - "rather than writing a test for each method, write a test for each behavior."
  - DAMP: "A little bit of duplication is OK in tests so long as that duplication makes the test simpler and clearer."
  - Failure messages "should clearly express the desired outcome, the actual outcome, and any relevant parameters."
  - "stick to straight-line code over clever logic". "if you feel like you need to write a test to verify your test, something has gone wrong!"
- Change-detector tests: the Google Testing Blog post "Testing on the Toilet: Change-Detector Tests Considered Harmful" (Alex Eagle, 27 January 2015) won the first TotT award — [Google Testing Blog](https://testing.googleblog.com/2015/01/testing-on-toilet-change-detector-tests.html), [TotT awards](https://testing.googleblog.com/2015/02/the-first-annual-testing-on-toilet.html). The post body did not render in the fetch. The definition is corroborated by SWE book chapter 13 (above). A commenter on the post wrote: "Change-detector tests ... do not add any clarity, and you cannot safely refactor stuff."
- Dodds: implementation-detail tests produce false negatives on refactor and false positives on real regressions — [kentcdodds.com](https://kentcdodds.com/blog/testing-implementation-details)
- In agent PRs, 80.2% of test patches have weak or no oracles, so test count overstates verification — [arXiv 2606.18168](https://arxiv.org/abs/2606.18168)

### Inferences

- Rubric classes:
  - **Remove**: tests that cannot fail, such as no assertion, a tautology, a test that only asserts a mock was called, or a test that asserts a framework or library's own behavior.
  - **Rewrite**: change-detector or implementation-detail tests, which assert private calls, internal state or exact call sequences.
  - **Consolidate**: duplicate tests of the same behavior, or per-method tests that should be per-behavior (possibly parameterized).
  - **Keep**: tests that exercise a public-API behavior with a specific, readable oracle.
- Trivial getter and setter tests and snapshot overuse fall under "cannot meaningfully fail" or "change-detector", but this session found no primary source for them (see Gaps).

### Gaps

- Not fetched this session: Fowler's pieces (TestPyramid, UnitTest, "Mocks Aren't Stubs"), Kent C. Dodds on snapshot testing ("Effective Snapshot Testing"), thoughtbot's and GitLab's testing guides (GitLab's testing_guidelines / best practices docs), and Google's SWE book chapter 11 and chapter 14 specifics. All are candidates for a follow-up fetch.
- I found no primary source explicitly about deleting tests for trivial getters and setters.

## LLM-as-judge or rubric-based review of test quality, and its reliability

### Takeaway

I found no study that validates an LLM judge specifically for unit-test quality. General rubric-judging research shows large noise on fine-grained rubrics, which is worst for agentic coding. Rubric wording can bias scores. Decomposed criteria, reasoning before the score, and majority voting improve reliability. An auditor should prefer checkable, decomposed criteria (for example "does the test contain an assertion on SUT output?") over holistic scores, and should be calibrated against a human-labeled set.

### Cited Findings

- RuVerBench ("Can LLM-as-a-Judge Reliably Verify Rubrics in Agentic Scenarios?") finds substantial noise in fine-grained rubric verification even for frontier models. Performance is worse on agentic coding, especially on task- and tool-use-related rubrics. Batching rubrics trades accuracy for efficiency, and majority voting helps with diminishing returns — [arXiv 2606.29920](https://arxiv.org/html/2606.29920v1) (search-snippet summary)
- Rubric text alone predicts judge outputs above chance ("rubric priors"), so phrasing can drive scores regardless of the candidate — [arXiv 2609.02942](https://arxiv.org/html/2609.02942v1) (search-snippet summary)
- Across 21 judges, high test-retest reliability (> 0.95) coexists with severe position bias (> 0.10). The authors recommend chance-corrected agreement and measuring consistency and bias jointly — [arXiv 2606.19544](https://arxiv.org/pdf/2606.19544) (search-snippet summary)
- A practitioner rule of thumb says to rewrite or drop rubric criteria that stay below kappa 0.4. This is a blog, not an established standard — [Medium, Adnan Masood](https://medium.com/@adnanmasood/rubric-based-evals-llm-as-a-judge-methodologies-and-empirical-validation-in-domain-context-71936b989e80) (secondary)
- Reliability-aware LLM-judge framework for coding co-creation — [arXiv 2604.27727](https://arxiv.org/pdf/2604.27727) (title only; not read)

### Inferences

- A test-auditor rubric should lean on near-syntactic, verifiable checks:
  - assertion presence and its target
  - mock count and which objects are mocked
  - sleeps, time and randomness
  - conditionals or loops in the test
  - whether a private or internal symbol is referenced
- It should reserve judgment calls for a few questions: Behavioral (would a plausible mutant fail it?), Structure-insensitive (would a refactor break it?) and Specific.
- The auditor should cite the line that is evidence for each finding, so a human can verify it cheaply.
- Mutation testing is the objective complement for the "can this test fail" question, but it was not researched here.

### Gaps

- I found no paper that measures LLM agreement with humans when classifying test smells or test value. This is a real gap, and a small human-labeled calibration set would be needed.
- Search-snippet summaries for the judge-reliability papers were not verified against the full texts.
