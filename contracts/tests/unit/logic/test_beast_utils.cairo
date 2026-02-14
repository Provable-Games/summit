use summit::logic::beast_utils::{
    calculate_upgrade_cost, calculate_xp_gain, can_gain_xp, get_level_from_xp, get_specials_hash, is_beast_stronger,
    update_attack_streak,
};

#[test]
#[available_gas(l2_gas: 50000)]
fn test_get_level_from_xp_zero() {
    assert!(get_level_from_xp(0) == 1, "Zero XP should return level 1");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_get_level_from_xp_perfect_squares() {
    assert!(get_level_from_xp(1) == 1, "1 XP should return level 1");
    assert!(get_level_from_xp(4) == 2, "4 XP should return level 2");
    assert!(get_level_from_xp(9) == 3, "9 XP should return level 3");
    assert!(get_level_from_xp(100) == 10, "100 XP should return level 10");
}

#[test]
#[available_gas(l2_gas: 55000)]
fn test_get_level_from_xp_non_perfect_squares() {
    assert!(get_level_from_xp(5) == 2, "5 XP should return level 2");
    assert!(get_level_from_xp(10) == 3, "10 XP should return level 3");
    assert!(get_level_from_xp(99) == 9, "99 XP should return level 9");
}

#[test]
#[available_gas(l2_gas: 90000)]
fn test_can_gain_xp_within_limit() {
    // base_level=10, max_bonus=40 => max_xp=(50)^2=2500, base_xp=100
    // max_bonus_xp = 2500-100 = 2400
    assert!(can_gain_xp(10, 0, 40), "Should gain XP with 0 bonus");
    assert!(can_gain_xp(10, 2399, 40), "Should gain XP below limit");
}

#[test]
#[available_gas(l2_gas: 90000)]
fn test_can_gain_xp_at_limit() {
    // base_level=10, max_bonus=40 => max_bonus_xp = 2400
    assert!(!can_gain_xp(10, 2400, 40), "Should not gain XP at limit");
    assert!(!can_gain_xp(10, 2500, 40), "Should not gain XP above limit");
}

#[test]
#[available_gas(l2_gas: 65000)]
fn test_calculate_xp_gain_eligible() {
    assert!(calculate_xp_gain(0, true) == 10, "Base XP should be 10");
    assert!(calculate_xp_gain(5, true) == 15, "XP with streak 5 should be 15");
    assert!(calculate_xp_gain(10, true) == 20, "XP with max streak should be 20");
}

#[test]
#[available_gas(l2_gas: 55000)]
fn test_calculate_xp_gain_not_eligible() {
    assert!(calculate_xp_gain(0, false) == 0, "No XP if not eligible");
    assert!(calculate_xp_gain(10, false) == 0, "No XP if not eligible even with streak");
}

#[test]
#[available_gas(l2_gas: 110000)]
fn test_update_attack_streak_increment() {
    // Recent death, streak should increment
    let current_time = 1000000;
    let last_death = current_time - 1000; // Very recent

    assert!(update_attack_streak(0, last_death, current_time, 10) == 1, "Should increment from 0");
    assert!(update_attack_streak(5, last_death, current_time, 10) == 6, "Should increment from 5");
    assert!(update_attack_streak(9, last_death, current_time, 10) == 10, "Should increment to max");
}

#[test]
#[available_gas(l2_gas: 70000)]
fn test_update_attack_streak_at_max() {
    let current_time = 1000000;
    let last_death = current_time - 1000;

    assert!(update_attack_streak(10, last_death, current_time, 10) == 10, "Should stay at max");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_update_attack_streak_reset() {
    // Old death (more than 2x revival time ago)
    let current_time: u64 = 1000000;
    let revival_time: u64 = 86400; // 24 hours
    let last_death = current_time - (revival_time * 2) - 1; // Just past reset threshold

    assert!(update_attack_streak(10, last_death, current_time, 10) == 1, "Should reset to 1");
    assert!(update_attack_streak(5, last_death, current_time, 10) == 1, "Should reset to 1");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_is_beast_stronger_by_blocks() {
    assert!(is_beast_stronger(100, 50, 1000, 99, 100, 2000), "More blocks should win");
    assert!(!is_beast_stronger(99, 100, 2000, 100, 50, 1000), "Fewer blocks should lose");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_is_beast_stronger_by_xp() {
    // Same blocks, compare by XP
    assert!(is_beast_stronger(100, 60, 1000, 100, 50, 2000), "More XP should win");
    assert!(!is_beast_stronger(100, 50, 2000, 100, 60, 1000), "Less XP should lose");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_is_beast_stronger_by_death_timestamp() {
    // Same blocks and XP, compare by death timestamp
    assert!(is_beast_stronger(100, 50, 2000, 100, 50, 1000), "Later death should win");
    assert!(!is_beast_stronger(100, 50, 1000, 100, 50, 2000), "Earlier death should lose");
}

#[test]
#[available_gas(l2_gas: 90000)]
fn test_get_specials_hash_deterministic() {
    let hash1 = get_specials_hash(5, 10);
    let hash2 = get_specials_hash(5, 10);
    assert!(hash1 == hash2, "Same inputs should produce same hash");
}

#[test]
#[available_gas(l2_gas: 120000)]
fn test_get_specials_hash_different_inputs() {
    let hash1 = get_specials_hash(5, 10);
    let hash2 = get_specials_hash(10, 5);
    let hash3 = get_specials_hash(5, 11);
    assert!(hash1 != hash2, "Different order should produce different hash");
    assert!(hash1 != hash3, "Different suffix should produce different hash");
}

#[test]
#[available_gas(l2_gas: 80000)]
fn test_calculate_upgrade_cost_all_unlocks() {
    // 10 + 20 + 15 = 45
    let cost = calculate_upgrade_cost(true, true, true, 0, 0);
    assert!(cost == 45, "All unlocks should cost 45");
}

#[test]
#[available_gas(l2_gas: 80000)]
fn test_calculate_upgrade_cost_points_only() {
    let cost = calculate_upgrade_cost(false, false, false, 10, 5);
    assert!(cost == 15, "10 spirit + 5 luck should cost 15");
}

#[test]
#[available_gas(l2_gas: 80000)]
fn test_calculate_upgrade_cost_mixed() {
    // specials(10) + spirit(3) + luck(2) = 15
    let cost = calculate_upgrade_cost(true, false, false, 3, 2);
    assert!(cost == 15, "Specials + 5 points should cost 15");
}

#[test]
#[available_gas(l2_gas: 80000)]
fn test_calculate_upgrade_cost_zero() {
    let cost = calculate_upgrade_cost(false, false, false, 0, 0);
    assert!(cost == 0, "No upgrades should cost 0");
}
