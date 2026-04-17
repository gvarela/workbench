#!/bin/bash
# Detect beads mode once at session start
# Sets BEADS_MODE environment variable to "stealth" or "git"

if [ -n "$CLAUDE_ENV_FILE" ]; then
  if git check-ignore -q .beads/ 2>/dev/null; then
    echo 'export BEADS_MODE=stealth' >> "$CLAUDE_ENV_FILE"
  else
    echo 'export BEADS_MODE=git' >> "$CLAUDE_ENV_FILE"
  fi
fi

exit 0
