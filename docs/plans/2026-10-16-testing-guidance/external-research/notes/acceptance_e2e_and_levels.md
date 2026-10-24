# Acceptance, E2E, and Test-Level Selection for LLM Coding Agents (2024–2026)

<!-- markdownlint-disable MD024 -->

Source-verification note: sources marked (fetched) were read in full or in part this session. Sources marked (canonical, not re-fetched) are long-standing primary URLs cited from prior knowledge. Their core definitions are stable, but the report writer should treat exact wording as unverified. Sources marked (search snippet) were seen only as search-engine summaries.

## 1. Outside-in / double-loop TDD and ATDD adapted for agents

### Takeaway

There is wide practitioner support for giving agents an executable acceptance-level target before implementation: an outer "definition of done" test, with inner unit tests. The strongest 2026 evidence questions prescribing the TDD *process* inside the agent loop, but it does not question human-specified scenarios or checks outside the loop. Rigorous outcome data on outside-in specifically is thin.

### Cited Findings

- Birgitta Böckeler (Thoughtworks) ran an exploratory experiment on greenfield business-logic tasks: 5 batches, 2 non-TDD and 2 TDD solutions per batch, Sonnet 4.6 generating, Opus 4.8 blind-judging, 80% coverage required. She found "no clearly discernable difference based on TDD workflow versus no TDD workflow". For small and medium tasks, non-TDD usually ranked higher. — [Fowler site, TDD in the agent loop (fetched)](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html)
- Same experiment: "no meaningful difference in mutation scores". TDD/non-TDD token ratios were 8.50x (small), 2.96x (medium), and 4.89x (large), which she calls directional and likely overstating dollar cost. — [Fowler site (fetched)](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html)
- Böckeler has "stopped telling my coding agents to write tests first". She recommends monitoring regression-suite quality with mutation testing. She distinguishes "Human writes the tests: A human defines the test scenarios in some form" (where "we have to sit with the friction of specifying behaviour") and focuses on TDD's benefits "outside of the agent loop". She describes "Approved Scenarios" as "semi-manual testing that is supported by a bespoke test runner for each application." — [Fowler site (fetched)](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html)
- Secondary write-ups attribute to her the hypothesis that agents "often skip the red step or over-implement". — [agentpatterns.ai anti-pattern page (search snippet)](https://agentpatterns.ai/patterns/anti-patterns/tdd-inside-the-agent-loop/)
- Simon Willison takes the opposite view: "Use red/green TDD" is "a *fantastic* fit for coding agents". "It's important to confirm that the tests fail before implementing", and good models understand "red/green TDD" as shorthand. — [Willison, Red/green TDD (fetched)](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/)
- Willison also recommends opening each agent session on an existing project by telling it to run the tests. This makes it discover the suite and puts it in a testing mindset (guide dated Feb 2026). — [Willison, First run the tests (search snippet)](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/)
- Anthropic's Claude Code best practices say the most useful specs "end with an end-to-end verification step that proves the feature works". They suggest "have one Claude write tests, then another write code to pass them", and for bugs: "write a failing test that reproduces the issue, then fix it". — [Claude Code best practices (fetched)](https://code.claude.com/docs/en/best-practices)
- Dave Farley's 2026 talks ("Vibe Coding: Is this really the best we can do?" at AI Native DevCon London, and "A Harness for Behaviour") are summarized as a pipeline: vision → user story → worked examples → executable specifications → AI generates code → pipeline verifies, "with some tests held back so AI can't game them". They argue that natural language alone is an inadequate spec. These are AI-generated or secondary summaries, not Farley's own text. — [tessl.io talk outline (search snippet)](https://tessl.io/registry/ainativedev/aidevcon-2026-ldn/0.100.14/files/talk-farley-vibe-coding-best-we-can-do/outline.md); [dabase.com blog (search snippet)](https://dabase.com/blog/2026/jira-template-for-ai-generated-code/)
- An ASE '26 paper (arXiv 2605.17242) proposes multi-agent TDD that generates full-stack web apps from requirements. It argues that executable acceptance tests written before code give the agent a concrete target and give structured repair signals. — [arXiv 2605.17242 (search snippet)](https://arxiv.org/pdf/2605.17242)
- Community Claude Code skills package outside-in ATDD as a two-loop process: an outer acceptance test at a user-facing boundary (API endpoint, CLI, UI) defines "done", and inner unit tests cover each layer. One ATDD plugin enforces Given/When/Then specs before code. A Leanpub book, *ATDD with AI Agents*, exists. — [skills.sh atdd (search snippet)](https://www.skills.sh/maxmurr/agents-skills/atdd); [amplihack outside-in-testing (search snippet)](https://skillselion.com/skills/rysweet/amplihack/outside-in-testing); [Leanpub (search snippet)](https://leanpub.com/atdd-with-ai-agents)
- Background: the double-loop (acceptance test outer loop, unit TDD inner loop) comes from Freeman and Pryce, *Growing Object-Oriented Software, Guided by Tests* (2009). — [growing-object-oriented-software.com (canonical, not re-fetched)](http://www.growing-object-oriented-software.com/)

### Inferences

- The two camps can be reconciled. Böckeler's negative result concerns the agent running red-green alone over unit tests on greenfield logic. Willison, Anthropic, and Farley all favor a check that is **specified before implementation and evaluated outside the implementer's own judgment**. Human-approved acceptance scenarios, a separate test-writer agent, or held-back tests fit this pattern. For a plugin, the outer acceptance test (derived from approved criteria) is the higher-value anchor. Mandatory unit-level red-green is the contested part.
- "Hold back some tests" (Farley) and "separate writer/implementer sessions" (Anthropic) both target the same failure: agents fitting tests to code, or code to tests.

### Gaps

- I found no controlled study comparing outside-in (acceptance-first) and unit-first agent workflows on outcome quality.
- Böckeler's article had no visible date in the fetched text (2026 inferred from model names).
- Farley's primary transcript was not found.

## 2. Agent-driven E2E: Playwright MCP, Playwright Test Agents, flakiness, self-healing

### Takeaway

Playwright ships three built-in test agents (planner, generator, healer) with a Claude Code loop option, and Playwright MCP drives the browser through accessibility snapshots rather than pixels. Playwright now recommends its CLI plus skills over MCP for coding agents on token-efficiency grounds. Standard flakiness mitigations still apply: role-based locators, web-first assertions, isolation, and mocking third parties. The healer can mark a test skipped when it judges the feature broken, which is the main point of risk.

### Cited Findings

- Playwright Test Agents: **Planner** "explores the app and produces a Markdown test plan" (input: request, seed test, optional PRD; output e.g. `specs/basic-operations.md`). **Generator** turns the plan into test files and "verifies selectors and assertions live as it performs the scenarios" (output under `tests/`). **Healer** runs failing tests, replays steps, "inspects the current UI to locate equivalent elements", patches, and reruns. Its output is a passing test "or a skipped test if the healer believes the functionality is broken." — [playwright.dev Test Agents (fetched)](https://playwright.dev/docs/test-agents)
- Agent definitions are generated with `npx playwright init-agents --loop=claude` (or vscode/opencode) and "should be regenerated whenever Playwright is updated". Seed tests (`seed.spec.ts`) provide fixtures/setup and act as a template for generated tests. The VS Code agentic experience needs VS Code v1.105 (Oct 9, 2025). — [playwright.dev Test Agents (fetched)](https://playwright.dev/docs/test-agents)
- Playwright MCP "Uses Playwright's accessibility tree, not pixel-based input" and "Avoids ambiguity common with screenshot-based approaches". The snapshot tool is "better than screenshot", and "You can't perform actions based on the screenshot". — [microsoft/playwright-mcp README (fetched)](https://github.com/microsoft/playwright-mcp)
- The same README recommends Playwright CLI with SKILLS for coding agents because "CLI invocations are more token-efficient", avoiding "large tool schemas and verbose accessibility trees". MCP is positioned for "specialized agentic loops that benefit from persistent state" such as exploratory automation, self-healing tests, and long-running autonomous workflows. — [microsoft/playwright-mcp README (fetched)](https://github.com/microsoft/playwright-mcp)
- Playwright best practices: "Automated tests should verify that the application code works for the end users", not implementation details. "Each test should be completely isolated from another test." "Only test what you control" (mock third parties via the Network API). Prefer "user-facing attributes and explicit contracts", e.g. `getByRole`. "Locators come with auto waiting and retry-ability". Use web-first assertions (`await expect(...)`) rather than manual `isVisible()`. — [playwright.dev Best Practices (fetched)](https://playwright.dev/docs/best-practices)
- Willison notes that agents can absorb the maintenance cost of browser tests, which have a reputation for flakiness, after design changes. — [Willison, Agentic manual testing (fetched)](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/)
- Third-party descriptions of the Healer say it patches with corrected role-based locators and re-runs. — [qaskills.sh (search snippet)](https://qaskills.sh/blog/playwright-healer-agent-self-healing-2026); [testdino (search snippet)](https://testdino.com/blog/playwright-ai-ecosystem-2026)

### Inferences

- The healer's "skip if broken" outcome is the critics' concern in concrete form: an automated repair loop can turn a real regression into a skipped or relaxed test. A workflow should treat any healer-induced skip, or any change to assertions (as opposed to locators), as a human-review event.
- For a Claude Code plugin, Playwright's own guidance points to the CLI/skill for routine generation and running, and to MCP for interactive exploration.

### Gaps

- The exact Playwright release that introduced test agents was not confirmed (the docs page does not state it; likely 1.56, Oct 2025, but unverified).
- I found no Thoughtworks Technology Radar entry for Playwright MCP or self-healing tests via search. Check thoughtworks.com/radar directly.
- I found no primary critique of self-healing tests (e.g., by a named testing expert) with a citable URL this session.
- Cypress and Capybara agent-specific guidance was not found.

## 3. Driving the app to verify vs. writing durable regression tests

### Takeaway

Sources converge on a two-step pattern. The agent drives the running app (curl, browser automation, screenshots) as a manual or exploratory check, because passing tests do not prove the feature works. Any defect it finds is then pinned with a red/green automated test so the case becomes permanent regression coverage.

### Cited Findings

- "Automated tests are no replacement for manual testing". Tests can pass while code crashes on startup or misses a UI element. — [Willison, Agentic manual testing (fetched)](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/)
- Methods by project type: `python -c` snippets and demo files in `/tmp` (not committed) for libraries, `curl` against a dev server for JSON APIs, and browser automation (Playwright, Vercel agent-browser, Willison's Rodney over Chrome DevTools Protocol, with accessibility tree and screenshots) for web UIs. — [Willison, Agentic manual testing (fetched)](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/)
- When manual testing finds a bug, fix it with red/green TDD: "This ensures the new case ends up covered by the permanent automated tests." — [Willison (fetched)](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/)
- Showboat's `exec` command records the real command and output, to discourage agents from writing what they hoped happened. — [Willison (fetched)](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/)
- Anthropic: "Give Claude a check it can run: tests, a build, a screenshot to compare." Run `/verify` "to confirm the change against the running app". "Have Claude show evidence rather than asserting success". Gates can be strengthened via `/goal`, a Stop hook ("deterministic gate"), or a verification subagent "so the agent doing the work isn't the one grading it". — [Claude Code best practices (fetched)](https://code.claude.com/docs/en/best-practices)
- Anthropic's reviewer caveat: a reviewer told to find gaps will report some, and chasing them leads to "tests for cases that can't happen". Flag only gaps affecting correctness or stated requirements. — [Claude Code best practices (fetched)](https://code.claude.com/docs/en/best-practices)

### Inferences

- A practical rule: exploratory driving is appropriate for every user-visible change, as evidence for the verify step. A durable E2E/system test is warranted for critical user journeys, for regressions found during exploration, and for acceptance criteria that cannot be checked below the UI.

### Gaps

- I found no source that gives explicit criteria for when an agent's exploratory finding should become an E2E test and when it should become a lower-level test. Practitioners leave this implicit.

## 4. Test-level selection models and guidance for agents

### Takeaway

The classic models (Google sizes, Fowler/Vocke practical pyramid, Dodds trophy, Spotify honeycomb, sociable vs. solitary) remain the reference points. Google's sizes classify tests by resources used (network, time), not by scope. The trophy and honeycomb push weight toward integration tests. I found no published model designed specifically for agents choosing a level per change.

### Cited Findings

- Google test sizes: small tests have no network access, medium tests are limited to localhost, and large tests can use external systems. Time limits are about 60, 300, and 900+ seconds. Small maps roughly to unit, medium to integration ("two tiers ... communicate"), and large to end-to-end/system. — [Google Testing Blog, Test Sizes, Dec 2010 (search snippet; canonical)](https://testing.googleblog.com/2010/12/test-sizes.html)
- The often-quoted 70/20/10 small/medium/large ratio traces to a 2010 Google IO talk, not to Google's testing docs. — [pytest-test-categories docs (search snippet)](https://pytest-test-categories.readthedocs.io/en/stable/user-guide/test-sizes.html)
- web.dev ("Pyramid or Crab?") surveys pyramid, diamond, honeycomb, trophy, and crab shapes. It describes the honeycomb as "introduced by Spotify ... specialized for microservices-based software systems" with primary focus on integration tests. — [web.dev ta-strategies (search snippet)](https://web.dev/articles/ta-strategies)
- Spotify honeycomb (2018): few implementation-detail tests, mostly integration tests per service, few integrated tests. — [Spotify Engineering, Testing of Microservices (canonical, not re-fetched)](https://engineering.atspotify.com/2018/01/testing-of-microservices)
- Kent C. Dodds' testing trophy: static analysis, unit, integration (largest), E2E. Slogan: "Write tests. Not too many. Mostly integration." — [kentcdodds.com, The Testing Trophy and Testing Classifications (canonical, not re-fetched)](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications); [kentcdodds.com, Write tests (canonical, not re-fetched)](https://kentcdodds.com/blog/write-tests)
- Ham Vocke's Practical Test Pyramid on Fowler's site: write many fast low-level tests and fewer coarse ones, avoid test duplication across levels, and use contract tests for service boundaries. — [martinfowler.com/articles/practical-test-pyramid.html (canonical, not re-fetched)](https://martinfowler.com/articles/practical-test-pyramid.html)
- Fowler distinguishes sociable unit tests (use real collaborators) from solitary ones (stub collaborators). — [martinfowler.com/bliki/UnitTest.html (canonical, not re-fetched)](https://martinfowler.com/bliki/UnitTest.html)
- Agent-adjacent guidance: Anthropic's example "write a test for foo.py covering the edge case where the user is logged out. avoid mocks." shows a preference for sociable or low-mock tests when prompting. — [Claude Code best practices (fetched)](https://code.claude.com/docs/en/best-practices)

### Inferences

- Google's resource-based sizing is the easiest framing for agents to apply mechanically (does the test need the network, a DB, a browser?), and it fits CI tiering. The trophy and honeycomb give the "where to put most effort" default for web apps and services.
- A per-change heuristic a plugin could encode (my synthesis, not sourced): pure logic → small/unit; a change crossing a boundary the team owns (DB, HTTP handler, queue) → medium/integration through the public interface; a user-visible journey or acceptance criterion only observable in the UI → one large/E2E test; a service boundary owned by another team → contract test.

### Gaps

- I found no 2024–2026 source that publishes a test-level selection model aimed at LLM agents.

## 5. Contract, API-level, and characterization/golden-master tests with agents

### Takeaway

Practitioner consensus (mostly blogs and skill pages) is that agents should pin legacy behavior with characterization or golden-master tests recorded on untouched code, prove those tests can fail, and lock them before refactoring. Emily Bache's approval-testing work is the established technique, but I found no source linking her directly to LLM agents.

### Cited Findings

- Characterization testing equals golden-master testing: feed representative inputs to the current system, record outputs, and use that as a safety net before agents edit untested code. — [iSAQB blog, "AI agents don't modernize legacy code on their own" (search snippet)](https://www.isaqb.org/blog/ai-agents-dont-modernize-legacy-code-on-their-own/)
- If the agent writes tests after refactoring, they describe the new code and can pass even when behavior changed. Record on untouched code, "prove they can fail with mutation testing, then lock them before the agent starts." — [developertoolkit.ai characterization tests (search snippet)](https://developertoolkit.ai/en/workflows/test/characterization-tests/)
- Prompting pattern: ask the agent to pin exact current behavior, including edge cases and apparent bugs, without fixing anything, then confirm the tests pass on the original code. — [thevibefather.com (search snippet)](https://thevibefather.com/blog/refactoring-legacy-code-with-ai)
- Emily Bache's AutomationSTAR 2025 tutorial "Get in Control of Legacy Code with Approval Testing" teaches recognizing when approval testing beats assertion-based testing and using a "printer" to focus what the test checks. — [AutomationSTAR 2025 (search snippet)](https://automation.eurostarsoftwaretesting.com/event/2025/get-in-control-of-legacy-code-with-approval-testing/)
- Bache's material describes approval testing as working "best on larger pieces of code" where failures are hard to interpret otherwise. — [OOP 2023 program (search snippet)](https://oop-konferenz.de/oop-2023/programm/konferenzprogramm/approval-testing-get-legacy-code-under-control)
- Böckeler recommends mutation testing to monitor regression-suite quality in agent workflows. — [Fowler site (fetched)](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html)
- Contract tests sit at service boundaries in the practical test pyramid. — [Practical Test Pyramid (canonical, not re-fetched)](https://martinfowler.com/articles/practical-test-pyramid.html)

### Inferences

- The "lock tests before the agent starts" idea parallels Farley's held-back tests and Anthropic's separate writer/implementer: the oracle must not be editable by the agent that is changing the behavior. A plugin can enforce this by freezing characterization or acceptance files during refactor tasks (e.g., via a hook that blocks edits to them).

### Gaps

- I found no 2024–2026 source on Pact or consumer-driven contract testing written or maintained by agents.
- I found no Emily Bache source on LLMs or approval tests.
- The arXiv 2511.02922 claim (AI made developers faster but not better at understanding code) is secondhand and unverified.

## 6. Writing acceptance criteria agents can turn into tests

### Takeaway

Structured, example-rich criteria are the common recommendation. Kiro, a spec-driven agentic IDE, uses EARS notation in `requirements.md` (WHEN … THE SYSTEM SHALL …) with a requirements.md / design.md / tasks.md split. Given/When/Then and concrete examples (Specification by Example) are the BDD alternative. Anthropic's guidance favors concrete example test cases in the prompt.

### Cited Findings

- Kiro specs consist of three files: requirements.md "in the form of user stories with acceptance criteria in EARS notation", design.md, and tasks.md. EARS form: "WHEN [condition/event] THE SYSTEM SHALL [expected behavior]". — [kiro.dev Specs concepts (search snippet)](https://kiro.dev/docs/specs/concepts)
- Sources disagree on the EARS pattern set Kiro uses: a community skill lists WHEN/WHILE/IF-THEN, and CodeMySpec lists five including Ubiquitous and Optional. Kiro is changing quickly. — [smithery kiro-specs (search snippet)](https://smithery.ai/skills/peterfile/kiro-specs); [CodeMySpec (search snippet)](https://codemyspec.com/blog/codemyspec-vs-kiro-specs); [Verdent guide (search snippet)](https://www.verdent.ai/guides/agents/kiro-spec-driven-development)
- Anthropic "Provide verification criteria" example: "write a validateEmail function. example test cases: <user@example.com> is true, invalid is false, <user@.com> is false. run the tests after implementing". — [Claude Code best practices (fetched)](https://code.claude.com/docs/en/best-practices)
- Farley (via summaries): worked examples become executable specifications in problem-specific DSLs, which is BDD applied to AI prompting. — [tessl.io outline (search snippet)](https://tessl.io/registry/ainativedev/aidevcon-2026-ldn/0.100.14/files/talk-farley-vibe-coding-best-we-can-do/outline.md)
- Playwright's planner produces human-readable Markdown specs (steps, expected outcomes, data) that the generator turns into tests, so a Markdown scenario list is the native handoff format. — [playwright.dev Test Agents (fetched)](https://playwright.dev/docs/test-agents)
- Community ATDD plugins for Claude Code enforce Given/When/Then before code. — [skills.sh atdd (search snippet)](https://www.skills.sh/maxmurr/agents-skills/atdd)

### Inferences

- For the plugin's design → tasks → implement flow: each acceptance criterion should carry (a) a structured trigger/response statement (EARS or Given/When/Then), (b) at least one concrete example with real values, and (c) the observable boundary where it is checked (UI, HTTP, CLI, function). Item (c) directly determines the test level.

### Gaps

- I found no study comparing EARS and Given/When/Then for LLM test-generation accuracy.
- Gojko Adzic 2024–2026 material on agents was not found within the search budget.
