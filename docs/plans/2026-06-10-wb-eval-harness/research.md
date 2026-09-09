---
project: wb-eval-harness
ticket: null
created: 2026-06-10
created_timestamp: 2026-06-10T15:50:28Z
status: complete
last_updated: 2026-08-03
researcher: gabevarela
git_commit: cf86f75
git_branch: main
repository: gvarela/workbench
tags: [research, codebase, wb-eval-harness]
---

# Research: wb-eval-harness

**Created**: 2026-06-10 15:50 UTC
**Last Updated**: 2026-08-03
**Ticket**: N/A

## Research Question

What failure modes have the wb prompts actually exhibited, what validation techniques were proven during and since the 2026-06 modernization, and what does the Faraday codebase offer as eval ground truth — settling the five open questions from [thoughts/2026-06-10-eval-design-discussion.md](thoughts/2026-06-10-eval-design-discussion.md) under the centerpiece-first direction recorded in `prompts-2bd` ([thoughts/2026-08-02-centerpiece-first-decision.md](thoughts/2026-08-02-centerpiece-first-decision.md)).

## Summary

Faraday supports the fixture role, with one version-boundary correction to the pre-research sketch: the retry middleware lives in-tree only **through v1.8.0** — v1.9.0 (Jan 2022, PR #1367) removed it in favor of the `faraday-retry` gem, which is a fresh code copy (no shared git history), MIT-licensed, and a *runtime dependency* of every 1.9/1.10 release (so `request :retry` still resolves identically at v1.10.6, where core even aliases `Faraday::Request::Retry = Faraday::Retry::Middleware`). v1.10.6 (June 2026) is the newest 1.x release and the 1.x branch still receives sporadic security backports — the line is quiet but not frozen. The test adapter provides fully deterministic failure simulation (stub blocks may `raise` transport errors directly; no network), but a second sketch assumption fails: **no injected/fake clock exists anywhere in Faraday's suite** — the retry specs use real `sleep` calls with wall-clock tolerance assertions.

On the wb side, the only automated verification that exists today is markdown lint (script + PostToolUse hook); the parity method that gated the modernization is a documented manual transcript procedure with saved baselines, not a tool. No `evals/` directory or gates manifest exists — ⛔ gates live inline in skills (inventory table below). Four eval techniques now have validated production records: the pilot-parity structural dry-run, the byte-identical parity extract, the blind-trial discrimination method (`prompts-01d`: found a 0/3 failure, fix re-validated red→green), and the transcript-audit trawl (four confirmed defects in one pass — `prompts-327`/`fj1`/`naw`/`p82`). The failure record is dominated by integration/environment defects rather than prompt-content defects.

The cost question is answered empirically from 169 subagent completions across three full wb cycles on a real project: opus task-workers median **77k tokens** (~2.1× sonnet's 37k, ~4× wall time), verifiers add **50–80%** of worker cost per task, an `implement_coordinated` phase runs **0.2–2.1M subagent tokens** across 8–27 spawns, and planning stages invert the pattern — `create_research` is subagent-heavy (117–279k) with a cheap main thread, while `explore_design` is nearly all main-thread reasoning (250–670k output tokens, 100–300 API calls, ~zero subagent cost). Packaging is verified: the installed cache contains exactly the `plugin/` subtree, so repo-root `evals/` would never ship; submodule behavior under a GitHub-sourced marketplace remains empirically unverified (tracked as an open question).

## Detailed Findings

### 1. Faraday version boundary and fixture facts

**Retry in-tree window** (web-verified against tags and rubygems):

- `lib/faraday/request/retry.rb` exists at v1.8.0 and earlier; **404 at v1.9.0** — removed by "Use external multipart and retry middleware" (PR #1367, v1.9.0, 2022-01-06)
- faraday 1.9.x/1.10.x declare `faraday-retry ~> 1.0` as a **runtime dependency** (v1.10.6 gemspec, verified in clone and on rubygems); faraday-retry 1.x declares no faraday dependency (reversed to avoid circularity), while faraday-retry 2.x requires `faraday ~> 2.0`
- After `require 'faraday/retry'`, core aliases `Faraday::Request::Retry = Faraday::Retry::Middleware` (`lib/faraday.rb:32-33` at v1.10.6) — `conn.request :retry` behaves identically across the boundary
- `faraday-retry` provenance: fresh "Initial commit" 2021-12-31, **code copy, not extraction-with-history**; carries one fix over the in-tree version (retry_block not called when max_interval suppresses the retry)
- Licenses: faraday MIT, faraday-retry MIT
- Release liveness: v1.10.6 released 2026-06-24 (GHSA-98m9-hrrm-r99r backport); prior patches 1.10.5 (2026-02), 1.10.4 (2024-09), 1.10.3 (2023-01). The `1.x` branch exists and tracks these. Current main is 2.x (2.14.3, 2026-06); 2.0 removed the middleware-gem runtime dependencies entirely, made retry opt-in, dropped `Faraday::Response::Middleware`, and restricted `register_middleware` to class objects

**In-tree inventory at the two candidate pins**:

| | v1.7.2 (also v1.8.0) | v1.10.6 |
| --- | --- | --- |
| Request middleware | authorization, basic_authentication, instrumentation, **multipart**, **retry**, token_authentication, url_encoded | authorization, basic_authentication, instrumentation, **json**, token_authentication, url_encoded |
| Response middleware | (json not yet in-tree) | json, logger, raise_error |
| In-tree adapters | test, typhoeus (shim) | test, typhoeus |
| Retry/multipart | in-tree | via `faraday-retry`/`faraday-multipart` dependency gems |

### 2. Retry middleware implementation (v1.7.2, `lib/faraday/request/retry.rb`)

**Options struct** (`:33-88`): `max` (default 2), `interval` (0), `max_interval` (Float::MAX), `interval_randomness` (0), `backoff_factor` (1), `exceptions` (`DEFAULT_EXCEPTIONS` at `:26-29` — includes the string `'Timeout::Error'` and `Faraday::RetriableResponse`), `methods` (`IDEMPOTENT_METHODS = %i[delete get head options put]` at `:30` — no post/patch), `retry_if`, `retry_block`, `retry_statuses`. `Options.from` (`:41-47`) accepts a legacy positional Integer or a Hash.

**Call loop** (`:142-168`): countdown from `max`; resets `env[:body]` to the captured request body before each attempt; a response whose status is in `retry_statuses` raises the synthetic `Faraday::RetriableResponse` (`error.rb:150-152`) to route through the same rescue; the rescue matcher is a synthetic Module whose `===` matches class objects or string class names (`build_exception_matcher`, `:176-193`); retry gate is `methods.include?(env[:method]) || retry_if.call(env, exception)` (`:197-200`); `rewind_files` rewinds `UploadIO` values in Hash bodies (`:202-208`); exhausted status-based retries **return the last response** rather than raising (`:166`).

**Sleep computation** (`:128-139`, `:212-236`): exponential backoff `interval * backoff_factor**retry_index` clamped to `max_interval`, plus jitter `rand * interval_randomness * interval`; `Retry-After` header honored (RFC-2822 date or numeric seconds) and used when larger; a `Retry-After` exceeding `max_interval` aborts the retry entirely (returns nil).

**Timing in specs — no fake clock**: `spec/faraday/request/retry_spec.rb` builds real connections with the test adapter, simulates failures by raising in stub blocks or returning `[429, {}, '']`, and asserts real elapsed time (`be_within(0.04).of(0.2)` for `max: 2, interval: 0.1`; `Retry-After` tests assert `> 0.5` elapsed). `calculate_retry_interval` is unit-tested via `middleware.send(:calculate_retry_interval, n)` with `Retry.new(nil, options)` (no stack). No Timecop or clock injection anywhere in the suite.

### 3. Middleware architecture and test adapter (v1.10.6)

**Stack mechanics**: `Faraday.new` → `Connection#initialize` (`connection.rb:65-96`) → `RackBuilder`. Handlers wrap classes by name through `AdapterRegistry` (`rack_builder.rb:26-59`); `to_app` folds `@handlers.reverse.inject(@adapter.build)` so the adapter is always innermost (`:171-177`). `Middleware#call` (`middleware.rb:16-21`) fires `on_request` on descent and registers `on_complete` on the shared `Response`, which `Adapter#save_response` (`adapter.rb:67-78`) finishes synchronously via `Response#finish` (`response.rb:66-72`) — on_complete unwinds inner→outer. All state rides one mutable `Faraday::Env` struct (`options/env.rb:49-52`) whose `body` accessor is phase-polymorphic (`current_body`, `:109-111`).

**Registry**: `register_middleware(autoload_path, mapping)` under a Monitor mutex (`middleware_registry.rb:54-63, 94-97`); values may be Module, Symbol/String (const_get), Proc, or `[Const, 'file']` lazy-require arrays (`:103-127`). Dependency gems self-register on require — the identical machinery, which is how `:retry` resolves at 1.10.

**Test adapter** (`adapter/test.rb`): `Stubs` keyed by method with `consumed` re-match fallback (`:65-79`); path may be a Regexp with `match_data` exposed to arity-2 stub blocks (`:249-255`); `strict_mode` switches params/headers matching from subset to exact-set (with auto-injected user agent) (`:126-133, 193-219`); unmatched requests raise `Stubs::NotFound` with method/url/body in the message (`:244-247`); **stub blocks may `raise` any exception directly** — `Test#call` has no rescue, so simulated `Faraday::TimeoutError`/`ConnectionFailed` propagate exactly like real transport errors; `verify_stubbed_calls` (`:110-122`) raises for any registered-but-unexercised stub. Responses flow through the same `save_response` as real adapters.

**Error taxonomy** (`error.rb`): `Faraday::Error` normalizes exception/response-hash/message inputs; `RaiseError` maps statuses to `BadRequestError`(400) … `UnprocessableEntityError`(422), generic `ClientError` (400-499), `ServerError` (500-599), `NilStatusError`; raises propagate up the plain Ruby stack (no rescue in `Middleware#call`).

**Conventions for grading rubrics** (pattern-finder, across the six in-tree request middlewares): CamelCase class / snake_case file / snake_case symbol registry key; `on_request` for request-phase, `on_complete` for response-phase, full `call` override when wrapping; three options idioms (positional params → ivars; custom `Options` subclass with `||=` lazy defaults; plain options-hash extraction); lazy inheritance via `load_middleware(:authorization)` (basic/token auth); specs use a `process(...)` env helper for unit-style tests, full `Faraday.new` + `b.adapter :test do |stub|` for integration-style, and shared examples (`spec/support/shared_examples/`); `spec_helper.rb` loads all lib files, includes `Faraday::HelperMethods`, random ordering.

### 4. Verification tooling that exists in wb today

- **Markdown lint** — `plugin/scripts/lint` (git-diff-scoped/`--all`/`--fix`, temp default config fallback, exit 1 on findings) and `plugin/scripts/lint-hook` (PostToolUse on Write|Edit, reads stdin JSON, auto-fixes the single file, always exit 0), registered in `plugin/.claude-plugin/plugin.json:28-49`. Config `.markdownlintrc` (MD013/MD033/MD036/MD040/MD041 off)
- **Lifecycle hooks** — `setup-beads-mode.sh` (SessionStart, exports `BEADS_MODE` via `git check-ignore`), `beads-drift-check.sh` (SessionEnd, uncommitted-`.beads/` reminder, silent in stealth)
- **Parity artifacts** — `docs/plans/2026-06-09-prompt-modernization/pilot-parity/{pilot-baseline-pre-split.txt,pilot-post-split.txt}` (structural dry-run transcripts, 136/95 lines, every ⛔ named verbatim; gate defined at that project's `tasks.md:218-220`) and `docs/plans/2026-07-10-explore-design-stage/pilot-parity/{baseline-notes.md,step4-baseline-pre-edit.txt}` (verbatim section extract at pinned ref; byte-identical requirement). **No script performs the comparison** — the method is manual capture + read-through/diff
- **No `evals/` directory, no gates manifest** — gate definitions exist only as inline ⛔ markers
- **Verifier agent contracts** — `agents/task-verifier.md` (sonnet, effort high): binary `### Status: PASS|FAIL` report with test results/files-changed/scope tables; consumed by `implement_coordinated`. `agents/research-validator.md` (sonnet, effort high): `PASS | PASS WITH WARNINGS | FAIL` with four claim-category tables (path/snippet/behavioral/pattern; item vocabulary PASS/FAIL/STALE/UNCERTAIN); **currently referenced only by `create_product_research/sub-agent-prompts.md`** (the `research-validation` *skill* invokes validation interactively; the agent is not wired into `create_research`, `validate_execution`, or `validate_project`)

**⛔ gate inventory** (literal-string counts in `plugin/skills/*/SKILL.md`, including prose mentions; create_execution is the deprecation stub):

| Skill | BARRIER | CHECKPOINT | Skill | BARRIER | CHECKPOINT |
| --- | --- | --- | --- | --- | --- |
| create_design | 7 | 0 | implement_tasks | 4 | 3 |
| create_mockup | 5 | 0 | create_tasks | 7 | 1 |
| create_product_research | 8 | 0 | explore_design | 4 | 4 |
| create_project | 2 | 0 | update_status | 3 | 0 |
| create_research | 6 | 0 | validate_execution | 6 | 0 |
| create_handoff / resume_handoff | 1 / 1 | 0 | validate_project | 4 | 0 |
| implement_coordinated | 4 | 1 | help | 1 | 0 |

### 5. Validated eval techniques on record

1. **Structural dry-run parity** (2026-06, prompt-modernization pilot): baseline/post transcripts compared for identical step/gate/report structure; gated all further splits. Also caught (per `tasks.md:218` history) a worker stripping `Task()` wrappers its own report claimed were verbatim
2. **Byte-identical extract parity** (2026-07, explore-design Phase 2): pre-edit section frozen at a git ref; post-edit branch diffed byte-for-byte (`prompts-0wl`/`prompts-64j` records)
3. **Blind-trial discrimination** (2026-07-31, `prompts-01d` close reason): fresh-context sonnet subagents given verbatim instruction text + synthesized fixture, never the expected answer; forced-choice mechanical assertion. 14 trials, 3 fixtures: clear cases 6/6, variations-trap **0/3 false-positive**; wording fixed; re-run trap 3/3 with regression 2/2. ~27k tokens/trial
4. **Transcript-audit trawl** (2026-07-31, fitness-agent review): two subagents over 9–11MB production JSONL transcripts; grep-then-extract sampling; found four confirmed defects in one pass at ~50–65k tokens/agent

### 6. Failure-mode record (closed beads issues, all shipped fixes)

| Record | Failure | Class |
| --- | --- | --- |
| `prompts-327` | `bd update --notes` replaces wholesale; destroyed a Decide: amendment in production | bd CLI semantics |
| `prompts-fj1` | Session-cached pre-rename skill body referenced deleted supporting files | harness caching |
| `prompts-naw` | Discipline skills (`user-invocable: false`) never model-elected in workflow sessions | skill election |
| `prompts-p82` | Later skills Edit stub text earlier skills no longer emit (`/wb:` prefix mismatch) | cross-skill template coupling |
| `prompts-4i1` | `grep "Decide:"` substring-matched mid-title mentions (observed live at Phase 2 gate) | query discrimination |
| `prompts-dk9` | Verifier verdict parse had no precedence for both/neither PASS-FAIL markers | report-contract parsing |
| `prompts-01d` | Nudge wording failed its own "variations of one" rule 3/3 on enumerated options | wording discrimination |

Also on record: the bd 1.0.2 embedded-Dolt migration dropped the five deferred Phase 4 trim issues plus their milestone (`prompts-41c/7jx/9wg/pnr/m7o`, `prompts-6o3` — IDs no longer resolve; survives only as prose at prompt-modernization `tasks.md:458`). Of the seven fixed defects, six are integration/environment failures; only `prompts-01d` is a prompt-content failure.

### 7. Empirical cost data (three full wb cycles, fitness-agent transcripts, n=169 subagent completions)

**Per agent type** (median tokens / median wall):

| Agent | Model | n | Median tok | Range | Median min |
| --- | --- | --- | --- | --- | --- |
| task-worker | opus | 50 | 77,198 | 30k–153k | 9.9 |
| task-worker | sonnet | 23 | 36,774 | 21k–72k | 2.4 |
| task-verifier | default | 28 | 40,867 | 22k–93k | 2.9 |
| task-verifier | opus | 11 | 63,739 | 30k–79k | 5.9 |
| codebase-analyzer | sonnet | 13 | 61,706 | 34k–152k | 2.5 |
| pattern-finder | haiku | 4 | 47,990 | 14k–54k | 1.3 |

Opus workers ≈ **2.1× sonnet tokens, ~4× wall**; a verifier adds **50–80%** of worker cost per task; typical worker+verifier pair ≈ 60k (sonnet) / 140k (opus).

**Per stage** (uncontaminated actives; subagent tokens): create_project 2–6 min, 0 spawns; create_research 10–15 min active, 3–5 spawns, 117k–279k; create_design 11–118 min, 3–4 spawns, 163k–246k; create_tasks/execution 49–141 min, 3–4 spawns, 133k–289k; explore_design 80 min–8 h (interactive), 0–3 spawns, ~0–107k; **implement_coordinated per phase 8–27 spawns, 223k–2.09M subagent tokens**.

**Main-thread inversion**: explore_design is the most orchestrator-expensive stage (100–300 API calls, 246k–670k output tokens, cache reads 67–100M) with near-zero subagent cost; create_research is the mirror image. No dollar figures or session totals exist in transcripts; subagent `totalTokens` semantics (cache inclusion) undocumented — treat cross-comparisons as relative.

### 8. Packaging facts (verified)

- `.claude-plugin/marketplace.json` declares `"source": "./plugin"`; the installed cache at `~/.claude/plugins/cache/gvarela-workbench/wb/2.2.0/` contains exactly the plugin subtree (`agents, docs, hooks, scripts, skills` + manifest) — **repo root (`docs/plans/`, a future `evals/`, `.beads/`) is not cached into installs**
- The maintainer's own marketplace registration is a *directory source* pointing at the dev checkout; GitHub-sourced installs clone the repo and copy the subtree. **Submodule materialization under a GitHub-sourced `claude plugin marketplace add` + cache copy was not empirically tested** (open question)

## Architecture Documentation

**Current patterns found**:

- Fixture-grading substrate: Faraday's own integration-spec idiom (`Faraday.new { |b| b.request :x; b.adapter :test { |stub| ... } }`) runs any middleware deterministically without network, including raised transport errors — `spec/faraday/request/authorization_spec.rb`, `retry_spec.rb:4-21`
- wb verification report contracts: literal `### Status:` header lines parsed by string match (`implement_coordinated/SKILL.md:219-226`, FAIL-wins since `prompts-dk9`)
- Golden-run precedent: pilot-parity transcripts captured the numbered step sequence + verbatim ⛔ lines as the comparison key — a key-element checklist in embryo

**Component connections**:

- wb skill → verifier agent → coordinator parse: spawn per task, report contract, FAIL-wins parse (`implement_coordinated/SKILL.md:211-235`)
- Faraday request → adapter → response: `RackBuilder#build_response` → folded handler chain → adapter `save_response` → `Response#finish` on_complete unwind (`rack_builder.rb:153-177`, `adapter.rb:60-78`, `response.rb:57-72`)

**Conventions observed**: wb gates as inline ⛔ markers with per-skill Synchronization Points summaries; beads planning prefixes (`Q:`, `Decide:`, `Validate:`, `UI Q:`) with title-prefix discrimination; Faraday conventions per §3.

## Code References

- `faraday@v1.7.2 lib/faraday/request/retry.rb:33-88, 122-236` — Options struct, call loop, backoff (in-tree retry)
- `faraday@v1.7.2 spec/faraday/request/retry_spec.rb:4-21, 71-75, 205-241` — stub-callback failure simulation; real-time assertions
- `faraday@v1.10.6 lib/faraday/rack_builder.rb:26-59, 93-116, 164-177` — Handler, registration DSL, stack fold
- `faraday@v1.10.6 lib/faraday/middleware.rb:16-21` — on_request/on_complete lifecycle
- `faraday@v1.10.6 lib/faraday/adapter/test.rb:65-79, 126-133, 237-259` — stub matching, strict_mode, call
- `faraday@v1.10.6 lib/faraday/middleware_registry.rb:54-63, 103-127` — registry + lazy loading
- `faraday@v1.10.6 lib/faraday.rb:29-33` — dependency-gem require + back-compat aliases
- `plugin/scripts/lint:115-135, 154-174` — scope modes, default-config fallback
- `plugin/.claude-plugin/plugin.json:16-60` — hook registrations
- `plugin/agents/task-verifier.md:87-138` — PASS/FAIL report contract
- `plugin/agents/research-validator.md:125-183` — four-table validation contract
- `docs/plans/2026-06-09-prompt-modernization/tasks.md:218-220, 363-377` — parity gate + Phase 4 protocol definitions
- `docs/plans/2026-07-10-explore-design-stage/pilot-parity/baseline-notes.md` — byte-identical extract method

## Similar Implementations

**Golden-run comparison precedent** — `docs/plans/2026-06-09-prompt-modernization/pilot-parity/pilot-post-split.txt:1-40`: a structural transcript keyed on numbered steps and verbatim ⛔ lines, compared manually against its baseline. This is the existing in-repo shape closest to the sketched Tier 2.

**Forced-choice grading precedent** — `prompts-01d` close reason: trial output constrained to one of two known lines, graded by string presence. The existing in-repo shape closest to Tier 3 grading without an LLM judge.

**Frozen-suite grading precedent** — Faraday's own `spec/support/shared_examples/adapter.rb`: a shared acceptance suite run against multiple implementations, the structural model for "our tests grade their implementation."

## Open Questions

Questions that require resolution before proceeding are tracked in beads, NOT in this document.

**Active questions** (reference only, beads is source of truth — `bd list -n 0 --status=open | grep "Q:"`):

- `Q: submodule materialization` — does a GitHub-sourced `claude plugin marketplace add` + version-cache copy materialize only the submodule pointer? Blocks the fixture-as-submodule packaging decision
- `Q: headless golden runs` — does `claude --plugin-dir plugin -p` reliably execute a `/wb:` skill's structural dry-run non-interactively? Blocks Tier 2 runner design
- `Q: judge reliability` — no haiku-judge precedent exists in the repo (both verifier agents pin sonnet + effort high); can any Tier 3 rubric verdicts drop below sonnet, or must non-mechanical grading stay sonnet+? Blocks Tier 3 budget model
- `Q: golden stability` — which key elements survive model upgrades unchanged (gate lines? step numbering? report headers?) — determines the Tier 2 checklist vocabulary. Blocks golden-format design

## Next Steps

Based on the research findings:

1. Review the corrected fixture facts (retry boundary at v1.9.0; no fake clock) against the pre-research sketch before design
2. Design consumes the recorded direction `prompts-2bd` (centerpiece first) with the cost model in §7 as the budget input
3. Review the research document
4. Run `/wb:create_design` to create design decisions
