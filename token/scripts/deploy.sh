#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$TOKEN_DIR"

# Load environment variables if present
if [ -f "$TOKEN_DIR/.env" ]; then
    # shellcheck disable=SC1091
    source "$TOKEN_DIR/.env"
fi

# ------------------------------------------------------------------------------
# Optional dry-run mode (skips sncast declare/deploy; still validates paths/build)
# ------------------------------------------------------------------------------
DRY_RUN="${DRY_RUN:-0}"

# ------------------------------------------------------------------------------
# sncast configuration
# ------------------------------------------------------------------------------
# These can be overridden via environment variables when calling the script:
#   SNCAST_PROFILE=myprofile1 SNCAST_NETWORK=mainnet SNCAST_ACCOUNTS_FILE=./account-file ./scripts/deploy.sh
SNCAST_PROFILE="${SNCAST_PROFILE:-myprofile1}"
SNCAST_NETWORK="${SNCAST_NETWORK:-mainnet}"
#
# Backwards compatibility:
# - historically some tooling used STARKNET_ACCOUNT as a path to an account JSON
# - this repo also includes token/account.json, which is a reasonable default for local usage
SNCAST_ACCOUNTS_FILE="${SNCAST_ACCOUNTS_FILE:-${STARKNET_ACCOUNT:-}}"

if ! command -v scarb >/dev/null 2>&1; then
    echo "Error: scarb not found on PATH. Install Scarb (Cairo package manager)."
    exit 1
fi

if [ "$DRY_RUN" != "1" ]; then
    if ! command -v sncast >/dev/null 2>&1; then
        echo "Error: sncast not found on PATH. Install Starknet Foundry (snforge/sncast)."
        exit 1
    fi
fi

echo "Using sncast profile: $SNCAST_PROFILE (network: $SNCAST_NETWORK)"
if [ -n "${SNCAST_ACCOUNTS_FILE:-}" ]; then
    if [ ! -f "$SNCAST_ACCOUNTS_FILE" ]; then
        echo "Error: accounts file not found at: $SNCAST_ACCOUNTS_FILE"
        exit 1
    fi
    echo "Using sncast accounts file (override): $SNCAST_ACCOUNTS_FILE"
else
    echo "Using sncast accounts file from profile config (snfoundry.toml)"
fi

OWNER="${OWNER:-0x418ed348930686c844fda4556173457d3f71ae547262406d271de534af6b35e}"

SUMMIT_ADDRESS="${SUMMIT_ADDRESS:-0x04ec11a167e44d33d1bcd84b243f0d67b890e638f1760a3a29e5e357f362cd01}"  # Summit contract

# ------------------------------------------------------------------------------
# Token name & symbol (ASCII -> ByteArray conversion)
# ------------------------------------------------------------------------------
# You can now specify TOKEN_NAME and TOKEN_SYMBOL in plain ASCII text.
# The script will convert them to the ByteArray format (data_len, pending_word, pending_len).
# For strings <= 31 bytes, data_len=0 and the string is stored in pending_word.

