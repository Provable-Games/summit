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

/// Calculate damage for a single attack using the combat library
/// @param attacker_spec Attacker's CombatSpec
/// @param defender_spec Defender's CombatSpec
/// @param attack_potions Number of attack potions (adds to attacker strength)
/// @param defender_strength Defender's strength bonus (e.g., diplomacy bonus)
/// @param minimum_damage Minimum damage floor
/// @param critical_hit_chance Attacker's crit chance (0-100)
/// @param critical_hit_rnd Random value for crit determination
/// @return (total_damage, is_critical_hit)
pub fn calculate_attack_damage(
    attacker_spec: CombatSpec,
    defender_spec: CombatSpec,
    attack_potions: u8,
    defender_strength: u8,
    minimum_damage: u8,
    critical_hit_chance: u8,
    critical_hit_rnd: u8,
) -> (u16, bool) {
    let combat_result = ImplCombat::calculate_damage(
        attacker_spec,
        defender_spec,
        minimum_damage,
        attack_potions, // attacker_strength
        defender_strength,
        critical_hit_chance,
        critical_hit_rnd,
    );

    (combat_result.total_damage, combat_result.critical_hit_bonus > 0)
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
pub fn get_attack_power(combat_spec: CombatSpec) -> u16 {
    ImplCombat::get_attack_hp(combat_spec)
}

#[cfg(test)]
mod tests {
    use super::{apply_damage, build_combat_spec, get_battle_randomness, use_extra_life};

    #[test]
    #[available_gas(gas: 50000)]
    fn test_apply_damage_partial() {
        assert!(apply_damage(100, 30) == 70, "100 - 30 should equal 70");
    }

    #[test]
    #[available_gas(gas: 50000)]
    fn test_apply_damage_exact_kill() {
        assert!(apply_damage(100, 100) == 0, "100 - 100 should equal 0");
    }

    #[test]
    #[available_gas(gas: 50000)]
    fn test_apply_damage_overkill() {
        assert!(apply_damage(50, 100) == 0, "Overkill should floor at 0");
    }

    #[test]
    #[available_gas(gas: 50000)]
    fn test_apply_damage_zero() {
        assert!(apply_damage(100, 0) == 100, "0 damage should not change health");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_use_extra_life_triggers() {
        let (new_health, new_lives) = use_extra_life(0, 3, 50, 10);
        assert!(new_health == 60, "Should restore to full health (50 + 10)");
        assert!(new_lives == 2, "Should consume one extra life");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_use_extra_life_no_lives_left() {
        let (new_health, new_lives) = use_extra_life(0, 0, 50, 10);
        assert!(new_health == 0, "Should stay dead with no lives");
        assert!(new_lives == 0, "Should have no lives");
    }

    #[test]
    #[available_gas(gas: 60000)]
    fn test_use_extra_life_not_dead() {
        let (new_health, new_lives) = use_extra_life(50, 3, 50, 10);
        assert!(new_health == 50, "Should not use life if not dead");
        assert!(new_lives == 3, "Should not consume life if not dead");
    }

    #[test]
    #[available_gas(gas: 150000)]
    fn test_build_combat_spec_with_specials() {
        let spec = build_combat_spec(1, 10, 5, 3, 0, true);
        assert!(spec.specials.special2 == 5, "Should include prefix");
        assert!(spec.specials.special3 == 3, "Should include suffix");
    }

    #[test]
    #[available_gas(gas: 150000)]
    fn test_build_combat_spec_without_specials() {
        let spec = build_combat_spec(1, 10, 5, 3, 0, false);
        assert!(spec.specials.special2 == 0, "Should not include prefix");
        assert!(spec.specials.special3 == 0, "Should not include suffix");
    }

    #[test]
    #[available_gas(gas: 250000)]
    fn test_build_combat_spec_level_calculation() {
        // base_level=10, bonus_xp=0 => xp=100 => level=10
        let spec1 = build_combat_spec(1, 10, 0, 0, 0, false);
        assert!(spec1.level == 10, "Level should be 10 with 100 XP");

        // base_level=10, bonus_xp=21 => xp=121 => level=11
        let spec2 = build_combat_spec(1, 10, 0, 0, 21, false);
        assert!(spec2.level == 11, "Level should be 11 with 121 XP");
    }

    #[test]
    #[available_gas(gas: 50000)]
    fn test_get_battle_randomness_no_seed() {
        let (a, b, c, d) = get_battle_randomness(1, 0, 0, 0);
        assert!(a == 0 && b == 0 && c == 0 && d == 0, "Should return zeros with no seed");
    }

    #[test]
    #[available_gas(gas: 220000)]
    fn test_get_battle_randomness_deterministic() {
        let r1 = get_battle_randomness(1, 12345, 1000, 0);
        let r2 = get_battle_randomness(1, 12345, 1000, 0);
        assert!(r1 == r2, "Same inputs should produce same randomness");
    }

    #[test]
    #[available_gas(gas: 220000)]
    fn test_get_battle_randomness_different_counter() {
        let r1 = get_battle_randomness(1, 12345, 1000, 0);
        let r2 = get_battle_randomness(1, 12345, 1000, 1);
        assert!(r1 != r2, "Different counters should produce different randomness");
    }
}
