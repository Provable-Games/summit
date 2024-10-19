#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Summit {
    #[key]
    pub id: u8,
    pub beast_token_id: u32,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct SummitHistory {
    #[key]
    pub id: u32,
    #[key]
    pub lost_at: u64,
    pub taken_at: u64,
    pub rewards: u64
}
