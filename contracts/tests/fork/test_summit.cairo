use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_block_timestamp_global, start_cheat_caller_address,
    stop_cheat_block_timestamp_global, stop_cheat_caller_address,
};
use starknet::{ContractAddress, get_block_timestamp};
use summit::systems::summit::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait};
use crate::fixtures::addresses::{BEAST_WHALE, REAL_PLAYER, REWARD_ADDRESS, SUPER_BEAST_OWNER, whale_beast_token_ids};
use crate::fixtures::constants::SUPER_BEAST_TOKEN_ID;
use crate::helpers::deployment::{deploy_summit, deploy_summit_and_start, mock_erc20_burn_from, mock_erc20_transfer};

// ===========================================
// CORE ATTACK FUNCTIONS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_attack_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    assert(summit.get_summit_beast_token_id() == 60989, 'Wrong summit beast token id');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet_6704808")]
fn test_attack_stress() {
    let summit = deploy_summit_and_start();

    // Take the summit with SUPER_BEAST as its real owner
    start_cheat_caller_address(summit.contract_address, SUPER_BEAST_OWNER());
    let setup_beasts = array![(SUPER_BEAST_TOKEN_ID, 1_u16, 0_u8)].span();
    summit.attack(1, setup_beasts, 0, 0, false);
    assert(summit.get_summit_beast_token_id() == SUPER_BEAST_TOKEN_ID, 'SUPER_BEAST should be on summit');

    // Give it 100 extra lives
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);
    summit.add_extra_life(SUPER_BEAST_TOKEN_ID, 100);
    stop_cheat_caller_address(summit.contract_address);

    // Attacker owns 6288 beasts on mainnet - use 300 of them
    let token_ids = whale_beast_token_ids();

    // Build attacking beasts array: (token_id, attack_count, attack_potions)
    let mut attacking_beasts: Array<(u32, u16, u8)> = array![];
    let mut i: u32 = 0;
    while i < token_ids.len() {
        attacking_beasts.append((*token_ids.at(i), 1, 0));
        i += 1;
    }

    // Attack SUPER_BEAST with 300 beasts (no mocking needed - real mainnet ownership)
    // Use defending_beast_token_id=0 for unsafe mode (skips beasts killed recently in Death Mountain)
    start_cheat_caller_address(summit.contract_address, BEAST_WHALE());
    summit.attack(0, attacking_beasts.span(), 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Summit not started',))]
fn test_attack_summit_not_started() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(0, attacking_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Not token owner',))]
fn test_attack_not_beast_owner() {
    let summit = deploy_summit_and_start();

    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('attacking own beast',))]
fn test_attack_own_summit_beast() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    summit.attack(60989, attacking_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_attack_with_revival_potions() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_revive_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_attack_unsafe_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(0, attacking_beasts, 0, 0, true);

    assert(summit.get_summit_beast_token_id() == 60989, 'Wrong summit beast token id');
    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// BEAST MANAGEMENT FUNCTIONS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_feed_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    summit.feed(60989, 10);

    let beast = summit.get_beast(60989);
    assert(beast.live.bonus_health == 10, 'Bonus health not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('No amount to feed',))]
fn test_feed_zero_amount() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    summit.feed(60989, 0);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_add_extra_life_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    summit.add_extra_life(60989, 3);

    let beast = summit.get_beast(60989);
    assert(beast.live.extra_lives == 3, 'Extra lives not added');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('No extra lives',))]
fn test_add_extra_life_zero_potions() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    summit.add_extra_life(60989, 0);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Not summit beast',))]
fn test_add_extra_life_not_summit_beast() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    summit.add_extra_life(60989, 3);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// STAT AND ENHANCEMENT FUNCTIONS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_apply_stat_points_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 5, luck: 3 };

    summit.apply_stat_points(60989, stats);

    let beast = summit.get_beast(60989);
    assert(beast.live.stats.spirit == 5, 'Spirit not updated');
    assert(beast.live.stats.luck == 3, 'Luck not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_apply_stat_points_unlock_specials() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 1, wisdom: 0, diplomacy: 0, spirit: 0, luck: 0 };

    summit.apply_stat_points(60989, stats);

    let beast = summit.get_beast(60989);
    assert(beast.live.stats.specials == 1, 'Specials not unlocked');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('No upgrades chosen',))]
