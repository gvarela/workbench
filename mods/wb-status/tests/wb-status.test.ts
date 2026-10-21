import { describe, expect, test } from 'claude-code/testing'

import {
  bandLines,
  buildModel,
  isActivePlan,
  isRefreshCommand,
  paneSections,
  parseCriteria,
  parseFrontmatter,
  parseJsonArray,
  planIds,
  redCommits,
} from '../hooks/model.mjs'

const TASKS_MD = `---
project: demo-plan
status: in-progress
created: 2026-01-01
current_phase: 1 # stale on purpose: the mod derives the phase from beads
beads_epic: ex-epic
beads_phases:
  phase1_milestone: ex-m1
  phase2_milestone: ex-m2
beads_tasks:
  # Phase 1 tasks
  phase1_outer_1: ex-o1
  phase1_impl_1: ex-t1  # closed: done
  phase2_impl_1: ex-t2
  phase2_impl_2: ex-t3
---

# Demo tasks
`

const DESIGN_MD = `## Acceptance Criteria

- **AC-1 Expired links say so**
  - Given a link
- **AC-2 Reset form accepts a new password**
  - Given a form
`

const ISSUES = [
  { id: 'ex-epic', title: 'Epic', status: 'open', issue_type: 'epic' },
  { id: 'ex-m1', title: 'Phase 1 Milestone', status: 'closed' },
  { id: 'ex-m2', title: 'Phase 2 Milestone', status: 'open' },
  { id: 'ex-o1', title: 'Outer test for AC-1', description: 'Serves AC-1', status: 'closed' },
  { id: 'ex-t1', title: 'Expire old links', description: 'Serves AC-1', status: 'closed', updated_at: '2026-01-02T00:00:00Z', comment_count: 2 },
  { id: 'ex-t2', title: 'Build the reset form', description: 'Serves AC-2', status: 'in_progress', updated_at: '2026-01-03T00:00:00Z', comment_count: 1 },
  { id: 'ex-t3', title: 'Wire the mailer', description: 'Serves AC-2', status: 'open' },
]

const OPEN = [
  { id: 'ex-epic', title: 'Epic', status: 'open' },
  { id: 'ex-q1', title: 'Decide: token lifetime', status: 'open', created_at: '2026-01-05T00:00:00Z' },
  { id: 'ex-q0', title: 'Q: an older plan question', status: 'open', created_at: '2025-12-01T00:00:00Z' },
  { id: 'ex-f1', title: 'Mailer retries are untested', status: 'open', dependencies: [{ issue_id: 'ex-f1', depends_on_id: 'ex-t1', type: 'discovered-from' }] },
  { id: 'ex-x1', title: 'Unrelated', status: 'open', dependencies: [{ issue_id: 'ex-x1', depends_on_id: 'other-1', type: 'discovered-from' }] },
]

const COMMITS = ['abc1234 red(AC-1): Expired links say so', 'def5678 Expire old links (ex-t1)']

const COMMENTS = {
  'ex-t1': [
    { text: 'verification report:\n## Verification Report: ex-t1\n\n### Status: PASS\n', created_at: '2026-01-02T00:00:00Z' },
    { text: 'test integrity:\n### Test Integrity\nFindings: 1 (0 escalated)\n', created_at: '2026-01-02T00:00:01Z' },
  ],
  'ex-t2': [{ text: 'halted: missing context', created_at: '2026-01-03T00:00:00Z' }],
}

function demoModel() {
  const fm = parseFrontmatter(TASKS_MD)
  return buildModel({ fm, criteria: parseCriteria(DESIGN_MD), issues: ISSUES, openIssues: OPEN, commits: COMMITS, comments: COMMENTS })
}

describe('frontmatter', () => {
  test('reads scalars, one level of maps, and drops comments', () => {
    const fm = parseFrontmatter(TASKS_MD)
    expect(fm?.project).toBe('demo-plan')
    expect(fm?.current_phase).toBe('1')
    expect(fm?.beads_phases).toEqual({ phase1_milestone: 'ex-m1', phase2_milestone: 'ex-m2' })
    expect(fm?.beads_tasks.phase1_impl_1).toBe('ex-t1')
    expect(isActivePlan(fm)).toBe(true)
    expect(planIds(fm)).toEqual(['ex-epic', 'ex-m1', 'ex-m2', 'ex-o1', 'ex-t1', 'ex-t2', 'ex-t3'])
  })

  test('a complete plan, or one with no beads tasks, is not active', () => {
    expect(isActivePlan(parseFrontmatter('---\nstatus: complete\nbeads_tasks:\n  phase1_impl_1: x\n---\n'))).toBe(false)
    expect(isActivePlan(parseFrontmatter('---\nstatus: in-progress\n---\n'))).toBe(false)
    expect(parseFrontmatter('no frontmatter')).toBe(null)
  })
})

describe('inputs', () => {
  test('criteria come from design.md bold AC lines', () => {
    expect(parseCriteria(DESIGN_MD)).toEqual([
      { id: 'AC-1', title: 'Expired links say so' },
      { id: 'AC-2', title: 'Reset form accepts a new password' },
    ])
  })

  test('the newest red commit per criterion wins', () => {
    expect(redCommits(['aaa red(AC-1): new', 'bbb red(AC-1): old', 'ccc red(AC-3): x'])).toEqual({ 'AC-1': 'aaa', 'AC-3': 'ccc' })
  })

  test('bd JSON is found past a warning line', () => {
    expect(parseJsonArray('Warning: perms\n[{"id":"a"}]\n')).toEqual([{ id: 'a' }])
    expect(parseJsonArray('Error: no database')).toBe(null)
  })

  test('only commands that change plan state trigger a refresh', () => {
    expect(isRefreshCommand('bd close ex-t1 --reason done')).toBe(true)
    expect(isRefreshCommand('git add a && git commit -m x')).toBe(true)
    expect(isRefreshCommand('bd update ex-t1 --claim')).toBe(true)
    expect(isRefreshCommand('bd show ex-t1 --json')).toBe(false)
    expect(isRefreshCommand('git log --oneline')).toBe(false)
  })
})

