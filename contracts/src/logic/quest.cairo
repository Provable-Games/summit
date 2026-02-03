/// Packed quest rewards claimed: beast_token_id (17 bits) | amount (8 bits)
/// Total: 25 bits - fits in a single felt252
#[derive(Drop, Copy)]
pub struct QuestRewardsClaimed {
    pub beast_token_id: u32,
    pub amount: u8,
}

// Bit shift constants for packing
const TWO_POW_8: felt252 = 0x100; // 2^8
use summit::logic::beast_utils;
use summit::models::beast::Beast;

#[inline(always)]
pub fn calculate_quest_rewards(beast: Beast) -> u8 {
    let mut total_rewards: u8 = 0;

    if beast.live.last_death_timestamp > 0 {
        total_rewards += 5;
    }

    if beast.live.quest.used_revival_potion == 1 {
        total_rewards += 5;
    }

    if beast.live.quest.used_attack_potion == 1 {
        total_rewards += 5;
    }

    let bonus_levels = beast_utils::get_bonus_levels(beast.fixed.level, beast.live.bonus_xp);
    if bonus_levels >= 10 {
        total_rewards += 15;
    } else if bonus_levels >= 5 {
        total_rewards += 9;
    } else if bonus_levels >= 3 {
        total_rewards += 5;
    } else if bonus_levels >= 1 {
        total_rewards += 2;
    }

    if beast.live.quest.captured_summit == 1 {
        total_rewards += 5;
    }

    if beast.live.summit_held_seconds >= 10 {
        total_rewards += 10;
    }

    if beast.live.quest.max_attack_streak == 1 {
        total_rewards += 5;
    }

    total_rewards
}


#[inline(always)]
pub fn pack_quest_rewards_claimed(beast_token_id: u32, amount: u8) -> felt252 {
    let beast_token_id_felt: felt252 = beast_token_id.into();
    let amount_felt: felt252 = amount.into();
    beast_token_id_felt * TWO_POW_8 + amount_felt
}

/// Unpack quest rewards claimed from a single felt252
#[inline(always)]
pub fn unpack_quest_rewards_claimed(packed: felt252) -> (u32, u8) {
    let packed_u256: u256 = packed.into();
    let amount: u8 = (packed_u256 & 0xFF).try_into().unwrap();
    let beast_token_id: u32 = ((packed_u256 / 0x100) & 0xFFFFFFFF).try_into().unwrap();
    (beast_token_id, amount)
}

#[cfg(test)]
mod tests {
    use beasts_nft::pack::PackableBeast;
    use summit::models::beast::{Beast, LiveBeastStats, Quest, Stats};
    use super::{calculate_quest_rewards, pack_quest_rewards_claimed, unpack_quest_rewards_claimed};

    // Helper to create a default beast for testing
    fn create_test_beast(
        level: u16,
        bonus_xp: u16,
        last_death_timestamp: u64,
        summit_held_seconds: u32,
        captured_summit: u8,
        used_revival_potion: u8,
        used_attack_potion: u8,
        max_attack_streak: u8,
    ) -> Beast {
        Beast {
            fixed: PackableBeast { id: 1, prefix: 1, suffix: 1, level, health: 100, shiny: 0, animated: 0 },
            live: LiveBeastStats {
                token_id: 1,
                current_health: 100,
                bonus_health: 0,
                bonus_xp,
                attack_streak: 0,
                last_death_timestamp,
                revival_count: 0,
                extra_lives: 0,
                summit_held_seconds,
                stats: Stats { spirit: 0, luck: 0, specials: 0, wisdom: 0, diplomacy: 0 },
                rewards_earned: 0,
                rewards_claimed: 0,
                quest: Quest { captured_summit, used_revival_potion, used_attack_potion, max_attack_streak },
            },
        }
    }

    // ==================== calculate_quest_rewards tests ====================

    #[test]
    fn test_quest_rewards_zero_for_fresh_beast() {
        let beast = create_test_beast(10, 0, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 0, "Fresh beast should have 0 rewards");
    }

    #[test]
    fn test_quest_rewards_max_total_is_50() {
        // All quests completed with max bonus levels (10+)
        // base_level=10, bonus_xp=300 gives 10 bonus levels (sqrt(400)-10=20-10=10)
        let beast = create_test_beast(
            10, // level
            300, // bonus_xp for 10 bonus levels
            1, // died once
            10, // summit held 10+ seconds
            1, // captured summit
            1, // used revival potion
            1, // used attack potion
            1 // max attack streak
        );
        let rewards = calculate_quest_rewards(beast);
        // 5 (death) + 5 (revival potion) + 5 (attack potion) + 15 (10+ bonus levels)
        // + 5 (captured summit) + 10 (held 10+ seconds) + 5 (max attack streak) = 50
        assert!(rewards == 50, "Max rewards should be 50");
    }

