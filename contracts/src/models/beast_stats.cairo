#[derive(Copy, Drop, Introspect, Serde)]
#[dojo::model]
#[dojo::event]
pub struct BeastStats {
    #[key]
    pub live: LiveBeastStats,
    pub fixed: FixedBeastStats,
}

#[derive(Copy, Drop, Introspect, Serde)]
#[dojo::model]
#[dojo::event]
pub struct FixedBeastStats {
    #[key]
    pub beast_id: u8,
    #[key]
    pub special_1: u8,
    #[key]
    pub special_2: u8,
    pub level: u16,
    pub starting_health: u16,
}

#[derive(Copy, Drop, Introspect, Serde)]
#[dojo::model]
#[dojo::event]
pub struct LiveBeastStats {
    #[key]
    pub token_id: u32,
    pub current_health: u16,
    pub bonus_health: u16,
    pub last_death_timestamp: u64,
    pub num_deaths: u16,
    pub last_killed_by: u32,
}
