# Audit C-implement

Targets: implement, implement_inline, tdd-discipline, verification-before-completion, task-worker = Claude Opus 5.5 (task-worker per-spawn sonnet/opus/fable); task-verifier pins `model: sonnet` = Claude Sonnet 5.5. Alias skills = pointer stubs (see F13).
Paths verified with Read/Glob: ../../docs/reference/{beads-mode,beads-not-initialized}.md, agents task-worker/task-verifier, /wb:update_status, create_handoff, create_design, explore_design all resolve. One named rule does not resolve by name (F9).
Convention provenance: CLAUDE.md "Mark each real synchronization point once" added 4dd28ca (2026-09-05). The triple-marker text dates from 3a0b97b (2025-11-21) and was carried through the 3.0.0 move (blame shows 9b107a0, 2026-09-06, because of the rename).

## Findings (ordered by confidence)

### F1 Worker-retry count contradicts itself inside implement

- Location: plugin/skills/implement/SKILL.md:L204, L255-L256; plugin/skills/implement/sub-agent-prompts.md:L112-L128
- Evidence: SKILL L255 "Attempt automatic fix (up to 2 retries) using the \"Fix Worker Prompt\"" and L256 "**After the fable retry fails**: add to blocking issues list"; L204 "fix workers escalate to fable, one attempt."; sub-agent-prompts L114 "**Retry 1:**" and L128 "Do not spawn a second fix worker."
- Pattern: Group 2, instruction files that contradict each other (same skill, SKILL.md vs its supporting file)
- Why obsolete: Three passages say one fix attempt, one says up to two. Which one loads decides whether a second fix worker is spawned; the coordinator has to guess. The one-attempt rule appears three times and matches the rest of the design.
- Confidence: High
- Action: rewrite
- Replacement:
  - L255 old: `- Attempt automatic fix (up to 2 retries) using the "Fix Worker Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md), re-verifying after each retry.`
  - L255 new: `- Attempt one automatic fix using the "Fix Worker Prompt" in [sub-agent-prompts.md](sub-agent-prompts.md), then re-verify.`
  - L256 old: `- **After the fable retry fails**: add to blocking issues list`
  - L256 new: `- **If re-verification fails**: add to blocking issues list`

### F2 Triple-marker "STOP!" barrier text, plus barriers without a stated reason

- Location: plugin/skills/implement/SKILL.md:L78, L174, L213, L276, L295; plugin/skills/implement_inline/SKILL.md:L94, L315, L337
- Evidence: "**⛔⛔⛔ BARRIER 1: STOP! Read ALL documentation files FULLY - NO SHORTCUTS ⛔⛔⛔**" (implement L78 and inline L94, identical); "**⛔ BARRIER 2: Get ready tasks from beads**"; "**⛔ BARRIER 3: Collect output and verify before next task**"; "**⛔ BARRIER 4: All phase tasks complete**"; "**⛔ CHECKPOINT: Phase ${phase} Complete**"; inline "**⛔ BARRIER 2**: Complete ALL tasks in the phase before verification"; "**⛔ CHECKPOINT: Phase [N] Complete**"
- Pattern: Group 2 conflict with CLAUDE.md "Command Structure Patterns" / Group 1a (repo-grounded); trial 2026-09-05: triple-⛔ STOP! scored WAIT 0/3, single-⛔ with reason 1/3
- Why obsolete: Convention (newer than the text) is one marker plus a plain reason. BARRIER 2 on "get ready tasks" is not a wait-for-all gate at all, so it dilutes the marker.
- Confidence: High (L78, L94); Medium (the rest, missing reasons)
- Action: rewrite
- Replacement:
  - implement L78 old: `**⛔⛔⛔ BARRIER 1: STOP! Read ALL documentation files FULLY - NO SHORTCUTS ⛔⛔⛔**`
  - implement L78 new: `**⛔ BARRIER 1: research.md, design.md, and tasks.md read in full — a context package built from partial reads sends gaps to every worker**`
  - inline L94 old: `**⛔⛔⛔ BARRIER 1: STOP! Read ALL documentation files FULLY - NO SHORTCUTS ⛔⛔⛔**`
  - inline L94 new: `**⛔ BARRIER 1: research.md, design.md, and tasks.md read in full — implementing from partial reads produces work that misses the plan**`
  - implement L174 old: `**⛔ BARRIER 2: Get ready tasks from beads**`
  - implement L174 new: `Find ready work in beads (this is a lookup, not a synchronization point):`  (then renumber later barriers: L213 -> BARRIER 2, L276 -> BARRIER 3; also update the two text references "BARRIER" if any; none exist)
  - implement L213 old: `**⛔ BARRIER 3: Collect output and verify before next task**`
  - implement L213 new: `**⛔ BARRIER 2: worker output collected and verified before the next task — the next worker builds on this task's landed state**`
  - implement L276 old: `**⛔ BARRIER 4: All phase tasks complete**`
  - implement L276 new: `**⛔ BARRIER 3: every phase task closed — aggregating and verifying on a partial phase reports work that has not landed**`
  - implement L295 old: `**⛔ CHECKPOINT: Phase ${phase} Complete**`
  - implement L295 new: `**⛔ CHECKPOINT: Phase ${phase} Complete — the next phase builds on what a human has accepted**`
  - inline L315 old: `**⛔ BARRIER 2**: Complete ALL tasks in the phase before verification`
  - inline L315 new: `**⛔ BARRIER 2: every phase task closed — verification on a partial phase reports work that has not landed**`
  - inline L337 old: `**⛔ CHECKPOINT: Phase [N] Complete**`
  - inline L337 new: `**⛔ CHECKPOINT: Phase [N] Complete — the next phase builds on what a human has accepted**`
  - inline L599-L601 (Synchronization Points list) old: `1. **⛔ BARRIER 1**: After reading all documentation - full context required` etc.; keep as is (numbering unchanged for inline).