fn test_apply_stat_points_no_upgrades() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 0, luck: 0 };

    summit.apply_stat_points(60989, stats);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_apply_poison() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_poison_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    summit.apply_poison(60989, 5);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// SUMMIT AND LEADERBOARD FUNCTIONS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_start_summit() {
    let summit = deploy_summit();

    summit.start_summit();

    assert(summit.get_summit_beast_token_id() == 1, 'Summit not started');
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Summit already started',))]
fn test_start_summit_twice() {
    let summit = deploy_summit_and_start();

    summit.start_summit();
}

// ===========================================
// ADMIN FUNCTIONS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_set_start_timestamp() {
    // Deploy with a future start timestamp so we can modify it
    let contract = declare("summit_systems").unwrap().contract_class();
    let owner = REAL_PLAYER();
    let start_timestamp = 9999999999_u64; // Future timestamp
    let summit_duration_seconds = 1000000_u64;
    let summit_reward_amount_per_second = 0_u128;
    let diplomacy_reward_amount_per_second = 0_u128;
    let quest_rewards_total_amount = 100_u128;

    let mut calldata = array![];
    calldata.append(owner.into());
    calldata.append(start_timestamp.into());
    calldata.append(summit_duration_seconds.into());
    calldata.append(summit_reward_amount_per_second.into());
    calldata.append(diplomacy_reward_amount_per_second.into());
    calldata.append(quest_rewards_total_amount.into());
    calldata.append(crate::fixtures::addresses::DUNGEON_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::BEAST_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::BEAST_DATA_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::REWARD_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::ATTACK_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::REVIVE_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::EXTRA_LIFE_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::POISON_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::SKULL_TOKEN_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::CORPSE_TOKEN_ADDRESS().into());

    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    let summit = ISummitSystemDispatcher { contract_address };

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let new_timestamp = 9999999998_u64; // Still future but different
    summit.set_start_timestamp(new_timestamp);

    assert(summit.get_start_timestamp() == new_timestamp, 'Timestamp not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_withdraw_funds() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let token_address = REWARD_ADDRESS(); // Use existing token address
    let amount: u256 = 1000;
    mock_erc20_transfer(token_address, true);

    summit.withdraw_funds(token_address, amount);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// VIEW FUNCTIONS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_get_start_timestamp() {
    let summit = deploy_summit();
    let start_time = summit.get_start_timestamp();
    assert(start_time == 1000_u64, 'Wrong start timestamp');
}

#[test]
#[fork("mainnet")]
fn test_get_terminal_timestamp() {
    let summit = deploy_summit_and_start();
    let terminal_block = summit.get_terminal_timestamp();
    assert(terminal_block > 0, 'Terminal block not set');
}

#[test]
#[fork("mainnet")]
fn test_get_summit_data() {
    let summit = deploy_summit_and_start();
    let (beast, taken_at, _summit_owner, poison_count, _poison_timestamp, _specials_hash) = summit.get_summit_data();
    assert(beast.live.token_id == 1, 'Wrong summit beast');
    assert(taken_at > 0, 'Taken at not set');
    assert(poison_count == 0, 'Poison count should be 0');
}

#[test]
#[fork("mainnet")]
fn test_get_summit_beast() {
    let summit = deploy_summit_and_start();
    let beast = summit.get_summit_beast();
    assert(beast.live.token_id == 1, 'Wrong summit beast');
}

#[test]
#[fork("mainnet")]
fn test_get_beast() {
    let summit = deploy_summit();
    let beast = summit.get_beast(60989);
    assert(beast.live.token_id == 60989, 'Wrong beast token id');
}

