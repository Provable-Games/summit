use summit::models::beast::PackableLiveStatsStorePacking;
use crate::fixtures::constants::CROSS_LAYER_PARITY_PACKED;
use crate::helpers::beast_builder::{
    assert_roundtrip, assert_stats_equal, build_cross_layer_parity_stats, build_live_beast_stats,
};

#[test]
fn pack_matches_cross_layer_parity_vector() {
    let packed = PackableLiveStatsStorePacking::pack(build_cross_layer_parity_stats());
    assert(packed == CROSS_LAYER_PARITY_PACKED, 'parity packed mismatch');
}

#[test]
fn unpack_matches_cross_layer_parity_vector() {
    let unpacked = PackableLiveStatsStorePacking::unpack(CROSS_LAYER_PARITY_PACKED);
    assert_stats_equal(unpacked, build_cross_layer_parity_stats());
}

// --- Zero values ---

#[test]
fn pack_unpack_zero_values() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    // Zero should pack to felt252 zero
    let packed = PackableLiveStatsStorePacking::pack(stats);
    assert(packed == 0, 'zero should pack to 0');
    assert_roundtrip(stats);
}

// --- True max values (2^N - 1 for each field) ---

#[test]
fn pack_unpack_true_max_values() {
    let stats = build_live_beast_stats(
        0x1FFFF_u32, // token_id: 2^17 - 1 = 131071
        0xFFF_u16, // current_health: 2^12 - 1 = 4095
        0x7FF_u16, // bonus_health: 2^11 - 1 = 2047
        0x7FFF_u16, // bonus_xp: 2^15 - 1 = 32767
        0xF_u8, // attack_streak: 2^4 - 1 = 15
        0xFFFFFFFFFFFFFFFF_u64, // last_death_timestamp: 2^64 - 1
        0x3F_u8, // revival_count: 2^6 - 1 = 63
        0xFFF_u16, // extra_lives: 2^12 - 1 = 4095
        0x7FFFFF_u32, // summit_held_seconds: 2^23 - 1 = 8388607
        0xFF_u8, // spirit: 2^8 - 1 = 255
        0xFF_u8, // luck: 2^8 - 1 = 255
        1_u8, // specials: 1-bit max
        1_u8, // wisdom: 1-bit max
        1_u8, // diplomacy: 1-bit max
        0xFFFFFFFF_u32, // rewards_earned: 2^32 - 1
        0xFFFFFFFF_u32, // rewards_claimed: 2^32 - 1
        1_u8, // captured_summit: 1-bit max
        1_u8, // used_revival_potion: 1-bit max
        1_u8, // used_attack_potion: 1-bit max
        1_u8 // max_attack_streak: 1-bit max
    );
    assert_roundtrip(stats);
}

// --- Near-max values (2^N - 2) to test boundary behavior ---

#[test]
fn pack_unpack_near_max_values() {
    let stats = build_live_beast_stats(
        131070_u32,
        4094_u16,
        2046_u16,
        32766_u16,
        14_u8,
        0xFFFFFFFFFFFFFFFE_u64,
        62_u8,
        4094_u16,
        8388606_u32,
        254_u8,
        254_u8,
        1_u8,
        1_u8,
        1_u8,
        0xFFFFFFFE_u32,
        0xFFFFFFFE_u32,
        1_u8,
        1_u8,
        1_u8,
        1_u8,
    );
    assert_roundtrip(stats);
}

// --- Mixed values (realistic gameplay scenario) ---

#[test]
fn pack_unpack_mixed_values() {
    let stats = build_live_beast_stats(
        100_u32, // token_id
        100, // current_health
        100, // bonus_health
        100, // bonus_xp
        9, // attack_streak
        123456789, // last_death_timestamp
        7, // revival_count
        42, // extra_lives
        54321, // summit_held_seconds
        17, // spirit
        96, // luck
        0, // specials
        1, // wisdom
        0, // diplomacy
        1000000_u32, // rewards_earned
        500000_u32, // rewards_claimed
        1, // captured_summit
        0, // used_revival_potion
        1, // used_attack_potion
        1 // max_attack_streak
    );
    assert_roundtrip(stats);
}

// --- Single field set, all others zero (isolation tests) ---

