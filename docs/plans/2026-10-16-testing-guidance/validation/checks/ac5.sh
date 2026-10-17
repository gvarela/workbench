#!/usr/bin/env bash
# AC-5 is proved by blind trials, not a headless stage run. This wrapper points at that harness.
#   run:   validation/blind-trials/ac5/run-trial.sh <trial-dir> <n> <out-dir>   (see blind-trials/ac5/README.md)
#   score: this script, which delegates to validation/blind-trials/ac5/score.sh <out-dir>
# usage: ac5.sh <blind-trial-out-dir>
set -o pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ $# -ne 1 ] || [ ! -d "$1" ]; then
  echo "usage: ac5.sh <blind-trial-out-dir>   (scores via $HERE/../blind-trials/ac5/score.sh)" >&2
  exit 2
fi
exec "$HERE/../blind-trials/ac5/score.sh" "$1"
