#[dojo::interface]
trait IGameContract {
    fn attack(ref world: IWorldDispatcher, beast_id: u32, consumable_id: u8);
}

#[dojo::contract]
mod game_systems {
    use starknet::{ContractAddress, get_caller_address, get_tx_info};
    use openzeppelin::token::erc721::interface::{
        IERC721Dispatcher, IERC721DispatcherTrait
    };
    use savage_summit::constants::errors;
    use savage_summit::models::game::{Summit, Beast, Consumable};
    use savage_summit::utils;

    #[abi(embed_v0)]
    impl GameContractImpl of super::IGameContract<ContractState> {
        fn attack(ref world: IWorldDispatcher, beast_id: u32, consumable_id: u8) {
            let chain_id: felt252 = get_tx_info().unbox().chain_id;
            let beast_address = utils::get_beast_address(chain_id);

            assert_nft_ownership(beast_address, beast_id);

            // todo: assert consumable ownership
            // check if beast is on summit
            // if beast on summon, attack beast
            // summit beast attack back if still alive
            // repeat until one beast dies
            // new beast takes summit if victorious
        }
    }

    fn assert_nft_ownership(nft_collection_address: ContractAddress, token_id: u32) {
        let nft_collection_dispatcher = IERC721Dispatcher {
            contract_address: nft_collection_address
        };
        let owner = nft_collection_dispatcher.owner_of(token_id.into());

        // TODO: add support for delegate address
        assert(owner == get_caller_address(), errors::NOT_TOKEN_OWNER);
    }
}