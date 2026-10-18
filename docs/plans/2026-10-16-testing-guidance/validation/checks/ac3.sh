#!/usr/bin/env bash
# AC-3: a red(AC-n) commit containing only test paths exists before the implementing
# commit, and its recorded failure is an assertion failure, not a load error.
# usage: ac3.sh <run-out-dir>   (an implement run)
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
. "$HERE/commits.sh"
ac_init ac3 "$@"

LOG="$OUT/git-log-names.txt"
[ -f "$LOG" ] || { fail "git-log-names.txt exists in the run output"; ac_done; }

REDSHA=""; REDBODY=""; REDIDX=0; IMPLIDX=0; IDX=0; REDFILES=""
while IFS=$'\t' read -r sha subject files body; do
  IDX=$((IDX + 1))
  if grep -Eq '^red\(AC-[0-9]+\)' <<<"$subject"; then
    if [ -z "$REDSHA" ]; then REDSHA="$sha"; REDBODY="$body"; REDIDX=$IDX; REDFILES="$files"; fi
  elif [ -n "$REDSHA" ] && [ "$IMPLIDX" -eq 0 ] && [ -n "$files" ]; then
    # first later commit that touches a non-test, non-plan path is the implementing commit
    IMPL=0
    IFS=',' read -ra FS <<<"$files"
    for f in "${FS[@]}"; do
      if ! is_test_path "$f" && ! grep -Eq '^docs/' <<<"$f"; then IMPL=1; fi
    done
    [ "$IMPL" -eq 1 ] && IMPLIDX=$IDX
  fi
done < <(commits "$LOG")

if [ -n "$REDSHA" ]; then pass "a red(AC-n) commit exists"; else fail "a red(AC-n) commit exists"; ac_done; fi

ONLY_TESTS=1
IFS=',' read -ra RF <<<"$REDFILES"
for f in "${RF[@]}"; do is_test_path "$f" || ONLY_TESTS=0; done
if [ "$ONLY_TESTS" -eq 1 ] && [ -n "$REDFILES" ]; then pass "the red commit touches only test paths ($REDFILES)"; else fail "the red commit touches only test paths" "files: $REDFILES"; fi

if [ "$IMPLIDX" -eq 0 ] || [ "$REDIDX" -lt "$IMPLIDX" ]; then
  pass "the red commit comes before the implementing commit"
else
  fail "the red commit comes before the implementing commit" "red at $REDIDX, implementing at $IMPLIDX"
fi

# The recorded failure (design D11). Evidence is read from these places, never from the
# coordinator's own prose (the word "assertion" in prose proves nothing):
#   1. the outer-test steps' beads close reasons, "red <sha>: <assertion line>", from beads-all.json
#      (run-headless.sh exports `bd list --all --json` from the scratch repository);
#   2. the Red run section of a wb:test-writer report, from Agent tool results in transcript.jsonl;
#   3. the red commit body, when it carries anything.
red_evidence() {
  python3 -I - "$1" "$2" 2>/dev/null <<'PY'
import json, os, re, sys
beads, transcript = sys.argv[1], sys.argv[2]
if os.path.isfile(beads):
    try:
        data = json.load(open(beads))
    except ValueError:
        data = []
    for issue in data if isinstance(data, list) else []:
        reason = issue.get("close_reason") or ""
        if re.match(r"red [0-9a-f]{7,40}:", reason):
            print(reason.replace("\n", " "))
if os.path.isfile(transcript):
    for line in open(transcript):
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") != "user":
            continue
        content = ev.get("message", {}).get("content", [])
        if not isinstance(content, list):
            continue
        for c in content:
            if c.get("type") != "tool_result":
                continue
            body = c.get("content", "")
            if isinstance(body, list):
                body = "\n".join(b.get("text", "") for b in body if isinstance(b, dict))
            m = re.search(r"Red run\W*(.*?)(?:Changes to earlier tests|\Z)", body, re.S | re.I)
            if m and re.search(r"Mode\W*(outer|inner)", body, re.I):
                print(m.group(1).replace("\n", " "))
PY
}

EVIDENCE="$(red_evidence "$OUT/beads-all.json" "$OUT/transcript.jsonl")
$(printf '%b' "$REDBODY")"
# An assertion: pytest's AssertionError or a bare `assert ` statement (word-bounded, so "reassert"
# does not count), a Jest/Playwright/RSpec matcher call `expect(...).to...` / `.not_to` (a call,
# so prose like "expected the server to be listening" does not count), a Jest "Expected:" line,
# or Playwright's "Locator expected".
ASSERT_RE='AssertionError|(^|[^[:alnum:]_])assert |expect\(.*\)\.(not[._])?to|Expected:|Locator expected'
ASSERT_EV="$(sed -E 's/(^|[^[:alnum:]_])(no|not|without) (an? )?AssertionError/\1/Ig' <<<"$EVIDENCE")"
if grep -Eq "$ASSERT_RE" <<<"$ASSERT_EV"; then pass "the recorded failure is an assertion failure"; else fail "the recorded failure is an assertion failure (close reason or test-writer Red run carrying AssertionError, assert ..., expect(...).to..., Expected: or Locator expected)"; fi
# A negated mention ("collects fine, no ImportError") is stripped before matching; a real load
# error is the error name at the head of a traceback line, never preceded by a negation.
LOAD_ERRORS="$(sed -E 's/(^|[^[:alnum:]_])(no|not|nor|without) (an? )?(ImportError|ModuleNotFoundError)/\1/Ig' <<<"$EVIDENCE")"
if grep -Eq 'ImportError|ModuleNotFoundError' <<<"$LOAD_ERRORS"; then fail "the recorded failure is not a load error (ImportError|ModuleNotFoundError)"; else pass "the recorded failure is not a load error"; fi

ac_done
