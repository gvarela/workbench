# Audit slice B-design

Scope: plugin/skills/{create_design,explore_design,create_tasks,create_mockup,mockup-iteration}/ (15 files, all read fully).
Targets: Claude Opus 5.5 for all (no `model:` pins); explore_design and create_tasks also audited against Claude Fable 5.1 ("Recommended on Fable").
Volatile-specifics check: every repo path named resolves (plugin/docs/reference/beads-mode.md and beads-not-initialized.md exist; `../../docs/reference/` relative links from create_tasks resolve to plugin/docs/reference/). Agent names used (`codebase-analyzer`, `pattern-finder`) match plugin/agents/*.md. Group 4: not applicable (no request-building code); roster check: no redundant agents in this slice.
Provenance: CLAUDE.md convention "Mark each real synchronization point once ... state the reason in a plain sentence" was added in commit 4dd28ca (2026-09-05). The triple-marker lines below are older (create_design:69 blame 3a0b97b0 / 2025-11-21; explore_design:121, create_tasks:73, create_mockup:51 blame cf86f75a / 2026-07-31), so the convention is newer than the text.

## Findings (ordered by confidence)

### F1 Triple-marker STOP! barriers contradict the repo convention

- Location: plugin/skills/create_design/SKILL.md:L69, L125; plugin/skills/explore_design/SKILL.md:L121; plugin/skills/create_tasks/SKILL.md:L73, L115, L144; plugin/skills/create_mockup/SKILL.md:L51
- Evidence: "**⛔⛔⛔ BARRIER 1: STOP! Read research.md and existing design.md FULLY - NO SKIMMING ⛔⛔⛔**" (and the six siblings)
- Pattern: Group 2 conflict with CLAUDE.md "Command Structure Patterns" + Group 1a pressure language
- Why obsolete: CLAUDE.md (newer, 2026-09-05) says mark each sync point once with a plain-sentence reason; the 2026-09-05 blind trial scored triple-⛔ STOP! at WAIT 0/3 vs single-⛔ with reason 1/3, so the volume buys nothing. Marker stays; loud form and caps go.
- Confidence: High
- Action: rewrite
- Replacement (one per line; old text exact):
  - create_design:L69 old `**⛔⛔⛔ BARRIER 1: STOP! Read research.md and existing design.md FULLY - NO SKIMMING ⛔⛔⛔**` -> `⛔ BARRIER 1: research.md, design.md, and README.md are read in full — design decisions made on a partial read contradict facts research already established`
  - create_design:L125 old `**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL agents to complete - NO EXCEPTIONS ⛔⛔⛔**` -> `⛔ BARRIER 2: every spawned agent has returned — a design synthesized on a partial set misses what the missing report would have changed`
  - explore_design:L121 old `**⛔⛔⛔ BARRIER 1: STOP! Read ALL context FULLY before framing anything ⛔⛔⛔**` -> `⛔ BARRIER 1: all context below is read in full — framing the decision space on partial context mis-frames the fork`
  - create_tasks:L73 old `**⛔⛔⛔ BARRIER 1: STOP! Read ALL documents FULLY - research.md, design.md, tasks.md ⛔⛔⛔**` -> `⛔ BARRIER 1: research.md, design.md, and tasks.md are read in full — task specs written on partial context become placeholders nobody can execute`
  - create_tasks:L115 old `**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL agents - dependency, test, pattern agents ⛔⛔⛔**` -> `⛔ BARRIER 2: the dependency, test, and pattern agents have all returned — a plan built on a partial set misses what the missing report would have changed`
  - create_tasks:L144 old `**⛔⛔⛔ BARRIER 3: STOP! Verify NO placeholder values - ALL tasks MUST be specific and executable ⛔⛔⛔**` -> `⛔ BARRIER 3: no placeholder values remain — a placeholder that ships becomes a task nobody can execute`
  - create_mockup:L51 old `**⛔⛔⛔ BARRIER 1: STOP! Research current UI patterns before proposing anything ⛔⛔⛔**` -> `⛔ BARRIER 1: current UI patterns are researched before anything is proposed — a mockup drafted without them invents components the app does not have`

### F2 Caps "CRITICAL / DO NOT / NO / ONLY" scope blocks and restated HOW-vs-WHAT rules

- Location: plugin/skills/create_design/SKILL.md:L17-L25, L110-L113, L121, L288-L308; plugin/skills/create_tasks/SKILL.md:L12-L18, L111, L150, L198; plugin/skills/explore_design/SKILL.md:L39-L50; plugin/skills/mockup-iteration/SKILL.md:L154
- Evidence: "## CRITICAL: This Document is About WHAT and WHY - NEVER HOW" / "- **DO NOT** include implementation sequences..." (5 DO NOTs + 2 ONLYs); "**REMEMBER: If it describes HOW to do something, it DOES NOT belong in design**"; "## CRITICAL: This Document is About HOW - It Must NOT Contain" (5 NO bullets); "## CRITICAL: This Stage Produces POSSIBILITIES, Not Commitments"; "**CRITICAL**: Never lose design decisions."
- Pattern: Group 1a (pressure language, several CRITICAL/NEVER with little "because") + 1c (prohibition run of 3+; repetition as reinforcement: create_design states the WHAT/HOW boundary at L10, L17-25, L110-113, L268-271, L288-308)
- Why obsolete: Opus 5.5/Fable 5.1 follow the boundary literally without shouting; the caps-vs-plain trial was identical 3/3. The scope rules themselves are real constraints and stay, stated once as positive intent with the reason (the reporting-channel trial says keep the surface-to-user behavior, so create_tasks' "STOP and surface it" is preserved).
- Confidence: Medium
- Action: rewrite
- Replacement:
  - create_design:L17-L25 old block -> replace with:
    `## Scope: WHAT and WHY, not HOW`
    ``
    `design.md records architectural decisions and the reasoning behind them: what to build, why, what is in and out of scope, success criteria, risks. Implementation sequences, code changes, file-modification lists, and task or phase breakdowns belong in tasks.md, which is written later from this document. Keeping them out means the design stays changeable: if the approach turns out wrong, it can be replaced without redoing execution planning.`
  - create_design:L110-L113 old `**Decide WHAT to build, not HOW to build it**\n\nSynthesize the research into design constraints and opportunities.\nRemember: You are deciding WHAT and WHY, not HOW.` -> `Synthesize the research into design constraints and opportunities.`
  - create_design:L121 old `**CRITICAL: Sub-agents are READ-ONLY. They gather information and return findings. They do NOT write files. YOU (the main agent) will write design.md after synthesizing their findings.**` -> `Sub-agents are read-only: they gather information and return findings, and you write design.md after synthesizing them.`
  - create_design:L308 old `**REMEMBER: If it describes HOW to do something, it DOES NOT belong in design**` -> remove (the ✅/❌ lists above it carry the boundary).
  - create_tasks:L12-L18 old block -> replace with:
    `## Scope: HOW only`
    ``
    `Every task derives from design.md. If something seems missing, surface it to the user rather than adding it; if a design decision looks wrong, halt and send it back to /wb:create_design rather than planning around it. Extra hardening, edge cases, or improvements the design does not call for are new scope. Reference research.md by file:line instead of restating it. Every task is specific and executable (checked at BARRIER 3).`
  - create_tasks:L103 old `Remember: Now you're planning HOW to build what was designed.` -> remove; L100 `**Decide HOW to bridge from current state to target state**` keep.
  - create_tasks:L111 old `**CRITICAL: Sub-agents are READ-ONLY. They gather information and return findings. They do NOT write files. YOU (the main agent) will write tasks.md after synthesizing their findings.**` -> `Sub-agents are read-only: they gather information and return findings, and you write tasks.md after synthesizing them.`
  - create_tasks:L150 old `**Critical**: Beads is the source of truth for status. Every task checkbox in tasks.md gets a corresponding beads issue.` -> `Beads is the source of truth for status. Every task in tasks.md gets a corresponding beads issue.`
  - create_tasks:L198 old `**CRITICAL**: Create a beads issue for EVERY task checkbox in the execution plan.` -> `Create a beads issue for every task in the execution plan; a task without an issue is invisible to \`bd ready\` and to workers.`
  - explore_design:L39-L48 old heading `## CRITICAL: This Stage Produces POSSIBILITIES, Not Commitments` -> `## This stage produces possibilities, not commitments`; L41 `These rules hold for the ENTIRE session, every step:` -> `These hold for the whole session:`; L43 `**Directions are possibilities with trade-offs, NEVER decisions**` -> `**Directions are possibilities with trade-offs, not decisions**`; L44 `**NO implementation detail**` -> `**No implementation detail**`; L45 `**NO task breakdowns or phase plans**` -> `**No task breakdowns or phase plans**`; L46 `**NO writing or seeding design.md**` -> `**No writing or seeding design.md**`; L47 `**NO chosen answer unless the user chose it**` -> `**No chosen answer unless the user chose it**`; L48 `**Convergence happens ONLY on an explicit user signal** at the Step 5 CHECKPOINT — never infer approval` -> `**Convergence happens only on an explicit user signal** at the Step 5 CHECKPOINT — do not infer approval`. (Substance kept: this is the stage's core constraint and a tested behavior.)
  - mockup-iteration:L154 old `**CRITICAL**: Never lose design decisions. Every piece of feedback must be:` -> `Design decisions are the product of this skill and later feed design.md, so every piece of feedback is:`

### F3 create_tasks summary contradicts its own dependency principle and the beads-only status rule

- Location: plugin/skills/create_tasks/SKILL.md:L303; plugin/skills/create_tasks/templates.md:L208-L213
- Evidence: "- Task dependencies set up (setup → impl → test → integration)" vs L229 "The resulting graph should branch, not chain" and L240 "a near-linear chain over 4+ tasks is a signal you encoded authoring order". templates.md: "## 📝 Completed Tasks Archive\n\nMove completed tasks here weekly to keep active list focused.\n\n### Week of [YYYY-MM-DD]\n- [x] Task description (completed YYYY-MM-DD HH:MM)" vs the same template's "Task status is tracked ONLY in beads" and CLAUDE.md "do NOT use markdown checkboxes for tracking".
- Pattern: Group 2 (contradiction within slice / with CLAUDE.md)
- Why obsolete: The presented summary primes exactly the chained graph the skill forbids; the archive section invites checkbox status tracking in tasks.md, which `/wb:update_status` and beads own (nothing else in plugin/ references the archive).
- Confidence: Medium
- Action: rewrite (SKILL.md:L303), remove (templates.md archive block)
- Replacement:
  - SKILL.md:L303 old `- Task dependencies set up (setup → impl → test → integration)` -> `- Task dependencies set from consumed outputs (branching where tasks are independent)`
  - templates.md:L208-L215 remove the block `## 📝 Completed Tasks Archive` through the following `---` (lines 208-215, including "Move completed tasks here weekly..." and the `- [x]` sample).

### F4 Migration-relative and history-narrative text

- Location: plugin/skills/create_design/SKILL.md:L173; plugin/skills/explore_design/templates.md:L108; plugin/skills/create_tasks/SKILL.md:L405
- Evidence: "**If no decision record exists**, proceed below — unchanged:"; "(this happened in production)"; "(observed near ~70 calls — measured evidence, not a guaranteed constant)"
- Pattern: Group 1d migration-relative phrasing; Group 2 history narratives
- Why obsolete: "unchanged" is a diff against an earlier version of the skill the model never saw; the production anecdote is archaeology (the behavior rule stands on the stated mechanism, "--notes replaces wholesale"). The ~70-call figure is a soft observation, fine as guidance but the provenance clause is narrative (kept below as Low).
- Confidence: Medium (L173, L108), Low (L405)
- Action: rewrite
- Replacement:
  - create_design:L173 old `**If no decision record exists**, proceed below — unchanged:` -> `**If no decision record exists**, generate options as follows:`
  - explore_design/templates.md:L108 old `Writing notes without carrying the existing text forward silently destroys prior amendments (this happened in production). If` -> `Writing notes without carrying the existing text forward silently destroys prior amendments. If`
  - create_tasks:L405 (Low, optional) old `Subagents hard-stop when they exhaust their tool-call budget (observed near ~70 calls — measured evidence, not a guaranteed constant), and truncation` -> `Subagents hard-stop when they exhaust their tool-call budget (roughly 70 calls in practice), and truncation`

### F5 create_tasks names Fable/effort in prose but sets no `effort:` frontmatter

- Location: plugin/skills/create_tasks/SKILL.md:L1-L6, L28
- Evidence: "**Recommended: Fable at high effort. Minimum comfortable: Opus.**" (frontmatter has no `effort:`; explore_design has `effort: high`)
- Pattern: Group 1b (effort is the documented depth control; prose is not)
- Why obsolete: On Opus 5.5/Fable 5.1 effort frontmatter is the control; recommending "high effort" in prose does nothing. CLAUDE.md also says Fable spawns use effort high.
- Confidence: Medium
- Action: add
- Replacement: add frontmatter line `effort: high` after `allowed-tools: Read` in create_tasks/SKILL.md (same as explore_design). Leave the self-check prose (it is a deliberate user-facing model check, kept).

### F6 mockup-iteration: two overlapping prohibition lists plus triple emoji rule

- Location: plugin/skills/mockup-iteration/SKILL.md:L175-L182, L371-L380 (also L173, L165)
- Evidence: "### Anti-patterns to Avoid\n\n- Do not assume feedback without recording ..." (6 items) and "## DO NOT\n\n- Do not create mockup versions without reading current mockup.md AND mockup.html first ..." (8 items); emoji rule at L165 "(NOT emojis)", L173 "Never default to emojis", L182, L379.
- Pattern: Group 1c prohibition runs / scattered duplication (each item already stated as a positive step: read base files L110-111, update log L82/L125, screenshot L121-124, confirm ambiguity L26-54)
- Why obsolete: The same rule appears up to 3 times in different wording, so the model reconciles wordings; the positive steps already carry them. Provenance-bearing ones (don't overwrite prior version; keep REMOVE decisions because they inform design) are kept in one list.
- Confidence: Medium
- Action: rewrite
- Replacement: delete the whole "## DO NOT" section (L371-L380). Rewrite L175-L182 to:
  `### Boundaries`
  ``
  `- Each iteration is a new version directory; earlier versions stay untouched so any version can be reverted to.`
  `- REMOVE decisions are kept in the log, because they become the design's Out of Scope.`
  `- Record feedback as the user's own words, not a paraphrase, and update mockup-log.md before creating the version.`
  `- Ask when feedback is ambiguous, including whether it is about the mockup at all.`
  `- Use the app's icon system or text only in mockup.html; emojis and placeholder CSS classes make the preview mislead about the real UI.`
  Then drop L173 `4. **Never default to emojis** in mockup.html` (covered above).

### F7 create_mockup: "Important Guidelines" restates earlier gates in caps

- Location: plugin/skills/create_mockup/SKILL.md:L252-L268
- Evidence: "- ALWAYS research existing UI before proposing"; "- Never overwrite - always create new version"; "**Critical requirements:**" at L135
- Pattern: Group 1a/1c (caps ALWAYS/Never duplicating BARRIER 1 and the versioning step)
- Why obsolete: BARRIER 1 already gates research; caps add nothing (trial: identical 3/3).
- Confidence: Medium
- Action: rewrite
- Replacement:
  - L254 old `- ALWAYS research existing UI before proposing` -> `- Research existing UI before proposing (BARRIER 1)`
  - L266 old `- Never overwrite - always create new version` -> `- Each iteration is a new version; earlier versions stay intact`
  - L135 old `**Critical requirements:**` -> `**Requirements for the HTML mockup:**`

### F8 Model-tier trait claims and pinned model names in self-checks

- Location: plugin/skills/explore_design/SKILL.md:L22-L37; plugin/skills/create_tasks/SKILL.md:L26-L41
- Evidence: "Results on lighter models may converge too quickly or miss trade-offs."; "On lighter models, task bodies tend to be less specific and dependency graphs tend to chain instead of branch."; "**Recommended: Fable. Minimum comfortable: Opus.**"
- Pattern: Group 1d/Group 2 (pinned model names, trait claims about models)
- Why obsolete: Pinned tier advice ages with each release; the self-check is a deliberate user-facing feature (asks the user, non-blocking) so it is kept, only the unverifiable trait predictions are candidates.
- Confidence: Low
- Action: flag (no edit proposed; the description text "Recommended on Fable" also drives this audit's targets and the CLAUDE.md model policy)

### F9 Unprefixed slash-command references

- Location: plugin/skills/create_design/SKILL.md:L33, L261; plugin/skills/create_tasks/SKILL.md:L49, L319
- Evidence: "run `/create_tasks` to build the implementation plan"; "Run `/implement` to begin coordinated implementation"; "`/create_design docs/plans/...`"
- Pattern: Group 2 volatile specifics (the shipped names are `/wb:create_tasks` and `/wb:implement`; sibling skills and CLAUDE.md use the `wb:` prefix, e.g. explore_design, create_mockup)
- Why obsolete: Inconsistent with the rest of the slice; the unprefixed form may resolve only when no other plugin defines the same name.
- Confidence: Low
- Action: rewrite (optional)
- Replacement: L261 `/create_tasks` -> `/wb:create_tasks`; create_tasks:L319 `/implement` -> `/wb:implement` and `/implement_inline` -> `/wb:implement_inline`; L33 and L49 examples `/create_design` -> `/wb:create_design`, `/create_tasks` -> `/wb:create_tasks`.

### F10 Minor: numbered list restart and stale "1." in create_mockup Step 7

- Location: plugin/skills/create_mockup/SKILL.md:L191
- Evidence: "1. **If similar feature found in research**:" after the code block that ends item 3 (renders as a restarted list, reads as a fourth step)
- Pattern: none documented (formatting bug)
- Confidence: Low
- Action: rewrite `1. **If similar feature found in research**:` -> `4. **If similar feature found in research**:`

## Clean / keep

- create_design/templates.md, create_design/sub-agent-prompts.md, create_tasks/sub-agent-prompts.md, create_tasks/examples.md, create_mockup/sub-agent-prompts.md, create_mockup/templates.md, mockup-iteration/templates.md, mockup-iteration/examples.md: clean (format-pinning templates, verbatim agent prompts, fragile bd command examples). The templates' `- [ ]` checkboxes for Prerequisites / Success Criteria are verification checklists, not status tracking, and stay (apart from F3's archive block).
- Kept deliberately: bd command blocks and the `--notes` replaces-wholesale warning in create_design:L102 (fragile operation, has its reason); the "Decide:" title-prefix grep rules (exact contract with consumers); the explore_design Step 5 CHECKPOINT and "explicit approval" requirement (real human gate with stated reason); create_tasks dependency principles and the tool-call budget table (contract/judgment context only the author knows); "This stage needs from you" lines (repo convention); the Model Self-Check blocks (deliberate, non-blocking user prompt; see F8 flag); the `plan predates 3.0.0` string, which is a shared fixed marker also used by create_research, validate_execution, and help (consistent, not a conflict); sub-agent "DO NOT write any files" lines in prompts (working redundancy with the SKILL.md statement, keep-list 8).
- Group 4: not applicable.
