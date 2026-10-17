# python-rides: pre-answers for headless runs

The headless driver appends the section for the stage being run to its prompt, so no stage waits on a human. Each answer matches the "This stage needs from you" line of that stage's SKILL.md.

The plan directory is `docs/plans/2026-10-20-rides/`.

## /wb:create_research

- Research question: confirm the one derived from the plan's Goal (the rides page window and the wizard focus behavior). No change.
- Approved: yes. Proceed.

## /wb:explore_design

Not needed. Skip it and go straight to `/wb:create_design`.

## /wb:create_design

- Approach: approve the approach you recommend. Keep it to the smallest change that meets the two Intent statements.
- Metrics: approve the refined metrics as drafted, provided each traces to an Intent success statement.
- Acceptance criteria (5.0.0 and later): approve the criteria as drafted.
- Harness decision for the wizard focus criterion (variant dependent):
  - Variant A (base, no profile): answer "add harness". Add a browser test harness for the wizard.
  - Variant B (with-profile): answer "manual". Accept manual verification for the wizard focus criterion.
- Amendments to the README Intent: none needed.

## /wb:create_tasks

- Confirm the phases and checkpoints as proposed. One phase is fine if the work is small; otherwise accept the proposed split.
- Harness tasks (if proposed): accept.

## /wb:implement and /wb:implement_inline

- Phase to run: phase 1.
- Go-ahead at the phase checkpoint: stop after printing the checkpoint summary. Do not proceed to a second phase.
- On a verified failure or a plan defect: stop and report; do not retry more than the stage's own limit.

## Variants

- `with-profile`: copy over the base; answers as above with the harness answer "manual".
- `legacy`: copy over the base, then run `seed-beads.sh`; only the `/wb:create_tasks` and `/wb:implement` answers apply (the design already exists).
