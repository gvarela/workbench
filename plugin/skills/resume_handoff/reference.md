# resume_handoff — Reference

Read the relevant section in full when its step directs you here; match its structure exactly.

## Error Handling Catalog

### Handoff File Not Found

```
❌ Error: Handoff file not found at [path]

Please check:
1. File path is correct
2. You're in the right repository
3. File wasn't moved or deleted

You may need to:
- Search for handoff files: find . -name "handoff-*.md"
- Start fresh with project documentation
```

### Invalid Handoff Format

```
❌ Error: Handoff document missing critical sections

Required sections not found:
- [Missing section]

This may not be a valid handoff document.
Check the file path or create a new handoff.
```

### Git State Mismatch

```
⚠️ Warning: Git state doesn't match handoff

Handoff written at: [commit subject] ([short hash])
You are now at: [commit subject] ([short hash]), [N commits after the handoff's, or on a different branch]
What it means: [the commits since the handoff, in plain words, and whether they touch files the handoff's next step changes]

Options:
1. Continue anyway (may have merge conflicts)
2. Checkout handoff commit: git checkout [commit]
3. Create new handoff from current state

Recommendation: [option and the reason].
```
