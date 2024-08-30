const MAINNET_CHAIN_ID: felt252 = 0x534e5f4d41494e;
const SEPOLIA_CHAIN_ID: felt252 = 0x534e5f5345504f4c4941;
const KATANA_CHAIN_ID: felt252 = 0x4b4154414e41;
const TESTING_CHAIN_ID: felt252 = 0x73617661676573756d6d6974;

mod errors {
    const BEAST_NOT_YET_REVIVED: felt252 = 'beast not yet revived';
    const NOT_TOKEN_OWNER: felt252 = 'Not token owner';
    const SUMMIT_BEAST_CHANGED: felt252 = 'can only attack beast on summit';
}
