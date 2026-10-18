# Prompt audit: phase5_impl_1 (implement reference and sub-agent prompts)

- **Task**: `prompts-z127`, update `plugin/skills/implement/reference.md` and `plugin/skills/implement/sub-agent-prompts.md` per tasks.md Phase 5 Changes Required 1 (design D3, D4)
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/implement/reference.md plugin/skills/implement/sub-agent-prompts.md`
- **Base commit**: `371c827` (the change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: the lines changed since HEAD (`git diff HEAD`) in the two files, read in the context of the whole files. Read alongside for contracts: `plugin/agents/test-writer.md`, `plugin/agents/task-worker.md`, `plugin/agents/task-verifier.md`. Read for Group 2 conflicts: `plugin/skills/implement/SKILL.md` (not edited; a later task updates it), `plugin/skills/test-quality/SKILL.md` (conventions order), `plugin/skills/create_design/templates.md` (criterion shape), `plugin/skills/create_tasks/templates.md` (Outer Test Steps).
- **Target models**:
  - reference.md and the surrounding text of sub-agent-prompts.md: the coordinator session, Claude Opus 5.5.
  - Worker Prompt Template: `wb:task-worker`, Claude Sonnet 5.5 default, effort medium.
  - Outer Test Prompt: `wb:test-writer`, Claude Sonnet 5.5, effort medium.
  - Verification Agent Prompt: `wb:task-verifier`, Claude Opus 5.5, effort high.
  - Fix Worker Prompt: `wb:task-worker` on Fable.
- **Surface type**: coding-agent configuration (skill reference files holding prompt templates). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: tasks.md Phase 5 Changes Required 1; design.md D3 (test-writer) and D4 (task-worker).
- **Load-bearing (keep-list)**: "follow your agent definition" in the worker template (D4, C-F16); `bd close` as the worker's last act (truncation detection); the Outer Test Prompt's "Do not commit" (test-writer:56); "no `model` parameter" on the verifier spawn; the pre-5.0.0 fallback's reason ("both protect the tests regardless of how the plan was written").
- **Provenance**: every changed line is this task's (uncommitted).

## Summary

The change carries Changes Required 1 and D4 faithfully: the worker template no longer restates RED/GREEN/REFACTOR, the Outer Test Prompt exists, and the verifier and fix-worker prompts carry the new inputs. Three contract gaps against the agents' Inputs lists remained. First, the criterion's text (its Given / When / Then lines) was in neither the context package nor the Outer Test Prompt, though test-writer's Inputs name it and its outer mode writes the test "from the criterion text and example only"; a Sonnet 5.5 test-writer would have written from the title and example alone. Second, the coordinator's outer-mode test-writer reports had no place in the package, so the worker could not pass "the task's earlier test-writer reports" in its RED request, and the verifier, whose `git diff <starting commit>` includes the red commits, had no report covering those test changes. Third, the verifier prompt sent "Worker Summary" where task-verifier's Step 1 names "Worker Report". All three are applied. `testCommands` also named only research.md, while the test-quality skill falls back to `.claude/wb/testing.md` when research has no Testing Conventions section, which is the normal case for a plan that predates 5.0.0.

Counts per group:

- Group 1 (dated prompt text): 0 high, 0 medium, 2 low
- Group 2 (brittle skill and configuration files): 3 high, 2 medium, 4 low, plus 8 SKILL.md flags for phase5_impl_2
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

## Specific checks

- **(a) Contracts**:
  - Outer Test Prompt against `test-writer.md:14-21`: caller (coordinator, outer mode), criterion id, example, observed-at, seam, target test file, and earlier reports were present; the criterion text was missing (finding 1, applied). "Do not commit: the coordinator commits the test as red(...)" matches test-writer:56 and design D3. The spawn line names `wb:test-writer`.
  - Worker template against `task-worker.md:14,19,34,40`: the RED request needs the criterion's id, text, example, observed-at, and seam "from your task and context package" (text now present via finding 1), the target test file (the worker picks it from patterns), and the task's earlier test-writer reports (now `outerTestReports`, finding 2). The never-edit-tests rule and item 7 live in the agent definition, which the template defers to; nothing in the template contradicts them.
  - Verification prompt against `task-verifier.md:40-50`: Task ID, Task Description, Files Changed, Test Command, Starting Commit, Red Commits, Criteria, and Test-writer Reports present; "Worker Summary" was misnamed (finding 3, applied); Test-writer Reports lacked the outer reports (finding 2, applied).
- **(b) Spec fidelity**: the worker template no longer restates RED/GREEN/REFACTOR (D4, C-F16). `testCommands` names the conventions source (finding 4 widens it to the test-quality order). The truncation playbook treats a committed `red(AC-n)` outer test as expected state (reference.md Remedy 1; check 12 passes). The pre-5.0.0 fallback keeps the no-test-edit rule and verifier integrity, and now uses the phrase "predates 5.0.0" that create_tasks and the later SKILL.md fallback use.
- **(c) Group 2 conflicts with SKILL.md**: recorded as flags S1-S8 below for phase5_impl_2. SKILL.md is not edited.
- **(d) Static checks**: neither file contains a literal `### Status: PASS|FAIL` (the verifier prompt's "Status: PASS or FAIL" has no heading marker and predates this task). Check 2 fails on `plugin/skills/implement/SKILL.md` only (S8). Checks 3, 12, and 13 pass. New text that names test-writer sits on lines without "spawn" or uses `wb:test-writer`.
- **(e) Project-agnostic**: no plan, fixture, task-key, or `prompts-` references. `AC-n` and `red(AC-n)` are the plugin's criterion and commit conventions (create_design/templates.md, create_tasks/templates.md).

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `reference.md:55-64`, `sub-agent-prompts.md:54-60` (before) against `test-writer.md:18,27`, `create_design/templates.md:74-82` | criteria entry had `id, title, example, observedAt, seam, redCommit`; prompt sent Criterion (id - title), Example | Group 2, contract narrower than its consumer's inputs | test-writer's Inputs name the criterion text, and outer mode writes "from the criterion text and example only". The text is the Given / When / Then lines; the title alone loses the starting state and action. Sonnet 5.5 works from what the brief names | High | `add` (applied): `text: "the criterion's Given / When / Then lines, verbatim"` in the package; `**Text**: ${criterion.text}` in the Outer Test Prompt. The worker receives it through `formatTaskTestContext` |
| 2 | `reference.md:48-74`, `sub-agent-prompts.md:87,104` (before) against `task-worker.md:19`, `task-verifier.md:50,111-117` | no field for the coordinator's outer-mode reports; verifier "Test-writer Reports: ${workerOutput.testWriterReports} (the worker's item 7, verbatim)" | Group 2, input with no source | The worker's RED request must carry "the task's earlier `wb:test-writer` reports", and the outer reports are the first of them. The verifier diffs from the starting commit, which precedes the red commits, so the outer test files appear in its diff; with only item 7, those changes match no report and read as undeclared | High | `add` (applied): `outerTestReports` in `taskTestContext` (empty when the outer tests came from an earlier task); verifier line now passes `${taskTestContext.outerTestReports} and ${workerOutput.testWriterReports}`; fix-worker prompt adds "Earlier Test-writer Reports: ${workerOutput.testWriterReports}" so its inner requests carry them too |
| 3 | `sub-agent-prompts.md:83` against `task-verifier.md:44` | "Worker Summary: ${workerOutput.summary}" vs "**Worker Report**: What the worker claims to have done" | Group 2, misnamed input | The line predates this task, but the verifier block is in this task's changed hunk and the caller asked for exact input names. Opus 5.5 would likely map it, but the template is used verbatim | High | `rewrite` (applied): "Worker Report: ${workerOutput.summary}" |
| 4 | `reference.md:38-39` (before) against `test-quality/SKILL.md:17-18` | "taken from the Testing Conventions section of research.md (the conventions source)" | Group 2, instruction files that disagree | test-quality, preloaded in test-writer and the verifier, falls back to `.claude/wb/testing.md` when research has no Testing Conventions section. A pre-5.0.0 plan's research usually has none, so the coordinator would find no source and guess | Medium | `rewrite` (applied): "taken from the conventions source the test-quality skill names (research.md's Testing Conventions section; .claude/wb/testing.md when research has none)"; the `conventions` comment now says "From the conventions source above" |
| 5 | `reference.md:90` (before) against `create_tasks/SKILL.md:92`, check 15 | "A plan written before 5.0.0" | Group 2, one rule worded two ways | create_tasks and the planned SKILL.md fallback say "predates 5.0.0"; the same condition under two wordings costs a reconcile, and check 15 greps the shared phrase | Medium | `rewrite` (applied): "A plan that predates 5.0.0 …", and the list of absent items now includes outer reports |
| 6 | `sub-agent-prompts.md:85` | "Red Commits: ${redCommits}" | Group 2, unsourced variable | `redCommits` is defined nowhere; the values live in `taskTestContext.criteria[].redCommit`. Low impact for an Opus coordinator, which can read them from the package | Low | `flag` (no edit): a later pass could point the parenthetical at `taskTestContext.criteria[].redCommit` |
| 7 | `sub-agent-prompts.md:46` | "once per criterion the task cites that has no outer test yet" | Group 2, unstated source | The target test file comes from the criterion's Outer Test Step ("Test file:") in tasks.md; the prompt does not say so. Opus 5.5 can find it | Low | `flag` (no edit) |
| 8 | `reference.md:16-17` | `testingFramework: "jest \| pytest \| go test \| ..."` | Group 2, volatile specifics | Predates this task; the same language-guessing that the `testCommands` change removed. Not in this task's hunks | Low | `flag` (no edit) |
| 9 | `task-worker.md:19` (agent, outside these files) | RED names "the criterion" | Group 2, gap under the fallback | Under a pre-5.0.0 plan there is no criterion to name in the inner request; test-writer has no stated input for a requirement-only brief. Fails safe (test-writer reports blocked or reframes) | Low | `flag`: for the agent files, not these |
| 10 | `sub-agent-prompts.md:39` | "The coordinator commits after verification, so leave the commit to it and make `bd close` your last act." | Group 1c, near-duplicate | Restates task-worker:22,36. It agrees with the definition and keeps the truncation contract visible at spawn time (keep-list 8, 10) | Low | `flag` (no edit) |
| 11 | `sub-agent-prompts.md:9` | "You are a focused implementation worker for a single task." | Group 1d, identity stub | Duplicates task-worker:10; a one-line role statement followed by real context (keep-list 9) | Low | `flag` (no edit) |
| 12 | `reference.md:111` | "do NOT skip this" | Group 1a, emphasis | Predates this task, carries its reason | Low | `flag` (no edit) |

