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
4. **Report**, in this order, before any requested topic:

   ```
   📍 Plan: docs/plans/<dir> (others active: <list or none>)
   Documents: research.md <status>; design.md <status>; tasks.md <status>, phase <n>, <closed>/<total> tasks
   Beads: epic <id> <open/closed>; milestones: <phase: state, ...>; open planning issues: <Q:/Decide:/Validate: titles, or none>
   Next stage: /wb:<stage> — needs from you: <that stage's "You provide / You decide / You confirm" cells from the table below>
   Left undone by the previous stage: <gaps, or none>
   ```

   The next stage is the first in the chain whose document is missing or whose status is not `complete` (research), `ready`/`implementing` (design), or whose phase milestone is open (implementation), then validation. Gaps come from the evidence: success statements research's Intent Coverage lists as not touched; statements with no `(refines:)` metric and no `Deferred:` entry; metrics that refine nothing; statements without a verdict suffix after validation ran; open `Q:` or `Decide:` issues; a milestone whose tasks are all closed but that is still open.
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
/wb:implement          → Execute with workers (one per task, verified, escalated)
         ↓
/wb:implement_inline   → Same plan, coded inline by this session (TDD)
         ↓
/wb:validate_execution → Verify implementation matches plan
```

**Session Management:**

```
/wb:create_handoff    → Save context for later
/wb:resume_handoff    → Restore context and continue
/wb:update_status     → Sync status across all files
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
| `create_project` | the goal, what success looks like, non-goals (or prose that carries them); name, base directory, ticket | — | the intent as read back to you | README has an Intent section: a Goal, two to four success statements, non-goals; nothing was written before you confirmed |
| `create_research` | the research question, or confirmation of the one derived from the Goal; files to read first | whether to explore design (findings show more than one viable approach) | — | research.md's Intent Coverage lists every success statement in exactly one of its two lists; findings carry file:line references; a Testing Conventions section records frameworks, commands, and harness |
| `explore_design` | reactions to each direction as it is drafted | the direction, by explicit approval only | the framing of the decision space | a thoughts doc with a Synthesis section and a closed `Decide:` issue whose description starts with the Goal; a Goal change is a dated Amendments line in the README |
| `create_design` | the approach, when no decision record exists | the approach; the refined metrics; the acceptance criteria with their harness decisions | the recorded decision, when one exists | every Intent statement is refined by a metric marked `(refines:)` or listed as deferred with a reason; every acceptance criterion names the metric it refines; a Goal or Non-goal change has a `Decide:` record and an Amendments line |
| `create_tasks` | — | — | that the phases and checkpoints match how you want to review | tasks.md phases carry file:line targets and verification; the beads epic, milestones, and tasks exist and gate in order; every acceptance criterion has an outer-test step (or a manual check, where design chose manual), and implementation tasks cite the criteria they serve; Target State names the Intent-refining metrics |
| `implement` / `implement_inline` | the phase to run | escalation after a verified failure; what to do at a plan-defect halt | the phase report at each checkpoint, with the test review's findings (your go-ahead, acknowledging each blocking item by name) | every task in the phase is closed in beads, verified, one commit each; each cited criterion's outer test is committed as `red(AC-n)` before its code; the milestone closes only on your go-ahead, with each blocking item acknowledged |
| `validate_execution` | the manual checks only you can run | whether deviations stand | your reading of the verdict per statement | a report with a verdict per Intent statement, and the README statements carry `→ PASS`, `→ FAIL`, or `→ DEFERRED` with a date |
| `update_status` | — | any backward transition, with a reason | the proposed transitions | frontmatter status, phase, and counts match beads |
| `create_handoff` / `resume_handoff` | the reason for handing off; the handoff path when resuming | — | the resumption summary | the handoff carries decisions, discoveries, and next steps; resume ran the sanity check and `bd ready` shows the next task |
| `validate_project` | — | which findings to fix | — | every checklist item reported with a fix for each finding |
| `create_mockup` / mockup-iteration | the feature; keep, remove, and change feedback on each version | the open `UI Q:` questions | each version | `UI Q:` issues resolved before finalization; the mockup log records the decisions |
| `create_product_research` | the product question, or confirmation of the one derived from the Goal | — | — | research.md in product language answering the question with user-visible behaviors and Intent Coverage |
| `test-audit` | the scope: a plan directory, a path, or nothing for the whole repository | which findings to act on | the findings, by spot-check | a report with the conventions source, a verdict and evidence type on every finding, suite-level checks run or "not run" with a reason, and the statement that hollow reds and post-red edits cannot be checked cold; the audited repository is unchanged |
| `testing-profile` | whether you control the repository's tooling, an answer for each gap, and edits to the drafted profile | the team's Choices, Planned and Open items, and mutation level | the draft, before anything is written | `.claude/wb/testing.md` exists with the research headings plus Choices and Mutation, and Planned and Open when gaps produced them; one beads issue per adopted gap; nothing else changed |

