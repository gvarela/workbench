# Prompt audit: phase5_impl_3 (implement_inline: test-writer for all tests, checkpoint test review, drift bundle)

- **Task**: `prompts-jbqm`, update `plugin/skills/implement_inline/{SKILL,templates}.md` per tasks.md Phase 5 Changes Required 3, with its drift bundle in `plugin/skills/help/SKILL.md` and `plugin/hooks/wb-prime.sh`, and the Implementation Notes integrity line in `plugin/skills/implement/templates.md`
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/skills/implement_inline/SKILL.md plugin/skills/implement_inline/templates.md plugin/skills/implement/templates.md plugin/skills/help/SKILL.md plugin/hooks/wb-prime.sh`
- **Base commit**: `943fda7` (the change is uncommitted in the testing-guidance worktree)

## Assumptions

- **Scope**: the lines changed since HEAD (`git diff HEAD`) in the five files, each read in the context of its whole file. `docs/beads-guide.md` also changed but is not prompt text and was not audited; its citations were refreshed for the line moves below. Read alongside for contracts: `plugin/agents/test-writer.md`, `plugin/agents/test-reviewer.md`, `plugin/skills/tdd-discipline/SKILL.md`, `plugin/skills/implement/SKILL.md` (the pattern), and static check 6 in `validation/static-checks.sh`.
- **Target model**: Claude Opus 5.5 for both skills, the templates, and the hook's orientation text (the session reads them).
- **Surface type**: coding-agent configuration. No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: tasks.md Phase 5 Changes Required 3; design.md D9; the two comments on `prompts-jbqm` (the audit gate, and the harness-mode note from `phase4_followup_1.md` finding 4).
- **Keep-list governs**: no `model` parameter on the reviewer spawns; `bd close` with the id; the "predates 5.0.0" phrase (check 15); no "named exceptions" or "exception list" phrase in implement_inline (check 6); the phase-checkpoint stop.
- **Provenance**: every changed line is this task's (uncommitted).

## Summary

The change carries Changes Required 3 and D9: the session hands every test to `wb:test-writer`, Step 4 "Handle Testing Tasks" and the test-quality list are gone, "When to Skip TDD" is a one-line pointer, the checkpoint runs `wb:test-reviewer` in inline mode with majority settling, and the "predates 5.0.0" fallback is present. The harness-mode concern from the bead comment is resolved: the inner-test spawn names "the inline session, inner mode" and says why harness proofs need inner mode, and test-writer's harness exception is written for "a caller", not only a task-worker.

Three medium gaps in the inline flow were found and applied. First, test-writer reports lived only in session context, so after a resume the reviewer's coverage-by-reports check, the inline flow's only check for undeclared test changes, would go to Not Run for the whole phase. Reports' key fields now go into the commit bodies and are recovered on resume. Second, an outer test step shows up in `bd ready` while the implementation task it blocks does not, and the skill did not say how to reach that task. Third, "confirm each new test fails" contradicted a harness proof, whose restored run passes by design. A fourth item, the per-task starting commit, had no reader in inline and was dropped.

Counts per group:

- Group 1 (dated prompt text): 0 findings in the changed lines
- Group 2 (brittle skill and configuration files): 4 medium, 5 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

## Specific checks

- **(a) Inline flow, one task**:
  - Phase starting commit: recorded in Step 2 before the phase's first task; Step 5 §3 passes it (Step 2); Resume Logic recovers it from `git log`, mirroring implement. Correct.
  - Task starting commit: recorded at item 1 "so the task's diff ... runs from it", but no step in inline reads a task diff (no verifier; the reviewer uses the phase range). Finding 1, applied: removed.
  - Routing to the outer step: finding 2, applied.
  - Outer-mode test-writer against `test-writer.md:14-28`: the spawn supplies the criterion's id, text, example, observed-at, and seam, the target file, earlier reports, and the caller with mode. The session re-runs and confirms an assertion red, commits only the test as `red(AC-n)`, and closes the outer step by id. Blocked or non-assertion goes to Handling Mismatches. Consistent.
  - Inner-mode tests and harness proofs: the caller string "the inline session, inner mode" maps onto test-writer's Inputs line, which names the mode beside the caller, so inner mode is unambiguous. The harness exception (`test-writer.md:38`) is addressed to "a caller", and the spawn supplies "the boundary and an existing behavior there" as it requires. Stub-on-load-error: test-writer reports blocked and leaves the stub to the caller (`test-writer.md:32`); the skill has the session add only the stub and ask for a re-run. Consistent. Item 4 "confirm each new test fails" contradicted the harness proof's passing restored run: finding 3, applied.
- **(a) Checkpoint**: the reviewer spawn passes starting commit, criteria with example, observed-at, and seam, red commits, test-writer reports, conventions, and mode `inline`, matching `test-reviewer.md:18-28`. Its step 5 (inline integrity) needs the red commits and the reports; both are supplied, and without reports it lists coverage-by-reports under Not Run (`test-reviewer.md:84`). Majority settling passes the Candidates input plus the cited criteria with examples, which `test-reviewer.md:31` needs to judge "from the test and its criterion". 2-of-3 becomes a finding as "n of 3", others go to "review these". Counts come from the reviewer's Integrity line into the template's Test review block and Step 6 Implementation Notes. Step renumbering (Step 4 verification, Step 5 checkpoint §1-§6, Step 6 status) agrees with every in-file reference and the templates' section headings.
- **(b) The three worker-raised concerns**: see Dispositions, items 1, 4, and L1.
- **(c) Spec fidelity**: Changes Required 3 bullets are all present. Step 4 "Handle Testing Tasks" removed; test-quality list removed; "When to Skip TDD" is one line; checkpoint spawns `wb:test-reviewer` (mode `inline`); fallback present; length 542, below 587. The spec says the pointer goes to "tdd-discipline's Named exceptions", but check 6 forbids that phrase in implement_inline; the line says "tdd-discipline's exceptions section" instead (L1). D9's "integrity is checked at the phase checkpoint ... across the whole phase diff" is the Step 5 §3 opening sentence. The bead's harness-mode comment is resolved as above.
- **(d) Drift bundle**:
  - help's shared `implement` / `implement_inline` row: intake "the phase to run"; review "the phase report at each checkpoint, with the test review's findings"; did-enough now says `red(AC-n)` for both skills. implement_inline's "This stage needs from you" (`SKILL.md:16`) and implement's (`implement/SKILL.md:25`) both name the phase, the checkpoint go-ahead, and the test review. Agree.
  - help's Command Details: implement and implement_inline both describe the outer test as `red(AC-n)` from `wb:test-writer` and the checkpoint `wb:test-reviewer`; inline adds that the review also checks integrity because there is no per-task verifier. Agree with D9.
  - wb-prime: the implement_inline stage line now names the same outer tests and checkpoint test review. The six-line summary is unchanged ("implementation: a go-ahead at each phase checkpoint") and did not grow.
- **(e) Project-agnostic**: added lines contain no plan, fixture, `prompts-` id, date, or label references. `phaseN_outer_n`, `AC-n`, `red(AC-n)`, and "predates 5.0.0" are plugin conventions shared with create_tasks and implement.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `implement_inline/SKILL.md:211` (before) | "Record the starting commit: `git rev-parse HEAD` ... so the task's diff, red commits included, runs from it." | Group 2, instruction no step reads (unenforced instruction) | In implement the task starting commit feeds the verifier's diff. Inline has no verifier, and the test reviewer uses the phase starting commit (Step 2). Nothing consumes the per-task value, so the step is a ritual the session will dutifully perform and then carry with no use | Medium | `remove`; renumber the RED items |
| 2 | `implement_inline/SKILL.md:212` (before) | "an outer test step ... is done inside the implementation task it blocks" | Group 2, step the beads contract cannot satisfy as written | The session finds work with `bd ready`. The outer step has no blockers, so `bd ready` lists it, while the implementation task it blocks is not ready. The skill did not say to take the blocked task; implement's item 1 does (`implement/SKILL.md:183`) | Medium | `rewrite`: "so when `bd ready` offers one, take that implementation task (`bd show` lists it) once its other open blockers are only outer test steps" |
| 3 | `implement_inline/SKILL.md:214` (before) | "Confirm each new test fails for the right reason." | Group 2, contradiction with an agent contract | A harness proof ends with its correct expectation restored and passing (`test-writer.md:38`); read literally, the line tells the session that a successful harness proof is a failure | Medium | `rewrite`: "Confirm each new test fails on an assertion; a harness proof instead shows its failing run and its passing restored run in the report." |
| 4 | `implement_inline/SKILL.md:212-213, 324, 442` (before) | "keep the report for the Step 5 review" / "Keep every report for the Step 5 review" | Group 2, state that does not survive the documented resume path | The reports lived only in session context. After `continue` (a new session or compaction), the reviewer gets none, and its coverage-by-reports check (`test-reviewer.md:84`), the inline flow's only check for undeclared test changes, goes to Not Run for the whole phase | Medium | `add`: copy each report's Files, Per changed test, and Changes to earlier tests fields into the body of the commit carrying its tests (red commit or task commit); Step 5 §3 and Resume Logic recover them from the phase's commit bodies |
| L1 | `implement_inline/SKILL.md:452` | "Only the work in tdd-discipline's exceptions section skips the RED step; anything else needs a failing test first." | Group 2, wording shaped around a static check | Reads as a natural pointer. tdd-discipline's heading is "Named exceptions"; check 6 forbids that phrase here so that implement_inline never grows its own list. "exceptions section" is unambiguous: tdd-discipline has one | Low | `flag`, no edit |
| L2 | `test-writer.md:21` (outside the audited files) | "who is calling: the coordinator (outer mode) or a task-worker (inner mode)" | Group 2, input list narrower than callers | The inline session is a third caller. The skill's caller strings name the mode, so the mapping works, but the agent's Inputs line does not list the inline session | Low | `flag`: file outside this task's scope |
| L3 | `implement_inline/SKILL.md:213` with `test-writer.md:18,34` | inner spawn for a plan that predates 5.0.0 | Group 2, input a legacy plan cannot supply | Inner mode restates briefs "from the criterion's example"; a legacy plan has no criteria. The same gap exists in implement; test-writer can still pin inputs and observable results from the task | Low | `flag` |
| L4 | `help/SKILL.md:106` (pre-existing cell) | "every task in the phase is closed in beads, verified, one commit each" | Group 2, shared row wording | The shared row says "verified"; inline has no per-task verifier, only its own test runs. Pre-existing, unchanged by this task | Low | `flag` |
| L5 | `implement_inline/SKILL.md:213` | inner spawn omits "the testing conventions for that boundary" that the outer spawn passes | Group 2, inconsistent inputs | test-writer preloads test-quality, which finds the conventions itself; the omission is harmless | Low | `flag` |

## Dispositions

- **Finding 1 (medium), applied.** Concern (b1) resolved by dropping the per-task starting commit: no inline step reads it, and the phase starting commit already covers the reviewer's range.
- **Finding 2 (medium), applied.** Item 1 now says how to reach the blocked implementation task from `bd ready`, mirroring implement's item 1. The new `bd ready` and `bd show` mentions on `SKILL.md:213` are added to `docs/beads-guide.md`.
- **Finding 3 (medium), applied.**
- **Finding 4 (medium), applied.** Concern (b2) resolved with the cheap recovery: the three report fields the reviewer's coverage-by-reports check matches against go into commit bodies (the red commit for an outer test, the task commit for inner tests), and a resumed session reads them back from `git log` since the phase starting commit. Commit subjects are unchanged, so `red(AC-n)` detection is unaffected. Without them, the reviewer lists the check under Not Run, as its contract already says.
- **L1 (low), recorded.** Concern (b3): the line reads as a natural pointer, not contorted, and keeps implement_inline free of its own list, which is check 6's intent.
- **L2-L5 (low), recorded only.**
- **Group 2 conflicts**: none between instruction files. implement_inline, implement, help, wb-prime, test-writer, test-reviewer, and tdd-discipline agree on who writes tests, the `red(AC-n)` commit, and the checkpoint review.
- **Length**: `implement_inline/SKILL.md` is 542 lines, below 587.
- **Citations**: the RED-block rewrite shifted every later line in `implement_inline/SKILL.md` by one; all implement_inline citations in `docs/beads-guide.md` were refreshed (update `--claim`, `close` both forms, `list` both forms, `show`, `ready`, `stats`, `config get` both keys, `dolt push`, `backup sync`, `export`, `remember`, `memories`).
