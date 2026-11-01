import { describe, expect, test } from 'claude-code/testing'

import { bandLines, buildModel, parseCriteria, parseFrontmatter } from '../hooks/model.mjs'
import { LOG_CAP_BYTES, LOG_KEEP_MS, clip, createReadingLog, readingRecord, recordReading } from '../hooks/readinglog.mjs'

const DAY = 24 * 60 * 60 * 1000
const T0 = Date.UTC(2026, 9, 22, 14, 5)
const DIR = '/home/u/.claude/wb-status/logs'
const PATH = `${DIR}/sess-1.jsonl`

const TASKS_MD = `---
project: demo-plan
status: in-progress
created: 2026-01-01
beads_epic: ex-epic
beads_phases:
  phase1_milestone: ex-m1
beads_tasks:
  phase1_impl_1: ex-t1
  phase1_impl_2: ex-t2
---
`
const DESIGN_MD = `## Acceptance Criteria

- **AC-1 Expired links say so**
  - Given a link
`
const LONG_TITLE = 'Build the reset form with every field validated twice and a very long title that goes on'

function issues(t2: string) {
  return [
    { id: 'ex-epic', title: 'Epic', status: 'open', issue_type: 'epic' },
    { id: 'ex-m1', title: 'Phase 1 Milestone', status: 'open' },
    { id: 'ex-t1', title: 'Expire old links', status: 'closed', updated_at: '2026-01-02T00:00:00Z' },
    { id: 'ex-t2', title: LONG_TITLE, status: t2, updated_at: '2026-01-03T00:00:00Z' },
    { id: 'ex-q1', title: 'Decide: token lifetime', status: 'open', created_at: '2026-01-05T00:00:00Z' },
  ]
}

/** A reading, as wb-status.mjs builds it: the model plus the inputs it gathered. */
function reading(t2 = 'in_progress') {
  const list = issues(t2)
  const open = list.filter(issue => issue.status !== 'closed')
  const model = buildModel({ fm: parseFrontmatter(TASKS_MD), criteria: parseCriteria(DESIGN_MD), issues: list, openIssues: open, commits: ['abc1234 red(AC-1): Expired links say so'], comments: {} })!
  return {
    ...model,
    inputs: { bd: Object.fromEntries(list.map(issue => [issue.id, issue.status])), docs: { research: 'complete', design: 'approved', tasks: 'in-progress', thoughts: 0 } },
    selection: { kind: 'pinned', by: '/wb:implement', at: T0, planName: 'demo-plan', dir: 'docs/plans/2026-01-01-demo', worktree: 'feature' },
  }
}

type Fake = ReturnType<typeof fake>

/** A stubbed $: files with modification times, a clock, and a record of writes, removals and debug logs. */
function fake(options: { files?: Record<string, { text: string; mtimeMs: number }>; failWrites?: boolean } = {}) {
  const files = new Map(Object.entries(options.files ?? {}))
  const writes: string[] = []
  const removed: string[][] = []
  const debug: { text: string; to: string }[] = []
  const $ = {
    env: { get: async (name: string) => ({ HOME: '/home/u' } as Record<string, string>)[name] },
    session: { id: async () => 'sess-1' },
    clock: { now: async () => T0 },
    fs: {
      exists: async (path: string) => files.has(path) || [...files.keys()].some(file => file.startsWith(`${path}/`)),
      read: async (path: string) => files.get(path)!.text,
      write: async (path: string, text: string) => {
        if (options.failWrites) throw new Error('disk full')
        files.set(path, { text, mtimeMs: T0 })
        writes.push(path)
      },
      list: async (path: string) =>
        [...files.keys()].filter(file => file.startsWith(`${path}/`)).map(file => ({ name: file.slice(path.length + 1), kind: 'file', size: 0, isLink: false })),
      stat: async (path: string) => ({ kind: 'file', size: 0, mtimeMs: files.get(path)!.mtimeMs, isLink: false }),
    },
    process: {
      run: async (argv: string[]) => {
        removed.push(argv)
        for (const path of argv.slice(3)) files.delete(path)
        return { exitCode: 0, stdout: '', stderr: '' }
      },
    },
    ui: { log: (text: string, o: { to: string }) => debug.push({ text, to: o.to }) },
  }
  return { $, files, writes, removed, debug }
}

const lines = (f: Fake) => (f.files.get(PATH)?.text ?? '').split('\n').filter(one => one !== '').map(one => JSON.parse(one))

describe('the mod', () => {
  test('writes nothing and shows no log section with the log option at its default', async ($, on) => {
    const writes: string[] = []
    on('fs.write', (_$, e) => {
      writes.push(e.path)
      return { value: undefined }
    })
    on('session.root', () => ({ value: '/repo' }))
    on('session.surfaces', () => ({ value: ['terminal'] }))
    on('fs.exists', () => ({ value: false }))
    on('ui.open', () => ({ value: { isPlaced: true } }))
    await $.command.run({ command: 'wb-status', args: '' })
    const pane = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'Pane', requestId: 'wb-status', props: { title: 'wb status', isFocused: false, bodyColumns: 120, placement: 'inline', scroll: { offset: 0, bodyRows: 40 }, view: {} } })
    expect(await pane.find({ type: 'Text', text: 'Reading log' })).toBeUndefined()
    await pane.unmount()
    expect(writes).toEqual([])
  })
})

