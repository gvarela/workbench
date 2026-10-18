#!/usr/bin/env bash
# Run wb stages headless on a fixture: run-headless.sh <fixture> <variant> <prompt-file>[,<prompt-file>...] <out-dir>
#   fixture: a directory name under validation/fixtures/ (for example python-rides)
#   variant: base | with-profile | legacy | planned | trap-missing-module | trap-framed-brief | trap-outer-conflict
#   prompt-file: one stage, or a comma-separated list of stages run in sequence in the SAME scratch repo
#     (chaining, for example create_tasks.txt,implement.txt). One stage writes its outputs straight into
#     <out-dir>; several write <out-dir>/stage-1, stage-2, ... each with that stage's own transcript.jsonl,
#     session-id.txt, assistant-text.txt, git logs, beads-all.json, plans/ and tests/ as they stood after it.
#     A stage that exits nonzero stops the chain.
#   DRY_RUN=1: build the scratch repository (copy, seed, remove seed files, base commit), print the tree,
#     `bd list`, the base commit and the base test suite, then stop before any claude call.
# Variant layers: planned and the trap-* variants are python-rides + planned/ (+ the trap overlay). A variant
# with its own seed-beads.sh (planned, traps, legacy) is seeded by that script (it runs bd init itself), and
# seed-beads.sh and seed-beads.vars are deleted before the base commit so agents cannot diff the seed text.
# Scratch location: a mktemp directory, not .scratch/ inside the worktree. A nested
# git repository inside the worktree would let git and bd walk up into the worktree's
# own repository and beads database; a directory outside it cannot.
set -o pipefail
set -u

if [ $# -ne 4 ]; then
  echo "usage: $0 <fixture> <variant> <prompt-file>[,<prompt-file>...] <out-dir>" >&2
  exit 2
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../../.." && pwd)"          # repository (or worktree) root
FIXTURES="$HERE/fixtures"
FIXTURE="$1"
VARIANT="$2"
PROMPTS="$3"
mkdir -p "$4"
OUT="$(cd "$4" && pwd)"

[ -d "$FIXTURES/$FIXTURE" ] || { echo "no fixture: $FIXTURES/$FIXTURE" >&2; exit 2; }
PROMPT_LIST=""
for p in $(echo "$PROMPTS" | tr ',' ' '); do
  [ -f "$p" ] || { echo "no prompt file: $p" >&2; exit 2; }
  PROMPT_LIST="$PROMPT_LIST $(cd "$(dirname "$p")" && pwd)/$(basename "$p")"
done
case "$VARIANT" in
  base|with-profile|legacy|planned|trap-missing-module|trap-framed-brief|trap-outer-conflict) ;;
  *) echo "variant must be base, with-profile, legacy, planned, or a trap-* variant" >&2; exit 2 ;;
esac

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

copy_tree() { (cd "$1" && tar --exclude=__pycache__ --exclude=.pytest_cache -cf - .) | (cd "$2" && tar -xf -); }

copy_tree "$FIXTURES/$FIXTURE" "$WORK"
SEEDED=0
case "$VARIANT" in
  base) ;;
  with-profile) copy_tree "$FIXTURES/with-profile" "$WORK" ;;
  legacy) copy_tree "$FIXTURES/legacy" "$WORK"; SEEDED=1 ;;
  planned) copy_tree "$FIXTURES/planned" "$WORK"; SEEDED=1 ;;
  trap-*) copy_tree "$FIXTURES/planned" "$WORK"; copy_tree "$FIXTURES/$VARIANT" "$WORK"; SEEDED=1 ;;
esac
cd "$WORK" || exit 1
git init -q
if [ "$SEEDED" = 1 ]; then
  # The seed script runs bd init itself; bd init first would make it fail.
  bash ./seed-beads.sh >"$OUT/seed-beads.log" 2>&1 || { echo "seed-beads.sh failed, see $OUT/seed-beads.log" >&2; exit 1; }
  rm -f seed-beads.sh seed-beads.vars
else
  bd init --stealth --non-interactive --quiet >"$OUT/bd-init.log" 2>&1 || { echo "bd init failed, see $OUT/bd-init.log" >&2; exit 1; }
