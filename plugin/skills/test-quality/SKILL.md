---
name: test-quality
description: Use when writing, changing, verifying, reviewing, or auditing automated tests - including test-writer, task-verifier, test-reviewer, and test-auditor work. Gives the one shared rubric for whether a test can fail and whether it is worth keeping, with the verdicts and evidence rules reviewers report against.
user-invocable: false
---

# Test Quality

Ask first whether a test can fail, then whether it is a good test.

**Core principle:** a test that cannot fail protects nothing, however well it reads. The mechanical "can it fail?" check carries the strongest evidence, so it comes before any judgment about style or design.

This is the single rubric for writers and reviewers. Writers read each item as a rule to follow; reviewers answer each item as a yes/no question about a file. Keeping both in one text means the rules a test is written to and the checks it is reviewed against cannot drift apart.

The repository's own conventions (from plan research or the testing profile) override the generic style items below. A project that bundles expectations with RSpec `aggregate_failures`, for example, is following its convention, not breaking Specific.

The detector method (with worked examples), custom heuristics, and the review finding shape are in [reference.md](reference.md); read it when you review or audit.

## Part 1: Can this test fail?

Apply these first, mostly mechanically, each with file:line evidence:

1. The test has an assertion, and the assertion targets the behavior, not a mock or the test's own setup. An assertion on setup passes whatever the code does.
2. No assertion is a tautology or an always-true comparison, because it passes by construction.
3. The test is not skipped, pending, or focused without a stated reason. A skipped test reports green while checking nothing, and a focused one silently skips the rest of the suite.
4. Every negative or `all()`-style assertion has a positive presence anchor. "Not in the body" and "all items match" both pass on an empty result.
5. For a test that guards an acceptance criterion, a planted defect (a brief break of the code under test, in a disposable copy) makes the test fail. This is the only check that shows the test protects the criterion rather than merely running it.

## Part 2: Checkable items

Four of the Test Desiderata properties carry most of the weight in deciding whether a test is worth keeping. Each item below is a yes/no question.

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
- Assertions are not bundled so that the first failure hides the rest, unless the project's convention says otherwise (for example RSpec `aggregate_failures`).

### Predictive: a pass means the product works

- The test runs at the level the criterion's "Observed at" gives. A lower-level test can pass while the observed behavior is broken.
- The real-data shapes the plan names are covered, not only factory defaults.
- Nothing depends on the wall clock, sleeps, or test order, because those make a pass depend on the run rather than the code.

The other eight Desiderata properties are acknowledged but not scored. They trade against each other (fast against predictive, for example), so flag one only when the trade buys nothing, such as a slow test that predicts no more than a fast one.

## Part 3: Verdicts

Every review finding carries exactly one verdict, so the checkpoint reader knows what action is proposed:

| Verdict | Condition |
| --- | --- |
| **Remove** | Only when the test cannot fail (one of Part 1 items 1 to 4 fails). |
| **Rewrite** | The test can fail, but fails a Part 2 item, or misses a planted defect (Part 1 item 5) and so does not protect its criterion. |
| **Consolidate** | Only with mechanical evidence of overlap, such as no unique killed mutants or no unique coverage. |
| **Keep** | Reported only when asked. |

A test that cannot fail, or that does not protect the criterion it guards, is never a minor finding: protecting behavior is the reason the test exists.

Reviewers propose; they do not delete or edit tests. A Remove or Consolidate verdict without objective evidence is labelled judgment-only and is not actionable on its own, because removing tests loses fault detection that a review cannot measure.

## Part 4: How reviewers judge

- Answer each item as a yes/no question, deciding it only after checking the file:line evidence, and give the evidence and a short reason with the answer. Holistic scores of test quality are noisy; decomposed items with line evidence are the available mitigation.
- Label every finding's evidence as **deterministic** (a named detector, a planted defect, or a diff) or **judgment-only**, so the reader knows how much weight it carries.
- Report a judgment-only Remove or Rewrite as a finding only when a majority of three independent judgments agrees, and record the result (for example 3 of 3). Report other judgment-only observations as "review these". No study validates an LLM judge of test value, so a single judgment is not enough to propose removing or rewriting a test.
- Apply the repository's conventions over the generic style items, as stated at the top of this skill.
