# CLAUDE.md - Commands Directory

This file provides specific guidance for working with the documentation commands in this directory.

## Overview

This directory contains Claude Code slash commands for project documentation, research, planning, and task tracking. The commands implement context engineering patterns with explicit barriers, verification gates, and structured workflows.

## Command Workflow

The commands follow a strict sequential workflow:

```
/create_project → /create_research → /create_design → /create_execution → /implement_tasks → /validate_execution
```

For multi-session work:
```
[Session 1] → /create_handoff → [Session 2] → /resume_handoff → [Continue work]
```

Each command builds upon the previous one's output, creating structured documentation in timestamped directories under `docs/plans/`.

## Workflow Philosophy

The workflow separates three distinct concerns:

1. **Research** (`research.md`) - Document what EXISTS (facts only, no recommendations)
2. **Design** (`design.md`) - Document WHAT to build and WHY (architectural decisions)
3. **Execution** (`tasks.md`) - Document HOW to build it (phased implementation plan)

## Core Command Philosophy

### Critical Principles

1. **Document, Don't Judge**: Research describes what EXISTS, not what should be changed
2. **Explicit Barriers**: Commands implement synchronization points (⛔ BARRIER) to ensure complete context
3. **File Reading Protocol**: ALWAYS read files FULLY (no limit/offset) before analysis
4. **Dual Verification**: Separate automated checks from manual verification
5. **Zero Scope Creep**: Tasks only come from plans, no additions
6. **Beads Required**: These commands require beads for ALL task tracking (`bd init`)
   - Use beads for phases AND granular tasks
   - Do NOT use TaskCreate, TaskUpdate, TodoWrite, or markdown checkboxes for tracking
   - Markdown files document the PLAN, beads tracks the STATUS
   - See session reminder for beads workflow rules

### Beads Error Handling

If any `bd` command fails:

1. **Diagnose**: Run `bd doctor` to check for issues
2. **Report**: Tell the user the specific error and suggest fixes
3. **Document**: Note the failure in tasks.md Implementation Notes
4. **Fix**: Common fixes:
   - "beads not initialized" → `bd init`
   - "issue not found" → `bd list` to find correct ID
   - "database locked" → wait and retry
5. **Retry**: After fixing, re-run the failed command

**Do NOT** proceed without beads - it is required for phase tracking.

### Task Tracking Philosophy

**Beads for STATUS, Markdown for PLAN**:

- **Beads issues** (`bd create`, `bd update`, `bd close`):
  - Track live status of ALL work (phases AND granular tasks)
  - Source of truth for "what's done" and "what's in progress"
  - Persists across sessions and survives context compaction
  - Use for: claiming work, tracking progress, managing dependencies

- **Markdown files** (tasks.md, research.md, design.md):
  - Document the PLAN (what tasks exist and why)
  - Provide context and rationale for decisions
  - Static reference material, not live tracking
  - Updated only when the plan changes, not when status changes

