---
name: create_product_research
description: Research a codebase from the product perspective — features, user flows, user-visible behaviors — into research.md written in product language. Use when the research question is about what the software does for users rather than how the code works, or when a PM-facing write-up is requested. Takes the project directory and the question.
argument-hint: [project-directory] [research-question]
allowed-tools: Read
---

# Generate Product Research Document

Conducts comprehensive codebase research and documents findings from a **product manager's perspective** by spawning specialized agents to work in parallel. Produces a three-layer document: product overview, engineering approach, and technical appendix.

**Supporting files** (same directory as this skill):

- `sub-agent-prompts.md` — verbatim Task({}) blocks for Component Locator, Product Behavior Analyzer, Pattern Finder (Step 4), and Validation Agent (Step 7)
- `templates.md` — the product-research.md output document template (Step 6)

## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT THE CODEBASE AS IT EXISTS

- **DO NOT** suggest improvements or changes unless explicitly asked
- **DO NOT** identify issues or problems unless explicitly asked
- **DO NOT** propose enhancements or optimizations
- **DO NOT** critique the implementation or architecture
- **DO NOT** perform root cause analysis unless explicitly asked
- **ONLY** describe what the software does, how users interact with it, and what behaviors result
- You are a documentarian, NOT an evaluator or consultant
- **Document what IS, not what SHOULD BE**

Full rationale and agent-application rules: [docs/reference/documentarian-philosophy.md](../../docs/reference/documentarian-philosophy.md)

## Audience: Product Managers

Your output is for someone who manages the product, not someone who writes the code. This means:

- Explain features as user-visible behaviors, not implementation details
- Describe flows as user journeys, not code paths
- Group findings by product capability, not by file or module
- Use plain language — no engineering jargon unless it's a user-facing term
- Include technical references as backing evidence in an appendix, not inline

## Initial Response

This stage needs from you: the product question, or a confirmation of the one derived from the plan's Goal.

When invoked, check for arguments:

1. **If directory provided** (e.g., `/wb:create_product_research docs/plans/2025-01-08-auth/`):
   - Use `$1` as the project directory
   - If `$2+` exists, use as research question
   - Otherwise, prompt for research focus

2. **If no arguments**:

   ```
   I'm ready to research the codebase from a product perspective. Please provide:
   1. Path to the project documentation directory
   2. Your research question or area of interest

   Example: /wb:create_product_research docs/plans/2025-01-08-auth/
   Then: "Research how user authentication works from a product perspective"
   ```

## Workflow Position

This command can be used in two ways:

1. **Within the wb pipeline**: After `/create_project` creates the directory structure. The `product-research.md` file will be created alongside `research.md` — they serve different audiences for the same project.

2. **Standalone**: A PM can run this without `/create_project`. If the directory exists but `product-research.md` doesn't, create it fresh. If the directory doesn't exist, create it.

## Steps to Execute After Receiving the Research Query

### Step 1: Read Any Directly Mentioned Files First (CRITICAL)

- If the user mentions specific files (docs, JSON, configs), read them FULLY first
- **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
- **CRITICAL**: Read these files yourself in the main context before spawning any sub-tasks
- This ensures you have full context before decomposing the research

**⛔⛔⛔ BARRIER 1: STOP! Do NOT proceed to Step 2 until ALL mentioned files are FULLY read ⛔⛔⛔**

### Step 2: Validate Project Structure

- Check that the specified directory exists; if not, create it
- Check if product-research.md exists (may be a follow-up)
- If it exists, read it FULLY to see what's already documented
- Check frontmatter status field

### Step 3: Decompose Research Question in Product Terms

**Describe what the SOFTWARE DOES from the user's perspective**

1. **Break down the user's query into product areas**, not code modules:
   - What features are involved? What does the user see and do?
   - What user flows touch this area? What's the happy path? Error paths?
   - What data moves through the system? What does the user provide and receive?
   - What integrations or external services are involved?
   - What configuration controls behavior? What can be changed without code?

2. **REMEMBER: Document what IS, not what SHOULD BE**

3. **Work out:**
   - The user-visible surface of this feature — screens, APIs, messages, states
   - How this feature connects to adjacent features the user also touches
   - What a PM needs to know to make decisions about this area
   - Which parts of the codebase actually implement user-facing behavior