## Beads Integration

Beads tracks work across sessions. Required for this workflow.

### Planning Phase (Questions & Decisions)

Beads helps ensure nothing falls through the cracks during planning:

| What to Track | When | Why |
| --------------- | ------ | ----- |
| `Q: [question]` | Research finds unknowns | Blocks design until answered |
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

Creates project structure with research.md, design.md, tasks.md.

### `/wb:create_research [directory]`

Spawns parallel agents to document codebase, including its testing conventions. Facts only, no opinions.

### `/wb:create_product_research [directory]`

Researches the codebase from the product perspective: features, user flows, user-visible behaviors, written in product language.

### `/wb:explore_design [directory]`

(optional) Facilitated architecture discussion between research and design. Invoke when research surfaced multiple viable approaches, the change is cross-cutting or introduces a new subsystem, or the choice is hard to reverse. Skip for small well-scoped fixes, single-approach research, or when create_design's built-in option step is proportionate. Records the decision as a closed `Decide:` issue plus a thoughts/ doc; create_design detects and formalizes it.

### `/wb:create_design [directory]`

Interactive design session. Captures WHAT and WHY, not HOW, including acceptance criteria (Given/When/Then with examples and where each is observed) and a harness decision per boundary. Formalizes a recorded decision when explore_design ran; generates options itself when not.

### `/wb:create_tasks [directory]`

Transforms design into phased plan. Writes one outer-test step per acceptance criterion not left to manual verification, a harness task wherever design chose to add a harness, and implementation tasks that cite the criteria they serve. Creates beads issues for tracking.

### `/wb:implement [directory] [phase|continue]`

The default execution path: coordinates fresh-context workers, one per task, each verified by a task-verifier; verified failures escalate once. Before a task's worker runs, the coordinator has `wb:test-writer` write the outer test for each criterion the task cites and commits it as `red(AC-n)`; workers never edit tests, and the verifier fails any test change no report declares. Each phase checkpoint adds a `wb:test-reviewer` review of the phase's tests. Deterministic failures in tests the phase changed block the checkpoint until you acknowledge each by name; other review findings are advisory. Claims and closes beads issues per task; one commit per verified task.

### `/wb:implement_inline [directory] [phase|continue]`

The same plan, coded inline by this session with TDD (Red → Green → Refactor); use when the work should run on the session model. The session never edits tests: `wb:test-writer` writes the outer test for each cited criterion, committed as `red(AC-n)` before its code, and every inner test. With no per-task verifier, each phase checkpoint's `wb:test-reviewer` review also checks test integrity across the phase. Deterministic failures in tests the phase changed block the checkpoint until you acknowledge each by name; other review findings are advisory.

### `/wb:validate_execution [directory]`

Verifies implementation matches plan. Run after completing work.

### `/wb:test-audit [scope]`

Audits an existing test suite cold, with no plan required, outside the stage chain. Detects the stack (or takes it from a plan's research or `.claude/wb/testing.md`), runs the project's own test-quality detectors with explicit rule selections, and spawns one `wb:test-auditor` per area in parallel. Writes a report of proposed Remove, Rewrite, and Consolidate verdicts with evidence for you to spot-check; it never edits or deletes tests and leaves the audited repository unchanged.

### `/wb:testing-profile`

Drafts `.claude/wb/testing.md` from the detected stack, adding Choices and a Mutation level (`off` or `advisory`). Compares the stack with the tooling the testing agents rely on and asks, for each gap, whether to adopt it (recorded as planned, with a beads issue filed after you confirm), record it as a choice, or decide later; if you do not control the repository's tooling, it offers only the last two. Writes only after you confirm; installs nothing.

### `/wb:validate_project [directory]`

Checks that a plan directory follows the wb workflow: required files, frontmatter, status transitions, beads tracking, stage ordering.

### `/wb:update_status [directory]`

Syncs status across all files. Uses beads as source of truth.

### `/wb:create_mockup [directory] [feature]`

Researches existing UI patterns, asks clarifying questions, creates versioned mockup. Use mockup-iteration skill to refine.

### `/wb:create_handoff [directory] [reason]`

Captures context for session transfer. Includes beads state. A phase that has already needed one `/compact` should hand off rather than compact again.

### `/wb:resume_handoff [handoff-file]`

Restores context from handoff. Syncs beads and continues work. A phase that has already needed one `/compact` should hand off rather than compact again.

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
