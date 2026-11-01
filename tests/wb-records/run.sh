#!/usr/bin/env bash
# Tests for plugin/scripts/wb-records.
#
# A fake bd (tests/wb-records/fake-bd) on PATH stores comments under a
# temporary directory; the real beads database is never touched. The script
# runs under the same bash that runs this file, so
#   /bin/bash tests/wb-records/run.sh        (bash 3.2 on macOS)
#   bash tests/wb-records/run.sh             (bash 5)
# exercise both. python3 is used here only to check JSON and hashes.

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${WB_RECORDS:-$HERE/../../plugin/scripts/wb-records}"
BASH_BIN="${BASH:-bash}"

TMP_ROOT="$(mktemp -d)" || exit 1
TMP_ROOT="$(cd "$TMP_ROOT" && pwd -P)"
trap 'rm -rf "$TMP_ROOT"' EXIT
export TMPDIR="$TMP_ROOT/tmp"
mkdir -p "$TMPDIR" "$TMP_ROOT/bin" "$TMP_ROOT/store"
command cp -f "$HERE/fake-bd" "$TMP_ROOT/bin/bd"
chmod +x "$TMP_ROOT/bin/bd"
export FAKE_BD_STORE="$TMP_ROOT/store"
: > "$FAKE_BD_STORE/log"

