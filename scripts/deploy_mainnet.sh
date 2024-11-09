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
echo ">>> Migrate apply..."
sozo -P prod migrate
echo "👍"

#------------------
echo "--- DONE! 👍"

# slot deployments create summit-dev-1 torii --version v1.0.0-rc.1 --world 0x051ce9ff7e94dc891a709a938f150eb101641a7b1508ba00263b7726981eba0a --rpc https://api.cartridge.gg/x/starknet/mainnet --start-block 881925 --index-pending true
