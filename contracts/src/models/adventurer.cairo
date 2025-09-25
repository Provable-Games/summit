#[derive(Introspect, Drop, Copy, Serde)]
#[dojo::model]
pub struct AdventurerConsumed {
    #[key]
    pub adventurer_id: u64,
    pub beast_token_id: u32,
}
