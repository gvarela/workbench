---
name: create_mockup
description: Research existing UI patterns and produce an initial mockup for a feature, with clarifying questions for the user. Use when the user asks for a mockup, wireframe, or UI draft for a planned feature; iterate afterwards with mockup-iteration. Takes the project directory and a feature description.
argument-hint: [project-directory] [feature-description]
allowed-tools: Read
---

# Create Mockup

Researches existing UI patterns, styles, and layouts, then creates an initial mockup iteration through interactive discussion. Follows the "research what EXISTS" philosophy before proposing changes.

## Purpose

This command:

- Documents current UI patterns and styles (research phase)
- Asks clarifying questions about the desired feature
- Creates a versioned mockup with rationale
- Sets up iteration tracking for refinement

Supporting files in this directory (read each when its step directs you to — never paraphrase from memory):

- [sub-agent-prompts.md](sub-agent-prompts.md) — verbatim prompts for the five Step 1 research agents
- [templates.md](templates.md) — output templates for research summary, mockup.md, decisions.md, HTML mockup, and mockup-log.md

## Initial Response

This stage needs from you: the feature to mock up, answers to the clarifying questions, and keep, remove, or change feedback on each version.

When invoked, check for arguments:

1. **If directory and feature provided** (e.g., `/create_mockup docs/plans/2025-01-08-dashboard/ "user settings panel"`):
   - Use `$1` as project directory
   - Use `$2+` as feature description
   - Begin research immediately

2. **If no arguments**:

   ```
   I'll help you create a UI mockup. Please provide:
   1. Path to the project documentation directory
   2. Brief description of what you want to mockup

   I'll research existing patterns first, then we'll discuss the design together.
   ```

## Process Steps

### Step 1: Research Existing UI

**⛔⛔⛔ BARRIER 1: STOP! Research current UI patterns before proposing anything ⛔⛔⛔**

Spawn parallel agents to document what EXISTS:

- Agent 1: Layout patterns (page layout, navigation, containers, breakpoints)
- Agent 2: Component library (buttons, forms, cards, modals, naming conventions)
- Agent 3: Styling approach (CSS method, color tokens, typography, spacing, theme)
- Agent 4: Similar features (panels/modals/pages matching the target feature type)
- Agent 5: Icon system (library, import location, usage pattern, sizing conventions)

Read the five agent prompts in [sub-agent-prompts.md](sub-agent-prompts.md) NOW before spawning — use each verbatim.

**⛔ BARRIER 2**: Wait for ALL agents to complete before proceeding.

### Step 2: Synthesize Research

Create a UI research summary using the "UI Research Summary" template in [templates.md](templates.md).

### Step 3: Clarifying Questions

**Determine what information is needed**

Before creating mockup, ask clarifying questions:

```
Based on my research of the existing UI, I have some questions:

**Scope & Purpose**
1. What problem does this [feature] solve for users?
2. Who is the primary user of this feature?

**Content & Data**
3. What information needs to be displayed?
4. What actions can users take?
5. Are there states to handle? (empty, loading, error, success)

**Placement & Flow**
6. Where does this fit in the navigation?
7. What triggers this UI to appear?
8. Where does the user go after completing this?

**Constraints**
9. Any technical constraints I should know about?
10. Mobile support required?

Please answer what you can - we can iterate on unknowns.
```

Wait for user responses before proceeding.

### Step 4: Create Mockup Directory

Set up versioned mockup structure:

```
[project-dir]/mockups/
├── mockup-log.md          # Decision log across versions
├── v001/
│   ├── mockup.md          # ASCII structure and specs
│   ├── mockup.html        # Working HTML with app styles
│   ├── preview-v001.png   # Visual screenshot
│   └── decisions.md       # Rationale for this version
├── v002/
│   ├── mockup.md
│   ├── mockup.html
│   ├── preview-v002.png
│   └── decisions.md
└── ...
```

### Step 5: Create Initial Mockup (v001)

**⛔ BARRIER 3**: No placeholders - all content must be specific based on research + answers.

Create `mockups/v001/mockup.md` using the "mockup.md v001 Template" in [templates.md](templates.md).

Create `mockups/v001/decisions.md` using the "decisions.md Template" in [templates.md](templates.md).

### Step 6: Create HTML Mockup with App Styles

**⛔ BARRIER 4**: After ASCII mockup created, generate working HTML mockup with real app styles.

Create `mockups/v001/mockup.html` using the "HTML Mockup Template" in [templates.md](templates.md).

**Critical requirements:**

1. **Import app's actual stylesheets** based on research
2. **Use discovered component HTML patterns** (copy structure from file:line references)
3. **Apply actual CSS classes/tokens** from research (no placeholder classes)
4. **Follow icon system** from research (Font Awesome, Material Icons, etc.) or text-only if none
5. **Match layout structure** from ASCII diagram
6. **Standalone file** - can be opened directly in browser

