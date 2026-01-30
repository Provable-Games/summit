/// Distribution of summit rewards between holder and diplomacy beasts
#[derive(Drop, Copy)]
pub struct RewardDistribution {
    /// Reward amount for the summit holder
    pub summit_reward: u128,
    /// Reward per diplomacy beast (if any)
    pub diplomacy_reward_per_beast: u128,
}

/// Calculate blocks held on summit, capped at terminal block
/// @param taken_at Block when beast took the summit
/// @param current_block Current block number
/// @param terminal_block Terminal block (end of summit)
/// @return Number of blocks held (0 if taken_at >= terminal_block)
pub fn calculate_summit_held_seconds(taken_at: u64, current_block: u64, terminal_block: u64) -> u64 {
    if taken_at >= terminal_block {
        return 0;
    }

    if current_block > terminal_block {
        terminal_block - taken_at
    } else {
        current_block - taken_at
    }
}

/// Calculate summit reward distribution between holder and diplomacy beasts
/// Diplomacy beasts each receive 1% of total rewards
/// Summit holder receives remainder
///
/// @param blocks_on_summit Number of blocks beast held summit
/// @param total_reward_amount Total reward pool for entire summit
/// @param summit_duration_blocks Total blocks summit lasts
/// @param diplomacy_count Number of diplomacy beasts with matching specials
/// @return RewardDistribution with amounts for holder and each diplomacy beast
pub fn calculate_summit_rewards(
    blocks_on_summit: u64, total_reward_amount: u128, summit_duration_blocks: u64, diplomacy_count: u8,
) -> RewardDistribution {
    if blocks_on_summit == 0 || summit_duration_blocks == 0 {
        return RewardDistribution { summit_reward: 0, diplomacy_reward_per_beast: 0 };
    }

    let block_reward = total_reward_amount / summit_duration_blocks.into();
    let total_reward = blocks_on_summit.into() * block_reward;
    let diplomacy_reward_per_beast = total_reward / 100; // 1% each

    let total_diplomacy_reward = diplomacy_reward_per_beast * diplomacy_count.into();
    let summit_reward = total_reward - total_diplomacy_reward;

    RewardDistribution { summit_reward, diplomacy_reward_per_beast }
}

/// Get potion claim amounts by beast ID
/// Higher tier beasts (lower IDs) get more potions
/// Uses math-based calculation instead of if/else chain
///
/// Beast IDs are organized in 25-beast type blocks:
/// - Brute: 1-25, Hunter: 26-50, Magical: 51-75
/// - Within each block, IDs 1-5 = Tier 1, 6-10 = Tier 2, etc.
///
/// @param beast_id The beast's type ID (1-75)
/// @return Number of potions claimable (1-5)
#[inline(always)]
pub fn get_potion_amount(beast_id: u8) -> u8 {
    // Calculate position within a 25-beast type block (0-24)
    let position_in_type: u8 = (beast_id - 1) % 25;
    // Calculate tier index (0-4) based on 5-beast groupings
    let tier_index: u8 = position_in_type / 5;
    // Return potions: 5 for tier 0, 4 for tier 1, ..., 1 for tier 4
    5 - tier_index
}

/// Calculate diplomacy bonus for defender based on ally beast powers
/// Sum of ally powers divided by 250 = bonus damage reduction/increase
/// Note: Excludes the first beast's power (which is self)
///
/// @param ally_powers Array of attack powers for each diplomacy beast (first is self)
/// @return Diplomacy bonus as u8
pub fn calculate_diplomacy_bonus(ally_powers: Span<u16>) -> u8 {
    if ally_powers.len() <= 1 {
        return 0;
    }

    // Use u32 to prevent overflow when summing many u16 powers
    let mut total_power: u32 = 0;
    let mut i: u32 = 1; // Start at 1 to skip self

    while i < ally_powers.len() {
        total_power += (*ally_powers.at(i)).into();
        i += 1;
    }

    (total_power / 250).try_into().unwrap()
}

/// Calculate total diplomacy power for event emission
/// @param ally_powers Array of attack powers for each diplomacy beast
/// @return Total power sum (u32 to prevent overflow with many allies)
pub fn calculate_total_diplomacy_power(ally_powers: Span<u16>) -> u32 {
    let mut total: u32 = 0;
    let mut i: u32 = 0;

    while i < ally_powers.len() {
        total += (*ally_powers.at(i)).into();
        i += 1;
    }

    total
}

#[cfg(test)]
mod tests {
    use super::{
        calculate_diplomacy_bonus, calculate_summit_held_seconds, calculate_summit_rewards,
        calculate_total_diplomacy_power, get_potion_amount,
    };

