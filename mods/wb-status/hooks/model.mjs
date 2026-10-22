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
 * commits (git log lines), comments ({ [id]: bd comments JSON }).
 */
export function buildModel({ fm, criteria, issues, openIssues, commits, comments }) {
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
  // Q: and Decide: issues carry no link to a plan, so one counts when it is
  // linked to the plan anyway or was opened since the plan was created.
  const since = String(fm.created_timestamp ?? fm.created ?? '')
  for (const issue of openIssues ?? []) {
    const match = /^(Q|Decide):/.exec(String(issue.title ?? ''))
    if (!match || !UNCLOSED.has(String(issue.status ?? 'open'))) continue
    const isLinked = state.members.has(issue.id) || linksTo(issue, state.members)
    const isRecent = since !== '' && String(issue.created_at ?? '') >= since
    if (isLinked || isRecent) blocking.push({ kind: match[1] === 'Q' ? 'question' : 'decision', id: issue.id, title: issue.title, why: match[1] === 'Q' ? 'open question' : 'decision pending' })
  }

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
    followUps: openFollowUps.map(item => ({ id: item.id, title: item.title, status: item.status, from: item.from })),
  }
}

/** A bar of `width` cells, filled in proportion. */
export function bar(done, total, width = 10) {
  const filled = total === 0 ? 0 : Math.round((done / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
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

/** What needs the person, as one short phrase, and whether all is well. */
export function attentionWords(blocking) {
  if (blocking.length === 0) return { text: '✓ nothing needs you', isOk: true }
  const first = blocking[0]
  const what = first.kind === 'checkpoint'
    ? first.why
    : first.kind === 'halt'
      ? `${first.why} (${first.id})`
      : `${first.why}: ${String(first.title).replace(/^(Q|Decide):\s*/, '')} (${first.id})`
  const more = blocking.length > 1 ? ` +${blocking.length - 1} more` : ''
  return { text: `⚠ ${what}${more}`, isOk: false }
}

function attentionSegment(attention, max = Infinity) {
  return seg(shorten(attention.text, max), attention.isOk ? 'ok' : 'warn')
}

/**
 * The band's two lines, fitted to `columns` cells. Each line drops its
 * lowest-priority parts first: line 1 shortens, then drops, what is in
 * progress, then the follow-up count and the bar, keeping the phase and its
 * counts; line 2 keeps what needs you and drops the red-first count, then the
 * verifier, then its label.
 */
export function bandLines(model, columns = Infinity) {
  // A guessed plan says so wherever its name shows; the worktree is the
  // first thing to go when the band is narrow.
  const name = [seg(model.planName), ...(isGuessed(model) ? [seg(' (guessed)', 'warn')] : [])]
  const head = [seg('Plan: ', 'dim'), ...name]
  const worktree = model.selection?.worktree
  const headInWorktree = worktree && worktree !== model.planName ? [...head, seg(` (worktree ${worktree})`, 'dim')] : null
  const where = model.isDone ? ' done' : model.isAtCheckpoint ? ' at checkpoint' : ''
  const filled = model.total === 0 ? 0 : Math.round((model.closed / model.total) * 10)
  const phase = [seg(`Phase ${model.phase}/${model.phaseCount}${where}`), seg(' '), seg('█'.repeat(filled), 'accent'), seg('░'.repeat(10 - filled), 'track'), seg(` ${model.closed}/${model.total} tasks`)]
  const phaseNoBar = [seg(`Phase ${model.phase}/${model.phaseCount}${where} ${model.closed}/${model.total} tasks`)]
  const count = model.followUps.length
  const follow = count === 0 ? null : [seg(`${count} follow-up${count === 1 ? '' : 's'} open`)]
  const isIdle = model.isDone || model.isAtCheckpoint
  const nowFull = model.now === null ? null : `${model.now.title} (${model.now.id})`
  const nowOf = text => (text === null ? (isIdle ? null : [seg('now: ', 'dim'), seg('nothing in progress', 'dim')]) : [seg('now: ', 'dim'), seg(text)])

  const fixed = line(head, phase, follow)
  const room = columns - width(fixed) - cells(' · now: ') - cells(` (${model.now?.id ?? ''})`)
  const nowShort = model.now === null || room < 8 ? null : `${shorten(model.now.title, room)} (${model.now.id})`
  const progressVariants = [
    ...(headInWorktree === null ? [] : [line(headInWorktree, phase, follow, nowOf(nowFull))]),
    line(head, phase, follow, nowOf(nowFull)),
    ...(nowShort === null ? [] : [line(head, phase, follow, nowOf(nowShort))]),
    line(head, phase, follow),
    line(head, phase),
    line(head, phaseNoBar),
    line(name, phaseNoBar),
  ]
  const progress = firstFitting(progressVariants, columns)

  const attention = attentionWords(model.blocking)
  const label = [seg('Tests: ', 'dim')]
  const red = model.criteria.length === 0
    ? [seg('no criteria found', 'dim')]
    : [seg('red-first ', 'dim'), seg(`${model.redCount}/${model.criteria.length}`)]
  const verifier = verifierSegments(model.verdicts)
  const testsVariants = [
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
  const attention = model.blocking.length === 0 ? '✓' : `⚠ ${model.blocking.length}`
  const where = model.isAtCheckpoint ? ' at checkpoint' : ''
  const verifier = joined(verifierSegments(model.verdicts))
  const guessed = isGuessed(model) ? ' (guessed)' : ''
  return `wb ${model.planName}${guessed}: phase ${model.phase}/${model.phaseCount}${where} ${model.closed}/${model.total} · red-first ${model.redCount}/${model.criteria.length} · ${verifier} · ${attention}`
}

const MARK = { closed: '✓', in_progress: '…', blocked: '⊘' }

/** The pane's four sections, as heading and rows of plain text. */
export function paneSections(model) {
  const decide = model.blocking.length === 0
    ? ['Nothing needs you.']
    : model.blocking.map(item => (item.id === null ? `⚠ ${item.why}` : `⚠ ${item.why}: ${item.title} (${item.id})`))

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

  const followUps = model.followUps.length === 0
    ? ['No open follow-ups.']
    : model.followUps.map(item => `${MARK[item.status] ?? '○'} ${item.title} (${item.id}${item.from ? `, from ${item.from}` : ''})`)

  const plan = model.selection ? [{ heading: 'Plan', rows: selectionWords(model.selection) }] : []
  return [
    ...plan,
    { heading: 'Needs your decision', rows: decide },
    { heading: `What phase ${model.phase} delivered`, rows: delivered.length === 0 ? ['No tasks in this phase.'] : delivered },
    { heading: 'Test integrity', rows: integrity },
    { heading: 'Follow-ups', rows: followUps },
  ]
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
  if (e?.command && typeof e.command.name === 'string') return pinFrom(e.command.name, e.command.args, at)
  const typed = /^\s*\/(wb:[\w-]+)(?:\s+([\s\S]*))?$/.exec(String(e?.text ?? ''))
  return typed === null ? null : pinFrom(typed[1], typed[2] ?? '', at)
}

/**
 * The latest wb invocation in a transcript (`$.session.messages()` rows): a
 * user row that ran `/wb:<name>` (typed, or recorded as `<command-name>`), or
 * an assistant's Skill tool use. Restores the pin in a process that starts
 * with the transcript already written (a resume).
 */
export function latestPin(messages, at) {
  let found = null
  for (const message of messages ?? []) {
    if (message?.role === 'user') {
      const text = String(message.text ?? '')
      const named = /<command-name>\/?(wb:[\w-]+)<\/command-name>/.exec(text) ?? /^\s*\/(wb:[\w-]+)\b/.exec(text)
      const pin = named === null ? null : pinFrom(named[1], text.slice(named.index + named[0].length), at)
      if (pin !== null) found = pin
    }
    for (const use of message?.toolUses ?? []) {
      if (use?.tool !== 'Skill') continue
      const skill = String(use.input?.skill ?? '').replace(/^\//, '')
      const pin = pinFrom(skill, use.input?.args, at)
      if (pin !== null) found = pin
    }
  }
  return found
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
  return kind === 'beads' || kind === 'directory'
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
  }
  if (selection.missing) rows.push(`No tasks.md found for the pinned ${selection.missing}, so this plan was guessed.`)
  rows.push('/wb-status <plan dir> pins a plan; /wb-status auto goes back to guessing.')
  return rows
}
