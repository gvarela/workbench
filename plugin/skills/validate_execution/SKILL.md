---
name: validate_execution
description: Validate that an implemented plan matches design.md and tasks.md: run the automated checks, compare the implementation to the requirements, and produce a pass/fail report with gaps. Use after a phase or project is implemented when the user asks to validate, verify, or review whether the plan was done correctly. Takes the project directory.
argument-hint: [project-directory]
allowed-tools: Read
model: sonnet
effort: high
---

# Validate Execution

Validates that an execution plan was correctly implemented, verifying all success criteria and identifying any deviations, gaps, or issues.

Supporting files in this directory (read each when its step directs you to — never paraphrase from memory):

- [sub-agent-prompts.md](sub-agent-prompts.md) — verbatim prompts for the four validation agents spawned in Step 2
- [templates.md](templates.md) — Validation Report template used in Step 5

## Purpose

This command provides an objective assessment of implementation completeness by:

- Verifying claimed completions match actual code changes
- Running all automated verification checks
- Identifying deviations from the plan
- Documenting gaps or issues found
- Providing clear manual testing requirements

Run this AFTER implementation to ensure quality before merging or deployment.

## Initial Response

This stage needs from you: the manual checks only you can run, and your reading of the verdict per Intent statement.

When invoked, check for arguments:

1. **If directory provided** (e.g., `/validate_execution docs/plans/2025-01-08-my-project/`):
   - Use `$1` as the project directory
   - Read all documentation immediately
   - Begin validation process

2. **If no arguments**:

   ```
   I'll validate the execution of your implementation plan. Please provide:
   1. Path to the project documentation directory (e.g., docs/plans/2025-01-08-my-project/)

   I'll verify that the implementation matches the plan and all success criteria are met.
   ```

## Process Steps

### Step 1: Context Discovery

**⛔⛔⛔ BARRIER 1: STOP! Read ALL documentation FULLY - research.md, design.md, tasks.md ⛔⛔⛔**

```javascript
const projectDir = $1 || /* prompt for it */;

// Read all project documentation
const researchFile = `${projectDir}/research.md`;
const designFile = `${projectDir}/design.md`;
const tasksFile = `${projectDir}/tasks.md`;
```

1. **Read tasks.md completely** to understand:
   - What phases were planned
   - Which tasks are marked complete ([x])
   - Success criteria for each phase
   - Modified files listed

   **Session-start sanity check**: read `beads_epic` from tasks.md frontmatter. If it is present, confirm the right database is open before doing any work (see [docs/reference/beads-mode.md](../../docs/reference/beads-mode.md)):

   ```bash
   bd context            # resolved database name and beads dir
   bd show [epic-id]     # the plan's epic; must resolve
   bd stats              # total issue count
   bd version            # requires bd 1.1.0 or later
   ```

   If `bd show [epic-id]` fails, present the Wrong database case from [docs/reference/beads-not-initialized.md](../../docs/reference/beads-not-initialized.md) and stop. If the frontmatter has no `beads_epic`, note "plan predates beads tracking, sanity check skipped" and continue.

2. **Read design.md** to understand:
   - Original design decisions
   - Success metrics defined, and which Intent statement each refines (`(refines: ...)`), plus the Deferred list
   - Scope boundaries

3. **Read research.md** to understand:
   - Original state of the codebase
   - Patterns that should be followed

4. **Read README.md** in the project directory. If it has an `## Intent` section, list its "Success looks like" statements; each gets a verdict in Step 5 and an echo in Step 6. If it has none, the verdict table carries one row: "no Intent section (plan predates 3.0.0)".

**Compare what was supposed to be built with what exists**

### Step 2: Spawn Validation Agents

**Use parallel agents to verify implementation comprehensively:**

**CRITICAL: Sub-agents gather information and return findings. They do NOT write files. YOU (the main agent) will write the validation report after synthesizing their findings.**

Read [sub-agent-prompts.md](sub-agent-prompts.md) NOW and spawn the four agents defined there (Verify code changes, Verify test coverage, Check for regressions, Analyze patterns and quality) using their verbatim prompts.

