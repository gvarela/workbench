# Rides Window and Check-in Focus

**Created**: 2026-10-20
**Ticket**: N/A
**Status**: Planning

## Intent

**Goal**: The rides page shows the last 28 days of rides inclusive, and the morning check-in wizard moves focus to the next question when one is answered.

**Success looks like**:

- On the rides page, a ride from 27 days before today is listed and a ride from 28 days before today is not (on Oct 28, a ride on Oct 1 is listed and one on Sep 30 is not)
- After answering a check-in question, the next question is visible and keyboard focus is on its first answer (tap Good on Sleep, Soreness is visible and focus is on None)

**Non-goals**:

- No change to how distance is stored
- No new pages

**Amendments**:

- (none yet; explore_design and create_design append a dated line here when the Goal or a Non-goal changes)

## Documentation Structure

- **[research.md](research.md)** - Codebase research and findings
- **[design.md](design.md)** - Architectural design decisions
- **[tasks.md](tasks.md)** - Execution plan and task tracking

## Workflow

1. ✅ Project structure created
2. ✅ Research phase (`/wb:create_research [directory]`)
3. ⏳ Design exploration (optional) (`/wb:explore_design [directory]`)
4. ✅ Design phase (`/wb:create_design [directory]`)
5. ✅ Execution planning (`/wb:create_tasks [directory]`)
6. ⏳ Implementation (`/wb:implement [directory]`; `/wb:implement_inline` to run it in this session)
7. ⏳ Testing & Verification

## Git Information

- **Branch**: main
- **Commit**: fixture
- **Repository**: python-rides
