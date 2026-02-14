use core::hash::HashStateTrait;
use core::num::traits::Sqrt;
use core::poseidon::PoseidonTrait;
use summit::constants::{BASE_REVIVAL_TIME_SECONDS, DIPLOMACY_COST, SPECIALS_COST, WISDOM_COST};

/// Calculate level from XP using square root
/// @param xp The experience points
/// @return The calculated level (minimum 1)
#[inline(always)]
pub fn get_level_from_xp(xp: u32) -> u16 {
    if xp == 0 {
        1
    } else {
        xp.sqrt()
    }
}

#[inline(always)]
pub fn get_bonus_levels(base_level: u16, bonus_xp: u16) -> u16 {
    let base: u32 = base_level.into();
    let total_xp = base * base + bonus_xp.into();
    let current_level = get_level_from_xp(total_xp);

    current_level - base_level
}

#[inline(always)]
pub fn level_up(base_level: u16, bonus_xp: u16, xp_gained: u16) -> bool {
    let base: u32 = base_level.into();
    let total_xp = base * base + bonus_xp.into();

    let previous_level = get_level_from_xp(total_xp - xp_gained.into());
    let level = get_level_from_xp(total_xp);
    level > previous_level
}

/// Check if beast can still gain XP based on max bonus levels
/// @param base_level The beast's base level from NFT
/// @param bonus_xp The beast's current bonus XP
/// @param max_bonus_levels Maximum bonus levels allowed
/// @return true if beast can still gain XP
#[inline(always)]
pub fn can_gain_xp(base_level: u16, bonus_xp: u16, max_bonus_levels: u16) -> bool {
    // Use u32 to prevent overflow: (65535 + 40)^2 fits in u32
    // Cache base_level conversion to avoid redundant conversions
    let base: u32 = base_level.into();
    let max_level: u32 = base + max_bonus_levels.into();
    bonus_xp.into() < (max_level * max_level) - (base * base)
}

/// Calculate XP gain from an attack
/// @param attack_streak Current attack streak (0-10)
/// @param beast_can_get_xp Whether the beast is eligible for XP
/// @return XP gained (0 if not eligible)
#[inline(always)]
pub fn calculate_xp_gain(attack_streak: u8, beast_can_get_xp: bool) -> u16 {
    if beast_can_get_xp {
        10 + attack_streak.into()
    } else {
        0
    }
}

/// Update attack streak after a battle
/// @param current_streak Current attack streak
/// @param last_death_timestamp When the beast last died
/// @param current_timestamp Current block timestamp
/// @param max_streak Maximum streak value (typically 10)
/// @return New attack streak value
#[inline(always)]
pub fn update_attack_streak(
    current_streak: u8, last_death_timestamp: u64, current_timestamp: u64, max_streak: u8,
) -> u8 {
    // Reset streak if 2x base revival time has passed since last death
    if last_death_timestamp + BASE_REVIVAL_TIME_SECONDS * 2 < current_timestamp {
        if max_streak > 0 {
            1
        } else {
            0
        }
    } else if current_streak < max_streak {
        current_streak + 1
    } else {
        current_streak
    }
}

/// Compare two beasts for leaderboard ranking
/// Primary: summit_held_seconds, Secondary: bonus_xp, Tertiary: last_death_timestamp
/// @return true if beast1 is stronger than beast2
#[inline(always)]
pub fn is_beast_stronger(
    beast1_summit_held_seconds: u32,
    beast1_bonus_xp: u16,
    beast1_last_death: u64,
    beast2_summit_held_seconds: u32,
    beast2_bonus_xp: u16,
    beast2_last_death: u64,
) -> bool {
    if beast1_summit_held_seconds != beast2_summit_held_seconds {
        return beast1_summit_held_seconds > beast2_summit_held_seconds;
    }
    if beast1_bonus_xp != beast2_bonus_xp {
        return beast1_bonus_xp > beast2_bonus_xp;
    }
    beast1_last_death > beast2_last_death
}

/// Generate hash for diplomacy grouping based on prefix and suffix
/// Optimized: Uses PoseidonTrait chaining instead of array allocation
/// @param prefix Beast's prefix special
/// @param suffix Beast's suffix special
/// @return Poseidon hash of the specials
#[inline(always)]
pub fn get_specials_hash(prefix: u8, suffix: u8) -> felt252 {
    let prefix_felt: felt252 = prefix.into();
    let suffix_felt: felt252 = suffix.into();
    PoseidonTrait::new().update(prefix_felt).update(suffix_felt).finalize()
}

/// Calculate total cost for stat upgrades
/// @param enable_specials Whether to unlock specials (one-time)
/// @param enable_wisdom Whether to unlock wisdom (one-time)
/// @param enable_diplomacy Whether to unlock diplomacy (one-time)
/// @param spirit_points Spirit points to add
/// @param luck_points Luck points to add
/// @return Total skull tokens required
pub fn calculate_upgrade_cost(
    enable_specials: bool, enable_wisdom: bool, enable_diplomacy: bool, spirit_points: u8, luck_points: u8,
) -> u16 {
    let mut cost: u16 = 0;

    if enable_specials {
        cost += SPECIALS_COST;
    }
    if enable_wisdom {
        cost += WISDOM_COST;
    }
    if enable_diplomacy {
        cost += DIPLOMACY_COST;
    }

    cost += spirit_points.into() + luck_points.into();
    cost
}
