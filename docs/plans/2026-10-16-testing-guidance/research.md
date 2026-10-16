---
project: testing-guidance
ticket: null
created: 2026-10-16
created_timestamp: 2026-10-16T14:52:56Z
status: complete
last_updated: 2026-10-16
researcher: gabevarela
git_commit: 9020332a011a0519887c1cde76c9cd84a6e91c22
git_branch: testing-guidance
repository: gvarela/workbench
tags: [research, codebase, testing-guidance]
---

# Research: Testing Guidance

**Created**: 2026-10-16
**Last Updated**: 2026-10-16
**Ticket**: N/A

## Research Question

How does the shipped wb plugin handle tests today, across every stage?

1. How `create_design` writes success criteria
2. How `create_tasks` specifies tests and test levels
3. What `implement`, `implement_inline`, `task-worker`, and `tdd-discipline` tell agents about writing tests
4. What `task-verifier` and `validate_execution` check
5. How wb detects a target project's stack and test conventions
6. What hook infrastructure exists that could protect test files

The user added a seventh request: review recent wb sessions in sg-wholesale (Rails) and fitness-agent (Python), and evaluate the tests wb produced there against the external research and each stack's best practices. Research documents only what exists, so the evaluation lives in [test-audit.md](test-audit.md). This document carries only the factual observations from that audit that describe how wb behaves.

## Summary

All of wb's test guidance is prose in skills, agent definitions, and templates. No shipped code runs, inspects, or protects tests.

- **Writing rules.** `tdd-discipline` holds the red-green-refactor rules and is preloaded only into `task-worker`. `implement_inline` carries its own copy of the TDD text, a short test-quality list, and a "When to Skip TDD" section that contradicts tdd-discipline's "No exceptions".
- **Design and planning.** `create_design` writes measurable Success Metrics and checkbox Success Criteria, and explicitly excludes test-writing from design. `create_tasks` turns those into a Testing Strategy paragraph, per-phase "Testing Tasks" (unit and integration, which depend on the implementation tasks), and npm-flavored Automated Verification commands, informed by one test-coverage analysis agent.
- **What reaches the worker.** The worker receives the task's beads description, the phase's success criteria, and test commands taken from research.md and tasks.md. It reports tests added and the commands to run, but nothing about what its red run showed.
- **Verification.** `task-verifier` runs the worker-supplied test command, checks that the files changed are in scope with `git diff --stat`, and runs a build and a grep for leftover TODOs. Its boundary rule says "a minor issue with passing tests is not a FAIL". `validate_execution` runs `make`-style commands and a coverage agent.
- **Stack detection.** None. The test framework comes from research.md and the commands from tasks.md. No rspec or Gemfile reference exists anywhere in `plugin/`.
- **Hooks.** The only hooks are SessionStart/PreCompact orientation, a markdown-lint PostToolUse on Write/Edit, and a SessionEnd beads reminder. There is no PreToolUse hook, no Stop hook, and no Bash matcher.
- **Observed in practice.** In the audited sessions, workers made most file edits through Bash (heredocs, `sed -i`, `perl -pi`) rather than the Write/Edit tools. Verifier test-quality checks appeared mainly when the coordinator's per-task prompt asked for them.

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**:
  - "Acceptance criteria become tests, at a level chosen from where each criterion is observed": wb has no acceptance-criteria format and no test-level concept beyond the words "unit" and "integration" (sections 1–3).
  - "The task-verifier flags deleted, skipped, or weakened tests and expected values copied from the code": the verifier checks pass/fail, scope by `diff --stat`, and file existence for test tasks only (section 4). Observed Bash-based edits bear on how such a check could see changes (section 7).
  - "Test-quality and test-level guidance adapts to the target repository's stack": no stack detection exists, and examples are npm/Make/Go/pytest (section 5).
- **Statements the findings do not touch**: "Every guidance change traces to a finding in the external research, with its evidence strength recorded". This is a property of the design document, not of the existing codebase.

## Detailed Findings

### 1. Design: success criteria

**Location**: `plugin/skills/create_design/`

**What exists**:

