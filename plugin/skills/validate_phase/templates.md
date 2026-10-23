# validate_phase — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## Validation Report Template

The user decides from this report whether the phase or the plan is done, so it follows [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md): decisions first, then requirements coverage, then test integrity, then follow-ups, each in its own section, and each item named in plain words with its id in parentheses, saying what it means for the user and what they need to do. Requirements coverage and test integrity stay in separate sections, because the user steers product gaps and test housekeeping differently. The phase-by-phase detail is evidence: each problem it shows is also an item under Needs Your Decision (when it blocks) or Follow-ups (when it does not), so the user can act from those two sections alone.

For a single phase, write one Phase section and the Intent Progress table; for `all`, one Phase section per phase and the Verdict per Intent Statement table.

````markdown
# Validation Report: [Project Name], [Phase N | all phases]
Generated: [YYYY-MM-DD HH:MM]

## Executive Summary

**Overall Status**: ✅ PASSED | ⚠️ PASSED WITH ISSUES | ❌ FAILED

- Phases checked: [N or list]; phase verification: [each phase: PASS or FAIL]
- Automated verification: [each command: passed or failed], run once at [HEAD sha]
- Manual testing required: YES/NO

## Needs Your Decision

Everything that blocks: each unexplained deviation a phase verifier found, each test-review Blocking item, each failing automated check, and (all) each FAIL verdict on a statement the plan did not defer. Each item carries the four parts of the "Decision and halt messages" section in writing-for-the-user.md, and offers only the options that are real choices for it; a deviation's usual options are those "Phase Verification" in implement/reference.md lists (`accept:`, `fix:`, `plan defect:`), and a FAIL verdict's are shipping it short, closing the gap, or deferring the statement (`accept fail:`, `fix:`, `plan defect:`), each routed as the skill's Step 6 says.

- [each blocking item: what it is in plain words] ([id], `file:line`): [what breaks or is at risk]. Number each unexplained deviation D1, D2, ... and each test-review Blocking item T1, T2, ... across the report, so a reply can name it: `accept: D1`, `fix: D2`, `plan defect: D3` for a deviation, and `acknowledge: T1` for a Blocking item, the acknowledgement by name a checkpoint asks for.
  - Quality question: [the product behavior at risk, in plain words, not test mechanics]
  - Judgment or friction: [a real trade-off that needs you, or the process got stuck; if stuck, what the plugin should have done]
  - Options: [each: what it means here, what it buys for testing or quality, its cost and risk, how hard it is to undo]
  - Recommendation: [option and the reason].
  - Paste-ready reply: [the exact reply that takes the recommended option]
- [or "Nothing needs your decision"]

## Verdict per Intent Statement (all)

From [intent-verdicts.md](../../docs/reference/intent-verdicts.md).

| Statement (README Intent) | Refining metrics (design.md) | Verdict | Evidence |
| ------------------------- | ----------------------------- | ------- | -------- |
| [statement] | [metric]; [metric] | PASS / FAIL / DEFERRED / awaiting your manual check | [metric, criterion, outer test, in one clause] |
| no Intent section (plan predates 3.0.0) | — | — | — |

## Intent Progress (single phase)

| Statement (README Intent) | Status after Phase [N] | Evidence |
| ------------------------- | ---------------------- | -------- |
| [statement] | deferred / at risk / not started / awaiting the manual check / met / met so far | [from the phase verifier, in one clause] |

## Phase-by-Phase Validation

### Phase 1: [Name]
**Phase verification**: PASS | FAIL (range [start]..[end])

#### Delivered
✅ [Behavior the user can now rely on] ([AC-n], task [id]) - Verified at `file:line`

#### Deviations
- [D1, when unexplained] Missing planned change: [what the task planned, in plain words] (task [id], `tasks.md:[line]`); [what it puts at risk]; [unexplained: under Needs Your Decision | explained by (record): under Follow-ups]
- [D2, when unexplained] Unplanned change: [what changed, in plain words] at `file:line`; [what it puts at risk]; [unexplained | explained by (record)]
- [or "none"]

#### Earlier Phases' Tests Changed
- `[test file]`: declared by [record] on task [id]; reason given: "[reason]" (or: no task declares it; listed under Deviations)
- [or "none"]

#### Not Run
- [check]: [reason]

### Phase 2: [Name]
[Same structure...]

## Test Integrity

### Test Review ([phase range | whole plan range])
- Blocking: [the reviewer's Blocking items (deterministic failures in tests the range changed), each numbered T1, T2, ... with the criterion it guards, its kind, `file:line`, and evidence; also listed under Needs Your Decision; or none]
- Integrity: [N] findings ([M] escalated)
- Findings: [verdict, the criterion the test guards, rubric item, `file:line`, evidence type, and the proof in one clause; criterion coverage gaps; settled candidates marked "n of 3"]
- Review these: [observations that reached no verdict, each with one evidence label]
- Not run: [checks the reviewer listed under Not Run, with reasons]

## Follow-ups

Each item: what it is, what it puts at risk, whether it blocks the release, and when to do it: now, before release (including steps before deployment, such as a review or a documentation update), or later (improvements, and risks to watch in production). An item that blocks is listed under Needs Your Decision, and is named here only as "above".

### Product and Plan
- [explained deviation, with the record that explains it; Intent statement at risk; behavior gap; check a verifier could not run] ([id] or `file:line`): [what it puts at risk]. Fix: [the proposed fix]. [Blocks (above) / does not block]; [now / before release / later, and for a risk, what to watch]
- Deferred design question, still open (all): [each, in the form and under the rules of [deferred-design-questions.md](../../docs/reference/deferred-design-questions.md), which also says how to handle an answer given here]

### Test Quality
- [weak or brittle test, a missing test for a scenario, or a check that fails on correct code, with the criterion it guards] ([id] or `file:line`): [what it lets through or costs]. Fix: [the proposed fix]. [Blocks (above) / does not block]; [now / before release / later]

## Manual Testing Checklist

From design.md's manual checks for the phases checked; for `all`, include each metric a phase verifier marked "awaiting the manual check", since its verdict waits on your answer.

- [ ] [Manual check, in plain words] ([metric or criterion id])

## Appendix: Validation Evidence

### Git Changes Summary
```bash
Range: [start]..[end]
Files changed: [X]; insertions: +[Y]; deletions: -[Z]
```

### Test Execution Logs

[Key excerpts from the automated verification runs]

---

## Validation Completed

**Next Steps**:

1. Answer each item under Needs Your Decision by name: each deviation and Blocking item by its number, each FAIL verdict by its statement
2. Run the manual testing checklist above and report each result
3. Do the follow-ups marked "now" or "before release"

````
