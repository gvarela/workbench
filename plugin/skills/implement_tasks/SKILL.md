---
name: implement_tasks
description: Deprecated alias of implement_inline — use /wb:implement_inline (removed at 4.0.0)
argument-hint: [project-directory] [phase-number|continue]
disable-model-invocation: true
allowed-tools: Read
---

# Implement Tasks (Deprecated Alias)

This command was renamed to `/wb:implement_inline`: it runs the plan inline on the session model, so the name says what is different about it; the recommended coordinated path is `/wb:implement`. The alias remains through 3.x and is removed at 4.0.0.

## Behavior

1. **Tell the user once, up front**:

   ```
   Note: /wb:implement_tasks is now /wb:implement_inline — same skill, new name.
   This alias works through 3.x and will be removed at 4.0.0.
   ```

2. **Then run the canonical skill**: Read [../implement_inline/SKILL.md](../implement_inline/SKILL.md) NOW and follow it exactly, passing through any arguments unchanged. Its supporting file (templates.md) lives in `../implement_inline/`.

Do not duplicate any behavior here; the canonical skill is the single source of truth.