4. **Identify research areas** to investigate:
   - User-facing features and capabilities
   - User flows (happy path and error paths)
   - Data involved (what's collected, stored, displayed)
   - Configuration that affects product behavior
   - Integration points with other systems
   - Error states and recovery paths

5. **Consider which specific components** to investigate

### Step 4: Spawn Parallel Research Agents

Create multiple agents to research different aspects concurrently:

**CRITICAL: Sub-agents are READ-ONLY. They gather information and return findings as reports. They do NOT write files. YOU (the main agent) will write product-research.md after synthesizing their findings.**

```
## Parallel Research Strategy

Based on the research question "[research-question]", I'll spawn specialized agents to investigate:

1. **Locating Components** - Finding where features are implemented
2. **Analyzing Product Behaviors** - Understanding what the software does
3. **Finding Patterns** - Identifying conventions and engineering approach
```

#### Agent 1: Component Locator

Use the **Component Locator** prompt from `sub-agent-prompts.md` § "Component Locator (Step 4)".

#### Agent 2: Product Behavior Analyzer

Use the **Product Behavior Analyzer** prompt from `sub-agent-prompts.md` § "Product Behavior Analyzer (Step 4)".

#### Agent 3: Pattern Finder

Use the **Pattern Finder** prompt from `sub-agent-prompts.md` § "Pattern Finder (Step 4)".

**Additional specialized agents** based on research focus:

- API endpoint analysis (what endpoints exist, what they do)
- Database/data model investigation (what data is stored)
- Frontend component exploration (what the user sees)
- Integration/third-party service analysis

#### Parallel Execution

Spawn all agents concurrently for efficiency. Each returns a report; none write files.

**CRITICAL Agent Instructions (MUST follow exactly):**

- **Each agent describes what the software does, NOT how the code works**
- **Agents MUST describe what exists without ANY judgment**
- **Document what IS, not what SHOULD BE — NO EXCEPTIONS**
- **Agents MUST include file:line references for every claim**
- **Use specific agent types for their strengths**
- **Run multiple agents in parallel for speed**
- **ALWAYS wait for ALL agents before synthesizing**
- **Remind EVERY agent: You are documenting the codebase AS IT EXISTS**

**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL sub-agents to complete — DO NOT proceed until EVERY agent returns ⛔⛔⛔**

### Step 5: Synthesize Findings into Three Layers

**Document ONLY what EXISTS, in product language**

**IMPORTANT**: Wait for ALL sub-agent tasks to complete before proceeding

1. **Compile all sub-agent results**
2. **REMEMBER: Document what IS, not what SHOULD BE**
3. **Prioritize live codebase findings** as primary source of truth
4. **Connect findings across different components**
5. **Answer the user's specific questions** with concrete evidence FROM THE CURRENT CODE
6. **DO NOT add recommendations or improvements unless explicitly requested**
7. **Organize into three layers**:

**Layer 1 — Product Overview** (the PM reads this):

- Feature overview in plain language
- User flows as numbered narratives
- Product behaviors: "when X, system does Y"
- Data involvement: what data, where it flows
- Error states as user-visible outcomes
- Integration points as capabilities

**Layer 2 — Engineering Approach** (pattern tracking):

- Coding patterns observed (naming, structure, organization)
- Architecture style notes
- Testing approach characterization
- Technology choices relevant to product decisions

**Layer 3 — Technical Appendix** (credibility backing):

- File references grouped by feature area
- Key code snippets for engineering conversations
- Configuration values that affect behavior

### Step 6: Write Product Research Document

Write the product-research.md file. **Keep the main agent focused on synthesis — sub-agents already did the deep file reading.**

Use the **product-research.md Template** from `templates.md` § "product-research.md Template".

**⛔⛔⛔ BARRIER 3: STOP! Verify NO placeholder values — ALL data MUST be from ACTUAL codebase ⛔⛔⛔**

Before writing:

- **NO** "[To be added]" or similar placeholders
- **NO** generic examples — use REAL data from THIS codebase
- **NO** assumptions — only documented FACTS
- **Document what IS, not what SHOULD BE**
- **Remember one final time: Document what IS, not what SHOULD BE**

### Step 7: Validate the Written Document

**After writing product-research.md, validate it against the codebase.**

The validator reads the written file directly — no need to pass findings in context.

Use the **Validation Agent** prompt from `sub-agent-prompts.md` § "Validation Agent (Step 7)".

**⛔⛔⛔ BARRIER 4: STOP! Wait for validation agent to complete before proceeding ⛔⛔⛔**

After validation returns:

- If **PASS**: Update frontmatter `validation_status: passed`
- If **PASS WITH WARNINGS**: Update frontmatter `validation_status: passed_with_warnings`, add UNCERTAIN items to Validation Notes section
- If **FAIL**: Fix the failing claims by re-checking the code, update the document, re-validate

### Step 8: Handle Follow-Up Questions

If the user has follow-up questions:

1. **DO NOT create a new research file**
2. **Append to the existing product-research.md**
3. **Add new section**: `## Follow-up Research [YYYY-MM-DD HH:MM]`
4. **Update frontmatter**:
   - `last_updated: [YYYY-MM-DD]`
   - Add: `last_updated_note: "Added research on [topic]"`
5. **Spawn new sub-agents** for additional investigation
6. **Re-validate** the new claims after writing
7. **Continue building** on previous findings

### Step 9: Confirm Completion

Present summary to user:

```
✅ Product research documented at: [path]/product-research.md

Research topic: [description]
Audience: Product Management

Key findings:
- [Major finding 1 — product behavior or capability]
- [Major finding 2 — user flow or feature]
- [Major finding 3 — integration or data flow]

Validation: [PASS/PASS WITH WARNINGS]
- Paths checked: [N/M passed]
- Behaviors verified: [N/M confirmed]
- [K items flagged for human review, if any]

Files analyzed: [count]

The document includes:
- Product overview with user flows
- Engineering approach and patterns
- Technical appendix for engineering discussions

Next: Review the research and run `/wb:create_design` when ready (or `/wb:explore_design` first if multiple viable approaches surfaced).
```

## Important Notes

### Critical Ordering

- **ALWAYS** read mentioned files first before spawning sub-tasks (Step 1)
- **ALWAYS** wait for all sub-agents to complete before synthesizing (Step 4)
- **ALWAYS** write the document before validating (Step 6 before Step 7)
- **ALWAYS** wait for validation before confirming completion (Step 7)
- **NEVER** write the research document with placeholder values

### Documentation Philosophy

- **CRITICAL**: You and all sub-agents are documentarians, not evaluators
- **REMEMBER**: Document what IS, not what SHOULD BE
- **AUDIENCE**: Product managers — write for them, not for engineers
- **NO RECOMMENDATIONS**: Only describe the current state of the software
- Focus on behaviors, flows, and capabilities over implementation details
- Research documents should be self-contained with all necessary context
- Each sub-agent prompt should be specific and focused on read-only operations
- Document cross-component connections and how systems interact

### File Reading

- **File reading**: Always read mentioned files FULLY (no limit/offset) before spawning sub-tasks
- Have sub-agents document examples and usage patterns as they exist
- Keep the main agent focused on synthesis, not deep file reading
- Sub-agents must include file:line references for all claims

### Three-Layer Output

- **Layer 1 (Product Overview)**: Every PM reads this — must be clear and jargon-free
- **Layer 2 (Engineering Approach)**: PMs read this to understand HOW the team builds — patterns, not details
- **Layer 3 (Technical Appendix)**: PMs reference this when talking to engineers — file paths and snippets

### Validation

- Validation runs AFTER writing the document, reading it directly from file
- FAIL results must be fixed (re-check the code, update document, re-validate)
- UNCERTAIN results are noted in the Validation Notes section for human review
- The `validation_status` frontmatter field tracks overall validation state

### Synchronization Points

1. ⛔ **BARRIER 1**: After reading mentioned files — Do not proceed until ALL files are read
2. ⛔ **BARRIER 2**: After spawning research agents — Wait for ALL agents to complete
3. ⛔ **BARRIER 3**: Before writing output — Verify no placeholder values
4. ⛔ **BARRIER 4**: After spawning validation agent — Wait for validation to complete
