#!/usr/bin/env bash
# Commit-history helpers for ac3.sh and ac4.sh. Source after lib.sh; not run on its own.

# commits <git-log-names.txt> : one line per commit, oldest first:
#   sha<TAB>subject<TAB>file,file<TAB>body with newlines escaped as \n
commits() {
  python3 -I - "$1" <<'PY'
import sys
cur, mode = None, None
def flush():
    if cur:
        print("\t".join([cur["sha"], cur["subject"], ",".join(cur["files"]), "\\n".join(cur["body"])]))
for raw in open(sys.argv[1]):
    line = raw.rstrip("\n")
    if line.startswith("COMMIT ") and mode in (None, "files"):
        flush()
        cur = {"sha": line[7:], "subject": "", "files": [], "body": []}
        mode = "head"
    elif mode == "head" and line.startswith("SUBJECT "):
        cur["subject"] = line[8:]
    elif line == "BODY_START" and mode == "head":
        mode = "body"
    elif line == "BODY_END" and mode == "body":
        mode = "files"
    elif mode == "body":
        cur["body"].append(line)
    elif mode == "files" and line.strip():
        cur["files"].append(line.strip())
flush()
PY
}

# is_test_path <path> : true for paths that hold tests.
is_test_path() {
  grep -Eq '(^|/)(tests?|spec|__tests__|e2e)/|(^|/)test_[^/]*$|_test\.[a-z]+$|_spec\.[a-z]+$|\.(spec|test)\.[a-z]+$' <<<"$1"
}