#[test]
#[fork("mainnet")]
fn test_get_all_addresses() {
    let summit = deploy_summit();
    assert(summit.get_dungeon_address() == crate::fixtures::addresses::DUNGEON_ADDRESS(), 'Wrong dungeon address');
    assert(summit.get_beast_address() == crate::fixtures::addresses::BEAST_ADDRESS(), 'Wrong beast address');
    assert(
        summit.get_beast_data_address() == crate::fixtures::addresses::BEAST_DATA_ADDRESS(), 'Wrong beast data address',
    );
    assert(summit.get_reward_address() == REWARD_ADDRESS(), 'Wrong reward address');
}

// ===========================================
// ADDITIONAL ATTACK EDGE CASE TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_attack_with_attack_potions() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_attack_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 5)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_attack_with_extra_life_potions() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 10, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_attack_max_attack_potions() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_attack_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 255)].span();
    // 255 is the max u8 value - should work
    summit.attack(1, attacking_beasts, 0, 0, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Max 4000 extra lives',))]
fn test_attack_too_many_extra_life_potions() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 4001, false);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// ADDITIONAL ADMIN SETTER TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_set_attack_potion_address() {
    let summit = deploy_summit();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_attack_potion_address(new_address);

    assert(summit.get_attack_potion_address() == new_address, 'Address not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_attack_potion_address_non_owner() {
    let summit = deploy_summit();
    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_attack_potion_address(new_address);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_set_revive_potion_address() {
    let summit = deploy_summit();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_revive_potion_address(new_address);

    assert(summit.get_revive_potion_address() == new_address, 'Address not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_revive_potion_address_non_owner() {
    let summit = deploy_summit();
    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_revive_potion_address(new_address);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_set_poison_potion_address() {
    let summit = deploy_summit();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_poison_potion_address(new_address);

    assert(summit.get_poison_potion_address() == new_address, 'Address not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_poison_potion_address_non_owner() {
    let summit = deploy_summit();
    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_poison_potion_address(new_address);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_set_skull_token_address() {
    let summit = deploy_summit();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_skull_token_address(new_address);

    assert(summit.get_skull_token_address() == new_address, 'Address not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_skull_token_address_non_owner() {
    let summit = deploy_summit();
    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_skull_token_address(new_address);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_set_corpse_token_address() {
    let summit = deploy_summit();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_corpse_token_address(new_address);

    assert(summit.get_corpse_token_address() == new_address, 'Address not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_corpse_token_address_non_owner() {
    let summit = deploy_summit();
    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let new_address: ContractAddress = 0x999.try_into().unwrap();
    summit.set_corpse_token_address(new_address);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// ADDITIONAL STAT POINTS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_apply_stat_points_unlock_wisdom() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 1, diplomacy: 0, spirit: 0, luck: 0 };

    summit.apply_stat_points(60989, stats);

    let beast = summit.get_beast(60989);
    assert(beast.live.stats.wisdom == 1, 'Wisdom not unlocked');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_apply_stat_points_unlock_diplomacy() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 1, spirit: 0, luck: 0 };

    summit.apply_stat_points(60989, stats);

    let beast = summit.get_beast(60989);
    assert(beast.live.stats.diplomacy == 1, 'Diplomacy not unlocked');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Specials already unlocked',))]
fn test_apply_stat_points_unlock_specials_twice() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 1, wisdom: 0, diplomacy: 0, spirit: 0, luck: 0 };

    // First unlock
    summit.apply_stat_points(60989, stats);

    // Try to unlock again - should fail
    summit.apply_stat_points(60989, stats);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// ADDITIONAL FEED TESTS
// ===========================================

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('beast has max bonus health',))]
fn test_feed_beyond_max_bonus_health() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    // Feed to max (2000)
    summit.feed(60989, 2000);

    // Try to feed more - should fail
    summit.feed(60989, 1);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_feed_summit_beast() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    // First make beast #60989 the summit beast
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Now feed the summit beast
    summit.feed(60989, 10);

    let beast = summit.get_beast(60989);
    assert(beast.live.bonus_health == 10, 'Bonus health not updated');

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// ADDITIONAL GETTER TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_get_summit_duration_blocks() {
    let summit = deploy_summit();
    let duration = summit.get_summit_duration_seconds();
    assert(duration == 1000000_u64, 'Wrong summit duration');
}

#[test]
#[fork("mainnet")]
fn test_get_summit_reward_amount() {
    let summit = deploy_summit();
    let amount = summit.get_summit_reward_amount_per_second();
    assert(amount == 0, 'Wrong summit reward amount');
}

// ===========================================
// POISON EDGE CASE TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_apply_poison_multiple_times() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_poison_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Apply poison first time
    summit.apply_poison(60989, 5);

    // Apply poison again
    summit.apply_poison(60989, 3);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('No poison to apply',))]
fn test_apply_poison_zero_count() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    summit.apply_poison(60989, 0);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('can only attack beast on summit',))]
fn test_apply_poison_not_summit_beast() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    // Try to poison beast that's not on summit
    summit.apply_poison(60989, 5);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// EXTRA LIFE EDGE CASES
