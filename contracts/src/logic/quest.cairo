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

    if beast.live.bonus_xp > 0 {
        total_rewards += 5;
    }

    if beast.live.quest.used_revival_potion == 1 {
        total_rewards += 10;
    }

    if beast.live.quest.used_attack_potion == 1 {
        total_rewards += 10;
    }

    let bonus_levels = beast_utils::get_bonus_levels(beast.fixed.level, beast.live.bonus_xp);
    if bonus_levels >= 10 {
        total_rewards += 30;
    } else if bonus_levels >= 5 {
        total_rewards += 18;
    } else if bonus_levels >= 3 {
        total_rewards += 10;
    } else if bonus_levels >= 1 {
        total_rewards += 4;
    }

    if beast.live.quest.captured_summit == 1 {
        total_rewards += 10;
    }

    if beast.live.summit_held_seconds >= 10 {
        total_rewards += 20;
    }

    if beast.live.quest.max_attack_streak == 1 {
        total_rewards += 10;
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
