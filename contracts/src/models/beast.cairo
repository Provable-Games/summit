use beasts_nft::pack::PackableBeast;

#[derive(Drop, Copy, Serde)]
pub struct LiveBeastStats {
    pub token_id: u32, // 17 bits
    pub current_health: u16, // 12 bits
    pub bonus_health: u16, // 12 bits 2046 max
    pub bonus_xp: u16, // 16 bits
    pub attack_streak: u8, // 4 bits
    pub last_death_timestamp: u64, // 64 bits
    pub revival_count: u8, // 5 bits
    pub extra_lives: u8, // 8 bits 4095 max
    pub has_claimed_potions: u8, // 1 bit
    pub blocks_held: u32, // 17 bits
    pub stats: Stats,
    pub kills_claimed: u8,
}

#[derive(Copy, Drop, Serde)]
pub struct Stats {
    pub spirit: u8, // 8 bits
    pub luck: u8, // 8 bits
    pub specials: u8, // 1 bit
    pub wisdom: u8, // 1 bit
    pub diplomacy: u8,
}

#[derive(Copy, Drop, Serde)]
pub struct Beast {
    pub fixed: PackableBeast,
    pub live: LiveBeastStats,
}

/// Power of 2 constants for bit manipulation
mod pow {
    pub const TWO_POW_4: u256 = 0x10;
    pub const TWO_POW_5: u256 = 0x20;
    pub const TWO_POW_8: u256 = 0x100;
    pub const TWO_POW_12: u256 = 0x1000;
    pub const TWO_POW_16: u256 = 0x10000;
    pub const TWO_POW_17: u256 = 0x20000;
    pub const TWO_POW_29: u256 = 0x20000000;
    pub const TWO_POW_41: u256 = 0x20000000000;
    pub const TWO_POW_57: u256 = 0x200000000000000;
    pub const TWO_POW_61: u256 = 0x2000000000000000;
    pub const TWO_POW_64: u256 = 0x10000000000000000;
    pub const TWO_POW_125: u256 = 0x20000000000000000000000000000000;
    pub const TWO_POW_130: u256 = 0x400000000000000000000000000000000;
    pub const TWO_POW_138: u256 = 0x40000000000000000000000000000000000;
    pub const TWO_POW_139: u256 = 0x80000000000000000000000000000000000;
    pub const TWO_POW_156: u256 = 0x1000000000000000000000000000000000000000;
    pub const TWO_POW_164: u256 = 0x100000000000000000000000000000000000000000;
    pub const TWO_POW_172: u256 = 0x10000000000000000000000000000000000000000000;
    pub const TWO_POW_173: u256 = 0x20000000000000000000000000000000000000000000;
    pub const TWO_POW_174: u256 = 0x40000000000000000000000000000000000000000000;
    pub const TWO_POW_175: u256 = 0x80000000000000000000000000000000000000000000;
}

// Storage packing implementation for PackableBeast
pub impl PackableLiveStatsStorePacking of starknet::storage_access::StorePacking<LiveBeastStats, felt252> {
    fn pack(value: LiveBeastStats) -> felt252 {
        // Pack according to structure:
        (value.token_id.into()
            + value.current_health.into() * pow::TWO_POW_17
            + value.bonus_health.into() * pow::TWO_POW_29
            + value.bonus_xp.into() * pow::TWO_POW_41
            + value.attack_streak.into() * pow::TWO_POW_57
            + value.last_death_timestamp.into() * pow::TWO_POW_61
            + value.revival_count.into() * pow::TWO_POW_125
            + value.extra_lives.into() * pow::TWO_POW_130
            + value.has_claimed_potions.into() * pow::TWO_POW_138
            + value.blocks_held.into() * pow::TWO_POW_139
            + value.stats.spirit.into() * pow::TWO_POW_156
            + value.stats.luck.into() * pow::TWO_POW_164
            + value.stats.specials.into() * pow::TWO_POW_172
            + value.stats.wisdom.into() * pow::TWO_POW_173
            + value.stats.diplomacy.into() * pow::TWO_POW_174
            + value.kills_claimed.into() * pow::TWO_POW_175)
            .try_into()
            .expect('pack beast overflow')
    }

