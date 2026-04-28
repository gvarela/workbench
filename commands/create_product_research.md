---
description: Research codebase from a product perspective - features, user flows, behaviors, and patterns
argument-hint: [project-directory] [research-question]
---

# Generate Product Research Document

Conducts comprehensive codebase research and documents findings from a **product manager's perspective** by spawning specialized agents to work in parallel. Produces a three-layer document: product overview, engineering approach, and technical appendix.

## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT THE CODEBASE AS IT EXISTS

- **DO NOT** suggest improvements or changes unless explicitly asked
- **DO NOT** identify issues or problems unless explicitly asked
- **DO NOT** propose enhancements or optimizations
- **DO NOT** critique the implementation or architecture
- **ONLY** describe what the software does, how users interact with it, and what behaviors result
- You are a documentarian, NOT an evaluator or consultant
- **Document what IS, not what SHOULD BE**

## Audience: Product Managers

Your output is for someone who manages the product, not someone who writes the code. This means:

- Explain features as user-visible behaviors, not implementation details
- Describe flows as user journeys, not code paths
- Group findings by product capability, not by file or module
- Use plain language — no engineering jargon unless it's a user-facing term
- Include technical references as backing evidence in an appendix, not inline

## Initial Response

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

## Steps to Execute After Receiving the Research Query

### Step 1: Read Any Directly Mentioned Files First (CRITICAL)

- If the user mentions specific files (docs, JSON, configs), read them FULLY first
- **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
- **CRITICAL**: Read these files yourself in the main context before spawning any sub-tasks
- This ensures you have full context before decomposing the research

**⛔⛔⛔ BARRIER 1: STOP! Do NOT proceed to Step 2 until ALL mentioned files are FULLY read ⛔⛔⛔**

### Step 2: Validate Project Structure

- Check that the specified directory exists
- Check if product-research.md exists (may be a follow-up)
- If it exists, read it FULLY to see what's already documented
- Check frontmatter status field

### Step 3: Decompose Research Question in Product Terms

**think deeply about what the SOFTWARE DOES, not how the code works**

1. **Break down the user's query into product areas**, not code modules:
   - What features are involved?
   - What user flows touch this area?
   - What data moves through the system?
   - What integrations or external services are involved?
   - What configuration controls behavior?

2. **REMEMBER: Document what IS, not what SHOULD BE**

