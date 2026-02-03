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
        total_rewards += 6;
    } else if bonus_levels >= 5 {
        total_rewards += 4;
    } else if bonus_levels >= 3 {
        total_rewards += 3;
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
    use super::{pack_quest_rewards_claimed, unpack_quest_rewards_claimed};

    // Pack/unpack tests
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