### F3 Scope block contradicts the autonomy block: "STOP and ask" vs "asking blocks the work"

- Location: plugin/skills/implement/SKILL.md:L72 vs L191; plugin/skills/implement_inline/SKILL.md:L60 (inline has no autonomy block, so only implement conflicts); plugin/agents/task-worker.md:L25-L30 (worker resolves it correctly)
- Evidence: implement L72 "If something seems missing, STOP and ask - DO NOT add it"; L191 "Nobody is watching in real time, so asking \"Want me to…?\" blocks the work... This does not apply to phase checkpoints or plan-defect halts"; task-worker L30 routes pre-existing problems to "issues encountered" instead of asking.
- Pattern: Group 2, contradictory instructions (within one file); also the scope-trial weak point is the reporting channel, so the fix routes discoveries to a report field
- Why obsolete: The coordinator is told both to stop and ask and to never ask outside two named halts. A missing-task-detail case is neither a checkpoint nor a plan defect.
- Confidence: High
- Action: rewrite
- Replacement:
  - implement L72 old: `- If something seems missing, STOP and ask - DO NOT add it`
  - implement L72 new: `- If something seems missing, do not add it: record it in Implementation Notes as a follow-up. If the task cannot succeed without it, that is a plan defect; use the Plan-Defect Deviation Protocol.`

### F4 Deleted-context references: implement leans on implement_inline, which is never loaded

- Location: plugin/skills/implement/SKILL.md:L54, L65, L297, L440, L444
- Evidence: "All principles from `implement_inline` PLUS:"; "Same zero-tolerance policy as original:"; "Same verification process as `implement_inline`:"; "- ✅ All `implement_inline` best practices"; "- ❌ All prohibitions from `implement_inline`"
- Pattern: Group 2 volatile/duplicated specifics + Group 1d migration-relative phrasing ("original", "PLUS")
- Why obsolete: `implement` runs with `allowed-tools: Read` and its directives never read implement_inline/SKILL.md, so these lines point at text the model does not have (the `implement_coordinated` alias likewise loads only implement). "original" is a diff against a prior version. Step 8 restates the verification anyway.
- Confidence: High
- Action: rewrite
- Replacement:
  - L54 old: `All principles from`implement_inline`PLUS:`
  - L54 new: `Plan discipline (TDD via the workers, beads for all status tracking, phase checkpoints, one commit per verified task) plus:`
  - L65 old: `Same zero-tolerance policy as original:`
  - L65 new: `Workers implement what tasks.md specifies and nothing else:`
  - L297 old: `Same verification process as`implement_inline`:`
  - L297 new: `Phase verification:`
  - L440 old: `- ✅ All`implement_inline`best practices`
  - L440 new: (remove the line)
  - L444 old: `- ❌ All prohibitions from`implement_inline``
  - L444 new: (remove the line)