- The template has "Success Metrics" bullets of the form `[Measurable outcome] (refines: "[Intent success statement]")`, plus a deferred list (`plugin/skills/create_design/templates.md:24-27`).
- It also has "Success Criteria" with Functional and Non-Functional checkbox lists (`templates.md:69-79`).
- Every Intent statement must map to a metric or be deferred with a reason (`SKILL.md:130-134`). BARRIER 4 enforces this (`SKILL.md:207`).
- "Test writing tasks (HOW to test it)" is listed under "NEVER PUT THESE HERE" (`SKILL.md:295`).
- The design sub-agents cover patterns, integration, and risk. None of them covers testing.
- A grep for acceptance criteria, Given/When/Then, "test level", and "test pyramid" across `plugin/` finds only `plugin/docs/reference/beads-mode.md:55` (`bd lint` expecting acceptance criteria) and `plugin/skills/verification-before-completion/SKILL.md:40` ("All acceptance criteria checked").

### 2. Tasks: how tests are specified

**Location**: `plugin/skills/create_tasks/`

**What exists**:

- **The test-coverage agent** (`sub-agent-prompts.md:32-53`) runs as `wb:codebase-analyzer` on sonnet. It reads the design's success criteria and risks plus research.md's test patterns, and determines four things: unit tests needed (with file:line), integration tests, edge cases, and fixtures. `SKILL.md:124-126` uses it to assess risk.
- **The tasks.md template**:
  - A one-paragraph "Testing Strategy" (`templates.md:38-39`).
  - Per-phase task groups: Setup, Implementation, Testing, Integration (`templates.md:106-132`).
  - The Testing Tasks block:

```markdown
- Write unit tests for [Component] at `tests/component.test.ts` → `[beads:phase1_test_1]`
  - Test [scenario 1 from agent]
  - Test [edge case from agent]
  - Test [error condition from agent]
- Write integration tests at `tests/integration/feature.test.ts` → `[beads:phase1_test_2]`
```

- Per-phase "Automated Verification" commands: `npm test src/component.test.ts`, `npm test:integration`, lint, typecheck, build. "Manual Verification" is taken from design.md (`templates.md:134-148`).
- "Test Files" and a "Quick test command for this phase" (`templates.md:159-166`).
- **Dependencies**: a test task depends on the implementation task it tests ("TASK3 tests the interface TASK2 defines", `SKILL.md:219-220`, `examples.md:66-82`).
- **Beads issues**: the description is a one-line scenario summary (`examples.md:43-48`). No acceptance-criteria field is passed to `bd create` (`SKILL.md:200-205`).
- **Task sizing**: test conversion is counted at 1–2 tool calls per file, and a task that runs too large splits as "source change, then test conversion" (`SKILL.md:403-414`).

### 3. Implementation: what workers are told

**Location**: `plugin/skills/implement/`, `plugin/agents/task-worker.md`, `plugin/skills/tdd-discipline/SKILL.md`, `plugin/skills/implement_inline/SKILL.md`

**What exists**:

- **Context package** (`implement/reference.md:5-55`):
  - `patterns.testingFramework` and `testFileLocation`, read from research.md
  - `design.successCriteria`
  - `testCommands.unit`, `specific`, and `coverage`, with placeholders `npm test | pytest | go test ./...`

  The tasks.md Testing Strategy and Automated Verification sections are not part of the package.
- **Worker prompt** (`implement/sub-agent-prompts.md:5-91`):
  - The task title and its `bd show` description.
  - Phase success criteria.
  - The RED step: "Write test that captures the requirement EXACTLY as specified", "NO additional test cases not specified in the task", run `${contextPackage.testCommands.specific}`, and "Confirm test fails for the RIGHT reason".
- **task-worker** (`plugin/agents/task-worker.md`):
  - It has `skills: [tdd-discipline]`, `effort: medium`, and `maxTurns: 60` (lines 5-7). RED is "exactly as the task specifies — no extra cases" (line 19).
  - Its report lists six items, including "tests added/modified" and "test commands to verify" (line 39). There is no field for the output of the red run.
  - Pre-existing bugs are reported, not fixed (lines 30-31).
- **tdd-discipline**:
  - The Iron Law, "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" (lines 13-25).
  - A correct failure "fails (not errors)", happens "because feature missing (not typos)", and has a failure message that matches expectation (lines 29-37).
  - A test that passes immediately means "Delete code. Start over" (lines 70-78).
  - "Must mock everything → Code too coupled. Refactor" (lines 88-94).
  - Nothing on test level, mocking policy, where expected values come from, or editing tests after red.
