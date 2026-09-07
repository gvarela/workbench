---
name: explore_design
description: Facilitated architecture discussion between research and design: explores directions as possibilities, converges only on explicit user approval, and records the decision durably (thoughts/ doc plus a closed Decide: issue). Use when a design has open trade-offs or competing directions, or the user wants to think through options before committing; skip when the decision is already made. Recommended on Fable. Takes the project directory.
argument-hint: [project-directory]
allowed-tools: Read
effort: high
---

# Explore Design Options

Runs a facilitated architecture discussion (frame → diverge → discuss → converge → record) between `/wb:create_research` and `/wb:create_design`. You are a **thought partner**, not a document producer: the session's job is to help the user genuinely weigh alternatives before anything is committed.

The stage produces two durable outputs:

1. **Exploration record** — one or more docs under `[project-dir]/thoughts/` capturing the directions considered and the discussion (elastic: scales with problem size)
2. **Decision record** — a closed `Decide:` beads issue carrying the chosen direction, rationale, and thoughts-doc path(s) (fixed shape: the hand-off `/wb:create_design` consumes)

design.md is NOT written by this stage — it remains the sole formal design artifact, written later by `/wb:create_design`.

Supporting file: [templates.md](templates.md) — the thoughts-doc template and the `Decide:` record command shapes. Read the named section when a step directs you to it.

## Model Self-Check (do this FIRST)

This is the most judgment-dense, divergent stage in the workflow — it wants the strongest available model. **Recommended: Fable. Minimum comfortable: Opus.**

Before anything else, check which model this session is running. If it is below Opus (e.g., Sonnet or Haiku), surface this to the user:

```
⚠️ Model check: this session is running [model]. explore_design is a
judgment-heavy discussion stage — Fable is recommended (Opus as fallback
under usage limits). Results on lighter models may converge too quickly
or miss trade-offs.

Continue on [model], or restart this stage in a stronger session?
```

Do NOT block — if the user chooses to continue, proceed. This is guidance, not enforcement.

## CRITICAL: This Stage Produces POSSIBILITIES, Not Commitments

These rules hold for the ENTIRE session, every step:

