use starknet::ContractAddress;

#[derive(Drop, starknet::Event)]
pub struct BeastUpdatesEvent {
    pub beast_updates: Span<felt252>,
}

#[derive(Drop, starknet::Event)]
pub struct LiveBeastStatsEvent {
    pub live_stats: felt252,
}

#[derive(Drop, starknet::Event)]
pub struct RewardsEarnedEvent {
    pub beast_token_id: u32,
    pub amount: u32,
}

#[derive(Drop, starknet::Event)]
pub struct RewardsClaimedEvent {
    pub player: ContractAddress,
    pub amount: u32,
}

#[derive(Drop, starknet::Event)]
pub struct PoisonEvent {
    pub beast_token_id: u32,
    pub count: u16,
    pub player: ContractAddress,
}

#[derive(Drop, starknet::Event)]
pub struct CorpseEvent {
    pub adventurer_ids: Span<u64>,
    pub corpse_amount: u32,
    pub player: ContractAddress,
}

#[derive(Drop, starknet::Event)]
pub struct SkullEvent {
    pub beast_token_ids: Span<u32>,
    pub skulls_claimed: u64,
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
    pub revive_potions: u16,
    pub xp_gained: u16,
}