    fn unpack(value: felt252) -> LiveBeastStats {
        let mut packed: u256 = value.into();

        // Extract id (7 bits)
        let token_id = (packed % pow::TWO_POW_17).try_into().expect('unpack token_id');
        packed = packed / pow::TWO_POW_17;

        // Extract current_health (12 bits)
        let current_health = (packed % pow::TWO_POW_12).try_into().expect('unpack current_health');
        packed = packed / pow::TWO_POW_12;

        // Extract bonus_health (12 bits)
        let bonus_health = (packed % pow::TWO_POW_12).try_into().expect('unpack bonus_health');
        packed = packed / pow::TWO_POW_12;

        // Extract bonus_xp (16 bits)
        let bonus_xp = (packed % pow::TWO_POW_16).try_into().expect('unpack bonus_xp');
        packed = packed / pow::TWO_POW_16;

        // Extract attack_streak (4 bits)
        let attack_streak = (packed % pow::TWO_POW_4).try_into().expect('unpack attack_streak');
        packed = packed / pow::TWO_POW_4;

        // Extract last_death_timestamp (64 bits)
        let last_death_timestamp = (packed % pow::TWO_POW_64).try_into().expect('unpack last_death_timestamp');
        packed = packed / pow::TWO_POW_64;

        // Extract revival_count (5 bits)
        let revival_count = (packed % pow::TWO_POW_5).try_into().expect('unpack revival_count');
        packed = packed / pow::TWO_POW_5;

        // Extract extra_lives (8 bits)
        let extra_lives = (packed % pow::TWO_POW_8).try_into().expect('unpack extra_lives');
        packed = packed / pow::TWO_POW_8;

        // Extract has_claimed_potions (1 bit)
        let has_claimed_potions = (packed % 2_u256).try_into().expect('unpack has_claimed_potions');
        packed = packed / 2_u256;

        // Extract blocks_held (17 bits)
        let blocks_held = (packed % pow::TWO_POW_17).try_into().expect('unpack blocks_held');
        packed = packed / pow::TWO_POW_17;

        let spirit = (packed % pow::TWO_POW_8).try_into().expect('unpack spirit');
        packed = packed / pow::TWO_POW_8;

        let luck = (packed % pow::TWO_POW_8).try_into().expect('unpack luck');
        packed = packed / pow::TWO_POW_8;

        let specials = (packed % 2_u256).try_into().expect('unpack specials');
        packed = packed / 2_u256;

        let wisdom = (packed % 2_u256).try_into().expect('unpack wisdom');
        packed = packed / 2_u256;

        let diplomacy = (packed % 2_u256).try_into().expect('unpack diplomacy');
        packed = packed / 2_u256;

        let kills_claimed = (packed % pow::TWO_POW_8).try_into().expect('unpack kills_claimed');
        packed = packed / pow::TWO_POW_8;

        let stats = Stats { spirit, luck, specials, wisdom, diplomacy };

        LiveBeastStats {
            token_id,
            current_health,
            bonus_health,
            bonus_xp,
            attack_streak,
            last_death_timestamp,
            revival_count,
            extra_lives,
            has_claimed_potions,
            blocks_held,
            stats,
            kills_claimed,
        }
    }
}

#[generate_trait]
pub impl BeastUtilsImpl of BeastUtilsTrait {
    fn crit_chance(self: Beast) -> u8 {
        let points: u16 = self.live.stats.luck.into();
        let total_bp: u16 = match points {
            0 => 0,
            1 => 1200,
            2 => 2100,
            3 => 2775,
            4 => 3281,
            5 => 3660,
            6 => 3944,
            7 => 4157,
            8 => 4316,
            9 => 4435,
            10 => 4524,
            11 => 4590,
            12 => 4639,
            13 => 4675,
            14 => 4702,
            15 => 4722,
            _ => {
                let extra = (points - 15) * 20;
                4722 + extra
            },
        };

        let percent = total_bp / 100;
        percent.try_into().unwrap()
    }

