# Phase Checkpoint

The agents a phase checkpoint runs and how their results enter the report. Part of the implement skill; read it when SKILL.md or another playbook points here.

## Phase Verification (Step 8, implement_inline Step 5, and validate_phase)

`wb:phase-verifier` checks the phase against its plan at every checkpoint: planned changes missing from the phase diff, changes no task covers, earlier phases' tests the phase changed again, and progress toward each README Intent statement. Without it these checks wait for a whole-plan validation that may never run, and later phases get built on a gap. It runs in parallel with the first `wb:test-reviewer` spawn, from the "Phase Verifier Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md).

**⛔ BARRIER: the phase verifier's completion notification, the prover's, and every test-review judgment (the first review and each majority-settling spawn) received before the checkpoint report — the report folds in all of them, and one written without any of them misses what that agent found. The majority settling waits only on the first test review, not on the phase verifier.**

**Values for the prompt**:

- **Phase starting commit**: the one Step 4 recorded (implement_inline: Step 2), or recovered as Resume says.
- **End**: HEAD, since every task is committed by the checkpoint; "working tree" only when `git status --short` shows phase changes still uncommitted.
- **Plan starting commit**: phase 1's starting commit. In phase 1 it is the phase starting commit; in a later phase or after Resume, recover it as Resume recovers a phase's starting commit, from phase 1's task ids in the tasks.md frontmatter: the parent of the earliest commit that names one of them or adds a phase 1 criterion's `red(AC-n)` whose title matches that criterion's title (criterion ids repeat across plans, so the id alone can match another plan's commit). When no commit qualifies, as in a plan whose commits name no task ids, pass `unknown`: the verifier then reports the earlier-phase test check as not run, without failing the phase. The verifier passes a known plan start to the integrity script's `--plan-start`, which lists the earlier phases' test files this phase changed again (`earlier_phase_tests`; "test-integrity" in the `README.md` of the plugin scripts directory SKILL.md gives).
- **Final phase**: yes when tasks.md has no later phase.
- **Tasks**: the phase's task ids from the tasks.md frontmatter (outer test steps included), plus each issue filed during the phase whose id a commit in the range names: split slices, sanctioned rewrites, and tasks a `fix:` answer filed. Without them, their changes read as unplanned.
- **Red commits**: the latest `red(AC-n)` commit of every criterion delivered so far, earlier phases included, since Intent progress counts them all.
- **Automated verification**: the commands from the checkpoint's automated verification, and whether each passed.

**Verdict**: the report's Status line, parsed as Step 6 item 4 parses a task verifier's: FAIL wins, and a report with both verdicts or neither is a FAIL.

**Its posted report**: the phase verifier posts its report on the milestone as the `phase verification` record, through `wb-records` (pass the milestone id in its prompt), and ends its returned report with the manifest's comment id. When it returns `Not posted: phase verification`, post only the exact parts it returns, verbatim, as "Failed post" under "Evidence in Beads" says for a verifier; never write or summarise its report yourself.

**A missing-context FAIL** (`Cause: missing context (<what>)`): the input you passed may be what is wrong, so check it first: the range and plan start against `git log`, and the task ids against the tasks.md frontmatter and `bd show <id> --json`. Correct what is wrong and spawn the verifier again. When your inputs were right and the plan lacks what the verifier named, put it under Needs your decision with the options of the "Missing Context Check" in [failures.md](failures.md) (add or correct it, then say "continue"; or treat it as a plan defect), and keep the milestone open until it is answered. No task halted, so post no `halted:` comment.

