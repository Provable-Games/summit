#[dojo::interface]
trait IGameContract {
    fn attack(
        ref world: IWorldDispatcher,
        attacking_beast_id: u32,
        summit_beast_id: u32,
        consumable_id: u8
    );
}

#[dojo::contract]
mod game_systems {
    use core::num::traits::{OverflowingAdd, OverflowingSub};
    use starknet::{ContractAddress, get_caller_address, get_tx_info, get_block_timestamp};
    use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use savage_summit::constants::errors;
    use savage_summit::models::game::{
        Beast, BeastDetails, BeastDetailsStore, BeastStats, BeastStatsStore, Consumable, Summit,
        SummitStore, SummitHistory, SummitHistoryStore
    };
    use savage_summit::utils;

    #[abi(embed_v0)]
    impl GameContractImpl of super::IGameContract<ContractState> {
        fn attack(
            ref world: IWorldDispatcher,
            attacking_beast_id: u32,
            summit_beast_id: u32,
            consumable_id: u8
        ) {
            let chain_id: felt252 = get_tx_info().unbox().chain_id;
            let beast_address = utils::get_beast_address(chain_id);

            self.assert_nft_ownership(beast_address, attacking_beast_id);

            let summit_beast = get!(world, 1, Summit);

            // assert the provided summit beast is still the summit beast
            // TODO: change this to a constant error
            assert(summit_beast.beast_id == summit_beast_id, 'summit beast has changed');

            let mut summit_beast = Beast {
                id: summit_beast_id,
                details: get!(world, 1, BeastDetails),
                stats: get!(world, 1, BeastStats)
            };

            let mut attacking_beast = Beast {
                id: attacking_beast_id,
                details: get!(world, attacking_beast_id, BeastDetails),
                stats: get!(world, attacking_beast_id, BeastStats)
            };

            loop {
                if attacking_beast.stats.health == 0 {
                    break;
                }

                let took_summit = self.attack(attacking_beast, ref summit_beast, world);

                // if the attacking beast took the summit
                if took_summit {
                    // finalize the summit history for the beast that was previously on the summit
                    self.finalize_summit_history(summit_beast.id, world);

                    // create a new SummitHistory for the new beast
                    self.new_summit_history(attacking_beast.id, world);
                    break;
                } else {
                    // if the attacking beast did not take the summit, the defending beast will
                    // attack back
                    self.attack(summit_beast, ref attacking_beast, world);
                }
            }
        }
    }
    // The `generate_trait` attribute is not compatible with `world` parameter expansion.
    // Hence, the use of `self` to access the contract state.
    #[generate_trait]
    impl InternalImpl of InternalUtils {
        /// @title finalize_summit_history
        /// @notice this function is used to finalize the summit history for a beast
        /// @dev we use beast id and lost_at as the key which allows us to get the record of the
        /// current beast using (id, 0)
        ///     we then set the lost_at to the current timestamp to mark the end of the current
        ///     beast's summit if the beast takes the hill again, it'll have a different key pair
        /// @param world the world dispatcher
        /// @param beast_id the id of the beast
        fn finalize_summit_history(self: @ContractState, beast_id: u32, world: IWorldDispatcher) {
            let mut summit_history = get!(world, (beast_id, 0), SummitHistory);
            let current_time = get_block_timestamp();
            let time_on_summit = current_time - summit_history.taken_at;
            summit_history.lost_at = current_time;
            summit_history.rewards = time_on_summit;
            set!(world, (summit_history));
        }

        /// @title new_summit_history
        /// @notice this function is used to create a new summit history for a beast
        /// @param world the world dispatcher
        /// @param beast_id the id of the beast that is taking the summit
        fn new_summit_history(self: @ContractState, beast_id: u32, world: IWorldDispatcher) {
            let taken_at = get_block_timestamp();
            let summit_history = SummitHistory { id: beast_id, lost_at: 0, taken_at, rewards: 0 };
            set!(world, (summit_history));
        }

        /// @title attack
        /// @notice this function is used to process a beast attacking another beast
        /// @param defender a ref to the beast that is defending
        /// @param attacker the beast that is attacking (not a ref since it will be updated)
        /// @return bool true if the defender is dead, false otherwise
        fn attack(attacker: Beast, ref defender: Beast) -> bool {
            // TODO: replace with actual combat logic
            let damage = attacker.details.level;
            let (result, underflow) = defender.stats.health.overflowing_sub(damage);

            defender.stats.health = if underflow {
                0
            } else {
                result
            };

            defender.stats.health == 0
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
}

#[cfg(test)]
mod tests {
    use dojo::world::{IWorldDispatcherTrait, IWorldDispatcher};
    use super::{IGameContract, IGameContractTrait};

    // helper setup function
    // reusable function for tests
    fn setup_world() -> IGameContract {
        // A list of models, identified by their class hash.
        let mut models = array![];

        // Deploy a world with pre-registered models.
        let world = spawn_test_world(models);

        // Deploys a contract with systems.
        let contract_address = world
            .deploy_contract(
                'salt', game_systems::TEST_CLASS_HASH.try_into().unwrap(), array![].span()
            );
        let actions_system = IGameContract { contract_address };

        actions_system
    }
}