3. **Identify research areas** to investigate:
   - User-facing features and capabilities
   - User flows (happy path and error paths)
   - Data involved (what's collected, stored, displayed)
   - Configuration that affects product behavior
   - Integration points with other systems
   - Error states and recovery paths

### Step 4: Spawn Parallel Research Agents

Create multiple agents to research different aspects concurrently:

**CRITICAL: Sub-agents are READ-ONLY. They gather information and return findings. They do NOT write files. YOU (the main agent) will write product-research.md after synthesizing their findings.**

```
## Parallel Research Strategy

Based on the research question "[research-question]", I'll spawn specialized agents to investigate:

1. **Locating Components** - Finding where features are implemented
2. **Analyzing Product Behaviors** - Understanding what the software does
3. **Finding Patterns** - Identifying conventions and engineering approach
```

#### Agent 1: Component Locator

```javascript
Agent({
  description: "Find [feature] components",
  prompt: `Find all files related to [feature].

  Search for:
  - Source files implementing [feature]
  - Test files for [feature]
  - Configuration files
  - UI components, routes, API endpoints
  - Related documentation

  Focus on [specific directories if known].
  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "codebase-locator",
  model: "haiku"
})
```

#### Agent 2: Product Behavior Analyzer

```javascript
Agent({
  description: "Analyze [feature] product behaviors",
  prompt: `Understand what [feature] does from a product perspective.

  Analyze:
  - What user-visible behaviors does this feature provide?
  - What are the user flows (step by step, in plain language)?
  - What data does the user provide, and what do they see?
  - What happens when things go wrong (error states)?
  - What configuration controls this feature's behavior?

  Start with [specific files if known].

  CRITICAL INSTRUCTIONS:
  - Explain as PRODUCT BEHAVIORS, not code implementation
  - Write for a product manager, not an engineer
  - Document what EXISTS with file references as backing evidence
  - DO NOT suggest improvements or identify issues
  - Document what IS, not what SHOULD BE
  - DO NOT write any files. Return your findings as a report.`,
  subagent_type: "product-behavior-analyzer",
  model: "sonnet"
})
```

#### Agent 3: Pattern Finder

```javascript
Agent({
  description: "Find engineering patterns and conventions",
  prompt: `Identify coding patterns and engineering conventions in the codebase.

  Find:
  - Naming conventions used
  - Architecture patterns (MVC, microservices, etc.)
  - How similar features are typically built
  - Testing approach and coverage patterns
  - Error handling conventions
  - Configuration management approach

  Summarize at a HIGH LEVEL suitable for a product manager to understand the engineering approach, not the engineering details.

  DO NOT write any files. Return your findings as a report.`,
  subagent_type: "pattern-finder",
  model: "haiku"
})
```

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
- **Run multiple agents in parallel for speed**
- **ALWAYS wait for ALL agents before synthesizing**

**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL sub-agents to complete — DO NOT proceed until EVERY agent returns ⛔⛔⛔**

### Step 5: Synthesize Findings into Three Layers

**think deeply about documenting ONLY what EXISTS, in product language**

**IMPORTANT**: Wait for ALL sub-agent tasks to complete before proceeding

1. **Compile all sub-agent results**
2. **REMEMBER: Document what IS, not what SHOULD BE**
3. **Organize into three layers**:

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

### Step 6: Validate Research Accuracy

Before writing the document, spawn the research validator:

```javascript
Agent({
  description: "Validate research claims",
  prompt: `Validate the following research findings against the actual codebase.

  Check:
  1. All file paths mentioned exist
  2. All behavioral claims can be traced through code
  3. All pattern claims are accurate

  Research findings to validate:
  [paste synthesized findings here]

  Return a structured validation report with PASS/FAIL/UNCERTAIN per claim.`,
  subagent_type: "research-validator",
  model: "sonnet"
})
```

- Review validation results
- Fix any FAIL items by re-checking the code
- Note any UNCERTAIN items in the document for human review
- Do NOT write the document if critical claims fail validation

### Step 7: Write Product Research Document

Update the product-research.md file with:

````markdown
---
project: [from existing frontmatter or research question]
created: [YYYY-MM-DD]
status: complete
audience: product
last_updated: [YYYY-MM-DD]
validation_status: [passed|passed_with_warnings|failed]
---

# Product Research: [Feature/Area Name]

**Created**: [YYYY-MM-DD]
**Last Updated**: [YYYY-MM-DD]
**Audience**: Product Management
**Validation**: [PASS/PASS WITH WARNINGS — N items need review]

## Feature Overview

[2-3 paragraph plain-language description of what this feature/area does. Written so a PM can understand the product capability without reading code.]

## User Flows

### [Flow Name] (e.g., "User Creates an Account")

1. User [action in plain language]
2. System [validates/processes/responds]
3. If [condition], then [outcome A]; otherwise [outcome B]
4. User sees [result]

**Success outcome**: [what the user experiences when everything works]
**Error outcomes**:
- [Error condition]: [what the user sees]
- [Error condition]: [what the user sees]

### [Additional flows...]

## Product Behaviors

### [Behavior Area]

| Trigger | What Happens | Configurable? |
|---------|-------------|---------------|
| [user action or event] | [system behavior in plain language] | [yes — setting name / no] |

### [Additional behavior areas...]

## Data & Integration

### What Data Is Involved

- **User provides**: [input data in business terms]
- **System stores**: [what's persisted and why]
- **User sees**: [output/display data]

### How It Connects to Other Features

- **[Feature/Service]**: [what the integration enables]
- **[External System]**: [what data flows between them]

### Configuration That Affects Behavior

| Setting | What It Controls | Default |
|---------|-----------------|---------|
| [setting name] | [plain-language description] | [value] |

## Engineering Approach

### Coding Patterns

- **[Pattern name]**: [1-sentence description of the convention]
  - Used in: [where this pattern appears]

### Architecture Style

- [High-level observation about how the codebase is organized]
- [Technology choices relevant to product decisions]

### Testing Approach

- [How this feature is tested — unit, integration, e2e]
- [Coverage level observation]

## Technical Appendix

### File References

**[Feature Area 1]**:
- `path/to/main/implementation/` — [what it handles in product terms]
- `path/to/tests/` — [test coverage for this area]

**[Feature Area 2]**:
- `path/to/files/` — [what it handles]

### Key Code (for engineering discussions)

```language
// From path/to/file.ext:NN-MM
// [Brief description of what this code does in product terms]
[actual code snippet]
```

### Validation Notes

[Any UNCERTAIN claims from validation that need human review]
- [Claim]: [What was verified, what needs manual check]

## Open Questions

Questions requiring resolution are tracked in beads:

```bash
bd create --title="Q: [your question]" --type=task --priority=2 \
  -d "Product research question. Context: [what this affects]"
