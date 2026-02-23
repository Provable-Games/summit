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
    // Exceeds current health (50), consumes 1 extra life, heals to 50, takes 10 = 40 HP
    let result = calculate_poison_damage(50, 2, 50, 0, 10, 6);
    assert!(result.damage == 60, "Damage should be 60");
    assert!(result.new_health == 40, "Should have 40 HP after one life used");
    assert!(result.new_extra_lives == 1, "Should have 1 life (one consumed crossing 0 HP)");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_uses_multiple_extra_lives() {
    // 150 damage on 50 health, 50 full health, 5 extra lives
    // Total pool = 50 + 5*50 = 300. Remaining = 300 - 150 = 150.
    // (150 - 1) / 50 = 2 extra lives. Health = 150 - 2*50 = 50.
    let result = calculate_poison_damage(50, 5, 50, 0, 10, 15);
    assert!(result.damage == 150, "Damage should be 150");
    assert!(result.new_extra_lives == 2, "Should have 2 lives left");
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
    // Total pool = 100 + 1*100 = 200. Remaining = 200 - 120 = 80.
    // (80 - 1) / 100 = 0 extra lives. Health = 80.
    let result = calculate_poison_damage(100, 1, 50, 50, 12, 10);
    assert!(result.damage == 120, "Damage should be 120");
    assert!(result.new_health == 80, "Should have 80 HP");
    assert!(result.new_extra_lives == 0, "Should have 0 lives (one consumed crossing 0 HP)");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_large_poison_stacks() {
    // 1000 poison * 1 second = 1000 damage
    // Total pool = 100 + 10*100 = 1100. Remaining = 1100 - 1000 = 100.
    // (100 - 1) / 100 = 0 extra lives. Health = 100.
    let result = calculate_poison_damage(100, 10, 50, 50, 1000, 1);
    assert!(result.damage == 1000, "Damage should be 1000");
    assert!(result.new_extra_lives == 0, "Should have 0 lives left");
    assert!(result.new_health == 100, "Should be at full health");
}

#[test]
#[available_gas(l2_gas: 300000)]
fn test_poison_extra_life_off_by_one_bug() {
    // Scenario 1: Report's example
    // current_health=50, extra_lives=1, full_health=100, damage=60
    // Damage exceeds current health by 10. Should consume 1 life, heal to 100, take 10 = 90 HP.
    // Correct: health=90, extra_lives=0 (one life consumed crossing 0 HP boundary)
    let result = calculate_poison_damage(50, 1, 50, 50, 10, 6);
    assert!(result.damage == 60, "S1: Damage should be 60");
    assert!(result.new_health == 90, "S1: Health should be 90");
    assert!(result.new_extra_lives == 0, "S1: Should have 0 extra lives (life consumed)");

    // Scenario 2: Repeated boundary crossing
    // current_health=50, extra_lives=2, full_health=50, damage=60
    // Damage exceeds current health by 10. Should consume 1 life, heal to 50, take 10 = 40 HP.
    // Correct: health=40, extra_lives=1 (one life consumed)
    let result2 = calculate_poison_damage(50, 2, 50, 0, 10, 6);
    assert!(result2.damage == 60, "S2: Damage should be 60");
    assert!(result2.new_health == 40, "S2: Health should be 40");
    assert!(result2.new_extra_lives == 1, "S2: Should have 1 extra life");

    // Scenario 3: Large damage across many lives
    // current_health=100, extra_lives=10, full_health=100, damage=1000
    // Total pool = 100 + 10*100 = 1100. Remaining = 1100 - 1000 = 100.
    // 100 remaining = exactly 1 full life bar, so 0 extra lives, health=100.
    // Correct: health=100, extra_lives=0
    let result3 = calculate_poison_damage(100, 10, 50, 50, 1000, 1);
    assert!(result3.damage == 1000, "S3: Damage should be 1000");
    assert!(result3.new_health == 100, "S3: Health should be 100");
    assert!(result3.new_extra_lives == 0, "S3: Should have 0 extra lives");
}

#[test]
#[available_gas(l2_gas: 120000)]
fn test_boundary_damage_equals_current_health_consumes_one_life() {
    // Boundary: damage == current_health with lives available.
    // Crossing exactly 0 HP should consume one life and restore to full health.
    let result = calculate_poison_damage(50, 2, 50, 50, 1, 50);
    assert!(result.damage == 50, "Damage should be 50");
    assert!(result.new_health == 100, "Should be restored to full health");
    assert!(result.new_extra_lives == 1, "Should consume exactly one extra life");
}

#[test]
#[available_gas(l2_gas: 120000)]
fn test_boundary_damage_equals_total_pool_minus_one_ends_at_one_hp_zero_lives() {
    // Boundary: damage == total_pool - 1.
    // total_pool = 50 + 2*50 = 150, damage = 149 => remaining = 1.
    // Expected: 1 HP and 0 extra lives.
    let result = calculate_poison_damage(50, 2, 50, 0, 1, 149);
    assert!(result.damage == 149, "Damage should be 149");
    assert!(result.new_health == 1, "Should be left at 1 HP");
    assert!(result.new_extra_lives == 0, "Should have 0 extra lives");
}

#[test]
#[available_gas(l2_gas: 120000)]
fn test_boundary_damage_equals_total_pool_clamps_to_one_hp_zero_lives() {
    // Boundary: damage == total_pool.
    // total_pool = 75 + 3*75 = 300, damage = 300.
    // Expected clamp path: never fully kill, leave 1 HP and 0 lives.
    let result = calculate_poison_damage(75, 3, 50, 25, 1, 300);
    assert!(result.damage == 300, "Damage should be 300");
    assert!(result.new_health == 1, "Should clamp to 1 HP");
    assert!(result.new_extra_lives == 0, "Should have 0 extra lives");
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