- **implement_inline**:
  - Its own TDD flow (`SKILL.md:62-82`, `219-262`).
  - Dedicated testing tasks: unit tests "mock external dependencies", integration tests "use real implementations where possible" (`SKILL.md:291-305`).
  - A test-quality list: behavior not implementation, one assertion where practical, descriptive names, Arrange-Act-Assert, design.md edge cases (`SKILL.md:481-487`).
  - "When to Skip TDD" for config, docs, refactors with existing tests, and build scripts (`SKILL.md:489-498`). The 2026-09-29 prompt audit records this as a tension with tdd-discipline (`docs/audits/2026-09-29-prompt-audit/C-implement.md:171-179`, finding F12).
- **review-prep** prints a non-blocking `⚠ TDD:` note when a source file changed but its test file did not (`plugin/skills/review-prep/SKILL.md:83-95`).

### 4. Verification

**Location**: `plugin/agents/task-verifier.md`, `plugin/skills/implement/SKILL.md`, `plugin/skills/validate_execution/`

**What exists**:

- **task-verifier** runs on `model: opus`, `effort: high`, with tools Bash, Read, Grep, and Glob (lines 1-7).
  - It runs the test command (lines 42-58; examples are npm only).
  - It checks scope with `git status --short` and `git diff --stat` (lines 60-77).
  - It runs a build and greps for TODO, FIXME, and `console.log` (lines 79-89).
  - Its responsibilities include "Check test coverage increased" (lines 11-28), and the criteria say "maintained or improved" (line 135). No coverage command is given.
  - Its report lists test files as "Expected (test file)" (line 112).
  - Its boundaries are: "Judge only what this task required… a minor issue with passing tests is not a FAIL" (line 161).
  - Special cases (lines 163-187): test-writing tasks need the file to exist, run, and not be skipped; bug fixes need a bug-specific test "if applicable".
  - No step checks that a test failed first, compares test-file contents against the base commit, or looks for skips added in the diff.
- **The coordinator handoff**:
  - The verifier receives the task, the test command (taken from `workerOutput.testCommand`), files changed, tests modified, and the worker summary (`implement/sub-agent-prompts.md:94-111`).
  - A report that lacks a clean `### Status: PASS` counts as a FAIL (`implement/SKILL.md:228-239`).
  - On a FAIL, one fix worker runs (fable, or opus if fable is unavailable), followed by a re-verify. A second FAIL goes on the checkpoint's blocking list (`SKILL.md:247-252`).
  - A plan defect goes to a Design revision issue instead (`reference.md:103-127`).
- **The phase checkpoint** runs `make test  # or npm test, go test ./..., pytest`, lint, typecheck, and build, then manual checks from design.md (`implement/SKILL.md:288-358`).
- **validate_execution**:
  - Four agents (`sub-agent-prompts.md`). One is "Verify test coverage" (general-purpose, sonnet, lines 27-44): specified tests exist, test the right scenarios, and pass.
  - Automated `make check|test|integration|build` (`SKILL.md:106-125`).
  - Per-Intent PASS/FAIL marks (`SKILL.md:159-173`).
  - A "Unit Tests: [X]% coverage" template line (`templates.md:62-65`).
- **verification-before-completion**: "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE". It is advisory prose, with `npm test` as its example (`SKILL.md:15-19`, `67`).

### 5. Stack and test-convention detection

**What exists**:

- No file in `plugin/` reads `Gemfile`, `package.json`, `pyproject.toml`, `go.mod`, or `Cargo.toml`.
- The framework and file layout are "extracted" from the project's research.md (`implement/SKILL.md:93`). The create_tasks coverage agent takes "Test frameworks in use" from research.md (`create_tasks/sub-agent-prompts.md:42`). Phase commands are "Adapt[ed] to actual commands from tasks.md" (`implement/SKILL.md:308`).
- Example commands and file names by location:

| Location | Examples |
| --- | --- |
| `agents/task-verifier.md:48,51,83` | npm |
| `create_tasks/templates.md:108,137-141,165,238-247` | npm, `.test.ts` |
| `implement/SKILL.md:309-312`, `implement_inline/SKILL.md:317-320` | make / npm / go / pytest |
| `implement/reference.md:16,40-42` | jest / pytest / go test |
| `validate_execution/SKILL.md:112-115` | make |
| `verification-before-completion/SKILL.md:67` | npm |
| `create_handoff/templates.md:68,200`, `resume_handoff/SKILL.md:266-269` | npm |

