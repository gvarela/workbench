import { describe, expect, test } from 'claude-code/testing'

import {
  bandLines,
  buildModel,
  chooseByActivity,
  latestPin,
  newestByName,
  paneSections,
  parseFrontmatter,
  parseWorktrees,
  pinFromPrompt,
  planPathIn,
  statusLine,
  worktreeName,
} from '../hooks/model.mjs'

// Two plans in one checkout: "older" sorts first by name, "newer" last. A
// third plan lives in a linked worktree, which has its own docs/plans.
const MAIN = '/repo'
const TREE = '/repo/.claude/worktrees/feature'

function tasksMd(project: string, prefix: string) {
  return `---
project: ${project}
status: in-progress
created: 2026-01-01
beads_epic: ${prefix}-epic
beads_phases:
  phase1_milestone: ${prefix}-m1
beads_tasks:
  phase1_impl_1: ${prefix}-t1
  phase1_impl_2: ${prefix}-t2
---
`
}

type Issue = { id: string; title: string; status: string; parent?: string; issue_type?: string; updated_at?: string }

function planIssues(prefix: string, working: boolean, at: string | undefined): Issue[] {
  const stamp = at === undefined ? {} : { updated_at: at }
  return [
    { id: `${prefix}-epic`, title: 'Epic', status: 'open', issue_type: 'epic', ...stamp },
    { id: `${prefix}-m1`, title: 'Phase 1 Milestone', status: 'open', parent: `${prefix}-epic`, ...stamp },
    { id: `${prefix}-t1`, title: `First ${prefix} task`, status: working ? 'in_progress' : 'open', parent: `${prefix}-epic`, ...stamp },
    { id: `${prefix}-t2`, title: `Second ${prefix} task`, status: 'open', parent: `${prefix}-epic`, ...stamp },
  ]
}

type World = {
  root: string
  files: Record<string, string>
  issues: Issue[]
  worktrees?: string[]
  messages?: unknown[]
}

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 200,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

const PANE_PROPS = { title: 'wb status', isFocused: false, bodyColumns: 160, placement: 'inline', scroll: { offset: 0, bodyRows: 60 }, view: {} } as const

/** Stands for the engine: a file tree, git, and bd over `world`; records where git ran. */
function stage(on: any, world: World) {
  const gitCwds: string[] = []
  const files = world.files
  const isDir = (path: string) => Object.keys(files).some(file => file.startsWith(`${path}/`))
  on('session.root', () => ({ value: world.root }))
  on('session.cwd', () => ({ value: world.root }))
  on('session.surfaces', () => ({ value: ['terminal'] }))
  on('session.messages', () => ({ value: world.messages ?? [] }))
  on('fs.exists', ($: unknown, e: { path: string }) => ({ value: e.path in files || isDir(e.path) }))
  on('fs.read', ($: unknown, e: { path: string }) => ({ value: files[e.path] ?? '' }))
  on('fs.list', ($: unknown, e: { path: string }) => {
    const names = new Set<string>()
    for (const file of Object.keys(files)) {
      if (!file.startsWith(`${e.path}/`)) continue
      const rest = file.slice(e.path.length + 1)
      if (rest.includes('/')) names.add(rest.split('/')[0])
    }
    return { value: [...names].map(name => ({ name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('process.run', ($: unknown, e: { argv: readonly string[]; init?: { cwd?: string } }) => {
    const argv = e.argv.filter(arg => arg !== '--no-optional-locks')
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '' } })
    if (argv[0] === 'git' && argv[1] === 'worktree') {
      if (world.worktrees === undefined) return { value: { exitCode: 128, stdout: '', stderr: 'not a git repository' } }
      return ok(world.worktrees.map(tree => `worktree ${tree}\nHEAD abc\nbranch refs/heads/x\n`).join('\n'))
    }
    if (argv[0] === 'git' && argv[1] === 'rev-parse') {
      const trees = [...(world.worktrees ?? [world.root])].sort((a, b) => b.length - a.length)
      return ok(`${trees.find(tree => String(e.init?.cwd).startsWith(`${tree}/`)) ?? world.root}\n`)
    }
    if (argv[0] === 'git' && argv[1] === 'log') {
      gitCwds.push(String(e.init?.cwd))
      return ok('')
    }
    if (argv[0] === 'bd' && argv[1] === 'list') {
      const at = (flag: string) => argv[argv.indexOf(flag) + 1]
      let list = world.issues
      if (argv.includes('--parent')) list = list.filter(issue => issue.parent === at('--parent'))
      else if (argv.includes('--id')) list = list.filter(issue => at('--id').split(',').includes(issue.id))
      else if (argv.includes('--status')) list = list.filter(issue => issue.status !== 'closed')
      return ok(JSON.stringify(list))
    }
    if (argv[0] === 'bd' && argv[1] === 'comments') return ok('[]')
    return ok('')
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 22, 14, 5) }))
  on('clock.after', () => ({ value: undefined }))
  on('clock.every', () => ({ value: undefined }))
  on('prompt.submit', ($: unknown, e: { text: string }) => ({ text: e.text }))
  on('tool.call', { tool: 'Skill' }, () => ({ result: { success: true }, text: 'Launching skill' }))
  // Stands for the engine's own band: nothing of its own to draw.
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return Text({ children: [' '] })
  })
  return { gitCwds }
}

