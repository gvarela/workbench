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

1. **Needs your decision**: everything that holds the work: blocking test failures to acknowledge, halts, a proposed outer-test rewrite to sanction, a handoff question. Each new item gives the options and a recommendation; an item asked before and still pending gets its one-line reminder ("Pending decisions" below).
2. **Decisions I made for you**: each call made in the user's name since the last report, one line each with the reply that reverses it: each `judged:` record ([Acting within purpose](rules-and-intents.md#acting-within-purpose)) and each step taken under a delegation ([Delegations](rules-and-intents.md#delegations)). The user can only overrule a call they can see.
3. **What this phase delivered**: organized by requirement. Each acceptance criterion and task done is described as behavior the user can now rely on ("a reset link opened after two hours now shows the expired page"), followed by the manual checks to run.
4. **Test integrity**: outer tests written red first, the verifiers' integrity results, test-review findings, and test rewrites, each tied to the criterion it guards.
5. **Follow-ups**, in two groups: **product and plan** (behavior gaps, design questions, risks in the code such as security or performance) and **test quality** (weak or brittle tests, checks that fail on correct code). Each item says whether it blocks and when to do it.

A section with no items stays as one line ("Nothing needs your decision"), so the user can see it was checked.

## Decision and halt messages

A halt, a variance, a handoff question, or any item under Needs your decision asks the user to choose, and they can only choose well when they see what is at stake and what each choice costs. A message that explains the test mechanics, or offers the stock options when they are not the real ones, leaves them to work out the trade-off themselves. Each decision carries four parts, in this order:

1. **Quality question**: the product behavior at risk, in plain words, not the test mechanics. "A change that deletes customer records could ship without the check noticing" says what "the scan skips comments" leaves the user to translate.
2. **Judgment or friction**: say whether a real trade-off needs the user, or the process got stuck. When it got stuck, say so, and say what the plugin should have done instead, so the user knows the decision is mostly about unblocking and can report the gap. When the decision rests on a rule, ask as [Asking about a rule](rules-and-intents.md#asking-about-a-rule) says; a `strength: aim` line whose purpose is not at stake is not a decision to ask about ([Acting within purpose](rules-and-intents.md#acting-within-purpose)).
3. **Options**: for each one, what it means concretely (what will be done, to which files or tests), what it buys for testing or quality, its cost and risk, and how hard it is to undo. Offer the generic halt options (continue, discard and retry, treat as a plan defect) only when they are the real choices here; otherwise name the actual ones.
4. **Recommendation and a paste-ready reply**: the option you recommend and the reason, then the exact reply the user can paste to take it, such as `continue: scan comments too with the stricter pattern`.

When a question is asked again, repeat each option's meaning with its number or letter, in the one-line reminder the next section describes. "Reply (a), (b), or (c)" on its own makes the user scroll back to find what the letters meant.

## Pending decisions

A run that asks the user the same thing several times, in full each time, buries the new questions under the old ones and wears the user down until they answer without reading. Keep one pending-decisions ledger for the run instead:

- **One ledger, one id per decision.** Each decision gets its id once, when it is first asked (T1, T2 for blocking items; D1, D2 for deviations; the halt or rewrite it is about for others), and keeps it until it is answered. Ask it in full, with the four parts above, only that first time.
- **Reminders are one line.** A later message lists each decision still pending as one line, with its id, its subject in plain words, and its options in a few words each: "T2 (AC-4 receipt test changed after red): acknowledge, or revert the change". Never re-ask it in full, and never drop it while it is pending.
- **A reply can name a set.** "acknowledge: T1-T3", "accept: D1-D4", or "T1, T3: acknowledge" answers each decision it names the same way. A set is still a reply by name: expand it against the ledger into the ids it names, and act on it only when every one of those ids exists, is still pending, was shown to the user in full (its question and options) before their message, and is of one kind (all T, or all D, and so on) that the reply's answer fits. Reject the whole set, act on none of it, and list the unresolved ids with why, when it has a gap (T1-T4 where T3 does not exist), names an id already answered, one never shown in full, one created after the user's message, or mixes kinds; then ask again with the one-line reminders.
- **A general go-ahead answers nothing.** "Go", "implement", "continue", "looks good", or "do it" names no decision, so it acknowledges no blocking item, answers no deviation, and sanctions no rewrite or other change that needs the user; say which decisions are still pending in the one-line form.
- **Echo what a reply did not name.** Act on a reply only for the items it names. For each pending item it leaves unnamed, echo it back in one line with the reply that would answer it: "R2 not sanctioned — reply sanction: R2". This holds in every mode, so the user sees at once what their reply did not do, instead of finding out at the next checkpoint.
- **Record the reply in the user's words.** Before acting on a reply to a decision, post it verbatim as a `user reply:` record on the issue it answers (the phase milestone for a checkpoint, the task for a halt), through a scratch file as "Posting text to beads" in [non-interactive-shell.md](non-interactive-shell.md) says, since a reply can hold any character. Never paraphrase a reply into a record: a paraphrase is your reading of the decision, and the record exists so anyone can check that reading against what the user said.
- **A rule-based ask shows the rule.** When a decision exists because a rule stopped the work (a plan line, a criterion, a wb rule, a memory), ask as [Asking about a rule](rules-and-intents.md#asking-about-a-rule) says: a rule asked about without its purpose leaves the user to rediscover why it exists.
- **Keep working while it is pending.** A pending question that is not a halt holds only the tasks that depend on it: keep running the tasks [Independent work](rules-and-intents.md#independent-work) shows independent of it, record in its ledger entry the task ids checked with each verdict, and say in the reminder which tasks wait on it.
- **Product wording goes first.** A conflict in the plan's product wording (a criterion's text against its example, two criteria that disagree, copy the design states one way and an example another) is a product question only the user can answer. Raise every one you find when you read the plan, together, before the phase's first task, not one at a time mid-task when a worker or verifier trips over it.

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

And as a reminder while it is still pending: "Halt on the loan-history check (AC-3, task .52): reply 1 (apply the checked class fix to the rewritten test), 2 (drop the rewrite and keep the original check), or 3 (accept the rewrite, leaving deletes run from strings unguarded)."
