# Testing Guidance

**Created**: 2026-10-16
**Ticket**: N/A
**Status**: Planning

## Intent

**Goal**: Add testing guidance to wb so worker agents write tests that check intended behavior at the right level, and the verifier can tell a protective test from a hollow one.

**Success looks like**:

- A wb plan's acceptance criteria become tests, at a test level chosen from where each criterion is observed (UI, HTTP, CLI, function)
- The task-verifier flags deleted, skipped, or weakened tests and expected values copied from the code, not just "pass and coverage went up"
- Test-quality and test-level guidance adapts to the target repository's stack and conventions (a Rails app gets Rails conventions without wb hardcoding Rails)
- Every guidance change traces to a finding in the external research, with its evidence strength recorded

**Non-goals**:

- Turning wb into a test framework or test runner
- Mandating one stack's tools (RSpec, Playwright, and so on)
- Dropping TDD from wb's identity

**Amendments**:

- 2026-10-29: The rules-and-intents guidance (`plugin/docs/reference/rules-and-intents.md`: the hard list, line strength and source, narrowings, acting within purpose, and person-granted delegations) traces to two real wb runs that stalled on narrowed wording, not to the external research. Its evidence strength is weak (observational, two runs, no external study); the Success statement on tracing guidance to research with its evidence strength is addressed for it by this record. (prompts-qhoh.9)

## Documentation Structure

- **[research.md](research.md)** - Codebase research and findings
- **[design.md](design.md)** - Architectural design decisions
- **[tasks.md](tasks.md)** - Execution plan and task tracking
- **[test-audit.md](test-audit.md)** - Evaluation of tests wb produced in sg-wholesale (Rails) and fitness-agent (Python) against the external research
- **[external-research/](external-research/)** - External research on guiding LLM agents to write better tests (2024–2026): the synthesized report and the four source-note files behind it

## Workflow

1. ✅ Project structure created
2. ⏳ Research phase (`/wb:create_research docs/plans/2026-10-16-testing-guidance`)
3. ⏳ Design exploration (optional) (`/wb:explore_design docs/plans/2026-10-16-testing-guidance`)
4. ⏳ Design phase (`/wb:create_design docs/plans/2026-10-16-testing-guidance`)
5. ⏳ Execution planning (`/wb:create_tasks docs/plans/2026-10-16-testing-guidance`)
6. ⏳ Implementation (`/wb:implement docs/plans/2026-10-16-testing-guidance`; `/wb:implement_inline` to run it in this session)
7. ⏳ Testing & Verification

## Quick Commands

```bash
# Continue with research (analyzes codebase)
/wb:create_research docs/plans/2026-10-16-testing-guidance

# Explore design options (optional - for big architecture decisions)
/wb:explore_design docs/plans/2026-10-16-testing-guidance

# Create design decisions
/wb:create_design docs/plans/2026-10-16-testing-guidance

# Generate execution plan with tasks
/wb:create_tasks docs/plans/2026-10-16-testing-guidance

# Implement with coordinated workers (/wb:implement_inline runs it in this session)
/wb:implement docs/plans/2026-10-16-testing-guidance

# Update status across all files
/wb:update_status docs/plans/2026-10-16-testing-guidance
```

## Git Information

- **Branch**: testing-guidance
- **Commit**: 9020332a011a0519887c1cde76c9cd84a6e91c22
- **Repository**: gvarela/workbench
