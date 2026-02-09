use beasts_nft::pack::PackableBeast;

#[derive(Drop, Copy, Serde)]
pub struct LiveBeastStats {
    pub token_id: u32, // 17 bits
    pub current_health: u16, // 12 bits
    pub bonus_health: u16, // 11 bits
    pub bonus_xp: u16, // 15 bits
    pub attack_streak: u8, // 4 bits
    pub last_death_timestamp: u64, // 64 bits
    pub revival_count: u8, // 6 bits
    pub extra_lives: u16, // 12 bits 4000 max
    pub summit_held_seconds: u32, // 23 bits
    pub stats: Stats,
    pub rewards_earned: u32, // 32 bits
    pub rewards_claimed: u32,
    pub quest: Quest,
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
pub struct Quest {
    pub captured_summit: u8, // 1 bit
    pub used_revival_potion: u8, // 1 bit
    pub used_attack_potion: u8, // 1 bit
    pub max_attack_streak: u8 // 1 bit
}

#[derive(Copy, Drop, Serde)]
pub struct Beast {
    pub fixed: PackableBeast,
    pub live: LiveBeastStats,
}

/// Power of 2 constants for bit manipulation
/// Layout: token_id(17) + current_health(12) + bonus_health(11) + bonus_xp(15) + attack_streak(4)
///         + last_death_timestamp(64) + revival_count(6) + extra_lives(12) + summit_held_seconds(23)
///         + spirit(8) + luck(8) + specials(1) + wisdom(1) + diplomacy(1)
///         + rewards_earned(32) + rewards_claimed(32) + quest(4) = 251 bits
mod pow {
    pub const TWO_POW_4: u256 = 0x10;
    pub const TWO_POW_6: u256 = 0x40;
    pub const TWO_POW_8: u256 = 0x100;
    pub const TWO_POW_11: u256 = 0x800;
    pub const TWO_POW_12: u256 = 0x1000;
    pub const TWO_POW_15: u256 = 0x8000;
    pub const TWO_POW_17: u256 = 0x20000;
    pub const TWO_POW_23: u256 = 0x800000;
    pub const TWO_POW_29: u256 = 0x20000000;
    pub const TWO_POW_40: u256 = 0x10000000000;
    pub const TWO_POW_55: u256 = 0x80000000000000;
    pub const TWO_POW_59: u256 = 0x800000000000000;
    pub const TWO_POW_64: u256 = 0x10000000000000000;
    pub const TWO_POW_123: u256 = 0x8000000000000000000000000000000;
    pub const TWO_POW_129: u256 = 0x200000000000000000000000000000000;
    pub const TWO_POW_141: u256 = 0x200000000000000000000000000000000000;
    pub const TWO_POW_164: u256 = 0x100000000000000000000000000000000000000000;
    pub const TWO_POW_172: u256 = 0x10000000000000000000000000000000000000000000;
    pub const TWO_POW_180: u256 = 0x1000000000000000000000000000000000000000000000;
    pub const TWO_POW_181: u256 = 0x2000000000000000000000000000000000000000000000;
    pub const TWO_POW_182: u256 = 0x4000000000000000000000000000000000000000000000;
    pub const TWO_POW_183: u256 = 0x8000000000000000000000000000000000000000000000;
    pub const TWO_POW_215: u256 = 0x800000000000000000000000000000000000000000000000000000;
    pub const TWO_POW_247: u256 = 0x80000000000000000000000000000000000000000000000000000000000000;
    pub const TWO_POW_248: u256 = 0x100000000000000000000000000000000000000000000000000000000000000;
    pub const TWO_POW_249: u256 = 0x200000000000000000000000000000000000000000000000000000000000000;
    pub const TWO_POW_250: u256 = 0x400000000000000000000000000000000000000000000000000000000000000;