/** The band's progress line and the pane's Plan section, as drawn. */
async function look($: any) {
  const band = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const texts = (await band.findAll({ type: 'Text' })).map((one: { text: string }) => one.text)
  await band.unmount()
  const pane = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'Pane', requestId: 'wb-status', props: PANE_PROPS })
  const rows = (await pane.findAll({ type: 'Text' })).map((one: { text: string }) => one.text)
  await pane.unmount()
  return { band: texts.join(''), pane: rows }
}

const read = ($: any) => $.command.run({ command: 'wb-status', args: '' })

// Two plans in the session's own checkout; "newer" has the work in progress,
// so every guess lands on it and only a pin can choose "older".
function twoPlans(): World {
  return {
    root: MAIN,
    files: {
      [`${MAIN}/docs/plans/2026-01-01-older/tasks.md`]: tasksMd('older-plan', 'ol'),
      [`${MAIN}/docs/plans/2026-03-01-newer/tasks.md`]: tasksMd('newer-plan', 'nw'),
    },
    issues: [...planIssues('ol', false, '2026-01-02T00:00:00Z'), ...planIssues('nw', true, '2026-03-02T00:00:00Z')],
  }
}

describe('pinning a plan', () => {
  test('a typed /wb:implement pins its plan, though another plan is newer and busier', async ($, on) => {
    stage(on, twoPlans())
    await read($)
    expect((await look($)).band).toMatch(/^.*Plan: newer-plan \(guessed\)/)

    await $.prompt.submit({ text: '/wb:implement docs/plans/2026-01-01-older/ 2' })
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: older-plan · Phase 1\/1/)
    expect(seen.band.includes('(guessed)')).toBe(false)
    expect(seen.pane[0]).toBe('Plan')
    expect(seen.pane.some(row => /^Pinned by \/wb:implement at \d\d:\d\d\.$/.test(row))).toBe(true)
    expect(seen.pane).toContain('docs/plans/2026-01-01-older')
  })

  test('a Skill tool call pins its plan', async ($, on) => {
    stage(on, twoPlans())
    await $.tool.call({ tool: 'Skill', tool_use_id: 'call-1', skill: 'wb:implement', args: 'docs/plans/2026-01-01-older 1' })
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: older-plan · /)
    expect(seen.pane.some(row => row.startsWith('Pinned by /wb:implement'))).toBe(true)
  })

  test('the latest wb invocation wins, and a non-wb one changes nothing', async ($, on) => {
    stage(on, twoPlans())
    await $.prompt.submit({ text: '/wb:implement docs/plans/2026-03-01-newer 1' })
    await $.tool.call({ tool: 'Skill', tool_use_id: 'call-2', skill: 'wb:validate_execution', args: 'docs/plans/2026-01-01-older' })
    await $.tool.call({ tool: 'Skill', tool_use_id: 'call-3', skill: 'other:thing', args: 'docs/plans/2026-03-01-newer' })
    await $.prompt.submit({ text: 'look at docs/plans/2026-03-01-newer please' })
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: older-plan · /)
    expect(seen.pane.some(row => row.startsWith('Pinned by /wb:validate_execution'))).toBe(true)
  })

  test('/wb-status <plan dir> pins a plan and /wb-status auto clears the pin', async ($, on) => {
    stage(on, twoPlans())
    const pinned = await $.command.run({ command: 'wb-status', args: 'docs/plans/2026-01-01-older' })
    expect(pinned.text).toBe('wb-status: pinned docs/plans/2026-01-01-older.')
    let seen = await look($)
    expect(seen.band).toMatch(/Plan: older-plan · /)
    expect(seen.pane.some(row => row.startsWith('Pinned by /wb-status'))).toBe(true)

    const missing = await $.command.run({ command: 'wb-status', args: 'docs/plans/2026-09-09-nowhere' })
    expect(missing.text).toBe("wb-status: no tasks.md under docs/plans/2026-09-09-nowhere in this session's worktrees.")
    expect((await look($)).band).toMatch(/Plan: older-plan · /)

    const cleared = await $.command.run({ command: 'wb-status', args: 'auto' })
    expect(cleared.text).toBe('wb-status: plan pin cleared; the plan is guessed again.')
    seen = await look($)
    expect(seen.band).toMatch(/Plan: newer-plan \(guessed\) · /)
    expect(seen.pane.some(row => row.startsWith('Guessed from beads activity: an issue in progress under its epic (nw-t1)'))).toBe(true)
  })

  test('a resumed process restores the pin from the transcript', async ($, on) => {
    stage(on, {
      ...twoPlans(),
      messages: [
        { role: 'user', text: '<command-name>/wb:implement</command-name>\n<command-args>docs/plans/2026-03-01-newer 1</command-args>', toolUses: [] },
        { role: 'assistant', text: '', toolUses: [{ tool_use_id: 'u1', tool: 'Skill', input: { skill: 'wb:implement', args: 'docs/plans/2026-01-01-older 2' } }] },
      ],
    })
    on('session.start', ($: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
    on('command.register', () => ({ value: undefined }))
    await $.session.start({ cwd: MAIN, surface: 'terminal', isInteractive: true })
    await read($)
    expect((await look($)).band).toMatch(/Plan: older-plan · /)
  })
})

