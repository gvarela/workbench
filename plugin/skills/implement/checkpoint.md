# Phase Checkpoint

What a phase checkpoint runs, what holds its go-ahead, and the report the person reads. Part of the implement skill; `/wb:implement_inline` and `/wb:validate_phase` use it too.

## 1. Automated Verification

Run the commands tasks.md names for the phase, one per call: the test suite, lint, typecheck, build. All must pass before the agents below run. A failure here is a failed verification of the phase, not a checkpoint item: find the task whose change causes it and treat it as "Failed Verification" in [failures.md](failures.md).

## 2. The Three Agents

Spawn all three in one message, each with no `model` parameter (their definitions pin Opus at `high`), from their prompts in [sub-agent-prompts.md](sub-agent-prompts.md). Wait for every one, and for each settling review below, before writing the report.

**`wb:test-reviewer`** reviews the phase's tests as a whole and proposes findings; it edits nothing. Give it the phase's starting commit, the plan starting commit, the phase's criteria with their examples, observed-at boundaries, and seams, the red commits, the phase task ids (it reads each task verifier's Test Integrity and Defect ledger records from them, and skips defects already checked on unchanged code), the conventions source, and mode `implement`.

- **Settle its Majority Candidates.** A judgment-only Remove or Rewrite needs three independent judgments. Spawn `wb:test-reviewer` again with the Candidates input (each candidate's location, rubric item, and proposed verdict, without the first review's reasoning) and the criteria they cite; spawn a third time for each candidate the first two split on. Two of three agreeing makes a finding, recorded "n of 3"; anything else goes under "review these".
- **File what outlives the report**: each escalated integrity finding and each "n of 3" finding, with `<plugin scripts>/wb-records file --from <task-id>`, linked to the task whose commit last changed the test.

**`wb:phase-verifier`** checks the phase against its plan: planned changes missing from the diff, changes no task covers, earlier phases' tests changed again, and progress toward each README Intent statement. Its values:

- **Range**: the phase's starting commit to HEAD ("working tree" only when `git status --short` shows phase changes uncommitted).
- **Plan starting commit**: phase 1's starting commit. In a later phase or after a resume, the parent of the earliest commit that names a phase 1 task id or adds a phase 1 criterion's `red(AC-n)` with that criterion's title. When no commit qualifies, pass `unknown`; the verifier then reports the earlier-phase test check as not run.
- **Tasks**: the phase's task ids from the frontmatter, outer test steps included, plus each issue filed during the phase that a commit in the range names (splits, rewrite tasks, fix tasks). Without them their changes read as unplanned.
- **Red commits**: the latest `red(AC-n)` commit of every criterion delivered so far.
- **Final phase**: yes when tasks.md has no later phase.

Its verdict is its Status line, read as a task verifier's is. A FAIL with `Cause: missing context` may be your input: check the range against `git log` and the task ids against the frontmatter, correct what is wrong, and spawn it again.

**`wb:prover`** runs the product at each criterion's boundary and reports each criterion and each manual check as proven, disproven, or could not prove. Give it this phase's criteria (on the final phase, every criterion the plan delivered; `none` for a plan without criteria), their red commits, the test command, and the profile path or `none`. Never run those checks yourself in its place: you built the phase, so your run is a claim, not proof.

The phase verifier and the prover post their own reports on the milestone, as the `phase verification` and `proof` records. When either returns `Not posted:`, post only its exact parts, verbatim ("Failed post" in [records.md](records.md)). A state or finding you did not get from an agent's report is not one: when an agent did not return, say so in the report.

## 3. What Holds the Go-ahead

Four kinds of item can hold it. Everything else informs the person and does not block.