**Icon handling based on research:**

- **If Font Awesome found**: Use `<i class="fa-[style] fa-[name]"></i>` pattern
- **If Material Icons found**: Use `<span class="material-icons">[name]</span>` pattern
- **If SVG sprites found**: Use `<svg><use href="#icon-[name]"></use></svg>` pattern
- **If custom icon components**: Document pattern and ask user how to mock
- **If NO icon system found**: Use text only, create beads issue if icons needed

**Quality checks before proceeding:**

- [ ] All CSS classes are from research (no placeholder classes)
- [ ] Icon system matches research (or confirmed text-only)
- [ ] Layout structure matches ASCII diagram
- [ ] Can be opened in browser without errors
- [ ] Styling approach matches research (Tailwind/CSS modules/etc)

### Step 7: Visual Validation with Playwright

**⛔ BARRIER 5**: Validate HTML mockup visually before presenting to user.

Use Playwright to preview the mockup:

1. **Navigate to mockup**:
   - Get absolute path to mockup.html
   - Open in browser: `file:///[absolute-path]/mockups/v001/mockup.html`

2. **Take full page screenshot**:
   - Capture entire mockup
   - Save as `mockups/v001/preview-v001.png`

3. **Present visual preview to user**:

```
Visual preview of mockup v001:

[Show preview-v001.png]

Does this match your app's visual style?
- Colors match app theme? [Y/N]
- Spacing looks consistent? [Y/N]
- Typography matches app? [Y/N]
- Icons follow app pattern? [Y/N] (or text-only confirmed)
- Layout structure correct? [Y/N]

If anything looks off, let me know and I'll adjust.
```

1. **If similar feature found in research**:
   - Offer to navigate to similar page for comparison
   - Take screenshot of existing feature
   - Show side-by-side comparison

**Wait for user feedback before proceeding to Step 8.**

### Step 8: Initialize Mockup Log

Create `mockups/mockup-log.md` using the "mockup-log.md Template" in [templates.md](templates.md).

### Step 9: Present for Iteration

Present the complete mockup package to user:

```
Initial mockup created!

Location: [project-dir]/mockups/v001/

**What I created based on research:**
- Layout following [pattern] from [similar feature]
- Using components: [list with file:line]
- Styling: [CSS approach from research]
- Icons: [icon system from research, or text-only]

**Files created:**
- mockup.md - ASCII structure and specifications
- mockup.html - Working HTML with app's actual styles
- decisions.md - Rationale for design choices
- preview-v001.png - Visual screenshot

**Key decisions made:**
1. [Decision 1] - because [rationale from research]
2. [Decision 2] - because [rationale from research]

**Open questions:**
[List any beads issues created for UI questions]

**Next steps:**
- Review the visual preview above
- Open mockups/v001/mockup.html in browser to interact
- Review mockups/v001/mockup.md for structure details
- Provide feedback - just discuss what to keep, change, or remove
- Each iteration will update both ASCII and HTML with decisions captured

Ready to iterate? Just tell me what to keep, change, or remove.
```

## Output Files

| File | Purpose |
| ------ | --------- |
| `mockups/mockup-log.md` | Track all versions and running requirements |
| `mockups/v001/mockup.md` | ASCII structure and specifications |
| `mockups/v001/mockup.html` | Working HTML mockup with app's actual styles |
| `mockups/v001/decisions.md` | Rationale for this version |
| `mockups/v001/preview-v001.png` | Visual screenshot of HTML mockup |

## Important Guidelines

### Research First

- ALWAYS research existing UI before proposing
- Reference specific file:line locations
- Follow established patterns unless explicitly breaking them

### Clarifying Questions

- Ask before assuming
- Understand the WHY not just the WHAT
- Identify constraints early

### Versioning

- Never overwrite - always create new version
- Document what changed and why
- Keep decision trail for design.md

### Fidelity

- ASCII mockups for layout structure discussion
- HTML mockups with app's actual styles for visual validation
- Component specs for implementation detail (copied from research)
- Icon system from research (no placeholder icons/emojis)
- State documentation for edge cases
- Visual screenshots for design approval

## Relationship to Other Commands

**Typical workflow:**

1. `/wb:create_research` - Understand the codebase
2. **`/wb:create_mockup`** - Research UI + create initial mockup
3. [Iterate with mockup-iteration skill]
4. `/wb:explore_design` - (optional) Explore architecture directions, record decision
5. `/wb:create_design` - Finalize design from mockup decisions
6. `/wb:create_tasks` - Plan implementation

The mockup process feeds into design.md with validated requirements.
