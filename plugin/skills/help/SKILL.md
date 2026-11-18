---
name: help
description: Reference for the wb workflow and, in a repository with an active plan, where you are and what's next: which documents exist and their status, epic and milestone state, open Q: and Decide: issues, what the next stage needs from you, and what the previous stage left undone. Use when the user asks where they are, what's next, what a stage needs, or how wb works. Takes an optional topic.
argument-hint: [topic]
---

# Workbench Help

This document is a reference for both the user AND Claude. When invoked:

1. **Establish state** (the State section) - which case you are in, and the position report if there is an active plan
2. **Read the topic** (if provided) - e.g., `/wb:help beads` means focus on beads section
3. **Explain** the relevant commands, workflow, or concepts conversationally
4. **Answer questions** - help the user understand how to use these tools effectively
5. **Guide Claude too** - this reference helps Claude understand the workflow it should follow

You are a helpful guide to this workflow system, not just dumping text.

## State

Run this first, before any topic. It decides which of three cases you are in.

1. **Find active plans**: `ls -t docs/plans/*/tasks.md`; a plan is active when its tasks.md frontmatter `status:` is not `complete` (the same scan `hooks/wb-prime.sh` runs at session start). No `docs/plans` directory or no active plan: **case A**.
2. **Pick the plan**: the one named in the request or the topic, else the newest active one; name the others in one line.
3. **Read the evidence** for that plan (read each file fully; do not answer from memory):
   - `README.md`: the `## Intent` section (Goal, "Success looks like" statements with any `→ PASS/FAIL/DEFERRED` suffix, Non-goals, Amendments). No `## Intent` section: **case B**. One present: **case C**.
   - `research.md`, `design.md`, `tasks.md`: the frontmatter `status:` of each; research's `## Intent Coverage` lists; design's Success Metrics with their `(refines: ...)` markers and `Deferred:` line; tasks.md's `current_phase`, `completed_tasks`, `total_tasks`, and `beads_epic`.
   - Beads, after the session-start sanity check from [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md) (`bd context`, `bd show <beads_epic>`, `bd stats`; stop with the Wrong database case if the epic does not resolve): `bd show <beads_epic>` for milestone state, and `bd list -n 0 --status=open | grep -E "Q:|Decide:|Validate:|UI Q:"` for open planning issues (count only titles that begin with the prefix).
   - Structural checks (files present, frontmatter fields, beads IDs resolve): reuse the "Validation Checklist" section of [../validate_project/SKILL.md](../validate_project/SKILL.md); do not restate it here, and do not run the full validation unless asked.
4. **Report**, in this order, before any requested topic, naming each item in plain words with its id in parentheses, as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says:

   ```
   📍 Plan: docs/plans/<dir> (others active: <list or none>)
   Documents: research.md <status>; design.md <status>; tasks.md <status>, phase <n>, <closed>/<total> tasks
   Beads: epic <title> (<id>) <open/closed>; milestones: <phase name: state, ...>; open planning issues: <Q:/Decide:/Validate: titles, each with its id in parentheses, or none>
   Next stage: /wb:<stage> — needs from you: <that stage's "You provide / You decide / You confirm" cells from the table below>
   Left undone by the previous stage: <gaps, each in plain words with what it puts at risk, or none>
   ```

   The next stage is the first in the chain whose document is missing or whose status is not `complete` (research), `ready`/`implementing` (design), or whose phase milestone is open (implementation), then `/wb:validate_phase <dir> all` when the README statements carry no verdict. Gaps come from the evidence: success statements research's Intent Coverage lists as not touched; statements with no `(refines:)` metric and no `Deferred:` entry; metrics that refine nothing; statements without a verdict suffix after the final checkpoint or validation ran; open `Q:` or `Decide:` issues; a milestone whose tasks are all closed but that is still open.
5. **The three cases**:
   - **Case A, no active plan**: print `No active plan here (no docs/plans, or every plan is complete).` and render the reference card (Topics and Command Workflow below, plus the requested topic).
   - **Case B, active plan without an Intent section**: print the position block with `Left undone by the previous stage: not measurable without an Intent section (plan predates 3.0.0)`, then the requested topic.
   - **Case C, active plan with an Intent section**: the full report, then the requested topic.