### F5 History narrative in a loaded reference file

- Location: plugin/skills/implement/reference.md:L59
- Evidence: "The `determineModel()` keyword-regex spec was retired in favor of coordinator judgment (2026-06, prompts-0my). The tier rule lives in one place, SKILL.md Step 5 item 4 (\"Determine model\"), and is not restated here; the choice is passed as a per-spawn model override on the `task-worker` agent."
- Pattern: Group 2 history narratives (date, issue ID, retired function) + Group 1d migration-relative
- Why obsolete: Names a function and issue ID the model has never seen; only the pointer is live.
- Confidence: High
- Action: rewrite
- Replacement: `Model choice is coordinator judgment. The tier rule lives in one place, SKILL.md Step 5 item 4 ("Determine model"), and is passed as a per-spawn model override on the \`task-worker\` agent.`

### F6 tasks.md "unchecked task" contradicts "beads is status, no checkboxes"

- Location: plugin/skills/implement_inline/SKILL.md:L123 vs L136, L293-L295, L594
- Evidence: "- Locate the next unchecked task"; vs "Never use TaskCreate/TaskUpdate or markdown checkboxes" and "❌ **NEVER** update markdown checkboxes for status (documentation only)"; CLAUDE.md "Do NOT use ... markdown checkboxes for tracking"
- Pattern: Group 2, conflict with CLAUDE.md / within file
- Why obsolete: Status lives in beads; there are no checkboxes to read.
- Confidence: High
- Action: rewrite
- Replacement: old `- Locate the next unchecked task` new `- Note which tasks beads reports as ready (\`bd ready\`)`

### F7 Named cross-reference does not resolve by name

- Location: plugin/skills/implement/SKILL.md:L247; plugin/skills/implement_inline/SKILL.md:L266
- Evidence: "(create_tasks' Tidy First edge rule)"; create_tasks/SKILL.md:L242 names it "**Structure-before-behavior exception**" (no "Tidy First"/"edge rule" text anywhere in plugin/)
- Pattern: Group 2 volatile specifics
- Why obsolete: The rule exists but under a different name; a search for the quoted name finds nothing. Also the user's global CLAUDE.md says not to name the methodology.
- Confidence: High
- Action: rewrite
- Replacement: replace `(create_tasks' Tidy First edge rule)` with `(create_tasks' structure-before-behavior rule)` in both files.

### F8 Inline commit step points at a verification that does not exist

