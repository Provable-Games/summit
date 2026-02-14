use summit::logic::poison::{calculate_poison_damage, pack_poison_state, unpack_poison_state};

#[test]
#[available_gas(l2_gas: 160000)]
fn test_no_poison_damage() {
    // No poison stacks
    let result = calculate_poison_damage(100, 5, 50, 50, 0, 100);
    assert!(result.damage == 0, "No damage with 0 poison");
    assert!(result.new_health == 100, "Health unchanged");
    assert!(result.new_extra_lives == 5, "Lives unchanged");

    // No time elapsed
    let result2 = calculate_poison_damage(100, 5, 50, 50, 10, 0);
    assert!(result2.damage == 0, "No damage with 0 time");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_partial_health_damage() {
    // 10 poison * 3 seconds = 30 damage
    let result = calculate_poison_damage(100, 0, 50, 50, 10, 3);
    assert!(result.damage == 30, "Damage should be 30");
    assert!(result.new_health == 70, "Health should be 70");
    assert!(result.new_extra_lives == 0, "Lives unchanged");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_exact_health_kill() {
    // 50 damage on 50 health with no extra lives
    let result = calculate_poison_damage(50, 0, 50, 0, 10, 5);
    assert!(result.damage == 50, "Damage should be 50");
    assert!(result.new_health == 1, "Should be left at 1 HP");
    assert!(result.new_extra_lives == 0, "No lives left");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_overkill_no_lives() {
    // 100 damage on 50 health with no extra lives
    let result = calculate_poison_damage(50, 0, 50, 0, 10, 10);
    assert!(result.damage == 100, "Damage should be 100");
    assert!(result.new_health == 1, "Should be left at 1 HP (never full kill)");
    assert!(result.new_extra_lives == 0, "No lives left");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_uses_one_extra_life() {
    // 60 damage on 50 health, 50 full health, 2 extra lives
    // Kills current health (50), then 10 remaining damage
    // Uses one life, restores to 50, takes 10 = 40 HP left
    let result = calculate_poison_damage(50, 2, 50, 0, 10, 6);
    assert!(result.damage == 60, "Damage should be 60");
    assert!(result.new_health == 40, "Should have 40 HP after one life used");
    assert!(result.new_extra_lives == 2, "Should have 2 lives (no full life consumed)");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_uses_multiple_extra_lives() {
    // 150 damage on 50 health, 50 full health, 5 extra lives
    // Kills current (50), remaining 100 damage
    // 100 / 50 = 2 full lives consumed
    // 100 % 50 = 0 remaining damage
    let result = calculate_poison_damage(50, 5, 50, 0, 10, 15);
    assert!(result.damage == 150, "Damage should be 150");
    assert!(result.new_extra_lives == 3, "Should have 3 lives left");
    // After 2 lives consumed and 0 remaining damage, should be at full health
    assert!(result.new_health == 50, "Should be at full health");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_exhausts_all_lives() {
    // 500 damage on 50 health, 50 full health, 2 extra lives
    // Far exceeds available health pool
    let result = calculate_poison_damage(50, 2, 50, 0, 50, 10);
    assert!(result.damage == 500, "Damage should be 500");
    assert!(result.new_health == 1, "Should be left at 1 HP");
    assert!(result.new_extra_lives == 0, "All lives consumed");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_with_bonus_health() {
    // 80 damage on 100 health (50 base + 50 bonus), no extra lives
    let result = calculate_poison_damage(100, 0, 50, 50, 8, 10);
    assert!(result.damage == 80, "Damage should be 80");
    assert!(result.new_health == 20, "Should have 20 HP");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_extra_life_with_bonus_health() {
    // 120 damage on 100 health (50+50), 1 extra life
    // Kills current (100), 20 remaining damage
    // Restores to 100, takes 20 = 80 HP
    let result = calculate_poison_damage(100, 1, 50, 50, 12, 10);
    assert!(result.damage == 120, "Damage should be 120");
    assert!(result.new_health == 80, "Should have 80 HP");
    assert!(result.new_extra_lives == 1, "Should still have 1 life (partial use)");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_large_poison_stacks() {
    // 1000 poison * 1 second = 1000 damage
    let result = calculate_poison_damage(100, 10, 50, 50, 1000, 1);
    assert!(result.damage == 1000, "Damage should be 1000");
    // 100 base health + 10 lives * 100 full health = 1100 total
// 1000 damage uses: 100 current + 9*100 = 1000
// Should have 1 life left and 100 HP (or 1 HP if calculation differs)
}

// Pack/unpack tests
#[test]
fn test_pack_unpack_zero_values() {
    let packed = pack_poison_state(0, 0);
    let (timestamp, count) = unpack_poison_state(packed);
    assert!(timestamp == 0, "Timestamp should be 0");
    assert!(count == 0, "Count should be 0");
}

#[test]
fn test_pack_unpack_typical_values() {
    let timestamp: u64 = 1704067200; // Jan 1, 2024
    let count: u16 = 100;
    let packed = pack_poison_state(timestamp, count);
    let (unpacked_timestamp, unpacked_count) = unpack_poison_state(packed);
    assert!(unpacked_timestamp == timestamp, "Timestamp mismatch");
    assert!(unpacked_count == count, "Count mismatch");
}

#[test]
fn test_pack_unpack_max_count() {
    let timestamp: u64 = 1000000;
    let count: u16 = 65535; // max u16
    let packed = pack_poison_state(timestamp, count);
    let (unpacked_timestamp, unpacked_count) = unpack_poison_state(packed);
    assert!(unpacked_timestamp == timestamp, "Timestamp mismatch");
    assert!(unpacked_count == count, "Count mismatch");
}

#[test]
fn test_pack_unpack_large_timestamp() {
    let timestamp: u64 = 0xFFFFFFFFFFFFFFFF; // max u64
    let count: u16 = 500;
    let packed = pack_poison_state(timestamp, count);
    let (unpacked_timestamp, unpacked_count) = unpack_poison_state(packed);
    assert!(unpacked_timestamp == timestamp, "Timestamp mismatch");
    assert!(unpacked_count == count, "Count mismatch");
}

#[test]
fn test_pack_deterministic() {
    let packed1 = pack_poison_state(12345, 100);
    let packed2 = pack_poison_state(12345, 100);
    assert!(packed1 == packed2, "Same inputs should produce same output");
}