**Routing rule**: a question about what the plugin or a command does (for example "what does wb do", "what does create_design do") renders the topic; in a repository with an active plan, prefix it with the one-line `📍 Plan:` position only, not the whole report. "Where am I", "what's next", "what does the next stage need", or a bare `/wb:help` in a repository with an active plan produce the full report.

## Topics

```
/wb:help              # Overview of everything
/wb:help workflow     # Command sequence and when to use each
/wb:help beads        # Beads commands and integration
/wb:help mockup       # Mockup iteration workflow
/wb:help [command]    # Specific command (e.g., /wb:help create_design)
```

## Command Workflow

```
/wb:create_project    → Initialize project structure
         ↓
/wb:create_research   → Document what EXISTS (facts only)
         ↓
/wb:explore_design    → (optional) Explore architecture directions, record decision
         ↓
/wb:create_design     → Decide WHAT to build and WHY
         ↓
/wb:create_tasks  → Plan HOW to implement (creates beads issues)
         ↓
/wb:implement          → Execute with workers (one per task, verified, escalated); each checkpoint verifies the phase
                         (or /wb:implement_inline: the same plan, coded inline by this session, TDD)
         ↓
/wb:validate_phase     → (optional) Re-check a phase, or all phases plus the Intent verdicts, on demand
```

**Session Management:**

```
/wb:create_handoff    → Save context for later
/wb:resume_handoff    → Restore context, then name the command to run next
/wb:update_status     → Sync status across all files
/wb:validate_project  → Repair tool, not a stage: audit a plan directory when its documents look inconsistent
```

**UI Mockup Workflow:**

```
/wb:create_mockup     → Research UI patterns + create v001
[iterate with feedback] → Keep/remove/change decisions captured
[mockup-iteration skill] → Creates versioned mockups automatically
finalize              → Compile requirements into design.md
```

## What each stage needs from you

One row per stage. "Did enough" names the evidence the stage leaves behind; `/wb:help` reads it when you ask where you are.

