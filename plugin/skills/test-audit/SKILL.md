---
name: test-audit
description: Audit an existing test suite cold, with no plan required, and write a report of proposed Remove, Rewrite, and Consolidate verdicts with evidence for a person to spot-check. Detects the stack, runs the project's own test-quality detectors with explicit rule selections, splits the suite into areas, and spawns parallel wb:test-auditor agents. Never edits or deletes tests and leaves the audited repository unchanged. Use when the user asks to audit, assess, or review the quality of a repository's tests, find weak, vacuous, or over-mocked tests, or decide which tests are worth keeping, outside a plan's phase review. Takes an optional scope.
argument-hint: [scope]
model: opus
effort: high
---

# Test Audit

Audits the tests a repository already has against the test-quality rubric, without a plan, and writes one report of proposals a person spot-checks.

Supporting files in this directory (read each when its step directs you to):

- [sub-agent-prompts.md](sub-agent-prompts.md): the `wb:test-auditor` spawn prompts, for an area and for candidates
- [templates.md](templates.md): the report template

The rubric, verdicts, detector method, custom heuristics, and finding shape are in the test-quality skill: [../test-quality/SKILL.md](../test-quality/SKILL.md) and [../test-quality/reference.md](../test-quality/reference.md). Read both in full before Step 2, and apply them rather than restating them.

## Rules for the whole audit

- **Proposals only.** Never edit, delete, or create a test, and never ask an agent to. Removing tests loses fault detection that a review cannot measure, so the person reading the report decides. A Remove or Consolidate verdict needs objective evidence (no unique coverage or no unique killed mutants, plus a passing run with the test removed); without it, the verdict is labelled "judgment-only, not actionable".
- **The audited repository does not change.** The person reading the report needs to trust that the audit touched nothing. Writing the report is the one write. Before Step 2, record the output of `git --no-optional-locks status --porcelain --ignored`, `git stash list`, and `git worktree list` in the audited repository; compare them again before writing the report, leaving out only the report file itself (or the new directory that holds only it; git may show the topmost new directory, such as `docs/`, so confirm with `git --no-optional-locks status --porcelain --untracked-files=all -- <that directory>` that the report is the only file in it). `--no-optional-locks` stops `git status` from rewriting `.git/index`, and `--ignored` makes new caches, logs, and coverage files visible, since most are git-ignored. If anything differs, say so at the top of the report and tell the user what changed. Do not clean it up yourself, because a cleanup command can discard the user's own work.
- **Read-only matters more than coverage.** When a detector or check cannot be run without writing to the repository or touching shared data, do not run it; report it as not run, with the reason. A check left out is visible in the report, while a changed repository or a flushed database is not.

## Initial Response

This stage needs from you: the scope (a plan directory, a path, or nothing for the whole repository), and your spot-check of the findings.

Read `$1` as the scope:

- **A plan directory** (it holds research.md and tasks.md): audit the whole suite of the repository it belongs to, with the plan's research as the conventions source.
- **A path inside this repository**: audit the tests under that path.
- **A path in another repository**: that repository is the audited one. Audit the tests under the path, and write the report in this session's repository so the audited one stays unchanged.
- **Nothing**: audit the whole suite of this repository.

State the scope and the audited repository in one line, then start.

## Step 1: Determine the stack and conventions

Take the stack and conventions from the first of these that exists, as the test-quality skill orders them:

1. The plan's research.md Testing Conventions section, when the scope is a plan directory.
2. `.claude/wb/testing.md` in the audited repository.
3. Detection. Read the dependency manifests and lockfiles, the test runner and linter configuration, the test helpers (for example `spec/rails_helper.rb` or `tests/conftest.py`), and a sample of tests. Fill in the same fields research's Testing Conventions has: frameworks and versions, fast and full commands, levels and the harness per boundary, fixtures or factories, seams and mocking patterns, skip markers, installed test-quality linters and profilers with what each enables, any mutation tool, and the services the suite needs.

The report states which source was used. When it was detection, the report lists what was inferred and from which files, so a reader can correct it.

## Step 2: Run the detectors

Follow the Method in test-quality/reference.md: find the tools installed in the project, select rules by category with explicit selections rather than the project's configured rule set, and record rules available but not enabled and categories with no detector in this stack. The worked examples there are a starting point, not the list of supported stacks.

