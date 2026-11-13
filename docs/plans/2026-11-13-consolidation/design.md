---
project: consolidation
ticket: null
created: 2026-11-13
status: implementing
last_updated: 2026-11-13
designer: gabevarela
git_commit: 1ab9b7a
git_branch: 5.0-consolidation
repository: gvarela/workbench
tags: [design, consolidation, prover]
depends_on: research.md
design_approach: Mechanism over prose, three authorities, prove the product
---

# Design: 5.0 Consolidation

## Problem Statement

**Goal (README Intent)**: Make the 5.0 testing flow a process agents follow consistently, whose stops are the person's to make, and which proves the product meets its requirements.

The alpha's test rules work: sampled tests are sound and verification catches real defects on feature work (research.md, Session Findings). The process around them does not hold:

- Nothing runs the product. Every gate judges tests or diffs, and manual checks go to the person, who sent them back twice.
- Most stops ask the person about test internals. None was declined in two sessions.
- Record slips halt runs for hours.
- Instruction text is 2.4 times its 4.0.0 size and agents skip steps.

### Success Metrics

- **M1.** At a phase checkpoint, every acceptance criterion delivered so far has one proof state (proven, disproven, could not prove) with evidence a person can re-run, and the manual list holds only the could-not-prove items. (refines: "The system proves what it can before asking the person")
- **M2.** In a phase run on each of the two trial repositories, at most one stop that is not about the product reaches the person. Baseline: 3.5 to 5 stops per phase, nearly all about tests or records. (refines: "Stops that reach the person are about the product")
- **M3.** No halt is caused by a missing link, field, or record that a tool could have written. Baseline: two halts totalling 16 hours. (refines: "A record-keeping slip cannot halt a run")
- **M4.** Plugin instruction text, in characters, is below the alpha's 926,134 at release, and each agent definition and coordinator core is under a stated budget. (refines: "Agents get the context they need and no more")
- **M5.** The AC-5 blind-trial sets from the testing-guidance plan still score as they did at the alpha. (refines: "The integrity floor holds")

## Design Approach

Three principles, applied in order of evidence per unit of effort.

1. **Prove the product.** A separate agent runs each criterion at its boundary and reports what it saw. Tests stay the durable protection; proof is the acceptance evidence.
2. **Three authorities.** Scripts decide integrity. A judge agent decides test adequacy and rule friction inside stated limits. The person decides what the product should do.
3. **Mechanism over prose.** Steps that must always happen the same way move into a tool, and the prose that described them is deleted.

## Technical Decisions

### D1. `wb:prover` agent

- **What**: a new agent that, at each phase checkpoint, takes every acceptance criterion delivered so far in the plan and tries to show it holding in the running product.
  - It works from the criterion: its statement, example, Observed at, Seam, and Proven by line. It writes down what it expects to observe before it reads the implementation.
  - It exercises the product at the criterion's boundary through the product's own entry point (the command, the route, the page, the job), not by calling the test.
  - It also attempts each manual check the plan lists for the phase.
  - Each criterion and each manual check gets one state:
    - **proven**: the expected observation was seen. Evidence: the commands, the output that shows it, the commit.
    - **disproven**: the product ran and showed something else. Evidence as above, plus what a test would need to assert to catch it.
    - **could not prove**: the reason, and the exact steps for the person.
  - Each criterion also carries its test evidence: the red commit and assertion line from the outer-test step's close reason, and the outer test passing now.
- **Limits**: it edits no tracked file and no beads issue except its own report. It works locally: no production system, no deploy, no push, and no paid or side-effecting network call unless the testing profile's Proof section grants it. Data it creates goes in a local development or test store and is removed. It stops every process it started before it hands back.
- **Frontmatter**: `model: opus`, `effort: high`, `disallowedTools: Write, Edit, NotebookEdit, Agent`, no `tools:` list. Omitting `tools:` lets it inherit a browser tool when the session has one; the deny list keeps it from editing and from nesting.
- **Rationale**:
  - The defects that mattered were found by running the product (research.md, What verification caught).
  - The builder's account of its own work is a claim. A separate agent working from the criterion avoids proving what the code does instead of what was asked (the mirrored-oracle failure, one level up).
  - "Could not prove" as a normal outcome keeps the gate from stalling on what cannot be run locally, which is how the over-strict gates behaved before calibration.
