#!/usr/bin/env node
// Tests for plugin/workflows/review_diff.js: runs the script with stubbed agents and checks its
// control flow and report. No model is called. Usage: node tests/review-diff/run.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, '../../plugin/workflows/review_diff.js'), 'utf8').replace('export const meta', 'const meta')
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const script = new AsyncFunction('args', 'agent', 'parallel', 'pipeline', 'phase', 'log', source)

const finding = (file, line, claim, severity) => ({ file, line, claim, trigger: `when ${claim}`, severity })

/** Runs the script once. `behave` overrides what the stubbed finders, merger and verifiers return. */
async function run(args, behave = {}) {
  const calls = []
  const logs = []
  async function agent(prompt, opts = {}) {
    calls.push({ prompt, ...opts })
    if (opts.label.startsWith('find:')) {
      const lens = opts.label.slice(6)
      if (behave.find) return behave.find(lens)
      return { base: 'abc123', findings: [finding('app/a.rb', 10, `shared defect seen by ${lens}`, 'important'), finding(`app/${lens.replace(/ /g, '_')}.rb`, 5, `own defect of ${lens}`, 'minor')] }
    }
    if (opts.label === 'merge findings') {
      const n = (prompt.match(/^\d+\. /gm) ?? []).length
      if (behave.merge) return behave.merge(n)
      const all = [...Array(n).keys()]
      const shared = all.filter(i => i % 2 === 0)
      return { issues: [{ members: shared, lead: shared[0] }, ...all.filter(i => i % 2 === 1).map(i => ({ members: [i], lead: i }))] }
    }
    const n = Number(/^verify (\d+):/.exec(opts.label)[1])
    if (behave.verify) return behave.verify(n)
    return { state: 'confirmed', evidence: 'traced from the request to the line', criterion: 'none', fix: 'a few lines' }
  }
  const parallel = thunks => Promise.all(thunks.map(thunk => thunk().catch(() => null)))
  const pipeline = () => { throw new Error('pipeline is not used') }
  const result = await script(args, agent, parallel, pipeline, () => {}, message => logs.push(message))
  return { result, calls, logs }
}

let passed = 0
async function test(name, body) {
  try {
    await body()
    passed += 1
    console.log(`ok   ${name}`)
  } catch (error) {
    console.log(`FAIL ${name}\n     ${String(error.message).split('\n').join('\n     ')}`)
    process.exitCode = 1
  }
}

await test('four finders, one merge, four verifiers by default: nine agents', async () => {
  const { calls } = await run('base=abc123')
  assert.deepEqual(calls.map(call => call.label.split(':')[0].replace(/ \d+$/, '')), ['find', 'find', 'find', 'find', 'merge findings', 'verify', 'verify', 'verify', 'verify'])
})

await test('finders and verifiers are the read-only reviewer; verifiers run on the stronger model', async () => {
  const { calls } = await run('base=abc123')
  const finders = calls.filter(call => call.label.startsWith('find:'))
  const verifiers = calls.filter(call => call.label.startsWith('verify'))
  assert.ok(finders.every(call => call.agentType === 'wb:diff-reviewer'))
  assert.ok(verifiers.every(call => call.agentType === 'wb:diff-reviewer' && call.model === 'opus' && call.effort === 'high'))
})

await test('no finder is given the plan directory, and every verifier is', async () => {
  const { calls } = await run('base=abc123 docs/plans/2026-01-01-demo')
  assert.ok(calls.filter(call => call.label.startsWith('find:')).every(call => !call.prompt.includes('docs/plans')))
  assert.ok(calls.filter(call => call.label.startsWith('verify')).every(call => call.prompt.includes('docs/plans/2026-01-01-demo')))
})

await test('findings with one root cause are verified once and report every lens that raised them', async () => {
  const { result } = await run('base=abc123')
  assert.equal(result.confirmed[0].at, 'app/a.rb:10')
  assert.equal(result.confirmed[0].lenses, 'unshown input, failure partway, other callers, loose ends')
  assert.equal(result.confirmed[0].severity, 'important')
})

await test('findings beyond the verify count are listed as not verified, and the cap is logged', async () => {
  const { result, logs } = await run({ base: 'abc123', verify: 2 })
  assert.equal(result.confirmed.length, 2)
  assert.equal(result.unverified.length, 3)
  assert.ok(logs.some(line => line.includes('Verifying 2 of 5')))
})

