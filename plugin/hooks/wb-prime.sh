#!/bin/bash
# SessionStart/PreCompact hook: session-start orientation and compaction recovery,
# modeled on the beads plugin's `bd prime`.
# Contract: <100ms, no bd invocations, plain-text stdout (SessionStart is the one
# event whose plain-text stdout is model-visible; PreCompact's stdout is not, but
# the hook must still exit 0 and print the recovery text harmlessly), silent on
# an empty payload, exit 0 always.
# Override: a `.claude/wb/PRIME.md` file in the cwd replaces the static
# orientation block below (compaction recovery text is never overridden).
# `--export` prints the default orientation and exits, regardless of stdin.

orientation() {
  cat <<'ORIENTATION'
wb: structured development workflow. Orientation for this session.
Stages, in order. Each stage reads the previous stage's document and stops if it is missing or not approved:
  /wb:create_project  -> docs/plans/<date>-<name>/ with README, research.md, design.md, tasks.md skeletons
  /wb:create_research -> research.md: facts only, file:line references, no recommendations
  /wb:explore_design  -> optional: think through trade-offs; records a decision in thoughts/ and a closed Decide: issue
  /wb:create_design   -> design.md: what to build and why; needs research.md complete
  /wb:create_tasks    -> tasks.md: phased plan plus the beads epic, milestones, and task issues; needs design.md approved
  /wb:implement -> the default execution path: one worker per task, verified, one phase at a time
  /wb:implement_inline -> the same plan, coded inline by this session
  /wb:validate_execution -> pass/fail against design.md and tasks.md after a phase or the plan
  /wb:create_handoff and /wb:resume_handoff -> carry context across sessions, models, and machines
Conventions:
  Plans live in docs/plans/<date>-<name>/ with three documents: research.md (facts), design.md (decisions), tasks.md (plan).
  Beads holds status (bd ready, bd show, bd close); markdown holds the plan. No TodoWrite, no checkboxes.
  Checkpoints stop for a human between phases; never close a milestone without confirmation.
  Before working from a plan's beads IDs: bd context; bd show <beads_epic from tasks.md>; bd stats. Stop if the epic does not resolve.
ORIENTATION
  cat <<'ORIENTATION'
What each stage needs from you (long form: /wb:help):
  create_research: the question, or confirm the one derived from the Goal
  create_design: approve the approach and the refined metrics
  create_tasks: confirm the phases and checkpoints
  implementation: a go-ahead at each phase checkpoint
  validate_execution: the manual checks only you can run
Long form: /wb:help. Replace this text for a repository with .claude/wb/PRIME.md (print the default with hooks/wb-prime.sh --export).
ORIENTATION
}

if [ "$1" = "--export" ]; then
  orientation
  echo "Active plans in this repository: <scanned at session start>"
  exit 0
fi

payload=$(cat 2>/dev/null || true)
[ -z "$payload" ] && exit 0

candidates=""
if [ -d docs/plans ]; then
  for f in $(ls -t docs/plans/*/tasks.md 2>/dev/null); do
    status=$(sed -n '2,30p' "$f" | grep -m1 '^status:' | sed 's/^status:[[:space:]]*//')
    [ "$status" = "complete" ] && continue
    dir=$(dirname "$f")
    candidates="$candidates${candidates:+ }$(basename "$dir")"
  done
fi

if echo "$payload" | grep -qE '"compact"|PreCompact'; then
  [ -z "$candidates" ] && exit 0

  count=$(echo "$candidates" | wc -w | tr -d ' ')

  echo "Context was just compacted — any plan-doc summaries above are paraphrase, not verified content."
  if [ "$count" -eq 1 ]; then
    echo "Active plan: docs/plans/$candidates"
  else
    echo "Candidate plans (newest first): $candidates"
  fi
  echo "Before asserting what research.md/design.md/tasks.md say, re-read them fully from the plan directory above. Check bd state (bd ready / bd list) for project status rather than trusting the summary."

  exit 0
fi

if [ -f .claude/wb/PRIME.md ]; then
  cat .claude/wb/PRIME.md
else
  orientation
fi

count=$(echo "$candidates" | wc -w | tr -d ' ')
if [ "$count" -eq 0 ]; then
  echo "Active plans in this repository: none"
elif [ "$count" -eq 1 ]; then
  echo "Active plan: docs/plans/$candidates"
else
  echo "Candidate plans (newest first): $candidates"
fi
echo "If this output is truncated by your host, read the full persisted hook output."

exit 0
