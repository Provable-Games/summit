use summit::constants::BASE_REVIVAL_TIME_SECONDS;

/// Calculate the number of revival potions required to revive a beast
/// Inlined for performance in attack loop
/// Revival potions are needed if:
/// 1. Time since death is less than BASE_REVIVAL_TIME_SECONDS
/// 2. After applying spirit reduction, still not enough time has passed
/// Cost increases with each revival (revival_count + 1)
///
/// @param last_death_timestamp When the beast last died
/// @param current_timestamp Current block timestamp
/// @param revival_count How many times beast has been revived (0-31)
/// @param spirit_reduction Seconds reduced from revival time due to spirit stat
/// @return Number of potions required (0 if beast can attack freely)
#[inline(always)]
pub fn calculate_revival_potions(
    last_death_timestamp: u64, current_timestamp: u64, revival_count: u8, spirit_reduction: u64,
) -> u16 {
    let time_since_death = current_timestamp - last_death_timestamp;

    // If enough time has passed naturally, no potions needed
    if time_since_death >= BASE_REVIVAL_TIME_SECONDS {
        return 0;
    }

    // Apply spirit reduction
    let effective_revival_time = if spirit_reduction >= BASE_REVIVAL_TIME_SECONDS {
        0
    } else {
        BASE_REVIVAL_TIME_SECONDS - spirit_reduction
    };

    // If spirit reduces revival time enough, no potions needed
    if time_since_death >= effective_revival_time {
        return 0;
    }

    // Potions required = revival_count + 1
    revival_count.into() + 1
}

/// Check if a beast was killed too recently in death mountain
/// Beasts killed in the last DAY_SECONDS cannot attack
///
/// @param last_killed_timestamp When the beast was last killed in death mountain
/// @param current_timestamp Current block timestamp
/// @param cooldown_seconds The cooldown period (typically DAY_SECONDS)
/// @return true if beast is still on cooldown
#[inline(always)]
pub fn is_killed_recently(last_killed_timestamp: u64, current_timestamp: u64, cooldown_seconds: u64) -> bool {
    last_killed_timestamp > current_timestamp - cooldown_seconds
}

/// Calculate the new revival count after a revival
/// Caps at MAX_REVIVAL_COUNT to prevent overflow
///
/// @param current_count Current revival count
/// @param max_count Maximum revival count (typically 31)
/// @return New revival count
#[inline(always)]
pub fn increment_revival_count(current_count: u8, max_count: u8) -> u8 {
    if current_count < max_count {
        current_count + 1
    } else {
        current_count
    }
}
