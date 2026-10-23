// wb-status: a read-only view of the active wb plan.
//
// session.start: register /wb-status, take a first reading shortly after the
//   session is ready, and poll once a minute. A hot load (/reload-plugins)
//   fires no session.start, so the band's first draw starts the readings too.
//   The first reading of each load restores the session's pin and latest
//   stage from the transcript when no pin was ever written (a resume, a hot
//   reload).
// prompt.submit, tool.call (Skill): a /wb:* command that names a plan
//   directory pins that plan for the session ($.state, session-scoped); the
//   latest one wins. A command that names a workflow stage records that stage
//   as the current one. /wb:create_project, which creates its folder rather
//   than naming it, notes the plan folders that exist and waits for the new
//   one. Observe only: both hooks return next(e)'s result.
// tool.call (Write, Edit): a write into docs/plans/<dir>/ while a
//   /wb:create_project waits pins that new folder; any write into a plan
//   folder takes a new reading. Observe only.
// tool.call (Bash): after a `bd close`, `bd update`, `git commit` and the like
//   has run (a subagent's included), or any command while a
//   /wb:create_project waits, take a new reading. Observe only.
// command.run (wb-status): `/wb-status` opens the pane, `/wb-status <plan dir>`
//   pins that plan, `/wb-status auto` clears the pin.
// ui.render (AbovePrompt): a dim `── wb plan ──` rule, then two lines fitted
//   to the band's width, above whatever the other mods draw there. While the
//   plan has no beads tasks: the stage chain and the current stage's signals.
//   Once it has: plan progress and test integrity.
// ui.render (Pane): how the plan was chosen, the planning stages, then the
//   report sections.
// $.ui.status: a one-line fallback, set only while a surface with no band
//   (the VS Code extension, mobile) is attached.
//
// Which plan: the pinned one; else, across every git worktree of the session's
// repository, the plan beads shows work on or the planning plan whose file
// changed last; else the newest beads plan directory. A guessed plan is marked
// as guessed. Plans, design.md and git are read in the plan's own worktree,
// which need not be the session's root.
//
// Everything is read from the cache the readings fill; the render hooks run no
// command. Plan documents are re-read only when their size or modification time
// moves. Nothing is written but the session's pin, its latest stage and a
// pending /wb:create_project: bd runs with --readonly, git only reads. The one
// other write is the opt-in reading log (the `log` option, off by default): a
// JSONL file per session under the Claude config directory, never in a repo.
//
// The host reads on(...) and $.noun.method(...) from source, so they are
// spelled literally, and helpers that take $ are top-level functions.

import {
  TONES,
  bandLines,
  buildModel,
  buildPlanningModel,
  chooseGuess,
  commentTargets,
  criteriaMentioned,
  decidesFor,
  isActivePlan,
  isBlankNode,
  isCreatedPlanWrite,
  isPlanningPlan,
  isRefreshCommand,
  latestInvocation,
  nextCommand,
  openAsksOf,
  paneSections,
  parseCriteria,
  parseFrontmatter,
  parseJsonArray,
  parseWorktrees,
  pinFrom,
  planIds,
  planPathIn,
  planState,
  promptCommand,
  readDesign,
  readIntent,
  readResearch,
  readTasks,
  rootOfPlanDir,
  separator,
  stageOfCommand,
  stageSignals,
  stageStates,
  statusLine,
  topGap,
  worktreeName,
} from './model.mjs'
import { createReadingLog, paneRows, recordReading } from './readinglog.mjs'

const PANE = 'wb-status'
const POLL_MS = 60 * 1000
const SETTLE_MS = 1500
const PLANS_TO_SCAN = 12
// A planning plan (no beads tasks yet) is guessed only when one of its files
// changed this recently, so an abandoned skeleton does not fill the band.
const PLANNING_GUESS_MS = 30 * 24 * 60 * 60 * 1000
// Comment reads per reading for plan issues outside the verifier window;
// the window itself is always read. Cached reads cost nothing.
const OUTSIDE_WINDOW_READS = 10
// The session's pinned plan: { path, by, at }, or null once cleared.
const PIN = { plugin: 'wb-status', key: 'pin' }
// The session's latest wb command that names a stage: { by, at }.
const STAGE = { plugin: 'wb-status', key: 'stage' }
// A /wb:create_project waiting for its folder: { by, at, known }, or null.
const PENDING = { plugin: 'wb-status', key: 'pending' }
const DOCS = ['README.md', 'research.md', 'product-research.md', 'design.md', 'tasks.md']