// ===========================================

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Max 4000 extra lives',))]
fn test_add_extra_life_too_many() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Try to add too many extra lives
    summit.add_extra_life(60989, 4001);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// ADDITIONAL STAT POINTS EDGE CASES
// ===========================================

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('beast has max attributes',))]
fn test_apply_stat_points_exceed_max_spirit() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    // Apply spirit to max (100)
    let stats1 = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 100, luck: 0 };
    summit.apply_stat_points(60989, stats1);

    // Try to add more - should fail
    let stats2 = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 1, luck: 0 };
    summit.apply_stat_points(60989, stats2);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('beast has max attributes',))]
fn test_apply_stat_points_exceed_max_luck() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    // Apply luck to max (100)
    let stats1 = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 0, luck: 100 };
    summit.apply_stat_points(60989, stats1);

    // Try to add more - should fail
    let stats2 = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 0, luck: 1 };
    summit.apply_stat_points(60989, stats2);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Wisdom already unlocked',))]
fn test_apply_stat_points_unlock_wisdom_twice() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 1, diplomacy: 0, spirit: 0, luck: 0 };

    // First unlock
    summit.apply_stat_points(60989, stats);

    // Try to unlock again
    summit.apply_stat_points(60989, stats);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Diplomacy already unlocked',))]
fn test_apply_stat_points_unlock_diplomacy_twice() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 1, spirit: 0, luck: 0 };

    // First unlock
    summit.apply_stat_points(60989, stats);

    // Try to unlock again
    summit.apply_stat_points(60989, stats);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// TARGETED EDGE CASE TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_attack_with_medium_potions() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    mock_erc20_burn_from(summit.get_attack_potion_address(), true);
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 100)].span();
    // Test with mid-range values
    summit.attack(1, attacking_beasts, 0, 500, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_attack_with_high_extra_lives() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    mock_erc20_burn_from(summit.get_attack_potion_address(), true);
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 50)].span();
    // Test near the 4000 limit
    summit.attack(1, attacking_beasts, 0, 3999, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_feed_mid_range_amount() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    summit.feed(60989, 1000);
    let beast = summit.get_beast(60989);
    assert(beast.live.bonus_health == 1000, 'Bonus health should be 1000');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_apply_stat_points_spirit_only() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 50, luck: 0 };
    summit.apply_stat_points(60989, stats);

    let beast = summit.get_beast(60989);
    assert(beast.live.stats.spirit == 50, 'Spirit should be 50');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_apply_stat_points_luck_only() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 0, luck: 75 };
    summit.apply_stat_points(60989, stats);

    let beast = summit.get_beast(60989);
    assert(beast.live.stats.luck == 75, 'Luck should be 75');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_apply_stat_points_max_values() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 100, luck: 100 };
    summit.apply_stat_points(60989, stats);

    let beast = summit.get_beast(60989);
    assert(beast.live.stats.spirit == 100, 'Spirit should be 100');
    assert(beast.live.stats.luck == 100, 'Luck should be 100');

    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// DIRECT STORAGE ACCESS TESTS