    fn spirit_reduction(self: Beast) -> u64 {
        let points: u64 = self.live.stats.spirit.into();
        let reduction: u64 = match points {
            0 => 0,
            1 => 10800,
            2 => 18900,
            3 => 24975,
            4 => 29531,
            5 => 32948,
            6 => 35511,
            7 => 37433,
            8 => 38874,
            9 => 39954,
            10 => 40764,
            11 => 41372,
            12 => 41828,
            13 => 42170,
            14 => 42427,
            15 => 42620,
            _ => 42620 + ((points - 15) * 100),
        };

        reduction
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build_stats(
        token_id: u32,
        current_health: u16,
        bonus_health: u16,
        bonus_xp: u16,
        attack_streak: u8,
        last_death_timestamp: u64,
        revival_count: u8,
        extra_lives: u8,
        has_claimed_potions: u8,
        blocks_held: u32,
        spirit: u8,
        luck: u8,
        specials: u8,
        wisdom: u8,
        diplomacy: u8,
        kills_claimed: u8,
    ) -> LiveBeastStats {
        LiveBeastStats {
            token_id,
            current_health,
            bonus_health,
            bonus_xp,
            attack_streak,
            last_death_timestamp,
            revival_count,
            extra_lives,
            has_claimed_potions,
            blocks_held,
            stats: Stats { spirit, luck, specials, wisdom, diplomacy },
            kills_claimed,
        }
    }

    #[test]
    fn pack_unpack_zero_values() {
        let stats = build_stats(
            0_u32, // token_id
            0_u16, // current_health
            0_u16, // bonus_health
            0_u16, // bonus_xp
            0_u8, // attack_streak
            0_u64, // last_death_timestamp
            0_u8, // revival_count
            0_u8, // extra_lives
            0_u8, // has_claimed_potions
            0_u32, // blocks_held
            0_u8, // spirit
            0_u8, // luck
            0_u8, // specials
            0_u8, // wisdom
            0_u8, // diplomacy
            0_u8 // kills_claimed
        );
        let packed = PackableLiveStatsStorePacking::pack(stats);
        let unpacked = PackableLiveStatsStorePacking::unpack(packed);
        assert(unpacked.token_id == 0, 'zero token_id');
        assert(unpacked.current_health == 0, 'zero current_health');
        assert(unpacked.bonus_health == 0, 'zero bonus_health');
        assert(unpacked.bonus_xp == 0, 'zero bonus_xp');
        assert(unpacked.attack_streak == 0, 'zero attack_streak');
        assert(unpacked.last_death_timestamp == 0, 'zero last_death_timestamp');
        assert(unpacked.revival_count == 0, 'zero revival_count');
        assert(unpacked.extra_lives == 0, 'zero extra_lives');
        assert(unpacked.has_claimed_potions == 0, 'zero has_claimed_potions');
        assert(unpacked.blocks_held == 0, 'zero blocks_held');
        assert(unpacked.stats.spirit == 0, 'zero spirit');
        assert(unpacked.stats.luck == 0, 'zero luck');
        assert(unpacked.stats.specials == 0, 'zero specials');
        assert(unpacked.stats.wisdom == 0, 'zero wisdom');
        assert(unpacked.stats.diplomacy == 0, 'zero diplomacy');
        assert(unpacked.kills_claimed == 0, 'zero kills_claimed');
    }

    #[test]
    fn pack_unpack_max_values() {
        // Bit-width maxima based on packing layout:
        // token_id: 17 bits → 2^17 - 1
        // current_health: 12 bits → 2^12 - 1
        // bonus_health: 12 bits → 2^12 - 1
        // bonus_xp: 16 bits → 2^16 - 1
        // attack_streak: 4 bits → 2^4 - 1
        // last_death_timestamp: 64 bits → 2^64 - 1
        // revival_count: 5 bits → 2^5 - 1
        // extra_lives: 8 bits → 2^8 - 1
        // has_claimed_potions: 1 bit → 1
        // blocks_held: 17 bits → 2^17 - 1
        // spirit, luck: 8 bits → 255
        // specials, wisdom, diplomacy: 1 bit → 1
        // kills_claimed: 8 bits → 255
        let stats = build_stats(
            131070_u32, // (2^17 - 1) - 1
            4094_u16, // (2^12 - 1) - 1
            4094_u16, // (2^12 - 1) - 1
            65534_u16, // (2^16 - 1) - 1
            14_u8, // (2^4 - 1) - 1
            0xFFFFFFFFFFFFFFFE_u64, // (2^64 - 1) - 1
            30_u8, // (2^5 - 1) - 1
            254_u8, // (2^8 - 1) - 1
            1_u8, // 1-bit remains 1 for max
            131070_u32, // (2^17 - 1) - 1
            254_u8, // (2^8 - 1) - 1
            254_u8, // (2^8 - 1) - 1
            1_u8, // 1-bit remains 1 for max
            1_u8, // 1-bit remains 1 for max
            1_u8, // 1-bit remains 1 for max
            254_u8 // (2^8 - 1) - 1
        );
        let packed = PackableLiveStatsStorePacking::pack(stats);
        let unpacked = PackableLiveStatsStorePacking::unpack(packed);
        assert(unpacked.token_id == 131070_u32, 'max token_id');
        assert(unpacked.current_health == 4094_u16, 'max current_health');
        assert(unpacked.bonus_health == 4094_u16, 'max bonus_health');
        assert(unpacked.bonus_xp == 65534_u16, 'max bonus_xp');
        assert(unpacked.attack_streak == 14_u8, 'max attack_streak');
        assert(unpacked.last_death_timestamp == 0xFFFFFFFFFFFFFFFE_u64, 'max last_death_timestamp');
        assert(unpacked.revival_count == 30_u8, 'max revival_count');
        assert(unpacked.extra_lives == 254_u8, 'max extra_lives');
        assert(unpacked.has_claimed_potions == 1_u8, 'max has_claimed_potions');
        assert(unpacked.blocks_held == 131070_u32, 'max blocks_held');
        assert(unpacked.stats.spirit == 254_u8, 'max spirit');
        assert(unpacked.stats.luck == 254_u8, 'max luck');
        assert(unpacked.stats.specials == 1_u8, 'max specials');
        assert(unpacked.stats.wisdom == 1_u8, 'max wisdom');
        assert(unpacked.stats.diplomacy == 1_u8, 'max diplomacy');
        assert(unpacked.kills_claimed == 254_u8, 'max kills_claimed');
    }

    #[test]
    fn pack_unpack_mixed_values() {
        let stats = build_stats(100_u32, 100, 100, 100, 9, 123456789, 7, 42, 1, 54321, 17, 200, 0, 1_u8, 0_u8, 99_u8);
        let packed = PackableLiveStatsStorePacking::pack(stats);
        let unpacked = PackableLiveStatsStorePacking::unpack(packed);

        assert(unpacked.token_id == 100, 'mixed token_id');
        assert(unpacked.current_health == 100, 'mixed current_health');
        assert(unpacked.bonus_health == 100, 'mixed bonus_health');
        assert(unpacked.bonus_xp == 100, 'mixed bonus_xp');
        assert(unpacked.attack_streak == 9_u8, 'mixed attack_streak');
        assert(unpacked.last_death_timestamp == 123456789_u64, 'mixed last_death_timestamp');
        assert(unpacked.revival_count == 7_u8, 'mixed revival_count');
        assert(unpacked.extra_lives == 42_u8, 'mixed extra_lives');
        assert(unpacked.has_claimed_potions == 1_u8, 'mixed has_claimed_potions');
        assert(unpacked.blocks_held == 54321_u32, 'mixed blocks_held');
        assert(unpacked.stats.spirit == 17_u8, 'mixed spirit');
        assert(unpacked.stats.luck == 200_u8, 'mixed luck');
        assert(unpacked.stats.specials == 0_u8, 'mixed specials');
        assert(unpacked.stats.wisdom == 1_u8, 'mixed wisdom');
        assert(unpacked.stats.diplomacy == 0_u8, 'mixed diplomacy');
        assert(unpacked.kills_claimed == 99_u8, 'mixed kills_claimed');
    }
}
