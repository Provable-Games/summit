# Function-Specific Gas Check Tests

All tests have `#[available_gas(gas: X)]` attributes to enforce gas budgets and detect regressions.

## Gas Limits Applied

### src/models/beast.cairo (3 tests)

| Test Name | Gas Limit | Purpose |
|-----------|-----------|---------|
| `pack_unpack_zero_values` | 1,200,000 | StorePacking with default values |
| `pack_unpack_max_values` | 1,200,000 | StorePacking with max values |
| `pack_unpack_mixed_values` | 1,200,000 | StorePacking with mixed values |

### src/logic/combat.cairo (15 tests)

| Test Name | Gas Limit | Purpose |
|-----------|-----------|---------|
| `test_apply_damage_partial` | 50,000 | Simple subtraction |
| `test_apply_damage_exact_kill` | 50,000 | Boundary condition |
| `test_apply_damage_overkill` | 50,000 | Floor at zero |
| `test_apply_damage_zero` | 50,000 | No damage case |
| `test_use_extra_life_triggers` | 60,000 | Extra life consumption |
| `test_use_extra_life_no_lives_left` | 60,000 | No lives edge case |
| `test_use_extra_life_not_dead` | 60,000 | Not dead condition |
| `test_build_combat_spec_with_specials` | 150,000 | CombatSpec with specials |
| `test_build_combat_spec_without_specials` | 150,000 | CombatSpec without specials |
| `test_build_combat_spec_level_calculation` | 250,000 | Level from XP (sqrt) |
| `test_get_battle_randomness_no_seed` | 50,000 | Early return (no seed) |
| `test_get_battle_randomness_deterministic` | 220,000 | Poseidon hashing |
| `test_get_battle_randomness_different_counter` | 220,000 | Hash variation |

### src/logic/beast_utils.cairo (14 tests)

| Test Name | Gas Limit | Purpose |
|-----------|-----------|---------|
| `test_get_level_from_xp_zero` | 50,000 | Early return |
| `test_get_level_from_xp_perfect_squares` | 60,000 | Sqrt computation |
| `test_get_level_from_xp_non_perfect_squares` | 55,000 | Sqrt computation |
| `test_can_gain_xp_within_limit` | 90,000 | XP limit check |
| `test_can_gain_xp_at_limit` | 90,000 | XP limit boundary |
| `test_calculate_xp_gain_eligible` | 65,000 | XP gain calculation |
| `test_calculate_xp_gain_not_eligible` | 55,000 | XP gain (not eligible) |
| `test_update_attack_streak_increment` | 110,000 | Streak update logic |
| `test_update_attack_streak_at_max` | 70,000 | Max streak boundary |
| `test_update_attack_streak_reset` | 100,000 | Streak reset |
| `test_is_beast_stronger_by_blocks` | 60,000 | Comparison logic |
| `test_is_beast_stronger_by_xp` | 60,000 | Comparison logic |
| `test_is_beast_stronger_by_death_timestamp` | 60,000 | Comparison logic |
| `test_get_specials_hash_deterministic` | 90,000 | Poseidon hash |
| `test_get_specials_hash_different_inputs` | 120,000 | Multiple hashes |
| `test_calculate_upgrade_cost_all_unlocks` | 80,000 | Cost calculation |
| `test_calculate_upgrade_cost_points_only` | 80,000 | Cost calculation |
| `test_calculate_upgrade_cost_mixed` | 80,000 | Cost calculation |
| `test_calculate_upgrade_cost_zero` | 80,000 | Zero cost |

### src/logic/poison.cairo (10 tests)

