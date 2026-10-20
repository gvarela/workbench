---
name: testing-profile
description: Draft a repository's testing profile, .claude/wb/testing.md, from what its tests and tooling show, and write it only after the user confirms. The profile records the stack's testing conventions plus the team's choices (for example no browser tests, or stub the LLM at the model call) and the mutation level; research cites it as a baseline and test-quality and test-audit read it. Use when the user asks to create, refresh, or review the testing profile or testing conventions file for a repository. Outside the stage chain; installs nothing.
---

# Testing Profile

Drafts `.claude/wb/testing.md` in this repository: the testing conventions a person has confirmed. Research cites the file as a baseline and records where the code differs; test-quality and `/wb:test-audit` read it before falling back to detection. Choices can only come from a person, which is why nothing is written until you confirm.

## Initial Response

This stage needs from you: whether you control this repository's tooling, an answer for each gap against the flow, and confirmation or edits to the drafted profile.

State the repository and whether `.claude/wb/testing.md` already exists, then start.

## Step 1: Detect the stack

Read the dependency manifests and lockfiles, the test runner and linter configuration, the test helpers, and a sample of tests. Fill in the same fields as research's Testing Conventions ([../create_research/templates.md](../create_research/templates.md)): frameworks and versions, fast and full commands, test file grouping (how tests are split into files and where acceptance-level tests live), levels and the harness per boundary, fixtures or factories, seams and mocking patterns, skip markers, installed test-quality linters and profilers with what each enables, any mutation tool, and the services the suite needs.

Use only what is installed and install nothing, because the profile describes the team's stack as it is. Change nothing else in the repository.

## Step 2: Draft the profile

Write the draft with a heading for each field above, named and ordered as research's Testing Conventions labels them (leave out its Profile field, which points at this file), each with file:line references where a file shows it. Add two headings detection cannot supply:

- **Choices**: decisions that bound what tests should do, such as "no browser tests" or "the LLM is a seam: stub at the model call". Propose none you cannot trace to the code or to the user; otherwise write "none recorded" and ask.
- **Mutation**: `off`, or `advisory` followed by the command to run. Default to `off` when no mutation tool is installed.

Two more headings appear only when the next step produces entries for them:

- **Planned**: tooling the team decided to adopt and has not installed. Every other heading describes what is present, so a reader never takes a Planned entry for installed tooling.
- **Open**: gaps the team has not decided.

## Step 3: Gaps against the flow

The flow's agents read the profile and rely on certain tooling being there. Compare the draft with what they rely on, so a missing piece surfaces now, as a decision, instead of later as a finding. This step reads and asks only: it writes no file and files no issue, because nothing is decided until the checkpoint in Step 4.

Check these against the draft, and name the agent or skill that relies on each gap, reading the agent and skill files in this plugin rather than recalling them:

- A harness for each boundary the code's behavior is observed at, such as HTTP, the UI, a CLI, or the LLM call (create_design's Harness Decisions record whether one is present at each boundary its criteria are observed at; test-writer writes outer tests at that boundary; test-reviewer checks that each outer test runs there).
- Seams for the LLM and external APIs (test-writer stubs at the criterion's declared seam; test-auditor judges doubles against the seams the conventions declare).
- Test-quality linter rules that are installed but not enabled. test-quality's detector method selects rules explicitly, but some tools still skip a rule the configuration disables, and only enabled rules run in the team's own lint; test-reviewer and test-auditor list the rest as available but not enabled.
- A mutation tool, which the profile's Mutation level needs before it can be `advisory` (test-reviewer and `/wb:test-audit` run only a declared mutation command).
- The existing skip-marker baseline: the markers in use and how many. The plugin's test-integrity script, which task-verifier and test-reviewer run, flags markers added since a task or phase began and knows only common markers, so a project-specific marker has to be listed for them to pass it as `--skip-pattern`.

Where the file already exists, leave out gaps its Choices or Planned entries already answer. If no gaps remain, say so and go to Step 4.

Otherwise ask the user once whether they control this repository's tooling, because adding a linter rule or a harness is not their call in a repository they only contribute to. If they do not, offer only "record as a choice" and "decide later" for each gap, and suggest no tooling.

Rank the gaps by how much of the flow they leave without its input, show at most about five, and ask one question per gap with these options:

- **Adopt**: nothing is installed. Record the gap under Planned, not as present, and file a beads issue after the checkpoint with `bd create "<title>" --type=task --priority=2 -d "<desc>"`, then store the issue's id with the entry, as in `- request-level harness (beads: <id>)`, so a later refresh can find it.
- **Record as a choice**: record it under Choices with the user's reason. Readers treat Choices as decisions that bound their findings, so the gap stops being flagged.
- **Decide later**: list it under Open.

## Step 4: Confirm, then write

Show the draft, with the gap answers placed under Choices, Planned, and Open, and ask for confirmation or edits. Where the file already exists, show the differences against it rather than the whole draft, and keep its Choices, Planned, Open, and Mutation level unless the user changes them, because they are the parts that cannot be re-detected. A Planned entry that detection now finds installed moves to the heading that describes it; say so in the differences.

For each such entry that records a beads id, run `bd show <id>` and name the entry and its issue in the differences, and, unless `bd show` reports it closed, say the user can close it, for example with `bd close <id>`. Closing is the user's call, so the skill does not close it. If beads is not initialized or `bd show <id>` fails because the id no longer resolves, say so and continue. This is the only beads command that runs before the checkpoint, and it only reads.

⛔ CHECKPOINT: the user has confirmed the draft. Writing before then would present a guess as a decision the team made.

Write `.claude/wb/testing.md` with the confirmed content, then file one beads issue for each adopted gap and write its id into that Planned entry in the file, because the id exists only once the issue is filed. If beads is not initialized here, present the Beads not initialized case from [beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and file the issues and add their ids once the user has initialized it; until then the Planned entries carry no id. Report the path, what changed, and the issue ids. The skill installs nothing.
