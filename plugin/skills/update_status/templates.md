# update_status — Output Templates

Templates for the documents this skill writes. Read the relevant section in full when its step directs you here; match its structure exactly.

## Frontmatter Update Blocks (Step 5)

### research.md Update

```yaml
status: [new-status]
last_updated: [YYYY-MM-DD]
git_commit: [current-commit]
git_branch: [current-branch]
```

### design.md Update

```yaml
status: [new-status]
last_updated: [YYYY-MM-DD]
git_commit: [current-commit]
git_branch: [current-branch]
```

If transitioning to `implementing`, add implementation notes:

```markdown
## Implementation Notes

Started: [YYYY-MM-DD]
- Implementation began on phase [N]
- [Any relevant context about starting implementation]
```

### tasks.md Update

```yaml
status: [new-status]
last_updated: [YYYY-MM-DD]
current_phase: [calculated-phase-number]
completed_tasks: [actual-count]
git_commit: [current-commit]
git_branch: [current-branch]
```

Update Progress Overview table to reflect actual counts.

Add implementation notes if status changes:

```markdown
### Implementation Notes
- Status updated to [new-status] on [YYYY-MM-DD]
- [Reason for status change]
```

## Confirmation Message Template (Step 7)

Write the Next Steps as [writing-for-the-user.md](../../docs/reference/writing-for-the-user.md) says: each step names the work in plain words with any id in parentheses, and says why it comes next.

```
✅ Status updated successfully!

📁 Project: [project-name]
📊 Updates Applied:

**research.md**: [old] → [new]
**design.md**: [old] → [new]
**tasks.md**: [old] → [new]
  - Phase: [number]
  - Progress: [X]/[Y] tasks ([percentage]%)

**Metadata Updated**:
- Last updated: [YYYY-MM-DD]
- Git commit: [commit-hash]
- Git branch: [branch-name]

**Next Steps**:
[Contextual suggestions based on new status: what to do, in plain words, and why]
```
