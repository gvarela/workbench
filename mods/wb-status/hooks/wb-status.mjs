// wb-status: a read-only view of the active wb plan.
//
// session.start: register /wb-status, take a first reading shortly after the
//   session is ready, and poll once a minute.
// tool.call (Bash): after a `bd close`, `bd update`, `git commit` and the like
//   has run (a subagent's included), take a new reading. Observe only: the
//   hook calls next(e) first and returns its result unchanged.
// ui.render (AbovePrompt): a dim `── wb plan ──` rule, then two lines, plan
//   progress and test integrity, fitted to the band's width, above whatever
//   the other mods draw there.
// ui.render (Pane): the four report sections, opened by /wb-status.
// $.ui.status: a one-line fallback, set only while a surface with no band
//   (the VS Code extension, mobile) is attached.
//
// Everything is read from the cache the readings fill; the render hooks run no
// command. With no plan, no beads, or any read failing, nothing is drawn.
// Nothing is written: bd runs with --readonly, git only logs.
//
// The host reads on(...) and $.noun.method(...) from source, so they are
// spelled literally, and helpers that take $ are top-level functions.

import {
  TONES,
  bandLines,
  buildModel,
  commentTargets,
  criteriaMentioned,
  isActivePlan,
  isRefreshCommand,
  paneSections,
  parseCriteria,
  parseFrontmatter,
  parseJsonArray,
  planIds,
  planState,
  separator,
  statusLine,
} from './model.mjs'

const PANE = 'wb-status'
const POLL_MS = 60 * 1000
const SETTLE_MS = 1500
const PLANS_TO_SCAN = 12
// Comment reads per reading for plan issues outside the verifier window;
// the window itself is always read. Cached reads cost nothing.
const OUTSIDE_WINDOW_READS = 10

// The last reading, or null when there is nothing to show.
let model = null
// Comments per task id, kept until the task's comment count or update time moves.
const commentCache = new Map()
let isReading = false
let isAgainWanted = false
let isScheduled = false
let lastStatus

/** @type {import('claude-code').Register} */
export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'wb-status',
      description: 'Open the wb plan status: decisions, delivered work, test integrity, follow-ups',
    })
    const started = await next(e)
    $.clock.after(100, () => refresh($))
    $.clock.every(POLL_MS, () => refresh($))
    return started
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (isRefreshCommand(e.command)) schedule($)
    return ran
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'wb-status' }, async $ => {
    await refresh($)
    await $.ui.open({ id: PANE, title: 'wb status' })
    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (model === null || e.props.hasSurvey) return next(e)
    const theirs = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    // paddingX: 1 takes a cell on each side.
    const columns = Math.max(1, Number(e.props.bodyColumns ?? e.viewport?.columns ?? Infinity) - 2)
    const lines = bandLines(model, columns)
    const toText = segment => Text({ ...TONES[segment.tone], children: [segment.text] })
    const row = segments => Box({ flexDirection: 'row', children: segments.map(toText) })
    const children = []
    const rule = separator(columns, e.props.maxRows)
    if (rule !== null) children.push(Text({ dimColor: true, wrap: 'truncate-end', children: [rule.text] }))
    children.push(row(lines.progress), row(lines.tests))
    if (theirs) children.push(theirs)
    return Box({ flexDirection: 'column', paddingX: 1, children })
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    if (model === null) {
      return Text({
        dimColor: true,
        children: ['No active wb plan: no docs/plans/*/tasks.md with beads ids and a status other than complete, or beads is not available here.'],
      })
    }
    const children = []
    for (const section of paneSections(model)) {
      if (children.length > 0) children.push(Text({ children: [' '] }))
      children.push(Text({ weight: 'semibold', children: [section.heading] }))
      for (const row of section.rows) {
        children.push(Text({ wrap: 'truncate-end', children: [row] }))
      }
    }
    return Box({ flexDirection: 'column', children })
  })
}

/** One refresh after a burst of Bash calls has settled. */
function schedule($) {
  if (isScheduled) return
  isScheduled = true
  $.clock.after(SETTLE_MS, () => {
    isScheduled = false
    refresh($)
  })
}

/** Take a reading, at most one at a time; a request meanwhile runs once after. */
async function refresh($) {
  if (isReading) {
    isAgainWanted = true
    return
  }
  isReading = true
  try {
    model = await read($)
  } catch {
    model = null
  } finally {
    isReading = false
  }
  $.ui.invalidate('ui.render')
  await showStatus($)
  if (isAgainWanted) {
    isAgainWanted = false
    await refresh($)
  }
}

