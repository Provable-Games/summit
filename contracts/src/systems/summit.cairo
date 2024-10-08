use savage_summit::models::beast::Beast;
use savage_summit::models::beast_stats::{BeastStats, FixedBeastStats, LiveBeastStats};
use savage_summit::models::summit::SummitHistory;

#[dojo::interface]
trait ISummitSystem {
    fn attack(
        ref world: IWorldDispatcher,
        defending_beast_token_id: u32,
        attacking_beast_token_ids: Span<u32>
    );

    fn feed(ref world: IWorldDispatcher, beast_token_id: u32, adventurer_ids: Span<u64>);

    fn get_summit_history(world: @IWorldDispatcher, beast_id: u32, lost_at: u64) -> SummitHistory;
    fn get_summit_beast_token_id(world: @IWorldDispatcher) -> u32;
    fn get_summit_beast(world: @IWorldDispatcher) -> Beast;
    fn get_beast(world: @IWorldDispatcher, id: u32) -> Beast;
    fn get_beast_stats(world: @IWorldDispatcher, id: u32) -> BeastStats;
    fn get_beast_stats_live(world: @IWorldDispatcher, id: u32) -> LiveBeastStats;
    fn get_beast_stats_fixed(world: @IWorldDispatcher, id: u32) -> FixedBeastStats;
}

#[dojo::contract]
pub mod summit_systems {
    use core::num::traits::{Sqrt};
    use pixel_beasts::interfaces::{IBeasts, IBeastsDispatcher, IBeastsDispatcherTrait};
    use pixel_beasts::pack::PackableBeast;
    use combat::constants::CombatEnums::{Type, Tier};
    use combat::combat::{ImplCombat, CombatSpec, CombatResult, SpecialPowers};
    use game::game::interfaces::{IGame, IGameDispatcher, IGameDispatcherTrait};
    use core::num::traits::{OverflowingAdd, OverflowingSub};
    use openzeppelin_token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use savage_summit::constants::{
        errors, BASE_REVIVAL_TIME_SECONDS, MINIMUM_DAMAGE, MAX_U32, BEAST_MAX_HEALTH,
        BEAST_MAX_BONUS_LVLS
    };
    use savage_summit::models::adventurer::{Adventurer, AdventurerConsumed};
    use savage_summit::models::beast::{Beast, ImplBeast};
    use savage_summit::models::beast_details::{BeastDetails, ImplBeastDetails};
    use savage_summit::models::beast_stats::{
        BeastStats, FixedBeastStats, LiveBeastStats, LiveBeastStatsStore
    };
    use savage_summit::models::consumable::{Consumable, ConsumableDetails, ConsumableDetailsStore};
    use savage_summit::models::summit::{Summit, SummitStore, SummitHistory, SummitHistoryStore};
    use savage_summit::utils;
    use savage_summit::utils::{BEAST_ADDRESS_MAINNET};
    use starknet::{ContractAddress, get_caller_address, get_tx_info, get_block_timestamp};

