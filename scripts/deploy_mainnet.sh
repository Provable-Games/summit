export STARKNET_RPC_URL=""
export DOJO_ACCOUNT_ADDRESS=""
export DOJO_PRIVATE_KEY=""

#-----------------
# build
echo "------------------------------------------------------------------------------"
echo "Cleaning..."
sozo -P prod clean
echo "Building..."
# sozo -P $PROFILE build --typescript
sozo -P prod build

#-----------------
# migrate
#
echo "------------------------------------------------------------------------------"
echo ">>> Migrate plan..."
sozo -P prod migrate plan
# exit 0
echo ">>> Migrate apply..."
sozo -P prod migrate apply
echo "👍"

#------------------
echo "--- DONE! 👍"

# slot deployments create summit-dev torii --version v1.0.0-alpha.17 --world 0x27806969fa61287954fc7ea1bc2aea8c042222dea5fc7d6698d42b3ab27c8c7 --rpc https://api.cartridge.gg/x/starknet/mainnet --start-block 835325 --index-pending true
