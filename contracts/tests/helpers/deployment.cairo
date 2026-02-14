use snforge_std::{ContractClassTrait, DeclareResultTrait, declare, mock_call};
use starknet::ContractAddress;
use summit::systems::summit::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait};
use crate::fixtures::addresses::{
    ATTACK_POTION_ADDRESS, BEAST_ADDRESS, BEAST_DATA_ADDRESS, CORPSE_TOKEN_ADDRESS, DUNGEON_ADDRESS,
    EXTRA_LIFE_POTION_ADDRESS, POISON_POTION_ADDRESS, REAL_PLAYER, REVIVE_POTION_ADDRESS, REWARD_ADDRESS,
    SKULL_TOKEN_ADDRESS,
};

/// Deploy summit contract without starting it
pub fn deploy_summit() -> ISummitSystemDispatcher {
    let contract = declare("summit_systems").unwrap().contract_class();
    let owner = REAL_PLAYER();
    let start_timestamp = 1000_u64;
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
    ISummitSystemDispatcher { contract_address }
}

/// Deploy summit contract and start it (ready for attack testing)
pub fn deploy_summit_and_start() -> ISummitSystemDispatcher {
    let summit = deploy_summit();
    summit.start_summit();
    summit
}

pub fn mock_erc20_burn_from(token_address: ContractAddress, success: bool) {
    mock_call(token_address, selector!("burn_from"), success, 1000);
}

pub fn mock_erc20_mint(token_address: ContractAddress, success: bool) {
    mock_call(token_address, selector!("mint"), success, 1000);
}

pub fn mock_erc20_transfer(token_address: ContractAddress, success: bool) {
    mock_call(token_address, selector!("transfer"), success, 1000);
}
