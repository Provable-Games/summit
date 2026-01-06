# Baseline Gas Report

Generated: 2026-01-06
Commit: 2102f7f3ff25ef9aeb27e5be9186204934a6b9b3
Branch: perf/opus-gas-optimizations

## Summary

- **Total Tests**: 207 (207 passed, 0 failed)
- **Unit Tests**: 76 tests from `src/`
- **Integration Tests**: 131 tests from `tests/`

## Unit Tests (Pure Function Gas Usage)

| Test | L2 Gas | Sierra Gas |
|------|--------|------------|
| `summit::models::beast::tests::pack_unpack_max_values` | 1,018,590 | 1,018,590 |
| `summit::models::beast::tests::pack_unpack_mixed_values` | 1,018,590 | 1,018,590 |
| `summit::models::beast::tests::pack_unpack_zero_values` | 1,018,590 | 1,018,590 |
| `summit::logic::rewards::tests::test_calculate_total_diplomacy_power_overflow_safe` | 8,129,160 | 8,129,160 |
| `summit::logic::rewards::tests::test_get_potion_amount_tier1` | 391,210 | 391,210 |
| `summit::logic::rewards::tests::test_get_potion_amount_tier5` | 272,170 | 272,170 |
| `summit::logic::rewards::tests::test_get_potion_amount_tier2` | 212,650 | 212,650 |
| `summit::logic::combat::tests::test_build_combat_spec_level_calculation` | 211,210 | 211,210 |
| `summit::logic::combat::tests::test_get_battle_randomness_different_counter` | 191,096 | 191,096 |
| `summit::logic::combat::tests::test_get_battle_randomness_deterministic` | 187,896 | 187,896 |
| `summit::logic::rewards::tests::test_get_potion_amount_tier3` | 153,130 | 153,130 |
| `summit::logic::rewards::tests::test_get_potion_amount_tier4` | 153,130 | 153,130 |
| `summit::logic::poison::tests::test_no_poison_damage` | 145,330 | 145,330 |
| `summit::logic::revival::tests::test_revival_cost_increases` | 132,950 | 132,950 |
| `summit::logic::combat::tests::test_build_combat_spec_without_specials` | 123,900 | 123,900 |
| `summit::logic::combat::tests::test_build_combat_spec_with_specials` | 123,900 | 123,900 |
| `summit::logic::rewards::tests::test_calculate_diplomacy_bonus_large_powers` | 117,500 | 117,500 |
| `summit::logic::rewards::tests::test_calculate_total_diplomacy_power` | 108,420 | 108,420 |
| `summit::logic::beast_utils::tests::test_get_specials_hash_different_inputs` | 102,766 | 102,766 |
| `summit::logic::beast_utils::tests::test_update_attack_streak_increment` | 97,980 | 97,980 |
| `summit::logic::rewards::tests::test_calculate_diplomacy_bonus_multiple_allies` | 95,540 | 95,540 |
| `summit::logic::poison::tests::test_partial_health_damage` | 91,010 | 91,010 |
| `summit::logic::poison::tests::test_overkill_no_lives` | 91,010 | 91,010 |
| `summit::logic::poison::tests::test_exact_health_kill` | 91,010 | 91,010 |
| `summit::logic::poison::tests::test_uses_multiple_extra_lives` | 91,010 | 91,010 |
| `summit::logic::poison::tests::test_exhausts_all_lives` | 91,010 | 91,010 |
| `summit::logic::poison::tests::test_uses_one_extra_life` | 91,010 | 91,010 |
| `summit::logic::poison::tests::test_with_bonus_health` | 89,710 | 89,710 |
| `summit::logic::poison::tests::test_large_poison_stacks` | 88,410 | 88,410 |
| `summit::logic::poison::tests::test_extra_life_with_bonus_health` | 91,010 | 91,010 |
| `summit::logic::beast_utils::tests::test_update_attack_streak_reset` | 86,660 | 86,660 |
| `summit::logic::beast_utils::tests::test_can_gain_xp_at_limit` | 80,630 | 80,630 |
| `summit::logic::beast_utils::tests::test_can_gain_xp_within_limit` | 79,830 | 79,830 |
| `summit::logic::beast_utils::tests::test_get_specials_hash_deterministic` | 78,374 | 78,374 |
| `summit::logic::rewards::tests::test_calculate_summit_rewards_zero_blocks` | 70,090 | 70,090 |
| `summit::logic::rewards::tests::test_calculate_summit_rewards_with_diplomacy` | 70,090 | 70,090 |
| `summit::logic::rewards::tests::test_calculate_summit_rewards_no_diplomacy` | 70,090 | 70,090 |
| `summit::logic::beast_utils::tests::test_calculate_upgrade_cost_points_only` | 67,140 | 67,140 |
| `summit::logic::beast_utils::tests::test_calculate_upgrade_cost_zero` | 67,140 | 67,140 |
| `summit::logic::beast_utils::tests::test_calculate_upgrade_cost_mixed` | 67,140 | 67,140 |
| `summit::logic::beast_utils::tests::test_calculate_upgrade_cost_all_unlocks` | 67,140 | 67,140 |
| `summit::logic::revival::tests::test_revival_needed_before_time` | 62,240 | 62,240 |
| `summit::logic::revival::tests::test_spirit_reduction_removes_need` | 62,240 | 62,240 |
| `summit::logic::revival::tests::test_revival_not_needed_after_full_time` | 62,230 | 62,230 |
| `summit::logic::revival::tests::test_spirit_reduction_exceeds_base` | 62,230 | 62,230 |
| `summit::logic::revival::tests::test_increment_revival_count_normal` | 60,340 | 60,340 |
| `summit::logic::beast_utils::tests::test_update_attack_streak_at_max` | 58,440 | 58,440 |
| `summit::logic::revival::tests::test_revival_not_needed_exactly_at_time` | 57,660 | 57,660 |
| `summit::logic::revival::tests::test_spirit_reduction_partial` | 57,660 | 57,660 |
| `summit::logic::beast_utils::tests::test_calculate_xp_gain_eligible` | 54,600 | 54,600 |
| `summit::logic::revival::tests::test_is_killed_recently_true` | 52,300 | 52,300 |
| `summit::logic::revival::tests::test_is_killed_recently_false` | 52,710 | 52,710 |
| `summit::logic::beast_utils::tests::test_get_level_from_xp_perfect_squares` | 51,210 | 51,210 |
| `summit::logic::revival::tests::test_increment_revival_count_at_max` | 51,590 | 51,590 |
| `summit::logic::combat::tests::test_use_extra_life_no_lives_left` | 50,820 | 50,820 |
| `summit::logic::combat::tests::test_use_extra_life_not_dead` | 50,820 | 50,820 |
| `summit::logic::combat::tests::test_use_extra_life_triggers` | 50,820 | 50,820 |
| `summit::logic::beast_utils::tests::test_is_beast_stronger_by_death_timestamp` | 49,650 | 49,650 |
| `summit::logic::beast_utils::tests::test_is_beast_stronger_by_xp` | 49,650 | 49,650 |
| `summit::logic::beast_utils::tests::test_is_beast_stronger_by_blocks` | 49,650 | 49,650 |
| `summit::logic::revival::tests::test_is_killed_recently_exactly_at_boundary` | 48,130 | 48,130 |
| `summit::logic::beast_utils::tests::test_calculate_xp_gain_not_eligible` | 47,730 | 47,730 |
| `summit::logic::beast_utils::tests::test_get_level_from_xp_non_perfect_squares` | 46,930 | 46,930 |
| `summit::logic::rewards::tests::test_calculate_blocks_held_past_terminal` | 46,030 | 46,030 |
| `summit::logic::rewards::tests::test_calculate_blocks_held_taken_at_terminal` | 46,030 | 46,030 |
| `summit::logic::rewards::tests::test_calculate_blocks_held_normal` | 46,030 | 46,030 |
| `summit::logic::rewards::tests::test_calculate_blocks_held_taken_after_terminal` | 46,030 | 46,030 |
| `summit::logic::combat::tests::test_apply_damage_overkill` | 42,850 | 42,850 |
| `summit::logic::combat::tests::test_apply_damage_zero` | 42,850 | 42,850 |
| `summit::logic::combat::tests::test_apply_damage_exact_kill` | 42,850 | 42,850 |
| `summit::logic::combat::tests::test_apply_damage_partial` | 42,850 | 42,850 |
| `summit::logic::rewards::tests::test_calculate_total_diplomacy_power_empty` | 42,540 | 42,540 |
| `summit::logic::rewards::tests::test_calculate_diplomacy_bonus_single_ally` | 41,870 | 41,870 |
| `summit::logic::combat::tests::test_get_battle_randomness_no_seed` | 41,690 | 41,690 |
| `summit::logic::rewards::tests::test_calculate_diplomacy_bonus_no_allies` | 41,270 | 41,270 |
| `summit::logic::beast_utils::tests::test_get_level_from_xp_zero` | 38,370 | 38,370 |

