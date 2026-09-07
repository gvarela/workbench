# explore_design Templates

Templates for the stage's two durable outputs. The SKILL.md steps direct when to read each section.

## Thoughts Doc Template

Create at `[project-dir]/thoughts/YYYY-MM-DD-[topic-slug].md` during Step 2 (framing) and update continuously through Steps 3–5. Internal structure below the frontmatter is a guide, not a schema — scale it to the problem. **Only the frontmatter and the Synthesis section are required.**

```markdown
---
project: [project-name]
created: YYYY-MM-DD
status: exploration
topic: [one line: the decision this doc explores]
tags: [thoughts, exploration, [project-name]]
---

# Exploration: [Topic]

[One-paragraph orientation: what decision this session explored, what the
inputs were (link research.md and any prior thoughts docs), and what it
produced (the Decide: record, once it exists).]

## Decision Space

[The framing as confirmed by the user in Step 2: the decision axes,
constraints from research, and anything the user pre-decided.]

## Directions Considered

[Each direction as drafted in Step 3: name, thesis, approach at the
decision level, strengths/weaknesses/main risk, codebase precedent.]

## Discussion

[Key moves from Step 4, in order: user reactions, pressure tests,
reframings, hybrids that emerged, branches discarded and why. Write for
a reader who wasn't present.]

## Synthesis

[REQUIRED — the cold-start summary. Complete this at Step 6:]

- **Converged direction**: [name + what was explicitly approved, dated]
- **Rationale**: [why this direction won, in terms of the discussion]
- **Rejected (with reasons)**: [each unchosen direction and why — these are
  explored options preserved per the thoughts/ convention, not failures]
- **Deferred to design**: [questions intentionally left for /wb:create_design]

[If the session ended WITHOUT convergence: state that plainly here, list
where the discussion stood, and leave the rest of the Synthesis fields out.]
```

Frontmatter notes:

- `status: exploration` never progresses — thoughts docs have no lifecycle; the decision's lifecycle lives in the `Decide:` issue
- Optional additional fields consistent with other project artifacts: `author`, `git_branch`, `repository`
- Multiple thoughts docs per session are fine (e.g., pre-work carried in, plus the session record) — the `Decide:` close reason lists every path that informed the decision

## Decide: Record Shapes

The fixed-shape hand-off. Create AND close within the stage (Step 6) — the decision was made at the CHECKPOINT, so the issue is born resolved.

Lifecycle semantics: **open** `Decide:` = pending decision (the existing planning-prefix convention); **closed** `Decide:` = decision made, rationale in the close reason.

### Create (description = the space that was explored)

```bash
bd create "Decide: [decision summary, e.g. 'architecture for X stage']" \
  --type=task --priority=1 \
  -d "Goal: [the README Goal sentence].
Options considered: [A — one-line thesis; B — one-line thesis; C — ...].
Key trade-offs: [the axes that mattered in discussion].
Exploration: [relative path(s) to thoughts doc(s)]"
```

Capture the issue ID from the output.

If Step 1 found an **existing open** `Decide:` issue for this same decision (framed by a prior session), skip the create — close that issue instead.

### Close (reason = the decision of record)

```bash
bd close [issue-id] \
  --reason "Chosen: [direction name] — [one-line thesis].
Rationale: [why it won, cold-readable].
Rejected: [unchosen directions, one clause each].
Exploration: [relative thoughts path(s), e.g. docs/plans/YYYY-MM-DD-project/thoughts/YYYY-MM-DD-topic.md]"
```

Requirements for the close reason (this is what `/wb:create_design` reads cold):

- **Chosen direction + rationale** must stand alone — sensible without the conversation
- **Thoughts path(s)** must be repo-relative so a fresh session can read them
- Keep it a summary — depth lives in the thoughts doc's Synthesis section

### Amend (after close)

If the record needs correcting later — a finding withdrawn, a constraint added:

```bash
bd show [issue-id]    # READ the current notes FIRST — the next command REPLACES them
bd update [issue-id] --notes="[existing notes carried forward verbatim]

AMENDMENT [YYYY-MM-DD]: [what changed and why]"
```

**⚠️ `--notes` replaces wholesale — it does NOT append.** Writing notes without carrying the existing text forward silently destroys prior amendments (this happened in production). If `bd comments` is available, prefer `bd comments add [issue-id] "[amendment]"` — comments append by nature and preserve history.

### Verify

```bash
bd list -n 0 --status=closed | grep "Decide:"
```

The new record must appear. This exact query is how `/wb:create_design` discovers decisions of record. The title MUST begin with `Decide:` (first position) — consumers ignore mid-title mentions, since the grep is a substring match.
