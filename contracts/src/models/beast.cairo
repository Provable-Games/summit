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