// The last reading, or null when there is nothing to show.
let model = null
// Comments per task id, kept until the task's comment count or update time moves.
const commentCache = new Map()
// Plan documents per path, kept until the file's size or modification time moves.
const docCache = new Map()
let isReading = false
let isAgainWanted = false
let isScheduled = false
let isStarted = false
let isRestored = false
let lastStatus
// The opt-in reading log, replaced by register with the plugin's options, and
// the band's last drawn width, which the log writes the band's lines at.
let readingLog = createReadingLog({})
let bandColumns = Infinity

/** @type {import('claude-code').Register} */
export function register(on, options) {
  readingLog = createReadingLog(options)
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'wb-status',
      description: 'Open the wb plan status; /wb-status <plan dir> pins a plan, /wb-status auto clears the pin',
      argumentHint: '[<plan dir> | auto]',
    })
    const started = await next(e)
    await start($)
    return started
  })

  on('prompt.submit', async ($, e, next) => {
    const ran = promptCommand(e)
    const known = ran?.name === 'wb:create_project' ? await knownPlanNames($) : null
    const entered = await next(e)
    if (entered && 'drop' in entered && entered.drop !== undefined) return entered
    if (ran !== null) await noteCommand($, ran.name, ran.args, known)
    return entered
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    const name = String(e.skill ?? '').replace(/^\//, '')
    const known = name === 'wb:create_project' ? await knownPlanNames($) : null
    const ran = await next(e)
    if (ran?.deny !== undefined || ran?.isError) return ran
    await noteCommand($, name, e.args, known)
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: ['Write', 'Edit'] }, async ($, e, next) => {
    const ran = await next(e)
    if (ran?.deny !== undefined || ran?.isError) return ran
    const path = planPathIn(e.file_path)
    if (path === null) return ran
    const pending = (await $.state.get(PENDING)).value ?? null
    if (pending !== null && isCreatedPlanWrite(e.file_path, pending.known)) {
      await $.state.set(PIN, { path, by: pending.by, at: pending.at })
      await $.state.set(PENDING, null)
    }
    schedule($)
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    const pending = isRefreshCommand(e.command) ? null : (await $.state.get(PENDING)).value ?? null
    if (isRefreshCommand(e.command) || pending !== null) schedule($)
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
    // A hot load (/reload-plugins) fires no session.start: the first draw
    // starts the readings instead.
    if (!isStarted) start($)
    if (model === null || e.props.hasSurvey) return next(e)
    const theirs = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    // paddingX: 1 takes a cell on each side.
    const columns = Math.max(1, Number(e.props.bodyColumns ?? e.viewport?.columns ?? Infinity) - 2)
    bandColumns = columns
    const lines = bandLines(model, columns)
    const toText = segment => Text({ ...TONES[segment.tone], children: [segment.text] })
    const row = segments => Box({ flexDirection: 'row', children: segments.map(toText) })
    const children = []
    const rule = separator(columns, e.props.maxRows)
    if (rule !== null) children.push(Text({ dimColor: true, wrap: 'truncate-end', children: [rule.text] }))
    children.push(row(lines.progress), row(lines.tests))
    // Whatever a mod below drew stays; an empty node would add a blank row
    // between the band and the prompt divider.
    if (!isBlankNode(theirs)) children.push(theirs)
    return Box({ flexDirection: 'column', paddingX: 1, marginTop: topGap(e.props.maxRows), children })
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const logRows = paneRows(readingLog)
    const sections = model === null ? [] : paneSections(model)
    if (logRows.length > 0) sections.push({ heading: 'Reading log', rows: logRows })
    if (model === null) {
      const none = Text({
        dimColor: true,
        children: ['No active wb plan: no unfinished docs/plans/<dir> with beads tasks, no plan file changed in the last 30 days, in any worktree, or beads is not available here. /wb-status <plan dir> pins one.'],
      })
      if (logRows.length === 0) return none
      return Box({ flexDirection: 'column', children: [none, Text({ children: [' '] }), Text({ weight: 'semibold', children: ['Reading log'] }), ...logRows.map(row => Text({ wrap: 'truncate-end', children: [row] }))] })
    }
    const children = []
    for (const section of sections) {
      if (children.length > 0) children.push(Text({ children: [' '] }))
      children.push(Text({ weight: 'semibold', children: [section.heading] }))
      for (const row of section.rows) {
        children.push(Text({ wrap: 'truncate-end', children: [row] }))
      }
    }
    return Box({ flexDirection: 'column', children })
  })
}

/**
 * A wb command ran: record its stage, pin the plan it names (the latest pin
 * wins), or, for a /wb:create_project that names none, wait for the folder it
 * creates.
 */
