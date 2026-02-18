use summit::logic::combat::{apply_damage, build_combat_spec, get_battle_randomness, use_extra_life};

#[test]
#[available_gas(l2_gas: 50000)]
fn test_apply_damage_partial() {
    assert!(apply_damage(100, 30) == 70, "100 - 30 should equal 70");
}

#[test]
#[available_gas(l2_gas: 50000)]
fn test_apply_damage_exact_kill() {
    assert!(apply_damage(100, 100) == 0, "100 - 100 should equal 0");
}

#[test]
#[available_gas(l2_gas: 50000)]
fn test_apply_damage_overkill() {
    assert!(apply_damage(50, 100) == 0, "Overkill should floor at 0");
}

#[test]
#[available_gas(l2_gas: 50000)]
fn test_apply_damage_zero() {
    assert!(apply_damage(100, 0) == 100, "0 damage should not change health");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_use_extra_life_triggers() {
    let (new_health, new_lives) = use_extra_life(0, 3, 50, 10);
    assert!(new_health == 60, "Should restore to full health (50 + 10)");
    assert!(new_lives == 2, "Should consume one extra life");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_use_extra_life_no_lives_left() {
    let (new_health, new_lives) = use_extra_life(0, 0, 50, 10);
    assert!(new_health == 0, "Should stay dead with no lives");
    assert!(new_lives == 0, "Should have no lives");
}

#[test]
#[available_gas(l2_gas: 60000)]
fn test_use_extra_life_not_dead() {
    let (new_health, new_lives) = use_extra_life(50, 3, 50, 10);
    assert!(new_health == 50, "Should not use life if not dead");
    assert!(new_lives == 3, "Should not consume life if not dead");
}

#[test]
#[available_gas(l2_gas: 150000)]
fn test_build_combat_spec_with_specials() {
    let spec = build_combat_spec(1, 10, 5, 3, 0, true);
    assert!(spec.specials.special2 == 5, "Should include prefix");
    assert!(spec.specials.special3 == 3, "Should include suffix");
}

#[test]
#[available_gas(l2_gas: 150000)]
fn test_build_combat_spec_without_specials() {
    let spec = build_combat_spec(1, 10, 5, 3, 0, false);
    assert!(spec.specials.special2 == 0, "Should not include prefix");
    assert!(spec.specials.special3 == 0, "Should not include suffix");
}

#[test]
#[available_gas(l2_gas: 250000)]
fn test_build_combat_spec_level_calculation() {
    // base_level=10, bonus_xp=0 => xp=100 => level=10
    let spec1 = build_combat_spec(1, 10, 0, 0, 0, false);
    assert!(spec1.level == 10, "Level should be 10 with 100 XP");

    // base_level=10, bonus_xp=21 => xp=121 => level=11
    let spec2 = build_combat_spec(1, 10, 0, 0, 21, false);
    assert!(spec2.level == 11, "Level should be 11 with 121 XP");
}

#[test]
#[available_gas(l2_gas: 100000)]
fn test_get_battle_randomness_no_seed() {
    let (a, b, c, d) = get_battle_randomness(1, 0, 0, 0);
    assert!(a == 0 && b == 0 && c == 0 && d == 0, "Should return zeros with no seed");
}

#[test]
#[available_gas(l2_gas: 220000)]
fn test_get_battle_randomness_deterministic() {
    let r1 = get_battle_randomness(1, 12345, 1000, 0);
    let r2 = get_battle_randomness(1, 12345, 1000, 0);
    assert!(r1 == r2, "Same inputs should produce same randomness");
}

#[test]
#[available_gas(l2_gas: 220000)]
fn test_get_battle_randomness_different_counter() {
    let r1 = get_battle_randomness(1, 12345, 1000, 0);
    let r2 = get_battle_randomness(1, 12345, 1000, 1);
    assert!(r1 != r2, "Different counters should produce different randomness");
}
