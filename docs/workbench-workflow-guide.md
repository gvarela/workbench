# Workbench Workflow Guide

Comprehensive guide to the wb commands workflow, beads integration, and best practices.

## Table of Contents

- [Quick Start](#quick-start)
- [Complete Workflow](#complete-workflow)
- [Beads Integration](#beads-integration)
- [Mockup Workflow](#mockup-workflow)
- [Core Philosophy](#core-philosophy)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Installation

```bash
# Clone repository
git clone <repository-url>
cd prompts

# Install globally for Claude Code
./scripts/install-commands --claude

# Initialize beads in your project
cd ~/your-project
bd init --stealth   # any repository with collaborators who do not use beads (writes the shared .git/info/exclude)
bd init             # only a repository you own outright; .beads/ is still excluded, never committed
```

### Basic Workflow

```bash
# 1. Initialize project
/wb:create_project my-feature docs/plans TICKET-123

# 2. Research codebase
/wb:create_research docs/plans/2025-01-15-TICKET-123-my-feature
> Research existing patterns for X

# 3. Create mockup (optional - for UI features)
/wb:create_mockup docs/plans/2025-01-15-TICKET-123-my-feature "settings panel"

# 4. Explore design options (optional - for big architecture decisions)
/wb:explore_design docs/plans/2025-01-15-TICKET-123-my-feature

# 5. Design decisions
/wb:create_design docs/plans/2025-01-15-TICKET-123-my-feature

# 6. Create execution plan
/wb:create_tasks docs/plans/2025-01-15-TICKET-123-my-feature

# 7. Implement with TDD
/wb:implement docs/plans/2025-01-15-TICKET-123-my-feature

# 8. Validate implementation
/wb:validate_execution docs/plans/2025-01-15-TICKET-123-my-feature
```

### Choosing a Session Model

The stage skills run in whatever session model you start; agents they spawn pick their own tiers. Guiding principle: pay for judgment, not throughput — a stage's model should track its degrees of freedom, not its artifact's difficulty.

| Stage | Suggested session model | Why |
| ------- | ------------------------- | ----- |
| create_project, create_handoff, help | Sonnet | Interviews and doc writing |
| create_research / create_product_research | Sonnet (high effort) | Synthesis of subagent reports |
| explore_design | **Fable** (Opus fallback) | Divergent, judgment-dense discussion — the skill self-checks and warns on lighter models |
| create_design | Opus; Sonnet is fine when formalizing a recorded decision | Decision-making vs. documentation |
| create_tasks | **Fable** (high effort; Opus fallback) | Decomposition quality sets the ceiling for cheap workers; the skill self-checks |
| implement (default) | Opus | Coordinator judges tiers and parses reports; workers do the coding; escalation workers: Fable at high |
| implement_inline | Sonnet (xhigh effort); Fable for cross-cutting phases (multi-file refactors, migrations) | The session does the coding itself |
| validate_execution | Any (skill pins sonnet + high effort) | Pinned in skill frontmatter |

These are defaults, not gates — usage limits and task size legitimately move you down a tier.

## Complete Workflow

### Stage 1: Project Initialization

**Command**: `/wb:create_project`

Creates timestamped documentation structure with metadata tracking.

**Creates**:

```
docs/plans/2025-01-15-TICKET-123-feature-name/
├── README.md      # Navigation and overview
├── research.md    # Research findings (status: draft)
├── design.md      # Design decisions (status: draft)
└── tasks.md       # Execution plan (status: not-started)
```

**Captures**:

- Git metadata (commit, branch, repository)
- User information
- Timestamps
- Project/ticket identifiers

### Stage 2: Research

**Command**: `/wb:create_research`

Documents codebase objectively using parallel research agents.

**Process**:

1. Reads mentioned files FULLY (⛔ BARRIER 1)
2. Spawns parallel agents (⛔ BARRIER 2 - wait for ALL):
   - Code Locator: WHERE components live
   - Code Analyzer: HOW code works
   - Pattern Finder: Similar implementations
3. Synthesizes findings (⛔ BARRIER 3 - no placeholders)
4. Writes structured research.md

**Critical Rule**: "Document what IS, not what SHOULD BE"

**Output**: research.md with file:line references, patterns, architecture documentation

### Stage 3: UI Mockup (Optional)

**Command**: `/wb:create_mockup`

**For UI features only** - researches UI patterns and creates HTML mockups.

**Process**:

1. Research existing UI (5 parallel agents):
   - Layout patterns
   - Component library
   - Styling approach
   - Similar features
   - **Icon system** (Font Awesome, Material Icons, etc.)
2. Ask clarifying questions
3. Create ASCII structure (mockup.md)
4. **Create HTML mockup** (mockup.html) with app's actual styles
5. **Visual validation** with Playwright screenshot
6. Iterate with `mockup-iteration` skill

**Creates**:

```
mockups/
├── mockup-log.md          # Decision log
└── v001/
    ├── mockup.md          # ASCII structure
    ├── mockup.html        # HTML with real styles
    ├── preview-v001.png   # Screenshot
    └── decisions.md       # Rationale
```

**Beads Integration**:

- Creates `UI Q: [question]` issues for unresolved questions
- Creates `UI Assumption: [assumption]` issues for unvalidated beliefs
- Blocks finalization until all UI issues resolved
- Uses `bd list --status=open | grep "UI Q:"` to check

**Icon Handling**:

- **Never uses emojis** in HTML mockups
- Uses discovered icon system from research
- Creates beads issue if icon system unclear
- Asks user before adding icons if no system found

**Iteration**:

```bash
# User provides feedback
"Keep the card layout but remove the sidebar"
→ Skill updates mockup-log.md (KEEP/REMOVE)
→ Creates v002 with changes
→ Shows new screenshot

# Show current mockup
"show mockup"
→ Opens HTML in browser, screenshots

# Finalize to design
"finalize"
→ Checks for open UI Q: issues
→ Compiles KEEP decisions into requirements
→ Lists REMOVE decisions as out of scope
```

### Stage 4: Explore Design Options (Optional)

**Command**: `/wb:explore_design`

Facilitated architecture discussion between research and design — explores directions as possibilities and records the decision durably.

**When to use**: research surfaced multiple viable approaches; the change is cross-cutting or introduces a new subsystem; the choice is hard to reverse. Skip for well-scoped fixes or single-approach research.

**Process**:

1. Reads research and prior thoughts/ docs fully
2. Frames the decision space (user confirms)
3. Explores 2–4 distinct directions with trade-offs
4. Converges only on explicit approval (⛔ CHECKPOINT)
5. Records: thoughts/ doc + closed `Decide:` issue (chosen direction and rationale in the close reason)

### Stage 5: Design

**Command**: `/wb:create_design`

Creates architectural design decisions (WHAT and WHY).

**Process**:

1. Reads research, mockup decisions, and any recorded `Decide:` decision
2. Spawns verification agents
3. Presents design options with trade-offs (or confirms the recorded decision when explore_design ran)
4. Interactive discussion
5. Documents approved design

**Structure**:

- Problem statement
- Design approach with rationale
- Technical decisions
- Scope (in/out)
- Success criteria
- Risk analysis
- Rejected alternatives

**Critical**: WHAT and WHY only - never HOW

### Stage 6: Execution Plan

**Command**: `/wb:create_tasks`

Transforms design into detailed phased execution plan.

**Process**:

1. Reads research and design completely
2. Spawns analysis agents:
   - Dependency analysis
   - Test coverage planning
   - Rollback procedures
3. Generates phased plan with embedded tasks

**Beads Integration**:

Creates hierarchical beads issues:

```bash
# Epic for overall project
bd create "[Project Name] Implementation" \
  --type=epic --priority=1

# Phase milestones with dependencies
bd create "Phase 1 Milestone: [Name]" \
  --type=milestone --priority=1 \
  --blocks "[epic-id]"

bd create "Phase 2 Milestone: [Name]" \
  --type=milestone --priority=2 \
  --blocks "[epic-id]" \
  --blocked-by "[phase-1-id]"

# Tasks within phases
bd create "Implement [Component]" \
  --type=task --priority=1 \
  --blocks "[phase-1-milestone-id]"

bd create "Write tests for [Component]" \
  --type=task --priority=1 \
  --blocks "[phase-1-milestone-id]" \
  --blocked-by "[implement-component-id]"
```

**Result**: Dependency chain where:

- Tasks must complete before phase milestones
- Phases must complete before epic
- `bd ready` shows only unblocked work

### Stage 7: Implementation

**Command**: `/wb:implement` (`/wb:implement_inline` to run it in this session)

Implements using TDD with beads tracking.

**Workflow**:

```bash
# 1. Find available work
bd ready
→ Shows tasks with no blockers

# 2. Review task details
bd show [task-id]
→ Full description, dependencies, context

# 3. Claim task
bd update [task-id] --claim

# 4. TDD Cycle
# Red: Write failing test
# Green: Implement minimum code
# Refactor: Clean up while tests pass

# 5. Complete task
bd close [task-id] --reason "Implemented X, tests passing"

# 6. Find next task
bd ready
→ Shows newly unblocked tasks
```

**Phase Checkpoints**:

After completing all phase tasks:

```bash
# Check phase milestone
bd show [phase-milestone-id]
→ Shows remaining blockers

# When all tasks done
bd close [phase-milestone-id] --reason "Phase 1 complete: all tasks done, tests passing"

# Next phase unblocks
bd ready
→ Shows Phase 2 tasks
```

**Critical Rules**:

- ZERO SCOPE CREEP - only implement tasks from tasks.md
- Follow TDD cycle strictly
- Respect phase boundaries
- Stop at checkpoints for human verification

### Stage 8: Validation

**Command**: `/wb:validate_execution`

Validates implementation matches plan.

**Process**:

1. Spawns validation agents
2. Compares actual vs planned implementation
3. Identifies deviations
4. Generates comprehensive report

**Checks**:

- All tasks completed
- Success criteria met
- Test coverage adequate
- Documentation updated
- No unintended changes

### Stage 9: Status Updates

**Command**: `/wb:update_status`

Syncs status across all files based on actual progress.

**Process**:

1. Reads ALL files fully
2. Reads beads state (source of truth)
3. Determines actual state
4. Proposes updates
5. Applies consistently

**Status Progressions**:

```
research.md: draft → in-progress → complete
design.md: draft → ready → implementing → complete
tasks.md: not-started → in-progress → complete
```

### Handoff (Multi-Session)

**Commands**: `/wb:create_handoff`, `/wb:resume_handoff`

**Create Handoff**:

```bash
/wb:create_handoff docs/plans/2025-01-15-TICKET-123-feature
```

Captures:

- Current progress and phase
- Critical learnings not in docs
- Problems solved
- Active blockers
- **Open beads issues** with context
- Next steps
- Git state

**Resume Handoff**:

```bash
/wb:resume_handoff docs/plans/2025-01-15-TICKET-123-feature/handoff-2025-01-15.md
```

Restores:

- Full context
- Learnings and patterns
- Continues from exact point
- Applies discovered solutions

## Beads Integration

### Overview

Beads provides persistent task tracking in a local Dolt database that survives context compaction and session changes.

### Beads persistence

Three tiers, not modes (the full statement is [beads-mode.md](../plugin/docs/reference/beads-mode.md)):

1. **Local**: the embedded Dolt database under `.beads/` is the source of truth and is never committed
2. **Cross-machine**: a Dolt remote (`bd dolt push` / `bd dolt pull`) or `bd backup` (`bd backup init <url>`, `bd backup sync`)
3. **Interchange**: `bd export` writes `issues.jsonl` for viewers only (`export.auto` is off by default)

**Setup rule**: `bd init --stealth` in any repository with collaborators who do not use beads; it writes the shared `.git/info/exclude`, so nothing appears in the team's tree on any branch or worktree. Plain `bd init` only for a repository you own outright, still with `.beads/` excluded.

**Session start**: every stage that reads a plan's beads IDs runs `bd context`, `bd show <beads_epic>`, and `bd stats` first and stops if the epic does not resolve (a missing `.beads/metadata.json` opens an empty default database silently).

### Command-Specific Usage

**`/wb:create_mockup`**:

```bash
# Creates UI questions
bd create "UI Q: Which color for primary button?" \
  --type=task --priority=2 \
  -d "From mockup v001. Blocks: finalization"

# Creates assumptions
bd create "UI Assumption: Using 2-column layout" \
  --type=task --priority=3 \
  -d "Assuming desktop-first. If wrong: need responsive design"
```

**`/wb:create_tasks`**:

```bash
# Creates epic
bd create "Add Authentication System" --type=epic

# Creates phase milestones with dependencies
bd create "Phase 1: Core Auth" \
  --type=milestone \
  --blocks "[epic-id]"

# Creates tasks with dependencies
bd create "Implement JWT middleware" \
  --type=task \
  --blocks "[phase-1-id]"
```

**`/wb:implement`** (and `/wb:implement_inline`):

```bash
# Find work
bd ready

# Claim it
bd update [task-id] --claim

# Complete it
bd close [task-id] --reason "Done"

# end of session: bd dolt push only if a Dolt remote is configured
```

**`mockup-iteration` skill**:

```bash
# Before finalization
bd list --status=open | grep -E "UI Q:|UI Assumption:"

# If open issues exist → can't finalize
# Must resolve or close as "deferred"
```

### Session Protocol

**At session end**:

```bash
# 1. Close completed tasks
bd close [task-id] --reason "..."

# 2. Hygiene (bd doctor is server-mode only in 1.1.0; embedded mode: run these two)
bd stale
bd orphans

# 3. Persist only if a Dolt remote is configured
bd dolt push
```

**At session start**:

```bash
# 1. Sanity check: the right database is open
bd context
bd show <beads_epic>

# 2. Check available work
bd ready

# 3. Review details
bd show [task-id]
```

## Mockup Workflow

### When to Use

Use `/wb:create_mockup` for:

- New UI features
- UI redesigns
- Complex layouts
- Features requiring visual validation

Skip for:

- Backend-only features
- API changes
- Simple text changes

### Research Phase

Spawns 5 parallel agents:

1. **Layout Patterns**: Grid systems, flex patterns, containers, breakpoints
2. **Component Library**: Buttons, forms, cards, modals, naming conventions
3. **Styling Approach**: Tailwind vs CSS Modules vs styled-components, tokens, theme
4. **Similar Features**: Existing panels/modals for reference
5. **Icon System**: Font Awesome, Material Icons, Heroicons, SVG sprites, custom, or none

### Icon System Research

**What it finds**:

- Library name and version
- Where icons imported/defined (file:line)
- Usage pattern (`<i class="fa-solid fa-save">` vs `<Icon name="save">`)
- Sizing conventions
- Color conventions
- Examples with file:line references

**If no system found**:

- Documents "None - text only"
- Creates beads issue if icons needed: `bd create "UI Q: Icon system?"`
- Never defaults to emojis

### Mockup Creation

**ASCII Structure** (mockup.md):

- Quick layout discussion
- Component specifications
- State documentation
- Interaction flows

**HTML Mockup** (mockup.html):

- Imports app's actual stylesheets
- Uses component HTML from research (file:line)
- Applies actual CSS classes (no placeholders)
- Follows icon system from research
- Standalone - opens directly in browser

**Example HTML**:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
  <header class="bg-white shadow-md px-6 py-4">
    <h1 class="text-2xl font-bold text-gray-900">
      <i class="fa-solid fa-cog mr-2"></i>
      Settings
    </h1>
  </header>

  <main class="container mx-auto px-6 py-8">
    <div class="bg-white rounded-lg shadow p-6">
      <!-- Real component HTML from research -->
    </div>
  </main>
</body>
</html>
```

### Visual Validation

After creating HTML:

```javascript
// Navigate to mockup
mcp__plugin_playwright_playwright__browser_navigate({
  url: "file:///absolute/path/to/mockup.html"
})

// Screenshot
mcp__plugin_playwright_playwright__browser_take_screenshot({
  filename: "preview-v001.png",
  fullPage: true
})
```

Shows screenshot to user for validation.

### Iteration

**Feedback Classification**:

- **KEEP**: Confirmed requirement → add to mockup-log.md "Confirmed"
- **REMOVE**: Rejected idea → add to "Rejected" with reason
- **CHANGE**: Modification needed → note for next version
- **QUESTION**: Needs clarification → `bd create "UI Q: ..."`
- **ASSUMPTION**: Unvalidated belief → `bd create "UI Assumption: ..."`

**Version Creation**:

```bash
# User: "Keep header but make sticky, remove sidebar"

# Skill updates mockup-log.md:
## Confirmed (KEEP)
- Header layout - confirmed 2025-01-15 - "Keep header"
- Sticky positioning - confirmed 2025-01-15 - "make sticky"

## Rejected (REMOVE)
- Sidebar navigation - rejected 2025-01-15 - "remove sidebar"

# Creates v002:
mockups/v002/
├── mockup.md          # Updated ASCII
├── mockup.html        # Updated HTML
├── preview-v002.png   # New screenshot
└── decisions.md       # Delta from v001
```

### Finalization

Before finalizing to design.md:

```bash
# Check for open issues
bd list --status=open | grep -E "UI Q:|UI Assumption:"
```

**If open issues exist**:

- Must resolve questions
- Must validate assumptions
- Or close as "deferred to implementation"

**After all resolved**:

- Compile all KEEP decisions → requirements
- List all REMOVE decisions → out of scope
- Export to design.md section:

```markdown
## UI Design: Settings Panel

### Requirements (from mockup iteration)

_Confirmed through 3 mockup iterations_

1. Sticky header with icon - v001
2. Two-column layout on desktop - v002
3. Icon system: Font Awesome 6.4.0 - v001

### Out of Scope

_Explicitly excluded during mockup iteration_

1. Sidebar navigation - removed v002, reason: "cluttered UI"
2. Dark mode toggle - removed v003, reason: "phase 2 feature"

### Final Mockup Reference

- Structure: `mockups/v003/mockup.md`
- Visual: `mockups/v003/mockup.html`
- Screenshot: `mockups/v003/preview-v003.png`
```

## Core Philosophy

### Document, Don't Judge

Research describes what EXISTS, not what should be changed.

**Why**:

- Clear understanding of current state
- Unbiased analysis
- Better planning decisions
- Reduced assumptions

**Agent Instructions**:

```
You are documenting the codebase as it exists.
DO NOT suggest improvements or identify issues.
Document what IS, not what SHOULD BE.
```

### Explicit Barriers

Synchronization points prevent rushing ahead.

**Types**:

- **⛔ BARRIER 1**: After file reading - full context required
- **⛔ BARRIER 2**: After agent spawning - wait for ALL
- **⛔ BARRIER 3**: Before writing - no placeholders allowed
- **⛔ CHECKPOINT**: Between phases - human verification required

**Why**:

- Prevents incomplete context
- Ensures parallel work completes
- Validates before proceeding
- Catches issues early

### Dual Verification

Separate automated and manual checks.

**Automated** (CI can run):

- Unit tests
- Integration tests
- Linting
- Build verification

**Manual** (Human required):

- UI functionality
- UX validation
- Performance testing
- Edge case verification
- Visual appearance

### Zero Scope Creep

Tasks come ONLY from plans.

**Why**:

- Predictable delivery
- Clear expectations
- Controlled changes
- Traceable work
- Measurable progress

**Enforcement**:

- Beads issues created from plan only
- No ad-hoc task creation during implementation
- Changes require design update → new execution plan

## Best Practices

### Research Phase

- Read files FULLY (no limit/offset)
- Document objectively
- Include all file:line references
- Find existing patterns
- Note how components interact
- Never suggest improvements

### Mockup Phase

- Research icon system first
- Use app's actual styles
- Never use emojis in HTML
- Create beads issues for unknowns
- Screenshot after each version
- Resolve all UI Q: before finalizing

### Planning Phase

- Discuss before writing
- Define out of scope
- Make success criteria measurable
- Phase for incremental value
- Include rollback procedures

### Implementation Phase

- Use `bd ready` to find work
- Claim with `bd update`
- Follow TDD cycle strictly
- Close with `bd close`
- Respect phase boundaries
- Stop at checkpoints

### Session Management

**At session end**:

- Close completed beads issues
- Run `bd doctor`; push to the Dolt remote only if one is configured
- Create handoff if needed

**At session start**:

- Run the sanity check: `bd context`, `bd show <beads_epic>`, `bd stats`
- Check `bd ready`
- Review `bd show [id]`
- Resume from handoff if exists

## Troubleshooting

### Beads Issues

**"beads not initialized"**:

```bash
bd init --stealth   # (bd init only for a repository you own outright)
```

**"database locked"**:

- Wait and retry
- Check for stale processes

**"issue not found"**:

```bash
bd list   # Find correct ID
```

### Mockup Issues

**No icon system found**:

- Document as "None - text only"
- Create beads issue if icons needed
- Ask user for direction

**HTML mockup not rendering**:

- Check stylesheet imports
- Verify paths are correct
- Use CDN links for testing

**Screenshot not showing**:

- Check Playwright is installed
- Verify file path is absolute
- Check browser can access file

### Agent Issues

**Agents not finding files**:

- Be specific about directories
- Check file patterns in prompts
- Verify files exist

**Placeholder values in output**:

- ⛔ BARRIER 3 violation
- Re-run with complete context
- Never proceed with placeholders

### Status Issues

**Status progression blocked**:

- Verify all tasks complete
- Check beads state: `bd list`
- Ensure checkpoints passed

**Inconsistent status across files**:

- Run `/wb:update_status`
- Let it sync from beads (source of truth)

## Additional Resources

- [Commands Reference](commands-reference.md) - Detailed command documentation
- [Skills Guide](claude-code-skills-guide.md) - Skills documentation
- [Hooks README](../.claude/hooks/README.md) - Hook setup and beads mode detection
