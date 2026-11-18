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
- [templates.md](templates.md) — design.md output template and the Open Question Message

## Scope: WHAT and WHY, not HOW

design.md records architectural decisions and the reasoning behind them: what to build, why, what is in and out of scope, success criteria, risks. Implementation sequences, code changes, file-modification lists, and task or phase breakdowns belong in tasks.md, which is written later from this document. Keeping them out means the design stays changeable: if the approach turns out wrong, it can be replaced without redoing execution planning.

## Initial Response

This stage needs from you: confirmation of which design layers apply (product, technical, program), answers to what each pass asks, approval of the approach, the refined metrics, the acceptance criteria with how each will be proven and their harness decisions, each listed choice that tightens your intent, and each case the design leaves unhandled; for each of this plan's open questions, an answer, an owner to defer it to, or a ruling that it is not this plan's question.

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

### Open Questions for This Plan

This plan's open questions are the open `Q:` issues (titles beginning `Q:`) that research.md or the README cites by id (`bd show [id]` for each), plus those whose description names this plan's directory, [plan-dir-name] (its name, for example `2025-01-08-my-project`). The filter matches substrings, so keep only descriptions naming exactly this directory:

```bash
bd list -n 0 --status=open --title-contains "Q:" --desc-contains "[plan-dir-name]"
```

Only the user decides that a question can wait, because a question the design assumes away quietly becomes a risk nobody accepted. Put each one to them by name as [templates.md](templates.md) → **Open Question Message** says: in the pass it belongs to when it bears on that pass (before the approach is chosen, for one that bears on the approach), otherwise in the Step 7 message. On a re-run, a question with a `deferred by [plan-dir-name]` or `not a question for [plan-dir-name]` comment (`bd comments [id] --json`) was already decided: carry its row forward, and ask again only if the user wants to revisit it.

## Process Steps

### Step 1: Read and Analyze Research

⛔ BARRIER 1: research.md, design.md, and README.md are read in full — design decisions made on a partial read contradict facts research already established

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

