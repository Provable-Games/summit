use beasts_nft::pack::PackableBeast;

#[derive(Drop, Copy, Serde)]
pub struct LiveBeastStats {
    pub token_id: u32, // 17 bits
    pub current_health: u16, // 12 bits
    pub bonus_health: u16, // 12 bits
    pub bonus_xp: u16, // 16 bits
    pub attack_streak: u8, // 4 bits
    pub last_death_timestamp: u64, // 64 bits
    pub revival_count: u8, // 6 bits
    pub extra_lives: u16, // 12 bits 4000 max
    pub has_claimed_potions: u8, // 1 bit
    pub summit_held_seconds: u32, // 23 bits
    pub stats: Stats,
    pub rewards_earned: u32, // 32 bits
    pub rewards_claimed: u32 // 32 bits
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
    pub const TWO_POW_6: u256 = 0x40;
    pub const TWO_POW_8: u256 = 0x100;
    pub const TWO_POW_12: u256 = 0x1000;
    pub const TWO_POW_16: u256 = 0x10000;
    pub const TWO_POW_17: u256 = 0x20000;
    pub const TWO_POW_23: u256 = 0x800000;
    pub const TWO_POW_29: u256 = 0x20000000;
    pub const TWO_POW_41: u256 = 0x20000000000;
    pub const TWO_POW_57: u256 = 0x200000000000000;
    pub const TWO_POW_61: u256 = 0x2000000000000000;
    pub const TWO_POW_64: u256 = 0x10000000000000000;
    pub const TWO_POW_125: u256 = 0x20000000000000000000000000000000;
    pub const TWO_POW_131: u256 = 0x800000000000000000000000000000000;
    pub const TWO_POW_143: u256 = 0x800000000000000000000000000000000000;
    pub const TWO_POW_144: u256 = 0x1000000000000000000000000000000000000;
    pub const TWO_POW_167: u256 = 0x800000000000000000000000000000000000000000;
    pub const TWO_POW_175: u256 = 0x80000000000000000000000000000000000000000000;
    pub const TWO_POW_183: u256 = 0x8000000000000000000000000000000000000000000000;
    pub const TWO_POW_184: u256 = 0x10000000000000000000000000000000000000000000000;
    pub const TWO_POW_185: u256 = 0x20000000000000000000000000000000000000000000000;
    pub const TWO_POW_186: u256 = 0x40000000000000000000000000000000000000000000000;
    pub const TWO_POW_218: u256 = 0x4000000000000000000000000000000000000000000000000000000;

    // Mask constants for optimized unpacking (value = 2^N - 1)
    pub const MASK_1: u256 = 0x1;
    pub const MASK_4: u256 = 0xF;
    pub const MASK_6: u256 = 0x3F;
    pub const MASK_8: u256 = 0xFF;
    pub const MASK_12: u256 = 0xFFF;
    pub const MASK_16: u256 = 0xFFFF;
    pub const MASK_17: u256 = 0x1FFFF;
    pub const MASK_23: u256 = 0x7FFFFF;
    pub const MASK_32: u256 = 0xFFFFFFFF;
    pub const MASK_64: u256 = 0xFFFFFFFFFFFFFFFF;
}

// Storage packing implementation for PackableBeast
pub impl PackableLiveStatsStorePacking of starknet::storage_access::StorePacking<LiveBeastStats, felt252> {
    fn pack(value: LiveBeastStats) -> felt252 {
        // Pack according to structure:
        // Total bits: 17+12+12+16+4+64+6+12+1+23+8+8+1+1+1+32+32 = 250 bits (fits in felt252's 251 bits)
        (value.token_id.into()
            + value.current_health.into() * pow::TWO_POW_17
            + value.bonus_health.into() * pow::TWO_POW_29
            + value.bonus_xp.into() * pow::TWO_POW_41
            + value.attack_streak.into() * pow::TWO_POW_57
            + value.last_death_timestamp.into() * pow::TWO_POW_61
            + value.revival_count.into() * pow::TWO_POW_125
            + value.extra_lives.into() * pow::TWO_POW_131
            + value.has_claimed_potions.into() * pow::TWO_POW_143
            + value.summit_held_seconds.into() * pow::TWO_POW_144
            + value.stats.spirit.into() * pow::TWO_POW_167
            + value.stats.luck.into() * pow::TWO_POW_175
            + value.stats.specials.into() * pow::TWO_POW_183
            + value.stats.wisdom.into() * pow::TWO_POW_184
            + value.stats.diplomacy.into() * pow::TWO_POW_185
            + value.rewards_earned.into() * pow::TWO_POW_186
            + value.rewards_claimed.into() * pow::TWO_POW_218)
            .try_into()
            .expect('pack beast overflow')
    }

