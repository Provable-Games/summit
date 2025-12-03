#[derive(Introspect, Drop, Copy, Serde)]
pub struct LiveBeastStats {
    pub token_id: u32, // 17 bits
    pub current_health: u16, // 12 bits
    pub bonus_health: u16, // 12 bits
    pub bonus_xp: u16, // 16 bits
    pub attack_streak: u8, // 4 bits
    pub last_death_timestamp: u64, // 64 bits
    pub revival_count: u8, // 5 bits
    pub extra_lives: u8, // 8 bits
    pub has_claimed_potions: u8, // 1 bit
    pub blocks_held: u32, // 17 bits
    pub stats: Stats,
    pub kills_claimed: u8,
}

#[derive(Introspect, Copy, Drop, Serde)]
pub struct Stats {
    pub spirit: u8, // 8 bits
    pub luck: u8, // 8 bits
    pub specials: u8, // 1 bit
    pub wisdom: u8, // 1 bit
    pub diplomacy: u8,
}