describe('band', () => {
  test('progress and test integrity are two lines in plain words', () => {
    const model = demoModel()
    expect(model).not.toBe(null)
    const lines = bandLines(model!)
    expect(lines.progress).toBe('Plan: demo-plan · Phase 2/2 ░░░░░░░░░░ 0/2 tasks · now: Build the reset form (ex-t2)')
    expect(lines.tests).toBe('Tests: 1/2 criteria have a red-first outer test · verifier: last 1 passed · ')
    expect(lines.attention).toEqual({ text: '⚠ 2 items need you: halted ex-t2, decision pending ex-q1', isOk: false })
  })

  test('nothing blocking reads as nothing needs you', () => {
    const fm = parseFrontmatter(TASKS_MD)
    const model = buildModel({ fm, criteria: [], issues: ISSUES, openIssues: [], commits: [], comments: {} })
    expect(bandLines(model!).attention).toEqual({ text: '✓ nothing needs you', isOk: true })
    expect(bandLines(model!).tests).toBe('Tests: no acceptance criteria found · verifier: no reports yet · ')
  })
})

describe('pane', () => {
  test('the four sections carry decisions, delivery, integrity, follow-ups', () => {
    const sections = paneSections(demoModel()!)
    expect(sections.map(section => section.heading)).toEqual([
      'Needs your decision',
      'What phase 2 delivered',
      'Test integrity',
      'Follow-ups',
    ])
    expect(sections[0].rows).toEqual([
      '⚠ halted: missing context: Build the reset form (ex-t2)',
      '⚠ decision pending: Decide: token lifetime (ex-q1)',
    ])
    expect(sections[1].rows).toEqual([
      'AC-2 Reset form accepts a new password',
      '  … Build the reset form (ex-t2)',
      '  ○ Wire the mailer (ex-t3)',
    ])
    expect(sections[2].rows).toEqual([
      'AC-1 Expired links say so · red commit abc1234 · verifier PASS (ex-t1) · 1 findings (0 escalated)',
      'AC-2 Reset form accepts a new password · no red commit · not verified',
    ])
    expect(sections[3].rows).toEqual(['○ Mailer retries are untested (ex-f1, from ex-t1)'])
  })
})

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 200,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

function answerRun(argv: readonly string[]) {
  const [tool, sub] = argv
  if (tool === 'git') return COMMITS.join('\n') + '\n'
  if (tool === 'bd' && sub === 'list') return JSON.stringify(argv.includes('--all') ? ISSUES : OPEN)
  if (tool === 'bd' && sub === 'comments') return JSON.stringify(COMMENTS[argv[2] as keyof typeof COMMENTS] ?? [])
  return ''
}

describe('mod', () => {
  test('the band draws both lines from a reading, on terminal and desktop', async ($, on) => {
    const files: Record<string, string> = {
      '/repo/docs/plans/2026-01-01-demo/tasks.md': TASKS_MD,
      '/repo/docs/plans/2026-01-01-demo/design.md': DESIGN_MD,
    }
    on('session.root', () => ({ value: '/repo' }))
    on('session.surfaces', () => ({ value: ['terminal'] }))
    on('fs.exists', ($, e) => ({ value: e.path === '/repo/docs/plans' || e.path in files }))
    on('fs.list', () => ({ value: [{ name: '2026-01-01-demo', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }))
    on('fs.read', ($, e) => ({ value: files[e.path] ?? '' }))
    on('process.run', ($, e) => ({ value: { exitCode: 0, stdout: answerRun(e.argv), stderr: '' } }))
    on('ui.open', () => ({ value: { isPlaced: true } }))
    // Stands for a mod beneath this one that draws in the band too.
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Text } = $.ui.resolve(e)
      return Text({ children: ['another mod'] })
    })

    await $.command.run({ command: 'wb-status', args: '' })

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'wb-status', surface, component: 'AbovePrompt', props: BAND_PROPS })
      expect(await ui.find({ type: 'Text', text: /^Plan: demo-plan · Phase 2\/2/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /1\/2 criteria have a red-first outer test/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /⚠ 2 items need you/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: 'another mod' })).toBeDefined()
      await ui.unmount()
    }

    const pane = await $.ui.mount({ plugin: 'wb-status', surface: 'vscode', component: 'Pane', requestId: 'wb-status', props: { title: 'wb status', isFocused: false, bodyColumns: 120, placement: 'inline', scroll: { offset: 0, bodyRows: 40 }, view: {} } })
    expect(await pane.find({ type: 'Text', text: 'Needs your decision' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Mailer retries are untested/ })).toBeDefined()
    await pane.unmount()
  })

  test('with no plan the band leaves the site to the others', async ($, on) => {
    on('session.root', () => ({ value: '/repo' }))
    on('session.surfaces', () => ({ value: ['terminal'] }))
    on('fs.exists', () => ({ value: false }))
    on('ui.open', () => ({ value: { isPlaced: true } }))
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Text } = $.ui.resolve(e)
      return Text({ children: ['another mod'] })
    })

    await $.command.run({ command: 'wb-status', args: '' })

    const ui = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
    expect(await ui.find({ type: 'Text', text: /Plan:/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'another mod' })).toBeDefined()
    await ui.unmount()
  })
})
