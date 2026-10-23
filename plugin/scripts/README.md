# Scripts

Utility scripts for the project.

## Available Scripts

### `lint`

Lints markdown files using markdownlint.

```bash
# Lint only changed markdown files (default)
./plugin/scripts/lint

# Auto-fix issues in changed files
./plugin/scripts/lint --fix

# Lint all markdown files in the project
./plugin/scripts/lint --all

# Auto-fix all markdown files
./plugin/scripts/lint --all --fix

# Show help
./plugin/scripts/lint --help
```

**Features:**

- By default, only lints files that have been changed (git diff)
- Excludes common directories (node_modules, .git, vendor, etc.)
- Uses `.markdownlintrc` for configuration if present
- Provides clear output with file status indicators
- Supports auto-fixing with the `--fix` flag

**Requirements:**

- markdownlint-cli (`npm install -g markdownlint-cli` or `brew install markdownlint-cli`)
- git (for detecting changed files)

### `lint-hook`

Hook script used by Claude Code to automatically lint markdown files after they are created or edited.

```bash
# This script is automatically triggered by Claude Code hooks
# It's registered as a PostToolUse hook in plugin/.claude-plugin/plugin.json
```

**Features:**

- Automatically runs after Write or Edit tools modify markdown files
- Attempts to auto-fix issues with markdownlint
- Shows concise output in Claude Code interface
- Non-blocking (won't stop operations if linting fails)

### `test-integrity`

Reports, as JSON, deterministic test-integrity evidence for a task since its starting commit. `wb:task-verifier` runs it in its Test Integrity step and interprets the result; the script decides nothing.

```bash
# Changed tests, skip markers, and deleted tests since a commit
./plugin/scripts/test-integrity --start <commit>

# Also check outer tests against their red commits and changes against a declared list
./plugin/scripts/test-integrity --start <commit> \
  --red <red commit>:<test file> --declared-path <test file> --declared-path <support file>

# Show help
./plugin/scripts/test-integrity --help
```

**Flags:**

- `--start <commit>`: the commit the task began from (required)
- `--red <commit>:<path>`: an outer test file and its red commit (repeatable)
- `--declared <file>`: a file listing the test files the test-writer reports declare, plus the support files a harness task's worker declares and the setup files a setup task's worker declares (`setup files:` records), one per line
- `--declared-path <path>`: one declared path (repeatable; combines with `--declared`). Agents pass their declared files this way, in the one `test-integrity` call, so no list file has to be written first
- `--declared-none`: a declared set with nothing in it, for a task that declares no test files: every changed test file is then undeclared. Without any of the three declared options, `undeclared_changes` is null
- `--test-paths <spec>`: what counts as a test file (repeatable; replaces the defaults `spec/ test/ tests/ __tests__/ *_test.* *_spec.* test_*.py *.test.* *.spec.*`). `dir/` matches a directory anywhere in the path, a spec with `/` is a glob on the whole path, anything else is a glob on the file name
- `--skip-pattern <regex>`: an extended regex for a skip or focus marker (repeatable; added to the built-in markers)
- `--plan-start <commit>`: the commit the plan began from, with `--start` as the phase's starting commit; fills `earlier_phase_tests`, which `wb:phase-verifier` reads. Without it, `earlier_phase_tests` is null

**Output:** one JSON object on stdout with `start`, `changed_tests` (committed, staged, unstaged, and untracked), `outer_tests` (one entry per `--red`: `path`, `red`, `mode`, `identical` true, false, or null, `diff_stat` against the red commit when not identical, and `changed_lines`), `added_skip_markers`, `deleted_tests` (files, and removed test-definition lines with their line in the starting commit), `undeclared_changes`, `earlier_phase_tests` (each test file changed in a commit between the plan start and `--start` that is in `changed_tests` too, as `path` and `earlier_commits`, the commits that changed it before the phase, newest first; a file renamed in the phase is not matched), and `errors` (an unknown plan start, or one that is not an ancestor of `--start`, is reported here and leaves `earlier_phase_tests` null). Paths are relative to the repository root.

**Outer-test modes:** each `outer_tests` entry names the check that ran in `mode`.

- `"file"`: the path is named by only one `--red` in the call. `identical` is true when the work-tree file is byte-identical to the file at the red commit; `changed_lines` is null.
- `"lines"`: two or more `--red` name the same path (criteria that share a test file, each committed in its own red commit). Each criterion is checked on the lines its red commit added (`<commit>^..<commit>` for that path): every one must still be in the work tree, uncommitted changes included, and still be attributed to that red commit by `git blame`. `identical` is true when all of them survive; otherwise false, with `changed_lines` counting the added lines that were edited or deleted. Lines that other criteria or later commits add elsewhere in the file do not count. A red commit that does not change the path, or that has no parent, is reported in `errors` with `identical` null.

**Features:**

- Read-only: never writes in the repository; git (including `git blame` in `lines` mode) works on a temporary copy of the index with optional locks off, so the real index is never refreshed; when the repository has no index, that copy is built from HEAD, or from the starting commit when HEAD does not resolve (`git read-tree`), so unchanged tracked tests are not reported as deleted and re-added, and no index is created; only a failed rebuild is reported in `errors`
- Requires only bash 3.2 and git, so it runs in repositories you do not control
- Runs nothing the repository configures: git hooks, fsmonitor, system config, global attributes, external diff, pager, and every configured filter, diff, and merge driver are switched off (the same hardening as in the optional `wb-defects` plugin)
- Runs nothing the environment injects: its `#!/bin/bash -p` first line makes bash ignore `BASH_ENV`, `ENV`, and exported functions, and it clears inherited `GIT_*`, `BASH_ENV`, `ENV`, and `CDPATH` before calling git, so run it by its path, not as `bash test-integrity`
- Exit status 0 whenever it prints JSON (a check it could not make goes in `errors`); 2 on a usage error or outside a git work tree
- Tests: `tests/test-integrity/run.sh`

### Planted-defect runner

The planted-defect runner is an optional separate plugin, `wb-defects` (command `wb-plant-defect`); see [wb-defects/README.md](../../wb-defects/README.md).

## Configuration

The project uses `.markdownlintrc` for markdownlint configuration. Current settings:

- Line length checking disabled (for long code blocks)
- Inline HTML allowed
- Emphasis as heading allowed (bold lines used as labels in skills)
- Fenced code blocks without language specification allowed

## Claude Code Hooks

The plugin registers automatic markdown linting as hooks in `plugin/.claude-plugin/plugin.json`:

- **PostToolUse hooks** for Write and Edit tools
- Automatically runs `${CLAUDE_PLUGIN_ROOT}/scripts/lint-hook` after any markdown file is created or modified
- Attempts to auto-fix common markdown issues
- Shows brief status messages in the Claude Code interface

Plugin hooks can't be switched off one at a time. To stop automatic linting, disable the plugin (`claude plugin disable wb@gvarela-workbench`), set `disableAllHooks` in your settings (which stops every hook), or remove the PostToolUse entries from `plugin.json`.