describe('the reading log', () => {
  test('is off by default: nothing is written', async () => {
    for (const options of [{}, { log: false }, undefined]) {
      const f = fake()
      const log = createReadingLog(options)
      await recordReading(f.$, log, reading(), 100)
      expect(f.writes.length).toBe(0)
      expect(f.removed.length).toBe(0)
    }
  })

  test('when on, writes a line at the start and on a change, and none when nothing changed', async () => {
    const f = fake()
    const log = createReadingLog({ log: true })
    await recordReading(f.$, log, reading(), 100)
    await recordReading(f.$, log, reading(), 100)
    expect(lines(f).length).toBe(1)
    expect(lines(f)[0].event).toBe('start')
    await recordReading(f.$, log, reading('closed'), 100)
    await recordReading(f.$, log, reading('closed'), 100)
    expect(lines(f).map(one => one.event)).toEqual(['start', 'change'])
    expect(f.writes.every(path => path === PATH)).toBe(true)
  })

  test('a reading with no plan is logged too, and a changed input alone is not a change', async () => {
    const f = fake()
    const log = createReadingLog({ log: true })
    await recordReading(f.$, log, null, 100)
    expect(lines(f)[0].plan).toBe(null)
    const a = reading()
    const b = { ...a, inputs: { ...a.inputs, docs: { ...a.inputs.docs, research: 'draft' } } }
    await recordReading(f.$, log, a, 100)
    await recordReading(f.$, log, b, 100)
    expect(lines(f).length).toBe(2)
  })

  test('a line holds the plan, source, stage, counts, now, needsYou, inputs and the band', async () => {
    const line = { ts: 'x', sessionId: 's', ...readingRecord(reading(), { columns: 120 }) } as any
    expect(line.plan).toEqual({ name: 'demo-plan', dir: 'docs/plans/2026-01-01-demo', worktree: 'feature' })
    expect(line.source).toEqual({ kind: 'pinned', by: '/wb:implement', at: new Date(T0).toISOString() })
    expect(line.stage).toBe('implement')
    expect(line.phase).toEqual({ n: 1, of: 1, state: 'running' })
    expect(line.counts).toEqual({ tasks: { closed: 1, total: 2 }, followUpsOpen: 0, redFirst: { k: 1, n: 1 }, verifier: { pass: 0, fail: 0 } })
    expect(line.now.id).toBe('ex-t2')
    expect([...line.now.title].length).toBeLessThanOrEqual(80)
    expect(line.needsYou).toEqual([{ kind: 'decision', id: 'ex-q1', text: 'decision pending: Decide: token lifetime' }])
    expect(line.inputs.bd['ex-t2']).toBe('in_progress')
    expect(line.inputs.redCommits).toEqual({ 'AC-1': 'abc1234' })
    expect(line.inputs.docs.design).toBe('approved')
    expect(line.band.columns).toBe(120)
    expect(line.band.progress).toBe(bandLines(reading(), 120).text.progress)
    expect(line.band.tests).toBe(bandLines(reading(), 120).text.tests)
    expect(JSON.stringify(line)).not.toContain('description')
  })

  test('a guessed plan says how', () => {
    const base = reading()
    const how = (selection: object) => (readingRecord({ ...base, selection: { ...base.selection, ...selection } }).source as any)
    expect(how({ kind: 'beads', why: 'in-progress', id: 'ex-t2' })).toEqual({ kind: 'guessed', how: 'beads-in-progress', issue: 'ex-t2' })
    expect(how({ kind: 'directory' })).toEqual({ kind: 'guessed', how: 'newest-directory' })
    expect(clip('x'.repeat(100)).length).toBe(80)
  })

  test('stops at the cap with one final line saying so', async () => {
    const filler = JSON.stringify({ filler: 'x'.repeat(100) }) + '\n'
    const text = filler.repeat(Math.floor((LOG_CAP_BYTES - 650) / filler.length))
    const f = fake({ files: { [PATH]: { text, mtimeMs: T0 } } })
    const log = createReadingLog({ log: true })
    await recordReading(f.$, log, reading(), 100)
    const written = lines(f)
    expect(written.at(-1).event).toBe('cap')
    expect(written.at(-1).note).toMatch(/stopped/)
    expect(new TextEncoder().encode(f.files.get(PATH)!.text).length).toBeLessThanOrEqual(LOG_CAP_BYTES)
    const count = f.writes.length
    await recordReading(f.$, log, reading('closed'), 100)
    expect(f.writes.length).toBe(count)
  })

  test('removes logs older than 14 days on start, and only this folder\'s .jsonl files', async () => {
    const f = fake({
      files: {
        [`${DIR}/old.jsonl`]: { text: '{}\n', mtimeMs: T0 - LOG_KEEP_MS - DAY },
        [`${DIR}/recent.jsonl`]: { text: '{}\n', mtimeMs: T0 - 2 * DAY },
        [`${DIR}/notes.txt`]: { text: 'x', mtimeMs: T0 - 30 * DAY },
      },
    })
    await recordReading(f.$, createReadingLog({ log: true }), reading(), 100)
    expect(f.removed).toEqual([['rm', '-f', '--', `${DIR}/old.jsonl`]])
    expect(f.files.has(`${DIR}/recent.jsonl`)).toBe(true)
    expect(f.files.has(`${DIR}/notes.txt`)).toBe(true)
  })

  test('a write failure never throws, and is reported to the debug log once', async () => {
    const f = fake({ failWrites: true })
    const log = createReadingLog({ log: true })
    await recordReading(f.$, log, reading(), 100)
    await recordReading(f.$, log, reading('closed'), 100)
    expect(f.debug.length).toBe(1)
    expect(f.debug[0].to).toBe('debug')
    // The band is a pure function of the reading, which the log never touches.
    expect(bandLines(reading(), 100).text.progress).toMatch(/^Plan: demo-plan/)
  })
})
