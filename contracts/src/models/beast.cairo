use beasts_nft::pack::PackableBeast;
use core::traits::DivRem;

#[derive(Drop, Copy, Serde)]
pub struct LiveBeastStats {
    pub token_id: u32, // 17 bits
    pub current_health: u16, // 12 bits
    pub bonus_health: u16, // 11 bits
    pub bonus_xp: u16, // 15 bits
    pub attack_streak: u8, // 4 bits
    pub last_death_timestamp: u64, // 64 bits
    pub revival_count: u8, // 6 bits
    pub extra_lives: u16, // 12 bits
    pub summit_held_seconds: u32, // 23 bits
    pub stats: Stats, // 19 bits
    pub rewards_earned: u32, // 32 bits
    pub rewards_claimed: u32, // 32 bits
    pub quest: Quest // 4 bits
}

#[derive(Copy, Drop, Serde)]
pub struct Stats {
    pub spirit: u8, // 8 bits
    pub luck: u8, // 8 bits
    pub specials: u8, // 1 bit
    pub wisdom: u8, // 1 bit
    pub diplomacy: u8 // 1 bit
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

/// NonZero<u128> constants for DivRem-based unpacking.
/// Each constant is a power of 2 matching the field width.
/// DivRem extracts field (remainder) and shifts (quotient) in one operation.
mod nz128 {
    // Low half divisors
    pub const TWO_POW_1: NonZero<u128> = 0x2;
    pub const TWO_POW_32: NonZero<u128> = 0x100000000;
    pub const TWO_POW_64: NonZero<u128> = 0x10000000000000000;
    // High half divisors
    pub const TWO_POW_4: NonZero<u128> = 0x10;
    pub const TWO_POW_6: NonZero<u128> = 0x40;
    pub const TWO_POW_8: NonZero<u128> = 0x100;
    pub const TWO_POW_11: NonZero<u128> = 0x800;
    pub const TWO_POW_12: NonZero<u128> = 0x1000;
    pub const TWO_POW_15: NonZero<u128> = 0x8000;
    pub const TWO_POW_17: NonZero<u128> = 0x20000;
    pub const TWO_POW_23: NonZero<u128> = 0x800000;
}

/// u128 shift constants used by pack() to avoid inlined magic numbers.
mod shift128 {
    // Low half shifts
    pub const REWARDS_EARNED_SHIFT: u128 = 0x10000000000000000; // shift 64
    pub const REWARDS_CLAIMED_SHIFT: u128 = 0x1000000000000000000000000; // shift 96

