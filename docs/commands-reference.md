# Project Documentation Commands

Claude Code slash commands for managing project documentation, research, planning, and task tracking.

## Core Philosophy

### 🎯 Guiding Principles

**Document, Don't Judge**: Research describes what EXISTS, not what should be changed

**Interactive Planning**: Collaborate through discussion before writing plans

**Explicit Barriers**: Clear synchronization points prevent rushing ahead

**Verification Gates**: Automated AND manual checks between phases

**Zero Scope Creep**: Tasks come from plans only - no additions

**Complete Context**: Read plan documents and relied-on files in full before analysis (if Read returns a partial view of a large file, page through with offset/limit)

## Command Workflow

```text
/wb:create_project → /wb:create_research → [/wb:explore_design (optional)] → /wb:create_design → /wb:create_tasks → /wb:implement → /wb:validate_execution
       ↓                    ↓                        ↓                             ↓                    ↓                 ↓                   ↓
  [Structure]          [research.md]          [Decision record]               [design.md]          [tasks.md]      [Implementation]     [Validation]
                            ↓                        ↓                             ↓                    ↓                 ↓                   ↓
                      [What EXISTS]             [Directions]                  [WHAT & WHY]        [HOW to do it]       [TDD cycle]        [Verification]

/wb:implement_inline runs the same plan inline in this session, as an alternative to /wb:implement.
/wb:create_mockup is an optional UI side-branch after research (mockups feed design).

For multi-session work:
[Session 1] → /wb:create_handoff → [Session 2] → /wb:resume_handoff → [Continue work]
```

### Workflow Stages

1. **Initialize**: Create project structure with metadata
2. **Research**: Document codebase as it EXISTS today (facts only)
3. **Mockup** (optional): Research UI patterns and create interactive HTML mockups
4. **Explore** (optional): Discuss architecture directions and record the decision
5. **Design**: Decide WHAT to build and WHY (architectural decisions)
6. **Execution**: Plan HOW to implement (phased plan with tasks)
7. **Implement**: Execute using TDD with checkpoints
8. **Validate**: Verify implementation matches plan
9. **Handoff** (optional): Transfer context between sessions

### Beads Integration (Required)