- **Trade-offs**: one more Opus spawn per phase. Its judgment of "expected observation seen" can vary between runs; evidence that can be re-run bounds that.

### D2. Provability decided at design

- **What**:
  - Each acceptance criterion in `create_design`'s template gains a **Proven by** line: how the behavior can be shown in the running product (the command, request, or page and what to look for), or `manual: <reason>`.
  - The testing profile gains a **Proof** section: how to start the product locally, where it listens, how to put example data in place, and which side effects are allowed (paid calls default to no).
  - A plan whose criteria have no Proven by line still gets proved: the prover derives the route from Observed at and says so.
- **Rationale**: the person's manual list is known and small before implementation starts. The in-flight trial plans predate the line and must work unchanged.
- **Trade-offs**: one more line per criterion at design.

### D3. The checkpoint shows proof

- **What**: in `implement`, `implement_inline`, and `validate_phase`:
  - The prover is spawned with the test review and the phase verifier.
  - The checkpoint report's "Manual checks" section is replaced by **Proof**, one line per criterion with its state and evidence, and **Left for you to check**, holding only the could-not-prove items with their steps.
  - A disproven criterion holds the go-ahead. It is numbered P1, P2, … and put as what the person would see go wrong, with two choices: `fix: P1` (a task through the normal loop, whose test goes through `wb:test-writer`, so the finding is pinned) or `accept: P1` (ship with the gap recorded).
  - In unattended mode a disproven criterion goes on the `deferred:` ledger like any other decision.
- **Rationale**: the person can evaluate "here is the behavior running" where they could not evaluate test internals.
- **Trade-offs**: the checkpoint waits on a third agent.

### D4. The proof record

- **What**: the prover posts its report on the phase milestone as a `proof` record through `wb-records`, as the phase verifier posts `phase verification`. `wb-records` learns the name.
- **Rationale**: the coordinator wants green, so it relays the prover's words and never writes them.

### D5. Size discipline

- **What**: sizes are measured in characters. `agents/prover.md` stays under 10,000. Coordinator text added for the prover goes in `reference.md` as one section; SKILL.md gains only the spawn sentence and the report lines.
- **Rationale**: after compaction a skill is restored as its first 5,000 tokens only (Claude Code skills documentation), so SKILL.md growth pushes instructions past what survives.
- **Trade-offs**: this phase adds text overall. Later phases must remove more than they add (M4).

### Later phases (decided in outline; each gets its own design pass)

- **D6. Bookkeeping in the tool (Phase 2, built).** The record-keeping steps that halted runs become single commands in the existing `wb-records` helper, and the prose that described them goes.
  - **`wb-records put <issue> --file <path>`**: posts any text as one comment and reads it back in the same call, printing the comment id. task-worker, `wb:test-writer`, and the coordinator use it; each agent names that comment id in the block it returns, so "posted" is never a guess. It replaces a post command, a separate confirming read, and a rule never to hand back in the same turn.
  - **`wb-records have <issue> <comment-id>...`**: the coordinator checks the ids its agents returned in one call before the verifier runs. A missing report is posted from what the agent returned, or the agent is continued and asked for it. That is repair, not a stop.
  - **`wb-records file --from <issue> --title ... --escaped '...'`**: creates an issue with its `discovered-from` link and confirms the link, adding it once when it is missing. `wb-records link` does the same for an existing issue.
  - **A missing link is a record gap.** The task verifier no longer treats a rewrite task without the link as unsanctioned. It names the gap on a Record gaps line of its returned block, which never makes the verdict FAIL, and the coordinator repairs it with `wb-records link`. The sanction is judged by its line and the reply or delegation behind it.
  - **The tree fingerprint** covers an ignored directory over its size or file cap by each file's path, size, and modification time, and names it in `metadata_dirs`, instead of erroring.
  - **Why the existing helper and not a new `wb` command**: `wb-records` already posts and confirms by read-back, has a test suite with a stand-in for bd, and is covered by the permission rule the README gives for unattended runs. A `bin/` directory would put a command on the PATH, but a plugin with one cannot be installed on claude.ai or in Cowork.
  - **Not in this phase**: parking a task and continuing independent work at a verification cap in attended mode. It changes who decides at a stop, so it belongs with the judge (D8).
  - **Trade-offs**: the Record gaps line relies on the verifier classifying a gap correctly; a gap that does change a judgment about the tests, such as a test change with no report, stays an integrity finding. The metadata fingerprint does not catch a same-size rewrite that restores the old modification time.
