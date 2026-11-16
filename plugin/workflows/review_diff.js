export const meta = {
  name: 'review_diff',
  description: 'Review a branch cold before its pull request: four lenses over the change, findings merged, each one verified by a skeptic',
  whenToUse: 'Before opening a pull request for work a plan produced, to find what no acceptance criterion names: input nobody showed, a failure partway, effects on other callers, values and lists that no longer agree. Arguments: base=<ref> head=<ref> plan=<docs/plans/dir> verify=<how many findings to verify, default 4>.',
  phases: [
    { title: 'Find', detail: 'four reviewers, one lens each, none given the plan' },
    { title: 'Merge', detail: 'findings with one root cause become one' },
    { title: 'Verify', detail: 'a skeptic traces each finding from an entry point' },
  ],
}

// ── Arguments: an object, or the text typed after the command ──

function readArgs(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  const out = {}
  for (const word of String(value ?? '').split(/\s+/).filter(Boolean)) {
    const pair = /^(base|head|plan|verify)=(.+)$/.exec(word)
    if (pair) out[pair[1]] = pair[2]
    else if (word.includes('plans/')) out.plan = word
  }
  return out
}

const input = readArgs(args)
const head = String(input.head || 'HEAD')
const base = input.base ? String(input.base) : null
const plan = input.plan ? String(input.plan) : null
const verifyCount = Math.max(1, Math.min(12, Number(input.verify) || 4))

const RANGE = base
  ? `Range: base ${base}, head ${head}.`
  : `Range: head ${head}; find the base as your instructions say.`

// ── Lenses: what a plan-anchored check does not look at ──

const LENSES = [
  { key: 'unshown input', ask: 'input or data the changed code can receive and does not handle: empty or missing values, a wrong type, free text carrying the delimiters of the format it is put into, a record deleted or changed since something referred to it' },
  { key: 'failure partway', ask: 'what happens when a step fails partway: a call or statement that raises inside a loop or a sequence, what is left done and undone, what the caller is told, an error raised inside a rescue, a failure answered as the wrong outcome' },
  { key: 'other callers', ask: 'existing callers and readers of what changed, anywhere in the repository, whose behavior the change alters without their being changed: jobs, other entry points, consumers of a changed return value or stored field' },
  { key: 'loose ends', ask: 'things that must agree and no longer do: a configuration value against its siblings, two lists or checks that should cover the same set, a message that is wrong for some counts or cases, a failure that is caught and never reported or logged' },
]

const FINDINGS = {
  type: 'object',
  properties: {
    base: { type: 'string' },
    blocked: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          claim: { type: 'string' },
          trigger: { type: 'string' },
          severity: { type: 'string', enum: ['important', 'minor'] },
        },
        required: ['file', 'line', 'claim', 'trigger', 'severity'],
      },
    },
  },
  required: ['base', 'findings'],
}

const MERGED = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          members: { type: 'array', items: { type: 'integer' } },
          lead: { type: 'integer' },
        },
        required: ['members', 'lead'],
      },
    },
  },
  required: ['issues'],
}

const VERDICT = {
  type: 'object',
  properties: {
    state: { type: 'string', enum: ['confirmed', 'depends', 'not a defect'] },
    evidence: { type: 'string' },
    condition: { type: 'string' },
    criterion: { type: 'string' },
    fix: { type: 'string', enum: ['a few lines', 'more than that', 'a design decision'] },
  },
  required: ['state', 'evidence', 'criterion', 'fix'],
}

// ── Find: every lens at once; the merge needs all of them together ──

phase('Find')
const found = await parallel(LENSES.map(lens => () =>
  agent(
    `Find. ${RANGE} Lens: ${lens.key}. Look only for ${lens.ask}. At most 6 findings.`,
    { label: `find: ${lens.key}`, phase: 'Find', agentType: 'wb:diff-reviewer', schema: FINDINGS },
  ).then(result => (result === null ? null : { lens: lens.key, ...result }))))

// A lens is covered only when its reviewer read the change: one that returned
// nothing, or says it was blocked, did not review, whatever its findings list holds.
const reasonNotCovered = one => (one === null ? 'no result' : one.blocked ? String(one.blocked) : null)
const uncovered = LENSES.map((lens, i) => ({ lens: lens.key, why: reasonNotCovered(found[i]) })).filter(one => one.why !== null)
const silent = uncovered.map(one => one.lens)
const noResult = uncovered.filter(one => one.why === 'no result').map(one => one.lens)
if (noResult.length > 0) log(`No result from: ${noResult.join(', ')}. Those lenses are not covered by this review.`)
for (const one of uncovered.filter(one => one.why !== 'no result')) log(`The ${one.lens} reviewer could not read the change: ${one.why}. That lens is not covered.`)

const covered = found.filter(one => reasonNotCovered(one) === null)
const resolvedBase = base ?? (covered.map(one => one.base).find(Boolean) || 'not found')
const all = covered.flatMap(one => one.findings.map(finding => ({ lens: one.lens, ...finding })))

// ── Merge: one issue per root cause, the most serious first ──

