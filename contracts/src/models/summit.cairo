use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, Introspect)]
#[dojo::model]
pub struct SummitConfig {
    #[key]
    pub summit_id: u8,
    pub adventurer_address: ContractAddress,
    pub beast_address: ContractAddress,
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
    pub rewards: u64,
}

#[derive(Copy, Drop, Serde, Introspect)]
#[dojo::model]
pub struct SummitReward {
    #[key]
    pub summit_id: u8,
    pub address: ContractAddress,
}
