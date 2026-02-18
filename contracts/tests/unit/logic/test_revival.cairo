use summit::constants::{BASE_REVIVAL_TIME_SECONDS, DAY_SECONDS};
use summit::logic::revival::{calculate_revival_potions, increment_revival_count, is_killed_recently};

#[test]
#[available_gas(l2_gas: 70000)]
fn test_revival_not_needed_after_full_time() {
    let current = BASE_REVIVAL_TIME_SECONDS + 1000;
    let last_death = 0;
    let potions = calculate_revival_potions(last_death, current, 0, 0);
    assert!(potions == 0, "No potions needed after full revival time");
}

#[test]
#[available_gas(l2_gas: 65000)]
fn test_revival_not_needed_exactly_at_time() {
    let current = BASE_REVIVAL_TIME_SECONDS;
    let last_death = 0;
    let potions = calculate_revival_potions(last_death, current, 0, 0);
    assert!(potions == 0, "No potions needed at exactly revival time");
}

#[test]
#[available_gas(l2_gas: 70000)]
fn test_revival_needed_before_time() {
    let current = BASE_REVIVAL_TIME_SECONDS - 1;
    let last_death = 0;
    let potions = calculate_revival_potions(last_death, current, 0, 0);
    assert!(potions == 1, "1 potion needed for first revival");
}

#[test]
#[available_gas(l2_gas: 150000)]
fn test_revival_cost_increases() {
    let current = BASE_REVIVAL_TIME_SECONDS - 1;
    let last_death = 0;

    assert!(calculate_revival_potions(last_death, current, 0, 0) == 1, "First revival costs 1");
    assert!(calculate_revival_potions(last_death, current, 1, 0) == 2, "Second revival costs 2");
    assert!(calculate_revival_potions(last_death, current, 5, 0) == 6, "Sixth revival costs 6");
    assert!(calculate_revival_potions(last_death, current, 30, 0) == 31, "Max revival costs 31");
}

#[test]
#[available_gas(l2_gas: 70000)]
fn test_spirit_reduction_removes_need() {
    let current = BASE_REVIVAL_TIME_SECONDS - 1000;
    let last_death = 0;
    // Spirit reduces revival time by enough to not need potions
    let spirit_reduction = 2000; // More than the 1000 seconds short

    let potions = calculate_revival_potions(last_death, current, 0, spirit_reduction);
    assert!(potions == 0, "Spirit reduction should remove potion need");
}

#[test]
#[available_gas(l2_gas: 65000)]
fn test_spirit_reduction_partial() {
    let current: u64 = 10000;
    let last_death: u64 = 0;
    // Spirit reduces some but not enough
    let spirit_reduction: u64 = 1000;

    // Time since death: 10000
    // Base revival time: 86400
    // After reduction: 85400
    // Still need potions since 10000 < 85400
    let potions = calculate_revival_potions(last_death, current, 0, spirit_reduction);
    assert!(potions == 1, "Should still need potions with partial spirit reduction");
}

#[test]
#[available_gas(l2_gas: 70000)]
fn test_spirit_reduction_exceeds_base() {
    let current: u64 = 100;
    let last_death: u64 = 0;
    // Spirit reduction exceeds base revival time
    let spirit_reduction = BASE_REVIVAL_TIME_SECONDS + 1000;

    let potions = calculate_revival_potions(last_death, current, 0, spirit_reduction);
    assert!(potions == 0, "Should not need potions if spirit exceeds base time");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_is_killed_recently_true() {
    let current: u64 = 100000;
    let last_killed = current - DAY_SECONDS + 1; // Just within cooldown

    assert!(is_killed_recently(last_killed, current, DAY_SECONDS), "Should be on cooldown");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_is_killed_recently_false() {
    let current: u64 = 100000;
    let last_killed = current - DAY_SECONDS - 1; // Just past cooldown

    assert!(!is_killed_recently(last_killed, current, DAY_SECONDS), "Should not be on cooldown");
}

#[test]
#[available_gas(l2_gas: 55000)]
fn test_is_killed_recently_exactly_at_boundary() {
    let current: u64 = 100000;
    let last_killed = current - DAY_SECONDS; // Exactly at boundary

    assert!(!is_killed_recently(last_killed, current, DAY_SECONDS), "Should not be on cooldown at exact boundary");
}

#[test]
#[available_gas(l2_gas: 70000)]
fn test_increment_revival_count_normal() {
    assert!(increment_revival_count(0, 31) == 1, "0 -> 1");
    assert!(increment_revival_count(15, 31) == 16, "15 -> 16");
    assert!(increment_revival_count(30, 31) == 31, "30 -> 31");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_increment_revival_count_at_max() {
    assert!(increment_revival_count(31, 31) == 31, "Should stay at max");
    assert!(increment_revival_count(31, 31) == 31, "Should stay at max (retry)");
}