- Location: plugin/skills/implement_inline/SKILL.md:L266
- Evidence: "4. One commit per task, after its verification below; the message names the task and its beads id."
- Pattern: Group 2 dangling reference
- Why obsolete: Inline has no per-task verification below (D. Update Progress only closes the bead; phase verification is Step 5-6, after all tasks). The instruction is ambiguous about when to commit.
- Confidence: Medium
- Action: rewrite
- Replacement: `4. One commit per task once its tests pass, before closing the bead; the message names the task and its beads id.`  (assumption: coordinated flow commits after verifier PASS; inline's equivalent is green tests. Adjust if the maintainer wants close-then-commit.)

### F9 Principle 5 lists three model tiers, Step 5 has four

- Location: plugin/skills/implement/SKILL.md:L60 vs L198-L204
- Evidence: "Right model per task via per-spawn override on the task-worker agent (haiku/sonnet/opus)" vs "Fable: never as a first spawn — the escalation target after a verified failure"
- Pattern: Group 2 duplicated info drifted
- Confidence: Medium
- Action: rewrite
- Replacement: old `(haiku/sonnet/opus)` new `(haiku/sonnet/opus; fable only as the escalation target)`

### F10 Pressure/prohibition register in scope blocks and DON'T lists

- Location: implement/SKILL.md:L63-L72, L123, L442-L451; implement_inline/SKILL.md:L52-L60, L136, L581-L595; implement/sub-agent-prompts.md:L36, L68-L75
- Evidence: "### CRITICAL: NO SCOPE ADDITIONS - NONE"; "**NEVER** add features not in tasks.md"; "### DON'T (ABSOLUTELY FORBIDDEN)"; "❌ **NEVER** allow workers to add scope"; "**CRITICAL**: Use beads for ALL task tracking"; "**⛔ CRITICAL: Follow this EXACT process**"; "## CRITICAL Constraints"; inline DON'T list of 13 NEVER lines (most restate L52-L60 and L136)
- Pattern: Group 1a pressure language + 1c prohibition runs + repeated restatement (scope stated 4 times in inline: L47, L52-L60, L62-L64, L584-L592)
- Why obsolete: Trial: CAPS/NEVER vs plain "Do not" identical 3/3, so the volume buys nothing on Sonnet; the reasons (plan is the contract; extras break verification scope) are stated only once (task-worker.md L29-L31 is the model form). Repeated lists make the model reconcile wordings.
- Confidence: Medium
- Action: rewrite
- Replacement:
  - implement L63-L72 replace the block with:

    ```
    ### Scope

    Implement what tasks.md specifies and nothing else: the verifier fails extras, and each extra widens what the next phase must trust. Do not add features, refactors, error handling, or abstractions the task does not name; record pre-existing bugs and ideas as follow-ups in Implementation Notes (see the missing-detail rule below).
    ```

    (keep the "If something seems missing" line per F3)
  - implement L442-L451: replace heading `### DON'T (ABSOLUTELY FORBIDDEN)` with `### Do not` and the five "NEVER" bullets with plain "Do not" text and their reason: `- Do not spawn workers in parallel (each verifier assumes a working tree holding only one task)`; `- Do not let a worker commit, and do not commit a task before its verifier passes`; `- Do not pass whole docs to workers; extract the context package`; `- Do not skip output aggregation or close the phase milestone before manual verification` (drop "NEVER proceed without waiting for worker completion" and "NEVER allow workers to add scope", already covered by Scope).
  - inline L52-L60 same Scope block; inline L581-L595: keep the four fragile ones (tests first, checkpoints, no phase skipping, beads not markdown) as plain "Do not" lines and drop the six scope duplicates (L588-L592, "NEVER add ANY scope", "nice to have").
  - sub-agent-prompts L36 old `**⛔ CRITICAL: Follow this EXACT process**` new `Follow this process:`; L68 old `## CRITICAL Constraints` new `## Constraints`; L70-L74 drop the bold caps prefixes (`- Implement only what the task description specifies: no extra features, error handling, or validation`), keep the DO NOT COMMIT line and its reason.

### F11 task-verifier: generic virtues, unreasoned prohibition run, step choreography

- Location: plugin/agents/task-verifier.md:L159-L173 (Important Guidelines + What NOT to Do), L201-L207 (Remember), L32-L89 (Steps 1-4)
- Evidence: "- **Be objective**: Pass/fail based on criteria, not opinion / **Be specific** / **Be helpful** / **Be efficient** / **Trust passing tests**"; "- Don't evaluate code quality or style / Don't suggest refactoring or improvements / Don't analyze architecture decisions / Don't fail for minor issues if tests pass / Don't check things not related to the task"; "## Remember ... Your job is to be a **quality gate**"
- Pattern: Group 1c padding + prohibition list (5, no reasons); the Steps are mostly mechanical commands (keep) so no finding on them
- Why obsolete: Sonnet 5.5 is already objective/specific; the prohibitions restate one boundary (the verifier judges tests, scope, requirements, not quality) five ways. The end "Remember" recap is allowed (keep-list 10) but repeats the Core Responsibilities.
- Confidence: Medium
- Action: rewrite
- Replacement: replace L159-L173 with:

  ```
  ## Boundaries

  Judge only what this task required: passing tests, changes within the task's scope, and requirements met. Code quality, style, architecture, and refactoring suggestions belong to review, not to this gate, so a minor issue with passing tests is not a FAIL. Include file:line references for every issue and an actionable fix for every FAIL. Run the minimum tests that establish the result.
  ```

  and delete L201-L207 (the `## Remember` recap), assumption: the Boundaries text keeps the load-bearing "minor issue is not a FAIL" rule.

### F12 tdd-discipline "No exceptions" vs implement_inline "When to Skip TDD"

- Location: plugin/skills/tdd-discipline/SKILL.md:L16-L25; plugin/skills/implement_inline/SKILL.md:L495-L504, L583
- Evidence: tdd L16 "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST", L21 "**No exceptions:**"; inline L495-L504 "Some tasks may not need test-first approach: - Configuration changes - Documentation updates - Refactoring with existing tests - Build/deployment scripts ... skip RED phase"; inline L583 "NEVER skip writing tests first (except for noted exceptions)"
- Pattern: Group 2, instruction files that contradict each other
- Why obsolete: A session on inline preloads neither, but any solo edit triggers tdd-discipline (its description: "ANY production code"); the two rules disagree on config, docs, and build scripts. Direction is an assumption: tdd-discipline is the scoped rule (production code); inline's exceptions are the practical boundary.
- Confidence: Medium
- Action: rewrite
- Replacement: tdd-discipline L21 old `**No exceptions:**` new `**Scope:** production code. Configuration, documentation, and build scripts are outside the rule (see implement_inline "When to Skip TDD"). Within scope there are no exceptions:`

### F13 Alias supporting files (EXTRA TASK): not drifted, pure pointers, nothing references them

- Location: plugin/skills/implement_coordinated/{README,reference,sub-agent-prompts,templates}.md; plugin/skills/implement_tasks/templates.md
- Evidence: each is a 5-line stub: "# Moved / This skill was renamed to `implement`. This pointer file exists so sessions holding a stale pre-rename skill body still resolve their reads instead of erroring. / Read [../implement/reference.md](../implement/reference.md) and use it as directed." (implement_tasks: "renamed to `implement_inline`", points to ../implement_inline/templates.md). They are NOT diverging copies of the canonical files; the premise that they "differ" is true only in the trivial sense that they are stubs.
- Pattern: Group 2, duplicated info that drifted — checked, no drift exists
- Evidence of references: Grep for `implement_coordinated/` and `implement_tasks/` across plugin/, docs/, .claude-plugin/, root *.md finds only CHANGELOG.md:L36 (historical entry about the old file); no skill, doc, plan, or hook links to the stub paths. Their only consumers are sessions that loaded a pre-3.0.0 skill body and later "read X NOW" a file under the old directory.
- History: git log on both directories: cf86f75 2026-07-31 (unified layout, v2.0.0), 504129c 2026-08-21, 4995af9 2026-08-26, f5ed905 2026-09-05, 4dd28ca 2026-09-05, 70c50bd 2026-09-05, 9b107a0 2026-09-06 (3.0.0 rename). At 4dd28ca implement_coordinated/reference.md was still a full copy; the stubs came from 9b107a0 (`-`~1400 lines, 5-line stubs). The old CHANGELOG line 36 refers to the pre-rename full copy. Alias SKILL.md text: "remains through 3.x and is removed at 4.0.0".
- Why obsolete: Nothing drifted, so no Group 2 drift finding. The stubs have a documented, working purpose (stale-session read resolution) and are scheduled for removal with their aliases at 4.0.0. The alias SKILL.md itself says only "resolve every read X NOW directive" in ../implement/, so the stubs are not needed by a fresh session.
- Confidence: Low (that removal is warranted now)
- Action: flag — brief's "remove if nothing references them" is met literally (nothing references them), but they exist precisely to catch unreferenceable stale reads; removing them before 4.0.0 reintroduces the read errors they were added for (keep-list 8: functioning redundancy). Recommend removing all five together with the alias SKILL.md files at 4.0.0. Sibling note: `implement_tasks/templates.md` covers only templates; implement_inline has no other supporting file, so the set is complete.

### F14 implement_inline templates: broken nested code fences in format-pinned templates

- Location: plugin/skills/implement_inline/templates.md:L24-L41, L43-L69, L73-L90; plugin/agents/task-verifier.md:L95-L127
- Evidence: templates.md L36 opens "```bash" inside an unclosed```markdown fence, and the "Manual Verification Request" and "Phase Completion Report" fences have blank lines directly inside the fence and trailing "```" mismatched (L41, L69, L90); task-verifier L104 "```" nested in a ```markdown fence, closing the outer block early, so `${testOutput}` renders outside the code block.
- Pattern: format-pinning templates (keep-list 7) with a rendering defect; not a dated pattern, reported for the maintainer
- Why obsolete: "match its structure exactly" is impossible to follow when the fences are unbalanced (likely the markdown auto-fixer). implement/templates.md uses escaped backticks (`\`\`\``) and is fine.
- Confidence: Low
- Action: flag (fix by using a four-backtick outer fence or escaping the inner fences, as implement/templates.md does)

### F15 verification-before-completion: human-directed rationalization rows

- Location: plugin/skills/verification-before-completion/SKILL.md:L9, L43-L52, L54-L62
- Evidence: "Claiming work is complete without verification is dishonesty, not efficiency."; rows "| \"I'm tired\" | Exhaustion ≠ excuse |", "| \"Just this once\" | No exceptions |"; "## Red Flags - STOP"
- Pattern: Group 1a/1c idiom-dating (rationalization tables and "STOP" register written for older models and human developers)
- Why obsolete: "I'm tired" is not a model excuse; the load-bearing content (identify command, run fresh, read output, then claim) is the Gate + What Requires Verification table. Idiom-dating only, no trial or documented behavior tying it to the target, so flag rather than edit.
- Confidence: Low
- Action: flag (candidate: remove the "I'm tired" row; leave everything else)

### F16 Worker prompt template duplicates task-worker.md and lags it

- Location: plugin/skills/implement/sub-agent-prompts.md:L7-L92 vs plugin/agents/task-worker.md:L9-L40
- Evidence: template repeats "You are a focused implementation worker", the Claim/RED/GREEN/REFACTOR/Close process, constraints, and Expected Output; lacks task-worker's "FOLLOW-UPS, NOT FIXES", "SURGICAL EDITS", and operating-mode block.
- Pattern: Group 2 duplicated info; keep-list 8 applies (they agree, no disagreement)
- Confidence: Low
- Action: flag (functioning redundancy; the agent definition already carries the fuller version, so the template's process section could shrink to task-specific data, but no error results from keeping it)

## Clean / keep

- plugin/agents/task-worker.md: clean. Kept: "ZERO SCOPE CREEP" caps labels (reasoned by the adjacent text; matches scope-trial channel: "report it under 'issues encountered'" is load-bearing per the scope-block trial), the Operating Mode autonomy paragraph (deliberate anti-blocking instruction with its exemptions, a current failure the coordinator hits), `maxTurns: 60`. Observation only: SKILL.md L197 says truncation is "observed near ~70 calls" and reference.md L69 hedges it as evidence from one model; task-worker sets maxTurns 60, so the observed stop may be this setting. Consider verifying and citing the real cap (flag, not an edit).
- implement/README.md: history narrative ("introduced as an evolution of inline; since 3.0.0 it is the recommended path") is human-facing and not loaded at runtime; left alone.
- implement/templates.md, implement/reference.md (other sections): clean; failure playbook and plan-defect protocol are load-bearing (exact `bd` commands, fragile).
- implement SKILL.md L191 autonomy paragraph and the truncation/failure-type logic: kept (reasoned, tied to observed failures).
- implement_inline: exact bd command blocks, verification blocks, the beads persist snippet: kept (fragile operations). Sections Daily Progress Pattern, TDD Best Practices, Special Considerations restate earlier steps but agree with them (keep-list 8).
- tdd-discipline body register ("Iron Law", rationalization table): deliberately kept as discipline-enforcement text with a stated core principle; only F12's scope conflict is proposed. verification-before-completion Gate: kept.
- Trigger text (all `description:` fields) is calibrated, not flagged. Alias SKILL.md files (implement_coordinated, implement_tasks): clean; short and correct.