// ==========================

#[test]
#[fork("mainnet")]
fn test_attack_with_vrf() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_attack_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();

    // Attack with VRF enabled
    summit.attack(1, attacking_beasts, 0, 0, true);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_multiple_beasts_attack_summit() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_attack_potion_address(), true);

    // Attack with multiple beasts
    let attacking_beasts = array![(60989, 1, 0), (4689, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_feed_max_bonus_health() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    // Feed to max bonus health (2000)
    summit.feed(60989, 2000);

    let beast = summit.get_beast(60989);
    assert(beast.live.bonus_health == 2000, 'Max bonus health not set');

    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// ADDITIONAL ADMIN TESTS
// ==========================

#[test]
#[fork("mainnet")]
fn test_set_extra_life_potion_address() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let new_address: ContractAddress = 0xFED.try_into().unwrap();
    summit.set_extra_life_potion_address(new_address);

    assert(summit.get_extra_life_potion_address() == new_address, 'Extra life addr not set');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_extra_life_potion_address_non_owner() {
    let summit = deploy_summit();

    let new_address: ContractAddress = 0xFED.try_into().unwrap();
    summit.set_extra_life_potion_address(new_address);
}

// ==========================
// P0 TESTS: FUNDS CUSTODY
// ==========================

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_withdraw_funds_non_owner() {
    let summit = deploy_summit();

    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let token_address = REWARD_ADDRESS();
    let amount: u256 = 1000;
    summit.withdraw_funds(token_address, amount);

    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// P0 TESTS: ACCESS CONTROL
// ==========================

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_start_timestamp_non_owner() {
    // Deploy with future start timestamp
    let contract = declare("summit_systems").unwrap().contract_class();
    let owner = REAL_PLAYER();
    let start_timestamp = 9999999999_u64;
    let summit_duration_seconds = 1000000_u64;
    let summit_reward_amount_per_second = 0_u128;
    let diplomacy_reward_amount_per_second = 0_u128;
    let quest_rewards_total_amount = 100_u128;

    let mut calldata = array![];
    calldata.append(owner.into());
    calldata.append(start_timestamp.into());
    calldata.append(summit_duration_seconds.into());
    calldata.append(summit_reward_amount_per_second.into());
    calldata.append(diplomacy_reward_amount_per_second.into());
    calldata.append(quest_rewards_total_amount.into());
    calldata.append(crate::fixtures::addresses::DUNGEON_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::BEAST_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::BEAST_DATA_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::REWARD_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::ATTACK_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::REVIVE_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::EXTRA_LIFE_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::POISON_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::SKULL_TOKEN_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::CORPSE_TOKEN_ADDRESS().into());

    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    let summit = ISummitSystemDispatcher { contract_address };

    // Try to set timestamp as non-owner
    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);
    summit.set_start_timestamp(1000_u64);
    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// P0 TESTS: COMBAT LOGIC
// ==========================

#[test]
#[fork("mainnet")]
fn test_attack_defender_uses_extra_lives() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);
    mock_erc20_burn_from(summit.get_attack_potion_address(), true);

    // First take the summit with beast 60989
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Add extra lives to the summit beast
    summit.add_extra_life(60989, 5);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('can only attack beast on summit',))]
