use beasts_nft::pack::PackableBeast;
use summit::models::beast::{Beast, LiveBeastStats, PackableLiveStatsStorePacking, Quest, Stats};

/// Full-parameter LiveBeastStats builder (from beast.cairo packing tests)
pub fn build_live_beast_stats(
    token_id: u32,
    current_health: u16,
    bonus_health: u16,
    bonus_xp: u16,
    attack_streak: u8,
    last_death_timestamp: u64,
    revival_count: u8,
    extra_lives: u16,
    summit_held_seconds: u32,
    spirit: u8,
    luck: u8,
    specials: u8,
    wisdom: u8,
    diplomacy: u8,
    rewards_earned: u32,
    rewards_claimed: u32,
    captured_summit: u8,
    used_revival_potion: u8,
    used_attack_potion: u8,
    max_attack_streak: u8,
) -> LiveBeastStats {
    LiveBeastStats {
        token_id,
        current_health,
        bonus_health,
        bonus_xp,
        attack_streak,
        last_death_timestamp,
        revival_count,
        extra_lives,
        summit_held_seconds,
        stats: Stats { spirit, luck, specials, wisdom, diplomacy },
        rewards_earned,
        rewards_claimed,
        quest: Quest { captured_summit, used_revival_potion, used_attack_potion, max_attack_streak },
    }
}

/// Beast with luck/spirit stats (from test_summit.cairo crit_chance/spirit_reduction tests)
pub fn create_beast_with_stats(luck: u8, spirit: u8) -> Beast {
    let fixed = PackableBeast { id: 1, prefix: 1, suffix: 1, level: 10, health: 100, shiny: 0, animated: 0 };

    let live = LiveBeastStats {
        token_id: 1,
        current_health: 100,
        bonus_health: 0,
        bonus_xp: 0,
        attack_streak: 0,
        last_death_timestamp: 0,
        revival_count: 0,
        extra_lives: 0,
        summit_held_seconds: 0,
        stats: Stats { spirit, luck, specials: 0, wisdom: 0, diplomacy: 0 },
        rewards_earned: 0,
        rewards_claimed: 0,
        quest: Quest { captured_summit: 0, used_revival_potion: 0, used_attack_potion: 0, max_attack_streak: 0 },
    };

    Beast { fixed, live }
}

/// Beast for quest reward testing (from quest.cairo tests)
pub fn create_beast_for_quest(
    level: u16,
    bonus_xp: u16,
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
            last_death_timestamp: 0,
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

/// Assert all fields of two LiveBeastStats are equal
pub fn assert_stats_equal(actual: LiveBeastStats, expected: LiveBeastStats) {
    assert(actual.token_id == expected.token_id, 'token_id mismatch');
    assert(actual.current_health == expected.current_health, 'current_health mismatch');
    assert(actual.bonus_health == expected.bonus_health, 'bonus_health mismatch');
    assert(actual.bonus_xp == expected.bonus_xp, 'bonus_xp mismatch');
    assert(actual.attack_streak == expected.attack_streak, 'attack_streak mismatch');
    assert(actual.last_death_timestamp == expected.last_death_timestamp, 'timestamp mismatch');
    assert(actual.revival_count == expected.revival_count, 'revival_count mismatch');
    assert(actual.extra_lives == expected.extra_lives, 'extra_lives mismatch');
    assert(actual.summit_held_seconds == expected.summit_held_seconds, 'summit_secs mismatch');
    assert(actual.stats.spirit == expected.stats.spirit, 'spirit mismatch');
    assert(actual.stats.luck == expected.stats.luck, 'luck mismatch');
    assert(actual.stats.specials == expected.stats.specials, 'specials mismatch');
    assert(actual.stats.wisdom == expected.stats.wisdom, 'wisdom mismatch');
    assert(actual.stats.diplomacy == expected.stats.diplomacy, 'diplomacy mismatch');
    assert(actual.rewards_earned == expected.rewards_earned, 'rewards_earned mismatch');
    assert(actual.rewards_claimed == expected.rewards_claimed, 'rewards_claimed mismatch');
    assert(actual.quest.captured_summit == expected.quest.captured_summit, 'captured_summit mismatch');
    assert(actual.quest.used_revival_potion == expected.quest.used_revival_potion, 'used_revival_potion mismatch');
    assert(actual.quest.used_attack_potion == expected.quest.used_attack_potion, 'used_attack_potion mismatch');
    assert(actual.quest.max_attack_streak == expected.quest.max_attack_streak, 'max_attack_streak mismatch');
}

/// Pack then unpack and assert roundtrip equality
pub fn assert_roundtrip(stats: LiveBeastStats) {
    let packed = PackableLiveStatsStorePacking::pack(stats);
    let u = PackableLiveStatsStorePacking::unpack(packed);
    assert_stats_equal(u, stats);
}

/// Build the cross-layer parity stats vector
pub fn build_cross_layer_parity_stats() -> LiveBeastStats {
    LiveBeastStats {
        token_id: 4242_u32,
        current_health: 1337_u16,
        bonus_health: 777_u16,
        bonus_xp: 12345_u16,
        attack_streak: 9_u8,
        last_death_timestamp: 1735689600_u64,
        revival_count: 17_u8,
        extra_lives: 3210_u16,
        summit_held_seconds: 654321_u32,
        stats: Stats { spirit: 88_u8, luck: 199_u8, specials: 1_u8, wisdom: 0_u8, diplomacy: 1_u8 },
        rewards_earned: 987654321_u32,
        rewards_claimed: 123456789_u32,
        quest: Quest {
            captured_summit: 1_u8, used_revival_potion: 0_u8, used_attack_potion: 1_u8, max_attack_streak: 1_u8,
        },
    }
}