PASS=0
FAIL=0
ok()   { PASS=$((PASS + 1)); echo "ok   - $1"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL - $1"; [ -n "${LAST:-}" ] && printf '       last output: %.800s\n' "$LAST"; }
check() {
    LAST="$1"
    if printf '%s' "$1" | python3 -I -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if eval(sys.argv[1]) else 1)' "$2" 2>/dev/null; then
        ok "$3"
    else
        fail "$3"
    fi
    LAST=""
}
field() { printf '%s' "$1" | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print(eval(sys.argv[1]))' "$2" 2>/dev/null; }
sha_of_file() { python3 -I -c 'import hashlib,sys; print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' "$1"; }
wr() { PATH="$TMP_ROOT/bin:$PATH" "$BASH_BIN" "$SCRIPT" "$@"; }
exit_is() {
    local want="$1" desc="$2"
    shift 2
    "$@" >/dev/null 2>&1 </dev/null
    local got=$?
    [ "$got" = "$want" ] && ok "$desc" || fail "$desc (exit $got)"
}
newest() { ls "$FAKE_BD_STORE/$1"/*.txt 2>/dev/null | tail -n 1; }
seed() { mkdir -p "$FAKE_BD_STORE/$1"; local n; n=$(ls "$FAKE_BD_STORE/$1" | grep -c '\.txt$'); printf '%s' "$2" > "$FAKE_BD_STORE/$1/$(printf '%04d' $((n + 1))).txt"; }

# ---------------------------------------------------------------- post --escaped
ESC='verification report:\n# heading line\nquote "double" '"'"'single'"'"' `tick` $(sub) back\\slash\ttab\nend'
printf '%b' "$ESC" > "$TMP_ROOT/want1"
out="$(wr post ISS-1 --escaped "$ESC")"
check "$out" 'd["posted"] is True and d["error"] is None and d["comment_id"]=="c-0001"' "post --escaped: posted and confirmed by read-back"
check "$out" 'd["sha256"]=="'"$(sha_of_file "$TMP_ROOT/want1")"'" and d["bytes"]=='"$(wc -c < "$TMP_ROOT/want1" | tr -d ' ')" "post --escaped: sha256 and bytes are over the decoded text"
cmp -s "$(newest ISS-1)" "$TMP_ROOT/want1" && ok "post --escaped: the stored comment is the exact decoded text (# lines, quotes, backticks, \$(, tab, backslash)" || fail "post --escaped: the stored comment is the exact decoded text (# lines, quotes, backticks, \$(, tab, backslash)"
grep -q 'comments add ISS-1 -f ' "$FAKE_BD_STORE/log" && ok "post: bd comments add <issue> -f <file> is used" || fail "post: bd comments add <issue> -f <file> is used"
[ -z "$(ls -A "$TMPDIR")" ] && ok "post: the private temp file is removed" || fail "post: the private temp file is removed"
exit_is 2 "post --escaped: an unknown escape (\\q) is refused" wr post ISS-1 --escaped 'verification report:\qbad'
exit_is 2 "post --escaped: a real newline in the argument is refused" wr post ISS-1 --escaped $'verification report:\nreal newline'
# ---------------------------------------------------------------- post <base64>
printf 'defect ledger (1/2):\n# a\n`x` $(y) "z"\n' > "$TMP_ROOT/want2"
B64="$(base64 < "$TMP_ROOT/want2" | tr -d '\n')"
out="$(wr post ISS-2 "$B64")"
printf 'defect ledger (1/2):\n# a\n`x` $(y) "z"' > "$TMP_ROOT/want2s"
check "$out" 'd["posted"] is True and d["sha256"]=="'"$(sha_of_file "$TMP_ROOT/want2s")"'"' "post <base64>: posted (trailing newlines stripped before posting; sha256 over what was posted)"
cmp -s "$(newest ISS-2)" "$TMP_ROOT/want2s" && ok "post <base64>: the stored comment is the decoded text" || fail "post <base64>: the stored comment is the decoded text"
before="$(wc -l < "$FAKE_BD_STORE/log")"
exit_is 2 "post: text without a known record prefix is refused" wr post ISS-2 --escaped 'hello world'
exit_is 2 "post: a prefix that is not at the start is refused" wr post ISS-2 --escaped 'note\nverification report:'
exit_is 2 "post: bad base64 is refused" wr post ISS-2 'not*base64'
exit_is 2 "post: an invalid issue id is refused" wr post 'ISS 2;rm' --escaped 'verification report: x'
[ "$(wc -l < "$FAKE_BD_STORE/log")" = "$before" ] && ok "post: refused input never reaches bd" || fail "post: refused input never reaches bd"
for p in 'test integrity:' 'phase verification (2/3):'; do
    out="$(wr post ISS-P --escaped "$p body")"
    check "$out" 'd["posted"] is True' "post: prefix accepted: $p"
done
out="$(BD_FAIL=1 wr post ISS-3 --escaped 'verification report: x')"
check "$out" 'd["posted"] is False and d["error"] and d["comment_id"] is None' "post: a bd failure gives posted false with the error"
out="$(BD_MANGLE=1 wr post ISS-3 --escaped 'verification report: y')"
check "$out" 'd["posted"] is False and "read-back" in d["error"]' "post: a read-back that does not match gives posted false"
exit_is 2 "post --escaped: \\u is not one of the escapes" wr post ISS-U --escaped 'verification report: caf\'"u00e9"
printf 'verification report: <tag> & café' > "$TMP_ROOT/want-u"
out="$(wr post ISS-U --escaped "$(cat "$TMP_ROOT/want-u")")"
check "$out" 'd["posted"] is True' "post: read-back decodes bd's \\u003c / \\u0026 escapes and UTF-8"

# ---------------------------------------------------------------- manifest and read
P2="$(wr post ISS-R --escaped 'defect ledger (2/2):\nsecond # part')"
P1="$(wr post ISS-R --escaped 'defect ledger (1/2):\nfirst `part`')"
H1="$(field "$P1" 'd["sha256"]')"
H2="$(field "$P2" 'd["sha256"]')"
M="$(wr manifest ISS-R 'defect ledger' "$H1" "$H2")"
check "$M" 'd["posted"] is True' "manifest: posted through the same path"
[ "$(cat "$(newest ISS-R)")" = "defect ledger manifest: parts=2 sha256=$H1,$H2" ] && ok "manifest: the exact manifest line" || fail "manifest: the exact manifest line"
exit_is 2 "manifest: a sha256 that is not 64 hex characters is refused" wr manifest ISS-R 'defect ledger' abc
exit_is 2 "manifest: an unknown record name is refused" wr manifest ISS-R 'notes' "$H1"
out="$(wr read ISS-R 'defect ledger')"
printf 'defect ledger (1/2):\nfirst `part`\ndefect ledger (2/2):\nsecond # part' > "$TMP_ROOT/want-r"
check "$out" 'd["status"]=="ok" and d["parts"]==2 and d["text"]==open("'"$TMP_ROOT"'/want-r").read() and d["part_comment_ids"]==["c-0002","c-0001"] and d["manifest_comment_id"]=="c-0003"' "read: ok, parts out of order in comments joined in part order"
out="$(wr read ISS-R 'verification report')"
check "$out" 'd["status"]=="missing" and d["parts"]==0' "read: a record with no comments is missing"
seed ISS-M 'test integrity (1/1):
body'
seed ISS-M "test integrity manifest: parts=1 sha256=$(printf '0%.0s' $(seq 1 64))"
check "$(wr read ISS-M 'test integrity')" 'd["status"]=="mismatch"' "read: a part whose sha256 differs from the manifest is a mismatch"
seed ISS-I 'phase verification (1/2):
one'
seed ISS-I "phase verification manifest: parts=2 sha256=$H1,$H2"
check "$(wr read ISS-I 'phase verification')" 'd["status"]=="incomplete"' "read: a manifest whose parts are not all present is incomplete"
seed ISS-J 'phase verification (1/1):
only'
check "$(wr read ISS-J 'phase verification')" 'd["status"]=="incomplete"' "read: parts with no manifest are incomplete"
# discarded: cutoff
seed ISS-R 'discarded: the defect ledger above was wrong'
check "$(wr read ISS-R 'defect ledger')" 'd["status"]=="missing"' "read: nothing before the latest discarded: comment counts"
# multiple sets: the latest wins (an unnumbered single part)
S1="$(wr post ISS-R --escaped 'defect ledger:\nnewest')"
wr manifest ISS-R 'defect ledger' "$(field "$S1" 'd["sha256"]')" >/dev/null
out="$(wr read ISS-R 'defect ledger')"
check "$out" 'd["status"]=="ok" and d["parts"]==1 and d["text"]=="defect ledger:\nnewest"' "read: the latest set wins; an unnumbered single part counts"
exit_is 2 "read: an unknown record name is refused" wr read ISS-R 'notes'
before="$(grep -c 'comments add' "$FAKE_BD_STORE/log")"
wr read ISS-R 'defect ledger' >/dev/null
[ "$(grep -c 'comments add' "$FAKE_BD_STORE/log")" = "$before" ] && ok "read: read-only (never adds a comment)" || fail "read: read-only (never adds a comment)"

# ---------------------------------------------------------------- review fixes
# Only `manifest` posts manifests.
exit_is 2 "post: a manifest line is refused (only the manifest command posts manifests)" wr post ISS-X --escaped 'defect ledger manifest: parts=1 sha256=ZZ'
exit_is 2 "post: a hand-made parts=0 manifest is refused" wr post ISS-X --escaped 'defect ledger manifest: parts=0 sha256='
# Invalid manifests never read ok; the newest fully verifying set wins.
V1="$(wr post ISS-V --escaped 'test integrity:\nvalid set')"
wr manifest ISS-V 'test integrity' "$(field "$V1" 'd["sha256"]')" >/dev/null
seed ISS-V 'test integrity manifest: parts=0 sha256='
seed ISS-V 'test integrity manifest: parts=x sha256=0000000000000000000000000000000000000000000000000000000000000000'
seed ISS-V 'test integrity manifest: parts=2 sha256=0000000000000000000000000000000000000000000000000000000000000000'
out="$(wr read ISS-V 'test integrity')"
check "$out" 'd["status"]=="ok_with_newer_invalid" and d["text"]=="test integrity:\nvalid set" and d["newer_invalid"]==["c-0005","c-0004","c-0003"]' "read: newer invalid or incomplete manifests are skipped and listed; the newest verifying set is returned"
seed ISS-W 'test integrity manifest: parts=0 sha256='
check "$(wr read ISS-W 'test integrity')" 'd["status"]!="ok" and d["status"]!="ok_with_newer_invalid"' "read: a parts=0 manifest alone never reads ok"
seed ISS-W2 'test integrity:
x'
seed ISS-W2 'test integrity manifest: parts=x sha256=0000000000000000000000000000000000000000000000000000000000000000'
check "$(wr read ISS-W2 'test integrity')" 'd["status"] not in ("ok","ok_with_newer_invalid")' "read: a parts=x manifest never reads ok"
check "$(wr read ISS-R 'defect ledger')" 'd["newer_invalid"]==[]' "read: newer_invalid is empty when the newest manifest verifies"
# JSON shapes: compact, reordered, extra and nested fields, malformed.
for mode in compact reorder extra; do
    out="$(BD_JSON_MODE=$mode wr post ISS-J-$mode --escaped 'verification report: "q" \\b <x> & y')"
    check "$out" 'd["posted"] is True and d["comment_id"]=="c-0001"' "json ($mode): post reads its comment back"
    wr manifest ISS-J-$mode 'verification report' "$(field "$out" 'd["sha256"]')" >/dev/null
    out="$(BD_JSON_MODE=$mode wr read ISS-J-$mode 'verification report')"
    check "$out" 'd["status"]=="ok" and d["text"]=="verification report: \"q\" \\b <x> & y"' "json ($mode): read ok with the exact text"
done
out="$(BD_JSON_MODE=malformed wr post ISS-J-bad --escaped 'verification report: z')"
check "$out" 'd["posted"] is False and d["error"]' "json (malformed): post reports an error"
out="$(BD_JSON_MODE=malformed wr read ISS-J-compact 'verification report')"
check "$out" 'd["status"]=="error" and d["error"]' "json (malformed): read reports an error"
# NUL is refused (records are text).
NULB64="$(printf 'verification report: a\000b' | base64 | tr -d '\n')"
exit_is 2 "post: decoded text containing NUL is refused" wr post ISS-N "$NULB64"
# An unsafe TMPDIR (world-writable, not sticky) is not used.
mkdir -p "$TMP_ROOT/unsafe"
chmod 777 "$TMP_ROOT/unsafe"
out="$(TMPDIR="$TMP_ROOT/unsafe" wr post ISS-T --escaped 'verification report: tmp')"
check "$out" 'd["posted"] is True' "temp: post works with an unsafe TMPDIR (falls back)"
[ -z "$(ls -A "$TMP_ROOT/unsafe")" ] && ok "temp: nothing is created in a world-writable, non-sticky TMPDIR" || fail "temp: nothing is created in a world-writable, non-sticky TMPDIR"

echo
echo "bash $BASH_VERSION: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