let issues = all.map((_, i) => ({ members: [i], lead: i }))
if (all.length > 1) {
  phase('Merge')
  const list = all.map((f, i) => `${i}. [${f.severity}] ${f.file}:${f.line} (${f.lens}) ${f.claim} Trigger: ${f.trigger}`).join('\n')
  const merged = await agent(
    `These findings came from reviewers who each read the same change through a different lens and did not see each other's work. Group the ones that describe the same root cause (the same defect, even when they name different lines or consequences), and keep the rest apart. Every finding's number appears in exactly one group. For each group give its member numbers and the one member that states it best as lead. Order the groups by harm, most serious first. Use no tools.\n\n${list}`,
    { label: 'merge findings', phase: 'Merge', schema: MERGED, model: 'sonnet', effort: 'low' },
  )
  const valid = merged !== null
    && merged.issues.every(issue => issue.members.includes(issue.lead) && issue.members.every(n => Number.isInteger(n) && n >= 0 && n < all.length))
    && merged.issues.flatMap(issue => issue.members).slice().sort((a, b) => a - b).join(',') === all.map((_, i) => i).join(',')
  if (valid) issues = merged.issues
  else log('The merge step returned no usable grouping, so findings are verified unmerged, important ones first.')
  if (!valid) issues.sort((a, b) => (all[a.lead].severity === 'important' ? 0 : 1) - (all[b.lead].severity === 'important' ? 0 : 1))
}

const toVerify = issues.slice(0, verifyCount)
const notVerified = issues.slice(verifyCount)
if (notVerified.length > 0) log(`Verifying ${toVerify.length} of ${issues.length} findings (verify=${verifyCount}); the rest are listed as not verified.`)

// ── Verify: one skeptic per issue ──

const PLAN = plan
  ? ` Plan directory: ${plan} (read it only after you decide, to sort the finding).`
  : ' No plan directory: answer criterion with "none".'
const verdicts = await parallel(toVerify.map((issue, n) => () => {
  const f = all[issue.lead]
  const also = issue.members.filter(i => i !== issue.lead).map(i => `${all[i].file}:${all[i].line}`).join(', ')
  return agent(
    `Verify. ${RANGE.replace('find the base as your instructions say', `base ${resolvedBase}`)} Claim: ${f.claim} At ${f.file}:${f.line}.${also ? ` Other reviewers raised the same thing at ${also}.` : ''} Trigger: ${f.trigger}.${PLAN}`,
    { label: `verify ${n + 1}: ${f.file.split('/').pop()}:${f.line}`, phase: 'Verify', agentType: 'wb:diff-reviewer', schema: VERDICT, model: 'opus', effort: 'high' },
  )
}))

// ── The report, as the person will read it ──

const lensesOf = issue => [...new Set(issue.members.map(i => all[i].lens))].join(', ')
const row = (issue, verdict) => {
  const f = all[issue.lead]
  return {
    severity: issue.members.some(i => all[i].severity === 'important') ? 'important' : 'minor',
    at: `${f.file}:${f.line}`,
    lenses: lensesOf(issue),
    claim: f.claim,
    trigger: f.trigger,
    evidence: verdict ? verdict.evidence : null,
    condition: verdict && verdict.condition ? verdict.condition : null,
    criterion: verdict ? verdict.criterion : null,
    fix: verdict ? verdict.fix : null,
  }
}
const judged = toVerify.map((issue, n) => ({ issue, verdict: verdicts[n] }))
const isAccepted = verdict => /^accepted\b/i.test(String(verdict.criterion))
const stateOf = one => (one.verdict ? one.verdict.state : null)
const rows = keep => judged.filter(keep).map(one => row(one.issue, one.verdict))
const confirmed = rows(one => stateOf(one) === 'confirmed' && !isAccepted(one.verdict))
const conditional = rows(one => stateOf(one) === 'depends' && !isAccepted(one.verdict))
const accepted = rows(one => (stateOf(one) === 'confirmed' || stateOf(one) === 'depends') && isAccepted(one.verdict))
const refuted = rows(one => stateOf(one) === 'not a defect')
const unverified = [...judged.filter(one => !one.verdict).map(one => row(one.issue, null)), ...notVerified.map(issue => row(issue, null))]

const lines = []
lines.push(`## Cold review of ${resolvedBase}..${head}`)
lines.push('')
lines.push(`${confirmed.length} confirmed, ${conditional.length} that depends on something outside the repository, ${refuted.length} raised and not confirmed, ${unverified.length} not verified${accepted.length ? `, ${accepted.length} real but accepted in the design` : ''}. ${all.length} raw findings from ${LENSES.length - silent.length} of ${LENSES.length} lenses.`)
const section = (title, rows, withEvidence) => {
  if (rows.length === 0) return
  lines.push('', `### ${title}`, '')
  rows.forEach((r, i) => {
    lines.push(`${i + 1}. **${r.severity}**: ${r.claim} (\`${r.at}\`; lens: ${r.lenses})`)
    lines.push(`   - When: ${r.trigger}`)
    if (withEvidence && r.condition) lines.push(`   - Depends on: ${r.condition}`)
    if (withEvidence && r.evidence) lines.push(`   - Checked: ${r.evidence}`)
    if (withEvidence && r.criterion) lines.push(`   - Criterion: ${r.criterion}; fix: ${r.fix}`)
  })
}
section('Confirmed', confirmed, true)
section('Fails as claimed, if a condition outside the repository holds (yours to judge)', conditional, true)
section('Real, and left unhandled by the approved design', accepted, true)
section('Not verified (beyond the verify count, or the verifier returned nothing)', unverified, false)
section('Raised and not confirmed', refuted, true)
if (uncovered.length > 0) lines.push('', `Not covered: ${uncovered.map(one => `${one.lens} (${one.why})`).join('; ')}`)
if (uncovered.length === LENSES.length) lines.push('', 'This review did not happen: no reviewer could read the change. Fix what blocked them and run it again.')
else if (all.length === 0) lines.push('', `No reviewer reported a finding${uncovered.length > 0 ? ' in the lenses that were covered' : ''}.`)

return { report: lines.join('\n'), base: resolvedBase, head, plan, confirmed, conditional, accepted, unverified, refuted, lensesNotCovered: silent }
