# Writing for the User

Shared reference for every message the plugin shows the user: checkpoint and completion reports, halt messages, handoff questions, follow-up lists, audit and validation summaries, and status confirmations.

The user reads these messages to decide what happens next, usually without beads or the plan open. A bare id such as "task .97" or a fragment such as "has false failures" makes them look each item up before they can decide anything, so a message written that way has not done its job.

## Each item says three things

1. **What it is**, in plain words, with the id after it in parentheses as a handle: "the test that the weekly summary never includes draft entries (AC-4, task .12)". An id never stands alone. Spell out an abbreviation the first time a message uses it.
2. **What it means for the user**, with the one concrete detail that makes it clear: what breaks, what is at risk, or why it is fine. "The scan fails on clean code, so people learn to ignore it" says what "has false failures" leaves the user to guess.
3. **What they need to do**: nothing; a decision, with the options, a recommendation, and the reason for it (written as "Decision and halt messages" below says); or a manual check, with what to look at.

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

## Decision and halt messages

A halt, a variance, a handoff question, or any item under Needs your decision asks the user to choose, and they can only choose well when they see what is at stake and what each choice costs. A message that explains the test mechanics, or offers the stock options when they are not the real ones, leaves them to work out the trade-off themselves. Each decision carries four parts, in this order:

1. **Quality question**: the product behavior at risk, in plain words, not the test mechanics. "A change that deletes customer records could ship without the check noticing" says what "the scan skips comments" leaves the user to translate.
2. **Judgment or friction**: say whether a real trade-off needs the user, or the process got stuck. When it got stuck, say so, and say what the plugin should have done instead, so the user knows the decision is mostly about unblocking and can report the gap.
3. **Options**: for each one, what it means concretely (what will be done, to which files or tests), what it buys for testing or quality, its cost and risk, and how hard it is to undo. Offer the generic halt options (continue, discard and retry, treat as a plan defect) only when they are the real choices here; otherwise name the actual ones.
4. **Recommendation and a paste-ready reply**: the option you recommend and the reason, then the exact reply the user can paste to take it, such as `continue: scan comments too with the stricter pattern`.

When a question is asked again, repeat each option's meaning with its number or letter. "Reply (a), (b), or (c)" on its own makes the user scroll back to find what the letters meant.

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

## Example: a decision message

A library app keeps loan history: a loan is marked returned, never deleted. Its outer test scans the source for delete statements on the loans table, and a sanctioned rewrite stopped scanning string literals.

Before:

```
⚠️ Task Failed Re-verification: Phase Halted
Task: .52; issue reopened
What fails: rewritten AC-3 scan skips string literals; exec() of a triple-quoted literal is unmatched; 6 more read-back forms found.
Options: 1. Continue  2. Discard and retry  3. Plan defect
How should I proceed?
```

And when asked again: "Reply 1, 2, or 3."

After:

```
⚠️ Phase halted: the loan-history check lost a case in its rewrite (AC-3, task .52)

Quality question: loans must never be deleted, only marked returned (AC-3). The rewritten check no longer notices a delete written inside a string that the code later runs, so a change that erases loan history that way would pass.
Judgment or friction: mostly friction. The rewrite is sound; the one fix attempt went on a fix that listed the ways a string can be run, and the re-check found ways it missed. The verifier should have proposed one rule for every string and checked it before the attempt was spent.
Options:
1. Apply the class fix: scan strings too, with a pattern that matches only delete statements on the loans table. Keeps every case the original caught and the gap the rewrite closed; checked against 9 planted defects. Cost: one fix pass and a re-verification. Undo: revert one test file.
2. Drop the rewrite and keep the original check. Loses nothing it caught, but comments that mention deleting still trip it, so people learn to ignore it. Cost: the review's finding stays open. Undo: run the sanctioned rewrite again.
3. Accept the rewrite as it is. Fastest, but deletes run from strings go unguarded and the suite stays green, so nobody notices. Undo: easy to do, hard to remember to.
Recommendation: 1, because it is already checked and keeps both the original's reach and the rewrite's fix. How should I proceed?
Paste-ready reply: continue: apply the class fix from the latest verification report
```

And when asked again: "Reply 1 (apply the checked class fix to the rewritten test), 2 (drop the rewrite and keep the original check), or 3 (accept the rewrite, leaving deletes run from strings unguarded)."
