# validate_project — Output Templates

Read the relevant section in full when its step directs you here; match its structure exactly.

## Project Validation Report Template

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
**Fix**: Run `/wb:create_tasks` to set up beads tracking

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
- If all passed: Run `/wb:implement` to continue work
```
