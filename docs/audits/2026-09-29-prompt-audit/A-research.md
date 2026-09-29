# Audit slice A-research

Scope: plugin/skills/create_project/, create_research/, create_product_research/, research-validation/SKILL.md, plugin/agents/{codebase-analyzer,codebase-locator,pattern-finder,product-behavior-analyzer,research-validator}.md, plugin/docs/reference/documentarian-philosophy.md. All read fully.
Targets: skills without `model:` -> Claude Opus 5.5; research-validation (`model: sonnet`) -> Sonnet 5.5; agents: codebase-analyzer, product-behavior-analyzer (sonnet, effort medium), research-validator (sonnet, effort high) -> Sonnet 5.5; codebase-locator, pattern-finder (haiku) -> Haiku 4.5.
Group 4: not applicable except roster check (see F12).
Provenance: convention commit 4dd28ca (2026-09-05) added "Mark each real synchronization point once" to CLAUDE.md; the triple-marker lines blame to 3a0b97b0 (2025-11-21) in create_research and 8ae85f1f/6dee16eb (2026-04-28) in create_product_research, so the barrier text predates the convention.

Paths checked: `../../docs/reference/documentarian-philosophy.md` (from create_research and create_product_research) resolves to plugin/docs/reference/documentarian-philosophy.md (exists). templates.md / sub-agent-prompts.md siblings exist. Skill names referenced (`update_status`, `explore_design`, `create_design`, `create_tasks`, `implement`, `implement_inline`) exist.

## Findings

### F1 Triple-marker STOP! barriers contradict repo convention (create_research)

- Location: plugin/skills/create_research/SKILL.md:L62, L139, L160
- Evidence: "**⛔⛔⛔ BARRIER 1: STOP! Do NOT proceed to Step 2 until ALL mentioned files are FULLY read ⛔⛔⛔**" / "**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL sub-agents to complete - DO NOT proceed until EVERY agent returns ⛔⛔⛔**" / "**⛔⛔⛔ BARRIER 3: STOP! Verify NO placeholder values - ALL data MUST be from ACTUAL codebase ⛔⛔⛔**"
- Pattern: Group 2 conflict with CLAUDE.md "Working with Commands" + Group 1a pressure language
- Why obsolete: CLAUDE.md says mark each sync point once with a plain-sentence reason; the 2026-09-05 blind trial scored triple-marker STOP! at WAIT 0/3 vs single marker with reason 1/3, so the volume buys nothing. Lines blame to 2025-11-21, older than the convention (4dd28ca, 2026-09-05).
- Confidence: High
- Action: rewrite
- Replacement:
  - L62: `⛔ BARRIER 1: every mentioned file is fully read — decomposing the question on partial context sends the agents after the wrong areas`
  - L139: `⛔ BARRIER 2: every spawned agent has returned — synthesis on a partial set misses what the missing report would have changed`
  - L160: `⛔ BARRIER 3: no placeholder values — a placeholder that ships reads as a finding nobody verified`

### F2 Triple-marker STOP! barriers contradict repo convention (create_product_research)

- Location: plugin/skills/create_product_research/SKILL.md:L79, L167, L211, L229
- Evidence: "**⛔⛔⛔ BARRIER 1: STOP! Do NOT proceed to Step 2 until ALL mentioned files are FULLY read ⛔⛔⛔**" / "**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL sub-agents to complete — DO NOT proceed until EVERY agent returns ⛔⛔⛔**" / "**⛔⛔⛔ BARRIER 3: STOP! Verify NO placeholder values — ALL data MUST be from ACTUAL codebase ⛔⛔⛔**" / "**⛔⛔⛔ BARRIER 4: STOP! Wait for validation agent to complete before proceeding ⛔⛔⛔**"
- Pattern: Group 2 conflict with CLAUDE.md + Group 1a
- Why obsolete: Same as F1 (blame 2026-04-28, older than convention).
- Confidence: High
- Action: rewrite
- Replacement:
  - L79: `⛔ BARRIER 1: every mentioned file is fully read — decomposing the question on partial context sends the agents after the wrong areas`
  - L167: `⛔ BARRIER 2: every spawned agent has returned — synthesis on a partial set misses what the missing report would have changed`
  - L211: `⛔ BARRIER 3: no placeholder values — a placeholder that ships reads as a finding nobody verified`
  - L229: `⛔ BARRIER 4: the validation agent has returned — the frontmatter status and any fixes depend on its verdict`

