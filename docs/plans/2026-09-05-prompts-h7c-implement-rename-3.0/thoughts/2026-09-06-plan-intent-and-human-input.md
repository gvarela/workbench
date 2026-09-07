---
project: implement-rename-3.0
created: 2026-09-06
status: exploration
topic: Where a plan's goal and definition of success live, when they are captured, how they cascade through the stages, and how the workflow tells the human what each stage needs
tags: [thoughts, exploration, implement-rename-3.0]
author: gabe@vare.la
git_branch: worktree-implement-rename-3.0
repository: gvarela/workbench
---

# Exploration: Plan intent and human input across the workflow

This session explored beads issue prompts-9l1 (raised 2026-09-05: "gaps with setting up the goals of the plan and how that cascades to the design phase") as a candidate addition to the 3.0.0 release. Inputs: [research.md](../research.md) for how the stages work today, the create_project templates, the create_research, explore_design, create_design, and create_tasks intakes, and Gabe's personal CLAUDE.md, which prescribes a Plan interview (purpose, success criteria, scope, constraints, out of scope) that the plugin never implemented. The Decide: record is added at the end once the direction is approved.

## Decision Space

Confirmed by Gabe 2026-09-06.

**Facts that define the gap.** create_project takes a project name, a base directory, and a ticket; the README it writes says only that the directory contains documentation. The first intent-bearing input in the pipeline is create_research's research question, which is a question about the codebase, not the goal. The goal first appears in design.md's Problem Statement and Success Metrics, written by create_design after research. tasks.md's Target State and the coordinated worker's `why:` field copy from design.md. research.md is documentarian by rule and carries no goals. validate_execution checks the implementation against design.md and tasks.md.

**Decisions**

