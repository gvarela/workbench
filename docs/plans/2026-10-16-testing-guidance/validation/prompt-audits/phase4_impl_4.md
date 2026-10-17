# Prompt audit: phase4_impl_4 (wb:test-reviewer agent)

- **Task**: `prompts-9yda`, create `plugin/agents/test-reviewer.md` per tasks.md Phase 4 Changes Required 4 (design D8a)
- **Run**: 2026-10-17, `/claude-api prompt-audit plugin/agents/test-reviewer.md`
- **Base commit**: `342bdaa` (the file is new and untracked in the testing-guidance worktree)

## Assumptions

- **Scope**: all of `plugin/agents/test-reviewer.md` (new file). Read alongside: its preloaded skill `plugin/skills/test-quality/SKILL.md` and that skill's `reference.md`, `plugin/agents/task-verifier.md` (shared planted-defect and Test Integrity text), and `plugin/agents/test-writer.md` (report fields).
- **Target model**: Claude Opus 5.5 at `effort: high`. The frontmatter pins `model: opus`.
- **Surface type**: coding-agent configuration (one subagent definition plus its preloaded skill). No request-building code, tool definitions, or non-Anthropic provider markers. Groups 3 and 4 are not applicable.
- **Design source**: tasks.md Phase 4 Changes Required 4; design.md D6 (revised), D7, D8 (table and D8a), D9, the Data Model's Review finding, and the Non-Functional Requirements cost line; tasks.md Phase 5 Changes Required 1, 2 and 4.
- **Load-bearing (keep-list)**: the frontmatter as is (static check 4: `model: opus`, `effort: high`, `skills: [test-quality]`, `tools: Read, Grep, Glob, Bash`); the planted-defect block shared in shape with task-verifier; the proposals-only stance and the report's statement that it carries no pass or fail status; the Test Integrity rules reused from task-verifier.
- **Provenance**: the whole file is this task's.

## Summary

The file follows D8a's five steps, the write-safety rule, and the staged mutation policy, and it keeps the output a set of proposals with no status marker. The highest-impact problem was the majority-of-three rule. The draft told the reviewer to make the three judgments itself, "each from a fresh reading", and its template asked for "Majority: n of 3". Three readings in one context are not independent judgments, which is what D7 and test-quality Part 4 require, and the design does not ask one agent to supply them: D8a sizes the review as "one agent" and "one Opus review per phase", and the cost line says "one Opus test-reviewer run per phase (more when majority-of-three judgments apply)", so the extra judgments are extra runs, and only the spawner can start them (the reviewer has no Agent tool). The reviewer now reports judgment-only Remove or Rewrite verdicts under a new Majority Candidates section for its caller to settle, never claims a majority, and accepts an optional Candidates input so a caller can get a further judgment on just those tests without a full re-review. Second, the fallback copy for tests that need ignored files copied the working tree, uncommitted changes included, while the review range is `<start>..HEAD`; it now resets tracked files to HEAD (checked in a scratch repository). Third, the inline escalation rule now names the same protection defects the verifier's Boundaries treat as never minor, so the two agents grade a declared loosened assertion the same way.

Counts per group:

- Group 1 (dated prompt text): 0 high, 0 medium, 1 low
- Group 2 (brittle skill and configuration files): 1 high, 3 medium, 5 low
- Group 3 (tool descriptions): not applicable
- Group 4 (request config and architecture): not applicable

Totals: 1 high, 3 medium, 6 low (flag).

## Specific checks

- **(a) Majority-of-three**: finding 1. What the design says: D7 (design.md:258) "Judgment-only Remove or Rewrite verdicts are confirmed by a majority of three independent judgments before they are reported as findings", silent on who supplies them. D8 table (:280) "Bounded: one agent"; D8a trade-off (:311) "one Opus review per phase"; Non-Functional Requirements (:570) "one Opus test-reviewer run per phase (more when majority-of-three judgments apply)". So the design puts the further judgments in further reviewer runs, which the coordinator spawns. Self-judging in one context contradicted that and the word "independent". tasks.md Phase 5 Changes Required 2 (Step 8) and 3 spawn `wb:test-reviewer` once and have no step for settling candidates, and Changes Required 4 (validate_execution) has none either: that gap belongs to Phase 5 (finding 10).
- **(b) Spec fidelity**: inputs match Changes Required 4, with "task integrity flags" read as the verifiers' Test Integrity findings (D6 revised dropped the flag checklist; the verifier's section lists findings with file:line, escalated or not). Procedure steps 1-5 match D8a 1-5; mutation Level 1 is advisory and opt-in; the output has findings plus integrity counts and no status marker. The worker's two additions are justified and kept:
  - *Test-writer reports as an optional inline-mode input*: D8a step 5 and D9 say the inline review runs D6's integrity checks, and one of them (every test change covered by a test-writer report) cannot run without the reports. The spec's input list omitted them; the agent lists the check under Not Run when they are absent. Keep.
  - *Range `<start>..HEAD`, uncommitted changes reported as outside it*: both coordinators commit per task, so at a checkpoint the tree should be clean; reviewing committed history keeps red-commit comparisons exact and planted defects reproducible, and naming any uncommitted changes keeps them visible to the person. Keep. The fallback copy did not honor the range; fixed (finding 3).