## SKILL.md flags for phase5_impl_2

Conflicts between `plugin/skills/implement/SKILL.md` (as of `371c827`) and the updated reference and prompts. Not edited here.

- **S1** `SKILL.md:200`: the worker prompt is described as carrying "beads commands (`bd update [id] --claim`, `bd close [id]`), and the expected-output contract". The template now defers claim, process, constraints, and report format to `task-worker.md`; only `bd close` as the last act remains in the template.
- **S2** `SKILL.md:163-165`: Step 3 builds the context package once per phase and lists its contents without `taskTestContext`. reference.md now says `taskTestContext` is built per task, when the task is about to run; Step 5 has to build it (starting commit, criteria with text, red commits, outer reports, conventions).
- **S3** `SKILL.md:188-202`: Step 5 lacks the three planned steps (record `git rev-parse HEAD` as the starting commit; for each cited criterion with no outer test, spawn `wb:test-writer` with the Outer Test Prompt, re-run, confirm an assertion failure, commit `red(AC-n): <title>` with only the test; then spawn the worker). The outer reports must be kept as `outerTestReports`.
- **S4** Outer Test Steps are their own beads issues (`create_tasks/templates.md:116-121`, `[beads:phaseN_outer_n]`) and appear in `bd ready`. SKILL.md Step 5 spawns a task-worker for every ready task; it must route outer-test issues to the coordinator's test-writer path (and close them on the red commit), not to a worker, which may not edit tests.
- **S5** `SKILL.md:218-222`: "Collect worker output" omits item 7 (Test-writer reports), which the verifier and fix-worker prompts now consume.
- **S6** `SKILL.md:226`: the verifier spawn text says it "runs tests, checks scope adherence"; it should name the new inputs (starting commit, red commits, criteria, test-writer reports) and that integrity and protection findings are FAILs.
- **S7** `SKILL.md:247-252`: "first judge the failure type from the verifier report" should follow the verifier's `Cause:` label (task-verifier:194,229), per Changes Required 2.
- **S8** `SKILL.md:233-237`: the parse comment and code contain the literal `### Status: PASS` / `### Status: FAIL`, which is why static check 2 fails. Phase5_impl_2 needs to keep the FAIL-wins parse while satisfying check 2 (for example by building the marker string instead of quoting it).
- Also: `SKILL.md:18` lists sub-agent-prompts.md as "worker/verifier/fix-worker prompts"; add the Outer Test Prompt. The "predates 5.0.0" fallback (Changes Required 2) is not yet in SKILL.md; reference.md's section now uses the same phrase.

