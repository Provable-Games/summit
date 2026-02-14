use summit::logic::quest::{calculate_quest_rewards, pack_quest_rewards_claimed, unpack_quest_rewards_claimed};
use crate::helpers::beast_builder::create_beast_for_quest;

// ==================== calculate_quest_rewards tests ====================

#[test]
fn test_quest_rewards_zero_for_fresh_beast() {
    let beast = create_beast_for_quest(10, 0, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 0, "Fresh beast should have 0 rewards");
}

#[test]
fn test_quest_rewards_max_total_is_95() {
    // All quests completed with max bonus levels (10+)
    // base_level=10, bonus_xp=300 gives 10 bonus levels (sqrt(400)-10=20-10=10)
    let beast = create_beast_for_quest(
        10, // level
        300, // bonus_xp for 10 bonus levels
        10, // summit held 10+ seconds
        1, // captured summit
        1, // used revival potion
        1, // used attack potion
        1 // max attack streak
    );
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 10 (revival potion) + 10 (attack potion) + 30 (10+ bonus levels)
    // + 10 (captured summit) + 20 (held 10+ seconds) + 10 (max attack streak) = 95
    assert!(rewards == 95, "Max rewards should be 95");
}

#[test]
fn test_quest_rewards_has_bonus_xp() {
    let beast = create_beast_for_quest(10, 1, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 5, "Having bonus XP should give 5 rewards");
}

#[test]
fn test_quest_rewards_used_revival_potion() {
    let beast = create_beast_for_quest(10, 0, 0, 0, 1, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 10, "Using revival potion should give 10 rewards");
}

#[test]
fn test_quest_rewards_used_attack_potion() {
    let beast = create_beast_for_quest(10, 0, 0, 0, 0, 1, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 10, "Using attack potion should give 10 rewards");
}

#[test]
fn test_quest_rewards_captured_summit() {
    let beast = create_beast_for_quest(10, 0, 0, 1, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 10, "Capturing summit should give 10 rewards");
}

#[test]
fn test_quest_rewards_held_summit_10_seconds() {
    let beast = create_beast_for_quest(10, 0, 10, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 20, "Holding summit 10+ seconds should give 20 rewards");
}

#[test]
fn test_quest_rewards_held_summit_9_seconds() {
    let beast = create_beast_for_quest(10, 0, 9, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 0, "Holding summit 9 seconds should give 0 rewards");
}

#[test]
fn test_quest_rewards_max_attack_streak() {
    let beast = create_beast_for_quest(10, 0, 0, 0, 0, 0, 1);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 10, "Max attack streak should give 10 rewards");
}

// ==================== Bonus level reward thresholds ====================

#[test]
fn test_quest_rewards_bonus_levels_zero() {
    // base_level=10, bonus_xp=0 gives 0 bonus levels
    let beast = create_beast_for_quest(10, 0, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 0, "0 bonus levels should give 0 rewards");
}