| Stage | You provide | You decide | You confirm | How you know it did enough |
| ----- | ----------- | ---------- | ----------- | -------------------------- |
| `create_project` | the goal, what success looks like, non-goals (or prose that carries them); where any existing design or other material for the work is; name, base directory, ticket | which of those lines are hard limits rather than aims (asked once) | the intent as read back to you | README has an Intent section: a Goal, two to four success statements, non-goals, each with its why, source, review status, and strength; a line your reply did not address keeps its source and reads `reviewed: no`; nothing was written before you confirmed |
| `create_research` | the research question, or confirmation of the one derived from the Goal; files to read first | whether to explore design (findings show more than one viable approach) | — | research.md's Intent Coverage lists every success statement in exactly one of its two lists; findings carry file:line references; a Testing Conventions section records frameworks, commands, and harness |
| `explore_design` | reactions to each direction as it is drafted | the direction, by explicit approval only | the framing of the decision space | a thoughts doc with a Synthesis section and a closed `Decide:` issue whose description starts with the Goal; a Goal change is a dated Amendments line in the README |
| `create_design` | which design layers apply (it proposes, you confirm); answers to what each pass asks; the design scope (which screens are built to which design, what is left out, and how each undesigned gap is handled); the approach, when no decision record exists | the approach; the refined metrics; the acceptance criteria with how each will be proven and their harness decisions; each choice listed as tightening your intent (your approval covers only the listed ones); each case the design leaves unhandled; for each of this plan's open questions, an answer, an owner to defer it to, or a ruling that it is not this plan's question | the recorded decision, when one exists | every Intent statement is refined by a metric marked `(refines:)` or listed as deferred with a reason; every acceptance criterion names the metric it refines and carries its Guards against and Strength; every narrowing is marked `narrows:` and was listed for you; a Goal, Non-goal, or Success statement change has a `Decide:` record and an Amendments line; each of this plan's open `Q:` questions was put to you by name and is closed with your answer, deferred with its owner in design.md and on the issue, or marked not this plan's |
| `create_tasks` | — | each design item or metric no task delivers: add a task, defer it in design.md, or drop it from scope; each earlier plan's outer test the design's renames would break in a way that is not name only: change the design, or decide what that test should check | that the phases and checkpoints match how you want to review | tasks.md phases carry file:line targets and verification; its Design Coverage table maps every design.md scope item and metric to a task or a stated deferral; the beads epic, milestones, and tasks exist and gate in order; every acceptance criterion has an outer-test step (or a manual check, where design chose manual), and implementation tasks cite the criteria they serve; Target State names the Intent-refining metrics |
| `implement` / `implement_inline` | the phase to run; optionally `run unattended` in your own message, which lasts until your next message | an answer for each criterion the prover disproves by running the product (fix or accept) and for each unexplained deviation (accept, fix, or plan defect); a decision when a halt reaches you, which a judge agent sends only for a question about the product, an integrity finding, or a plan defect | the phase report at each checkpoint, after doing the checks the prover could not | every task in the phase is closed in beads, one commit each (under `implement`, each verified by a task-verifier); each cited criterion's outer test is committed as `red(AC-n)` before its code; each checkpoint carries a phase verification and a proof; every call made for you is recorded as `judged:` or `rewrite:` and listed in the report; the milestone closes only on your reply, with each disproven criterion and deviation answered; after the final phase, the README statements carry `→ PASS`, `→ FAIL`, or `→ DEFERRED` with a date; in unattended mode, a checkpoint passed without you carries a `checkpoint-auto:` record and its milestone stays open for your own checks, and everything left for you is in a `deferred:` ledger on its milestone |
| `validate_phase` | the phase to check, or all; the checks the prover could not do | an answer for each disproven criterion and each unexplained deviation | for all, your reading of the verdict per statement | a report with a phase verification and a proof per phase checked and a test review of the tests that range changed; for all, a verdict per Intent statement, and the README statements carry `→ PASS`, `→ FAIL`, or `→ DEFERRED` with a date |
| `update_status` | — | any backward transition, with a reason | the proposed transitions, unless every one moves forward and the update writes nothing to beads | frontmatter status, phase, and counts match beads |
| `create_handoff` / `resume_handoff` | the reason for handing off; the handoff path when resuming | — | the resumption summary, which ends with the command to run next | the handoff carries decisions, discoveries, and the next stage command; resume ran the sanity check, started no work, and `bd ready` shows the next task |
| `validate_project` (repair tool, not a stage) | — | which findings to fix | — | every checklist item reported with a fix for each finding |
| `create_mockup` / mockup-iteration | the feature; keep, remove, and change feedback on each version | the open `UI Q:` questions | each version | `UI Q:` issues resolved before finalization; the mockup log records the decisions |
| `create_product_research` | the product question, or confirmation of the one derived from the Goal | — | — | research.md in product language answering the question with user-visible behaviors and Intent Coverage |
| `test-audit` | the scope: a plan directory, a path, or nothing for the whole repository; optionally a depth (tests per area, or `full`; given alone, the audit covers the whole repository) | which findings to act on; on a large repository, whether to narrow the scope or depth or widen it to `full` | on a large repository, the scope, planned auditor spawns, and cost class, before any spawn; the findings, by spot-check | a report with the conventions source, the tests triaged out and how to expand, a verdict and evidence type on every finding, suite-level checks run or "not run" with a reason, and the statement that hollow reds and post-red edits cannot be checked cold; the audited repository is unchanged |
| `review_diff` (a workflow, not a stage) | optionally `base=`, `head=`, `plan=` (to sort findings by criterion), and `verify=` (how many findings to verify, 4 by default) | which confirmed findings to fix, accept, or file | the launch, which Claude Code asks you to confirm | a report of confirmed findings, findings that depend on something outside the repository, findings raised and not confirmed, and findings not verified; nothing in the repository changed |
| `testing-profile` | whether you control the repository's tooling, an answer for each gap, and edits to the drafted profile | the team's Choices, Planned and Open items, and mutation level | the draft, before anything is written | `.claude/wb/testing.md` exists with the research headings plus Choices and Mutation, and Planned and Open when gaps produced them; one beads issue per adopted gap; nothing else changed |

## Beads Integration

Beads tracks work across sessions. Required for this workflow.

### Planning Phase (Questions & Decisions)

Beads helps ensure nothing falls through the cracks during planning:

| What to Track | When | Why |
| --------------- | ------ | ----- |
| `Q: [question]` | Research finds unknowns | create_design puts it to you: answer, defer to a named owner, or not this plan's |
| `Decide: [choice]` | Design needs stakeholder input | Blocks execution until decided |
| `Validate: [assumption]` | Design assumes something | Must verify during implementation |
| `UI Q: [question]` | Mockup iteration raises issue | Blocks finalization |