await test('a refuted finding, an accepted one, and a verifier that returned nothing each land in their own list', async () => {
  const verify = n => (n === 2 ? { state: 'not a defect', evidence: 'a guard upstream stops it', criterion: 'none', fix: 'a few lines' }
    : n === 3 ? { state: 'confirmed', evidence: 'traced', criterion: 'accepted: "odd input: not handled"', fix: 'a design decision' }
      : n === 4 ? null
        : { state: 'confirmed', evidence: 'traced', criterion: 'AC-2', fix: 'a few lines' })
  const { result } = await run('base=abc123', { verify })
  assert.equal(result.confirmed.length, 1)
  assert.equal(result.confirmed[0].criterion, 'AC-2')
  assert.equal(result.refuted.length, 1)
  assert.equal(result.accepted.length, 1)
  assert.equal(result.unverified.length, 2)
  assert.match(result.report, /1 confirmed, 0 that depends on something outside the repository, 1 raised and not confirmed, 2 not verified, 1 real but accepted in the design/)
})

await test('a failure that depends on something outside the repository is listed for the person, not dropped', async () => {
  const verify = n => (n === 1 ? { state: 'depends', evidence: 'the loop stops at the first statement that raises', condition: 'a relation the migrating role does not own in production', criterion: 'none', fix: 'a few lines' }
    : { state: 'not a defect', evidence: 'a guard upstream stops it', criterion: 'none', fix: 'a few lines' })
  const { result } = await run('base=abc123', { verify })
  assert.equal(result.confirmed.length, 0)
  assert.equal(result.conditional.length, 1)
  assert.equal(result.conditional[0].condition, 'a relation the migrating role does not own in production')
  assert.equal(result.refuted.length, 3)
  assert.match(result.report, /0 confirmed, 1 that depends on something outside the repository, 3 raised and not confirmed/)
  assert.match(result.report, /Depends on: a relation the migrating role does not own in production/)
})

await test('finders are asked for more findings than are verified, since the verifier is the filter', async () => {
  const { calls } = await run('base=abc123')
  assert.ok(calls.filter(call => call.label.startsWith('find:')).every(call => call.prompt.includes('At most 6 findings')))
})

await test('no findings: no merge, no verifier, and the report says so', async () => {
  const { result, calls } = await run(undefined, { find: () => ({ base: 'abc123', findings: [] }) })
  assert.equal(calls.length, 4)
  assert.match(result.report, /No reviewer reported a finding/)
  assert.equal(result.base, 'abc123')
})

await test('a lens that returns nothing is named as not covered', async () => {
  const find = lens => (lens === 'loose ends' ? null : { base: 'abc123', findings: [finding('app/a.rb', 1, `defect ${lens}`, 'minor')] })
  const { result, logs } = await run({}, { find })
  assert.deepEqual(result.lensesNotCovered, ['loose ends'])
  assert.ok(logs.some(line => line.includes('No result from: loose ends')))
  assert.match(result.report, /from 3 of 4 lenses/)
})

await test('a reviewer that could not read the change is not counted as a clean lens', async () => {
  const find = lens => (lens === 'other callers' ? { base: '', findings: [], blocked: 'git diff was refused: This command requires approval' } : { base: 'abc123', findings: [] })
  const { result, logs } = await run('base=abc123', { find })
  assert.deepEqual(result.lensesNotCovered, ['other callers'])
  assert.ok(logs.some(line => line.includes('other callers') && line.includes('requires approval')))
  assert.match(result.report, /from 3 of 4 lenses/)
  assert.match(result.report, /Not covered: other callers \(git diff was refused: This command requires approval\)/)
  assert.ok(!/No reviewer reported a finding\.$/.test(result.report))
})

await test('when no reviewer could read the change the report says the review did not happen', async () => {
  const { result, calls } = await run('', { find: () => ({ base: '', findings: [], blocked: 'not a git repository' }) })
  assert.equal(calls.length, 4)
  assert.equal(result.lensesNotCovered.length, 4)
  assert.match(result.report, /This review did not happen/)
})

await test('a merge that drops or invents a finding is ignored: findings are verified unmerged, important first', async () => {
  const { result, calls, logs } = await run('verify=3', { merge: () => ({ issues: [{ members: [0, 1], lead: 5 }] }) })
  assert.ok(logs.some(line => line.includes('no usable grouping')))
  assert.equal(calls.filter(call => call.label.startsWith('verify')).length, 3)
  assert.ok(result.confirmed.every(row => row.severity === 'important'))
  assert.equal(result.confirmed.length + result.unverified.length, 8)
})

await test('without a base the finders are told to find it and the verifiers get the one they found', async () => {
  const { calls, result } = await run('')
  assert.ok(calls.filter(call => call.label.startsWith('find:')).every(call => call.prompt.includes('find the base')))
  assert.ok(calls.filter(call => call.label.startsWith('verify')).every(call => call.prompt.includes('base abc123')))
  assert.equal(result.base, 'abc123')
})

console.log(`${passed} passed${process.exitCode ? ', some failed' : ''}`)