fn test_attack_wrong_defender_id() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    // Pass wrong defending beast ID (999 instead of 1)
    summit.attack(999, attacking_beasts, 0, 0, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Unused revival potions',))]
fn test_attack_unused_revival_potions() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_revive_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    // Pass revival potions when beast is alive (doesn't need them)
    summit.attack(1, attacking_beasts, 5, 0, false);

    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// P0 TESTS: STATE CONSISTENCY
// ==========================

#[test]
#[fork("mainnet")]
fn test_summit_beast_can_be_attacked() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    // Attack with beast 60989 to take the summit
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Verify beast is now on summit
    let summit_beast_id = summit.get_summit_beast_token_id();
    assert(summit_beast_id == 60989, 'Beast should be on summit');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_summit_not_started_returns_zero_beast_id() {
    let summit = deploy_summit();
    let beast_id = summit.get_summit_beast_token_id();
    assert(beast_id == 0, 'Should be 0 before start');
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Summit not playable',))]
fn test_attack_reverts_after_terminal_timestamp() {
    let summit = deploy_summit_and_start();
    let terminal_timestamp = summit.get_terminal_timestamp();

    start_cheat_block_timestamp_global(terminal_timestamp + 1);
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
}

#[test]
#[fork("mainnet")]
fn test_diplomacy_rewards_are_clamped_to_total_reward() {
    let contract = declare("summit_systems").unwrap().contract_class();
    let owner = REAL_PLAYER();
    let start_timestamp = 1000_u64;
    let summit_duration_seconds = 1000000_u64;
    let summit_reward_amount_per_second = 100_000_000_000_000_u128;
    let diplomacy_reward_amount_per_second = 200_000_000_000_000_u128;
    let quest_rewards_total_amount = 100_u128;

    let mut calldata = array![];
    calldata.append(owner.into());
    calldata.append(start_timestamp.into());
    calldata.append(summit_duration_seconds.into());
    calldata.append(summit_reward_amount_per_second.into());
    calldata.append(diplomacy_reward_amount_per_second.into());
    calldata.append(quest_rewards_total_amount.into());
    calldata.append(crate::fixtures::addresses::DUNGEON_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::BEAST_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::BEAST_DATA_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::REWARD_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::ATTACK_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::REVIVE_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::EXTRA_LIFE_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::POISON_POTION_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::SKULL_TOKEN_ADDRESS().into());
    calldata.append(crate::fixtures::addresses::CORPSE_TOKEN_ADDRESS().into());

    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    let summit = ISummitSystemDispatcher { contract_address };
    summit.start_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 1, spirit: 0, luck: 0 };
    summit.apply_stat_points(1, stats);

    start_cheat_block_timestamp_global(get_block_timestamp() + 1);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
    assert(summit.get_summit_beast_token_id() == 60989, 'Attack should still succeed');

    stop_cheat_block_timestamp_global();
    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// P1 TESTS: POISON MECHANICS
// ==========================

#[test]
#[fork("mainnet")]
fn test_poison_damage_over_time() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_poison_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Apply poison
    summit.apply_poison(60989, 10);

    // Advance timestamp to let poison deal damage
    start_cheat_block_timestamp_global(get_block_timestamp() + 100);

    // Apply more poison - this will trigger damage calculation
    summit.apply_poison(60989, 1);

    stop_cheat_block_timestamp_global();
    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// ADDITIONAL EDGE CASES
// ==========================

#[test]
#[fork("mainnet")]
fn test_attack_initializes_streak() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    // Attack to take empty summit - this initializes the streak
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Verify beast's attack_streak is within valid bounds
    let beast = summit.get_beast(60989);
    assert(beast.live.attack_streak <= 10, 'Streak should be within bounds');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_feed_increases_current_health_for_summit_beast() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    // First take the summit
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    let beast_before = summit.get_beast(60989);
    let health_before = beast_before.live.current_health;

    // Feed the summit beast
    summit.feed(60989, 50);

    let beast_after = summit.get_beast(60989);
    assert(beast_after.live.bonus_health == 50, 'Bonus health not set');
    assert(beast_after.live.current_health == health_before + 50, 'Current health not increased');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_feed_non_summit_beast_only_bonus_health() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    // Feed a beast that's not on summit (beast 1 is on summit, feed 60989)
    summit.feed(60989, 50);

    let beast = summit.get_beast(60989);
    assert(beast.live.bonus_health == 50, 'Bonus health not set');
    // Current health should not change for non-summit beasts
    assert(beast.live.current_health == 0, 'Current health should be 0');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_add_extra_life_applies_poison_first() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_poison_potion_address(), true);
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    // Take the summit
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Get beast health before poison
    let beast_before_poison = summit.get_beast(60989);
    let health_before = beast_before_poison.live.current_health;

    // Apply poison
    summit.apply_poison(60989, 5);

    // Advance time so poison will deal damage (5 poison * 10 seconds = 50 damage)
    start_cheat_block_timestamp_global(get_block_timestamp() + 10);

    // Add extra lives - this should apply poison damage first
    summit.add_extra_life(60989, 3);

    let beast = summit.get_beast(60989);
    assert(beast.live.extra_lives == 3, 'Extra lives not added');

    // Verify poison was applied (health should be reduced by poison damage)
    // poison_damage = time_since_poison * poison_count = 10 * 5 = 50
    assert(beast.live.current_health < health_before, 'Poison damage not applied');

    stop_cheat_block_timestamp_global();
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_add_extra_life_overflow_prevention() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    // Take the summit
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Add near-max extra lives
    summit.add_extra_life(60989, 3990);

    let beast = summit.get_beast(60989);
    assert(beast.live.extra_lives == 3990, 'Extra lives not set');

    // Try to add more - should cap at max (4000)
    summit.add_extra_life(60989, 20);

    let beast_after = summit.get_beast(60989);
    // Should only add 10 to reach 4000 cap
    assert(beast_after.live.extra_lives == 4000, 'Should cap at 4000');

    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// ADDITIONAL ADMIN TESTS
// ==========================

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Summit already started',))]
fn test_set_start_timestamp_after_summit_started() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    // Try to change start timestamp after summit started
    summit.set_start_timestamp(9999999999_u64);

    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// EXTRA LIVES EDGE CASE TESTS
// ==========================

#[test]
#[fork("mainnet")]
fn test_add_extra_lives_small_amount() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    summit.add_extra_life(60989, 10);
    let beast = summit.get_beast(60989);
    assert(beast.live.extra_lives == 10, 'Extra lives should be 10');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_add_extra_lives_medium_amount() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    summit.add_extra_life(60989, 500);
    let beast = summit.get_beast(60989);
    assert(beast.live.extra_lives == 500, 'Extra lives should be 500');

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_add_extra_lives_near_max() {
    let summit = deploy_summit_and_start();
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    summit.add_extra_life(60989, 3999);
    let beast = summit.get_beast(60989);
    assert(beast.live.extra_lives == 3999, 'Extra lives should be 3999');

    stop_cheat_caller_address(summit.contract_address);
}

// ==========================
// Gas benchmark test - Long battle with many loop iterations
// ==========================

#[test]
#[fork("mainnet")]
fn test_attack_long_battle_gas_benchmark() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);
    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    // Beast 1 is the initial summit beast (owned by someone else, not REAL_PLAYER)
    // This allows REAL_PLAYER to attack it

    // Step 1: Give the summit beast (beast 1) extra lives to prolong the battle
    // Using 50 extra lives for a long battle with many loop iterations
    summit.add_extra_life(1, 50);

    // Step 2: Give attacker (beast 60989) max bonus health so it survives counter-attacks
    summit.feed(60989, 2000);

    // Step 3: Attack beast 1 with beast 60989 (long battle due to extra lives)
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);

    // Beast 60989 should win and take the summit
    assert(summit.get_summit_beast_token_id() == 60989, 'Beast 60989 should win');

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// GAS BENCHMARK: Multiple attack iterations
// ===========================================

#[test]
#[fork("mainnet")]
fn test_attack_multi_iteration_gas_benchmark() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_revive_potion_address(), true);

    // Beast 1 is the initial summit beast
    // Attack with beast 60989 using 10 attack iterations
    // Each iteration creates the attacking beast, checks revival, runs battle loop
    let attacking_beasts = array![(60989, 10, 0)].span();
    summit.attack(0, attacking_beasts, 100, 0, false);

    stop_cheat_caller_address(summit.contract_address);
}
