---
project: wb-eval-harness
created: 2026-08-02
status: exploration
topic: v1 sequencing — behavioral centerpiece vs cheap tiers first
tags: [thoughts, exploration, wb-eval-harness, sequencing]
author: gabevarela
git_branch: main
repository: gvarela/workbench
---

# Decision: Centerpiece First

Captured from the 2026-08-01/02 discussion (Fable session, post-v2.2.0 release). Direction-level
decision ahead of the research phase; the [2026-06-10 pre-research](2026-06-10-eval-design-discussion.md)
tier sketch stands, this settles what v1 builds first.

## Landscape changes since the 2026-06-10 sketch

Seven weeks of work altered the ground under the original discussion:

1. **Three eval techniques were validated in production** that the sketch predates:
   - **Blind-trial method** (validated on the explore_design nudge, `prompts-01d`): fresh-context
     subagents given verbatim skill text + a synthesized fixture, never the expected answer;
     forced-choice mechanical assertion. Measured a real 0/3 discrimination failure, drove a
     wording fix, re-ran red→green. ~27k tokens/trial.
   - **Parity-baseline byte-diff** (explore-design-stage Phase 2): frozen pre-edit extract diffed
     against the post-edit no-record branch — the fast-path no-op guarantee, mechanically.
   - **Transcript-audit trawlers** (fitness-agent review, 2026-07-31): subagent analysis of real
     session transcripts. Found four genuine defects in one pass (bd `--notes` replace semantics,
     harness-side stale skill-body caching, discipline skills never elected, cross-skill template
     drift).
2. **None of those four production defects would have been caught by the sketched tiers** — all
   were integration/environment failures, not prompt-content failures a fixture dry-run exercises.
3. The plugin/ packaging split shipped (v2.2.0), confirming the sketch's packaging plan: evals
   live at repo root, co-versioned, never cached into installs.
4. RELEASING.md already commits to the tier vocabulary (Tier 0 per PR, Tier 2 per bump, Tier 3
   for behavior-shaping changes) — process contract exists, tooling doesn't.

## The decision space

- **Cheap-first**: build Tier 0 extensions (semantic bd assertions against a scratch db),
  a blind-trial runner, and a transcript-audit tier now (days each, proven yield); defer the
  Faraday fixture until a failure class demands behavioral pressure testing.
- **Centerpiece-first**: build the pinned-Faraday fixture + Tier 2/3 behavioral suites first;
  cheap tiers accrete afterward as failures teach us what to codify.

## Converged direction (decided by Gabe, 2026-08-02)

**Centerpiece first.** Rationale, in his framing: the cheap checks only encode failures we
already understand — by themselves they don't help with *quality*. The behavioral centerpiece is
the quality instrument: it is forward-looking (catches capability regressions from model
upgrades, quality loss from trims, discipline erosion under pressure) and it *generates* the
understanding of failure modes that the cheap tiers later codify. Sequencing follows: fixture +
Tier 2/3 first; Tier 0/1 extensions and the transcript-audit tier are added on top as
understanding accumulates.

Notes attached to the decision:

- The already-validated methods are not discarded — they are the "add on top" layer, and two
  (parity diff, markdown lint hook) effectively exist today.
- The trims (prompt-modernization Phase 4, deferred) remain blocked behind Tier 3 as originally
  designed — the centerpiece is their gate.
- Design principle carried forward from the nudge validation: prefer forced-choice mechanical
  assertions over open LLM-judge rubrics wherever the fixture can be designed that way.

## Rejected alternative

Cheap-first (proposed by the session): best defects-per-dollar record to date, but every
technique in it is backward-looking — regression nets over known failure classes. Rejected as
the *lead* investment, retained as the accretion layer.

## Next

Research phase (`/wb:create_research docs/plans/2026-06-10-wb-eval-harness/`) to settle the five
open questions from the pre-research doc — Faraday v1.10.x SHA verification, submodule behavior
under marketplace install, Tier 3 per-run cost, judge reliability, golden-run stability across
model upgrades — now with the centerpiece-first lens fixed.
