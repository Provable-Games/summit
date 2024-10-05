use starknet::{ContractAddress, contract_address_const};
use savage_summit::constants::{MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID, TESTING_CHAIN_ID};

fn get_beast_address(chain_id: felt252) -> ContractAddress {
    if chain_id == SEPOLIA_CHAIN_ID {
        BEAST_ADDRESS_SEPOLIA()
    } else if chain_id == MAINNET_CHAIN_ID {
        BEAST_ADDRESS_MAINNET()
    } else {
        panic_with_felt252('Chain not supported')
    }
}

// TODO: set correct consumable addresses
fn get_consumable_address(consumable_id: u8) -> ContractAddress {
    if consumable_id == 1 {
        contract_address_const::<
            0x018108b32cea514a78ef1b0e4a0753e855cdf620bc0565202c02456f618c4dc4
        >()
    } else if consumable_id == 2 {
        contract_address_const::<
            0x018108b32cea514a78ef1b0e4a0753e855cdf620bc0565202c02456f618c4dc4
        >()
    } else if consumable_id == 3 {
        contract_address_const::<
            0x018108b32cea514a78ef1b0e4a0753e855cdf620bc0565202c02456f618c4dc4
        >()
    } else {
        panic_with_felt252('Chain not supported')
    }
}

fn ADVENTURER_ADDRESS_MAINNET() -> ContractAddress {
    contract_address_const::<0x018108b32cea514a78ef1b0e4a0753e855cdf620bc0565202c02456f618c4dc4>()
}

fn BEAST_ADDRESS_MAINNET() -> ContractAddress {
    contract_address_const::<0x0158160018d590d93528995b340260e65aedd76d28a686e9daa5c4e8fad0c5dd>()
}

fn BEAST_ADDRESS_SEPOLIA() -> ContractAddress {
    contract_address_const::<0x041b6ffc02ce30c6e941f1b34244ef8af0b3e8a70f5528476a7a68765afd6b39>()
}

fn pow2_const(n: u8) -> u16 {
    *array![1, 2, 4, 8, 16, 32, 64, 128, 256, 512].span().at(n.into())
}