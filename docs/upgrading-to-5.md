# Upgrading from wb 4 to wb 5

wb 5 is a substantial change. The stage chain is the same, and every stage does more: plans say what "done" means before any code is written, a separate agent writes every test, and each phase is checked three ways before you are asked to accept it. This guide says what changes for you, what to do with plans already in flight, and what to expect in time and cost.

The full list of changes, with their reasons and evidence, is the Unreleased section of [CHANGELOG.md](../CHANGELOG.md). The commands are described in [commands-reference.md](commands-reference.md).

## What 5 is for

In wb 4, a worker wrote the code and its tests, a verifier checked the task, and you checked the phase by hand. Three things went wrong often enough to fix:

- A test written by the code's author, after the code, tends to pass whatever the code does.
- "The tests pass" was the only automatic evidence that a phase worked, so everything else was a manual check.
- What was discussed before the build (a mockup, an edge case, how a part is called) reached the build only if someone happened to write it into the plan.

wb 5 answers each: tests come first, from someone else; the product is run at every checkpoint to show each criterion holding; and design asks a fixed set of questions and records where each answer lives.

## Before you upgrade

- **Claude Code** recent enough for plugin agents with pinned effort and, for `/wb:review_diff`, dynamic workflows. On a Pro plan, workflows are enabled in `/config`.
- **beads 1.1.0 or later**, as in wb 4.
- **Optional: the `wb-defects` plugin** (`claude plugin install wb-defects@gvarela-workbench`). The verifier and the test review plant small defects to show a test can fail. Without a defect runner those checks are reported as Not Run and judged by reading. It cannot be installed on claude.ai or in Cowork.
- **Expect more agents per task.** See [Time and cost](#time-and-cost).

## Upgrade steps

1. From your shell: `claude plugin update wb@gvarela-workbench`, then restart Claude Code or run `/reload-plugins`. A session that was already open keeps the skill text it loaded, so start a new session for real work.
2. Once per repository, run `/wb:testing-profile`. It drafts `.claude/wb/testing.md` (your test commands, levels, seams, and choices) and writes it only when you confirm. The stages work without it and guess less with it.
3. Replace `/wb:validate_execution <dir>` with `/wb:validate_phase <dir> all` in scripts, notes, and handoffs. The old name no longer resolves.
4. Decide what to do with plans in flight: see [Plans already in flight](#plans-already-in-flight).

## What changes, stage by stage

| Stage | wb 4 | wb 5 |
| ------- | ------ | ------ |
| `create_project` | Goal, success statements, non-goals | Each Intent line also records why it exists, whose words it is, and whether it is a hard limit or an aim. Asks once what is already designed or decided, and starts an Existing Material list in the README. |
| `create_research` | Facts about the code | Also a Testing Conventions section, and where the code does one thing two ways, both patterns and any stated rule about them. |
| `explore_design` | A discussion that records one decision | Says whether each decision is a product, technical, or program one, and records what it settled for each, so design does not ask again. |
| `create_design` | One discussion; a Functional Requirements checklist | Three passes (product, technical, program), each closed before the next. Acceptance criteria with real examples replace the checklist. See [Design](#design). |
| `create_tasks` | Phases and tasks | Also an outer-test step per criterion, harness tasks, and a Design Coverage table mapping every design item to a task or a stated deferral. |
| `implement` | Worker writes code and tests; verifier checks | `wb:test-writer` writes the tests first; the worker writes code only; the verifier checks the code and that the tests can fail. See [Implementation](#implementation). |
| Phase checkpoint | You check by hand | A prover runs the product, a phase verifier compares the phase with its plan, and a test reviewer reviews the tests. You check only what could not be proven. See [Checkpoints](#checkpoints). |
| `validate_execution` | Validation after the fact | Renamed `validate_phase <dir> [phase or all]`. It runs the checkpoint's agents on demand. The final checkpoint already writes the Intent verdicts, so this stage is optional. |

## Design

`/wb:create_design` is where most of the new questions are.

- **Three passes.** Product (the problem, what success is, what a person sees and does, what it must do, scope), technical (the approach, the architecture, what the examples leave out, what it relies on outside the repository, how it runs in production), and program (how new parts are called, where tests observe each criterion, which patterns to follow). It proposes which passes apply and you confirm. design.md records each as open, closed, or skipped, so you can stop after a pass and run the command again later, in a fresh session if you like.
- **Acceptance criteria.** One per changed behavior: Given, When, Then, a real example, where the result is observed, how it will be proven in the running product, what it guards against, and whether it is a hard limit or an aim. Each becomes one outer test.
- **What the examples leave out.** For each place a criterion is observed, design asks what input nobody showed, what happens when a step fails partway, and who else calls what changes. Each answer becomes a criterion, a case listed for your approval as left unhandled, or one that cannot happen.
- **Existing designs.** A mockup or a design handed to you, from wb or anywhere else, is found through the README's Existing Material list. For each screen the plan touches, you approve one scope list: built to the design, left out with reasons, and touched but not designed.
- **Conflicting guidance.** When a written rule and the existing code disagree, the rule wins for new code and the old code is left alone. When it is not that clear, you are asked once, and your answer can be saved as a guideline in `.claude/wb/profile.md`.
- **What approval covers.** Before you approve, a judge agent lists what the approval would otherwise pass in silence: anything stricter than your Intent, skipped passes, cases left unhandled, assumptions left unchecked. Your approval covers what is listed.

## Implementation

- **Tests first, from someone else.** `wb:test-writer` writes one outer test per criterion and commits it failing, as `red(AC-n): ...`, before the code that satisfies it. It also writes the task's own tests before the worker starts. Expect `red(...)` commits in your history.
- **Workers never edit tests.** A worker that needs another test stops and asks for one. `/wb:implement_inline` follows the same rule: the session writes code, and the test-writer writes tests.
- **A test on code that does not exist yet is still red.** No stub is written and nothing is asked. The verifier later shows the test's assertion can fail.
- **The verifier is stricter.** An undeclared test change, an outer test altered after its red commit, or a test that does not protect its criterion fails the task. It plants defects in a disposable copy to check.
- **Outer tests change on proof.** After its red commit, an outer test changes only through a rewrite task, and the change lands when the verifier shows nothing the original caught is lost.
- **Fewer stops.** Before a run would stop to ask you something, a judge agent decides whether it is yours to answer. A missing record is repaired; a test question inside stated limits is settled and listed for you with how to reverse it; a question about the product reaches you, written as what would go wrong and what the real choices are.
- **One phase per session** is recommended: the checkpoint report says so.

## Checkpoints

A checkpoint runs three agents in parallel, then reports:

- **`wb:prover`** runs the product at each criterion's boundary and marks each criterion and manual check as proven, disproven, or could not prove, with the commands and output.
- **`wb:phase-verifier`** reports planned changes that are missing, changes no task covers, and progress toward each Intent statement.
- **`wb:test-reviewer`** reviews the phase's tests.

What this means for you:

- **A checkpoint can hold.** A disproven criterion, an unexplained deviation, and a deterministic failure in a test the phase changed each need your answer by name: `fix: P1`, `accept: D2`, and so on. A general "go ahead" does not answer them.
- **You check less by hand.** "Left for you to check" lists only what the prover could not prove, each with its reason and steps.
- **"Decisions I made for you"** lists what was settled without asking, with the reply or command that reverses each.
- **Stubbed services.** Where the tests stub an outside service, the report lists what the service was assumed to accept. Carry that into the pull request.
- **Final verdicts.** The last phase's checkpoint writes a verdict beside each Intent statement in the README.

## New and removed commands

**New**

- `/wb:testing-profile`: draft `.claude/wb/testing.md`.
- `/wb:test-audit`: audit an existing test suite cold, with no plan. It states scope and a cost class before it spends anything.
- `/wb:review_diff`: review a branch cold before its pull request, for what no criterion names. It is a dynamic workflow of about nine agents, edits nothing, and runs only when you ask.
- `/wb:validate_phase`: the renamed `validate_execution`.
- `run unattended`, said in your own message to `implement` or `implement_inline`: the run continues through checkpoints that have nothing to decide and parks what needs you. Your next message ends it.

**Removed**

- `/wb:validate_execution` (renamed, no alias).
- The Functional Requirements checklist in design.md (replaced by Acceptance Criteria).
- Earlier 5.0 alphas only: `delegate: test upkeep`, `sanction: R1`, and approving a stub file. These replies no longer do anything.

**New agents**: `test-writer`, `test-reviewer`, `test-auditor`, `phase-verifier`, `prover`, `judge`, `diff-reviewer`.

## Files wb adds to your repository

| File | Written by | Purpose |
| ------ | ------------ | --------- |
| `.claude/wb/testing.md` | `/wb:testing-profile`, on your confirmation | Test commands, levels, seams, your choices, and how to run the product for proof |
| `.claude/wb/profile.md` | `/wb:create_design`, on your yes | Guidelines for when written rules and existing code disagree |
| README `## Existing Material` | `create_project`, extended by design and exploration | Where designs, mockups, and earlier decisions for the plan live |
| design.md `design_layers` | `create_design` | Which design passes are open, closed, or skipped |
| Comments on beads issues | every agent | Test-writer reports, worker reports, verification reports, defect ledgers, proof |

## Plans already in flight

A plan whose design.md has no Acceptance Criteria section was written before wb 5. It still runs:

- `implement` says the plan predates 5.0.0, writes no outer tests, and makes no `red(AC-n)` commits.
- Everything else applies: workers do not edit tests, the task's tests come from the test-writer, the verifier checks test integrity, and checkpoints run the three agents.
- Intent lines with no strength: one worded as a command (must, never, only) is treated as provisionally hard and put to you to confirm; others are aims.

To get outer tests on such a plan, add Acceptance Criteria to design.md by running `/wb:create_design` again, then `/wb:create_tasks`.

A design.md written on an earlier 5.0 alpha has no `design_layers`. It reads as before; the passes apply to designs written from now on.

## Time and cost

Measured on fifteen sessions across two projects on the 5.0 alphas:

- **A task takes about 11 minutes of agent time**: about 9 when verified once, about 23 when a test gap sends it round again, which happened to a third of tasks.
- **The task verifier is the largest share**, about half of agent time. It now runs at medium effort, which in blind trials caught the same seeded defects as high effort in a quarter to nearly half less time.
- **Each checkpoint runs three Opus agents**, roughly 5 to 10 minutes each, in parallel.
- **Each would-be stop consults a Fable judge**, about 3 minutes.
- **The coordinating session costs about as much as its agents.** A fresh session per phase keeps it down.

These are from Rails and Python work of mixed sizes, on alphas that changed during the period. Treat them as a guide to proportions, not a quote.

## The status band (optional)

The `wb-status` plugin is a separate, prototype mod that shows a plan's stage and progress above the prompt. In its current version it shows a plan only when the session pinned one with a `/wb:*` command or `/wb-status <dir>`, or when the session's branch or worktree is named for the plan; it shows the design passes while design is the current stage.

## Known limits

Parts of wb 5 have been run on fixtures and not yet on real work, or not at all. The consolidation plan's notes (`docs/plans/2026-11-13-consolidation/tasks.md`) keep the full list. The ones most likely to matter:

- The design passes have been driven by scripted answers, not yet by a person in an interview.
- `.claude/wb/profile.md` has been composed by the design stage and not yet written and read back by a later plan.
- `/wb:review_diff` has been run headless, where it needs read-only git allowed and the workflow pre-approved; its interactive launch is untested.
- The verifier at medium effort was tested on a small fixture. If pull request review starts finding weakened or skipped tests the verifier should have caught, set `effort: high` in `plugin/agents/task-verifier.md`.

## If something goes wrong

- **A checkpoint will not let you continue**: answer each numbered item by name. The report says which reply it expects.
- **"plan predates 5.0.0"**: expected for an older plan; see [Plans already in flight](#plans-already-in-flight).
- **Defect checks say Not Run**: install `wb-defects`, or name a recognized mutation tool in `.claude/wb/testing.md`.
- **A session behaves like wb 4**: it loaded its skills before the update. Start a new session.
