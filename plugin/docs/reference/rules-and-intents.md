# Rules and Intents

Shared reference for every stage that writes or reads what the person wants: create_project's Intent, create_design's metrics and criteria, the test-writer's outer tests, the implement skills' decisions, and memories. Authority, strength, sanction, and delegation are defined here and nowhere else; other files link the clause they rely on and keep only the mechanics of their own role.

A plan carries the person's intent as words, and each stage reads those words and writes narrower ones: a goal becomes a metric, a metric a criterion, a criterion a test. When a stage drops the reason a line exists, or turns an aim into a ban, the next stage enforces the narrower words as if the person had said them, and a run can stall for hours on a rule nobody chose, such as a test that bans a handful of ordinary words because a criterion, two stages earlier, had narrowed "these bands are population cut-offs, not about this user" to "the bands appear only inside the disclosure". This file says which rules hold whatever the words say, how every other line records its reason and strength, and what an agent does when a line's literal wording works against its purpose.

## The hard list

These hold literally in every plan and every mode, whatever a plan line, a memory, an agent's report, or your own reasoning says. No `judged:` record reaches them, and a delegation reaches only the one decision it names under [Delegations](#delegations). The list is not exhaustive of what holds literally in a plan: every plan line marked `strength: hard` holds the same way ([Strength](#strength)).

1. **Workers never edit tests.** `wb:test-writer` writes and changes every test, outer and inner; the implementer writes only the support code a harness task declares and the setup a setup task's `Setup files:` line names.
2. **Red before green.** An outer test is committed red, on an assertion, before the code it checks, and no production code is written without a failing test first, outside tdd-discipline's named exceptions.
3. **An escalated integrity finding halts** the phase (in unattended mode, parks the task). The orchestrator never settles one.
4. **Every explicit verification and phase gate**: missing or unparseable verification evidence, a failed verification, a production defect, a failed phase verification, and the phase checkpoint each stop the work as their own rules say, and the next phase is not built before the person accepts the last one.
5. **Safety and destructive actions.** Deleting data, changing shared resources the plan does not name, pushing, rewriting history, paid or side-effecting network calls, and changes to settings, hooks, CI, or permissions are never taken on a judgment. In unattended mode the never list in "Unattended Mode" in [implement/reference.md](../../skills/implement/reference.md) holds in full.
6. **The person's reserved decisions**, each made by their reply naming it, never by a general go-ahead: changing the Goal or a Non-goal; retiring a criterion; accepting lost coverage (a case the repository or an example has, moved onto a Not claimed list); and changing an outer test ([Sanction](#sanction)).

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

