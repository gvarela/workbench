import { describe, expect, test } from 'claude-code/testing'

import {
  bandLines,
  buildPlanningModel,
  chooseGuess,
  isCreatedPlanWrite,
  latestInvocation,
  paneSections,
  pinFrom,
  pinFromPrompt,
  readDesign,
  readIntent,
  readResearch,
  readTasks,
  stageOfCommand,
  statusLine,
} from '../hooks/model.mjs'

// ── Generic plan documents, one per stage of the workflow ──

const README = `# demo-plan

**Created**: 2026-01-01
**Status**: Planning

## Intent

**Goal**: Let readers reset a forgotten password.

**Success looks like**:

- A reader with an expired link is told so and offered a new one
- A reader can set a new password from the reset form
- Reset mail arrives within a minute

**Non-goals**:

- Single sign-on

**Amendments**:

- (none yet; explore_design and create_design append a dated line here when the Goal or a Non-goal changes)

## Documentation Structure

- **[research.md](research.md)** - Codebase research and findings
`

const README_VALIDATED = README
  .replace('offered a new one', 'offered a new one → PASS (2026-02-01)')
  .replace('from the reset form', 'from the reset form → PASS (2026-02-01)')
  .replace('within a minute', 'within a minute → DEFERRED (2026-02-01)')

const RESEARCH_SKELETON = `---
project: demo-plan
created: 2026-01-01
status: draft
---

# Research: demo-plan

## Research Question

[What are we trying to understand? To be filled by /wb:create_research]
`

const RESEARCH_DONE = `---
project: demo-plan
created: 2026-01-01
status: complete
---

# Research: demo-plan

## Summary

The reset flow lives in the accounts module.

## Intent Coverage

Against the README Intent's "Success looks like" statements:

- **Statements the findings bear on**:
  - "A reader with an expired link is told so and offered a new one" — token expiry in the accounts module
  - "A reader can set a new password from the reset form" — the reset form handler
- **Statements the findings do not touch**: "Reset mail arrives within a minute"

## Testing Conventions

- **Frameworks and versions**: an xUnit-style runner
- **Commands**: fast: \`make test\`; full: \`make test-all\`
- **Skip markers**: none
`

const DESIGN_SKELETON = `---
project: demo-plan
created: 2026-01-01
status: draft
---

# Design: demo-plan

## Problem Statement

### Success Metrics
- [ ] [To be defined]

## Success Criteria

### Acceptance Criteria
- [ ] [To be defined]

### Harness Decisions
- [To be defined]
`

function designMd(status: string) {
  return `---
project: demo-plan
created: 2026-01-01
status: ${status}
---

# Design: demo-plan

## Problem Statement

### Success Metrics
- **M1** Expired links say so on every attempt (refines: "A reader with an expired link is told so and offered a new one")
- **M2** The form accepts a new password
  (refines: "A reader can set a new password from the reset form")
- **M3** Reset pages render in under a second
- Deferred: "Reset mail arrives within a minute" — needs the mail provider

## Success Criteria

### Acceptance Criteria

- **AC-1 Expired links say so**
  - Given a link issued at 10:00, valid for 2 hours
  - When it is opened at 12:01
  - Then the page says the link has expired
  - Example: opened 11:59 shows the form, opened 12:01 shows "expired"
  - Refines: M1
- **AC-2 Reset form accepts a new password**
  - Given a valid link
  - When a new password is submitted
  - Then the reader can sign in with it
  - Example: [real input values → real expected output]
  - Refines: M2

### Harness Decisions

| Boundary | Harness present? | Decision |
|----------|------------------|----------|
| HTTP | request specs exist | Use as is |
| Mail | none | TBD |

### Non-Functional Requirements
- [ ] Performance: [Specific metric]
`
}

const TASKS_SKELETON = `---
project: demo-plan
created: 2026-01-01
status: not-started
current_phase: 0
---

# Tasks: demo-plan

## Implementation Phases

[To be populated by /wb:create_tasks after design is approved]
`

