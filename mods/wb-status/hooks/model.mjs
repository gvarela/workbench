// wb-status: the pure half of the mod. Nothing here touches `$`: it parses
// what the hooks module read (a tasks.md, a design.md, bd JSON, git log
// lines) and turns it into the model the band, the status line and the pane
// draw from. Kept apart so the tests can exercise it without a session.

const FINISHED = new Set(['complete', 'completed', 'done', 'archived', 'cancelled'])

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

/** What a task's comments say: its latest verifier verdict, integrity findings, and an open halt. */
export function readComments(comments) {
  const reports = []
  const integrity = []
  const halts = []
  for (const comment of comments ?? []) {
    const text = String(comment.text ?? '')
    const at = String(comment.created_at ?? '')
    const head = firstLine(text).toLowerCase()
    if (head.startsWith('verification report:')) {
      const status = /###\s*Status:\s*(PASS|FAIL)\b/.exec(text)
      if (status) reports.push({ at, status: status[1] })
    } else if (head.startsWith('test integrity:')) {
      const findings = /Findings:\s*(\d+)\s*\((\d+)\s*escalated\)/.exec(text)
      if (findings) integrity.push({ at, findings: Number(findings[1]), escalated: Number(findings[2]) })
    } else if (head.startsWith('halted:')) {
      halts.push({ at, why: firstLine(text) })
    }
  }
  return { verifier: latest(reports), integrity: latest(integrity), halt: latest(halts) }
}

function phaseOf(key) {
  const match = /^phase(\d+)_/.exec(key)
  return match ? Number(match[1]) : null
}

function servesCriterion(issue, id) {
  return new RegExp(`\\b${id}(?!\\d)`).test(`${issue.title ?? ''}\n${issue.description ?? ''}`)
}

/**
 * The whole read-out, from what the hooks module gathered:
 * fm (tasks.md frontmatter), criteria, issues (bd list for the plan's ids),
 * openIssues (bd list of every unclosed issue), commits (git log lines),
 * comments ({ [id]: bd comments JSON }).
 */
