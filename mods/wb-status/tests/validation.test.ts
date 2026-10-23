import { describe, expect, test } from 'claude-code/testing'

import { bandLines, buildModel, paneSections, parseFrontmatter, readIntent, statusLine } from '../hooks/model.mjs'
import { changeKey, readingRecord } from '../hooks/readinglog.mjs'

const DIR = 'docs/plans/2026-01-01-demo'
const COMMAND = `/wb:validate_phase ${DIR} all`

const readme = (...success: string[]) => `# Demo plan

## Intent

**Goal**: Let people reset a password.

**Success looks like**:
${success.map(one => `- ${one}`).join('\n')}

**Non-goals**:
- Single sign-on
`

const UNVALIDATED = readme('Users can reset a password', 'Expired links say so', 'The mailer retries')
const ALL_PASS = readme('Users can reset a password → PASS (2026-02-01)', 'Expired links say so → PASS (2026-02-01)', 'The mailer retries → PASS (2026-02-02)')
const ONE_FAIL = readme('Users can reset a password → PASS (2026-02-01)', 'Expired links say so → FAIL (2026-02-01)', 'The mailer retries → DEFERRED (2026-02-02)')

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

const closed = [
  { id: 'ex-epic', title: 'Epic', status: 'open', issue_type: 'epic' },
  { id: 'ex-m1', title: 'Phase 1 Milestone', status: 'closed', closed_at: '2026-01-02T00:00:00Z' },
  { id: 'ex-t1', title: 'Expire old links', status: 'closed', closed_at: '2026-01-02T00:00:00Z' },
]
const running = closed.map(issue => (issue.id === 'ex-epic' ? issue : { id: issue.id, title: issue.title, status: 'open' }))

function modelOf(text: string | null, { issues = closed, open = [] as object[], dir = DIR } = {}) {
  const intent = text === null ? null : readIntent(text)
  const built = buildModel({ fm: parseFrontmatter(DONE_MD), criteria: [], issues, openIssues: open, commits: [], comments: {}, intent, dir })!
  return { ...built, selection: { kind: 'pinned', by: '/wb:implement', at: 0, planName: 'demo-plan', dir, worktree: null } }
}
const toneOf = (segments: { text: string; tone: string }[], pattern: RegExp) => segments.find(one => pattern.test(one.text))?.tone

describe('reading verdicts from the Intent section', () => {
  test('a statement carries its verdict and date, PASS, FAIL or DEFERRED', () => {
    const intent = readIntent(ONE_FAIL)!
    expect(intent.statements.map((one: { text: string; verdict: string; date: string }) => [one.text, one.verdict, one.date])).toEqual([
      ['Users can reset a password', 'PASS', '2026-02-01'],
      ['Expired links say so', 'FAIL', '2026-02-01'],
      ['The mailer retries', 'DEFERRED', '2026-02-02'],
    ])
  })

  test('a statement with no suffix has no verdict', () => {
    expect(readIntent(UNVALIDATED)!.statements.map((one: { verdict: string | null; date: string | null }) => [one.verdict, one.date])).toEqual([[null, null], [null, null], [null, null]])
  })

  test('a replaced earlier suffix: the last verdict wins and the text stays clean', () => {
    const intent = readIntent(readme('Expired links say so → FAIL (2026-02-01) → PASS (2026-02-09)'))!
    expect(intent.statements[0]).toEqual({ text: 'Expired links say so', verdict: 'PASS', date: '2026-02-09' })
  })

  test('a verdict without a date still reads', () => {
    expect(readIntent(readme('Expired links say so → PASS'))!.statements[0]).toEqual({ text: 'Expired links say so', verdict: 'PASS', date: null })
  })
})

