#!/bin/bash

cd contracts

echo "----- Building World -----"
sozo build

echo "----- Migrating World -----"
sozo migrate apply

echo "-----  Started indexer ----- "
rm torii.db
torii --world 0xa8bb3cf5561f561d58b9b4a0de2bb8b626f90ec7f4fe08bda4e8150d0bbd0e --database torii.db --allowed-origins "*"