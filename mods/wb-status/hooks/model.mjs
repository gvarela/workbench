// wb-status: the pure half of the mod. Nothing here touches `$`: it parses
// what the hooks module read (a tasks.md, a design.md, bd JSON, git log
// lines) and turns it into the model the band, the status line and the pane
// draw from. Kept apart so the tests can exercise it without a session.

const FINISHED = new Set(['complete', 'completed', 'done', 'archived', 'cancelled'])
const UNCLOSED = new Set(['open', 'in_progress', 'blocked'])

/** A YAML-ish frontmatter parser: top-level scalars and one level of maps. */
export function parseFrontmatter(text) {
  const lines = String(text).split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return null
  const out = {}
  let parent = null
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i]
    if (raw.trim() === '---') return out
    const line = stripComment(raw)
    if (line.trim() === '') continue
    const match = /^(\s*)([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line)
    if (!match) continue
    const [, indent, key, rest] = match
    if (indent.length === 0) {
      if (rest === '') {
        out[key] = {}
        parent = key
      } else {
        out[key] = scalar(rest)
        parent = null
      }
    } else if (parent !== null) {
      out[parent][key] = scalar(rest)
    }
  }
  return null
}

function stripComment(line) {
  if (/^\s*#/.test(line)) return ''
  return line.replace(/\s+#.*$/, '')
}

function scalar(rest) {
  const value = rest.trim()
  if (value === 'null' || value === '~') return null
  const quoted = /^(['"])(.*)\1$/.exec(value)
  return quoted ? quoted[2] : value
}

/** Whether a parsed tasks.md frontmatter names an unfinished, beads-tracked plan. */
export function isActivePlan(fm) {
  if (fm === null || typeof fm !== 'object') return false
  const status = String(fm.status ?? '').toLowerCase()
  if (FINISHED.has(status)) return false
  const tasks = fm.beads_tasks
  return tasks !== null && typeof tasks === 'object' && Object.keys(tasks).length > 0
}

/** Every beads id the frontmatter names: epic, phase milestones, tasks. */
export function planIds(fm) {
  const ids = new Set()
  if (typeof fm.beads_epic === 'string' && fm.beads_epic !== '') ids.add(fm.beads_epic)
  for (const group of [fm.beads_phases, fm.beads_tasks]) {
    if (group === null || typeof group !== 'object') continue
    for (const id of Object.values(group)) {
      if (typeof id === 'string' && id !== '') ids.add(id)
    }
  }
  return [...ids]
}

/** The criteria a design.md lists as `- **AC-n Title**`, in order. */
export function parseCriteria(designText) {
  const criteria = []
  const seen = new Set()
  for (const line of String(designText).split(/\r?\n/)) {
    const match = /^\s*[-*]\s+\*\*(AC-\d+)[\s:.-]+(.+?)\*\*/.exec(line)
    if (match && !seen.has(match[1])) {
      seen.add(match[1])
      criteria.push({ id: match[1], title: match[2].trim() })
    }
  }
  return criteria
}

/** Criterion ids mentioned anywhere in a text, when design.md lists none. */
export function criteriaMentioned(text) {
  const ids = [...new Set(String(text).match(/\bAC-\d+\b/g) ?? [])]
  ids.sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)))
  return ids.map(id => ({ id, title: '' }))
}

/** The latest `red(AC-n)` commit per criterion, from `git log --format='%h %s'` lines (newest first). */
export function redCommits(logLines) {
  const red = {}
  for (const line of logLines) {
    const space = line.indexOf(' ')
    if (space < 0) continue
    const sha = line.slice(0, space)
    const subject = line.slice(space + 1)
    const match = /\bred\((AC-\d+)\)/.exec(subject)
    if (match && red[match[1]] === undefined) red[match[1]] = sha
  }
  return red
}

function firstLine(text) {
  return String(text).split(/\r?\n/)[0].trim()
}

function latest(list) {
  return list.reduce((best, one) => (best === null || one.at > best.at ? one : best), null)
}

/**
 * The verdict a `test integrity:` comment carries. Older coordinators posted
 * these with no Status line, so: an explicit PASS or FAIL wins, then an
 * escalated finding (which fails the task), then a clean count, which says
 * only that integrity held and is therefore a weak PASS.
 */
function integrityVerdict(text) {
  const status = /###\s*Status:\s*(PASS|FAIL)\b/.exec(text)
  if (status) return { status: status[1], isWeak: false }
  const findingsLine = /^.*Findings:.*$/m.exec(text)?.[0] ?? ''
  const worded = /\b(PASS|FAIL)(?:ED)?\b/.exec(findingsLine) ?? /^\s*(?:Verdict|Result|Status)\s*:\s*(PASS|FAIL)\b/im.exec(text)
  if (worded) return { status: worded[1], isWeak: false }
  const findings = /Findings:\s*(\d+)\s*\((\d+)\s*escalated\)/.exec(text)
  if (findings === null) return null
  return Number(findings[2]) > 0 ? { status: 'FAIL', isWeak: false } : { status: 'PASS', isWeak: true }
}

/** A verifier verdict a close reason states, such as "Verified PASS". */
export function closeReasonVerdict(reason) {
  const text = String(reason ?? '')
  const match = /\b[Vv]erif\w*\b[^.\n]*?\b(PASS|FAIL)\b/.exec(text) ?? /\b(PASS|FAIL)\b[^.\n]*?\b[Vv]erif/.exec(text)
  return match ? match[1] : null
}

const RESUMES = ['verification report:', 'test integrity:', 'resolved:', 'resumed:', 'unhalted:']

/** What a task's comments say: its latest verifier verdict, integrity findings, and an open halt. */
export function readComments(comments) {
  const strong = []
  const weak = []
  const integrity = []
  const halts = []
  const resumes = []
  for (const comment of comments ?? []) {
    const text = String(comment.text ?? '')
    const at = String(comment.created_at ?? '')
    const head = firstLine(text).toLowerCase()
    if (RESUMES.some(prefix => head.startsWith(prefix))) resumes.push(at)
    if (head.startsWith('verification report:')) {
      const status = /###\s*Status:\s*(PASS|FAIL)\b/.exec(text)
      if (status) strong.push({ at, status: status[1] })
    } else if (head.startsWith('test integrity:')) {
      const verdict = integrityVerdict(text)
      if (verdict) (verdict.isWeak ? weak : strong).push({ at, status: verdict.status })
      const findings = /Findings:\s*(\d+)\s*\((\d+)\s*escalated\)/.exec(text)
      if (findings) integrity.push({ at, findings: Number(findings[1]), escalated: Number(findings[2]) })
    } else if (head.startsWith('halted:')) {
      halts.push({ at, why: firstLine(text) })
    }
  }
  const halt = latest(halts)
  const isResumed = halt !== null && resumes.some(at => at > halt.at)
  return {
    verifier: latest(strong) ?? latest(weak),
    integrity: latest(integrity),
    halt: isResumed ? null : halt,
  }
}

function phaseOf(key) {
  const match = /^phase(\d+)_/.exec(key)
  return match ? Number(match[1]) : null
}

function servesCriterion(issue, id) {
  return new RegExp(`\\b${id}(?!\\d)`).test(`${issue.title ?? ''}\n${issue.description ?? ''}`)
}

function isAsk(issue) {
  return /^(Q|Decide):/.test(String(issue.title ?? '')) || issue.issue_type === 'decision'
}

function linksTo(issue, ids) {
  if (typeof issue.parent === 'string' && ids.has(issue.parent)) return true
  return (issue.dependencies ?? []).some(dep => (dep.type === 'discovered-from' || dep.type === 'parent-child') && ids.has(dep.depends_on_id))
}

/**
 * Who belongs to the plan and where it stands, from the issues alone:
 * planned tasks (the frontmatter's beads_tasks), follow-ups (every other
 * issue under the epic, or filed discovered-from a plan issue), the phase
 * (the lowest one whose milestone is open) and whether it waits at its
 * checkpoint.
 */
export function planState({ fm, issues, openIssues }) {
  const byId = new Map()
  for (const issue of [...(issues ?? []), ...(openIssues ?? [])]) {
    if (issue && typeof issue.id === 'string' && !byId.has(issue.id)) byId.set(issue.id, issue)
  }
  const named = new Set(planIds(fm))
  const members = new Set([...named].filter(id => byId.has(id)))
  for (let isGrowing = true; isGrowing;) {
    isGrowing = false
    for (const issue of byId.values()) {
      if (!members.has(issue.id) && linksTo(issue, members)) {
        members.add(issue.id)
        isGrowing = true
      }
    }
  }

  const seen = new Set()
  const tasks = []
  for (const [key, id] of Object.entries(fm.beads_tasks ?? {})) {
    const issue = byId.get(id)
    const phase = phaseOf(key)
    if (issue === undefined || phase === null || seen.has(id)) continue
    seen.add(id)
    tasks.push({ key, id, phase, title: issue.title ?? id, status: issue.status ?? 'open', issue })
  }

  const milestones = Object.entries(fm.beads_phases ?? {})
    .map(([key, id]) => ({ phase: phaseOf(key), id, issue: byId.get(id) }))
    .filter(one => one.phase !== null && one.issue !== undefined)
    .sort((a, b) => a.phase - b.phase)
  const milestoneIds = new Set(Object.values(fm.beads_phases ?? {}))

  const followUps = [...members]
    .map(id => byId.get(id))
    .filter(issue => !named.has(issue.id) && !milestoneIds.has(issue.id) && issue.issue_type !== 'epic' && !isAsk(issue))
    .map(issue => {
      const from = (issue.dependencies ?? []).find(dep => dep.type === 'discovered-from' && members.has(dep.depends_on_id))
      return { id: issue.id, title: issue.title ?? issue.id, status: issue.status ?? 'open', from: from?.depends_on_id ?? null, issue }
    })

  if (tasks.length === 0) return null
  const phaseNumbers = [...milestones.map(one => one.phase), ...tasks.map(task => task.phase)]
  const phaseCount = Math.max(...phaseNumbers)
  let phase
  let isDone
  if (milestones.length > 0) {
    const open = milestones.filter(one => one.issue.status !== 'closed')
    isDone = open.length === 0
    phase = isDone ? phaseCount : open[0].phase
  } else {
    const unfinished = tasks.filter(task => task.status !== 'closed').map(task => task.phase)
    isDone = unfinished.length === 0
    phase = isDone ? phaseCount : Math.min(...unfinished)
  }
  const phaseTasks = tasks.filter(task => task.phase === phase)
  const closed = phaseTasks.filter(task => task.status === 'closed').length
  const isAtCheckpoint = !isDone && milestones.length > 0 && phaseTasks.length > 0 && closed === phaseTasks.length
  const before = milestones.filter(one => one.phase < phase).at(-1)
  const phaseStart = String(before?.issue.closed_at ?? fm.created_timestamp ?? fm.created ?? '')

  // What the verifier window reads: this phase's planned tasks, and the
  // follow-ups that moved since the phase began.
  const touched = issue => [issue.updated_at, issue.closed_at, issue.created_at].some(at => at && String(at) >= phaseStart)
  const window = [
    ...phaseTasks.map(task => task.issue),
    ...followUps.map(item => item.issue).filter(issue => phaseStart === '' || touched(issue)),
  ]

  return { byId, members, tasks, followUps, phase, phaseCount, isDone, isAtCheckpoint, closed, phaseTasks, window }
}

/** Which issues to read comments for: the verifier window first, then the rest of the plan. */
export function commentTargets(state) {
  const hasComments = issue => Number(issue.comment_count ?? 0) > 0 && issue.issue_type !== 'epic'
  const newest = (a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''))
  const first = state.window.filter(hasComments).sort(newest)
  const firstIds = new Set(first.map(issue => issue.id))
  const rest = [...state.members]
    .map(id => state.byId.get(id))
    .filter(issue => hasComments(issue) && !firstIds.has(issue.id))
    .sort(newest)
  return { window: first.map(issue => issue.id), rest: rest.map(issue => issue.id) }
}