    #[test]
    fn test_quest_rewards_died_once() {
        let beast = create_test_beast(10, 0, 1, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 5, "Dying once should give 5 rewards");
    }

    #[test]
    fn test_quest_rewards_used_revival_potion() {
        let beast = create_test_beast(10, 0, 0, 0, 0, 1, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 5, "Using revival potion should give 5 rewards");
    }

    #[test]
    fn test_quest_rewards_used_attack_potion() {
        let beast = create_test_beast(10, 0, 0, 0, 0, 0, 1, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 5, "Using attack potion should give 5 rewards");
    }

    #[test]
    fn test_quest_rewards_captured_summit() {
        let beast = create_test_beast(10, 0, 0, 0, 1, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 5, "Capturing summit should give 5 rewards");
    }

    #[test]
    fn test_quest_rewards_held_summit_10_seconds() {
        let beast = create_test_beast(10, 0, 0, 10, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 10, "Holding summit 10+ seconds should give 10 rewards");
    }

    #[test]
    fn test_quest_rewards_held_summit_9_seconds() {
        let beast = create_test_beast(10, 0, 0, 9, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 0, "Holding summit 9 seconds should give 0 rewards");
    }

    #[test]
    fn test_quest_rewards_max_attack_streak() {
        let beast = create_test_beast(10, 0, 0, 0, 0, 0, 0, 1);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 5, "Max attack streak should give 5 rewards");
    }

    // ==================== Bonus level reward thresholds ====================

    #[test]
    fn test_quest_rewards_bonus_levels_zero() {
        // base_level=10, bonus_xp=0 gives 0 bonus levels
        let beast = create_test_beast(10, 0, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 0, "0 bonus levels should give 0 rewards");
    }

    #[test]
    fn test_quest_rewards_bonus_levels_1() {
        // base_level=10, base_xp=100, for level 11 need xp=121, bonus_xp=21
        let beast = create_test_beast(10, 21, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 2, "1 bonus level should give 2 rewards");
    }

    #[test]
    fn test_quest_rewards_bonus_levels_2() {
        // base_level=10, for level 12 need xp=144, bonus_xp=44
        let beast = create_test_beast(10, 44, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 2, "2 bonus levels should give 2 rewards");
    }

    #[test]
    fn test_quest_rewards_bonus_levels_3() {
        // base_level=10, for level 13 need xp=169, bonus_xp=69
        let beast = create_test_beast(10, 69, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 5, "3 bonus levels should give 5 rewards");
    }

    #[test]
    fn test_quest_rewards_bonus_levels_4() {
        // base_level=10, for level 14 need xp=196, bonus_xp=96
        let beast = create_test_beast(10, 96, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 5, "4 bonus levels should give 5 rewards");
    }

    #[test]
    fn test_quest_rewards_bonus_levels_5() {
        // base_level=10, for level 15 need xp=225, bonus_xp=125
        let beast = create_test_beast(10, 125, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 9, "5 bonus levels should give 9 rewards");
    }

    #[test]
    fn test_quest_rewards_bonus_levels_9() {
        // base_level=10, for level 19 need xp=361, bonus_xp=261
        let beast = create_test_beast(10, 261, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 9, "9 bonus levels should give 9 rewards");
    }

    #[test]
    fn test_quest_rewards_bonus_levels_10() {
        // base_level=10, for level 20 need xp=400, bonus_xp=300
        let beast = create_test_beast(10, 300, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 15, "10 bonus levels should give 15 rewards");
    }

    #[test]
    fn test_quest_rewards_bonus_levels_above_10() {
        // base_level=10, for level 25 need xp=625, bonus_xp=525
        let beast = create_test_beast(10, 525, 0, 0, 0, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 15, "15 bonus levels should still give 15 rewards");
    }

    // ==================== Combined rewards tests ====================

    #[test]
    fn test_quest_rewards_multiple_quests() {
        // Died once + captured summit + used attack potion
        let beast = create_test_beast(10, 0, 1, 0, 1, 0, 1, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 15, "Multiple quests should sum correctly");
    }

    #[test]
    fn test_quest_rewards_all_potions_and_death() {
        // Died once + both potions = 15
        let beast = create_test_beast(10, 0, 1, 0, 0, 1, 1, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 15, "Death + both potions should give 15");
    }

    #[test]
    fn test_quest_rewards_summit_complete() {
        // Captured summit + held 10 seconds = 15
        let beast = create_test_beast(10, 0, 0, 10, 1, 0, 0, 0);
        let rewards = calculate_quest_rewards(beast);
        assert!(rewards == 15, "Summit capture + hold should give 15");
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
}
