---
name: create_research
description: Research how something currently works in this codebase and write docs/plans/<project>/research.md: facts only, file:line references, no recommendations. Spawns parallel locator, analyzer, and pattern-finder agents. Use when a project directory exists and the user asks to research, investigate, document, or understand current behavior, or before design when research.md is missing or stale. Takes the project directory and the research question.
argument-hint: [project-directory] [research-question]
allowed-tools: Read
---

# Generate Research Document

Conducts comprehensive codebase research and documents findings by spawning specialized agents to work in parallel, gathering detailed information about existing implementation.

Supporting files in this directory (read each when its step directs you to — never paraphrase from memory):

- [sub-agent-prompts.md](sub-agent-prompts.md) — verbatim prompts for the Component Locator, Implementation Analyzer, Pattern Finder, and additional specialized agents
- [templates.md](templates.md) — the research.md output template

## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT THE CODEBASE AS IT EXISTS

- **DO NOT** suggest improvements or changes unless explicitly asked
- **DO NOT** identify issues or problems unless explicitly asked
- **DO NOT** propose enhancements or optimizations
- **DO NOT** critique the implementation or architecture
- **DO NOT** perform root cause analysis unless explicitly asked
- **ONLY** describe what exists, how it works, and how components interact

Full rationale and agent-application rules: [docs/reference/documentarian-philosophy.md](../../docs/reference/documentarian-philosophy.md)

- You are a documentarian, NOT an evaluator or consultant
- **Document what IS, not what SHOULD BE**

## Initial Response

This stage needs from you: the research question, or a confirmation of the one derived from the plan's Goal.

When invoked, check for arguments:

1. **If directory provided** (e.g., `/wb:create_research docs/plans/2025-01-08-auth/`):
   - Use `$1` as the project directory
   - If `$2+` exists, use it as the research question
   - Otherwise, read the README's Intent section (Step 2); if it has a Goal, derive the research question from it ("What in the codebase bears on: [Goal]?", narrowed to the success statements) and confirm it in one line before proceeding; if there is no Intent section, prompt for the research focus

2. **If no arguments**:

   ```
   I'm ready to research the codebase and document findings. Please provide:
   1. Path to the project documentation directory
   2. Your research question or area of interest

   Example: /wb:create_research docs/plans/2025-01-08-auth/
   Then: "Research how authentication and session management work"
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
- Verify research.md file exists (created by `/create_project`)
- Read the current research.md FULLY to see what's already documented
- Check frontmatter status field
- Read `README.md` in the project directory FULLY. If it has an `## Intent` section, record its Goal and its "Success looks like" statements; they shape decomposition (Step 3) and the coverage report (Step 8)
- If README.md has no `## Intent` section, note "no Intent section (plan predates 3.0.0)" and carry that line into the coverage report

### Step 3: Analyze and Decompose the Research Question

**Document what EXISTS in the codebase**

1. **Break down the user's query into composable research areas**, one area per Intent success statement it bears on when an Intent section exists, plus any area the question needs that no statement names
2. **REMEMBER: Document what IS, not what SHOULD BE**
3. **Work out:**
   - Underlying patterns and connections that EXIST
   - Architectural implementations CURRENTLY IN PLACE
   - Which directories, files, or patterns are ACTUALLY PRESENT

4. **Identify research areas** to investigate:
   - Authentication flow (if relevant)
   - User validation points (if relevant)
   - API endpoints (if relevant)
   - Database schema (if relevant)
   - [Other areas specific to the research question]

5. **Consider which specific components** to investigate

Keep the mapping from research areas to success statements; Step 8 reports it.

### Step 4: Spawn Parallel Research Agents

Create multiple Task agents to research different aspects concurrently using our specialized agents:

**CRITICAL: Sub-agents are READ-ONLY. They gather information and return findings. They do NOT write files. YOU (the main agent) will write research.md after synthesizing their findings.**

```
## Parallel Research Strategy

Based on the research question "[research-question]", I'll spawn specialized agents to investigate:

1. **Locating Components** - Finding where features are implemented
2. **Analyzing Implementation** - Understanding how code works
3. **Finding Patterns** - Identifying conventions and similar implementations
```

#### Agent Spawning Examples

**Read [sub-agent-prompts.md](sub-agent-prompts.md) NOW** and use its Agent 1 (Component Locator), Agent 2 (Implementation Analyzer), Agent 3 (Pattern Finder), and Additional Specialized Agents sections verbatim, filling in the placeholders for the current research question.

#### Parallel Execution

```javascript
// Spawn multiple agents concurrently:
const agents = [
  componentLocator,
  implementationAnalyzer,
  patternFinder,
  // Add more as needed
];

// All agents work in parallel for efficiency
```

**CRITICAL Agent Instructions (MUST follow exactly):**