const TASKS_BODY = `
# Execution Plan: demo-plan

## Phase 1: Expiry

#### Outer Test Steps
- AC-1: Expired links say so, observed at the reset page → \`[beads:phase1_outer_1]\`

#### Implementation Tasks
- Expire old links → \`[beads:phase1_impl_1]\`

## Phase 2: Form

- Build the reset form → \`[beads:phase2_impl_1]\`
`

const TASKS_WRITTEN = `---
project: demo-plan
created: 2026-01-01
status: not-started
current_phase: 1
---
${TASKS_BODY}`

const TASKS_WITH_BEADS = `---
project: demo-plan
created: 2026-01-01
status: not-started
current_phase: 1
beads_epic: ex-epic
beads_phases:
  phase1_milestone: ex-m1
  phase2_milestone: ex-m2
beads_tasks:
  phase1_outer_1: ex-o1
  phase1_impl_1: ex-t1
  phase2_impl_1: ex-t2
---
${TASKS_BODY}`

type Docs = { readme?: string; research?: string; design?: string; tasks?: string }

function planning(docs: Docs, extra: Record<string, unknown> = {}) {
  return buildPlanningModel({
    planName: 'demo-plan',
    intent: docs.readme === undefined ? null : readIntent(docs.readme),
    research: readResearch(docs.research ?? null),
    design: readDesign(docs.design ?? null),
    tasks: readTasks(docs.tasks ?? null),
    since: '2026-01-01',
    ...extra,
  })
}

const JUST_CREATED: Docs = { readme: README, research: RESEARCH_SKELETON, design: DESIGN_SKELETON, tasks: TASKS_SKELETON }
const RESEARCHED: Docs = { ...JUST_CREATED, research: RESEARCH_DONE }
const DESIGNED: Docs = { ...RESEARCHED, design: designMd('draft') }
const PLANNED: Docs = { ...RESEARCHED, design: designMd('ready'), tasks: TASKS_WRITTEN }