These commands require [beads](https://github.com/steveyegge/beads):

```bash
# Initialize
bd init --stealth   # any repository with collaborators who do not use beads (writes the shared .git/info/exclude)
bd init             # only a repository you own outright; .beads/ is still excluded, never committed
```

**How commands use beads**:

- **`/wb:create_mockup`**: Creates `UI Q:` and `UI Assumption:` issues, blocks finalization until resolved
- **`/wb:create_tasks`**: Creates phase milestone and task issues with dependency chains
- **`/wb:implement`** (and `/wb:implement_inline`): Uses `bd ready`/`bd update`/`bd close` to track implementation
- **`/wb:update_status`**: Reads beads state as source of truth for status
- **`/wb:create_handoff`**: Includes open beads issues in handoff context
- **`mockup-iteration` skill**: Creates UI questions, validates all resolved before finalization

**Beads workflow**:

```bash
bd ready                                    # Find available work (no blockers)
bd show [id]                                # Review task details
bd update [id] --claim                      # Claim task
# ... implement ...
bd close [id] --reason "..."                # Complete task
# end of session: bd dolt push only if a Dolt remote is configured (see plugin/docs/reference/beads-mode.md)
```

**Persistence**: the local Dolt database under `.beads/` is the source of truth and is never committed; see `plugin/docs/reference/beads-mode.md` for the three tiers and the session-start sanity check.

**Note**: For markdown-only tracking, use the `v1.0.0` tag.

---

## Commands Reference

### `/wb:create_project` - Initialize Project Documentation

Creates a comprehensive documentation structure with Git metadata tracking.

**Usage**:

```bash
/wb:create_project my-feature
/wb:create_project my-feature docs/projects
/wb:create_project my-feature docs/projects LINEAR-789
```

**Creates**:

```
docs/plans/2025-10-07-LINEAR-789-my-feature/
├── README.md     # Navigation and overview
├── research.md   # Research documentation (with metadata)
├── design.md     # Design decisions (with metadata)
└── tasks.md      # Execution plan with tasks (with metadata)
```

**Key Features**:

- Captures Git metadata (commit, branch, repo)
- Creates timestamped directories
- Initializes with rich frontmatter
- Sets up workflow sequence
- Creates initial planning tasks

---

### `/wb:create_research` - Document Research Findings

Conducts comprehensive research with parallel agents and saves detailed findings.

**Usage**:

```bash
/wb:create_research docs/plans/2025-10-07-my-feature
> Research how we handle API rate limiting and error recovery
```

**Critical Behaviors**:

- **⛔ BARRIER 1**: Mentioned files are read in full first, because analysis on partial context produces placeholders
- **⛔ BARRIER 2**: Waits until every spawned agent has returned (subagents run in the background, so it waits for a completion notification from each), because synthesis on a partial set misses what the missing report would have changed
- **⛔ BARRIER 3**: No placeholder values in output, because a placeholder that ships becomes a task nobody can execute

**Agent Strategy**:

```
Code Locator Agents → Find WHERE components live
Code Analyzer Agents → Understand HOW code works
Pattern Finder Agents → Find similar implementations
```

**All agents are told**: "Document what IS, not what SHOULD BE"

**Creates**: Structured research.md with:

- Research question and summary
- Detailed findings with `file.ext:line` references
- Architecture documentation (patterns found)
- Code references quick list
- Similar implementations
- Open questions
- Follow-up research support

---

### `/wb:create_mockup` - Research UI Patterns and Create Mockups

Researches existing UI patterns, styles, and layouts, then creates versioned mockups with HTML and visual validation.

**Usage**:

```bash
/wb:create_mockup docs/plans/2025-10-07-my-feature "user settings panel"
```

**Research Process**:

Spawns parallel agents to document what EXISTS:

```
Agent 1: Layout Patterns    → Grid, flex, containers, breakpoints
Agent 2: Component Library  → Buttons, forms, cards, modals
Agent 3: Styling Approach   → CSS modules, Tailwind, tokens
Agent 4: Similar Features   → Existing panels/modals for reference
Agent 5: Icon System        → Font Awesome, Material Icons, SVG sprites, or none
```

**Interactive Process**:

1. **Research existing UI** (parallel agents)
2. **Ask clarifying questions** about the feature
3. **Create ASCII structure** (mockup.md)
4. **Create HTML mockup** (mockup.html) with app's actual styles
5. **Visual validation** with Playwright screenshots
6. **Iterate** based on feedback

**Creates**:

```
docs/plans/2025-10-07-my-feature/mockups/
├── mockup-log.md              # Decision log across versions
└── v001/
    ├── mockup.md              # ASCII structure and specs
    ├── mockup.html            # Working HTML with app styles
    ├── preview-v001.png       # Visual screenshot
    └── decisions.md           # Rationale for this version
```

**Key Features**:

- **Research-driven**: Uses app's actual styles, components, and icon system
- **Visual validation**: Playwright screenshots show real appearance
- **Versioned iteration**: Each feedback cycle creates new version
- **Icon handling**: Uses discovered icon library (NOT emojis)
- **Decision tracking**: KEEP/REMOVE/CHANGE captured with rationale
- **Beads integration**: Creates UI questions as beads issues

**Iteration with mockup-iteration skill**:

After initial mockup, provide feedback naturally:

```
"Keep the card layout but remove the sidebar"
→ Updates mockup-log.md, creates v002 with changes

"show mockup"
→ Opens HTML in browser, shows screenshot

"next version"
→ Creates new version with all accumulated feedback
```

**Icon System Handling**:

- **Researches app's icon library** (Font Awesome, Material Icons, Heroicons, SVG, custom)
- **Never defaults to emojis** in HTML mockups
- **Uses actual icon patterns** from research (classes, components)
- **Creates beads issue** if icons needed but system unclear
- **Asks before adding** icons if no system found

**Critical Rules**:

- All CSS classes from research (no placeholders)
- HTML can be opened directly in browser
- Screenshot after each version for visual validation
- Icon system matches app conventions
- Decision fidelity preserved across iterations

**Workflow Example**:

```bash
# 1. Create initial mockup
/wb:create_mockup docs/plans/2025-10-07-feature "settings panel"
> Research finds: Tailwind, Font Awesome icons, existing settings.jsx
> Creates ASCII + HTML mockup with actual styles
> Shows screenshot

# 2. Iterate with feedback
"Keep the two-column layout but make the buttons larger"
> Updates mockup-log.md
> Creates v002 with changes
> Shows new screenshot

# 3. Finalize to design
"finalize"
> Checks for open UI questions (beads issues)
> Generates design.md section from confirmed requirements
```

**Integration**:

- Feeds into `/wb:create_design` with validated UI requirements
- Mockup files referenced in design.md
- Screenshots included in documentation
- Decision log informs architectural choices

---

### `/wb:create_design` - Create Design Document

Creates architectural design decisions based on validated research. Focuses on WHAT to build and WHY.

**Usage**:

```bash
/wb:create_design docs/plans/2025-10-07-my-feature
```

**Interactive Process**:

1. **Reads research** and spawns verification agents
2. **Analyzes patterns** and integration points
3. **Presents design options** with trade-offs
4. **Discusses decisions** interactively
5. **Documents approved design** with rationale

**Design Structure**:

- Problem statement and success metrics
- Design approach with rationale
- Technical decisions (architecture, data model, integrations)
- Scope definition (in/out of scope)
- Success criteria (functional and non-functional)
- Risk analysis
- Rejected alternatives

**Critical Rules**:

- **WHAT and WHY only** - never HOW
- NO implementation sequences or code changes
- Explicit decisions with rationale
- Clear scope boundaries
- Measurable success criteria

---

### `/wb:create_tasks` - Create Execution Plan

Transforms approved design into detailed phased execution plan with embedded tasks.

**Usage**:

```bash
/wb:create_tasks docs/plans/2025-10-07-my-feature
```

**Planning Process**:

1. **Reads research and design** completely
2. **Spawns analysis agents** for dependencies, testing, rollback
3. **Determines implementation strategy** from agent findings
4. **Generates phased plan** with specific tasks

**Execution Plan Structure**:

```markdown
## Phase 1: [Descriptive Name]

### Changes Required
- Specific file modifications with line numbers
- Before/after code examples
- Integration points

### Tasks
- Setup tasks (directories, dependencies, config)
- Implementation tasks (specific components)
- Testing tasks (unit, integration)
- Integration tasks (connections)

### Success Criteria
#### Automated Verification
- Unit tests pass
- Integration tests pass
- Build succeeds

#### Manual Verification
- Feature works as designed
- No regressions

### ⛔ CHECKPOINT: Phase 1 Complete
```

The markdown documents the plan. Live status is tracked in beads: each task becomes a beads issue under a phase milestone, with dependencies, and progress is read from `bd ready` / `bd update <id> --claim` / `bd close <id>`, never from checkboxes.

**Features**:

- Dependency-based phase ordering
- Specific code changes with file:line references
- Comprehensive test coverage from agent analysis
- Rollback procedures for each phase
- Quick test commands per phase
- Progress tracked in beads
- Modified files tracking

---

### `/wb:implement` - Implement with coordinated workers

Implements the plan by coordinating fresh-context worker agents, one per task, each verified; the default execution path. Workers follow Test-Driven Development (Red → Green → Refactor).

**Usage**:

```bash
/wb:implement docs/plans/2025-10-07-my-feature
```

#### `/wb:implement_inline`

The same plan, coded inline by this session with TDD. Use when the work should run on the session model. `/wb:implement_coordinated` and `/wb:implement_tasks` remain as deprecated aliases through 3.x (removed at 4.0.0).

**TDD Process**:

1. **Red**: Write failing test for next task
2. **Green**: Implement minimum code to pass
3. **Refactor**: Clean up while tests pass
4. **Verify**: Run phase verification
5. **Checkpoint**: Get human approval

**Critical Rules**:

- **ZERO SCOPE CREEP** - only implement what's in tasks.md
- Follow TDD cycle strictly
- Respect phase boundaries
- Stop at checkpoints for human verification
- Claim and close each task in beads (`bd update <id> --claim`, `bd close <id>`); do not track status with markdown checkboxes

---

### `/wb:validate_execution` - Validate Implementation

Validates that execution plan was correctly implemented. Run after implementation is complete.

**Usage**:

```bash
/wb:validate_execution docs/plans/2025-10-07-my-feature
```

**Validation Process**:

1. **Spawns validation agents** for code changes, testing, success criteria, documentation
2. **Compares actual vs planned** implementation
3. **Identifies deviations** and missing items
4. **Generates comprehensive report**

**Validation Report**:

- Implementation completeness
- Success criteria verification
- Test coverage analysis
- Deviations from plan
- Recommendations

---

### `/wb:create_handoff` - Create Session Handoff

Creates comprehensive handoff document for session transfer.

**Usage**:

```bash
/wb:create_handoff docs/plans/2025-10-07-my-feature
```

**Captures**:

- Current progress and phase
- Critical learnings not in formal docs
- Problems solved
- Active blockers
- Next steps with specific recommendations
- Git state and uncommitted changes

**When to use**: session ending with work incomplete, switching models, blocked and needing different expertise, after a significant milestone or discovery — and when a phase has already needed `/compact` once and is heading for another: hand off instead; a second compaction compounds summary drift

---

### `/wb:resume_handoff` - Resume from Handoff

Resumes work from a handoff document created in previous session.

**Usage**:

```bash
/wb:resume_handoff docs/plans/2025-10-07-my-feature/handoff-2025-01-08-14-30.md
```

**Restoration**:

- Reads handoff and project documentation
- Restores context and learnings
- Applies discovered patterns
- Continues from exact stopping point
- Prevents repeating solved problems

---

### `/wb:update_status` - Update Project Status

Intelligently updates status across all documentation files based on actual progress.

**Usage**:

```bash
/wb:update_status docs/plans/2025-10-07-my-feature
```

**What It Does**:

1. **Reads all files in full** - Analyzes research.md, design.md, tasks.md
2. **Determines actual state** - Checks content, not just frontmatter
3. **Proposes updates** - Shows what will change and why
4. **Applies consistently** - Updates all files atomically
5. **Verifies consistency** - Ensures no conflicting states

**Status Progressions**:

```
research.md: draft → in-progress → complete
design.md: draft → ready → implementing → complete
tasks.md: not-started → in-progress → complete
```

**Smart Detection**:

- Detects completion percentage from closed beads issues
- Identifies current active phase
- Validates status transitions across files
- Prevents invalid state changes
- Updates git metadata for audit trail

**Key Features**:

- No manual status updates needed
- Prevents status regression
- Maintains consistency across all files
- Provides clear transition reasoning
- Cascading updates (plan → tasks)

---

## Critical Implementation Patterns

### 📚 File Reading Protocol

Read plan documents and relied-on files in full, and do it before spawning agents:

```
1. Read mentioned files in full (if Read returns a partial view of a large file, page through with offset/limit)
2. Read BEFORE spawning agents
3. Build context in the main thread first
4. Do not analyze from a partial read
```

### 🚧 Synchronization Barriers

Each real synchronization point is marked once, with a plain-sentence reason:

```
⛔ BARRIER: full context read - analysis on partial context produces placeholders
⛔ BARRIER: every spawned agent has returned - subagents run in the background, so wait for a completion notification from each
⛔ BARRIER: no placeholder values - a placeholder that ships becomes a task nobody can execute
⛔ CHECKPOINT: human verification between phases - the next phase builds on what a human has accepted
```

### 🤖 Agent Instructions

Every research agent receives:

```
You are documenting the codebase as it exists.
DO NOT suggest improvements or identify issues.
Document what IS, not what SHOULD BE.
```

### ✅ Dual Verification Model

Plans separate verification into:

**Automated** (CI can run):

- Unit tests: `npm test`
- Linting: `make lint`
- Build: `make build`

**Manual** (Human required):

- UI functionality
- Performance validation
- Edge case testing
- User acceptance

---

## Workflow Example

### Complete Project Lifecycle

#### 1. Initialize Project

```bash
/wb:create_project add-auth-middleware docs/projects LINEAR-789
```

Creates timestamped directory with metadata-rich files.

#### 2. Research Codebase

```bash
/wb:create_research docs/projects/2025-10-07-LINEAR-789-add-auth-middleware
> Research current middleware architecture, auth patterns, and session handling
```

Spawns parallel agents, documents findings objectively.

#### 3. Create UI Mockup (Optional - for UI features)

```bash
/wb:create_mockup docs/projects/2025-10-07-LINEAR-789-add-auth-middleware "login form"
```

Researches UI patterns, creates HTML mockup with app styles, iterates with visual feedback.

#### 4. Explore Design Options (Optional - for big architecture decisions)

```bash
/wb:explore_design docs/projects/2025-10-07-LINEAR-789-add-auth-middleware
```

Facilitated architecture discussion: frames the decision, explores 2–4 directions with trade-offs, converges on explicit approval. Records the decision as a closed `Decide:` issue plus a thoughts/ doc. Invoke when research surfaced multiple viable approaches or the choice is hard to reverse; skip for well-scoped fixes.

#### 5. Create Design

```bash
/wb:create_design docs/projects/2025-10-07-LINEAR-789-add-auth-middleware
```

Interactive discussion → Design decisions (WHAT and WHY). Includes UI requirements from mockup if created. Formalizes the recorded decision when explore_design ran.

#### 6. Create Execution Plan

```bash
/wb:create_tasks docs/projects/2025-10-07-LINEAR-789-add-auth-middleware
```

Generates phased plan with specific tasks (HOW to implement).

#### 7. Implement with TDD

```bash
/wb:implement docs/projects/2025-10-07-LINEAR-789-add-auth-middleware
```

Work through the tasks in tasks.md using the TDD cycle. Status lives in beads: find work with `bd ready`, claim it with `bd update <id> --claim`, and finish it with `bd close <id> --reason "..."`.

Progress fields are reconciled by `/wb:update_status` (the sole writer) rather than hand-edited during implementation — running it after each phase keeps frontmatter like this in sync:

```yaml
current_phase: 1
completed_tasks: 8
total_tasks: 24
```

---

## Metadata & Tracking

### Rich Frontmatter

All files include:

```yaml
---
# Basic tracking
project: feature-name
ticket: LINEAR-789
created: 2025-10-07
status: in-progress
last_updated: 2025-10-07

# Git metadata
git_commit: abc123def
git_branch: feature/add-auth
repository: org/repo

# User tracking
researcher: jsmith
planner: jsmith
assignee: jsmith

# Progress metrics
current_phase: 2
total_tasks: 24
completed_tasks: 15
---
```

The progress metrics block is reconciled by `/wb:update_status` alone (sole writer); other skills and checkpoints defer to it rather than hand-editing those fields directly.

### Status Progression

Files move through defined states:

**research.md**: `draft` → `in-progress` → `complete`

**design.md**: `draft` → `ready` → `implementing` → `complete`

**tasks.md**: `not-started` → `in-progress` → `complete`

---

## Configuration & Customization

### Directory Structure

Default: `docs/plans/YYYY-MM-DD-[TICKET-]project-name/`

Customize base directory per command:

```bash
/wb:create_project feature custom/location
```

### Ticket Formats

Flexible ticket support:

- GitHub: `GH-123`
- Jira: `PROJ-456`
- Linear: `ENG-789`
- Custom: `CUSTOM-999`
- None: omit entirely

### Extending Commands

All commands are skills (markdown files) - edit `skills/<name>/SKILL.md` to customize:

```
skills/
├── create_project/SKILL.md    # Structure and metadata
├── create_research/SKILL.md   # Research approach
├── explore_design/SKILL.md    # Architecture discussion (optional)
├── create_design/SKILL.md     # Design decisions (WHAT & WHY)
├── create_tasks/SKILL.md  # Execution plan (HOW)
├── implement/SKILL.md         # Coordinated implementation (default)
├── implement_inline/SKILL.md  # Inline implementation (this session)
├── validate_execution/SKILL.md # Implementation validation
├── create_handoff/SKILL.md    # Session handoff
├── resume_handoff/SKILL.md    # Resume from handoff
└── update_status/SKILL.md     # Status synchronization
```

---

## Best Practices

### Research Phase

- **Read relied-on files in full** before analysis
- **Document objectively** - what IS, not opinions
- **Include all references** - file:line format
- **Find patterns** - conventions in use
- **Note connections** - how components interact

### Planning Phase

- **Discuss before writing** - get alignment
- **Define OUT of scope** - prevent creep
- **Make it measurable** - clear success criteria
- **Phase thoughtfully** - incremental value
- **Include rollback** - safety first

### Task Management

- **Extract everything** - miss no tasks
- **Maintain barriers** - checkpoints matter
- **Track blockers** - with actions/owners
- **Archive weekly** - keep focus
- **Reconcile status** - run `/wb:update_status` (sole writer of progress fields)

### Verification Strategy

- **Automate what's possible** - CI/CD checks
- **Document manual needs** - human verification
- **Enforce checkpoints** - between phases
- **Require confirmation** - before proceeding

---

## Common Patterns

### Database Changes

1. Schema/migration first
2. Data access layer
3. Business logic
4. API endpoints
5. Client updates

### New Features

1. Research patterns
2. Data model
3. Backend logic
4. API layer
5. UI implementation

### Refactoring

1. Document current
2. Incremental changes
3. Maintain compatibility
4. Migration strategy

---

## Troubleshooting

### Issue: Agents not finding files

**Solution**: Be specific about directories and patterns in agent prompts

### Issue: Plan has open questions

**Solution**: Research more or ask user - never write with unknowns

### Issue: Tasks missing from plan

**Solution**: Re-read tasks.md in full, extract every mentioned task

### Issue: Phases too large

**Solution**: Break into smaller increments with checkpoints

---

## Philosophy Deep Dive

### Why "Document, Don't Judge"?

Research should be **objective documentation** of the current system. Improvements come during planning, not research. This separation ensures:

- Clear understanding of current state
- Unbiased analysis
- Better planning decisions
- Reduced assumptions

### Why Barriers and Checkpoints?

Explicit synchronization prevents:

- Incomplete context
- Racing ahead
- Skipping verification
- Missing dependencies
- Cascading errors

### Why Dual Verification?

Automated checks catch technical issues.
Manual verification catches:

- UX problems
- Performance issues
- Edge cases
- Business logic errors
- Integration issues

### Why No Scope Creep?

Tasks ONLY from plan ensures:

- Predictable delivery
- Clear expectations
- Controlled changes
- Traceable work
- Measurable progress

---

## Credits

Context engineering patterns refined through real-world usage. Incorporates learnings from HumanLayer's command architecture with adaptations for general use.

Commands leverage Claude Code's powerful agent system while maintaining strict behavioral boundaries through careful prompt engineering.

---

## Version

Current version: see `plugin/.claude-plugin/plugin.json`

- Added comprehensive barriers and checkpoints
- Enhanced metadata tracking
- Strengthened agent directives
- Improved verification model
- Added progress tracking features
