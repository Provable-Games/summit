pub const SUMMIT_ID: u8 = 1;
pub const MAINNET_CHAIN_ID: felt252 = 0x534e5f4d41494e;
pub const SEPOLIA_CHAIN_ID: felt252 = 0x534e5f5345504f4c4941;
pub const KATANA_CHAIN_ID: felt252 = 0x4b4154414e41;
pub const TESTING_CHAIN_ID: felt252 = 0x73617661676573756d6d6974;
pub const BASE_REVIVAL_TIME_SECONDS: u64 = 24 * 60 * 60;
pub const REDUCED_REVIVAL_TIME_SECONDS: u64 = 16 * 60 * 60;
pub const DAY_SECONDS: u64 = 24 * 60 * 60;
pub const MAX_U32: u32 = 0xffffffff;
pub const MAX_U16: u16 = 0xffff;
pub const MINIMUM_DAMAGE: u8 = 4;
pub const BEAST_MAX_EXTRA_LIVES: u16 = 4000;
pub const BEAST_MAX_BONUS_HEALTH: u16 = 2000;
pub const BEAST_MAX_BONUS_LVLS: u16 = 40;
pub const BEAST_MAX_ATTRIBUTES: u8 = 100;
pub const MAX_REVIVAL_COUNT: u8 = 63;
pub const SPECIALS_COST: u16 = 10;
pub const DIPLOMACY_COST: u16 = 15;
pub const WISDOM_COST: u16 = 20;
pub const EIGHT_BITS_MAX: u8 = 255;
pub const TOKEN_DECIMALS: u256 = 1_000_000_000_000_000_000;

pub mod errors {
    pub const BEAST_NOT_YET_REVIVED: felt252 = 'beast not yet revived';
    pub const NOT_TOKEN_OWNER: felt252 = 'Not token owner';
    pub const SUMMIT_BEAST_CHANGED: felt252 = 'can only attack beast on summit';
    pub const BEAST_ADDRESS_NOT_SET: felt252 = 'beast address not set';
    pub const BEAST_ATTACKING_OWN_BEAST: felt252 = 'attacking own beast';
    pub const BEAST_MAX_BONUS_HEALTH: felt252 = 'beast has max bonus health';
    pub const BEAST_MAX_ATTRIBUTES: felt252 = 'beast has max attributes';
    pub const BEAST_ALIVE: felt252 = 'beast is alive';
    pub const BEAST_MAX_EXTRA_LIVES: felt252 = 'Max 2000 extra lives';
    pub const MAX_ATTACK_POTION: felt252 = 'Max 255 attack potions';

    pub const ADVENTURER_ALIVE: felt252 = 'adventurer is alive';
    pub const ADVENTURER_RANKED: felt252 = 'adventurer is ranked';
    pub const ADVENTURER_ALREADY_CONSUMED: felt252 = 'adventurer already consumed';

    pub const NOT_ENOUGH_CONSUMABLES: felt252 = 'not enough consumables';
    pub const POTION_NOT_ALLOWED_ON_SUMMIT: felt252 = 'Potion not allowed on summit';
}