describe('stage chain and signals, per planning stage', () => {
  test('project: create_project just ran, so the project stage is current', () => {
    const lines = bandLines(planning(JUST_CREATED, { last: 'project' })).text
    expect(lines.progress).toBe('Plan: demo-plan · Project ● → Research ○ → Design ○ → Tasks ○ → Implement ○ → Validate ○')
    expect(lines.tests).toBe('Project: ✓ nothing needs you · Intent: 3 success statements · 1 non-goal')
  })

  test('research: with no command this session, the first stage not done is current, with its status', () => {
    const lines = bandLines(planning(JUST_CREATED)).text
    expect(lines.progress).toBe('Plan: demo-plan · Project ✓ → Research ● draft → Design ○ → Tasks ○ → Implement ○ → Validate ○')
    expect(lines.tests).toBe('Research: ✓ nothing needs you · research.md not written yet')
  })

  test('research: written research shows testing conventions, Intent coverage, and open questions after what needs you', () => {
    const open = [{ id: 'ex-q1', title: 'Q: Which mail provider sends resets?', status: 'open', created_at: '2026-01-02T00:00:00Z' }]
    const lines = bandLines(planning(RESEARCHED, { last: 'research', openIssues: open })).text
    expect(lines.progress).toBe('Plan: demo-plan · Project ✓ → Research ● complete → Design ○ → Tasks ○ → Implement ○ → Validate ○')
    expect(lines.tests).toBe('Research: ⚠ open question: Which mail provider sends resets? (ex-q1) · testing conventions yes · Intent 2/3 covered · 1 open question')
  })

  test('explore: a thoughts doc with no recorded decision waits for you', () => {
    const lines = bandLines(planning(RESEARCHED, { last: 'explore', explore: { thoughts: 1, isDecided: false } })).text
    expect(lines.progress).toBe('Plan: demo-plan · Project ✓ → Research ✓ → Explore ● open → Design ○ → Tasks ○ → Implement ○ → Validate ○')
    expect(lines.tests).toBe('Explore: ⚠ exploration has no recorded decision yet · 1 thoughts doc · no decision recorded')
  })

  test('design: a written draft waits for your approval, then shows criteria, harness, metrics and decisions', () => {
    const model = planning(DESIGNED)
    const lines = bandLines(model).text
    expect(lines.progress).toBe('Plan: demo-plan · Project ✓ → Research ✓ → Design ● draft → Tasks ○ → Implement ○ → Validate ○')
    expect(lines.tests).toBe('Design: ⚠ design.md waiting for your approval · 2 criteria, 1 with examples · harness 1/2 decided · 2/3 metrics cite Intent · 0 open decisions')
    expect(model.next).toEqual({ before: 'approve design.md, then ', command: '/wb:create_tasks' })
  })

  test('tasks: phases, tasks, outer-test coverage, and whether beads exists yet', () => {
    const lines = bandLines(planning(PLANNED, { last: 'tasks' })).text
    expect(lines.progress).toBe('Plan: demo-plan · Project ✓ → Research ✓ → Design ✓ → Tasks ● not-started → Implement ○ → Validate ○')
    expect(lines.tests).toBe('Tasks: ✓ nothing needs you · 2 phases, 3 tasks · outer tests for 1/2 criteria · beads not created yet')
  })

  test('a later stage done marks the earlier ones done, whatever their own status', () => {
    const model = planning({ ...PLANNED, research: RESEARCH_SKELETON })
    expect(model.stages.map((stage: { key: string; state: string }) => `${stage.key}:${stage.state}`)).toEqual([
      'project:done', 'research:done', 'design:done', 'tasks:current', 'implement:todo', 'validate:todo',
    ])
  })

  test('validate is done once every Intent statement carries a verdict', () => {
    const model = planning({ ...PLANNED, readme: README_VALIDATED })
    expect(model.stages.every((stage: { isDone: boolean }) => stage.isDone)).toBe(true)
    expect(model.signals.validate).toEqual(['verdicts on 3/3 Intent statements'])
  })

  test('the status line and the pane carry the same stages', () => {
    const model = { ...planning(DESIGNED), selection: { kind: 'pinned', by: '/wb:create_design', at: 0, planName: 'demo-plan', dir: 'docs/plans/2026-01-01-demo', worktree: null } }
    expect(statusLine(model)).toBe('wb demo-plan: design (draft) · P✓ R✓ D● T○ I○ V○ · ⚠ 1')
    const sections = paneSections(model)
    expect(sections.map((section: { heading: string }) => section.heading)).toEqual(['Plan', 'Planning', 'Needs your decision'])
    expect(sections[1].rows).toEqual([
      '✓ Project · docs/plans/2026-01-01-demo/README.md · Intent: 3 success statements · 1 non-goal',
      '✓ Research (complete) · docs/plans/2026-01-01-demo/research.md · testing conventions yes · Intent 2/3 covered · 0 open questions',
      '● Design (draft) · docs/plans/2026-01-01-demo/design.md · 2 criteria, 1 with examples · harness 1/2 decided · 2/3 metrics cite Intent · 0 open decisions',
      '○ Tasks (not-started) · docs/plans/2026-01-01-demo/tasks.md · tasks.md not written yet',
      '○ Implement · docs/plans/2026-01-01-demo/tasks.md · no beads tasks yet',
      '○ Validate · docs/plans/2026-01-01-demo/README.md · verdicts on 0/3 Intent statements',
      'Next: approve design.md, then /wb:create_tasks docs/plans/2026-01-01-demo',
    ])
    expect(sections[2].rows).toEqual(['⚠ design.md waiting for your approval'])
  })
})