## Dispositions

- **1 (high)**: applied in both files. The callee's Inputs list governs.
- **2 (high)**: applied in both files: one new package field, the verifier line, and one fix-worker line. The keep-list items (close as last act, no `model` on the verifier) are untouched.
- **3 (high)**: applied. The agent definition's name governs.
- **4 (medium)**: applied. Follows the test-quality order; does not add a new source.
- **5 (medium)**: applied.
- **6-12 (low)**: recorded only; no edits.
- **S1-S8 and the two extra SKILL.md notes**: flags for phase5_impl_2; SKILL.md not edited.
- **Keep-list**: the worker template still defers to the agent definition without restating RED/GREEN/REFACTOR; the truncation sentence (check 12) and the absence of the old "NO additional test cases" line (check 13) are kept; no literal `### Status:` marker added.

## Re-run

- `NO_COLOR=1 bash docs/plans/2026-10-16-testing-guidance/validation/static-checks.sh`: checks 3, 12, 13, and 17 pass (17 failed only for this report before it existed). Check 15 now fails only on implement_inline, since reference.md carries "predates 5.0.0". Check 2 fails on `implement/SKILL.md` (S8); checks 4, 6, 11, and 15 fail on later-task work (test-auditor, implement_inline, validate_execution).
- `./plugin/scripts/lint` on both files and this report: all clean.
- `claude plugin validate ./plugin`: passed.