/** The status line, only where a surface draws no band, and only when it changed. */
async function showStatus($) {
  const surfaces = await $.session.surfaces()
  const hasNoBand = surfaces.some(surface => surface === 'vscode' || surface === 'mobile')
  const text = model !== null && hasNoBand ? statusLine(model) : undefined
  if (text === lastStatus) return
  lastStatus = text
  $.ui.status(text)
}

async function read($) {
  const root = await $.session.root()
  const plan = await findPlan($, root)
  if (plan === null) return null

  const ids = planIds(plan.fm)
  const named = await bdList($, root, ['--all', '--id', ids.join(',')])
  // Every issue under the epic belongs to the plan, follow-ups included.
  const epic = plan.fm.beads_epic
  const children = typeof epic === 'string' && epic !== '' ? await bdList($, root, ['--all', '--parent', epic]) : []
  const issues = [...named, ...children]
  const openIssues = await bdList($, root, ['--status', 'open,in_progress,blocked'])
  const commits = await gitLog($, root, plan.fm)
  const state = planState({ fm: plan.fm, issues, openIssues })
  const comments = state === null ? {} : await readComments($, root, state)

  return buildModel({ fm: plan.fm, criteria: plan.criteria, issues, openIssues, commits, comments })
}

/** The newest docs/plans/<dir>/tasks.md whose plan is unfinished and tracked in beads. */
async function findPlan($, root) {
  const base = `${root}/docs/plans`
  if (!(await $.fs.exists(base))) return null
  const dirs = (await $.fs.list(base))
    .filter(entry => entry.kind === 'dir')
    .map(entry => entry.name)
    .sort()
    .reverse()
    .slice(0, PLANS_TO_SCAN)
  for (const dir of dirs) {
    const tasksPath = `${base}/${dir}/tasks.md`
    if (!(await $.fs.exists(tasksPath))) continue
    const tasksText = await $.fs.read(tasksPath)
    const fm = parseFrontmatter(tasksText)
    if (!isActivePlan(fm)) continue
    const designPath = `${base}/${dir}/design.md`
    const designText = (await $.fs.exists(designPath)) ? await $.fs.read(designPath) : ''
    const fromDesign = parseCriteria(designText)
    return { fm, criteria: fromDesign.length > 0 ? fromDesign : criteriaMentioned(tasksText) }
  }
  return null
}

async function bdList($, root, filters) {
  const { exitCode, stdout } = await $.process.run(
    ['bd', 'list', '--json', '--flat', '--limit', '0', '--readonly', ...filters],
    { cwd: root, timeoutMs: 15000 },
  )
  const list = exitCode === 0 ? parseJsonArray(stdout) : null
  if (list === null) throw new Error('bd list failed')
  return list
}

async function gitLog($, root, fm) {
  const since = fm.created_timestamp ?? fm.created
  const range = typeof since === 'string' && since !== '' ? [`--since=${since}`] : []
  const { exitCode, stdout } = await $.process.run(
    ['git', 'log', '--format=%h %s', '-n', '1000', ...range],
    { cwd: root, timeoutMs: 15000 },
  )
  return exitCode === 0 ? stdout.split('\n').filter(line => line !== '') : []
}

/**
 * Comments of the plan's issues, cached by comment count and update time:
 * every issue in the verifier window (this phase's tasks and follow-ups), and
 * up to OUTSIDE_WINDOW_READS uncached others per reading, so the pane's
 * per-criterion verdicts fill in over a few readings at a bounded cost.
 */
async function readComments($, root, state) {
  const targets = commentTargets(state)
  const out = {}
  let outsideReads = 0
  for (const id of [...targets.window, ...targets.rest]) {
    const issue = state.byId.get(id)
    const stamp = `${issue.comment_count}|${issue.updated_at}`
    const held = commentCache.get(id)
    if (held !== undefined && held.stamp === stamp) {
      out[id] = held.comments
      continue
    }
    if (!targets.window.includes(id)) {
      if (outsideReads >= OUTSIDE_WINDOW_READS) continue
      outsideReads += 1
    }
    const { exitCode, stdout } = await $.process.run(
      ['bd', 'comments', id, '--json', '--readonly'],
      { cwd: root, timeoutMs: 15000 },
    )
    const comments = exitCode === 0 ? parseJsonArray(stdout) : null
    if (comments === null) continue
    commentCache.set(id, { stamp, comments })
    out[id] = comments
  }
  return out
}
