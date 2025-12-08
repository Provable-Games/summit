use starknet::ContractAddress;
use summit::models::beast::LiveBeastStats;

#[derive(Drop, Serde)]
#[dojo::event]
pub struct LiveBeastStatsEvent {
    #[key]
    pub token_id: u32,
    pub live_stats: LiveBeastStats,
}


#[derive(Drop, Serde)]
#[dojo::event]
pub struct BattleEvent {
    #[key]
    pub attacking_beast_token_id: u32,
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

#[derive(Drop, Serde)]
#[dojo::event]
pub struct RewardEvent {
    #[key]
    pub block_number: u64,
    #[key]
    pub beast_token_id: u32,
    pub owner: ContractAddress,
    pub amount: u32,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct PoisonEvent {
    #[key]
    pub beast_token_id: u32,
    #[key]
    pub block_timestamp: u64,
    pub count: u16,
    pub player: ContractAddress,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct DiplomacyEvent {
    #[key]
    pub specials_hash: felt252,
    pub beast_token_ids: Span<u32>,
    pub total_power: u16,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct SummitEvent {
    #[key]
    pub taken_at: u64,
    pub beast: BeastEvent,
    pub live_stats: LiveBeastStats,
    pub owner: ContractAddress,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct CorpseEvent {
    #[key]
    pub adventurer_id: u64,
    pub player: ContractAddress,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct SkullEvent {
    #[key]
    pub beast_token_id: u32,
    pub skulls: u64,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct BeastEvent {
    #[key]
    pub id: u8,
    pub prefix: u8,
    pub suffix: u8,
    pub level: u16,
    pub health: u16,
    pub shiny: u8,
    pub animated: u8,
}