1. Where intent lives: the README (Gabe's expectation), a dedicated intent section or file, or only design.md as today; and whether the goal and "what success looks like" are one artifact or split between an early statement and a later measurable form.
2. When and how it is captured: at create_project from arguments or a short interview, deferred to create_design, or seeded at creation and refined at design; and what the model does when the goal is missing. Since v2.6.0 the prose request that fires create_project often carries the intent, so asking may mean confirming an inference.
3. How it cascades: which stages consume it (the research question, explore_design's framing, design's Problem Statement and Success Metrics, tasks.md's Target State, the worker `why:` field, validate_execution's verdict, the orientation hook's active-plan line) and whether it gets an ownership rule like update_status's sole-writer rule.
4. How specific: a goal sentence plus observable "success looks like" statements, measurable metrics, or the full interview from the personal CLAUDE.md.
5. How the workflow explains itself to the human: which stages need what kind of input (provide, decide, confirm), how a user knows research covered the right things, when architecture is discussed, whether intent is pre-start or part of design. Candidates named by Gabe: expanded help, a tutor skill.

**Constraints from research**

- The README is generated from one template in create_project; a new section is a template change plus the skill's intake.
- research.md must stay free of goals; the goal may shape the research question, not the findings.
- design.md's Problem Statement and Success Metrics already exist and are the current entry point; anything captured earlier must feed them, not duplicate them.
- update_status is the sole writer of progress fields; a goal field needs the same clarity about who may change it.
- Every workflow skill is model-invocable, so intake can draw on the prose request.

**Already fixed by Gabe**

- Ships in 3.0.0.
- The README is where he expects to find intent.
- The goal is provided at creation or asked for right after the skill is invoked.
- "What success looks like" is articulated; specificity is open.

## Directions Considered

Drafted in-session 2026-09-06; steelmanned evenly. Directions A, B, and C answer axes 1 through 4; the fifth axis is treated separately below because any of A, B, or C can pair with either shape of it.

### Direction A: The charter

Thesis: intent is a small document written before anything else, and every stage is judged against it.

- Approach: create_project confirms or asks for four things and writes them as an Intent section at the top of the README: Goal (one sentence), Success looks like (three to five observable outcomes), Non-goals, Constraints known now. The section is complete at creation. Downstream: create_research derives its research question from the Goal and, at completion, states which success outcomes the findings bear on and which they do not; explore_design frames the decision against the Goal; create_design's Problem Statement must trace to it and its Success Metrics restate the outcomes in measurable form; create_tasks copies the metrics; validate_execution reports outcome by outcome. Ownership: the Intent section is written once at creation and changed only by an explicit user decision, recorded as a Decide: issue.
- Strengths: the question "did we research the right things" becomes answerable at the end of research, not at design; the cascade is explicit and checkable; the README becomes the one-page answer to "what is this plan for".
- Weaknesses: an interview at creation is friction, and outcomes written before research can be wrong in ways the author cannot yet see; a charter that is hard to change invites working around it; the Problem Statement risks becoming a restatement.
- Main risk: premature specificity, or the opposite, a charter so vague it constrains nothing.
- Precedent: the personal CLAUDE.md Plan interview; the `why:` field (D7) already assumes a stated reason exists somewhere.

### Direction B: Intent emerges at design

Thesis: the goal is written when the facts are known; creation records only a sentence.

- Approach: create_project accepts an optional one-line goal (from arguments or the prose request) and writes it into the README Overview; nothing more is asked. create_design's problem-definition step becomes the formal intent interview (purpose, success, scope, out of scope) and design.md remains the single home of the goal and its metrics. Downstream cascade is unchanged from today. The README's line is informational.
- Strengths: least friction; success metrics are grounded in research rather than guessed; no new artifact and no new ownership rule; matches the plugin's current shape, so the change is one intake step and one template line.
- Weaknesses: research runs without a stated goal, so its coverage cannot be judged until design; explore_design frames from research alone, which is where prompts-9l1's gap was felt; the one-liner is too thin to cascade to the orientation hook or the worker `why:` field.
- Main risk: the gap Gabe named is not closed, only moved one line earlier.
- Precedent: today's create_design Step 3 ("Define the actual problem").

### Direction C: The staged contract

Thesis: intent is seeded early in plain terms, refined at design into measurable terms, and every change to it is a recorded decision.

- Approach: create_project confirms or asks for a Goal sentence and two to four "success looks like" statements in observable, non-numeric terms, and writes them as the README's Intent section; non-goals are optional. create_research checks its research question against the Goal before spawning agents and, at completion, names any success statement its findings do not touch. explore_design frames the decision against the Goal. create_design refines the statements into Success Metrics and traces each to a statement; if refinement changes the Goal itself, the change is a Decide: record and the README is amended with a dated line. create_tasks copies the metrics as Target State. validate_execution reports against the metrics and echoes the verdict per README statement. Ownership: the README Intent is written by create_project and amended only by create_design or explore_design with a dated line; design.md owns the measurable form; update_status never touches either.
- Strengths: intent exists before research without pretending to know metrics; goal drift becomes visible instead of silent; each stage has a named obligation toward the intent, which is also the answer to axis 5 for that stage.
- Weaknesses: three artifacts carry a version of the goal (README seed, design refinement, tasks copy), so the ownership rule has to be enforced by the skills; more intake text in three skills; the amendment path adds ceremony to a small plan.
- Main risk: the refinement step degenerates into restating the seed, or the coverage check in research becomes a formality.
- Precedent: the update_status sole-writer rule; the explore_design Decide: record for decisions that change course.

### The fifth axis: how the workflow explains itself

Two shapes, either of which pairs with A, B, or C.

- **Shape 1, the map**: a table of stage, what you provide, what you decide, what you confirm, and how you know the stage did enough, rendered in the help skill, summarized in the orientation hook (D18), and stated in each stage's Initial Response as one line ("This stage needs from you: …"). Static, cheap, always present. Answers "what does each phase ask of me" but not "what should I do now".
- **Shape 2, the tutor**: a skill that reads the active plan's state (which documents exist, their status, beads counts, open Q: and Decide: issues) and answers "where am I, what does the next stage need from me, and is the previous stage sufficient" in conversation. Dynamic, can say "research does not mention X, which your goal depends on". Costs a skill, its description in baseline context, and a definition of "sufficient" per stage that Shape 1 would have to write anyway.
- Neither shape by itself answers "did we research the right things"; that needs a stated goal (A or C) for the stage to check against. Shape 2 without a goal can only report what exists.

## Discussion

**Move 1 (Gabe): leaning A, but the A/C distinction read as "formal versus informal".** Reframed: both A and C are formal (a written artifact with an owner); B is the informal option. A and C differ on three forks:

1. How much is committed at creation: A asks for goal, outcomes, non-goals, constraints; C asks for a goal sentence and a few observable, non-numeric success statements. A gives later stages more to check against, written before the codebase has been looked at; C defers the parts most likely to be wrong.
2. What happens when research changes the author's mind: A treats every change, including turning an outcome into a metric, as a recorded decision; C treats refinement at design as expected and reserves the decision record for a change to the goal itself.
3. Which artifact is the yardstick: A reports validation against the README outcomes, design restating them; C reports against design's metrics and echoes the verdict to the README statements, so two artifacts carry a version of success and the skills must enforce ownership per form.

The per-stage obligations (research names untouched success statements; explore_design frames against the goal; validate_execution reports per statement) attach to either direction; without them neither answers "did we research the right things".

Scenario used: this plan. On 2026-09-05 the goal was the rename; by 2026-09-06 it is the 3.0.0 "tools as intended" release with three mid-plan additions. Under A that is three charter amendments; under C, one goal-change decision plus grown success statements; under the current plugin the drift is recorded only in design.md revisions and conversation.

Hybrid named as legitimate: A's front-loaded goal and non-goals (cheap early, and the scope-creep guard) with C's rule that success is observable at creation and measurable at design, only goal changes recorded as decisions.

**Move 2 (Gabe): leans to the hybrid**, reasoning that both halves are true: objectives should be articulated better up front, and as the work teaches, they change, so validation must be checking against the current objective rather than the original one. That last clause settles fork 3 toward design.md's metrics as the yardstick, with the README carrying the plain-language statements and their dated amendments. Presented for explicit approval at the checkpoint; the fifth axis (map versus tutor) still open.

**Move 3 (Gabe): asked how hard the tutor is once the map exists.** Answer given: not hard, because the map supplies the per-stage human-input definitions and the staged charter makes each stage write its own sufficiency evidence (research names untouched success statements, design traces metrics, validation reports per statement), so a tutor reads evidence rather than judging raw documents; state detection already exists in validate_project and the orientation scan. The real choice is shape: a separate tutor skill (one more baseline description, a third skill adjacent to help and validate_project) versus help made stateful (invoked with an active plan it says where you are, what the next stage needs, what the last stage left undone; otherwise the reference card).

**Move 4 (Gabe): chose map plus help made stateful**, wanting "what's next" or "where am I" to invoke a process-aware help that can evaluate the gaps. The tutor as a separate skill is discarded.

## Synthesis

- **Converged direction**: the staged charter with map plus stateful help. Approved by Gabe 2026-09-06. create_project confirms from the prose request, or asks for, a Goal sentence, two to four observable non-numeric "success looks like" statements, and Non-goals, and writes them as an Intent section at the top of the README; constraints wait for research. Each stage has a named obligation to the intent: create_research derives its question from the Goal and at completion names any success statement its findings never touch; explore_design frames the decision against the Goal; create_design refines the statements into measurable Success Metrics tracing each to a statement, and records any change to the Goal or a Non-goal as a Decide: issue plus a dated amendment line in the README; create_tasks copies the metrics as the Target State; validate_execution reports against the current metrics and writes the verdict back beside each README statement. Ownership: create_project writes the Intent section; create_design and explore_design may amend it with a dated line; design.md owns the measurable form; update_status touches neither. The fifth axis: a map of stage, what you provide, what you decide, what you confirm, and how you know the stage did enough, rendered in the help skill, summarized in the orientation hook, and stated in each stage's intake; and help made stateful, so that "where am I" or "what's next" in a repository with an active plan reports position, the next stage's human input, and the previous stage's gaps from the evidence the obligations leave behind, falling back to the reference card otherwise.
- **Rationale**: both halves of Gabe's reasoning hold. Goal and non-goals are cheap to state early and are the scope-creep guard, so they front-load. Measurable success cannot honestly be written before the codebase has been looked at, so it is refined at design, and refinement is the plan working rather than drift. Only a change to the goal itself is loud, which keeps the record meaningful. Validation checks the current objective because design.md is the yardstick and the README echoes it. Stateful help is chosen over a tutor skill because the map already lives in help, the obligations already produce the evidence a tutor would read, and one skill adds no baseline context.
- **Rejected (with reasons)**: A, the charter fixed at creation: premature specificity and every learning counted as drift. B, intent emerging at design: research still runs without a stated goal, so the gap only moves. C alone: too little asked up front, non-goals optional. A separate tutor skill: a third skill adjacent to help and validate_project, plus baseline context, for the same capability.
- **Deferred to design**: the exact Intent section shape and its dated-amendment line; how create_project confirms an inferred intent versus asking; the wording of each stage's intake line and the map's "how you know it did enough" column; how stateful help distinguishes a plan without an Intent section (created before 3.0.0) from one with gaps; whether validate_execution's per-statement echo is written to the README or only reported.
