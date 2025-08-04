use summit::models::beast::Beast;
use summit::models::beast_stats::{BeastStats, FixedBeastStats, LiveBeastStats};
use summit::models::consumable::{Consumable, ConsumableType};
use summit::models::summit::{SummitHistory};
use starknet::ContractAddress;

#[starknet::interface]
trait ISummitSystem<T> {
    fn attack(
        ref self: T,
        defending_beast_token_id: u32,
        attacking_beast_token_ids: Span<u32>,
        revival_potions: u8,
        attack_potions: u8,
        extra_life_potions: u8
    );

    fn feed(ref self: T, beast_token_id: u32, adventurer_ids: Span<u64>);

    fn set_consumable_address(ref self: T, consumable: ConsumableType, address: ContractAddress);
    fn set_reward_address(ref self: T, address: ContractAddress);
    fn claim_starter_kit(ref self: T, beast_token_ids: Span<u32>);
    fn update_all_live_stats(ref self: T, start_id: u32, end_id: u32);

    fn get_summit_history(self: @T, beast_id: u32, lost_at: u64) -> SummitHistory;
    fn get_summit_beast_token_id(self: @T) -> u32;
    fn get_summit_beast(self: @T) -> Beast;
    fn get_beast(self: @T, id: u32) -> Beast;
    fn get_beast_stats(self: @T, id: u32) -> BeastStats;
    fn get_beast_stats_live(self: @T, id: u32) -> LiveBeastStats;
    fn get_beast_stats_fixed(self: @T, id: u32) -> FixedBeastStats;
    fn get_consumable_address(self: @T, consumable: ConsumableType) -> ContractAddress;
    fn get_reward_address(self: @T) -> ContractAddress;
}

#[dojo::contract]
pub mod summit_systems {
    use combat::combat::{ImplCombat, CombatSpec, CombatResult, SpecialPowers};
    use combat::constants::CombatEnums::{Type, Tier};
    use core::num::traits::{OverflowingAdd, OverflowingSub};
    use core::num::traits::{Sqrt, Zero};
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use dojo::world::WorldStorage;