```

**Active questions** — use `bd list --status=open` for current list.

## Next Steps

Based on the research findings:

1. [Suggested next action based on findings]
2. [Another logical next step]
3. Review with engineering team for accuracy
4. Run `/wb:create_design` when ready to make design decisions
````

**⛔⛔⛔ BARRIER 3: STOP! Verify NO placeholder values — ALL data MUST be from ACTUAL codebase ⛔⛔⛔**

Before writing:

- **NO** "[To be added]" or similar placeholders
- **NO** generic examples — use REAL data from THIS codebase
- **NO** assumptions — only documented FACTS
- **Validation must have passed** or passed with warnings only
- **Remember one final time: Document what IS, not what SHOULD BE**

### Step 8: Handle Follow-Up Questions

If the user has follow-up questions:

1. **DO NOT create a new research file**
2. **Append to the existing product-research.md**
3. **Add new section**: `## Follow-up Research [YYYY-MM-DD HH:MM]`
4. **Update frontmatter**:
   - `last_updated: [YYYY-MM-DD]`
   - Add: `last_updated_note: "Added research on [topic]"`
5. **Spawn new sub-agents** for additional investigation
6. **Re-validate** the new claims before appending
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

Next: Review the research and run `/wb:create_design` when ready.
```

## Important Notes

### Critical Ordering

- **ALWAYS** read mentioned files first before spawning sub-tasks (Step 1)
- **ALWAYS** wait for all sub-agents to complete before synthesizing (Step 4)
- **ALWAYS** validate before writing (Step 6)
- **NEVER** write the document with placeholder values

### Documentation Philosophy

- **CRITICAL**: You and all sub-agents are documentarians, not evaluators
- **REMEMBER**: Document what IS, not what SHOULD BE
- **AUDIENCE**: Product managers — write for them, not for engineers
- **NO RECOMMENDATIONS**: Only describe the current state of the software
- Focus on behaviors, flows, and capabilities over implementation details
- Research documents should be self-contained with all necessary context

### Three-Layer Output

- **Layer 1 (Product Overview)**: Every PM reads this — must be clear and jargon-free
- **Layer 2 (Engineering Approach)**: PMs read this to understand HOW the team builds — patterns, not details
- **Layer 3 (Technical Appendix)**: PMs reference this when talking to engineers — file paths and snippets

### Validation

- Validation runs BEFORE writing the document
- FAIL results must be fixed (re-check the code)
- UNCERTAIN results are noted in the document for human review
- The `validation_status` frontmatter field tracks overall validation state

### Synchronization Points

1. ⛔ **BARRIER 1**: After reading mentioned files — Do not proceed until ALL files are read
2. ⛔ **BARRIER 2**: After spawning agents — Wait for ALL agents to complete
3. ⛔ **BARRIER 3**: Before writing output — Verify no placeholder values, validation passed

## Configuration

The command accepts the directory path as a parameter:

```
/wb:create_product_research docs/plans/2025-10-07-my-project
```

Or prompts for it if not provided.