ascii_to_bytearray() {
    local str="$1"
    local len=${#str}
    
    if [ "$len" -eq 0 ]; then
        echo "0,0,0"
        return
    fi
    
    if [ "$len" -gt 31 ]; then
        echo "Error: String '$str' is longer than 31 bytes. Long strings not yet supported." >&2
        exit 1
    fi
    
    # Convert ASCII string to hex
    local hex
    hex=$(printf '%s' "$str" | xxd -p | tr -d '\n' | tr '[:lower:]' '[:upper:]')
    
    echo "0,0x${hex},${len}"
}

# Token name and symbol in plain ASCII (will be converted to ByteArray format)
TOKEN_NAME_ASCII="${TOKEN_NAME_ASCII:-TestPoisonPotion8}"
TOKEN_SYMBOL_ASCII="${TOKEN_SYMBOL_ASCII:-TPOI8}"

token_name=$(ascii_to_bytearray "$TOKEN_NAME_ASCII")
token_symbol=$(ascii_to_bytearray "$TOKEN_SYMBOL_ASCII")

echo "Token name: '$TOKEN_NAME_ASCII' -> $token_name"
echo "Token symbol: '$TOKEN_SYMBOL_ASCII' -> $token_symbol"

terminal_timestamp="${TERMINAL_TIMESTAMP:-1773308681}"

CONTRACT_NAME="ConsumableERC20"
CONTRACT_PACKAGE="summit_consumable"

# Build the project
echo "Building project..."
scarb build

# Check if contract file exists
CONTRACT_FILE="target/dev/summit_consumable_ConsumableERC20.contract_class.json"
if [ ! -f "$CONTRACT_FILE" ]; then
    echo "Error: Contract file not found at $CONTRACT_FILE"
    exit 1
fi
echo "Contract file found: $CONTRACT_FILE"

# If DRY_RUN is enabled, stop after build/artifact checks.
if [ "$DRY_RUN" = "1" ]; then
    echo ""
    echo "DRY_RUN=1: build succeeded and contract artifact exists."
    echo "Would declare/deploy:"
    echo "  profile: $SNCAST_PROFILE"
    echo "  network: $SNCAST_NETWORK"
    echo "  accounts file: $SNCAST_ACCOUNTS_FILE"
    exit 0
fi

# ------------------------------------------------------------------------------
# Contract class declaration (sncast)
# ------------------------------------------------------------------------------
echo "Starting contract declaration with sncast..."
echo "Contract package: $CONTRACT_PACKAGE"
echo "Contract name: $CONTRACT_NAME"

SNCAST_BASE=(sncast --profile "$SNCAST_PROFILE")
if [ -n "${SNCAST_ACCOUNTS_FILE:-}" ]; then
    SNCAST_BASE+=(--accounts-file "$SNCAST_ACCOUNTS_FILE")
fi

# Temporarily disable 'exit on error' so we can capture failures
set +e

DECLARE_OUTPUT_FILE=$(mktemp /tmp/sncast_declare_output.XXXXXX)
"${SNCAST_BASE[@]}" \
    declare \
    --network "$SNCAST_NETWORK" \
    --package "$CONTRACT_PACKAGE" \
    --contract-name "$CONTRACT_NAME" >"$DECLARE_OUTPUT_FILE" 2>&1
DECLARE_EXIT_CODE=$?

# Re-enable 'exit on error' for the rest of the script
set -e

DECLARE_OUTPUT=$(cat "$DECLARE_OUTPUT_FILE")
rm -f "$DECLARE_OUTPUT_FILE"

echo "Declare exit code: $DECLARE_EXIT_CODE"
echo "Full sncast declare output:"
echo "---------------------------"
echo "$DECLARE_OUTPUT"
echo "---------------------------"

if [ $DECLARE_EXIT_CODE -ne 0 ]; then
    echo "sncast declare returned non-zero exit code; attempting to extract class hash anyway (it may already be declared)..."
fi

# Extract class hash from output.
CLASS_HASH=""
if echo "$DECLARE_OUTPUT" | grep -qi "Class Hash"; then
    # Prefer the line explicitly labeled "Class Hash" (format varies slightly across sncast versions)
    CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -i "Class Hash" | grep -oE "0x[0-9a-fA-F]+" | tail -1 || true)
fi
if [ -z "$CLASS_HASH" ]; then
    # Fallback: grab a hex-looking value; prefer the last one (often class hash comes after tx hash)
    CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -oE "0x[0-9a-fA-F]+" | tail -1 || true)
