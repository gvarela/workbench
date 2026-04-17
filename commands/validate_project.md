---
description: Validate project documentation follows wb workflow correctly
argument-hint: [project-directory]
---

# Validate Project

Validates that a project's documentation structure follows the wb workflow correctly. Identifies gaps, disconnects, and inconsistencies in the documentation and beads tracking.

## Initial Response

When invoked, check for arguments:

1. **If directory provided** (e.g., `/wb:validate_project docs/plans/2025-01-08-my-project/`):
   - Use `$1` as the project directory
   - Begin validation immediately

2. **If no arguments**:

   ```
   I'll validate your project documentation. Please provide:
   1. Path to the project documentation directory (e.g., docs/plans/2025-01-08-my-project/)

   I'll check for:
   - File structure completeness
   - Frontmatter validity
   - Beads integration correctness
   - Status consistency
   - Content gaps and placeholders
   ```

## Validation Checklist

The command validates the following aspects:

### 1. File Structure
- ✅ research.md exists
- ✅ design.md exists
- ✅ tasks.md exists
- ⚠️ Optional: handoff.md exists (if session transfer occurred)
- ⚠️ Optional: mockup-log.md in mockups/ (if mockup workflow used)

### 2. Frontmatter Completeness
For each file (research.md, design.md, tasks.md):
- ✅ Has valid YAML frontmatter
- ✅ Required fields present: `project`, `created`, `status`, `last_updated`
- ✅ Git metadata present: `git_commit`, `git_branch`
- ⚠️ Optional fields: `ticket`, `repository`, `researcher`, `planner`, `assignee`

