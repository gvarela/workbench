---
name: implement_coordinated
description: Deprecated alias of implement — use /wb:implement (removed at 4.0.0)
argument-hint: [project-directory] [phase-number|continue]
disable-model-invocation: true
allowed-tools: Read
---

# Implement Coordinated (Deprecated Alias)

This command was renamed to `/wb:implement`: coordinated execution is the recommended path, so it takes the plain verb; the in-session path is `/wb:implement_inline`. The alias remains through 3.x and is removed at 4.0.0.

## Behavior

1. **Tell the user once, up front**:

   ```
   Note: /wb:implement_coordinated is now /wb:implement — same skill, new name.
   This alias works through 3.x and will be removed at 4.0.0.
   ```

2. **Then run the canonical skill**: Read [../implement/SKILL.md](../implement/SKILL.md) NOW and follow it exactly, passing through any arguments unchanged. Its supporting files (sub-agent-prompts.md, templates.md, reference.md, README.md) live in `../implement/` — resolve every "read X NOW" directive there.

Do not duplicate any behavior here; the canonical skill is the single source of truth.
