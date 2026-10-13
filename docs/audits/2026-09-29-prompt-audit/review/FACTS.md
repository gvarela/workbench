# Verified current guidance (fetched from live docs 2026-09-29, Claude Code 2.1.285)

Use these as ground truth. For any other Claude Code claim you want to judge, WebFetch the official page (<https://code.claude.com/docs/en/skills.md>, /sub-agents.md, /hooks.md, /plugins-reference.md, /plugins/plugin-evals.md, /model-config.md) and quote it. Do not judge from memory.

## Skills

- `description` + `when_to_use` (underscore spelling is correct) are combined and truncated at 1,536 chars in the skill listing (configurable: skillListingMaxDescChars); total listing has a budget (skillListingBudgetFraction).
- `allowed-tools` = tools Claude can use WITHOUT ASKING during the turn that invokes the skill; it does NOT restrict. `disallowed-tools` removes tools while the skill is active.
- `model` in a skill switches the model for the rest of the current turn (session model resumes next prompt); with `context: fork` it sets the forked subagent's model.
- `effort` in a skill overrides session effort while active.
- Keep SKILL.md under 500 lines; move reference material into supporting files.
- Custom commands merged into skills; `.claude/commands/` still works.

## Subagents

- Plugin agents are scoped `plugin:name` (e.g. `wb:codebase-locator`); a bare name works if only one plugin provides it.
- Plugin subagents ignore `hooks`, `mcpServers`, `permissionMode` (security).
- Frontmatter includes tools, disallowedTools, model (incl. fable, inherit), effort, maxTurns, skills (preload), memory, background, isolation, color, initialPrompt.

## Hooks

- SessionStart matchers: startup, resume, clear, compact, fork. Plain stdout of SessionStart (and UserPromptSubmit, UserPromptExpansion, PostModelSwitch) is added to Claude's context; other events' stdout is not.
- PreCompact and PostCompact output never reaches the model (PreCompact can only block; PostCompact is observational). Post-compaction context must come from SessionStart with the `compact` source.
- additionalContext / systemMessage / plain stdout capped at 10,000 chars; overflow saved to a file with a 2,000-char preview.
- Hook types: command, http, mcp_tool, prompt, agent. `if`, `async`, `asyncRewake`, `statusMessage` fields exist.

## Plugins

- `claude plugin validate <dir>`; `claude plugin details <name>` (component inventory + always-on token cost); `claude plugin eval` (GA, v2.1.269+: evals/<case>/prompt.md + graders/*.md, with/without-plugin baseline arm, regex/tool_used/tool_order/file_exists/llm graders); `/skill-doctor` (per-skill usage/cost, never-invoked warnings).
- `--plugin-dir` serves the working tree; installed plugins are cached per version; `claude plugin update` pulls new versions.
- plugin.json `hooks` may be inline or hooks/hooks.json (merged).

## Models / prompting (Claude 5 family)

- Current: Claude Fable 5.1 (most capable), Claude Opus 5.5 (Claude Code default; API effort default `medium`; thinks more per level than Opus 5), Claude Sonnet 5.5 (effort levels RECALIBRATED: starting points `medium` for agentic coding and multistep tool use, `low` for chat/extraction/search; reserve `xhigh`/`max` for measured gains), Claude Haiku 4.5 (no `effort` support).
- Thinking is always on for Fable 5.1 / Opus 5.5; `effort` is the depth control. Prose telling the model how hard to think is dated ("think deeply", "think step by step"); Claude Code's own `ultrathink` keyword is configuration, not a scaffold.
- Say things at normal volume with the reason: CRITICAL/MUST/NEVER/ALWAYS caps, repeated restatements, and "be thorough / don't be lazy" boosters cause over-triggering and rigidity on current models. Emphasis is a tested fix for one underweighted instruction, not a register.
- Step-by-step choreography for judgment tasks over-constrains; keep exact scripts only for fragile operations (commands, formats, safety).
- Blanket "double-check / re-verify" instructions are unnecessary on current Opus models (they self-verify); keep verification that runs real commands/tests.
- Update suppressors ("don't narrate", "hold all findings") make current models too quiet; Fable 5.1 under-narrates and under-formats already.
- Read tool guidance: when you know which part of a file you need, read only that part (a blanket "always read files fully, no limit/offset" rule conflicts; it is still right for short plan documents that must be quoted accurately).
- Retired/older model names (Claude 3.x, Sonnet 4.x, Opus 4.x as "current") in instruction text are fossils.

## Repo facts (current branch)

- Every wb workflow skill is model-invocable since v2.6.0 (only implement_coordinated / implement_tasks aliases are user-only).
- product-behavior-analyzer agent was merged into codebase-analyzer on this branch (Audience input).
- docs/claude-code-skills-guide.md was deleted on this branch; Claude Code reference = live docs.
- Repo's own blind trial (2026-09-05): barrier wording volume does not hold a wait-for-all gate; the fix is a harness mechanism (in Claude Code: foreground Agent spawns block until the agent returns; background spawns notify on completion).
