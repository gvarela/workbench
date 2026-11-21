# Verifying a Rewrite of an Outer Test

Read by `wb:task-verifier` (and by `wb:test-reviewer` in inline mode) only when a task's description carries an `Outer test rewrite:` line, or an older plan's `Sanctioned rewrite:` line. The rule it checks is [Outer tests](rules-and-intents.md#outer-tests): an outer test may change after its red commit only when the change is shown to keep everything the red-commit version caught.

The change to the outer test is this task's deliverable. You do not judge whether the rewrite was a good idea. You establish three things, and the rewrite is proven only when all three hold.

## 1. The criterion's text is unchanged

Compare the criterion's entry in design.md now with design.md at the criterion's red commit (`git --no-pager show <red commit>:<plan dir>/design.md`). Any change to its statement, examples, observed-at boundary, or seam means the rewrite follows a change in what the criterion means, which is the person's decision: **not proven**, and say what changed.

## 2. Nothing the red-commit version caught is lost

The task's rewrite line gives the reason, and the reason gives the proof to look for. Take the strongest that applies.

- **Mechanical** (reason: reflow): run the integrity script with `--start <the criterion's latest red commit>`, the outer test file as the only `--test-paths`, and `--allow-mechanical`. The whole change must be `reorder` (an import re-sort of plain top-of-file import lines) or `whitespace`. Read the hunks: a moved assertion or fixture, or changed indentation where indentation is syntax, is not mechanical.
- **Name only** (reason: a rename design.md states): read every changed hunk. Each change must be the old identifier replaced by the new one in a code position (a call, an import, a reference). An occurrence inside a string literal, selector, route, snapshot, expected value, assertion message, or user-facing copy changes what the test asserts: **not proven**, naming the line. Confirm design.md states the rename.
- **Differential** (reason: a gap, or anything the two above do not cover): show by planted defects that every case the original caught is still caught.
  1. Read the red-commit version (`git --no-pager show <red commit>:<outer test file>`) and list every case its predicate or assertion catches: each branch, pattern alternative, call form, input shape, and table row, on shapes present in the repository (ones the code or data the test guards produces) or named in the criterion's examples.
  2. A shape outside the repository and the examples is not a case. The test-writer's report lists each with the search that shows it is absent; repeat each search, and treat one whose absence your search leaves uncertain as a case.
  3. A case a `not claimed:` record on the task names, accepted in the person's own reply, is outside the differential. Nothing else is: accepting lost coverage is the person's.
  4. Plant one defect per case, plus one for the gap the rewrite closes, and run both versions against each in the one copy: the rewrite as it stands, and the original through `--test-file <outer test file>=@<red commit>` on the same `run`, after a `baseline` with it. A control case comes first in each batch.
  5. The rewrite must fail on every one. The original is expected to pass on the gap's defect. Compare your results with the differential in the test-writer's report and note any defect it left out.

  The differential needs `wb-plant-defect` or a recognized mutation tool that runs both versions. Without one it cannot run: **not proven**, with the reason "no defect runner". Do not judge a differential by reading.

## 3. No added assertion goes beyond the criterion

Read each assertion the rewrite adds against the criterion's statement and examples. An added check of something the criterion does not state (a word list, a placement, an exact wording, a value the examples do not give) makes the test stricter than what the person approved: **not proven**, naming the assertion. A check of what the statement or an example already says is fine.

## Reporting

On the returned block's Outer tests line:

- `rewrite proven (<file>; mechanical)`, `(<file>; name only)`, or `(<file>; differential, <n> of <n> caught)` when all three hold. The task passes if its other checks pass.
- `rewrite not proven (<file>; <what was not shown>)` otherwise, and the task is a FAIL with `Cause: implementation defect`. When cases were lost, report them as one class, with one general fix that restores the original's reach and keeps the gap closed, checked against the planted defects where you can. A fix aimed at the first lost instance leaves the rest for the next verification.

In the report's Criterion Check, add one line: `Rewrite: <the proof>; cases <n>, caught by the rewrite <n>; not claimed: <each case a record accepts, with the record>; shapes outside the repository: <each, with its search>`.

A missing `discovered-from` link on the rewrite task is a record gap for the Record gaps line, not a reason to fail.