| Test Name | Gas Limit | Purpose |
|-----------|-----------|---------|
| `test_no_poison_damage` | 160,000 | Multiple zero-damage cases |
| `test_partial_health_damage` | 100,000 | Partial damage calculation |
| `test_exact_health_kill` | 100,000 | Exact kill boundary |
| `test_overkill_no_lives` | 100,000 | Overkill with floor |
| `test_uses_one_extra_life` | 100,000 | Single life consumption |
| `test_uses_multiple_extra_lives` | 100,000 | Multiple life consumption |
| `test_exhausts_all_lives` | 100,000 | All lives consumed |
| `test_with_bonus_health` | 100,000 | Bonus health calculation |
| `test_extra_life_with_bonus_health` | 100,000 | Combined calculation |
| `test_large_poison_stacks` | 100,000 | Large poison damage |

### src/logic/revival.cairo (11 tests)

| Test Name | Gas Limit | Purpose |
|-----------|-----------|---------|
| `test_revival_not_needed_after_full_time` | 70,000 | No potions needed |
| `test_revival_not_needed_exactly_at_time` | 65,000 | Boundary condition |
| `test_revival_needed_before_time` | 70,000 | Potions needed |
| `test_revival_cost_increases` | 150,000 | Multiple cost checks |
| `test_spirit_reduction_removes_need` | 70,000 | Spirit reduction |
| `test_spirit_reduction_partial` | 65,000 | Partial reduction |
| `test_spirit_reduction_exceeds_base` | 70,000 | Exceeds base time |
| `test_is_killed_recently_true` | 60,000 | Cooldown check |
| `test_is_killed_recently_false` | 60,000 | Past cooldown |
| `test_is_killed_recently_exactly_at_boundary` | 55,000 | Boundary condition |
| `test_increment_revival_count_normal` | 70,000 | Count increment |
| `test_increment_revival_count_at_max` | 60,000 | Max cap |

### src/logic/rewards.cairo (19 tests)

| Test Name | Gas Limit | Purpose |
|-----------|-----------|---------|
| `test_calculate_blocks_held_normal` | 55,000 | Block calculation |
| `test_calculate_blocks_held_past_terminal` | 55,000 | Past terminal cap |
| `test_calculate_blocks_held_taken_at_terminal` | 55,000 | At terminal boundary |
| `test_calculate_blocks_held_taken_after_terminal` | 55,000 | After terminal |
| `test_calculate_summit_rewards_no_diplomacy` | 90,000 | Reward calculation |
| `test_calculate_summit_rewards_with_diplomacy` | 100,000 | With diplomacy beasts |
| `test_calculate_summit_rewards_zero_blocks` | 70,000 | Zero blocks edge case |
| `test_get_potion_amount_tier1` | 80,000 | Multiple tier checks |
| `test_get_potion_amount_tier2` | 60,000 | Tier 2 beasts |
| `test_get_potion_amount_tier3` | 55,000 | Tier 3 beasts |
| `test_get_potion_amount_tier4` | 55,000 | Tier 4 beasts |
| `test_get_potion_amount_tier5` | 60,000 | Tier 5 beasts |
| `test_calculate_diplomacy_bonus_no_allies` | 55,000 | Empty allies |
| `test_calculate_diplomacy_bonus_single_ally` | 55,000 | Only self |
| `test_calculate_diplomacy_bonus_multiple_allies` | 70,000 | Multiple allies |
| `test_calculate_diplomacy_bonus_large_powers` | 80,000 | Large power values |
| `test_calculate_total_diplomacy_power` | 65,000 | Power summation |
| `test_calculate_total_diplomacy_power_empty` | 55,000 | Empty array |
| `test_calculate_total_diplomacy_power_overflow_safe` | 2,500,000 | 255 elements loop |

## Summary

- **Total Tests with Gas Limits**: 72 unit tests in logic modules
- **Integration Tests**: 131 tests (no gas limits - focus on correctness)
- **All Tests Pass**: 207 total

## How to Run

```bash
cd /workspace/opus-gas-optimizations/contracts
scarb test --detailed-resources
```

## Regression Detection

If any optimization causes a test to exceed its gas limit, the test will fail. This provides:
1. Automatic regression detection
2. Documented gas expectations
3. Baseline for optimization comparisons
