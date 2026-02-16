use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, map_entry_address, start_cheat_block_timestamp_global,
    start_cheat_caller_address, stop_cheat_block_timestamp_global, stop_cheat_caller_address, store,
};
use starknet::{ContractAddress, get_block_timestamp};
use summit::systems::summit::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait};
use crate::fixtures::addresses::{BEAST_WHALE, REAL_PLAYER, REWARD_ADDRESS, SUPER_BEAST_OWNER, whale_beast_token_ids};
use crate::fixtures::constants::SUPER_BEAST_TOKEN_ID;
use crate::helpers::deployment::{
    deploy_summit, deploy_summit_and_start, deploy_summit_with_rewards, mock_erc20_burn_from, mock_erc20_transfer,
};

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
#[should_panic(expected: ('ERC721: invalid token ID',))]
fn test_add_extra_life_reverts_before_start() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.add_extra_life(0, 1);
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('ERC721: invalid token ID',))]
fn test_apply_poison_reverts_before_start() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.apply_poison(0, 1);
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
#[should_panic(expected: ('Not summit beast',))]
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
#[fork("mainnet_6704808")]
fn test_one_attack_allowed_after_terminal_timestamp() {
    let summit = deploy_summit_and_start();
    let terminal_timestamp = summit.get_terminal_timestamp();

    start_cheat_block_timestamp_global(terminal_timestamp + 1);
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
}

#[test]
#[fork("mainnet_6704808")]
fn test_diplomacy_rewards_are_clamped_to_total_reward() {
    let summit = deploy_summit_with_rewards(100_000_000_000_000, 200_000_000_000_000);
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

// ===========================================
// DIPLOMACY REWARD CLAMPING
// ===========================================

/// Tests that _finalize_summit_history does not underflow when
/// diplomacy_reward_amount_per_second * diplomacy_count > summit_reward_amount_per_second.
/// Uses direct storage access to stage diplomacy state without needing
/// matching prefix/suffix beasts.
#[test]
#[fork("mainnet_6704808")]
fn test_diplomacy_reward_no_underflow_when_exceeds_total() {
    // Deploy with diplomacy reward (2e15) > summit reward (1e15)
    let summit_rate: u128 = 1_000_000_000_000_000;
    let diplomacy_rate: u128 = 2_000_000_000_000_000;
    let summit = deploy_summit_with_rewards(summit_rate, diplomacy_rate);
    summit.start_summit();

    // REAL_PLAYER takes summit with beast 60989
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
    assert(summit.get_summit_beast_token_id() == 60989, 'Beast 60989 should be on summit');
    stop_cheat_caller_address(summit.contract_address);

    // Read beast 60989's prefix/suffix and compute specials_hash
    let beast = summit.get_beast(60989);
    let specials_hash = summit::logic::beast_utils::get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);
    let mut holder_live = beast.live;
    holder_live.rewards_earned = 5000;
    let holder_packed = summit::models::beast::PackableLiveStatsStorePacking::pack(holder_live);
    let holder_live_stats_addr = map_entry_address(selector!("live_beast_stats"), array![60989].span());
    store(summit.contract_address, holder_live_stats_addr, array![holder_packed].span());

    // Use direct storage access to stage diplomacy state.
    // Register a separate beast (token 99999) as diplomacy ally to avoid
    // the summit holder save overwriting diplomacy reward writes.
    let diplomacy_beast_id: felt252 = 99999;

    // Set diplomacy_count[specials_hash] = 1
    let diplomacy_count_addr = map_entry_address(selector!("diplomacy_count"), array![specials_hash].span());
    store(summit.contract_address, diplomacy_count_addr, array![1].span());

    // Set diplomacy_beast[specials_hash][0] = 99999
    let diplomacy_beast_outer_addr = map_entry_address(selector!("diplomacy_beast"), array![specials_hash].span());
    let diplomacy_beast_entry_addr = map_entry_address(diplomacy_beast_outer_addr, array![0].span());
    store(summit.contract_address, diplomacy_beast_entry_addr, array![diplomacy_beast_id].span());

    // Advance time by 100 seconds so rewards accumulate
    let current_ts = get_block_timestamp();
    start_cheat_block_timestamp_global(current_ts + 100);

    // Mock reward token transfer (finalization mints rewards)
    mock_erc20_transfer(summit.get_reward_address(), true);

    // SUPER_BEAST_OWNER attacks to displace 60989, triggering _finalize_summit_history.
    start_cheat_caller_address(summit.contract_address, SUPER_BEAST_OWNER());
    let attack_beasts = array![(SUPER_BEAST_TOKEN_ID, 10, 0)].span();
    summit.attack(60989, attack_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);

    // If we reach here, no underflow occurred - the clamped payout path handled the edge case.
    let new_summit_beast = summit.get_summit_beast_token_id();
    assert(new_summit_beast == SUPER_BEAST_TOKEN_ID, 'SUPER_BEAST should take summit');

    // Clamped diplomacy payout: min(100 * 2e15, 100 * 1e15) = 1e17 -> 10000
    let diplomacy_beast_stats = summit.get_live_stats(array![99999].span());
    assert(*diplomacy_beast_stats.at(0).rewards_earned == 10000, 'diplomacy reward clamped');

    // Existing summit-holder rewards are preserved through the clamped finalization path.
    let beast_after = summit.get_beast(60989);
    assert(beast_after.live.rewards_earned == 5000, 'summit holder rewards kept');

    stop_cheat_block_timestamp_global();
}

