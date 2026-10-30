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
- `--allow-mechanical`: leave mechanical changes (below) out of `undeclared_changes` and list them in `cleared_mechanical` instead, so an import re-sort, an edge-whitespace-only hunk, or a leading comment-block change clears with a record. Without it, mechanical changes count as undeclared like any other change, and `cleared_mechanical` is null
- `--fingerprint`: instead of the report, print one JSON object `{"fingerprint": "<sha256>", "records": n, "errors": []}` describing the tree's state; `--start` is not needed. The digest covers NUL-framed records in a fixed order: every index entry (path, mode, blob, stage), the status of tracked entries (`git status --porcelain=v2 -z`, so the same edit staged and unstaged differs), the working tree of every tracked path (mode and blob, `deleted`, or a submodule's checked-out commit), untracked files, and ignored files under each `--include-ignored` directory (path, mode, and content blob, or the blob of a symlink's target). Read-only: git works on a copy of the index, and nothing is written. Cost: it reads every tracked and untracked file once (one `git hash-object --stdin-paths` pass, plus `du` for the size check), so it is proportional to the tree's size; tracked plus untracked content is capped at 100,000 files and 2 GiB, and over a cap it fails closed: `fingerprint` is null and `errors` says why
- `--include-ignored <dir>`: with `--fingerprint`, also cover the ignored files under this repository-relative directory (repeatable; at most 20,000 files and 500 MiB per directory). Ignored files elsewhere do not count
- `--sha256 <part>...`: print `{"sha256": "<hex>", "bytes": n}` for the exact concatenation of the parts, with no separators (every remaining argument is a part, even one starting with `-`; empty parts add nothing). It needs no git and no repository, and refuses more than 1 MiB in total (exit 2). Hash one record part per call (parts are small), and keep each argument a single line where a shell-command check might refuse multi-line text

**Output:** one JSON object on stdout with `start`, `changed_tests` (committed, staged, unstaged, and untracked; each entry has `path`, `status`, `tracked`, `hunks`, `old_path` for a rename, and `mechanical`), `outer_tests` (one entry per `--red`: `path`, `red`, `mode`, `identical` true, false, or null, `diff_stat` against the red commit when not identical, and `changed_lines`), `added_skip_markers`, `deleted_tests` (files, and removed test-definition lines with their line in the starting commit), `undeclared_changes`, `mechanical_changes` (the paths whose `mechanical` is not null), `cleared_mechanical` (with `--allow-mechanical`: the mechanical paths left out of `undeclared_changes`; otherwise null), `earlier_phase_tests` (each test file changed in a commit between the plan start and `--start` that is in `changed_tests` too, as `path` and `earlier_commits`, the commits that changed it before the phase, newest first; a file renamed in the phase is not matched), and `errors` (an unknown plan start, or one that is not an ancestor of `--start`, is reported here and leaves `earlier_phase_tests` null). Paths are relative to the repository root.

**Mechanical changes:** each `changed_tests` entry's `mechanical` is `"reorder"`, `"whitespace"`, `"comment-header"`, or null. Only an in-place modification of a tracked test file is checked, comparing its content at `--start` (the raw blob, no filters) with the current file, uncommitted changes included. The rules are narrow on purpose, since reordering or re-spacing a test can change what it checks:

- `"whitespace"`: the only differences are leading and trailing whitespace on a line, blank lines, and line endings (CRLF versus LF, a missing final newline). Interior whitespace must be unchanged, so a change inside a string literal (`"a b"` to `"ab"`) or between tokens is not mechanical. Where indentation is syntax (`.py`, `.pyi`, `.yaml`, `.yml`, `.feature`, `.mk`, and `Makefile`/`makefile`/`GNUmakefile`), a change in leading whitespace is not mechanical either, since it can move a line into or out of a block; trailing whitespace, blank lines, and line endings still count as whitespace there. Lines that open, close, or sit inside a multi-line literal are compared byte for byte: an odd number of backticks or of triple quotes (`"""`, `'''`) on a line opens or closes one, and a heredoc opener (`<<EOF`, `<<-EOF`, `<<~EOF`, quoted or not) runs to its terminator. When the last line is part of such a literal, whether the file ends with a newline must be unchanged too. This is best effort (the markers are counted per line, not parsed), so the verifier still reads the hunks.
- `"reorder"`: an import re-sort, under strict rules. The multiset of lines is unchanged, whether the file ends with a newline is unchanged, the only lines that changed position are qualifying imports (every other line stays at its line number), and no two qualifying imports in either version bind the same name. The bound name is the last component for JVM languages, C#, and Rust (paths split on `.` or `::`), the last path element for Go, the module for Python `import a`, the imported name for Python `from a import b`, and the local name for JavaScript. So `import p.One` with `import q.One`, `java.util.List` with `java.awt.List`, `use a::X;` with `use b::X;`, or `"x/log"` with `"y/log"` is null, while a re-sort of `java.util.List` and `java.util.Map`, `System` and `System.Linq`, or `std::fmt` and `std::io` is a reorder. A qualifying import is a plain, top-level, single-binding import in the file's leading import region (after any shebang, encoding line, docstring, `"use strict"`, or `package` line, the contiguous block of such imports, blank lines, and comments):
  - Python `import a` (one component; a dotted `import a.b` never qualifies) and `from a import b` (one unaliased name)
  - JavaScript and TypeScript `import y from 'x'`, `import {y} from 'x'` (one name), and `const|let|var y = require('x')`
  - Go plain `"pkg"` lines in the top `import ( ... )` block, or `import "pkg"`
  - Java, Kotlin, and Scala `import a.b.C` (no wildcard, alias, or `static`)
  - C# `using A.B;` (no `using static`, no alias)
  - Rust `use a::b;` (no braces, glob, or `as`)

  Never qualifying: aliased imports (`import x as y`, `from a import b as c`, `import {a as b}`, `import * as ns`), multi-name or parenthesised imports, indented or conditional imports (inside `try`, a function, a block), imports after the leading region (so an import moved from the body to the top is not mechanical), side-effect imports (JavaScript `import './x'`, a bare `require('x')`, and Ruby `require`/`require_relative`, so a Ruby re-sort is not mechanical), and Go `_` and `.` imports. A re-sort that moves any of these, or any other line, is null.
- `"comment-header"`: the only difference is inside the file's leading comment block (blank lines and comment lines starting with `#`, `//`, `--`, or `;;`, and single-line `/* ... */`), and everything after that block is identical byte for byte; a schema annotation header (annotaterb) is the usual case. Lines that look like comments but change behaviour end the block, so a change to them is null: a shebang, Ruby and Python magic comments (`frozen_string_literal`, `encoding`/`coding`, `-*- ... -*-`, `typed`, and the like), Go build constraints (`//go:build`, `// +build`), TypeScript, eslint, flow, and jsx directives, `///` triple-slash directives, C preprocessor lines, and Rust `#[...]`/`#![...]` attributes. A comment changed below the first code line, or a new leading line that is code, is null.
- null: anything else. That includes an assertion moved above the action, two statements swapped, an import re-sort combined with any other move or edit, an interior whitespace change, a whitespace change inside a multi-line literal, a mode-only change (identical content), and renamed, deleted, new, and untracked files.

A mechanical change is still listed in `changed_tests` and still counts toward `undeclared_changes` unless `--allow-mechanical` is passed. Formatter identity (the repository's formatter applied to the old content gives the new content) is not checked: it would mean running the repository's formatter, which this script never does.

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

### `wb-records`

Posts and reads wb's verifier records as bd comments, so the record text never passes through a shell command line (Claude Code's Bash check refuses a multi-line quoted argument containing a line that starts with `#`, which rules out `bd comments add <id> '<text>'` for these records).

```bash
wb-records post <issue-id> --escaped '<text>'     # default: one line, \n newline, \t tab, \\ backslash
wb-records post <issue-id> <base64>               # alternative: strict RFC 4648 base64, with padding
wb-records manifest <issue-id> <record-name> <sha256> [<sha256>...]
wb-records read <issue-id> <record-name>
```

Record names: `verification report`, `defect ledger`, `test integrity`, `phase verification`.

- `post`: decodes the text (`--escaped`: only the three escapes, no real newlines in the argument; base64: the RFC 4648 alphabet, `=` padding only at the end, length a multiple of 4, at most 64 KiB encoded), removes trailing newlines, and refuses (exit 2) text containing a NUL byte (records are text only), text over 48 KiB, or text whose first line does not start with `<record-name>:` or `<record-name> (i/n):` (a `<record-name> manifest:` line is refused: only `manifest` posts manifests). It writes the text to a private (mode 700) temporary file, runs `bd comments add <issue-id> -f <file>` (the issue id must match `[A-Za-z0-9._-]+`), removes the file, reads the comments back with `bd comments <issue-id> --json`, and confirms the newest comment is exactly the posted text. Output: `{"posted": true|false, "sha256": "<hex of the posted text>", "bytes": n, "comment_id": "<id>"|null, "error": "<why>"|null}`; a bd failure or a read-back that does not match gives `posted: false`. No shell ever sees the text.
- `manifest`: the only way to post `<record-name> manifest: parts=<n> sha256=<h1>,<h2>,...`; it builds the line and posts it through the same path, so the line is never typed by hand (each sha256 must be 64 lowercase hex characters).
- `read`: read-only. Considers only the comments after the latest one starting `discarded:` and scans the record's manifests newest first. A manifest is valid only as a single line `<record-name> manifest: parts=<n> sha256=<h1>,...,<hn>` with `n` a positive integer and exactly `n` hashes of 64 lowercase hex characters. For each part it takes the latest `<record-name> (i/n):` comment before the manifest (an unnumbered `<record-name>:` counts when there is one part) and recomputes the part's sha256 over the exact comment text. It prints `{"status": ..., "parts": n, "text": "<the parts' texts joined in order by newlines>", "manifest_comment_id": ..., "part_comment_ids": [...], "newer_invalid": [...]}`:
  - `ok`: the newest manifest verifies; `ok_with_newer_invalid`: an older manifest is the newest that verifies, and `newer_invalid` lists the ids of the newer manifests that were invalid, incomplete, or mismatched (newest first; `[]` otherwise)
  - when no manifest verifies, the newest manifest's result: `incomplete` (a part is not there) or `mismatch` (a part's sha256 differs, or the manifest is invalid)
  - with no manifest: `missing` (nothing after the cutoff) or `incomplete` (parts only)
  - `error` (with an `error` field): bd failed or its JSON was malformed. The JSON is read by a character-level parser, so formatting and key order do not matter; only each top-level comment object's `id` and `text` are used, and a comment whose text holds an escaped NUL is skipped
- Trust model: wb-records gives integrity of the bytes and fixed selection rules, not authorship. Anything that can post bd comments as the user, including test code a task runs, can post a newer record or manifest; a record that reads `ok` is not proof of who wrote it.
- Temporary files go in a private directory under `$TMPDIR` when that directory is owned by the user and not group- or world-writable (or is sticky and owned by the user or root), else under `/tmp` by the same check; with neither, it exits 2.
- Requires bash 3.2, awk, bd, and `shasum`, `sha256sum`, or `openssl`; starts with `#!/bin/bash -p` and drops inherited `GIT_*`, `BASH_ENV`, `ENV`, and `CDPATH`, like `test-integrity`
- Tests: `tests/wb-records/run.sh` (a fake bd on PATH; the real beads database is never touched)

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
