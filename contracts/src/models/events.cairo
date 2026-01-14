use starknet::ContractAddress;
use summit::models::beast::LiveBeastStats;

#[derive(Drop, starknet::Event)]
pub struct LiveBeastStatsEvent {
    #[key]
    pub token_id: u32,
    pub live_stats: LiveBeastStats,
}

#[derive(Drop, starknet::Event)]
pub struct BattleEvent {
    #[key]
    pub attacking_beast_token_id: u32,
    #[key]
    pub attack_index: u16,
    pub attacking_beast_owner: ContractAddress,
    pub attacking_beast_id: u8,
    pub shiny: u8,
    pub animated: u8,
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

#[derive(Drop, starknet::Event)]
pub struct RewardEvent {
    #[key]
    pub block_number: u64,
    #[key]
    pub beast_token_id: u32,
    pub owner: ContractAddress,
    pub amount: u32,
}

#[derive(Drop, starknet::Event)]
pub struct PoisonEvent {
    #[key]
    pub beast_token_id: u32,
    #[key]
    pub block_timestamp: u64,
    pub count: u16,
    pub player: ContractAddress,
}

#[derive(Drop, starknet::Event)]
pub struct DiplomacyEvent {
    #[key]
    pub specials_hash: felt252,
    pub beast_token_ids: Span<u32>,
    pub total_power: u16,
}

#[derive(Drop, starknet::Event)]
pub struct SummitEvent {
    #[key]
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
    #[key]
    pub adventurer_id: u64,
    pub player: ContractAddress,
}

#[derive(Drop, starknet::Event)]
pub struct SkullEvent {
    #[key]
    pub beast_token_id: u32,
    pub skulls: u64,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct BattleEventData {
    pub attacking_beast_token_id: u32,
    pub attack_index: u16,
    pub attacking_beast_owner: ContractAddress,
    pub attacking_beast_id: u8,
    pub shiny: u8,
    pub animated: u8,
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

#[derive(Drop, starknet::Event)]
pub struct BattleEventsEvent {
    #[key]
    pub caller: ContractAddress,
    pub battle_events: Span<BattleEventData>,
}

#[derive(Drop, starknet::Event)]
pub struct LiveBeastStatsEventsEvent {
    #[key]
    pub caller: ContractAddress,
    pub live_stats_events: Span<LiveBeastStats>,
}
