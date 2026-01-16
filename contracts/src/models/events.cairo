use starknet::ContractAddress;
use summit::models::beast::LiveBeastStats;

#[derive(Drop, starknet::Event)]
pub struct BeastUpdatesEvent {
    pub beast_updates: Span<felt252>,
}

#[derive(Drop, starknet::Event)]
pub struct LiveBeastStatsEvent {
    pub live_stats: felt252,
}

#[derive(Drop, starknet::Event)]
pub struct RewardEvent {
    pub block_number: u64,
    pub beast_token_id: u32,
    pub owner: ContractAddress,
    pub amount: u32,
}

#[derive(Drop, starknet::Event)]
pub struct RewardsClaimedEvent {
    #[key]
    pub player: ContractAddress,
    pub beast_token_ids: Span<u32>,
    pub amount: u256,
}

#[derive(Drop, starknet::Event)]
pub struct PoisonEvent {
    pub beast_token_id: u32,
    pub block_timestamp: u64,
    pub count: u16,
    pub player: ContractAddress,
}

#[derive(Drop, starknet::Event)]
pub struct DiplomacyEvent {
    pub specials_hash: felt252,
    pub beast_token_ids: Span<u32>,
    pub total_power: u16,
}

#[derive(Drop, starknet::Event)]
pub struct SummitEvent {
    pub beast_token_id: u32,
    pub beast_id: u8,
    pub prefix: u8,
    pub suffix: u8,
    pub level: u16,
    pub health: u16,
    pub shiny: u8,
    pub animated: u8,
    pub live_stats: LiveBeastStats,
    pub owner: ContractAddress,
}

#[derive(Drop, starknet::Event)]
pub struct CorpseEvent {
    pub adventurer_id: u64,
    pub player: ContractAddress,
}

#[derive(Drop, starknet::Event)]
pub struct SkullEvent {
    pub beast_token_id: u32,
    pub skulls: u64,
}

#[derive(Copy, Drop, Serde, starknet::Event, starknet::Store)]
pub struct BattleEvent {
    pub attacking_beast_token_id: u32,
    pub attack_index: u16,
    pub defending_beast_token_id: u32,
    pub attack_count: u16,
    pub attack_damage: u16,
    pub critical_attack_count: u16,
    pub critical_attack_damage: u16,
    pub counter_attack_count: u16,
    pub counter_attack_damage: u16,
    pub critical_counter_attack_count: u16,
    pub critical_counter_attack_damage: u16,
    pub attack_potions: u8,
    pub xp_gained: u8,
}
