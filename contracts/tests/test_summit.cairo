use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, mock_call, start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::ContractAddress;
use summit::systems::summit::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait};

// Real mainnet contract addresses
fn BEAST_ADDRESS() -> ContractAddress {
    0x046dA8955829ADF2bDa310099A0063451923f02E648cF25A1203aac6335CF0e4.try_into().unwrap()
}

fn REAL_PLAYER() -> ContractAddress {
    0x0689701974d95364aAd9C2306Bc322A40a27fb775b0C97733FD0e36E900b1878.try_into().unwrap()
}

fn ADVENTURER_ADDRESS() -> ContractAddress {
    0x3fc7ecd6d577daa1ee855a9fa13a914d01acda06715c9fc74f1ee1a5e346a01.try_into().unwrap()
}

fn DENSHOKAN_ADDRESS() -> ContractAddress {
    0x036017e69d21d6d8c13e266eabb73ef1f1d02722d86bdcabe5f168f8e549d3cd.try_into().unwrap()
}

fn DUNGEON_ADDRESS() -> ContractAddress {
    0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42.try_into().unwrap()
}

fn BEAST_DATA_ADDRESS() -> ContractAddress {
    0x74abc15c0ddef39bdf1ede2a643c07968d3ed5bacb0123db2d5b7154fbb35c7.try_into().unwrap()
}

fn REWARD_ADDRESS() -> ContractAddress {
    0x042DD777885AD2C116be96d4D634abC90A26A790ffB5871E037Dd5Ae7d2Ec86B.try_into().unwrap()
}

fn EVENT_ADDRESS() -> ContractAddress {
    0x0.try_into().unwrap()
}

// Deploy summit contract without starting it
fn deploy_summit() -> ISummitSystemDispatcher {
    let contract = declare("summit_systems").unwrap().contract_class();
    let owner = REAL_PLAYER();
    let start_timestamp = 1000_u64;
    let submission_blocks = 100_u64;

    let mut calldata = array![];
    calldata.append(owner.into());
    calldata.append(start_timestamp.into());
    calldata.append(submission_blocks.into());
    calldata.append(ADVENTURER_ADDRESS().into());
    calldata.append(DENSHOKAN_ADDRESS().into());
    calldata.append(DUNGEON_ADDRESS().into());
    calldata.append(BEAST_ADDRESS().into());
    calldata.append(BEAST_DATA_ADDRESS().into());
    calldata.append(REWARD_ADDRESS().into());

    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    let summit = ISummitSystemDispatcher { contract_address };

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.set_event_address(EVENT_ADDRESS());
    stop_cheat_caller_address(summit.contract_address);

    mock_summit_events();
    summit
}

// Deploy summit contract and start it (ready for attack testing)
fn deploy_summit_and_start() -> ISummitSystemDispatcher {
    let summit = deploy_summit();
    summit.start_summit();
    summit
}

fn mock_erc20_burn_from(token_address: ContractAddress, success: bool) {
    mock_call(token_address, selector!("burn_from"), success, 1000);
}

fn mock_erc20_mint(token_address: ContractAddress, success: bool) {
    mock_call(token_address, selector!("mint"), success, 1000);
}

fn mock_erc20_transfer(token_address: ContractAddress, success: bool) {
    mock_call(token_address, selector!("transfer"), success, 1000);
}

fn mock_summit_events() {
    mock_call(EVENT_ADDRESS(), selector!("emit_beast_event"), (), 1000);
    mock_call(EVENT_ADDRESS(), selector!("emit_diplomacy_event"), (), 1000);
    mock_call(EVENT_ADDRESS(), selector!("emit_corpse_reward_event"), (), 1000);
    mock_call(EVENT_ADDRESS(), selector!("emit_poison_event"), (), 1000);
    mock_call(EVENT_ADDRESS(), selector!("emit_battle_event"), (), 1000);
    mock_call(EVENT_ADDRESS(), selector!("emit_summit_event"), (), 1000);
    mock_call(EVENT_ADDRESS(), selector!("emit_reward_event"), (), 1000);
}

// ===========================================
// CORE ATTACK FUNCTIONS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_attack_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![60989].span();
    summit.attack(1, attacking_beasts, 0, 0, 0, false);

    assert(summit.get_summit_beast_token_id() == 60989, 'Wrong summit beast token id');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Summit not started',))]
fn test_attack_summit_not_started() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![60989].span();
    summit.attack(0, attacking_beasts, 0, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Not token owner',))]
fn test_attack_not_beast_owner() {
    let summit = deploy_summit_and_start();

    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let attacking_beasts = array![60989].span();
    summit.attack(1, attacking_beasts, 0, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('attacking own beast',))]
fn test_attack_own_summit_beast() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![60989].span();
    summit.attack(1, attacking_beasts, 0, 0, 0, false);

    summit.attack(60989, attacking_beasts, 0, 0, 0, false);
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_attack_with_revival_potions() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_revive_potion_address(), true);

    let attacking_beasts = array![60989].span();
    summit.attack(1, attacking_beasts, 0, 0, 0, false);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_attack_unsafe_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![60989].span();
    summit.attack_unsafe(attacking_beasts, 0, 0, 0);

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
#[should_panic(expected: ('Not token owner',))]
fn test_feed_not_owner() {
    let summit = deploy_summit_and_start();

    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    summit.feed(60989, 10);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_add_extra_life_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);

    let attacking_beasts = array![60989].span();
    summit.attack(1, attacking_beasts, 0, 0, 0, false);

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

    let attacking_beasts = array![60989].span();
    summit.attack(1, attacking_beasts, 0, 0, 0, false);

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
    mock_erc20_burn_from(summit.get_kill_token_address(), true);

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
    mock_erc20_burn_from(summit.get_kill_token_address(), true);

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

    let attacking_beasts = array![60989].span();
    summit.attack(1, attacking_beasts, 0, 0, 0, false);

    summit.apply_poison(60989, 5);

    stop_cheat_caller_address(summit.contract_address);
}