fi
if [ -z "$CLASS_HASH" ]; then
    echo "Could not determine a class hash from sncast declare output."
    echo "Falling back to local computation via: sncast utils class-hash ..."

    set +e
    CLASS_HASH_OUTPUT_FILE=$(mktemp /tmp/sncast_class_hash_output.XXXXXX)
    "${SNCAST_BASE[@]}" \
        utils class-hash \
        --package "$CONTRACT_PACKAGE" \
        --contract-name "$CONTRACT_NAME" >"$CLASS_HASH_OUTPUT_FILE" 2>&1
    CLASS_HASH_EXIT_CODE=$?
    set -e

    CLASS_HASH_OUTPUT=$(cat "$CLASS_HASH_OUTPUT_FILE")
    rm -f "$CLASS_HASH_OUTPUT_FILE"

    if [ $CLASS_HASH_EXIT_CODE -ne 0 ]; then
        echo "Error: sncast utils class-hash failed (exit code $CLASS_HASH_EXIT_CODE)"
        echo "Output:"
        echo "---------------------------"
        echo "$CLASS_HASH_OUTPUT"
        echo "---------------------------"
        exit 1
    fi

    CLASS_HASH=$(echo "$CLASS_HASH_OUTPUT" | grep -oE "0x[0-9a-fA-F]+" | head -1)
    if [ -z "$CLASS_HASH" ]; then
        echo "Error: sncast utils class-hash did not return a parseable class hash"
        echo "Output:"
        echo "---------------------------"
        echo "$CLASS_HASH_OUTPUT"
        echo "---------------------------"
        exit 1
    fi
fi

echo "Using class hash: $CLASS_HASH"

# Function to wait for transaction confirmation using sncast tx-status
wait_for_tx() {
    local tx_hash=$1
    local label=$2
    local max_attempts="${3:-60}"  # Default 60 attempts (5 minutes with 5s sleep)
    local attempt=0
    
    echo "Waiting for $label transaction to be confirmed..."
    echo "Transaction hash: $tx_hash"
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        
        set +e
        TX_STATUS_OUTPUT=$("${SNCAST_BASE[@]}" tx-status --network "$SNCAST_NETWORK" "$tx_hash" 2>&1)
        TX_STATUS_EXIT=$?
        set -e
        
        # Check for successful statuses
        if echo "$TX_STATUS_OUTPUT" | grep -qi "AcceptedOnL2\|AcceptedOnL1\|Succeeded"; then
            echo "$label transaction confirmed! (attempt $attempt)"
            echo ""
            return 0
        fi
        
        # "Not found" means the transaction hasn't been indexed yet - keep waiting
        if echo "$TX_STATUS_OUTPUT" | grep -qi "not found\|does not exist"; then
            echo "  Attempt $attempt/$max_attempts: Transaction not yet indexed, waiting..."
            sleep 5
            continue
        fi
        
        # Check for actual failure statuses (but not "not found")
        if echo "$TX_STATUS_OUTPUT" | grep -qi "Rejected\|Reverted"; then
            echo "Error: $label transaction failed!"
            echo "Status output: $TX_STATUS_OUTPUT"
            return 1
        fi
        
        # Still pending, wait and retry
        echo "  Attempt $attempt/$max_attempts: Transaction pending..."
        sleep 5
    done
    
    echo "Warning: Timed out waiting for $label transaction confirmation after $max_attempts attempts"
    echo "Proceeding anyway - the transaction may still be pending"
    return 0
}

# Wait for declaration transaction if we got a transaction hash
DECLARE_TX_HASH=""
if echo "$DECLARE_OUTPUT" | grep -qi "Transaction Hash"; then
    DECLARE_TX_HASH=$(echo "$DECLARE_OUTPUT" | grep -i "Transaction Hash" | grep -oE "0x[0-9a-fA-F]+" | head -1 || true)
fi
# Fallback: look for "transaction_hash" in JSON-like output
if [ -z "$DECLARE_TX_HASH" ]; then
    DECLARE_TX_HASH=$(echo "$DECLARE_OUTPUT" | grep -oE "transaction_hash.*0x[0-9a-fA-F]+" | grep -oE "0x[0-9a-fA-F]+" | head -1 || true)
