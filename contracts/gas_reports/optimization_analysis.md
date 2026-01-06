# Gas Optimization Analysis Summary

Generated: 2026-01-06

## Overview

Five parallel analysis agents examined the following files for gas optimization opportunities:

1. `src/models/beast.cairo` - StorePacking for LiveBeastStats
2. `src/logic/rewards.cairo` - Reward calculations
3. `src/logic/combat.cairo` - Combat mechanics
4. `src/logic/beast_utils.cairo` - Beast utility functions
5. `src/logic/poison.cairo` & `src/logic/revival.cairo` - Game mechanics

---

## Priority Optimization Matrix

| Priority | File | Function | Optimization | Expected Savings | Risk |
|----------|------|----------|--------------|------------------|------|
| **HIGH** | rewards.cairo | `get_potion_amount` | Math-based tier calculation | 30-60% | Low |
| **HIGH** | beast.cairo | `unpack` | Replace modulo with AND masks | 15-25% | Low |
| **HIGH** | beast_utils.cairo | `get_specials_hash` | PoseidonTrait chaining | 15-25% | Low |
| **HIGH** | combat.cairo | `get_battle_randomness` | PoseidonTrait chaining | 5-15K gas | Low |
| Medium | beast.cairo | `unpack` | Remove final division | 1-2% | Low |
| Medium | beast.cairo | `unpack` | Combine 1-bit fields | 3-5% | Low |
| Medium | beast_utils.cairo | `can_gain_xp` | Cache base_level conversion | 3-5% | Low |
| Medium | poison.cairo | `calculate_poison_damage` | Combined zero-check | 500-800 gas | Low |
| Medium | poison.cairo | `calculate_poison_damage` | Use modulo directly | 100-200 gas | Low |
| Medium | revival.cairo | `calculate_revival_potions` | Addition-based comparison | 100-200 gas | Low |
| Low | beast.cairo | `pack` | Replace + with \| | 1-2% | Low |
| Low | combat.cairo | `apply_damage` | Reorder condition | 100-300 gas | Low |

---

## Detailed Optimizations

### 1. `get_potion_amount` - Math-Based Tier Calculation (HIGH PRIORITY)

**Current:** Complex if/else chain with up to 12 comparisons

**Optimized:**
```cairo
pub fn get_potion_amount(beast_id: u8) -> u8 {
    let position_in_type: u8 = (beast_id - 1) % 25;
    let tier_index: u8 = position_in_type / 5;
    5 - tier_index
}
```

**Impact:** 30-60% gas reduction, eliminates variable gas cost

---

### 2. `LiveBeastStats::unpack` - Bitwise AND Masks (HIGH PRIORITY)

**Current:** Uses modulo (`packed % TWO_POW_N`)

**Optimized:** Use bitwise AND (`packed & MASK_N`)

```cairo
// Add mask constants
pub const MASK_17: u256 = 0x1FFFF;
pub const MASK_12: u256 = 0xFFF;
// ... etc

// Replace modulo with AND
let token_id = (packed & pow::MASK_17).try_into().expect('unpack token_id');
```

**Impact:** 15-25% reduction in unpack gas

---

### 3. `get_specials_hash` - PoseidonTrait Chaining (HIGH PRIORITY)

**Current:** Array allocation + poseidon_hash_span

**Optimized:**
```cairo
use core::poseidon::PoseidonTrait;

pub fn get_specials_hash(prefix: u8, suffix: u8) -> felt252 {
    PoseidonTrait::new()
        .update(prefix.into())
        .update(suffix.into())
        .finalize()
}
```

**Impact:** 15-25K gas savings (eliminates array allocation)

---

### 4. `get_battle_randomness` - PoseidonTrait Chaining (HIGH PRIORITY)

**Current:** Array allocation + poseidon_hash_span

**Optimized:**
```cairo
use core::poseidon::PoseidonTrait;

pub fn get_battle_randomness(token_id: u32, seed: felt252, last_death_timestamp: u64, battle_counter: u32) -> (u8, u8, u8, u8) {
    if seed == 0 {
        return (0, 0, 0, 0);
    }

    let poseidon = PoseidonTrait::new()
        .update(token_id.into())
        .update(seed)
        .update(last_death_timestamp.into())
        .update(battle_counter.into())
        .finalize();

    let rnd1_u64 = felt_to_u32(poseidon);
    u32_to_u8s(rnd1_u64)
}
```

**Impact:** 5-15K gas savings

---

### 5. `can_gain_xp` - Cache Type Conversion (MEDIUM PRIORITY)

**Current:** Multiple `base_level.into()` calls

**Optimized:**
```cairo
pub fn can_gain_xp(base_level: u16, bonus_xp: u16, max_bonus_levels: u16) -> bool {
    let base: u32 = base_level.into();  // Cache once
    let max_level: u32 = base + max_bonus_levels.into();
    bonus_xp.into() < (max_level * max_level) - (base * base)
}
```

**Impact:** 2,500-4,000 gas savings

---

### 6. `calculate_poison_damage` - Combined Zero-Check (MEDIUM PRIORITY)

**Current:** Multiplies then checks for zero

**Optimized:**
```cairo
if poison_count == 0 || time_since_poison == 0 {
    return PoisonResult { damage: 0, new_health: current_health, new_extra_lives: extra_lives };
}
let damage: u64 = time_since_poison * poison_count.into();
```

**Impact:** 500-800 gas for zero-damage cases

---

## Implementation Plan

### Phase 6A: High Priority (Parallel Implementation)

1. **Agent 1:** `rewards.cairo` - `get_potion_amount` optimization
2. **Agent 2:** `beast.cairo` - Add mask constants + optimize unpack
3. **Agent 3:** `beast_utils.cairo` - `get_specials_hash` PoseidonTrait
4. **Agent 4:** `combat.cairo` - `get_battle_randomness` PoseidonTrait

### Phase 6B: Medium Priority

5. `beast_utils.cairo` - `can_gain_xp` variable caching
6. `poison.cairo` - Combined zero-check and modulo optimization
7. `revival.cairo` - Addition-based comparison

### Phase 6C: Low Priority (Optional)

8. `beast.cairo` - Pack function OR replacement
9. Minor condition reordering in other functions

---

## Expected Total Impact

| File | Baseline (avg) | Expected After | Reduction |
|------|----------------|----------------|-----------|
| beast.cairo pack/unpack | 1,018,590 | ~850,000 | ~15-20% |
| rewards.cairo get_potion | 270,000 (avg) | ~110,000 | ~60% |
| beast_utils.cairo get_specials_hash | 102,766 | ~75,000 | ~25% |
| combat.cairo get_battle_randomness | 187,896 | ~170,000 | ~10% |

---

## Risk Assessment

All proposed optimizations are **LOW RISK**:
- Pure function transformations
- Mathematically equivalent operations
- Existing tests provide full coverage
- No storage or external call changes