    #[test]
    #[available_gas(gas: 55000)]
    fn test_calculate_summit_held_seconds_normal() {
        // Taken at block 100, current 200, terminal 500
        let blocks = calculate_summit_held_seconds(100, 200, 500);
        assert!(blocks == 100, "Should have held for 100 blocks");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_calculate_summit_held_seconds_past_terminal() {
        // Taken at block 100, current 600, terminal 500
        // Should cap at terminal
        let blocks = calculate_summit_held_seconds(100, 600, 500);
        assert!(blocks == 400, "Should cap at terminal block");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_calculate_summit_held_seconds_taken_at_terminal() {
        // Taken at terminal block
        let blocks = calculate_summit_held_seconds(500, 600, 500);
        assert!(blocks == 0, "Should be 0 if taken at/after terminal");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_calculate_summit_held_seconds_taken_after_terminal() {
        // Taken after terminal (showdown)
        let blocks = calculate_summit_held_seconds(600, 700, 500);
        assert!(blocks == 0, "Should be 0 if taken after terminal");
    }

    #[test]
    #[available_gas(gas: 90000)]
    fn test_calculate_summit_rewards_no_diplomacy() {
        // 100 blocks held, 1000 total reward, 1000 duration, 0 diplomacy
        let dist = calculate_summit_rewards(100, 1000, 1000, 0);
        // Block reward = 1000/1000 = 1
        // Total reward = 100 * 1 = 100
        // No diplomacy = full 100 to holder
        assert!(dist.summit_reward == 100, "Full reward to holder");
        assert!(dist.diplomacy_reward_per_beast == 1, "1% per beast (even if none)");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_calculate_summit_rewards_with_diplomacy() {
        // 100 blocks held, 10000 total reward, 1000 duration, 3 diplomacy
        let dist = calculate_summit_rewards(100, 10000, 1000, 3);
        // Block reward = 10000/1000 = 10
        // Total reward = 100 * 10 = 1000
        // Diplomacy each = 1000/100 = 10
        // Diplomacy total = 10 * 3 = 30
        // Summit holder = 1000 - 30 = 970
        assert!(dist.diplomacy_reward_per_beast == 10, "10 per diplomacy beast");
        assert!(dist.summit_reward == 970, "970 to summit holder");
    }

    #[test]
    #[available_gas(gas: 70000)]
    fn test_calculate_summit_rewards_zero_blocks() {
        let dist = calculate_summit_rewards(0, 10000, 1000, 3);
        assert!(dist.summit_reward == 0, "No reward for 0 blocks");
        assert!(dist.diplomacy_reward_per_beast == 0, "No diplomacy reward either");
    }

    #[test]
    #[available_gas(gas: 80000)]
    fn test_get_potion_amount_tier1() {
        // Tier 1 beasts
        assert!(get_potion_amount(1) == 5, "ID 1 = 5 potions");
        assert!(get_potion_amount(5) == 5, "ID 5 = 5 potions");
        assert!(get_potion_amount(26) == 5, "ID 26 = 5 potions");
        assert!(get_potion_amount(30) == 5, "ID 30 = 5 potions");
        assert!(get_potion_amount(51) == 5, "ID 51 = 5 potions");
        assert!(get_potion_amount(55) == 5, "ID 55 = 5 potions");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_get_potion_amount_tier2() {
        assert!(get_potion_amount(6) == 4, "ID 6 = 4 potions");
        assert!(get_potion_amount(10) == 4, "ID 10 = 4 potions");
        assert!(get_potion_amount(31) == 4, "ID 31 = 4 potions");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_get_potion_amount_tier3() {
        assert!(get_potion_amount(11) == 3, "ID 11 = 3 potions");
        assert!(get_potion_amount(15) == 3, "ID 15 = 3 potions");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_get_potion_amount_tier4() {
        assert!(get_potion_amount(16) == 2, "ID 16 = 2 potions");
        assert!(get_potion_amount(20) == 2, "ID 20 = 2 potions");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_get_potion_amount_tier5() {
        assert!(get_potion_amount(21) == 1, "ID 21 = 1 potion");
        assert!(get_potion_amount(25) == 1, "ID 25 = 1 potion");
        assert!(get_potion_amount(46) == 1, "ID 46 = 1 potion");
        assert!(get_potion_amount(75) == 1, "ID 75 = 1 potion");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_calculate_diplomacy_bonus_no_allies() {
        let powers: Span<u16> = array![].span();
        assert!(calculate_diplomacy_bonus(powers) == 0, "No bonus with no allies");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_calculate_diplomacy_bonus_single_ally() {
        // Only self, no allies
        let powers: Span<u16> = array![100].span();
        assert!(calculate_diplomacy_bonus(powers) == 0, "No bonus with only self");
    }

    #[test]
    #[available_gas(gas: 70000)]
    fn test_calculate_diplomacy_bonus_multiple_allies() {
        // Powers: [self=100, ally1=200, ally2=300]
        // Sum of allies = 200 + 300 = 500
        // Bonus = 500 / 250 = 2
        let powers: Span<u16> = array![100, 200, 300].span();
        assert!(calculate_diplomacy_bonus(powers) == 2, "Bonus should be 2");
    }

    #[test]
    #[available_gas(gas: 80000)]
    fn test_calculate_diplomacy_bonus_large_powers() {
        // Powers: [self=500, ally1=500, ally2=500, ally3=500]
        // Sum of allies = 500 + 500 + 500 = 1500
        // Bonus = 1500 / 250 = 6
        let powers: Span<u16> = array![500, 500, 500, 500].span();
        assert!(calculate_diplomacy_bonus(powers) == 6, "Bonus should be 6");
    }

    #[test]
    #[available_gas(gas: 65000)]
    fn test_calculate_total_diplomacy_power() {
        let powers: Span<u16> = array![100, 200, 300].span();
        assert!(calculate_total_diplomacy_power(powers) == 600_u32, "Total should be 600");
    }

    #[test]
    #[available_gas(gas: 55000)]
    fn test_calculate_total_diplomacy_power_empty() {
        let powers: Span<u16> = array![].span();
        assert!(calculate_total_diplomacy_power(powers) == 0_u32, "Empty should be 0");
    }

    #[test]
    #[available_gas(gas: 2500000)]
    fn test_calculate_total_diplomacy_power_overflow_safe() {
        // Test with many large powers that would overflow u16
        // 255 powers of 65000 each = 16,575,000 (exceeds u16::max of 65535)
        let mut powers_arr: Array<u16> = array![];
        let mut i: u32 = 0;
        while i < 255 {
            powers_arr.append(65000);
            i += 1;
        }
        let powers = powers_arr.span();
        let total = calculate_total_diplomacy_power(powers);
        assert!(total == 255_u32 * 65000_u32, "Should handle large sums without overflow");
    }
}