describe('guessing a plan', () => {
  test('with no pin, the plan with an issue in progress under its epic wins, marked guessed', async ($, on) => {
    const world = twoPlans()
    // The older plan is the busy one now.
    world.issues = [...planIssues('ol', true, '2026-01-02T00:00:00Z'), ...planIssues('nw', false, '2026-03-02T00:00:00Z')]
    stage(on, world)
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: older-plan \(guessed\) · /)
    expect(seen.pane.some(row => row === 'Guessed from beads activity: an issue in progress under its epic (ol-t1).')).toBe(true)
  })

  test('with no beads activity, the newest directory name wins, marked guessed', async ($, on) => {
    const world = twoPlans()
    world.issues = [...planIssues('ol', false, undefined), ...planIssues('nw', false, undefined)]
    stage(on, world)
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: newer-plan \(guessed\) · /)
    expect(seen.pane).toContain('Guessed from the newest plan directory name: no plan has beads activity.')
  })
})

// The session runs in the main checkout; the plan being implemented and its
// code live in a linked worktree with its own docs/plans.
function mainAndWorktree(): World {
  return {
    root: MAIN,
    worktrees: [MAIN, TREE],
    files: {
      [`${MAIN}/docs/plans/2026-02-01-main/tasks.md`]: tasksMd('main-plan', 'mn'),
      [`${TREE}/docs/plans/2026-01-15-feature/tasks.md`]: tasksMd('feature-plan', 'ft'),
    },
    issues: [...planIssues('mn', false, '2026-02-02T00:00:00Z'), ...planIssues('ft', true, '2026-01-16T00:00:00Z')],
  }
}

