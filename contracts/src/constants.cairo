use starknet::{ContractAddress, contract_address_const};

const MAINNET_CHAIN_ID: felt252 = 0x534e5f4d41494e;
const SEPOLIA_CHAIN_ID: felt252 = 0x534e5f5345504f4c4941;
const KATANA_CHAIN_ID: felt252 = 0x4b4154414e41;
const TESTING_CHAIN_ID: felt252 = 0x73617661676573756d6d6974;
const BASE_REVIVAL_TIME_SECONDS: u64 = 23 * 60 * 60;
const DAY_SECONDS: u64 = 24 * 60 * 60;
const MAX_U32: u32 = 0xffffffff;
const MAX_U16: u16 = 0xffff;
const MINIMUM_DAMAGE: u8 = 4;
const BEAST_MAX_BONUS_HEALTH: u16 = 1023;
const BEAST_MAX_BONUS_LVLS: u16 = 40;
const BEAST_MAX_EXTRA_LIVES: u8 = 127;
const MAX_REVIVAL_COUNT: u8 = 14;

mod errors {
    const BEAST_NOT_YET_REVIVED: felt252 = 'beast not yet revived';
    const NOT_TOKEN_OWNER: felt252 = 'Not token owner';
    const SUMMIT_BEAST_CHANGED: felt252 = 'can only attack beast on summit';
    const BEAST_ADDRESS_NOT_SET: felt252 = 'beast address not set';
    const BEAST_ATTACKING_OWN_BEAST: felt252 = 'attacking own beast';
    const BEAST_MAX_BONUS_HEALTH: felt252 = 'beast has max bonus health';
    const BEAST_ALIVE: felt252 = 'beast is alive';
    const BEAST_MAX_EXTRA_LIVES: felt252 = 'beast has max extra lives';
    const MAX_ATTACK_POTION: felt252 = 'max attack potion is 9';

    const ADVENTURER_ALIVE: felt252 = 'adventurer is alive';
    const ADVENTURER_RANKED: felt252 = 'adventurer is ranked';
    const ADVENTURER_ALREADY_CONSUMED: felt252 = 'adventurer already consumed';

    const NOT_ENOUGH_CONSUMABLES: felt252 = 'not enough consumables';
}