describe('the explore stage', () => {
  test('is hidden when the plan has no thoughts doc and no recorded decision', () => {
    const lines = bandLines(planning(RESEARCHED)).text
    expect(lines.progress.includes('Explore')).toBe(false)
  })

  test('is shown, done, once a decision is recorded', () => {
    const lines = bandLines(planning(RESEARCHED, { explore: { thoughts: 2, isDecided: true } })).text
    expect(lines.progress).toBe('Plan: demo-plan · Project ✓ → Research ✓ → Explore ✓ → Design ● draft → Tasks ○ → Implement ○ → Validate ○')
  })

  test('is never the current stage on its own: an unconverged exploration leaves design current', () => {
    const model = planning(RESEARCHED, { explore: { thoughts: 1, isDecided: false } })
    expect(model.current).toBe('design')
    expect(bandLines(model, 40).text.progress).toBe('Plan: demo-plan · P✓ R✓ E○ D● T○ I○ V○')
  })
})

describe('a narrow band', () => {
  test('drops words before symbols on line 1, and signals before what needs you on line 2', () => {
    const model = planning(DESIGNED)
    const at = (columns: number) => bandLines(model, columns).text
    expect(at(94).progress).toBe('Plan: demo-plan · Project ✓ → Research ✓ → Design ● draft → Tasks ○ → Implement ○ → Validate ○')
    expect(at(90).progress).toBe('Plan: demo-plan · Project ✓ → Research ✓ → Design ● → Tasks ○ → Implement ○ → Validate ○')
    expect(at(60).progress).toBe('Plan: demo-plan · P✓ R✓ Design ● draft T○ I○ V○')
    expect(at(45).progress).toBe('Plan: demo-plan · P✓ R✓ Design ● T○ I○ V○')
    expect(at(38).progress).toBe('Plan: demo-plan · P✓ R✓ D● T○ I○ V○')
    expect(at(30).progress).toBe('demo-plan · P✓ R✓ D● T○ I○ V○')
    expect(at(20).progress).toBe('P✓ R✓ D● T○ I○ V○')

    expect(at(100).tests).toBe('Design: ⚠ design.md waiting for your approval · 2 criteria, 1 with examples · harness 1/2 decided')
    expect(at(45).tests).toBe('Design: ⚠ design.md waiting for your approval')
    expect(at(40).tests).toBe('⚠ design.md waiting for your approval')
    expect(at(20).tests).toBe('⚠ design.md…')
    for (const columns of [20, 30, 38, 45, 60, 90, 100]) {
      expect([...at(columns).progress].length <= columns).toBe(true)
      expect([...at(columns).tests].length <= columns).toBe(true)
    }
  })

  test('a long question title is shortened, keeping its id, before the stage signals go', () => {
    const open = [
      { id: 'ex-q1', title: 'Q: Which mail provider sends the password reset messages to readers in every region we serve?', status: 'open', created_at: '2026-01-02T00:00:00Z' },
      { id: 'ex-q2', title: 'Q: Who owns the reset copy?', status: 'open', created_at: '2026-01-02T00:00:00Z' },
    ]
    const model = planning(RESEARCHED, { last: 'research', openIssues: open })
    const wide = bandLines(model, 100).text.tests
    expect(wide).toBe('Research: ⚠ open question: Which mail provider sends the… (ex-q1) +1 more · testing conventions yes')
    expect(bandLines(model, 140).text.tests).toMatch(/^Research: ⚠ open question: Which mail provider[^·]*… \(ex-q1\) \+1 more · testing conventions yes · Intent 2\/3 covered · 2 open questions$/)
    expect([...wide].length <= 100).toBe(true)
    // Too narrow for a readable stub beside any signal: the full item, shortened as a whole.
    expect(bandLines(model, 50).text.tests).toBe('⚠ open question: Which mail provider sends the…')
  })

  test('the stage marks are colored by state and keep their symbols', () => {
    const progress = bandLines(planning(DESIGNED), 38).progress
    const toneOf = (text: string) => progress.filter((one: { text: string }) => one.text === text).map((one: { tone: string }) => one.tone)
    expect(toneOf('✓')).toEqual(['ok', 'ok'])
    expect(toneOf('●')).toEqual(['accent'])
    expect(toneOf('○')).toEqual(['track', 'track', 'track'])
  })
})