- **(c) Consistency with task-verifier**: the planted-defect block, break and result rules, and the cannot-run fallback match the verifier's text, minus the verifier's patch and untracked-file lines, which are correct to drop because the reviewer reviews committed HEAD. Test Integrity's outer-test and report-coverage rules match Step 5 verbatim in substance; the reviewer diffs against HEAD where the verifier diffs against the working tree, again following the range. The escalation definition was narrower than the verifier's never-minor list; fixed (finding 4). The verifier scopes test-quality's verdicts and three-judgment rule to reviewers (task-verifier.md:144); the reviewer applies the verdicts and hands the majority to its caller, so the two agree.
- **(d) Status-marker hygiene**: no `### Status:` anywhere in the file (static check 2 passes). The report says it carries no pass or fail status, the Findings section opens "These are proposals", and Majority Candidates are labelled as unsettled.
- **(e) Project-agnostic**: a grep for decision, AC and metric labels, weakness ids, phase numbers, fixtures, trials, `prompts-` ids, repository names, and `validation/` finds nothing. `red(<criterion id>)`, research's Testing Conventions, and `.claude/wb/testing.md` are wb's own runtime contracts.

## Findings

| # | Location | Evidence | Pattern | Why it does not fit | Confidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `test-reviewer.md:12`, template :114, :119 (before) against `test-quality/SKILL.md:83`, design.md :258, :280, :311, :570 | "You cannot spawn other judges, so make the three judgments yourself, each from a fresh reading"; "**Majority**: ${n} of 3"; "judgment-only (… "no majority")" | Group 2, instruction files that contradict each other (agent vs skill and design) | Readings in one context are not independent, so a "3 of 3" here would present a single judgment as a confirmed majority, the noise Part 4 exists to filter. The design budgets further runs for majority judgments, and only the spawner can start them | High | `rewrite` (applied): :12 now says the caller settles the rule and the reviewer reports each judgment-only Remove or Rewrite under Majority Candidates without claiming a majority; template gains a Majority Candidates section, drops the Majority field, and Review These no longer cites "no majority"; new optional Candidates input (:27, :31) for further judgments on just those tests |
| 2 | `test-reviewer.md:3` | "Spawned by /wb:implement and /wb:implement_inline at each phase checkpoint." | Group 2, volatile specifics (caller list contradicted by the plan) | D8a "Used by" and tasks.md Phase 5 Changes Required 4 also have `validate_execution` spawn `wb:test-reviewer` (static check 11 asserts it) | Medium | `rewrite` (applied): "…at each phase checkpoint, and by /wb:validate_execution." |
| 3 | `test-reviewer.md:55` (before :52) | "replace the `worktree add` line with a plain copy that leaves out `.git`, `tar -C "$top" --exclude=.git …`" | Group 2, fragile operation under-specified | The copy carries uncommitted changes, so a planted defect would run against a tree that is not HEAD, contradicting :33 and :41 | Medium | `rewrite` (applied): add `git -C "$top" archive HEAD \| tar -xf - -C "$tmp"` after the copy. Scratch-repository run: the copy held HEAD's file with the ignored file kept, the break failed the test on an `AssertionError`, and the working tree kept its uncommitted change |
| 4 | `test-reviewer.md:85` (before :82) against `task-verifier.md:233` | "Mark a finding escalated when it is one the per-task gate fails (a changed outer test, an undeclared change, or a test that does not protect its criterion)" | Group 2, shared rule stated differently in two always-paired agents | The verifier spells out that a loosened assertion, an expected value computed by the code under test, a skipped or deleted guard, and a missed planted defect all fail the gate. The shorter list left room to clear a declared loosened assertion in inline mode that implement mode would FAIL | Medium | `rewrite` (applied): names those four, "declared or not" |
| 5 | `test-reviewer.md:67` | "Run only tools already installed in the project and never install anything, because …" | Group 1c, duplication (restates reference.md Method step 1) | Agrees with the skill and carries a reason; keep-list 8 | Low | `flag` (no edit) |
| 6 | `test-reviewer.md:25` | "**Conventions**: take them in the order the test-quality skill gives (…)" | Group 2, duplication | Restates the skill's order in a parenthesis after saying to follow it. Agrees; keep-list 8 | Low | `flag` (no edit) |
| 7 | `test-reviewer.md:26` | "**Mode**: `implement` or `inline`" | Group 2, possible under-specification | A `validate_execution` caller must pick a mode for a plan it did not run. Phase 5 Changes Required 4 owns that prompt | Low | `flag` |
| 8 | `test-reviewer.md:41` procedure | one planted defect per criterion-guarding test across the phase | Group 2, budget | D8 sizes the review as one agent within ~70 tool calls. A phase with many guarding tests could approach it. Only a Phase 5 run measures it | Low | `flag` |
| 9 | `test-reviewer.md:59` | "run it at HEAD to confirm it is green now" | Group 2, possible under-specification | Run in the working tree, an uncommitted change could affect the result. Uncommitted changes are reported at :33, and the planted-defect block shows how to run at HEAD | Low | `flag` |
| 10 | tasks.md Phase 5 Changes Required 1-4 | Step 8 "spawn `wb:test-reviewer` with the phase's starting commit (mode `implement`)"; inline "spawns `wb:test-reviewer` (mode `inline`)" | Out of scope (plan text) | No coordinator step settles Majority Candidates (two further reviewer runs with the Candidates input, then report the ones with 2 or 3 of 3 as findings, the rest as review-these). Without it, judgment-only Remove or Rewrite never become findings, which is safe but drops the design's majority path | Low | `flag` (plan file not edited; for Phase 5) |

