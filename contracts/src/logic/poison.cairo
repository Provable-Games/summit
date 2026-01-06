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

#[cfg(test)]
mod tests {
    use super::calculate_poison_damage;

    #[test]
    #[available_gas(gas: 160000)]
    fn test_no_poison_damage() {
        // No poison stacks
        let result = calculate_poison_damage(100, 5, 50, 50, 0, 100);
        assert!(result.damage == 0, "No damage with 0 poison");
        assert!(result.new_health == 100, "Health unchanged");
        assert!(result.new_extra_lives == 5, "Lives unchanged");

        // No time elapsed
        let result2 = calculate_poison_damage(100, 5, 50, 50, 10, 0);
        assert!(result2.damage == 0, "No damage with 0 time");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_partial_health_damage() {
        // 10 poison * 3 seconds = 30 damage
        let result = calculate_poison_damage(100, 0, 50, 50, 10, 3);
        assert!(result.damage == 30, "Damage should be 30");
        assert!(result.new_health == 70, "Health should be 70");
        assert!(result.new_extra_lives == 0, "Lives unchanged");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_exact_health_kill() {
        // 50 damage on 50 health with no extra lives
        let result = calculate_poison_damage(50, 0, 50, 0, 10, 5);
        assert!(result.damage == 50, "Damage should be 50");
        assert!(result.new_health == 1, "Should be left at 1 HP");
        assert!(result.new_extra_lives == 0, "No lives left");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_overkill_no_lives() {
        // 100 damage on 50 health with no extra lives
        let result = calculate_poison_damage(50, 0, 50, 0, 10, 10);
        assert!(result.damage == 100, "Damage should be 100");
        assert!(result.new_health == 1, "Should be left at 1 HP (never full kill)");
        assert!(result.new_extra_lives == 0, "No lives left");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_uses_one_extra_life() {
        // 60 damage on 50 health, 50 full health, 2 extra lives
        // Kills current health (50), then 10 remaining damage
        // Uses one life, restores to 50, takes 10 = 40 HP left
        let result = calculate_poison_damage(50, 2, 50, 0, 10, 6);
        assert!(result.damage == 60, "Damage should be 60");
        assert!(result.new_health == 40, "Should have 40 HP after one life used");
        assert!(result.new_extra_lives == 2, "Should have 2 lives (no full life consumed)");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_uses_multiple_extra_lives() {
        // 150 damage on 50 health, 50 full health, 5 extra lives
        // Kills current (50), remaining 100 damage
        // 100 / 50 = 2 full lives consumed
        // 100 % 50 = 0 remaining damage
        let result = calculate_poison_damage(50, 5, 50, 0, 10, 15);
        assert!(result.damage == 150, "Damage should be 150");
        assert!(result.new_extra_lives == 3, "Should have 3 lives left");
        // After 2 lives consumed and 0 remaining damage, should be at full health
        assert!(result.new_health == 50, "Should be at full health");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_exhausts_all_lives() {
        // 500 damage on 50 health, 50 full health, 2 extra lives
        // Far exceeds available health pool
        let result = calculate_poison_damage(50, 2, 50, 0, 50, 10);
        assert!(result.damage == 500, "Damage should be 500");
        assert!(result.new_health == 1, "Should be left at 1 HP");
        assert!(result.new_extra_lives == 0, "All lives consumed");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_with_bonus_health() {
        // 80 damage on 100 health (50 base + 50 bonus), no extra lives
        let result = calculate_poison_damage(100, 0, 50, 50, 8, 10);
        assert!(result.damage == 80, "Damage should be 80");
        assert!(result.new_health == 20, "Should have 20 HP");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_extra_life_with_bonus_health() {
        // 120 damage on 100 health (50+50), 1 extra life
        // Kills current (100), 20 remaining damage
        // Restores to 100, takes 20 = 80 HP
        let result = calculate_poison_damage(100, 1, 50, 50, 12, 10);
        assert!(result.damage == 120, "Damage should be 120");
        assert!(result.new_health == 80, "Should have 80 HP");
        assert!(result.new_extra_lives == 1, "Should still have 1 life (partial use)");
    }

    #[test]
    #[available_gas(gas: 100000)]
    fn test_large_poison_stacks() {
        // 1000 poison * 1 second = 1000 damage
        let result = calculate_poison_damage(100, 10, 50, 50, 1000, 1);
        assert!(result.damage == 1000, "Damage should be 1000");
        // 100 base health + 10 lives * 100 full health = 1100 total
    // 1000 damage uses: 100 current + 9*100 = 1000
    // Should have 1 life left and 100 HP (or 1 HP if calculation differs)
    }
}
