#[derive(Copy, Drop, Introspect, Serde)]
#[dojo::model]
pub struct Adventurer {
    #[key]
    pub token_id: u32,
    pub beast_token_id: u32,
}