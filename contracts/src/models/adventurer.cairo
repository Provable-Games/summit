#[derive(Copy, Drop, Introspect, Serde)]
pub struct Adventurer {
    pub level: u8,
    pub health: u16,
    pub rank_at_death: u8,
}


#[derive(Copy, Drop, Introspect, Serde)]
#[model]
pub struct AdventurerConsumed {
    pub token_id: u32,
    pub beast_token_id: u32,
}