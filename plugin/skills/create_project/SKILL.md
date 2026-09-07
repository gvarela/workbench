---
name: create_project
description: Start a new wb project: create docs/plans/<date>-<name>/ with README, research.md, design.md, and tasks.md skeletons and record git metadata. Use when the user wants to plan, scope, or kick off a feature, refactor, or investigation as a tracked project, or asks to set up plan docs. First stage of the workflow; research follows. Takes a project name and optional base directory and ticket.
argument-hint: [project-name] [base-dir] [ticket-ref]
allowed-tools: Read
---

# Initialize Project Documentation

Creates a comprehensive documentation structure for a new project or feature, setting up folders and files for research, planning, and task tracking with proper metadata.

Supporting file: [templates.md](templates.md) — the four initial file templates. Read each when its creation step directs you to.

## Initial Response

This stage needs from you: the goal, what success looks like, and what is out of scope. Project name, base directory, and ticket are the mechanics.

When invoked, check for arguments:

1. **If arguments provided** (e.g., `/create_project auth-refactor docs/plans LINEAR-456`):
   - Parse: `$1` = project-name, `$2` = base-dir, `$3` = ticket-ref
   - Skip prompting and proceed directly to Step 2

2. **If partial arguments** (e.g., `/create_project auth-refactor`):
   - Use provided arguments and prompt only for missing ones

3. **If no arguments**:
   - Prompt for all required information:

   ```
   I'll help you set up comprehensive project documentation. Please provide:
   1. Project name (short, kebab-case preferred, e.g., auth-refactor)
   2. Base directory (default: docs/plans)
   3. Ticket/issue reference (optional, e.g., GH-123, JIRA-456, LINEAR-789)
   4. Intent: the goal in one sentence, what success looks like (two to four observable statements), and non-goals

   I'll create a timestamped project directory with research, design, and task tracking files.
   ```

### Intent

Every project states its intent before any file is written. Three parts, all required:

- **Goal**: one sentence saying what the project is for
- **Success looks like**: two to four observable statements (what a person could see or check when the project has done its job; not numbers, which design refines later)
- **Non-goals**: what this project will not do

Take it from the request when the request carries it. If the prose that invoked this stage (or the arguments) states a goal, an outcome, or a boundary, draft all three parts from it and confirm in one exchange:

```
I read the intent as:
- Goal: [one sentence]
- Success looks like: [two to four statements]
- Non-goals: [list, or "none stated"]
Correct, or what should change?
```

If the request carries none of it, ask for the three parts in one message before proceeding. Do not create the directory or any file while any part is empty; the Intent section is written from the confirmed text, and the amendment list starts empty.

## Process Steps

### Step 1: Parse Arguments

```javascript
// Parse provided arguments
const projectName = $1;  // First argument
const baseDir = $2 || 'docs/plans';  // Second argument with default
const ticketRef = $3 || null;  // Third argument (optional)

// If any required args missing, prompt for them
```

### Step 2: Gather Metadata

Collect system metadata for proper tracking:

```bash
# Git metadata (if in a git repository)
git_commit=$(git rev-parse HEAD 2>/dev/null || echo "not-in-git")
git_branch=$(git branch --show-current 2>/dev/null || echo "not-in-git")
git_remote=$(git remote get-url origin 2>/dev/null || echo "no-remote")

# Extract repository name from remote URL
repo_name=$(echo $git_remote | sed 's/.*[:/]\([^/]*\/[^.]*\).*/\1/')

# System metadata
current_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
current_date_simple=$(date +"%Y-%m-%d")
username=$(whoami)
```

### Step 3: Create Directory Structure

Create the project directory with format:

```
[base-directory]/[YYYY-MM-DD]-[TICKET-][project-name]/
```

Examples:

- `docs/plans/2025-01-08-auth-refactor/`
- `docs/plans/2025-01-08-LINEAR-789-api-migration/`

### Step 4: Create Initial Files with Rich Metadata

Create four foundation files:

**1. README.md** - Navigation hub

Read the "README.md Template" section of [templates.md](templates.md) NOW and create the file from it with all metadata values filled in. Fill the Intent section from the confirmed intent; two to four Success statements; the Amendments list starts with its placeholder line.

**2. research.md** - Research documentation

Read the "research.md Template" section of [templates.md](templates.md) NOW and create the file from it with all metadata values filled in.

**3. design.md** - Design decisions

Read the "design.md Template" section of [templates.md](templates.md) NOW and create the file from it with all metadata values filled in.

**4. tasks.md** - Task tracking

Read the "tasks.md Template" section of [templates.md](templates.md) NOW and create the file from it with all metadata values filled in.

**⛔ BARRIER 1**: Ensure all files are created with proper frontmatter before proceeding

### Step 5: Confirm Creation

Present the created structure:

```
✅ Project documentation initialized successfully!

📁 Created at: [full-path-to-directory]

📄 Files created:
├── README.md      - Project overview and navigation
├── research.md    - Research documentation (status: draft)
├── design.md      - Design decisions (status: draft)
└── tasks.md       - Execution plan (1/4 tasks complete)

📊 Metadata captured:
- Git commit: [commit-hash]
- Branch: [branch-name]
- Repository: [repo-name]
- Created by: [username]
- Timestamp: [ISO-8601]

🎯 Intent recorded:
- Goal: [goal sentence]
- Success looks like: [statement 1]; [statement 2]; ...
- Non-goals: [list]

🔄 Next Steps:

1. Research the codebase:
   /create_research [directory]

2. After research, create design:
   /create_design [directory]

3. Then generate execution plan:
   /create_tasks [directory]

4. Implement (coordinated workers; /implement_inline runs it in this session):
   /implement [directory]

Ready to begin research phase!
```

## Important Notes

### Argument Usage

- `$1` - Project name (required if using arguments)
- `$2` - Base directory (optional, defaults to docs/plans)
- `$3` - Ticket reference (optional)
- `$ARGUMENTS` - All arguments as a single string
- Intent is never an argument; it comes from the invoking prose or one question, and is confirmed before files are written

### Status Progression

Files progress through defined states:

- `research.md`: draft → in-progress → complete
- `design.md`: draft → ready → implementing → complete
- `tasks.md`: not-started → in-progress → complete

### Synchronization Points

Commands use explicit barriers:

1. **⛔ BARRIER 1**: After creating all files
2. **Final Confirmation**: Present complete structure

## Error Handling

Check for and handle:

- Directory already exists → Suggest different name or confirm overwrite
- Invalid project name → Request kebab-case format
- Git not available → Use placeholder values
- No write permissions → Suggest different location
