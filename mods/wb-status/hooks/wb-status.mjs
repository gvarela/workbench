// wb-status: a read-only view of the active wb plan.
//
// session.start: register /wb-status, restore the session's pinned plan from
//   the transcript when the process starts without one (a resume), take a
//   first reading shortly after the session is ready, and poll once a minute.
// prompt.submit, tool.call (Skill): a /wb:* command that names a plan
//   directory pins that plan for the session ($.state, session-scoped); the
//   latest one wins. Observe only: both hooks return next(e)'s result.
// tool.call (Bash): after a `bd close`, `bd update`, `git commit` and the like
//   has run (a subagent's included), take a new reading. Observe only.
// command.run (wb-status): `/wb-status` opens the pane, `/wb-status <plan dir>`
//   pins that plan, `/wb-status auto` clears the pin.
// ui.render (AbovePrompt): a dim `── wb plan ──` rule, then two lines, plan
//   progress and test integrity, fitted to the band's width, above whatever
//   the other mods draw there.
// ui.render (Pane): how the plan was chosen, then the four report sections.
// $.ui.status: a one-line fallback, set only while a surface with no band
//   (the VS Code extension, mobile) is attached.
//
// Which plan: the pinned one; else, across every git worktree of the session's
// repository, the plan beads shows work on; else the newest plan directory.
// A guessed plan is marked as guessed. Plans, design.md and git are read in
// the plan's own worktree, which need not be the session's root.
//
// Everything is read from the cache the readings fill; the render hooks run no
// command. With no plan, no beads, or any read failing, nothing is drawn.
// Nothing is written but the session's pin: bd runs with --readonly, git only
// reads.
//
// The host reads on(...) and $.noun.method(...) from source, so they are
// spelled literally, and helpers that take $ are top-level functions.

import {
  TONES,
  bandLines,
  buildModel,
  chooseByActivity,
  commentTargets,
  criteriaMentioned,
  isActivePlan,
  isBeadsPlan,
  isRefreshCommand,
  latestPin,
  newestByName,
  paneSections,
  parseCriteria,
  parseFrontmatter,
  parseJsonArray,
  parseWorktrees,
  pinFrom,
  pinFromPrompt,
  planIds,
  planPathIn,
  planState,
  rootOfPlanDir,
  separator,
  statusLine,
  worktreeName,
} from './model.mjs'

