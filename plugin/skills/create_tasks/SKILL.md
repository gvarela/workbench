---
name: create_tasks
description: Turn an approved design.md into docs/plans/<project>/tasks.md: phased, executable tasks with file:line targets and verification, plus the beads epic, milestones, task issues, and dependencies. Use when design is approved and the user asks to plan the implementation, break the work down, create tasks, or set up beads for a project. Recommended on Fable. Takes the project directory.
argument-hint: [project-directory]
allowed-tools: Read
---

# Create Execution Plan

Transforms design decisions into a detailed, phased execution plan with embedded tasks. Focuses on HOW to implement what was designed.

## CRITICAL: This Document is About HOW - It Must NOT Contain

- **NO new scope** — every task derives from design.md; if something seems missing, STOP and surface it, do not add it
- **NO re-deciding WHAT or WHY** — design decisions are settled input; if one looks wrong, halt and send it back to `/wb:create_design`, don't quietly plan around it
- **NO invented requirements** — no extra hardening, edge cases, or "improvements" the design doesn't call for
- **NO research content** — reference research.md by file:line; don't restate or extend its findings
- **NO placeholders** — every task specific and executable (enforced at BARRIER 3)

Supporting files in this directory (read each when its step directs you to — never paraphrase from memory):

- [sub-agent-prompts.md](sub-agent-prompts.md) — verbatim Task() spawn prompts for the Step 2 analysis agents
- [templates.md](templates.md) — output document skeletons (tasks.md template, beads tracking blocks)
- [examples.md](examples.md) — illustrative bd command examples for Step 5

## Model Self-Check (do this FIRST)

The task bodies, phase boundaries, and dependency graph this skill writes are consumed by every worker, verifier, and checkpoint downstream — decomposition quality sets the ceiling for cheaper models. **Recommended: Fable at high effort. Minimum comfortable: Opus.**

Check which model this session is running. If it is below Opus, surface this:

```
⚠️ Model check: this session is running [model]. create_tasks writes the
specs that cheap workers execute — Fable is recommended (Opus as fallback
under usage limits). On lighter models, task bodies tend to be less
specific and dependency graphs tend to chain instead of branch.

Continue on [model], or restart this stage in a stronger session?
```

Do NOT block — if the user chooses to continue, proceed.

## Initial Response

This stage needs from you: confirmation that the phases and checkpoints match how you want to review the work.

When invoked, check for arguments:

1. **If directory provided** (e.g., `/create_tasks docs/plans/2025-01-08-my-project/`):
   - Use `$1` as the project directory
   - Read research.md, design.md, and tasks.md immediately
   - Begin execution planning

2. **If no arguments**:

   ```
   I'll help you create an execution plan from the approved design. Please provide:
   1. Path to the project documentation directory (e.g., docs/plans/2025-01-08-my-project/)

   I'll read the research and design documents to create a detailed implementation plan with tasks.
   ```

## Prerequisites

- **MUST** have research.md (validated)
- **MUST** have design.md (approved)
- Both documents should be in the specified project directory

## Process Steps

### Step 1: Read Foundation Documents

**⛔⛔⛔ BARRIER 1: STOP! Read ALL documents FULLY - research.md, design.md, tasks.md ⛔⛔⛔**

```javascript
const projectDir = $1 || /* prompt for it */;

// Read all project files
const researchFile = `${projectDir}/research.md`;
const designFile = `${projectDir}/design.md`;
const tasksFile = `${projectDir}/tasks.md`;
```

1. **Read research.md completely**:
   - Current implementation details
   - File locations and patterns
   - Constraints to respect
   - Knowledge gaps identified

2. **Read design.md completely**:
   - Design decisions made
   - Success criteria defined
   - Scope boundaries set
   - Technical specifications

3. **Read existing tasks.md if present**:
   - Check current status
   - Note any existing progress

**Decide HOW to bridge from current state to target state**

Synthesize research (current state) and design (target state) to determine the implementation path.
Remember: Now you're planning HOW to build what was designed.

### Step 2: Spawn Analysis Agents