describe('planning helpers', () => {
  test('every planning command pins the plan directory its arguments name', () => {
    expect(pinFromPrompt({ text: '/wb:create_research docs/plans/2026-01-01-demo/ how does the reset flow work' }, 1)).toEqual({ path: 'docs/plans/2026-01-01-demo', by: '/wb:create_research', at: 1 })
    expect(pinFromPrompt({ text: '/wb:create_design docs/plans/2026-01-01-demo' }, 1)?.path).toBe('docs/plans/2026-01-01-demo')
    expect(pinFromPrompt({ text: '/wb:explore_design docs/plans/2026-01-01-demo/' }, 1)?.path).toBe('docs/plans/2026-01-01-demo')
    expect(pinFrom('wb:create_tasks', 'docs/plans/2026-01-01-demo', 1)?.by).toBe('/wb:create_tasks')
    expect(pinFromPrompt({ text: '/wb:create_project reset-flow docs/plans TICKET-1' }, 1)).toBe(null)
    expect(['wb:create_project', 'wb:create_product_research', 'wb:explore_design', 'wb:implement_inline', 'wb:update_status'].map(stageOfCommand)).toEqual(['project', 'research', 'explore', 'implement', null])
  })

  test('after /wb:create_project, a write to a new plan folder or its README names the plan', () => {
    expect(isCreatedPlanWrite('/repo/docs/plans/2026-01-02-new/research.md', ['2026-01-01-old'])).toBe(true)
    expect(isCreatedPlanWrite('/repo/docs/plans/2026-01-01-old/research.md', ['2026-01-01-old'])).toBe(false)
    expect(isCreatedPlanWrite('/repo/docs/plans/2026-01-01-old/README.md', ['2026-01-01-old'])).toBe(true)
    expect(isCreatedPlanWrite('/repo/src/app.ts', [])).toBe(false)
    expect(latestInvocation([
      { role: 'user', text: '/wb:create_project reset-flow', toolUses: [] },
      { role: 'assistant', text: '', toolUses: [{ tool: 'Write', input: { file_path: '/repo/docs/plans/2026-01-02-reset-flow/README.md' } }] },
    ], 7)).toEqual({ pin: { path: '/repo/docs/plans/2026-01-02-reset-flow', by: '/wb:create_project', at: 7 }, stage: { by: '/wb:create_project', at: 7 } })
  })

  test('guessing: work in progress wins; else the most recent of beads activity and a fresh planning file', () => {
    const beadsPlan = { name: '2026-01-01-a', fm: { beads_epic: 'aa-epic', beads_tasks: { phase1_impl_1: 'aa-t1' } } }
    const issue = (status: string, at: string) => [{ id: 'aa-t1', title: 'Task', status, parent: 'aa-epic', updated_at: at }]
    const fresh = { name: '2026-02-01-b', newest: { name: 'design.md', mtimeMs: Date.UTC(2026, 9, 20) } }
    const stale = { name: '2026-03-01-c', newest: { name: 'README.md', mtimeMs: Date.UTC(2026, 5, 1) } }
    const now = Date.UTC(2026, 9, 22)
    const month = 30 * 24 * 60 * 60 * 1000
    expect(chooseGuess([beadsPlan], issue('in_progress', '2026-01-02T00:00:00Z'), [fresh], now, month)?.candidate).toBe(beadsPlan)
    expect(chooseGuess([beadsPlan], issue('open', '2026-01-02T00:00:00Z'), [fresh], now, month)?.selection).toEqual({ kind: 'recent-file', file: 'design.md', at: fresh.newest.mtimeMs })
    expect(chooseGuess([beadsPlan], issue('open', '2026-10-21T00:00:00Z'), [fresh], now, month)?.candidate).toBe(beadsPlan)
    expect(chooseGuess([], [], [stale], now, month)).toBe(null)
    expect(chooseGuess([], [], [stale, fresh], now, month)?.candidate).toBe(fresh)
  })
})