/** A task's verdict: the latest of its comments' and its close reason's. */
function verdictOf(issue, notes) {
  const fromClose = closeReasonVerdict(issue.close_reason)
  const closing = fromClose === null ? null : { at: String(issue.closed_at ?? issue.updated_at ?? ''), status: fromClose }
  const candidates = [notes.verifier, closing].filter(one => one !== null)
  return latest(candidates)
}

/**
 * The whole read-out, from what the hooks module gathered:
 * fm (tasks.md frontmatter), criteria, issues (bd list for the plan's ids and
 * the epic's children), openIssues (bd list of every unclosed issue),
 * commits (git log lines), comments ({ [id]: bd comments JSON }), intent
 * (readIntent of the README) and dir (the plan directory, as the validate
 * command names it).
 */
export function buildModel({ fm, criteria, issues, openIssues, commits, comments, intent = null, dir = null }) {
  const state = planState({ fm, issues, openIssues })
  if (state === null) return null
  const notesOf = new Map()
  const notes = id => {
    if (!notesOf.has(id)) notesOf.set(id, readComments(comments?.[id]))
    return notesOf.get(id)
  }
  const work = [
    ...state.tasks.map(task => ({ ...task, isPlanned: true })),
    ...state.followUps.map(item => ({ ...item, phase: null, isPlanned: false })),
  ].map(task => ({ ...task, notes: notes(task.id), verdict: verdictOf(task.issue, notes(task.id)) }))

  const working = work
    .filter(task => task.status === 'in_progress')
    .sort((a, b) => String(b.issue.updated_at ?? '').localeCompare(String(a.issue.updated_at ?? '')))
  const now = working[0] ?? null

  const red = redCommits(commits ?? [])
  const rows = (criteria ?? []).map(criterion => {
    const serving = work.filter(task => servesCriterion(task.issue, criterion.id))
    const verdicts = serving.filter(task => task.verdict !== null).map(task => ({ ...task.verdict, id: task.id }))
    const integrity = serving.filter(task => task.notes.integrity !== null).map(task => ({ ...task.notes.integrity, id: task.id }))
    return {
      id: criterion.id,
      title: criterion.title,
      redSha: red[criterion.id] ?? null,
      verifier: latest(verdicts),
      integrity: latest(integrity),
      tasks: serving.map(task => ({ id: task.id, title: task.title, status: task.status, phase: task.phase })),
    }
  })

  const inWindow = new Set(state.window.map(issue => issue.id))
  const verdicts = work
    .filter(task => inWindow.has(task.id) && task.verdict !== null)
    .map(task => ({ ...task.verdict, id: task.id }))
    .sort((a, b) => b.at.localeCompare(a.at))

  const blocking = []
  if (state.isAtCheckpoint) {
    blocking.push({ kind: 'checkpoint', id: null, title: `Phase ${state.phase} checkpoint`, why: `Phase ${state.phase} checkpoint waiting for you` })
  }
  for (const task of work) {
    if (task.status === 'closed') continue
    if (task.notes.halt !== null) {
      blocking.push({ kind: 'halt', id: task.id, title: task.title, why: task.notes.halt.why })
    } else if (task.issue.closed_at || task.issue.close_reason) {
      blocking.push({ kind: 'reopened', id: task.id, title: task.title, why: 'reopened' })
    }
  }
  const validation = validationOf(intent)
  const command = `/wb:validate_phase ${dir ?? `docs/plans/${String(fm.project ?? 'plan')}`} all`
  if (validation !== null && validation.fail > 0) {
    blocking.push({ kind: 'validation', id: null, title: 'validation', why: `validation: ${validation.fail} FAIL` })
  } else if (validation !== null && state.isDone && validation.state === 'not-run') {
    blocking.push({ kind: 'validate', id: null, title: 'the plan', why: `validate the plan: ${command}` })
  }
  // On a finished plan an open question was handed off on purpose: it is a
  // follow-up, not something the plan waits on.
  const asks = asksFor(openIssues, state.members, String(fm.created_timestamp ?? fm.created ?? ''))
  if (!state.isDone) blocking.push(...asks)
  const handedOff = state.isDone ? asks : []

  const openFollowUps = state.followUps.filter(item => UNCLOSED.has(item.status))

  return {
    planName: String(fm.project ?? 'plan'),
    phase: state.phase,
    phaseCount: state.phaseCount,
    isDone: state.isDone,
    isAtCheckpoint: state.isAtCheckpoint,
    closed: state.closed,
    total: state.phaseTasks.length,
    phaseTasks: state.phaseTasks.map(task => ({ id: task.id, title: task.title, status: task.status })),
    now: now === null ? null : { id: now.id, title: now.title, isPlanned: now.isPlanned },
    criteria: rows,
    redCount: rows.filter(row => row.redSha !== null).length,
    verdicts,
    blocking,
    handedOff,
    validation: validation === null ? null : { ...validation, command },
    followUps: openFollowUps.map(item => ({ id: item.id, title: item.title, status: item.status, from: item.from })),
  }
}

