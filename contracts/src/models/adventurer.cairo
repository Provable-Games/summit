#[derive(Copy, Drop, Introspect, Serde)]
pub struct Adventurer {
    pub level: u8,
    pub health: u16,
    pub birth_date: u64,
    pub rank_at_death: u8,
}
