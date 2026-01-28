# Function Definitions

Generated: 2026-01-06

## Overview

Total files analyzed: 8 source files (excluding tests and interfaces)

---

## src/logic/combat.cairo

### `build_combat_spec`
- **Visibility**: pub
- **Signature**: `fn build_combat_spec(beast_id: u8, base_level: u16, prefix: u8, suffix: u8, bonus_xp: u16, include_specials: bool) -> CombatSpec`
- **Description**: Builds a CombatSpec from beast attributes for combat calculations. Calculates effective level from base XP plus bonus XP.
- **Storage Access**: No
- **Events**: None
- **Notes**: Uses external `ImplBeast` for tier/type lookups

### `calculate_attack_damage`
- **Visibility**: pub
- **Signature**: `fn calculate_attack_damage(attacker_spec: CombatSpec, defender_spec: CombatSpec, attack_potions: u8, defender_strength: u8, minimum_damage: u8, critical_hit_chance: u8, critical_hit_rnd: u8) -> (u16, bool)`
- **Description**: Calculates damage for a single attack using the combat library. Returns damage and critical hit flag.
- **Storage Access**: No
- **Events**: None
- **Notes**: Delegates to external `ImplCombat::calculate_damage`

### `apply_damage`
- **Visibility**: pub
- **Signature**: `fn apply_damage(current_health: u16, damage: u16) -> u16`
- **Description**: Applies damage to health, flooring at 0.
- **Storage Access**: No
- **Events**: None
- **Notes**: Simple subtraction with underflow protection

### `use_extra_life`
- **Visibility**: pub
- **Signature**: `fn use_extra_life(current_health: u16, extra_lives: u16, base_health: u16, bonus_health: u16) -> (u16, u16)`
- **Description**: Consumes an extra life to restore beast to full health if dead.
- **Storage Access**: No
- **Events**: None

### `get_battle_randomness`
- **Visibility**: pub
- **Signature**: `fn get_battle_randomness(token_id: u32, seed: felt252, last_death_timestamp: u64, battle_counter: u32) -> (u8, u8, u8, u8)`
- **Description**: Generates four random u8 values from Poseidon hash of battle inputs.
- **Storage Access**: No
- **Events**: None
- **Notes**: Returns zeros if seed is 0

### `get_attack_power`
- **Visibility**: pub
- **Signature**: `fn get_attack_power(combat_spec: CombatSpec) -> u16`
- **Description**: Gets attack HP value for diplomacy calculations.
- **Storage Access**: No
- **Events**: None

---

## src/logic/beast_utils.cairo

### `get_level_from_xp`
- **Visibility**: pub
- **Signature**: `fn get_level_from_xp(xp: u32) -> u16`
- **Description**: Calculates level from XP using square root. Returns minimum 1.
- **Storage Access**: No
- **Events**: None
- **Notes**: Uses core `Sqrt` trait

### `can_gain_xp`
- **Visibility**: pub
- **Signature**: `fn can_gain_xp(base_level: u16, bonus_xp: u16, max_bonus_levels: u16) -> bool`
- **Description**: Checks if beast can still gain XP based on max bonus levels cap.
- **Storage Access**: No
- **Events**: None
- **Notes**: Uses u32 to prevent overflow

### `calculate_xp_gain`
- **Visibility**: pub
- **Signature**: `fn calculate_xp_gain(attack_streak: u8, beast_can_get_xp: bool) -> u16`
- **Description**: Calculates XP gain from an attack (base 10 + streak bonus).
- **Storage Access**: No
- **Events**: None

### `update_attack_streak`
- **Visibility**: pub
- **Signature**: `fn update_attack_streak(current_streak: u8, last_death_timestamp: u64, current_timestamp: u64, max_streak: u8) -> u8`
- **Description**: Updates attack streak, resetting if too much time has passed.
- **Storage Access**: No
- **Events**: None

### `is_beast_stronger`
- **Visibility**: pub
- **Signature**: `fn is_beast_stronger(beast1_summit_held_seconds: u32, beast1_bonus_xp: u16, beast1_last_death: u64, beast2_summit_held_seconds: u32, beast2_bonus_xp: u16, beast2_last_death: u64) -> bool`
- **Description**: Compares beasts for leaderboard ranking (blocks > XP > death timestamp).
- **Storage Access**: No
- **Events**: None

### `get_specials_hash`
- **Visibility**: pub
- **Signature**: `fn get_specials_hash(prefix: u8, suffix: u8) -> felt252`
- **Description**: Generates Poseidon hash for diplomacy grouping.
- **Storage Access**: No
- **Events**: None

### `calculate_upgrade_cost`
- **Visibility**: pub
- **Signature**: `fn calculate_upgrade_cost(enable_specials: bool, enable_wisdom: bool, enable_diplomacy: bool, spirit_points: u8, luck_points: u8) -> u16`
- **Description**: Calculates total skull tokens required for upgrades.
- **Storage Access**: No
- **Events**: None

