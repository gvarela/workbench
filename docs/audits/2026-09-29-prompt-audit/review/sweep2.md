### S2-1 Nonexistent install script and stale clone path

- Location: docs/workbench-workflow-guide.md:L19-L25
- Evidence: "git clone <repository-url> / cd prompts / ./scripts/install-commands --claude"
- Current guidance / fact: No scripts/ dir exists at repo root (ls); only reference to install-commands is this doc. Install is via marketplace (`claude plugin update wb@gvarela-workbench`) or `--plugin-dir <repo>/plugin` per CLAUDE.md; FACTS.md Plugins.
- Confidence: High
- Suggested fix: Replace with marketplace install / `claude --plugin-dir /path/to/repo/plugin`; drop `cd prompts`.

### S2-2 subagent-tool-call-ceiling.md says changes are NOT made, but they are

- Location: docs/subagent-tool-call-ceiling.md:L3, L87-L136, L157-L161
- Evidence: "Status: finding documented, changes NOT yet made. Ready to pick up." / "`plugin/skills/create_tasks/SKILL.md:368` ... 'Sized: 1-4 hours'" / "No skill in the repo mentions tool calls at all"
- Current guidance / fact: create_tasks/SKILL.md:395-401 now sizes by tool-call budget; implement/SKILL.md:192 has delegation-size projection with ~50-call split rule; implement/reference.md:61-96 has Case A truncation vs Case B failure playbook; SKILL.md:267 handles unfinished workers. Line ref :368 is stale (now :395). "Repo state" note (uncommitted settings.local.json) is also stale.
- Confidence: High
- Suggested fix: Mark status as resolved (shipped in 2.2.1, commit 504129c), or add a header noting Defects 1-2 are fixed and the doc is historical evidence.

### S2-3 Ceiling doc does not account for task-worker maxTurns: 60

- Location: docs/subagent-tool-call-ceiling.md:L11-L47, L138-L147
- Evidence: "The binding constraint is the call budget." / "it has not been verified as a universal constant rather than a configurable limit."
- Current guidance / fact: plugin/agents/task-worker.md frontmatter has `maxTurns: 60` (FACTS: maxTurns is a subagent frontmatter field). The doc never mentions maxTurns/turns; it only counts tool_use blocks (n=129), and says the limit might be "configurable" without naming this knob. One turn can hold several parallel tool calls, so ~60 turns ~ ~70 calls is consistent, but the doc does not say so. Also the measured session predates/ran on an unrelated project, so whether its agents had maxTurns is not stated.
- Confidence: Medium
- Suggested fix: Add a note that task-worker sets maxTurns: 60 and that turns != tool calls; state the doc does not distinguish these.

### S2-4 Model/effort table recommends xhigh for Sonnet implementation

- Location: docs/workbench-workflow-guide.md:L74 (also L69 "Sonnet (high effort)")
- Evidence: "implement_inline | Sonnet (xhigh effort); Fable for cross-cutting phases"
- Current guidance / fact: FACTS.md Models: Sonnet 5.5 effort recalibrated; starting point `medium` for agentic coding/multistep tool use; reserve xhigh/max for measured gains. plugin/skills/implement_inline/SKILL.md sets no effort or model frontmatter, so the table's "xhigh" is user advice only, not a repo default. (Same doc L70/L72/L73 "high effort" for Fable is consistent with CLAUDE.md "Fable spawns use effort: high".)
- Confidence: Medium
- Suggested fix: Say Sonnet at `medium` (raise to high/xhigh only if measured); optionally reword L69 likewise.

### S2-5 Beads-workflow chain / stage framing in "Stage N" list

- Location: docs/workbench-workflow-guide.md:L283-L287, L361-L365
- Evidence: "### Stage 7: Implementation ... /wb:implement (/wb:implement_inline to run it in this session)"; "### Stage 9: Status Updates"
- Current guidance / fact: Root CLAUDE.md chain is create_project -> create_research -> [explore_design] -> create_design -> create_tasks -> implement -> validate_execution, with implement_inline an in-session variant. Guide handles this correctly for implement_inline. update_status is presented as a numbered "stage" though it is a utility (help skill lists stages); minor, not clearly wrong.
- Confidence: Low
- Suggested fix: Optional: label update_status as a utility, not Stage 9.