describe('the validation prompt on the band', () => {
  test('a done plan with no verdicts asks for validation, in the needs-you tone', () => {
    const model = modelOf(UNVALIDATED)
    expect(model.isDone).toBe(true)
    const lines = bandLines(model, 140)
    expect(lines.text.tests).toBe(`Tests: ⚠ validate the plan: ${COMMAND} · no criteria found · verifier none yet`)
    expect(toneOf(lines.tests, /validate the plan/)).toBe('warn')
  })

  test('the prompt wins over the open follow-up line, which keeps a count after it', () => {
    const question = { id: 'ex-q1', title: 'Q: Which store is the source of truth?', status: 'open', created_at: '2026-01-05T00:00:00Z' }
    const model = modelOf(UNVALIDATED, { open: [question] })
    const lines = bandLines(model, 140)
    expect(lines.text.tests).toBe(`Tests: ⚠ validate the plan: ${COMMAND} · 1 open follow-up · no criteria found · verifier none yet`)
    expect(toneOf(lines.tests, /^1 open follow-up/)).toBe('dim')
    expect(bandLines(model, 100).text.tests).toBe(`Tests: ⚠ validate the plan: ${COMMAND} · 1 open follow-up`)
    expect(bandLines(model, 82).text.tests).toBe(`Tests: ⚠ validate the plan: ${COMMAND}`)
  })

  test('a done plan whose statements all passed shows no prompt', () => {
    const model = modelOf(ALL_PASS)
    expect(model.blocking).toEqual([])
    expect(bandLines(model, 140).text.tests).toBe('Tests: ✓ nothing needs you · no criteria found · verifier none yet')
  })

  test('one FAIL shows a warning with the count', () => {
    const lines = bandLines(modelOf(ONE_FAIL), 140)
    expect(lines.text.tests).toBe('Tests: ⚠ validation: 1 FAIL · no criteria found · verifier none yet')
    expect(toneOf(lines.tests, /validation: 1 FAIL/)).toBe('warn')
  })

  test('DEFERRED alone neither prompts nor warns', () => {
    const model = modelOf(readme('Expired links say so → DEFERRED (2026-02-01)'))
    expect(model.blocking).toEqual([])
  })

  test('a plan still in progress shows no prompt', () => {
    const model = modelOf(UNVALIDATED, { issues: running })
    expect(model.isDone).toBe(false)
    expect(model.blocking).toEqual([])
    expect(bandLines(model, 140).text.tests).not.toContain('validate')
  })

  test('a README with no Intent section shows no prompt', () => {
    const model = modelOf('# Older plan\n\nJust a title.\n')
    expect(model.validation).toBe(null)
    expect(model.blocking).toEqual([])
  })

  test('with no README at all there is no prompt either', () => {
    expect(modelOf(null).blocking).toEqual([])
  })

  test('the status line counts the prompt as something that needs you', () => {
    expect(statusLine(modelOf(UNVALIDATED))).toContain('⚠ 1')
  })
})

describe('the pane and the reading log', () => {
  const rowsOf = (model: object) => paneSections(model).find((one: { heading: string }) => one.heading === 'Validation')!.rows

  test('the pane says validation has not run', () => {
    expect(rowsOf(modelOf(UNVALIDATED))).toEqual([`Not run: ${COMMAND}`, '○ Users can reset a password', '○ Expired links say so', '○ The mailer retries'])
  })

  test('the pane lists each verdict with its date', () => {
    expect(rowsOf(modelOf(ONE_FAIL))).toEqual(['✓ PASS 2026-02-01 · Users can reset a password', '✗ FAIL 2026-02-01 · Expired links say so', '○ DEFERRED 2026-02-02 · The mailer retries'])
  })

  test('the pane notes a README with no Intent section', () => {
    expect(rowsOf(modelOf('# Older plan\n'))).toEqual(['No Intent section in README.md: nothing to validate.'])
  })

  test('the reading log records the validation state', () => {
    const state = (text: string | null) => readingRecord(modelOf(text), { columns: 140 }).validation
    expect(state(UNVALIDATED)).toEqual({ state: 'not-run', pass: 0, fail: 0, deferred: 0, pending: 3 })
    expect(state(ALL_PASS)).toEqual({ state: 'passed', pass: 3, fail: 0, deferred: 0, pending: 0 })
    expect(state(ONE_FAIL)).toEqual({ state: 'failed', pass: 1, fail: 1, deferred: 1, pending: 0 })
    expect(state('# Older plan\n')).toBe(null)
  })

  test('a change of validation state is a change of reading', () => {
    const a = changeKey(readingRecord(modelOf(UNVALIDATED), { columns: 140 }))
    const b = changeKey(readingRecord(modelOf(ALL_PASS), { columns: 140 }))
    expect(a).not.toBe(b)
  })
})
