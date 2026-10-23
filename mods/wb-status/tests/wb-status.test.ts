import { describe, expect, test } from 'claude-code/testing'

import {
  TONES,
  bandLines,
  buildModel,
  closeReasonVerdict,
  isActivePlan,
  isRefreshCommand,
  openAsksOf,
  paneSections,
  parseCriteria,
  parseFrontmatter,
  parseJsonArray,
  planIds,
  readComments,
  redCommits,
  separator,
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

// Phase 2's tasks are closed but its milestone is open: the run waits at the
// phase 2 checkpoint. Verdicts come from a report, an older integrity comment,
// and close reasons; ex-c2 is a follow-up verified during the phase.
const CHECKPOINT_MD = `---
project: demo-plan
status: in-progress
created: 2026-01-01
beads_epic: ex-epic
beads_phases:
  phase1_milestone: ex-m1
  phase2_milestone: ex-m2
  phase3_milestone: ex-m3
beads_tasks:
  phase1_impl_1: ex-t1
  phase2_impl_1: ex-t2
  phase2_impl_2: ex-t3
  phase3_impl_1: ex-t4
---
`

function checkpointModel() {
  const issues = [
    { id: 'ex-epic', title: 'Epic', status: 'open', issue_type: 'epic' },
    { id: 'ex-m1', title: 'Phase 1 Milestone', status: 'closed', closed_at: '2026-01-02T00:00:00Z' },
    { id: 'ex-m2', title: 'Phase 2 Milestone', status: 'open' },
    { id: 'ex-m3', title: 'Phase 3 Milestone', status: 'open' },
    { id: 'ex-t1', title: 'Expire old links', status: 'closed', close_reason: 'Verified PASS', closed_at: '2026-01-01T12:00:00Z' },
    { id: 'ex-t2', title: 'Build the reset form', status: 'closed', closed_at: '2026-01-03T00:00:00Z', comment_count: 1 },
    { id: 'ex-t3', title: 'Wire the mailer', status: 'closed', close_reason: 'Verified PASS after one fix round', closed_at: '2026-01-04T00:00:00Z' },
    { id: 'ex-t4', title: 'Send the reminder', status: 'open' },
    { id: 'ex-c2', title: 'Cover the mailer timeout', status: 'closed', parent: 'ex-epic', closed_at: '2026-01-03T12:00:00Z', comment_count: 1 },
    { id: 'ex-c3', title: 'Name the retry constant', status: 'open', parent: 'ex-epic', created_at: '2026-01-03T13:00:00Z' },
  ]
  const comments = {
    'ex-t2': [{ text: 'verification report:\n### Status: PASS\n', created_at: '2026-01-02T23:00:00Z' }],
    'ex-c2': [{ text: 'test integrity:\nFindings: 2 (1 escalated)\n', created_at: '2026-01-03T11:00:00Z' }],
  }
  return buildModel({ fm: parseFrontmatter(CHECKPOINT_MD), criteria: parseCriteria(DESIGN_MD), issues, openIssues: [], commits: [], comments })!
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
  test('progress and test integrity are two lines in plain words, what needs you first', () => {
    const model = demoModel()
    expect(model).not.toBe(null)
    const lines = bandLines(model!)
    expect(lines.text.progress).toBe('Plan: demo-plan · Phase 2/2 ────────── 0/2 tasks · 1 follow-up open · now: Build the reset form (ex-t2)')
    expect(lines.text.tests).toBe('Tests: ⚠ halted: missing context (ex-t2) +1 more · red-first 1/2 · verifier none yet')
    expect(lines.attention).toEqual({ text: '⚠ halted: missing context (ex-t2) +1 more', isOk: false })
  })

  test('nothing blocking reads as nothing needs you', () => {
    const fm = parseFrontmatter(TASKS_MD)
    const model = buildModel({ fm, criteria: [], issues: ISSUES, openIssues: [], commits: [], comments: {} })
    expect(bandLines(model!).attention).toEqual({ text: '✓ nothing needs you', isOk: true })
    expect(bandLines(model!).text.tests).toBe('Tests: ✓ nothing needs you · no criteria found · verifier none yet')
  })

  test('a narrow band drops the lowest-priority parts first and keeps what needs you', () => {
    const model = demoModel()!
    const at = (columns: number) => bandLines(model, columns).text

    // Room for everything but the in-progress title in full: it is shortened, not dropped.
    const shortened = at(95)
    expect(shortened.progress).toBe('Plan: demo-plan · Phase 2/2 ────────── 0/2 tasks · 1 follow-up open · now: Build the… (ex-t2)')
    expect([...shortened.progress].length <= 95).toBe(true)

    // Narrower: "now" goes before the follow-ups, which go before the bar; the phase and counts stay.
    expect(at(70).progress).toBe('Plan: demo-plan · Phase 2/2 ────────── 0/2 tasks · 1 follow-up open')
    expect(at(50).progress).toBe('Plan: demo-plan · Phase 2/2 ────────── 0/2 tasks')
    expect(at(40).progress).toBe('Plan: demo-plan · Phase 2/2 0/2 tasks')

    // Line 2: red-first goes first, then the verifier, then the label; the attention stays.
    expect(at(75).tests).toBe('Tests: ⚠ halted: missing context (ex-t2) +1 more · verifier none yet')
    expect(at(50).tests).toBe('Tests: ⚠ halted: missing context (ex-t2) +1 more')
    expect(at(30).tests).toBe('⚠ halted: missing context…')
    for (const columns of [30, 40, 50, 70, 90]) {
      expect([...at(columns).tests].length <= columns).toBe(true)
    }
  })

  test('each state gets its color and keeps its symbol', () => {
    const tone = (segments: { text: string; tone: string }[], text: RegExp) => segments.find(one => text.test(one.text))?.tone
    const ok = bandLines(buildModel({ fm: parseFrontmatter(TASKS_MD), criteria: [], issues: ISSUES, openIssues: [], commits: [], comments: {} })!)
    expect(tone(ok.tests, /^✓ nothing needs you$/)).toBe('ok')
    expect(TONES.ok).toEqual({ color: 'success' })

    const checkpoint = bandLines(checkpointModel())
    expect(tone(checkpoint.tests, /^⚠ Phase 2 checkpoint waiting for you$/)).toBe('warn')
    expect(TONES.warn).toEqual({ color: 'warning' })
    expect(tone(checkpoint.tests, /^1✗$/)).toBe('error')
    expect(TONES.error).toEqual({ color: 'error' })
    expect(tone(checkpoint.progress, /^━+$/)).toBe('accent')
    expect(TONES.accent).toEqual({ color: 'permission' })
    expect(tone(checkpoint.progress, /^Plan: $/)).toBe('dim')
    expect(tone(checkpoint.tests, /^Tests: $/)).toBe('dim')
    expect(TONES.dim).toEqual({ dimColor: true })
    expect(tone(checkpoint.progress, /^demo-plan$/)).toBe('plain')
  })

  test('the separator is a labelled rule, a blank line when narrow, nothing with no row to spare', () => {
    expect(separator(40, 10)).toEqual({ kind: 'rule', text: '── wb plan ' + '─'.repeat(29) })
    expect(separator(12, 10)).toEqual({ kind: 'blank', text: ' ' })
    expect(separator(40, 2)).toBe(null)
  })
})