### S2-6 Barrier/caps/blanket read-fully rules presented as guide "Core Philosophy" and "Best Practices"

- Location: docs/workbench-workflow-guide.md:L112-L117, L333-L338, L369, L726-L742, L785, L882-L886
- Evidence: "Reads mentioned files FULLY (⛔ BARRIER 1)"; "ZERO SCOPE CREEP"; "Read files FULLY (no limit/offset)"; "⛔ BARRIER 3 violation ... Never proceed with placeholders"; "Synchronization points prevent rushing ahead ... Why: Prevents incomplete context / Ensures parallel work completes"
- Current guidance / fact: FACTS.md: caps/repeated emphasis cause over-triggering; blanket "read fully, no limit/offset" conflicts with Read guidance (only right for short plan docs); repo's blind trial 2026-09-05: barrier wording volume does not hold a wait-for-all gate, the mechanism does (foreground Agent spawns block; background notify). Guide claims barriers "ensure parallel work completes", which is the harness's job.
- Confidence: Medium
- Suggested fix: Reword L732-L742 to say barriers mark real sync points and are enforced by foreground spawns; qualify L785 as "plan documents only".

### S2-7 Agent-instruction snippet shown as a model prompt in caps

- Location: docs/workbench-workflow-guide.md:L718-L724
- Evidence: "DO NOT suggest improvements or identify issues. Document what IS, not what SHOULD BE."
- Current guidance / fact: FACTS.md: say things at normal volume with the reason. Snippet is a fair illustration, only weakly stale.
- Confidence: Low
- Suggested fix: Optionally rewrite in normal case with the reason (unbiased description of current state).

### S2-8 product-research-claude-desktop.md: dated prompting conventions (whole file is a prompt)

- Location: docs/product-research-claude-desktop.md:L20-L29, L60-L66, L77-L92, L108, L138-L146, L163, L167, L329-L337, L364, L423-L467
- Evidence: "CRITICAL: YOUR ONLY JOB..."; "**Think very carefully about what the SOFTWARE DOES...**"; "**Think deeply about:**"; "⛔⛔⛔ BARRIER 1: STOP! Do NOT proceed..."; "ALWAYS ... NEVER"; "REMEMBER: Document what IS, not what SHOULD BE" repeated ~10 times.
- Current guidance / fact: FACTS.md Models/prompting: "think deeply/step by step" prose is dated (thinking always on; effort is the control); CRITICAL/MUST/NEVER/ALWAYS caps, repeated restatement, and triple-barrier volume over-trigger; barrier wording does not hold gates. Also blanket "read entire files ... FULLY" (L60-64, L445).
- Confidence: High
- Suggested fix: Rewrite once at normal volume: state the documentarian rule once with its reason; delete "think very carefully/deeply"; single-line barriers with reason.

### S2-9 Desktop doc: "Claude Desktop runs as a single agent" and setup UI steps

- Location: docs/product-research-claude-desktop.md:L5-L9, L104-L108
- Evidence: "Open Claude Desktop -> Projects -> Create new project ... Set custom instructions ... Claude Desktop runs as a single agent -- research happens sequentially"
- Current guidance / fact: Not confirmed by WebFetch (Desktop UI and capabilities, e.g. subagents/Cowork/Code tab, change often; Project instructions is real at claude.ai). Not verified either way.
- Confidence: Low
- Suggested fix: Verify against current Desktop docs before editing; consider softening the absolute "single agent" claim.

### S2-10 Doc references a skill/command that does not exist in the repo

- Location: docs/subagent-tool-call-ceiling.md:L4-L5, L126-L129
- Evidence: "long /wb:implement_coordinated run" ; "whether `create_execution`, which produces the task list..."
- Current guidance / fact: implement_coordinated is a deprecated user-only alias for implement (plugin/skills/implement_coordinated/SKILL.md:18); create_execution was renamed create_tasks (also stated in beads-integration-learnings.md:L204). L126-L129 treats create_execution as a live separate skill.
- Confidence: Medium
- Suggested fix: Historical name at L4 is fine if labeled; at L126 replace with create_tasks (the question is moot) or remove.

Clean: docs/beads-integration-learnings.md (dated history explicitly labeled "kept as written" with a 2026-06-09 addendum; remaining findings would be bd semantics, out of scope; TodoWrite guidance L90-L114 and L228-L236 is labeled historical).
