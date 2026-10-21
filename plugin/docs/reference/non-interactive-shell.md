# Non-Interactive Shell Commands

Shared reference for agents that copy, move, remove, or restore files from a shell.

The plugin runs in shells and repositories its author does not control, and a user's shell may alias `cp`, `mv`, or `rm` to their interactive forms (`cp -i`). Claude Code's Bash tool loads those aliases, so a bare `cp` can stop at an `overwrite ...? (y/n)` prompt that nothing answers. The command then waits forever, the agent that ran it stays listed as running, and whatever it was about to clean up stays behind.

Use forms that cannot prompt:

- Write `command cp -f` and `command mv -f`: `command` skips aliases and functions, and `-f` skips the overwrite question.
- Prefer a git-native form where it fits: `git show <rev>:<path> > <file>` or `git restore` to bring a file back, `git archive` for an export, `git worktree add` for a disposable checkout.
- Keep git from opening a pager with `git --no-pager` (or `GIT_PAGER=cat`) and from opening an editor with `-m <message>` or `--no-edit` (or `GIT_EDITOR=true`), and pass `-f` to `rm` where deleting is the intent.

Register the removal of a temporary copy or worktree before the steps that use it, as the `trap` in task-verifier's and test-reviewer's planted-defect scripts does, so cleanup runs even when a step fails or the call is interrupted.

## End background shells before handing back

A shell you start with `run_in_background`, or that the Bash tool moves to the background on its own, keeps running after your report is written. Claude Code lists an agent as running for as long as one of its shells lives, so a finished agent can look stuck for hours, and a notification from the shell can wake the agent again after it has already reported. Before you hand back, end every background shell you started with the `TaskStop` tool, passing the task ID that Bash returned when the shell went to the background.

Avoid the forms that leave a shell behind:

- Do not use `tail -f`, a detached `&` loop, or a loop with no bounded exit (an `until ... sleep` loop must stop after a fixed number of tries).
- When a command may run long, pass a longer Bash tool `timeout` (for example `timeout: 300000`), because a command that passes the 120 second default is moved to the background instead of finishing. A full test suite can exceed it, so give it the longer timeout or run the targeted test files.
- macOS has no `timeout` command, so rely on the Bash tool's `timeout` parameter.
