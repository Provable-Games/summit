use starknet::{ContractAddress, contract_address_const};
use savage_summit::constants::{MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID};

fn get_beast_address(chain_id: felt252) -> ContractAddress {
    if chain_id == SEPOLIA_CHAIN_ID {
        get_beast_address_sepolia()
    } else if chain_id == MAINNET_CHAIN_ID {
        get_beast_address_mainnet()
    } else {
        panic_with_felt252('Chain not supported')
    }
}

fn get_beast_address_mainnet() -> ContractAddress {
    contract_address_const::<0x0158160018d590d93528995b340260e65aedd76d28a686e9daa5c4e8fad0c5dd>()
}

fn get_beast_address_sepolia() -> ContractAddress {
    contract_address_const::<0x041b6ffc02ce30c6e941f1b34244ef8af0b3e8a70f5528476a7a68765afd6b39>()
}
