use starknet::ContractAddress;

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