async function noteCommand($, name, args, known) {
  const at = await $.clock.now()
  if (stageOfCommand(name) !== null) await $.state.set(STAGE, { by: `/${name}`, at })
  const pin = pinFrom(name, args, at)
  if (pin !== null) {
    await $.state.set(PENDING, null)
    await pinPlan($, pin)
  } else if (name === 'wb:create_project') {
    await $.state.set(PENDING, { by: `/${name}`, at, known: known ?? [] })
    schedule($)
  }
}

/** Pin a plan for the session and read it at once; the latest pin wins. */
async function pinPlan($, pin) {
  await $.state.set(PIN, pin)
  schedule($)
}

/** Once per load: the first reading shortly after, then one a minute. */
async function start($) {
  if (isStarted) return
  isStarted = true
  $.clock.after(100, () => refresh($))
  $.clock.every(POLL_MS, () => refresh($))
}

/**
 * A pin never written in this session (a resume, a fresh load, a hot reload)
 * comes from the latest wb invocation the transcript holds, with the stage it
 * ran. Scanned once per load, newest first, before the first reading. A
 * compaction keeps $.state, so it needs nothing; a pin cleared with
 * /wb-status auto stays cleared.
 */
async function restorePin($) {
  if (isRestored) return
  isRestored = true
  try {
    const held = await $.state.get(PIN)
    if (held.version !== 0) return
    const found = latestInvocation(await $.session.messages(), await $.clock.now())
    if (found.pin !== null) await $.state.set(PIN, found.pin)
    if (found.stage !== null) await $.state.set(STAGE, found.stage)
  } catch {
    // No transcript to read: the plan is guessed.
  }
}

/** One refresh after a burst of tool calls has settled. */
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
  await recordReading($, readingLog, model, bandColumns)
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
  await restorePin($)
  const root = await $.session.root()
  const worktrees = await listWorktrees($, root)
  const mainRoot = worktrees[0] ?? root
  await pinCreatedPlan($, root, worktrees)
  const plan = await choosePlan($, root, worktrees)
  if (plan === null) return null
  const where = plan.root
  const docs = plan.docs
  const selection = {
    ...plan.selection,
    planName: '',
    dir: `docs/plans/${plan.name}`,
    worktree: worktreeName(plan.root, mainRoot),
  }
  const last = await currentStage($, plan.selection)

  if (hasBeadsTasks(plan.fm)) {
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
    if (built !== null) {
      // The planning stages are all behind it; the explore record is not
      // looked up in beads here, since a later stage being done settles it.
      const explore = docs.thoughts.length > 0 ? { thoughts: docs.thoughts.length, isDecided: false } : null
      const stages = stageStates({ ...docs.read, explore, isImplemented: built.isDone, last })
      const asks = openAsksOf(built)
      return {
        ...built,
        inputs: { bd: statuses([...issues, ...asks.map(ask => ({ id: ask.id, status: 'open' }))]), docs: docStatuses(docs) },
        stages,
        signals: stageSignals({ ...docs.read, explore, openAsks: asks }),
        next: nextCommand(stages, false),
        selection: { ...selection, planName: built.planName },
      }
    }
  }

  // No beads tasks yet: the planning view. Beads only adds the open Q: and
  // Decide: issues and the explore decision record, so a failing bd leaves
  // those out rather than the band.
  const openIssues = plan.openIssues ?? (await bdListOrEmpty($, where, ['--status', 'open,in_progress,blocked']))
  const closedDecides = await bdListOrEmpty($, where, ['--status', 'closed', '--title-contains', 'Decide:'])
  const decided = decidesFor(closedDecides, plan.name, docs.thoughts)
  const explore = docs.thoughts.length > 0 || decided.length > 0 ? { thoughts: docs.thoughts.length, isDecided: decided.length > 0 } : null
  const planName = planNameOf(plan, docs)
  const built = buildPlanningModel({
    planName,
    ...docs.read,
    explore,
    openIssues,
    since: createdOf(plan.fm, docs),
    epic: plan.fm?.beads_epic ?? null,
    last,
  })
  const asked = openIssues.filter(issue => /^(Q|Decide):/.test(String(issue.title ?? '')))
  return { ...built, inputs: { bd: statuses([...asked, ...closedDecides]), docs: docStatuses(docs) }, selection: { ...selection, planName } }
}

/** { id: status } of the issues a reading used, for the reading log. */
function statuses(issues) {
  return Object.fromEntries(issues.filter(issue => typeof issue?.id === 'string').map(issue => [issue.id, String(issue.status ?? 'open')]))
}

/** The status each plan document says, for the reading log. */
function docStatuses(docs) {
  const { research, design, tasks } = docs.read
  return { research: research?.status ?? null, design: design?.status ?? null, tasks: tasks?.status ?? null, thoughts: docs.thoughts.length }
}

