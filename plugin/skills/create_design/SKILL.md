---
name: create_design
description: Write docs/plans/<project>/design.md: WHAT to build and WHY — decisions, rationale, scope, success criteria, risks — from validated research. Use when research.md is complete and the user asks to design, decide the approach, or write the design doc, or to formalize a decision explore_design recorded. Does not plan implementation steps. Takes the project directory.
argument-hint: [project-directory]
allowed-tools: Read
---

# Create Design Document

Creates architectural and technical design decisions based on validated research. Focuses on WHAT to build and WHY, not HOW to implement.

Supporting files in this directory (read each when its step directs you to — never paraphrase from memory):

- [sub-agent-prompts.md](sub-agent-prompts.md) — verbatim prompts for the three Step 2 verification agents
- [templates.md](templates.md) — design.md output template

## CRITICAL: This Document is About WHAT and WHY - NEVER HOW

- **DO NOT** include implementation sequences or step-by-step procedures
- **DO NOT** specify HOW to code solutions
- **DO NOT** create task lists or phase breakdowns
- **DO NOT** detail file modifications or code changes
- **ONLY** document WHAT needs to be built and WHY those choices were made
- **ONLY** architectural decisions and technical approach
- The HOW comes later in the execution plan - NOT HERE

## Initial Response

This stage needs from you: approval of the approach, and approval of the refined metrics (each traces to an Intent success statement).

When invoked, check for arguments:

1. **If directory provided** (e.g., `/create_design docs/plans/2025-01-08-my-project/`):
   - Use `$1` as the project directory
   - Read research.md and design.md immediately
   - Begin design process

2. **If no arguments**:

   ```
   I'll help you create a design document based on the research. Please provide:
   1. Path to the project documentation directory (e.g., docs/plans/2025-01-08-my-project/)
   2. Any specific constraints or requirements for the design (optional)
   3. Any architectural preferences or patterns to follow (optional)

   I'll analyze the research findings and work with you to make design decisions.
   ```

## Prerequisites

- **MUST** have completed research.md in the project directory
- Research should be validated (facts confirmed accurate)
- Knowledge gaps from research should be reviewed

### Check for Blocking Questions

Before starting design, check if research left unresolved questions:

```bash
bd list -n 0 --status=open | grep "Q:"   # Find open questions from research
```

If critical questions block design decisions, resolve them first or document as assumptions.

## Process Steps

### Step 1: Read and Analyze Research

**⛔⛔⛔ BARRIER 1: STOP! Read research.md and existing design.md FULLY - NO SKIMMING ⛔⛔⛔**

```javascript
const projectDir = $1 || /* prompt for it */;

// Read all project files
const researchFile = `${projectDir}/research.md`;
const designFile = `${projectDir}/design.md`;
```

1. **Read research.md completely**:
   - Understand current implementation
   - Note all patterns and conventions found
   - Identify constraints that must be respected
   - Review knowledge gaps section

2. **Read existing design.md** (if present):
   - Check current status
   - Note any existing design decisions
   - Identify what needs updating

3. **Read README.md FULLY** and record the `## Intent` section: Goal, the "Success looks like" statements, Non-goals, and any Amendments lines. Also read research.md's `## Intent Coverage` section: statements the research never touched need a metric or an explicit deferral. Plans without an Intent section: note "no Intent section (plan predates 3.0.0)"; Step 3 then originates metrics as before.

4. **Check for a recorded decision** (from `/wb:explore_design`):

   ```bash
   bd list -n 0 --status=closed | grep "Decide:"   # Find recorded decisions
   ```

   The grep is a substring match — a record is an issue whose **title begins with** `Decide:`; ignore mid-title mentions. Identify the record for THIS project — its close reason references thoughts doc(s) under `[project-dir]/thoughts/`. If one exists:
   - Run `bd show [id]` and read the close reason fully (chosen direction + rationale) AND its notes — amendments may live there
   - Read FULLY every thoughts doc the close reason references
   - This record changes Step 4: you will formalize the recorded decision instead of generating options
   - **If you amend the record** (correction found during design): NEVER `bd update --notes` without carrying the existing notes forward verbatim — `--notes` replaces wholesale and silently destroys prior amendments; prefer `bd comments add` where available