- There is no rspec, minitest, or Gemfile reference anywhere in `plugin/`.

### 6. Hooks

**Location**: `plugin/.claude-plugin/plugin.json:16-75` (there is no `hooks.json`)

| Event | Matcher | Script | Behavior |
| --- | --- | --- | --- |
| SessionStart | none | `hooks/wb-prime.sh` | Orientation and the active plan; recovery text on compact |
| PreCompact | none | `hooks/wb-prime.sh` | The same script; its output is not shown to the model |
| PostToolUse | `Write` | `scripts/lint-hook` | Runs markdownlint `--fix` on `.md` files only; always exits 0 |
| PostToolUse | `Edit` | `scripts/lint-hook` | The same |
| SessionEnd | none | `hooks/beads-drift-check.sh` | Reminds about `bd dolt push` when a remote is configured |

- Every hook uses `${CLAUDE_PLUGIN_ROOT}` and a 5s timeout. None inspects or blocks edits to source or test files.
- `lint-hook` reads `.tool_input.file_path` from the PostToolUse JSON (lines 11-16), so it sees only files written by the Write and Edit tools.

### 7. Observed wb behavior in two target repositories

These facts come from the audits in [test-audit.md](test-audit.md), which give the full citations.

- **Edit channel.**
  - In fitness-agent session fb2626db, workers made about 276 file edits through Bash heredocs or `sed -i`, against 15 Write/Edit calls.
  - In sg-wholesale, about 75% of spec edits went through Bash (heredocs, python `open().write`, `sed -i`, `perl -pi`).
- **What the red runs showed**:

| Workers | First result was an assertion failure | Load or import error only | Green first, or code before test |
| --- | --- | --- | --- |
| fitness-agent, 93 | 40 | 30 | 16 green first |
| sg-wholesale Oct 15, 69 | about 45 | 13 | 4 wrote code first |
| sg-wholesale glossary, 27 | 17 | 7 | 1 wrote code first |

- **Verifier outcomes**:
  - sg-wholesale Oct 15: 57 PASS / 7 FAIL. Glossary: 21 / 4 on first pass.
  - fitness-agent: fb2626db 38 / 8, dc5b14e1 54 / 4, 57a94b82 10 / 1.
  - Most test-quality observations in fitness-agent verifier reports were graded "minor", consistent with `task-verifier.md:161`.
  - Checks such as reverting the change to see the test fail again, or planting a mutant, appeared mostly when the coordinator's per-task prompt asked for them (about 14 of 64 sg-wholesale verifier prompts).
- **Plans shape test level.**
  - fitness-agent plans chose static or string-level UI tests with no browser harness (`fitness-agent docs/plans/2026-10-01-web-ui-ux/tasks.md:107-109`, `2026-10-15-ui-critique-fixes/tasks.md:137-145`).
  - sg-wholesale plans set an "instance_double for LLM, no VCR" policy (`sg-wholesale docs/plans/2026-10-09-agent-refresh/tasks.md:113-136`).
  - The chat-analytics plan placed Testing Tasks after implementation in each phase (`sg-wholesale docs/plans/2026-04-18-chat-analytics/tasks.md:210-213`).

## Architecture Documentation

**Current patterns found**:

- **Background guidance skills.** There are five `user-invocable: false` skills with minimal frontmatter, trigger-text descriptions starting "Use when…", and a single SKILL.md with no supporting files: tdd-discipline, verification-before-completion, status-sync, project-structure, and doc-adherence. They share a shape: an Iron Law code fence, a rationalizations table, and red flags.
  - Example: `plugin/skills/tdd-discipline/SKILL.md:13-25`
  - Example: `plugin/skills/verification-before-completion/SKILL.md:15-31`
- **Preloading.** Only `task-worker` preloads a skill (`skills: [tdd-discipline]`). `README.md:61-63` says background skills rarely auto-activate inside workflow sessions, so coordinated runs rely on the preload plus the verifier.
- **Reference docs.** There are three under `plugin/docs/reference/`: beads-mode, beads-not-initialized, and documentarian-philosophy. Skills link to them with relative links. None covers testing.
- **Per-skill supporting files** use fixed names: `templates.md`, `sub-agent-prompts.md`, `reference.md`, `examples.md`.