function hasBeadsTasks(fm) {
  const tasks = fm?.beads_tasks
  return tasks !== null && typeof tasks === 'object' && Object.keys(tasks).length > 0
}

/** The plan's name: tasks.md's or research.md's `project`, the README's title, else its directory. */
function planNameOf(plan, docs) {
  const fromResearch = parseFrontmatter(docs.text['research.md'] ?? '')?.project
  const title = /^#\s+(.+)$/m.exec(docs.text['README.md'] ?? '')?.[1]?.trim()
  return String(plan.fm?.project || fromResearch || title || plan.name)
}

/** When the plan was created, for matching the Q: and Decide: issues opened since. */
function createdOf(fm, docs) {
  const research = parseFrontmatter(docs.text['research.md'] ?? '') ?? {}
  const readme = /\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2})/.exec(docs.text['README.md'] ?? '')?.[1]
  return String(fm?.created_timestamp ?? fm?.created ?? research.created_timestamp ?? research.created ?? readme ?? '')
}

/** The stage of the session's latest wb command, when it ran for the pinned plan (no earlier than the pin). */
async function currentStage($, selection) {
  if (selection?.kind !== 'pinned') return null
  const held = (await $.state.get(STAGE)).value ?? null
  if (held === null || Number(held.at) < Number(selection.at)) return null
  return stageOfCommand(held.by)
}

/**
 * While a /wb:create_project waits for its folder, a plan folder that was not
 * there when it ran is the one it made: pin it (the newest name, when several
 * appeared).
 */
async function pinCreatedPlan($, root, worktrees) {
  const pending = (await $.state.get(PENDING)).value ?? null
  if (pending === null) return
  const known = new Set(pending.known ?? [])
  let found = null
  for (const base of await bases($, root, worktrees)) {
    for (const name of await planDirNames($, base)) {
      if (!known.has(name) && (found === null || name > found.name)) found = { name, dir: `${base}/docs/plans/${name}` }
    }
  }
  if (found === null) return
  await $.state.set(PIN, { path: found.dir, by: pending.by, at: pending.at })
  await $.state.set(PENDING, null)
}

/** The plan folder names under every base, for telling a new folder from the ones already there. */
async function knownPlanNames($) {
  const names = new Set()
  try {
    for (const base of await bases($)) {
      for (const name of await planDirNames($, base)) names.add(name)
    }
  } catch {
    // Nothing listed: every folder found later counts as new.
  }
  return [...names]
}

async function planDirNames($, base) {
  try {
    const plans = `${base}/docs/plans`
    if (!(await $.fs.exists(plans))) return []
    return (await $.fs.list(plans)).filter(entry => entry.kind === 'dir').map(entry => entry.name)
  } catch {
    return []
  }
}

/**
 * The plan this session works on: the pinned one when its folder is found;
 * else, among the unfinished plans of every worktree, the beads plan with
 * beads activity or the planning plan whose file changed last; else the
 * newest beads plan by directory name.
 */
