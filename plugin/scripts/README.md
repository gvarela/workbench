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
  --red <red commit>:<test file> --declared /tmp/declared.txt

# Show help
./plugin/scripts/test-integrity --help
```

**Flags:**

- `--start <commit>`: the commit the task began from (required)
- `--red <commit>:<path>`: an outer test file and its red commit (repeatable)
- `--declared <file>`: a file listing the test files the test-writer reports declare, plus the support files a harness task's worker declares, one per line; without it, `undeclared_changes` is null
- `--test-paths <spec>`: what counts as a test file (repeatable; replaces the defaults `spec/ test/ tests/ __tests__/ *_test.* *_spec.* test_*.py *.test.* *.spec.*`). `dir/` matches a directory anywhere in the path, a spec with `/` is a glob on the whole path, anything else is a glob on the file name
- `--skip-pattern <regex>`: an extended regex for a skip or focus marker (repeatable; added to the built-in markers)

**Output:** one JSON object on stdout with `start`, `changed_tests` (committed, staged, unstaged, and untracked), `outer_tests` (`identical` true, false, or null), `added_skip_markers`, `deleted_tests` (files, and removed test-definition lines with their line in the starting commit), `undeclared_changes`, and `errors`. Paths are relative to the repository root.

**Features:**

- Read-only: never writes in the repository; git works on a temporary copy of the index, so the real index is never refreshed; when the repository has no index, that copy is built from HEAD, or from the starting commit when HEAD does not resolve (`git read-tree`), so unchanged tracked tests are not reported as deleted and re-added, and no index is created; only a failed rebuild is reported in `errors`
- Requires only bash 3.2 and git, so it runs in repositories you do not control
- Exit status 0 whenever it prints JSON (a check it could not make goes in `errors`); 2 on a usage error or outside a git work tree
- Tests: `tests/test-integrity/run.sh`

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