    #[abi(embed_v0)]
    impl SummitSystemImpl of super::ISummitSystem<ContractState> {
        fn attack(
            ref world: IWorldDispatcher,
            defending_beast_token_id: u32,
            attacking_beast_token_ids: Span<u32>
        ) {
            // assert the provided defending beast is the summit beast
            let summit_beast_token_id = self._get_summit_beast_token_id();
            assert(defending_beast_token_id == summit_beast_token_id, errors::SUMMIT_BEAST_CHANGED);

            if summit_beast_token_id == 0 {
                let new_summit_beast_token_id = *attacking_beast_token_ids.at(0);
                // initialize summit history for the new beast
                self._init_summit_history(new_summit_beast_token_id);

                // set the new summit beast
                self._set_summit_beast(new_summit_beast_token_id);

                return;
            }

            let mut defending_beast = self._get_beast(summit_beast_token_id);

            let mut i = 0;
            while (i < attacking_beast_token_ids.len()) {
                let attacking_beast_token_id = *attacking_beast_token_ids.at(i);

                // assert the caller owns the beast they attacking with
                self._assert_beast_ownership(attacking_beast_token_id);

                // assert not attacking own beast
                self._assert_not_attacking_own_beast(attacking_beast_token_id);

                // get stats for the beast that is attacking
                let mut attacking_beast = self._get_beast(attacking_beast_token_id);

                // assert the attacking beast is revived
                self._assert_beast_can_attack(attacking_beast.stats.live);

                // reset health to starting health plus any bonus health they have accrued
                // @dev beasts attack till death so we don't need any additional logic

                // Add the bonus health to the beast
                attacking_beast
                    .stats
                    .live
                    .current_health = attacking_beast
                    .stats
                    .fixed
                    .starting_health
                    .into()
                    + attacking_beast.stats.live.bonus_health;

                // Add bonus xp to the beast
                let total_xp = attacking_beast.stats.fixed.level * attacking_beast.stats.fixed.level
                    + attacking_beast.stats.live.bonus_xp;
                attacking_beast.stats.fixed.level = total_xp.sqrt().into();

                // loop until the attacking beast is dead or the summit beast is dead
                loop {
                    // if the attacking beast is dead, break
                    if attacking_beast.stats.live.current_health == 0
                        || defending_beast.stats.live.current_health == 0 {
                        break;
                    }

                    // attack the summit beast
                    let (_, defender_died) = self._attack(attacking_beast, ref defending_beast);

                    // if the defending beast is still alive
                    if !defender_died {
                        // it counter attacks
                        self._attack(defending_beast, ref attacking_beast);
                    }
                };

                // reset attack streak if 2x base revival time has passed since last death
                if attacking_beast.stats.live.last_death_timestamp
                    + BASE_REVIVAL_TIME_SECONDS * 2 < get_block_timestamp() {
                    attacking_beast.stats.live.attack_streak = 0;
                }

                // check if max xp is reached
                if self._beast_can_get_xp(attacking_beast) {
                    attacking_beast.stats.live.bonus_xp += 10
                        + attacking_beast.stats.live.attack_streak.into();
                }

                // increase attack streak if less than 10
                if attacking_beast.stats.live.attack_streak < 10 {
                    attacking_beast.stats.live.attack_streak += 1;
                }

                if attacking_beast.stats.live.current_health == 0 {
                    // set death timestamp for prev summit beast
                    attacking_beast.stats.live.last_death_timestamp = get_block_timestamp();
                    attacking_beast.stats.live.num_deaths += 1;
                    attacking_beast.stats.live.last_killed_by = summit_beast_token_id;
                    // update the live stats of the attacking beast
                    set!(world, (attacking_beast.stats.live));
                } else if defending_beast.stats.live.current_health == 0 {
                    // finalize the summit history for prev summit beast
                    self._finalize_summit_history(summit_beast_token_id);

                    // set death timestamp for prev summit beast
                    defending_beast.stats.live.last_death_timestamp = get_block_timestamp();

                    // initialize summit history for the new beast
                    self._init_summit_history(attacking_beast_token_id);

                    // set the new summit beast
                    self._set_summit_beast(attacking_beast_token_id);

                    // update the live stats of the attacking beast
                    set!(world, (attacking_beast.stats.live));
                    break;
                }

                i += 1;
            };

            // update the live stats of the defending beast after all attacks
            set!(world, (defending_beast.stats.live));
        }

        fn feed(ref world: IWorldDispatcher, beast_token_id: u32, adventurer_ids: Span<u64>) {
            // assert the caller owns the beast they are feeding
            self._assert_beast_ownership(beast_token_id);

            let mut beast = self._get_beast(beast_token_id);

            let summit_beast_token_id = self._get_summit_beast_token_id();

            let mut i = 0;
            while (i < adventurer_ids.len()) {
                let adventurer_id = *adventurer_ids.at(i);
                let adventurer = self._get_adventurer(adventurer_id);

                self._assert_adventurer_ownership(adventurer_id);
                self._assert_beast_can_consume(beast, adventurer);
                assert(
                    get!(world, (adventurer_id), AdventurerConsumed).beast_token_id == 0,
                    'Adventurer already consumed'
                );

                beast.stats.live.bonus_health += adventurer.level.into();
                if beast_token_id == summit_beast_token_id {
                    beast.stats.live.current_health += adventurer.level.into();
                }

                set!(world, (AdventurerConsumed { token_id: adventurer_id, beast_token_id }));
                i += 1;
            };

            set!(world, (beast.stats.live));
        }

        fn get_summit_beast_token_id(world: @IWorldDispatcher) -> u32 {
            self._get_summit_beast_token_id()
        }