#[test]
fn test_quest_rewards_bonus_levels_1() {
    // base_level=10, base_xp=100, for level 11 need xp=121, bonus_xp=21
    let beast = create_beast_for_quest(10, 21, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 4 (1 bonus level) = 9
    assert!(rewards == 9, "1 bonus level should give 9 rewards");
}

#[test]
fn test_quest_rewards_bonus_levels_2() {
    // base_level=10, for level 12 need xp=144, bonus_xp=44
    let beast = create_beast_for_quest(10, 44, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 4 (2 bonus levels) = 9
    assert!(rewards == 9, "2 bonus levels should give 9 rewards");
}

#[test]
fn test_quest_rewards_bonus_levels_3() {
    // base_level=10, for level 13 need xp=169, bonus_xp=69
    let beast = create_beast_for_quest(10, 69, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 10 (3 bonus levels) = 15
    assert!(rewards == 15, "3 bonus levels should give 15 rewards");
}

#[test]
fn test_quest_rewards_bonus_levels_4() {
    // base_level=10, for level 14 need xp=196, bonus_xp=96
    let beast = create_beast_for_quest(10, 96, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 10 (4 bonus levels) = 15
    assert!(rewards == 15, "4 bonus levels should give 15 rewards");
}

#[test]
fn test_quest_rewards_bonus_levels_5() {
    // base_level=10, for level 15 need xp=225, bonus_xp=125
    let beast = create_beast_for_quest(10, 125, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 18 (5 bonus levels) = 23
    assert!(rewards == 23, "5 bonus levels should give 23 rewards");
}

#[test]
fn test_quest_rewards_bonus_levels_9() {
    // base_level=10, for level 19 need xp=361, bonus_xp=261
    let beast = create_beast_for_quest(10, 261, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 18 (9 bonus levels) = 23
    assert!(rewards == 23, "9 bonus levels should give 23 rewards");
}

#[test]
fn test_quest_rewards_bonus_levels_10() {
    // base_level=10, for level 20 need xp=400, bonus_xp=300
    let beast = create_beast_for_quest(10, 300, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 30 (10 bonus levels) = 35
    assert!(rewards == 35, "10 bonus levels should give 35 rewards");
}

#[test]
fn test_quest_rewards_bonus_levels_above_10() {
    // base_level=10, for level 25 need xp=625, bonus_xp=525
    let beast = create_beast_for_quest(10, 525, 0, 0, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp > 0) + 30 (15 bonus levels capped at 30) = 35
    assert!(rewards == 35, "15 bonus levels should still give 35 rewards");
}

// ==================== Combined rewards tests ====================

#[test]
fn test_quest_rewards_multiple_quests() {
    // Has bonus_xp + captured summit + used attack potion
    let beast = create_beast_for_quest(10, 1, 0, 1, 0, 1, 0);
    let rewards = calculate_quest_rewards(beast);
    // 5 (bonus_xp) + 10 (captured summit) + 10 (attack potion) = 25
    assert!(rewards == 25, "Multiple quests should sum correctly");
}

#[test]
fn test_quest_rewards_all_potions_and_bonus_xp() {
    // Has bonus_xp + both potions = 5 + 10 + 10 = 25
    let beast = create_beast_for_quest(10, 1, 0, 0, 1, 1, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 25, "Bonus XP + both potions should give 25");
}

#[test]
fn test_quest_rewards_summit_complete() {
    // Captured summit + held 10 seconds = 10 + 20 = 30
    let beast = create_beast_for_quest(10, 0, 10, 1, 0, 0, 0);
    let rewards = calculate_quest_rewards(beast);
    assert!(rewards == 30, "Summit capture + hold should give 30");
}

// ==================== Pack/unpack tests ====================

#[test]
fn test_pack_unpack_zero_values() {
    let packed = pack_quest_rewards_claimed(0, 0);
    let (beast_token_id, amount) = unpack_quest_rewards_claimed(packed);
    assert!(beast_token_id == 0, "Beast token ID should be 0");
    assert!(amount == 0, "Amount should be 0");
}

#[test]
fn test_pack_unpack_typical_values() {
    let beast_token_id: u32 = 1000;
    let amount: u8 = 100;
    let packed = pack_quest_rewards_claimed(beast_token_id, amount);
    let (unpacked_beast_token_id, unpacked_amount) = unpack_quest_rewards_claimed(packed);
    assert!(unpacked_beast_token_id == beast_token_id, "Beast token ID mismatch");
    assert!(unpacked_amount == amount, "Amount mismatch");
}

#[test]
fn test_pack_unpack_max_amount() {
    let beast_token_id: u32 = 93500;
    let amount: u8 = 255; // max u8
    let packed = pack_quest_rewards_claimed(beast_token_id, amount);
    let (unpacked_beast_token_id, unpacked_amount) = unpack_quest_rewards_claimed(packed);
    assert!(unpacked_beast_token_id == beast_token_id, "Beast token ID mismatch");
    assert!(unpacked_amount == amount, "Amount mismatch");
}

#[test]
fn test_pack_deterministic() {
    let packed1 = pack_quest_rewards_claimed(12345, 100);
    let packed2 = pack_quest_rewards_claimed(12345, 100);
    assert!(packed1 == packed2, "Same inputs should produce same output");
}