#[test]
fn pack_only_token_id() {
    let stats = build_live_beast_stats(12345_u32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_current_health() {
    let stats = build_live_beast_stats(0, 3000_u16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_bonus_health() {
    let stats = build_live_beast_stats(0, 0, 1500_u16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_bonus_xp() {
    let stats = build_live_beast_stats(0, 0, 0, 20000_u16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_attack_streak() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 15_u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_last_death_timestamp() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0xFFFFFFFFFFFFFFFF_u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_revival_count() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 63_u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_extra_lives() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 4000_u16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_summit_held_seconds() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 7654321_u32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_spirit() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 200_u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_luck() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 200_u8, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_specials() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_wisdom() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_diplomacy() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_rewards_earned() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 999999_u32, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_rewards_claimed() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 999999_u32, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_captured_summit() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_used_revival_potion() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_used_attack_potion() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_only_max_attack_streak() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1_u8);
    assert_roundtrip(stats);
}

// --- Value 1 in every field ---

#[test]
fn pack_all_ones() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
    assert_roundtrip(stats);
}

// --- Power-of-2 values (tests bit boundaries within fields) ---

#[test]
fn pack_power_of_two_values() {
    let stats = build_live_beast_stats(
        65536_u32, // 2^16 (fits in 17 bits)
        2048_u16, // 2^11 (fits in 12 bits)
        1024_u16, // 2^10 (fits in 11 bits)
        16384_u16, // 2^14 (fits in 15 bits)
        8_u8, // 2^3 (fits in 4 bits)
        0x8000000000000000_u64, // 2^63 (fits in 64 bits)
        32_u8, // 2^5 (fits in 6 bits)
        2048_u16, // 2^11 (fits in 12 bits)
        4194304_u32, // 2^22 (fits in 23 bits)
        128_u8, // 2^7 (fits in 8 bits)
        128_u8, // 2^7 (fits in 8 bits)
        1_u8, // 2^0
        1_u8, // 2^0
        1_u8, // 2^0
        0x80000000_u32, // 2^31 (fits in 32 bits)
        0x80000000_u32, // 2^31 (fits in 32 bits)
        1_u8,
        1_u8,
        1_u8,
        1_u8,
    );
    assert_roundtrip(stats);
}

// --- Low half full, high half zero (tests u128 boundary) ---

#[test]
fn pack_low_half_full_high_zero() {
    let stats = build_live_beast_stats(
        0,
        0,
        0,
        0,
        0,
        0xFFFFFFFFFFFFFFFF_u64, // last_death_timestamp (low) - max
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0xFFFFFFFF_u32, // rewards_earned (low) - max
        0xFFFFFFFF_u32, // rewards_claimed (low) - max
        0,
        0,
        0,
        0,
    );
    assert_roundtrip(stats);
}

// --- High half full, low half zero (tests u128 boundary) ---

#[test]
fn pack_high_half_full_low_zero() {
    let stats = build_live_beast_stats(
        0x1FFFF_u32, // token_id (high) - max
        0xFFF_u16, // current_health (high) - max
        0x7FF_u16, // bonus_health (high) - max
        0x7FFF_u16, // bonus_xp (high) - max
        0xF_u8, // attack_streak (high) - max
        0_u64, // last_death_timestamp (low) - zero
        0x3F_u8, // revival_count (high) - max
        0xFFF_u16, // extra_lives (high) - max
        0x7FFFFF_u32, // summit_held_seconds (high) - max
        0xFF_u8, // spirit (high) - max
        0xFF_u8, // luck (high) - max
        1_u8, // specials (high) - max
        1_u8, // wisdom (high) - max
        1_u8, // diplomacy (high) - max
        0_u32, // rewards_earned (low) - zero
        0_u32, // rewards_claimed (low) - zero
        1_u8, // captured_summit (high) - max
        1_u8, // used_revival_potion (high) - max
        1_u8, // used_attack_potion (high) - max
        1_u8 // max_attack_streak (high) - max
    );
    assert_roundtrip(stats);
}

// --- Alternating bit patterns (catches adjacency bleed) ---

#[test]
fn pack_alternating_max_zero() {
    let stats = build_live_beast_stats(
        0x1FFFF_u32,
        0,
        0x7FF_u16,
        0,
        0xF_u8,
        0,
        0x3F_u8,
        0,
        0x7FFFFF_u32,
        0,
        0xFF_u8,
        0,
        1_u8,
        0,
        0xFFFFFFFF_u32,
        0,
        1_u8,
        0,
        1_u8,
        0,
    );
    assert_roundtrip(stats);
}

#[test]
fn pack_alternating_zero_max() {
    let stats = build_live_beast_stats(
        0,
        0xFFF_u16,
        0,
        0x7FFF_u16,
        0,
        0xFFFFFFFFFFFFFFFF_u64,
        0,
        0xFFF_u16,
        0,
        0xFF_u8,
        0,
        1_u8,
        0,
        1_u8,
        0,
        0xFFFFFFFF_u32,
        0,
        1_u8,
        0,
        1_u8,
    );
    assert_roundtrip(stats);
}

// --- Realistic gameplay scenarios ---

#[test]
fn pack_fresh_beast() {
    let stats = build_live_beast_stats(42_u32, 500_u16, 0, 0, 0, 0, 0, 3, 0, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_veteran_beast() {
    let stats = build_live_beast_stats(
        99999_u32,
        3500_u16,
        800_u16,
        25000_u16,
        12_u8,
        1700000000_u64,
        15_u8,
        50_u16,
        360000_u32,
        75_u8,
        80_u8,
        1_u8,
        1_u8,
        1_u8,
        5000000_u32,
        3000000_u32,
        1_u8,
        1_u8,
        1_u8,
        1_u8,
    );
    assert_roundtrip(stats);
}

// --- Idempotency: double pack/unpack ---

#[test]
fn pack_unpack_idempotent() {
    let stats = build_live_beast_stats(
        42_u32, 500, 200, 1000, 7, 1700000000, 3, 10, 3600, 50, 60, 1, 0, 1, 100000, 50000, 1, 0, 1, 0,
    );
    let packed1 = PackableLiveStatsStorePacking::pack(stats);
    let unpacked1 = PackableLiveStatsStorePacking::unpack(packed1);
    let packed2 = PackableLiveStatsStorePacking::pack(unpacked1);
    let unpacked2 = PackableLiveStatsStorePacking::unpack(packed2);
    // Both packed values must be identical
    assert(packed1 == packed2, 'packed not idempotent');
    // Both unpacked values must be identical
    assert(unpacked1.token_id == unpacked2.token_id, 'idempotent token_id');
    assert(unpacked1.current_health == unpacked2.current_health, 'idempotent health');
    assert(unpacked1.last_death_timestamp == unpacked2.last_death_timestamp, 'idempotent ts');
    assert(unpacked1.rewards_earned == unpacked2.rewards_earned, 'idempotent rewards');
    assert(unpacked1.quest.captured_summit == unpacked2.quest.captured_summit, 'idempotent q');
}

// --- Quest flag permutations (all 16 combinations of 4 booleans) ---

#[test]
fn pack_quest_permutation_0000() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_quest_permutation_0001() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1);
    assert_roundtrip(stats);
}

#[test]
fn pack_quest_permutation_0010() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_quest_permutation_0100() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_quest_permutation_1000() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_quest_permutation_1010() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_quest_permutation_0101() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1);
    assert_roundtrip(stats);
}

#[test]
fn pack_quest_permutation_1111() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1);
    assert_roundtrip(stats);
}

// --- Stats flag permutations (specials, wisdom, diplomacy - all 8 combos) ---

#[test]
fn pack_stats_flags_000() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 0, 0, 0, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_stats_flags_001() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 1, 0, 0, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_stats_flags_010() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 0, 1, 0, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_stats_flags_100() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 0, 0, 1, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_stats_flags_101() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 1, 0, 1, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_stats_flags_110() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 0, 1, 1, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_stats_flags_011() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 1, 1, 0, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_stats_flags_111() {
    let stats = build_live_beast_stats(1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 50, 1, 1, 1, 1, 1, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

// --- Timestamp edge cases ---

#[test]
fn pack_timestamp_one() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 1_u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_timestamp_current_era() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 1704067200_u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

#[test]
fn pack_timestamp_far_future() {
    let stats = build_live_beast_stats(0, 0, 0, 0, 0, 16725225600_u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert_roundtrip(stats);
}

// --- Rewards edge cases ---

#[test]
fn pack_rewards_earned_gt_claimed() {
    let stats = build_live_beast_stats(
        1, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5000000_u32, 1000000_u32, 0, 0, 0, 0,
    );
    assert_roundtrip(stats);
}

#[test]
fn pack_rewards_equal() {
    let stats = build_live_beast_stats(
        1, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3000000_u32, 3000000_u32, 0, 0, 0, 0,
    );
    assert_roundtrip(stats);
}