**Leverage Claude Code's agent capabilities for implementation analysis:**

After reading all documents, spawn specialized agents in parallel:

**CRITICAL: Sub-agents are READ-ONLY. They gather information and return findings. They do NOT write files. YOU (the main agent) will write tasks.md after synthesizing their findings.**

Read the "Analysis Agent Prompts (Step 2)" section of [sub-agent-prompts.md](sub-agent-prompts.md) NOW and follow it exactly.

**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL agents - dependency, test, pattern agents ⛔⛔⛔**

### Step 3: Determine Implementation Strategy

**Decide the safest, most logical implementation sequence**

Based on the gap between current and target state, and agent findings:

1. **Identify dependencies** (from dependency agent):
   - What must be built first?
   - What can be done in parallel?
   - What requires prerequisites?

2. **Assess risk** (from test coverage agent):
   - What changes are highest risk?
   - What needs extra testing?

3. **Plan phases** (synthesize all findings):
   - Group related changes
   - Minimize risk per phase
   - Enable incremental validation
   - Follow patterns from similar implementations

### Step 4: Generate Execution Plan

Update or create tasks.md with the following structure:

Read the "tasks.md Document Template" section of [templates.md](templates.md) NOW and follow it exactly.

**⛔⛔⛔ BARRIER 3: STOP! Verify NO placeholder values - ALL tasks MUST be specific and executable ⛔⛔⛔**

### Step 5: Create Beads Issues

Create beads issues to track ALL work (phases AND granular tasks) across sessions.

**Critical**: Beads is the source of truth for status. Every task checkbox in tasks.md gets a corresponding beads issue.

#### 5a. Verify Beads is Initialized

```bash
bd info    # Check beads is working
```

If beads is not initialized, prompt user: "Run `bd init` to initialize beads tracking for this project."

#### 5a1. Beads Persistence

Persistence: see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md); nothing to detect. The local database is the source of truth; a Dolt remote or `bd backup` carries it across machines.

#### 5a2. Session-Start Sanity Check (re-runs only)

On a re-run, when tasks.md frontmatter already carries `beads_epic`: confirm the right database is open before doing any work (see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md)):

```bash
bd context            # resolved database name and beads dir
bd show [epic-id]     # the plan's epic; must resolve
bd stats              # total issue count
bd version            # requires bd 1.1.0 or later
```