// ── The mod, over a file tree with modification times ──

const ROOT = '/repo'
const NOW = Date.UTC(2026, 9, 22, 14, 5)
const DAY = 24 * 60 * 60 * 1000

type File = { text: string; mtimeMs: number }
type Issue = Record<string, unknown> & { id: string; title: string; status: string }
type World = { files: Record<string, File>; issues: Issue[] }

const file = (text: string, daysAgo = 1): File => ({ text, mtimeMs: NOW - daysAgo * DAY })

function stage(on: any, world: World) {
  const has = (path: string) => path in world.files
  const isDir = (path: string) => Object.keys(world.files).some(one => one.startsWith(`${path}/`))
  on('session.root', () => ({ value: ROOT }))
  on('session.cwd', () => ({ value: ROOT }))
  on('session.surfaces', () => ({ value: ['terminal'] }))
  on('session.messages', () => ({ value: [] }))
  on('fs.exists', ($: unknown, e: { path: string }) => ({ value: has(e.path) || isDir(e.path) }))
  on('fs.read', ($: unknown, e: { path: string }) => ({ value: world.files[e.path]?.text ?? '' }))
  on('fs.list', ($: unknown, e: { path: string }) => {
    const out = new Map<string, { name: string; kind: string; size: number; mtimeMs: number; isLink: boolean }>()
    for (const [path, one] of Object.entries(world.files)) {
      if (!path.startsWith(`${e.path}/`)) continue
      const rest = path.slice(e.path.length + 1)
      const name = rest.split('/')[0]
      out.set(name, rest.includes('/')
        ? { name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false }
        : { name, kind: 'file', size: one.text.length, mtimeMs: one.mtimeMs, isLink: false })
    }
    return { value: [...out.values()] }
  })
  on('process.run', ($: unknown, e: { argv: readonly string[] }) => {
    const argv = e.argv.filter(arg => arg !== '--no-optional-locks')
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '' } })
    if (argv[0] === 'git' && argv[1] === 'worktree') return ok(`worktree ${ROOT}\nHEAD abc\nbranch refs/heads/main\n`)
    if (argv[0] === 'git' && argv[1] === 'rev-parse') return ok(`${ROOT}\n`)
    if (argv[0] === 'git') return ok('')
    if (argv[0] === 'bd' && argv[1] === 'list') {
      const at = (flag: string) => argv[argv.indexOf(flag) + 1]
      let list = world.issues
      if (argv.includes('--parent')) list = list.filter(issue => issue.parent === at('--parent'))
      else if (argv.includes('--id')) list = list.filter(issue => at('--id').split(',').includes(issue.id))
      else if (argv.includes('--status')) {
        const wanted = at('--status').split(',')
        list = list.filter(issue => wanted.includes(issue.status))
      }
      if (argv.includes('--title-contains')) list = list.filter(issue => issue.title.includes(at('--title-contains')))
      return ok(JSON.stringify(list))
    }
    if (argv[0] === 'bd' && argv[1] === 'comments') return ok('[]')
    return ok('')
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.after', () => ({ value: undefined }))
  on('clock.every', () => ({ value: undefined }))
  on('prompt.submit', ($: unknown, e: { text: string }) => ({ text: e.text }))
  on('tool.call', () => ({ result: 'ok' }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return Text({ children: [' '] })
  })
}

