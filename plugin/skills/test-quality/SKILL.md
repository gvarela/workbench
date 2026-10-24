---
name: test-quality
description: Use when writing, changing, verifying, reviewing, or auditing automated tests - including test-writer, task-verifier, test-reviewer, and test-auditor work. Gives the one shared rubric for whether a test can fail and whether it is worth keeping, with the verdicts and evidence rules reviewers report against.
user-invocable: false
---

# Test Quality

Ask first whether a test can fail, then whether it is a good test.

**Core principle:** a test that cannot fail protects nothing, however well it reads. The mechanical "can it fail?" check carries the strongest evidence, so it comes before any judgment about style or design.

This is the single rubric for writers and reviewers. Writers read each item as a rule to follow; reviewers answer each item as a yes/no question about a file. Keeping both in one text means the rules a test is written to and the checks it is reviewed against cannot drift apart.

When the repository has its own testing conventions, follow them. A convention, or an exception documented in the conventions source or in a comment at the test, also sets aside a pattern rule (Part 3) when it states its rationale. Common ones are code generators, serializers, and migrations, where the emitted text is the behavior, so an assertion on that text checks it; and interaction contracts at an external boundary, where the call made is the observable behavior. Name the exception and its rationale in your report. Neither excuses a test that cannot fail or does not protect what it guards, because no rationale makes such a test check anything. Take conventions from the first of these that exists:

1. The Testing Conventions section of the plan's research. When `.claude/wb/testing.md` exists, it cites that file and records where the code has drifted from it. Where it records drift, follow the code as research describes it and mention the drift in your report, so a person can decide which one is right.
2. `.claude/wb/testing.md`, when there is no plan or its research has no Testing Conventions section.
3. The existing tests, when there is neither. Say in your report that you inferred the conventions.

When `.claude/wb/testing.md` exists, read its Choices, Planned, and Open headings whichever source above gives the conventions, since research cites the profile rather than copying them. Choices are decisions the team made: leave out a finding that only repeats an absence a Choice records, such as no browser tests, and name the Choice in your report. A Choice never clears a deterministic failure, such as a test that cannot fail, a criterion with no outer test, an outer test below its observed-at level, or a planted defect the test survives, because the design set each criterion's observed-at boundary and harness with the Choices in view. A Choice that gives a rationale for setting aside a pattern rule is a documented exception, as above. Planned entries are tooling that is not installed yet, so treat them as absent; Open entries are undecided, so report related findings as usual.

The detector method (with worked examples), custom heuristics, and the review finding shape are in [reference.md](reference.md); read it when you review or audit.

## Part 1: Can this test fail?

Apply these first, mostly mechanically, each with file:line evidence:

1. The test has an assertion, and the assertion targets the behavior, not a mock or the test's own setup. An assertion on setup passes whatever the code does.
2. No assertion is a tautology or an always-true comparison, because it passes by construction.
3. The test is not skipped, pending, or focused without a stated reason. A skipped test reports green while checking nothing, and a focused one silently skips the rest of the suite.
4. Every negative or `all()`-style assertion has a positive presence anchor. "Not in the body" and "all items match" both pass on an empty result.
5. For a test that guards an acceptance criterion, a planted defect (a brief break of the code under test, in a disposable copy) makes the test fail. This is the only check that shows the test protects the criterion rather than merely running it.

## Part 2: Checkable items

Four properties carry most of the weight in deciding whether a test is worth keeping: behavioral, structure-insensitive, specific, and predictive. Each item below is a yes/no question.

### Behavioral: the test fails when behavior breaks

- Expected values come from the criterion's example or another independent source, never from calling the code under test, a production formula, hash, or serializer. An expected value computed by the code it checks agrees with that code even when both are wrong, and no linter can see it.
- Each test names the break it catches. A test whose break cannot be named is usually not checking one.

### Structure-insensitive: the test survives a refactor that keeps behavior