    // High half shifts
    pub const CURRENT_HEALTH_SHIFT: u128 = 0x20000; // shift 17
    pub const BONUS_HEALTH_SHIFT: u128 = 0x20000000; // shift 29
    pub const BONUS_XP_SHIFT: u128 = 0x10000000000; // shift 40
    pub const ATTACK_STREAK_SHIFT: u128 = 0x80000000000000; // shift 55
    pub const REVIVAL_COUNT_SHIFT: u128 = 0x800000000000000; // shift 59
    pub const EXTRA_LIVES_SHIFT: u128 = 0x20000000000000000; // shift 65
    pub const SUMMIT_HELD_SECONDS_SHIFT: u128 = 0x20000000000000000000; // shift 77
    pub const SPIRIT_SHIFT: u128 = 0x10000000000000000000000000; // shift 100
    pub const LUCK_SHIFT: u128 = 0x1000000000000000000000000000; // shift 108
    pub const SPECIALS_SHIFT: u128 = 0x100000000000000000000000000000; // shift 116
    pub const WISDOM_SHIFT: u128 = 0x200000000000000000000000000000; // shift 117
    pub const DIPLOMACY_SHIFT: u128 = 0x400000000000000000000000000000; // shift 118
    pub const CAPTURED_SUMMIT_SHIFT: u128 = 0x800000000000000000000000000000; // shift 119
    pub const USED_REVIVAL_POTION_SHIFT: u128 = 0x1000000000000000000000000000000; // shift 120
    pub const USED_ATTACK_POTION_SHIFT: u128 = 0x2000000000000000000000000000000; // shift 121
    pub const MAX_ATTACK_STREAK_SHIFT: u128 = 0x4000000000000000000000000000000; // shift 122
}

/// u128-aligned StorePacking for LiveBeastStats.
///
/// Bit layout (251 bits total, no field straddles the u128 boundary):
///
/// Low u128 (128 bits):
///   last_death_timestamp(64) | rewards_earned(32) | rewards_claimed(32)
///
/// High u128 (123 bits):
///   token_id(17) | current_health(12) | bonus_health(11) | bonus_xp(15)
///   | attack_streak(4) | revival_count(6) | extra_lives(12) | summit_held_seconds(23)
///   | spirit(8) | luck(8) | specials(1) | wisdom(1) | diplomacy(1)
///   | captured_summit(1) | used_revival_potion(1) | used_attack_potion(1) | max_attack_streak(1)
///
/// All DivRem operations use native u128_safe_divmod Sierra hints.
pub impl PackableLiveStatsStorePacking of starknet::storage_access::StorePacking<LiveBeastStats, felt252> {
    fn pack(value: LiveBeastStats) -> felt252 {
        // Low u128: last_death_timestamp(64) + rewards_earned(32) + rewards_claimed(32) = 128 bits
        let low: u128 = value.last_death_timestamp.into()
            + value.rewards_earned.into() * shift128::REWARDS_EARNED_SHIFT
            + value.rewards_claimed.into() * shift128::REWARDS_CLAIMED_SHIFT;

        // High u128: remaining 17 fields = 123 bits
        let high: u128 = value.token_id.into() // 17 bits @ 0
            + value.current_health.into() * shift128::CURRENT_HEALTH_SHIFT
            + value.bonus_health.into() * shift128::BONUS_HEALTH_SHIFT
            + value.bonus_xp.into() * shift128::BONUS_XP_SHIFT
            + value.attack_streak.into() * shift128::ATTACK_STREAK_SHIFT
            + value.revival_count.into() * shift128::REVIVAL_COUNT_SHIFT
            + value.extra_lives.into() * shift128::EXTRA_LIVES_SHIFT
            + value.summit_held_seconds.into() * shift128::SUMMIT_HELD_SECONDS_SHIFT
            + value.stats.spirit.into() * shift128::SPIRIT_SHIFT
            + value.stats.luck.into() * shift128::LUCK_SHIFT
            + value.stats.specials.into() * shift128::SPECIALS_SHIFT
            + value.stats.wisdom.into() * shift128::WISDOM_SHIFT
            + value.stats.diplomacy.into() * shift128::DIPLOMACY_SHIFT
            + value.quest.captured_summit.into() * shift128::CAPTURED_SUMMIT_SHIFT
            + value.quest.used_revival_potion.into() * shift128::USED_REVIVAL_POTION_SHIFT
            + value.quest.used_attack_potion.into() * shift128::USED_ATTACK_POTION_SHIFT
            + value.quest.max_attack_streak.into() * shift128::MAX_ATTACK_STREAK_SHIFT;

        let packed = u256 { low, high };
        packed.try_into().expect('pack beast overflow')
    }