```bash
# Before moving to next phase, check for blockers:
bd list -n 0 --status=open | grep -E "Q:|Decide:|Validate:|UI Q:"
```

**`Decide:` lifecycle**: an **open** `Decide:` issue is a pending decision (blocks as above); a **closed** one means the decision was made — chosen direction and rationale live in the close reason. Prefixes count only when the title BEGINS with them — mid-title mentions are ignored. `/wb:explore_design` creates and closes its record in one session; `/wb:create_design` finds it via:

```bash
bd list -n 0 --status=closed | grep "Decide:"
```

### Execution Phase (Phases & Tasks)

### Initialize (once per project)

```bash
bd init --stealth   # any repository with collaborators who do not use beads (see plugin/docs/reference/beads-mode.md)
```

### Execution Workflow

```bash
bd ready                              # Find available work
bd update [phase-id] --claim          # Claim it
# ... implement ...
bd close [phase-id] --reason "Done"   # Complete it
# push to the Dolt remote if one is configured (see plugin/docs/reference/beads-mode.md)
```

### Beads Slash Commands

Use these instead of CLI when working in Claude Code:

| Command | When to Use |
| --------- | ------------- |
| `/beads:ready` | Start of session - find available work |
| `/beads:list` | See all issues with filters |
| `/beads:show [id]` | Review issue details before starting |
| `/beads:create` | Create new issue (task, bug, feature, epic) |
| `/beads:update [id]` | Change status, priority, or assignee |
| `/beads:close [id]` | Mark issue complete |
| `/beads:blocked` | See what's stuck and why |
| `/beads:dep` | Manage dependencies between issues |
| `/beads:stats` | Project health and progress |
| `/beads:init` | First time setup in a project |
| `/beads:search` | Find issues by text |
| `/beads:epic` | Manage epics and their children |
| `/beads:reopen` | Reopen a closed issue |
| `/beads:comments` | Add notes to an issue |
| `/beads:compact` | Archive old closed issues |
| `/beads:workflow` | Show the full workflow guide |

### CLI vs Slash Commands

Both work: the CLI in a terminal or scripts (`bd ready`, `bd close prompts-abc --reason "Done"`), the slash commands in conversation (`/beads:ready`, `/beads:close prompts-abc`).

### Beads persistence

```bash
# Three tiers (see plugin/docs/reference/beads-mode.md)
# 1. Local: the embedded Dolt database under .beads/ is the source of truth; never committed
# 2. Cross-machine: a Dolt remote (bd dolt push / bd dolt pull) or bd backup (bd backup init <url>, bd backup sync)
# 3. Interchange: bd export writes issues.jsonl for viewers only (export.auto is off by default)
bd config get sync.remote    # a URL means a remote is configured; "not set" means local only
bd dolt push                 # end of session, only when a remote is configured
```

## Command Details

### `/wb:create_project [name] [directory] [ticket]`

Creates project structure with research.md, design.md, tasks.md. Records each Intent line with why it exists, its source (your words verbatim with the date, or "drafted from" where an agent wrote it), whether you reviewed it, and its strength, asking once which lines are hard limits rather than aims.

### `/wb:create_research [directory]`

Spawns parallel agents to document codebase, including its testing conventions. Facts only, no opinions.

### `/wb:create_product_research [directory]`

Researches the codebase from the product perspective: features, user flows, user-visible behaviors, written in product language.

### `/wb:explore_design [directory]`

(optional) Facilitated architecture discussion between research and design. Invoke when research surfaced multiple viable approaches, the change is cross-cutting or introduces a new subsystem, or the choice is hard to reverse. Skip for small well-scoped fixes, single-approach research, or when create_design's built-in option step is proportionate. Records the decision as a closed `Decide:` issue plus a thoughts/ doc; create_design detects and formalizes it.

### `/wb:create_design [directory]`

