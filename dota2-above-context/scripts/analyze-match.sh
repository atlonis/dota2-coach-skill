#!/bin/sh
set -eu

if [ "$#" -lt 2 ]; then
  exit 2
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MATCH_ID=$1
ACCOUNT_ID=$2
shift 2
exec node "$SCRIPT_DIR/analyze-match.mjs" --match-id "$MATCH_ID" --account-id "$ACCOUNT_ID" "$@"