## Dispositions

- **1 (high)**: applied. This resolves the Group 2 conflict in the design's direction: the coordinator, which can spawn, supplies the further independent judgments; the reviewer proposes candidates and never claims a majority. The Candidates input is the smallest addition that lets a coordinator do that without two full re-reviews; Phase 5 decides whether to use it (finding 10). No prohibition is loosened: a single judgment still cannot become a Remove or Rewrite finding.
- **2 (medium)**: applied.
- **3 (medium)**: applied, verified in a scratch repository.
- **4 (medium)**: applied.
- **5-10 (low)**: recorded only; no edits. Finding 10 concerns tasks.md Phase 5, which this task does not edit.
- **Keep-list**: frontmatter unchanged and still matches static check 4. The planted-defect block, the proposals-only stance, the no-status report, and the Test Integrity rules reused from task-verifier are kept; static check 5's rubric phrases do not appear in the file.

## Verifier FAIL and fix (2026-10-17)

The task-verifier failed the task on the planted-defect block. Three issues, all reproduced in a scratch repository under bash and zsh with the verifier's harness (`drive.py` runs one block from a subdirectory of a repo with an uncommitted change, then checks the working tree's status and file hashes, `git worktree list`, and leftover temp directories).

| # | Severity | Location | Issue | Fix |
| --- | --- | --- | --- | --- |
| 1 | Critical | `test-reviewer.md:51` (before :49) | `cmp -s "$top/<file>" "$tmp/<file>"` compared the working-tree file with the HEAD copy. With an uncommitted change to the guarded file the two always differ, so a break that changed nothing looked applied, the test passed, and the reviewer would file a false deterministic Rewrite finding | `git -C "$top" show HEAD:<file> \| cmp -s - "$tmp/<file>"`, with a trailing comment naming the reason (compare with HEAD, not the working tree) |
| 2 | Minor | `test-reviewer.md:57` (before :55) | The fallback's `git archive HEAD` reset restores tracked files only, so an untracked, non-ignored file (an untracked `conftest.py` that re-patched the subject) stayed in the copy and hid a break | Added `git -C "$top" ls-files --others --exclude-standard -z \| (cd "$tmp" && xargs -0 rm -f)` after the archive line; the bullet says why (the archive restores only tracked files) |
| 3 | Minor | `test-reviewer.md:46` and `task-verifier.md:130` | `trap … EXIT` only. Under zsh, a SIGTERM mid-run left a registered worktree and its temp directory behind; bash cleaned up | `cleanup()` defined once, `trap cleanup EXIT`, and `trap 'exit 130' INT TERM HUP` so a signal exits through the EXIT trap. The cleanup is idempotent (`worktree remove` errors are silenced, `rm -rf` tolerates a missing path), so a second run is harmless. The prose now says "even when a step fails or the call is interrupted". `task-verifier.md` is committed (342bdaa); this one-line hardening is a deliberate exception so the AC-5 trials run with it. Its `cmp` line is unchanged because its copy deliberately carries the uncommitted changes |