        fn get_summit_beast(world: @IWorldDispatcher) -> Beast {
            let token_id = self._get_summit_beast_token_id();
            self._get_beast(token_id)
        }

        fn get_summit_history(
            world: @IWorldDispatcher, beast_id: u32, lost_at: u64
        ) -> SummitHistory {
            get!(world, (beast_id, lost_at), SummitHistory)
        }

        fn get_beast(world: @IWorldDispatcher, id: u32) -> Beast {
            self._get_beast(id)
        }

        fn get_beast_stats(world: @IWorldDispatcher, id: u32) -> BeastStats {
            self._get_beast_stats(id)
        }

        fn get_beast_stats_live(world: @IWorldDispatcher, id: u32) -> LiveBeastStats {
            get!(world, id, LiveBeastStats)
        }

        fn get_beast_stats_fixed(world: @IWorldDispatcher, id: u32) -> FixedBeastStats {
            self._get_beast_fixed_stats(id)
        }
    }


    #[generate_trait]
    impl InternalImpl of InternalUtils {
        fn _get_summit_beast_token_id(self: @ContractState) -> u32 {
            get!(self.world(), 1, Summit).beast_token_id
        }

        /// @title get_beast
        /// @notice this function is used to get a beast from the contract
        /// @param token_id the id of the beast
        /// @return Beast the beast
        fn _get_beast(self: @ContractState, token_id: u32) -> Beast {
            let stats = self._get_beast_stats(token_id);
            let details = ImplBeastDetails::get_beast_details(stats.fixed.beast_id);
            Beast { token_id, details, stats }
        }

        /// @title get_beast_stats
        /// @notice this function is used to get the stats of a beast
        /// @param token_id the id of the beast
        /// @return BeastStats the stats of the beast
        fn _get_beast_stats(self: @ContractState, token_id: u32) -> BeastStats {
            let fixed = self._get_beast_fixed_stats(token_id);
            let live = get!(self.world(), token_id, LiveBeastStats);
            BeastStats { fixed, live }
        }

        /// @title get_beast_fixed_stats
        /// @notice this function is used to get the fixed stats of a beast
        /// @param token_id the id of the beast
        /// @return BeastFixedStats the fixed stats of the beast
        fn _get_beast_fixed_stats(self: @ContractState, token_id: u32) -> FixedBeastStats {
            let beast_address = utils::get_beast_address(get_tx_info().unbox().chain_id);
            let beast_dispatcher = IBeastsDispatcher { contract_address: beast_address };
            let beast = beast_dispatcher.getBeast(token_id.into());
            FixedBeastStats {
                beast_id: beast.id,
                special_1: beast.prefix,
                special_2: beast.suffix,
                level: beast.level,
                starting_health: beast.health,
            }
        }

        fn _get_adventurer(self: @ContractState, token_id: u64) -> Adventurer {
            let adventurer_address = utils::ADVENTURER_ADDRESS_MAINNET();
            let game_dispatcher = IGameDispatcher { contract_address: adventurer_address };

            let adventurer = game_dispatcher.get_adventurer(token_id.into());
            let adventurer_meta = game_dispatcher.get_adventurer_meta(token_id.into());

            Adventurer {
                level: Self::_get_level_from_xp(adventurer.xp),
                health: adventurer.health,
                rank_at_death: adventurer_meta.rank_at_death,
            }
        }

        /// @title finalize_summit_history
        /// @notice this function is used to finalize the summit history for a beast
        /// @dev we use beast id and lost_at as the key which allows us to get the record of the
        /// current beast using (id, 0)
        ///     we then set the lost_at to the current timestamp to mark the end of the current
        ///     beast's summit if the beast takes the hill again, it'll have a different key pair
        /// @param token_id the id of the beast
        fn _finalize_summit_history(self: @ContractState, token_id: u32) {
            let world = self.world();
            let mut summit_history = get!(world, (token_id, 0), SummitHistory);
            let current_time = get_block_timestamp();
            let time_on_summit = current_time - summit_history.taken_at;
            summit_history.lost_at = current_time;
            summit_history.rewards = time_on_summit;
            set!(world, (summit_history));
        }