**⛔⛔⛔ BARRIER 2: STOP! Wait for ALL validation agents to complete ⛔⛔⛔**

### Step 3: Run Automated Verification

For each phase in tasks.md, run ALL automated verification commands:

```bash
# Common verification commands (adapt based on project)
make check      # Linting and formatting
make test       # Unit tests
make integration # Integration tests
make build      # Build verification

# Project-specific commands from tasks.md
[Run any specific commands listed in success criteria]
```

Document the results:

- ✅ Pass: Command succeeded
- ❌ Fail: Command failed (include error)
- ⚠️ Partial: Some issues but not blocking

### Step 4: Analyze Implementation Completeness

**Identify the gaps between plan and reality**

For each phase in tasks.md:

1. **Check task completion**:
   - Verify each [x] checked task was actually done
   - Look for evidence in code changes
   - Identify any incomplete work

2. **Verify success criteria**:
   - Were all automated criteria met?
   - Are manual criteria ready for testing?
   - Any criteria impossible to verify?

3. **Identify deviations**:
   - Changes made differently than planned
   - Additional changes not in plan
   - Planned changes not implemented

4. **Assess impact**:
   - Are deviations improvements or problems?
   - Do they affect the overall solution?
   - Should they be documented or reverted?

### Step 5: Generate Validation Report

**⛔ BARRIER 3**: Do not write the report until every automated verification command from Step 3 has been run in this session and its result recorded. The report asserts verification results — unverified claims must not appear in it.

Read [templates.md](templates.md) NOW and create the validation report using its "Validation Report Template" — match its structure exactly.

### Step 6: Update Documentation

**Verdict echo** (always, pass or fail): for each "Success looks like" statement in the README's `## Intent` section, append `→ PASS (YYYY-MM-DD)` or `→ FAIL (YYYY-MM-DD)` to the end of the statement's line, replacing an earlier `→ ...` suffix if one exists, so the README carries the latest verdict. The verdict for a statement is PASS only when every metric that refines it passed; a statement whose metrics were all deferred is written `→ DEFERRED (YYYY-MM-DD)`. Skip the echo when there is no Intent section.

If validation passes with minor issues:

1. Update tasks.md to reflect actual completion status
2. Document any approved deviations
3. Note lessons learned for future projects

If validation fails:

1. Clearly mark which tasks need completion
2. Provide specific guidance for fixes
3. Re-run validation after fixes

## Important Guidelines

### Validation Philosophy

1. **Be Objective**: Assess what IS, not what SHOULD BE
2. **Be Thorough**: Check everything, assume nothing
3. **Be Constructive**: Identify issues with solutions
4. **Be Precise**: Use file:line references for all claims
5. **Be Practical**: Focus on what matters for deployment

### What Makes a PASS vs FAIL

**✅ PASS**:

- All critical functionality implemented
- All automated tests pass
- No blocking issues
- Ready for manual testing

**⚠️ PASS WITH ISSUES**:

- Core functionality works
- Some non-critical issues exist
- Can be deployed with known limitations
- Issues documented for future work

**❌ FAIL**:

- Critical functionality missing
- Tests failing
- Blocking issues present
- Not safe to deploy

### Common Validation Checks

Always verify:

- [ ] All phases marked complete actually are
- [ ] All checked tasks have corresponding code
- [ ] All tests pass consistently
- [ ] No regressions introduced
- [ ] Build succeeds cleanly
- [ ] Error handling is robust
- [ ] Patterns are followed
- [ ] Documentation updated if needed

## Relationship to Other Commands

Recommended workflow:

1. `/create_research` - Document current state
2. `/create_design` - Decide what to build
3. `/create_tasks` - Plan how to build
4. `/implement` - Build it (coordinated workers, TDD)
5. **`/validate_execution`** - Verify it was built correctly ← YOU ARE HERE
6. `/create_handoff` - Document for next session (if needed)

## Synchronization Points

1. **⛔ BARRIER 1**: Read all documentation first
2. **⛔ BARRIER 2**: Wait for all validation agents
3. **⛔ BARRIER 3**: Complete all automated checks before writing the report
