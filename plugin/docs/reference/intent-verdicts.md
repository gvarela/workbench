# Intent Verdicts and the README Echo

Shared reference for the reports that close a plan: implement's and implement_inline's final-phase checkpoint, and `/wb:validate_phase <plan-dir> all`. Each gives every "Success looks like" statement in the README's `## Intent` section a verdict and writes it back beside the statement, so the README says whether the plan delivered what it set out to. The verdicts come from evidence the phases already gathered, `wb:phase-verifier`'s Intent Progress, so writing them spawns no agent of its own.

## The verdict per statement

Take each statement's status from the final phase's phase-verifier report (the one spawned with "final phase: yes"):

| Intent Progress status | Verdict |
| ---------------------- | ------- |
| met | PASS |
| deferred | DEFERRED |
| at risk, not started, or met so far | FAIL: on the final phase, a statement short of met has a refining criterion that failed, is missing, or was never delivered |
| awaiting the manual check | the user's reply to the manual check decides: PASS when they report it passed, FAIL when it failed; until they reply, the verdict is "awaiting your manual check" |

Which other reports count depends on who is asking:

- **At implement's and implement_inline's final checkpoint**, only the final phase's report counts: each earlier phase's deviations were answered at that phase's own checkpoint.
- **In `validate_phase all`**, a statement is also FAIL when another phase's report in the same run puts it at risk through an unexplained deviation that the user's reply neither accepts nor answers as a plan defect, because nobody has answered those deviations before this run.

A README without an `## Intent` section gets one row, "no Intent section (plan predates 3.0.0)", and no echo. A plan with no acceptance criteria predates 5.0.0: the phase verifier judged progress from the tasks done, so label each verdict judgment-only.

## In the report

The checkpoint report carries one line per statement under "What this phase delivered": `Intent verdict: "<statement>" → PASS | FAIL | DEFERRED | awaiting your manual check; <the evidence in one clause: metric, criterion, and outer test>`. validate_phase's report carries the same verdicts as its Verdict per Intent Statement table. A FAIL names what failed in plain words, as [writing-for-the-user.md](writing-for-the-user.md) says, and is listed under Needs your decision when it blocks the release, which a FAIL on a statement the plan did not defer does. The options for answering one are in "Phase Verification" in implement's reference.md (final phase) and in validate_phase's Step 6.

## The README echo

Write it after the user's reply to the report, so each "awaiting your manual check" verdict is settled by that reply.

- **At the final checkpoint**: if the reply leads to more work (a `fix:` answer, a sanctioned outer-test rewrite), spawn the phase verifier again once that work is committed, and take the verdicts from its new report.
- **In `validate_phase all`**: the skill changes no code, so write the echo from this report's verdicts, leaving out each statement a `fix:` answer touches; those get their verdict when `/wb:validate_phase <plan-dir> all` runs again after the fix.

For each statement, append `→ PASS (YYYY-MM-DD)`, `→ FAIL (YYYY-MM-DD)`, or `→ DEFERRED (YYYY-MM-DD)` to the end of the statement's line, replacing an earlier `→ ...` suffix if one exists, so the README carries the latest verdict. Write it pass or fail: a FAIL in the README is how the next reader learns the plan fell short. A statement whose manual check the user has still not answered gets no suffix, and the report says so.

The echo is a plan-document edit: commit the whole echo as one commit, on its own, while no agent runs, so it never lands in a task's diff.