/**
 * Where validation stands, from the README's Intent statements: how many
 * carry each verdict and how many none. Null when the README has no Intent
 * section or lists no success statements (older plans), so nothing is asked.
 */
export function validationOf(intent) {
  const statements = intent?.statements ?? []
  if (statements.length === 0) return null
  const count = verdict => statements.filter(one => one.verdict === verdict).length
  const pass = count('PASS')
  const fail = count('FAIL')
  const deferred = count('DEFERRED')
  const pending = statements.length - pass - fail - deferred
  const state = fail > 0 ? 'failed' : pending === statements.length ? 'not-run' : pending > 0 ? 'partial' : 'passed'
  return { state, pass, fail, deferred, pending, statements }
}

/**
 * The open `Q:` and `Decide:` issues that need the person for this plan.
 * They carry no link to a plan, so one counts when it is linked to the plan
 * anyway (`members`) or was opened since the plan was created (`since`).
 */
export function asksFor(openIssues, members, since) {
  const out = []
  for (const issue of openIssues ?? []) {
    const match = /^(Q|Decide):/.exec(String(issue.title ?? ''))
    if (!match || !UNCLOSED.has(String(issue.status ?? 'open'))) continue
    const isLinked = members.has(issue.id) || linksTo(issue, members)
    const isRecent = since !== '' && String(issue.created_at ?? '') >= since
    if (isLinked || isRecent) out.push({ kind: match[1] === 'Q' ? 'question' : 'decision', id: issue.id, title: issue.title, why: match[1] === 'Q' ? 'open question' : 'decision pending' })
  }
  return out
}

/** A bar of `width` cells, filled in proportion. */
export function bar(done, total, width = 10) {
  const filled = total === 0 ? 0 : Math.round((done / total) * width)
  return '━'.repeat(filled) + '─'.repeat(width - filled)
}

// The band is drawn from segments: text and a tone. Color marks state only:
// the tones map to theme keys so they follow the user's light or dark theme,
// and every state keeps its symbol (✓ ⚠ ✗) for surfaces and people that do
// not see the color.
export const TONES = {
  plain: {},
  dim: { dimColor: true },
  accent: { color: 'permission' },
  track: { color: 'inactive' },
  ok: { color: 'success' },
  warn: { color: 'warning' },
  error: { color: 'error' },
}

const seg = (text, tone = 'plain') => ({ text, tone })
const SEP = seg(' · ', 'dim')

function cells(text) {
  return [...String(text)].length
}

function width(segments) {
  return segments.reduce((sum, one) => sum + cells(one.text), 0)
}

function joined(segments) {
  return segments.map(one => one.text).join('')
}

