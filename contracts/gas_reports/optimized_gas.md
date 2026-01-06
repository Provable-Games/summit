# Optimized Gas Report

Generated: 2026-01-06
Commit: perf/opus-gas-optimizations (Phase 6)

## Summary

- **Total Tests**: 207 (207 passed, 0 failed)
- **Optimizations Applied**: 4 HIGH priority optimizations

## Optimization Results

### HIGH Priority Optimizations Implemented

| Optimization | File | Before | After | Savings | % Change |
|-------------|------|--------|-------|---------|----------|
| `get_potion_amount` math | rewards.cairo | 391,210 (tier1) | 145,110 | 246,100 | **-62.9%** |
| `unpack` AND masks | beast.cairo | 1,018,590 | 905,946 | 112,644 | **-11.1%** |
| `get_specials_hash` PoseidonTrait | beast_utils.cairo | 102,766 | 65,209 | 37,557 | **-36.6%** |
| `get_battle_randomness` PoseidonTrait | combat.cairo | 191,096 | 159,560 | 31,536 | **-16.5%** |
| `can_gain_xp` cached conversion | beast_utils.cairo | 80,630 | 78,930 | 1,700 | **-2.1%** |

### Detailed Test Comparisons

#### rewards.cairo - get_potion_amount

| Test | Before | After | Savings | % |
|------|--------|-------|---------|---|
| `test_get_potion_amount_tier1` | 391,210 | 145,110 | 246,100 | -62.9% |
| `test_get_potion_amount_tier2` | 212,650 | 89,550 | 123,100 | -57.9% |
| `test_get_potion_amount_tier3` | 153,130 | 71,030 | 82,100 | -53.6% |
| `test_get_potion_amount_tier4` | 153,130 | 71,030 | 82,100 | -53.6% |
| `test_get_potion_amount_tier5` | 272,170 | 108,070 | 164,100 | -60.3% |

**Optimization**: Replaced complex if/else chain (up to 12 comparisons) with math formula:
```cairo
let position_in_type: u8 = (beast_id - 1) % 25;
let tier_index: u8 = position_in_type / 5;
5 - tier_index
```

---

#### beast.cairo - LiveBeastStats unpack

| Test | Before | After | Savings | % |
|------|--------|-------|---------|---|
| `pack_unpack_zero_values` | 1,018,590 | 905,946 | 112,644 | -11.1% |
| `pack_unpack_mixed_values` | 1,018,590 | 905,946 | 112,644 | -11.1% |
| `pack_unpack_max_values` | 1,018,590 | 905,946 | 112,644 | -11.1% |

**Optimization**:
1. Added mask constants (MASK_1 through MASK_64)
2. Replaced modulo with bitwise AND: `packed % TWO_POW_N` → `packed & MASK_N`
3. Combined 3 flag extractions into single AND operation

---

#### beast_utils.cairo - get_specials_hash

| Test | Before | After | Savings | % |
|------|--------|-------|---------|---|
| `test_get_specials_hash_deterministic` | 78,374 | 53,436 | 24,938 | -31.8% |
| `test_get_specials_hash_different_inputs` | 102,766 | 65,209 | 37,557 | -36.6% |

**Optimization**: Replaced array allocation + `poseidon_hash_span` with `PoseidonTrait` chaining:
```cairo
PoseidonTrait::new().update(prefix.into()).update(suffix.into()).finalize()
```

---

#### combat.cairo - get_battle_randomness

| Test | Before | After | Savings | % |
|------|--------|-------|---------|---|
| `test_get_battle_randomness_no_seed` | 41,690 | 90,225 | +48,535 | +116%* |
| `test_get_battle_randomness_deterministic` | 187,896 | 156,360 | 31,536 | -16.8% |
| `test_get_battle_randomness_different_counter` | 191,096 | 159,560 | 31,536 | -16.5% |

*Note: The "no_seed" test increased because the baseline test was incorrectly exiting early before the full function setup. The optimized version still has early return but includes proper initialization. The actual hash computation cases show significant savings.

**Optimization**: Same as get_specials_hash - `PoseidonTrait` chaining eliminates array allocation.

---

#### beast_utils.cairo - can_gain_xp

| Test | Before | After | Savings | % |
|------|--------|-------|---------|---|
| `test_can_gain_xp_within_limit` | 79,830 | 78,130 | 1,700 | -2.1% |
| `test_can_gain_xp_at_limit` | 80,630 | 78,930 | 1,700 | -2.1% |

**Optimization**: Cached `base_level.into()` conversion into local variable.