const BAND_PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 200, scroll: { offset: 0, bodyRows: 10 }, view: {} }
const PANE_PROPS = { title: 'wb status', isFocused: false, bodyColumns: 200, placement: 'inline', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const

/** The band's two lines and the pane's rows, as drawn. */
async function look($: any) {
  const band = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const textOf = (node: any): string => (typeof node === 'string' ? node : (node?.children ?? []).map(textOf).join(''))
  const rows = (await band.findAll({ type: 'Box' })).filter((one: any) => one.props?.flexDirection === 'row')
  const lines = rows.map(textOf)
  const texts = (await band.findAll({ type: 'Text' })).map((one: { text: string }) => one.text)
  await band.unmount()
  const pane = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'Pane', requestId: 'wb-status', props: PANE_PROPS })
  const paneRows = (await pane.findAll({ type: 'Text' })).map((one: { text: string }) => one.text)
  await pane.unmount()
  return { band: texts.join(''), lines, pane: paneRows }
}

const read = ($: any) => $.command.run({ command: 'wb-status', args: '' })
const OLD = `${ROOT}/docs/plans/2026-01-01-older`
const NEW = `${ROOT}/docs/plans/2026-10-22-reset-flow`
const NEW_README = README.replace('# demo-plan', '# reset-flow')

function olderPlanOnly(daysAgo = 2): World {
  return {
    files: {
      [`${OLD}/README.md`]: file(README.replace('# demo-plan', '# older-plan'), daysAgo),
      [`${OLD}/research.md`]: file(RESEARCH_SKELETON.replace('demo-plan', 'older-plan'), daysAgo),
      [`${OLD}/tasks.md`]: file(TASKS_SKELETON.replace('demo-plan', 'older-plan'), daysAgo),
    },
    issues: [],
  }
}

describe('create_project pins the folder it creates', () => {
  test('a Write into a new plan folder pins it, with project as the current stage', async ($, on) => {
    const world = olderPlanOnly()
    stage(on, world)
    await $.prompt.submit({ text: '/wb:create_project reset-flow' })
    world.files[`${NEW}/README.md`] = file(NEW_README, 0)
    await $.tool.call({ tool: 'Write', file_path: `${NEW}/README.md`, content: NEW_README })
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: reset-flow · Project ● → Research ○ → Design ○/)
    expect(seen.band.includes('(guessed)')).toBe(false)
    expect(seen.pane.some(row => /^Pinned by \/wb:create_project at \d\d:\d\d\.$/.test(row))).toBe(true)
    expect(seen.pane).toContain('docs/plans/2026-10-22-reset-flow')
  })

  test('a plan folder that appears after the Skill tool ran it is pinned on the next reading', async ($, on) => {
    const world = olderPlanOnly()
    stage(on, world)
    await $.tool.call({ tool: 'Skill', tool_use_id: 'call-1', skill: 'wb:create_project', args: 'reset-flow' })
    world.files[`${NEW}/README.md`] = file(NEW_README, 0)
    world.files[`${NEW}/tasks.md`] = file(TASKS_SKELETON.replace('demo-plan', 'reset-flow'), 0)
    await $.tool.call({ tool: 'Bash', command: 'mkdir -p docs/plans/2026-10-22-reset-flow' })
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: reset-flow · Project ●/)
    expect(seen.pane.some(row => /^Pinned by \/wb:create_project at \d\d:\d\d\.$/.test(row))).toBe(true)
  })

  test('a write to an existing plan folder does not take the pin', async ($, on) => {
    const world = olderPlanOnly()
    world.files[`${NEW}/README.md`] = file(NEW_README, 3)
    stage(on, world)
    await $.prompt.submit({ text: '/wb:create_project another' })
    await $.tool.call({ tool: 'Edit', file_path: `${OLD}/research.md`, old_string: 'a', new_string: 'b' })
    await read($)
    expect((await look($)).band).toMatch(/\(guessed\)/)
  })
})