**Folding it into the checkpoint report** (the checklist in Step 8 item 4, or implement_inline's "Manual Verification Request"), each item written as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says:

- **Needs your decision**: each unexplained deviation, numbered D1, D2, ... in report order so a reply can name it, in that file's decision form: the product behavior at risk; judgment or friction; the options; a recommendation with a paste-ready reply. The usual options, offered only when they are the real ones:
  1. Accept it: I record it and its reason in tasks.md's Implementation Notes (a missing change deferred also gets a follow-up issue, in the `discovered-from` form under "Evidence in Beads", linked to the phase milestone). Cost: the plan now differs from design.md where the deviation touches it. Reply: `accept: D1`.
  2. Make the phase match the plan before the milestone closes: the missing change runs as a task through Steps 5 and 6 (implement_inline: Step 3), filed in that same form; an unplanned change is reverted in its own commit. Cost: one more task, or lost work if the change was useful. Reply: `fix: D1`.
  3. Treat it as a plan defect, when the plan was wrong and the code is right: the "Plan-Defect Deviation Protocol" in [failures.md](failures.md). Reply: `plan defect: D1`.
- **What this phase delivered**: one "Intent progress" line per README Intent statement, in plain words, with its status (deferred, at risk, not started, awaiting the manual check, met, or met so far) and, for at risk, what puts it at risk.
- **Test integrity**: one "Earlier phases' tests changed" line, each test file with the task that declared it and the reason that task gave, or "none"; the quality judgment on those changes is the test review's, in its findings.
- **Follow-ups, product and plan**: each explained deviation, with the record that explains it; each statement at risk, saying whether it blocks the release; each check the verifier could not run, with its reason.

**Holding the go-ahead**: a FAIL holds it as the test review's blocking items do. The person's reply answers each unexplained deviation by its number with one of the options, and a reply that names a set (`accept: D1-D4`) answers each deviation in it the same way, as the pending-decisions ledger in [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says; a general go-ahead does not, because the next phase would build on a deviation nobody chose. Apply each answer before closing the milestone. A plan-doc edit is its own commit, made while no agent runs, as Step 6 says for coordinator-side edits.

**Final phase: the Intent verdicts**. On the plan's final phase, the checkpoint also closes the plan, so it gives every README Intent statement its verdict and writes it back to the README, as [intent-verdicts.md](../../docs/reference/intent-verdicts.md) says, with no extra agent: the phase verifiers already gathered the evidence. Map the final phase verifier's Intent Progress (met → PASS, deferred → DEFERRED, at risk, not started, or met so far → FAIL, awaiting the manual check → settled by the person's manual-check reply). Earlier phases' deviations were answered at their own checkpoints, so only the final phase's report counts here.

- **In the checkpoint report**: one "Intent verdict" line per statement under "What this phase delivered", in place of the Intent progress line; a FAIL on a statement the plan did not defer also goes under Needs your decision, because the release would ship short of what the plan set out to do.
- **Answering a FAIL verdict**: it needs an answer by name, with these options in the decision form above, offered only when they are the real ones. Once answered, it does not stop the milestone closing.
  1. Ship it short: the README records FAIL, and I file a follow-up issue in the `discovered-from` form under "Evidence in Beads", linked to the final milestone. Cost: the plan closes short of that statement. Reply: `accept fail: <statement>`.
  2. Close the gap first: I file the missing work as a task, run it through Steps 5 and 6 (implement_inline: Step 3), spawn the phase verifier again once it is committed, and take the verdict from its new report. Cost: one more task before the plan closes. Reply: `fix: <statement>`.
  3. Defer the statement: a design change, through the "Plan-Defect Deviation Protocol" in [failures.md](failures.md), so design.md lists it as deferred. Cost: a design revision. Reply: `plan defect: <statement>`.
- **After the reply**: write the README echo before closing the final milestone, once each manual check is answered and each deviation and verdict answer applied. When an answer adds work (a `fix:` answer, a sanctioned rewrite), spawn the phase verifier again after that work is committed and take the verdicts from its new report. The echo is a plan-doc edit, committed as one commit on its own.
- **In the Phase Completion Report**: the verdicts as written, and each statement still awaiting a manual check, with no suffix written for it.

## Proof (Step 8, implement_inline Step 5, and validate_phase)

`wb:prover` runs the product at each criterion's boundary and reports what it saw. The tests show the tests pass; the prover shows the product doing what the criterion says, so the person reads evidence in place of checking by hand. It is spawned with the first test review and the phase verifier, from the "Prover Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md), and the barrier above waits on it.

**Values for the prompt**:

- **Criteria**: the criteria this phase delivered (each has a red commit from this phase). On the final phase, every criterion the plan delivered, so the plan closes on proof of the whole. A plan with no acceptance criteria predates 5.0.0: pass `none`, and the prover attempts the manual checks only.
- **Red commits**, **test command**, **profile**: as the phase verifier's prompt takes them; `none` when `.claude/wb/testing.md` does not exist.

**Its report** is posted on the milestone as the `proof` record. Handle `Not posted: proof` and `Cause: missing context` as "Phase Verification" above handles them for the phase verifier: post only its exact parts, or correct your inputs and spawn it again.

**Folding it into the checkpoint report**:

- Each line under "What this phase delivered" carries its criterion's state. For a proven one, copy the prover's command and the output that shows it; never reword its evidence or add your own.
- "Left for you to check" holds what the prover could not prove, with its reason and steps, plus one line for each manual check it proved. Nothing it proved is asked of the person again.
- A state you did not get from the prover's report is not a state. When the prover did not return or its record does not read `ok`, say so and list every criterion and manual check as left for the person.

**Holding the go-ahead**: a disproven criterion or manual check holds it. Number each P1, P2, ... and put it as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md)'s decision form: what the product did when run, against what the criterion says, with the prover's command. The choices:

1. Fix it before the milestone closes: the fix runs as a task through Steps 5 and 6 (implement_inline: Step 3), filed in the `discovered-from` form under "Evidence in Beads" linked to the task that delivered the criterion, and its test goes through `wb:test-writer`, so the gap the prover found stays caught. Then spawn the prover again for that criterion and take its state from the new report. Reply: `fix: P1`.
2. Accept it: the phase closes with the gap. Record it in tasks.md's Implementation Notes and file a follow-up issue in the same form. Reply: `accept: P1`.

A could-not-prove item does not hold the go-ahead by itself; it waits for the person's own check, as a manual check always has. In unattended mode a disproven item goes on the `deferred:` ledger like any other decision.
