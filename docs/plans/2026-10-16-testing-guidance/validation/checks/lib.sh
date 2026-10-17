#!/usr/bin/env bash
# Shared helpers for ac1.sh ... ac9.sh. Source this file; it is not run on its own.
#   ac_init <name> <run-out-dir>   validates the argument and sets OUT
#   pass "<clause>" / fail "<clause>" [detail]   print one PASS or FAIL line
#   ac_done                        prints a summary and exits non-zero when any clause failed
# BSD tools: use grep -E, no GNU-only flags.

AC_FAILS=0
AC_NAME=""
OUT=""

ac_init() {
  AC_NAME="$1"
  if [ $# -lt 2 ] || [ ! -d "$2" ]; then
    echo "usage: $AC_NAME.sh <run-out-dir>   (a directory written by run-headless.sh)" >&2
    exit 2
  fi
  OUT="$(cd "$2" && pwd)"
}

pass() { echo "PASS [$AC_NAME] $1"; }

fail() {
  AC_FAILS=$((AC_FAILS + 1))
  echo "FAIL [$AC_NAME] $1"
  if [ $# -gt 1 ] && [ -n "$2" ]; then echo "       $2"; fi
}

# check <clause> <command...>: PASS when the command succeeds, FAIL otherwise.
check() {
  local clause="$1"
  shift
  if "$@" >/dev/null 2>&1; then pass "$clause"; else fail "$clause"; fi
}

ac_done() {
  if [ "$AC_FAILS" -eq 0 ]; then
    echo "RESULT [$AC_NAME] PASS"
    exit 0
  fi
  echo "RESULT [$AC_NAME] FAIL ($AC_FAILS clause(s) failed)"
  exit 1
}

# design_md <out-dir>: path of the design.md a run produced or carried (first match), empty if none.
design_md() { find "$1/plans" -name design.md 2>/dev/null | sort | head -1; }
tasks_md() { find "$1/plans" -name tasks.md 2>/dev/null | sort | head -1; }
research_md() { find "$1/plans" -name research.md 2>/dev/null | sort | head -1; }

# tool_uses <transcript> : one line per tool_use event as "<name>\t<json input>".
tool_uses() {
  python3 -I - "$1" 2>/dev/null <<'PY'
import json, sys
for line in open(sys.argv[1]):
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    if ev.get("type") == "assistant":
        for c in ev.get("message", {}).get("content", []):
            if c.get("type") == "tool_use":
                print(c.get("name", "") + "\t" + json.dumps(c.get("input", {})))
PY
}

# events <transcript> : one line per assistant event in order, "text\t<text>" or "tool\t<name>\t<json input>",
# so a check can compare positions (for example an Agent spawn before checkpoint text).
events() {
  python3 -I - "$1" 2>/dev/null <<'PY'
import json, sys
for line in open(sys.argv[1]):
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    if ev.get("type") == "assistant":
        for c in ev.get("message", {}).get("content", []):
            if c.get("type") == "text":
                print("text\t" + c["text"].replace("\n", "\\n"))
            elif c.get("type") == "tool_use":
                print("tool\t" + c.get("name", "") + "\t" + json.dumps(c.get("input", {})))
PY
}