## High-Gas Integration Tests (Top 20 by L2 Gas)

| Test | L2 Gas | Sierra Gas | Key Syscalls |
|------|--------|------------|--------------|
| `test_attack_poison_kills_beast_during_attack` | ~19,831,118 | 19,800,398 | 95 StorageRead, 41 StorageWrite |
| `test_attack_resets_streak_on_different_summit` | ~17,456,198 | 17,425,478 | 76 StorageRead, 33 StorageWrite |
| `test_attack_with_poison_damage_on_summit_beast` | ~17,280,308 | 17,249,588 | 74 StorageRead, 33 StorageWrite |
| `test_revive_beast_on_cooldown` | ~16,063,128 | 16,032,408 | 70 StorageRead, 32 StorageWrite |
| `test_attack_basic` | ~14,600,868 | 14,570,148 | 59 StorageRead, 28 StorageWrite |
| `test_attack_beast_already_in_game` | ~14,579,048 | 14,548,328 | 60 StorageRead, 28 StorageWrite |
| `test_attack_as_different_owner` | ~14,569,558 | 14,538,838 | 60 StorageRead, 28 StorageWrite |
| `test_add_extra_life_basic` | ~14,451,218 | 14,420,498 | 54 StorageRead, 28 StorageWrite |
| `test_add_extra_lives_small_amount` | ~14,451,218 | 14,420,498 | 54 StorageRead, 28 StorageWrite |
| `test_feed_summit_beast` | ~14,261,198 | 14,230,478 | 52 StorageRead, 27 StorageWrite |
| `test_apply_poison` | ~12,879,778 | 12,849,058 | 52 StorageRead, 27 StorageWrite |
| `test_apply_poison_zero_count` | ~13,144,868 | 13,114,148 | 39 StorageRead, 26 StorageWrite |
| `test_attack_initializes_streak` | ~12,189,478 | 12,158,758 | 43 StorageRead, 26 StorageWrite |
| `test_revive_beast_dead_outside_cooldown` | ~11,959,398 | 11,928,678 | 40 StorageRead, 25 StorageWrite |
| `test_revive_beast_increase_revival_count` | ~11,959,338 | 11,928,618 | 40 StorageRead, 25 StorageWrite |
| `test_attack_before_summit_starts` | ~10,609,128 | 10,578,408 | 38 StorageRead, 24 StorageWrite |
| `test_attack_not_owner` | ~10,601,628 | 10,570,908 | 38 StorageRead, 24 StorageWrite |
| `test_revive_beast_from_leaderboard` | ~10,426,088 | 10,395,368 | 37 StorageRead, 23 StorageWrite |
| `test_revive_beast_basic` | ~9,776,378 | 9,745,658 | 33 StorageRead, 22 StorageWrite |
| `test_apply_stat_points_unlock_diplomacy_twice` | ~9,588,944 | 9,558,224 | 31 StorageRead, 23 StorageWrite |

## Gas-Intensive Operations Identified

1. **Beast StorePacking**: `pack_unpack_*` tests show ~1M gas for pack/unpack - potential optimization target
2. **Attack flow**: Complex attacks with poison damage use ~17-20M L2 gas
3. **Storage reads dominate**: High-gas tests show 50-95 storage reads per test
4. **Diplomacy overflow calculation**: 8M+ gas for diplomacy power calculation

## Baseline Metrics for Optimization Tracking

| Category | Average L2 Gas |
|----------|---------------|
| Pure function unit tests | ~150,000 |
| Simple integration tests (getters) | ~2,000,000 |
| Complex integration tests (attack/revive) | ~12,000,000 |
| Highest gas test | 19,831,118 |

---

*This baseline was captured before any gas optimizations. All subsequent optimization work will be measured against these values.*
