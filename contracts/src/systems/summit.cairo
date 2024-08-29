use savage_summit::models::beast::{Beast, BeastDetails, BeastStats};
use savage_summit::models::summit::{SummitHistory};
#[dojo::interface]
trait ISummitSystem {
    fn attack(
        ref world: IWorldDispatcher,
        summit_beast_id: u32,
        attacking_beast_id: u32,
        consumables: Array<u8>
    );

    fn get_summit_history(world: @IWorldDispatcher, beast_id: u32, lost_at: u64) -> SummitHistory;
    fn get_summit_beast(world: @IWorldDispatcher) -> Beast;
    fn get_beast(world: @IWorldDispatcher, id: u32) -> Beast;
    fn get_beast_details(world: @IWorldDispatcher, id: u32) -> BeastDetails;
    fn get_beast_stats(world: @IWorldDispatcher, id: u32) -> BeastStats;
}

#[dojo::contract]
pub mod summit_systems {
    use core::num::traits::{OverflowingAdd, OverflowingSub};
    use starknet::{ContractAddress, get_caller_address, get_tx_info, get_block_timestamp};
    use openzeppelin_token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use savage_summit::constants::errors;
    use savage_summit::models::beast::{
        Beast, BeastDetails, BeastDetailsStore, BeastStats, BeastStatsStore
    };
    use savage_summit::models::consumable::{Consumable, ConsumableDetails, ConsumableDetailsStore};
    use savage_summit::models::summit::{Summit, SummitStore, SummitHistory, SummitHistoryStore};
    use savage_summit::utils;

    #[abi(embed_v0)]
    impl SummitSystemImpl of super::ISummitSystem<ContractState> {
        fn attack(
            ref world: IWorldDispatcher,
            summit_beast_id: u32,
            attacking_beast_id: u32,
            consumables: Array<u8>
        ) {
            // assert the caller owns the beast they attacking with
            self._assert_beast_ownership(attacking_beast_id);

            // assert the provided summit beast is the summit beast
            let summit_beast_id = get!(world, 1, Summit).beast_id;
            assert(summit_beast_id == summit_beast_id, errors::SUMMIT_BEAST_CHANGED);

            // get the beast on the summit
            let mut summit_beast = Beast {
                id: summit_beast_id,
                details: get!(world, summit_beast_id, BeastDetails),
                stats: get!(world, summit_beast_id, BeastStats)
            };

            // get the beast that is attacking
            let mut attacking_beast = Beast {
                id: attacking_beast_id,
                details: get!(world, attacking_beast_id, BeastDetails),
                stats: get!(world, attacking_beast_id, BeastStats)
            };

            // assert the attacking beast is revived
            self._assert_beast_is_revived(attacking_beast);

            // loop until the attacking beast is dead or the summit beast is dead
            loop {
                // if the attacking beast is dead, break
                if attacking_beast.stats.health == 0 || summit_beast.stats.health == 0 {
                    break;
                }

                // attack the summit beast
                let took_summit = self._attack(attacking_beast, ref summit_beast);

                // if the attacking beast took the summit
                if took_summit {
                    // finalize the summit history for prev summit beast
                    self._finalize_summit_history(summit_beast.id);

                    // initialize summit history for the new beast
                    self._init_summit_history(attacking_beast.id);

                    // set dead at for prev summit beast
                    summit_beast.stats.dead_at = get_block_timestamp();

                    // set the new summit beast
                    self._set_summit_beast(attacking_beast.id);
                } else {
                    // if the attacking beast did not take the summit, the defending beast will
                    // attack back
                    self._attack(summit_beast, ref attacking_beast);
                }
            };

            // update the attacker and summit beasts
            set!(world, (summit_beast.stats, attacking_beast.stats));
        }

        fn get_summit_beast(world: @IWorldDispatcher) -> Beast {
            let summit = get!(world, 1, Summit);
            let id = summit.beast_id;
            let details = get!(world, id, BeastDetails);
            let stats = get!(world, id, BeastStats);
            Beast { id, details, stats }
        }

