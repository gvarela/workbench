---
name: tdd-discipline
description: Use when implementing features, fixing bugs, or writing any production code - enforces RED-GREEN-REFACTOR cycle where tests must fail before writing implementation code. Activates before coding begins.
---

# Test-Driven Development

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

**No exceptions:**

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete

## Red-Green-Refactor

### RED - Write Failing Test

Write one minimal test showing what should happen. Run it. Watch it fail.

**Verify failure is correct:**

- Test fails (not errors)
- Fails because feature missing (not typos)
- Failure message matches expectation

### GREEN - Minimal Code

Write simplest code to pass the test. Nothing more.

**Don't:**

- Add features beyond the test
- Refactor other code
- "Improve" beyond what test requires

### REFACTOR - Clean Up

After green only:

- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is debt. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "TDD will slow me down" | TDD faster than debugging. |

## Red Flags - STOP and Start Over

- Code before test
- Test passes immediately (didn't see it fail)
- Can't explain why test failed
- "Just this once"
- "This is different because..."

**All of these mean: Delete code. Start over with TDD.**

## Quick Reference

| Phase | Action | Verify |
|-------|--------|--------|
| RED | Write test | Fails for right reason |
| GREEN | Minimal code | Test passes, others still pass |
| REFACTOR | Clean up | All tests still green |

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API first |
| Test too complicated | Design too complicated. Simplify. |
| Must mock everything | Code too coupled. Refactor. |