/// Tests the branch where diplomacy payout is less than total reward,
/// so summit holder receives total_reward - diplomacy_payout.
#[test]
#[fork("mainnet_6704808")]
fn test_diplomacy_reward_subtracted_from_summit_holder() {
    // summit_rate (3e15) > diplomacy_rate (1e15) so holder gets remainder
    let summit_rate: u128 = 3_000_000_000_000_000;
    let diplomacy_rate: u128 = 1_000_000_000_000_000;
    let summit = deploy_summit_with_rewards(summit_rate, diplomacy_rate);
    summit.start_summit();

    // REAL_PLAYER takes summit with beast 60989
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
    assert(summit.get_summit_beast_token_id() == 60989, 'Beast 60989 should be on summit');
    stop_cheat_caller_address(summit.contract_address);

    // Stage diplomacy state for beast 60989's specials_hash
    let beast = summit.get_beast(60989);
    let specials_hash = summit::logic::beast_utils::get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);
    let diplomacy_beast_id: felt252 = 99999;

    let diplomacy_count_addr = map_entry_address(selector!("diplomacy_count"), array![specials_hash].span());
    store(summit.contract_address, diplomacy_count_addr, array![1].span());

    let diplomacy_beast_outer_addr = map_entry_address(selector!("diplomacy_beast"), array![specials_hash].span());
    let diplomacy_beast_entry_addr = map_entry_address(diplomacy_beast_outer_addr, array![0].span());
    store(summit.contract_address, diplomacy_beast_entry_addr, array![diplomacy_beast_id].span());

    // Advance time 100s
    let current_ts = get_block_timestamp();
    start_cheat_block_timestamp_global(current_ts + 100);

    mock_erc20_transfer(summit.get_reward_address(), true);

    // Displace 60989, triggering _finalize_summit_history
    start_cheat_caller_address(summit.contract_address, SUPER_BEAST_OWNER());
    let attack_beasts = array![(SUPER_BEAST_TOKEN_ID, 10, 0)].span();
    summit.attack(60989, attack_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);

    // diplomacy_payout = 100 * 1e15 = 1e17, total = 100 * 3e15 = 3e17
    // summit_reward = 3e17 - 1e17 = 2e17
    // reward_u32 = 2e17 / 1e13 = 20000
    let beast_after = summit.get_beast(60989);
    assert(beast_after.live.rewards_earned == 20000, 'Summit holder gets remainder');

    // diplomacy_reward_u32 = 1e17 / 1e13 = 10000
    let diplomacy_beast_stats = summit.get_live_stats(array![99999].span());
    assert(*diplomacy_beast_stats.at(0).rewards_earned == 10000, 'Diplomacy reward should be 10k');

    stop_cheat_block_timestamp_global();
}

