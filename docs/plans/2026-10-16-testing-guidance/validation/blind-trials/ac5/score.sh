#!/usr/bin/env bash
# Score AC-5 reports: score.sh <out-dir>   (reads <trial>-<n>.report.txt files; answers.md sits beside this script)
set -o pipefail
set -u

if [ $# -ne 1 ]; then
  echo "usage: $0 <out-dir>" >&2
  exit 2
fi
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$1"
ANS="$HERE/answers.md"
TMPFILE="$(mktemp)"
trap 'rm -f "$TMPFILE"' EXIT

printf '%-8s %-5s %-8s %-8s %-6s %-5s %-5s %s\n' trial type expected verdict named line right cause
shopt -s nullglob
for f in "$OUT"/t[0-9][0-9]-[0-9]*.report.txt; do
  base="$(basename "$f" .report.txt)"
  trial="${base%-*}"
  row="$(grep -E "^\| $trial \|" "$ANS")" || { echo "no answer for $trial" >&2; continue; }
  row="${row//\\|/$'\001'}"      # an escaped pipe (\|) inside the evidence regex is not a column separator
  type="$(echo "$row" | awk -F'|' '{gsub(/ /,"",$3); print $3}')"
  expected="$(echo "$row" | awk -F'|' '{gsub(/ /,"",$4); print $4}')"
  planted="$(echo "$row" | awk -F'|' '{gsub(/ /,"",$5); print $5}')"
  evidence="$(echo "$row" | awk -F'|' '{print $6}' | sed -e 's/^ *//' -e 's/ *$//' | tr '\001' '|')"

  # Same literal rule as plugin/skills/implement/SKILL.md: FAIL wins, and a report with no PASS marker is a FAIL.
  if grep -qF '### Status: FAIL' "$f" || ! grep -qF '### Status: PASS' "$f"; then verdict=FAIL; else verdict=PASS; fi

  named="-"; line="-"; right=no
  if [ "$expected" = FAIL ]; then
    pfile="${planted%%:*}"; pline="${planted##*:}"; pbase="$(basename "$pfile")"
    if grep -qF "$pfile" "$f"; then named=yes; else named=no; fi
    # Line numbers count only in file:line form, with the file name anchored on the left and the number on the right.
    if grep -qE "(^|[^A-Za-z0-9_])${pbase//./\\.}:$pline([^0-9]|$)" "$f"; then line=yes; else line=no; fi
    if [ "$verdict" = FAIL ] && grep -qE -- "$evidence" "$f"; then right=yes; fi
  else
    if [ "$verdict" = PASS ]; then right=yes; fi
  fi

  cause=""
  if grep -qiE 'implementation defect' "$f"; then cause="implementation defect"; fi
  if grep -qiE 'plan defect' "$f"; then cause="${cause:+$cause, }plan defect"; fi
  printf '%-8s %-5s %-8s %-8s %-6s %-5s %-5s %s\n' "$base" "$type" "$expected" "$verdict" "$named" "$line" "$right" "${cause:--}"
  echo "$type $right" >> "$TMPFILE"
done

echo
echo "Per-fixture tally (correct / trials; correct = verdict matches the key and, for FAIL cases, the report matches the trial's evidence regex):"
if [ -s "$TMPFILE" ]; then
  awk '{n[$1]++; if ($2=="yes") c[$1]++} END {for (k in n) printf "%s %d/%d\n", k, c[k], n[k]}' "$TMPFILE" | sort
else
  echo "(no reports found in $OUT)"
fi