const PANE = 'wb-status'
const POLL_MS = 60 * 1000
const SETTLE_MS = 1500
const PLANS_TO_SCAN = 12
// Comment reads per reading for plan issues outside the verifier window;
// the window itself is always read. Cached reads cost nothing.
const OUTSIDE_WINDOW_READS = 10
// The session's pinned plan: { path, by, at }, or null once cleared.
const PIN = { plugin: 'wb-status', key: 'pin' }

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
      description: 'Open the wb plan status; /wb-status <plan dir> pins a plan, /wb-status auto clears the pin',
      argumentHint: '[<plan dir> | auto]',
    })
    const started = await next(e)
    await restorePin($)
    $.clock.after(100, () => refresh($))
    $.clock.every(POLL_MS, () => refresh($))
    return started
  })

  on('prompt.submit', async ($, e, next) => {
    const entered = await next(e)
    if (entered && 'drop' in entered && entered.drop !== undefined) return entered
    const pin = pinFromPrompt(e, await $.clock.now())
    if (pin !== null) await pinPlan($, pin)
    return entered
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran?.deny !== undefined || ran?.isError) return ran
    const pin = pinFrom(String(e.skill ?? '').replace(/^\//, ''), e.args, await $.clock.now())
    if (pin !== null) await pinPlan($, pin)
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (isRefreshCommand(e.command)) schedule($)
    return ran
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'wb-status' }, async ($, e) => {
    const args = String(e.args ?? '').trim()
    let text
    if (args === 'auto') {
      await $.state.set(PIN, null)
      text = 'wb-status: plan pin cleared; the plan is guessed again.'
    } else if (args !== '') {
      const path = planPathIn(args) ?? args.replace(/\/+$/, '')
      const found = await resolvePlanDir($, path, await bases($))
      if (found === null) return { text: `wb-status: no tasks.md under ${path} in this session's worktrees.` }
      await $.state.set(PIN, { path, by: '/wb-status', at: await $.clock.now() })
      text = `wb-status: pinned ${path}.`
    }
    await refresh($)
    await $.ui.open({ id: PANE, title: 'wb status' })
    return text === undefined ? {} : { text }
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
        children: ['No active wb plan: no docs/plans/*/tasks.md with beads ids and a status other than complete in any worktree, or beads is not available here. /wb-status <plan dir> pins one.'],
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

/** Pin a plan for the session and read it at once; the latest pin wins. */
async function pinPlan($, pin) {
  await $.state.set(PIN, pin)
  schedule($)
}

/**
 * A process that starts with no pin (a resume, a fresh load) takes the latest
 * wb invocation the transcript holds. A compaction keeps $.state, so it needs
 * nothing; a pin cleared with /wb-status auto stays cleared.
 */
async function restorePin($) {
  try {
    const held = await $.state.get(PIN)
    if (held.version !== 0) return
    const pin = latestPin(await $.session.messages(), await $.clock.now())
    if (pin !== null) await $.state.set(PIN, pin)
  } catch {
    // No transcript to read: the plan is guessed.
  }
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
  const worktrees = await listWorktrees($, root)
  const mainRoot = worktrees[0] ?? root
  const plan = await choosePlan($, root, worktrees)
  if (plan === null) return null
  const where = plan.root

  const ids = planIds(plan.fm)
  const named = await bdList($, where, ['--all', '--id', ids.join(',')])
  // Every issue under the epic belongs to the plan, follow-ups included.
  const epic = plan.fm.beads_epic
  const children = typeof epic === 'string' && epic !== '' ? await bdList($, where, ['--all', '--parent', epic]) : []
  const issues = [...named, ...children]
  const openIssues = plan.openIssues ?? (await bdList($, where, ['--status', 'open,in_progress,blocked']))
  const commits = await gitLog($, where, plan.fm)
  const state = planState({ fm: plan.fm, issues, openIssues })
  const comments = state === null ? {} : await readComments($, where, state)

  const built = buildModel({ fm: plan.fm, criteria: plan.criteria, issues, openIssues, commits, comments })
  if (built === null) return null
  const selection = {
    ...plan.selection,
    planName: built.planName,
    dir: `docs/plans/${plan.name}`,
    worktree: worktreeName(plan.root, mainRoot),
  }
  return { ...built, selection }
}

/**
 * The plan this session works on: the pinned one when its tasks.md is found;
 * else, among the unfinished beads plans of every worktree, the one with
 * beads activity; else the newest by directory name.
 */
async function choosePlan($, root, worktrees) {
  let missing
  const held = await $.state.get(PIN)
  const pin = held.value ?? null
  if (pin !== null) {
    const dir = await resolvePlanDir($, pin.path, await bases($, root, worktrees))
    const plan = dir === null ? null : await loadPlan($, dir)
    if (plan !== null && isBeadsPlan(plan.fm)) {
      return { ...plan, selection: { kind: 'pinned', by: pin.by, at: pin.at } }
    }
    missing = pin.path
  }

  const candidates = await discoverPlans($, worktrees.length > 0 ? worktrees : [root])
  if (candidates.length === 0) return null
  const openIssues = await bdList($, root, ['--status', 'open,in_progress,blocked'])
  const allIds = [...new Set(candidates.flatMap(one => planIds(one.fm)))]
  const named = allIds.length === 0 ? [] : await bdList($, root, ['--all', '--id', allIds.join(',')])
  const active = chooseByActivity(candidates, [...openIssues, ...named])
  const picked = active?.candidate ?? newestByName(candidates)
  const selection = active === null ? { kind: 'directory' } : { kind: 'beads', why: active.why, id: active.id }
  const plan = await loadPlan($, picked.dir, picked.text)
  if (plan === null) return null
  return { ...plan, openIssues, selection: { ...selection, missing } }
}

/** Where a relative plan path may sit: the session's directory, its root, then each worktree. */
async function bases($, root, worktrees) {
  const sessionRoot = root ?? (await $.session.root())
  let cwd = sessionRoot
  try {
    cwd = await $.session.cwd()
  } catch {
    // The root stands in.
  }
  const trees = worktrees ?? (await listWorktrees($, sessionRoot))
  return [...new Set([cwd, sessionRoot, ...trees])]
}

/** The absolute plan directory a pinned path names, the first base holding its tasks.md. */
async function resolvePlanDir($, path, roots) {
  const clean = String(path).replace(/\/+$/, '').replace(/^\.\//, '')
  const tries = clean.startsWith('/') ? [clean] : roots.map(base => `${base}/${clean}`)
  for (const dir of tries) {
    if (await $.fs.exists(`${dir}/tasks.md`)) return dir
  }
  return null
}

/** A plan directory's frontmatter, criteria and own root (its worktree's top level). */
async function loadPlan($, dir, tasksText) {
  const text = tasksText ?? (await $.fs.read(`${dir}/tasks.md`))
  const fm = parseFrontmatter(text)
  if (fm === null) return null
  const designPath = `${dir}/design.md`
  const designText = (await $.fs.exists(designPath)) ? await $.fs.read(designPath) : ''
  const fromDesign = parseCriteria(designText)
  return {
    fm,
    name: dir.split('/').filter(Boolean).at(-1),
    root: await planRoot($, dir),
    criteria: fromDesign.length > 0 ? fromDesign : criteriaMentioned(text),
  }
}

/** `git rev-parse --show-toplevel` in the plan's directory, else what leads its docs/plans/. */
async function planRoot($, dir) {
  const derived = rootOfPlanDir(dir) ?? dir
  try {
    const { exitCode, stdout } = await $.process.run(
      ['git', '--no-optional-locks', 'rev-parse', '--show-toplevel'],
      { cwd: dir, timeoutMs: 5000 },
    )
    const top = String(stdout).trim()
    if (exitCode === 0 && top.startsWith('/') && !top.includes('\n') && dir.startsWith(`${top}/`)) return top
  } catch {
    // Not a git checkout: the derived root stands.
  }
  return derived
}

/** Every worktree of the session's repository, the main checkout first; the root alone outside git. */
async function listWorktrees($, root) {
  try {
    const { exitCode, stdout } = await $.process.run(
      ['git', '--no-optional-locks', 'worktree', 'list', '--porcelain'],
      { cwd: root, timeoutMs: 5000 },
    )
    const trees = exitCode === 0 ? parseWorktrees(stdout) : []
    if (trees.length === 0) return [root]
    return trees.includes(root) ? trees : [...trees, root]
  } catch {
    return [root]
  }
}

/** The unfinished beads plans under each worktree's docs/plans, newest names first per worktree. */
async function discoverPlans($, roots) {
  const out = []
  for (const root of roots) {
    const base = `${root}/docs/plans`
    if (!(await $.fs.exists(base))) continue
    const dirs = (await $.fs.list(base))
      .filter(entry => entry.kind === 'dir')
      .map(entry => entry.name)
      .sort()
      .reverse()
      .slice(0, PLANS_TO_SCAN)
    for (const name of dirs) {
      const dir = `${base}/${name}`
      const tasksPath = `${dir}/tasks.md`
      if (!(await $.fs.exists(tasksPath))) continue
      const text = await $.fs.read(tasksPath)
      const fm = parseFrontmatter(text)
      if (!isActivePlan(fm)) continue
      out.push({ name, dir, root, fm, text })
    }
  }
  return out
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
    ['git', '--no-optional-locks', 'log', '--format=%h %s', '-n', '1000', ...range],
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