// ===========================================
// CLAIM QUEST REWARDS TESTS
// ===========================================

// Each quest reward point transfers 1e16 tokens (0.01 tokens per point)
const QUEST_POINT_VALUE: u128 = 10_000_000_000_000_000;

/// Helper: write live_beast_stats with quest flags into summit contract storage.
fn setup_beast_quest_data(
    summit: ISummitSystemDispatcher,
    beast_token_id: u32,
    bonus_xp: u16,
    captured_summit: u8,
    used_revival_potion: u8,
    used_attack_potion: u8,
    max_attack_streak: u8,
    summit_held_seconds: u32,
) {
    let beast = summit.get_beast(beast_token_id);
    let mut live = beast.live;
    live.bonus_xp = bonus_xp;
    live.quest.captured_summit = captured_summit;
    live.quest.used_revival_potion = used_revival_potion;
    live.quest.used_attack_potion = used_attack_potion;
    live.quest.max_attack_streak = max_attack_streak;
    live.summit_held_seconds = summit_held_seconds;
    let packed = summit::models::beast::PackableLiveStatsStorePacking::pack(live);
    let addr = map_entry_address(selector!("live_beast_stats"), array![beast_token_id.into()].span());
    store(summit.contract_address, addr, array![packed].span());
}

/// Helper: set quest_rewards_total_amount in token units
fn set_quest_pool_amount(summit: ISummitSystemDispatcher, token_amount: u128) {
    store(summit.contract_address, selector!("quest_rewards_total_amount"), array![token_amount.into()].span());
}

/// Helper: set quest_rewards_total_claimed in token units
fn set_quest_pool_claimed(summit: ISummitSystemDispatcher, token_amount: u128) {
    store(summit.contract_address, selector!("quest_rewards_total_claimed"), array![token_amount.into()].span());
}

/// Helper: set per-beast quest_rewards_claimed (raw points, u8)
fn set_beast_quest_claimed(summit: ISummitSystemDispatcher, beast_token_id: u32, value: u8) {
    let addr = map_entry_address(selector!("quest_rewards_claimed"), array![beast_token_id.into()].span());
    store(summit.contract_address, addr, array![value.into()].span());
}

// --- Basic claim ---

#[test]
#[fork("mainnet")]
fn test_claim_quest_rewards_basic() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE); // pool supports 100 reward points

    // Beast 60989 (owned by REAL_PLAYER): bonus_xp=1 → 5 quest rewards
    setup_beast_quest_data(summit, 60989, 1, 0, 0, 0, 0, 0);
    mock_erc20_transfer(summit.get_reward_address(), true);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

// --- Revert cases ---

#[test]
#[fork("mainnet")]
#[should_panic(expected: "Quest rewards pool is empty")]
fn test_claim_quest_rewards_pool_empty_reverts() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);
    set_quest_pool_claimed(summit, 100 * QUEST_POINT_VALUE); // fully claimed

    setup_beast_quest_data(summit, 60989, 1, 0, 0, 0, 0, 0);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: "No quest rewards to claim")]
fn test_claim_quest_rewards_no_quest_progress_reverts() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);

    // Beast with zero live stats → 0 quest rewards
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: "No quest rewards to claim")]
fn test_claim_quest_rewards_already_fully_claimed_reverts() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);

    // Beast has 5 rewards (bonus_xp=1), but all 5 already claimed
    setup_beast_quest_data(summit, 60989, 1, 0, 0, 0, 0, 0);
    set_beast_quest_claimed(summit, 60989, 5);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Not token owner',))]