- Assertions are on observable state, not on which calls were made, except for state-changing calls at a declared seam. Interaction assertions break on refactor while rarely finding bugs.
- No assertion is on source text, CSS class strings, or private names, because those change without any change in behavior.
- Test doubles appear only at the criterion's declared `Seam:`, and never replace the subject, an owned or domain class, or use `any_instance`. Where a cheap real object or fake exists, the test uses it. Comparing each double against the declared seam turns over-mocking, which no linter detects, into a near-mechanical check.
- Setup is not copied across files. A copied setup block forces an edit in every copy when the shape it builds changes.

### Specific: a failure points at the cause

- Each test checks one behavior.
- Assertions are not bundled so that the first failure hides the rest. A mechanism that reports every failure, such as RSpec `aggregate_failures`, satisfies this.

### Predictive: a pass means the product works

- The test runs at the level the criterion's "Observed at" gives. A lower-level test can pass while the observed behavior is broken.
- The real-data shapes the plan names are covered, not only factory defaults.
- Nothing depends on the wall clock, sleeps, or test order, because those make a pass depend on the run rather than the code.

Other properties of good tests, such as speed, readability, and isolation, are not scored. They trade against each other (fast against predictive, for example), so flag one only when the trade buys nothing, such as a slow test that predicts no more than a fast one.

These properties come from Kent Beck's [Test Desiderata](https://medium.com/@kentbeck_7670/test-desiderata-94150638a4b3), twelve properties of good tests, also collected at [testdesiderata.com](https://testdesiderata.com/).

## Part 3: Verdicts

A hard FAIL, and a Remove or Rewrite verdict, follows only from proof. A hard FAIL needs proof of one of two things: the test cannot fail (vacuity), or it does not protect the criterion or behavior it guards (non-protection). The proof is a detector or diff that shows a Part 1 item 1 to 3 failure, a planted defect the test survives, or a counterexample: a concrete wrong behavior that the whole assertion still accepts.

A third kind of proof, false failure, supports a Rewrite and nothing else: a concrete input or condition under which correct code fails the test, such as a date, a timezone, a test order, or a slower machine for a timing race. Such a test can fail and does protect something, but it also fails when nothing is wrong, so it is rewritten, never removed. It is neither vacuity nor non-protection, so it is never a hard FAIL.

The pattern rules are not proof. They are presence anchors (Part 1 item 4), assertions on source text, CSS strings, or private names, test doubles outside a declared seam, and the mirrored oracle (an expected value computed by the code under test or by a copy of its formula). Each hit is a prompt: construct the counterexample it suggests, such as an empty result for a missing anchor, or plant the defect it suggests, such as a break in the formula a mirrored oracle shares, and let the verdict follow what that shows. A hit that the counterexample or defect does not confirm is a "Review these" observation, not a FAIL, because a test that matches a pattern can still protect its behavior, and a gate that fails tests written to valid conventions teaches people to ignore it. Part 2 items that are not pattern rules reach "Review these" the same way unless they come with proof. Dependence on the wall clock, sleeps, or test order reaches Rewrite with a false failure and stays an observation without one. Copied setup and bundled assertions are maintainability notes: they stay observations unless they come with proof of vacuity or non-protection.

Apply a counterexample to the whole assertion, not to one operand of it. In `assert a != b or c != d`, an operand that never decides the outcome leaves the other one checking, so the test can still fail: report the dead operand as an observation, not the test as unable to fail.

Every review finding carries exactly one verdict, so the checkpoint reader knows what action is proposed:

| Verdict | Condition |
| --- | --- |
| **Remove** | Only when the test is shown unable to fail: one of Part 1 items 1 to 3 fails, on a detector, a diff, or a counterexample applied to the whole assertion. |
| **Rewrite** | The test can fail but is shown not to protect its criterion: it survives a planted defect or a counterexample, whether from Part 1 items 4 and 5 or from a pattern rule. Or correct code is shown to fail it under a concrete input or condition: a false failure. |
| **Consolidate** | Only with mechanical evidence of overlap, such as no unique killed mutants or no unique coverage. |
| **Keep** | Reported only when asked. |

