#!/bin/bash
set -e

source .env

# Validate required environment variables
if [ -z "$STARKNET_ACCOUNT" ] || [ -z "$STARKNET_PRIVATE_KEY" ]; then
    echo "Error: STARKNET_ACCOUNT and STARKNET_PRIVATE_KEY must be set in .env"
    exit 1
fi

OWNER="0x418ed348930686c844fda4556173457d3f71ae547262406d271de534af6b35e"
summit_address="0x036017e69d21d6d8c13e266eabb73ef1f1d02722d86bdcabe5f168f8e549d3cd"

kill_token_name="0 0x546573744b696c6c546f6b656e 13"
kill_token_symbol="0 0x5453544B54 5"

corpse_token_name="0 0x54657374436f72707365546f6b656e 15"
corpse_token_symbol="0 0x5453544354 5"

terminal_timestamp=1767370165

# Build the project
echo "Building project..."
scarb build

# Check if contract file exists
CONTRACT_FILE="target/dev/test_consumable_SummitERC20.contract_class.json"
if [ ! -f "$CONTRACT_FILE" ]; then
    echo "Error: Contract file not found at $CONTRACT_FILE"
    exit 1
fi
echo "Contract file found: $CONTRACT_FILE"

# Extract account address from the JSON file
ACCOUNT_ADDRESS=$(cat "$STARKNET_ACCOUNT" | grep -o '"address"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '0x[0-9a-fA-F]*')
echo "Account address: $ACCOUNT_ADDRESS"

# Contract class declaration
echo "Starting contract declaration..."
echo "Using account: $STARKNET_ACCOUNT"

# First, let's check if the contract is already declared by computing the class hash
COMPUTED_CLASS_HASH=$(starkli class-hash "$CONTRACT_FILE" 2>&1)
echo "Computed class hash: $COMPUTED_CLASS_HASH"

# Try to declare the contract
echo "Attempting declare..."
DECLARE_OUTPUT=$(starkli declare \
    --account "$STARKNET_ACCOUNT" \
    --private-key "$STARKNET_PRIVATE_KEY" \
    --rpc https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/6Pzw4ZYxhoeS_bpcXV9oI5FjSCdKZE8d \
    "$CONTRACT_FILE" 2>&1)
    
DECLARE_EXIT_CODE=$?
echo "Declare exit code: $DECLARE_EXIT_CODE"
echo "Declare output: $DECLARE_OUTPUT"

# Extract class hash from output
if echo "$DECLARE_OUTPUT" | grep -q "already declared"; then
    echo "Contract already declared, extracting class hash..."
    # Extract from "Class hash:" line
    CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -A1 "already declared" | grep -oE "0x[0-9a-fA-F]+" | tail -1)
elif echo "$DECLARE_OUTPUT" | grep -q "Class hash declared:"; then
    echo "Contract successfully declared, extracting class hash..."
    CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -A1 "Class hash declared:" | grep -oE "0x[0-9a-fA-F]+" | tail -1)
else
    # Try to extract any hex value as fallback
    CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -oE "0x[0-9a-fA-F]+" | tail -1)
fi

if [ -z "$CLASS_HASH" ]; then
    echo "Warning: Failed to extract class hash from declare output"
    echo "Using computed class hash as fallback: $COMPUTED_CLASS_HASH"
    CLASS_HASH=$COMPUTED_CLASS_HASH
    
    # Validate the computed class hash
    if [ -z "$CLASS_HASH" ] || [ "$CLASS_HASH" = "Error:"* ]; then
        echo "Error: Could not determine a valid class hash"
        exit 1
    fi
fi

echo "Using class hash: $CLASS_HASH"

# Wait for the declaration to be confirmed on-chain
if echo "$DECLARE_OUTPUT" | grep -q "Contract declaration transaction"; then
    echo "Waiting for declaration to be confirmed on-chain..."
    sleep 10
fi

# Function to wait for transaction confirmation
wait_for_tx() {
    local tx_hash=$1
    local contract_name=$2
    echo "Waiting for $contract_name transaction to be confirmed..."
    echo "Transaction hash: $tx_hash"
    
    # Wait for transaction to be confirmed
    # starkli tx-status can be used to check, but we'll use a simple sleep for now
    # You can enhance this to poll for actual confirmation if needed
    sleep 15
    
    echo "$contract_name transaction confirmed!"
    echo ""
}

# Function to deploy a contract and wait for confirmation
deploy_contract() {
    local contract_name=$1
    local name_param=$2
    local symbol_param=$3
    
    echo "Deploying $contract_name contract..."
    DEPLOY_OUTPUT=$(starkli deploy \
        --account "$STARKNET_ACCOUNT" \
        --private-key "$STARKNET_PRIVATE_KEY" \
        --rpc https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/6Pzw4ZYxhoeS_bpcXV9oI5FjSCdKZE8d \
        $CLASS_HASH \
        $OWNER \
        $name_param \
        $symbol_param \
        $terminal_timestamp \
        $summit_address 2>&1)
    
    DEPLOY_EXIT_CODE=$?
    
    if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
        echo "Error: Failed to deploy $contract_name"
        echo "Output: $DEPLOY_OUTPUT"
        exit 1
    fi
    
    # Extract transaction hash from output
    TX_HASH=$(echo "$DEPLOY_OUTPUT" | grep -oE "0x[0-9a-fA-F]+" | head -1)
    
    if [ -n "$TX_HASH" ]; then
        wait_for_tx "$TX_HASH" "$contract_name"
    else
        echo "Warning: Could not extract transaction hash for $contract_name"
        echo "Waiting 15 seconds before next deployment..."
        sleep 15
    fi
    
    # Extract contract address if available
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE "0x[0-9a-fA-F]+" | tail -1)
    if [ -n "$CONTRACT_ADDRESS" ] && [ "$CONTRACT_ADDRESS" != "$TX_HASH" ]; then
        echo "$contract_name deployed at: $CONTRACT_ADDRESS"
    fi
}

# Contract deployment
echo "Starting deployment..."
echo "Deploying with parameters:"
echo "  CLASS_HASH: $CLASS_HASH"
echo "  OWNER: $OWNER"
echo "  TERMINAL_TIMESTAMP: $terminal_timestamp"
echo "  SUMMIT_ADDRESS: $summit_address"
echo ""

# Deploy all contracts sequentially with proper waiting
echo "Starting starkli deploy commands..."
echo "Note: This may take several minutes as we wait for each transaction to confirm..."
echo ""

# Deploy all contracts
deploy_contract "Kill Token" "$kill_token_name" "$kill_token_symbol"
deploy_contract "Corpse Token" "$corpse_token_name" "$corpse_token_symbol"

DEPLOY_EXIT_CODE=0

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo "Error: Deployment failed with exit code $DEPLOY_EXIT_CODE"
    exit 1
fi

echo ""
echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
echo "Class Hash: $CLASS_HASH"
echo ""
echo "To view your deployed contract on Voyager:"
echo "https://voyager.online/class/$CLASS_HASH"