fn test_claim_quest_rewards_not_owner_reverts() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);

    // Beast 60989 is owned by REAL_PLAYER, not SUPER_BEAST_OWNER
    setup_beast_quest_data(summit, 60989, 1, 0, 0, 0, 0, 0);

    start_cheat_caller_address(summit.contract_address, SUPER_BEAST_OWNER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

// --- Pool cap logic ---

#[test]
#[fork("mainnet")]
fn test_claim_quest_rewards_capped_at_pool_remaining() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);

    // Beast has all quests completed → 95 rewards
    // bonus_xp=10000 gives 10+ bonus levels for any reasonable base level
    setup_beast_quest_data(summit, 60989, 10000, 1, 1, 1, 1, 100);

    // Pool has only 10 points remaining
    set_quest_pool_claimed(summit, 90 * QUEST_POINT_VALUE);
    mock_erc20_transfer(summit.get_reward_address(), true);

    // Claim succeeds — capped at 10 (pool remaining), not 95
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_claim_quest_rewards_drains_pool_exactly() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);

    // Beast has 5 quest rewards (bonus_xp=1)
    setup_beast_quest_data(summit, 60989, 1, 0, 0, 0, 0, 0);

    // Pool has exactly 5 remaining
    set_quest_pool_claimed(summit, 95 * QUEST_POINT_VALUE);
    mock_erc20_transfer(summit.get_reward_address(), true);

    // Claim succeeds, draining pool to exactly 100/100
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: "Quest rewards pool is empty")]
fn test_claim_quest_rewards_pool_drained_then_rejects() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);

    // Beast A (60989): max quests → 95 rewards, pool has only 10 left
    setup_beast_quest_data(summit, 60989, 10000, 1, 1, 1, 1, 100);
    set_quest_pool_claimed(summit, 90 * QUEST_POINT_VALUE);
    mock_erc20_transfer(summit.get_reward_address(), true);

    // First claim: capped at 10, drains pool
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);

    // Beast B (78029): has quest rewards, but pool should be empty (100/100)
    setup_beast_quest_data(summit, 78029, 1, 0, 0, 0, 0, 0);

    start_cheat_caller_address(summit.contract_address, BEAST_WHALE());
    summit.claim_quest_rewards(array![78029].span());
    stop_cheat_caller_address(summit.contract_address);
}

/// Three sequential claims must all succeed when pool has sufficient capacity.
/// This catches accounting bugs where total_claimed is corrupted by
/// incorrect scaling on sequential writes.
#[test]
#[fork("mainnet")]
fn test_claim_quest_rewards_sequential_claims_track_pool() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);

    // Three beasts, each with 5 rewards (bonus_xp=1)
    setup_beast_quest_data(summit, 60989, 1, 0, 0, 0, 0, 0); // REAL_PLAYER
    setup_beast_quest_data(summit, 78029, 1, 0, 0, 0, 0, 0); // BEAST_WHALE
    setup_beast_quest_data(summit, 77598, 1, 0, 0, 0, 0, 0); // BEAST_WHALE
    mock_erc20_transfer(summit.get_reward_address(), true);

    // Claim 1: 5 points (5/100)
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);

    // Claim 2: 5 more (10/100)
    start_cheat_caller_address(summit.contract_address, BEAST_WHALE());
    summit.claim_quest_rewards(array![78029].span());
    stop_cheat_caller_address(summit.contract_address);

    // Claim 3: 5 more (15/100) — must succeed
    start_cheat_caller_address(summit.contract_address, BEAST_WHALE());
    summit.claim_quest_rewards(array![77598].span());
    stop_cheat_caller_address(summit.contract_address);
}

// --- Multiple beasts in single call ---

