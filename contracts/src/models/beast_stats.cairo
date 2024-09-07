#[derive(Copy, Drop, Serde)]
pub struct BeastStats {
    pub fixed: FixedBeastStats,
    pub live: LiveBeastStats,
}

#[derive(Copy, Drop, Serde)]
pub struct FixedBeastStats {
    pub beast_id: u8,
    pub level: u16,
    pub starting_health: u16,
    pub special_1: u8,
    pub special_2: u8,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct LiveBeastStats {
    #[key]
    pub token_id: u32,
    pub current_health: u16,
    pub bonus_health: u16,
    pub last_death_timestamp: u64,
    pub num_deaths: u16,
}
