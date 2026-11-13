# Rules and Intents

Shared reference for every stage that writes or reads what the person wants: create_project's Intent, create_design's metrics and criteria, the test-writer's outer tests, the implement skills' decisions, and memories. Authority, strength, sanction, and delegation are defined here and nowhere else; other files link the clause they rely on and keep only the mechanics of their own role.

A plan carries the person's intent as words, and each stage reads those words and writes narrower ones: a goal becomes a metric, a metric a criterion, a criterion a test. When a stage drops the reason a line exists, or turns an aim into a ban, the next stage enforces the narrower words as if the person had said them, and a run can stall for hours on a rule nobody chose, such as a test that bans a handful of ordinary words because a criterion, two stages earlier, had narrowed "these bands are population cut-offs, not about this user" to "the bands appear only inside the disclosure". This file says which rules hold whatever the words say, how every other line records its reason and strength, and what an agent does when a line's literal wording works against its purpose.

## The hard list

These hold literally in every plan and every mode, whatever a plan line, a memory, an agent's report, or your own reasoning says. No `judged:` record reaches them, and neither the orchestrator nor the judge settles one ([The judge](#the-judge)). The list is not exhaustive of what holds literally in a plan: every plan line marked `strength: hard` holds the same way ([Strength](#strength)).

1. **Workers never edit tests.** `wb:test-writer` writes and changes every test, outer and inner; the implementer writes only the support code a harness task declares and the setup a setup task's `Setup files:` line names.
2. **Red before green.** An outer test is committed red, on an assertion, before the code it checks, and no production code is written without a failing test first, outside tdd-discipline's named exceptions.
3. **An escalated integrity finding halts** the phase (in unattended mode, parks the task). Neither the orchestrator nor the judge settles one.
4. **Every explicit verification and phase gate**: missing or unparseable verification evidence, a failed verification, a production defect, a failed phase verification, and the phase checkpoint each stop the work as their own rules say, and the next phase is not built before the person accepts the last one.
5. **Safety and destructive actions.** Deleting data, changing shared resources the plan does not name, pushing, rewriting history, paid or side-effecting network calls, and changes to settings, hooks, CI, or permissions are never taken on a judgment. In unattended mode the never list in "Unattended Mode" in [implement/unattended.md](../../skills/implement/unattended.md) holds in full.
6. **The person's reserved decisions**, each made by their reply naming it, never by a general go-ahead: changing the Goal or a Non-goal; retiring a criterion; accepting lost coverage (a case an outer test caught and a rewrite would stop catching); and changing what an outer test checks ([Outer tests](#outer-tests)).

## Strength

A plan line (an Intent statement, a Success Metric, an acceptance criterion, a design choice) has a strength, `hard` or `aim`. A line is **hard** when the person called it non-negotiable, or when it protects safety, data integrity, or honesty of evidence (records kept verbatim, tests that can fail, red shown before green); the second rule makes a line hard whatever it is marked. Every other line is an **aim**.

