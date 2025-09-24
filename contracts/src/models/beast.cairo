use beasts_nft::pack::PackableBeast;

#[derive(Copy, Drop, IntrospectPacked, Serde)]
#[dojo::model]
pub struct LiveBeastStats {
    #[key]
    pub token_id: u32,
    pub current_health: u16,
    pub bonus_health: u16,
    pub bonus_xp: u16,
    pub attack_streak: u8,
    pub last_death_timestamp: u64,
    pub num_deaths: u16,
    pub last_killed_by: u32,
    pub revival_count: u8,
    pub extra_lives: u8,
    pub has_claimed_starter_kit: bool,
}

#[derive(Copy, Drop, Serde)]
pub struct Beast {
    pub fixed: PackableBeast,
    pub live: LiveBeastStats,
}

#[derive(Copy, Drop, IntrospectPacked, Serde)]
#[dojo::model]
pub struct BeastRewards {
    #[key]
    pub beast_token_id: u32,
    pub rewards_earned: u64,
}