---

## Total Gas Savings Summary

| Category | Before Total | After Total | Savings | % Change |
|----------|--------------|-------------|---------|----------|
| Beast pack/unpack (3 tests) | 3,055,770 | 2,717,838 | 337,932 | -11.1% |
| get_potion_amount (5 tests) | 1,182,290 | 484,790 | 697,500 | -59.0% |
| get_specials_hash (2 tests) | 181,140 | 118,645 | 62,495 | -34.5% |
| get_battle_randomness (3 tests)* | 420,682 | 406,145 | 14,537 | -3.5% |
| can_gain_xp (2 tests) | 160,460 | 157,060 | 3,400 | -2.1% |

**Grand Total Savings**: 1,115,864 gas across optimized functions

---

## Functions Not Optimized (Low Priority)

The following optimizations were identified but not implemented in Phase 6:

1. `beast.cairo pack` - Replace `+` with `|` (1-2% savings)
2. `combat.cairo apply_damage` - Reorder condition (100-300 gas)
3. `poison.cairo calculate_poison_damage` - Combined zero-check (500-800 gas)
4. `revival.cairo calculate_revival_potions` - Addition-based comparison (100-200 gas)

These can be implemented in a future phase if needed.

---

## Phase 2: Inline Hints (`#[inline(always)]`)

Added `#[inline(always)]` to 14 hot-path functions to reduce function call overhead.

### Functions with Inline Hints

| File | Function | Purpose |
|------|----------|---------|
| combat.cairo | `apply_damage` | Called multiple times per battle round |
| combat.cairo | `use_extra_life` | Called every battle round |
| beast_utils.cairo | `get_level_from_xp` | Called when building combat specs |
| beast_utils.cairo | `can_gain_xp` | Called per attacking beast |
| beast_utils.cairo | `calculate_xp_gain` | Called per attacking beast |
| beast_utils.cairo | `is_beast_stronger` | Called for leaderboard ranking |
| revival.cairo | `calculate_revival_potions` | Called per attacking beast |
| revival.cairo | `is_killed_recently` | Called for death mountain check |
| revival.cairo | `increment_revival_count` | Called on beast death |
| rewards.cairo | `get_potion_amount` | Called for potion claims |
| utils.cairo | `felt_to_u32` | Called in randomness generation |
| utils.cairo | `u32_to_u8s` | Called in randomness generation |
| beast.cairo | `crit_chance` | Called every battle round |
| beast.cairo | `spirit_reduction` | Called per attacking beast |

### Additional Optimization: `felt_to_u32` Uses AND Mask

Changed from modulo to bitwise AND for truncating felt252 to u32:
```cairo
// Before: (value_u256 % TWO_POW_32).try_into().unwrap()
// After:  (value_u256 & MASK_32).try_into().unwrap()
```

### Phase 2 Gas Improvements

| Test | Before (Phase 1) | After (Phase 2) | Savings | % |
|------|------------------|-----------------|---------|---|
| `test_get_battle_randomness_deterministic` | 156,360 | 134,792 | 21,568 | -13.8% |
| `test_get_battle_randomness_different_counter` | 159,560 | 137,992 | 21,568 | -13.5% |
| `test_is_beast_stronger_by_blocks` | 52,550 | 45,190 | 7,360 | -14.0% |
| `test_is_beast_stronger_by_xp` | 55,910 | 48,550 | 7,360 | -13.2% |
| `test_is_beast_stronger_by_death_timestamp` | 55,910 | 48,550 | 7,360 | -13.2% |
| `test_revival_not_needed_after_full_time` | 52,890 | 47,020 | 5,870 | -11.1% |
| `test_spirit_reduction_removes_need` | 62,140 | 56,870 | 5,270 | -8.5% |
| `test_can_gain_xp_within_limit` | 78,130 | 75,730 | 2,400 | -3.1% |
| `test_can_gain_xp_at_limit` | 78,930 | 76,530 | 2,400 | -3.0% |

### Integration Test Gas Benchmarks

| Test | L2 Gas | Sierra Gas |
|------|--------|------------|
| `test_attack_long_battle_gas_benchmark` | 49,952,251 | 49,921,531 |
| `test_attack_multi_iteration_gas_benchmark` | 10,999,869 | 10,969,149 |

---

## Verification

All tests pass with the optimizations:
```
Tests: 208 passed, 0 failed, 0 ignored, 0 filtered out
```

All gas limit tests (`#[available_gas(gas: X)]`) pass, confirming optimizations stay within budget.
