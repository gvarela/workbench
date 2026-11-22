# Format on write

A repository can have Claude Code run its formatter on every file an agent writes, through a `PostToolUse` hook in the repository's own `.claude/settings.json`. wb does not ship this hook: a plugin that ran whatever command a repository file names would be trusted once for every repository. wb offers to add it to the repository, and the person decides.

## When to offer it

Offer it once, when you record or first read a `format:` command in the Checks section of `.claude/wb/profile.md`, the repository has no such hook yet, and the person is present. Never add it in unattended mode: changing `.claude/` settings is the person's.

Offer the formatter only. A formatter rewrites style and nothing else, so it is safe to run without anyone looking. A linter reports problems that need a decision, and it stays with the author and the coordinator.

## What to show

Show the exact entry, with the repository's format command in place, and say what it does: after each `Write` or `Edit`, by the session or any subagent, the formatter runs on that one file.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path') && [ -f \"$f\" ] && <format command> \"$f\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

- Use the format command exactly as the profile gives it. If it handles only some file types, narrow the entry with an `if` rule such as `"if": "Edit(*.rb)"`, one entry per type.
- The command needs `jq`. Where the repository cannot rely on it, point the entry at a small script in the repository that reads `.tool_input.file_path` from standard input.
- Say what it does not cover: a file changed by a shell command does not trigger it, and a formatter cannot fix what needs a decision. The lint checks before each verification still run.

## Adding it

On the person's yes:

1. Read `.claude/settings.json` if it exists. Add the entry to its `hooks.PostToolUse` list and keep everything else as it is. If an entry already runs a formatter on `Edit|Write`, change nothing and say so.
2. Show the resulting change before writing it.
3. Tell the person it takes effect in a new session, and that `/hooks` lists what is registered.

On a no, record nothing and do not ask again in this plan.
