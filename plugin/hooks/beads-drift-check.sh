#!/bin/bash
# SessionEnd hook: one-line reminder when a Dolt remote is configured for beads.
# Contract: silent unless sync.remote is set; safe outside beads workspaces; exit 0 always.
# This hook makes one bd call at SessionEnd (bd config get); the manifest timeout is 5s.
# Persistence model: plugin/docs/reference/beads-mode.md (the Dolt directory is never committed;
# cross-machine continuity is a Dolt remote or bd backup).

command -v bd >/dev/null 2>&1 || exit 0
[ -d .beads ] || exit 0

remote=$(bd config get sync.remote 2>/dev/null)
[ -z "$remote" ] && exit 0
echo "$remote" | grep -q "not set" && exit 0

printf '{"systemMessage": "📍 Beads: a Dolt remote is configured — run bd dolt push before ending the session."}\n'
exit 0
