#!/bin/bash
set -e

source .env

# Validate required environment variables
if [ -z "$STARKNET_ACCOUNT" ] || [ -z "$STARKNET_PRIVATE_KEY" ]; then
    echo "Error: STARKNET_ACCOUNT and STARKNET_PRIVATE_KEY must be set in .env"
    exit 1
fi

# Build the project
echo "Building project..."
scarb build

# Check if contract file exists
CONTRACT_FILE="target/dev/summit_summit_systems.contract_class.json"
if [ ! -f "$CONTRACT_FILE" ]; then
    echo "Error: Contract file not found at $CONTRACT_FILE"
    exit 1
fi
echo "Contract file found: $CONTRACT_FILE"

# Constructor parameters for summit_systems contract
OWNER="0x418ed348930686c844fda4556173457d3f71ae547262406d271de534af6b35e" # Summit contract owner

# From contracts/dojo_mainnet.toml init_call_args for summit_systems
START_TIMESTAMP="1764688252"   # Summit start timestamp (UNIX seconds)
SUBMISSION_BLOCKS="1000000"    # Number of blocks allowed for submissions after Summit ends

ADVENTURER_SYSTEMS_ADDRESS="0x3fc7ecd6d577daa1ee855a9fa13a914d01acda06715c9fc74f1ee1a5e346a01"  # Adventurer systems
DENSHOKAN_ADDRESS="0x036017e69d21d6d8c13e266eabb73ef1f1d02722d86bdcabe5f168f8e549d3cd"          # Denshokan NFT
DUNGEON_ADDRESS="0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42"            # Dungeon
BEAST_NFT_ADDRESS="0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4"          # Beast NFT V2
BEAST_DATA_ADDRESS="0x74abc15c0ddef39bdf1ede2a643c07968d3ed5bacb0123db2d5b7154fbb35c7"          # DM Beast Systems
REWARD_TOKEN="0x042DD777885AD2C116be96d4D634abC90A26A790ffB5871E037Dd5Ae7d2Ec86B"               # Survivor Token

# Contract class declaration
echo "Starting contract declaration..."
echo "Using account: $STARKNET_ACCOUNT"

# First, let's check if the contract is already declared by computing the class hash
COMPUTED_CLASS_HASH=$(starkli class-hash "$CONTRACT_FILE" 2>&1)
echo "Computed class hash: $COMPUTED_CLASS_HASH"

# Extract account address from the JSON file
ACCOUNT_ADDRESS=$(cat "$STARKNET_ACCOUNT" | grep -o '"address"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '0x[0-9a-fA-F]*')
echo "Account address: $ACCOUNT_ADDRESS"

# Try to declare the contract
# First attempt without compiler version flag
echo "Attempting declare without compiler version..."
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

# Contract deployment
echo "Starting deployment..."
echo "Deploying with parameters:"
echo "  CLASS_HASH: $CLASS_HASH"
echo "  OWNER: $OWNER"
echo "  START_TIMESTAMP: $START_TIMESTAMP"
echo "  SUBMISSION_BLOCKS: $SUBMISSION_BLOCKS"
echo "  ADVENTURER_SYSTEMS_ADDRESS: $ADVENTURER_SYSTEMS_ADDRESS"
echo "  DENSHOKAN_ADDRESS: $DENSHOKAN_ADDRESS"
echo "  DUNGEON_ADDRESS: $DUNGEON_ADDRESS"
echo "  BEAST_NFT_ADDRESS: $BEAST_NFT_ADDRESS"
echo "  BEAST_DATA_ADDRESS: $BEAST_DATA_ADDRESS"
echo "  REWARD_TOKEN: $REWARD_TOKEN"
echo ""

echo "Deploy command parameters (constructor args):"
echo "  0. OWNER: $OWNER"
echo "  1. START_TIMESTAMP: $START_TIMESTAMP"
echo "  2. SUBMISSION_BLOCKS: $SUBMISSION_BLOCKS"
echo "  3. ADVENTURER_SYSTEMS_ADDRESS: $ADVENTURER_SYSTEMS_ADDRESS"
echo "  4. DENSHOKAN_ADDRESS: $DENSHOKAN_ADDRESS"
echo "  5. DUNGEON_ADDRESS: $DUNGEON_ADDRESS"
echo "  6. BEAST_NFT_ADDRESS: $BEAST_NFT_ADDRESS"
echo "  7. BEAST_DATA_ADDRESS: $BEAST_DATA_ADDRESS"
echo "  8. REWARD_TOKEN: $REWARD_TOKEN"
echo ""

# First check account balance
echo "Checking account balance..."
ACCOUNT_ADDRESS="0x418ed348930686c844fda4556173457d3f71ae547262406d271de534af6b35e"
BALANCE_OUTPUT=$(starkli call \
    --rpc https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/6Pzw4ZYxhoeS_bpcXV9oI5FjSCdKZE8d \
    0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 \
    balanceOf \
    $ACCOUNT_ADDRESS 2>&1 || echo "Balance check failed")
echo "Account balance check: $BALANCE_OUTPUT"
echo ""

# Deploy the contract
echo "Starting starkli deploy command..."
echo "Note: This may take a few minutes..."

# Run deployment without timeout to see what happens
starkli deploy \
    --account "$STARKNET_ACCOUNT" \
    --private-key "$STARKNET_PRIVATE_KEY" \
    --rpc https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/6Pzw4ZYxhoeS_bpcXV9oI5FjSCdKZE8d \
    $CLASS_HASH \
    $OWNER \
    $START_TIMESTAMP \
    $SUBMISSION_BLOCKS \
    $ADVENTURER_SYSTEMS_ADDRESS \
    $DENSHOKAN_ADDRESS \
    $DUNGEON_ADDRESS \
    $BEAST_NFT_ADDRESS \
    $BEAST_DATA_ADDRESS \
    $REWARD_TOKEN

DEPLOY_EXIT_CODE=$?

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