---

## src/logic/poison.cairo

### `calculate_poison_damage`
- **Visibility**: pub
- **Signature**: `fn calculate_poison_damage(current_health: u16, extra_lives: u16, base_health: u16, bonus_health: u16, poison_count: u16, time_since_poison: u64) -> PoisonResult`
- **Description**: Calculates poison damage and resulting beast state. Uses extra lives if damage exceeds health. Never kills outright (leaves 1 HP minimum).
- **Storage Access**: No
- **Events**: None
- **Notes**: Complex damage overflow handling with extra life consumption

---

## src/logic/revival.cairo

### `calculate_revival_potions`
- **Visibility**: pub
- **Signature**: `fn calculate_revival_potions(last_death_timestamp: u64, current_timestamp: u64, revival_count: u8, spirit_reduction: u64) -> u16`
- **Description**: Calculates revival potions required to attack. Cost increases with each revival.
- **Storage Access**: No
- **Events**: None

### `is_killed_recently`
- **Visibility**: pub
- **Signature**: `fn is_killed_recently(last_killed_timestamp: u64, current_timestamp: u64, cooldown_seconds: u64) -> bool`
- **Description**: Checks if beast was killed too recently in death mountain.
- **Storage Access**: No
- **Events**: None

### `increment_revival_count`
- **Visibility**: pub
- **Signature**: `fn increment_revival_count(current_count: u8, max_count: u8) -> u8`
- **Description**: Increments revival count, capping at max.
- **Storage Access**: No
- **Events**: None

---

## src/logic/rewards.cairo

### `calculate_summit_held_seconds`
- **Visibility**: pub
- **Signature**: `fn calculate_summit_held_seconds(taken_at: u64, current_block: u64, terminal_block: u64) -> u64`
- **Description**: Calculates blocks held on summit, capped at terminal block.
- **Storage Access**: No
- **Events**: None

### `calculate_summit_rewards`
- **Visibility**: pub
- **Signature**: `fn calculate_summit_rewards(blocks_on_summit: u64, total_reward_amount: u128, summit_duration_blocks: u64, diplomacy_count: u8) -> RewardDistribution`
- **Description**: Calculates reward distribution between summit holder and diplomacy beasts (1% each).
- **Storage Access**: No
- **Events**: None

### `get_potion_amount`
- **Visibility**: pub
- **Signature**: `fn get_potion_amount(beast_id: u8) -> u8`
- **Description**: Gets potion claim amount by beast tier (T1=5, T2=4, T3=3, T4=2, T5=1).
- **Storage Access**: No
- **Events**: None
- **Notes**: Complex if/else chain for tier determination

### `calculate_diplomacy_bonus`
- **Visibility**: pub
- **Signature**: `fn calculate_diplomacy_bonus(ally_powers: Span<u16>) -> u8`
- **Description**: Calculates diplomacy bonus from ally powers (sum/250). Excludes self (first element).
- **Storage Access**: No
- **Events**: None

### `calculate_total_diplomacy_power`
- **Visibility**: pub
- **Signature**: `fn calculate_total_diplomacy_power(ally_powers: Span<u16>) -> u32`
- **Description**: Sums all ally powers for event emission.
- **Storage Access**: No
- **Events**: None
- **Notes**: Uses u32 to prevent overflow

---

## src/models/beast.cairo

### `PackableLiveStatsStorePacking::pack`
- **Visibility**: pub impl
- **Signature**: `fn pack(value: LiveBeastStats) -> felt252`
- **Description**: Packs LiveBeastStats into a single felt252 for storage.
- **Storage Access**: No (storage packing helper)
- **Events**: None
- **Notes**: Uses bit manipulation with power-of-2 constants. 180 bits total.

### `PackableLiveStatsStorePacking::unpack`
- **Visibility**: pub impl
- **Signature**: `fn unpack(value: felt252) -> LiveBeastStats`
- **Description**: Unpacks felt252 back into LiveBeastStats struct.
- **Storage Access**: No (storage packing helper)
- **Events**: None
- **Notes**: Uses division and modulo with power-of-2 constants

### `BeastUtilsImpl::crit_chance`
- **Visibility**: pub (via generate_trait)
- **Signature**: `fn crit_chance(self: Beast) -> u8`
- **Description**: Calculates critical hit chance from luck stat using tiered formula.
- **Storage Access**: No
- **Events**: None
- **Notes**: 0-5 luck has lookup table, 6-70 linear, 71+ slower scaling