function shorten(text, max) {
  const chars = [...String(text)]
  if (chars.length <= max) return String(text)
  if (max <= 1) return '…'
  const cut = chars.slice(0, max - 1).join('')
  // End on a word when that keeps most of the room.
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

function line(...groups) {
  const out = []
  for (const group of groups) {
    if (group === null || group.length === 0) continue
    if (out.length > 0) out.push(SEP)
    out.push(...group)
  }
  return out
}

/** The first of the variants that fits, else the last one. */
function firstFitting(variants, columns) {
  return variants.find(one => width(one) <= columns) ?? variants[variants.length - 1]
}

/** What the verifier said in this phase, as segments: `verifier 5✓ 1✗`. */
export function verifierSegments(verdicts) {
  if (verdicts.length === 0) return [seg('verifier none yet', 'dim')]
  const passed = verdicts.filter(one => one.status === 'PASS').length
  const failed = verdicts.length - passed
  const out = [seg('verifier ', 'dim'), seg(`${passed}✓`)]
  if (failed > 0) out.push(seg(' '), seg(`${failed}✗`, 'error'))
  return out
}

/** The open Q: and Decide: issues a model knows of: blocking ones, plus those a finished plan handed off. */
export function openAsksOf(model) {
  return [...model.blocking, ...(model.handedOff ?? [])].filter(item => item.kind === 'question' || item.kind === 'decision')
}

/** What needs the person, as one short phrase, and whether all is well. */
export function attentionWords(blocking, max = Infinity, handedOff = []) {
  if (blocking.length === 0 && handedOff.length > 0) {
    // Open questions on a finished plan: a follow-up, so no warning symbol.
    const title = String(handedOff[0].title).replace(/^(Q|Decide):\s*/, '')
    const more = handedOff.length > 1 ? ` +${handedOff.length - 1} more` : ''
    const room = max - cells(`open follow-up:  (${handedOff[0].id})${more}`)
    return { text: `open follow-up: ${room < cells(title) ? shorten(title, Math.max(room, 16)) : title} (${handedOff[0].id})${more}`, isOk: true, isFollowUp: true }
  }
  if (blocking.length === 0) return { text: '✓ nothing needs you', isOk: true }
  const first = blocking[0]
  const more = blocking.length > 1 ? ` +${blocking.length - 1} more` : ''
  let what
  if (first.kind === 'checkpoint' || first.kind === 'approval' || first.kind === 'validate' || first.kind === 'validation') {
    what = first.why
  } else if (first.kind === 'halt') {
    what = `${first.why} (${first.id})`
  } else {
    // An issue's title is the part that gives way when room is short, never
    // below a readable stub; its id and the count of the others stay.
    const title = String(first.title).replace(/^(Q|Decide):\s*/, '')
    const room = max - cells(`⚠ ${first.why}:  (${first.id})${more}`)
    what = `${first.why}: ${room < cells(title) ? shorten(title, Math.max(room, 16)) : title} (${first.id})`
  }
  return { text: `⚠ ${what}${more}`, isOk: false }
}

function attentionSegment(attention, max = Infinity) {
  return seg(shorten(attention.text, max), attention.isFollowUp ? 'dim' : attention.isOk ? 'ok' : 'warn')
}

/**
 * The band's two lines, fitted to `columns` cells. Each line drops its
 * lowest-priority parts first: line 1 shortens, then drops, what is in
 * progress, then the follow-up count and the bar, keeping the phase and its
 * counts; line 2 keeps what needs you and drops the red-first count, then the
 * verifier, then its label.
 */
export function bandLines(model, columns = Infinity) {
  if (model.kind === 'planning') return planningBandLines(model, columns)
  const { name, head, headInWorktree } = planHead(model)
  const where = model.isDone ? ' done' : model.isAtCheckpoint ? ' at checkpoint' : ''
  const filled = model.total === 0 ? 0 : Math.round((model.closed / model.total) * 10)
  const phase = [seg(`Phase ${model.phase}/${model.phaseCount}${where}`), seg(' '), seg('━'.repeat(filled), 'accent'), seg('─'.repeat(10 - filled), 'track'), seg(` ${model.closed}/${model.total} tasks`)]
  const phaseNoBar = [seg(`Phase ${model.phase}/${model.phaseCount}${where} ${model.closed}/${model.total} tasks`)]
  const count = model.followUps.length
  const follow = count === 0 ? null : [seg(`${count} follow-up${count === 1 ? '' : 's'} open`)]
  const isIdle = model.isDone || model.isAtCheckpoint
  const nowFull = model.now === null ? null : `${model.now.title} (${model.now.id})`
  const nowOf = text => (text === null ? (isIdle ? null : [seg('now: ', 'dim'), seg('nothing in progress', 'dim')]) : [seg('now: ', 'dim'), seg(text)])

  const fixed = line(head, phase, follow)
  const room = columns - width(fixed) - cells(' · now: ') - cells(` (${model.now?.id ?? ''})`)
  const nowShort = model.now === null || room < 8 ? null : `${shorten(model.now.title, room)} (${model.now.id})`
  // The stage chain is the least important part of the implement view: it
  // shows only when everything else fits beside it, at the end of the line.
  const chain = model.stages ? symbolChain(model.stages) : null
  const progressVariants = [
    ...(chain === null || headInWorktree === null ? [] : [line(headInWorktree, phase, follow, nowOf(nowFull), chain)]),
    ...(chain === null ? [] : [line(head, phase, follow, nowOf(nowFull), chain)]),
    ...(headInWorktree === null ? [] : [line(headInWorktree, phase, follow, nowOf(nowFull))]),
    line(head, phase, follow, nowOf(nowFull)),
    ...(nowShort === null ? [] : [line(head, phase, follow, nowOf(nowShort))]),
    line(head, phase, follow),
    line(head, phase),
    line(head, phaseNoBar),
    line(name, phaseNoBar),
  ]
  const progress = firstFitting(progressVariants, columns)

  const attention = attentionWords(model.blocking, Infinity, model.handedOff)
  const label = [seg('Tests: ', 'dim')]
  const red = model.criteria.length === 0
    ? [seg('no criteria found', 'dim')]
    : [seg('red-first ', 'dim'), seg(`${model.redCount}/${model.criteria.length}`)]
  const verifier = verifierSegments(model.verdicts)
  // A validation prompt or failure takes the place of the open follow-up line;
  // the count of those follow-ups stays beside it while there is room.
  const handed = model.handedOff ?? []
  const hasValidation = model.blocking.some(item => item.kind === 'validate' || item.kind === 'validation')
  const followNote = hasValidation && handed.length > 0 ? [seg(`${handed.length} open follow-up${handed.length === 1 ? '' : 's'}`, 'dim')] : null
  const testsVariants = [
    ...(followNote === null ? [] : [
      [...label, ...line([attentionSegment(attention)], followNote, red, verifier)],
      [...label, ...line([attentionSegment(attention)], followNote, verifier)],
      [...label, ...line([attentionSegment(attention)], followNote)],
    ]),
    [...label, ...line([attentionSegment(attention)], red, verifier)],
    [...label, ...line([attentionSegment(attention)], verifier)],
    [...label, attentionSegment(attention)],
    [attentionSegment(attention, columns)],
  ]
  const tests = firstFitting(testsVariants, columns)

  return { progress, tests, attention, text: { progress: joined(progress), tests: joined(tests) } }
}

/**
 * The rule above the band, so it does not read as part of the status text
 * above it: `── wb plan ───…` across the width, a blank line when the width
 * has no room for a labelled rule, and nothing when the band has no row to
 * spare.
 */
export function separator(columns, maxRows) {
  if (typeof maxRows === 'number' && maxRows < 3) return null
  const label = '── wb plan '
  if (!Number.isFinite(columns) || columns < cells(label) + 4) return { kind: 'blank', text: ' ' }
  return { kind: 'rule', text: label + '─'.repeat(columns - cells(label)) }
}

/** The one-line status, for surfaces with no band. */
export function statusLine(model) {
  if (model.kind === 'planning') return planningStatusLine(model)
  const attention = model.blocking.length === 0 ? '✓' : `⚠ ${model.blocking.length}`
  const where = model.isAtCheckpoint ? ' at checkpoint' : ''
  const verifier = joined(verifierSegments(model.verdicts))
  const guessed = isGuessed(model) ? ' (guessed)' : ''
  return `wb ${model.planName}${guessed}: phase ${model.phase}/${model.phaseCount}${where} ${model.closed}/${model.total} · red-first ${model.redCount}/${model.criteria.length} · ${verifier} · ${attention}`
}

const MARK = { closed: '✓', in_progress: '…', blocked: '⊘' }

/** The pane's four sections, as heading and rows of plain text. */
export function paneSections(model) {
  const decide = decisionRows(model.blocking)
  const plan = model.selection ? [{ heading: 'Plan', rows: selectionWords(model.selection) }] : []
  const planning = model.stages ? [{ heading: 'Planning', rows: planningRows(model) }] : []
  if (model.kind === 'planning') {
    return [...plan, ...planning, { heading: 'Needs your decision', rows: decide }]
  }

  const delivered = []
  const inPhase = new Set(model.phaseTasks.map(task => task.id))
  const covered = new Set()
  for (const row of model.criteria) {
    const mine = row.tasks.filter(task => inPhase.has(task.id))
    if (mine.length === 0) continue
    delivered.push(`${row.id}${row.title ? ` ${row.title}` : ''}`)
    for (const task of mine) {
      covered.add(task.id)
      delivered.push(`  ${MARK[task.status] ?? '○'} ${task.title} (${task.id})`)
    }
  }
  const others = model.phaseTasks.filter(task => !covered.has(task.id))
  if (others.length > 0) {
    delivered.push(delivered.length === 0 ? 'Tasks (no criterion named)' : 'Other tasks')
    for (const task of others) delivered.push(`  ${MARK[task.status] ?? '○'} ${task.title} (${task.id})`)
  }

  const integrity = model.criteria.length === 0
    ? ['No acceptance criteria found in design.md or tasks.md.']
    : model.criteria.map(row => {
        const red = row.redSha === null ? 'no red commit' : `red commit ${row.redSha}`
        const verdict = row.verifier === null ? 'not verified' : `verifier ${row.verifier.status} (${row.verifier.id})`
        const findings = row.integrity === null ? '' : ` · ${row.integrity.findings} findings (${row.integrity.escalated} escalated)`
        return `${row.id}${row.title ? ` ${row.title}` : ''} · ${red} · ${verdict}${findings}`
      })

  const handedOff = (model.handedOff ?? []).map(item => `○ ${item.why}: ${item.title} (${item.id})`)
  const followUps = model.followUps.length === 0 && handedOff.length === 0
    ? ['No open follow-ups.']
    : [...model.followUps.map(item => `${MARK[item.status] ?? '○'} ${item.title} (${item.id}${item.from ? `, from ${item.from}` : ''})`), ...handedOff]

  return [
    ...plan,
    ...planning,
    { heading: 'Needs your decision', rows: decide },
    { heading: `What phase ${model.phase} delivered`, rows: delivered.length === 0 ? ['No tasks in this phase.'] : delivered },
    { heading: 'Test integrity', rows: integrity },
    { heading: 'Follow-ups', rows: followUps },
    { heading: 'Validation', rows: validationRows(model.validation) },
  ]
}

const VERDICT_MARK = { PASS: '✓', FAIL: '✗', DEFERRED: '○' }

/** The pane's Validation rows: not run, or each Intent statement with its verdict and date. */
function validationRows(validation) {
  if (validation === null || validation === undefined) return ['No Intent section in README.md: nothing to validate.']
  const rows = validation.statements.map(one =>
    one.verdict === null ? `○ ${one.text}` : `${VERDICT_MARK[one.verdict]} ${one.verdict}${one.date ? ` ${one.date}` : ''} · ${one.text}`)
  return validation.state === 'not-run' ? [`Not run: ${validation.command}`, ...rows] : rows
}

/** Whether a Bash command is one that changes what the read-out shows. */
export function isRefreshCommand(command) {
  return /\bbd\s+(close|update|reopen|create|comments\s+add)\b|\bgit\s+(commit|revert|cherry-pick)\b/.test(String(command))
}

/** The JSON array in a bd stdout, ignoring any warning text around it. */
export function parseJsonArray(stdout) {
  const text = String(stdout)
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end < start) return null
  try {
    const value = JSON.parse(text.slice(start, end + 1))
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

// ── Which plan ────────────────────────────────────────────────────────────
//
// The session pins a plan when a /wb:* command runs with a plan directory
// (typed, or through the Skill tool); with no pin, the plan is guessed from
// beads activity, then from the newest directory name. The hooks module does
// the reads; these helpers only parse and choose.

const PLAN_PATH = /((?:[^\s'"`<>()]*\/)?docs\/plans\/[^\s/'"`<>()]+)/

/** The first `docs/plans/<dir>` path in a text, with whatever leads it (absolute, or `.claude/worktrees/<x>/`). */
export function planPathIn(text) {
  const match = PLAN_PATH.exec(String(text ?? ''))
  if (match === null) return null
  return match[1].replace(/^\.\//, '')
}

/** Whether a command or skill name is one of wb's (`wb:implement`). */
export function isWbName(name) {
  return /^wb:[\w-]+$/.test(String(name ?? ''))
}

/** A pin from a wb command and its arguments, or null when it names no plan. */
export function pinFrom(name, args, at) {
  if (!isWbName(name)) return null
  const path = planPathIn(args)
  return path === null ? null : { path, by: `/${name}`, at }
}

/** A pin from a `prompt.submit` input: its `command`, else a typed `/wb:<name> args` line. */
export function pinFromPrompt(e, at) {
  const ran = promptCommand(e)
  return ran === null ? null : pinFrom(ran.name, ran.args, at)
}

/** The wb command a `prompt.submit` input runs, `{ name, args }`, or null. */
export function promptCommand(e) {
  if (e?.command && typeof e.command.name === 'string') {
    const name = e.command.name.replace(/^\//, '')
    return isWbName(name) ? { name, args: String(e.command.args ?? '') } : null
  }
  const typed = /^\s*\/(wb:[\w-]+)(?:\s+([\s\S]*))?$/.exec(String(e?.text ?? ''))
  return typed === null ? null : { name: typed[1], args: typed[2] ?? '' }
}

/** Whether a Write or Edit to `filePath` shows the folder a pending /wb:create_project made: a plan folder not there before, or its README.md. */
export function isCreatedPlanWrite(filePath, knownNames) {
  const path = planPathIn(filePath)
  if (path === null) return false
  const name = path.split('/').at(-1)
  return !(knownNames ?? []).includes(name) || /\/README\.md$/.test(String(filePath))
}

/**
 * The plan to show when nothing is pinned. A beads plan with an issue in
 * progress wins; else the most recent of the beads plan whose issue moved
 * last and the planning plan (no beads tasks yet) whose file changed last,
 * counting only planning plans changed within `maxAgeMs` of `now`; else the
 * newest beads plan by directory name. Null when none qualifies.
 * Planning candidates carry `newest: { name, mtimeMs }`.
 */
export function chooseGuess(beadsCandidates, issues, planningCandidates, now, maxAgeMs) {
  const active = chooseByActivity(beadsCandidates, issues)
  const beads = active === null ? null : { candidate: active.candidate, selection: { kind: 'beads', why: active.why, id: active.id } }
  if (active?.why === 'in-progress') return beads
  const isFresh = one => one.newest && one.newest.mtimeMs > 0 && (typeof now !== 'number' || now - one.newest.mtimeMs <= maxAgeMs)
  const planning = (planningCandidates ?? []).filter(isFresh).reduce((best, one) => (best === null || one.newest.mtimeMs > best.newest.mtimeMs ? one : best), null)
  const issue = active === null ? null : (issues ?? []).find(one => one?.id === active.id)
  const beadsAt = issue ? Date.parse(String(issue.updated_at ?? issue.closed_at ?? issue.created_at ?? '')) : NaN
  if (planning !== null && (beads === null || Number.isNaN(beadsAt) || planning.newest.mtimeMs > beadsAt)) {
    return { candidate: planning, selection: { kind: 'recent-file', file: planning.newest.name, at: planning.newest.mtimeMs } }
  }
  if (beads !== null) return beads
  if ((beadsCandidates ?? []).length > 0) return { candidate: newestByName(beadsCandidates), selection: { kind: 'directory' } }
  return null
}

/**
 * The latest wb invocation in a transcript (`$.session.messages()` rows): a
 * user row that ran `/wb:<name>` (typed, or recorded as `<command-name>`), or
 * an assistant's Skill tool use. Restores the pin in a process that starts
 * with the transcript already written (a resume).
 */
export function latestPin(messages, at) {
  return latestInvocation(messages, at).pin
}

/**
 * What a transcript's wb invocations leave: the pin (as latestPin), and the
 * latest wb command that names a workflow stage, path or not. After a
 * /wb:create_project, which creates its folder rather than naming it, the
 * first Write or Edit into a `docs/plans/<dir>/` pins that folder.
 */
export function latestInvocation(messages, at) {
  let pin = null
  let stage = null
  // Scanning newest first: the oldest plan-folder write seen so far since the
  // last wb command, which a /wb:create_project before it would pin.
  let write = null
  const ran = (name, args) => {
    if (!isWbName(name)) return false
    if (stage === null && stageOfCommand(name) !== null) stage = { by: `/${name}`, at }
    const found = pinFrom(name, args, at)
    if (found !== null) pin = found
    else if (name === 'wb:create_project' && write !== null) pin = { path: write, by: '/wb:create_project', at }
    write = null
    return pin !== null
  }
  const list = messages ?? []
  for (let at_ = list.length - 1; at_ >= 0; at_ -= 1) {
    const message = list[at_]
    const uses = message?.toolUses ?? []
    for (let one = uses.length - 1; one >= 0; one -= 1) {
      const use = uses[one]
      if (use?.tool === 'Skill' && ran(String(use.input?.skill ?? '').replace(/^\//, ''), use.input?.args)) return { pin, stage }
      if (use?.tool === 'Write' || use?.tool === 'Edit') write = planPathIn(use.input?.file_path) ?? write
    }
    if (message?.role === 'user') {
      const text = String(message.text ?? '')
      const named = /<command-name>\/?(wb:[\w-]+)<\/command-name>/.exec(text) ?? /^\s*\/(wb:[\w-]+)\b/.exec(text)
      if (named !== null && ran(named[1], text.slice(named.index + named[0].length))) return { pin, stage }
    }
  }
  return { pin, stage }
}

/** Worktree roots from `git worktree list --porcelain`, the main one first. */
export function parseWorktrees(stdout) {
  return String(stdout ?? '')
    .split('\n')
    .filter(one => one.startsWith('worktree '))
    .map(one => one.slice('worktree '.length).trim())
    .filter(one => one.startsWith('/'))
}

/** The worktree's name when a root is a linked worktree, else null. */
export function worktreeName(root, mainRoot) {
  const text = String(root ?? '')
  const nested = /\/\.claude\/worktrees\/([^/]+)\/?$/.exec(text)
  if (nested) return nested[1]
  if (mainRoot === undefined || mainRoot === null || text === mainRoot) return null
  return text.split('/').filter(Boolean).at(-1) ?? null
}

/** The root a plan directory sits in: what leads its `/docs/plans/`. */
export function rootOfPlanDir(dir) {
  const at = String(dir).lastIndexOf('/docs/plans/')
  return at < 0 ? null : String(dir).slice(0, at)
}

/** Whether a tasks.md frontmatter names beads work at all: tasks or an epic. */
export function isBeadsPlan(fm) {
  if (fm === null || typeof fm !== 'object') return false
  const tasks = fm.beads_tasks
  const hasTasks = tasks !== null && typeof tasks === 'object' && Object.keys(tasks).length > 0
  return hasTasks || (typeof fm.beads_epic === 'string' && fm.beads_epic !== '')
}

function belongsTo(issue, fm) {
  const ids = new Set(planIds(fm))
  if (ids.has(issue.id)) return issue.issue_type !== 'epic'
  return typeof issue.parent === 'string' && ids.has(issue.parent)
}

/**
 * The plan beads shows work on: one with an issue in progress under its epic
 * (or named in its frontmatter), the most recently moved such issue winning;
 * else the plan whose issue moved last. Null when no candidate has an issue
 * with a time on it.
 * `candidates` are `{ fm, ... }`; `issues` any bd list rows.
 */
export function chooseByActivity(candidates, issues) {
  let busy = null
  let recent = null
  for (const candidate of candidates) {
    for (const issue of issues ?? []) {
      if (!issue || !belongsTo(issue, candidate.fm)) continue
      const at = String(issue.updated_at ?? issue.closed_at ?? issue.created_at ?? '')
      if (issue.status === 'in_progress' && (busy === null || at > busy.at)) busy = { candidate, at, id: issue.id }
      if (at !== '' && (recent === null || at > recent.at)) recent = { candidate, at, id: issue.id }
    }
  }
  if (busy !== null) return { candidate: busy.candidate, why: 'in-progress', id: busy.id }
  if (recent !== null) return { candidate: recent.candidate, why: 'recent', id: recent.id }
  return null
}

/** The candidate with the newest directory name; the earlier one on a tie. */
export function newestByName(candidates) {
  return candidates.reduce((best, one) => (best === null || one.name > best.name ? one : best), null)
}

/** Whether the read-out should mark the plan as guessed. */
export function isGuessed(model) {
  const kind = model?.selection?.kind
  return kind === 'beads' || kind === 'directory' || kind === 'recent-file'
}

function clockTime(at) {
  const date = new Date(Number(at))
  if (Number.isNaN(date.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** How the plan was chosen, in words for the pane. */
export function selectionWords(selection) {
  if (!selection) return []
  const rows = []
  const where = selection.worktree ? ` (worktree ${selection.worktree})` : ''
  rows.push(`${selection.planName}${where}`)
  if (selection.dir) rows.push(selection.dir)
  if (selection.kind === 'pinned') {
    const time = clockTime(selection.at)
    rows.push(`Pinned by ${selection.by}${time ? ` at ${time}` : ''}.`)
  } else if (selection.kind === 'beads') {
    const why = selection.why === 'in-progress' ? `an issue in progress under its epic (${selection.id})` : `the most recently updated issue under its epic (${selection.id})`
    rows.push(`Guessed from beads activity: ${why}.`)
  } else if (selection.kind === 'directory') {
    rows.push('Guessed from the newest plan directory name: no plan has beads activity.')
  } else if (selection.kind === 'recent-file') {
    const date = new Date(Number(selection.at))
    const day = Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const time = clockTime(selection.at)
    rows.push(`Guessed from the most recently changed plan file: ${selection.file}${day ? `, changed ${day} ${time}` : ''}; no plan has beads work in progress.`)
  }
  if (selection.missing) rows.push(`No tasks.md found for the pinned ${selection.missing}, so this plan was guessed.`)
  rows.push('/wb-status <plan dir> pins a plan; /wb-status auto goes back to guessing.')
  return rows
}

// ── Planning stages ───────────────────────────────────────────────────────
//
// Before a plan has beads tasks, the band shows where it stands in the
// workflow chain, read from the plan's own files: each stage done, current or
// not started, and the current stage's key signals. Markdown is read cheaply:
// headings, simple lists and tables, no full parse.

/** The workflow chain, in help's order; explore is shown only when the plan has explored. */
export const STAGES = [
  { key: 'project', label: 'Project', symbol: 'P', command: '/wb:create_project', doc: 'README.md' },
  { key: 'research', label: 'Research', symbol: 'R', command: '/wb:create_research', doc: 'research.md' },
  { key: 'explore', label: 'Explore', symbol: 'E', command: '/wb:explore_design', doc: 'thoughts/', isOptional: true },
  { key: 'design', label: 'Design', symbol: 'D', command: '/wb:create_design', doc: 'design.md' },
  { key: 'tasks', label: 'Tasks', symbol: 'T', command: '/wb:create_tasks', doc: 'tasks.md' },
  { key: 'implement', label: 'Implement', symbol: 'I', command: '/wb:implement', doc: 'tasks.md' },
  { key: 'validate', label: 'Validate', symbol: 'V', command: '/wb:validate_phase', doc: 'README.md' },
]

const STAGE_OF = {
  'wb:create_project': 'project',
  'wb:create_research': 'research',
  'wb:create_product_research': 'research',
  'wb:explore_design': 'explore',
  'wb:create_design': 'design',
  'wb:create_tasks': 'tasks',
  'wb:implement': 'implement',
  'wb:implement_inline': 'implement',
  'wb:validate_phase': 'validate',
  // Renamed to validate_phase in 5.0.0; kept so older transcripts still map to the validate stage.
  'wb:validate_execution': 'validate',
}

// design.md statuses that mean the design was accepted: update_status writes
// ready and implementing; older plans wrote approved.
const DESIGN_DONE = new Set(['ready', 'approved', 'implementing', 'complete', 'completed', 'done'])

/** The stage a wb command works on (`/wb:create_design` → design), or null. */
export function stageOfCommand(by) {
  return STAGE_OF[String(by ?? '').replace(/^\//, '')] ?? null
}

/** Whether a tasks.md frontmatter (or none) belongs to an unfinished plan with no beads tasks yet. */
export function isPlanningPlan(fm) {
  if (fm !== null && typeof fm === 'object') {
    if (FINISHED.has(String(fm.status ?? '').toLowerCase())) return false
    const tasks = fm.beads_tasks
    if (tasks !== null && typeof tasks === 'object' && Object.keys(tasks).length > 0) return false
  }
  return true
}

/** A markdown text's `##` and `###` sections by lowercased heading, outside code fences; the first of a name wins. */
export function sections(text) {
  const out = new Map()
  let key = null
  let buf = []
  let isFenced = false
  const close = () => {
    if (key !== null && !out.has(key)) out.set(key, buf.join('\n'))
  }
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) isFenced = !isFenced
    const heading = isFenced ? null : /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      close()
      key = heading[2].toLowerCase()
      buf = []
    } else if (key !== null) {
      buf.push(line)
    }
  }
  close()
  return out
}

const isPlaceholder = text => /^\s*\[[^\]]*\]\s*$/.test(String(text)) || /\[(to be|tbd)/i.test(String(text))

/** The top-level list items that follow a `**Label**` line, until the next bold label or heading. */
function labelledList(body, label) {
  const lines = String(body ?? '').split(/\r?\n/)
  const start = lines.findIndex(one => new RegExp(`^\\s*\\*\\*${label}\\*\\*`, 'i').test(one))
  if (start < 0) return []
  const items = []
  for (const one of lines.slice(start + 1)) {
    if (/^\s*\*\*/.test(one) || /^#/.test(one)) break
    const item = /^[-*]\s+(.*)$/.exec(one)
    if (item) items.push(item[1].trim())
  }
  return items
}

/**
 * The README's Intent: its goal, its "Success looks like" statements, each
 * with the verdict validate_phase appended (`→ PASS (date)`), and its
 * non-goals. Null when the README has no Intent section.
 */
export function readIntent(readmeText) {
  const body = sections(readmeText).get('intent')
  if (body === undefined) return null
  const goal = /\*\*Goal\*\*:?\s*(.+)/i.exec(body)?.[1]?.trim() ?? ''
  const statements = labelledList(body, 'Success looks like')
    .filter(text => !isPlaceholder(text))
    .map(text => {
      // A re-run appends or replaces the suffix; if two remain, the last is current.
      const last = [...text.matchAll(/→\s*(PASS|FAIL|DEFERRED)\b(?:\s*\((\d{4}-\d{2}-\d{2})\))?/g)].at(-1)
      return { text: text.replace(/\s*→\s*(PASS|FAIL|DEFERRED)\b.*$/, ''), verdict: last?.[1] ?? null, date: last?.[2] ?? null }
    })
  const nonGoals = labelledList(body, 'Non-goals').filter(text => !isPlaceholder(text))
  return { goal: isPlaceholder(goal) ? '' : goal, statements, nonGoals }
}

function docStatus(text) {
  return String(parseFrontmatter(text)?.status ?? '').trim()
}

/**
 * What research.md says: its status, whether it is still the skeleton
 * create_project wrote, whether it has a filled Testing Conventions section,
 * and how many Intent statements its Intent Coverage lists as borne on.
 */
export function readResearch(text) {
  if (text === null || text === undefined) return null
  const all = sections(text)
  const testing = all.get('testing conventions')
  const hasTesting = testing !== undefined && /^\s*[-*]\s+\*\*[^*]+\*\*:?\s*(?!\[)\S/m.test(testing)
  const coverage = all.get('intent coverage')
  let covered = null
  if (coverage !== undefined) {
    const lines = coverage.split(/\r?\n/)
    const from = lines.findIndex(one => /bear on/i.test(one))
    if (from >= 0) {
      const to = lines.findIndex((one, at) => at > from && /not touch/i.test(one))
      const between = lines.slice(from + 1, to < 0 ? undefined : to)
      const nested = between.filter(one => /^\s+[-*]\s+\S/.test(one) && !isPlaceholder(one.replace(/^\s+[-*]\s+/, ''))).length
      const inline = (/\*\*[^*]*bear on[^*]*\*\*:?\s*(.*)$/i.exec(lines[from])?.[1] ?? '').trim()
      covered = nested > 0 ? nested : inline !== '' && !/^none\b/i.test(inline) && !isPlaceholder(inline) ? 1 : 0
    }
  }
  return {
    status: docStatus(text),
    isTemplate: /to be filled by \/wb:create_research|research findings will be documented here/i.test(text),
    hasTesting,
    covered,
    hasCoverage: coverage !== undefined,
  }
}

/**
 * What design.md says: its status, its acceptance criteria and how many
 * carry a concrete Example line, its Harness Decisions rows and how many are
 * decided, and its Success Metrics and how many cite an Intent statement.
 */
export function readDesign(text) {
  if (text === null || text === undefined) return null
  const lines = String(text).split(/\r?\n/)
  let criteria = 0
  let withExample = 0
  let inCriterion = false
  let hasExample = false
  const endCriterion = () => {
    if (inCriterion && hasExample) withExample += 1
    inCriterion = false
    hasExample = false
  }
  for (const one of lines) {
    if (/^\s*[-*]\s+\*\*AC-\d+/.test(one)) {
      endCriterion()
      inCriterion = true
      criteria += 1
    } else if (/^#/.test(one) || (/^[-*]\s/.test(one) && inCriterion)) {
      endCriterion()
    } else if (inCriterion) {
      const example = /^\s*[-*]\s+Example\b[^:]*:\s*(.*)$/i.exec(one)
      if (example && example[1].trim() !== '' && !isPlaceholder(example[1])) hasExample = true
    }
  }
  endCriterion()

  const all = sections(text)
  const rows = String(all.get('harness decisions') ?? '').split(/\r?\n/)
    .filter(one => /^\s*\|/.test(one))
    .slice(1)
    .filter(one => !/^\s*\|[\s:|-]+\|\s*$/.test(one))
    .map(one => one.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()))
    .filter(cells => !cells.every(cell => cell === '' || isPlaceholder(cell)))
  const decided = rows.filter(cells => {
    const decision = cells.at(-1) ?? ''
    return decision !== '' && !isPlaceholder(decision) && !/^(tbd|todo|\?|undecided|open|pending)\b/i.test(decision)
  }).length

  const metrics = []
  for (const one of String(all.get('success metrics') ?? '').split(/\r?\n/)) {
    if (/^[-*]\s+/.test(one)) metrics.push(one)
    else if (metrics.length > 0 && /^\s+\S/.test(one)) metrics[metrics.length - 1] += `\n${one}`
  }
  const real = metrics.filter(one => !/^[-*]\s+Deferred\b/i.test(one) && !isPlaceholder(one.replace(/^[-*]\s+(\[[ x]\]\s+)?/, '')))

  return {
    status: docStatus(text),
    isTemplate: criteria === 0 && /\[to be defined\]/i.test(text),
    criteria,
    withExample,
    harness: { rows: rows.length, decided },
    metrics: { count: real.length, citing: real.filter(one => /\(?refines:/i.test(one)).length },
  }
}

/**
 * What tasks.md says: its status, its phases and planned tasks, the criteria
 * that have an outer-test step (`- AC-n: …`), and the beads epic and tasks its
 * frontmatter names.
 */
export function readTasks(text) {
  if (text === null || text === undefined) return null
  const fm = parseFrontmatter(text) ?? {}
  const phases = (String(text).match(/^##\s+Phase\s+\d+/gm) ?? []).length
  const markers = new Set(String(text).match(/\[beads:[\w.-]+\]/g) ?? []).size
  const outer = new Set()
  for (const match of String(text).matchAll(/^\s*[-*]\s+(AC-\d+)\s*:/gm)) outer.add(match[1])
  const beadsTasks = fm.beads_tasks !== null && typeof fm.beads_tasks === 'object' ? Object.keys(fm.beads_tasks).length : 0
  return {
    status: String(fm.status ?? '').trim(),
    // No phase, no task marker and no beads tasks: the skeleton create_project wrote, whatever its wording.
    isTemplate: phases === 0 && markers === 0 && beadsTasks === 0,
    phases,
    tasks: markers > 0 ? markers : beadsTasks,
    outer: outer.size,
    hasEpic: typeof fm.beads_epic === 'string' && fm.beads_epic !== '',
    beadsTasks,
  }
}

/** The closed `Decide:` issues that record this plan's exploration: the close reason or description names the plan directory or one of its thoughts docs. */
export function decidesFor(issues, planDirName, thoughts) {
  const names = [planDirName, ...(thoughts ?? [])].filter(one => typeof one === 'string' && one !== '')
  return (issues ?? []).filter(issue => {
    if (!/^Decide:/.test(String(issue?.title ?? '')) || issue.status !== 'closed') return false
    const text = `${issue.close_reason ?? ''}\n${issue.description ?? ''}`
    return names.some(name => text.includes(name))
  })
}

/**
 * Each stage's state from the plan's files: done, current or not started.
 * A stage is done when its document says so, or when a later stage is done.
 * The current stage is the one the session's latest wb command ran (`last`),
 * else the first stage that is not done. Explore is listed only when the plan
 * has a thoughts doc or a recorded decision (`explore` not null).
 */
export function stageStates({ intent, research, design, tasks, explore, isImplemented, last }) {
  const isDesigned = design !== null && design !== undefined && DESIGN_DONE.has(String(design.status).toLowerCase())
  const statements = intent?.statements ?? []
  const done = {
    project: true,
    research: !!research && String(research.status).toLowerCase() === 'complete',
    explore: !!explore && explore.isDecided,
    design: isDesigned,
    tasks: (tasks?.beadsTasks ?? 0) > 0,
    implement: isImplemented === true,
    validate: statements.length > 0 && statements.every(one => one.verdict !== null),
  }
  const visible = STAGES.filter(stage => !stage.isOptional || !!explore || last === stage.key)
  for (let at = visible.length - 1, isLaterDone = false; at >= 0; at -= 1) {
    const key = visible[at].key
    if (isLaterDone) done[key] = true
    if (done[key] && !visible[at].isOptional) isLaterDone = true
  }
  const status = {
    research: research?.status ?? '',
    explore: !explore ? '' : explore.isDecided ? 'decided' : 'open',
    design: design?.status ?? '',
    tasks: tasks?.status ?? '',
  }
  const chosen = visible.some(stage => stage.key === last) ? last : null
  const current = chosen ?? visible.find(stage => !stage.isOptional && !done[stage.key])?.key ?? null
  return visible.map(stage => ({
    key: stage.key,
    label: stage.label,
    symbol: stage.symbol,
    command: stage.command,
    doc: stage.doc,
    isOptional: stage.isOptional === true,
    state: stage.key === current ? 'current' : done[stage.key] ? 'done' : 'todo',
    isDone: done[stage.key],
    status: status[stage.key] ?? '',
  }))
}

const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`

/** Each stage's key signals, in plain words, most important first. */
export function stageSignals({ intent, research, design, tasks, explore, openAsks }) {
  const questions = (openAsks ?? []).filter(one => one.kind === 'question').length
  const decisions = (openAsks ?? []).filter(one => one.kind === 'decision').length
  const total = intent?.statements.length ?? 0
  const out = {}
  out.project = !intent
    ? ['no Intent section in README.md']
    : [`Intent: ${plural(total, 'success statement')}`, plural(intent.nonGoals.length, 'non-goal')]
  if (!research || research.isTemplate) {
    out.research = ['research.md not written yet']
  } else {
    const coverage = !research.hasCoverage
      ? 'no Intent Coverage section'
      : total > 0 && research.covered !== null ? `Intent ${Math.min(research.covered, total)}/${total} covered` : `Intent ${research.covered ?? 0} covered`
    out.research = [`testing conventions ${research.hasTesting ? 'yes' : 'no'}`, coverage, plural(questions, 'open question')]
  }
  out.explore = !explore
    ? []
    : [plural(explore.thoughts, 'thoughts doc'), explore.isDecided ? 'decision recorded' : 'no decision recorded']
  if (!design || design.isTemplate) {
    out.design = ['design.md not written yet']
  } else {
    out.design = [
      `${plural(design.criteria, 'criterion', 'criteria')}, ${design.withExample} with examples`,
      design.harness.rows === 0 ? 'no harness decisions' : `harness ${design.harness.decided}/${design.harness.rows} decided`,
      design.metrics.count === 0 ? 'no success metrics' : `${design.metrics.citing}/${design.metrics.count} metrics cite Intent`,
      plural(decisions, 'open decision'),
    ]
  }
  if (!tasks || tasks.isTemplate) {
    out.tasks = ['tasks.md not written yet']
  } else {
    const criteria = design?.criteria ?? 0
    const beads = tasks.beadsTasks > 0
      ? `beads epic and ${plural(tasks.beadsTasks, 'task')} created`
      : tasks.hasEpic ? 'beads epic created, no tasks yet' : 'beads not created yet'
    out.tasks = [
      `${plural(tasks.phases, 'phase')}, ${plural(tasks.tasks, 'task')}`,
      ...(criteria > 0 ? [`outer tests for ${Math.min(tasks.outer, criteria)}/${criteria} criteria`] : []),
      beads,
    ]
  }
  out.implement = (tasks?.beadsTasks ?? 0) > 0 ? [] : ['no beads tasks yet']
  const verdicts = (intent?.statements ?? []).filter(one => one.verdict !== null).length
  out.validate = total > 0 ? [`verdicts on ${verdicts}/${total} Intent statements`] : []
  return out
}

/** The next command, from help's chain: the current stage's own while it is unfinished, else the first unfinished stage. */
export function nextCommand(stages, isDesignWaiting) {
  const current = stages.find(stage => stage.state === 'current') ?? null
  if (isDesignWaiting && current?.key === 'design') return { before: 'approve design.md, then ', command: '/wb:create_tasks' }
  if (current !== null && !current.isDone) return { before: '', command: current.command }
  const firstOpen = stages.find(stage => !stage.isDone && !stage.isOptional) ?? null
  return firstOpen === null ? null : { before: '', command: firstOpen.command }
}

/**
 * The read-out for a plan that has no beads tasks yet: its stage chain, the
 * current stage's signals, and what needs the person (a stage waiting on
 * their approval first, then open Q: and Decide: issues).
 */
export function buildPlanningModel({ planName, intent = null, research = null, design = null, tasks = null, explore = null, openIssues = [], since = '', epic = null, last = null }) {
  const stages = stageStates({ intent, research, design, tasks, explore, isImplemented: false, last })
  const current = stages.find(stage => stage.state === 'current') ?? null
  const members = new Set(typeof epic === 'string' && epic !== '' ? [epic] : [])
  const asks = asksFor(openIssues, members, since ?? '')
  const blocking = []
  const isDesignWaiting = !!design && !design.isTemplate && design.criteria > 0 && !DESIGN_DONE.has(String(design.status).toLowerCase())
  if (current?.key === 'design' && isDesignWaiting) {
    blocking.push({ kind: 'approval', id: null, title: 'design.md', why: 'design.md waiting for your approval' })
  }
  if (current?.key === 'explore' && explore && !explore.isDecided) {
    blocking.push({ kind: 'approval', id: null, title: 'exploration', why: 'exploration has no recorded decision yet' })
  }
  blocking.push(...asks)
  return {
    kind: 'planning',
    planName: String(planName ?? 'plan'),
    stages,
    current: current?.key ?? null,
    blocking,
    signals: stageSignals({ intent, research, design, tasks, explore, openAsks: asks }),
    next: nextCommand(stages, isDesignWaiting),
  }
}

// ── Drawing the planning stages ──

const MARK_OF = { done: '✓', current: '●', todo: '○' }
const TONE_OF = { done: 'ok', current: 'accent', todo: 'track' }

/** `Project ✓ → Research ✓ → Design ● draft → Tasks ○ …`, with or without the current stage's status. */
export function wordChain(stages, isWithStatus = true) {
  const out = []
  stages.forEach((stage, at) => {
    if (at > 0) out.push(seg(' → ', 'dim'))
    out.push(seg(`${stage.label} `), seg(MARK_OF[stage.state], TONE_OF[stage.state]))
    if (isWithStatus && stage.state === 'current' && stage.status) out.push(seg(` ${stage.status}`, 'dim'))
  })
  return out
}

/** `P✓ R✓ Design ● draft T○ …`: the current stage in words, the others as symbols. */
function mixedChain(stages, isWithStatus) {
  const out = []
  stages.forEach((stage, at) => {
    if (at > 0) out.push(seg(' '))
    if (stage.state === 'current') {
      out.push(seg(`${stage.label} `), seg(MARK_OF.current, TONE_OF.current))
      if (isWithStatus && stage.status) out.push(seg(` ${stage.status}`, 'dim'))
    } else {
      out.push(seg(stage.symbol), seg(MARK_OF[stage.state], TONE_OF[stage.state]))
    }
  })
  return out
}

/** `P✓ R✓ D● T○ I○ V○`: the narrow form. */
export function symbolChain(stages) {
  const out = []
  stages.forEach((stage, at) => {
    if (at > 0) out.push(seg(' '))
    out.push(seg(stage.symbol), seg(MARK_OF[stage.state], TONE_OF[stage.state]))
  })
  return out
}

/** The plan's name as the band shows it: guessed or not, and its worktree while there is room. */
function planHead(model) {
  const name = [seg(model.planName), ...(isGuessed(model) ? [seg(' (guessed)', 'warn')] : [])]
  const head = [seg('Plan: ', 'dim'), ...name]
  const worktree = model.selection?.worktree
  const headInWorktree = worktree && worktree !== model.planName ? [...head, seg(` (worktree ${worktree})`, 'dim')] : null
  return { name, head, headInWorktree }
}

/**
 * The band during planning. Line 1 is the stage chain; words go before
 * symbols as it narrows. Line 2 is the current stage: what needs you first,
 * then its signals, dropped from the last as it narrows.
 */
function planningBandLines(model, columns) {
  const { name, head, headInWorktree } = planHead(model)
  const stages = model.stages
  const progress = firstFitting([
    ...(headInWorktree === null ? [] : [line(headInWorktree, wordChain(stages, true))]),
    line(head, wordChain(stages, true)),
    line(head, wordChain(stages, false)),
    line(head, mixedChain(stages, true)),
    line(head, mixedChain(stages, false)),
    line(head, symbolChain(stages)),
    line(name, symbolChain(stages)),
    symbolChain(stages),
  ], columns)

  const stage = stages.find(one => one.key === model.current) ?? null
  const label = [seg(`${stage?.label ?? 'Plan'}: `, 'dim')]
  const attention = attentionWords(model.blocking)
  const signals = model.signals[model.current] ?? []
  const variants = []
  for (let count = signals.length; count >= 0; count -= 1) {
    const shown = signals.slice(0, count).map(text => [seg(text)])
    variants.push([...label, ...line([attentionSegment(attention)], ...shown)])
    // A long question title is shortened, down to a readable stub, before a
    // signal goes.
    const room = columns - width([...label, ...line([seg('')], ...shown)])
    if (room >= 32) variants.push([...label, ...line([attentionSegment(attentionWords(model.blocking, room))], ...shown)])
  }
  variants.push([attentionSegment(attention)], [attentionSegment(attention, columns)])
  const tests = firstFitting(variants, columns)
  return { progress, tests, attention, text: { progress: joined(progress), tests: joined(tests) } }
}

/** The one-line status during planning, for surfaces with no band. */
function planningStatusLine(model) {
  const stage = model.stages.find(one => one.key === model.current)
  const where = stage ? `${stage.label.toLowerCase()}${stage.status ? ` (${stage.status})` : ''}` : 'planned'
  const attention = model.blocking.length === 0 ? '✓' : `⚠ ${model.blocking.length}`
  const guessed = isGuessed(model) ? ' (guessed)' : ''
  return `wb ${model.planName}${guessed}: ${where} · ${joined(symbolChain(model.stages))} · ${attention}`
}

function decisionRows(blocking) {
  return blocking.length === 0
    ? ['Nothing needs you.']
    : blocking.map(item => (item.id === null ? `⚠ ${item.why}` : `⚠ ${item.why}: ${item.title} (${item.id})`))
}

/** The pane's Planning rows: each stage with its status, document and signals; then the next command. */
function planningRows(model) {
  const dir = model.selection?.dir ?? ''
  const rows = model.stages.map(stage => {
    const status = stage.status ? ` (${stage.status})` : ''
    const doc = stage.doc ? ` · ${dir ? `${dir}/` : ''}${stage.doc}` : ''
    const signals = (model.signals?.[stage.key] ?? []).map(text => ` · ${text}`).join('')
    return `${MARK_OF[stage.state]} ${stage.label}${status}${doc}${signals}`
  })
  if (model.next) rows.push(`Next: ${model.next.before}${model.next.command}${dir ? ` ${dir}` : ''}`)
  else if (model.stages.every(stage => stage.isDone)) rows.push('Every stage is done.')
  return rows
}

// ── Band spacing ──

/** Rows of gap above the rule: one, unless the band has fewer than five rows to spare (it goes before the rule does). */
export function topGap(maxRows) {
  return typeof maxRows === 'number' && maxRows < 5 ? 0 : 1
}

/** Whether what a mod below drew is empty: nothing, or only blank text, so it must not add a row. */
export function isBlankNode(node) {
  if (node === null || node === undefined || node === false) return true
  if (typeof node === 'string') return node.trim() === ''
  if (Array.isArray(node)) return node.every(isBlankNode)
  if (typeof node === 'object' && 'children' in node) return isBlankNode(node.children ?? [])
  return false
}