describe('plan state', () => {
  test('a follow-up in progress under the epic is what is happening now, counted apart from planned tasks', () => {
    const fm = parseFrontmatter(TASKS_MD)
    const issues = [
      ...ISSUES.map(issue => (issue.id === 'ex-t2' ? { ...issue, status: 'open' } : issue)),
      { id: 'ex-c1', title: 'Fix the flaky mailer retry found in review', status: 'in_progress', parent: 'ex-epic', updated_at: '2026-01-04T00:00:00Z' },
    ]
    const model = buildModel({ fm, criteria: [], issues, openIssues: OPEN, commits: [], comments: {} })!
    expect(model.now).toEqual({ id: 'ex-c1', title: 'Fix the flaky mailer retry found in review', isPlanned: false })
    expect(model.total).toBe(2)
    expect(model.followUps.map(item => item.id).sort()).toEqual(['ex-c1', 'ex-f1'])
    expect(bandLines(model).text.progress).toBe('Plan: demo-plan · Phase 2/2 ────────── 0/2 tasks · 2 follow-ups open · now: Fix the flaky mailer retry found in review (ex-c1)')
  })

  test('an open milestone whose tasks are all closed is a checkpoint waiting for you, and the band stays on that phase', () => {
    const model = checkpointModel()
    expect(model.phase).toBe(2)
    expect(model.isAtCheckpoint).toBe(true)
    expect(model.blocking[0]).toEqual({ kind: 'checkpoint', id: null, title: 'Phase 2 checkpoint', why: 'Phase 2 checkpoint waiting for you' })
    const lines = bandLines(model).text
    expect(lines.progress).toBe('Plan: demo-plan · Phase 2/3 at checkpoint ━━━━━━━━━━ 2/2 tasks · 1 follow-up open')
    expect(lines.tests).toBe('Tests: ⚠ Phase 2 checkpoint waiting for you · red-first 0/2 · verifier 2✓ 1✗')
  })
})