### 3. Beads Integration
- ✅ Beads is initialized (`bd doctor` succeeds)
- ✅ tasks.md has `beads_epic` in frontmatter
- ✅ tasks.md has `beads_phases` in frontmatter
- ✅ tasks.md has `beads_tasks` in frontmatter
- ✅ All beads IDs in frontmatter exist (`bd show [id]` succeeds)
- ✅ No orphaned beads issues (beads exist that aren't in frontmatter)

### 4. Status Consistency
- ✅ research.md status is valid: `draft`, `in-progress`, or `complete`
- ✅ design.md status is valid: `draft`, `ready`, `implementing`, or `complete`
- ✅ tasks.md status is valid: `not-started`, `in-progress`, or `complete`
- ✅ Status progression is logical:
  - Cannot have design `ready` if research is `draft`
  - Cannot have tasks `in-progress` if design is `draft`
  - Cannot have design `complete` if tasks is not `complete`
- ✅ All files have same `last_updated` date (or close)

### 5. Content Completeness
- ✅ No placeholder text like `[To be added]`, `[TBD]`, `[TODO]`
- ✅ research.md has findings sections populated
- ✅ design.md has design decisions documented
- ✅ tasks.md has phases with tasks defined
- ✅ Success criteria are specific, not generic

### 6. Beads State Alignment
- ✅ Beads epic exists and is open (or closed if project complete)
- ✅ Phase milestone issues exist for each phase
- ✅ Task issues exist for all tasks listed in `beads_tasks`
- ✅ Beads issue status aligns with tasks.md status:
  - If tasks.md status is `complete`, all beads issues should be closed
  - If tasks.md status is `in-progress`, some beads issues should be in_progress or closed
- ✅ Beads dependencies are set up correctly (phases depend on previous phases)

### 7. Dependencies
- ✅ design.md references research.md in `depends_on`
- ✅ tasks.md references both research.md and design.md in `depends_on`
- ✅ Dependency chain is complete: research → design → tasks

### 8. Cross-File Consistency
- ✅ Project names match across all files
- ✅ Ticket IDs match (if present)
- ✅ Git metadata is consistent
- ✅ Current phase in tasks.md makes sense given progress

## Validation Process

### Step 1: Read All Documentation

**⛔ BARRIER 1: Read ALL files FULLY - no shortcuts**

```javascript
const projectDir = $1 || /* prompt for it */;

const files = {
  research: `${projectDir}/research.md`,
  design: `${projectDir}/design.md`,
  tasks: `${projectDir}/tasks.md`,
  handoff: `${projectDir}/handoff.md`  // optional
};
```

1. **Check directory exists**:
   ```bash
   ls ${projectDir}
   ```

2. **Read all required files**:
   - Read research.md FULLY
   - Read design.md FULLY
   - Read tasks.md FULLY
   - Read handoff.md if exists

3. **Parse frontmatter** from each file

**think deeply about what you're seeing**

### Step 2: Validate Beads State

Check beads integration and state:

```bash
# Verify beads is initialized
bd doctor

# Check and validate beads mode (set by SessionStart hook)
if [ "$BEADS_MODE" = "stealth" ]; then
  echo "📍 Stealth mode detected"

  # Validate stealth mode setup
  if grep -q "^\.beads/" .git/info/exclude 2>/dev/null; then
    echo "✅ Stealth mode correctly configured (.beads/ in .git/info/exclude)"
  else
    echo "⚠️  WARNING: .beads/ is gitignored but not in .git/info/exclude"
    echo "   This might be via .gitignore (committed) instead of stealth mode"
    echo "   Run 'bd init --stealth' to properly configure stealth mode"
  fi
else
  echo "📍 Git mode detected"

  # Validate git mode setup
  if git ls-files .beads/issues.jsonl >/dev/null 2>&1; then
    echo "✅ Git mode correctly configured (.beads/ tracked in git)"
  else
    echo "⚠️  WARNING: .beads/ exists but not tracked in git"
    echo "   Either add .beads/ to git OR switch to stealth mode"
  fi
fi

# Check beads stats
bd stats

# Get all beads issues
bd list

# Check specific issues from frontmatter
bd show [epic-id]
bd show [phase-milestone-id]
bd show [task-id]
```

Extract beads IDs from tasks.md frontmatter:
- `beads_epic`
- `beads_phases.*`
- `beads_tasks.*`

For each ID, verify it exists in beads.

### Step 3: Run Validation Checks

Run all checks from the checklist above. Track:
- ✅ **Pass**: Check succeeded
- ⚠️ **Warning**: Non-critical issue, should fix
- ❌ **Error**: Critical issue, must fix

Organize findings by category:
1. Critical Errors (must fix)
2. Warnings (should fix)
3. Passed Checks (all good)

### Step 4: Report Findings

Present a comprehensive report:

```
# Project Validation Report

**Project**: [project-name]
**Location**: [project-dir]
**Validated**: [YYYY-MM-DD HH:MM]

## Summary

- ✅ [X] checks passed
- ⚠️ [Y] warnings found
- ❌ [Z] critical errors found

**Overall Status**: [PASS / PASS WITH WARNINGS / FAIL]

---

## Critical Errors ❌

These MUST be fixed for the project to follow wb workflow correctly:

### 1. Missing Beads Epic
**File**: tasks.md frontmatter
**Issue**: `beads_epic` field is missing
**Impact**: No way to track project-level work in beads
**Fix**: Run `/wb:create_execution` to set up beads tracking

### 2. Status Inconsistency
**Files**: design.md (status: ready), research.md (status: draft)
**Issue**: Design cannot be ready if research is still draft
**Impact**: Violates workflow progression rules
**Fix**: Complete research first OR set design back to draft

[... more critical errors ...]

---

## Warnings ⚠️

These should be fixed but don't block workflow:

### 1. Missing Git Metadata
**File**: research.md
**Issue**: `git_commit` and `git_branch` fields are missing
**Impact**: Can't track when research was done or what code state it reflects
**Fix**: Run `/wb:update_status` to update metadata

### 2. Placeholder Content
**File**: design.md, line 45
**Issue**: Contains "[To be added]" placeholder text
**Impact**: Incomplete design documentation
**Fix**: Document the design decision or remove the section

[... more warnings ...]

---

## Passed Checks ✅

These aspects are correctly configured:

- ✅ All required files exist
- ✅ Frontmatter is valid YAML
- ✅ Required frontmatter fields present
- ✅ Beads is initialized and working
- ✅ All beads IDs in frontmatter exist
- ✅ Status progression is logical
- ✅ Dependencies are documented
- ✅ Project names are consistent

---

## Recommendations

Based on the validation results:

1. **Immediate Actions** (critical errors):
   - [Specific action 1]
   - [Specific action 2]

2. **Soon** (warnings):
   - [Specific action 1]
   - [Specific action 2]

3. **Optional Improvements**:
   - Add `ticket` field to frontmatter for issue tracking
   - Add `repository` field for GitHub integration
   - Run `/wb:update_status` to sync all metadata

---

## Validation Details

**Files Checked**:
- research.md: [status] (last_updated: [date])
- design.md: [status] (last_updated: [date])
- tasks.md: [status] (last_updated: [date])

**Beads State**:
- Epic: [id] ([status])
- Phase milestones: [count] ([open/closed])
- Task issues: [count] ([open/in_progress/closed])

**Next Command Suggestions**:
- If critical errors: Fix them manually or re-run workflow commands
- If warnings only: Run `/wb:update_status` to sync metadata
- If all passed: Run `/wb:implement_tasks` to continue work
```

### Step 5: Offer Fixes

After presenting the report, offer to help fix issues:

```
Would you like me to:
1. Fix critical errors automatically (where possible)
2. Generate a plan to address all issues
3. Re-run validation after you make changes
4. Continue to next step in workflow
```

## Validation Rules

### File Structure Validation

```javascript
// Required files
const requiredFiles = ['research.md', 'design.md', 'tasks.md'];

// Check each exists
for (const file of requiredFiles) {
  if (!exists(`${projectDir}/${file}`)) {
    ERROR(`Missing required file: ${file}`);
  }
}
```

### Frontmatter Validation

```javascript
// Required fields per file
const requiredFields = {
  all: ['project', 'created', 'status', 'last_updated', 'git_commit', 'git_branch'],
  tasks: ['beads_epic', 'beads_phases', 'beads_tasks', 'current_phase', 'total_tasks', 'completed_tasks']
};

// Parse YAML frontmatter
const frontmatter = parseYAML(fileContent);

// Check required fields
for (const field of requiredFields.all) {
  if (!frontmatter[field]) {
    ERROR(`Missing required field: ${field}`);
  }
}
```

### Status Validation

```javascript
const validStatuses = {
  research: ['draft', 'in-progress', 'complete'],
  design: ['draft', 'ready', 'implementing', 'complete'],
  tasks: ['not-started', 'in-progress', 'complete']
};

// Check status is valid
if (!validStatuses[fileType].includes(status)) {
  ERROR(`Invalid status: ${status}. Must be one of: ${validStatuses[fileType]}`);
}

// Check status progression
if (design.status === 'ready' && research.status === 'draft') {
  ERROR('Design cannot be ready if research is still draft');
}

if (tasks.status === 'in-progress' && design.status === 'draft') {
  ERROR('Tasks cannot be in-progress if design is still draft');
}

if (design.status === 'complete' && tasks.status !== 'complete') {
  ERROR('Design cannot be complete if tasks are not complete');
}
```

### Beads Validation

```javascript
// Check beads is initialized
const beadsCheck = exec('bd doctor');
if (beadsCheck.failed) {
  ERROR('Beads is not initialized. Run: bd init');
}

// Extract beads IDs from frontmatter
const beadsIds = [
  tasksFrontmatter.beads_epic,
  ...Object.values(tasksFrontmatter.beads_phases),
  ...Object.values(tasksFrontmatter.beads_tasks)
];

// Verify each ID exists
for (const id of beadsIds) {
  const result = exec(`bd show ${id}`);
  if (result.failed) {
    ERROR(`Beads issue not found: ${id}`);
  }
}

// Check for orphaned beads issues
const allBeadsIssues = exec('bd list').parseOutput();
for (const issue of allBeadsIssues) {
  if (!beadsIds.includes(issue.id)) {
    WARNING(`Orphaned beads issue: ${issue.id} (not in frontmatter)`);
  }
}
```

### Content Validation

```javascript
// Check for placeholders
const placeholders = ['[To be added]', '[TBD]', '[TODO]', '[Fill this in]'];

for (const placeholder of placeholders) {
  if (fileContent.includes(placeholder)) {
    WARNING(`Found placeholder text: ${placeholder} in ${filename}`);
  }
}

// Check for empty sections
const sections = extractSections(fileContent);
for (const section of sections) {
  if (section.content.trim().length < 50) {
    WARNING(`Section appears empty or very short: ${section.title}`);
  }
}
```

## Error Messages

### Critical Errors

```
❌ Missing Required File: tasks.md
   Location: [project-dir]/tasks.md
   Cause: File does not exist
   Impact: Cannot track implementation work
   Fix: Run /wb:create_execution to generate tasks.md
```

```
❌ Invalid Beads ID: prompts-xyz
   Location: tasks.md frontmatter, beads_epic field
   Cause: Beads issue does not exist
   Impact: Cannot track project in beads
   Fix: Create beads epic or update frontmatter with correct ID
```

```
❌ Status Progression Violation
   Files: design.md (implementing), research.md (draft)
   Cause: Design implementing but research not complete
   Impact: Violates workflow: research must complete before design
   Fix: Complete research OR set design back to draft
```

### Warnings

```
⚠️ Missing Git Metadata
   File: research.md
   Fields: git_commit, git_branch
   Impact: Cannot track code state when research was done
   Fix: Run /wb:update_status to populate metadata
```

```
⚠️ Placeholder Content Found
   File: design.md, line 45
   Text: "[To be added]"
   Impact: Incomplete documentation
   Fix: Document the design decision or remove placeholder
```

```
⚠️ Orphaned Beads Issue
   Issue: prompts-abc (Priority: P2, Status: open)
   Cause: Beads issue exists but not referenced in frontmatter
   Impact: Work may be tracked that's not in plan
   Fix: Add to beads_tasks or close if no longer needed
```

## Important Guidelines

### DO

- ✅ Read ALL files fully before reporting
- ✅ Use beads commands to verify state (`bd show`, `bd list`, `bd stats`)
- ✅ Report both errors and warnings with clear severity
- ✅ Provide specific, actionable fix suggestions
- ✅ Validate beads IDs actually exist, don't assume
- ✅ Check for consistency across all files
- ✅ Offer to help fix issues after reporting

### DON'T

- ❌ Make assumptions about what "should" be there
- ❌ Automatically fix issues without user confirmation
- ❌ Skip checks if some files are missing
- ❌ Report vague problems without specific locations
- ❌ Validate against old workflow patterns (TaskCreate, checkboxes, etc.)
- ❌ Use limit/offset when reading files

## Synchronization Points

1. **⛔ BARRIER 1**: After reading all files - ensure full context
2. **⛔ BARRIER 2**: After beads validation - verify all IDs exist
3. **⛔ BARRIER 3**: Before reporting - organize findings by severity

## Configuration

This command validates project documentation structure and beads integration. It does not modify files unless the user explicitly requests fixes.

**Usage**:
```
/wb:validate_project docs/plans/2025-01-08-my-project
```

**Validation Modes**:
- Default: Full validation with detailed report
- Quick: Check only critical errors (future enhancement)
- Fix: Validate and auto-fix issues (future enhancement)
