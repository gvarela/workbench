#!/usr/bin/env bash
# Count tool calls in a headless transcript: count-tool-calls.sh <transcript.jsonl> | --selftest
# Reports coordinator calls, and per spawned agent (any depth, grouped by subagent_type) the number of
# its own tool_use blocks, the bead ID found in the spawn prompt, its parent agent, and a total that
# includes every nested agent it spawned (task-worker counts exclude its test-writer children).
# Agents carry parent_tool_use_id = the id of the Agent/Task tool_use that spawned them. A session
# .jsonl with a sibling <session>/subagents/ directory is merged in, linking each agent-*.meta.json
# toolUseId to its transcript. --selftest builds a coordinator > task-worker > 2 test-writers fixture
# plus a verifier and fails (exit 1) if nested calls are misattributed.
set -o pipefail
set -u
if [ $# -ne 1 ] || { [ "$1" != "--selftest" ] && [ ! -f "$1" ]; }; then
  echo "usage: $0 <transcript.jsonl> | --selftest" >&2
  exit 2
fi
exec python3 -I - "$1" <<'PY'
import json, os, re, sys, glob, collections

def load(path):
    """Yield (parent_tool_use_id, event) from a stream-json file or a session dir layout."""
    def read(p, forced_parent):
        for line in open(p):
            try:
                ev = json.loads(line)
            except ValueError:
                continue
            yield forced_parent if forced_parent else ev.get("parent_tool_use_id"), ev
    for item in read(path, None):
        yield item
    sub = os.path.splitext(path)[0] + "/subagents"
    for meta in sorted(glob.glob(sub + "/*.meta.json")):
        try:
            tid = json.load(open(meta)).get("toolUseId")
        except ValueError:
            continue
        if tid:
            for item in read(meta[:-len(".meta.json")] + ".jsonl", tid):
                yield item

def analyze(events):
    agents = collections.OrderedDict()   # tool_use id -> dict(type, prompt, parent, calls, tools)
    coord = collections.Counter()
    results = []
    def agent(i):
        return agents.setdefault(i, {"type": "?", "prompt": "", "parent": None, "calls": 0, "tools": collections.Counter()})
    for parent, ev in events:
        t = ev.get("type")
        if t == "result":
            results.append(ev)
        if t != "assistant":
            continue
        for c in ev.get("message", {}).get("content", []):
            if c.get("type") != "tool_use":
                continue
            if parent is None:
                coord[c["name"]] += 1
            else:
                a = agent(parent)
                a["calls"] += 1
                a["tools"][c["name"]] += 1
            if c["name"] in ("Agent", "Task"):
                inp = c.get("input", {})
                a = agent(c["id"])
                a.update(type=inp.get("subagent_type", "?"), prompt=inp.get("prompt", ""), parent=parent)
    return agents, coord, results

def total(agents, i):
    return agents[i]["calls"] + sum(total(agents, j) for j, a in agents.items() if a["parent"] == i)

BEAD = re.compile(r"[A-Za-z0-9]+_[A-Za-z0-9]+-[a-z0-9]+(?:\.\d+)*|[A-Za-z0-9]+-[a-z]*\d[a-z0-9]*(?:\.\d+)*")

def report(agents, coord, results):
    names = {}
    seen = collections.Counter()
    for i, a in agents.items():
        seen[a["type"]] += 1
        names[i] = "%s#%d" % (a["type"], seen[a["type"]])
    print("coordinator tool calls: %d  %s" % (sum(coord.values()), dict(coord)))
    print()
    print("subagent_type\tcalls\tbead\ttools\tparent\ttotal_with_children")
    by_type = collections.OrderedDict()
    for i, a in agents.items():
        m = BEAD.search(a["prompt"])
        print("%s\t%d\t%s\t%s\t%s\t%d" % (a["type"], a["calls"], m.group(0) if m else "-", dict(a["tools"]),
              names.get(a["parent"], "?") if a["parent"] else "coordinator", total(agents, i)))
        by_type.setdefault(a["type"], []).append(a["calls"])
    print()
    for k, v in by_type.items():
        print("type %s: spawns=%d total=%d max=%d" % (k, len(v), sum(v), max(v)))
    print()
    for r in results:
        print("result: turns=%s duration_ms=%s cost_usd=%s subtype=%s" % (
            r.get("num_turns"), r.get("duration_ms"), r.get("total_cost_usd"), r.get("subtype")))

def selftest():
    def ev(parent, *blocks):
        return parent, {"type": "assistant", "message": {"content": [
            {"type": "tool_use", "id": b[2] if len(b) > 2 else "t%d" % k, "name": b[0], "input": b[1]}
            for k, b in enumerate(blocks)]}}
    def spawn(i, typ):
        return ("Agent", {"subagent_type": typ, "prompt": "Task ID: TRIAL-w1"}, i)
    events = [ev(None, ("Read", {})), ev(None, spawn("A1", "wb:task-worker")),
              ev("A1", ("Read", {})), ev("A1", spawn("TW1", "wb:test-writer")),
              ev("TW1", ("Write", {})), ev("TW1", ("Bash", {})),
              ev("A1", ("Edit", {})), ev("A1", spawn("TW2", "wb:test-writer")),
              ev("TW2", ("Write", {})), ev("TW2", ("Bash", {}), ("Bash", {})),
              ev("A1", ("Bash", {})), ev(None, spawn("V1", "wb:task-verifier")),
              ev("V1", ("Read", {}), ("Grep", {}))]
    agents, coord, results = analyze(events)
    got = {i: (a["type"], a["calls"], a["parent"], total(agents, i)) for i, a in agents.items()}
    want = {"A1": ("wb:task-worker", 5, None, 10), "TW1": ("wb:test-writer", 2, "A1", 2),
            "TW2": ("wb:test-writer", 3, "A1", 3), "V1": ("wb:task-verifier", 2, None, 2)}
    report(agents, coord, results)
    if got != want:
        print("SELFTEST FAIL: got %s want %s" % (got, want), file=sys.stderr)
        sys.exit(1)
    print("SELFTEST OK")

if sys.argv[1] == "--selftest":
    selftest()
else:
    report(*analyze(load(sys.argv[1])))
PY
