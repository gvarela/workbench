#!/usr/bin/env bash
# chain.sh <base|with-profile> <out-dir> <prompt-file>...   (stages run in one scratch copy)
set -u
V="$1"; OUT="$2"; shift 2
REPO=/Users/gabevarela/Development/Tools/workbench-dev/.claude/worktrees/testing-guidance
V0=$REPO/docs/plans/2026-10-16-testing-guidance/validation
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
cp_tree() { (cd "$1" && tar --exclude=__pycache__ --exclude=.pytest_cache -cf - .) | (cd "$2" && tar -xf -); }
cp_tree $V0/fixtures/python-rides "$WORK"
[ "$V" = base ] || cp_tree $V0/fixtures/$V "$WORK"
cd "$WORK"; git init -q; bd init --stealth --non-interactive --quiet >"$OUT/bd-init.log" 2>&1
git add -A; git -c user.name=h -c user.email=h@e.com commit -q -m base
git config user.name headless; git config user.email headless@example.com
i=0
for P in "$@"; do
  i=$((i+1))
  claude -p "$(cat $P)" --plugin-dir "$REPO/plugin" --allowedTools "Skill" "Agent" "Read" "Write" "Edit" "Bash" "Grep" "Glob" \
    --permission-mode acceptEdits --output-format stream-json --verbose > "$OUT/transcript$i.jsonl" 2> "$OUT/stderr$i.txt"
  echo "stage $i ($(basename $P)) exit $?" >> "$OUT/stages.txt"
  python3 -I -c '
import json,sys
for l in open(sys.argv[1]):
    try: e=json.loads(l)
    except ValueError: continue
    if e.get("type")=="result": print("cost",e.get("total_cost_usd"),"duration_ms",e.get("duration_ms"),"turns",e.get("num_turns"),"is_error",e.get("is_error"))
' "$OUT/transcript$i.jsonl" >> "$OUT/stages.txt"
done
rm -rf "$OUT/plans"; [ -d docs/plans ] && cp -R docs/plans "$OUT/plans"
git log --stat > "$OUT/git-log.txt" 2>&1
