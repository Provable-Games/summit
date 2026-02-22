/// Packed poison state: timestamp (64 bits) | count (16 bits)
/// Total: 80 bits - fits in a single felt252
#[derive(Drop, Copy)]
pub struct PoisonState {
    pub timestamp: u64,
    pub count: u16,
}

// Bit shift constants for packing
const TWO_POW_16: felt252 = 0x10000; // 2^16

/// Pack poison state into a single felt252
/// Layout: [timestamp (64 bits)][count (16 bits)]
#[inline(always)]
pub fn pack_poison_state(timestamp: u64, count: u16) -> felt252 {
    let timestamp_felt: felt252 = timestamp.into();
    let count_felt: felt252 = count.into();
    timestamp_felt * TWO_POW_16 + count_felt
}

/// Unpack poison state from a single felt252
/// @return (timestamp, count)
#[inline(always)]
pub fn unpack_poison_state(packed: felt252) -> (u64, u16) {
    let packed_u256: u256 = packed.into();
    let count: u16 = (packed_u256 & 0xFFFF).try_into().unwrap();
    let timestamp: u64 = ((packed_u256 / 0x10000) & 0xFFFFFFFFFFFFFFFF).try_into().unwrap();
    (timestamp, count)
}

/// Result of poison damage calculation
#[derive(Drop, Copy)]
pub struct PoisonResult {
    /// Total damage dealt by poison
    pub damage: u64,
    /// Beast's new health after poison
    pub new_health: u16,
    /// Beast's remaining extra lives after poison
    pub new_extra_lives: u16,
}

/// Calculate poison damage and resulting beast state
/// Poison deals damage = time_since_poison * poison_count per second
/// Damage is applied to current health, then extra lives if needed
/// Beast is never killed outright - always left with 1 HP minimum
///
/// @param current_health Beast's current health
/// @param extra_lives Beast's current extra lives
/// @param base_health Beast's base health from NFT
/// @param bonus_health Beast's accumulated bonus health
/// @param poison_count Number of poison stacks active
/// @param time_since_poison Seconds since poison was last applied
/// @return PoisonResult with damage and new beast state
pub fn calculate_poison_damage(
    current_health: u16,
    extra_lives: u16,
    base_health: u16,
    bonus_health: u16,
    poison_count: u16,
    time_since_poison: u64,
) -> PoisonResult {
    let damage: u64 = time_since_poison * poison_count.into();

    if damage == 0 {
        return PoisonResult { damage: 0, new_health: current_health, new_extra_lives: extra_lives };
    }

    let current_health_u64: u64 = current_health.into();
    let full_health: u64 = (base_health + bonus_health).into();

    // Case 1: Damage doesn't exceed current health
    if damage < current_health_u64 {
        let new_health: u16 = (current_health_u64 - damage).try_into().unwrap();
        return PoisonResult { damage, new_health, new_extra_lives: extra_lives };
    }

    // Case 2: Damage exceeds current health, need to use extra lives
    let extra_lives_u64: u64 = extra_lives.into();
    let total_pool: u64 = current_health_u64 + extra_lives_u64 * full_health;

    // Case 2a: Not enough total HP to absorb all damage
    if damage >= total_pool {
        return PoisonResult { damage, new_health: 1, new_extra_lives: 0 };
    }

    // Case 2b: Have enough HP pool
    let remaining: u64 = total_pool - damage;
    let new_extra_lives: u16 = ((remaining - 1) / full_health).try_into().unwrap();
    let new_health: u16 = (remaining - new_extra_lives.into() * full_health).try_into().unwrap();

    PoisonResult { damage, new_health, new_extra_lives }
}