    // Mask constants for optimized unpacking (value = 2^N - 1)
    pub const MASK_1: u256 = 0x1;
    pub const MASK_4: u256 = 0xF;
    pub const MASK_6: u256 = 0x3F;
    pub const MASK_8: u256 = 0xFF;
    pub const MASK_11: u256 = 0x7FF;
    pub const MASK_12: u256 = 0xFFF;
    pub const MASK_15: u256 = 0x7FFF;
    pub const MASK_17: u256 = 0x1FFFF;
    pub const MASK_23: u256 = 0x7FFFFF;
    pub const MASK_32: u256 = 0xFFFFFFFF;
    pub const MASK_64: u256 = 0xFFFFFFFFFFFFFFFF;
}

// Storage packing implementation for PackableBeast
pub impl PackableLiveStatsStorePacking of starknet::storage_access::StorePacking<LiveBeastStats, felt252> {
    fn pack(value: LiveBeastStats) -> felt252 {
        // Pack according to structure:
        // Total bits: 17+12+11+15+4+64+6+12+23+8+8+1+1+1+32+32+3 = 250 bits (fits in felt252's 251 bits)
        (value.token_id.into() // 17 bits at position 0
            + value.current_health.into() * pow::TWO_POW_17 // 12 bits at position 17
            + value.bonus_health.into() * pow::TWO_POW_29 // 11 bits at position 29
            + value.bonus_xp.into() * pow::TWO_POW_40 // 15 bits at position 40
            + value.attack_streak.into() * pow::TWO_POW_55 // 4 bits at position 55
            + value.last_death_timestamp.into() * pow::TWO_POW_59 // 64 bits at position 59
            + value.revival_count.into() * pow::TWO_POW_123 // 6 bits at position 123
            + value.extra_lives.into() * pow::TWO_POW_129 // 12 bits at position 129
            + value.summit_held_seconds.into() * pow::TWO_POW_141 // 23 bits at position 141
            + value.stats.spirit.into() * pow::TWO_POW_164 // 8 bits at position 164
            + value.stats.luck.into() * pow::TWO_POW_172 // 8 bits at position 172
            + value.stats.specials.into() * pow::TWO_POW_180 // 1 bit at position 180
            + value.stats.wisdom.into() * pow::TWO_POW_181 // 1 bit at position 181
            + value.stats.diplomacy.into() * pow::TWO_POW_182 // 1 bit at position 182
            + value.rewards_earned.into() * pow::TWO_POW_183 // 32 bits at position 183
            + value.rewards_claimed.into() * pow::TWO_POW_215 // 32 bits at position 215
            + value.quest.captured_summit.into() * pow::TWO_POW_247 // 1 bit at position 247
            + value.quest.used_revival_potion.into() * pow::TWO_POW_248 // 1 bit at position 248
            + value.quest.used_attack_potion.into() * pow::TWO_POW_249 // 1 bit at position 249
            + value.quest.max_attack_streak.into() * pow::TWO_POW_250) // 1 bit at position 250
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

        // Extract bonus_health (11 bits)
        let bonus_health = (packed & pow::MASK_11).try_into().expect('unpack bonus_health');
        packed = packed / pow::TWO_POW_11;

        // Extract bonus_xp (15 bits)
        let bonus_xp = (packed & pow::MASK_15).try_into().expect('unpack bonus_xp');
        packed = packed / pow::TWO_POW_15;

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

        // Extract summit_held_seconds (23 bits)
        let summit_held_seconds = (packed & pow::MASK_23).try_into().expect('unpack summit_held_seconds');
        packed = packed / pow::TWO_POW_23;

        // Extract spirit (8 bits)
        let spirit = (packed & pow::MASK_8).try_into().expect('unpack spirit');
        packed = packed / pow::TWO_POW_8;

        // Extract luck (8 bits)
        let luck = (packed & pow::MASK_8).try_into().expect('unpack luck');
        packed = packed / pow::TWO_POW_8;

        // Extract stats flags (3 bits: specials, wisdom, diplomacy)
        let specials = (packed & pow::MASK_1).try_into().expect('unpack specials');
        packed = packed / 2_u256;
        let wisdom = (packed & pow::MASK_1).try_into().expect('unpack wisdom');
        packed = packed / 2_u256;
        let diplomacy = (packed & pow::MASK_1).try_into().expect('unpack diplomacy');
        packed = packed / 2_u256;

        // Extract rewards_earned (32 bits)
        let rewards_earned = (packed & pow::MASK_32).try_into().expect('unpack rewards_earned');
        packed = packed / 0x100000000_u256; // TWO_POW_32

        // Extract rewards_claimed (32 bits)
        let rewards_claimed = (packed & pow::MASK_32).try_into().expect('unpack rewards_claimed');
        packed = packed / 0x100000000_u256; // TWO_POW_32

        // Extract quest flags (4 bits: captured_summit, used_revival_potion, used_attack_potion, max_attack_streak)
        let captured_summit = (packed & pow::MASK_1).try_into().expect('unpack captured_summit');
        packed = packed / 2_u256;
        let used_revival_potion = (packed & pow::MASK_1).try_into().expect('unpack used_revival_potion');
        packed = packed / 2_u256;
        let used_attack_potion = (packed & pow::MASK_1).try_into().expect('unpack used_attack_potion');
        packed = packed / 2_u256;
        let max_attack_streak = (packed & pow::MASK_1).try_into().expect('unpack max_attack_streak');

        let stats = Stats { spirit, luck, specials, wisdom, diplomacy };
        let quest = Quest { captured_summit, used_revival_potion, used_attack_potion, max_attack_streak };

        LiveBeastStats {
            token_id,
            current_health,
            bonus_health,
            bonus_xp,
            attack_streak,
            last_death_timestamp,
            revival_count,
            extra_lives,
            summit_held_seconds,
            stats,
            rewards_earned,
            rewards_claimed,
            quest,
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
        summit_held_seconds: u32,
        spirit: u8,
        luck: u8,
        specials: u8,
        wisdom: u8,
        diplomacy: u8,
        rewards_earned: u32,
        rewards_claimed: u32,
        captured_summit: u8,
        used_revival_potion: u8,
        used_attack_potion: u8,
        max_attack_streak: u8,
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
            summit_held_seconds,
            stats: Stats { spirit, luck, specials, wisdom, diplomacy },
            rewards_earned,
            rewards_claimed,
            quest: Quest { captured_summit, used_revival_potion, used_attack_potion, max_attack_streak },
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
            0_u32, // summit_held_seconds
            0_u8, // spirit
            0_u8, // luck
            0_u8, // specials
            0_u8, // wisdom
            0_u8, // diplomacy
            0_u32, // rewards_earned
            0_u32, // rewards_claimed
            0_u8, // captured_summit
            0_u8, // used_revival_potion
            0_u8, // used_attack_potion
            0_u8 // max_attack_streak
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
        assert(unpacked.summit_held_seconds == 0, 'zero summit_held_seconds');
        assert(unpacked.stats.spirit == 0, 'zero spirit');
        assert(unpacked.stats.luck == 0, 'zero luck');
        assert(unpacked.stats.specials == 0, 'zero specials');
        assert(unpacked.stats.wisdom == 0, 'zero wisdom');
        assert(unpacked.stats.diplomacy == 0, 'zero diplomacy');
        assert(unpacked.rewards_earned == 0, 'zero rewards_earned');
        assert(unpacked.rewards_claimed == 0, 'zero rewards_claimed');
        assert(unpacked.quest.captured_summit == 0, 'zero captured_summit');
        assert(unpacked.quest.used_revival_potion == 0, 'zero used_revival_potion');
        assert(unpacked.quest.used_attack_potion == 0, 'zero used_attack_potion');
        assert(unpacked.quest.max_attack_streak == 0, 'zero max_attack_streak');
    }

    #[test]
    #[available_gas(gas: 1200000)]
    fn pack_unpack_max_values() {
        // Bit-width maxima based on packing layout:
        // token_id: 17 bits -> 2^17 - 1
        // current_health: 12 bits -> 2^12 - 1
        // bonus_health: 11 bits -> 2^11 - 1
        // bonus_xp: 15 bits -> 2^15 - 1
        // attack_streak: 4 bits -> 2^4 - 1
        // last_death_timestamp: 64 bits -> 2^64 - 1
        // revival_count: 6 bits -> 2^6 - 1
        // extra_lives: 12 bits -> 2^12 - 1
        // summit_held_seconds: 23 bits -> 2^23 - 1
        // spirit, luck: 8 bits -> 255
        // specials, wisdom, diplomacy: 1 bit -> 1
        // rewards_earned, rewards_claimed: 32 bits -> 2^32 - 1
        // quest flags: 1 bit each -> 1
        let stats = build_stats(
            131070_u32, // (2^17 - 1) - 1
            4094_u16, // (2^12 - 1) - 1
            2046_u16, // (2^11 - 1) - 1
            32766_u16, // (2^15 - 1) - 1
            14_u8, // (2^4 - 1) - 1
            0xFFFFFFFFFFFFFFFE_u64, // (2^64 - 1) - 1
            63_u8, // (2^6 - 1) - 1
            4094_u16, // (2^12 - 1) - 1
            8388606_u32, // (2^23 - 1) - 1
            100, // spirit
            100, // luck
            1_u8, // specials: 1-bit max
            1_u8, // wisdom: 1-bit max
            1_u8, // diplomacy: 1-bit max
            0xFFFFFFFE_u32, // (2^32 - 1) - 1
            0xFFFFFFFE_u32, // (2^32 - 1) - 1
            1_u8, // captured_summit: 1-bit max
            1_u8, // used_revival_potion: 1-bit max
            1_u8, // used_attack_potion: 1-bit max
            1_u8 // max_attack_streak: 1-bit max
        );
        let packed = PackableLiveStatsStorePacking::pack(stats);
        let unpacked = PackableLiveStatsStorePacking::unpack(packed);
        assert(unpacked.token_id == 131070_u32, 'max token_id');
        assert(unpacked.current_health == 4094_u16, 'max current_health');
        assert(unpacked.bonus_health == 2046_u16, 'max bonus_health');
        assert(unpacked.bonus_xp == 32766_u16, 'max bonus_xp');
        assert(unpacked.attack_streak == 14_u8, 'max attack_streak');
        assert(unpacked.last_death_timestamp == 0xFFFFFFFFFFFFFFFE_u64, 'max last_death_timestamp');
        assert(unpacked.revival_count == 63_u8, 'max revival_count');
        assert(unpacked.extra_lives == 4094_u16, 'max extra_lives');
        assert(unpacked.summit_held_seconds == 8388606_u32, 'max summit_held_seconds');
        assert(unpacked.stats.spirit == 100, 'max spirit');
        assert(unpacked.stats.luck == 100, 'max luck');
        assert(unpacked.stats.specials == 1_u8, 'max specials');
        assert(unpacked.stats.wisdom == 1_u8, 'max wisdom');
        assert(unpacked.stats.diplomacy == 1_u8, 'max diplomacy');
        assert(unpacked.rewards_earned == 0xFFFFFFFE_u32, 'max rewards_earned');
        assert(unpacked.rewards_claimed == 0xFFFFFFFE_u32, 'max rewards_claimed');
        assert(unpacked.quest.captured_summit == 1_u8, 'max captured_summit');
        assert(unpacked.quest.used_revival_potion == 1_u8, 'max used_revival_potion');
        assert(unpacked.quest.used_attack_potion == 1_u8, 'max used_attack_potion');
        assert(unpacked.quest.max_attack_streak == 1_u8, 'max max_attack_streak');
    }

    #[test]
    #[available_gas(gas: 1200000)]
    fn pack_unpack_mixed_values() {
        let stats = build_stats(
            100_u32, // token_id
            100, // current_health
            100, // bonus_health
            100, // bonus_xp
            9, // attack_streak
            123456789, // last_death_timestamp
            7, // revival_count
            42, // extra_lives
            54321, // summit_held_seconds
            17, // spirit
            96, // luck
            0, // specials
            1_u8, // wisdom
            0_u8, // diplomacy
            1000000_u32, // rewards_earned
            500000_u32, // rewards_claimed
            1_u8, // captured_summit
            0_u8, // used_revival_potion
            1_u8, // used_attack_potion
            1_u8 // max_attack_streak
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
        assert(unpacked.summit_held_seconds == 54321_u32, 'mixed summit_held_seconds');
        assert(unpacked.stats.spirit == 17_u8, 'mixed spirit');
        assert(unpacked.stats.luck == 96_u8, 'mixed luck');
        assert(unpacked.stats.specials == 0_u8, 'mixed specials');
        assert(unpacked.stats.wisdom == 1_u8, 'mixed wisdom');
        assert(unpacked.stats.diplomacy == 0_u8, 'mixed diplomacy');
        assert(unpacked.rewards_earned == 1000000_u32, 'mixed rewards_earned');
        assert(unpacked.rewards_claimed == 500000_u32, 'mixed rewards_claimed');
        assert(unpacked.quest.captured_summit == 1_u8, 'mixed captured_summit');
        assert(unpacked.quest.used_revival_potion == 0_u8, 'mixed used_revival_potion');
        assert(unpacked.quest.used_attack_potion == 1_u8, 'mixed used_attack_potion');
        assert(unpacked.quest.max_attack_streak == 1_u8, 'mixed max_attack_streak');
    }
}
