# Group M — adversarial review results

Docs fetched 2026-09-29 as raw markdown with `curl -sL https://code.claude.com/docs/en/<page>.md` (verbatim text, no summarizer). CLI: Claude Code 2.1.285 help output. Repo read-only; `.claude/settings*.json` not read.

## M1

- Verdict: CONFIRMED (for README.md:L111; CLAUDE.md:L15 is misleading rather than strictly false)
- Evidence:
  - <https://code.claude.com/docs/en/hooks.md> (Exit code 0): "For most events, Claude Code writes stdout to the debug log and doesn't show it in the transcript. The exceptions are `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, and `PostModelSwitch`, where Claude Code adds plain-text stdout as context that Claude can see and act on."
  - hooks.md, PreCompact section: "Exit with code 2 to block compaction. For a manual `/compact`, the stderr message is shown to the user. You can also block by returning JSON with `\"decision\": \"block\"`." and "Claude Code discards a PreCompact hook's `systemMessage` and `continue` fields."
  - hooks.md, PreCompact input: "PreCompact hooks receive `trigger` and `custom_instructions`. For `manual`, `custom_instructions` contains what the user passes into `/compact` ..." — it is an input field only; there is no output field that sets or appends compaction instructions.
  - hooks.md decision-control table: PreCompact is listed only under "Top-level `decision`" (`decision: "block"`, `reason`). `additionalContext` is listed for "SessionStart, SubagentStart, PostModelSwitch | Context only"; PreCompact has no `hookSpecificOutput.additionalContext`.
  - Changelog: only PreCompact entries are 2.1.x "Added PreCompact hook support: hooks can now block compaction by exiting with code 2 or returning `{\"decision\":\"block\"}`" and the original "Hooks: Added a PreCompact hook". Nothing adds summarizer input.
  - README.md:L111 (same on main): "**PreCompact** - `wb-prime.sh` again, so the recovery text is present when the summary is written" — wrong.
  - CLAUDE.md:L15: "`wb-prime.sh` (SessionStart on every trigger and PreCompact: orientation on a fresh start, recovery text on compact ...)" — accurately says the script is registered on PreCompact; it does not claim PreCompact output reaches the model, but a reader will infer that. The recovery text actually arrives via SessionStart `compact`.
  - plugin/hooks/wb-prime.sh:L4-6 already states the truth: "SessionStart is the one event whose plain-text stdout is model-visible; PreCompact's stdout is not" (slightly outdated: UserPromptSubmit, UserPromptExpansion, PostModelSwitch also qualify, so "the one event" is inaccurate).
- Source quality: public doc, quoted verbatim. Adversarial angles (additionalContext, custom instructions, stdout appended to instructions) all come back negative.
- Correction: README L111 should say the PreCompact registration has no model-visible effect (stdout goes to the debug log; the hook can only block) and the recovery text arrives via SessionStart source `compact`; or drop the PreCompact registration. CLAUDE.md L15 should drop "and PreCompact" or mark it inert. wb-prime.sh L5 "the one event" should read "one of the events".

## M2

- Verdict: CONFIRMED
- Evidence:
  - hooks.md SessionStart matcher table: "| `compact` | Auto or manual compaction |"; input: "`source` | How the session started: `\"startup\"` ... `\"compact\"` after compaction, or `\"fork\"`".
  - hooks.md: "| `\"*\"`, `\"\"`, or omitted | Match all | fires on every occurrence of the event |".
  - plugin/.claude-plugin/plugin.json: `"SessionStart": [ { "hooks": [ { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/wb-prime.sh", "timeout": 5 } ] } ]` — no matcher, so it fires for all sources including `compact`.
  - plugin/hooks/wb-prime.sh:L61 `if echo "$payload" | grep -qE '"compact"|PreCompact'; then` — matches `"source":"compact"`; prints the recovery text and exits 0 (L62-74); exits silently when no candidate plans (L62).
- Source quality: public doc + repo.
- Correction: none. Minor: the branch also fires on PreCompact payloads, where the output is discarded (see M1).

