#!/usr/bin/env bash
#
# Local test runner for extract-claude-review.sh.
#
# Iterates over fixture files under .github/fixtures/ and asserts the
# script's exit code and the content of REVIEW_OUT_FILE for each scenario
# we care about end-to-end:
#
#   1. Multi-line .result success — full body preserved (catches the
#      `tail -1` regression that would silently drop [HIGH] markers).
#   2. .result containing [HIGH] — survives extraction so the downstream
#      `grep -qE '\[(CRITICAL|HIGH)\]'` blocking check still fires.
#   3. SDKResultError (no .result, has assistant text) — falls back to
#      assistant text concatenation.
#   4. Empty array — exit 1 with heading-prefixed fallback.
#   5. Malformed JSON — exit 1 with heading-prefixed fallback (catches
#      jq exit 5 propagating through `bash -eo pipefail`).
#   6. Missing file — exit 1 with heading-prefixed fallback.
#
# Run from the repo root:
#   bash .github/scripts/test-extract-claude-review.sh

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURES_DIR="$REPO_ROOT/.github/fixtures"
EXTRACT="$SCRIPT_DIR/extract-claude-review.sh"

if [ ! -x "$EXTRACT" ]; then
  echo "extract-claude-review.sh not found or not executable at $EXTRACT" >&2
  exit 2
fi

PASS=0
FAIL=0
TMPDIR_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_ROOT"' EXIT

# run_case <label> <expected_exit> <execution_file> <pattern> [<pattern>...]
#   Runs extract-claude-review.sh against the given fixture and asserts:
#     - exit code matches expected
#     - every <pattern> appears at least once in REVIEW_OUT_FILE (grep -E)
run_case() {
  local label="$1" expected_exit="$2" execution_file="$3"
  shift 3
  local patterns=("$@")
  local out
  out="$TMPDIR_ROOT/$(printf '%s' "$label" | tr ' /[]' '____').out"

  local exit_code=0
  EXECUTION_FILE="$execution_file" \
  HEADING="## Claude Review - Test Scope" \
  REVIEW_OUT_FILE="$out" \
    bash "$EXTRACT" >/dev/null 2>&1 || exit_code=$?

  local result="PASS" reason=""
  if [ "$exit_code" != "$expected_exit" ]; then
    result="FAIL"
    reason="exit=$exit_code expected=$expected_exit"
  else
    for pattern in "${patterns[@]}"; do
      if ! grep -qE "$pattern" "$out"; then
        result="FAIL"
        reason="output missing pattern '$pattern'"
        break
      fi
    done
  fi

  if [ "$result" = "PASS" ]; then
    PASS=$((PASS + 1))
    printf '  [PASS] %s\n' "$label"
  else
    FAIL=$((FAIL + 1))
    printf '  [FAIL] %s — %s\n' "$label" "$reason"
    printf '         output (first 5 lines):\n'
    head -n 5 "$out" 2>/dev/null | sed 's/^/         | /'
  fi
}

echo "Running extract-claude-review.sh fixture tests"
echo

run_case "success: multi-line .result preserves heading + body + summary" \
  0 \
  "$FIXTURES_DIR/claude-execution-success.json" \
  '^## Claude Review - Test Scope$' \
  '^Summary: 0 CRITICAL, 0 HIGH'

run_case "success-with-HIGH: bracketed [HIGH] marker survives extraction" \
  0 \
  "$FIXTURES_DIR/claude-execution-success-with-high.json" \
  '\[HIGH\] contracts/src/foo\.cairo:42'

run_case "error: SDKResultError falls back to assistant text concat" \
  0 \
  "$FIXTURES_DIR/claude-execution-error.json" \
  'Starting review of the contracts diff' \
  'Partial review before error'

run_case "empty array: exits 1 with heading + fallback" \
  1 \
  "$FIXTURES_DIR/claude-execution-empty.json" \
  '^## Claude Review - Test Scope$' \
  '^No review output was produced\.$'

run_case "malformed JSON: exits 1 with heading + fallback" \
  1 \
  "$FIXTURES_DIR/claude-execution-bad.json" \
  '^## Claude Review - Test Scope$' \
  '^No review output was produced\.$'

run_case "missing file: exits 1 with heading + fallback" \
  1 \
  "$FIXTURES_DIR/does-not-exist.json" \
  '^## Claude Review - Test Scope$' \
  '^No review output was produced\.$'

echo
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
