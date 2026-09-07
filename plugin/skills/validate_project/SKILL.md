---
name: validate_project
description: Check that a docs/plans/<project>/ directory follows the wb workflow: required files, frontmatter, status transitions, beads tracking, and stage ordering. Use when plan documents look inconsistent, when asked to validate or audit a project's docs, or before resuming an old project. Takes the project directory.
argument-hint: [project-directory]
allowed-tools: Read
---

# Validate Project

Validates that a project's documentation structure follows the wb workflow correctly. Identifies gaps, disconnects, and inconsistencies in the documentation and beads tracking.

## Initial Response

This stage needs from you: nothing up front; read the findings and choose which to fix.

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

- ✅ Beads is initialized (`bd info` succeeds)
- ✅ tasks.md has `beads_epic` in frontmatter
- ✅ tasks.md has `beads_phases` in frontmatter
- ✅ tasks.md has `beads_tasks` in frontmatter
- ✅ All beads IDs in frontmatter exist (`bd show [id]` succeeds)
- ✅ No orphaned beads issues (beads exist that aren't in frontmatter)
- ✅ `.beads/` is excluded or ignored (beads' Dolt directory is never meant to be committed)
- ✅ `bd orphans` output reported (issues commit messages reference that are still open)

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

**Supporting files** (same directory):

- [templates.md](templates.md) — output report template for Step 4
- [reference.md](reference.md) — validation logic spec and error/warning message catalog for Steps 3–4

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

**Assess what you're seeing**

### Step 2: Validate Beads State

Check beads integration and state:

```bash
# Verify beads is initialized
bd info

# Session-start sanity check (see docs/reference/beads-mode.md): the right database must be open
bd context                      # resolved database name and beads dir
bd show [epic-id]               # the plan's epic from tasks.md frontmatter; if this fails, stop with the Wrong database message in docs/reference/beads-not-initialized.md
bd version                      # requires bd 1.1.0 or later

# .beads/ holds beads' Dolt database and is never meant to be committed
if [ -d .beads ] && ! git check-ignore -q .beads/ 2>/dev/null; then
  echo "⚠️  .beads/ is tracked or unignored — beads' Dolt directory is never meant to be committed; run bd init --stealth (or --setup-exclude)"
fi

# Hygiene: open issues that commit messages already reference (landed but never closed)
bd orphans

# Check beads stats
bd stats

# Get all beads issues (including closed; unlimited)
bd list --all -n 0

# Check specific issues from frontmatter
bd show [epic-id]
bd show [phase-milestone-id]
bd show [task-id]
```

If `bd show [epic-id]` fails, present the Wrong database case from [docs/reference/beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and stop; the sanity check is skipped when the frontmatter has no `beads_epic`.

Extract beads IDs from tasks.md frontmatter:

- `beads_epic`
- `beads_phases.*`
- `beads_tasks.*`

For each ID, verify it exists in beads.

### Step 3: Run Validation Checks

For exact commands and precedence, read the "Validation Logic Spec" in [reference.md](reference.md) NOW.

Run all checks from the checklist above. Track:

- ✅ **Pass**: Check succeeded
- ⚠️ **Warning**: Non-critical issue, should fix
- ❌ **Error**: Critical issue, must fix

Organize findings by category:

1. Critical Errors (must fix)
2. Warnings (should fix)
3. Passed Checks (all good)

### Step 4: Report Findings

**⛔ BARRIER 2**: Do not write the report until every checklist category has actually been executed in this session and its result recorded — including `bd show` on every ID from the frontmatter. The report asserts validation results; unverified claims must not appear in it.

Read the "Project Validation Report Template" in [templates.md](templates.md) NOW and present a comprehensive report using that structure.

### Step 5: Offer Fixes

After presenting the report, offer to help fix issues:

```
Would you like me to:
1. Fix critical errors automatically (where possible)
2. Generate a plan to address all issues
3. Re-run validation after you make changes
4. Continue to next step in workflow
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
2. **⛔ BARRIER 2**: All checks executed (including per-ID bd show) before writing the report