Interactive design session in three passes, each closed before the next: product (the problem, what success is, what a person sees and does, what it must do, scope), technical (the approach, the architecture, what the examples leave out, what it relies on outside the repository, how it runs in production), and program (the contract of anything one task builds and another calls, where tests observe each criterion, which patterns to follow). It reads the plan's existing material from the README's list, finds what the list lacks (wb mockups, or a design handed over as files or a link), and treats a design as the specification for the screens the plan touches: you approve one scope list of what is built to it, what is left out, and what has no design yet. It proposes which passes apply from your Intent and the research, and you confirm; a skipped pass is recorded with its reason. design.md records which passes are closed, so running the command again, in a fresh session if you like, resumes at the next one. Captures WHAT and WHY, not HOW, including acceptance criteria (Given/When/Then with examples, where each is observed, what it guards against, and its strength) and a harness decision per boundary. For each boundary it asks what the examples leave out (input nobody showed, a failure partway, other callers of what changes) and makes each answer a criterion, a case it leaves unhandled, or one that cannot happen. Lists every choice that tightens your intent (only or never, a fixed placement, a word list, an exact layout), quoted, for your approval; one it did not list is an aim, unless its source line is hard or it protects safety, data integrity, or honesty of evidence. Formalizes a recorded decision when explore_design ran; generates options itself when not. Puts each of this plan's open `Q:` questions and pending decisions to you by name before approval: answer it now, defer it to a named owner, or rule it not this plan's; it never defers one on its own.

### `/wb:create_tasks [directory]`

Transforms design into phased plan. Writes one outer-test step per acceptance criterion not left to manual verification, a harness task wherever design chose to add a harness, and implementation tasks that cite the criteria they serve. Finds each earlier plan's outer test the design's renames would break: a name-only one is planned as its own rewrite task, and any other is put to you. Creates beads issues for tracking.

### `/wb:implement [directory] [phase|continue]`