    use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait};
    use game::game::interfaces::{IGame, IGameDispatcher, IGameDispatcherTrait};
    use openzeppelin_token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use pixel_beasts::interfaces::{IBeasts, IBeastsDispatcher, IBeastsDispatcherTrait};
    use pixel_beasts::pack::PackableBeast;

    use summit::constants::{
        errors, BASE_REVIVAL_TIME_SECONDS, MINIMUM_DAMAGE, BEAST_MAX_BONUS_HEALTH, BEAST_MAX_BONUS_LVLS,
        MAX_REVIVAL_COUNT, EIGHT_BITS_MAX, DEFAULT_NS
    };
    use summit::erc20::interface::{
        ConsumableERC20Dispatcher, ConsumableERC20DispatcherTrait, RewardERC20Dispatcher, RewardERC20DispatcherTrait
    };
    use summit::models::adventurer::{Adventurer, AdventurerConsumed};
    use summit::models::beast::{Beast, ImplBeast};
    use summit::models::beast_details::{BeastDetails, ImplBeastDetails};
    use summit::models::beast_stats::{BeastStats, FixedBeastStats, LiveBeastStats, BeastRewards};
    use summit::models::consumable::{Consumable, ConsumableType};
    use summit::models::summit::{Summit, SummitHistory, SummitReward};
    use summit::utils;
    use starknet::{
        ContractAddress, get_caller_address, get_tx_info, get_block_timestamp, get_contract_address,
        contract_address_const
    };

    #[abi(embed_v0)]
    impl SummitSystemImpl of super::ISummitSystem<ContractState> {
        fn attack(
            ref self: ContractState,
            defending_beast_token_id: u32,
            attacking_beast_token_ids: Span<u32>,
            revival_potions: u8,
            attack_potions: u8,
            extra_life_potions: u8
        ) {
            let mut world = self.world(DEFAULT_NS());
            // assert the provided defending beast is the summit beast
            let summit_beast_token_id = InternalSummitImpl::_get_summit_beast_token_id(world);
            assert(defending_beast_token_id == summit_beast_token_id, errors::SUMMIT_BEAST_CHANGED);

            // assert consumable amounts
            assert(attack_potions <= EIGHT_BITS_MAX, errors::MAX_ATTACK_POTION);
            assert(extra_life_potions <= EIGHT_BITS_MAX, errors::BEAST_MAX_EXTRA_LIVES);

            if summit_beast_token_id == 0 {
                let new_summit_beast_token_id = *attacking_beast_token_ids.at(0);
                // initialize summit history for the new beast
                InternalSummitImpl::_init_summit_history(ref world, new_summit_beast_token_id);

                // set the new summit beast
                InternalSummitImpl::_set_summit_beast(ref world, new_summit_beast_token_id);

                // set live stats
                let mut attacking_beast = InternalSummitImpl::_get_beast(
                    world, new_summit_beast_token_id
                );
                attacking_beast
                    .stats
                    .live
                    .current_health = attacking_beast
                    .stats
                    .fixed
                    .starting_health
                    .into()
                    + attacking_beast.stats.live.bonus_health;

                // Apply extra life potions
                attacking_beast.stats.live.extra_lives = extra_life_potions;
                InternalSummitImpl::_burn_consumable(world, ConsumableType::ExtraLife, extra_life_potions);
                world.write_model(@attacking_beast.stats.live);

                return;
            }

            let mut defending_beast = InternalSummitImpl::_get_beast(world, summit_beast_token_id);

            let mut remaining_attack_potions = attack_potions;
            let mut remaining_revival_potions = revival_potions;
            let mut i = 0;
            while (i < attacking_beast_token_ids.len()) {
                let attacking_beast_token_id = *attacking_beast_token_ids.at(i);

                // assert the caller owns the beast they attacking with
                InternalSummitImpl::_assert_beast_ownership(attacking_beast_token_id);

                // assert not attacking own beast
                InternalSummitImpl::_assert_not_attacking_own_beast(world, attacking_beast_token_id);

                // get stats for the beast that is attacking
                let mut attacking_beast = InternalSummitImpl::_get_beast(world, attacking_beast_token_id);

                // assert the attacking beast is alive
                remaining_revival_potions = InternalSummitImpl::_use_revival_potions(ref attacking_beast, ref remaining_revival_potions);

                // reset health to starting health plus any bonus health they have accrued
                // @dev beasts attack till death so we don't need any additional logic

                // Add the bonus health to the beast
                attacking_beast.stats.live.current_health = attacking_beast.stats.fixed.starting_health.into()
                    + attacking_beast.stats.live.bonus_health;

                // Add bonus xp to the beast
                let total_xp = attacking_beast.stats.fixed.level * attacking_beast.stats.fixed.level
                    + attacking_beast.stats.live.bonus_xp;
                attacking_beast.stats.fixed.level = total_xp.sqrt().into();

                // loop until the attacking beast is dead or the summit beast is dead
                loop {
                    InternalSummitImpl::_use_extra_life(ref defending_beast);

                    // if either beast is dead, break
                    if attacking_beast.stats.live.current_health == 0
                        || defending_beast.stats.live.current_health == 0 {
                        break;
                    }

                    // attack the summit beast
                    let (_, defender_died) = InternalSummitImpl::_attack(
                        ref world, attacking_beast, ref defending_beast, remaining_attack_potions
                    );

                    // if the defending beast is still alive
                    if !defender_died {
                        // it counter attacks
                        InternalSummitImpl::_attack(ref world, defending_beast, ref attacking_beast, 0);
                    }
                };

                // reset attack streak if 2x base revival time has passed since last death
                if attacking_beast.stats.live.last_death_timestamp
                    + BASE_REVIVAL_TIME_SECONDS * 2 < get_block_timestamp() {
                    attacking_beast.stats.live.attack_streak = 0;
                }

                // check if max xp is reached
                if InternalSummitImpl::_beast_can_get_xp(attacking_beast) {
                    attacking_beast.stats.live.bonus_xp += 10 + attacking_beast.stats.live.attack_streak.into();
                }

                // increase attack streak if less than 10
                if attacking_beast.stats.live.attack_streak < 10 {
                    attacking_beast.stats.live.attack_streak += 1;
                }

                // Remove attack potions
                remaining_attack_potions = 0;

                if attacking_beast.stats.live.current_health == 0 {
                    // set death timestamp for prev summit beast
                    attacking_beast.stats.live.last_death_timestamp = get_block_timestamp();
                    attacking_beast.stats.live.num_deaths += 1;
                    attacking_beast.stats.live.last_killed_by = summit_beast_token_id;
                    // update the live stats of the attacking beast
                    world.write_model(@attacking_beast.stats.live);
                } else if defending_beast.stats.live.current_health == 0 {
                    // finalize the summit history for prev summit beast
                    InternalSummitImpl::_finalize_summit_history(ref world, ref defending_beast);

                    // set death timestamp for prev summit beast
                    defending_beast.stats.live.last_death_timestamp = get_block_timestamp();

                    // initialize summit history for the new beast
                    InternalSummitImpl::_init_summit_history(ref world, attacking_beast_token_id);

                    // set the new summit beast
                    InternalSummitImpl::_set_summit_beast(ref world, attacking_beast_token_id);

                    // Apply extra life potions
                    attacking_beast.stats.live.extra_lives = extra_life_potions;
                    InternalSummitImpl::_burn_consumable(world, ConsumableType::ExtraLife, extra_life_potions);

                    // update the live stats of the attacking beast
                    world.write_model(@attacking_beast.stats.live);
                    break;
                }

                i += 1;
            };

            // update the live stats of the defending beast after all attacks
            world.write_model(@defending_beast.stats.live);

            // Burn consumables
            assert(remaining_revival_potions == 0, 'Unused revival potions');
            InternalSummitImpl::_burn_consumable(world, ConsumableType::Revive, revival_potions);
            InternalSummitImpl::_burn_consumable(world, ConsumableType::Attack, attack_potions);
        }

        fn feed(ref self: ContractState, beast_token_id: u32, adventurer_ids: Span<u64>) {
            let mut world = self.world(DEFAULT_NS());

            // assert the caller owns the beast they are feeding
            InternalSummitImpl::_assert_beast_ownership(beast_token_id);

            let mut beast = InternalSummitImpl::_get_beast(world, beast_token_id);

            let summit_beast_token_id = InternalSummitImpl::_get_summit_beast_token_id(world);

            let mut i = 0;
            while (i < adventurer_ids.len()) {
                let adventurer_id = *adventurer_ids.at(i);
                let adventurer = InternalSummitImpl::_get_adventurer(adventurer_id);

                InternalSummitImpl::_assert_adventurer_ownership(adventurer_id);
                InternalSummitImpl::_assert_beast_can_consume(world, beast, adventurer_id, adventurer);

                beast.stats.live.bonus_health += adventurer.level.into();
                if (beast.stats.live.bonus_health > BEAST_MAX_BONUS_HEALTH) {
                    beast.stats.live.bonus_health = BEAST_MAX_BONUS_HEALTH;
                }

                if beast_token_id == summit_beast_token_id {
                    beast.stats.live.current_health += adventurer.level.into();
                }

                world.write_model(@AdventurerConsumed { token_id: adventurer_id, beast_token_id });
                i += 1;
            };

            world.write_model(@beast.stats.live);
        }

        fn set_consumable_address(ref self: ContractState, consumable: ConsumableType, address: ContractAddress) {
            let mut world = self.world(DEFAULT_NS());
            assert(
                world.dispatcher.is_owner(selector_from_tag!("summit-summit_systems"), get_caller_address()),
                'Not Owner'
            );

            let consumable_model: Consumable = world.read_model(consumable);
            assert(consumable_model.address == contract_address_const::<0x0>(), 'Address already set');
            world.write_model(@Consumable { consumable, address });
        }

        fn set_reward_address(ref self: ContractState, address: ContractAddress) {
            let mut world = self.world(DEFAULT_NS());
            assert(
                world.dispatcher.is_owner(selector_from_tag!("summit-summit_systems"), get_caller_address()),
                'Not Owner'
            );

            let mut summit_reward: SummitReward = world.read_model(1);
            assert(summit_reward.address == contract_address_const::<0x0>(), 'Address already set');
            summit_reward.address = address;
            world.write_model(@summit_reward);
        }

        fn claim_starter_kit(ref self: ContractState, beast_token_ids: Span<u32>) {
            let mut world = self.world(DEFAULT_NS());

            let mut unclaimed_revive_potions = array![];
            let mut unclaimed_attack_potions = array![];
            let mut unclaimed_extra_life_potions = array![];

            let revive_dispatcher = ConsumableERC20Dispatcher {
                contract_address: InternalSummitImpl::_get_consumable_address(world, ConsumableType::Revive)
            };
            let attack_dispatcher = ConsumableERC20Dispatcher {
                contract_address: InternalSummitImpl::_get_consumable_address(world, ConsumableType::Attack)
            };
            let extra_life_dispatcher = ConsumableERC20Dispatcher {
                contract_address: InternalSummitImpl::_get_consumable_address(world, ConsumableType::ExtraLife)
            };

            let mut i = 0;
            while (i < beast_token_ids.len()) {
                let beast_token_id = *beast_token_ids.at(i);
                let mut beast_stats: BeastStats = InternalSummitImpl::_get_beast_stats(world, beast_token_id);

                if !beast_stats.live.has_claimed_starter_kit {
                    if !revive_dispatcher.claimed_starter_kit(beast_token_id) {
                        unclaimed_revive_potions.append(beast_token_id);
                    }

                    if !attack_dispatcher.claimed_starter_kit(beast_token_id) {
                        unclaimed_attack_potions.append(beast_token_id);
                    }

                    if !extra_life_dispatcher.claimed_starter_kit(beast_token_id) {
                        unclaimed_extra_life_potions.append(beast_token_id);
                    }

                    beast_stats.live.has_claimed_starter_kit = true;
                    world.write_model(@beast_stats.live);
                }

                i += 1;
            };

            if unclaimed_revive_potions.len() > 0 {
                revive_dispatcher.claim_starter_kits_for_owner(get_caller_address(), unclaimed_revive_potions);
            }

            if unclaimed_attack_potions.len() > 0 {
                attack_dispatcher.claim_starter_kits_for_owner(get_caller_address(), unclaimed_attack_potions);
            }

            if unclaimed_extra_life_potions.len() > 0 {
                extra_life_dispatcher.claim_starter_kits_for_owner(get_caller_address(), unclaimed_extra_life_potions);
            }
        }

        fn update_all_live_stats(ref self: ContractState, start_id: u32, end_id: u32) {
            let mut world = self.world(DEFAULT_NS());

            let revive_dispatcher = ConsumableERC20Dispatcher {
                contract_address: InternalSummitImpl::_get_consumable_address(world, ConsumableType::Revive)
            };
            let attack_dispatcher = ConsumableERC20Dispatcher {
                contract_address: InternalSummitImpl::_get_consumable_address(world, ConsumableType::Attack)
            };
            let extra_life_dispatcher = ConsumableERC20Dispatcher {
                contract_address: InternalSummitImpl::_get_consumable_address(world, ConsumableType::ExtraLife)
            };

            let mut beast_token_id: u32 = start_id;
            while (beast_token_id <= end_id) {
                let mut beast_stats: BeastStats = InternalSummitImpl::_get_beast_stats(world, beast_token_id);

                if revive_dispatcher.claimed_starter_kit(beast_token_id) && attack_dispatcher.claimed_starter_kit(beast_token_id) && extra_life_dispatcher.claimed_starter_kit(beast_token_id) {
                    beast_stats.live.has_claimed_starter_kit = true;
                }

                world.write_model(@beast_stats.live);
                beast_token_id += 1;
            }
        }

        fn get_summit_beast_token_id(self: @ContractState) -> u32 {
            InternalSummitImpl::_get_summit_beast_token_id(self.world(DEFAULT_NS()))
        }

        fn get_summit_beast(self: @ContractState) -> Beast {
            let world = self.world(DEFAULT_NS());
            let token_id = InternalSummitImpl::_get_summit_beast_token_id(world);
            InternalSummitImpl::_get_beast(world, token_id)
        }

        fn get_summit_history(self: @ContractState, beast_id: u32, lost_at: u64) -> SummitHistory {
            let mut summit_history: SummitHistory = self.world(DEFAULT_NS()).read_model((beast_id, lost_at));
            summit_history
        }

        fn get_beast(self: @ContractState, id: u32) -> Beast {
            InternalSummitImpl::_get_beast(self.world(DEFAULT_NS()), id)
        }

        fn get_beast_stats(self: @ContractState, id: u32) -> BeastStats {
            InternalSummitImpl::_get_beast_stats(self.world(DEFAULT_NS()), id)
        }

        fn get_beast_stats_live(self: @ContractState, id: u32) -> LiveBeastStats {
            let mut beast_live_stats: LiveBeastStats = self.world(DEFAULT_NS()).read_model(id);
            beast_live_stats
        }

        fn get_beast_stats_fixed(self: @ContractState, id: u32) -> FixedBeastStats {
            InternalSummitImpl::_get_beast_fixed_stats(id)
        }

        fn get_consumable_address(self: @ContractState, consumable: ConsumableType) -> ContractAddress {
            InternalSummitImpl::_get_consumable_address(self.world(DEFAULT_NS()), consumable)
        }

        fn get_reward_address(self: @ContractState) -> ContractAddress {
            InternalSummitImpl::_get_reward_address(self.world(DEFAULT_NS()))
        }
    }


    #[generate_trait]
    pub impl InternalSummitImpl of InternalSummitUtils {
        fn _get_summit_beast_token_id(world: WorldStorage) -> u32 {
            let summit: Summit = world.read_model(1);
            summit.beast_token_id
        }

        /// @title get_beast
        /// @notice this function is used to get a beast from the contract
        /// @param token_id the id of the beast
        /// @return Beast the beast
        fn _get_beast(world: WorldStorage, token_id: u32) -> Beast {
            let stats = Self::_get_beast_stats(world, token_id);
            let details = ImplBeastDetails::get_beast_details(stats.fixed.beast_id);
            Beast { token_id, details, stats }
        }

        /// @title get_beast_stats
        /// @notice this function is used to get the stats of a beast
        /// @param token_id the id of the beast
        /// @return BeastStats the stats of the beast
        fn _get_beast_stats(world: WorldStorage, token_id: u32) -> BeastStats {
            let fixed = Self::_get_beast_fixed_stats(token_id);
            let mut live: LiveBeastStats = world.read_model(token_id);
            live.starting_health = fixed.starting_health;
            BeastStats { fixed, live }
        }

        /// @title get_beast_fixed_stats
        /// @notice this function is used to get the fixed stats of a beast
        /// @param token_id the id of the beast
        /// @return BeastFixedStats the fixed stats of the beast
        fn _get_beast_fixed_stats(token_id: u32) -> FixedBeastStats {
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

        fn _get_adventurer(token_id: u64) -> Adventurer {
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
        fn _finalize_summit_history(ref world: WorldStorage, ref beast: Beast) {
            // Token id is 0 if summit was empty
            if beast.token_id == 0 {
                return;
            }

            let mut summit_history: SummitHistory = world.read_model((beast.token_id, 0));
            let current_time = get_block_timestamp();
            let time_on_summit = current_time - summit_history.taken_at;
            summit_history.lost_at = current_time;
            summit_history.rewards = time_on_summit;
            world.write_model(@summit_history);

            // Mint reward
            if (time_on_summit > 0) {
                RewardERC20Dispatcher { contract_address: Self::_get_reward_address(world) }
                    .mint(Self::_get_owner_of_beast(beast.token_id), time_on_summit.into() * 1000000000000000000);
                let mut beast_rewards: BeastRewards = world.read_model(beast.token_id);
                beast_rewards.rewards_earned += time_on_summit;
                world.write_model(@beast_rewards);
            }
        }

        /// @title new_summit_history
        /// @notice this function is used to create a new summit history for a beast
        /// @param token_id the id of the beast that is taking the summits
        fn _init_summit_history(ref world: WorldStorage, token_id: u32) {
            world.write_model(@SummitHistory { id: token_id, lost_at: 0, taken_at: get_block_timestamp(), rewards: 0 });
        }

        /// @title set_summit_beast
        /// @notice this function is used to set the summit beast
        /// @param beast_token_id the token_id of the beast that is taking the summit
        fn _set_summit_beast(ref world: WorldStorage, beast_token_id: u32) {
            world.write_model(@Summit { id: 1, beast_token_id });
        }

        /// @title attack
        /// @notice this function is used to process a beast attacking another beast
        /// @param attacker the beast that is attacking
        /// @param defender a ref to the beast that is defending
        /// @return a tuple containing the combat result and a bool indicating if the defender died
        /// @dev this function only mutates the defender
        fn _attack(
            ref world: WorldStorage, attacker: Beast, ref defender: Beast, attack_potions: u8
        ) -> (CombatResult, bool) {
            let attacker_combat_spec = attacker.get_combat_spec();
            let defender_combat_spec = defender.get_combat_spec();
            let minimum_damage = MINIMUM_DAMAGE;

            let attacker_strength = attack_potions;
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

        fn _burn_consumable(world: WorldStorage, consumable: ConsumableType, amount: u8) {
            if amount > 0 {
                let dispatcher = ConsumableERC20Dispatcher {
                    contract_address: Self::_get_consumable_address(world, consumable)
                };
                let amount_with_decimals: u256 = amount.into() * 1000000000000000000;
                dispatcher.transfer_from(get_caller_address(), get_contract_address(), amount_with_decimals);
                dispatcher.burn(amount_with_decimals);
            }
        }

        /// @title assert_adventurer_ownership
        /// @notice this function is used to assert that the caller is the owner of an adventurer
        /// @param token_id the id of the adventurer
        fn _assert_adventurer_ownership(token_id: u64) {
            let owner = Self::_get_owner_of_adventurer(token_id);
            assert(owner == get_caller_address(), errors::NOT_TOKEN_OWNER);
        }

        /// @title get_owner_of_adventurer
        /// @notice this function is used to get the owner of am adventurer
        /// @param token_id the id of the adventurer
        /// @return ContractAddress the owner of the adventurer
        fn _get_owner_of_adventurer(token_id: u64) -> ContractAddress {
            let contract_address = utils::ADVENTURER_ADDRESS_MAINNET();
            let erc721_dispatcher = IERC721Dispatcher { contract_address };
            erc721_dispatcher.owner_of(token_id.into())
        }

        /// @title assert_beast_ownership
        /// @notice this function is used to assert that the caller is the owner of a beast
        /// @param token_id the id of the beast
        fn _assert_beast_ownership(token_id: u32) {
            let owner = Self::_get_owner_of_beast(token_id);
            assert(owner == get_caller_address(), errors::NOT_TOKEN_OWNER);
        }

        /// @title get_owner_of_beast
        /// @notice this function is used to get the owner of a beast
        /// @param token_id the id of the beast
        /// @return ContractAddress the owner of the beast
        fn _get_owner_of_beast(token_id: u32) -> ContractAddress {
            let contract_address = utils::get_beast_address(get_tx_info().unbox().chain_id);
            let erc721_dispatcher = IERC721Dispatcher { contract_address };
            erc721_dispatcher.owner_of(token_id.into())
        }

        /// @title assert_not_attacking_own_beast
        /// @notice this function is used to assert that a beast is not attacking its own beast
        /// @param attacking_beast_token_id the id of the beast that is attacking
        fn _assert_not_attacking_own_beast(world: WorldStorage, attacking_beast_token_id: u32) {
            let summit_beast_token_id = Self::_get_summit_beast_token_id(world);
            let summit_owner = Self::_get_owner_of_beast(summit_beast_token_id);
            let attacking_owner = Self::_get_owner_of_beast(attacking_beast_token_id);
            assert(attacking_owner != summit_owner, errors::BEAST_ATTACKING_OWN_BEAST);
        }

        /// @title _use_revival_potions
        /// @notice this function is used to apply revival potions if needed
        /// @param live_beast_stats the stats of the beast to check
        fn _use_revival_potions(ref beast: Beast, ref remaining_potions: u8) -> u8 {
            let last_death_timestamp = beast.stats.live.last_death_timestamp;
            let current_time = get_block_timestamp();
            let time_since_death = current_time - last_death_timestamp;

            if time_since_death < BASE_REVIVAL_TIME_SECONDS {
                Self::_assert_beast_can_be_revived(beast, remaining_potions);

                remaining_potions -= beast.stats.live.revival_count + 1;

                if beast.stats.live.revival_count < MAX_REVIVAL_COUNT {
                    beast.stats.live.revival_count += 1;
                }
            }

            remaining_potions
        }

        /// @title beast_can_get_xp
        /// @notice this function is used to check if a beast can get xp
        /// @param beast the beast to check
        /// @return bool true if the beast can get xp, false otherwise
        fn _beast_can_get_xp(beast: Beast) -> bool {
            let base_xp = beast.stats.fixed.level * beast.stats.fixed.level;
            let max_xp = (beast.stats.fixed.level + BEAST_MAX_BONUS_LVLS)
                * (beast.stats.fixed.level + BEAST_MAX_BONUS_LVLS);

            beast.stats.live.bonus_xp < max_xp - base_xp
        }

        /// @title assert_beast_can_consume
        /// @notice this function is used to assert that a beast can consume an adventurer
        /// @param beast the beast to check
        /// @param adventurer the adventurer to check
        fn _assert_beast_can_consume(world: WorldStorage, beast: Beast, adventurer_id: u64, adventurer: Adventurer) {
            assert(beast.stats.live.bonus_health < BEAST_MAX_BONUS_HEALTH, errors::BEAST_MAX_BONUS_HEALTH);
            assert(adventurer.health == 0, errors::ADVENTURER_ALIVE);
            assert(adventurer.rank_at_death == 0, errors::ADVENTURER_RANKED);

            let adventurer_consumed: AdventurerConsumed = world.read_model((adventurer_id));
            assert(adventurer_consumed.beast_token_id == 0, errors::ADVENTURER_ALREADY_CONSUMED);
        }

        fn _assert_beast_can_be_revived(beast: Beast, potion_count: u8) {
            assert(beast.stats.live.current_health == 0, errors::BEAST_ALIVE);
            assert(potion_count >= beast.stats.live.revival_count + 1, errors::NOT_ENOUGH_CONSUMABLES);
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

        fn _use_extra_life(ref beast: Beast) {
            if beast.stats.live.current_health == 0 && beast.stats.live.extra_lives > 0 {
                beast.stats.live.extra_lives -= 1;
                beast.stats.live.current_health = beast.stats.fixed.starting_health.into()
                    + beast.stats.live.bonus_health;
            }
        }

        fn _get_consumable_address(world: WorldStorage, consumable: ConsumableType) -> ContractAddress {
            let consumable_model: Consumable = world.read_model(consumable);
            consumable_model.address
        }

        fn _get_reward_address(world: WorldStorage) -> ContractAddress {
            let summit_reward: SummitReward = world.read_model(1);
            summit_reward.address
        }

        fn _get_empty_summit_beast(world: WorldStorage) -> Beast {
            let live_stats: LiveBeastStats = world.read_model(0);

            Beast {
                token_id: 0,
                details: ImplBeastDetails::get_beast_details(1),
                stats: BeastStats {
                    fixed: FixedBeastStats { beast_id: 0, special_1: 0, special_2: 0, level: 0, starting_health: 0, },
                    live: live_stats
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use dojo::model::{Model, ModelTest, ModelIndex, ModelEntityTest};
    use dojo::utils::test::deploy_contract;
    use dojo::world::{IWorldDispatcherTrait, IWorldDispatcher};
    use summit::constants::TESTING_CHAIN_ID;
    use summit::models::beast::{Beast, BeastDetails, BeastDetailsStore, BeastStats, BeastStatsStore, Type, Tier};
    use summit::models::consumable::{Consumable, ConsumableDetails, ConsumableDetailsStore};
    use summit::models::summit::{Summit, SummitStore, SummitHistory, SummitHistoryStore};
    use super::{summit_systems, ISummitSystemDispatcher, ISummitSystemDispatcherTrait};

    /// @title setup_world
    /// @notice this function is used to setup the world for testing
    /// @return world the world dispatcher
    /// @return summit_system the summit system dispatcher
    fn setup_world() -> (IWorldDispatcher, ISummitSystemDispatcher) {
        starknet::testing::set_chain_id(TESTING_CHAIN_ID);

        let world = spawn_test_world!();

        let contract_address = world.deploy_contract('salt', summit_systems::TEST_CLASS_HASH.try_into().unwrap());

        let summit_system = ISummitSystemDispatcher { contract_address };

        (world, summit_system)
    }

    #[test]
    fn test_take_summit() {
        let starting_time = 1724927366;
        starknet::testing::set_block_timestamp(starting_time);

        let (world, summit_system) = setup_world();

        let summit = Summit { id: 1, beast_id: 1 };
        let summit_history = SummitHistory { id: 1, lost_at: 0, taken_at: starting_time, rewards: 0 };

        let defender_id = 1;
        let summit_beast_stats = BeastStats { id: defender_id, health: 100, dead_at: 0, };
        let summit_beast_details = BeastDetails {
            id: defender_id, _type: Type::Magic_or_Cloth, tier: Tier::T1, level: 5, starting_health: 100
        };

        let attacker_id = 2;
        let attacking_beast_stats = BeastStats { id: attacker_id, health: 100, dead_at: 0, };
        let attacking_beast_details = BeastDetails {
            id: attacker_id, _type: Type::Blade_or_Hide, tier: Tier::T2, level: 10, starting_health: 100
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