fi

if [ -n "$DECLARE_TX_HASH" ]; then
    echo ""
    wait_for_tx "$DECLARE_TX_HASH" "Declaration"
else
    # If no tx hash found, the class might already be declared - wait a bit just in case
    if echo "$DECLARE_OUTPUT" | grep -qi "already declared\|already exists"; then
        echo "Class appears to already be declared, proceeding..."
    else
        echo "No declaration transaction hash found - waiting 20 seconds before deployment..."
        sleep 20
    fi
fi

# Contract deployment
echo "Starting deployment..."
echo "Deploying with parameters:"
echo "  CLASS_HASH: $CLASS_HASH"
echo "  OWNER: $OWNER"
echo "  TERMINAL_TIMESTAMP: $terminal_timestamp"
echo "  SUMMIT_ADDRESS: $SUMMIT_ADDRESS"
echo ""

echo "Starting sncast deploy command..."
echo "Note: This may take several minutes as we wait for each transaction to confirm..."
echo ""

# ------------------------------------------------------------------------------
# Contract deployment (sncast)
# ------------------------------------------------------------------------------
set +e
DEPLOY_OUTPUT_FILE=$(mktemp /tmp/sncast_deploy_output.XXXXXX)

# Use raw felts for constructor calldata to avoid Cairo-like parsing issues with ByteArray.
# Constructor signature:
# (owner, name(ByteArray), symbol(ByteArray), summit_address, terminal_timestamp)
#
# ByteArray serialization is flattened felts:
#   (data_len, [data_words...], pending_word, pending_len)
#
# Our defaults use only pending_word/pending_len (data_len=0).
IFS=',' read -r -a NAME_FELTS <<<"$token_name"
IFS=',' read -r -a SYMBOL_FELTS <<<"$token_symbol"
CONSTRUCTOR_CALLDATA=(
    "$OWNER"
    "${NAME_FELTS[@]}"
    "${SYMBOL_FELTS[@]}"
    "$SUMMIT_ADDRESS"
    "$terminal_timestamp"
)

"${SNCAST_BASE[@]}" \
    deploy \
    --network "$SNCAST_NETWORK" \
    --class-hash "$CLASS_HASH" \
    --constructor-calldata "${CONSTRUCTOR_CALLDATA[@]}" \
    >"$DEPLOY_OUTPUT_FILE" 2>&1
DEPLOY_EXIT_CODE=$?

set -e

DEPLOY_OUTPUT=$(cat "$DEPLOY_OUTPUT_FILE")
rm -f "$DEPLOY_OUTPUT_FILE"

echo "Deploy exit code: $DEPLOY_EXIT_CODE"
echo "Full sncast deploy output:"
echo "---------------------------"
echo "$DEPLOY_OUTPUT"
echo "---------------------------"

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo "Error: Deployment failed with exit code $DEPLOY_EXIT_CODE"
    exit 1
fi

# Try to extract deployed contract address / tx hash for convenience (format depends on sncast version)
TX_HASH=$(echo "$DEPLOY_OUTPUT" | grep -i "Transaction Hash" | grep -oE "0x[0-9a-fA-F]+" | head -1 || true)
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -i "Contract Address" | grep -oE "0x[0-9a-fA-F]+" | tail -1 || true)

if [ -n "${TX_HASH:-}" ]; then
    wait_for_tx "$TX_HASH" "ConsumableERC20"
fi

echo ""
echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
echo "Class Hash: $CLASS_HASH"
if [ -n "${CONTRACT_ADDRESS:-}" ]; then
    echo "Contract Address: $CONTRACT_ADDRESS"
fi
echo ""
echo "To view your deployed contract on Voyager:"
if [ -n "${CONTRACT_ADDRESS:-}" ]; then
    echo "https://voyager.online/contract/$CONTRACT_ADDRESS"
else
    echo "https://voyager.online/class/$CLASS_HASH"
fi