The universal hard list and every plan line marked `strength: hard` hold literally; only `strength: aim` lines may be judged by purpose. A conflict with a hard line goes to the person ([Asking about a rule](#asking-about-a-rule)); it is never judged.

**Lines with no strength** (plans written before strengths existed, or a line a stage left unmarked):

- a line worded as a command (must, never, do not, only, required, always) is **provisionally hard**: report it to the person for confirmation, once, with the other open questions, and never judge it until they confirm it as an aim;
- a line that protects safety, data integrity, or honesty of evidence is hard;
- every other unmarked line is an aim.

Say once in your output that the plan predates strengths and which lines you read as provisionally hard.

## Source and review

Each plan line records where its words came from and whether the person has reviewed it, as two separate fields, because who said a thing and whether they confirmed this wording are different facts:

- **source**: the person's own words, quoted verbatim from any message they sent, as `source: "<their words>" (<date>, <which message>)`; or, for wording an agent wrote, `drafted from <where>` (the request, the ticket, research.md, a mockup decision).
- **reviewed**: `yes` once the person's reply addresses the line, `no` until then.

A reply changes only the lines it addresses. Silence changes nothing: a line the reply skips keeps its source (the person's earlier words stay their words) and its `reviewed: no`. Recording an unreviewed draft as confirmed is how a guess becomes a rule.

## Narrowings

A stage that makes a line stricter than the line it refines (only or never, a fixed placement, a word list, an exact layout) marks it `narrows: <how>` and lists it for the person, quoted, under "Choices I made that tighten your intent" when it asks for approval. Approval covers only the narrowings it listed.

A narrowing found later that was never listed is an aim, unless its source line is hard or it protects safety, data integrity, or honesty of evidence: then its purpose stays hard while its mechanism stays an aim ([Purpose and mechanism](#purpose-and-mechanism)), and the missing listing is a design defect, corrected through `/wb:create_design` by listing it for the person.

## Purpose and mechanism

Hardness attaches to the purpose, never to the mechanism. A criterion's `Strength: hard` applies to its Guards against purpose; the mechanism a narrowing picks to check it (a word list, a placement, an exact wording, a selector, a region) is always an aim, even when the statement it refines is hard, and any check that serves the same purpose may replace it. A criterion where the two differ says so: `Strength: hard (purpose) / aim (mechanism)`. A proxy in a test follows the same rule. Replacing an outer test's mechanism is a rewrite, and lands only on the proof [Outer tests](#outer-tests) requires.

## Outer tests

The outer test is the plan's check of its criterion, committed red before the code. What the criterion means is the person's to decide; whether the test still checks it is a question evidence can answer. So an outer test changes after its red commit only through a rewrite task that `wb:test-writer` carries out, and the change lands only when the task verifier's report shows all three:

1. **The criterion's text is unchanged.**
2. **Nothing the red-commit version caught is lost**, shown one of three ways:
   - **mechanical**: the integrity script proves the whole change is `reorder` (only plain top-of-file import lines moved; no aliased, multi-name, parenthesised, indented, or conditional import, and no name bound twice) or `whitespace` (only leading and trailing whitespace, blank lines, and line endings, never indentation where indentation is syntax). A formatter's name or a report that says "formatter only" is not evidence;
   - **name only**: only identifier references in code positions changed (a call, an import, an attribute or method access, a type, a variable), for a rename the approved design states. An occurrence inside a string literal, a selector, a route, a snapshot, an expected value, an assertion message, or user-facing copy is data the test checks, so it is not name only;
   - **differential**: every case the red-commit version caught is still caught, run on the defect runner or a recognized mutation tool that runs both versions, with every pair's control caught.
3. **No added assertion goes beyond the criterion**: each checks what the statement or an example already states. An added word list, placement, exact wording, or value the criterion does not give makes the test stricter than what the person approved.

When all three hold, the change lands without asking, is recorded as `rewrite:`, and is listed under "Decisions I made for you". When any does not, the person decides: a lost case is theirs to accept, and an added check beyond the criterion is a question about what the criterion means. Without a route to run the differential, nobody can show what a rewrite kept, so the person decides that too.

A change with no proof is a changed outer test, and fails verification. An added line can weaken a test with nothing removed, so the verifier reads each one: an early return or exit; a skip, focus, or xfail marker; a conditional guard around an existing assertion; a double or fixture that replaces the subject under test; setup that keeps the subject from executing; broadened exception handling.

An inner test that catches a defect the outer test misses shows the criterion is protected; it is a reason to close the gap in the outer test by this rule, never a reason to change it any other way. A test that checks its criterion through a proxy says so, as the test-quality skill's Predictive item on proxies says.

How a rewrite is filed, run, and recorded is "Changing an Outer Test" in [implement/outer-tests.md](../../skills/implement/outer-tests.md); how it is checked is [rewrite-verification.md](rewrite-verification.md).

## Acting within purpose

When a `strength: aim` line's literal wording conflicts with its purpose (its why, its Guards against, or the person's quoted words), and nothing on the hard list or any hard or provisionally hard line is involved, act within the purpose rather than stopping:

1. Post the record on the task (or the milestone, outside a task) before acting: `judged: <the rule, quoted> vs <the purpose, quoted>; did <what you did>`.
2. List it under "Decisions I made for you" in the next report, one line each, with the reply that would reverse it, so the person sees every call made in their name.

Never act within purpose on a hard-list item or a hard line, on a test or an assertion, or in a way that changes what a criterion means; never without the record.

Example: a design aim says the summary card "never mentions the training bands"; its why is "the bands are population cut-offs, not about this user". A new summary line has to say which zone a session was in. Naming the zone with "(population band)" keeps the purpose, so the coordinator posts `judged: "never mentions the training bands" vs "population cut-offs, not about this user"; did label the zone "(population band)" in the summary line` and lists it. Changing the criterion's outer test to allow it would not be judgment: that test changes only as [Outer tests](#outer-tests) says.

## Asking about a rule

Every question that rests on a rule quotes the rule, its source (the person's words with their date, the plan line, or the wb rule), and its purpose, and says whether the purpose is at stake here or only the wording. When a hard constraint is involved, the question gives the trade-off: what keeping the literal rule costs, and what bending it would risk. It takes the decision form of [writing-for-the-user.md](writing-for-the-user.md).

## Independent work

While a decision that is not a halt is pending (a rule-based question, a pre-phase question, a product-wording conflict), keep running the tasks of the phase that are independent of it, one at a time as usual. The same test decides what may continue after a park in unattended mode. A task is independent of the pending item only when every one of these holds:

- it is outside the dependency closure, in both directions, of every task the item names or concerns (`bd dep tree <task-id> --direction=both` for each; `bd graph <epic-id>` shows the whole plan);
- it shares with those tasks no file it plans or touches (for a park, none in the parked manifest), no criterion and no criterion refining the same Success Metric, no outer test, and no contract or schema (an interface, route, message format, or data shape both rely on).

When you cannot tell, it is dependent and waits. Record the task ids you checked, and the verdict for each, in the pending item's ledger entry (in unattended mode, its `deferred:` line). A halt keeps its own rule, and a phase checkpoint holds the next phase ([The hard list](#the-hard-list), item 4).

## The judge

The orchestrator builds the phase and wants it finished, so it does not decide its own stops. Before any stop other than a phase checkpoint's go-ahead, it consults `wb:judge`, a fresh agent that reads the evidence itself and returns one of four outcomes: **repair** (a record or link is missing and nothing about the tests or code is in question), **settle** (a call inside its classes, recorded as `judged:` and listed under "Decisions I made for you"), **recheck** (a fresh, targeted verification of one finding), or **person** (the question, written in product terms).

It may settle: whether a finding falls inside the cited criterion or is a follow-up; a literal-wording dispute on a line whose strength is aim, when its purpose is met; whether a deviation is explained by an existing record; a wb rule that leaves a needed change no route, when the plan is sound and no assertion or example changes; and one further fix attempt after a failed re-verification, when the verifier's records show the code does what the criterion says and the failure is a test gap.

It never turns a FAIL into a PASS, waives an integrity finding, changes what a criterion means, accepts lost coverage, decides product behavior or scope, approves work outside the plan or a stub of production code, or judges a hard line. Those are the person's, and the judge's part is to write the question so they can decide it.

How it is consulted and what follows each outcome is "The Judge" in [implement/failures.md](../../skills/implement/failures.md).

## Memories

A memory (`bd remember`) is read in later sessions by agents that never saw where it came from, so it carries its source:

- `user-stated (<date>, <where>): "<the person's words, verbatim>"`, followed by why it matters;
- `agent-derived (<date>, from <source>): <the fact>`, for anything you concluded yourself.

Agent-derived memories are aims: one incident is a note, not a rule, and a memory never overrides a plan line or the hard list. A user-stated memory has the strength the person gave it. A memory with no marker reads as agent-derived.

## Record prefixes

`judged:` and `rewrite:` are records, like `user reply:`: every reader that tells records from test-writer reports by their first word counts them as records. A plan run before the judge may carry `delegation:`, `re-baseline:`, and `auto-continue:` records; they are history, and nothing acts on them.

## Evidence

These rules are incident-derived. The proof rule for outer tests and the judge come from two further runs in which the person approved every test decision put to them, sent the questions to an advisor of their own, and waited hours on a forgotten tracker link; twelve replayed stops are the judge's only test so far. The rest come from two real wb runs in which agents stalled for hours on narrowed wording (a criterion that became a word ban, a substring match inside a longer word, a forced rename held for a decision the person had already made, a formatter reflow read as an outer-test rewrite, an agent-written memory that turned one incident into a rule). No external study tests them; their evidence strength is weak (observational, two runs), and they should be revisited when measured runs exist.