// ===========================================
// REWARD FUNCTIONS TESTS
// ===========================================

#[test]
#[fork("mainnet")]
fn test_claim_beast_reward_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_transfer(summit.get_attack_potion_address(), true);
    mock_erc20_transfer(summit.get_poison_potion_address(), true);
    mock_erc20_transfer(summit.get_revive_potion_address(), true);
    mock_erc20_transfer(summit.get_extra_life_potion_address(), true);
    mock_erc20_mint(summit.get_kill_token_address(), true);

    let beast_token_ids = array![60989].span();
    summit.claim_beast_reward(beast_token_ids);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
#[should_panic(expected: ('Not token owner',))]
fn test_claim_beast_reward_not_owner() {
    let summit = deploy_summit_and_start();

    let fake_owner: ContractAddress = 0x123.try_into().unwrap();
    start_cheat_caller_address(summit.contract_address, fake_owner);

    let beast_token_ids = array![60989].span();
    summit.claim_beast_reward(beast_token_ids);

    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_claim_corpse_reward_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    mock_erc20_mint(summit.get_corpse_token_address(), true);

    // Mock the adventurer system calls to return proper data
    mock_call(ADVENTURER_ADDRESS(), selector!("get_adventurer_dungeon"), DUNGEON_ADDRESS(), 1000);
    mock_call(ADVENTURER_ADDRESS(), selector!("get_adventurer_level"), 10, 1000);
    mock_call(DENSHOKAN_ADDRESS(), selector!("owner_of"), REAL_PLAYER(), 1000);

    let adventurer_ids = array![1].span();
    summit.claim_corpse_reward(adventurer_ids);

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

#[test]
#[fork("mainnet")]
fn test_claim_summit_basic() {
    let summit = deploy_summit_and_start();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let attacking_beasts = array![60989].span();
    summit.attack(1, attacking_beasts, 0, 0, 0, false);

    stop_cheat_caller_address(summit.contract_address);
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
    let submission_blocks = 100_u64;

    let mut calldata = array![];
    calldata.append(owner.into());
    calldata.append(start_timestamp.into());
    calldata.append(submission_blocks.into());
    calldata.append(ADVENTURER_ADDRESS().into());
    calldata.append(DENSHOKAN_ADDRESS().into());
    calldata.append(DUNGEON_ADDRESS().into());
    calldata.append(BEAST_ADDRESS().into());
    calldata.append(BEAST_DATA_ADDRESS().into());
    calldata.append(REWARD_ADDRESS().into());

    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    let summit = ISummitSystemDispatcher { contract_address };

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());
    summit.set_event_address(EVENT_ADDRESS());
    mock_summit_events();

    let new_timestamp = 9999999998_u64; // Still future but different
    summit.set_start_timestamp(new_timestamp);

    assert(summit.get_start_timestamp() == new_timestamp, 'Timestamp not updated');
    stop_cheat_caller_address(summit.contract_address);
}

#[test]
#[fork("mainnet")]
fn test_set_event_address() {
    let summit = deploy_summit();

    start_cheat_caller_address(summit.contract_address, REAL_PLAYER());

    let new_address: ContractAddress = 0x456.try_into().unwrap();
    summit.set_event_address(new_address);

    assert(summit.get_event_address() == new_address, 'Event address not updated');
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
fn test_get_terminal_block() {
    let summit = deploy_summit_and_start();
    let terminal_block = summit.get_terminal_block();
    assert(terminal_block > 0, 'Terminal block not set');
}

#[test]
#[fork("mainnet")]
fn test_get_submission_blocks() {
    let summit = deploy_summit();
    let submission_blocks = summit.get_submission_blocks();
    assert(submission_blocks == 100_u64, 'Wrong submission blocks');
}

#[test]
#[fork("mainnet")]
fn test_get_summit_claimed() {
    let summit = deploy_summit();
    let claimed = summit.get_summit_claimed();
    assert(claimed == false, 'Summit should not be claimed');
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

    assert(summit.get_adventurer_address() == ADVENTURER_ADDRESS(), 'Wrong adventurer address');
    assert(summit.get_denshokan_address() == DENSHOKAN_ADDRESS(), 'Wrong denshokan address');
    assert(summit.get_dungeon_address() == DUNGEON_ADDRESS(), 'Wrong dungeon address');
    assert(summit.get_beast_address() == BEAST_ADDRESS(), 'Wrong beast address');
    assert(summit.get_beast_data_address() == BEAST_DATA_ADDRESS(), 'Wrong beast data address');
    assert(summit.get_reward_address() == REWARD_ADDRESS(), 'Wrong reward address');
}
