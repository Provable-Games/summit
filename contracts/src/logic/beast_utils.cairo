use core::num::traits::Sqrt;
use core::poseidon::poseidon_hash_span;
use summit::constants::{BASE_REVIVAL_TIME_SECONDS, DIPLOMACY_COST, SPECIALS_COST, WISDOM_COST};

/// Calculate level from XP using square root
/// @param xp The experience points
/// @return The calculated level (minimum 1)
pub fn get_level_from_xp(xp: u32) -> u16 {
    if xp == 0 {
        1
    } else {
        xp.sqrt()
    }
}

/// Check if beast can still gain XP based on max bonus levels
/// @param base_level The beast's base level from NFT
/// @param bonus_xp The beast's current bonus XP
/// @param max_bonus_levels Maximum bonus levels allowed
/// @return true if beast can still gain XP
pub fn can_gain_xp(base_level: u16, bonus_xp: u16, max_bonus_levels: u16) -> bool {
    // Use u32 to prevent overflow: (65535 + 40)^2 fits in u32
    let base_xp: u32 = base_level.into() * base_level.into();
    let max_level: u32 = base_level.into() + max_bonus_levels.into();
    let max_xp: u32 = max_level * max_level;
    bonus_xp.into() < max_xp - base_xp
}

/// Calculate XP gain from an attack
/// @param attack_streak Current attack streak (0-10)
/// @param beast_can_get_xp Whether the beast is eligible for XP
/// @return XP gained (0 if not eligible)
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
/// Primary: blocks_held, Secondary: bonus_xp, Tertiary: last_death_timestamp
/// @return true if beast1 is stronger than beast2
pub fn is_beast_stronger(
    beast1_blocks_held: u32,
    beast1_bonus_xp: u16,
    beast1_last_death: u64,
    beast2_blocks_held: u32,
    beast2_bonus_xp: u16,
    beast2_last_death: u64,
) -> bool {
    if beast1_blocks_held != beast2_blocks_held {
        return beast1_blocks_held > beast2_blocks_held;
    }
    if beast1_bonus_xp != beast2_bonus_xp {
        return beast1_bonus_xp > beast2_bonus_xp;
    }
    beast1_last_death > beast2_last_death
}

