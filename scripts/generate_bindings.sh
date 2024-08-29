#!/bin/bash

echo "Generating bindings..."

# Change directory to client
cd client

sozo build --typescript --manifest-path ../contracts/Scarb.toml --bindings-output ./src
