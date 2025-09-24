#[derive(Introspect, Drop, Copy, Serde)]
pub struct Adventurer {
    pub level: u8,
    pub health: u16,
}


#[derive(Introspect, Drop, Copy, Serde)]
#[dojo::model]
pub struct AdventurerConsumed {
    #[key]
    pub token_id: u64,
    pub beast_token_id: u32,
}