If `bd show [epic-id]` fails, present the Wrong database case from [docs/reference/beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and stop. On a first run (no `beads_epic` yet) skip this check.

#### 5b. Create Epic for the Project

```bash
bd create "[Project Name] Implementation" \
  --type=epic \
  --priority=2 \
  -d "Implementation tracking for [project]. See tasks.md for detailed plan."
```

**Capture the epic ID** from the output (e.g., `Created prompts-abc`). You'll need it for task references.

#### 5c. Create Phase Milestone Issues

For each phase in the execution plan, create a milestone issue:

Read the "Phase Milestone Creation Examples (Step 5c)" section of [examples.md](examples.md) NOW and follow it exactly.

**Important**: Capture each ID as it's created. You'll need them for dependencies.

#### 5d. Create Task Issues for Each Task

**CRITICAL**: Create a beads issue for EVERY task checkbox in the execution plan.

For each task in each phase:

Read the "Task Creation Examples (Step 5d)" section of [examples.md](examples.md) NOW and follow it exactly.

**Task Creation Guidelines**:

- Title should match the task description from tasks.md
- Description includes phase, task type (setup/implementation/testing/integration), and key details
- All tasks start with priority 2 (medium)
- Use --type=task for all granular tasks

#### 5e. Set Up Task Dependencies

Link every task to its phase milestone (always), then add task-to-task edges ONLY for genuine prerequisites — an edge means "B cannot start until A lands", never "B was written after A":

```bash
# All Phase 1 tasks block the Phase 1 milestone (always)
bd dep add [PHASE1_MILESTONE_ID] [TASK1_ID]
bd dep add [PHASE1_MILESTONE_ID] [TASK2_ID]
bd dep add [PHASE1_MILESTONE_ID] [TASK3_ID]
bd dep add [PHASE1_MILESTONE_ID] [TASK4_ID]

# Task-to-task edges: only where the earlier task's OUTPUT is consumed
bd dep add [TASK2_ID] [TASK1_ID]   # TASK2 builds in the directory TASK1 creates
bd dep add [TASK3_ID] [TASK2_ID]   # TASK3 tests the interface TASK2 defines
bd dep add [TASK4_ID] [TASK1_ID]   # TASK4 also consumes TASK1's output — but is
                                   # independent of TASK2/TASK3, so no edge to them
```

The resulting graph should branch, not chain — independent tasks stay independent so `bd ready` shows real parallel width:

```
TASK1 ──► TASK2 ──► TASK3
   └────► TASK4              (ready as soon as TASK1 closes)
```

**Dependency Principles**:

- For each task, ask: "which task's OUTPUT does this consume?" (code it creates, a schema it changes, an interface it defines). Those tasks — and only those — are its dependencies
- The test is concrete: name the artifact of A that B consumes. If you cannot name one, there is no edge
- Listing order alone NEVER creates an edge — a near-linear chain over 4+ tasks is a signal you encoded authoring order, not data flow; re-examine it
- **File-overlap exception**: two data-independent tasks that modify the same file will collide if drawn in parallel — pick an order, add the edge, and say in the dependent task's description that it serializes file access (so a future planner doesn't mistake it for data flow)
- **Structure-before-behavior exception**: when a phase includes a structural task (pure refactoring/moving, no behavior change), every behavioral task in that phase takes an edge to it — the tidying lands first, behavior builds on the tidied code
- Phase milestone depends on ALL phase tasks
- Next phase milestone depends on previous phase milestone

**Tip**: Use parallel task creation for efficiency:

- Spawn multiple `bd create` commands using parallel agents
- Capture all IDs, then set up dependencies in a second pass

**Important**: Capture ALL task IDs. You'll need them for frontmatter tracking.

#### 5f. Update tasks.md with Issue References

Add beads tracking to tasks.md frontmatter for ALL issues:

Read the "Frontmatter Tracking Block (Step 5f)" section of [templates.md](templates.md) NOW and follow it exactly.

**Frontmatter Guidelines**:

- Use descriptive keys that match the task structure
- Format: `phaseN_category_number` (e.g., `phase1_setup_1`, `phase2_impl_3`)
- Keep the same order as tasks appear in the plan
- This enables easy lookup: "What's the beads ID for Phase 2 implementation task 1?"

Add a quick reference section with key commands:

Read the "Beads Issue Tracking Section (Step 5f)" section of [templates.md](templates.md) NOW and follow it exactly.

### Step 6: Validate Completeness

Verify with agent findings:

1. **All success criteria** from design.md have corresponding tasks
2. **All scope items** from design.md are addressed
3. **Knowledge gaps** from research.md are handled
4. **Risk mitigations** from design.md are incorporated
5. **Every task is specific and executable**
6. **Test coverage** matches test agent recommendations
7. **Dependencies** follow agent-identified order

### Step 7: Present the Plan

```
✅ Execution plan created at: [path]/tasks.md

Implementation structure:
- Phase 1: [Name] - [X] tasks
- Phase 2: [Name] - [Y] tasks
- Phase 3: [Name] - [Z] tasks

Total tasks: [total count]

Agent findings incorporated:
- Dependency order: [key dependency from agent]
- Test coverage: [X] unit tests, [Y] integration tests
- Similar patterns: [reference to pattern agent findings]

Beads tracking:
- Epic: [epic-id]
- Phase milestone issues created with dependencies
- ALL granular tasks created as beads issues
- Task dependencies set up (setup → impl → test → integration)
- Use `bd ready` to find available work
- Total beads issues: [count] ([X] phase milestones + [Y] granular tasks)

Key features of the plan:
- Clear implementation sequence based on dependency analysis
- Specific code changes with before/after context
- Comprehensive test coverage from agent analysis
- Automated and manual verification per phase
- Quick test commands to avoid running full suite
- Complete beads integration for ALL task tracking (no markdown checkboxes)
- Survives session boundaries and context compaction

Next steps:
1. Review the execution plan in tasks.md (documentation)
2. Run `bd ready` to see available work (first tasks with no dependencies)
3. Run `/implement` to begin coordinated implementation (`/implement_inline` to run it in this session)
4. Track ALL progress with beads (`bd update [id] --claim`, `bd close [id]`)
5. Never use markdown checkboxes for status - beads is source of truth
```

