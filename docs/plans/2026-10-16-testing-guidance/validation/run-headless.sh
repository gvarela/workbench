#!/usr/bin/env bash
# Run one wb stage headless on a fixture: run-headless.sh <fixture> <variant> <prompt-file> <out-dir>
#   fixture: a directory name under validation/fixtures/ (for example python-rides)
#   variant: base | with-profile | legacy
# Scratch location: a mktemp directory, not .scratch/ inside the worktree. A nested
# git repository inside the worktree would let git and bd walk up into the worktree's
# own repository and beads database; a directory outside it cannot.
set -o pipefail
set -u

if [ $# -ne 4 ]; then
  echo "usage: $0 <fixture> <variant: base|with-profile|legacy> <prompt-file> <out-dir>" >&2
  exit 2
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../../.." && pwd)"          # repository (or worktree) root
FIXTURES="$HERE/fixtures"
FIXTURE="$1"
VARIANT="$2"
PROMPT_FILE="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
mkdir -p "$4"
OUT="$(cd "$4" && pwd)"

[ -d "$FIXTURES/$FIXTURE" ] || { echo "no fixture: $FIXTURES/$FIXTURE" >&2; exit 2; }
[ -f "$PROMPT_FILE" ] || { echo "no prompt file: $PROMPT_FILE" >&2; exit 2; }
case "$VARIANT" in base|with-profile|legacy) ;; *) echo "variant must be base, with-profile, or legacy" >&2; exit 2 ;; esac

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

copy_tree() { (cd "$1" && tar --exclude=__pycache__ --exclude=.pytest_cache -cf - .) | (cd "$2" && tar -xf -); }

copy_tree "$FIXTURES/$FIXTURE" "$WORK"
[ "$VARIANT" = base ] || copy_tree "$FIXTURES/$VARIANT" "$WORK"
cd "$WORK" || exit 1
git init -q
if [ "$VARIANT" = legacy ]; then
  bash "$FIXTURES/legacy/seed-beads.sh" >"$OUT/seed-beads.log" 2>&1 || { echo "seed-beads.sh failed, see $OUT/seed-beads.log" >&2; exit 1; }
else
  bd init --stealth --non-interactive --quiet >"$OUT/bd-init.log" 2>&1 || { echo "bd init failed, see $OUT/bd-init.log" >&2; exit 1; }
fi
git add -A
git -c user.name=headless -c user.email=headless@example.com commit -q -m "base"

# Commits made by the stage need an identity inside the scratch repository.
git config user.name headless
git config user.email headless@example.com

claude -p "$(cat "$PROMPT_FILE")" --plugin-dir "$REPO/plugin" \
  --allowedTools "Skill" "Agent" "Read" "Write" "Edit" "Bash" "Grep" "Glob" \
  --permission-mode acceptEdits --output-format stream-json --verbose \
  > "$OUT/transcript.jsonl" 2> "$OUT/stderr.txt"
RC=$?

# Resulting plan documents, tests, and history. Checks read these, not the scratch repository.
rm -rf "$OUT/plans" "$OUT/tests"
if [ -d docs/plans ]; then cp -R docs/plans "$OUT/plans"; fi
if [ -d tests ]; then
  cp -R tests "$OUT/tests"
  find "$OUT/tests" -name __pycache__ -prune -exec rm -rf {} +
fi
git log --stat > "$OUT/git-log.txt" 2>&1
git log --reverse --format='COMMIT %H%nSUBJECT %s%nBODY_START%n%b%nBODY_END' --name-only > "$OUT/git-log-names.txt" 2>&1
git log --reverse -p > "$OUT/git-log.patch" 2>&1
git status --porcelain > "$OUT/git-status.txt" 2>&1
# Beads state of the scratch repository (design D11): outer-test steps close with "red <sha>: <assertion line>",
# and ac3.sh reads that close_reason from here.
bd list --all --limit 0 --json > "$OUT/beads-all.json" 2>"$OUT/beads-all.err" || echo "[]" > "$OUT/beads-all.json"

# Assistant text only (not tool results), for the checks to grep.
python3 -I - "$OUT/transcript.jsonl" > "$OUT/assistant-text.txt" <<'PY'
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

echo "run-headless: $FIXTURE/$VARIANT claude exit $RC; transcript $(wc -c < "$OUT/transcript.jsonl" | tr -d ' ') bytes"
exit $RC
