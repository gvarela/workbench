# test-audit — Templates

## Scope and Estimate Message

Read this before Step 4 and fill it from Step 3. Show it before any auditor is spawned; on a large repository, end with the question and wait for the answer.

```markdown
**Test audit scope**: ${scope} in ${auditedRepository}, depth ${N tests per area | full}

| Area | Test files | Tests | Inspected at depth ${N} |
| --- | --- | --- | --- |
| ${areaPath} | ${n} | ${n} | ${min(N, tests)} |

- Triage-first (depth ${N}): ${inspected} of ${total} tests inspected, ${areas} area spawns plus up to ${2 × areas} candidate judgments = up to ${plannedSpawns} `wb:test-auditor` spawns. Cost class: ${small | medium | large} (${plannedSpawns} spawns × roughly a dollar each at Opus `high` effort; rough).
- Full (every test read): ${fullAreas} areas, up to ${fullSpawns} spawns. Cost class: ${class} (${basis}; rough).
- Triage reused the detector output and ran only `grep`, `wc`, and `git --no-optional-locks log`; nothing was installed.

${large repository only:} This is a large repository (${plannedSpawns} planned spawns, cost class large). Confirm this scope, or change it: name the areas to audit, give a smaller N, or say `full` to read every test.
```

## Test Audit Report Template

Read this in full before Step 7. Leave a section with nothing to report in place, marked "none", so the reader knows the step ran. Cite file:line for every finding and every "review these" entry.

````markdown
---
type: test-audit
scope: ${scope}
repository: ${auditedRepository}
git_commit: ${auditedCommit}
created: ${YYYY-MM-DD}
---

# Test Audit: ${scopeName}

These findings are proposals for a person to spot-check. No test was edited, deleted, or created.

## Scope

| | |
| --- | --- |
| Audited repository | ${path}, at commit ${sha} |
| Scope | ${paths, or "whole suite"} |
| Stack | ${frameworks and versions, harness per boundary, services the suite needs} |
| Conventions source | the plan's research \| `.claude/wb/testing.md` \| detection (inferred from ${files}) |
| Areas | ${n} areas, one `wb:test-auditor` each: ${area list} |
| Depth and spawns | ${N tests per area \| full}; ${planned} spawns planned, ${made} made; cost class ${class}; scope ${as proposed \| narrowed by the user to ${what}} |
| Read-only check | `git --no-optional-locks status --porcelain --ignored`, `git stash list`, `git worktree list` unchanged, the report file excepted \| changed: ${what} |
| Detector caches | ${how caches were disabled or redirected} |
| Report location | ${path}${", written in this session's repository so the audited repository stays unchanged" when it is another repository} |

## Headline

${three to six sentences: the overall state of the suite, the recurring patterns behind the findings, and the counts per verdict}

| Verdict | Deterministic | Judgment-only (n of 3) | Review these |
| --- | --- | --- | --- |
| Remove | ${n} | ${n} | — |
| Rewrite | ${n} | ${n} | — |
| Consolidate | ${n} | ${n} | — |
| No verdict | — | — | ${n} |

## Findings

### Remove

- **Rubric item**: ${part1Item}
  - **Location**: `spec/models/order_spec.rb:42` - `${quotedExcerpt}`
  - **Evidence type**: deterministic (${detector and rule, or diff}) | judgment-only (${n} of 3)
  - **Objective evidence**: ${no unique coverage or killed mutants, plus a passing run with the test removed} | judgment-only, not actionable
  - **Proof**: ${detector, diff, or counterexample applied to the whole assertion showing the test cannot fail}
  - **Reason**: ${reason, matching the verdict}

### Rewrite

- **Rubric item**: ${part1Item or part2PropertyAndItem}
  - **Location**: `tests/test_pricing.py:88` - `${quotedExcerpt}`
  - **Evidence type**: deterministic (${detector and rule, or diff}) | judgment-only (${n} of 3)
  - **Proof**: ${counterexample or planted defect the test does not catch, or a false failure, as test-quality Part 3 describes}
  - **Reason**: ${reason, matching the verdict}
  - **Suggested fix**: ${relation from test-owned inputs, or a specified literal with its derivation, as test-quality Part 3 describes}

### Consolidate

- **Rubric item**: ${part2PropertyAndItem}
  - **Locations**: `${file:line}`, `${file:line}`
  - **Evidence type**: deterministic (${coverage contexts or mutant matrix}) | judgment-only
  - **Objective evidence**: ${evidence} | judgment-only, not actionable

### Review These

Observations that reached no verdict, including pattern and heuristic hits no counterexample confirmed and candidates that did not reach 2 of 3. Grouped by area, at most 10 per area in rank order. Every observation bullet carries exactly one evidence label; each area's closing line counts the observations not shown, per label. Deterministic observations not shown are located in the appendix at the end; judgment-only ones stay counted only.

#### ${areaPath}

- `${file:line}` - ${observation}; deterministic (${detector and rule}) | judgment-only (${heuristic or rubric item}${, "1 of 3" for an unsettled candidate})
- ${n} more in this area: ${n} deterministic, ${n} judgment-only.

## Triage

Detectors and heuristics ranked the tests in each area; auditors inspected the top ${N} per area${, or every test at depth full}. Triaged-out tests were not read; a detector violation on one is reported above like any other, and nothing else about them is.

| Area | Tests | Inspected | Triaged out | Top signals |
| --- | --- | --- | --- | --- |
| ${areaPath} | ${n} | ${n} | ${n} | ${for example "3 skip markers, 2 sleeps, high churn"} |

To expand: run `/wb:test-audit ${areaPath}` for one area, `/wb:test-audit ${scope} ${largerN}` for more tests per area, or `/wb:test-audit ${scope} full` to read every test.

## Detectors

- Tools run: ${tools and explicit selections}
- Available but not enabled: ${rules}
- No detector in this stack: ${categories}

## Suite-Level Checks

| Check | Result |
| --- | --- |
| Seeded random-order run | ${result} \| not run: ${reason} |
| Repeats on suspect tests | ${result} \| not run: ${reason} |
| Slow-test report | ${result} \| not run: ${reason} |
| Factory or setup-cost profile | ${result} \| not run: ${reason} |
| Per-test coverage | ${result} \| not run: ${reason} |
| Mutation | ${result} \| not run: ${reason, for example "no mutation command declared"} |
| Brittleness from history | ${structural commits that edited tests; setup copied across files} |

## Not Checked

- **Hollow reds and expectations edited after a failing run**: not checkable cold. Commit history does not show whether a test was written before its code or whether its expectation changed after a failing run; that needs in-plan evidence such as test-writer reports and red commits.
- **Services not available**: ${services the suite needs that were not reachable, and the checks they blocked, or "none"}
- **Files not audited**: ${files an auditor listed under Not Run, with the reason, or "none"}
- ${any other check not run, with the reason}

## Appendix: Locations Past the Review Cap

Deterministic observations that "Review These" counted but did not show, so each keeps its location. One line each, grouped by area, `none` when no area passed the cap.

### ${areaPath}

- `${file:line}` - ${detector and rule}
````