    fn unpack(value: felt252) -> LiveBeastStats {
        let mut packed: u256 = value.into();

        // Extract token_id (17 bits)
        let token_id = (packed & pow::MASK_17).try_into().expect('unpack token_id');
        packed = packed / pow::TWO_POW_17;

        // Extract current_health (12 bits)
        let current_health = (packed & pow::MASK_12).try_into().expect('unpack current_health');
        packed = packed / pow::TWO_POW_12;

        // Extract bonus_health (12 bits)
        let bonus_health = (packed & pow::MASK_12).try_into().expect('unpack bonus_health');
        packed = packed / pow::TWO_POW_12;

        // Extract bonus_xp (16 bits)
        let bonus_xp = (packed & pow::MASK_16).try_into().expect('unpack bonus_xp');
        packed = packed / pow::TWO_POW_16;

        // Extract attack_streak (4 bits)
        let attack_streak = (packed & pow::MASK_4).try_into().expect('unpack attack_streak');
        packed = packed / pow::TWO_POW_4;

        // Extract last_death_timestamp (64 bits)
        let last_death_timestamp = (packed & pow::MASK_64).try_into().expect('unpack last_death_timestamp');
        packed = packed / pow::TWO_POW_64;

        // Extract revival_count (6 bits)
        let revival_count = (packed & pow::MASK_6).try_into().expect('unpack revival_count');
        packed = packed / pow::TWO_POW_6;

        // Extract extra_lives (12 bits)
        let extra_lives = (packed & pow::MASK_12).try_into().expect('unpack extra_lives');
        packed = packed / pow::TWO_POW_12;

        // Extract has_claimed_potions (1 bit)
        let has_claimed_potions = (packed & pow::MASK_1).try_into().expect('unpack has_claimed_potions');
        packed = packed / 2_u256;

        // Extract summit_held_seconds (23 bits)
        let summit_held_seconds = (packed & pow::MASK_23).try_into().expect('unpack summit_held_seconds');
        packed = packed / pow::TWO_POW_23;

        let spirit = (packed & pow::MASK_8).try_into().expect('unpack spirit');
        packed = packed / pow::TWO_POW_8;

        let luck = (packed & pow::MASK_8).try_into().expect('unpack luck');
        packed = packed / pow::TWO_POW_8;

        // Extract all 3 flags at once
        let flags = packed & 7_u256; // 0b111 = 7
        let specials = (flags & 1_u256).try_into().expect('unpack specials');
        let wisdom = ((flags / 2_u256) & 1_u256).try_into().expect('unpack wisdom');
        let diplomacy = ((flags / 4_u256) & 1_u256).try_into().expect('unpack diplomacy');
        packed = packed / 8_u256; // shift past 3 flag bits

        // Extract rewards_earned (32 bits)
        let rewards_earned = (packed & pow::MASK_32).try_into().expect('unpack rewards_earned');
        packed = packed / 0x100000000_u256; // TWO_POW_32

        // Extract rewards_claimed (32 bits)
        let rewards_claimed = (packed & pow::MASK_32).try_into().expect('unpack rewards_claimed');

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
            summit_held_seconds,
            stats,
            rewards_earned,
            rewards_claimed,
        }
    }
}

