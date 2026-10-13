# Sweep 1: docs/commands-reference.md, README.md, RELEASING.md, plugin/scripts/README.md

## S1-1 README claims PreCompact hook delivers recovery text to the model

- Location: README.md:L111
- Evidence: "**PreCompact** - `wb-prime.sh` again, so the recovery text is present when the summary is written"
- Current guidance / fact: FACTS.md Hooks: "PreCompact and PostCompact output never reaches the model... Post-compaction context must come from SessionStart with the `compact` source." The repo's own plugin/hooks/wb-prime.sh:L5 header says "PreCompact's stdout is not [model-visible]". Recovery works via SessionStart(compact), which L110 already states.
- Confidence: High
- Suggested fix: Reword L111 to say the PreCompact registration is a no-op for context (or drop the bullet) and that recovery text arrives via SessionStart on the compact source; consider removing the PreCompact entry from plugin.json.

## S1-2 commands-reference documents a `/research` command that does not exist

- Location: docs/commands-reference.md:L118-L131
- Evidence: "### `/research` - Quick Codebase Research (Conversational)... /research > How does our authentication middleware work?"
- Current guidance / fact: No plugin/skills/research directory exists; skills list is create_*/ explore_design / implement* / validate_* / handoff / update_status / help etc.
- Confidence: High
- Suggested fix: Delete the section or point to the ad-hoc alternative (ask the question directly, or /wb:create_research).

## S1-3 commands-reference uses markdown-checkbox task tracking, contradicting current tasks.md/beads contract

- Location: docs/commands-reference.md:L352-L366, L411, L643-L648
- Evidence: "- [ ] Setup tasks (directories, dependencies, config)"; "Update task checkboxes as you complete work"; "- [x] Review existing middleware (completed ...) / - [>] Implement auth check function"
- Current guidance / fact: plugin/skills/create_tasks/SKILL.md:L309,L317 "no markdown checkboxes... Never use markdown checkboxes for status - beads is source of truth"; implement_inline/SKILL.md:L287 "Update checkboxes in tasks.md" is a forbidden action. (Stale repo fact about the tasks.md shape, not bd semantics.)
- Confidence: High
- Suggested fix: Replace the checkbox samples with the current Tasks format (beads-tracked, no status boxes) and drop "Update task checkboxes" from /implement's rules.

## S1-3b commands-reference references non-existent `plan.md`

- Location: docs/commands-reference.md:L700, L823
- Evidence: "**plan.md**: `draft` → `ready` → `implementing` → `complete`"; "Re-read plan.md FULLY, extract every mentioned task"
- Current guidance / fact: The workflow's documents are research.md, design.md, tasks.md (CLAUDE.md, create_project skeleton, L98-105 of the same file). L700 conflicts with L505-509 which gives design.md the same progression.
- Confidence: High
- Suggested fix: Change both to design.md / tasks.md as appropriate.

## S1-4 commands-reference version footer stale

- Location: docs/commands-reference.md:L883-L891
- Evidence: "Current Version: 2.0.0" with 2.0.0 feature bullets
- Current guidance / fact: plugin/.claude-plugin/plugin.json version is 3.0.0; tags v2.2.0, v3.0.0 exist.
- Confidence: High
- Suggested fix: Remove the version footer (duplicates CHANGELOG and goes stale) or point to CHANGELOG.md.

## S1-5 scripts README says hooks are configured in .claude/settings.local.json

- Location: plugin/scripts/README.md:L39-L46, L62-L70
- Evidence: "It's configured in .claude/settings.local.json"; "The project has automatic markdown linting configured via Claude Code hooks in `.claude/settings.local.json`... To disable automatic linting, remove or comment out the `hooks` section in `.claude/settings.local.json`."
- Current guidance / fact: .claude/settings.local.json has `"hooks": {}`; the PostToolUse Write/Edit lint hooks are declared in plugin/.claude-plugin/plugin.json (inline hooks, valid per FACTS.md Plugins) and ship to installers. Disabling means removing them from plugin.json or disabling the plugin. Also this file ships under plugin/, so it describes the maintainer's local config to installers.
- Confidence: High
- Suggested fix: Say the hooks come from plugin.json (`${CLAUDE_PLUGIN_ROOT}/scripts/lint-hook`); rewrite the disable instruction accordingly.

