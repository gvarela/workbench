---
name: testing-profile
description: Draft a repository's testing profile, .claude/wb/testing.md, from what its tests and tooling show, and write it only after the user confirms. The profile records the stack's testing conventions plus the team's choices (for example no browser tests, or stub the LLM at the model call) and the mutation level; research cites it as a baseline and test-quality and test-audit read it. Use when the user asks to create, refresh, or review the testing profile or testing conventions file for a repository. Outside the stage chain; installs nothing.
---

# Testing Profile

Drafts `.claude/wb/testing.md` in this repository: the testing conventions a person has confirmed. Research cites the file as a baseline and records where the code differs; test-quality and `/wb:test-audit` read it before falling back to detection. Choices can only come from a person, which is why nothing is written until you confirm.

## Initial Response

This stage needs from you: confirmation or edits to the drafted profile.

State the repository and whether `.claude/wb/testing.md` already exists, then start.

## Step 1: Detect the stack

Read the dependency manifests and lockfiles, the test runner and linter configuration, the test helpers, and a sample of tests. Fill in the same fields as research's Testing Conventions ([../create_research/templates.md](../create_research/templates.md)): frameworks and versions, fast and full commands, levels and the harness per boundary, fixtures or factories, seams and mocking patterns, skip markers, installed test-quality linters and profilers with what each enables, any mutation tool, and the services the suite needs.

Use only what is installed and install nothing, because the profile describes the team's stack as it is. Change nothing else in the repository.

## Step 2: Draft the profile

Write the draft with a heading for each field above, named and ordered as research's Testing Conventions labels them (leave out its Profile field, which points at this file), each with file:line references where a file shows it. Add two headings detection cannot supply:

- **Choices**: decisions that bound what tests should do, such as "no browser tests" or "the LLM is a seam: stub at the model call". Propose none you cannot trace to the code or to the user; otherwise write "none recorded" and ask.
- **Mutation**: `off`, or `advisory` followed by the command to run. Default to `off` when no mutation tool is installed.

## Step 3: Confirm, then write

Show the draft and ask for confirmation or edits. Where the file already exists, show the differences against it rather than the whole draft, and keep its Choices and Mutation level unless the user changes them, because they are the parts that cannot be re-detected.

⛔ CHECKPOINT: the user has confirmed the draft. Writing before then would present a guess as a decision the team made.

Write `.claude/wb/testing.md` with the confirmed content, then report the path and what changed.