- **Run only what is installed, and install nothing**: no `bundle install`, `npm install`, `pip install`, or `npx` without `--no-install`. A tool the team has not adopted produces findings it cannot act on, and installing writes to the repository.
- **Select a rule for skipped and pending tests where the stack has one**, including one that flags every skip or pending, not only those with no reason: a pending whose reason is a variable or a known defect still hides a failure, and without a detector such a test reaches the report only through a majority of three judgments. Take the exact rule name from the installed tool's configuration or documentation, not from memory. For example, rubocop-rspec 2.x declares `RSpec/Pending` (disabled by default) and `RSpec/PendingWithoutReason` (pending status) in its `config/default.yml`; another version or tool may differ.
- **Confirm each selected rule ran.** Some tools do not run a rule the project's configuration disables, even when it is selected explicitly. Where a rule did not run, list it as available but not enabled rather than reporting a clean result.
- **Leave the repository unchanged while linting.** Linters write caches, so disable them (for example `rubocop --cache false`, `ruff --no-cache`, eslint without `--cache`) or point them at a temporary directory outside the repository, write all output there too, and never pass a fix or autocorrect flag. Runner wrappers write too: `bundle exec` can rewrite `Gemfile.lock` unless `BUNDLE_FROZEN=true` is set, and `uv run` syncs `.venv` and `uv.lock` unless given `--frozen --no-sync`. State in the report how caches were handled. Run the status command from the rules above before and after the detectors, and stop running them if anything changed.

Keep the output per file, so Step 4 can give each area its own part.

## Step 3: Run the custom heuristics

Check the custom heuristics in test-quality/reference.md once, across the whole scope, with `grep` or by reading. Do not run an interpreter or AST helper that is not already installed. Keep each hit with its file:line, so Step 4 passes each area its own hits and the auditors do not repeat the search.

## Step 4: Audit the areas in parallel

Split the scope into areas along directories or test levels, each small enough for one auditor to read fully within its turn limit. As a starting size, use about 15 to 25 test files per area, fewer when the files are long. Keep files that share setup in one area where you can, because copied setup is only visible across files.

Read [sub-agent-prompts.md](sub-agent-prompts.md) now. Spawn one `wb:test-auditor` per area, all at once, with its "Area audit" prompt: the area's paths, the stack and conventions with their source, and the area's detector output and heuristic hits. Pass no `model` parameter, because the auditor's definition pins Opus at `high` effort and a per-spawn model overrides it.

⛔ BARRIER: every `wb:test-auditor` spawned for an area has returned (subagents run in the background, so wait for a completion notification from each one). The candidates to settle and the report both depend on every area, and an area left out reads as one with nothing to report.

Then settle each area's Majority Candidates, because a judgment-only Remove or Rewrite needs three independent judgments and a second reading in the first auditor's own context is not independent. Spawn `wb:test-auditor` again with the "Candidates" prompt: the area, the stack and conventions, and each candidate's location, rubric item, and proposed verdict, without the first auditor's reasoning. Spawn a third time, with the same inputs, for each candidate the first two judgments split on. Spawn every area's candidate judgments in parallel, and wait for each completion notification before writing the report. A candidate that 2 of 3 judgments agree with becomes a finding, recorded as "n of 3"; any other goes under "review these". A promoted judgment-only Remove still carries "judgment-only, not actionable" as its objective evidence, because a majority of judgments is not objective evidence.

Files an auditor lists under Not Run go to the report's Not checked section, or to one more area spawn when they are many.

## Step 5: Suite-level checks

Run the runtime checks in step 3 of test-quality/reference.md's Method: one seeded random-order run, repeats on suspect tests only, a slow-test report, a factory or setup-cost profile, and per-test coverage; and a mutation tool only when the conventions source declares its command. Run each only when all of these hold, and otherwise report it as "not run" with the reason:

- the conventions source gives its command, or detection found it in the repository's configuration;
- the services the suite needs are running and reachable;
- it can run without changing the audited repository or shared data. Test runs write caches, logs, and coverage files, and some suites reset a database or flush Redis on start. Read the test helpers to see what the suite does on start. Run it only from a disposable export of the commit outside the repository (for example `git archive HEAD | tar -x -C <temporary directory>`), never in the repository or in a git worktree of it (the disposable worktree that test-quality/reference.md names is for plan reviews; here a worktree would change `git worktree list` and write to the repository's `.git`), and only when its setup touches no shared service the user relies on. When you cannot establish this, report the check as not run and name what would make it safe.

The same conditions apply to the objective evidence for Remove and Consolidate: a passing run with the test removed is made only in such an export.

One check needs no run: brittleness from history. List commits whose messages call them structural (refactor, tidy, rename) that still edited tests, with `git log` limited to the test paths, and name setup blocks the auditors found copied across files.

## Step 6: Write the report

Read the template in [templates.md](templates.md) and fill every section from the auditors' reports, the settled candidates, and Steps 1 to 5. Every finding carries a verdict and an evidence type, and every "review these" bullet carries an evidence label. The report states that hollow reds and expectations edited after a failing run cannot be checked cold, because commit history does not show the order in which a test and its code were written, and it names the services that were not available.

Write it to:

- **A plan directory scope**: `<plan directory>/test-audit-YYYY-MM-DD.md`.
- **Otherwise**: `docs/test-audits/YYYY-MM-DD-<scope>.md` in this session's repository, where `<scope>` is the audited path or repository name in lowercase with hyphens, or `repository` for a whole-repository audit. When the audited repository is another one, the report says that it was written here so the audited repository stays unchanged.

Run the before-and-after comparison from the rules above one last time, then tell the user the report's path, the counts per verdict, the checks not run, and that the findings need their spot-check before anyone acts on them.