A test that is shown unable to fail, or shown not to protect the criterion it guards, is never a minor finding: protecting behavior is the reason the test exists.

A verdict matches its own reason. A reason that keeps the test in another form, such as a rename, a split, or a clearer message, makes the verdict an observation, or a Rewrite only with proof as above, never Remove. A test that guards an invariant named in a docstring or comment, such as a table guard that fails when two tables drift apart, is not a Remove candidate on pattern grounds; only proof that it cannot fail makes it one.

A suggested fix, for a Rewrite or for an observation that offers one, first asserts the behavior the replaced value protects, as a relation built from inputs the test owns: for pagination, that no page holds more than the page size and that the pages together hold every item once. Pin a literal only when the value itself is specified, and then show its derivation from test-owned inputs, such as 3 pages for the test's 25 items at a page size of 10, with a comment naming where that page size is specified. Replacing a mirrored formula with a bare literal hides the same coupling behind a magic number: it breaks on any valid change and does not say what it protects.

A Rewrite's suggested fix keeps everything the replaced assertion catches and adds the missing case (for a false failure, it removes the condition under which correct code fails): it widens the check and never narrows it, so it reads "in addition to" the original, not "instead of" it. Everything an assertion catches is each alternative its predicate or assertion matches: every branch, pattern alternative, call form, input shape, and table row in it. Read them from the assertion itself, not from the proof, which names only the case it found. A fix scoped to that one case, such as one table where the original checked every table or one call form where it matched several, closes that gap and opens others, and the person who acts on the fix has no way to see what it dropped. A rewrite that keeps everything is shown by a differential: one planted defect for each of those alternatives and one for the gap, each run against both versions, with the rewrite failing on all of them.

A suggested fix is a class fix, not an enumeration. Before handing a fix on, check it: a fix that lists instances from an open-ended set, such as "skip X unless it is read back through A, B, or C", is not a class fix, because the set has members the list leaves out and the next check finds them. Find the fix that removes the need for the list, such as checking X too with a pattern strict enough not to fail on correct code, and where a disposable copy and the planted defects are at hand, run that fix against them before proposing it. Say in the report whether the fix was checked that way, because the person who acts on it gets one attempt and cannot see which cases a list left out.

Reviewers propose; they do not delete or edit tests. A Remove or Consolidate verdict without objective evidence is labelled judgment-only and is not actionable on its own, because removing tests loses fault detection that a review cannot measure.

## Part 4: How reviewers judge

- Answer each item as a yes/no question, deciding it only after checking the file:line evidence, and give the evidence and a short reason with the answer. Holistic scores of test quality are noisy; decomposed items with line evidence are the available mitigation.
- Label the evidence of every finding and of every "Review these" observation, one label each, as **deterministic** (a named detector, a planted defect, a diff, or a counterexample or false failure reproduced by an actual run) or **judgment-only**, so the reader knows how much weight it carries. A detector hit on a pattern rule with no confirming counterexample is a "Review these" observation labelled deterministic, naming the detector and rule: the hit is mechanical even though no verdict follows from it. A counterexample or false failure reasoned from reading rather than run is judgment-only.
- Report a judgment-only Remove or Rewrite as a finding only when a majority of three independent judgments agrees, each with its own proof written out (for a counterexample, the input or state, the wrong behavior, and why the whole assertion still passes; for a false failure, the input or condition and why correct code fails), and record the result (for example 3 of 3). Report other judgment-only observations as "review these". No study validates an LLM judge of test value, so a single judgment is not enough to propose removing or rewriting a test.
- Apply the repository's conventions and documented exceptions, as stated at the top of this skill.
