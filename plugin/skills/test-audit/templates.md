# test-audit — Templates

## Test Audit Report Template

Read this in full before Step 6. Leave a section with nothing to report in place, marked "none", so the reader knows the step ran. Cite file:line for every finding and every "review these" entry.

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
  - **Reason**: ${reason}

### Rewrite

- **Rubric item**: ${part1Item or part2PropertyAndItem}
  - **Location**: `tests/test_pricing.py:88` - `${quotedExcerpt}`
  - **Evidence type**: deterministic (${detector and rule, or diff}) | judgment-only (${n} of 3)
  - **Reason**: ${reason}

### Consolidate

- **Rubric item**: ${part2PropertyAndItem}
  - **Locations**: `${file:line}`, `${file:line}`
  - **Evidence type**: deterministic (${coverage contexts or mutant matrix}) | judgment-only
  - **Objective evidence**: ${evidence} | judgment-only, not actionable

### Review These

Judgment-only observations that reached no verdict, including heuristic hits no auditor confirmed and candidates that did not reach 2 of 3.

- `${file:line}` - ${observation}; judgment-only (${heuristic or rubric item}${, "1 of 3" for an unsettled candidate})

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
````