        fn get_summit_history(
            world: @IWorldDispatcher, beast_id: u32, lost_at: u64
        ) -> SummitHistory {
            get!(world, (beast_id, lost_at), SummitHistory)
        }

        fn get_beast(world: @IWorldDispatcher, id: u32) -> Beast {
            Beast {
                id: id, details: get!(world, id, BeastDetails), stats: get!(world, id, BeastStats)
            }
        }

        fn get_beast_details(world: @IWorldDispatcher, id: u32) -> BeastDetails {
            get!(world, id, BeastDetails)
        }

        fn get_beast_stats(world: @IWorldDispatcher, id: u32) -> BeastStats {
            get!(world, id, BeastStats)
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
        /// @param beast_id the id of the beast
        fn _finalize_summit_history(self: @ContractState, beast_id: u32) {
            let world = self.world();
            let mut summit_history = get!(world, (beast_id, 0), SummitHistory);
            let current_time = get_block_timestamp();
            let time_on_summit = current_time - summit_history.taken_at;
            summit_history.lost_at = current_time;
            summit_history.rewards = time_on_summit;
            set!(world, (summit_history));
        }

        /// @title new_summit_history
        /// @notice this function is used to create a new summit history for a beast
        /// @param beast_id the id of the beast that is taking the summit
        fn _init_summit_history(self: @ContractState, beast_id: u32) {
            set!(
                self.world(),
                (SummitHistory {
                    id: beast_id, lost_at: 0, taken_at: get_block_timestamp(), rewards: 0
                })
            );
        }

        /// @title set_summit_beast
        /// @notice this function is used to set the summit beast
        /// @param beast_id the id of the beast that is taking the summit
        fn _set_summit_beast(self: @ContractState, beast_id: u32) {
            set!(self.world(), (Summit { id: 1, beast_id }));
        }

        /// @title attack
        /// @notice this function is used to process a beast attacking another beast
        /// @param attacker the beast that is attacking
        /// @param defender a ref to the beast that is defending
        /// @return bool true if the defender is dead, false otherwise
        /// @dev this function only mutates the defender
        fn _attack(self: @ContractState, attacker: Beast, ref defender: Beast) -> bool {
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

        /// @title assert_ownership
        /// @notice this function is used to assert that the caller owns a beast
        /// @param token_id the id of the beast
        fn _assert_beast_ownership(self: @ContractState, token_id: u32) {
            let contract_address = utils::get_beast_address(get_tx_info().unbox().chain_id);

            // testnet will return zero for contract address
            if contract_address.is_non_zero() {
                let erc721_dispatcher = IERC721Dispatcher { contract_address };
                let owner = erc721_dispatcher.owner_of(token_id.into());
                assert(owner == get_caller_address(), errors::NOT_TOKEN_OWNER);
            }
        }

        /// @title assert_beast_is_revived
        /// @notice this function is used to assert that a beast is revived
        /// @param beast the beast to check
        fn _assert_beast_is_revived(self: @ContractState, beast: Beast) {
            let dead_at = beast.stats.dead_at;
            let current_time = get_block_timestamp();
            let time_since_death = current_time - dead_at;
            assert(time_since_death >= 23 * 60 * 60, errors::BEAST_NOT_YET_REVIVED);

        }
    }
}

#[cfg(test)]
mod tests {
    use dojo::model::{Model, ModelTest, ModelIndex, ModelEntityTest};
    use dojo::utils::test::deploy_contract;
    use dojo::world::{IWorldDispatcherTrait, IWorldDispatcher};
    use savage_summit::constants::TESTING_CHAIN_ID;
    use super::{summit_systems, ISummitSystemDispatcher, ISummitSystemDispatcherTrait};
    use savage_summit::models::beast::{
        Beast, BeastDetails, BeastDetailsStore, BeastStats, BeastStatsStore, Type, Tier
    };
    use savage_summit::models::consumable::{Consumable, ConsumableDetails, ConsumableDetailsStore};
    use savage_summit::models::summit::{Summit, SummitStore, SummitHistory, SummitHistoryStore};

