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
    let damage_after_current = damage - current_health_u64;

    // Calculate how many full lives worth of damage
    let lives_needed: u64 = if full_health > 0 {
        damage_after_current / full_health
    } else {
        0
    };

    let extra_lives_u64: u64 = extra_lives.into();

    // Case 2a: Not enough extra lives to absorb all damage
    if lives_needed >= extra_lives_u64 {
        return PoisonResult { damage, new_health: 1, // Never fully kill - leave at 1 HP
        new_extra_lives: 0 };
    }

    // Case 2b: Have enough extra lives
    let remaining_lives: u16 = (extra_lives_u64 - lives_needed).try_into().unwrap();
    let remaining_damage = damage_after_current - (lives_needed * full_health);
    let final_health = full_health - remaining_damage;

    let new_health: u16 = if final_health < 1 {
        1 // Never fully kill
    } else {
        final_health.try_into().unwrap()
    };

    PoisonResult { damage, new_health, new_extra_lives: remaining_lives }
}