**Component connections**:

- design.md Success Criteria → create_tasks coverage agent → tasks.md Testing Tasks and Automated Verification
  - Entry: `create_tasks/SKILL.md:87-91`
  - Exit: `create_tasks/templates.md:120-148`
- tasks.md and research.md → context package → worker prompt
  - Entry: `implement/SKILL.md:93,163-165`
  - Exit: `implement/sub-agent-prompts.md:44-65`
- worker report → verifier
  - Entry: `implement/sub-agent-prompts.md:94-111`
  - Exit: `implement/SKILL.md:228-252`
- phase → checkpoint automated and manual checks (`implement/SKILL.md:288-358`) → `validate_execution`

**Conventions observed**:

- Workflow skills use snake_case; background skills and agents use kebab-case.
- Adding a skill or agent requires bumping `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` together.
- Under CLAUDE.md's drift rule, changing a stage's scope or intake also updates help, wb-prime, and the stage's "This stage needs from you" line.
- The plugin has no test suite or eval harness of its own. `docs/plans/2026-06-10-wb-eval-harness/` is planned and not started. The only executable checks are `plugin/scripts/lint` and `claude plugin validate`.

## Code References

- `plugin/skills/tdd-discipline/SKILL.md:13-94` - Iron Law, RED/GREEN/REFACTOR, red flags, "When Stuck"
- `plugin/agents/task-worker.md:5-7,19,39` - preload, the RED rule, the report fields
- `plugin/agents/task-verifier.md:11-28,42-89,135,161,163-187` - checks, coverage wording, boundary rule, special cases
- `plugin/skills/implement/sub-agent-prompts.md:5-125` - worker, verifier, and fix-worker prompts
- `plugin/skills/implement/reference.md:5-55,103-127` - context package; Plan-Defect protocol
- `plugin/skills/implement/SKILL.md:93,192,228-252,288-358` - framework extraction, task sizing, verdict parsing, checkpoint
- `plugin/skills/implement_inline/SKILL.md:291-305,481-498` - testing tasks, quality list, TDD exceptions
- `plugin/skills/create_tasks/sub-agent-prompts.md:32-53` - test-coverage agent
- `plugin/skills/create_tasks/templates.md:38-39,106-166` - Testing Strategy, Testing Tasks, Automated Verification
- `plugin/skills/create_design/templates.md:24-27,69-79`, `SKILL.md:295` - success metrics and criteria; tests excluded from design
- `plugin/skills/validate_execution/sub-agent-prompts.md:27-44`, `templates.md:62-65` - coverage agent and report
- `plugin/.claude-plugin/plugin.json:16-75` - hook registration
- `plugin/scripts/lint-hook:11-24` - the PostToolUse handler, markdown only

## Similar Implementations

**A blocking-capable hook does not exist. The closest is `plugin/scripts/lint-hook:11-24`**, which parses PostToolUse JSON:

```bash
# reads .tool_input.file_path with jq, falling back to grep/sed; acts only on *.md; always exit 0
```

**The closest existing check on test files is `plugin/skills/review-prep/SKILL.md:83-95`**, which compares changed source files to changed test files and prints a non-blocking warning.

**The closest existing test-quality prose is `plugin/skills/implement_inline/SKILL.md:481-487`** (the test-quality list). Workers under `/wb:implement` do not receive it.

## Open Questions

No questions block design. The facts above answer the research question. None filed in beads.

## Next Steps

1. Read [test-audit.md](test-audit.md), which evaluates the tests wb produced in the two repositories against [the external research](external-research/LLM%20test%20writing%20practices.md).
2. Design will need to know what Claude Code's current hook events can see of Bash-made file edits. That depends on the installed Claude Code version, not on this codebase.
3. Findings show multiple viable approaches. The candidates change different subsystems: verifier-only checks, a blocking hook, acceptance criteria in design.md that feed tasks, and a mutation gate in validate_execution. Consider `/wb:explore_design` to explore directions before `/wb:create_design`.
4. Run `/wb:create_design docs/plans/2026-10-16-testing-guidance`.
