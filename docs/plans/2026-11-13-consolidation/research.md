---
project: consolidation
ticket: null
created: 2026-11-13
status: complete
last_updated: 2026-11-13
researcher: gabevarela
git_commit: 1ab9b7a
git_branch: 5.0-consolidation
repository: gvarela/workbench
tags: [research, sessions, consolidation]
---

# Research: The 5.0 Alpha in Real Use

## Research Question

How does the 5.0 alpha (`v5.0.0-alpha.1`) behave in real development, and what in the shipped text explains it?

## Sources

- **Sessions**, mined from local transcripts on 2026-11-13 (the transcripts and repositories are private and stay local):
  - Session A: a Python web service, 2026-11-10 to 11-13 (Phases 1 to 4 of one plan), with 10-29 to 11-05 for trend.
  - Session B: a Rails application, 2026-11-02 to 11-13 (one plan, project through Phase 2 of 3; a limits and configuration change).
  - Session C: the same Rails application, 2026-10-24 to 10-28 (a new feature with UI), for comparison.
- **Code**: the plugin at `1ab9b7a` against `origin/main` (4.0.0).
- Counts marked (checked) were re-run directly; the rest are the mining agents' counts, and failure causes lean on the verifiers' own reports.

## Session Findings

| | Session A | Session B | Session C |
| --- | --- | --- | --- |
| Task-verifier runs (FAIL) | 70 (16) | 32 (7) | 42 (14) |
| FAILs that were production defects | 3 | 0 | 7 |
| Stops that asked the person something | 20 in 4 phases | 7 in 2 phases | 3, after 5.6 h unattended |
| Worker runs on test fixes or rewrites | about 25 of 66 | 14 of 32 | 22 of 42 |
| Task-verifier share of subagent output tokens | 60% | 53% | not measured |
| Task-verifier tool calls, median / max | 51 / 73 | 43 / 63 | not measured |

### What stops asked

- Session A: none of 20 stops was declined; 7 were answered by pasting the suggested reply. Twice the person redirected: "use a fable advisor to comfirm readiness to move on", "ask a fable advisor before asking me". The coordinator then ran an advisor before each ask (20 spawns).
- Session B: all 7 stops concerned tests or records. One reply: "How me what you mean I can't make a deicsion based on what you stated. how does this affect the product" (checked). Another: "repair and use a fable advisor to help going forward."
- The 2026-11-12 checkpoint rewrite (`prompts-qhoh.12`) did not run in either session: `delegate: test upkeep` occurs 0 times in both transcripts (checked). Skills stayed as loaded before the change; agents spawned after `/reload-plugins` showed new-version output.

### What verification caught

- Production defects on feature and UI work: request-handling, authorisation, and shared-state defects (session C); a missing failure record, an unchecked generated summary, and a wrong message format (session A).
- Session B: all 7 FAILs were on code the verifier called correct; all 7 re-verifications passed first time.
- Product problems found by running the product, not by a verifier's test checks: stale user-facing copy, a registry entry the full suite found missing, a default value with little headroom (found by the coordinator's manual check), and the person's own product testing in session C.
- Manual checks returned to the system: "I'm in my phone. Run the checks." (session B); in session A the person reported that the UI did not let them perform one of the checks. The session B coordinator then ran the checks itself, including a paid call under a temporary override, without being asked again.

### Halts not at a checkpoint

- Session A: a `discovered-from` link missing from a rewrite task halted the run 2026-11-10 20:22 to 11-11 02:18 and 11-13 05:43 to 15:54. The tests had passed every check.
- Session B: a test-writer's report post was refused by the harness; it handed back "Full report: posted as a comment" in the same turn; the verifier failed the task for a missing report. Two stops, three extra workers, three extra verifier runs.
- Refused commands in session B subagents: 71 (checked), from the worktree-isolation guard on compound commands.
- Narrowed wording enforced: an import-line widening on an outer test (4.2 h), added checks beyond a criterion's quoted text (two FAILs), and literal readings of criteria recorded as `Strength: aim` (three criteria in session B).