### F3 Sync points marked more than once (convention says once)

- Location: create_research/SKILL.md:L224-L228 and L246-L250; create_product_research/SKILL.md:L283-L289 and L322-L327; create_project/SKILL.md:L125 and L189-L194
- Evidence: "### Synchronization Points\n\n1. ⛔ **BARRIER 1**: After reading mentioned files - Do not proceed until ALL files are read ..." ; "### Critical Ordering\n\n- **ALWAYS** read mentioned files first ... **ALWAYS** wait for all sub-agents ..."; create_project: "Commands use explicit barriers:\n\n1. **⛔ BARRIER 1**: After creating all files\n2. **Final Confirmation**: Present complete structure"
- Pattern: Group 2 conflict with CLAUDE.md ("Mark each real synchronization point once") + Group 1c repetition
- Why obsolete: Each barrier is stated inline at its step, again in Critical Ordering, again in a Synchronization Points list (plus a third time as "IMPORTANT: Wait for ALL sub-agent tasks" at create_research L145, product L173). Repeats give the model three wordings to reconcile and violate the once-only rule.
- Confidence: High (convention conflict)
- Action: remove
- Replacement: delete the `### Synchronization Points` sections in all three skills; delete the `### Critical Ordering` sections in create_research (L224-L228) and create_product_research (L283-L289); delete `**IMPORTANT**: Wait for ALL sub-agent tasks to complete before proceeding` (create_research L145, create_product_research L173). create_project L125: rewrite to `⛔ BARRIER 1: all four files exist with frontmatter — the summary and next steps report them as created`.

### F4 Pressure language: CRITICAL / IMPORTANT / MUST / ALWAYS / NEVER / "NO EXCEPTIONS" cluster in skill bodies

- Location: create_research/SKILL.md:L17, L55, L58-L59, L99, L129-L137, L226-L228, L232-L234; create_product_research/SKILL.md:L17, L72, L75-L76, L121, L156-L165, L285-L289, L293-L296
- Evidence: "### Step 1: Read Any Directly Mentioned Files First (CRITICAL)" / "- **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files" / "- **CRITICAL**: Read these files yourself in the main context before spawning any sub-tasks" / "**CRITICAL: Sub-agents are READ-ONLY. ..." / "**CRITICAL Agent Instructions (MUST follow exactly):**" with nine bold caps bullets incl. "Document what IS, not what SHOULD BE - NO EXCEPTIONS", "**Use specific agent types for their strengths**", "**Run multiple agents in parallel for speed**"
- Pattern: Group 1a (density of caps markers, several with no "because")
- Why obsolete: Opus 5.5 follows plain instructions closely; when nine bullets are all "MUST/ALWAYS" the markers carry no priority. Trial 2026-09-05: CAPS/NEVER vs plain "Do not" identical 3/3. The `## CRITICAL: YOUR ONLY JOB...` header itself is the load-bearing discipline and is kept (see Keep notes); the finding is the surrounding decoration.
- Confidence: Medium
- Action: rewrite
- Replacement (create_research; apply the same text to the product skill at L72-L77 and L156-L165):
  - L55-L59 -> `### Step 1: Read Directly Mentioned Files First` then `- Read any files the user mentions (docs, JSON, configs) in full, with no limit/offset, in the main context before spawning sub-tasks, so the decomposition rests on full context.`
  - L99 -> `Sub-agents are read-only: they return findings and do not write files. You write research.md after synthesizing their findings.`
  - L129-L137 -> `**Agent instructions**: each agent is a documentarian, not a critic; it describes what exists without judgment, because unrequested critique is the failure this stage exists to prevent. Typed wb agents carry that constraint in their own prompts; put it explicitly in every ad-hoc general-purpose agent prompt. Use the specialized agent types for their strengths and run agents in parallel.` (product skill L156-L165: same, plus `Every claim carries a file:line reference.`)
  - L226-L228 and L232-L234: covered by F3 deletion (Critical Ordering) / F5 (Documentation Philosophy).

### F5 Repeated "REMEMBER: Document what IS" restatements