    fn unpack(value: felt252) -> LiveBeastStats {
        let packed: u256 = value.into();

        // Split into u128 halves - free struct field access
        let low = packed.low;
        let high = packed.high;

        // Unpack low u128: last_death_timestamp(64) + rewards_earned(32) + rewards_claimed(32)
        let (rest, last_death_timestamp) = DivRem::div_rem(low, nz128::TWO_POW_64);
        let (rewards_claimed, rewards_earned) = DivRem::div_rem(rest, nz128::TWO_POW_32);

        // Unpack high u128: 17 fields, all u128 DivRem
        let (hi, token_id) = DivRem::div_rem(high, nz128::TWO_POW_17);
        let (hi, current_health) = DivRem::div_rem(hi, nz128::TWO_POW_12);
        let (hi, bonus_health) = DivRem::div_rem(hi, nz128::TWO_POW_11);
        let (hi, bonus_xp) = DivRem::div_rem(hi, nz128::TWO_POW_15);
        let (hi, attack_streak) = DivRem::div_rem(hi, nz128::TWO_POW_4);
        let (hi, revival_count) = DivRem::div_rem(hi, nz128::TWO_POW_6);
        let (hi, extra_lives) = DivRem::div_rem(hi, nz128::TWO_POW_12);
        let (hi, summit_held_seconds) = DivRem::div_rem(hi, nz128::TWO_POW_23);
        let (hi, spirit) = DivRem::div_rem(hi, nz128::TWO_POW_8);
        let (hi, luck) = DivRem::div_rem(hi, nz128::TWO_POW_8);
        // 7 single-bit fields
        let (hi, specials) = DivRem::div_rem(hi, nz128::TWO_POW_1);
        let (hi, wisdom) = DivRem::div_rem(hi, nz128::TWO_POW_1);
        let (hi, diplomacy) = DivRem::div_rem(hi, nz128::TWO_POW_1);
        let (hi, captured_summit) = DivRem::div_rem(hi, nz128::TWO_POW_1);
        let (hi, used_revival_potion) = DivRem::div_rem(hi, nz128::TWO_POW_1);
        let (hi, used_attack_potion) = DivRem::div_rem(hi, nz128::TWO_POW_1);
        let (_, max_attack_streak) = DivRem::div_rem(hi, nz128::TWO_POW_1);

        LiveBeastStats {
            token_id: token_id.try_into().expect('unpack token_id'),
            current_health: current_health.try_into().expect('unpack current_health'),
            bonus_health: bonus_health.try_into().expect('unpack bonus_health'),
            bonus_xp: bonus_xp.try_into().expect('unpack bonus_xp'),
            attack_streak: attack_streak.try_into().expect('unpack attack_streak'),
            last_death_timestamp: last_death_timestamp.try_into().expect('unpack timestamp'),
            revival_count: revival_count.try_into().expect('unpack revival_count'),
            extra_lives: extra_lives.try_into().expect('unpack extra_lives'),
            summit_held_seconds: summit_held_seconds.try_into().expect('unpack summit_secs'),
            stats: Stats {
                spirit: spirit.try_into().expect('unpack spirit'),
                luck: luck.try_into().expect('unpack luck'),
                specials: specials.try_into().expect('unpack specials'),
                wisdom: wisdom.try_into().expect('unpack wisdom'),
                diplomacy: diplomacy.try_into().expect('unpack diplomacy'),
            },
            rewards_earned: rewards_earned.try_into().expect('unpack rewards_earned'),
            rewards_claimed: rewards_claimed.try_into().expect('unpack rewards_claimed'),
            quest: Quest {
                captured_summit: captured_summit.try_into().expect('unpack q.captured'),
                used_revival_potion: used_revival_potion.try_into().expect('unpack q.revival'),
                used_attack_potion: used_attack_potion.try_into().expect('unpack q.attack'),
                max_attack_streak: max_attack_streak.try_into().expect('unpack q.max_streak'),
            },
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

    const CROSS_LAYER_PARITY_PACKED: felt252 = 0x6dc75813f7e39148cb039612a721092075bcd153ade68b10000000067748580;

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

    fn assert_stats_equal(actual: LiveBeastStats, expected: LiveBeastStats) {
        assert(actual.token_id == expected.token_id, 'token_id mismatch');
        assert(actual.current_health == expected.current_health, 'current_health mismatch');
        assert(actual.bonus_health == expected.bonus_health, 'bonus_health mismatch');
        assert(actual.bonus_xp == expected.bonus_xp, 'bonus_xp mismatch');
        assert(actual.attack_streak == expected.attack_streak, 'attack_streak mismatch');
        assert(actual.last_death_timestamp == expected.last_death_timestamp, 'timestamp mismatch');
        assert(actual.revival_count == expected.revival_count, 'revival_count mismatch');
        assert(actual.extra_lives == expected.extra_lives, 'extra_lives mismatch');
        assert(actual.summit_held_seconds == expected.summit_held_seconds, 'summit_secs mismatch');
        assert(actual.stats.spirit == expected.stats.spirit, 'spirit mismatch');
        assert(actual.stats.luck == expected.stats.luck, 'luck mismatch');
        assert(actual.stats.specials == expected.stats.specials, 'specials mismatch');
        assert(actual.stats.wisdom == expected.stats.wisdom, 'wisdom mismatch');
        assert(actual.stats.diplomacy == expected.stats.diplomacy, 'diplomacy mismatch');
        assert(actual.rewards_earned == expected.rewards_earned, 'rewards_earned mismatch');
        assert(actual.rewards_claimed == expected.rewards_claimed, 'rewards_claimed mismatch');
        assert(actual.quest.captured_summit == expected.quest.captured_summit, 'captured_summit mismatch');
        assert(actual.quest.used_revival_potion == expected.quest.used_revival_potion, 'used_revival_potion mismatch');
        assert(actual.quest.used_attack_potion == expected.quest.used_attack_potion, 'used_attack_potion mismatch');
        assert(actual.quest.max_attack_streak == expected.quest.max_attack_streak, 'max_attack_streak mismatch');
    }

    fn assert_roundtrip(stats: LiveBeastStats) {
        let packed = PackableLiveStatsStorePacking::pack(stats);
        let u = PackableLiveStatsStorePacking::unpack(packed);
        assert_stats_equal(u, stats);
    }

    fn build_cross_layer_parity_stats() -> LiveBeastStats {
        build_stats(
            4242_u32,
            1337_u16,
            777_u16,
            12345_u16,
            9_u8,
            1735689600_u64,
            17_u8,
            3210_u16,
            654321_u32,
            88_u8,
            199_u8,
            1_u8,
            0_u8,
            1_u8,
            987654321_u32,
            123456789_u32,
            1_u8,
            0_u8,
            1_u8,
            1_u8,
        )
    }

    #[test]
    fn pack_matches_cross_layer_parity_vector() {
        let packed = PackableLiveStatsStorePacking::pack(build_cross_layer_parity_stats());
        assert(packed == CROSS_LAYER_PARITY_PACKED, 'parity packed mismatch');
    }

    #[test]
    fn unpack_matches_cross_layer_parity_vector() {
        let unpacked = PackableLiveStatsStorePacking::unpack(CROSS_LAYER_PARITY_PACKED);
        assert_stats_equal(unpacked, build_cross_layer_parity_stats());
    }

    // --- Zero values ---

    #[test]
    fn pack_unpack_zero_values() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        // Zero should pack to felt252 zero
        let packed = PackableLiveStatsStorePacking::pack(stats);
        assert(packed == 0, 'zero should pack to 0');
        assert_roundtrip(stats);
    }

    // --- True max values (2^N - 1 for each field) ---

    #[test]
    fn pack_unpack_true_max_values() {
        let stats = build_stats(
            0x1FFFF_u32, // token_id: 2^17 - 1 = 131071
            0xFFF_u16, // current_health: 2^12 - 1 = 4095
            0x7FF_u16, // bonus_health: 2^11 - 1 = 2047
            0x7FFF_u16, // bonus_xp: 2^15 - 1 = 32767
            0xF_u8, // attack_streak: 2^4 - 1 = 15
            0xFFFFFFFFFFFFFFFF_u64, // last_death_timestamp: 2^64 - 1
            0x3F_u8, // revival_count: 2^6 - 1 = 63
            0xFFF_u16, // extra_lives: 2^12 - 1 = 4095
            0x7FFFFF_u32, // summit_held_seconds: 2^23 - 1 = 8388607
            0xFF_u8, // spirit: 2^8 - 1 = 255
            0xFF_u8, // luck: 2^8 - 1 = 255
            1_u8, // specials: 1-bit max
            1_u8, // wisdom: 1-bit max
            1_u8, // diplomacy: 1-bit max
            0xFFFFFFFF_u32, // rewards_earned: 2^32 - 1
            0xFFFFFFFF_u32, // rewards_claimed: 2^32 - 1
            1_u8, // captured_summit: 1-bit max
            1_u8, // used_revival_potion: 1-bit max
            1_u8, // used_attack_potion: 1-bit max
            1_u8 // max_attack_streak: 1-bit max
        );
        assert_roundtrip(stats);
    }

    // --- Near-max values (2^N - 2) to test boundary behavior ---

    #[test]
    fn pack_unpack_near_max_values() {
        let stats = build_stats(
            131070_u32,
            4094_u16,
            2046_u16,
            32766_u16,
            14_u8,
            0xFFFFFFFFFFFFFFFE_u64,
            62_u8,
            4094_u16,
            8388606_u32,
            254_u8,
            254_u8,
            1_u8,
            1_u8,
            1_u8,
            0xFFFFFFFE_u32,
            0xFFFFFFFE_u32,
            1_u8,
            1_u8,
            1_u8,
            1_u8,
        );
        assert_roundtrip(stats);
    }

    // --- Mixed values (realistic gameplay scenario) ---

    #[test]
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
            1, // wisdom
            0, // diplomacy
            1000000_u32, // rewards_earned
            500000_u32, // rewards_claimed
            1, // captured_summit
            0, // used_revival_potion
            1, // used_attack_potion
            1 // max_attack_streak
        );
        assert_roundtrip(stats);
    }

