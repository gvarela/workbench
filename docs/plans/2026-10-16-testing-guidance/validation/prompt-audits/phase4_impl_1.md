# Prompt audit: phase4_impl_1 (wb:test-writer agent)

- **Task**: `prompts-i50b`, create `plugin/agents/test-writer.md` per tasks.md Phase 4 Changes Required 1 (design D3)
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/agents/test-writer.md`
- **Base commit**: `61e586b` (the file is new and untracked in the testing-guidance worktree)

## Assumptions

- **Scope**: `plugin/agents/test-writer.md`, all of it (new file). Read alongside for conflicts: its preloaded skill `plugin/skills/test-quality/SKILL.md`, and `plugin/skills/tdd-discipline/SKILL.md` (the red definition the agent restates instead of preloading).
- **Target model**: Claude Sonnet 5.5. The frontmatter pins `model: sonnet` and `effort: medium`.
- **Surface type**: coding-agent configuration (one subagent definition plus its preloaded skill). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: design.md D3 (test-writer), D4 (task-worker), D5 (tdd-discipline red definition), and the Data Model's test-writer report shape. Caller contracts: tasks.md Phase 4 Changes Required 2 (task-worker) and 3 (task-verifier).
- **Load-bearing (keep-list)**: the frontmatter as static check 4 reads it (`skills: [test-quality]`, `model: sonnet`, `effort: medium`, no `Agent` tool); the description's closing "Spawned by /wb:implement, /wb:implement_inline, and task-worker."; the reasons attached to each constraint ("so the test says what the user approved", "the caller owns both").
- **Provenance**: the file is untracked, so every line is this task's. tdd-discipline's red wording dates from Phase 2.

## Summary

The agent is plain in register and project-agnostic, and it carries every Data Model field. The highest-impact gap was a conflict with its own preloaded skill. test-quality tells its reader to record where testing conventions came from, and any drift, "in your report". The agent said "Return exactly these fields" and had no field for that. Sonnet 5.5 follows a closed field list literally, so the drift note would be dropped, and drift is the one thing test-quality says a person must decide. A **Conventions** field now carries it. Second, the rule that refuses edits to outer tests sat under Outer mode, but worker requests only arrive in inner mode. The agent also had no way to recognize an outer test. The rule moved to Inner mode and names the red commit as the identifier. Third, inner mode had no path for a load error. The test-writer cannot add the stub tdd-discipline prescribes, so it now reports "not red yet" and the worker adds the stub. Two smaller edits align the red wording with tdd-discipline ("missing-constant") and let the files field record deletions, which the verifier's coverage check needs.

Counts per group:

- Group 1 (dated prompt text): 0 high, 0 medium, 2 low
- Group 2 (brittle skill and configuration files): 1 high, 4 medium, 2 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 1 high, 4 medium, 4 low (flag).

## Specific checks

- **(a) Consistency with design**: D3's frontmatter matches exactly. The outer path matches D3: written from criterion text and example only, run, assertion failure reported, and the coordinator re-runs and commits. The inner path matches D3: write or update, run, report, push back on implementation-framed briefs, and never edit an outer test on request. The agent does not commit, which matches D3 and D4. All six Data Model fields are present: criterion id, files, per changed test (pins and break), red run command and output, changes to earlier tests with reasons, and pushback. Nothing is missing. The added **Mode** and **Status** fields are fine. Status is needed because both modes have a blocked outcome, and the outer-mode ImportError trap in Phase 5 validation requires one. Mode lets the verifier and coordinator tell outer reports from inner ones. The added **Conventions** field (finding 1) is required by the preloaded skill. D4 says only that the worker passes reports verbatim, and extra fields do not disturb that.
- **(b) Group 2 against tdd-discipline and test-quality**: tdd-discipline:33-36 reads "Red is an assertion failure on the intended behavior" and "A load, import, or missing-constant error is not red yet ... A test that never reached its assertion says nothing about the behavior." The agent's sentence matched except for "missing-name", now "missing-constant" (finding 2). tdd-discipline's remedy, adding a load stub, is production code, which the test-writer may not write; the inner-mode handoff (finding 4) resolves that without contradicting either file. The test-quality conflict is finding 1. The overlaps with test-quality (expected values from the example; doubles at the seam via the seam input; "the break it would catch") agree with it and are kept as working redundancy (keep-list 8).
- **(c) Callers**: the task-verifier (Changes Required 3) checks that every test-file change in `git diff <start>` is covered by a test-writer report. **Files created, changed, or deleted** now covers removals as well (finding 5). It also checks that outer tests are byte-identical to their red commit; the verifier checks that itself from git, and a declined request appears under **Pushback**, so the coordinator sees it. The task-worker (Changes Required 2) confirms the red is an assertion failure, which it can do from **Red run** and **Status**, and it carries reports verbatim. The coordinator (Phase 5) re-runs the outer test from the **Red run** command.
- **(d) Project-agnostic**: clean. A grep for AC labels, phase numbers, decision labels, fixtures, audited repositories, `prompts-` ids, and `validation/` finds nothing. The `red(<criterion id>): …` form is the plugin's own commit convention (create_tasks/templates.md:117), not a plan label.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `test-writer.md:41-50` (before) against `test-quality/SKILL.md:17-19` | "Return exactly these fields:" vs "mention the drift in your report"; "Say in your report that you inferred the conventions" | Group 2, instruction files that contradict each other | The preloaded skill always loads with the agent and requires a convention-source and drift note in the report. The closed field list leaves no place for it, and Sonnet 5.5 reads "exactly" literally, so the note would be dropped. Both files are in the project, and neither side is a prohibition or adds a command | High | `add` (applied): "**Conventions**: where the testing conventions came from and any drift you noted, as the test-quality skill asks" |
| 2 | `test-writer.md:12` against `tdd-discipline/SKILL.md:36`, design D5 | "A load, import, or missing-name error is not red yet" vs "A load, import, or missing-constant error is not red yet" | Group 2, restated rule whose wording disagrees | The agent restates the red definition instead of preloading tdd-discipline, which would tell it to delegate to itself. The two texts must agree. "Missing-name" is broader than the defined term and could be read as a different rule | Medium | `rewrite` (applied): "missing-constant" |
| 3 | `test-writer.md:29` (before) | "3. Outer tests are fixed once committed. If a worker asks you to change one, decline" | Group 2, rule placed where its trigger cannot occur | Outer mode is called only by the coordinator; a worker's request arrives in inner mode, where a reader working from the Inner section would not see the rule. The agent also had no way to tell an outer test from an inner one; its inputs carry no red commits | Medium | `move` + `rewrite` (applied): to Inner mode, as "Outer tests are fixed once committed; an outer test is one committed as its criterion's red commit (`red(<criterion id>): …`). If a worker asks you to change one, decline, …" |
| 4 | `test-writer.md:33` (before) | "run it, and report the red output" | Group 2, gap between a restated rule and its remedy | tdd-discipline's remedy for "not red yet" is to add only the stub needed to load, but that is production code, which this agent may not edit (line 52 before, :54 after). Inner mode gave no path for a load error, so the agent either reports a non-red as red or edits production code | Medium | `add` (applied): "If the run stops at a load, import, or missing-constant error, report it as not red yet (status blocked, with the output) rather than adding code yourself: the worker adds only the stub needed to load the code and asks for a re-run." **Red run** now reads "the assertion failure, or when blocked, whatever the run printed", so the outer-mode "report blocked with the output" also has a field to go in |
| 5 | `test-writer.md:45` (before) | "**Files created or changed**" | Group 2, contract narrower than its consumer's check | The task-verifier treats every test-file change in the diff, a deleted test included, as needing report coverage. A deletion made while updating earlier tests would be omitted from the report and then flagged as uncovered | Medium | `rewrite` (applied): "**Files created, changed, or deleted**" |
| 6 | `test-writer.md:16-21` | Inputs list has no test command or conventions | Group 2, possible under-specification | test-quality already says where conventions come from (research, then `.claude/wb/testing.md`, then existing tests). The caller prompts that would carry them are written in Phase 5 | Low | `flag`: when Phase 5 writes the test-writer brief, consider passing the task's testing conventions from the context package |
| 7 | `test-writer.md:25-28` | Numbered steps 1-2 in Outer mode | Group 1c, step choreography | Order does matter here (write, then run, then report), and there are two steps. Not cruft | Low | `flag` (no edit) |
| 8 | `test-writer.md:27`, `:34` | "the expected values come from the example"; implementation-framed brief paragraph | Group 1c / 2, duplication with test-quality Behavioral and Structure-insensitive items | The restatement is mode-specific and carries its reason, and it agrees with the skill. Keep-list 8 | Low | `flag` (no edit) |
| 9 | `test-writer.md:3` | "writes one red acceptance test per design criterion" | Group 3 split, trigger text | Each outer call handles one criterion. "Per design criterion" reads as the series of calls, not one call writing several tests. The description is trigger text and accurate | Low | `flag` (no edit) |

## Dispositions

- **1 (high)**: applied. This is the Group 2 conflict with test-quality. Direction: the preloaded skill governs, because it is the shared rubric for every test agent, and the agent's field list gained the field. No passage was weakened.
- **2 (medium)**: applied. The agent's wording now matches tdd-discipline:36 and design D5.
- **3 (medium)**: applied. The rule moved from Outer mode to Inner mode, with the red-commit identifier added.
- **4 (medium)**: applied. It resolves the remaining tension with tdd-discipline's stub remedy: the worker, which owns production code, adds the stub.
- **5 (medium)**: applied.
- **6-9 (low)**: recorded only; no edits.
- **Keep-list**: the frontmatter is unchanged (`tools: Read, Write, Edit, Grep, Glob, Bash`, no `Agent`; `model: sonnet`; `effort: medium`; `skills: [test-quality]`), and so is the description's "Spawned by" sentence. Every constraint keeps its stated reason.
