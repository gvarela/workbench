# create_design — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## design.md Template

````markdown
---
project: [from existing frontmatter]
ticket: [from existing frontmatter]
created: [from existing frontmatter]
status: draft
last_updated: [YYYY-MM-DD]
depends_on: research.md
design_approach: [selected option name]
---

# Design: [Feature/Task Name]

## Problem Statement

[Clear articulation of the problem we're solving and why it matters]

### Success Metrics
- [Measurable outcome that checks the statement] (refines: "[Intent success statement]"; why: [the statement's why]; strength: [hard | aim, from the statement][; narrows: how it is stricter than the statement])
- [Measurable outcome that checks the statement] (refines: "[Intent success statement]"; why: [the statement's why]; strength: [hard | aim, from the statement])
- Deferred: "[Intent success statement]" — [reason], or "none"

## Design Approach

[High-level description of the chosen solution approach]

### Why This Approach
- [Rationale for choosing this over alternatives]
- [How it aligns with existing patterns from research]
- [How it addresses the core problem]
- [Precedents from agent findings]

## Technical Decisions

### Architecture
- [Key architectural decision 1]
  - Rationale: [Why this choice]
  - Trade-off: [What we're giving up]
  - Pattern reference: [file:line from research]

### Data Model
- [Data structure/schema decisions]
- [State management approach]
- [Data flow design]

### Integration Points
- [How this integrates with existing systems]
- [API contracts or interfaces]
- [Dependencies on other components]

## Scope Definition

### In Scope
- [Specific feature/capability 1]
- [Specific feature/capability 2]
- [Specific feature/capability 3]

### Out of Scope
- [What we explicitly won't do]
- [Features deferred to later]
- [Problems we're not solving]

## Success Criteria

### Acceptance Criteria

One criterion per changed behavior, each checkable at a boundary a test can observe and naming the Success Metric it refines (number the Success Metrics M1, M2, ... so criteria can cite them). The Illustration line below shows the shape only; leave it out of design.md.

- **AC-1 [Behavior stated as an outcome]**
  - Given [starting state, concretely]
  - When [the action or event]
  - Then [the observable result]
  - Example: [real input values → real expected output]
  - Example (edge): [a boundary case, when one exists]
  - Observed at: [where the result is visible: HTTP response, rendered page, CLI output, stored record]
  - Seam: [only when the boundary is external or an LLM: what is stubbed, and what stays real]
  - Refines: [Success Metric id, for example M1]
  - Guards against: [the harm or wrong behavior this criterion exists to stop, in the user's terms]
  - Strength: [hard | aim, from the metric it refines, as wb's rules-and-intents reference (Strength) defines them; hardness attaches to the Guards against purpose, never to the mechanism a narrowing picks, so write `hard (purpose) / aim (mechanism)` when they differ]
  - Narrows: [only when it is stricter than its metric: how (only or never, a fixed placement, a word list, an exact layout); listed under "Choices I made that tighten your intent"]

A criterion checks its statement; it does not replace it. When the check is a proxy (a word list, a region, a selector), Guards against is what the proxy stands for, so the test-writer can name it and a reader can tell a proxy's false hit from a real break.

Illustration: Given a password-reset link issued at 10:00 that is valid for 2 hours; When it is opened at 12:01; Then the page says the link has expired and offers a new one; Example: opened 11:59 shows the reset form, opened 12:01 shows "expired"; Observed at: reset page HTML; Refines: M1; Guards against: an expired link still letting someone set a password; Strength: hard (safety).

### Harness Decisions

One row per boundary the criteria are observed at. Take "Harness present?" from research's Testing Conventions section.

| Boundary | Harness present? | Decision |
|----------|------------------|----------|
| [HTTP, UI, CLI, database, LLM call] | [what exists per research, or "none"] | [Use as is / Add harness / Manual / Lower proxy, with what the proxy cannot check] |

### Non-Functional Requirements
- [ ] Performance: [Specific metric]
- [ ] Reliability: [Specific metric]
- [ ] Security: [Specific requirement]

## Risk Analysis

### Technical Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Strategy] |

### Assumptions

Based on knowledge gaps from research - track in beads to ensure validation. A `Q:` question the user deferred is a row here under its own id with the owner they named, and gets no `Validate:` issue:

| Assumption | Beads ID | Owner | Validated? |
|------------|----------|-------|------------|
| [gap 1] works as [description] | `[id]` | [deferred question: named owner, or `awaiting your reply`; else —] | Pending |
| [gap 2] can be resolved by [approach] | `[id]` | [deferred question: named owner, or `awaiting your reply`; else —] | Pending |

```bash
# Create beads issues for assumptions that need validation:
bd create "Validate: [assumption]" --type=task --priority=2 \
  -d "Assumption from design. If wrong: [impact]"
```

## Rejected Alternatives

### Option: [Alternative Approach Name]

- **Approach**: [What it would have done]
- **Rejected because**: [Specific reasons]
- **Trade-offs**: [What we would have gained/lost]

## Pending Decisions

Design decisions that need stakeholder input - track in beads. A decision the user deferred names the owner they chose:

| Decision Needed            | Beads ID | Owner                                        | Blocks                       |
|----------------------------|----------|----------------------------------------------|------------------------------|
| [What needs to be decided] | `[id]`   | [named owner, or `awaiting your reply`]      | [phase or "execution start"] |
| [Options and trade-offs]   | `[id]`   | [named owner, or `awaiting your reply`]      | [what can't proceed]         |

```bash
# Create beads issues for pending decisions:
bd create "Decide: [brief decision]" --type=task --priority=1 \
  -d "Options: [A, B, C]. Trade-offs: [summary]. Blocks: [what]"
```

Note: Decisions blocking execution should be resolved before `/create_tasks`.

## References

- Research: [research.md](research.md)
- Related designs: [if any]
- External docs: [if any]

````

## Open Question Message

This is the decision form for each of this plan's open questions and each Pending Decision, as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) asks of any decision: the Meanwhile line carries the quality question (the behavior at risk), and the Judgment line says what trade-off needs the user. The question comes first in plain words, because the user decides from this message without beads open.

```
- [The question in plain words] ([id])
  - Meanwhile: the design assumes [assumption]; if that is wrong, [what breaks or has to be redone].
  - Judgment: [the trade-off this needs you for, in one clause]
  - Options:
    a. Answer now: [what the design does with the likely answers]. Buys: no assumption carried into implementation. Cost: [what you need to find out first].
    b. Defer to a named owner: the issue stays open and design.md carries the assumption with that owner. Buys: design proceeds now. Cost: [the rework if the assumption is wrong], found only when the owner answers. [For a decision that blocks "execution start": /wb:create_tasks cannot start until the owner decides.]
    c. Not this plan's question: [why it belongs to other work]. The issue stays open for that work; this design does not depend on it. [Leave c out for a Pending Decision this design created.]
  - Recommendation: [a, b, or c] because [reason].
  - Paste-ready reply: [the one reply that takes the recommended option: `[id]: answer: <answer>`, `[id]: defer to <owner>`, or `[id]: not this plan`]
```

Step 5 writes design.md before the replies arrive, so a question still awaiting one is written as a row under its own id (Assumptions for a `Q:`, Pending Decisions for a `Decide:`) with Owner `awaiting your reply`, the one placeholder BARRIER 3 allows before Step 6. A deferred `Q:` stays a row under the `Q:` issue's own id; do not create a `Validate:` issue for it.

Apply each reply to design.md and to beads:

- `[id]: answer: <answer>`: design.md uses the answer and drops the row; close the issue with the answer as the reason: `bd close [id] --reason "[answer] (create_design, [plan-dir-name])"`. For a `Decide:`, the answer is the chosen option.
- `[id]: defer to <owner>`: put the owner in the row's Owner column and record it on the issue: `bd comments add [id] "deferred by [plan-dir-name] design to [owner]; assumed meanwhile: [assumption]"`.
- `[id]: not this plan`: drop the row and leave the issue open, because closing it would answer another plan's question for it: `bd comments add [id] "not a question for [plan-dir-name]: [reason]"`.

The design is not approved while any row says `awaiting your reply`. An approval that leaves an item without a reply is not approval yet: list the items still without one, restate each option by letter with what it means, and ask again.

## Narrowings

A narrowing is a metric or criterion stricter than the statement it refines: only or never, a fixed placement, a word list, an exact layout. Each one becomes a rule the test-writer pins and the workers must satisfy, so the user sees each one, quoted, before it does. List every line marked `narrows:` under "Choices I made that tighten your intent" in the Step 6 message, one item each, with all five lines below and the quoted text copied verbatim from design.md, never paraphrased:

```
- [AC-n or Mn]: "[the criterion's Then line, or the metric, quoted exactly as design.md has it]"
  - Tightens: "[the statement it refines, quoted]" by [how: only or never, a fixed placement, a word list, an exact layout]
  - Why I chose it: [the reason, and its source: research, a mockup decision, an exploration record, or my own judgment]
  - Guards against: [the criterion's Guards against]
  - If you want it looser: [the wording that checks the statement as written, such as "names the band as a population cut-off" in place of "shows bands only inside the disclosure"]
```

The user's approval covers only the narrowings this list shows; what a narrowing found later is, and when its missing listing is a design defect to correct here, is [Narrowings](../../docs/reference/rules-and-intents.md#narrowings). A reply that rejects one replaces it with the looser wording, and the criterion's Strength stays the metric's.
