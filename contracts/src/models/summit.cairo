use starknet::ContractAddress;
use summit::models::beast::{LiveBeastStats};

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct LiveBeastStatsEvent {
    #[key]
    pub token_id: u32,
    pub live_stats: LiveBeastStats,
}


#[derive(Copy, Drop, Serde)]
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

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct RewardEvent {
    #[key]
    pub block_number: u64,
    #[key]
    pub beast_token_id: u32,
    pub owner: ContractAddress,
    pub amount: u32,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PoisonEvent {
    #[key]
    pub block_timestamp: u64,
    pub count: u16,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct DiplomacyEvent {
    #[key]
    pub beast_token_id: u32,
    pub specials_hash: felt252,
    pub owner: ContractAddress,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct SummitEvent {
    #[key]
    pub taken_at: u64,
    pub beast: BeastEvent,
    pub live_stats: LiveBeastStats,
    pub diplomacy_bonus: u8,
    pub owner: ContractAddress,
}

#[derive(Copy, Drop, Serde)]
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
