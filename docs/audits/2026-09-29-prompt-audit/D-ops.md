# Audit: slice D-ops

Targets: validate_execution = Claude Sonnet 5.5 (pins `model: sonnet`, `effort: high`); every other skill, both reference docs, the hook orientation text and CLAUDE.md = Claude Opus 5.5.
Files read fully: validate_execution/{SKILL,templates,sub-agent-prompts}.md, validate_project/{SKILL,reference,templates}.md, update_status/{SKILL,reference,templates}.md, create_handoff/{SKILL,templates}.md, resume_handoff/{SKILL,reference,templates}.md, help, status-sync, doc-adherence, project-structure, review-prep SKILL.md, docs/reference/beads-mode.md, beads-not-initialized.md, hooks/wb-prime.sh, CLAUDE.md (root). settings*.json not read.
Group 4: not applicable (no request-building code). Sub-agent roster check: `subagent_type` values in validate_execution/sub-agent-prompts.md use unprefixed names (`codebase-analyzer`, `pattern-finder`); they match plugin/agents/*.md file names and the same convention is used in create_product_research, so no finding (see Low flag L3).

Provenance: `Mark each real synchronization point once` entered CLAUDE.md in 4dd28ca (2026-09-05, "Fable 5.1 re-baseline, phase 2"). The triple-marker barriers in validate_execution and create_handoff blame to cf86f75 (2026-07-31, v2.0.0 modernize), resume_handoff's to 2025-11-21 (pre-plugin), update_status's CRITICAL/NEVER blocks to 2025-10-08 and 2026-01-31. All predate the convention.

## Findings (ordered by confidence)

### F1 Triple-marker STOP! barriers contradict the repo convention

- Location: plugin/skills/validate_execution/SKILL.md:L55, L104; plugin/skills/create_handoff/SKILL.md:L50; plugin/skills/resume_handoff/SKILL.md:L50
- Evidence: "**⛔⛔⛔ BARRIER 1: STOP! Read ALL documentation FULLY - research.md, design.md, tasks.md ⛔⛔⛔**"; "**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL validation agents to complete ⛔⛔⛔**"; "**⛔⛔⛔ BARRIER 1: STOP! Read ALL project docs AND review conversation history ⛔⛔⛔**"; "**⛔⛔⛔ BARRIER 1: STOP! Read handoff document COMPLETELY - every section matters ⛔⛔⛔**"
- Pattern: Group 1a pressure language; Group 2 conflict with CLAUDE.md "Working with Commands" item 2 and "Command Structure Patterns"
- Why obsolete: CLAUDE.md (newer, 2026-09-05) says mark each sync point once, plain sentence with reason. The 2026-09-05 blind trial scored triple-⛔ STOP! at WAIT 0/3 vs single-⛔ with reason 1/3, so loudness buys nothing. Same file's BARRIER 3 (validate_execution L155) already uses the house form.
- Confidence: High
- Action: rewrite
- Replacement:
  - validate_execution L55: `**⛔ BARRIER 1**: full context read of research.md, design.md, and tasks.md — validation against partial context reports gaps that are really unread text`
  - validate_execution L104: `**⛔ BARRIER 2**: every validation agent has returned — the report synthesizes all four sets of findings, and a missing one hides a deviation`
  - create_handoff L50: `**⛔ BARRIER 1**: project docs read fully and conversation history reviewed — the handoff is the only carrier of what this session learned, and anything skipped here is lost when the session ends`
  - resume_handoff L50: `**⛔ BARRIER 1**: handoff read completely — a skipped section is a learning or blocker the resumed session will repeat`

### F2 help names a design status value that does not exist

- Location: plugin/skills/help/SKILL.md:L40
- Evidence: "whose status is not `complete` (research), `approved`/`implementing` (design), or whose phase milestone is open"
- Pattern: Group 2 contradiction / volatile specifics
- Why obsolete: update_status/SKILL.md:L102, validate_project/SKILL.md:L71 and reference.md:L46 define design status as `draft | ready | implementing | complete`; create_project's template writes `status: draft`. `approved` is prose (user approval), never a frontmatter value, so the next-stage rule cannot be evaluated from frontmatter.
- Confidence: High
- Action: rewrite
- Replacement: replace `` `approved`/`implementing` (design) `` with `` `ready`/`implementing` (design) ``

### F3 Plain `bd init` presented as the default fix; contradicts CLAUDE.md and beads-mode

- Location: plugin/skills/help/SKILL.md:L142-L146, L280-L284; plugin/skills/validate_project/reference.md:L75
- Evidence: "### Initialize (once per project)\n\n```bash\nbd init\n```"; "**\"beads not initialized\"**\n\n```bash\nbd init\n```"; "ERROR('Beads is not initialized. Run: bd init');"
- Pattern: Group 2 contradiction (skill vs CLAUDE.md and shared reference)
- Why obsolete: CLAUDE.md Beads Error Handling says `"beads not initialized" → bd init --stealth`; beads-mode.md:L7 says plain `bd init` is only for a repository the user owns outright; beads-not-initialized.md gives both forms with the condition. The newer 3.0.0 rule (blame 9b107a0, 2026-09) was not carried into help and validate_project/reference.md.
- Confidence: High
- Action: rewrite
- Replacement:
  - help L144-L146 code block: `bd init --stealth   # any repository with collaborators who do not use beads (see plugin/docs/reference/beads-mode.md)`
  - help L282-L284 code block: `bd init --stealth   # or plain bd init only for a repository you own outright`
  - reference.md L75: `ERROR('Beads is not initialized. Run: bd init --stealth (see beads-mode.md for when plain bd init applies)');`

### F4 resume_handoff reads a handoff field the template never writes

- Location: plugin/skills/resume_handoff/SKILL.md:L107
- Evidence: "Compare with handoff's `beads_in_progress`:"
- Pattern: Group 2 volatile specifics / two files disagreeing
- Why obsolete: create_handoff/templates.md frontmatter has `beads_epic` and `beads_active_phase` and a "Beads Tracking State" section; `beads_in_progress` exists nowhere in the slice.
- Confidence: High
- Action: rewrite
- Replacement: `Compare with the handoff's \`beads_active_phase\` and its "Beads Tracking State" section:`

### F5 Checkbox-as-status instructions contradict "beads is the only status tracker"

- Location: plugin/skills/update_status/reference.md:L52; plugin/skills/resume_handoff/SKILL.md:L254, L297-L299; plugin/skills/validate_execution/SKILL.md:L165
- Evidence: "- Start checking off tasks in tasks.md"; "3. **Update tasks.md** checkboxes as you complete work"; "- More tasks checked than handoff indicates?"; "1. Update tasks.md to reflect actual completion status"
- Pattern: Group 2 contradiction with CLAUDE.md ("Do NOT use ... markdown checkboxes for tracking"; progress fields "written only by /wb:update_status") and with update_status/SKILL.md:L132, L307 ("DO NOT check markdown checkboxes")
- Why obsolete: leftover markdown-tracking (v1.0.0 era) text. Repo says beads holds status and update_status is the sole writer of tasks.md progress fields. Note validate_execution L67/L134 (verifying claimed `[x]` items against code) is validation of a claim, not tracking, and stays.
- Confidence: High (reference.md:L52, resume L254, VE L165); Medium (resume L297-L299)
- Action: rewrite
- Replacement:
  - reference.md L52: `- Claim a task in beads (\`bd update [task-id] --claim\`) and begin work`
  - resume L254: `3. **Close beads tasks** as you complete them; \`/wb:update_status\` reconciles tasks.md`
  - resume L298-L299: `- More task issues closed in beads than the handoff indicates?\n   - Different phase than the handoff shows?` (keep the two bullets, swap the first)
  - VE L165: `1. Run \`/wb:update_status\` to reconcile tasks.md with beads (it is the sole writer of progress fields)`

### F6 update_status contradicts itself on closing phases from markdown

- Location: plugin/skills/update_status/SKILL.md:L219-L226 vs L125, L305-L307
- Evidence: "If markdown shows phases complete that beads shows open, sync them:" ... "bd close [phase-id] --reason \"Reconciliation: marked complete in tasks.md\"" vs "Tasks Analysis (beads is ONLY source of truth)" and "NEVER check markdown checkboxes"
- Pattern: Group 2 internal contradiction; touches a fragile bd operation (keep exact command)
- Why obsolete: the skill declares beads the only truth and forbids reading markdown checkboxes, then closes beads milestones on the strength of markdown. Which direction wins is a product decision (closing milestones is otherwise a human checkpoint in implement).
- Confidence: Medium
- Action: flag (decision for the user: either delete the "Reconcile Beads State" block, or restrict it to a user-confirmed close after the Step 5 confirmation, with the reason "milestone close is a human checkpoint")

### F7 update_status pressure language, caps triplication of one rule

- Location: plugin/skills/update_status/SKILL.md:L17-L24, L48, L96, L132, L305-L307, L341, L351-L353, L355-L359, L367-L371
- Evidence: "## CRITICAL: Status Update Philosophy" with bullets "**READ BEFORE WRITE**: Always read...", "**NO REGRESSION**: Never move status backward...", "**ATOMIC UPDATES**: ..."; "### Step 1: Read Current State (CRITICAL)"; "**IMPORTANT**: Use Read tool WITHOUT limit/offset parameters"; "- DO NOT check markdown checkboxes (documentation only, not tracking)" (L132), "**NEVER check markdown checkboxes** - they are documentation only..." (L307), "- DO NOT count markdown checkboxes" (L341); "- **NEVER modify files** without explicit user confirmation\n- **ALWAYS present the update plan**..."
- Pattern: Group 1a (CRITICAL/NEVER/ALWAYS density, no because); Group 1c repeated restatement (checkbox rule 3x, atomic-update rule 2x, backward-transition rule 2x); repo trial: caps vs plain identical 3/3
- Why obsolete: markers stop carrying information at this density; duplicated rules make the model reconcile wordings. The real constraints (confirm before writing, no silent regression, beads over checkboxes) survive in plain text.
- Confidence: Medium
- Action: rewrite
- Replacement:
  - L17-L24 block: `## Status Update Principles\n\nRead every documentation file fully before writing, and confirm the recorded state matches actual progress before proposing a transition. A status change can cascade across research.md, design.md, and tasks.md, so apply all affected updates together and leave the files describing the same project reality. Moving a status backward needs the user's explicit confirmation, because it usually signals a mistake in one of the documents.`
  - L48: `### Step 1: Read Current State`
  - L96: `Read each file in full (no limit/offset), because status depends on content a partial read can miss.`
  - L307: `Markdown checkboxes are documentation only and do not reflect actual status; read status from beads.`
  - L341: remove the line `- DO NOT count markdown checkboxes`
  - L349-L353 block: `### Read-Only Analysis\n\nPresent the update plan and wait for the user's confirmation before modifying files, and verify actual progress by reading file contents, not just frontmatter.`
  - L367-L371 and L355-L359: remove (now covered by the principles paragraph; keep "If any update fails, report the error and do not partial-update" as one line under the principles paragraph)
- Note: also bare barriers without reason at L50, L213, L230; canonical replacements: `**⛔ BARRIER 1**: all documentation read fully — a status proposed from partial content is wrong in the direction the unread text points`; `**⛔ BARRIER 2**: user confirmation received — every write here changes what other stages treat as current state`; `**⛔ BARRIER 3**: every write read back — a partial update leaves the files disagreeing about project state`

### F8 validate_execution body: CRITICAL + generic virtues

- Location: plugin/skills/validate_execution/SKILL.md:L100, L177-L183
- Evidence: "**CRITICAL: Sub-agents gather information and return findings. They do NOT write files. YOU (the main agent) will write the validation report after synthesizing their findings.**"; "2. **Be Thorough**: Check everything, assume nothing" (within "Be Objective / Be Thorough / Be Constructive / Be Precise / Be Practical")
- Pattern: Group 1a ("Be thorough" and CRITICAL, no because) ; Group 1c padding (generic virtues). Sonnet 5.5 is proactive by default and follows literally.
- Why obsolete: the boundary (sub-agents do not write, main agent authors the report) is real and also stated per-prompt in sub-agent-prompts.md ("DO NOT write any files"); the caps add nothing. The virtues restate defaults except "assess what IS", "file:line", "what matters for deployment".
- Confidence: Medium
- Action: rewrite
- Replacement:
  - L100: `Sub-agents gather information and return findings without writing files; the main agent writes the validation report after synthesizing them, so the report has one author and one voice.`
  - L177-L183 section: `### Validation Philosophy\n\nAssess what IS, not what SHOULD BE. Cite file:line for every claim, pair each issue with a proposed fix, and weigh findings by what matters for deployment.`

### F9 validate_project guidelines: DO/DON'T lists restate the process

- Location: plugin/skills/validate_project/SKILL.md:L225-L244; BARRIER lines L119, L209
- Evidence: "- ❌ Make assumptions about what \"should\" be there"; "- ❌ Skip checks if some files are missing"; "- ❌ Validate against old workflow patterns (TaskCreate, checkboxes, etc.)"; "- ❌ Use limit/offset when reading files"; "**⛔ BARRIER 1: Read ALL files FULLY - no shortcuts**"
- Pattern: Group 1c prohibition run and bullet wall carrying behavior; Group 1d migration-relative ("old workflow patterns"); barrier without stated reason (convention)
- Why obsolete: six DON'Ts plus seven DOs re-say Steps 1-5. Only "do not fix without confirmation" is a real constraint. BARRIER 2 (L209) already follows the convention; BARRIER 1 lacks the reason.
- Confidence: Medium
- Action: rewrite
- Replacement:
  - L119: `**⛔ BARRIER 1**: all files read in full — validation against partial content reports false gaps`
  - L225-L244: `## Important Guidelines\n\nVerify claims against the files and beads instead of assuming what "should" be there: read every file in full, run \`bd show\` on every frontmatter ID, and keep checking the remaining files when one is missing. Report each problem with its severity, a specific location, and an actionable fix, then offer fixes; change nothing without the user's confirmation. Judge the project against the current workflow (beads for status, markdown for the plan).`

### F10 validate_project orphan check uses a narrower listing than its own SKILL

- Location: plugin/skills/validate_project/reference.md:L96
- Evidence: "const allBeadsIssues = exec('bd list').parseOutput();"
- Pattern: Group 2 two files disagreeing
- Why obsolete: SKILL.md:L173 lists issues with `bd list --all -n 0` ("including closed; unlimited"); a bare `bd list` omits closed issues and applies the default limit, so the orphan check can miss or mis-flag issues. beads-not-initialized.md:L46 also uses `bd list -n 0`.
- Confidence: Medium
- Action: rewrite
- Replacement: `const allBeadsIssues = exec('bd list --all -n 0').parseOutput();`

### F11 review-prep description triggers on the bare word "review"

- Location: plugin/skills/review-prep/SKILL.md:L3
- Evidence: "Use when user says \"review\", \"walk through changes\", \"explain this diff\", \"prep for PR\", or wants to understand what changed."
- Pattern: Group 2 trigger-case enumeration; Group 3 trigger precision
- Why obsolete: description is trigger text, so urgency is allowed, but the bare word "review" matches every "review this PR / review my changes / security review" request, which Claude Code's bundled /code-review and /security-review skills cover (findings-oriented, non-interactive). This skill is an interactive tmux+nvim pair-walkthrough that also needs a tmux session. Also a growing list of near-synonymous phrases rather than an intent category.
- Confidence: Medium
- Action: rewrite
- Replacement: `Interactive pair-programming walkthrough of a diff using tmux and nvim: opens each changed file in an nvim pane and takes questions as you go. Use when the user wants to be walked through what changed, to understand a diff by reading it together, or to prep a PR that way; not for an automated review that reports bugs or security findings.`

### F12 project-structure description has no trigger

- Location: plugin/skills/project-structure/SKILL.md:L3
- Evidence: "Enforces project documentation structure in docs/plans/ directories - research.md for facts, design.md for decisions, tasks.md for implementation, thoughts/ for explorations."
- Pattern: Group 2/3 trigger precision (under-described routing text; `user-invocable: false`, so the description is the only activation path)
- Why obsolete: names what the skill is, not when it applies, so the model has no cue to load it when it is about to write into research.md/design.md/tasks.md or decide where content belongs.
- Confidence: Medium
- Action: rewrite
- Replacement: `Use when writing or editing research.md, design.md, tasks.md, or a thoughts/ doc under docs/plans/, or when deciding which document a piece of content belongs in: research.md for facts, design.md for decisions and rationale, tasks.md for implementation steps, thoughts/ for explorations.`

### F13 history narrative with date and version in beads-mode.md

- Location: plugin/docs/reference/beads-mode.md:L15
- Evidence: "but a stale export just sits there (observed 2026-09-05 on bd 1.0.2: five weeks stale, 92 of 156 issues)."
- Pattern: Group 2 history narratives (dates, pinned versions, incident numbers)
- Why obsolete: the rule is "JSONL export is not a backup or sync"; the observation is the incident that motivated it and rots against later bd versions.
- Confidence: Medium
- Action: rewrite
- Replacement: `but a stale export just sits there.`

### F14 CLAUDE.md lists a directory that does not exist

- Location: CLAUDE.md:L19
- Evidence: "- `general/` - General-purpose prompts and templates"
- Pattern: Group 2 volatile specifics
- Why obsolete: no `general/` at the repo root; `git ls-tree` of 219dbc5 (the commit that introduced the line, 2026-04-17) shows none either, and no deletion of `general/*` is in history. README.md also mentions `general/` (outside slice; check it). `.claude/` (L20) does exist (settings files and worktrees/); no finding.
- Confidence: High
- Action: remove
- Replacement: delete the line

### F15 CLAUDE.md single-word CRITICAL and duplicated read rule (hand-written text)

- Location: CLAUDE.md:L63, L108, L112, L183
- Evidence: "**CRITICAL**: When the plugin is installed via marketplace (not `--plugin-dir`), the plugin system caches files at..."; "3. **File Reading Protocol**: ALWAYS read files FULLY (no limit/offset) before analysis" vs "6. Read files fully before processing"
- Pattern: Group 1a (one marker, but a reason follows immediately, so this is minor); Group 1c duplicate (agreeing copies: keep-list 8, not a finding by itself)
- Why obsolete: L63 carries its because, so only the register is high. Its rule is genuine.
- Confidence: Low
- Action: flag (optional plain rewrite: `When the plugin is installed via marketplace (not \`--plugin-dir\`), ...` dropping "**CRITICAL**:")

### F16 CLAUDE.md: tool-managed beads block, overlap and pressure language (report; do not hand-edit)

- Location: CLAUDE.md:L203-L227 (hand-written "Beads Issue Tracking") vs L229-L276 (`<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->` ... `END`: "Beads Issue Tracker", "Session Completion")
- Evidence: hand-written "### Quick Reference ... bd ready / bd show / bd update --claim / bd close" appears again verbatim in the block; block text: "you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds", "**MANDATORY WORKFLOW:**", "**CRITICAL RULES:**", "NEVER stop before pushing", "NEVER say \"ready to push when you are\" - YOU must push"
- Pattern: Group 2 overlapping/duplicated instruction sections; Group 1a pressure density (about 8 MUST/MANDATORY/NEVER/CRITICAL markers with no because)
- Provenance: `git blame` shows every line 229-276 from ca005a7 (2026-06-09, "bd init: initialize beads issue tracking"); the BEGIN/END markers with a version and content hash mark it as generated by `bd init`/`bd setup`, so a hand edit inside it will be reverted on the next refresh. The hand-written section (L203-L227) is later (2026-01 to 2026-09 commits) and reconciles with beads-mode.md.
- Contradictions checked: no direct contradiction between the two beads sections; they differ in emphasis. Session Protocol (L217-L223) points to Session Completion as the full protocol, and both say commit and push. Duplicated Quick Reference is agreeing redundancy (keep-list 8). Worth deciding: the generated block's "Work is NOT complete until git push succeeds / NEVER stop before pushing" is unconditional and sits against the harness rule that a session commits or pushes when the user asks; it is generated text, so change it at the source (bd's profile/config), not here.
- Confidence: Medium
- Action: flag (edit inside markers would be overwritten; if trimming is wanted, remove the duplicate hand-written Quick Reference at L207-L215 which the block repeats)

### F17 Repo-root path in shipped skill code comments will not resolve in an install

- Location: plugin/skills/update_status/SKILL.md:L60, L253; create_handoff/SKILL.md:L126; resume_handoff/SKILL.md:L99; help/SKILL.md:L155, L203; beads-mode.md:L24; CLAUDE.md L115, L222, L227 (repo docs, fine there)
- Evidence: "# Persist beads state (see plugin/docs/reference/beads-mode.md)"
- Pattern: Group 2 volatile specifics
- Why obsolete: CLAUDE.md says `plugin/` is the shipped runtime, so installers receive `docs/reference/beads-mode.md` at the plugin root; `plugin/docs/...` resolves only in this repository (the markdown links `../../docs/reference/beads-mode.md` beside them do resolve). Dev-repo path resolves, so not contradicted here; RELEASING.md may grep this exact string, check before changing.
- Confidence: Low
- Action: flag

### F18 Migration-relative or version-pinned phrasing in format text

- Location: validate_execution/SKILL.md:L92; validate_execution/templates.md:L26; help/SKILL.md:L43, L302
- Evidence: "\"no Intent section (plan predates 3.0.0)\""; "Use `v1.0.0` tag of this repo (before beads integration)."
- Pattern: Group 1d migration-relative phrasing / Group 2 history narrative
- Why obsolete: reads as a diff against an earlier plugin version; help L43 and the template row are literal output strings, so treat as format-pinning.
- Confidence: Low
- Action: flag (optional: "no Intent section (plan created before Intent sections existed)"; L302 could drop the tag reference)

### F19 Low flags

- L1 help/SKILL.md:L71-L74: the Command Workflow diagram shows `implement` then `implement_inline` then `validate_execution` as sequential steps; CLAUDE.md:L86-L87 and Command Details say implement_inline is an alternative. Medium-low, rewrite: replace the two boxes with `/wb:implement          → Execute with workers (one per task, verified, escalated)\n                          (or /wb:implement_inline: the same plan, coded inline by this session, TDD)`.
- L2 review-prep/SKILL.md:L110: "- Short responses - one or two lines max" (numeric cap, Group 1f); optional replacement `- Keep replies short enough to read at a glance next to the editor`. Low: terseness is the product of this skill.
- L3 validate_execution/sub-agent-prompts.md: `Task({...})` blocks and unprefixed `subagent_type` names; sibling skills use the same form, so consistent (no edit).
- L4 doc-adherence: "Iron Law" all-caps block, "Red Flags - STOP", rationalization table are persuasion scaffolding written for weaker instruction-following, but each rule has a stated reason ("Why Summaries Lie") and guards a demonstrated failure (compaction paraphrase): keep-list 5. Optional: reduce the Iron Law block to one plain sentence.
- L5 status-sync "## DO NOT" (4 items): first two are real constraints; low value to change.
- L6 wb-prime.sh header comment says SessionStart is "the one event whose plain-text stdout is model-visible"; UserPromptSubmit stdout is also added to context. Comment only, not model-visible; unverified.

## Clean / keep

- Clean: validate_execution/templates.md, validate_project/templates.md, update_status/templates.md, create_handoff/templates.md, resume_handoff/reference.md and templates.md (format-pinning), beads-not-initialized.md, wb-prime.sh orientation heredocs (stage chain matches help and CLAUDE.md; "never close a milestone without confirmation" is a real constraint; nothing pressured), status-sync (apart from L5), project-structure body (its NO-lists pin a document contract).
- Verified paths and names: hooks/beads-drift-check.sh, hooks/wb-prime.sh, docs/beads-guide.md, docs/commands-reference.md, RELEASING.md, .markdownlintrc, plugin/scripts/lint (--fix, --all defined), lint-hook (registered in plugin.json), review-prep/nvim-helper.sh (setup/open/focus/status defined), ../../docs/reference/*.md links, ../validate_project/SKILL.md "Validation Checklist" heading. Agent names in sub-agent-prompts.md match plugin/agents/*.md.
- Deliberately kept: BARRIER 3 in validate_execution and BARRIER 2 in validate_project (already canonical, with reasons); "Why a Handoff Instead of a Second /compact" in create_handoff (rationale, context only the author holds); the bd command blocks and persistence one-liner (fragile operations, keep-list 3); "Stop and wait for the user" in beads-not-initialized.md (real gating); "This stage needs from you" lines (CLAUDE.md requires them); the help State section (a judgment procedure that states outcomes).
- Out-of-slice note: README.md mentions `general/` (see F14).
