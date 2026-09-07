# create_project — Initial File Templates

Read the relevant template in full before creating each file; match its structure exactly.

## README.md Template

````markdown
# [Project Name]

**Created**: [YYYY-MM-DD]
**Ticket**: [ticket-reference or N/A]
**Status**: Planning

## Intent

**Goal**: [one sentence: what this project is for]

**Success looks like**:

- [observable statement 1]
- [observable statement 2]

**Non-goals**:

- [what this project will not do]

**Amendments**:

- (none yet; explore_design and create_design append a dated line here when the Goal or a Non-goal changes)

## Documentation Structure

- **[research.md](research.md)** - Codebase research and findings
- **[design.md](design.md)** - Architectural design decisions
- **[tasks.md](tasks.md)** - Execution plan and task tracking

## Workflow

1. ✅ Project structure created
2. ⏳ Research phase (`/wb:create_research [directory]`)
3. ⏳ Design exploration (optional) (`/wb:explore_design [directory]`)
4. ⏳ Design phase (`/wb:create_design [directory]`)
5. ⏳ Execution planning (`/wb:create_tasks [directory]`)
6. ⏳ Implementation (`/wb:implement [directory]`; `/wb:implement_inline` to run it in this session)
7. ⏳ Testing & Verification

## Quick Commands

```bash
# Continue with research (analyzes codebase)
/wb:create_research [this-directory]

# Explore design options (optional - for big architecture decisions)
/wb:explore_design [this-directory]

# Create design decisions
/wb:create_design [this-directory]

# Generate execution plan with tasks
/wb:create_tasks [this-directory]

# Implement with coordinated workers (/wb:implement_inline runs it in this session)
/wb:implement [this-directory]

# Update status across all files
/wb:update_status [this-directory]
```

## Git Information

- **Branch**: [branch-name]
- **Commit**: [commit-hash]
- **Repository**: [repo-name]
````

## research.md Template

````markdown
---
project: [project-name]
ticket: [ticket-reference or null]
created: [YYYY-MM-DD]
created_timestamp: [ISO-8601 timestamp]
status: draft
last_updated: [YYYY-MM-DD]
researcher: [username]
git_commit: [commit-hash or "not-in-git"]
git_branch: [branch-name or "not-in-git"]
repository: [repo-name or "unknown"]
tags: [research, codebase, [project-name]]
---

# Research: [Project Name]

**Created**: [YYYY-MM-DD HH:MM UTC]
**Researcher**: [username]
**Ticket**: [ticket-reference or N/A]
**Git Commit**: [commit-hash]
**Branch**: [branch-name]

## Research Question

[What are we trying to understand? To be filled by /wb:create_research]

## Summary

[High-level findings - to be added]

## Detailed Findings

[Research findings will be documented here by /wb:create_research]

### Component Analysis
[How components work - to be added]

### Data Flow
[How data moves through system - to be added]

### Dependencies
[External dependencies and integrations - to be added]

## Architecture Documentation

### Patterns Found
[Patterns and conventions discovered - to be added]

### File Structure
[Relevant directory structure - to be added]

## Code References

Quick reference to key files:
[Specific file:line references - to be added]

## Similar Implementations

[Examples from codebase - to be added]

## Open Questions

[Areas needing further investigation - to be added]

## Next Steps

1. Run `/wb:create_research [directory]` to populate this document
2. Review findings before design

## References

- Design: [design.md](design.md)
- Tasks: [tasks.md](tasks.md)
````

## design.md Template

````markdown
---
project: [project-name]
ticket: [ticket-reference or null]
created: [YYYY-MM-DD]
created_timestamp: [ISO-8601 timestamp]
status: draft
last_updated: [YYYY-MM-DD]
designer: [username]
git_commit: [commit-hash or "not-in-git"]
git_branch: [branch-name or "not-in-git"]
repository: [repo-name or "unknown"]
tags: [design, architecture, [project-name]]
depends_on: research.md
---

# Design: [Project Name]

**Created**: [YYYY-MM-DD HH:MM UTC]
**Designer**: [username]
**Ticket**: [ticket-reference or N/A]
**Status**: Draft

## Problem Statement

[What problem we're solving and why - to be filled by /wb:create_design]

### Success Metrics
- [ ] [To be defined]

## Design Approach

[High-level solution approach - to be added]

### Why This Approach
- [To be added from design analysis]

## Technical Decisions

### Architecture
- [To be defined]

### Data Model
- [To be defined]

### Integration Points
- [To be identified]

## Scope Definition

### In Scope
- [To be defined]

### Out of Scope
- [To be defined]

## Success Criteria

### Functional Requirements
- [ ] [To be defined]

### Non-Functional Requirements
- [ ] [To be defined]

## Risk Analysis

[To be evaluated]

## Rejected Alternatives

[To be documented during design]

## Pending Decisions

[Design decisions needing input - to be identified]

## References

- Research: [research.md](research.md)
- Tasks: [tasks.md](tasks.md)
- Related: [to be added]
````

## tasks.md Template

````markdown
---
project: [project-name]
ticket: [ticket-reference or null]
created: [YYYY-MM-DD]
created_timestamp: [ISO-8601 timestamp]
status: not-started
last_updated: [YYYY-MM-DD]
assignee: [username]
# progress fields below are maintained by /wb:update_status — do not hand-edit
current_phase: 0
total_tasks: 4
completed_tasks: 1
git_commit: [commit-hash or "not-in-git"]
git_branch: [branch-name or "not-in-git"]
repository: [repo-name or "unknown"]
tags: [tasks, tracking, [project-name]]
---

# Tasks: [Project Name]

**Created**: [YYYY-MM-DD HH:MM UTC]
**Assignee**: [username]
**Ticket**: [ticket-reference or N/A]
**Current Phase**: Planning

## Progress Overview

| Phase | Status | Tasks | Progress |
|-------|--------|-------|----------|
| Planning | 🔄 In Progress | 1/4 | 25% |
| Implementation | ⏸️ Not Started | 0/0 | 0% |

**Overall Progress**: 1/4 planning tasks (25%)

---

## Planning Phase

### 📋 Documentation Setup
- [x] Create project structure (completed [YYYY-MM-DD HH:MM])
- [ ] Complete research using `/wb:create_research [directory]`
- [ ] Explore design options using `/wb:explore_design [directory]` (optional)
- [ ] Create design document using `/wb:create_design [directory]`
- [ ] Generate execution plan using `/wb:create_tasks [directory]`

---

## Implementation Phases

[To be populated by /wb:create_tasks after design is approved]

---

## 📝 Completed Tasks Archive

- [x] Create project structure - [YYYY-MM-DD HH:MM]

---

## 🚧 Blockers & Notes

### Current Blockers
| Blocker | Impact | Action | Owner | Due Date |
|---------|--------|--------|-------|----------|
| Research needed | Can't design | Run /wb:create_research | [username] | [date] |

### Implementation Notes
- Project initialized on [YYYY-MM-DD]

---

## 🔗 Quick Reference

### Key Files
- **Research**: [research.md](research.md)
- **Design**: [design.md](design.md)

### Next Action
**Run**: `/wb:create_research [this-directory]`
````