The RED run, before the fix: the no-op break (`sed 's/>= 999/> 999/'`) on a repository with an uncommitted change to `calc.py` exited 0 with `2 passed` under both shells.

### Scenario results

Blocks were generated from the edited agent text (placeholders filled, nothing else), and each run was from `repo/sub`. "Before" is the block as the verifier found it; "after" is the fixed block. Every run, before and after, left the working tree's status and file hashes unchanged.

| Scenario | Before (bash) | Before (zsh) | After (bash) | After (zsh) |
| --- | --- | --- | --- | --- |
| Reviewer: dirty guarded file, no-op break | exit 0, `2 passed` (bug) | exit 0, `2 passed` (bug) | exit 1, `break did not apply` | exit 1, `break did not apply` |
| Reviewer: real break, dirty guarded file | not run | not run | `AssertionError`, 1 failed 1 passed (HEAD's code) | same |
| Reviewer: real break, other file dirty | `AssertionError` | `AssertionError` | `AssertionError`, 1 failed 1 passed | same |
| Reviewer: clean guarded file, no-op break | `break did not apply` | `break did not apply` | `break did not apply` | same |
| Reviewer: mid-step failure (`exit 7`) | exit 7, cleaned up | exit 7, cleaned up | exit 7, cleaned up, 1 worktree entry, no temp dirs | same |
| Reviewer: SIGTERM mid-run | cleaned up | **2 worktree entries, temp dir left** | exit 130, cleaned up, 1 worktree entry, no temp dirs | exit 130, cleaned up, 1 worktree entry, no temp dirs |
| Reviewer fallback: ignored file the code imports, real break | `AssertionError` (ignored file kept) | same | `AssertionError`, 1 failed 1 passed; HEAD's `import localdep` ran, so the ignored file was kept | same |
| Reviewer fallback: dirty guarded file, no-op break | exit 0, `2 passed` (bug) | same | exit 1, `break did not apply` | same |
| Reviewer fallback: untracked `conftest.py` re-patching the subject, real break | exit 0, `2 passed` (break hidden) | same | `AssertionError`, 1 failed 1 passed (conftest removed) | same |
| Verifier: normal run, real break | `AssertionError` | `AssertionError` | `AssertionError`, 1 failed 1 passed | same |
| Verifier: mid-step failure | exit 7, cleaned up | exit 7, cleaned up | exit 7, cleaned up | same |
| Verifier: SIGTERM mid-run | cleaned up | worktree left (same trap as the reviewer's) | exit 130, cleaned up, 1 worktree entry, no temp dirs | same |

### Checks

- `static-checks.sh`: checks 3, 5 and 17 pass; the failing set is unchanged (2, 4, 6, 11, 12, 13, 15, all owned by later tasks).
- `./plugin/scripts/lint plugin/agents/test-reviewer.md plugin/agents/task-verifier.md`: clean.
- `claude plugin validate ./plugin`: passed.
- `git status`: only `plugin/agents/task-verifier.md` (modified), `plugin/agents/test-reviewer.md` (new) and this report are touched.

### Re-verification note and last fix (coordinator, 2026-10-17)

Re-verification passed, with one new minor issue. A staged new file, added with `git add` but not in HEAD, survived the fallback reset, because `ls-files --others` lists only untracked files. A staged `conftest.py` that re-patched the subject hid a break on the fallback path.

The coordinator applied the verifier's suggested fix at `test-reviewer.md:57`: delete untracked files and files added since HEAD (`git diff --name-only --diff-filter=A -z HEAD`). The prose now says "untracked or newly added files". Results:

- The staged probe now fails on an assertion on both the fallback and the worktree path, under bash and zsh.
- The full scenario matrix was re-run: 24 runs, 12 scenarios × 2 shells. Every result was correct.
- In every run the working tree, the file hashes, the worktree list, and the temp directories were clean.