export function buildModel({ fm, criteria, issues, openIssues, commits, comments }) {
  const byId = new Map((issues ?? []).map(issue => [issue.id, issue]))
  const ids = new Set(planIds(fm))
  const phaseKeys = Object.keys(fm.beads_phases ?? {})
  const seen = new Set()
  const tasks = []
  for (const [key, id] of Object.entries(fm.beads_tasks ?? {})) {
    const issue = byId.get(id)
    const phase = phaseOf(key)
    if (issue === undefined || phase === null || seen.has(id)) continue
    seen.add(id)
    tasks.push({ key, id, phase, title: issue.title ?? id, status: issue.status ?? 'open', issue, notes: readComments(comments?.[id]) })
  }
  if (tasks.length === 0) return null

  const phaseNumbers = [...phaseKeys.map(phaseOf), ...tasks.map(task => task.phase)].filter(n => n !== null)
  const phaseCount = Math.max(...phaseNumbers)
  const unfinished = tasks.filter(task => task.status !== 'closed').map(task => task.phase)
  const isDone = unfinished.length === 0
  const phase = isDone ? phaseCount : Math.min(...unfinished)
  const phaseTasks = tasks.filter(task => task.phase === phase)
  const closed = phaseTasks.filter(task => task.status === 'closed').length

  const working = tasks
    .filter(task => task.status === 'in_progress')
    .sort((a, b) => (a.phase === phase ? -1 : 0) - (b.phase === phase ? -1 : 0) || String(b.issue.updated_at ?? '').localeCompare(String(a.issue.updated_at ?? '')))
  const now = working[0] ?? null

  const red = redCommits(commits ?? [])
  const rows = (criteria ?? []).map(criterion => {
    const serving = tasks.filter(task => servesCriterion(task.issue, criterion.id))
    const verdicts = serving.filter(task => task.notes.verifier !== null).map(task => ({ ...task.notes.verifier, id: task.id }))
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

  const recent = tasks
    .filter(task => task.notes.verifier !== null)
    .map(task => ({ ...task.notes.verifier, id: task.id }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5)

  const blocking = []
  for (const task of tasks) {
    if (task.status === 'closed') continue
    if (task.notes.halt !== null) {
      blocking.push({ id: task.id, title: task.title, why: task.notes.halt.why })
    } else if (task.issue.closed_at || task.issue.close_reason) {
      blocking.push({ id: task.id, title: task.title, why: 'reopened' })
    }
  }
  // Q: and Decide: issues carry no link to a plan, so one counts when it is
  // linked to the plan anyway or was opened since the plan was created.
  const since = String(fm.created_timestamp ?? fm.created ?? '')
  for (const issue of openIssues ?? []) {
    const match = /^(Q|Decide):/.exec(String(issue.title ?? ''))
    const isLinked = (issue.dependencies ?? []).some(dep => ids.has(dep.depends_on_id))
    const isRecent = since !== '' && String(issue.created_at ?? '') >= since
    if (match && (isLinked || isRecent)) blocking.push({ id: issue.id, title: issue.title, why: match[1] === 'Q' ? 'open question' : 'decision pending' })
  }

  const followUps = (openIssues ?? [])
    .filter(issue => !ids.has(issue.id))
    .map(issue => ({ issue, from: (issue.dependencies ?? []).find(dep => dep.type === 'discovered-from' && ids.has(dep.depends_on_id)) }))
    .filter(({ from }) => from !== undefined)
    .map(({ issue, from }) => ({ id: issue.id, title: issue.title ?? issue.id, status: issue.status, from: from.depends_on_id }))

  return {
    planName: String(fm.project ?? 'plan'),
    phase,
    phaseCount,
    isDone,
    closed,
    total: phaseTasks.length,
    phaseTasks: phaseTasks.map(task => ({ id: task.id, title: task.title, status: task.status })),
    now: now === null ? null : { id: now.id, title: now.title },
    criteria: rows,
    redCount: rows.filter(row => row.redSha !== null).length,
    recent,
    blocking,
    followUps,
  }
}

/** A bar of `width` cells, filled in proportion. */
export function bar(done, total, width = 10) {
  const filled = total === 0 ? 0 : Math.round((done / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** The verifier's recent verdicts, in plain words. */
export function verifierWords(recent) {
  if (recent.length === 0) return 'verifier: no reports yet'
  const passed = recent.filter(one => one.status === 'PASS').length
  const words = passed === recent.length
    ? `verifier: last ${recent.length} passed`
    : `verifier: ${passed} of last ${recent.length} passed`
  const failed = recent.find(one => one.status === 'FAIL')
  return failed === undefined ? words : `${words}, ${failed.id} failed`
}

/** What needs the person, in plain words, and whether all is well. */
export function attentionWords(blocking) {
  if (blocking.length === 0) return { text: '✓ nothing needs you', isOk: true }
  const shown = blocking.slice(0, 2).map(item => `${item.why.startsWith('halted') ? 'halted' : item.why} ${item.id}`)
  const more = blocking.length > 2 ? `, +${blocking.length - 2} more` : ''
  const noun = blocking.length === 1 ? 'item needs' : 'items need'
  return { text: `⚠ ${blocking.length} ${noun} you: ${shown.join(', ')}${more}`, isOk: false }
}

/** The band's two lines: progress, then test integrity and attention. */
export function bandLines(model) {
  const phase = model.isDone ? `Phase ${model.phase}/${model.phaseCount} done` : `Phase ${model.phase}/${model.phaseCount}`
  const now = model.now === null ? 'now: no task in progress' : `now: ${model.now.title} (${model.now.id})`
  const progress = `Plan: ${model.planName} · ${phase} ${bar(model.closed, model.total)} ${model.closed}/${model.total} tasks · ${now}`
  const criteria = model.criteria.length === 0
    ? 'no acceptance criteria found'
    : `${model.redCount}/${model.criteria.length} criteria have a red-first outer test`
  const tests = `Tests: ${criteria} · ${verifierWords(model.recent)} · `
  return { progress, tests, attention: attentionWords(model.blocking) }
}

/** The one-line status, for surfaces with no band. */
export function statusLine(model) {
  const attention = model.blocking.length === 0 ? '✓' : `⚠ ${model.blocking.length}`
  return `wb ${model.planName}: phase ${model.phase}/${model.phaseCount} ${model.closed}/${model.total} · red-first ${model.redCount}/${model.criteria.length} · ${attention}`
}

const MARK = { closed: '✓', in_progress: '…', blocked: '⊘' }

/** The pane's four sections, as heading and rows of plain text. */
export function paneSections(model) {
  const decide = model.blocking.length === 0
    ? ['Nothing needs you.']
    : model.blocking.map(item => `⚠ ${item.why}: ${item.title} (${item.id})`)

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
    : model.followUps.map(item => `○ ${item.title} (${item.id}, from ${item.from})`)

  return [
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