- **Directions are possibilities with trade-offs, NEVER decisions** — present nothing as chosen until the user explicitly chooses it
- **NO implementation detail** — no code, no file-modification lists, no step-by-step procedures (that's execution planning)
- **NO task breakdowns or phase plans** (that's `/wb:create_tasks`)
- **NO writing or seeding design.md** (that's `/wb:create_design`)
- **NO chosen answer unless the user chose it** — do not let a favorite emerge in your framing; steelman every direction
- **Convergence happens ONLY on an explicit user signal** at the Step 5 CHECKPOINT — never infer approval from enthusiasm, silence, or leading questions

If the user pushes toward implementation detail mid-discussion, note it in the thoughts doc as a consideration and steer back to the decision level.

## Initial Response

This stage needs from you: reactions to the directions as they are drafted, and an explicit approval of one before anything is recorded.

When invoked, check for arguments:

1. **If directory provided** (e.g., `/wb:explore_design docs/plans/2025-01-08-auth/`):
   - Use `$1` as the project directory
   - Any further text is the decision focus (optional)
   - Begin at Step 1

2. **If no arguments**:

   ```
   I'll facilitate an architecture discussion before design. Please provide:
   1. Path to the project documentation directory (e.g., docs/plans/2025-01-08-auth/)
   2. The decision you're facing, if you can name it (optional — we can frame it together)

   I'll read the research, frame the decision space, and explore directions with you.
   ```

## Workflow Position

This stage is **optional** and sits between `/wb:create_research` and `/wb:create_design`:

```
create_project → create_research → [explore_design (optional)] → create_design → create_tasks
```

Two ways to use it:

1. **Within the wb pipeline**: after research completes, when the architectural choice deserves genuine divergence. `/wb:create_design` will detect the closed `Decide:` record and formalize the decision instead of generating options.

2. **Standalone**: for an architecture discussion on an existing project directory that already has completed research — even if you're not sure yet whether it leads to a design.

**When to invoke** (any of these):

- Research surfaced multiple viable approaches
- The change is cross-cutting or introduces a new subsystem
- The choice is hard to reverse (schema, API contract, new dependency)
- A wrong architecture would cascade into downstream work

**When NOT to invoke** (skip straight to `/wb:create_design`):

- Small, well-scoped fixes (e.g., a ticketed bug fix with an obvious change site)
- Research shows a single viable approach
- The change follows an established pattern already in the codebase
- `create_design`'s built-in option step (2–3 options + approval) is proportionate to the decision

## Process Steps

### Step 1: Entry Gate and Context Reading

**Entry gate** — verify the project is ready for this stage:

1. Check `[project-dir]/research.md` exists and its frontmatter reads `status: complete`
2. **If missing or not complete**, refuse with guidance:

   ```
   ⚠️ explore_design needs completed research as its input.

   [project-dir]/research.md is [missing | status: [status]].

   Run /wb:create_research [project-dir] first — this stage explores
   directions grounded in documented facts, not assumptions.
   ```

   Stop here. Do not proceed on partial research.

**⛔⛔⛔ BARRIER 1: STOP! Read ALL context FULLY before framing anything ⛔⛔⛔**

Read fully (no limit/offset):

- `[project-dir]/research.md` — the factual ground truth
- Read the project's `README.md` FULLY; record the `## Intent` section's Goal, success statements, and Non-goals if it has one. Plans without an Intent section are framed against the research question instead (say so in the framing: "no Intent section; plan predates 3.0.0").
- Every existing doc under `[project-dir]/thoughts/` — prior explorations may already frame or partially answer the decision
- `[project-dir]/design.md` if present — check it isn't already written (status beyond `draft` means the decision may already be formalized; surface this to the user before continuing)
- Any files the user mentioned directly

Also check for open planning questions:

```bash
bd list -n 0 --status=open | grep "Q:"       # unresolved research questions
bd list -n 0 --status=open | grep "Decide:"  # decisions already pending
```

Both greps are substring matches — count only issues whose **title begins with** the prefix; ignore mid-title mentions. Open `Q:` issues that bear on the decision should be surfaced during framing. An open `Decide:` issue for this same decision means a prior session framed it — adopt it rather than creating a duplicate (close it at Step 6 instead of creating a new one).

**Identify what is actually being decided** — the stated question is often one layer above or below the real fork.

### Step 2: Frame the Decision Space

Present the decision space to the user and confirm it before diverging:

1. **Name the decision(s)** — what fork(s) in the road does research reveal? Number them if there are several.
2. **Name the constraints** — facts from research.md that bound the space (patterns to respect, contracts that exist, precedents), and the Intent's success statements this decision bears on (a direction that makes a statement unreachable is out of bounds unless the Goal is amended)
3. **Name what's already fixed** — anything the user has pre-decided (record these as user choices, not open questions)

```
Based on the research, here's the decision space I see:
Goal (from README Intent): [the Goal sentence, or "no Intent section; plan predates 3.0.0"]

1. **[Decision axis 1]** — [what's being chosen and why it's open]
2. **[Decision axis 2]** — [...]

Constraints from research: [...]
Success statements this decision bears on: [statement]; [statement]
Already fixed (your prior choices): [...]

Does this framing match the decision you're facing? Anything missing,
mis-framed, or already decided?
```

**Wait for user confirmation of the framing before proceeding.**

**Start the exploration record NOW**: create `[project-dir]/thoughts/YYYY-MM-DD-[topic-slug].md` from the "Thoughts Doc Template" section of [templates.md](templates.md) — read it NOW. Capture the confirmed framing as its first section. This doc is updated **continuously** through Steps 3–5, not reconstructed at the end.

### Step 3: Diverge — Draft Directions

Draft **2–4 genuinely distinct directions** through the decision space. Distinct means different architectures or philosophies — not one idea with three names.

For each direction:

- A short evocative name and one-line thesis
- The approach in decision-level terms (no implementation detail)
- Strengths, weaknesses, main risk
- Precedent in the codebase if research found one

**Elastic divergence** (your judgment, informed by scope):

- **Default**: draft the directions yourself in-session — coherent, cheap, right for most decision spaces
- **Fan out drafting subagents** (one per direction, e.g. sonnet) only when scope genuinely warrants it — many-axis decision spaces or directions each needing substantial independent development. You then spend your effort judging and comparing rather than typing. Subagents draft possibilities only — they inherit the CRITICAL rules above; never let a subagent conclude with a recommendation.

Present all directions together, evenly steelmanned. **Capture them in the thoughts doc as you go.**

### Step 4: Discuss — Trade-off Interview

Work through the directions with the user. This is the heart of the stage — do not rush it.

Useful moves (adapt, don't script):

- What breaks under each direction? What's irreversible?
- Which constraint or priority dominates? (speed, simplicity, reversibility, consistency…)
- Pressure-test against concrete scenarios ("how does the small-ticket case flow through each?")
- Reframe when the user's reaction reveals the framing was off — reframing IS progress; return to Step 2 explicitly if the space shifts
- Hybrids are legitimate outcomes: a direction may survive as a branch of another

```
Please react to any of these — we can go deep on one, compare two,
or pressure-test against a scenario you care about.
```

**Wait for user responses before proceeding. Never advance past discussion on your own initiative.**

**Capture continuously**: append key moves, user reactions, discarded branches, and emerging hybrids to the thoughts doc as they happen. The doc's value is that a reader who wasn't present can follow how the thinking moved.

### Step 5: Converge — ⛔ CHECKPOINT

When discussion stabilizes around a direction, present it for explicit approval:

```
⛔ CHECKPOINT: Converging on a direction

**Proposed direction**: [name + one-paragraph summary]
**Why (rationale from our discussion)**: [...]
**What we're consciously giving up**: [trade-offs accepted]
**Explored but not chosen**: [other directions, one line each]

Do you approve this direction? (This becomes the decision of record
that /wb:create_design formalizes.)
```

**Get explicit approval on the chosen direction before proceeding.** A clear affirmative ("GO", "approved", "yes, that one") is required — not enthusiasm about an option mid-discussion.

- **If the user isn't ready**: return to Step 4 (more discussion) or Step 3 (new directions). No limit on iterations.
- **If the session ends without convergence**: that's a valid outcome — finalize the thoughts doc (status stays `exploration`), do NOT create a closed `Decide:` issue, and tell the user the stage can be re-run to continue from the captured state.

### Step 6: Record the Decision

**⛔ BARRIER 2: Complete BOTH records — the hand-off is not durable until both exist ⛔**

1. **Finalize the thoughts doc**: add the required **Synthesis** section (converged direction, rejected-with-reasons, deferred items) per the template. Verify frontmatter is complete. When editing, locate sections by their headings — the doc has been continuously rewritten during Steps 3–5, so earlier placeholder or template text may no longer exist verbatim.

2. **Create and close the `Decide:` record**: read the "Decide: Record Shapes" section of [templates.md](templates.md) NOW and follow it exactly — create the issue with options + trade-offs in the description, then close it with the chosen direction + rationale + relative thoughts-doc path(s) in the close reason. The description's first line cites the Goal: `Goal: [the README Goal sentence]`, before `Options considered`.

   Lifecycle semantics: an **open** `Decide:` issue means a pending decision (the existing convention); a **closed** one means decided, rationale in the close reason. This stage creates and closes in one session because the decision is made here. `/wb:create_design` finds it via:

   ```bash
   bd list -n 0 --status=closed | grep "Decide:"
   ```

3. **Verify the record is queryable**: run that exact command and confirm the new issue appears. (The grep is a substring match — consumers count only titles that BEGIN with `Decide:`, which is why the record's title must carry the prefix in first position.)

4. **Record any Goal or Non-goal change**: if the converged direction changes what the plan is for or what it will not do, append a dated line under the README's `**Amendments**` list (`- YYYY-MM-DD: [what changed and why] (explore_design, [Decide: issue-id])`) and replace the placeholder line if it is still there. Success statements are not amended here; create_design refines them into metrics.

If any `bd` command fails: run `bd info` to diagnose, report the specific error, fix (see Error Handling), and retry. Do not finish the stage with the beads record missing.

### Step 7: Confirm Completion

```
✅ Exploration complete — decision recorded.

**Decision**: [Decide: title] ([issue-id], closed)
**Chosen direction**: [name]
**Exploration record**: [project-dir]/thoughts/[filename].md

What was considered: [N] directions ([names])
Deferred to design: [items, if any]

Next: /wb:create_design [project-dir] — it will detect the decision
record and formalize it into design.md (in this session or a fresh one;
the records above carry everything it needs).
```

## Important Notes

### The Three Layers

1. **Capture** (thoughts/): continuous, low-ceremony, elastic — fidelity of the exploration
2. **Synthesis** (closed `Decide:` issue): small, fixed shape — the machine-findable hand-off
3. **Specification** (design.md): written later by `/wb:create_design`, NOT by this stage

"Fixed hand-off, elastic exploration": the thoughts record scales with the problem; the `Decide:` record is the same small thing regardless.

### Cold-Start Discipline

Write both records for a reader with **zero conversational history**. The test this stage must pass: `/wb:create_design` in a fresh session, from research.md + the decision record + the thoughts doc(s) alone, produces the same design a warm session would. If a rationale only makes sense with the conversation in front of you, it isn't captured yet.

### Scope Elasticity

A small decision deserves a small run: frame in a paragraph, two directions, a short exchange, a one-note synthesis. Do not inflate ceremony to match the template — the template marks what must exist, not how long it must be.

## Error Handling

- **Project directory missing** → confirm the path; suggest `/wb:create_project` if the project doesn't exist yet
- **research.md missing or not `status: complete`** → refuse with the Step 1 guidance; this stage does not run on assumptions
- **design.md already `ready` or beyond** → surface it: the decision may already be formalized; ask whether the user wants to revisit (which implies design.md will need rework via `/wb:create_design` afterward)
- **beads not initialized / `bd` errors** → `bd info` to diagnose; common fixes: `bd init` (not initialized), `bd list` to find correct IDs, wait-and-retry (database locked). The thoughts doc still gets written; the `Decide:` record must follow once beads works
- **User diverges into implementation detail** → capture the detail as a note in the thoughts doc, steer back to the decision level

## Synchronization Points

1. **Model self-check** — at open, before anything else
2. **⛔ BARRIER 1** — after entry gate: ALL context read fully before framing
3. **Framing confirmation** — user confirms the decision space before divergence
4. **Discussion hard waits** — never advance past Step 4 without user responses
5. **⛔ CHECKPOINT** — convergence only on explicit user approval
6. **⛔ BARRIER 2** — both records written and verified before completion
