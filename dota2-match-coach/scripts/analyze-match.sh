#!/bin/sh
set -eu

# Usage: analyze-match.sh <match ID or link> <account ID | profile link | slot=N | hero name> [runtime options]
if [ "$#" -lt 2 ]; then
  echo 'usage: analyze-match.sh <match ID or link> <account ID | profile link | slot=N | "Hero Name"> [--output-dir DIR] [--history-dir DIR] [--parse-timeout-ms MS]' >&2
  exit 2
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MATCH_ID=$1
PLAYER_SELECTOR=$2
shift 2

case "$PLAYER_SELECTOR" in
  '') exit 2 ;;
  slot=[0-9]) exec node "$SCRIPT_DIR/analyze-match.mjs" --match-id "$MATCH_ID" --slot "${PLAYER_SELECTOR#slot=}" "$@" ;;
  http://*|https://*) exec node "$SCRIPT_DIR/analyze-match.mjs" --match-id "$MATCH_ID" --account-id "$PLAYER_SELECTOR" "$@" ;;
  *[!0-9]*) exec node "$SCRIPT_DIR/analyze-match.mjs" --match-id "$MATCH_ID" --hero "$PLAYER_SELECTOR" "$@" ;;
  *) exec node "$SCRIPT_DIR/analyze-match.mjs" --match-id "$MATCH_ID" --account-id "$PLAYER_SELECTOR" "$@" ;;
esac