3. **Read README.md FULLY** and record the `## Intent` section: Goal, the "Success looks like" statements, Non-goals, and any Amendments lines, each with its why, source, review status, and strength; read a line with no strength as [Strength](../../docs/reference/rules-and-intents.md#strength) says, and put each provisionally hard line to the user with the open questions. Also read research.md's `## Intent Coverage` section: statements the research never touched need a metric or an explicit deferral. Plans without an Intent section: note "no Intent section (plan predates 3.0.0)"; the product pass then originates metrics as before.

4. **Read the plan's existing material.** design.md is the only document the later stages carry forward (tasks are derived from it, and a worker reads its task and nothing else), so a design this document does not name is never built to, however much of a session went into it. The README's Existing Material list is the index; bring it up to date before you rely on it:
   - Read each item it lists.
   - Look for what it does not list, whatever tool produced it: in the plan folder, a `mockups/` folder from `/wb:create_mockup` (read `mockups/mockup-log.md` in full and open the latest version of each series), a `designs/` folder, images, PDFs, exported screens, `thoughts/` docs, and other notes; and links or paths in README.md, research.md, and the ticket. Show the person what you found that the list lacks, and add each to the README on their yes.
   - For each item note what it settles, whether its record shows it approved or still open, and whether a worker can open it. A link that needs a login, or a path git ignores (`git check-ignore -q <path>`), is not there in a worktree or on another machine. For each such item ask the person which they want: an export saved in the plan folder, a description written into design.md, or a stated place where a copy is kept.
   - A plan with no README list predates it: search the same places, and ask once whether a design exists when the plan changes something a person sees.

5. **Check for a recorded decision** (from `/wb:explore_design`):

   ```bash
   bd list -n 0 --status=closed | grep "Decide:"   # Find recorded decisions
   ```

   The grep is a substring match — a record is an issue whose **title begins with** `Decide:`; ignore mid-title mentions. Identify the record for THIS project — its close reason references thoughts doc(s) under `[project-dir]/thoughts/`. If one exists:
   - Run `bd show [id]` and read the close reason fully (chosen direction + rationale) AND its notes — amendments may live there
   - Read FULLY every thoughts doc the close reason references
   - This record changes the technical pass (Step 5): you will formalize the recorded decision instead of generating options
   - **If you amend the record** (correction found during design): NEVER `bd update --notes` without carrying the existing notes forward verbatim — `--notes` replaces wholesale and silently destroys prior amendments; prefer `bd comments add` where available

6. **Extract key design inputs**:
   - What exists that we must work with
   - What patterns should we follow
   - What constraints limit our options
   - What gaps might affect our design

Synthesize the research into design constraints and opportunities.

### Step 2: Spawn Verification Agents

**Leverage Claude Code's agent capabilities to validate design approach:**

After reading research, spawn specialized agents in parallel to gather additional context:

Sub-agents are read-only: they gather information and return findings, and you write design.md after synthesizing them.

Spawn the three agents concurrently using the prompts in [sub-agent-prompts.md](sub-agent-prompts.md) → **Step 2 Agent Prompts**.

⛔ BARRIER 2: every spawned agent has returned (subagents run in the background, so wait for a completion notification from each one) — a design synthesized on a partial set misses what the missing report would have changed

### Step 3: Propose the Layers

A design answers three kinds of question, and a discussion that mixes them tends to settle one kind and call the design done. So this stage runs as three passes, in this order, each closed before the next begins:

- **Product**: the problem, what success is, what a person sees and does, what it must do, and what is out of scope.
- **Technical**: the approach, the architecture, what the examples leave out, what it relies on outside the repository, and how it runs in production.
- **Program**: how the new parts are called, where the tests observe them, and which existing patterns they follow.

**On a re-run**, read `design_layers` in design.md's frontmatter: say which layers are closed or skipped, and resume at the first one that is `open`. Reopen a closed layer only when the person asks.

**On a first run**, propose which passes apply before any discussion, and wait for the person's reply:

```
Design layers for [plan]:
- Product: runs. Experience and UI questions: [apply, because Intent "[line]" changes [what a person sees or reads] / not applicable, because [Intent line and research finding that show nothing a person sees or reads changes]]
- Technical: [runs / skip: [reason]]
- Program: [runs / skip: [reason]]

Confirm, or tell me which to change.
```

- The Intent is the starting point, since it says what the plan is for: each line of the proposal cites the Intent line and the research finding it rests on.
- Product always runs: every plan has a problem, a measure of success, and a scope.
- Propose skipping Technical only when the plan changes no behavior at any boundary (wording, or a setting that opens no new path).
- Propose skipping Program only when the plan adds nothing that one task builds and another calls, and research shows one pattern for what it adds.
- A skip is the person's to confirm. Record each layer in design.md's frontmatter and its Design Layers table as `open`, or `skipped` with the reason and the date they confirmed it.

**How each pass runs.** It is an interview, not a form. First take what research.md, the README, the plan folder's documents, and a recorded decision already settle, and say so in a line each. Then ask the person only what those leave open, hardest first, a few questions at a time; do not ask what a document answers. Every question of a pass ends one of three ways: an answer (from a document, cited, or from the person); `not applicable`, with the reason; or, when the person says it can wait, an open question handled as "Open Questions for This Plan" says. When every question of the pass has one of those ends, check BARRIER 3, write that pass's sections of design.md from [templates.md](templates.md) → **design.md Template**, and set its layer to `closed`. Then tell the person in a few lines what the pass settled, and that they can stop here: running this command again, in a fresh session if they prefer, resumes at the next pass.

**⛔ BARRIER 3**: Verify no placeholder values before a pass writes (Owner `awaiting your reply` is the one value allowed, until Step 7's replies replace it)

### Step 4: Product Pass

**Define the problem and what done looks like, in the person's terms, before any solution.**

1. **The Problem**:
   - What specific problem are we solving?
   - Why does it need to be solved now?
   - What happens if we don't solve it?
   - How the problem statement traces to the README Goal (quote the Goal; if the problem as researched is not what the Goal names, that is a Goal change: see item 4)

2. **Success Metrics**:
   - Refine each Intent "Success looks like" statement into a measurable metric that checks the statement and never replaces it; every metric names the statement it refines and carries its why and strength (on the purpose, never the mechanism: [Purpose and mechanism](../../docs/reference/rules-and-intents.md#purpose-and-mechanism)), and one stricter than its statement (only or never, a fixed placement, a word list, an exact layout) is marked `narrows: <how>` and listed in Step 7 (templates.md → **Narrowings**); the same holds for each acceptance criterion against its metric
   - A statement with no metric is listed as deferred, with the reason (research found nothing to measure; out of this design's scope; needs a decision)
   - Metrics that no statement covers are allowed only with a rationale line; they usually mean the Intent is missing a statement (an amendment, item 4) or the metric is scope creep
   - Plans without an Intent section: originate metrics from the problem statement as before, and say so

3. **Constraints**:
   - Technical constraints from research
   - Business constraints
   - Time/resource constraints

4. **Intent amendments**: If refinement changes what the plan is for (the Goal) or what it will not do (a Non-goal), record it before writing design.md: create a `Decide:` issue (`bd create "Decide: [what changed]" --type=task --priority=1 -d "Goal or Non-goal change found during design for [plan-dir-name]: [old] → [new]. Why: [reason]"`) and close it with the decision, then append a dated line under the README's `**Amendments**` list: `- YYYY-MM-DD: [what changed and why] (create_design, [Decide: issue-id])`, replacing the placeholder line if it is still there. A Success statement is refined, not amended, unless the user's direction contradicts it: then it is amended the same way, with its own `Decide:` record and Amendments line, quoting the user's words.

5. **The expected experience**: what a person sees and does, from start to finish, and what they are told when it goes wrong. `not applicable` only when nothing a person sees or reads changes.

6. **How the UI works**, when there is one: its layout, components, wording, and states (empty, loading, error). The screen is the unit. A screen, message, or report is touched when a criterion is observed there or the work changes it, and for a touched screen the whole of its design is in scope until the person says otherwise. Draft the Design Scope list from the existing material and put it to the person in this pass; nothing in it is settled until they reply:
   - **Built to the design**: each touched screen and the design file or link it follows.
   - **On a touched screen, left out**: anything its design shows that this plan would not build, with the reason.
   - **Touched, not designed**: a screen, state, or message the plan needs that no design covers, such as an error state a partial comp leaves out. For each, the person chooses: follow an existing pattern in the product (name it), mock it up with `/wb:create_mockup`, go back to the designer, or build it plainly and flag it.

   A design that shows something a Non-goal rules out, or that the Goal does not cover, is an Intent question (item 4), not a scope default.

7. **What it must do**: draft each acceptance criterion's statement, one per changed behavior: Given, When, Then, its examples, the metric it refines, what it guards against, its strength, and any narrowing. Where each is observed and how it is proven wait for the program pass.

8. **Scope**: what is in, and what is out with the reason.

This pass writes Problem Statement, Success Metrics, Experience, Scope Definition, and the statement lines of each Acceptance Criterion.

### Step 5: Technical Pass

**The approach.** It is settled in one of two modes, set by the BARRIER 1 decision-record check:

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

- **On confirmation**: treat the recorded direction as the approved approach and go on to the architecture. The thoughts doc(s) supply the rejected alternatives and rationale for the design document.
- **If the user wants to revisit**: suggest re-running `/wb:explore_design [project-dir]` — do not re-litigate the decision here with freshly generated options.

**If no decision record exists**, generate options as follows:

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

**The architecture**: where this lives, which parts it adds or changes, how they talk to each other, and what data changes (new or changed records, and what happens to the ones that already exist).

**What the examples leave out.** Criteria written from the intended behavior leave out what nobody thought to state, and everything after design (the tests, the planted defects, the prover) checks only what a criterion names. So ask three questions of each boundary in Harness Decisions and record every answer as a row of design.md's Beyond the Examples table:

- **Unshown input**: who supplies what arrives here, and what can they send that no example shows? Free text that carries the format's own delimiters, an empty or missing value, a wrong type, a record deleted since something referred to it.
- **Partial failure**: when this does several things in sequence, or calls something that can fail, what state is left after a failure partway, and what does the caller see?
- **Other callers**: what existing code calls or reads what this changes (take the callers from research.md and the Step 2 agents' reports), and is the new behavior right for each of them?

Answer from research where it settles the case, and ask the person only what it cannot. Each row ends one of three ways: a criterion, written with its example like any other; `not handled: <reason>`, a case that can happen and that this plan leaves alone, which is a risk the person accepts by approving; or `cannot happen: <what prevents it, with file:line>`. A question is not a reason to add a criterion: `not handled` with a reason is a complete answer, and each extra criterion costs a test, its defect checks, and a proof at every checkpoint. List every `not handled` row in Step 7.

**What it relies on outside the repository**: what production data and permissions look like, what an outside service accepts and returns, a real-world value such as a price or a limit. Each is a row of Assumptions that says how it will be checked (a `Validate:` issue, a check at deploy, a live call the testing profile grants), or that the person accepts it unchecked and what breaks if it is wrong.

**How it runs in production**: who may use it and what a refused person sees; for each failure the design names, who or what is told; how it goes live (order, data changes, anything that runs once); and how it comes back out.

This pass writes Design Approach, Technical Decisions, Beyond the Examples, Risk Analysis with its Assumptions, Operation, and Rejected Alternatives. A case the examples left out that becomes a criterion gets its statement lines here.

### Step 6: Program Pass

1. **Contracts**: for each new thing that one task or phase builds and another calls (a class, a function, an endpoint, a job, a record), its name, how it is called, what it returns, and how it fails. A criterion's test is written before the code exists, so whatever this leaves unsaid, the test's author decides.

2. **Where each criterion is observed**: its Observed at, Seam, and Proven by lines, and the Harness Decisions table.

3. **Patterns to follow**: for each new part, the existing pattern it follows, with the file:line research gives. Where research shows two patterns for the same thing, or none, ask the person which.

File layout, the order of the work, and the code itself stay in tasks.md.

This pass writes Contracts, Patterns to Follow, Harness Decisions, and the remaining lines of each Acceptance Criterion.

The template includes `bd create` command snippets for tracking assumptions and pending decisions — use them as written. An open question still awaiting the user's reply is written as its row with Owner `awaiting your reply` (templates.md → **Open Question Message**).

**⛔ BARRIER 4**: Every layer in `design_layers` is `closed` or `skipped`; every Intent success statement appears in Success Metrics either as `(refines: ...)` on a metric or in the deferred list; every acceptance criterion names the Success Metric it refines and carries its Guards against and Strength; every boundary in Harness Decisions has its three Beyond the Examples rows, each ending in a criterion id, `not handled`, or `cannot happen`; every narrowing is marked `narrows:` and listed for Step 7; any Goal, Non-goal, or Success statement change has its `Decide:` record and README amendment line already in place.

### Step 7: Review and Iterate

Before presenting, spawn `wb:judge` with no `model` parameter and this prompt: `Judge this stop.` then `- Plan directory: [path]`, `- Stop: design approval`, `- Task or milestone: none`, `- Finding or item: the design is ready for approval`, `- What the coordinator would ask: approval of design.md`, `- Verifications so far: 0`. You wrote the design, so you are not the one to say what its approval would pass in silence. It returns a list: each criterion or metric stricter than the Intent line it refines, each Intent line whose strength nobody answered, each criterion the person will have to check by hand, each layer that was skipped, each question of a pass left without an answer, and each open question with no answer or owner. Add every item it lists to the message below, under the heading it belongs to, and do not drop one because you think it minor.

1. **Present the design**:

   ```
   ✅ Design document created at: [path]/design.md

   Design approach: [selected approach name]

   Design layers: [product closed; technical closed or "skipped: <reason>"; program closed or "skipped: <reason>"]

   Key decisions made:
   - [Major decision 1]
   - [Major decision 2]
   - [Major decision 3]

   Needs your decision:
   - [each open question and each Pending Decision, by name, in the Open Question Message form from templates.md; or "Nothing needs your decision"]

   Choices I made that tighten your intent (your approval covers only these):
   - [each narrowing in all five lines of the templates.md → **Narrowings** form, its quoted text the Then line (or metric) copied verbatim from design.md, never paraphrased; or "None: every metric and criterion checks its statement as written"]

   Design scope (as you approved it in the product pass):
   - [built to the design: each screen and its file; left out: each item and why; not designed: each gap and how it will be handled; any design a worker cannot open and where its copy is; or "No screen, message, or report is touched"]

   Cases this design leaves unhandled (your approval accepts these):
   - [each Beyond the Examples row that reads `not handled`: the boundary, the case in plain words, and the reason; or "None: every case found is a criterion or cannot happen"]

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

3. **Get explicit approval** (one that leaves an item under Needs your decision without a reply is not approval yet; templates.md → **Open Question Message** says how to ask again). Approval covers only the narrowings the message listed ([Narrowings](../../docs/reference/rules-and-intents.md#narrowings) says what an unlisted one is):

   ```
   Once you've replied to each item under Needs your decision and are satisfied with the design, including the choices listed as tightening your intent, please confirm approval; then run `/create_tasks` to build the implementation plan.
   ```

## What Belongs in Design vs Execution

**Design (THIS document - WHAT and WHY only)**:

- ✅ Architecture decisions (WHAT architecture to use and WHY)
- ✅ Data models (WHAT data structures and WHY)
- ✅ API contracts (WHAT interfaces and WHY), and the contract of anything one task builds and another calls (WHAT it is called with and returns)
- ✅ Success criteria, acceptance criteria, and harness decisions (WHAT defines success, where it is observed, and with what harness; one criterion per changed behavior, so each can be pinned by one test)
- ✅ Scope boundaries (WHAT is included/excluded and WHY)
- ✅ Technical approach (WHAT approach and WHY)

**Execution (tasks.md - HOW only - NEVER PUT THESE HERE)**:

- ❌ Phase sequencing (HOW to order implementation)
- ❌ Specific code changes (HOW to modify files)
- ❌ Step-by-step implementation (HOW to build it)
- ❌ Test writing and sequencing (acceptance criteria and their observation boundaries are WHAT; how tests are written and sequenced belongs in tasks.md)
- ❌ File layout and file modification lists (HOW to change code)
- ❌ Command sequences (HOW to execute changes)