## M3

- Verdict: PARTIALLY CONFIRMED — the premise that foreground calls block is documented, but in the default interactive configuration Claude Code runs every spawned subagent in the background and Claude cannot choose the foreground, so "wait for all agents" is NOT a harness guarantee there.
- Evidence (<https://code.claude.com/docs/en/sub-agents.md>, "Run subagents in foreground or background"):
  - "**Foreground subagents** block the main conversation until complete."
  - "Where [fork mode] is on, as it is by default in an interactive session, Claude Code runs the subagent in the background, forks and non-fork subagents alike, and Claude can't ask for the foreground."
  - "Where fork mode is off, Claude runs the subagent in the background by default and in the foreground when it needs the result before continuing. Fork mode is off in non-interactive mode with `-p` and in the Agent SDK unless you turn it on."
  - "If you set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` to `1`, Claude Code runs the subagent in the foreground ..."
  - "A background subagent's results reach Claude as a completion notification in a later turn. Claude waits for that notification before reporting the subagent's results ..." — per-subagent, nothing about waiting for ALL of a set.
  - "Claude Code also removes the Agent tool's `run_in_background` parameter, so Claude can't ask for the foreground." (fork mode section)
  - Changelog 2.1.232 (Aug 13, 2026): "non-teammate agent spawns in interactive sessions now run in the background by default".
  - Docs do not state explicitly that several parallel foreground Agent calls in one message all block; "block the main conversation until complete" applies per subagent.
  - bd memory `wb-barrier-volume-not-discriminator`: "a partial-report gate needs a harness mechanism or explicit async-spawn semantics" — consistent with this reading: under background-by-default the gate is Claude's own discipline, not the harness.
- Source quality: the original claim was unquoted plus a bd memory; public doc now quoted. The doc contradicts the strong form of the claim.
- Correction: "In `-p`/SDK sessions (fork mode off) Claude may run a subagent in the foreground, and a foreground call blocks until it returns. In interactive sessions (fork mode on by default since 2.1.232) all spawned subagents run in the background; results come as completion notifications in later turns, and waiting for every one of them before synthesis is Claude's responsibility (prompt-level), unless the user sets `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`." Barrier wording therefore still matters in interactive use, and the barrier should say how to wait (for N completion notifications).

## M4

- Verdict: REFUTED as a general claim (it's specific to a local-directory marketplace that isn't the documented install path); CLAUDE.md:L79 is correct by default but incomplete.
- Evidence:
  - Changelog 2.1.101 (Apr 10, 2026): "Improved `/plugin` and `claude plugin update` to show a warning when the marketplace could not be refreshed, instead of silently reporting a stale version" — `claude plugin update` refreshes the marketplace itself.
  - Changelog 2.1.97 (Apr 8, 2026): "Fixed `claude plugin update` reporting \"already at the latest version\" for git-based marketplace plugins when the remote had newer commits".
  - <https://code.claude.com/docs/en/plugins/cli-reference.md> (Accept a displayed install command, which covers `plugin update`): "A change that the run's own marketplace refresh fetches also counts as such a change."
  - Same page, plugin update: "Update a plugin to the latest version its marketplace offers."
  - `claude plugin update --help`: `--accept-command` text "If either changed (a refresh that moved the catalog counts), the run refuses ..." — again implies a refresh during the run.
  - bd memory `wb-marketplace-source-is-modernize-checkout`: "The gvarela-workbench marketplace is registered from the local directory /Users/gabevarela/Development/Tools/workbench-modernize-2.0 (branch dev), not from GitHub ... otherwise the update reports the old version as latest" — the failure was a stale local checkout, not a missing `marketplace update` step for GitHub users.
  - <https://code.claude.com/docs/en/plugins/loading.md> (In-place and copied plugins): "**Relative-path plugins in a marketplace you added from a local directory**: the plugin loads in place from its path inside the marketplace folder. Your edits to the source directory take effect at the next session start or `/reload-plugins`, and you don't need to increase the version." and "A plugin loaded in place from a local-directory marketplace loads its current source files at every session start, whatever its version string says." For the maintainer's local-directory setup, what matters is updating that checkout, not `plugin update`. (This contradicts the memory's observation from 2026-09-07; one of them is stale.)
  - Auto-update (L79 angle), <https://code.claude.com/docs/en/discover-plugins.md>: "Plugins update automatically when the marketplace they came from has auto-update turned on." / "**Off by default**: every other marketplace, including the community marketplace, third-party marketplaces, and local development marketplaces." / "select **Enable auto-update** or **Disable auto-update**." So L79 "doesn't auto-pull" is true by default but can be turned on per marketplace.
  - `claude plugin marketplace update --help`: "Update marketplace(s) from their source - updates all if no name specified".
- Source quality: original source was a bd memory only; public changelog/docs contradict the generalization.
- Correction: CLAUDE.md releasing steps are adequate for GitHub-sourced installs on current Claude Code (`claude plugin update` refreshes the marketplace). Optional additions: `claude plugin marketplace update gvarela-workbench` as a harmless belt-and-braces step or fix when the update warns the marketplace couldn't be refreshed; note that auto-update can be enabled per marketplace in `/plugin` → Marketplaces; for the maintainer's local-directory marketplace, the source checkout must be moved to the release commit (and per docs, the plugin then loads in place without `plugin update`).

## M5

- Verdict: CONFIRMED (with a caveat: settings.local.json not read by me, per instructions)
- Evidence:
  - plugin/scripts/README.md:L45 "It's configured in .claude/settings.local.json"; L64 "configured via Claude Code hooks in `.claude/settings.local.json`"; L66 runs "`./plugin/scripts/lint-hook`"; L70 "To disable automatic linting, remove or comment out the `hooks` section in `.claude/settings.local.json`."
  - plugin/.claude-plugin/plugin.json has `"PostToolUse": [ { "matcher": "Write", ... "command": "${CLAUDE_PLUGIN_ROOT}/scripts/lint-hook" }, { "matcher": "Edit", ... } ]` — the hooks ship with the plugin (added in cf86f75, 2026-07-31) and apply to every install, not just this repo.
  - <https://code.claude.com/docs/en/plugins-reference.md>: "`hooks` takes a `.json` file path, an inline hooks object in the same shape as `hooks` in `settings.json`, or an array mixing both."
  - Disabling, <https://code.claude.com/docs/en/hooks.md>: "To temporarily disable all hooks without removing them, set `\"disableAllHooks\": true` in your settings file." and "There is no way to disable an individual hook while keeping it in the configuration." `claude plugin disable` disables the whole plugin.
- Source quality: plugin.json is primary; the "settings.local.json has `hooks: {}`" part came from a sweep agent and is unverified here.
- Correction: the README should say the hooks are declared in `plugin/.claude-plugin/plugin.json` (command `${CLAUDE_PLUGIN_ROOT}/scripts/lint-hook`), that they run for every wb install, and that the only off switches are `disableAllHooks` (turns off all hooks) or disabling the plugin; there is no per-hook toggle.

## M6

- Verdict: CONFIRMED (the omission); the turn-vs-call mechanism is plausible and consistent with the evidence, but the docs do not define an "agentic turn" precisely.
- Evidence:
  - plugin/agents/task-worker.md:L6 `maxTurns: 60`, present since cf86f75 (2026-07-31), before the 2026-08-19 finding and the 504129c fix (2026-08-21), whose task-worker still has `maxTurns: 60`.
  - docs/subagent-tool-call-ceiling.md: grep for maxTurns/"turn" finds no mention of maxTurns; the doc attributes the cut to a "tool-call budget" and rules out only context exhaustion.
  - <https://code.claude.com/docs/en/sub-agents.md> frontmatter table: "`maxTurns` | No | Maximum number of agentic turns before the subagent stops. When the subagent reaches the limit, Claude Code returns its output marked as partial, and Claude can resume it to continue. The partial marking requires Claude Code v2.1.246 or later".
  - Changelog 2.1.246 (Aug 25, 2026): "a subagent that stops at its `maxTurns` limit now returns its output marked as partial, with a hint to continue it via `SendMessage`, instead of appearing finished" — before that, a maxTurns stop looked like the "stops mid-sentence" symptom in the ceiling doc (observed Aug 19, before 2.1.246).
  - Ceiling doc: "Truncated transcripts end with `stop_reason: \"tool_use\"`" — consistent with a turn cap cutting the loop right after a tool-use response.
  - Ceiling doc: "agents reaching 68–70 | 5 of 129, all implementation workers"; median 27. The research agents (codebase-locator, pattern-finder `maxTurns: 25`; codebase-analyzer none) never approached 70, so the sample does not show a ~70 cap on agents without maxTurns; the "cap" is observed only on task-worker, the agent with `maxTurns: 60`. 69-70 tool_use blocks in 60 turns needs only ~10 turns with parallel calls.
  - Glossary "Turn" ("One complete response from Claude ... with any number of tool calls in between") is the user-level turn and is not what maxTurns counts; no doc says one maxTurns unit = one API response, so "turns ≠ tool calls" is inference, though strong.
- Source quality: maxTurns semantics are public and quoted; the turn=API-round-trip mapping is inference.
- Correction: the ceiling doc should name task-worker's `maxTurns: 60` as the most likely cause (turns counted per model response, several parallel tool calls per response, so ~60 turns ≈ 60-70+ calls), note that pre-2.1.246 maxTurns stops were unmarked, and note that the fix is raising maxTurns (or resuming via SendMessage), not only splitting tasks.

## M7

- Verdict: CONFIRMED
- Evidence:
  - <https://code.claude.com/docs/en/skills.md> table: "`allowed-tools` | No | Tools Claude can use without asking permission during the turn that invokes this skill. The grant clears when you send your next message."
  - skills.md, Pre-approve tools for a skill: "It does not restrict which tools are available: every tool remains callable, and your permission settings still govern tools that are not listed."
  - `git show main:docs/claude-code-skills-guide.md`: L81 "allowed-tools: Read, Grep, Bash        # Optional. Tool allowlist while skill is active."; L97 "**`allowed-tools` / `disallowed-tools`**: space/comma-separated or YAML list. Claude Code only."; L301 "Use `allowed-tools` (skills) / `tools` (agents) for least privilege in anything shared." — all treat it as a restriction.
  - Additional error in the old guide: "**`description`**: max 1024 chars", while skills.md says the combined description + when_to_use "is truncated at 1,536 characters in the skill listing".
- Source quality: public doc.
- Correction: none; the deletion rationale holds. (For restriction, the doc points to `disallowed-tools`, which removes tools "while this skill is active" and "clears when you send your next message".)

## M8

- Verdict: PARTIALLY CONFIRMED
- Evidence:
  - sub-agents.md: "For security reasons, plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields. These fields are ignored when loading agents from a plugin."
  - <https://code.claude.com/docs/en/plugins/components.md>: "**Ignored fields**: `permissionMode`, `hooks`, `mcpServers`, and `initialPrompt`." — the list is four fields, not three.
  - Bare-name resolution is documented only for `--agent`: sub-agents.md "For a plugin-provided subagent, you can pass only the agent name and Claude Code finds it: `claude --agent security-reviewer`" / "If multiple plugins provide agents with the same name, pass the scoped name to disambiguate".
  - No doc text says Agent-tool `subagent_type` resolves bare plugin names. Nearest: changelog 2.1.140 "Improved Agent tool `subagent_type` matching to accept case- and separator-insensitive values (e.g. `\"Code Reviewer\"` resolves to `code-reviewer`)".
  - Repo: all skill spawns use scoped names (`subagent_type: "wb:codebase-analyzer"`, `"wb:pattern-finder"`, etc. in plugin/skills/*/sub-agent-prompts.md), and no plugin/agents file uses the ignored fields, so the point has no current impact.
- Source quality: public docs.
- Correction: "Plugin agents ignore `hooks`, `mcpServers`, `permissionMode`, and `initialPrompt`. A bare plugin agent name resolves with `claude --agent` when only one plugin provides it; the docs don't say the same for the Agent tool's `subagent_type`, so keep the scoped `wb:` names there."

## M9

- Verdict: CONFIRMED (with nuances)
- Evidence (skills.md):
  - "`model` | No | Model to use when this skill is active. The override applies for the rest of the current turn and isn't saved to settings. The session model resumes when you send your next prompt. ... With `context: fork`, the value sets the forked subagent's model instead". Also ignored if excluded by `availableModels` or unsupported in auto mode.
  - "<Tip>Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files.</Tip>"
  - "the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing to reduce context usage." And: "each entry's combined text is capped at 1,536 characters regardless of budget. The cap is configurable with `skillListingMaxDescChars`."
- Source quality: public doc.
- Correction: add that the 1,536 cap is configurable (`skillListingMaxDescChars`) and that `model` under `context: fork` sets the subagent model instead; the 500-line figure is a tip, not a limit.

## M10

- Verdict: REFUTED as a claim about Claude Code's documented behavior (it rests only on Claude's own system prompt); a tension with the harness's system prompt may exist, but the public docs point the other way.
- Evidence:
  - <https://code.claude.com/docs/en/permission-modes.md>, auto mode "Allowed by default": "Pushing to any branch of the repository you're working in, including the default branch. A non-default branch whose name marks it as a deploy or publication target, such as `production` or `gh-pages`, isn't covered ..."
  - permission-modes.md: "Pushing to any branch of the repository you're working in and creating a pull request that matches your request run without a prompt, unless the push or pull request falls under the blocked list ... To require a human checkpoint before these commands while staying in auto mode, add `permissions.ask` rules".
  - permission-modes.md: "In the classifier requests sent by Claude Code itself, the classifier sees user messages, tool calls ..., and your CLAUDE.md content."
  - <https://code.claude.com/docs/en/auto-mode-config.md>: "The classifier reads the same CLAUDE.md content Claude itself loads, so an instruction like \"never force push\" in your project's CLAUDE.md steers both Claude and the classifier at the same time."
  - permission-modes.md: "If you tell Claude \"don't push\" ... the classifier blocks matching actions even when the default rules would allow them." — user-stated boundaries restrict; the docs say nothing that makes pushing require confirmation by default in auto mode. In default (manual) mode, a `git push` Bash call goes through the normal permission prompt, which is the human checkpoint; that is a permission-system property, not a conflict with CLAUDE.md.
  - No public "Out-of-Place Publication" category was found in permission-modes.md or auto-mode-config.md (grep for "Out-of-Place" / "Publication" hits only the deploy-branch sentences above). The in-session auto-mode denial is unverifiable from docs; it may have hit a blocked-list rule (e.g. a deploy/publication-named branch, a remote other than the session's, or content rules) rather than "pushing" as such.
- Source quality: the original source was Claude's own system prompt ("confirm before outward-facing actions") plus an unquoted in-session denial — non-public. Public docs point the other way: pushes to the working repo are default-allowed in auto mode, and CLAUDE.md steers the classifier.
- Correction: "The block's 'YOU must push' is consistent with Claude Code's documented auto-mode defaults (pushes to the working repository are allowed, and CLAUDE.md is read by the classifier), and the user's CLAUDE.md is explicit standing authorization. Any residual tension is with Claude's own system-prompt caution, not with documented Claude Code behavior; if a checkpoint is wanted, the documented tool is a `permissions.ask` rule for `Bash(git push *)`." A narrower valid point remains: a generated block that orders an unconditional push is questionable for a worktree/feature-branch session and for repos where the user wants review before pushing. That is a workflow-design critique, not a documented conflict.
