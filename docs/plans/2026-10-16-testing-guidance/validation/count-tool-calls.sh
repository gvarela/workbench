#!/usr/bin/env bash
# Count tool calls in a headless stream-json transcript: count-tool-calls.sh <transcript.jsonl>
# Reports coordinator calls, and per spawned subagent (grouped by subagent_type) the number of
# tool_use blocks, the bead ID found in the spawn prompt, and whether the bead was still open.
# Subagent messages carry parent_tool_use_id = the id of the Agent/Task tool_use that spawned them.
set -o pipefail
set -u
if [ $# -ne 1 ] || [ ! -f "$1" ]; then
  echo "usage: $0 <transcript.jsonl>" >&2
  exit 2
fi
exec python3 -I - "$1" <<'PY'
import json, re, sys, collections

spawns = collections.OrderedDict()   # tool_use id -> dict(type, prompt, calls, tools)
coord = collections.Counter()
results = []
for line in open(sys.argv[1]):
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    t = ev.get("type")
    if t == "result":
        results.append(ev)
    if t != "assistant":
        continue
    parent = ev.get("parent_tool_use_id")
    for c in ev.get("message", {}).get("content", []):
        if c.get("type") != "tool_use":
            continue
        if parent is None:
            coord[c["name"]] += 1
            if c["name"] in ("Agent", "Task"):
                inp = c.get("input", {})
                spawns[c["id"]] = {"type": inp.get("subagent_type", "?"),
                                   "prompt": inp.get("prompt", ""),
                                   "calls": 0, "tools": collections.Counter()}
        else:
            s = spawns.setdefault(parent, {"type": "?", "prompt": "", "calls": 0, "tools": collections.Counter()})
            s["calls"] += 1
            s["tools"][c["name"]] += 1

BEAD = re.compile(r"[A-Za-z0-9]+_[A-Za-z0-9]+-[a-z0-9]+(?:\.\d+)*|[A-Za-z0-9]+-[a-z]*\d[a-z0-9]*(?:\.\d+)*")
print("coordinator tool calls: %d  %s" % (sum(coord.values()), dict(coord)))
print()
print("subagent_type\tcalls\tbead\ttools")
by_type = collections.OrderedDict()
for sid, s in spawns.items():
    m = BEAD.search(s["prompt"])
    print("%s\t%d\t%s\t%s" % (s["type"], s["calls"], m.group(0) if m else "-", dict(s["tools"])))
    by_type.setdefault(s["type"], []).append(s["calls"])
print()
for k, v in by_type.items():
    print("type %s: spawns=%d total=%d max=%d" % (k, len(v), sum(v), max(v)))
print()
for r in results:
    print("result: turns=%s duration_ms=%s cost_usd=%s subtype=%s" % (
        r.get("num_turns"), r.get("duration_ms"), r.get("total_cost_usd"), r.get("subtype")))
PY
