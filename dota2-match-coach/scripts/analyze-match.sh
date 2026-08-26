#!/bin/sh
set -eu

if [ "$#" -lt 2 ]; then
  exit 2
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MATCH_ID=$1
PLAYER_SELECTOR=$2
shift 2

case "$PLAYER_SELECTOR" in
  '') exit 2 ;;
  *[!0-9]*) exec node "$SCRIPT_DIR/analyze-match.mjs" --match-id "$MATCH_ID" --hero "$PLAYER_SELECTOR" "$@" ;;
  *) exec node "$SCRIPT_DIR/analyze-match.mjs" --match-id "$MATCH_ID" --account-id "$PLAYER_SELECTOR" "$@" ;;
esac