**Prohibited for tracking**:
- ❌ TaskCreate / TaskUpdate (session-only, doesn't persist)
- ❌ TodoWrite (markdown files, not for status)
- ❌ Markdown checkboxes (documentation, not tracking)

### Command Structure

Each command file contains:

- Initial setup prompts
- Step-by-step execution with barriers
- Agent instructions for parallel research
- Output templates with YAML frontmatter
- Synchronization points and checkpoints

### Critical Implementation Patterns

When modifying commands, maintain these patterns:

```markdown
⛔ BARRIER 1: After file reading - full context required
⛔ BARRIER 2: After agent spawning - wait for ALL
⛔ BARRIER 3: Before writing - no placeholders allowed
⛔ CHECKPOINT: Between phases - human verification required
```

Agent instructions must include:

```
You are documenting the codebase as it exists.
DO NOT suggest improvements or identify issues.
Document what IS, not what SHOULD BE.
```

### Frontmatter Standards

All generated documentation files use consistent YAML frontmatter:

- Basic: `project`, `ticket`, `created`, `status`, `last_updated`
- Git metadata: `git_commit`, `git_branch`, `repository`
- User tracking: `researcher`, `planner`, `assignee`
- Progress: `current_phase`, `total_tasks`, `completed_tasks`

## Working with These Commands

When modifying or creating new documentation commands:

1. Follow the existing command patterns
2. Include all three barriers and checkpoints
3. Use "think deeply" directives at critical decision points
4. Maintain the documentarian philosophy for research
5. Separate automated from manual verification
6. Always read files FULLY before processing
7. Use parallel agents for efficiency but wait for ALL to complete

## Agent Spawning with Model Selection

Commands now support model hints when spawning agents for optimal cost/performance:

```javascript
Task({
  description: "Quick file search",
  prompt: "Find all test files...",
  subagent_type: "general-purpose",
  model: "haiku"  // Fast, cheap for simple tasks
})

Task({
  description: "Complex analysis",
  prompt: "Analyze architecture patterns...",
  subagent_type: "general-purpose",
  model: "sonnet"  // Better for complex reasoning
})

Task({
  description: "Critical validation",
  prompt: "Verify implementation correctness...",
  subagent_type: "general-purpose",
  model: "opus"  // Maximum capability when needed
})
```

**Model Selection Guidelines**:
- `haiku`: File searches, pattern matching, simple tasks
- `sonnet`: Code analysis, integration planning, test design
- `opus`: Complex reasoning, critical decisions (rarely needed)

## Markdown Formatting Standards

### Nested Fenced Code Blocks

When nesting fenced code blocks within markdown, use the proper number of backticks to ensure correct rendering:

- **Outer blocks**: Use 4 backticks (````)
- **Inner blocks**: Use 3 backticks (```)
- **Deeply nested**: Add one more backtick for each level

Example:

````markdown
# Documentation Example

Here's how to write code:

```javascript
// This is the inner code block
function example() {
  return true;
}
```

And here's another example:

```bash
npm install
```
````

This ensures that markdown processors correctly parse nested blocks and that the generated documentation renders properly.

## Status Progression

Files created by commands progress through defined states:

- `research.md`: draft → in-progress → complete
- `design.md`: draft → ready → implementing → complete
- `tasks.md`: not-started → in-progress → complete

## Command Descriptions

### `/create_project`

Initializes project documentation structure with metadata tracking. Creates research.md, design.md, and tasks.md templates.

### `/create_research`

Conducts comprehensive research using parallel agents, documenting what EXISTS without judgment. Spawns multiple agents concurrently for efficient codebase exploration.

### `/create_design`

Creates architectural design decisions through interactive discussion. Focuses on WHAT to build and WHY. Spawns verification agents to validate design approach and find precedents.

### `/create_execution`

Transforms design decisions into detailed phased execution plan with embedded tasks. Focuses on HOW to implement. Spawns agents for dependency analysis, test coverage planning, and rollback procedures.

### `/implement_tasks`

Implements tasks following TDD (Red → Green → Refactor) practices. Respects phase boundaries and checkpoints. Uses beads for ALL task tracking.

### `/update_status`

Intelligently updates status across all documentation files based on actual progress. Ensures consistency and validates state transitions.

### `/validate_execution`

Validates that execution plan was correctly implemented. Verifies all success criteria, identifies deviations, and provides comprehensive validation report. Run after implementation to ensure quality before deployment.

### `/create_handoff`

Creates comprehensive handoff document for session transfer. Captures critical context, learnings, and discoveries not in formal documentation. Enables seamless work continuation across sessions.

### `/resume_handoff`

Resumes work from a handoff document. Restores full context including learnings, solved problems, and next steps. Prevents repeating discoveries and maintains consistency.

### Removed Commands

The following commands have been removed and replaced with the improved workflow:

- `/create_plan` - **REMOVED**: Replaced by `/create_design` (WHAT/WHY) and `/create_execution` (HOW)
- `/create_tasks` - **REMOVED**: Replaced by `/create_execution` which creates detailed execution plans

## Testing Commands

When testing changes to commands:

1. Create a test project with `/create_project test-feature`
2. Run through the full workflow
3. Verify all barriers and checkpoints work correctly
4. Check that frontmatter is properly populated
5. Ensure status progression works as expected