        /// @title new_summit_history
        /// @notice this function is used to create a new summit history for a beast
        /// @param token_id the id of the beast that is taking the summits
        fn _init_summit_history(self: @ContractState, token_id: u32) {
            set!(
                self.world(),
                (SummitHistory {
                    id: token_id, lost_at: 0, taken_at: get_block_timestamp(), rewards: 0
                })
            );
        }

        /// @title set_summit_beast
        /// @notice this function is used to set the summit beast
        /// @param beast_token_id the token_id of the beast that is taking the summit
        fn _set_summit_beast(self: @ContractState, beast_token_id: u32) {
            set!(self.world(), (Summit { id: 1, beast_token_id }));
        }

        /// @title attack
        /// @notice this function is used to process a beast attacking another beast
        /// @param attacker the beast that is attacking
        /// @param defender a ref to the beast that is defending
        /// @return a tuple containing the combat result and a bool indicating if the defender died
        /// @dev this function only mutates the defender
        fn _attack(
            self: @ContractState, attacker: Beast, ref defender: Beast
        ) -> (CombatResult, bool) {
            let attacker_combat_spec = attacker.get_combat_spec();
            let defender_combat_spec = defender.get_combat_spec();
            let minimum_damage = MINIMUM_DAMAGE;

            // TODO: incorporate strength
            let attacker_strength = 0;
            let defender_strength = 0;

            // TODO: incorporate critical hit
            let critical_hit_chance = 0;
            let critical_hit_rnd = 0;

            let combat_result = ImplCombat::calculate_damage(
                attacker_combat_spec,
                defender_combat_spec,
                minimum_damage,
                attacker_strength,
                defender_strength,
                critical_hit_chance,
                critical_hit_rnd
            );
            let (result, underflow) = defender
                .stats
                .live
                .current_health
                .overflowing_sub(combat_result.total_damage.into());

            defender.stats.live.current_health = if underflow {
                0
            } else {
                result
            };

            let defender_died = defender.stats.live.current_health == 0;

            (combat_result, defender_died)
        }

        /// @title assert_adventurer_ownership
        /// @notice this function is used to assert that the caller is the owner of an adventurer
        /// @param token_id the id of the adventurer
        fn _assert_adventurer_ownership(self: @ContractState, token_id: u64) {
            let owner = self._get_owner_of_adventurer(token_id);
            assert(owner == get_caller_address(), errors::NOT_TOKEN_OWNER);
        }

        /// @title get_owner_of_adventurer
        /// @notice this function is used to get the owner of am adventurer
        /// @param token_id the id of the adventurer
        /// @return ContractAddress the owner of the adventurer
        fn _get_owner_of_adventurer(self: @ContractState, token_id: u64) -> ContractAddress {
            let contract_address = utils::ADVENTURER_ADDRESS_MAINNET();
            let erc721_dispatcher = IERC721Dispatcher { contract_address };
            erc721_dispatcher.owner_of(token_id.into())
        }

        /// @title assert_beast_ownership
        /// @notice this function is used to assert that the caller is the owner of a beast
        /// @param token_id the id of the beast
        fn _assert_beast_ownership(self: @ContractState, token_id: u32) {
            let owner = self._get_owner_of_beast(token_id);
            assert(owner == get_caller_address(), errors::NOT_TOKEN_OWNER);
        }

        /// @title get_owner_of_beast
        /// @notice this function is used to get the owner of a beast
        /// @param token_id the id of the beast
        /// @return ContractAddress the owner of the beast
        fn _get_owner_of_beast(self: @ContractState, token_id: u32) -> ContractAddress {
            let contract_address = utils::get_beast_address(get_tx_info().unbox().chain_id);
            let erc721_dispatcher = IERC721Dispatcher { contract_address };
            erc721_dispatcher.owner_of(token_id.into())
        }

        /// @title assert_not_attacking_own_beast
        /// @notice this function is used to assert that a beast is not attacking its own beast
        /// @param attacking_beast_token_id the id of the beast that is attacking
        fn _assert_not_attacking_own_beast(self: @ContractState, attacking_beast_token_id: u32) {
            let summit_beast_token_id = get!(self.world(), 1, Summit).beast_token_id;
            let summit_owner = self._get_owner_of_beast(summit_beast_token_id);
            let attacking_owner = self._get_owner_of_beast(attacking_beast_token_id);
            assert(attacking_owner != summit_owner, errors::BEAST_ATTACKING_OWN_BEAST);
        }