- Location: create_research/SKILL.md:L28-L29, L75, L78, L133, L137, L143, L148, L167, L232-L234; create_product_research/SKILL.md:L25-L26, L90, L99, L160, L171, L176, L218-L219, L293-L296; create_research/sub-agent-prompts.md:L40-L46; create_product_research/sub-agent-prompts.md:L42-L49, L72
- Evidence: "2. **REMEMBER: Document what IS, not what SHOULD BE**" (Steps 3 and 5), "- **Remember one final time: Document what IS, not what SHOULD BE**", "### Documentation Philosophy ... **CRITICAL**: You and all sub-agents are documentarians ... **REMEMBER** ... **NO RECOMMENDATIONS**", and in the Task prompts "CRITICAL INSTRUCTIONS: ... You are documenting the codebase as it exists / DO NOT suggest improvements or identify issues / Document what IS, not what SHOULD BE / Just describe HOW IT CURRENTLY WORKS"
- Pattern: Group 1c padding/repetition + Group 1a
- Why obsolete: The philosophy doc justifies restating at spawn and write steps ("the failure mode strikes late"), which is reasonable for one restatement at each step. Here the rule appears 8-10 times per skill, including a third copy in the verbatim agent prompts that duplicate what the typed agents already carry in their system prompts. Current models retain a once-stated constraint; scattered copies inflate the register. Keep: top block, one at spawn (F4 replacement), one at write (BARRIER 3 step).
- Confidence: Medium
- Action: remove / rewrite
- Replacement:
  - Delete list items "**REMEMBER: Document what IS, not what SHOULD BE**" (create_research L78 and L148; product L99 and L176) and renumber; delete create_research L167 and product L218-L219 `- **Remember one final time: Document what IS, not what SHOULD BE**` (product L218 duplicate too); delete the `### Documentation Philosophy` section (create_research L230-L238 / product L291-L300) except its unique bullets, which fold into one sentence: `Research documents are self-contained, cite file paths and line numbers, and describe how components connect.`
  - Agent prompts, create_research/sub-agent-prompts.md L40-L46 -> `Constraints:\n  - Document what exists, with file:line references; no suggestions or issues.\n  - DO NOT write any files. Return your findings as a report.`
  - product sub-agent-prompts.md L42-L49 -> `Constraints:\n  - Explain PRODUCT BEHAVIORS for a product manager, not code implementation.\n  - Document what exists; no suggestions or issues.\n  - Include file:line references for every behavioral claim, traced from actual code.\n  - DO NOT write any files. Return your findings as a report.`
  - product sub-agent-prompts.md L72 -> delete `REMEMBER: Document what IS, not what SHOULD BE. No recommendations.` (the typed agent carries it).

### F6 Templates' Next Steps slot asks for recommendations in a stage that forbids them

- Location: create_research/templates.md:L132-L138; create_product_research/templates.md:L130-L136
- Evidence: "1. [Suggested next action based on findings]\n2. [Another logical next step]" ; skill: "**DO NOT add recommendations or improvements unless explicitly requested**" and "This is a factual judgment about what the research documented — not a recommendation of any approach, which research never makes."
- Pattern: Group 2 contradiction (template vs skill body, same slice)
- Why obsolete: The template pins a recommendation slot while SKILL.md says research never recommends; the model reconciles by inventing a recommendation or violating the barrier. Format-pinning is kept, only the slot semantics change.
- Confidence: Medium
- Action: rewrite
- Replacement: `1. [Area the findings did not cover that design will need answered, stated as a question about what exists]\n2. [Another uncovered area, or omit]` (both templates; keep the remaining lines).

### F7 Unqualified slash commands and stale chain in create_project next steps

- Location: create_project/SKILL.md:L20, L24, L157, L160, L163, L165-L166; create_research/SKILL.md:L67, L214; create_research/templates.md:L138; create_product_research/SKILL.md:L66, L68
- Evidence: "/create_research [directory]" ... "/create_design [directory]" ... "4. Implement (coordinated workers; /implement_inline runs it in this session):\n   /implement [directory]"; create_research L214: "run `/create_design` when ready"
- Pattern: Group 2 volatile specifics / inconsistency (same files elsewhere use `/wb:`; README template in create_project/templates.md:L40-L66 uses `/wb:`, create_product_research L278 uses `/wb:create_design`)
- Why obsolete: The plugin's skills are namespaced `/wb:*` (CLAUDE.md, help). Mixed forms drift; create_project's chain also omits the optional `explore_design` stage that its own README template lists (CLAUDE.md requires the chain to match across help/wb-prime).
- Confidence: Medium
- Action: rewrite
- Replacement: prefix each with `/wb:` (e.g. `/wb:create_research [directory]`, `/wb:create_design [directory]`, `/wb:create_tasks [directory]`, `/wb:implement [directory]`, `/wb:implement_inline`, `/wb:create_project` at L20/L24/L67/L66/L68); insert into create_project Step 5 after item 1: `(optional) /wb:explore_design [directory] when the research shows competing directions`.

