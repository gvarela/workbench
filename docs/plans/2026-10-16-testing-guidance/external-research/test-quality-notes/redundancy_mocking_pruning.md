# Redundant, Low-Value, and Over-Mocked Tests: Detection, Pruning, and LLM/Agent Approaches

<!-- markdownlint-disable MD024 -->

Notes compiled 2026-10-16. Most sources were checked through abstracts, search snippets, and partial full-text fetches. Each claim is labeled where the source is secondary or only partly verified.

## (a) How are redundancy and low value measured: mutation subsumption, coverage overlap, suite minimization?

### Takeaway

The rigorous measure of test redundancy is mutation-based. A test that kills no mutant beyond those other tests kill adds no measured fault-detection value. This needs a full test-by-mutant kill matrix, which PIT produces only with `fullMutationMatrix` and Stryker records as `killedBy`. Coverage-only redundancy is cheap but produces many false positives. Minimization studies consistently cut about 70% of suite size, but reported fault-detection loss ranges from none to severe. So automated removal is unsafe, and redundancy findings should go to humans as review candidates.

### Cited Findings

**Mutant subsumption and minimal sets (theory)**

- Dynamic subsumption is defined over a test set: mutant A subsumes mutant B if every test that kills A also kills B. A mutant set is minimal when no pair in it subsumes one another, and removing every dynamically subsumed mutant gives the minimal set — [Theoretical framework, arXiv 1601.06466](https://arxiv.org/pdf/1601.06466)
- Ammann, Delamaro, and Offutt (ICST 2014, older classic) show how to minimize a mutant set efficiently with respect to a test set — [Establishing Theoretical Minimal Sets of Mutants (CPS-VO record)](https://archive.cps-vo.org/node/19520)
- Redundant mutants inflate the mutation score and make it harder to interpret. Removing them changes the score but not which tests get selected — [arXiv 1601.06466](https://arxiv.org/pdf/1601.06466) (via search snippet)
- Kurtz, Ammann, et al. model mutant redundancy as subsumption graphs. "True" subsumption cannot be computed; dynamic and static subsumption approximate it — [Mutant Subsumption Graphs (ICSTW 2014)](https://www.academia.edu/124341041/Mutant_Subsumption_Graphs)
- Selective mutation can score poorly on dominator mutants (the minimal set) for some programs — [Analyzing the Validity of Selective Mutation with Dominator Mutants (slides)](https://dependability.iyte.edu.tr/wp-content/uploads/sites/252/2021/06/ppt05_A-Analyzing-the-Validity-of-Selective-Mutation-with-Dominator-Mutants.pdf)
- Cerebro (Garg, Papadakis, et al.) uses machine learning to predict statically, from code context, which mutants subsume others — [arXiv 2112.14151](https://www.arxiv.org/pdf/2112.14151v2)

**Tool support for test-to-mutant matrices**

- By default PIT stops running tests against a mutant once one test kills it, so the default report does not show every killing test. PIT 1.4.3 added `fullMutationMatrix`, which keeps running the remaining tests and records each result. It works only with XML output — [XWiki Jira changelog (secondary)](https://jira.xwiki.org/browse/XCOMMONS-1569); [MutantReductionEvaluation repo](https://github.com/zhangpengNJU/MutantReductionEvaluation)
- Enabling it: `-DoutputFormats=XML -DfullMutationMatrix=true`. The full kill relationship between every mutant and every test can then be parsed from the report — [MutantReductionEvaluation](https://github.com/zhangpengNJU/MutantReductionEvaluation)
- A community plugin (Detailed-CSV-Report-PITest) turns the first-killing-test column into a list of all killing tests. Its version 5.0 targets PIT 1.6.2 and later — [GitHub](https://github.com/victorgveloso/Detailed-CSV-Report-PITest)
- A July 2024 report on the PIT mailing list describes broken `mutations.xml` output when `fullMutationMatrix` is combined with incremental analysis. No resolution was visible — [pitusers group](https://groups.google.com/g/pitusers)
- The Stryker mutation-testing report schema gives each mutant `coveredBy` and `killedBy` fields. This comes from a secondary third-party page that was flagged for prompt-injection risk, so treat it as unverified — [tessl.io tool-normalization (secondary)](https://tessl.io/registry/testland/mutant-survival-triage/files/references/tool-normalization.md)

**Test-suite minimization and reduction outcomes**

- Noemmer and Haas (2020) compared four minimization techniques on open-source projects. Suite size and execution time fell by more than 70% on average, but fault detection dropped by about 12.5% on average — [Teamscale SWQD 2020 paper](https://teamscale.com/hubfs/26978363/Publications/2020-test-suite-minimization-swqd.pdf?hsLang=en)
- Jehan and Wotawa (IEEE Access 2023) used greedy minimization with mutation coverage on JavaScript applications. Their minimized suites are about 70% of the original size with no loss of fault detection on the studied programs — [DOAJ record](https://doaj.org/article/2c476261156943f588292e22db8300bd)
- TripRL (arXiv 2408.13517, 2024) uses PIT mutation score as a stand-in for unknown faults. The baselines ATM and Nemo lost fault detection. The authors warn that 100% detection of known faults "cannot guarantee strong fault detection ability for future unknown faults" — [arXiv 2408.13517](https://arxiv.org/pdf/2408.13517)
- Older studies conflict (classic, pre-2015). Wong et al. found reduction did not substantially lower fault detection; Rothermel et al. found it could lower it severely — [Zhang et al. ISSRE 2011](https://personal.utdallas.edu/~lxz144130/cs6301-readings/zhang-issre11.pdf)
- Coverage-based redundancy detection on Java projects gives many false positives. A semi-automatic review backed by mutation analysis preserved fault detection — [Analyzing the reduction of test suite redundancy](https://silicon-austria-labs.elsevierpure.com/en/publications/analyzing-the-reduction-of-test-suite-redundancy) (snippet only)

**Google: mutation testing at scale**

- State of Mutation Testing at Google (Petrović and Ivanković, ICSE-SEIP 2018): 6,000 engineers used the system on the changes they authored or reviewed, covering about 30% of diffs that had statement coverage. Mutants are generated only on changed lines, skipping uncovered lines and "uninteresting" (arid) lines such as logging — [snippet of 2018 paper (PDF mirror)](https://web.eecs.umich.edu/~weimerw/2022-481W/readings/mutation-google.pdf)
- Practical Mutation Testing at Scale (Petrović, Ivanković, Fraser, Just; arXiv 2021 / TSE): the system mutates only code changed under review and filters out mutants "likely to be irrelevant to developers." It limits mutants per line and per review and picks mutation operators by their historical performance. It produces "orders of magnitude fewer mutants" and was evaluated with more than 24,000 developers on more than 1,000 projects — [arXiv 2102.11378](https://arxiv.org/abs/2102.11378)
- The 2021 evaluation covered about 17 million mutants and 760,000 changes; 2 million mutants were surfaced during code review — [practical_mutation_testing_tr_2021 (UW)](https://homes.cs.washington.edu/~rjust/publ/practical_mutation_testing_tr_2021.pdf) (search snippet)
- Petrović and Ivanković report an average usefulness rate of 75% for surfaced mutants. This is secondary: it was cited by the Facebook study and not confirmed in the primary paper — [What It Would Take to Use Mutation Testing in Industry, Facebook, arXiv 2010.13464](https://arxiv.org/pdf/2010.13464)

### Inferences

- To flag a test as redundant, the auditor needs the full kill matrix: PIT with `fullMutationMatrix=true` plus XML output, or Stryker's `killedBy`. The default PIT report records only the first killing test, so it would wrongly make later tests look like they kill nothing.
- A test whose killed-mutant set is a subset of another test's set is a candidate for merge or removal, not proof of redundancy. Equivalent mutants, a small mutant sample (Google-style per-line caps), and unknown future faults all weaken the conclusion. Given the mixed minimization evidence (0% to 12.5% average fault-detection loss, more in older studies), the auditor should report candidates for human review rather than delete automatically.
- Google surfaces individual surviving mutants on changed code during review, not "delete this test" advice. The precedent from industry is gap-finding, not pruning.

### Gaps

- Exact `mutations.xml` field names (`killingTests`, `succeedingTests`) were not confirmed from official pitest.org documentation. mutmut and cargo-mutants per-test kill reporting was not researched.
- Equivalent-mutant rates and their cost were not covered by a sourced figure in this pass.
- The full text of Petrović and Ivanković 2018 (the arid-node heuristics, the 75% usefulness figure) was not verified at the primary source.

## (b) How is over-mocking measured, and what do empirical studies find?

### Takeaway

Over-mocking is usually measured by mining mock-framework usage: the share of test commits or test classes that create mocks, the kinds of dependencies mocked, and the mix of test-double types. A 2026 MSR study found that coding agents add mocks more often than humans and lean heavily on mocks rather than fakes. Google's published guidance is to prefer real implementations, then fakes, and to prefer state testing over interaction testing, because mock-heavy tests "required constant effort to maintain while rarely finding bugs."

### Cited Findings

**Hora and Robbes, "Are Coding Agents Generating Over-Mocked Tests? An Empirical Study" (MSR 2026; arXiv 2602.00409)**

- Data: over 1.2 million commits from 2025 in 2,168 Python, JavaScript, and TypeScript repositories, including 48,563 agent commits. Agents (Claude, Copilot, Cursor) were identified from author or co-author metadata — [arXiv 2602.00409](https://arxiv.org/html/2602.00409v1); [MSR 2026 listing](https://2026.msrconf.org/details/msr-2026-technical-papers/29/Are-Coding-Agents-Generating-Over-Mocked-Tests-An-Empirical-Study)
- RQ1: 23% of agent commits add or modify test files, against 13% of non-agent commits — [arXiv 2602.00409](https://arxiv.org/html/2602.00409v1)
- RQ2: 36% of agent test commits add mocks, against 26% of non-agent test commits. In repositories with at least 50 agent commits it is 36% against 28% (Cliff's delta 0.252, a small effect). In repositories with 10 to 49 agent commits it is 27% against 24%, a negligible effect — [arXiv 2602.00409](https://arxiv.org/html/2602.00409v1)
- Mock ratio by agent: Cursor 37%, Copilot 36%, Claude 34% — [arXiv 2602.00409](https://arxiv.org/html/2602.00409v1)
- RQ3, test-double types (share of repositories): agents use mock 95%, spy 33%, fake 32%; non-agents use mock 91%, fake 57%, spy 51%. Dummy appears in 19% of agent repositories against 40% of non-agent ones — [arXiv 2602.00409](https://arxiv.org/html/2602.00409v1)
- Recommendations: review agent-generated tests for appropriate mock use, and "include guidance on mocking best practices and anti-patterns in agent configuration files." The study is observational and correlational — [arXiv 2602.00409](https://arxiv.org/html/2602.00409v1)

**Spadini et al.**

- "To Mock or Not To Mock?" (MSR 2017, pre-2018 classic): the authors built MockExtractor and manually analyzed more than 2,000 mock usages across Alura, Spring Framework, VRaptor, and SonarQube, then followed up with interviews and a survey. The paper categorizes which dependencies developers mock and which they do not, explains why, and lists the challenges of testing with mocks — [TU Delft SERG](https://serg.ewi.tudelft.nl/publications/to-mock-or-not-to-mock-an-empirical-study-on-mocking-practices); [dataset](https://data.4tu.nl/datasets/a6a43620-28fc-456e-bf13-7a091682e95c)
- The extension, "Mock Objects for Testing Java Systems" (EMSE 2019), adds how mocks evolve. A secondary summary says mocking couples test code tightly to production code, because changing a production class's internals often forces test changes. The full text could not be fetched (paywall redirect) — [Springer EMSE 10.1007/s10664-018-9663-0](https://link.springer.com/article/10.1007/s10664-018-9663-0)

**Google, Software Engineering at Google, Chapter 13 "Test Doubles"** (primary, fetched)

- "our first choice for tests is to use the real implementations of the system under test's dependencies"; "We prefer realistic tests because they give more confidence" — [abseil.io ch13](https://abseil.io/resources/swe-book/html/ch13.html)
- "If using a real implementation is not feasible within a test, the best option is often to use a fake in its place"; "the team that owns the real implementation should write and maintain a fake" — [abseil.io ch13](https://abseil.io/resources/swe-book/html/ch13.html)
- On overusing mocking frameworks: "though these tests were easy to write, we suffered greatly given that they required constant effort to maintain while rarely finding bugs" — [abseil.io ch13](https://abseil.io/resources/swe-book/html/ch13.html)
- "Overuse of stubbing leads to tests that are unclear and brittle"; "Interaction testing should be avoided when possible"; "emphasizing state testing is more scalable" — [abseil.io ch13](https://abseil.io/resources/swe-book/html/ch13.html)
- Older secondary source (2012): a summary of a PyCon talk about Google Code advises "use fakes, not mocks," with one authoritative fake per service, mocking only expensive external services — [Ned Batchelder blog](https://nedbatchelder.com/blog/201206/tldw_stop_mocking_start_testing)

### Inferences

- Signals the auditor can compute statically: mocks per test, the share of tests that use any mock, mocks of the system under test itself or of in-process value or data types, interaction assertions (verify/called-with) against state assertions, and the ratio of fakes to mocks. The agent-versus-human gap in fake use (32% against 57%) suggests "mocks where a fake exists" is a specific signal to check for agent-written suites.
- Google's preference order (real implementation, then fake, then stub or mock, with state testing over interaction testing) can serve as the rubric for over-mocking findings.

### Gaps

- No sourced numeric threshold was found for "too many mocks per test." No empirical study was found linking mock density directly to escaped defects; Google's "rarely finding bugs" is qualitative.
- The exact Spadini 2017 percentages (for example, how often databases or web services are mocked) were not retrieved.
- The secondary claim that agents add mocks "about ten percentage points more" is consistent with the 36% against 26% figures above, so no separate source is needed.

## (c) Maintenance cost: change-detector tests and co-change (brittleness) mining

### Takeaway

Google calls tests that fail on any production change, even when behavior is unchanged, "change-detector tests," and traces them mainly to overusing interaction testing. Mining software history can find test and production files that change together. However, a 2023 study shows that same-commit co-change samples are noisy, so co-change frequency alone is a weak brittleness signal unless it is filtered (for example, to production commits classified as refactorings).

### Cited Findings

- Software Engineering at Google, Chapter 13: tests that overuse interaction testing "fail in response to any change to the production code" even when behavior is unchanged, and the chapter calls these change-detector tests — [abseil.io ch13](https://abseil.io/resources/swe-book/html/ch13.html)
- Google Testing Blog, "Testing on the Toilet: Change-Detector Tests Considered Harmful" (Alex Eagle, January 27, 2015): the post body was not retrievable; only the title and comments came back. One commenter says such tests "do not add any clarity" and make refactoring harder — [Google Testing Blog](https://testing.googleblog.com/2015/01/testing-on-toilet-change-detector-tests.html)
- It won the first annual Testing on the Toilet award alongside Erik Kuefler's "Test Behaviors, Not Methods" — [Google Testing Blog 2015/02](https://testing.googleblog.com/2015/02/the-first-annual-testing-on-toilet.html)
- Zaidman et al. (ICST 2008, EMSE 2011, older classic) built TeMo, which combines version history, artifact size, and coverage to find synchronous and phased co-evolution of production and test code — [Springer EMSE 10.1007/s10664-010-9143-7](https://link.springer.com/article/10.1007/s10664-010-9143-7); [UAntwerp record](https://ansymore.uantwerpen.be/publications/studying-co-evolution-production-and-test-code-open-source-and-industrial-developer-tes)
- Marsavina (TU Delft thesis, 2014) mined fine-grained changes in five systems with association rules and found six co-evolution patterns — [TU Delft repository](https://repository.tudelft.nl/file/File_08f273bf-cb23-4868-98a7-24df3c6161ed)
- A 2018 replication (MaLTeSQuE) on about 2,500 versions found those patterns present but with weaker links — [IEEE CSDL](https://computer.org/csdl/proceedings-article/maltesque/2018/08368456/12OmNy4IF6n)
- CHOSEN (2023) shows that the assumption "a test change and a production change in the same commit or a short window form a valid co-evolution sample" is noisy. It gives a six-category noise taxonomy (including adaptive, perfective, and corrective maintenance) and a two-stage filter — [SMU InK record](https://ink.library.smu.edu.sg/sis_research/8280)
- Miranda, Avelino, and Santos Neto (JSEP 2025) studied test evolution and production/test co-change across 526 GitHub repositories in six languages — [record](https://ubmr.hds.hebis.de/EdsRecord/asx%252C186955339) (snippet only)

### Inferences

- A git-history brittleness check could look for test files that change in most commits touching their paired production file, especially commits whose messages or diffs suggest refactoring (renames, extractions) with no behavioral change. CHOSEN's noise findings mean such a check should be a "review these" heuristic, not a verdict.
- Inside a single change, a cheap proxy is a structural-only (Tidy First) commit that still had to edit tests. That is a direct change-detector signal and fits the workflow's separation of structural and behavioral commits.

### Gaps

- No study was found that quantifies the share of test changes caused by refactorings that preserve behavior. Refactoring-aware detectors (for example, RefactoringMiner combined with test co-change) were not researched in this pass.
- The original 2015 change-detector post text was not retrievable.

## (d) Can LLMs and agents reliably review, consolidate, or prune tests?

### Takeaway

LLMs detect test smells with moderate accuracy (about 74% to 80% for the best model in one 2025 study; high recall with multi-agent small models in another), but LLM refactoring can introduce new smells or reduce coverage. No reliable evaluation was found of LLMs as judges of unit-test value or of LLM-driven test deletion or deduplication. The strongest industrial precedent, Meta's TestGen-LLM, does not trust LLM judgment at all: it keeps only tests that pass objective filters (builds, passes reliably, adds coverage). Agents also show a documented tendency to modify or delete failing tests to make them pass, so any pruning an agent proposes needs mechanical evidence and human approval.

### Cited Findings

- "Evaluating LLMs' Effectiveness in Detecting and Correcting Test Smells" (arXiv 2506.07594, 2025) compared GPT-4-Turbo, LLaMA 3 70B, and Gemini-1.5 Pro on Python and Java. Gemini detected best (74.35% Python, 80.32% Java) and LLaMA worst. Refactoring sometimes introduced new smells; GPT-4 and LLaMA often lowered coverage, while Gemini raised it — [arXiv 2506.07594](https://arxiv.org/abs/2506.07594v1)
- "Agentic LMs: Hunting Down Test Smells" (arXiv 2504.07277, 2025) used small open models in one-, two-, and four-agent setups on 150 instances of five smell types. Detection pass@5 was 96% with four agents; Phi-4-14B had the best refactoring pass@5 at 75.3%. Six PRs were merged into open-source projects — [arXiv 2504.07277](https://arxiv.org/html/2504.07277v2)
- UTRefactor (secondary summary) reduced detected smells from 2,375 to 265 (89%) across 879 tests in six Java projects, by re-prompting until residual smells disappeared — [Moonlight literature review (secondary)](https://www.themoonlight.io/review/automated-unit-test-refactoring)
- Meta TestGen-LLM (FSE 2024 Industry, arXiv 2402.09171) keeps only candidates that build, pass reliably, and increase coverage, to guard against hallucination. On Instagram Reels and Stories, 75% of candidates built, 57% passed reliably, and 25% increased coverage. In deployment, 73% of recommendations were accepted. The share of classes improved is 11.5% in one version and 10% in another (versions differ) — [arXiv 2402.09171](https://arxiv.org/abs/2402.09171v1); [ar5iv](https://ar5iv.labs.arxiv.org/html/2402.09171); [FSE 2024 listing](https://2024.esec-fse.org/details/fse-2024-industry/18/Automated-Unit-Test-Improvement-using-Large-Language-Models-at-Meta)
- LLM-as-judge reliability (adjacent evidence only): one study of an LLM judge for Gherkin acceptance-test coverage evaluated 20 model configurations against 100 expert-annotated scripts and reports first-attempt completion of 85.4% to 100% — [arXiv 2512.01232](https://arxiv.org/html/2512.01232v1). In LMR-Bench, LLM-as-judge performed worst of three evaluation methods (below unit tests and human review), favoring similarity to a reference solution — [arXiv 2506.17335](https://arxiv.org/pdf/2506.17335)
- Agents tampering with tests: ImpossibleBench (Zhong, Raghunathan, Carlini; ICLR 2026) builds tasks where the tests contradict the specification, so any "pass" measures exploitation of the tests. Its motivating behavior is agents deleting or modifying failing tests instead of fixing code — [arXiv 2510.20270](https://arxiv.org/abs/2510.20270); [ICLR 2026](https://iclr.cc/virtual/2026/poster/10009390). A forum post (secondary) reports Claude Sonnet 4 and Opus 4.1 scoring on one impossible task by editing the test — [LessWrong](https://www.lesswrong.com/posts/qJYMbrabcQqCZ7iqm/impossiblebench-measuring-reward-hacking-in-llm-coding-1)
- Agents add tests more than humans do: 23% of agent commits against 13% of non-agent commits touch test files — [Hora and Robbes, arXiv 2602.00409](https://arxiv.org/html/2602.00409v1)
- Agent PR studies (Ehsani et al., 33k agent PRs; Ogenrwot and Businge, 24,014 agent PRs against 5,081 human PRs) report differences in commits, files, and deleted lines, but not broken down by test code — [arXiv 2601.15195](https://arxiv.org/abs/2601.15195); [arXiv 2601.17581](https://arxiv.org/pdf/2601.17581v3)

### Inferences

- The TestGen-LLM pattern ("LLM proposes; objective filters decide") carries over to pruning. An auditor that proposes merging or deleting tests should require mechanical evidence (no unique killed mutants, no unique coverage, the change still passes) before recommending removal, and should never act on LLM judgment alone.
- Given test-tampering behavior and the absence of validated LLM-judge accuracy for test value, an auditor should report and not delete. It should also treat any agent diff that removes or weakens assertions as a high-severity finding.
- LLM smell detection (about 75% to 96%) is good enough for advisory findings but not for gating. Refactoring suggestions should be checked for coverage or mutation-score regressions.

### Gaps

- No study was found that evaluates LLMs or agents at deduplicating or pruning existing unit tests, or that measures agreement between an LLM judge and developers on unit-test value.
- No sourced study was found that directly quantifies agents never deleting tests. The evidence here is indirect (agents add tests more often; agents delete tests when gaming them).
- Meta's later mutation-guided LLM test generation work (ACH, 2025) is relevant but was not verified in this pass.

## (e) Flaky tests as a suite-health signal

### Takeaway

Google's widely cited figures are that about 1.5% of test runs are flaky and about 16% of tests show some flakiness. Flakiness is defined as passing and failing on the same code. Rerun-based detection is the baseline method.

### Cited Findings

- Micco (Google Testing Blog, 2016): "about 1.5% of all test runs" report a flaky result and "almost 16% of tests have some level of flakiness"; flakiness means a test both passes and fails with the same code — [Google Testing Blog, John Micco label](https://testing.googleblog.com/search/label/John%20Micco); [May 2016 archive](https://testing.googleblog.com/2016/05/)
- A later Google post reports about 4.2 million CI tests, of which about 63,000 have a flaky run in a week — [Google Testing Blog (Jeff Listfield label)](https://testing.googleblog.com/search/label/Jeff%20Listfield?m=0) (snippet)
- About 84% of pass-to-fail transitions in Google's post-submit system were caused by flakes. This comes via a 2026 secondary benchmark that also cites the 2016 post — [testdino (secondary)](https://testdino.com/blog/flaky-test-benchmark/)

### Inferences

- A suite-level auditor could flag tests with mixed pass/fail history on the same commit (rerun results or CI history) as health findings, separate from redundancy findings.

### Gaps

- iDFlakies (Lam et al., ICST 2019: rerun-based and order-dependent flaky detection) was not confirmed by search in this pass, and no figures are cited for it.
