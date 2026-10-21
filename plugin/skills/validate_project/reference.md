# validate_project — Reference

Read the relevant section in full when its step directs you here; match its structure exactly.

## Validation Logic Spec (authoritative)

### File Structure Validation

```javascript
// Required files
const requiredFiles = ['research.md', 'design.md', 'tasks.md'];

// Check each exists
for (const file of requiredFiles) {
  if (!exists(`${projectDir}/${file}`)) {
    ERROR(`Missing required file: ${file}`);
  }
}
```

### Frontmatter Validation

```javascript
// Required fields per file
const requiredFields = {
  all: ['project', 'created', 'status', 'last_updated', 'git_commit', 'git_branch'],
  tasks: ['beads_epic', 'beads_phases', 'beads_tasks', 'current_phase', 'total_tasks', 'completed_tasks']
};

// Parse YAML frontmatter
const frontmatter = parseYAML(fileContent);

// Check required fields
for (const field of requiredFields.all) {
  if (!frontmatter[field]) {
    ERROR(`Missing required field: ${field}`);
  }
}
```

### Status Validation

```javascript
const validStatuses = {
  research: ['draft', 'in-progress', 'complete'],
  design: ['draft', 'ready', 'implementing', 'complete'],
  tasks: ['not-started', 'in-progress', 'complete']
};

// Check status is valid
if (!validStatuses[fileType].includes(status)) {
  ERROR(`Invalid status: ${status}. Must be one of: ${validStatuses[fileType]}`);
}

// Check status progression
if (design.status === 'ready' && research.status === 'draft') {
  ERROR('Design cannot be ready if research is still draft');
}

if (tasks.status === 'in-progress' && design.status === 'draft') {
  ERROR('Tasks cannot be in-progress if design is still draft');
}

if (design.status === 'complete' && tasks.status !== 'complete') {
  ERROR('Design cannot be complete if tasks are not complete');
}
```

### Beads Validation

```javascript
// Check beads is initialized
const beadsCheck = exec('bd info');
if (beadsCheck.failed) {
  ERROR('Beads is not initialized. Run: bd init --stealth (see beads-mode.md for when plain bd init applies)');
}

// Extract beads IDs from frontmatter
const beadsEntries = [
  ['beads_epic', tasksFrontmatter.beads_epic],
  ...Object.entries(tasksFrontmatter.beads_phases).map(([k, v]) => [`beads_phases.${k}`, v]),
  ...Object.entries(tasksFrontmatter.beads_tasks).map(([k, v]) => [`beads_tasks.${k}`, v])
];
const beadsIds = beadsEntries.map(([, id]) => id);

// Verify each ID exists
for (const [field, id] of beadsEntries) {
  const result = exec(`bd show ${id}`);
  if (result.failed) {
    ERROR(`The tasks.md frontmatter entry ${field} names a beads issue that does not exist (${id}), so that work cannot be tracked. Fix: correct the id in the frontmatter, or create the issue.`);
  }
}

// Check for orphaned beads issues
// Planning-phase records are intentionally not anchored in tasks.md frontmatter
const planningPrefixes = ['Q:', 'Decide:', 'Validate:', 'UI Q:'];
const allBeadsIssues = exec('bd list --all -n 0').parseOutput();
for (const issue of allBeadsIssues) {
  if (planningPrefixes.some(p => issue.title.startsWith(p))) {
    continue;  // exempt: planning-phase record, not an orphan
  }
  if (!beadsIds.includes(issue.id)) {
    WARNING(`A beads issue is not part of the plan: "${issue.title}" (${issue.id}). tasks.md frontmatter does not list it, so its work may fall outside this plan. Fix: add it to beads_tasks, or close it if it is no longer needed.`);
  }
}
```

### Content Validation

```javascript
// Check for placeholders
const placeholders = ['[To be added]', '[TBD]', '[TODO]', '[Fill this in]'];

for (const placeholder of placeholders) {
  if (fileContent.includes(placeholder)) {
    WARNING(`Found placeholder text: ${placeholder} in ${filename}`);
  }
}

// Check for empty sections
const sections = extractSections(fileContent);
for (const section of sections) {
  if (section.content.trim().length < 50) {
    WARNING(`Section appears empty or very short: ${section.title}`);
  }
}
```

## Error and Warning Message Catalog

### Critical Errors

```
❌ Missing Required File: tasks.md
   Location: [project-dir]/tasks.md
   Cause: File does not exist
   Impact: Cannot track implementation work
   Fix: Run /wb:create_tasks to generate tasks.md
```

```
❌ Missing Beads Epic: tasks.md names an epic that does not exist (prompts-xyz)
   Location: tasks.md frontmatter, beads_epic field
   Cause: Beads issue does not exist
   Impact: Cannot track project in beads
   Fix: Create beads epic or update frontmatter with correct ID
```

```
❌ Status Progression Violation
   Files: design.md (implementing), research.md (draft)
   Cause: Design implementing but research not complete
   Impact: Violates workflow: research must complete before design
   Fix: Complete research OR set design back to draft
```

### Warnings

```
⚠️ Missing Git Metadata
   File: research.md
   Fields: git_commit, git_branch
   Impact: Cannot track code state when research was done
   Fix: Run /wb:update_status to populate metadata
```

```
⚠️ Placeholder Content Found
   File: design.md, line 45
   Text: "[To be added]"
   Impact: Incomplete documentation
   Fix: Document the design decision or remove placeholder
```

```
⚠️ Orphaned Beads Issue
   Issue: [issue title] (prompts-abc; priority 2, status open)
   Cause: Beads issue exists but not referenced in frontmatter
   Impact: Work may be tracked that's not in plan
   Fix: Add to beads_tasks or close if no longer needed
```