async function choosePlan($, root, worktrees) {
  let missing
  const held = await $.state.get(PIN)
  const pin = held.value ?? null
  if (pin !== null) {
    const dir = await resolvePlanDir($, pin.path, await bases($, root, worktrees))
    const plan = dir === null ? null : await loadPlan($, dir)
    if (plan !== null) {
      return { ...plan, selection: { kind: 'pinned', by: pin.by, at: pin.at } }
    }
    missing = pin.path
  }

  const { beads, planning } = await discoverPlans($, worktrees.length > 0 ? worktrees : [root])
  if (beads.length === 0 && planning.length === 0) return null
  let openIssues
  let named = []
  if (beads.length > 0) {
    openIssues = await bdList($, root, ['--status', 'open,in_progress,blocked'])
    const allIds = [...new Set(beads.flatMap(one => planIds(one.fm)))]
    named = allIds.length === 0 ? [] : await bdList($, root, ['--all', '--id', allIds.join(',')])
  }
  let now = null
  try {
    now = await $.clock.now()
  } catch {
    // No clock: no planning plan is too old to guess.
  }
  const guess = chooseGuess(beads, [...(openIssues ?? []), ...named], planning, now, PLANNING_GUESS_MS)
  if (guess === null) return null
  const plan = await loadPlan($, guess.candidate.dir)
  if (plan === null) return null
  return { ...plan, openIssues, selection: { ...guess.selection, missing } }
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

/** The absolute plan directory a pinned path names: the first base holding its tasks.md or README.md. */
async function resolvePlanDir($, path, roots) {
  const clean = String(path).replace(/\/+$/, '').replace(/^\.\//, '')
  const tries = clean.startsWith('/') ? [clean] : roots.map(base => `${base}/${clean}`)
  for (const dir of tries) {
    if (await $.fs.exists(`${dir}/tasks.md`)) return dir
    if (await $.fs.exists(`${dir}/README.md`)) return dir
  }
  return null
}

/** A plan directory's documents, tasks.md frontmatter, criteria and own root (its worktree's top level). */
async function loadPlan($, dir) {
  const docs = await readDocs($, dir)
  const tasksText = docs.text['tasks.md']
  if (tasksText === null && docs.text['README.md'] === null) return null
  const fm = tasksText === null ? null : parseFrontmatter(tasksText)
  const fromDesign = parseCriteria(docs.text['design.md'] ?? '')
  return {
    fm,
    docs,
    dir,
    name: dir.split('/').filter(Boolean).at(-1),
    root: await planRoot($, dir),
    criteria: fromDesign.length > 0 ? fromDesign : criteriaMentioned(tasksText ?? ''),
  }
}

/**
 * A plan's documents, read through the cache: their texts (null when
 * missing), what each says, its thoughts docs, and its newest file. A file is
 * re-read only when the directory listing shows its size or modification time
 * moved; a file the listing does not show is read each time.
 */
async function readDocs($, dir) {
  const entries = await listEntries($, dir)
  const byName = new Map(entries.map(entry => [entry.name, entry]))
  const text = {}
  for (const name of DOCS) text[name] = await readDoc($, `${dir}/${name}`, byName.get(name))
  let thoughts = []
  if (byName.get('thoughts')?.kind === 'dir' || (!byName.has('thoughts') && (await $.fs.exists(`${dir}/thoughts`)))) {
    thoughts = (await listEntries($, `${dir}/thoughts`))
      .filter(entry => entry.kind === 'file' && entry.name.endsWith('.md'))
      .map(entry => entry.name)
  }
  const intent = text['README.md'] === null ? null : readIntent(text['README.md'])
  // A product-research.md that is complete stands for a research.md left as a skeleton.
  let research = readResearch(text['research.md'])
  const product = readResearch(text['product-research.md'])
  if (product !== null && (research === null || research.isTemplate || research.status !== 'complete') && product.status === 'complete') research = product
  return {
    text,
    thoughts,
    read: { intent, research, design: readDesign(text['design.md']), tasks: readTasks(text['tasks.md']) },
    newest: newestFile(entries),
  }
}

function newestFile(entries) {
  return entries
    .filter(entry => entry.kind === 'file' && entry.name.endsWith('.md') && Number(entry.mtimeMs) > 0)
    .reduce((best, entry) => (best === null || entry.mtimeMs > best.mtimeMs ? { name: entry.name, mtimeMs: entry.mtimeMs } : best), null)
}

async function listEntries($, dir) {
  try {
    return await $.fs.list(dir)
  } catch {
    return []
  }
}

async function readDoc($, path, entry) {
  if (entry?.kind === 'file' && Number(entry.mtimeMs) > 0) {
    const held = docCache.get(path)
    if (held !== undefined && held.mtimeMs === entry.mtimeMs && held.size === entry.size) return held.text
    const text = await $.fs.read(path)
    docCache.set(path, { mtimeMs: entry.mtimeMs, size: entry.size, text })
    return text
  }
  if (!(await $.fs.exists(path))) return null
  return await $.fs.read(path)
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

/**
 * The unfinished plans under each worktree's docs/plans, newest names first
 * per worktree: beads plans (with beads tasks) and planning plans (a
 * README.md or tasks.md, no beads tasks yet), each planning plan with its
 * most recently changed file.
 */
async function discoverPlans($, roots) {
  const beads = []
  const planning = []
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
      const entries = await listEntries($, dir)
      const has = async file => entries.some(entry => entry.name === file && entry.kind === 'file') || (await $.fs.exists(`${dir}/${file}`))
      const hasTasks = await has('tasks.md')
      if (!hasTasks && !(await has('README.md'))) continue
      const text = hasTasks ? await $.fs.read(`${dir}/tasks.md`) : null
      const fm = text === null ? null : parseFrontmatter(text)
      if (isActivePlan(fm)) beads.push({ name, dir, root, fm, text })
      else if (isPlanningPlan(fm)) planning.push({ name, dir, root, fm, text, newest: newestFile(entries) })
    }
  }
  return { beads, planning }
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

async function bdListOrEmpty($, root, filters) {
  try {
    return await bdList($, root, filters)
  } catch {
    return []
  }
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
