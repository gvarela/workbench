# Prompt Audit: phase5_impl_4 (prompts-jztu)

Task: validate_execution replaces its general-purpose coverage agent with `wb:test-reviewer`.

## Assumptions

- **Scope**: the lines changed since HEAD (`git diff HEAD`) in `plugin/skills/validate_execution/SKILL.md`, `sub-agent-prompts.md`, and `templates.md`, read in the context of each whole file. Contract partners read for reference only: `plugin/agents/test-reviewer.md`, `plugin/skills/implement/SKILL.md` (Step 8), `plugin/skills/implement_inline/SKILL.md`, `plugin/skills/update_status/`.
- **Target model**: Opus 5.5 at `high` for the skill (its frontmatter pins `model: opus`, `effort: high`); the review prompt is read by `wb:test-reviewer`, which also runs on Opus 5.5 at `high`.
- No non-Anthropic provider markers in scope. Group 4 (request config) is not applicable: no request-building code.

## Summary

The highest-impact finding is a stale-fact range start: the test review began at tasks.md's `git_commit`, which `/wb:update_status` rewrites at every reconciliation, so a plan reconciled after phase 1 would review only the later phases' tests. The second is a contract conflict: the reviewer prompt's "DO NOT write any files" contradicts the reviewer's own planted-defect step, which writes into a disposable worktree; Opus 5.5 reads instructions literally and could skip that step. The third is a cross-plan collision in the `red(AC-n)` fallback, since criterion ids repeat across plans.

Counts: Group 1: 1 (medium). Group 2: 4 (2 high, 2 medium). Group 3: 0. Group 4: not applicable. Low/flag: 2.

## Findings

### F1. Range start rewritten by update_status (high)

- **Location**: `plugin/skills/validate_execution/SKILL.md:104`, `sub-agent-prompts.md:31`
- **Evidence**: "The test review range starts at tasks.md's `git_commit` frontmatter value, the commit the plan was written at"; "Starting commit: [git_commit from tasks.md]"
- **Pattern**: Group 2, Volatile specifics (a claim the repository contradicts)
- **Why obsolete**: `plugin/skills/update_status/templates.md:42` writes `git_commit: [current-commit]` into tasks.md frontmatter at every reconciliation (confirmation template `update_status/SKILL.md:200`, "New git_commit"). After any mid-plan reconciliation the value is no longer the plan's first commit, so earlier phases' tests fall outside `<start>..HEAD`.
- **Action**: rewrite. Range starts at the parent of the plan's earliest commit: a task commit naming one of tasks.md's beads ids (both implement skills put the beads id in the task commit message: `implement/SKILL.md:232`, `implement_inline/SKILL.md:239`) or a `red(AC-n)` commit whose title matches one of this plan's criteria. This mirrors the resume recovery in `implement/SKILL.md:410` and `implement_inline/SKILL.md:443`, widened from phase to plan. No such commit: report the test review as not run. Say explicitly not to use `git_commit`, with the reason.

### F2. "DO NOT write any files" conflicts with the reviewer's planted defects (high)

- **Location**: `plugin/skills/validate_execution/sub-agent-prompts.md:37`
- **Evidence**: "DO NOT write any files. Return your findings as a report."
- **Pattern**: Group 2, Instruction files that contradict each other (spawn prompt against `plugin/agents/test-reviewer.md:41-57`, which plants defects by editing files in a disposable worktree)
- **Why obsolete**: the agent definition forbids edits only in the working tree and requires writes in a temporary worktree; the blanket caps prohibition, read literally by Opus 5.5, can suppress step 1's planted-defect check, which is the reviewer's main deterministic evidence. Also Group 1a: caps emphasis with no reason.
- **Action**: rewrite to "Do not edit any file in the working tree; planted defects go in a disposable worktree, as your definition says. Return your findings as a report." The other three prompts keep their line: their agents write nothing.

### F3. `red(AC-n)` commits are not plan-unique (medium)

- **Location**: `SKILL.md:104` (fallback), `sub-agent-prompts.md:33`
- **Evidence**: "use the parent of the earliest `red(AC-n)` commit in `git log`"; "Red commits: [red(AC-n) commits from git log]"
- **Pattern**: Group 2, Volatile specifics
- **Why obsolete**: criterion ids (`AC-n`) are numbered within each plan's tasks.md (`create_tasks/SKILL.md:89`), so the earliest `red(AC-1)` in a repository with an earlier plan belongs to that plan, pulling its whole history into the range and its red commits into the coverage check.
- **Action**: rewrite: match red commits by title against this plan's criteria and pass only this plan's red commits in the range. Folded into the F1 hunk.

### F4. Test-writer reports never reach the reviewer (medium)

- **Location**: `SKILL.md:104`, `sub-agent-prompts.md:28-38`
- **Evidence**: the spawn passes no Test-writer reports, so the reviewer's step 5 "Coverage by reports" (`test-reviewer.md:84`) always lands under Not Run.
- **Pattern**: Group 2, contract gap between spawn and agent Inputs (`test-reviewer.md:24`)
- **Why**: `/wb:implement_inline` copies the Files, Per changed test, and Changes to earlier tests fields into the commit bodies (`implement_inline/SKILL.md:211`); `/wb:implement` does not record them in git. Recovering them is a `git log` read, so the check can run for inline-implemented plans.
- **Action**: add. Pass the fields from the range's commit bodies only when every task commit in the range carries them; otherwise pass none. A partial set would make the implement-run commits' test changes read as undeclared, and the reviewer escalates undeclared changes. Template line `Test-writer reports: [... or "none recorded"]` added to the prompt.