fi
git add -A
git -c user.name=headless -c user.email=headless@example.com commit -q -m "base"

# Commits made by the stage need an identity inside the scratch repository.
git config user.name headless
git config user.email headless@example.com

if [ "${DRY_RUN:-}" = 1 ]; then
  echo "== dry run: $FIXTURE/$VARIANT scratch tree =="
  find . -path ./.git -prune -o -path ./.beads -prune -o -name __pycache__ -prune -o -type f -print | sort
  echo "== bd list =="
  bd list --all --limit 0
  echo "== beads dependencies and description text =="
  bd list --all --limit 0 --json | python3 -I -c '
import json, sys
for i in json.load(sys.stdin):
    deps = [d.get("depends_on_id", "?").split("-")[-1] + ":" + d.get("type", "?") for d in i.get("dependencies") or []]
    print(i["id"].split("-")[-1], "deps=" + ",".join(deps), "|", (i.get("description") or "")[:400].replace("\n", " "))
'
  echo "== git show --stat HEAD =="
  git show --stat HEAD
  echo "== base suite =="
  python3 -m pytest -q -p no:cacheprovider 2>&1 | tail -5
  exit 0
fi

# Resulting plan documents, tests, history, beads state, and transcript products.
# Checks read these, not the scratch repository.
collect() {
  D="$1"
  rm -rf "$D/plans" "$D/tests"
  if [ -d docs/plans ]; then cp -R docs/plans "$D/plans"; fi
  if [ -d tests ]; then
    cp -R tests "$D/tests"
    find "$D/tests" -name __pycache__ -prune -exec rm -rf {} +
  fi
  git log --stat > "$D/git-log.txt" 2>&1
  git log --reverse --format='COMMIT %H%nSUBJECT %s%nBODY_START%n%b%nBODY_END' --name-only > "$D/git-log-names.txt" 2>&1
  git log --reverse -p > "$D/git-log.patch" 2>&1
  git status --porcelain > "$D/git-status.txt" 2>&1
  # Beads state (design D11): outer-test steps close with "red <sha>: <assertion line>"; ac3.sh reads close_reason.
  bd list --all --limit 0 --json > "$D/beads-all.json" 2>"$D/beads-all.err" || echo "[]" > "$D/beads-all.json"
  # Session id, so count-tool-calls.sh can find ~/.claude/projects/<slug>/<session>.jsonl.
  python3 -I - "$D/transcript.jsonl" > "$D/session-id.txt" <<'PY'
import json, sys
for line in open(sys.argv[1]):
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    if ev.get("session_id"):
        print(ev["session_id"])
        break
PY
  # Assistant text only (not tool results), for the checks to grep.
  python3 -I - "$D/transcript.jsonl" > "$D/assistant-text.txt" <<'PY'
import json, sys
for line in open(sys.argv[1]):
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    if ev.get("type") == "assistant":
        for c in ev.get("message", {}).get("content", []):
            if c.get("type") == "text":
                print(c["text"])
                print("")
PY
}

NSTAGES=$(echo $PROMPT_LIST | wc -w | tr -d ' ')
N=0
RC=0
for PROMPT_FILE in $PROMPT_LIST; do
  N=$((N + 1))
  if [ "$NSTAGES" -eq 1 ]; then D="$OUT"; else D="$OUT/stage-$N"; mkdir -p "$D"; fi
  claude -p "$(cat "$PROMPT_FILE")" --plugin-dir "$REPO/plugin" \
    --allowedTools "Skill" "Agent" "Read" "Write" "Edit" "Bash" "Grep" "Glob" \
    --permission-mode acceptEdits --output-format stream-json --verbose \
    > "$D/transcript.jsonl" 2> "$D/stderr.txt"
  RC=$?
  collect "$D"
  echo "run-headless: $FIXTURE/$VARIANT stage $N/$NSTAGES ($(basename "$PROMPT_FILE")) claude exit $RC; transcript $(wc -c < "$D/transcript.jsonl" | tr -d ' ') bytes"
  [ "$RC" -eq 0 ] || break
done
exit $RC
