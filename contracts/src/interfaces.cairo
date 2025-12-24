use beasts_nft::pack::PackableBeast;
use starknet::ContractAddress;
use summit::models::beast::LiveBeastStats;

#[starknet::interface]
pub trait ISummitEvents<T> {
    fn emit_beast_event(ref self: T, live_stats: LiveBeastStats);
    fn emit_battle_event(
        ref self: T,
        attacking_beast_owner: ContractAddress,
        attacking_beast_token_id: u32,
        attack_index: u16,
        attacking_beast_id: u8,
        shiny: u8,
        animated: u8,
        defending_beast_token_id: u32,
        attack_count: u16,
        attack_damage: u16,
        critical_attack_count: u16,
        critical_attack_damage: u16,
        counter_attack_count: u16,
        counter_attack_damage: u16,
        critical_counter_attack_count: u16,
        critical_counter_attack_damage: u16,
        attack_potions: u8,
        xp_gained: u8,
    );
    fn emit_reward_event(ref self: T, beast_token_id: u32, owner: ContractAddress, amount: u32);
    fn emit_poison_event(ref self: T, beast_token_id: u32, count: u16, player: ContractAddress);
    fn emit_diplomacy_event(ref self: T, specials_hash: felt252, beast_token_ids: Span<u32>, total_power: u16);
    fn emit_summit_event(ref self: T, beast: PackableBeast, live_stats: LiveBeastStats, owner: ContractAddress);
    fn emit_corpse_event(ref self: T, adventurer_id: u64, player: ContractAddress);
}

#[starknet::interface]
pub trait IBeastSystems<T> {
    fn get_collectable_count(self: @T, dungeon: ContractAddress, entity_hash: felt252) -> u64;
    fn get_collectable(self: @T, dungeon: ContractAddress, entity_hash: felt252, index: u64) -> CollectableEntity;
    fn get_entity_stats(self: @T, dungeon: ContractAddress, entity_hash: felt252) -> EntityStats;
}

#[starknet::interface]
pub trait IAdventurerSystems<T> {
    fn get_adventurer_level(self: @T, adventurer_id: u64) -> u8;
    fn get_adventurer_dungeon(self: @T, adventurer_id: u64) -> ContractAddress;
}

#[derive(Copy, Drop, Serde)]
pub struct CollectableEntity {
    pub dungeon: ContractAddress,
    pub entity_hash: felt252,
    pub index: u64,
    pub seed: u64,
    pub id: u8,
    pub level: u16,
    pub health: u16,
    pub prefix: u8,
    pub suffix: u8,
    pub killed_by: u64,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
pub struct EntityStats {
    pub dungeon: ContractAddress,
    pub entity_hash: felt252,
    pub adventurers_killed: u64,
}