### F5. BARRIER 2 does not cover the settling spawns (medium)

- **Location**: `SKILL.md:108`
- **Evidence**: "every validation agent has returned ... the report synthesizes all four sets of findings"
- **Pattern**: Group 2, wrong degrees of freedom at a synchronization point
- **Why**: the new paragraph adds up to two further `wb:test-reviewer` spawns after the first review returns; the barrier named only the four agents, so the report could be written with candidates unsettled.
- **Action**: rewrite to "every validation agent, and every test-reviewer judgment on the candidates, has returned".

### F6. Reviewer's Not Run list has no slot in the report template (medium)

- **Location**: `plugin/skills/validate_execution/templates.md:62-65`
- **Evidence**: the Test Review section has Integrity, Findings, and Review these, but no place for skipped checks.
- **Pattern**: Group 2, contract gap (reviewer output `test-reviewer.md:142-143`)
- **Why**: with F4, coverage by reports is Not Run for every implement-run plan, and criterion steps are Not Run for plans predating 5.0.0; without a line, the validation report reads as if those checks ran.
- **Action**: add "- Not run: [checks the reviewer listed under Not Run, with reasons]".

### L1. Majority settling restates implement Step 8 (low, flag)

- **Location**: `SKILL.md:106`
- **Evidence**: the settling paragraph duplicates `implement/SKILL.md:297` nearly verbatim.
- **Pattern**: keep-list item 8 (working redundancy); the two copies agree, including the Candidates input, the third spawn only on a split, "n of 3", "review these", and the no-`model` rule matching `test-reviewer.md:27,31`. A pointer would make validate_execution depend on reading implement's SKILL.md. Flag only.

### L2. "predates 5.0.0" (low, flag)

- **Location**: `SKILL.md:104`
- **Evidence**: "A plan with no acceptance criteria predates 5.0.0"
- **Pattern**: Group 2, version pins. Kept: it is the plugin's own plan-format version, matching the fallback wording static check 15 requires in create_tasks and implement, not a model pin. Flag only.

## Requested checks

- **(a) Contract with test-reviewer.md.** Inputs: Starting commit, Criteria (with example, observed-at, seam), Red commits, Conventions, Mode are supplied; Test-writer reports now supplied when recoverable (F4); Candidates for the settling spawns. Inline is the right mode: implement mode needs each task verifier's Test Integrity section, which `/wb:implement` keeps only in the coordinator's context and never persists, so across a plan it does not exist; inline makes the reviewer run step 5 itself over the range. The range start was wrong (F1, high) and is fixed with a stable start.
- **(b) Test-writer reports.** Decided yes and applied (F4): recovered from commit bodies when every task commit in the range carries them, otherwise none, and the template now shows the reviewer's Not Run list (F6).
- **(c) Removed "Synchronization Points" list.** Nothing referenced validate_execution's list (other skills' same-named sections are their own). All three barriers remain inline at `SKILL.md:55`, `:108`, `:159`; none lost.
- **(d) Majority settling.** Matches implement Step 8 and test-reviewer's candidate mode (L1).
- **(e) Drift bundle.** help (`SKILL.md:75`, `:107`, `:245-247`) and wb-prime (`wb-prime.sh:23`, `:37`) describe validate_execution without naming its coverage agent, and the stage's existence, name, scope, and intake are unchanged. No change needed.
- **(f) Project-agnostic.** No plan, fixture, or label references in the changed lines.

## Dispositions

| Finding | Confidence | Disposition |
| --- | --- | --- |
| F1 range start rewritten by update_status | high | Applied: `SKILL.md:104`, `sub-agent-prompts.md:31` |
| F2 "DO NOT write any files" vs planted defects | high | Applied: `sub-agent-prompts.md:38` |
| F3 red commits not plan-unique | medium | Applied with F1: match by title, this plan's red commits only |
| F4 test-writer reports not passed | medium | Applied: `SKILL.md:104`, `sub-agent-prompts.md:34` |
| F5 BARRIER 2 omits settling spawns | medium | Applied: `SKILL.md:108` |
| F6 Not Run missing from template | medium | Applied: `templates.md:66` |
| L1 settling duplicates implement Step 8 | low | Recorded only (keep-list 8) |
| L2 "predates 5.0.0" | low | Recorded only |

SKILL.md is 230 lines (limit 232). No bd command lines moved; docs/beads-guide.md citations for validate_execution (`SKILL.md:75,77,78`) still hold.

### Coordinator follow-up after verification (2026-10-18)

The verifier observed that `/wb:implement_inline` writes report fields only into commits that carry tests. So the rule "every task commit in the range carries them" sent any inline plan with a test-free task to "none recorded". The coordinator narrowed the rule at `SKILL.md:104` to "every commit in the range that changes a test file carries them". This keeps the all-or-nothing guard against partial sets, which F4 depends on, without counting commits that have nothing to declare.