### `BeastUtilsImpl::spirit_reduction`
- **Visibility**: pub (via generate_trait)
- **Signature**: `fn spirit_reduction(self: Beast) -> u64`
- **Description**: Calculates revival time reduction from spirit stat.
- **Storage Access**: No
- **Events**: None
- **Notes**: 0-5 spirit has lookup table, 6-70 linear, 71+ slower scaling

---

## src/utils.cairo

### `felt_to_u32`
- **Visibility**: pub
- **Signature**: `fn felt_to_u32(value: felt252) -> u32`
- **Description**: Converts felt252 to u32, taking lower 32 bits.
- **Storage Access**: No
- **Events**: None

### `u32_to_u8s`
- **Visibility**: pub
- **Signature**: `fn u32_to_u8s(value: u32) -> (u8, u8, u8, u8)`
- **Description**: Splits u32 into four u8 values using DivRem.
- **Storage Access**: No
- **Events**: None

---

## src/vrf.cairo

### `VRFImpl::vrf_address`
- **Visibility**: pub (via generate_trait)
- **Signature**: `fn vrf_address() -> ContractAddress`
- **Description**: Returns hardcoded VRF provider contract address.
- **Storage Access**: No
- **Events**: None

### `VRFImpl::seed`
- **Visibility**: pub (via generate_trait)
- **Signature**: `fn seed() -> felt252`
- **Description**: Fetches random seed from VRF provider contract.
- **Storage Access**: No (external call)
- **Events**: None
- **Notes**: Makes external contract call

---

## src/systems/summit.cairo

### Contract Functions (ISummitSystem trait)

| Function | Visibility | Storage Access | Events |
|----------|------------|----------------|--------|
| `start_summit` | external | Write | No |
| `attack` | external | Read/Write | Yes (via dispatcher) |
| `feed` | external | Read/Write | Yes |
| `claim_starter_pack` | external | Read/Write | Yes |
| `add_extra_life` | external | Read/Write | Yes |
| `apply_stat_points` | external | Read/Write | Yes |
| `apply_poison` | external | Read/Write | Yes |
| `claim_summit` | external | Read/Write | No |
| `add_beast_to_leaderboard` | external | Read/Write | No |
| `distribute_beast_tokens` | external | Read/Write | No |
| `set_*` (12 functions) | external | Write | No |
| `get_*` (20+ functions) | view | Read | No |

### Internal Functions (InternalSummitImpl)

| Function | Description | Storage | Notes |
|----------|-------------|---------|-------|
| `_summit_playable` | Checks if summit is still active | Read | |
| `_get_beast` | Fetches beast from storage | Read | External call to beast NFT |
| `_save_beast` | Saves beast to storage + emits events | Write | Emits beast/diplomacy events |
| `get_combat_spec` | Wrapper for combat::build_combat_spec | No | |
| `_finalize_summit_history` | Calculates and distributes rewards | Read/Write | Complex reward logic |
| `_attack_summit` | Main attack loop | Read/Write | Most complex function |
| `_attack` | Single attack calculation | No | Mutates defender health |
| `_is_killed_recently_in_death_mountain` | Death mountain cooldown check | Read | External call |
| `_revival_potions_required` | Calculates revival cost | No | Calls pure functions |
| `_get_last_killed_timestamp` | Gets death mountain timestamp | Read | External call |
| `_beast_can_get_xp` | Wrapper for can_gain_xp | No | |
| `_use_extra_life` | Wrapper for combat::use_extra_life | No | |
| `_get_specials_hash` | Wrapper for beast_utils | No | |
| `_is_beast_stronger` | Wrapper for beast_utils | No | |
| `_get_battle_randomness` | Wrapper for combat | No | |
| `get_potion_amount` | Wrapper for rewards | No | |
| `_apply_poison_damage` | Applies poison and updates storage | Read/Write | |
| `_get_diplomacy_data` | Fetches all diplomacy beasts | Read | Loop over storage |
| `_get_diplomacy_bonus` | Calculates diplomacy defense bonus | Read | Loop over storage |
| `_reward_beast` | Emits reward event | Write | External event dispatcher |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Pure functions (no storage) | 28 |
| Functions with storage reads | 15 |
| Functions with storage writes | 12 |
| Functions emitting events | 8 |
| External contract calls | 6 |
| Total documented functions | 51 |

## High Gas-Cost Function Candidates

Based on complexity and operations:

1. **`PackableLiveStatsStorePacking::pack/unpack`** - 15 field bit operations each
2. **`_attack_summit`** - Main attack loop with many storage reads/writes
3. **`calculate_poison_damage`** - Complex overflow-safe arithmetic
4. **`get_potion_amount`** - Many conditional branches
5. **`crit_chance` / `spirit_reduction`** - Match expressions with fallback calculations
6. **`_get_diplomacy_bonus`** - Loop with external calls per iteration
7. **`get_battle_randomness`** - Poseidon hash computation
8. **`build_combat_spec`** - Multiple external trait calls