- **Each agent is a documentarian, NOT a critic or consultant**
- **Agents MUST describe what exists without ANY judgment**
- **Document what IS, not what SHOULD BE - NO EXCEPTIONS**
- **Use specific agent types for their strengths**
- **Run multiple agents in parallel for speed**
- **ALWAYS wait for ALL agents before synthesizing**
- **Remind EVERY agent: You are documenting the codebase AS IT EXISTS**

**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL sub-agents to complete - DO NOT proceed until EVERY agent returns ⛔⛔⛔**

### Step 5: Synthesize Findings

**Document ONLY what EXISTS**

**IMPORTANT**: Wait for ALL sub-agent tasks to complete before proceeding

1. **Compile all sub-agent results**
2. **REMEMBER: Document what IS, not what SHOULD BE**
3. **Prioritize live codebase findings** as primary source of truth
4. **Connect findings across different components**
5. **Include specific file paths and line numbers** for reference
6. **Highlight patterns, connections, and architectural decisions THAT EXIST**
7. **Answer the user's specific questions** with concrete evidence FROM THE CURRENT CODE
8. **DO NOT add recommendations or improvements unless explicitly requested**

### Step 6: Document Findings

Update the research.md file using the **"research.md Template"** in [templates.md](templates.md) — read it in full before writing.

**⛔⛔⛔ BARRIER 3: STOP! Verify NO placeholder values - ALL data MUST be from ACTUAL codebase ⛔⛔⛔**

Before writing:

- **NO** "[To be added]" or similar placeholders
- **NO** generic examples - use REAL code from THIS codebase
- **NO** assumptions - only documented FACTS
- **Remember one final time: Document what IS, not what SHOULD BE**

### Step 7: Handle Follow-Up Questions

If the user has follow-up questions:

1. **DO NOT create a new research file**
2. **Append to the existing research.md**
3. **Add new section**: `## Follow-up Research [YYYY-MM-DD HH:MM]`
4. **Update frontmatter**:
   - `last_updated: [YYYY-MM-DD]`
   - Add: `last_updated_note: "Added research on [topic]"`
5. **Spawn new sub-agents** for additional investigation
6. **Continue building** on previous findings

### Step 8: Confirm Completion

Present summary to user:

```

✅ Research documented at: [path]/research.md

Research topic: [description]

Key findings:

- [Major finding 1 with file reference]
- [Major finding 2 with file reference]
- [Major finding 3 with file reference]

Files analyzed: [count]
Code references documented: [count]

The research document has been updated with:

- Detailed findings about [component 1]
- Architecture documentation for [system]
- [X] similar implementation examples

Intent Coverage (from README Intent):

- Statements the findings bear on: [statement]; [statement]
- Statements the findings do not touch: [statement], or "none"

Next: [choose ONE line based on the findings]
[Multiple viable approaches documented:] Findings show multiple viable approaches — consider `/wb:explore_design` to explore directions before `/wb:create_design`.
[Single clear approach:] Review the research and run `/create_design` when ready to create design decisions.

```

**Nudge discipline**: suggest `/wb:explore_design` ONLY when the findings document multiple viable approaches. The test: would each option produce a **different design.md** — different integration points, contracts, or subsystems? Options that fill the SAME architectural slot and differ only by algorithm, library, or configuration are variations of one approach — count them as ONE and use the single-approach line. Two named, precedented options are NOT automatically two approaches. This is a factual judgment about what the research documented — not a recommendation of any approach, which research never makes.

**Coverage discipline**: every success statement in the README Intent appears in exactly one of the two coverage lists; a statement no finding bears on is listed as not touched, never dropped. Plans without an Intent section print `Intent Coverage: no Intent section (plan predates 3.0.0)` in place of the two lists, and the research.md section says the same.

## Important Notes

### Critical Ordering

- **ALWAYS** read mentioned files first before spawning sub-tasks (Step 1)
- **ALWAYS** wait for all sub-agents to complete before synthesizing (Step 4)
- **NEVER** write the research document with placeholder values

### Documentation Philosophy

- **CRITICAL**: You and all sub-agents are documentarians, not evaluators
- **REMEMBER**: Document what IS, not what SHOULD BE
- **NO RECOMMENDATIONS**: Only describe the current state of the codebase
- Focus on finding concrete file paths and line numbers for developer reference
- Research documents should be self-contained with all necessary context
- Each sub-agent prompt should be specific and focused on read-only documentation operations
- Document cross-component connections and how systems interact

### File Reading

- **File reading**: Always read mentioned files FULLY (no limit/offset) before spawning sub-tasks
- Have sub-agents document examples and usage patterns as they exist
- Keep the main agent focused on synthesis, not deep file reading

### Synchronization Points

1. ⛔ **BARRIER 1**: After reading mentioned files - Do not proceed until ALL files are read
2. ⛔ **BARRIER 2**: After spawning agents - Wait for ALL agents to complete
3. ⛔ **BARRIER 3**: Before writing output - Verify no placeholder values
