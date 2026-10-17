#!/usr/bin/env bash
# AC-1: design.md has an Acceptance Criteria section whose every AC-n block has
# Given, When, Then, an Example: with real values (a digit, a quoted literal, or an arrow
# with text on both sides), Observed at:, Refines:, and a Seam: when Observed at names an
# external or LLM boundary (MCP, HTTP, API, external, LLM, webhook, third-party).
# usage: ac1.sh <run-out-dir>
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
ac_init ac1 "$@"

DESIGN="$(design_md "$OUT")"
if [ -z "$DESIGN" ]; then
  fail "a design.md exists in the run output"
  ac_done
fi
pass "a design.md exists in the run output"

# The Acceptance Criteria section: from its heading to the next heading of equal or higher level.
SECTION="$(awk '
  /^#+ / {
    match($0, /^#+/); lvl = RLENGTH
    if (insec && lvl <= seclvl) { insec = 0 }
    if (!insec && $0 ~ /^#+ .*Acceptance Criteria/) { insec = 1; seclvl = lvl; next }
  }
  insec { print }
' "$DESIGN")"

if [ -z "$SECTION" ]; then
  fail "design.md has an Acceptance Criteria section"
  ac_done
fi
pass "design.md has an Acceptance Criteria section"

# Split into AC-n blocks. A block starts at a bullet or heading line that begins with AC-n.
RESULT="$(printf '%s\n' "$SECTION" | awk '
  # Lowercase and blank out placeholders: [..], <..>, TBD/TODO/XXX/N/A, ellipses, AC-n and Mn references.
  function strip(x) {
    x = tolower(x)
    gsub(/\[[^]]*\]/, " ", x)
    gsub(/<[^>]*>/, " ", x)
    gsub(/\.\.\.|…/, " ", x)
    gsub(/ac-[0-9]+/, " ", x)
    gsub(/(^|[^a-z0-9])m[0-9]+/, " ", x)
    gsub(/(^|[^a-z0-9])(tbd|todo|xxx)([^a-z0-9]|$)/, " ", x)
    gsub(/(^|[^a-z0-9])(tbd|todo|xxx)([^a-z0-9]|$)/, " ", x)
    gsub(/(^|[^a-z0-9])n\/a([^a-z0-9]|$)/, " ", x)
    return x
  }
  function flush() {
    if (id == "") return
    miss = ""
    if (!g) miss = miss " Given"
    if (!w) miss = miss " When"
    if (!t) miss = miss " Then"
    if (!e) miss = miss " Example-with-real-values"
    if (!o) miss = miss " Observed-at"
    if (!r) miss = miss " Refines"
    if (ext && !s) miss = miss " Seam-(external-or-LLM-boundary)"
    if (miss == "") print "OK " id; else print "BAD " id " missing:" miss
  }
  /^([-*][ ]+|#+[ ]+)[*_]*AC-[0-9]+/ {
    flush()
    line = $0; sub(/^([-*][ ]+|#+[ ]+)[*_]*/, "", line)
    id = line; sub(/[^A-Za-z0-9-].*$/, "", id)
    g = w = t = e = o = r = s = ext = 0
    next
  }
  id != "" {
    if ($0 ~ /(^|[^A-Za-z])Given( |:)/)      g = 1
    if ($0 ~ /(^|[^A-Za-z])When( |:)/)       w = 1
    if ($0 ~ /(^|[^A-Za-z])Then( |:)/)       t = 1
    # Real values: after placeholders are stripped, a digit, a quoted literal ("..." or `...`) with a
    # letter or digit inside, or an arrow with alphanumeric text on both sides.
    if (match($0, /Example:/)) {
      ex = strip(substr($0, RSTART + RLENGTH))
      if (ex ~ /[0-9]/) e = 1
      if (ex ~ /[a-z0-9].*(→|->).*[a-z0-9]/) e = 1
      rest = ex
      while (match(rest, /"[^"]*"|`[^`]*`/)) {
        if (substr(rest, RSTART + 1, RLENGTH - 2) ~ /[a-z0-9]/) e = 1
        rest = substr(rest, RSTART + RLENGTH)
      }
    }
    if (match($0, /Observed at:/)) {
      o = 1
      # An external or LLM boundary needs a seam (design.md AC-1). api, llm, mcp match as whole words.
      ob = tolower(substr($0, RSTART + RLENGTH))
      if (ob ~ /(^|[^a-z])(api|llm|mcp)([^a-z]|$)/ || ob ~ /http|external|webhook|third-party/) ext = 1
    }
    # A seam needs real text after stripping placeholders.
    if (match($0, /Seam:/) && strip(substr($0, RSTART + RLENGTH)) ~ /[a-z0-9]/) s = 1
    if ($0 ~ /Refines:/)                     r = 1
  }
  END { flush() }
')"

if [ -z "$RESULT" ]; then
  fail "the Acceptance Criteria section contains at least one AC-n block"
  ac_done
fi
pass "the Acceptance Criteria section contains at least one AC-n block"

while IFS= read -r line; do
  case "$line" in
    OK\ *) pass "${line#OK } has Given/When/Then, Example: with real values, Observed at:, Refines:, Seam: when external/LLM" ;;
    BAD\ *) fail "${line#BAD }" "${line#BAD * }" ;;
  esac
done <<EOF
$RESULT
EOF

ac_done
