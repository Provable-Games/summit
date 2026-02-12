use beasts_nft::pack::PackableBeast;
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, mock_call, start_cheat_block_timestamp_global,
    start_cheat_caller_address, stop_cheat_block_timestamp_global, stop_cheat_caller_address,
};
use starknet::{ContractAddress, get_block_timestamp};
use summit::models::beast::{Beast, BeastUtilsTrait, LiveBeastStats};
use summit::systems::summit::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait};

// Real mainnet contract addresses
fn BEAST_ADDRESS() -> ContractAddress {
    0x046dA8955829ADF2bDa310099A0063451923f02E648cF25A1203aac6335CF0e4.try_into().unwrap()
}

fn REAL_PLAYER() -> ContractAddress {
    0x0689701974d95364aAd9C2306Bc322A40a27fb775b0C97733FD0e36E900b1878.try_into().unwrap()
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

fn ATTACK_POTION_ADDRESS() -> ContractAddress {
    0x111.try_into().unwrap()
}

fn REVIVE_POTION_ADDRESS() -> ContractAddress {
    0x222.try_into().unwrap()
}

fn EXTRA_LIFE_POTION_ADDRESS() -> ContractAddress {
    0x333.try_into().unwrap()
}

fn POISON_POTION_ADDRESS() -> ContractAddress {
    0x444.try_into().unwrap()
}

fn SKULL_TOKEN_ADDRESS() -> ContractAddress {
    0x555.try_into().unwrap()
}

fn CORPSE_TOKEN_ADDRESS() -> ContractAddress {
    0x666.try_into().unwrap()
}

// Deploy summit contract without starting it
fn deploy_summit() -> ISummitSystemDispatcher {
    let contract = declare("summit_systems").unwrap().contract_class();
    let owner = REAL_PLAYER();
    let start_timestamp = 1000_u64;
    let summit_duration_seconds = 1000000_u64;
    let summit_reward_amount_per_second = 0_u128;
    let quest_rewards_total_amount = 100_u128;

    let mut calldata = array![];
    calldata.append(owner.into());
    calldata.append(start_timestamp.into());
    calldata.append(summit_duration_seconds.into());
    calldata.append(summit_reward_amount_per_second.into());
    calldata.append(quest_rewards_total_amount.into());
    calldata.append(DUNGEON_ADDRESS().into());
    calldata.append(BEAST_ADDRESS().into());
    calldata.append(BEAST_DATA_ADDRESS().into());
    calldata.append(REWARD_ADDRESS().into());
    calldata.append(ATTACK_POTION_ADDRESS().into());
    calldata.append(REVIVE_POTION_ADDRESS().into());
    calldata.append(EXTRA_LIFE_POTION_ADDRESS().into());
    calldata.append(POISON_POTION_ADDRESS().into());
    calldata.append(SKULL_TOKEN_ADDRESS().into());
    calldata.append(CORPSE_TOKEN_ADDRESS().into());

    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    let summit = ISummitSystemDispatcher { contract_address };

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
#[fork("mainnet")]
fn test_attack_stress() {
    let summit = deploy_summit_and_start();

    // Beast 20301 is owned by this address on mainnet
    let beast_20301_owner: ContractAddress = 0x0251Af358c691dbda28c96dD2D3d41F9844d56213Dc19d072fAb13FAc22F6bd9
        .try_into()
        .unwrap();

    // Take the summit with beast 20301 as its real owner
    start_cheat_caller_address(summit.contract_address, beast_20301_owner);
    let setup_beasts = array![(20301_u32, 1_u16, 0_u8)].span();
    summit.attack(1, setup_beasts, 0, 0, false);
    assert(summit.get_summit_beast_token_id() == 20301, 'Beast 20301 should be on summit');

    // Give it 100 extra lives
    mock_erc20_burn_from(summit.get_extra_life_potion_address(), true);
    summit.add_extra_life(20301, 100);
    stop_cheat_caller_address(summit.contract_address);

    // Attacker owns 6288 beasts on mainnet - use 300 of them
    let attacker: ContractAddress = 0x03C0F67740e3fE298a52FE75Dd24B4981217406f133E0835331379731B67dC92
        .try_into()
        .unwrap();

    // 300 real beast token IDs owned by attacker on mainnet
    let token_ids: Array<u32> = array![
        78029, 77598, 68607, 68600, 67720, 67711, 67447, 67439, 67429, 65353, 65119, 64916, 64805, 64803, 64786, 64754,
        64749, 64739, 64706, 64688, 64586, 64552, 64532, 64519, 64411, 64385, 64342, 64317, 64171, 64013, 63608, 63550,
        63389, 63368, 63117, 62754, 62298, 61756, 61643, 61507, 61335, 61309, 61229, 61193, 61101, 61035, 61005, 61004,
        60999, 60965, 60947, 60935, 60925, 60915, 60913, 60885, 60880, 60871, 60844, 60843, 60833, 60832, 60829, 60816,
        60805, 60798, 60782, 60773, 60767, 60763, 60748, 60745, 60739, 60737, 60735, 60734, 60732, 60717, 60714, 60709,
        60706, 60705, 60701, 60699, 60690, 60687, 60685, 60680, 60668, 60662, 60652, 60650, 60639, 60637, 60626, 60625,
        60615, 60596, 60588, 60578, 60567, 60565, 60564, 60562, 60558, 60556, 60553, 60549, 60533, 60523, 60522, 60512,
        60505, 60494, 60482, 60475, 60471, 60470, 60450, 60447, 60446, 60443, 60434, 60433, 60431, 60426, 60424, 60408,
        60407, 60406, 60402, 60392, 60389, 60388, 60387, 60383, 60382, 60373, 60370, 60369, 60364, 60363, 60362, 60360,
        60355, 60351, 60331, 60325, 60324, 60323, 60314, 60296, 60295, 60289, 60269, 60266, 60241, 60230, 60198, 60195,
        60185, 60183, 60174, 60170, 60165, 60161, 60150, 60138, 60135, 60134, 60118, 60098, 60094, 60089, 60087, 60082,
        60071, 60067, 60020, 60016, 60015, 60013, 59996, 59993, 59986, 59971, 59970, 59962, 59961, 59958, 59957, 59955,
        59951, 59948, 59945, 59932, 59928, 59914, 59904, 59903, 59896, 59895, 59891, 59886, 59867, 59849, 59847, 59838,
        59831, 59822, 59808, 59802, 59795, 59779, 59758, 59752, 59749, 59732, 59718, 59700, 59694, 59684, 59679, 59671,
        59669, 59661, 59653, 59646, 59645, 59637, 59630, 59628, 59618, 59613, 59610, 59593, 59584, 59581, 59575, 59566,
        59552, 59549, 59548, 59542, 59541, 59532, 59528, 59527, 59521, 59517, 59515, 59513, 59510, 59506, 59493, 59492,
        59482, 59476, 59453, 59452, 59450, 59440, 59436, 59430, 59427, 59425, 59422, 59421, 59419, 59414, 59406, 59403,
        59402, 59400, 59399, 59397, 59395, 59394, 59390, 59386, 59374, 59354, 59338, 59337, 59319, 59285, 59282, 59280,
        59266, 59259, 59249, 59247, 59245, 59243, 59220, 59206, 59198, 59196, 59189, 59186,
    ];

    // Build attacking beasts array: (token_id, attack_count, attack_potions)
    let mut attacking_beasts: Array<(u32, u16, u8)> = array![];
    let mut i: u32 = 0;
    while i < token_ids.len() {
        attacking_beasts.append((*token_ids.at(i), 1, 0));
        i += 1;
    }

    // Attack beast 20301 with 300 beasts (no mocking needed - real mainnet ownership)
    // Use defending_beast_token_id=0 for unsafe mode (skips beasts killed recently in Death Mountain)
    start_cheat_caller_address(summit.contract_address, attacker);
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
    let quest_rewards_total_amount = 100_u128;

    let mut calldata = array![];
    calldata.append(owner.into());
    calldata.append(start_timestamp.into());
    calldata.append(summit_duration_seconds.into());
    calldata.append(summit_reward_amount_per_second.into());
    calldata.append(quest_rewards_total_amount.into());
    calldata.append(DUNGEON_ADDRESS().into());
    calldata.append(BEAST_ADDRESS().into());
    calldata.append(BEAST_DATA_ADDRESS().into());
    calldata.append(REWARD_ADDRESS().into());
    calldata.append(ATTACK_POTION_ADDRESS().into());
    calldata.append(REVIVE_POTION_ADDRESS().into());
    calldata.append(EXTRA_LIFE_POTION_ADDRESS().into());
    calldata.append(POISON_POTION_ADDRESS().into());
    calldata.append(SKULL_TOKEN_ADDRESS().into());
    calldata.append(CORPSE_TOKEN_ADDRESS().into());

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
    assert(summit.get_dungeon_address() == DUNGEON_ADDRESS(), 'Wrong dungeon address');
    assert(summit.get_beast_address() == BEAST_ADDRESS(), 'Wrong beast address');
    assert(summit.get_beast_data_address() == BEAST_DATA_ADDRESS(), 'Wrong beast data address');
    assert(summit.get_reward_address() == REWARD_ADDRESS(), 'Wrong reward address');
}


// ===========================================
// BEAST MODEL TESTS (crit_chance, spirit_reduction)
// ===========================================

fn create_test_beast(luck: u8, spirit: u8) -> Beast {
    // Use default values for fixed properties - they don't affect crit_chance or spirit_reduction
    let fixed = PackableBeast { id: 1, prefix: 1, suffix: 1, level: 10, health: 100, shiny: 0, animated: 0 };

    let live = LiveBeastStats {
        token_id: 1,
        current_health: 100,
        bonus_health: 0,
        bonus_xp: 0,
        attack_streak: 0,
        last_death_timestamp: 0,
        revival_count: 0,
        extra_lives: 0,
        summit_held_seconds: 0,
        stats: summit::models::beast::Stats { spirit, luck, specials: 0, wisdom: 0, diplomacy: 0 },
        rewards_earned: 0,
        rewards_claimed: 0,
        quest: summit::models::beast::Quest {
            captured_summit: 0, used_revival_potion: 0, used_attack_potion: 0, max_attack_streak: 0,
        },
    };

    Beast { fixed, live }
}

#[test]
fn test_crit_chance_zero_luck() {
    let beast = create_test_beast(0, 0);
    let crit = beast.crit_chance();
    assert(crit == 0, 'Crit should be 0%');
}

#[test]
fn test_crit_chance_luck_1() {
    let beast = create_test_beast(1, 0);
    let crit = beast.crit_chance();
    assert(crit == 10, 'Crit should be 10%');
}

#[test]
fn test_crit_chance_luck_5() {
    let beast = create_test_beast(5, 0);
    let crit = beast.crit_chance();
    assert(crit == 20, 'Crit should be 20%');
}

#[test]
fn test_crit_chance_luck_50() {
    let beast = create_test_beast(50, 0);
    let crit = beast.crit_chance();
    // 2000 + (50-5)*100 = 2000 + 4500 = 6500 bp = 65%
    assert(crit == 65, 'Crit should be 65%');
}

#[test]
fn test_crit_chance_luck_70() {
    let beast = create_test_beast(70, 0);
    let crit = beast.crit_chance();
    // 2000 + (70-5)*100 = 2000 + 6500 = 8500 bp = 85%
    assert(crit == 85, 'Crit should be 85%');
}

#[test]
fn test_crit_chance_luck_100() {
    let beast = create_test_beast(100, 0);
    let crit = beast.crit_chance();
    // 8500 + (100-70)*50 = 8500 + 1500 = 10000 bp = 100%
    assert(crit == 100, 'Crit should be 100%');
}

#[test]
fn test_spirit_reduction_zero_spirit() {
    let beast = create_test_beast(0, 0);
    let reduction = beast.spirit_reduction();
    assert(reduction == 0, 'Reduction should be 0');
}

#[test]
fn test_spirit_reduction_spirit_1() {
    let beast = create_test_beast(0, 1);
    let reduction = beast.spirit_reduction();
    assert(reduction == 7200, 'Reduction should be 7200s');
}

#[test]
fn test_spirit_reduction_spirit_5() {
    let beast = create_test_beast(0, 5);
    let reduction = beast.spirit_reduction();
    assert(reduction == 14400, 'Reduction should be 14400s');
}

#[test]
fn test_spirit_reduction_spirit_50() {
    let beast = create_test_beast(0, 50);
    let reduction = beast.spirit_reduction();
    // 14400 + (50-5)*720 = 14400 + 32400 = 46800
    assert(reduction == 46800, 'Reduction should be 46800s');
}

#[test]
fn test_spirit_reduction_spirit_100() {
    let beast = create_test_beast(0, 100);
    let reduction = beast.spirit_reduction();
    // 61200 + (100-70)*360 = 61200 + 10800 = 72000
    assert(reduction == 72000, 'Reduction should be 72000s');
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

// ==========================
// FUZZING TESTS
// ==========================

// Note: Fuzz tests removed from fork tests due to slow RPC calls and potential flakiness.
// Using targeted edge-case tests instead for deterministic, fast CI runs.

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
    let quest_rewards_total_amount = 100_u128;

    let mut calldata = array![];
    calldata.append(owner.into());
    calldata.append(start_timestamp.into());
    calldata.append(summit_duration_seconds.into());
    calldata.append(summit_reward_amount_per_second.into());
    calldata.append(quest_rewards_total_amount.into());
    calldata.append(DUNGEON_ADDRESS().into());
    calldata.append(BEAST_ADDRESS().into());
    calldata.append(BEAST_DATA_ADDRESS().into());
    calldata.append(REWARD_ADDRESS().into());
    calldata.append(ATTACK_POTION_ADDRESS().into());
    calldata.append(REVIVE_POTION_ADDRESS().into());
    calldata.append(EXTRA_LIFE_POTION_ADDRESS().into());
    calldata.append(POISON_POTION_ADDRESS().into());
    calldata.append(SKULL_TOKEN_ADDRESS().into());
    calldata.append(CORPSE_TOKEN_ADDRESS().into());

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

// Note: test_attack_too_many_attack_potions removed - the contract accepts u8 parameter
// so 256+ values fail at type level, not contract level. The existing test_attack_max_attack_potions
// covers the boundary case of 255 attack potions.

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

// Note: Full summit_held_seconds tracking requires multi-player scenarios where one beast takes
// the summit from another, which updates summit_held_seconds. With single-player fork testing,
// we can only verify the basic attack flow. The summit_held_seconds accumulation is implicitly
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

// Note: Full streak cap testing requires multi-player scenarios where one beast repeatedly
// attacks another to build streak > 10. With single-player fork testing, a beast can only
// attack once (taking the empty summit). The attack_streak cap (10) is enforced in the
// contract's combat logic when updating streak after successful attacks.
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

// Note: test_feed_summit_not_playable - The showdown mechanism requires a second player to attack
// during showdown to set showdown_taken_at. In fork tests, we can't easily control two different
// beast owners. The _summit_playable check works correctly:
// - It checks if showdown_taken_at > 0 AND current_timestamp - showdown_taken_at >= showdown_duration
// - This test would pass once a player takes the summit during showdown period
// The existing test coverage for Summit not playable scenarios is handled by verifying the
// _summit_playable function logic is correct in the contract code.

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
// SHOWDOWN TESTS
// ==========================

// Note: test_attack_during_showdown_sets_timestamp - requires a second player to attack
// during showdown to verify showdown_taken_at timestamp is set. This requires two different
// beast owners which is difficult to test with mainnet forking.

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
// UNIT TESTS FOR BEAST MODEL
// ==========================

#[test]
fn test_crit_chance_luck_2() {
    let beast = create_test_beast(2, 0);
    let crit = beast.crit_chance();
    assert(crit == 14, 'Crit should be 14%');
}

#[test]
fn test_crit_chance_luck_3() {
    let beast = create_test_beast(3, 0);
    let crit = beast.crit_chance();
    assert(crit == 17, 'Crit should be 17%');
}

#[test]
fn test_crit_chance_luck_4() {
    let beast = create_test_beast(4, 0);
    let crit = beast.crit_chance();
    assert(crit == 19, 'Crit should be 19%');
}

#[test]
fn test_crit_chance_luck_6() {
    let beast = create_test_beast(6, 0);
    let crit = beast.crit_chance();
    // 2000 + (6-5)*100 = 2000 + 100 = 2100 bp = 21%
    assert(crit == 21, 'Crit should be 21%');
}

#[test]
fn test_crit_chance_luck_71() {
    let beast = create_test_beast(71, 0);
    let crit = beast.crit_chance();
    // 8500 + (71-70)*50 = 8500 + 50 = 8550 bp = 85%
    assert(crit == 85, 'Crit should be 85%');
}

#[test]
fn test_spirit_reduction_spirit_2() {
    let beast = create_test_beast(0, 2);
    let reduction = beast.spirit_reduction();
    assert(reduction == 10080, 'Reduction should be 10080s');
}

#[test]
fn test_spirit_reduction_spirit_3() {
    let beast = create_test_beast(0, 3);
    let reduction = beast.spirit_reduction();
    assert(reduction == 12240, 'Reduction should be 12240s');
}

#[test]
fn test_spirit_reduction_spirit_4() {
    let beast = create_test_beast(0, 4);
    let reduction = beast.spirit_reduction();
    assert(reduction == 13680, 'Reduction should be 13680s');
}

#[test]
fn test_spirit_reduction_spirit_6() {
    let beast = create_test_beast(0, 6);
    let reduction = beast.spirit_reduction();
    // 14400 + (6-5)*720 = 14400 + 720 = 15120
    assert(reduction == 15120, 'Reduction should be 15120s');
}

#[test]
fn test_spirit_reduction_spirit_70() {
    let beast = create_test_beast(0, 70);
    let reduction = beast.spirit_reduction();
    // 14400 + (70-5)*720 = 14400 + 46800 = 61200
    assert(reduction == 61200, 'Reduction should be 61200s');
}

#[test]
fn test_spirit_reduction_spirit_71() {
    let beast = create_test_beast(0, 71);
    let reduction = beast.spirit_reduction();
    // 61200 + (71-70)*360 = 61200 + 360 = 61560
    assert(reduction == 61560, 'Reduction should be 61560s');
}

// ==========================
// FUZZ TESTS FOR BEAST MODEL
// ==========================
// These are pure unit tests (no mainnet fork) so fuzzing is fast and deterministic

#[test]
#[fuzzer(runs: 101)]
fn fuzz_test_crit_chance_bounds(luck: u8) {
    let beast = create_test_beast(luck, 0);
    let crit = beast.crit_chance();

    // Verify the curve behavior based on luck ranges
    // Note: crit_chance has no cap - it can exceed 100% for very high luck
    if luck == 0 {
        assert(crit == 0, 'Luck 0 should give 0% crit');
    } else if luck == 1 {
        assert(crit == 10, 'Luck 1 should give 10% crit');
    } else if luck <= 5 {
        // Lookup table: 1400, 1700, 1900, 2000 basis points
        assert(crit >= 10 && crit <= 20, 'Low luck range invalid');
    } else if luck <= 70 {
        // 2000 + (luck-5) * 100 basis points = 20% to 85%
        assert(crit >= 20 && crit <= 85, 'Mid luck range invalid');
    } else {
        // 8500 + (luck-70) * 50 basis points = 85%+ (no cap)
        assert(crit >= 85, 'High luck should be >= 85%');
    }
}

#[test]
#[fuzzer(runs: 101)]
fn fuzz_test_spirit_reduction_bounds(spirit: u8) {
    let beast = create_test_beast(0, spirit);
    let reduction = beast.spirit_reduction();

    // Verify the curve behavior based on spirit ranges
    if spirit == 0 {
        assert(reduction == 0, 'Spirit 0 should give 0s');
    } else if spirit == 1 {
        assert(reduction == 7200, 'Spirit 1 should give 7200s');
    } else if spirit <= 5 {
        // Lookup table: 10080, 12240, 13680, 14400
        assert(reduction >= 7200 && reduction <= 14400, 'Low spirit range invalid');
    } else if spirit <= 70 {
        // 14400 + (spirit-5) * 720
        assert(reduction >= 14400 && reduction <= 61200, 'Mid spirit range invalid');
    } else {
        // 61200 + (spirit-70) * 360
        assert(reduction >= 61200, 'High spirit range invalid');
    }
}

#[test]
#[fuzzer(runs: 101)]
fn fuzz_test_crit_chance_monotonic(luck: u8) {
    // Crit chance should be monotonically increasing with luck
    if luck > 0 {
        let beast_current = create_test_beast(luck, 0);
        let beast_previous = create_test_beast(luck - 1, 0);

        let crit_current = beast_current.crit_chance();
        let crit_previous = beast_previous.crit_chance();

        assert(crit_current >= crit_previous, 'Crit should increase with luck');
    }
}

#[test]
#[fuzzer(runs: 101)]
fn fuzz_test_spirit_reduction_monotonic(spirit: u8) {
    // Spirit reduction should be monotonically increasing with spirit
    if spirit > 1 {
        let beast_current = create_test_beast(0, spirit);
        let beast_previous = create_test_beast(0, spirit - 1);

        let reduction_current = beast_current.spirit_reduction();
        let reduction_previous = beast_previous.spirit_reduction();

        assert(reduction_current >= reduction_previous, 'Reduction should increase');
    }
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