The default execution path. For each task, `wb:test-writer` writes the tests (the outer test for each cited criterion, committed as `red(AC-n)` before any code, then the task's own tests), a fresh-context worker writes the code and never edits a test, and `wb:task-verifier` checks the result: the tests pass, the change stays in scope, no test was bent to go green, and each test that claims to guard a criterion fails when the criterion is broken. A failed verification gets one automatic fix. Before the run stops for anything but a checkpoint, `wb:judge` reads the evidence itself: it repairs record-keeping gaps, settles calls about tests within stated limits (each recorded as `judged:` and listed under "Decisions I made for you"), and sends you only questions about the product, integrity findings, and plan defects, each put as what would go wrong. An outer test changes after its red commit only through a rewrite proven to lose nothing (recorded as `rewrite:`). Each phase checkpoint runs `wb:test-reviewer`, `wb:phase-verifier`, and `wb:prover`: the report shows each criterion as proven, disproven, or could not prove by running the product; a disproven criterion and an unexplained deviation wait for your answer by name; a test gap whose fix is tests only is closed without asking; and you are asked to check by hand only what the prover could not. The final checkpoint writes the Intent verdicts to the README. Naming `run unattended` in your own message, until your next message, lets a checkpoint with nothing to decide be recorded (a `checkpoint-auto:` record; the milestone stays open for your own checks) and the run go on; anything that is yours to decide stops the run or parks its task in a private commit, for your return. The run edits only what planned tasks name, and never takes your decisions, skips a verifier, pushes, deploys, or changes anything outside the plan. It suggests `/wb:testing-profile` when `.claude/wb/testing.md` is missing, and recommends a fresh session for each phase. The rules are `plugin/docs/reference/rules-and-intents.md`.

### `/wb:implement_inline [directory] [phase|continue]`

The same plan, coded inline by this session with TDD (Red → Green → Refactor); use when the work should run on the session model. The session never writes a test: `wb:test-writer` writes the outer test for each cited criterion, committed as `red(AC-n)` before its code, and the task's own tests. With no per-task verifier, the checkpoint's `wb:test-reviewer` review also checks test integrity across the phase. The judge, the proof rule for outer tests, the checkpoint's three agents, `run unattended`, and the final Intent verdicts work as in `/wb:implement`; on resume the session finishes any task an earlier session left in progress before taking new ones.

### `/wb:validate_phase <directory> [phase|all]`

Re-runs a checkpoint's checks on demand. With a phase number: `wb:phase-verifier` on that phase, a `wb:test-reviewer` review of its tests, and `wb:prover` running the product at each criterion's boundary. With `all` (the default once every phase milestone is closed; otherwise it asks which phase): a phase verifier per phase, a review of the tests the whole plan changed, a verdict per Intent statement written back to the README, and the deferred design questions still open. Automated verification runs once per run; judgment-only Remove or Rewrite proposals are settled by a majority of three independent readings.

### `/wb:test-audit [scope] [N | full]`

Audits an existing test suite cold, with no plan required, outside the stage chain. Detects the stack (or takes it from a plan's research or `.claude/wb/testing.md`), runs the project's own test-quality detectors with explicit rule selections, and triages: detectors and read-only heuristics rank tests by suspicion per area. It then states the scope, the planned auditor spawns, and a cost class; on a large repository (more than 30 planned spawns, which more than 10 areas always reach) it asks you to confirm, narrow, or widen the scope before spawning. One `wb:test-auditor` per area inspects the top-ranked tests (15 by default; `full` reads every test; a depth alone audits the whole repository), and the report says what was triaged out and how to expand. Writes a report of proposed Remove, Rewrite, and Consolidate verdicts with evidence for you to spot-check; it never edits or deletes tests and leaves the audited repository unchanged.

### `/wb:review_diff [base=<ref>] [head=<ref>] [plan=<dir>] [verify=<n>]`

Reviews a branch cold before its pull request, outside the stage chain. It is a dynamic workflow, not a skill: Claude Code asks you to confirm the launch, runs it in the background, and shows progress under `/workflows`. Four `wb:diff-reviewer` agents read the change without the plan, one lens each (input nobody showed, a failure partway, other callers of what changed, values and lists that no longer agree). Findings with one root cause are merged, and a skeptic checks each of the first `verify` findings: confirmed, not a defect, or one that fails as claimed only if something outside the repository holds (production data or permissions, a third party), which is listed for you to judge. With `plan=`, each confirmed finding is sorted: the criterion it breaks, a case the design left unhandled on purpose, or none. Nothing is edited; you decide what to fix, accept, or file. About nine agents with the defaults.

### `/wb:testing-profile`

Drafts `.claude/wb/testing.md` from the detected stack, adding Choices and a Mutation level (`off` or `advisory`). Compares the stack with the tooling the testing agents rely on and asks, for each gap, whether to adopt it (recorded as planned, with a beads issue filed after you confirm), record it as a choice, or decide later; if you do not control the repository's tooling, it offers only the last two. Writes only after you confirm; installs nothing.

### `/wb:validate_project [directory]`

A repair tool, not a stage: checks that a plan directory follows the wb workflow (required files, frontmatter, status transitions, beads tracking, stage ordering) when its documents look inconsistent or before resuming an old plan.

### `/wb:update_status [directory]`

Syncs status across all files. Uses beads as source of truth. Asks before writing, unless every transition moves forward and the update writes nothing to beads; never marks a plan complete while a milestone awaits manual checks after an unattended run.

### `/wb:create_mockup [directory] [feature]`

Researches existing UI patterns, asks clarifying questions, creates versioned mockup. Use mockup-iteration skill to refine.

### `/wb:create_handoff [directory] [reason]`

Captures context for session transfer. Includes beads state. `/wb:implement` and `/wb:implement_inline` offer it when a phase that has already needed one `/compact` heads for another; you decide whether to hand off.

### `/wb:resume_handoff [handoff-file]`

Restores context from handoff and checks beads state, then stops and names the stage command to run next (for example `/wb:implement <plan-dir> <phase>`); it does not start the work, because implementation must go through the stage skill that enforces its discipline.

## Core Principles

1. **Document, Don't Judge** - Research describes what IS, not what should change
2. **Explicit Barriers** - Stop at ⛔ BARRIER markers, wait for completion
3. **Zero Scope Creep** - Only implement what's in tasks.md
4. **TDD Discipline** - Red → Green → Refactor for each task
5. **Beads Required** - Phase tracking persists across sessions
6. **Compaction Recovery** - After `/compact`, the SessionStart(compact) hook re-anchors on the active plan docs; doc-content claims require a read in the current context window (doc-adherence skill)

## Quick Troubleshooting

**"beads not initialized"**

```bash
bd init --stealth   # or plain bd init only for a repository you own outright
```

**"issue not found"**

```bash
bd list              # Find correct ID
```

**"beads_phases missing in frontmatter"**

```bash
/wb:create_tasks [directory]   # Creates beads issues
```

**"database locked"**
Wait a moment and retry; parallel sessions share one embedded database, so a lock clears when the other session's command finishes. `bd context` shows which database is open; `bd doctor` runs only against a Dolt server in 1.1.0.

**Need markdown-only workflow?**
Use `v1.0.0` tag of this repo (before beads integration).
