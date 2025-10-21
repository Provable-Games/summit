use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, Introspect)]
#[dojo::model]
pub struct SummitConfig {
    #[key]
    pub summit_id: u8,
    pub start_timestamp: u64,
    pub adventurer_address: ContractAddress,
    pub denshokan_address: ContractAddress,
    pub dungeon_address: ContractAddress,
    pub beast_address: ContractAddress,
    pub beast_data_address: ContractAddress,
    pub reward_address: ContractAddress,
    pub attack_potion_address: ContractAddress,
    pub revive_potion_address: ContractAddress,
    pub extra_life_potion_address: ContractAddress,
}

#[derive(Copy, Drop, Serde, IntrospectPacked)]
#[dojo::model]
pub struct Summit {
    #[key]
    pub summit_id: u8,
    pub beast_token_id: u32,
}

#[derive(Copy, Drop, Serde, IntrospectPacked)]
#[dojo::model]
pub struct SummitHistory {
    #[key]
    pub beast_token_id: u32,
    #[key]
    pub lost_at: u64,
    pub taken_at: u64,
}

#[derive(Introspect, Copy, Drop, Serde)]
#[dojo::event]
pub struct BattleEvent {
    #[key]
    pub attacking_beast_token_id: u32,
    pub defending_beast_token_id: u32,
    pub attacks: Span<u16>,
    pub counter_attacks: Span<u16>,
    pub attack_potions: u8,
    pub xp_gained: u8,
}