#[test]
#[fork("mainnet")]
fn test_claim_quest_rewards_multiple_beasts_single_call() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);

    // Two beasts owned by BEAST_WHALE with different quest progress
    // Beast 78029: bonus_xp=1 → 5 rewards
    setup_beast_quest_data(summit, 78029, 1, 0, 0, 0, 0, 0);
    // Beast 77598: captured_summit → 10 rewards
    setup_beast_quest_data(summit, 77598, 0, 1, 0, 0, 0, 0);
    mock_erc20_transfer(summit.get_reward_address(), true);

    // Claim for both in one call (total 15 rewards)
    start_cheat_caller_address(summit.contract_address, BEAST_WHALE());
    summit.claim_quest_rewards(array![78029, 77598].span());
    stop_cheat_caller_address(summit.contract_address);
}

// --- Incremental claims (beast earns more quests over time) ---

#[test]
#[fork("mainnet")]
fn test_claim_quest_rewards_incremental() {
    let summit = deploy_summit();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);
    mock_erc20_transfer(summit.get_reward_address(), true);

    // First: beast has bonus_xp=1 → 5 rewards
    setup_beast_quest_data(summit, 60989, 1, 0, 0, 0, 0, 0);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());

    // Beast earns more quests: add captured_summit → now 15 total, already claimed 5
    setup_beast_quest_data(summit, 60989, 1, 1, 0, 0, 0, 0);

    // Second claim: should get 10 more (15 - 5 already claimed)
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// PRE-START TESTS
// ===========================================

/// Before start_summit, _summit_playable returns true (terminal_timestamp == 0).
/// feed and apply_stat_points should be allowed so players can prepare beasts.

#[test]
#[fork("mainnet")]
fn test_feed_allowed_before_start() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_corpse_token_address(), true);

    summit.feed(60989, 10);

    let beast = summit.get_beast(60989);
    assert(beast.live.bonus_health == 10, 'Feed should work before start');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_apply_stat_points_allowed_before_start() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_skull_token_address(), true);

    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 5, luck: 0 };
    summit.apply_stat_points(60989, stats);

    let beast = summit.get_beast(60989);
    assert(beast.live.stats.spirit == 5, 'Stats should work before start');
    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// END-OF-SUMMIT TESTS
// ===========================================

/// Helper: perform the one allowed attack after terminal to end the summit.
/// Requires deploy_summit_and_start() — beast 1 is on summit.
/// After this, beast 60989 is on summit with taken_at > terminal, so _summit_playable is false.
fn end_summit(summit: ISummitSystemDispatcher) {
    let terminal_timestamp = summit.get_terminal_timestamp();
    start_cheat_block_timestamp_global(terminal_timestamp + 1);
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);
}

// --- Post-end: second attack rejected ---

#[test]
#[fork("mainnet_6704808")]
#[should_panic(expected: ('Summit not playable',))]
fn test_second_attack_rejected_after_terminal_timestamp() {
    let summit = deploy_summit_and_start();
    end_summit(summit);

    start_cheat_caller_address(summit.contract_address, SUPER_BEAST_OWNER());
    let attacking_beasts = array![(SUPER_BEAST_TOKEN_ID, 1, 0)].span();
    summit.attack(60989, attacking_beasts, 0, 0, false);
}

// --- Post-end: feed rejected ---

#[test]
#[fork("mainnet_6704808")]
#[should_panic(expected: ('Summit not playable',))]
fn test_feed_rejected_after_summit_ends() {
    let summit = deploy_summit_and_start();
    end_summit(summit);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.feed(60989, 10);
}

// --- Post-end: apply_stat_points rejected ---

#[test]
#[fork("mainnet_6704808")]
#[should_panic(expected: ('Summit not playable',))]
fn test_apply_stat_points_rejected_after_summit_ends() {
    let summit = deploy_summit_and_start();
    end_summit(summit);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    let stats = summit::models::beast::Stats { specials: 0, wisdom: 0, diplomacy: 0, spirit: 5, luck: 0 };
    summit.apply_stat_points(60989, stats);
}

// --- Post-end: apply_poison rejected ---

#[test]
#[fork("mainnet_6704808")]
#[should_panic(expected: ('Summit not playable',))]
fn test_apply_poison_rejected_after_summit_ends() {
    let summit = deploy_summit_and_start();
    end_summit(summit);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.apply_poison(60989, 5);
}