/// Generate hash for diplomacy grouping based on prefix and suffix
/// @param prefix Beast's prefix special
/// @param suffix Beast's suffix special
/// @return Poseidon hash of the specials
pub fn get_specials_hash(prefix: u8, suffix: u8) -> felt252 {
    let mut hash_span = ArrayTrait::<felt252>::new();
    hash_span.append(prefix.into());
    hash_span.append(suffix.into());
    poseidon_hash_span(hash_span.span()).into()
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

#[cfg(test)]
mod tests {
    use super::{
        calculate_upgrade_cost, calculate_xp_gain, can_gain_xp, get_level_from_xp, get_specials_hash, is_beast_stronger,
        update_attack_streak,
    };

    #[test]
    #[available_gas(gas: 50000)]
    fn test_get_level_from_xp_zero() {
        assert!(get_level_from_xp(0) == 1, "Zero XP should return level 1");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_get_level_from_xp_perfect_squares() {
        assert!(get_level_from_xp(1) == 1, "1 XP should return level 1");
        assert!(get_level_from_xp(4) == 2, "4 XP should return level 2");
        assert!(get_level_from_xp(9) == 3, "9 XP should return level 3");
        assert!(get_level_from_xp(100) == 10, "100 XP should return level 10");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_get_level_from_xp_non_perfect_squares() {
        assert!(get_level_from_xp(5) == 2, "5 XP should return level 2");
        assert!(get_level_from_xp(10) == 3, "10 XP should return level 3");
        assert!(get_level_from_xp(99) == 9, "99 XP should return level 9");
    }

    #[test]
    #[available_gas(gas: 90000)]
    fn test_can_gain_xp_within_limit() {
        // base_level=10, max_bonus=40 => max_xp=(50)^2=2500, base_xp=100
        // max_bonus_xp = 2500-100 = 2400
        assert!(can_gain_xp(10, 0, 40), "Should gain XP with 0 bonus");
        assert!(can_gain_xp(10, 2399, 40), "Should gain XP below limit");
    }

    #[test]
    #[available_gas(gas: 90000)]
    fn test_can_gain_xp_at_limit() {
        // base_level=10, max_bonus=40 => max_bonus_xp = 2400
        assert!(!can_gain_xp(10, 2400, 40), "Should not gain XP at limit");
        assert!(!can_gain_xp(10, 2500, 40), "Should not gain XP above limit");
    }

    #[test]
    #[available_gas(gas: 65000)]
    fn test_calculate_xp_gain_eligible() {
        assert!(calculate_xp_gain(0, true) == 10, "Base XP should be 10");
        assert!(calculate_xp_gain(5, true) == 15, "XP with streak 5 should be 15");
        assert!(calculate_xp_gain(10, true) == 20, "XP with max streak should be 20");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_calculate_xp_gain_not_eligible() {
        assert!(calculate_xp_gain(0, false) == 0, "No XP if not eligible");
        assert!(calculate_xp_gain(10, false) == 0, "No XP if not eligible even with streak");
    }

    #[test]
    #[available_gas(gas: 110000)]
    fn test_update_attack_streak_increment() {
        // Recent death, streak should increment
        let current_time = 1000000;
        let last_death = current_time - 1000; // Very recent

        assert!(update_attack_streak(0, last_death, current_time, 10) == 1, "Should increment from 0");
        assert!(update_attack_streak(5, last_death, current_time, 10) == 6, "Should increment from 5");
        assert!(update_attack_streak(9, last_death, current_time, 10) == 10, "Should increment to max");
    }

    #[test]
    #[available_gas(gas: 70000)]
    fn test_update_attack_streak_at_max() {
        let current_time = 1000000;
        let last_death = current_time - 1000;

        assert!(update_attack_streak(10, last_death, current_time, 10) == 10, "Should stay at max");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_update_attack_streak_reset() {
        // Old death (more than 2x revival time ago)
        let current_time: u64 = 1000000;
        let revival_time: u64 = 86400; // 24 hours
        let last_death = current_time - (revival_time * 2) - 1; // Just past reset threshold

        assert!(update_attack_streak(10, last_death, current_time, 10) == 1, "Should reset to 1");
        assert!(update_attack_streak(5, last_death, current_time, 10) == 1, "Should reset to 1");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_is_beast_stronger_by_blocks() {
        assert!(is_beast_stronger(100, 50, 1000, 99, 100, 2000), "More blocks should win");
        assert!(!is_beast_stronger(99, 100, 2000, 100, 50, 1000), "Fewer blocks should lose");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_is_beast_stronger_by_xp() {
        // Same blocks, compare by XP
        assert!(is_beast_stronger(100, 60, 1000, 100, 50, 2000), "More XP should win");
        assert!(!is_beast_stronger(100, 50, 2000, 100, 60, 1000), "Less XP should lose");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_is_beast_stronger_by_death_timestamp() {
        // Same blocks and XP, compare by death timestamp
        assert!(is_beast_stronger(100, 50, 2000, 100, 50, 1000), "Later death should win");
        assert!(!is_beast_stronger(100, 50, 1000, 100, 50, 2000), "Earlier death should lose");
    }

    #[test]
    #[available_gas(gas: 90000)]
    fn test_get_specials_hash_deterministic() {
        let hash1 = get_specials_hash(5, 10);
        let hash2 = get_specials_hash(5, 10);
        assert!(hash1 == hash2, "Same inputs should produce same hash");
    }

    #[test]
    #[available_gas(gas: 120000)]
    fn test_get_specials_hash_different_inputs() {
        let hash1 = get_specials_hash(5, 10);
        let hash2 = get_specials_hash(10, 5);
        let hash3 = get_specials_hash(5, 11);
        assert!(hash1 != hash2, "Different order should produce different hash");
        assert!(hash1 != hash3, "Different suffix should produce different hash");
    }

    #[test]
    #[available_gas(gas: 80000)]
    fn test_calculate_upgrade_cost_all_unlocks() {
        // 10 + 20 + 15 = 45
        let cost = calculate_upgrade_cost(true, true, true, 0, 0);
        assert!(cost == 45, "All unlocks should cost 45");
    }

    #[test]
    #[available_gas(gas: 80000)]
    fn test_calculate_upgrade_cost_points_only() {
        let cost = calculate_upgrade_cost(false, false, false, 10, 5);
        assert!(cost == 15, "10 spirit + 5 luck should cost 15");
    }

    #[test]
    #[available_gas(gas: 80000)]
    fn test_calculate_upgrade_cost_mixed() {
        // specials(10) + spirit(3) + luck(2) = 15
        let cost = calculate_upgrade_cost(true, false, false, 3, 2);
        assert!(cost == 15, "Specials + 5 points should cost 15");
    }

    #[test]
    #[available_gas(gas: 80000)]
    fn test_calculate_upgrade_cost_zero() {
        let cost = calculate_upgrade_cost(false, false, false, 0, 0);
        assert!(cost == 0, "No upgrades should cost 0");
    }
}
