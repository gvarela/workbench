#!/usr/bin/env bash
# Run one AC-5 blind trial: run-trial.sh <trial-dir> <trial-number> <out-dir>
set -o pipefail
set -u

if [ $# -ne 3 ]; then
  echo "usage: $0 <trial-dir> <trial-number> <out-dir>" >&2
  exit 2
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
TRIAL_DIR="$(cd "$1" && pwd)"
N="$2"
mkdir -p "$3"
OUT="$(cd "$3" && pwd)"
NAME="$(basename "$TRIAL_DIR")"
REPO="$(cd "$HERE/../../../../../.." && pwd)"        # repository (or worktree) root
FIXTURE="$HERE/../../fixtures/python-rides"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Scratch repo: Fixture P committed as the base, the patch left uncommitted.
(cd "$FIXTURE" && tar --exclude=__pycache__ --exclude=.pytest_cache -cf - .) | (cd "$WORK" && tar -xf -)
cd "$WORK" || exit 1
git init -q
git add -A
git -c user.name=trial -c user.email=trial@example.com commit -q -m "base"
BASE_SHA="$(git rev-parse HEAD)"
git apply "$TRIAL_DIR/change.patch" || { echo "patch did not apply: $NAME" >&2; exit 1; }
if ! python3 -m pytest -q >/dev/null 2>&1; then
  echo "suite is not green after patch, trial aborted: $NAME" >&2
  exit 1
fi
rm -rf .pytest_cache
find . -name __pycache__ -prune -exec rm -rf {} +

TASK="$(sed "s/__BASE_SHA__/$BASE_SHA/" "$TRIAL_DIR/task.md")"
REPORT="$(cat "$TRIAL_DIR/worker-report.md")"
TESTS_MODIFIED="$(grep -E '^Tests modified:' "$TRIAL_DIR/worker-report.md" | sed 's/^Tests modified: *//')"

PROMPT="You are a coordinator. Spawn the wb:task-verifier agent exactly once, with no model parameter, and give it this context:

- Task ID: TRIAL-$NAME
- Task Description:
$TASK
- Test Command: python3 -m pytest -q
- Files Changed: the output of running 'git status --short' in the current directory (run it yourself and paste it)
- Tests Modified: $TESTS_MODIFIED
- Starting commit: $BASE_SHA
- Worker Summary:
$REPORT

When the verifier returns, print its report verbatim and nothing else. Do not ask questions, do not add commentary, do not edit anything."

STREAM="$OUT/$NAME-$N.jsonl"
claude -p "$PROMPT" --model sonnet --plugin-dir "$REPO/plugin" \
  --allowedTools "Agent" "Bash" "Read" "Grep" "Glob" \
  --permission-mode acceptEdits --output-format stream-json --verbose > "$STREAM" 2> "$OUT/$NAME-$N.stderr"
RC=$?

# The report is the final assistant text (the "result" event holds it).
python3 -I - "$STREAM" > "$OUT/$NAME-$N.report.txt" <<'PY'
import json, sys
result, texts = None, []
for line in open(sys.argv[1]):
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    if ev.get("type") == "result" and isinstance(ev.get("result"), str):
        result = ev["result"]
    elif ev.get("type") == "assistant":
        for c in ev.get("message", {}).get("content", []):
            if c.get("type") == "text":
                texts.append(c["text"])
print(result if result else (texts[-1] if texts else ""))
PY
echo "$NAME-$N: claude exit $RC, report $(wc -c < "$OUT/$NAME-$N.report.txt" | tr -d ' ') bytes"
exit $RC