5. **Extract key design inputs**:
   - What exists that we must work with
   - What patterns should we follow
   - What constraints limit our options
   - What gaps might affect our design

**Decide WHAT to build, not HOW to build it**

Synthesize the research into design constraints and opportunities.
Remember: You are deciding WHAT and WHY, not HOW.

### Step 2: Spawn Verification Agents

**Leverage Claude Code's agent capabilities to validate design approach:**

After reading research, spawn specialized agents in parallel to gather additional context:

**CRITICAL: Sub-agents are READ-ONLY. They gather information and return findings. They do NOT write files. YOU (the main agent) will write design.md after synthesizing their findings.**

Spawn the three agents concurrently using the prompts in [sub-agent-prompts.md](sub-agent-prompts.md) → **Step 2 Agent Prompts**.

**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL agents to complete - NO EXCEPTIONS ⛔⛔⛔**

### Step 3: Problem Definition

**Define the actual problem, not the implementation**

Based on research and agent findings, clearly articulate:

1. **The Problem**:
   - What specific problem are we solving?
   - Why does it need to be solved now?
   - What happens if we don't solve it?
   - How the problem statement traces to the README Goal (quote the Goal; if the problem as researched is not what the Goal names, that is a Goal change: see item 4)

2. **Success Metrics**:
   - Refine each Intent "Success looks like" statement into a measurable metric; every metric names the statement it refines
   - A statement with no metric is listed as deferred, with the reason (research found nothing to measure; out of this design's scope; needs a decision)
   - Metrics that no statement covers are allowed only with a rationale line; they usually mean the Intent is missing a statement (an amendment, item 4) or the metric is scope creep
   - Plans without an Intent section: originate metrics from the problem statement as before, and say so

3. **Constraints**:
   - Technical constraints from research
   - Business constraints
   - Time/resource constraints

4. **Intent amendments**: If refinement changes what the plan is for (the Goal) or what it will not do (a Non-goal), record it before writing design.md: create a `Decide:` issue (`bd create "Decide: [what changed]" --type=task --priority=1 -d "Goal or Non-goal change found during design: [old] → [new]. Why: [reason]"`) and close it with the decision, then append a dated line under the README's `**Amendments**` list: `- YYYY-MM-DD: [what changed and why] (create_design, [Decide: issue-id])`, replacing the placeholder line if it is still there. Success statements are refined, not amended; only the Goal and Non-goals are.

### Step 4: Solution Exploration

This step runs in one of two modes, set by the BARRIER 1 decision-record check:

**If a closed `Decide:` record exists for this project** — the architectural decision was already made in `/wb:explore_design`. Do NOT generate options. Present the recorded decision for confirmation:

```
Research and exploration already converged on a recorded decision:

**Recorded decision**: [Decide: title] ([issue-id], closed)
**Chosen direction**: [name from close reason]
**Rationale**: [rationale from close reason]
**Exploration record**: [thoughts doc path(s)]

I'll formalize this into design.md. Confirm, or tell me if the decision
should be revisited.
```

- **On confirmation**: treat the recorded direction as the approved approach and proceed to Step 5. The thoughts doc(s) supply the rejected alternatives and rationale for the design document.
- **If the user wants to revisit**: suggest re-running `/wb:explore_design [project-dir]` — do not re-litigate the decision here with freshly generated options.

**If no decision record exists**, proceed below — unchanged:

**Interactive Design Discussion**

1. **Generate design options**:

   ```
   Based on the research and verification agents, I see [2-3] possible approaches:

   **Option A: [Descriptive Name]**
   - Approach: [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Risk: [Main risk]
   - Precedent: [Similar implementation from agents]

   **Option B: [Descriptive Name]**
   - Approach: [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Risk: [Main risk]
   - Precedent: [Similar implementation from agents]

   Which approach aligns best with your priorities?
   Or should we explore a hybrid approach?
   ```

2. **Discuss trade-offs**:
   - Performance vs simplicity
   - Time to market vs completeness
   - Flexibility vs specificity
   - Consistency vs innovation

3. **Get explicit approval** on the chosen approach before proceeding

### Step 5: Document Design Decisions

Update or create design.md using the structure in [templates.md](templates.md) → **design.md Template**.

The template includes `bd create` command snippets for tracking assumptions and pending decisions — use them as written.

**⛔ BARRIER 3**: Verify no placeholder values before writing

**⛔ BARRIER 4**: Every Intent success statement appears in Success Metrics either as `(refines: ...)` on a metric or in the deferred list; any Goal or Non-goal change has its `Decide:` record and README amendment line already in place.

### Step 6: Review and Iterate

1. **Present the design**:

   ```
   ✅ Design document created at: [path]/design.md

   Design approach: [selected approach name]

   Key decisions made:
   - [Major decision 1]
   - [Major decision 2]
   - [Major decision 3]

   Pending decisions: [count]

   Agent findings incorporated:
   - [Finding 1 from verification agents]
   - [Finding 2 from integration analysis]

   The design document includes:
   - Problem statement and success metrics
   - Technical architecture decisions
   - Clear scope boundaries
   - Risk analysis and mitigation

   Please review and provide feedback:
   - Are the success criteria appropriate?
   - Do the technical decisions align with your vision?
   - Are there risks we haven't considered?
   - Should any out-of-scope items be included?
   ```

2. **Iterate based on feedback**:
   - Adjust success criteria
   - Refine technical decisions
   - Add/remove scope items
   - Update risk analysis

3. **Get explicit approval**:

   ```
   Once you're satisfied with the design, please confirm approval.
   After approval, run `/create_tasks` to build the implementation plan.
   ```

## Important Guidelines

### Design Principles

1. **Separate WHAT from HOW**:
   - Design says WHAT to build and WHY
   - Execution plan says HOW to build it
   - Don't include implementation sequences

2. **Make Decisions Explicit**:
   - Document every significant choice
   - Include rationale and trade-offs
   - Note what was rejected and why

3. **Respect Research Findings**:
   - Build on patterns found in research
   - Respect constraints discovered
   - Don't contradict factual findings

4. **Keep It Disposable**:
   - Design should be complete but changeable
   - If approach is wrong, should be able to start over
   - Research remains valid even if design changes

### What Belongs in Design vs Execution

**Design (THIS document - WHAT and WHY only)**:

- ✅ Architecture decisions (WHAT architecture to use and WHY)
- ✅ Data models (WHAT data structures and WHY)
- ✅ API contracts (WHAT interfaces and WHY)
- ✅ Success criteria (WHAT defines success and WHY)
- ✅ Scope boundaries (WHAT is included/excluded and WHY)
- ✅ Technical approach (WHAT approach and WHY)

**Execution (tasks.md - HOW only - NEVER PUT THESE HERE)**:

- ❌ Phase sequencing (HOW to order implementation)
- ❌ Specific code changes (HOW to modify files)
- ❌ Step-by-step implementation (HOW to build it)
- ❌ Test writing tasks (HOW to test it)
- ❌ File modification lists (HOW to change code)
- ❌ Command sequences (HOW to execute changes)

**REMEMBER: If it describes HOW to do something, it DOES NOT belong in design**

### Handling Knowledge Gaps

When research has knowledge gaps:

1. **Document assumptions**:
   - State what you're assuming
   - Note risk if assumption is wrong
   - Plan for discovery during implementation

2. **Design for flexibility**:
   - Don't over-commit to uncertain areas
   - Build in abstraction where needed
   - Plan for multiple scenarios

3. **Flag for implementation**:
   - Mark decisions that depend on unknowns
   - Note what needs investigation
   - Will be resolved in execution phase

### Leveraging Agent Findings

Use agent findings to strengthen design:

1. **Pattern matching**: Reference similar implementations found by agents
2. **Integration validation**: Use agent findings to validate integration approach
3. **Risk assessment**: Incorporate historical findings from agents
4. **Consistency**: Ensure design follows patterns identified by agents

## Synchronization Points

1. **⛔ BARRIER 1**: After reading research - ensure full understanding
2. **⛔ BARRIER 2**: After agent spawning - wait for ALL agents
3. **⛔ DECISION POINT**: After presenting options - get approach approval (with a closed `Decide:` record: confirmation of the recorded decision instead)
4. **⛔ BARRIER 3**: Before writing - verify no placeholders
5. **⛔ APPROVAL GATE**: After writing design - get explicit approval