- **D7. Proof in place of sanction.** An outer test may change when `wb:test-writer` makes the change, the criterion text is unchanged, and a differential run shows every original case still caught. Lost coverage and a change in a criterion's meaning stay the person's. The delegations collapse into this rule.
- **D8. Judge.** A Fable agent receives a script-built packet for every would-be stop and returns repaired, settled, halted, or a question for the person. It can order a re-check; it never clears a FAIL, waives integrity, or changes what a criterion means. Tested offline on the session stops before live use (the trial plan in `prompts-qhoh.7`).
- **D9. Graph and prompts.** The agent graph and the instruction text, changed together because each mechanism above deletes prose.
  - **Graph**:
    - Tests before the worker, with no nested spawns: the coordinator has `wb:test-writer` write a task's tests, then spawns the worker; a worker that needs another test returns "needs test" and the coordinator brokers it (`prompts-gdkf`). Nested spawns launch asynchronously whatever the worker asks, and a killed worker lost its unposted reports.
    - A narrower task verifier: the sanctioned-rewrite cases move to their own agent or playbook, since most tasks never reach them. Whether planted defects move from per task to per phase is decided by measuring which checks caught the production defects (research.md, Open Questions).
    - One coordinator session per phase, resumed from beads and the plan, so context does not reach 900K tokens and a session never runs a mixed plugin version.
  - **Context**:
    - A generated task brief: a script assembles each task's criterion text, seam, commands, and files into one record. Each agent reads the brief and its own role definition; no agent reads whole plan documents.
    - Rare branches become playbooks loaded when their trigger fires, not paragraphs every run carries.
  - **Prompts**:
    - Budgets in characters, checked by `validation/size.sh`: about 8,000 per agent definition and 15,000 for the coordinator core.
    - The coordinator's loop and checkpoint essentials come first in SKILL.md, because only a skill's first 5,000 tokens are restored after compaction.
    - The record types collapse to the few the tool writes.

### Where each review finding lands

| Finding (research.md) | Phase | Status |
| --- | --- | --- |
| Nothing runs the product; manual checks return to the system | 1 (D1 to D3) | Built |
| Record slips halt runs (missing link, a post that did not land) | 2 (D6) | Built: scripts tested; the verifier's Record gaps line is not yet exercised in a live run |
| The tree fingerprint errors on a large dependency directory | 2 (D6) | Built and tested; not yet run on the repository that showed it |
| At a verification cap the run halts and waits; in attended mode it could park the task and continue independent work | 4 (D8) | Moved: it changes who decides at a stop |
| Outer tests must stay byte-identical, so upkeep takes a third or more of worker runs | 3 (D7) | Outlined |
| Stops ask the person about test internals | 3 (D7) and 4 (D8) | Outlined |
| Criteria recorded as aims are still enforced literally by verifiers | 3 (D7) and 4 (D8) | Outlined here: the verifier reads a criterion's strength, and a literal-wording dispute on an aim goes to the judge |
| Design approval passes on silence; the hard-or-aim question goes unanswered | 4 (D8) | Outlined here: the judge runs once at design approval to list narrowings and unanswered questions |
| The judge needs a labeled replay set before live use | 4 (D8) | Outlined; the session stops and replies are the labels |
| Nested test-writer spawns are asynchronous; workers poll | 5 (D9) | Outlined |
| The task verifier is 53 to 60 percent of subagent tokens | 5 (D9) | Outlined; needs the measurement above |
| Instruction text is 2.4 times 4.0.0; steps are skipped; a skill is cut after compaction | 5 (D9) | Outlined |
| About 26 record types | 5 (D9) | Outlined; Phase 2 changed how records are posted, not how many there are |
| A session can run a mixed plugin version after a reload | Practice now, 5 (D9) | Each trial starts a fresh session; recorded in beads memory `wb-skill-loading-and-compaction` |
| No step reviews production code quality; no simplify step after green | Deferred (`prompts-qhoh.7`) | Not in this plan: each adds a mechanism |
| The Nov 12 checkpoint wording has not run in a fresh session | The person's trials | Open question in research.md |

## Scope

### In Scope (Phase 1)

