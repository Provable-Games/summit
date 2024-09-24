#[derive(Copy, Drop, Introspect, Serde)]
pub struct Adventurer {
    pub level: u8,
    pub health: u16,
    pub rank_at_death: u8,
}


#[derive(Copy, Drop, Introspect, Serde)]
#[dojo::model]
pub struct AdventurerConsumed {
    #[key]
    pub token_id: u64,
    pub beast_token_id: u32,
}
