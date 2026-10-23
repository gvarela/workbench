// The opt-in reading log: one JSONL file per session, outside any repository,
// with a line each time what the band shows changes. It exists so the band can
// be compared with the session transcript by hand.
//
// Where: <CLAUDE_CONFIG_DIR or $HOME/.claude>/wb-status/logs/<session id>.jsonl.
// $.fs.write replaces a file's whole content (it has no append), so the session's
// log is held in memory and written whole, which the 1 MiB cap keeps cheap.
// Old logs are removed with `rm -f` on explicit paths of this folder's own
// *.jsonl files, because $.fs has no delete. A failure of any of it is swallowed:
// the log must never break the band. The host reads $.noun.method(...) and
// $.env.get('NAME') from source, so they are spelled literally, and helpers
// that take $ are top-level functions.

import { bandLines } from './model.mjs'

export const LOG_CAP_BYTES = 1024 * 1024
export const LOG_KEEP_MS = 14 * 24 * 60 * 60 * 1000
const CAP_RESERVE_BYTES = 512
const TITLE_MAX = 80
const NEEDS_MAX = 8
const DEFAULT_COLUMNS = 100

/** A title cut to `max` characters. */
export function clip(text, max = TITLE_MAX) {
  const chars = [...String(text ?? '').replace(/\s+/g, ' ').trim()]
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('')}…`
}

function iso(ms) {
  const date = new Date(Number(ms))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** How the plan was chosen, as data: pinned by which command and when, or guessed and how. */
export function sourceOf(selection) {
  if (!selection) return null
  const missing = selection.missing ? { pinMissing: selection.missing } : {}
  switch (selection.kind) {
    case 'pinned':
      return { kind: 'pinned', by: selection.by, at: iso(selection.at) }
    case 'beads':
      return { kind: 'guessed', how: selection.why === 'in-progress' ? 'beads-in-progress' : 'beads-recent', issue: selection.id, ...missing }
    case 'recent-file':
      return { kind: 'guessed', how: 'recent-file', file: selection.file, changedAt: iso(selection.at), ...missing }
    case 'directory':
      return { kind: 'guessed', how: 'newest-directory', ...missing }
    default:
      return { kind: String(selection.kind ?? 'unknown'), ...missing }
  }
}

function stageOf(model) {
  if (model.kind === 'planning') return model.current ?? null
  return model.stages?.find(stage => stage.state === 'current')?.key ?? (model.isDone ? 'done' : 'implement')
}

function needsYouOf(blocking) {
  const items = (blocking ?? []).slice(0, NEEDS_MAX).map(item => ({
    kind: item.kind,
    id: item.id ?? null,
    text: clip(item.id === null || item.id === undefined ? item.why : `${item.why}: ${item.title}`),
  }))
  if ((blocking ?? []).length > NEEDS_MAX) items.push({ kind: 'more', id: null, text: `+${blocking.length - NEEDS_MAX} more` })
  return items
}

function countsOf(model) {
  if (model.kind === 'planning') return null
  const verdicts = model.verdicts ?? []
  const pass = verdicts.filter(one => one.status === 'PASS').length
  return {
    tasks: { closed: model.closed, total: model.total },
    followUpsOpen: model.followUps.length,
    redFirst: { k: model.redCount, n: model.criteria.length },
    verifier: { pass, fail: verdicts.length - pass },
  }
}

function inputsOf(model) {
  const red = {}
  for (const row of model.criteria ?? []) if (row.redSha) red[row.id] = row.redSha
  const verdicts = {}
  for (const one of model.verdicts ?? []) if (verdicts[one.id] === undefined) verdicts[one.id] = one.status
  return {
    bd: model.inputs?.bd ?? {},
    redCommits: red,
    verdicts,
    docs: model.inputs?.docs ?? {},
  }
}

/**
 * One log line's content for a reading: the plan and how it was chosen, the
 * stage, counts, what is in progress, what needs the person, the inputs the
 * reading used, and the band's two lines at `columns`. `model` null is a
 * reading with no plan.
 */
export function readingRecord(model, { columns = DEFAULT_COLUMNS } = {}) {
  if (model === null || model === undefined) {
    return { plan: null, source: null, stage: null, phase: null, counts: null, now: null, needsYou: [], inputs: { bd: {}, redCommits: {}, verdicts: {}, docs: {} }, band: null }
  }
  const isPlanning = model.kind === 'planning'
  const band = bandLines(model, columns).text
  const phaseState = model.isDone ? 'done' : model.isAtCheckpoint ? 'checkpoint' : 'running'
  const record = {
    plan: { name: clip(model.planName), dir: model.selection?.dir ?? null, worktree: model.selection?.worktree ?? null },
    source: sourceOf(model.selection),
    stage: stageOf(model),
    phase: isPlanning ? null : { n: model.phase, of: model.phaseCount, state: phaseState },
    counts: countsOf(model),
    now: model.now ? { id: model.now.id, title: clip(model.now.title) } : null,
    needsYou: needsYouOf(model.blocking),
    inputs: inputsOf(model),
    band: { columns, progress: band.progress, tests: band.tests },
  }
  // Questions a finished plan handed off are follow-ups, never needs.
  if ((model.handedOff ?? []).length > 0) record.followUps = model.handedOff.map(item => ({ kind: item.kind, id: item.id, text: clip(`${item.why}: ${item.title}`) }))
  if (isPlanning) record.signals = (model.signals?.[model.current] ?? []).map(text => clip(text))
  return record
}

/** What the band shows, for telling a changed reading from an unchanged one: everything but the inputs. */
export function changeKey(record) {
  const { inputs, ...shown } = record
  return JSON.stringify(shown)
}

function bytes(text) {
  return new TextEncoder().encode(text).length
}

function safeName(sessionId) {
  return String(sessionId).replace(/[^\w.-]/g, '_')
}

/**
 * The log for one load of the mod: its state. `options` is register's second
 * argument; the log is on only when `options.log` is true. recordReading and
 * paneRows work on it; neither throws.
 */
export function createReadingLog(options) {
  const isOn = options?.log === true || options?.log === 'true'
  return { isOn, path: null, sessionId: null, content: '', lines: 0, lastKey: null, isReady: false, isCapped: false, hasFailed: false, hasWarned: false }
}

function warn($, log, error) {
  log.hasFailed = true
  if (log.hasWarned) return
  log.hasWarned = true
  try {
    $.ui.log(`wb-status: the reading log could not be written: ${error?.message ?? error}`, { to: 'debug' })
  } catch {
    // Nowhere to say it.
  }
}

/** Where the log goes, its content so far, and the removal of old logs; once. */
async function prepare($, log) {
  if (log.isReady) return
  const configured = await $.env.get('CLAUDE_CONFIG_DIR')
  const home = await $.env.get('HOME')
  const base = configured ? configured : home ? `${home}/.claude` : null
  if (base === null) throw new Error('no home directory')
  const dir = `${base}/wb-status/logs`
  log.sessionId = String(await $.session.id())
  log.path = `${dir}/${safeName(log.sessionId)}.jsonl`
  try {
    await sweep($, dir, log.path)
  } catch (error) {
    warn($, log, error)
  }
  if (await $.fs.exists(log.path)) {
    log.content = await $.fs.read(log.path)
    log.lines = log.content.split('\n').filter(one => one !== '').length
  }
  log.isReady = true
}

/** Remove this folder's *.jsonl files not touched for 14 days, never the session's own. */
async function sweep($, dir, own) {
  if (!(await $.fs.exists(dir))) return
  const now = await $.clock.now()
  const stale = []
  for (const entry of await $.fs.list(dir)) {
    const path = `${dir}/${entry.name}`
    if (entry.kind !== 'file' || !entry.name.endsWith('.jsonl') || path === own) continue
    const stat = await $.fs.stat(path)
    if (now - Number(stat.mtimeMs) > LOG_KEEP_MS) stale.push(path)
  }
  if (stale.length > 0) await $.process.run(['rm', '-f', '--', ...stale], { timeoutMs: 10000 })
}

/** Log the reading when it differs from the last one logged, and once at the start. */
export async function recordReading($, log, model, columns) {
  if (!log.isOn || log.isCapped) return
  try {
    await prepare($, log)
    const reading = readingRecord(model, { columns: Number.isFinite(columns) ? columns : DEFAULT_COLUMNS })
    const key = changeKey(reading)
    if (key === log.lastKey) return
    const head = { ts: iso(await $.clock.now()), sessionId: log.sessionId, event: log.lastKey === null ? 'start' : 'change' }
    let line = `${JSON.stringify({ ...head, ...reading })}\n`
    if (bytes(log.content) + bytes(line) + CAP_RESERVE_BYTES > LOG_CAP_BYTES) {
      line = `${JSON.stringify({ ...head, event: 'cap', note: `the log reached its ${LOG_CAP_BYTES}-byte cap; logging stopped` })}\n`
      log.isCapped = true
    }
    log.lastKey = key
    log.content += line
    log.lines += 1
    await $.fs.write(log.path, log.content)
  } catch (error) {
    warn($, log, error)
  }
}

/** The pane's Reading log rows; none while the log is off. */
export function paneRows(log) {
  if (!log.isOn) return []
  const rows = [log.path ?? 'Not written yet.']
  if (log.path !== null) rows.push(`${log.lines} ${log.lines === 1 ? 'line' : 'lines'} written.`)
  if (log.isCapped) rows.push('Stopped at the size cap.')
  if (log.hasFailed) rows.push('A write failed; the band is not affected.')
  return rows
}