Hardness attaches to the purpose, never to the mechanism. A criterion's `Strength: hard` applies to its Guards against purpose; the mechanism a narrowing picks to check it (a word list, a placement, an exact wording, a selector, a region) is always an aim, even when the statement it refines is hard, and any check that serves the same purpose may replace it. A criterion where the two differ says so: `Strength: hard (purpose) / aim (mechanism)`. A proxy in a test follows the same rule. Replacing an outer test's mechanism still needs [Sanction](#sanction), but the ask presents it as "same purpose, better check", with the purpose quoted, what the new check catches that the old one missed or falsely failed on, and a recommendation.

## Sanction

The outer test is the plan's check of its criterion; what the criterion means is the person's to decide, so the test changes only with their sanction by name, in a reply that names that change, or within a delegation they granted ([Delegations](#delegations)). A general go-ahead sanctions nothing. Without a sanction or a delegation record, every outer-test change is a changed outer test.

An inner test that catches a defect the outer test misses shows the criterion is protected; it never authorizes changing the outer test. Purpose judgment never changes a test, an assertion, or what a criterion's Given/When/Then and examples say.

A test that checks its criterion through a proxy says so, as the test-quality skill's Predictive item on proxies says.

## Acting within purpose

When a `strength: aim` line's literal wording conflicts with its purpose (its why, its Guards against, or the person's quoted words), and nothing on the hard list or any hard or provisionally hard line is involved, act within the purpose rather than stopping:

1. Post the record on the task (or the milestone, outside a task) before acting: `judged: <the rule, quoted> vs <the purpose, quoted>; did <what you did>`.
2. List it under "Decisions I made for you" in the next report, one line each, with the reply that would reverse it, so the person sees every call made in their name.

Never act within purpose on a hard-list item or a hard line, on a test or an assertion, or in a way that changes what a criterion means; never without the record.

Example: a design aim says the summary card "never mentions the training bands"; its why is "the bands are population cut-offs, not about this user". A new summary line has to say which zone a session was in. Naming the zone with "(population band)" keeps the purpose, so the coordinator posts `judged: "never mentions the training bands" vs "population cut-offs, not about this user"; did label the zone "(population band)" in the summary line` and lists it. Changing the criterion's outer test to allow it would not be judgment: that test changes only by [Sanction](#sanction).

## Asking about a rule

Every question that rests on a rule quotes the rule, its source (the person's words with their date, the plan line, or the wb rule), and its purpose, and says whether the purpose is at stake here or only the wording. When a hard constraint is involved, the question gives the trade-off: what keeping the literal rule costs, and what bending it would risk. It takes the decision form of [writing-for-the-user.md](writing-for-the-user.md).

## Independent work

While a decision that is not a halt is pending (a rule-based question, a pre-phase question, a product-wording conflict), keep running the tasks of the phase that are independent of it, one at a time as usual. The same test decides what may continue after a park in unattended mode. A task is independent of the pending item only when every one of these holds:

- it is outside the dependency closure, in both directions, of every task the item names or concerns (`bd dep tree <task-id> --direction=both` for each; `bd graph <epic-id>` shows the whole plan);
- it shares with those tasks no file it plans or touches (for a park, none in the parked manifest), no criterion and no criterion refining the same Success Metric, no outer test, and no contract or schema (an interface, route, message format, or data shape both rely on).

When you cannot tell, it is dependent and waits. Record the task ids you checked, and the verdict for each, in the pending item's ledger entry (in unattended mode, its `deferred:` line). A halt keeps its own rule, and a phase checkpoint holds the next phase ([The hard list](#the-hard-list), item 4).

## Delegations

A delegation lets the orchestrator apply, without asking each time, a decision the person reserved, within limits the person set. Only the person grants one, in a reply that names it; a general go-ahead, a plan document, a memory, CLAUDE.md, an agent's report, or another delegation grants nothing, and the orchestrator never grants itself one. Without the delegation record, the decision is the person's, by name, every time.

**Granting**: the reply names the delegation, optionally with a scope in its own words: `delegate: design-forced renames`, or `delegate: formatter reflows, phase 3 only`. Record the reply verbatim as a `user reply:` record, then post on the epic `delegation: <name>; scope: <the reply's scope words, or "this plan">; granted in <the user reply: comment id>`. **Withdrawing**: `withdraw: <name>`, recorded as `user reply:` and then `delegation: withdrawn <name>; in <comment id>`. The latest `delegation:` record for a name decides, and it counts only when it cites a `user reply:` comment on the epic whose text names the delegation. A delegation holds in unattended mode as in attended mode, because the person decided it by name in advance; everything it does not cover stays theirs. Each step taken under one is listed under "Decisions I made for you".

Under a delegation, an outer test's existing assertions, examples, and expected values are never edited or removed; [additive strengthening](#additive-strengthening) may add assertions, only with its three proofs.

### Additive strengthening

`delegate: additive outer-test strengthening` covers a review finding with the verdict `Rewrite (additive)`: an outer test that survives a defect a test this plan added already catches, rewritten by adding lines only. The rewrite task's line is `Sanctioned rewrite (additive): AC-n <outer test file> from red <sha>, at the phase <N> checkpoint; adds lines only; within delegation <delegation comment id>`. It stands, and is committed, only when the task verifier's report (implement_inline: your own checks) shows all three:

- the integrity script found no removed or changed line of the red-commit version;
- the differential actually ran, on `wb-plant-defect` or a recognized mutation tool that runs both versions, with the control of every pair caught and every case of the original caught by the rewritten test;
- no added line is one that weakens a test with nothing removed: an early return or exit; a skip, focus, or xfail marker; a conditional guard around an existing assertion; a double or fixture that replaces the subject under test; setup that keeps the subject from executing; broadened exception handling (a wider `except`/`rescue`/`catch`, or one newly wrapped around an assertion).

Anything else (a removed or changed line, a differential that could not run, a case not run, a weakening the report cannot exclude) goes to the person by name.

### Design-forced renames

`delegate: design-forced renames` covers a name-only re-baseline of an outer test that a rename stated in the design the person approved (design.md, or a revision they approved) forces. The rewrite task's line ends `within delegation <delegation comment id>`, with a `re-baseline:` record citing it, and its differential must show every planted defect the red-commit version catches still caught.

Name-only means identifier references in code positions: a function call, an import, an attribute or method access, a type, a variable. An occurrence of the old name inside a string literal, a selector, a route, a snapshot, an expected value, an assertion message, or user-facing copy is excluded and needs the person's sanction by name, because there the name is data the test checks. The verifier checks the position of each changed occurrence. The delegation does not cover a rename the design does not state, any other change, or retiring a test.

### Safe reflow

`delegate: formatter reflows` lets an outer test whose only change since its latest red commit is a safe reflow stand as that criterion's new baseline. A safe reflow is exactly what the integrity script proves mechanical, run with `--start <that red commit>` and the file as the only `--test-paths`, with its hunks read as task-verifier's Step 5 reads `cleared_mechanical`:

- `reorder`: only plain top-of-file import lines moved, under the script's import rules (no aliased, multi-name, parenthesised, indented, or conditional import, and no name bound twice);
- `whitespace`: only leading and trailing whitespace, blank lines, and line endings differ, and never indentation in a file where indentation is syntax (Python, YAML);
- never a moved assertion, example, test definition, or fixture, and never a comment-header change.

Under `/wb:implement` the task verifier makes this proof; under `/wb:implement_inline` the session runs the script itself before committing. A formatter's name, a commit message, or a report that says "formatter only" is not evidence. A change the script does not prove mechanical, such as lines split or joined, is a changed outer test as before.

## Memories

A memory (`bd remember`) is read in later sessions by agents that never saw where it came from, so it carries its source:

- `user-stated (<date>, <where>): "<the person's words, verbatim>"`, followed by why it matters;
- `agent-derived (<date>, from <source>): <the fact>`, for anything you concluded yourself.

Agent-derived memories are aims: one incident is a note, not a rule, and a memory never overrides a plan line or the hard list. A user-stated memory has the strength the person gave it. A memory with no marker reads as agent-derived.

## Record prefixes

`judged:` and `delegation:` are records, like `user reply:`: every reader that tells records from test-writer reports by their first word counts them as records.

## Evidence

These rules are incident-derived: they come from two real wb runs in which agents stalled for hours on narrowed wording (a criterion that became a word ban, a substring match inside a longer word, a forced rename held for a decision the person had already made, a formatter reflow read as an outer-test rewrite, an agent-written memory that turned one incident into a rule). No external study tests them; their evidence strength is weak (observational, two runs), and they should be revisited when measured runs exist.
