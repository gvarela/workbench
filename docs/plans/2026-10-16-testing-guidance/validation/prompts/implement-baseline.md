/wb:implement docs/plans/2026-10-20-rides

This is an unattended headless run: nobody can answer questions. Do not ask for confirmation; where the stage would ask, use these answers and continue to the end of the stage:

- Phase to run: phase 1.
- Go-ahead at the phase checkpoint: stop after printing the checkpoint summary. Do not proceed to a second phase.
- On a verified failure: stop and report; do not retry more than the stage's own limit.
- On a plan defect where the worker followed the plan exactly and all tests pass: accept the plan as written, note the deviation in Implementation Discoveries, and continue with the remaining tasks of the phase. Do not ask for a design revision.