### F8 Agent spawn blocks use bare subagent_type, repo docs say plugin agents are namespaced

- Location: create_research/sub-agent-prompts.md:L20, L47, L66; create_product_research/sub-agent-prompts.md:L21, L50, L75, L95
- Evidence: `subagent_type: "codebase-locator"` etc.; docs/claude-code-skills-guide.md:L188: "plugin agents are namespaced (`wb:codebase-locator`)"
- Pattern: Group 2 volatile specifics (agent names must match)
- Why obsolete: Agent names match plugin/agents/*.md but the registered type for a plugin agent is `wb:<name>`; the repo's own guide says so. Same bare form appears in validate_execution and create_mockup sub-agent-prompts (other slices).
- Confidence: Medium (cannot run to confirm resolution; one line of docs supports namespacing)
- Action: rewrite
- Replacement: `subagent_type: "wb:codebase-locator"`, `"wb:codebase-analyzer"`, `"wb:pattern-finder"`, `"wb:product-behavior-analyzer"`, `"wb:research-validator"`.

### F9 pattern-finder evaluates patterns, contradicting the documentarian rule and its own What-NOT list

- Location: plugin/agents/pattern-finder.md:L97-L104, L117
- Evidence: "### Usage Guidelines\n- When to use this pattern ..." ; "### Anti-Patterns Found\n- Patterns to avoid (as evidenced by refactors)\n- Deprecated approaches still in codebase" ; "- Look for both positive examples (to follow) and negative (to avoid)" ; vs L125-L128 "Don't evaluate if patterns are good or bad / Don't recommend which pattern to use / Don't critique existing patterns"; documentarian-philosophy.md:L28 "Typed wb agents (... `pattern-finder` ...) carry this constraint in their own system prompts."
- Pattern: Group 2 contradiction (within file and against documentarian-philosophy.md)
- Why obsolete: The output template tells the agent to write recommendation/critique sections while the same file forbids it, and the file lacks the CRITICAL documentarian header the philosophy doc says it has. Haiku 4.5 follows the template literally; blame shows all of this from the original 2025-10-08 file.
- Confidence: High
- Action: rewrite
- Replacement:
  - L97-L104 -> `### Where Each Variant Is Used\n- Which files follow this pattern\n- Which variant appears in which scenario\n\n### Deprecated or Superseded Approaches Present\n- Approaches still in the codebase that newer code has replaced (state as observed facts, no judgment)\n```` (keep closing fence)
  - L117 -> `- Look for the range of implementations, including variants and older code`
  - Add after L9 an intro paragraph: `## Documentarian constraint\n\nDocument what IS, not what SHOULD BE: no suggestions, issues, or critique. Describe the patterns that exist and where they occur.` (the philosophy doc claims this header exists).

### F10 Duplicated prohibition blocks inside agent files

- Location: codebase-analyzer.md:L11-L17, L103-L114; product-behavior-analyzer.md:L11-L26, L68, L76, L134-L135, L139-L151; codebase-locator.md:L109-L114; research-validator.md:L208-L214
- Evidence: analyzer L11-L17 "DO NOT suggest improvements or changes / DO NOT identify issues or problems ..." then L103-L110 "Don't make architectural recommendations / Don't analyze code quality / Don't identify bugs or issues / Don't suggest improvements", then L112 "## REMEMBER: You are a documentarian, not a critic"; product analyzer states "file:line for every claim" at L22-L26, L68, L76, L134, L151 and "do NOT guess" at L25, L135, L147.
- Pattern: Group 1c (prohibition runs, scattered duplication) / Group 1e
- Why obsolete: Three passes over the same rule per file (top block, "What NOT to Do", closing REMEMBER). Keep-list 10 protects one end recap, so keep the top block and the closing line; the middle list only duplicates. Sonnet 5.5 treats each as separate signal.
- Confidence: Medium
- Action: rewrite
- Replacement:
  - codebase-analyzer.md L103-L110 -> `## Precision\n\n- Trace actual code paths rather than assuming; say so when a path cannot be traced.\n- Cover error handling and edge cases as part of how the code works.`
  - product-behavior-analyzer.md L139-L147 -> `## Keep it in product language\n\n- Skip algorithms, data structures, code architecture, design patterns, function signatures, and class hierarchies.\n- Use a product term where one exists rather than engineering jargon.\n- If a behavior cannot be traced to code, say so.`
  - product-behavior-analyzer.md L68 -> `- Record the file:line for each step in the flow` (drop the bold); L76 likewise; delete L134 (duplicate of L23) and L135 second clause; L151 -> `Your sole purpose is to describe what the software does from the perspective of someone who uses or manages the product. You read code to understand behavior, but you report in product language.`
  - codebase-locator.md: no change (its list is short, not duplicated).

### F11 research-validation description enumerates trigger phrases; body repeats them

- Location: plugin/skills/research-validation/SKILL.md:L3, L25-L31
- Evidence: `Use when "validate research", "check research accuracy", "verify research", or "is this research still accurate".` and "## When to Validate\n- Code changed since research was written\n- Before a planning session ... - When anyone says \"is this still accurate?\" ..."
- Pattern: Group 2 trigger-case enumeration; duplicated info across description and body
- Why obsolete: Four near-synonymous quoted phrases, one per missed trigger, generalize worse than an intent category, and the body restates them.
- Confidence: Medium
- Action: rewrite
- Replacement: description -> `Validate a research document (research.md or product-research.md) against the current codebase: file paths exist, code snippets match, behavioral claims hold. Use when the user asks to validate, verify, or fact-check research, or asks whether research is still accurate after the code changed. Takes an optional project directory.` ; delete the `## When to Validate` section (its cases are covered by the description).

### F12 Sub-agent roster: codebase-analyzer and product-behavior-analyzer are near-duplicates (Group 4)

- Location: plugin/agents/codebase-analyzer.md and plugin/agents/product-behavior-analyzer.md (whole files); spawn at create_product_research/sub-agent-prompts.md:L26-L53
- Evidence: identical frontmatter tools/model/effort (`tools: Read, Grep, Glob, Bash(ls:*)`, `model: sonnet`, `effort: medium`); same documentarian header; same "Core Responsibilities" (behavior/flow/data), same 3-4 step "Analysis Strategy" (entry points -> trace -> document -> connections), same file:line output contract. They differ only in audience/register (product language vs technical). Precedent that the payload can carry the audience: create_product_research already reuses `pattern-finder` for the product flow and steers it with "Summarize at a HIGH LEVEL suitable for a product manager".
- Pattern: Group 4 redundant specialist sub-agents
- Why obsolete: Two agents, same tools and near-duplicate prompts, differing in a filter (audience) = one agent taking the distinction as input.
- Confidence: Medium (product-behavior-analyzer carries useful product-register guidance; fold it, do not lose it)
- Action: rewrite (roster edit)
- Replacement: delete plugin/agents/product-behavior-analyzer.md. In plugin/agents/codebase-analyzer.md add after the intro line:
  `## Audience\n\nThe request states the audience. For an engineering audience (default), report as below. For a product audience, describe user-visible behaviors, flows, and error states in plain language, group by feature rather than by file, use product terms rather than engineering jargon, and still give a file:line reference for every claim; report flows as numbered steps and behaviors as a Trigger | Behavior | Source | Configurable? table.`
  Then in create_product_research/sub-agent-prompts.md change `subagent_type: "product-behavior-analyzer"` to `"wb:codebase-analyzer"` and start the prompt with `Audience: product manager. ...`; update documentarian-philosophy.md:L28 to drop `product-behavior-analyzer` from the typed-agent list; update any help/README agent inventory (outside slice; grep `product-behavior-analyzer`).
  Other pairs checked, no merge: codebase-locator vs pattern-finder (different tools: locator has find/ls and no Read, pattern-finder has Read; different outputs), research-validator (distinct job). The research-validation skill and research-validator agent overlap in content (skill runs in-session, agent in a fresh context); working redundancy per keep-list 8, left alone.

### F13 Validator core list omits the pattern category it later validates

- Location: plugin/agents/research-validator.md:L11-L15
- Evidence: "## Core Responsibilities\n\n1. **Validate File Paths** ... 2. **Validate Code Snippets** ... 3. **Validate Behavioral Claims**" vs L23 "Extract four categories of verifiable claims" and Step 5 Pattern Validation.
- Pattern: Group 2 internal inconsistency
- Why obsolete: Sonnet 5.5 reads the responsibilities list as the scope; pattern claims may be skipped.
- Confidence: Low
- Action: rewrite
- Replacement: add `4. **Validate Pattern Claims** — Every "the codebase uses X" statement: does the pattern exist where claimed?` after line 15.

### F14 "Read ... NOW" pressure and duplicated argument parsing in create_project

- Location: create_project/SKILL.md:L62-L71, L111, L115, L119, L123, L173-L179; create_research/SKILL.md:L113
- Evidence: "Read the \"README.md Template\" section of [templates.md](templates.md) NOW and create the file" (x4); "**Read [sub-agent-prompts.md](sub-agent-prompts.md) NOW**"; Step 1 pseudo-JavaScript arg parsing that repeats Initial Response items 1-3 and the "Argument Usage" list a third time.
- Pattern: Group 1a (caps NOW), Group 1c padding (duplicated instruction)
- Why obsolete: "NOW" adds nothing over the ordering in the step; the JS block scripts a trivial parse the Initial Response already specifies. Duplicates currently agree, so the arg-parsing part is low priority (keep-list 8).
- Confidence: Low
- Action: rewrite
- Replacement: `Read the "README.md Template" section of [templates.md](templates.md) and create the file from it with all metadata values filled in.` (likewise the other three); `Read [sub-agent-prompts.md](sub-agent-prompts.md) and use its ...`. Optional: delete create_project Step 1 code block and the Argument Usage `$1/$2/$3` bullets, keeping `Intent is never an argument...`.

### F15 Reference to doc that may not exist / research-validation update vs tools

- Location: plugin/skills/research-validation/SKILL.md:L4-L8, L75-L80
- Evidence: `allowed-tools: Read, Grep, Glob, Bash(test:*, ls:*)` while step 4 says "Update frontmatter: `validation_status` ... `last_validated`"
- Pattern: Group 2 inconsistency (low)
- Why obsolete: `allowed-tools` pre-approves rather than restricts, so the edit still works with a prompt; but the frontmatter write is undeclared, while "If Validation Fails: Don't silently fix the document" and the agent's read-only tools suggest intent is unclear about who writes.
- Confidence: Low
- Action: flag (user decides whether to add Edit to allowed-tools).

## Clean / keep

- plugin/docs/reference/documentarian-philosophy.md: clean except line 28 claim, which F9 (pattern-finder) and F12 (roster) make true/adjust; the "unless explicitly asked" escape hatch and rationale are context, kept.
- plugin/agents/codebase-locator.md: no findings. "Be thorough but efficient" / "Cast a wide net" are mild, fit a Haiku search task; no CRITICAL text.
- plugin/skills/create_project/templates.md, create_research/templates.md (apart from F6/F7 lines), create_product_research/templates.md (apart from F6): format-pinning templates, kept (keep-list 7). bd commands in Open Questions blocks are fragile exact scripts, kept.
- research-validator.md: "Don't skip claims because they seem obvious", "Don't mark claims as PASS without actually checking", "Check every verifiable claim, don't sample" target demonstrated validator shortcuts; kept. Step 1-5 checklist is a mechanical fragile procedure, appropriate.
- Kept deliberately: the `## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT THE CODEBASE AS IT EXISTS` block in both research skills and the agents (load-bearing discipline, first-appearance statement of the core constraint; the closing "REMEMBER" recap in agents is the single end-recap allowed by keep-list 10); the "Nudge discipline" and "Coverage discipline" paragraphs in create_research (reasoned, format-relevant); the create_project Intent gate ("Do not create the directory or any file while any part is empty") is a real gate.
- "no Intent section (plan predates 3.0.0)" appears identically in create_research, create_design, explore_design, validate_execution, help: an agreeing sentinel string with a version pin. Left alone (keep-list 8); flag only that it is a version reference to retire together across files if the sentinel ever changes.
- Model pins duplicated between agent frontmatter and Task() blocks (haiku/sonnet) currently agree: working redundancy, not flagged.
- create_research and create_product_research are near-duplicate skills that have diverged (product skill does not read README Intent or emit Intent Coverage; create_research does): noted, not a dated pattern; left as is.
- Effort frontmatter present and sensible on sonnet agents/skill (analyzer/product medium, validator high); no think-harder prose, no update suppressors, no history narratives, no migration-relative phrasing found in slice.
