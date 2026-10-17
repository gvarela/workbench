# create_tasks — Examples

Read the relevant section in full when its step directs you here; match its structure exactly.

## Phase Milestone Creation Examples (Step 5c)

```bash
# Phase 1 - capture the ID from output
bd create "Phase 1 Milestone: [Phase Name]" \
  --type=task \
  --priority=2 \
  -d "All Phase 1 tasks complete. Objective: [phase objective]. See tasks.md Phase 1 for details."
# → Created prompts-xyz (save this as PHASE1_MILESTONE_ID)

# Phase 2 - capture the ID from output
bd create "Phase 2 Milestone: [Phase Name]" \
  --type=task \
  --priority=2 \
  -d "All Phase 2 tasks complete. Objective: [phase objective]. See tasks.md Phase 2 for details."
# → Created prompts-abc (save this as PHASE2_MILESTONE_ID)

# Set up dependency: Phase 2 milestone depends on Phase 1 milestone
bd dep add [PHASE2_MILESTONE_ID] [PHASE1_MILESTONE_ID]
```

## Task Creation Examples (Step 5d)

```bash
# Setup task example
bd create "Create new directory structure at path/to/new/" \
  --type=task \
  --priority=2 \
  -d "Phase 1 setup task. Create directory structure for new component."
# → Created prompts-def (save as TASK1_ID)

# Implementation task example
bd create "Create [Component] class at src/component.ts" \
  --type=task \
  --priority=2 \
  -d "Phase 1 implementation. Serves AC-1. Create component with constructor, method1 for [purpose], method2 for [purpose]."
# → Created prompts-ghi (save as TASK2_ID)

# Harness task example (design marked the HTTP boundary "add harness")
bd create "Add request-test harness for the HTTP boundary" \
  --type=task \
  --priority=2 \
  -d "Phase 1 harness. Add [the project's harness]. Done when a smoke test on an existing endpoint fails with a deliberately wrong expectation and passes once restored."
# → Created prompts-jkl (save as HARNESS_ID)

# Outer-test step example (one per acceptance criterion)
bd create "Outer test for AC-1: expired link shows the expired page" \
  --type=task \
  --priority=2 \
  -d "Phase 1 outer-test. Serves AC-1. Run through wb:test-writer; commit as red(AC-1). Observed at: page HTML. Examples: opened before expiry shows the form, opened after shows 'expired'. Done when the test fails on an assertion about the page."
# → Created prompts-pqr (save as TASK3_ID)

# Integration task example
bd create "Connect [Component] to [ExistingSystem]" \
  --type=task \
  --priority=2 \
  -d "Phase 1 integration. Update API endpoint at api/routes.ts:78."
# → Created prompts-mno (save as TASK4_ID)
```

## Task Dependency Examples (Step 5e)

Edges follow consumed outputs, not listing order. For the tasks above (TASK3 is the outer-test step):

```bash
# TASK3 (outer test) runs on the harness HARNESS_ID adds → edge
bd dep add [TASK3_ID] [HARNESS_ID]

# TASK2 (component class) is created inside the directory TASK1 makes → edge
bd dep add [TASK2_ID] [TASK1_ID]

# TASK2 serves AC-1 and consumes the failing outer test TASK3 commits → edge
bd dep add [TASK2_ID] [TASK3_ID]

# TASK4 (API integration) wires up the class TASK2 creates → edge to TASK2 only.
bd dep add [TASK4_ID] [TASK2_ID]
```

Resulting graph (branching, not a chain):

```
HARNESS ──► TASK3 ──► TASK2 ──► TASK4
            TASK1 ───────┘
```

HARNESS and TASK1 are ready together, so `bd ready` shows two starting points; the width comes from independent tasks like these.

Two exceptions add edges beyond consumed outputs — label them so they aren't mistaken for data flow:

```bash
# File overlap: if TASK4 and a data-independent TASK5 BOTH modified
# api/routes.ts, pick an order and record why the edge exists:
bd dep add [TASK5_ID] [TASK4_ID]
bd update [TASK5_ID] --notes="Edge to TASK4 serializes api/routes.ts access — not a data dependency"

# Structure before behavior: if the phase had a structural task
# ("Extract shared helper from api/routes.ts", TASK0), every behavioral
# task in the phase takes an edge to it:
bd dep add [TASK2_ID] [TASK0_ID]
bd dep add [TASK4_ID] [TASK0_ID]
```