describe('verifier results', () => {
  test('both comment formats and close reasons carry a verdict', () => {
    expect(readComments([{ text: 'verification report:\n## Verification Report: x\n\n### Status: FAIL\n', created_at: 't1' }]).verifier).toEqual({ at: 't1', status: 'FAIL' })
    expect(readComments([{ text: 'test integrity:\nFindings: 4 (2 escalated)\n- outer test differs', created_at: 't1' }]).verifier).toEqual({ at: 't1', status: 'FAIL' })
    expect(readComments([{ text: 'test integrity:\nFindings: 1 (0 escalated) — re-verification after one fix attempt: PASS', created_at: 't1' }]).verifier).toEqual({ at: 't1', status: 'PASS' })
    expect(readComments([{ text: 'test integrity:\nFindings: 0 (0 escalated)\n- clean', created_at: 't1' }]).verifier).toEqual({ at: 't1', status: 'PASS' })
    expect(closeReasonVerdict('Verified PASS, committed abc1234')).toBe('PASS')
    expect(closeReasonVerdict('resolved by the fix pass and PASS re-verification')).toBe('PASS')
    expect(closeReasonVerdict('Implemented the form, tests passing')).toBe(null)
  })

  test('a clean integrity count does not outweigh the report it accompanies', () => {
    const notes = readComments([
      { text: 'verification report:\n### Status: FAIL\n', created_at: 't1' },
      { text: 'test integrity:\nFindings: 0 (0 escalated)\n', created_at: 't2' },
    ])
    expect(notes.verifier).toEqual({ at: 't1', status: 'FAIL' })
  })

  test('a halt stays open until a later verifier result or resolution', () => {
    expect(readComments([{ text: 'halted: plan defect', created_at: 't1' }]).halt).toEqual({ at: 't1', why: 'halted: plan defect' })
    expect(readComments([
      { text: 'halted: plan defect', created_at: 't1' },
      { text: 'verification report:\n### Status: PASS', created_at: 't2' },
    ]).halt).toBe(null)
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
  if (tool === 'bd' && sub === 'list' && argv.includes('--parent')) return JSON.stringify(ISSUES.filter(issue => issue.id !== 'ex-epic'))
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
      const rule = await ui.find({ type: 'Text', text: /^── wb plan ─+$/ })
      expect(rule?.props.dimColor).toBe(true)
      expect([...(rule?.text ?? '')].length).toBe(BAND_PROPS.bodyColumns - 2)
      expect((await ui.find({ type: 'Text', text: 'Plan: ' }))?.props.dimColor).toBe(true)
      expect(await ui.find({ type: 'Text', text: 'demo-plan' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^Phase 2\/2/ })).toBeDefined()
      expect((await ui.find({ type: 'Text', text: /^─+$/ }))?.props.color).toBe('inactive')
      expect(await ui.find({ type: 'Text', text: '1/2' })).toBeDefined()
      const attention = await ui.find({ type: 'Text', text: /^⚠ halted: missing context \(ex-t2\) \+1 more$/ })
      expect(attention?.props.color).toBe('warning')
      expect(await ui.find({ type: 'Text', text: 'another mod' })).toBeDefined()
      await ui.unmount()
    }

    // A narrow band: a blank line in place of the rule, and what needs you still shows.
    const narrow = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, bodyColumns: 14 } })
    expect(await narrow.find({ type: 'Text', text: /wb plan/ })).toBeUndefined()
    expect(await narrow.find({ type: 'Text', text: ' ' })).toBeDefined()
    expect(await narrow.find({ type: 'Text', text: /^⚠ halted/ })).toBeDefined()
    expect(await narrow.find({ type: 'Text', text: 'another mod' })).toBeDefined()
    await narrow.unmount()

    const pane = await $.ui.mount({ plugin: 'wb-status', surface: 'vscode', component: 'Pane', requestId: 'wb-status', props: { title: 'wb status', isFocused: false, bodyColumns: 120, placement: 'inline', scroll: { offset: 0, bodyRows: 40 }, view: {} } })
    expect(await pane.find({ type: 'Text', text: 'Needs your decision' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Mailer retries are untested/ })).toBeDefined()
    await pane.unmount()
  })

  test('the band has a gap above its rule and no empty row below its last line', async ($, on) => {
    const files: Record<string, string> = { '/repo/docs/plans/2026-01-01-demo/tasks.md': TASKS_MD, '/repo/docs/plans/2026-01-01-demo/design.md': DESIGN_MD }
    on('session.root', () => ({ value: '/repo' }))
    on('session.surfaces', () => ({ value: ['terminal'] }))
    on('fs.exists', ($, e) => ({ value: e.path === '/repo/docs/plans' || e.path in files }))
    on('fs.list', () => ({ value: [{ name: '2026-01-01-demo', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }))
    on('fs.read', ($, e) => ({ value: files[e.path] ?? '' }))
    on('process.run', ($, e) => ({ value: { exitCode: 0, stdout: answerRun(e.argv), stderr: '' } }))
    on('ui.open', () => ({ value: { isPlaced: true } }))
    // No other mod draws: the site's own drawing comes back empty.
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Text } = $.ui.resolve(e)
      return Text({ children: [' '] })
    })
    await $.command.run({ command: 'wb-status', args: '' })

    const ui = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
    const outer = await ui.find({ type: 'Box' })
    expect(outer?.props.marginTop).toBe(1)
    const kids = (outer?.children ?? []) as { type: string; children?: unknown[] }[]
    expect(kids.length).toBe(3)
    expect(kids[0].type).toBe('Text')
    await ui.unmount()

    const short = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, maxRows: 4 } })
    expect((await short.find({ type: 'Box' }))?.props.marginTop).toBe(0)
    await short.unmount()
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