### Mechanics

- Nested test-writer spawns launched asynchronously in every case: 77 of 77 in session A and 31 of 31 in session B, though workers passed `run_in_background: false` on 56 and 27 of them (checked). session A workers ran 19 sleep commands; session B workers ran 3 (checked).
- Every subagent returned; none hit a turn limit. One worker was killed by an API safeguard and its unposted test-writer reports were lost.
- Main-session context peaked at 964K and 914K tokens. After a compaction on 2026-11-13 the implement skill came back as 20,000 of its 43,514 characters.
- The tree fingerprint errored on all 32 session B verifications: the dependency directory is 1.7 GiB, over the script's 500 MiB cap (`plugin/scripts/test-integrity:375`).
- No `auto-continue:`, `deferred:`, or `checkpoint-auto:` record appears in the two latest sessions.

### Planning stages (session B)

- create_project's "Which of these are hard limits rather than aims?" got no answer; every line was recorded `strength: aim`.
- The design's one narrowing was put to the person in five consecutive messages and never addressed; "create tasks" was taken as approval.
- 13 criteria for 35 tasks, with concrete examples; six Harness Decisions rows, all "Use as is".

### Test samples

About 17 tests across both repositories: most use literal expected values at the criterion's level. Weak ones: CSS-class assertions declared as proxies and one hash computed from production code in an older re-baselined test (session A); one value computed from the model and one `respond_to` check (session B).

## Code Findings

| File | 4.0.0 chars | alpha chars | Lines | Longest line |
| --- | --- | --- | --- | --- |
| `plugin/` (markdown and scripts) | 382,039 | 926,134 | 14,657 | |
| `skills/implement/SKILL.md` | 21,472 | 45,033 | 441 (unchanged) | 1,569 |
| `skills/implement/reference.md` | 5,778 | 90,780 | 583 | 1,858 |
| `skills/implement_inline/SKILL.md` | 20,082 | 44,721 | 573 | 3,734 |
| `agents/task-verifier.md` | 4,705 | 49,604 | 384 | 4,448 |
| `agents/test-reviewer.md` | new | 29,044 | 211 | 1,393 |
| `agents/task-worker.md` | 3,312 | 14,780 | 88 | 2,290 |
| `agents/test-writer.md` | new | 16,157 | 89 | 4,438 |
| `docs/reference/` (four new files) | | 60,078 | | |

- The testing-guidance plan's size check counted lines (`static-checks.sh` check 1), so growth went into line length.
- A coordinator that follows its links reads about 200k characters: SKILL.md, reference.md, sub-agent-prompts.md, rules-and-intents.md, writing-for-the-user.md, non-interactive-shell.md.
- The plugin names about 26 record prefixes (`support files:`, `setup files:`, `user reply:`, `discarded:`, `deferred:`, `judged:`, `re-baseline:`, `delegation:`, `checkpoint-auto:`, `stub files:`, `not claimed:`, `fingerprint:`, `defect ledger:`, `auto-continue:`, and others).
- `agents/task-verifier.md:182` is one 4,448-character paragraph covering sanctioned rewrites: the sanction line, three delegations, the `checks:` quote, the differential, the Not claimed list, and the rule that a rewrite task with no `discovered-from` dependency is unsanctioned.
- Outer tests must be byte-identical to their red commit (design D6). Exceptions were added on top: mechanical kinds, three delegations, then `delegate: test upkeep`.
- The checkpoint (`skills/implement/SKILL.md:308-343`) presents manual checks as `${manualVerificationSteps}` from design.md. Nothing in the flow runs the product: `wb:phase-verifier` runs each criterion's outer test file and reads the diff (`agents/phase-verifier.md:67-76`); `wb:test-reviewer` reviews tests.

## Open Questions

- Which verifier checks caught the production defects (reading, running the suite, or planted defects)? This decides how much planted-defect work can move from per task to per phase.
- Whether the Nov 12 checkpoint wording changes how the person answers, once it runs in a fresh session.