describe('worktrees', () => {
  test('a plan pinned by a path that exists only in a worktree is found there, and git reads run there', async ($, on) => {
    const world = mainAndWorktree()
    // Nothing in progress anywhere: only the pin can choose the worktree plan.
    world.issues = [...planIssues('mn', false, '2026-02-02T00:00:00Z'), ...planIssues('ft', false, '2026-01-16T00:00:00Z')]
    const { gitCwds } = stage(on, world)
    await $.prompt.submit({ text: '/wb:implement docs/plans/2026-01-15-feature 1' })
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: feature-plan \(worktree feature\) · /)
    expect(seen.pane).toContain('feature-plan (worktree feature)')
    expect(gitCwds.at(-1)).toBe(TREE)
  })

  test('a pin naming the worktree path from the main checkout resolves too', async ($, on) => {
    const { gitCwds } = stage(on, mainAndWorktree())
    await $.tool.call({ tool: 'Skill', tool_use_id: 'call-4', skill: 'wb:implement', args: '.claude/worktrees/feature/docs/plans/2026-01-15-feature 2' })
    await read($)
    expect((await look($)).band).toMatch(/Plan: feature-plan \(worktree feature\) · /)
    expect(gitCwds.at(-1)).toBe(TREE)
  })

  test('discovery picks the worktree plan with work in progress over the main checkout plan without', async ($, on) => {
    const { gitCwds } = stage(on, mainAndWorktree())
    await read($)
    const seen = await look($)
    expect(seen.band).toMatch(/Plan: feature-plan \(guessed\) \(worktree feature\) · /)
    expect(seen.pane.some(row => row === 'Guessed from beads activity: an issue in progress under its epic (ft-t1).')).toBe(true)
    expect(gitCwds.at(-1)).toBe(TREE)
  })

  test('a session whose root is a worktree reads that worktree\'s plans', async ($, on) => {
    const { gitCwds } = stage(on, {
      root: TREE,
      files: { [`${TREE}/docs/plans/2026-01-15-feature/tasks.md`]: tasksMd('feature-plan', 'ft') },
      issues: planIssues('ft', true, '2026-01-16T00:00:00Z'),
    })
    await read($)
    expect((await look($)).band).toMatch(/Plan: feature-plan \(guessed\) \(worktree feature\) · /)
    expect(gitCwds.at(-1)).toBe(TREE)
  })
})