- **A blocking test gap** (the reviewer's Blocking section): a deterministic failure in a test this phase changed. That is a criterion with no outer test or one below its observed-at level, a changed outer test with no proof, an undeclared test change, a test that cannot fail, or a planted defect that breaks the criterion and survives a test that claims to guard it. A test the phase did not change never blocks, because other people's legacy tests are not this phase's to fix; judgment-only findings never block.
- **A disproven criterion or manual check** (the prover).
- **An unexplained deviation** (the phase verifier): a planned change missing, or a change no task covers.
- **On the final phase, a FAIL Intent verdict** on a statement the plan did not defer.

**Close a blocking test gap without asking when its fix changes tests only.** A surviving defect, a test that cannot fail, or a missing or too-low outer test is fixed by a test, and the person approved the criterion the test checks. File the fix with `wb-records file --from <task-id>`, run it before the milestone closes (an inner test through `wb:test-writer` and the task verifier; an outer test as "Changing an Outer Test" in [outer-tests.md](outer-tests.md) says), and list it under "Decisions I made for you". When the fix needs production code, or the rewrite's proof does not hold, the gap stays an item for the person. An undeclared test change and an outer test changed without proof are integrity findings: they are never closed this way.

**Send every remaining item through the judge**, in one spawn ("The Judge" in [failures.md](failures.md)). It may find a deviation already explained by a record, or a finding outside its criterion. Only items it returns as `person` go under "Needs your decision", worded as it wrote them.

## 4. The Report

Write each line as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says: what it means for the product first, ids and paths in parentheses after. A section with nothing in it is one line.

```
✅ Phase ${phase}: automated verification passing (tests: ${command}; lint: ${command}; typecheck: ${command}; build: ${command})

**Needs your decision:**
${each item the judge returned for the person, numbered so a reply can name it: P1, P2 for a disproven criterion or manual check (what the product did when run, against what the criterion says); D1, D2 for an unexplained deviation; T1, T2 for a test gap that could not be closed; on the final phase, each FAIL Intent verdict. Each: what would go wrong in the product, as one concrete example; the real choices; a recommendation; the exact reply. Or "Nothing needs your decision"}

**Decisions I made for you:** ${each `judged:` and `rewrite:` record this phase and each test gap closed without asking, one line each: what was decided or changed, the evidence in one clause, and the reply or command that reverses it; or "none"}

**What this phase delivered** (by acceptance criterion, with what the product did when the prover ran it):
${each criterion as behavior the person can now rely on, ids in parentheses, then the prover's state: "- <behavior> (AC-n, task <id>): proven: `<command>` showed <output>"; "disproven, see P1"; or "could not prove, see below". Copy the prover's command and output; never reword its evidence}
- Intent progress: ${one line per README Intent statement with its status from the phase verifier; on the final phase, its verdict instead}

**Left for you to check** (only what the prover could not prove):
${each criterion and manual check it could not prove, with its reason and its steps; each manual check it proved, as one line with the command and output; or "Nothing: every criterion and manual check was proven by running the product"}

**Test integrity:**
- Outer tests committed red first: ${each named by the criterion it guards}
- Integrity findings: ${total} (${escalated} escalated); ${the reviewer's Defect checks line, copied verbatim}
- Earlier phases' tests changed: ${each with the task that declared it and its reason, or "none"}
- Review findings: ${each with the criterion it guards and what the weakness lets through; settled ones marked "n of 3"}
- Review these: ${each in plain words, file:line after}

**Follow-ups** (each: what it is, what it puts at risk, when to do it):
- Product and plan: ${behavior gaps, explained deviations, Intent statements at risk, design questions; on the final phase, each deferred design question still open}
- Test quality: ${weak or brittle tests; a defect runner's setup hint as a `!` command; or "none"}

**Beads:** all Phase ${phase} tasks closed; the milestone (${milestoneId}) closes on your reply.

Reply when you have done the checks left for you, answering each item above by its number.
```

## 5. Replies

Record each reply verbatim as a `user reply:` record on the milestone, and echo each pending item it does not name ("P2 not answered — reply fix: P2 or accept: P2"). A reply may name a set (`accept: D1-D3`) of ids listed above and still pending. A general go-ahead ("go", "looks good") answers none of them.

- **A disproven criterion** (`fix: P1` or `accept: P1`): fix runs as a task through Step 4, filed with `wb-records file` and linked to the task that delivered the criterion; its test goes through `wb:test-writer`, so the gap stays caught; then spawn the prover again for that criterion. Accept records the gap in tasks.md's Implementation Notes and files a follow-up.
- **A deviation** (`accept: D1`, `fix: D1`, or `plan defect: D1`): accept records it and its reason in Implementation Notes (a missing change deferred also gets a follow-up issue). Fix makes the phase match the plan: the missing change runs as a task; an unplanned change is reverted in its own commit. Plan defect follows "Plan Defect" in [failures.md](failures.md).
- **A test gap that stayed open** (`close: T1` or `accept: T1`): close runs the fix the item described; accept leaves the gap and records it.

Apply each answer before closing the milestone. When an answer adds work, spawn the agent that found the item again after the work is committed and take the result from its new report.

## 6. The Final Phase: Intent Verdicts

The plan's final checkpoint also closes the plan, so it gives every README Intent statement its verdict, as [intent-verdicts.md](../../docs/reference/intent-verdicts.md) says, from the final phase verifier's Intent Progress: met is PASS, deferred is DEFERRED, a statement awaiting a manual check is settled by the person's reply, and anything else is FAIL.

- In the report, an "Intent verdict" line per statement replaces the Intent progress line. A FAIL on a statement the plan did not defer is a decision for the person: ship it short (`accept fail: <statement>`, with a follow-up issue), close the gap first (`fix: <statement>`, one more task, then the phase verifier again), or defer the statement through a design revision (`plan defect: <statement>`).
- After the reply, write the verdicts beside the README statements in one commit of its own, then close the milestone.

## 7. Close the Milestone

Only after the person's reply, and with every answer applied:

```bash
bd close ${milestoneId} --reason "Phase ${phase} complete: ${summary}. ${taskCount} tasks closed, automated verification passed, checkpoint answered."
```

In unattended mode, follow [unattended.md](unattended.md) instead of waiting: a checkpoint with nothing under "Needs your decision" is recorded, and its milestone stays open for the person's own checks.