    // --- Single field set, all others zero (isolation tests) ---

    #[test]
    fn pack_only_token_id() {
        let stats = build_stats(12345_u32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_current_health() {
        let stats = build_stats(0, 3000_u16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_bonus_health() {
        let stats = build_stats(0, 0, 1500_u16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_bonus_xp() {
        let stats = build_stats(0, 0, 0, 20000_u16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_attack_streak() {
        let stats = build_stats(0, 0, 0, 0, 15_u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_last_death_timestamp() {
        let stats = build_stats(0, 0, 0, 0, 0, 0xFFFFFFFFFFFFFFFF_u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_revival_count() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 63_u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_extra_lives() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 4000_u16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_summit_held_seconds() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 7654321_u32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_spirit() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 200_u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_luck() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 200_u8, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_specials() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_wisdom() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_diplomacy() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_rewards_earned() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 999999_u32, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_rewards_claimed() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 999999_u32, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_captured_summit() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_used_revival_potion() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_used_attack_potion() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_only_max_attack_streak() {
        let stats = build_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8);
        assert_roundtrip(stats);
    }

    // --- Value 1 in every field ---

    #[test]
    fn pack_all_ones() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
        assert_roundtrip(stats);
    }

    // --- Power-of-2 values (tests bit boundaries within fields) ---

    #[test]
    fn pack_power_of_two_values() {
        let stats = build_stats(
            65536_u32, // 2^16 (fits in 17 bits)
            2048_u16, // 2^11 (fits in 12 bits)
            1024_u16, // 2^10 (fits in 11 bits)
            16384_u16, // 2^14 (fits in 15 bits)
            8_u8, // 2^3 (fits in 4 bits)
            0x8000000000000000_u64, // 2^63 (fits in 64 bits)
            32_u8, // 2^5 (fits in 6 bits)
            2048_u16, // 2^11 (fits in 12 bits)
            4194304_u32, // 2^22 (fits in 23 bits)
            128_u8, // 2^7 (fits in 8 bits)
            128_u8, // 2^7 (fits in 8 bits)
            1_u8, // 2^0
            1_u8, // 2^0
            1_u8, // 2^0
            0x80000000_u32, // 2^31 (fits in 32 bits)
            0x80000000_u32, // 2^31 (fits in 32 bits)
            1_u8,
            1_u8,
            1_u8,
            1_u8,
        );
        assert_roundtrip(stats);
    }

    // --- Low half full, high half zero (tests u128 boundary) ---

    #[test]
    fn pack_low_half_full_high_zero() {
        let stats = build_stats(
            0, // token_id (high)
            0, // current_health (high)
            0, // bonus_health (high)
            0, // bonus_xp (high)
            0, // attack_streak (high)
            0xFFFFFFFFFFFFFFFF_u64, // last_death_timestamp (low) - max
            0, // revival_count (high)
            0, // extra_lives (high)
            0, // summit_held_seconds (high)
            0, // spirit (high)
            0, // luck (high)
            0, // specials (high)
            0, // wisdom (high)
            0, // diplomacy (high)
            0xFFFFFFFF_u32, // rewards_earned (low) - max
            0xFFFFFFFF_u32, // rewards_claimed (low) - max
            0, // captured_summit (high)
            0, // used_revival_potion (high)
            0, // used_attack_potion (high)
            0 // max_attack_streak (high)
        );
        assert_roundtrip(stats);
    }

    // --- High half full, low half zero (tests u128 boundary) ---

    #[test]
    fn pack_high_half_full_low_zero() {
        let stats = build_stats(
            0x1FFFF_u32, // token_id (high) - max
            0xFFF_u16, // current_health (high) - max
            0x7FF_u16, // bonus_health (high) - max
            0x7FFF_u16, // bonus_xp (high) - max
            0xF_u8, // attack_streak (high) - max
            0_u64, // last_death_timestamp (low) - zero
            0x3F_u8, // revival_count (high) - max
            0xFFF_u16, // extra_lives (high) - max
            0x7FFFFF_u32, // summit_held_seconds (high) - max
            0xFF_u8, // spirit (high) - max
            0xFF_u8, // luck (high) - max
            1_u8, // specials (high) - max
            1_u8, // wisdom (high) - max
            1_u8, // diplomacy (high) - max
            0_u32, // rewards_earned (low) - zero
            0_u32, // rewards_claimed (low) - zero
            1_u8, // captured_summit (high) - max
            1_u8, // used_revival_potion (high) - max
            1_u8, // used_attack_potion (high) - max
            1_u8 // max_attack_streak (high) - max
        );
        assert_roundtrip(stats);
    }

    // --- Alternating bit patterns (catches adjacency bleed) ---

    #[test]
    fn pack_alternating_max_zero() {
        let stats = build_stats(
            0x1FFFF_u32, // token_id: max
            0, // current_health: zero
            0x7FF_u16, // bonus_health: max
            0, // bonus_xp: zero
            0xF_u8, // attack_streak: max
            0, // last_death_timestamp: zero
            0x3F_u8, // revival_count: max
            0, // extra_lives: zero
            0x7FFFFF_u32, // summit_held_seconds: max
            0, // spirit: zero
            0xFF_u8, // luck: max
            0, // specials: zero
            1_u8, // wisdom: max
            0, // diplomacy: zero
            0xFFFFFFFF_u32, // rewards_earned: max
            0, // rewards_claimed: zero
            1_u8, // captured_summit: max
            0, // used_revival_potion: zero
            1_u8, // used_attack_potion: max
            0 // max_attack_streak: zero
        );
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_alternating_zero_max() {
        let stats = build_stats(
            0, // token_id: zero
            0xFFF_u16, // current_health: max
            0, // bonus_health: zero
            0x7FFF_u16, // bonus_xp: max
            0, // attack_streak: zero
            0xFFFFFFFFFFFFFFFF_u64, // last_death_timestamp: max
            0, // revival_count: zero
            0xFFF_u16, // extra_lives: max
            0, // summit_held_seconds: zero
            0xFF_u8, // spirit: max
            0, // luck: zero
            1_u8, // specials: max
            0, // wisdom: zero
            1_u8, // diplomacy: max
            0, // rewards_earned: zero
            0xFFFFFFFF_u32, // rewards_claimed: max
            0, // captured_summit: zero
            1_u8, // used_revival_potion: max
            0, // used_attack_potion: zero
            1_u8 // max_attack_streak: max
        );
        assert_roundtrip(stats);
    }

    // --- Realistic gameplay scenarios ---

    #[test]
    fn pack_fresh_beast() {
        // Beast just entered the game
        let stats = build_stats(
            42_u32, // token_id
            500_u16, // current_health: starting hp
            0, // bonus_health: none yet
            0, // bonus_xp: none yet
            0, // attack_streak: no attacks
            0, // last_death_timestamp: never died
            0, // revival_count: never revived
            3, // extra_lives: starting lives
            0, // summit_held_seconds: never held
            5, // spirit: base stat
            3, // luck: base stat
            0, // specials: not unlocked
            0, // wisdom: not unlocked
            0, // diplomacy: not unlocked
            0, // rewards_earned: none
            0, // rewards_claimed: none
            0, // captured_summit: not yet
            0, // used_revival_potion: not yet
            0, // used_attack_potion: not yet
            0 // max_attack_streak: zero
        );
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_veteran_beast() {
        // Beast that has been in many battles
        let stats = build_stats(
            99999_u32, // token_id
            3500_u16, // current_health: high hp
            800_u16, // bonus_health: earned bonus
            25000_u16, // bonus_xp: lots of xp
            12_u8, // attack_streak: on a roll
            1700000000_u64, // last_death_timestamp: recent death
            15_u8, // revival_count: died many times
            50_u16, // extra_lives: accumulated
            360000_u32, // summit_held_seconds: ~100 hours
            75_u8, // spirit: high stat
            80_u8, // luck: high stat
            1_u8, // specials: unlocked
            1_u8, // wisdom: unlocked
            1_u8, // diplomacy: unlocked
            5000000_u32, // rewards_earned: lots
            3000000_u32, // rewards_claimed: most claimed
            1_u8, // captured_summit: yes
            1_u8, // used_revival_potion: yes
            1_u8, // used_attack_potion: yes
            1_u8 // max_attack_streak: yes
        );
        assert_roundtrip(stats);
    }

    // --- Idempotency: double pack/unpack ---

    #[test]
    fn pack_unpack_idempotent() {
        let stats = build_stats(
            42_u32, 500, 200, 1000, 7, 1700000000, 3, 10, 3600, 50, 60, 1, 0, 1, 100000, 50000, 1, 0, 1, 0,
        );
        let packed1 = PackableLiveStatsStorePacking::pack(stats);
        let unpacked1 = PackableLiveStatsStorePacking::unpack(packed1);
        let packed2 = PackableLiveStatsStorePacking::pack(unpacked1);
        let unpacked2 = PackableLiveStatsStorePacking::unpack(packed2);
        // Both packed values must be identical
        assert(packed1 == packed2, 'packed not idempotent');
        // Both unpacked values must be identical
        assert(unpacked1.token_id == unpacked2.token_id, 'idempotent token_id');
        assert(unpacked1.current_health == unpacked2.current_health, 'idempotent health');
        assert(unpacked1.last_death_timestamp == unpacked2.last_death_timestamp, 'idempotent ts');
        assert(unpacked1.rewards_earned == unpacked2.rewards_earned, 'idempotent rewards');
        assert(unpacked1.quest.captured_summit == unpacked2.quest.captured_summit, 'idempotent q');
    }

    // --- Quest flag permutations (all 16 combinations of 4 booleans) ---

    #[test]
    fn pack_quest_permutation_0000() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_quest_permutation_0001() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_quest_permutation_0010() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_quest_permutation_0100() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_quest_permutation_1000() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_quest_permutation_1010() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_quest_permutation_0101() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_quest_permutation_1111() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1);
        assert_roundtrip(stats);
    }

    // --- Stats flag permutations (specials, wisdom, diplomacy - all 8 combos) ---

    #[test]
    fn pack_stats_flags_000() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 0, 0, 0, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_stats_flags_001() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 1, 0, 0, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_stats_flags_010() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 0, 1, 0, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_stats_flags_100() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 0, 0, 1, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_stats_flags_101() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 1, 0, 1, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_stats_flags_110() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 0, 1, 1, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_stats_flags_011() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 1, 1, 0, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_stats_flags_111() {
        let stats = build_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 1, 1, 1, 1, 1, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    // --- Timestamp edge cases ---

    #[test]
    fn pack_timestamp_one() {
        let stats = build_stats(0, 0, 0, 0, 0, 1_u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_timestamp_current_era() {
        // ~2024 timestamp
        let stats = build_stats(0, 0, 0, 0, 0, 1704067200_u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_timestamp_far_future() {
        // Year ~2500 timestamp
        let stats = build_stats(0, 0, 0, 0, 0, 16725225600_u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    // --- Rewards edge cases ---

    #[test]
    fn pack_rewards_earned_gt_claimed() {
        let stats = build_stats(1, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5000000_u32, 1000000_u32, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }

    #[test]
    fn pack_rewards_equal() {
        let stats = build_stats(1, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3000000_u32, 3000000_u32, 0, 0, 0, 0);
        assert_roundtrip(stats);
    }
}