#[generate_trait]
pub impl BeastUtilsImpl of BeastUtilsTrait {
    /// Calculate critical hit chance based on luck stat
    /// Called every battle round so must be fast
    #[inline(always)]
    fn crit_chance(self: Beast) -> u8 {
        let points: u16 = self.live.stats.luck.into();

        let mut total_bp: u16 = 0;
        if points <= 5 {
            total_bp = match points {
                0 => 0,
                1 => 1000,
                2 => 1400,
                3 => 1700,
                4 => 1900,
                5 => 2000,
                _ => 0,
            };
        } else if points <= 70 {
            total_bp = 2000 + ((points - 5) * 100);
        } else {
            total_bp = 8500 + ((points - 70) * 50);
        }

        let percent = total_bp / 100;
        percent.try_into().unwrap()
    }

    /// Calculate spirit reduction for revival time
    /// Called for each attacking beast
    #[inline(always)]
    fn spirit_reduction(self: Beast) -> u64 {
        let points: u64 = self.live.stats.spirit.into();
        let mut reduction: u64 = 0;

        if points <= 5 {
            reduction = match points {
                0 => 0,
                1 => 7200,
                2 => 10080,
                3 => 12240,
                4 => 13680,
                5 => 14400,
                _ => 0,
            };
        } else if points <= 70 {
            reduction = 14400 + ((points - 5) * 720);
        } else {
            reduction = 61200 + ((points - 70) * 360);
        }

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
        extra_lives: u16,
        has_claimed_potions: u8,
        summit_held_seconds: u32,
        spirit: u8,
        luck: u8,
        specials: u8,
        wisdom: u8,
        diplomacy: u8,
        rewards_earned: u32,
        rewards_claimed: u32,
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
            summit_held_seconds,
            stats: Stats { spirit, luck, specials, wisdom, diplomacy },
            rewards_earned,
            rewards_claimed,
        }
    }

    #[test]
    #[available_gas(gas: 1200000)]
    fn pack_unpack_zero_values() {
        let stats = build_stats(
            0_u32, // token_id
            0_u16, // current_health
            0_u16, // bonus_health
            0_u16, // bonus_xp
            0_u8, // attack_streak
            0_u64, // last_death_timestamp
            0_u8, // revival_count
            0_u16, // extra_lives
            0_u8, // has_claimed_potions
            0_u32, // summit_held_seconds
            0_u8, // spirit
            0_u8, // luck
            0_u8, // specials
            0_u8, // wisdom
            0_u8, // diplomacy
            0_u32, // rewards_earned
            0_u32 // rewards_claimed
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
        assert(unpacked.summit_held_seconds == 0, 'zero summit_held_seconds');
        assert(unpacked.stats.spirit == 0, 'zero spirit');
        assert(unpacked.stats.luck == 0, 'zero luck');
        assert(unpacked.stats.specials == 0, 'zero specials');
        assert(unpacked.stats.wisdom == 0, 'zero wisdom');
        assert(unpacked.stats.diplomacy == 0, 'zero diplomacy');
        assert(unpacked.rewards_earned == 0, 'zero rewards_earned');
        assert(unpacked.rewards_claimed == 0, 'zero rewards_claimed');
    }

    #[test]
    #[available_gas(gas: 1200000)]
    fn pack_unpack_max_values() {
        // Bit-width maxima based on packing layout:
        // token_id: 17 bits -> 2^17 - 1
        // current_health: 12 bits -> 2^12 - 1
        // bonus_health: 12 bits -> 2^12 - 1
        // bonus_xp: 16 bits -> 2^16 - 1
        // attack_streak: 4 bits -> 2^4 - 1
        // last_death_timestamp: 64 bits -> 2^64 - 1
        // revival_count: 6 bits -> 2^6 - 1
        // extra_lives: 12 bits -> 2^12 - 1
        // has_claimed_potions: 1 bit -> 1
        // summit_held_seconds: 23 bits -> 2^23 - 1
        // spirit, luck: 8 bits -> 255
        // specials, wisdom, diplomacy: 1 bit -> 1
        // rewards_earned, rewards_claimed: 32 bits -> 2^32 - 1
        let stats = build_stats(
            131070_u32, // (2^17 - 1) - 1
            4094_u16, // (2^12 - 1) - 1
            4094_u16, // (2^12 - 1) - 1
            65534_u16, // (2^16 - 1) - 1
            14_u8, // (2^4 - 1) - 1
            0xFFFFFFFFFFFFFFFE_u64, // (2^64 - 1) - 1
            63_u8, // (2^6 - 1) - 1
            4094_u16, // (2^12 - 1) - 1
            1_u8, // 1-bit remains 1 for max
            8388606_u32, // (2^23 - 1) - 1
            100, // (2^8 - 1) - 1
            100, // (2^8 - 1) - 1
            1_u8, // 1-bit remains 1 for max
            1_u8, // 1-bit remains 1 for max
            1_u8, // 1-bit remains 1 for max
            0xFFFFFFFE_u32, // (2^32 - 1) - 1
            0xFFFFFFFE_u32 // (2^32 - 1) - 1
        );
        let packed = PackableLiveStatsStorePacking::pack(stats);
        let unpacked = PackableLiveStatsStorePacking::unpack(packed);
        assert(unpacked.token_id == 131070_u32, 'max token_id');
        assert(unpacked.current_health == 4094_u16, 'max current_health');
        assert(unpacked.bonus_health == 4094_u16, 'max bonus_health');
        assert(unpacked.bonus_xp == 65534_u16, 'max bonus_xp');
        assert(unpacked.attack_streak == 14_u8, 'max attack_streak');
        assert(unpacked.last_death_timestamp == 0xFFFFFFFFFFFFFFFE_u64, 'max last_death_timestamp');
        assert(unpacked.revival_count == 63_u8, 'max revival_count');
        assert(unpacked.extra_lives == 4094_u16, 'max extra_lives');
        assert(unpacked.has_claimed_potions == 1_u8, 'max has_claimed_potions');
        assert(unpacked.summit_held_seconds == 8388606_u32, 'max summit_held_seconds');
        assert(unpacked.stats.spirit == 100, 'max spirit');
        assert(unpacked.stats.luck == 100, 'max luck');
        assert(unpacked.stats.specials == 1_u8, 'max specials');
        assert(unpacked.stats.wisdom == 1_u8, 'max wisdom');
        assert(unpacked.stats.diplomacy == 1_u8, 'max diplomacy');
        assert(unpacked.rewards_earned == 0xFFFFFFFE_u32, 'max rewards_earned');
        assert(unpacked.rewards_claimed == 0xFFFFFFFE_u32, 'max rewards_claimed');
    }

    #[test]
    #[available_gas(gas: 1200000)]
    fn pack_unpack_mixed_values() {
        let stats = build_stats(
            100_u32, 100, 100, 100, 9, 123456789, 7, 42, 1, 54321, 17, 96, 0, 1_u8, 0_u8, 1000000_u32, 500000_u32,
        );
        let packed = PackableLiveStatsStorePacking::pack(stats);
        let unpacked = PackableLiveStatsStorePacking::unpack(packed);

        assert(unpacked.token_id == 100, 'mixed token_id');
        assert(unpacked.current_health == 100, 'mixed current_health');
        assert(unpacked.bonus_health == 100, 'mixed bonus_health');
        assert(unpacked.bonus_xp == 100, 'mixed bonus_xp');
        assert(unpacked.attack_streak == 9_u8, 'mixed attack_streak');
        assert(unpacked.last_death_timestamp == 123456789_u64, 'mixed last_death_timestamp');
        assert(unpacked.revival_count == 7_u8, 'mixed revival_count');
        assert(unpacked.extra_lives == 42_u16, 'mixed extra_lives');
        assert(unpacked.has_claimed_potions == 1_u8, 'mixed has_claimed_potions');
        assert(unpacked.summit_held_seconds == 54321_u32, 'mixed summit_held_seconds');
        assert(unpacked.stats.spirit == 17_u8, 'mixed spirit');
        assert(unpacked.stats.luck == 96_u8, 'mixed luck');
        assert(unpacked.stats.specials == 0_u8, 'mixed specials');
        assert(unpacked.stats.wisdom == 1_u8, 'mixed wisdom');
        assert(unpacked.stats.diplomacy == 0_u8, 'mixed diplomacy');
        assert(unpacked.rewards_earned == 1000000_u32, 'mixed rewards_earned');
        assert(unpacked.rewards_claimed == 500000_u32, 'mixed rewards_claimed');
    }
}