    /// @title setup_world
    /// @notice this function is used to setup the world for testing
    /// @return world the world dispatcher
    /// @return summit_system the summit system dispatcher
    fn setup_world() -> (IWorldDispatcher, ISummitSystemDispatcher) {
        starknet::testing::set_chain_id(TESTING_CHAIN_ID);

        let world = spawn_test_world!();

        let contract_address = world
            .deploy_contract('salt', summit_systems::TEST_CLASS_HASH.try_into().unwrap());

        let summit_system = ISummitSystemDispatcher { contract_address };

        (world, summit_system)
    }

    #[test]
    fn test_take_summit() {
        let starting_time = 1724927366;
        starknet::testing::set_block_timestamp(starting_time);

        let (world, summit_system) = setup_world();

        let summit = Summit { id: 1, beast_id: 1 };
        let summit_history = SummitHistory {
            id: 1, lost_at: 0, taken_at: starting_time, rewards: 0
        };

        let summit_beast_id = 1;
        let summit_beast_stats = BeastStats { id: summit_beast_id, health: 100, dead_at: 0, };
        let summit_beast_details = BeastDetails {
            id: summit_beast_id,
            _type: Type::Magic_or_Cloth,
            tier: Tier::T1,
            level: 5,
            starting_health: 100
        };

        let attacking_beast_id = 2;
        let attacking_beast_stats = BeastStats { id: attacking_beast_id, health: 100, dead_at: 0, };
        let attacking_beast_details = BeastDetails {
            id: attacking_beast_id,
            _type: Type::Blade_or_Hide,
            tier: Tier::T2,
            level: 10,
            starting_health: 100
        };

        // inject test data into world
        summit.set_test(world);
        summit_history.set_test(world);
        summit_beast_stats.set_test(world);
        summit_beast_details.set_test(world);
        attacking_beast_stats.set_test(world);
        attacking_beast_details.set_test(world);

        // roll forward time by 100 seconds
        let summit_change_time = starting_time + 100;
        starknet::testing::set_block_timestamp(summit_change_time);

        // set authorizations
        world.grant_writer(Model::<Summit>::selector(), summit_system.contract_address);
        world.grant_writer(Model::<SummitHistory>::selector(), summit_system.contract_address);
        world.grant_writer(Model::<BeastStats>::selector(), summit_system.contract_address);

        // attack the summit with a beast that is stronger than the summit beast
        summit_system.attack(summit_beast_id, attacking_beast_id, array![]);

        // verify the finalized summit history for the previous summit beast
        let prev_summit_history = summit_system.get_summit_history(summit_beast_id, summit_change_time);
        assert(prev_summit_history.id == summit_beast_id, 'prev summit id is wrong');
        assert(prev_summit_history.lost_at == summit_change_time, 'prev summit lost_at is wrong');
        assert(prev_summit_history.taken_at == starting_time, 'prev summit taken_at is wrong');
        assert(prev_summit_history.rewards == 100, 'prev summit rewards is wrong');

        // verify the beast prevly on the summit is dead
        let prev_summit_beast = summit_system.get_beast(summit_beast_id);
        assert(prev_summit_beast.stats.health == 0, 'prev summit beast health');
        assert(prev_summit_beast.stats.dead_at == summit_change_time, 'prev summit beast dead_at');

        // attacker should now be on the summit
        let summit_beast = summit_system.get_summit_beast();
        assert(summit_beast.id == attacking_beast_id, 'attacker be on summit');

        // attacker should have lost health as part of the attack
        assert(summit_beast.stats.health < 100, 'attacker should take dmg');

        // verify we have a new submit history for the new summit beast
        let new_summit_history = summit_system.get_summit_history(summit_beast.id, 0);
        assert(new_summit_history.id == attacking_beast_id, 'new summit id is wrong');
        assert(new_summit_history.lost_at == 0, 'new summit lost_at is wrong');
        assert(new_summit_history.taken_at == summit_change_time, 'new summit taken_at is wrong');
        assert(new_summit_history.rewards == 0, 'new summit rewards is wrong');
    }
}
