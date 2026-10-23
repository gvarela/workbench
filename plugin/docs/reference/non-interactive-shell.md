# Non-Interactive Shell Commands

Shared reference for agents that copy, move, remove, or restore files from a shell.

The plugin runs in shells and repositories its author does not control, and a user's shell may alias `cp`, `mv`, or `rm` to their interactive forms (`cp -i`). Claude Code's Bash tool loads those aliases, so a bare `cp` can stop at an `overwrite ...? (y/n)` prompt that nothing answers. The command then waits forever, the agent that ran it stays listed as running, and whatever it was about to clean up stays behind.

Use forms that cannot prompt:

- Write `command cp -f` and `command mv -f`: `command` skips aliases and functions, and `-f` skips the overwrite question.
- Prefer a git-native form where it fits: `git show <rev>:<path> > <file>` or `git restore` to bring a file back, `git archive` for an export, `git worktree add` for a disposable checkout.
- Keep git from opening a pager with `git --no-pager` (or `GIT_PAGER=cat`) and from opening an editor with `-m <message>` or `--no-edit` (or `GIT_EDITOR=true`), and pass `-f` to `rm` where deleting is the intent.

## One plain command per Bash call

Permission rules in the user's settings approve or deny each Bash call by its text, and they cannot see inside a compound command, so a for loop, a `cd <dir> && ...` chain, or a command built from shell variables (`$tmp`, `$(mktemp -d)`) is often denied even where each part alone would be allowed. A denied call does not stop you; it silently skips the check it was for. So run one plain command per Bash call: no loops, no `cd … &&`, no shell variables, and write every path out in full. Where you need a value from one command in the next, such as the repository root from `git rev-parse --show-toplevel`, read it from the first call's output and type it into the second. A single pipe or output redirect between two plain commands is fine.

When a call you need is still denied, do not work around it with another form: record the check under Not Run with the denied command and the reason, so the person sees what went unchecked.

## A disposable worktree in plain commands

Planted defects and other changes that must not touch the user's working tree go in a disposable worktree at a fixed path you name yourself, `/tmp/wb-defect-<id>` (the task or phase id, so two agents do not collide). Each step is its own Bash call:

```bash
git rev-parse --show-toplevel                                  # the repository root; type it into later calls
git --no-pager worktree add --quiet --detach /tmp/wb-defect-<id> HEAD
sed -i.bak '<one substitution>' /tmp/wb-defect-<id>/<file>      # the break
git --no-pager -C /tmp/wb-defect-<id> diff --stat              # shows the break applied
git --no-pager -C /tmp/wb-defect-<id> checkout -- .            # after the run: undo the break
git --no-pager -C /tmp/wb-defect-<id> clean -fdq               # and drop the .bak file
git --no-pager worktree remove --force /tmp/wb-defect-<id>     # always, even after a failed step
```

- **The break**: one `sed -i.bak` command on the file under `/tmp/wb-defect-<id>/`. The `.bak` suffix attached to `-i` works on both BSD (macOS) and GNU sed, where a bare `-i` does not. After the run, `checkout -- .` restores the file and `clean -fdq` removes the `.bak` file (ignored files such as copied dependencies stay), so the next break's `diff --stat` shows only that break.
- **Uncommitted changes**, when the check needs them (task-verifier): `git --no-pager diff HEAD --binary > /tmp/wb-defect-<id>.patch` from the repository, then `git -C /tmp/wb-defect-<id> apply /tmp/wb-defect-<id>.patch`; for each untracked file `git ls-files --others --exclude-standard` lists, one `command cp -f <root>/<file> /tmp/wb-defect-<id>/<file>` per file.
- **Running the test there**: use the test runner's own directory or path option where it has one (`npm --prefix /tmp/wb-defect-<id> test`, `go -C /tmp/wb-defect-<id> test ./...`). For Python, `python3 -m pytest -o pythonpath=/tmp/wb-defect-<id> --rootdir=/tmp/wb-defect-<id> /tmp/wb-defect-<id>/<test file>`: run from the repository, a plain `pytest` puts the current directory first on `sys.path`, so the worktree's test can import the user's unbroken code and a planted defect looks as if it survived. A runner with none needs the worktree as its working directory, and `cd /tmp/wb-defect-<id> && <test command> <test file>` is then the one compound form to try; if it is denied, the check goes under Not Run.
- **Prove the copy is under test**: before you trust a defect that survived, plant one deliberate break that must fail (in the function the test calls directly, such as making it raise or return a wrong constant) and run the same command. If that passes too, the run is not testing the worktree's code; fix the command, or list the check under Not Run.
- **Permission rules it needs**: Claude Code treats `sed -i` as a file edit, so the break needs an Edit rule for the worktree path even though the agent has no Edit tool; without one the break is denied and the check goes under Not Run. To let planted defects run, allow `Bash(git worktree:*)`, `Edit(//tmp/wb-defect-*/**)`, and on macOS also `Edit(//private/tmp/wb-defect-*/**)`, since `/tmp` resolves there.
- **Cleanup**: nothing removes the worktree for you, since no `trap` spans separate calls. Run the `worktree remove` call (and `rm -f /tmp/wb-defect-<id>.patch` when you made one) before you hand back, whether the checks passed, failed, or stopped early, and confirm with `git --no-pager worktree list`.

## End background shells before handing back

A shell you start with `run_in_background`, or that the Bash tool moves to the background on its own, keeps running after your report is written. Claude Code lists an agent as running for as long as one of its shells lives, so a finished agent can look stuck for hours, and a notification from the shell can wake the agent again after it has already reported. Before you hand back, end every background shell you started with the `TaskStop` tool, passing the task ID that Bash returned when the shell went to the background.

Avoid the forms that leave a shell behind:

- Do not use `tail -f`, a detached `&` loop, or a loop with no bounded exit (an `until ... sleep` loop must stop after a fixed number of tries).
- When a command may run long, pass a longer Bash tool `timeout` (for example `timeout: 300000`), because a command that passes the 120 second default is moved to the background instead of finishing. A full test suite can exceed it, so give it the longer timeout or run the targeted test files.
- macOS has no `timeout` command, so rely on the Bash tool's `timeout` parameter.