        /// @title assert_beast_can_attack
        /// @notice this function is used to assert that a beast is revived
        /// @param live_beast_stats the stats of the beast to check
        fn _assert_beast_can_attack(self: @ContractState, live_beast_stats: LiveBeastStats) {
            let last_death_timestamp = live_beast_stats.last_death_timestamp;
            let current_time = get_block_timestamp();
            let time_since_death = current_time - last_death_timestamp;
            assert(time_since_death >= BASE_REVIVAL_TIME_SECONDS, errors::BEAST_NOT_YET_REVIVED);
        }

        /// @title beast_can_get_xp
        /// @notice this function is used to check if a beast can get xp
        /// @param beast the beast to check
        /// @return bool true if the beast can get xp, false otherwise
        fn _beast_can_get_xp(self: @ContractState, beast: Beast) -> bool {
            let base_xp = beast.stats.fixed.level * beast.stats.fixed.level;
            let max_xp = (beast.stats.fixed.level + BEAST_MAX_BONUS_LVLS)
                * (beast.stats.fixed.level + BEAST_MAX_BONUS_LVLS);

            beast.stats.live.bonus_xp < max_xp - base_xp
        }

        /// @title assert_beast_can_consume
        /// @notice this function is used to assert that a beast can consume an adventurer
        /// @param beast the beast to check
        /// @param adventurer the adventurer to check
        fn _assert_beast_can_consume(self: @ContractState, beast: Beast, adventurer: Adventurer) {
            let total_health = beast.stats.live.bonus_health
                + beast.stats.fixed.starting_health.into();
            assert(total_health <= BEAST_MAX_HEALTH, errors::BEAST_MAX_HEALTH);
            assert(adventurer.health == 0, errors::ADVENTURER_ALIVE);
            assert(adventurer.rank_at_death == 0, errors::ADVENTURER_RANKED);
        }

        /// @notice: gets level from xp
        /// @param xp: the xp to get the level for
        /// @return u8: the level for the given xp
        fn _get_level_from_xp(xp: u16) -> u8 {
            if (xp == 0) {
                1
            } else {
                xp.sqrt()
            }
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

        let defender_id = 1;
        let summit_beast_stats = BeastStats { id: defender_id, health: 100, dead_at: 0, };
        let summit_beast_details = BeastDetails {
            id: defender_id,
            _type: Type::Magic_or_Cloth,
            tier: Tier::T1,
            level: 5,
            starting_health: 100
        };

        let attacker_id = 2;
        let attacking_beast_stats = BeastStats { id: attacker_id, health: 100, dead_at: 0, };
        let attacking_beast_details = BeastDetails {
            id: attacker_id,
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
        summit_system.attack(defender_id, attacker_id, array![]);

        // verify the finalized summit history for the previous summit beast
        let prev_summit_history = summit_system.get_summit_history(defender_id, summit_change_time);
        assert(prev_summit_history.id == defender_id, 'prev summit id is wrong');
        assert(prev_summit_history.lost_at == summit_change_time, 'prev summit lost_at is wrong');
        assert(prev_summit_history.taken_at == starting_time, 'prev summit taken_at is wrong');
        assert(prev_summit_history.rewards == 100, 'prev summit rewards is wrong');

        // verify the beast prevly on the summit is dead
        let prev_summit_beast = summit_system.get_beast(defender_id);
        assert(prev_summit_beast.stats.health == 0, 'prev summit beast health');
        assert(prev_summit_beast.stats.dead_at == summit_change_time, 'prev summit beast dead_at');

        // attacker should now be on the summit
        let summit_beast = summit_system.get_summit_beast();
        assert(summit_beast.id == attacker_id, 'attacker be on summit');

        // attacker should have lost health as part of the attack
        assert(summit_beast.stats.health < 100, 'attacker should take dmg');

        // verify we have a new submit history for the new summit beast
        let new_summit_history = summit_system.get_summit_history(summit_beast.id, 0);
        assert(new_summit_history.id == attacker_id, 'new summit id is wrong');
        assert(new_summit_history.lost_at == 0, 'new summit lost_at is wrong');
        assert(new_summit_history.taken_at == summit_change_time, 'new summit taken_at is wrong');
        assert(new_summit_history.rewards == 0, 'new summit rewards is wrong');
    }
}
