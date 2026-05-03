#!/usr/bin/env bash
#
# Extract the final review text from a Claude Code action `execution_file`
# and write it to REVIEW_OUT_FILE. On any failure, write a heading-prefixed
# fallback message and exit 1 (with a `::error::` annotation for GitHub
# Actions log surfacing).
#
# Inputs (env):
#   EXECUTION_FILE   path to the action's execution_file
#                    (a JSON array of SDKMessage objects per
#                    base-action/src/run-claude-sdk.ts)
#   HEADING          markdown heading to prefix the fallback message with
#                    when extraction fails
#   REVIEW_OUT_FILE  output path (default: /tmp/review.txt)
#
# Exit codes:
#   0  review extracted successfully (REVIEW_OUT_FILE has the model output)
#   1  no extractable review (REVIEW_OUT_FILE has heading + fallback message)
#   2  invalid invocation (HEADING not set)

set -eo pipefail

REVIEW_OUT_FILE="${REVIEW_OUT_FILE:-/tmp/review.txt}"

if [ -z "${HEADING:-}" ]; then
  echo "extract-claude-review: HEADING env var is required" >&2
  exit 2
fi

write_fallback() {
  printf '%s\n\nNo review output was produced.\n' "$HEADING" > "$REVIEW_OUT_FILE"
}

if [ -z "${EXECUTION_FILE:-}" ] || [ ! -f "$EXECUTION_FILE" ]; then
  write_fallback
  echo "::error::Claude action did not produce an execution file"
  exit 1
fi

# Primary path: SDKResultSuccess has `.result: string` with the final text.
# `[…] | last` collects matching messages into an array and takes the last
# (defensive against any future change that emits multiple result messages).
REVIEW=$(jq -r '[.[] | select(.type == "result")] | last | .result // empty' \
  "$EXECUTION_FILE" 2>/dev/null || true)

# Fallback: SDKResultError has no `.result` field. Concatenate every
# assistant text block so reviewers still see partial work in error cases.
if [ -z "$REVIEW" ]; then
  REVIEW=$(jq -r '[.[] | select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text] | join("\n\n")' \
    "$EXECUTION_FILE" 2>/dev/null || true)
fi

if [ -z "$REVIEW" ]; then
  write_fallback
  echo "::error::Claude review produced no extractable output"
  exit 1
fi

printf '%s\n' "$REVIEW" > "$REVIEW_OUT_FILE"
