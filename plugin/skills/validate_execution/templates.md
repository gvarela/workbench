# validate_execution — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## Validation Report Template

The user decides from this report whether the plan is done, so it follows [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md): decisions first, then requirements coverage, then test integrity, then follow-ups, each in its own section, and each item named in plain words with its id in parentheses, saying what it means for the user and what they need to do. Requirements coverage and test integrity stay in separate sections, because the user steers product gaps and test housekeeping differently. Code Quality Analysis and Deviations from Plan are evidence: each problem they find is also an item under Needs Your Decision (when it blocks the release) or Follow-ups (when it does not), so the user can act from those two sections alone.

```markdown
# Validation Report: [Project Name]
Generated: [YYYY-MM-DD HH:MM]

## Executive Summary

**Overall Status**: ✅ PASSED | ⚠️ PASSED WITH ISSUES | ❌ FAILED

- Planned Phases: [X]
- Completed Phases: [Y]
- Task Completion: [X]/[Y] tasks ([percentage]%)
- Automated Tests: [PASS/FAIL]
- Manual Testing Required: YES/NO

## Needs Your Decision

Everything that blocks the release: test-review Blocking items, must-fix problems (broken functionality, a security concern, a failing build), and unjustified deviations to revert or accept.

- [each blocking item: what it is in plain words] ([id], `file:line`): [what breaks or is at risk]. Options: [options]. Recommendation: [option and the reason].
- [or "Nothing needs your decision"]

## Verdict per Intent Statement

| Statement (README Intent) | Refining metrics (design.md) | Verdict | Evidence |
| ------------------------- | ----------------------------- | ------- | -------- |
| [statement] | [metric]; [metric] | PASS / FAIL / DEFERRED | [what was checked, one clause] |
| no Intent section (plan predates 3.0.0) | — | — | — |

## Phase-by-Phase Validation

### Phase 1: [Name]
**Status**: ✅ Fully Implemented | ⚠️ Partially Implemented | ❌ Not Implemented

#### Completed Tasks
✅ [Behavior the user can now rely on] ([AC-n], task [id]) - Verified at `file:line`
✅ [Behavior the user can now rely on] ([AC-n], task [id]) - Verified at `file:line`

#### Incomplete/Missing Tasks
❌ [Behavior that is missing, in plain words] (task [id]) - Not found in code; [what the user cannot do yet]
⚠️ [Behavior, in plain words] (task [id]) - Partially complete (missing X); [what that leaves at risk]

#### Success Criteria Results

**Automated Verification**:
- ✅ Tests pass: `make test` (all 45 tests passing)
- ✅ Linting clean: `make lint` (no issues)
- ❌ Build fails: `make build` (error: [specific error])

**Manual Verification Required**:
- [ ] [Manual test 1 from plan]
- [ ] [Manual test 2 from plan]

### Phase 2: [Name]
[Similar structure...]

## Test Integrity

### Test Review
- Blocking: [the reviewer's Blocking items (deterministic failures in tests the plan changed), each with the criterion it guards, its kind, `file:line`, and evidence; also listed under Needs Your Decision; or none]
- Integrity: [N] findings ([M] escalated)
- Findings: [verdict, the criterion the test guards, rubric item, `file:line`, evidence type, and the proof in one clause; criterion coverage gaps; settled candidates marked "n of 3"]
- Review these: [observations that reached no verdict, each with one evidence label]
- Not run: [checks the reviewer listed under Not Run, with reasons]

## Follow-ups

Each item: what it is, what it puts at risk, whether it blocks the release, and when to do it: now, before release (including steps before deployment, such as a review or a documentation update), or later (improvements, and risks to watch in production). An item that blocks is listed under Needs Your Decision, and is named here only as "above".

### Product and Plan
- [behavior gap, design question, or risk in the code (performance, maintainability, a component it may affect), in plain words] ([id] or `file:line`): [what it puts at risk]. Fix: [the proposed fix]. [Blocks (above) / does not block]; [now / before release / later, and for a risk, what to watch]

### Test Quality
- [weak or brittle test, a missing test for a scenario, or a check that fails on correct code, with the criterion it guards] ([id] or `file:line`): [what it lets through or costs]. Fix: [the proposed fix]. [Blocks (above) / does not block]; [now / before release / later]

## Code Quality Analysis

### Pattern Compliance
- ✅ Follows existing error handling patterns
- ✅ Uses established naming conventions
- ⚠️ Inconsistent with logging pattern at `file:line`

## Deviations from Plan

### Justified Deviations
1. **[Description]** at `file:line`
   - Plan specified: [what plan said]
   - Actual implementation: [what was done]
   - Justification: [why it's better]

### Unjustified Deviations
1. **[Description]** at `file:line`
   - Should be: [per plan]
   - Actually is: [current state]
   - Impact: [consequences]
   - Listed under: [Needs Your Decision / Follow-ups]

## Manual Testing Checklist

Copy this checklist for manual verification:

### User Interface
- [ ] Feature appears correctly in UI
- [ ] All user interactions work as expected
- [ ] Error states display properly
- [ ] Performance is acceptable

### Integration
- [ ] Works with existing [component]
- [ ] Data flows correctly through system
- [ ] No regressions in related features

### Edge Cases
- [ ] Handles empty/null inputs
- [ ] Works with maximum data size
- [ ] Graceful degradation on errors

## Appendix: Validation Evidence

### Git Changes Summary
```bash
Files changed: [X]
Insertions: +[Y] lines
Deletions: -[Z] lines
```

### Test Execution Logs

[Include key excerpts from test runs]

### Agent Findings

[Include relevant findings from validation agents]

---

## Validation Completed

**Next Steps**:

1. Decide each item under Needs Your Decision
2. Run the manual testing checklist above
3. Do the follow-ups marked "now" or "before release"

**Validator Notes**:
[Any additional context or observations about the implementation]

```
