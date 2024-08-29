#!/bin/bash

cd contracts

echo "Build contracts..."
sozo --release build

# echo "Deleting previous indexer and network..."
slot deployments delete savagesummit torii
slot deployments delete savagesummit katana

# echo "Deploying world to Realms L3..."
slot deployments create savagesummit katana --version v1.0.0-alpha.8 --disable-fee true --block-time 1000 --accounts 10

# echo "Migrating world..."
sozo --release migrate apply

# echo "Setting up remote indexer on slot..."
slot deployments create savagesummit torii --version v1.0.0-alpha.8 --world 0x8d8e73b20e205f98347501a072701e3b7b55c6048ff78562c025aa8a5571a0 --rpc https://api.cartridge.gg/x/savagesummit/katana/ --start-block 0 --index-pending true