describe('open questions on a finished plan', () => {
  const DONE_MD = `---
project: demo-plan
status: in-progress
created: 2026-01-01
beads_epic: ex-epic
beads_phases:
  phase1_milestone: ex-m1
beads_tasks:
  phase1_impl_1: ex-t1
---
`
  const doneIssues = [
    { id: 'ex-epic', title: 'Epic', status: 'open', issue_type: 'epic' },
    { id: 'ex-m1', title: 'Phase 1 Milestone', status: 'closed', closed_at: '2026-01-02T00:00:00Z' },
    { id: 'ex-t1', title: 'Expire old links', status: 'closed', closed_at: '2026-01-02T00:00:00Z' },
  ]
  const openQuestion = { id: 'ex-q1', title: 'Q: Which store is the source of truth?', status: 'open', created_at: '2026-01-05T00:00:00Z' }
  const modelOf = (issues: object[], open: object[]) =>
    buildModel({ fm: parseFrontmatter(DONE_MD), criteria: [], issues, openIssues: open, commits: [], comments: {} })!
  const toneOf = (segments: { text: string; tone: string }[], pattern: RegExp) => segments.find(one => pattern.test(one.text))?.tone

  test('a done plan shows the question as a dim follow-up, not a warning', () => {
    const model = modelOf(doneIssues, [openQuestion])
    expect(model.isDone).toBe(true)
    expect(model.blocking).toEqual([])
    const lines = bandLines(model, 120)
    expect(lines.text.tests).toBe('Tests: open follow-up: Which store is the source of truth? (ex-q1) · no criteria found · verifier none yet')
    expect(lines.text.tests).not.toContain('⚠')
    expect(toneOf(lines.tests, /^open follow-up/)).toBe('dim')
  })

  test('several questions on a done plan add a count', () => {
    const model = modelOf(doneIssues, [openQuestion, { id: 'ex-q2', title: 'Decide: retention window', status: 'open', created_at: '2026-01-06T00:00:00Z' }])
    expect(bandLines(model, 120).text.tests).toContain('open follow-up: Which store is the source of truth? (ex-q1) +1 more')
  })

  test('the pane lists the question under follow-ups, not needs-your-decision', () => {
    const sections = paneSections(modelOf(doneIssues, [openQuestion]))
    expect(sections.find(one => one.heading === 'Needs your decision')!.rows).toEqual(['Nothing needs you.'])
    expect(sections.find(one => one.heading === 'Follow-ups')!.rows).toEqual(['○ open question: Q: Which store is the source of truth? (ex-q1)'])
  })

  test('the open asks a reading records include a done plan\'s handed-off questions', () => {
    expect(openAsksOf(modelOf(doneIssues, [openQuestion])).map(ask => ask.id)).toEqual(['ex-q1'])
  })

  test('an in-progress plan still warns about the same question', () => {
    const issues = doneIssues.map(issue => (issue.id === 'ex-epic' ? issue : { id: issue.id, title: issue.title, status: 'open' }))
    const model = modelOf(issues, [openQuestion])
    expect(model.isDone).toBe(false)
    const lines = bandLines(model, 120)
    expect(lines.text.tests).toBe('Tests: ⚠ open question: Which store is the source of truth? (ex-q1) · no criteria found · verifier none yet')
    expect(toneOf(lines.tests, /^⚠ open question/)).toBe('warn')
  })
})