describe('guessing among planning plans', () => {
  test('with no beads plan, the planning plan whose file changed last is shown, marked guessed', async ($, on) => {
    const world = olderPlanOnly(1)
    world.files[`${NEW}/README.md`] = file(NEW_README, 5)
    world.files[`${NEW}/research.md`] = file(RESEARCH_DONE, 5)
    stage(on, world)
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: older-plan \(guessed\) · Project ✓ → Research ● draft/)
    expect(seen.pane.some(row => row.startsWith('Guessed from the most recently changed plan file: README.md, changed '))).toBe(true)
  })

  test('a planning plan untouched for over a month is not guessed', async ($, on) => {
    stage(on, olderPlanOnly(45))
    await read($)
    const seen = await look($)
    expect(seen.band.includes('Plan:')).toBe(false)
    expect(seen.pane[0]).toMatch(/^No active wb plan/)
  })

  test('the explore stage shows from a thoughts doc and a closed Decide: record naming the plan', async ($, on) => {
    const world = olderPlanOnly(1)
    world.files[`${OLD}/research.md`] = file(RESEARCH_DONE, 1)
    world.files[`${OLD}/thoughts/2026-01-03-direction.md`] = file('---\nstatus: exploration\n---\n', 1)
    world.issues = [{ id: 'ex-d1', title: 'Decide: token storage', status: 'closed', close_reason: 'Chose signed tokens. See docs/plans/2026-01-01-older/thoughts/2026-01-03-direction.md' }]
    stage(on, world)
    await read($)
    expect((await look($)).band).toMatch(/Research ✓ → Explore ✓ → Design ● → Tasks ○/)
  })
})

describe('from tasks to the implement view', () => {
  test('once tasks.md names beads tasks, the band shows phase progress with a compact stage chain at the end', async ($, on) => {
    const dir = `${ROOT}/docs/plans/2026-01-01-demo`
    const world: World = {
      files: {
        [`${dir}/README.md`]: file(README),
        [`${dir}/research.md`]: file(RESEARCH_DONE),
        [`${dir}/design.md`]: file(designMd('ready')),
        [`${dir}/tasks.md`]: file(TASKS_WRITTEN),
      },
      issues: [
        { id: 'ex-epic', title: 'Epic', status: 'open', issue_type: 'epic' },
        { id: 'ex-m1', title: 'Phase 1 Milestone', status: 'open', parent: 'ex-epic' },
        { id: 'ex-m2', title: 'Phase 2 Milestone', status: 'open', parent: 'ex-epic' },
        { id: 'ex-o1', title: 'Outer test for AC-1', status: 'closed', parent: 'ex-epic' },
        { id: 'ex-t1', title: 'Expire old links', status: 'in_progress', parent: 'ex-epic', updated_at: '2026-01-03T00:00:00Z' },
        { id: 'ex-t2', title: 'Build the reset form', status: 'open', parent: 'ex-epic' },
      ],
    }
    stage(on, world)
    await $.prompt.submit({ text: '/wb:create_tasks docs/plans/2026-01-01-demo' })
    await read($)
    let seen = await look($)
    expect(seen.lines[0]).toBe('Plan: demo-plan · Project ✓ → Research ✓ → Design ✓ → Tasks ● not-started → Implement ○ → Validate ○')
    expect(seen.lines[1]).toBe('Tasks: ✓ nothing needs you · 2 phases, 3 tasks · outer tests for 1/2 criteria · beads not created yet')

    // create_tasks writes the beads ids into the frontmatter.
    world.files[`${dir}/tasks.md`] = file(TASKS_WITH_BEADS, 0)
    await $.prompt.submit({ text: '/wb:implement docs/plans/2026-01-01-demo 1' })
    await read($)
    seen = await look($)
    expect(seen.lines[0]).toBe('Plan: demo-plan · Phase 1/2 ━━━━━───── 1/2 tasks · now: Expire old links (ex-t1) · P✓ R✓ D✓ T✓ I● V○')
    expect(seen.lines[1]).toBe('Tests: ✓ nothing needs you · red-first 0/2 · verifier none yet')
    expect(seen.pane.slice(0, 1)).toEqual(['Plan'])
    expect(seen.pane).toContain('Planning')
    expect(seen.pane).toContain('● Implement · docs/plans/2026-01-01-demo/tasks.md')
    expect(seen.pane).toContain('Next: /wb:implement docs/plans/2026-01-01-demo')
  })
})
