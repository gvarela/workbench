# Context and Model

What a worker is given, and which model it runs on. Part of the implement skill; read it when SKILL.md or another playbook points here.

## Context Package Structure (Step 3)

Build exactly this structure from the documentation you've read. It holds what the agents cannot read for themselves: your choices from the plan and the state of this session. Task text and criteria are not in it, because each agent reads its task with `bd show <id> --json` and the cited criteria from the plan directory, so a prompt does not paste them.

```javascript
const contextPackage = {
  // The project directory the skill was given; agents read design.md, tasks.md,
  // and research.md there
  planDir: "docs/plans/<date>-<project>/",

  // From design.md - the reason behind the phase: what it delivers and who it serves
  why: "<one or two sentences from design.md: what this phase delivers and who it serves>",

  // From research.md - patterns workers must follow
  patterns: {
    testingFramework: "jest | pytest | go test | ...",
    testFileLocation: "tests/ | __tests__ | *_test.go | ...",
    fileStructure: "src/ layout | pkg/ layout | ...",
    namingConventions: "camelCase | snake_case | ...",
    importPatterns: "how modules are imported",
    errorHandling: "established patterns"
  },

  // From design.md - the constraints that bear on this phase's tasks
  design: {
    constraints: ["constraint 1", "constraint 2"]
  },

  // From tasks.md frontmatter
  beads: {
    epicId: "beads-xxx",
    phaseMilestoneId: "beads-yyy"
  },

  // Test commands, taken from the conventions source the test-quality skill names
  // (research.md's Testing Conventions section; .claude/wb/testing.md when research
  // has none), not guessed from the language
  testCommands: {
    unit: "<unit command from the conventions>",
    specific: "<command that runs one file or test, from the conventions>",
    coverage: "<coverage command from the conventions, if it names one>"
  },

  // Per task, built when the task is about to run: the commits this session
  // made, which no plan document records, and the conventions for the red run.
  taskTestContext: {
    // The commit the task begins from (git rev-parse HEAD, recorded before any
    // outer test or worker work); the verifier diffs against it
    startingCommit: "<sha>",

    // One entry per acceptance criterion the task cites (the task's "Serves" line).
    // The criterion's text, examples, observed-at, and seam stay in design.md,
    // where each agent reads them
    criteria: [
      {
        id: "AC-n",
        title: "criterion title (for the red commit message)",
        testFile: "the test file named in its outer test step in tasks.md",
        redCommit: "<sha of the latest red(AC-n) commit for its outer test; a sanctioned rewrite's replaces the original>"
      }
    ],

    // From the conventions source above, per boundary a criterion is observed at;
    // you use them for the red run, and the agents read the same source themselves
    conventions: {
      "<boundary>": {
        command: "how to run tests at this boundary",
        skipMarkers: "the skip markers the project uses",
        harness: "the harness or fixture setup the boundary needs"
      }
    }
  },

  // File references relevant to this phase.
  // Be precise and generous here: every file:line fact you supply is a Read the
  // worker doesn't spend, and naming the exact files a task must change removes
  // its discovery sweep entirely. Coordinator context is already loaded; worker
  // tool-call budget is scarce.
  relevantFiles: [
    "src/feature/file1.ts:123 - existing pattern to follow",
    "tests/feature/test1.spec.ts:45 - test structure example"
  ]
};
```

### Plans without acceptance criteria

A plan that predates 5.0.0 cites no criteria. Then `taskTestContext` holds only `startingCommit` and `conventions`, and no outer tests, outer reports, or red commits exist. The rule that workers never edit tests still applies, and the verifier still checks test integrity against the starting commit, because both protect the tests regardless of how the plan was written.

## Worker Model Selection (Step 5)

Model choice is coordinator judgment. The tier rule lives in one place, SKILL.md Step 5 item 4 ("Determine model"), and is passed as a per-spawn model override on the `task-worker` agent.