## S1-6 lint-hook fallback message points to nonexistent ./scripts/lint (and settings.local.json allowlists ./scripts/lint)

- Location: plugin/scripts/README.md (context L11-L26 uses ./plugin/scripts/lint); plugin/scripts/lint-hook echo "Run './scripts/lint --fix ...'" (outside the four target files; noted because the README documents this script)
- Evidence: "Run './scripts/lint --fix $FILE_PATH' for details"
- Current guidance / fact: Script lives at plugin/scripts/lint; no ./scripts/ dir at repo root.
- Confidence: Medium
- Suggested fix: Have lint-hook print "$SCRIPT_DIR/lint" (out of the four files' scope; log for the owner of lint-hook).

## S1-7 README skills list mislabels and omits skills; "auto-activated" framing

- Location: README.md:L61, L97-L106
- Evidence: "**Skills** (auto-activated): `project-structure`, `mockup-iteration`, `tdd-discipline`, `verification-before-completion`, `status-sync`, `review-prep`" / "### Skills (auto-activated) Background capabilities that Claude automatically invokes"
- Current guidance / fact: Repo frontmatter: only doc-adherence, project-structure, status-sync, tdd-discipline, verification-before-completion have `user-invocable: false`. mockup-iteration and review-prep have no such flag (review-prep is a user-invocable /wb:review-prep with a "walk me through this diff" trigger; mockup-iteration is user-invocable too). doc-adherence (background) is missing from both lists. Skill descriptions are trigger text; nothing "automatically" invokes them - the model elects them (README L63 itself says so).
- Confidence: Medium
- Suggested fix: Split into "background skills" (the five user-invocable:false ones incl. doc-adherence) and "invocable skills also model-triggered" (mockup-iteration, review-prep); soften "automatically invokes".

## S1-8 README command and agent inventories incomplete

- Location: README.md:L69-L96
- Evidence: Commands list omits create_product_research, research-validation, review-prep; agents list: "codebase-locator, codebase-analyzer, pattern-finder, task-verifier"
- Current guidance / fact: plugin/agents has 6 agents: codebase-analyzer, codebase-locator, pattern-finder, research-validator, task-verifier, task-worker. Skills dir has create_product_research and research-validation. (product-behavior-analyzer correctly absent.)
- Confidence: Medium
- Suggested fix: Add task-worker and research-validator to Agents; add create_product_research (and note research-validation) to Commands.

## S1-9 commands-reference command names unprefixed / workflow diagram omits inline variant

- Location: docs/commands-reference.md:L24, L33, all `### /create_*` headings and usage blocks
- Evidence: "/create_project → /create_research → /create_mockup → /explore_design → ... → /implement → /validate_execution"
- Current guidance / fact: Plugin skills are namespaced: invoked as /wb:create_project (README L51-58, CLAUDE.md chain). A bare name only works if unambiguous. The diagram also lists /create_mockup as a mandatory chain step though the file calls it optional (L40) and CLAUDE.md's chain omits it; /implement_inline appears only at L393. Descriptions are model-invocable trigger text, so the "slash commands" framing (L3 "Claude Code slash commands") understates that the model can also invoke them.
- Confidence: Medium
- Suggested fix: Use /wb: prefix in the diagram and usage blocks (or add one note that names are shown unprefixed); add "(or /implement_inline)" to the chain; reword L3 to "skills you can invoke as /wb:* or ask for in prose".

## S1-10 Dated prompting advice presented as design rules (blanket read-fully, caps, barrier volume)

- Location: docs/commands-reference.md:L13, L19, L146-L150, L407, L497, L531-L551, L753, L823, L842-L850
- Evidence: "**Complete Context**: Always read files FULLY before analysis"; "**ALWAYS**: 1. Read mentioned files FULLY (no limit/offset) ... 4. NEVER use partial reads"; "**ZERO SCOPE CREEP**"; "Reads ALL files FULLY"; "Explicit synchronization prevents: ... Racing ahead"
- Current guidance / fact: FACTS.md: "when you know which part of a file you need, read only that part (a blanket 'always read files fully' rule conflicts; it is still right for short plan documents that must be quoted accurately)"; caps ALWAYS/NEVER cause over-triggering; repo's own 2026-09-05 blind trial: "barrier wording volume does not hold a wait-for-all gate; the fix is a harness mechanism" (foreground Agent spawns block; background notify on completion). The "Why Barriers" section (L842-850) and "BARRIER 2: wait for ALL" attribute gating to wording.
- Confidence: Medium
- Suggested fix: Scope the read-fully rule to plan documents and quoted sources; drop the caps/NEVER register; in the barriers explanation note that the wait-for-all gate is enforced by foreground spawns / completion notifications, with the barrier text stating the reason.

## S1-11 "Every research agent receives" verbatim caps-style directive presented as current

- Location: docs/commands-reference.md:L160, L553-L561
- Evidence: "All agents are told: 'Document what IS, not what SHOULD BE'" / "DO NOT suggest improvements or identify issues."
- Current guidance / fact: FACTS.md prompting: say things at normal volume with the reason. Agent prompts are now in plugin/agents/*.md and skills' sub-agent-prompts.md; this snippet may no longer match them (agents are plugin-scoped `wb:codebase-analyzer` etc.).
- Confidence: Low
- Suggested fix: Verify against plugin/agents and reference the real files instead of a paraphrased quote; drop the DO NOT line or add its reason.

## S1-12 scripts README: "think deeply" directives rationale for markdownlint MD036

- Location: plugin/scripts/README.md:L59
- Evidence: "Emphasis as heading allowed (for \"think deeply\" directives)"
- Current guidance / fact: FACTS.md: prose telling the model how hard to think ("think deeply") is dated; CLAUDE.md working rule 3: "do not instruct the model how hard to think". Repo grep shows no such directives are the reason for MD036 in current prompts (unverified).
- Confidence: Medium
- Suggested fix: Rephrase to "Emphasis as heading allowed (MD036)" without the think-deeply justification.

## S1-13 README "markdown-only tracking" / 1.x pointers and commands-reference note

- Location: docs/commands-reference.md:L80
- Evidence: "**Note**: For markdown-only tracking, use the `v1.0.0` tag."
- Current guidance / fact: README.md:L21 and RELEASING.md:L40 say the final pre-2.0 release is v1.1.0 on the `1.x` branch; v1.0.0 tag exists but is not the maintained line.
- Confidence: Low
- Suggested fix: Point to the `1.x` branch (v1.1.0) or delete the note.

## S1-14 Minor: RELEASING verified-fact date / eval-harness future tense

- Location: RELEASING.md:L12, L30
- Evidence: "(verified 2026-06-11)"; "As the eval harness lands, this becomes: Tier 0 on every PR, Tier 2 golden runs before any bump, Tier 3 before anything behavior-shaping."
- Current guidance / fact: FACTS.md Plugins: `claude plugin validate <dir>`, `claude plugin details`, and `claude plugin eval` (GA since v2.1.269, evals/<case>/prompt.md + graders) now exist; `/skill-doctor` reports per-skill usage. The pre-bump verification does not mention `claude plugin validate`, and the "harness lands" wording predates the built-in eval command. The two cache/--plugin-dir facts themselves are consistent with FACTS.md.
- Confidence: Low
- Suggested fix: Add `claude plugin validate plugin/` to the verification step and reference `claude plugin eval` (or state which tiers map to it) instead of "as the harness lands".

Clean: RELEASING.md (apart from S1-14, only Low). All other named paths verified: plugin/docs/reference/beads-mode.md, plugin/skills/help/SKILL.md, plugin/.claude-plugin/plugin.json, .claude-plugin/marketplace.json, docs/beads-guide.md, docs/workbench-workflow-guide.md exist. No references to product-behavior-analyzer, claude-code-skills-guide.md, .claude/hooks/, or a commands/ directory (only historical 1.x notes, correct) in the four files. Cache path, --plugin-dir, plugin update mechanics, disable-model-invocation-based deprecated aliases (RELEASING L30) match FACTS.md and the repo.
