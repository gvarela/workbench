---
name: tdd-discipline
description: Use when implementing features, fixing bugs, or writing ANY production code in this session - including quick ad-hoc fixes outside the workflow commands (coordinated workers preload this skill; solo edits must trigger it). Enforces RED-GREEN-REFACTOR cycle where tests must fail before writing implementation code. Activates before coding begins.
user-invocable: false
---

# Test-Driven Development

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

**Outside the named exceptions below, code written before its test is never kept:**

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete

## Red-Green-Refactor

### RED - Write Failing Test

Write one minimal test showing what should happen. Run it. Watch it fail.

**Red is an assertion failure on the intended behavior:**

- The test reached its assertion and failed with the message you expected
- A load, import, or missing-constant error is not red yet: make the code importable, then re-run. A test that never reached its assertion says nothing about the behavior.

Under /wb:implement and /wb:implement_inline, have wb:test-writer write the test; see the test-quality skill.

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

## Named exceptions

This is the only list of work that skips test-first. Anything not named here needs a failing test.

- Harness tasks: prove the harness by a deliberately wrong expectation failing on an assertion, then restore it
- Configuration, documentation, and build scripts
- Refactors already covered by existing tests

## Common Rationalizations

| Excuse | Reality |
| -------- | --------- |
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is debt. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |

## Red Flags - Start Over

- Code before test
- Test passes immediately (didn't see it fail)
- Can't explain why test failed
- "Just this once"
- "This is different because..."

**Outside the named exceptions, each of these means: delete the code and start over with TDD.**

## When Stuck

| Problem | Solution |
| --------- | ---------- |
| Don't know how to test | Write wished-for API first |
| Test too complicated | Design too complicated. Simplify. |
| Must mock everything | Code too coupled. Refactor. |
