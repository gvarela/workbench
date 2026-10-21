# Writing for the User

Shared reference for every message the plugin shows the user: checkpoint and completion reports, halt messages, handoff questions, follow-up lists, audit and validation summaries, and status confirmations.

The user reads these messages to decide what happens next, usually without beads or the plan open. A bare id such as "task .97" or a fragment such as "has false failures" makes them look each item up before they can decide anything, so a message written that way has not done its job.

## Each item says three things

1. **What it is**, in plain words, with the id after it in parentheses as a handle: "the test that the weekly summary never includes draft entries (AC-4, task .12)". An id never stands alone. Spell out an abbreviation the first time a message uses it.
2. **What it means for the user**, with the one concrete detail that makes it clear: what breaks, what is at risk, or why it is fine. "The scan fails on clean code, so people learn to ignore it" says what "has false failures" leaves the user to guess.
3. **What they need to do**: nothing; a decision, with the options, a recommendation, and the reason for it; or a manual check, with what to look at.

## Order and length

- Items that need the user's input come first, so the decision is not buried under the routine.
- An item that needs nothing gets one line.
- A follow-up list says, for each item, whether it blocks the phase or the release, and recommends when to do it (now, before release, or later). An item that blocks is also listed under Needs your decision, and the follow-up list points to it there instead of repeating it.

## Sections of a report

A phase checkpoint, a phase completion report, and a validation report keep product progress apart from test-quality housekeeping, because the user steers the two differently and cannot tell them apart when they are mixed. Use these sections, in this order:

1. **Needs your decision**: everything that holds the work: blocking test failures to acknowledge, halts, a proposed outer-test rewrite to sanction, a handoff question. Each item gives the options and a recommendation.
2. **What this phase delivered**: organized by requirement. Each acceptance criterion and task done is described as behavior the user can now rely on ("a reset link opened after two hours now shows the expired page"), followed by the manual checks to run.
3. **Test integrity**: outer tests written red first, the verifiers' integrity results, test-review findings, and test rewrites, each tied to the criterion it guards.
4. **Follow-ups**, in two groups: **product and plan** (behavior gaps, design questions, risks in the code such as security or performance) and **test quality** (weak or brittle tests, checks that fail on correct code). Each item says whether it blocks and when to do it.

A section with no items stays as one line ("Nothing needs your decision"), so the user can see it was checked.

## Where ids stay as they are

Beads comments, commit messages, and prompts from one agent to another keep bare ids, because there the reader is a tool or an agent that looks the id up, and the id is the point.

## Example

Before:

```
- .38 (AC-7), commit 1a2b3c4: receipt check now also covers cancellations.
Follow-ups (don't gate this phase):
- .41: the AC-7 check is weak.
- .44: export limit not enforced.
```

After:

```
Needs your decision
- The export size limit is documented but not enforced (task .44): a large export can exhaust memory on the server. Blocks the release, not this phase. Options: enforce it now, or before release. I recommend before release, because the next phase changes the export path anyway.

What this phase delivered
- Cancelling an order no longer sends a receipt (acceptance criterion AC-7, task .38, commit 1a2b3c4).
- Manual check: cancel a test order and confirm no receipt email arrives.

Test integrity
- The outer test for cancelled-order receipts (AC-7) was committed failing before the change and passes now; the verifier found no changed or undeclared tests.

Follow-ups
- Product and plan: the export size limit, above.
- Test quality: the cancelled-order receipt test (AC-7, task .41) checks only that a message was queued, not what it says; the behavior works today. Does not block; do it in the next phase.
```