describe('the bar', () => {
  test('filled cells are blue accent text, not a background', async ($, on) => {
    const world = twoPlans()
    world.issues = world.issues.map(issue => (issue.id === 'nw-t1' ? { ...issue, status: 'closed' } : issue))
    stage(on, world)
    await read($)
    const band = await $.ui.mount({ plugin: 'wb-status', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
    const filled = await band.find({ type: 'Text', text: /^█+$/ })
    expect(filled?.text).toBe('█████')
    expect(filled?.props.color).toBe('permission')
    expect(filled?.props.backgroundColor).toBeUndefined()
    const empty = await band.find({ type: 'Text', text: /^░+$/ })
    expect(empty?.props.color).toBe('inactive')
    expect(empty?.props.backgroundColor).toBeUndefined()
    await band.unmount()
  })
})

describe('selection helpers', () => {
  test('a plan path is found in arguments, with whatever leads it', () => {
    expect(planPathIn('docs/plans/2026-01-01-x/ 2')).toBe('docs/plans/2026-01-01-x')
    expect(planPathIn('./docs/plans/a')).toBe('docs/plans/a')
    expect(planPathIn('/abs/repo/docs/plans/a/tasks.md')).toBe('/abs/repo/docs/plans/a')
    expect(planPathIn('.claude/worktrees/w/docs/plans/a continue')).toBe('.claude/worktrees/w/docs/plans/a')
    expect(planPathIn('continue')).toBe(null)
  })

  test('a prompt pins from its command, or from a typed wb line', () => {
    expect(pinFromPrompt({ text: 'x', command: { name: 'wb:implement', args: 'docs/plans/a 2' } }, 5)).toEqual({ path: 'docs/plans/a', by: '/wb:implement', at: 5 })
    expect(pinFromPrompt({ text: '/wb:implement_inline docs/plans/b' }, 5)).toEqual({ path: 'docs/plans/b', by: '/wb:implement_inline', at: 5 })
    expect(pinFromPrompt({ text: 'please read docs/plans/b' }, 5)).toBe(null)
    expect(pinFromPrompt({ text: '/other docs/plans/b' }, 5)).toBe(null)
  })

  test('the transcript\'s latest wb invocation is the pin', () => {
    expect(latestPin([
      { role: 'user', text: '/wb:create_tasks docs/plans/a', toolUses: [] },
      { role: 'assistant', text: '', toolUses: [{ tool: 'Skill', input: { skill: 'wb:implement', args: 'docs/plans/b 1' } }] },
      { role: 'user', text: 'thanks', toolUses: [] },
    ], 1)).toEqual({ path: 'docs/plans/b', by: '/wb:implement', at: 1 })
    expect(latestPin([], 1)).toBe(null)
  })

  test('worktrees are parsed and named', () => {
    expect(parseWorktrees('worktree /r\nHEAD a\nbranch refs/heads/main\n\nworktree /r/.claude/worktrees/w\nHEAD b\n')).toEqual(['/r', '/r/.claude/worktrees/w'])
    expect(worktreeName('/r/.claude/worktrees/w', '/r')).toBe('w')
    expect(worktreeName('/r', '/r')).toBe(null)
    expect(worktreeName('/elsewhere/w2', '/r')).toBe('w2')
  })

  test('activity prefers in-progress work, then the latest update; names break no ties', () => {
    const a = { name: '2026-01-01-a', fm: parseFrontmatter(tasksMd('a', 'aa')) }
    const b = { name: '2026-02-01-b', fm: parseFrontmatter(tasksMd('b', 'bb')) }
    expect(chooseByActivity([a, b], [...planIssues('aa', true, '2026-01-01'), ...planIssues('bb', false, '2026-05-01')])?.candidate).toBe(a)
    expect(chooseByActivity([a, b], [...planIssues('aa', false, '2026-06-01'), ...planIssues('bb', false, '2026-05-01')])).toEqual({ candidate: a, why: 'recent', id: 'aa-m1' })
    expect(chooseByActivity([a, b], [])).toBe(null)
    expect(newestByName([a, b])).toBe(b)
  })

  test('a guessed plan says so on the band, the status line and the pane; the worktree goes first when narrow', () => {
    const fm = parseFrontmatter(tasksMd('demo', 'dm'))
    const built = buildModel({ fm, criteria: [], issues: planIssues('dm', true, '2026-01-02'), openIssues: [], commits: [], comments: {} })!
    const guessed = { ...built, selection: { kind: 'directory', planName: 'demo', dir: 'docs/plans/d', worktree: 'wt' } }
    expect(bandLines(guessed).text.progress).toBe('Plan: demo (guessed) (worktree wt) · Phase 1/1 ░░░░░░░░░░ 0/2 tasks · now: First dm task (dm-t1)')
    expect(bandLines(guessed, 85).text.progress).toBe('Plan: demo (guessed) · Phase 1/1 ░░░░░░░░░░ 0/2 tasks · now: First dm task (dm-t1)')
    expect(bandLines(guessed, 30).text.progress).toBe('demo (guessed) · Phase 1/1 0/2 tasks')
    expect(statusLine(guessed).startsWith('wb demo (guessed): phase 1/1')).toBe(true)
    expect(paneSections(guessed)[0]).toEqual({
      heading: 'Plan',
      rows: [
        'demo (worktree wt)',
        'docs/plans/d',
        'Guessed from the newest plan directory name: no plan has beads activity.',
        '/wb-status <plan dir> pins a plan; /wb-status auto goes back to guessing.',
      ],
    })
    const pinned = { ...built, selection: { kind: 'pinned', by: '/wb:implement', at: 0, planName: 'demo', dir: 'docs/plans/d', worktree: null } }
    expect(bandLines(pinned).text.progress.startsWith('Plan: demo · ')).toBe(true)
  })
})