- `plugin/agents/prover.md`; the `proof` record name in `wb-records`.
- The prover's spawn, report section, and decision form in `implement`, `implement_inline`, and `validate_phase`.
- The Proven by line in `create_design` and the Proof section in `/wb:testing-profile`.
- The drift bundle: help, wb-prime, intake lines, CLAUDE.md, README, CHANGELOG, commands reference.

### Out of Scope (Phase 1)

- D6 to D9.
- A simplify step and production code review.
- The version bump.

## Success Criteria

### Acceptance Criteria

Observed through a headless plugin run (`claude -p --plugin-dir`) against a fixture repository built by `validation/build-fixture.sh`.

- **AC-1 A criterion that holds is proven with evidence from the running product**
  - Given a fixture phase whose 28-day listing criterion is implemented and wired correctly
  - When `wb:prover` runs
  - Then that criterion's state is proven, and its evidence names a command that ran the product's own entry point and the output that shows the example
  - Example: `python -m rides list --today 2026-10-28` lists the 2026-10-01 ride and not the 2026-09-30 ride
  - Observed at: the prover's returned report
  - Refines: M1
- **AC-2 A criterion the product breaks is disproven even though its test passes**
  - Given a criterion whose outer test passes but whose entry point is wired past the fix
  - When `wb:prover` runs
  - Then that criterion's state is disproven, with the observed output and what a test would need to assert
  - Example: the test renders the page from a pre-filtered list and passes; `python -m rides page --today 2026-10-28` still shows the 2026-09-30 ride
  - Observed at: the prover's returned report
  - Refines: M1
- **AC-3 What cannot be run locally is reported as could not prove, with steps**
  - Given a criterion observed at a live external service the fixture has no credentials for
  - When `wb:prover` runs
  - Then its state is could not prove, with the reason and steps for the person, and no evidence is claimed for it
  - Example: "a sync stores new rides from the provider" with `RIDES_API_TOKEN` unset
  - Observed at: the prover's returned report
  - Refines: M1
- **AC-4 The prover leaves nothing behind**
  - Given any prover run
  - When it returns
  - Then `git status --porcelain` is unchanged from before, no test or source file differs, and no process it started is still running
  - Observed at: the fixture repository after the run
  - Refines: M5
- **AC-5 The report is posted and readable**
  - Given a prover run with a milestone id
  - When it returns
  - Then `wb-records read <milestone> proof` returns status `ok` with one state per criterion
  - Observed at: `wb-records` output in the fixture
  - Refines: M1
- **AC-6 The checkpoint shows the proof and a short manual list**
  - Given a phase completed under `/wb:implement` on the fixture plan
  - When the checkpoint report is printed
  - Then it has a Proof section with one line per criterion, a disproven criterion appears under Needs your decision as P1, and Left for you to check lists only could-not-prove items
  - Observed at: the coordinator's output in a headless run
  - Refines: M1, M2
- **AC-7 Plans written before the Proven by line still get proved**
  - Given a design.md whose criteria have no Proven by line
  - When `wb:prover` runs
  - Then each criterion still gets a state, and the report says the route was derived from Observed at
  - Observed at: the prover's returned report
  - Refines: M1

### Harness Decisions

| Boundary | Harness present? | Decision |
| --- | --- | --- |
| Headless plugin run on a fixture | The recipe exists (testing-guidance validation); its fixtures are untracked | Add harness: `validation/build-fixture.sh` builds a small Python repository with a finished phase, three criteria, and a beads milestone |
| `wb-records` | `tests/wb-records/run.sh` | Use as is |

## Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| The prover reports proven on thin evidence | High | Medium | Evidence must be a command and its output; AC-2 is the trap; the person's trials check real plans |
| It runs something it should not (paid call, shared data) | High | Low | Limits in D1; profile grants only; default is no |
| It leaves servers or data behind | Medium | Medium | AC-4; stop every started process before hand-back |
| Checkpoints get slower and costlier | Medium | High | One spawn per phase; measure tool calls and tokens in the trials |
| Coordinators skip the new step | Medium | Medium | Spawned in the same message as two agents the coordinator already spawns; AC-6 |

## References

- Research: [research.md](research.md)
- Predecessor: [testing-guidance design](../2026-10-16-testing-guidance/design.md) (D2 Harness Decisions, D8a, D11)
- `prompts-qhoh.7` (senior reviewer and consult mode), `prompts-gdkf` (coordinator brokers test-writers), `prompts-fuds` (strictness levels)
