use core::hash::HashStateTrait;
use core::poseidon::PoseidonTrait;
use death_mountain_beast::beast::ImplBeast;
use death_mountain_combat::combat::{CombatSpec, ImplCombat, SpecialPowers};
use summit::logic::beast_utils::get_level_from_xp;
use summit::utils::{felt_to_u32, u32_to_u8s};

/// Build a CombatSpec from beast attributes
/// @param beast_id The beast's type ID (1-75)
/// @param base_level The beast's base level from NFT
/// @param prefix The beast's prefix special
/// @param suffix The beast's suffix special
/// @param bonus_xp The beast's accumulated bonus XP
/// @param include_specials Whether to include special powers in combat
/// @return CombatSpec for use in damage calculations
#[inline(always)]
pub fn build_combat_spec(
    beast_id: u8, base_level: u16, prefix: u8, suffix: u8, bonus_xp: u16, include_specials: bool,
) -> CombatSpec {
    let beast_tier = ImplBeast::get_tier(beast_id);
    let beast_type = ImplBeast::get_type(beast_id);

    // Calculate effective XP: base_level^2 + bonus_xp
    // Use u64 to prevent overflow: 65535^2 + 65535 can exceed u32::max
    let base_xp: u64 = base_level.into() * base_level.into();
    let total_xp: u64 = base_xp + bonus_xp.into();
    // Cap at u32::max for level calculation
    let beast_xp: u32 = if total_xp > 0xFFFFFFFF {
        0xFFFFFFFF
    } else {
        total_xp.try_into().unwrap()
    };
    let level = get_level_from_xp(beast_xp);

    let specials = if include_specials {
        SpecialPowers { special1: 0, special2: prefix, special3: suffix }
    } else {
        SpecialPowers { special1: 0, special2: 0, special3: 0 }
    };

    CombatSpec { tier: beast_tier, item_type: beast_type, level, specials }
}

/// Apply damage to a health value, flooring at 0
/// @param current_health Current health
/// @param damage Damage to apply
/// @return New health (minimum 0)
#[inline(always)]
pub fn apply_damage(current_health: u16, damage: u16) -> u16 {
    if damage >= current_health {
        0
    } else {
        current_health - damage
    }
}

/// Use an extra life if the beast is dead
/// @param current_health Current health (check if 0)
/// @param extra_lives Number of extra lives available
/// @param base_health Beast's base health from NFT
/// @param bonus_health Beast's accumulated bonus health
/// @return (new_health, new_extra_lives)
#[inline(always)]
pub fn use_extra_life(current_health: u16, extra_lives: u16, base_health: u16, bonus_health: u16) -> (u16, u16) {
    if current_health == 0 && extra_lives > 0 {
        let full_health = base_health + bonus_health;
        (full_health, extra_lives - 1)
    } else {
        (current_health, extra_lives)
    }
}

/// Generate battle randomness from hash inputs
/// Optimized: Uses PoseidonTrait chaining instead of array allocation
/// @param token_id The attacking beast's token ID
/// @param seed VRF seed (0 if VRF disabled)
/// @param last_death_timestamp Attacker's last death timestamp
/// @param battle_counter Current battle round counter
/// @return Four random u8 values for battle calculations
pub fn get_battle_randomness(
    token_id: u32, seed: felt252, last_death_timestamp: u64, battle_counter: u32,
) -> (u8, u8, u8, u8) {
    if seed == 0 {
        return (0, 0, 0, 0);
    }

    let token_id_felt: felt252 = token_id.into();
    let timestamp_felt: felt252 = last_death_timestamp.into();
    let counter_felt: felt252 = battle_counter.into();

    let poseidon = PoseidonTrait::new()
        .update(token_id_felt)
        .update(seed)
        .update(timestamp_felt)
        .update(counter_felt)
        .finalize();

    let rnd1_u64 = felt_to_u32(poseidon);
    u32_to_u8s(rnd1_u64)
}

/// Get the attack power of a beast (used for diplomacy calculations)
/// @param combat_spec The beast's CombatSpec
/// @return Attack HP value
#[inline(always)]
pub fn get_attack_power(combat_spec: CombatSpec) -> u16 {
    ImplCombat::get_attack_hp(combat_spec)
}