## Important Guidelines

### Execution Planning Principles

1. **Bridge Current to Target**:
   - Start from research (current state)
   - End at design (target state)
   - Plan the transformation path

2. **Phase by Risk and Dependencies**:
   - Use agent findings to order phases
   - Riskiest changes early (fail fast)
   - Dependencies before dependents
   - Infrastructure before features

3. **Make Tasks Executable**:
   - Specific file and line references
   - Exact code to add/change
   - Clear test scenarios from agent
   - Runnable commands

4. **Enable Incremental Progress**:
   - Each phase independently valuable
   - Checkpoints prevent cascading issues

### What Belongs in Execution vs Design

**Execution (THIS document)**:

- ✅ Phase sequencing and dependencies
- ✅ Specific code changes
- ✅ File modifications with line numbers
- ✅ Test writing tasks
- ✅ Command sequences

**Design (design.md)**:

- ❌ Architecture decisions (already made)
- ❌ Success criteria (reference them)
- ❌ Scope decisions (already defined)
- ❌ Technical approach (already chosen)

### Handling Implementation Discoveries

Some things can only be determined during coding:

1. **Document in "Implementation Discoveries"**:
   - Note what needs investigation
   - Update with findings as discovered
   - Adjust tasks if needed

2. **Don't Block on Unknowns**:
   - Make reasonable assumptions
   - Plan to test and adjust
   - Document the uncertainty

3. **Update During Implementation**:
   - Add discovered constraints
   - Note performance findings
   - Record configuration needs

### Leveraging Agent Findings

Use agent findings throughout execution plan:

1. **Dependencies**: Order phases based on dependency agent analysis
2. **Testing**: Incorporate test coverage agent recommendations
3. **Patterns**: Reference similar implementations found by pattern agent
4. **Risk mitigation**: Address risks identified by agents

## Task Granularity

Tasks should be:

- **Specific**: "Create PaymentRetry class at src/retry/PaymentRetry.ts"
- **Sized**: 1-4 hours of work typically, AND within a delegated worker's tool-call budget (see below)
- **Testable**: Clear completion criteria
- **Independent**: Minimal blocking between tasks

### Tool-Call Budget

Wall-clock time does not predict whether a task fits a single delegated worker; tool calls do. A one-hour task touching 3 files is ~20 calls; a one-hour task touching 12 files is ~80. Subagents hard-stop when they exhaust their tool-call budget (observed near ~70 calls — measured evidence, not a guaranteed constant), and truncation always eats the finishing tail: the last test conversions, the verification runs, the issue close.

Project each task's cost with rough arithmetic:

| Step | Calls |
| --- | --- |
| Read the files the task must not break | 4-8 |
| Discovery (finding affected tests/callers) | 3-6 |
| Write source changes | 4-10 |
| Convert/update N test files | 1-2 each |
| Run the suite (RED, GREEN, after refactor, final) | 3-5 |
| Lint, verification, close the issue | 3-5 |

**A task projecting past ~50 calls should be split at its natural seam** — usually source change, then test conversion, which are separately verifiable anyway. Write the split as separate tasks with a dependency between them.

## Synchronization Points

1. **⛔ BARRIER 1**: After reading documents - ensure full context
2. **⛔ BARRIER 2**: After spawning agents - wait for ALL agents
3. **⛔ BARRIER 3**: Before writing tasks.md - verify no placeholders
4. **Step 5**: Create beads issues for phase tracking
5. **⛔ CHECKPOINT**: Between phases - require human verification