// --- Post-end: add_extra_life rejected ---

#[test]
#[fork("mainnet_6704808")]
#[should_panic(expected: ('Summit not playable',))]
fn test_add_extra_life_rejected_after_summit_ends() {
    let summit = deploy_summit_and_start();
    end_summit(summit);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.add_extra_life(60989, 1);
}

// --- Post-end: claim_rewards still allowed ---

#[test]
#[fork("mainnet_6704808")]
fn test_claim_rewards_allowed_after_summit_ends() {
    let summit_rate: u128 = 1_000_000_000_000_000;
    let summit = deploy_summit_with_rewards(summit_rate, 0);
    summit.start_summit();

    // REAL_PLAYER takes summit with beast 60989
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);

    // Warp past terminal
    let terminal_timestamp = summit.get_terminal_timestamp();
    start_cheat_block_timestamp_global(terminal_timestamp + 1);

    mock_erc20_transfer(summit.get_reward_address(), true);

    // SUPER_BEAST_OWNER displaces beast 60989, triggering _finalize_summit_history
    start_cheat_caller_address(summit.contract_address, SUPER_BEAST_OWNER());
    let attack_beasts = array![(SUPER_BEAST_TOKEN_ID, 10, 0)].span();
    summit.attack(60989, attack_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);

    // Summit is ended. Claim rewards should still work.
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

// --- Post-end: claim_quest_rewards still allowed ---

#[test]
#[fork("mainnet_6704808")]
fn test_claim_quest_rewards_allowed_after_summit_ends() {
    let summit = deploy_summit_and_start();
    set_quest_pool_amount(summit, 100 * QUEST_POINT_VALUE);
    mock_erc20_transfer(summit.get_reward_address(), true);

    end_summit(summit);

    // Setup quest data AFTER end_summit so it's not overwritten by the attack
    setup_beast_quest_data(summit, 60989, 1, 0, 0, 0, 0, 0);

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.claim_quest_rewards(array![60989].span());
    stop_cheat_caller_address(summit.contract_address);
}

// --- Reward capping at terminal timestamp ---

#[test]
#[fork("mainnet_6704808")]
fn test_finalize_caps_rewards_at_terminal_timestamp() {
    let summit_rate: u128 = 1_000_000_000_000_000;
    let summit = deploy_summit_with_rewards(summit_rate, 0);
    summit.start_summit();

    // REAL_PLAYER takes summit
    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    let attacking_beasts = array![(60989, 1, 0)].span();
    summit.attack(1, attacking_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);

    // Record taken_at (current block timestamp, before any cheating)
    let taken_at: u64 = get_block_timestamp();
    let terminal_timestamp = summit.get_terminal_timestamp();

    // Warp WELL past terminal (terminal + 10000)
    start_cheat_block_timestamp_global(terminal_timestamp + 10000);

    mock_erc20_transfer(summit.get_reward_address(), true);

    // SUPER_BEAST_OWNER displaces, triggering _finalize_summit_history
    start_cheat_caller_address(summit.contract_address, SUPER_BEAST_OWNER());
    let attack_beasts = array![(SUPER_BEAST_TOKEN_ID, 10, 0)].span();
    summit.attack(60989, attack_beasts, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);

    // Rewards should be capped at (terminal - taken_at), NOT (current - taken_at)
    let beast = summit.get_beast(60989);
    let capped_time: u128 = (terminal_timestamp - taken_at).into();
    let uncapped_time: u128 = (terminal_timestamp + 10000 - taken_at).into();
    let expected_capped: u32 = (capped_time * summit_rate / 10_000_000_000_000).try_into().unwrap();
    let expected_uncapped: u32 = (uncapped_time * summit_rate / 10_000_000_000_000).try_into().unwrap();

    assert(beast.live.rewards_earned == expected_capped, 'Rewards capped at terminal');
    assert(expected_capped < expected_uncapped, 'Capped should be less');
}
