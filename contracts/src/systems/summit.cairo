use starknet::ContractAddress;
use summit::models::beast::{Beast};
use summit::models::summit::{SummitConfig, SummitHistory};

#[starknet::interface]
trait ISummitSystem<T> {
    fn attack(
        ref self: T,
        defending_beast_token_id: u32,
        attacking_beast_token_ids: Span<u32>,
        revival_potions: u8,
        attack_potions: u8,
        extra_life_potions: u8,
    );
    fn feed(ref self: T, beast_token_id: u32, adventurer_ids: Span<u64>);
    fn claim_starter_kit(ref self: T, beast_token_ids: Span<u32>);

    fn get_summit_data(self: @T) -> (Beast, SummitHistory, ContractAddress);
    fn get_summit_config(self: @T) -> SummitConfig;
    fn get_summit_history(self: @T, beast_token_id: u32, lost_at: u64) -> SummitHistory;
    fn get_summit_beast_token_id(self: @T) -> u32;
    fn get_summit_beast(self: @T) -> Beast;
    fn get_beast(self: @T, beast_token_id: u32) -> Beast;
}

#[dojo::contract]
pub mod summit_systems {
    use beasts_nft::interfaces::{IBeastsDispatcher, IBeastsDispatcherTrait};
    use beasts_nft::pack::PackableBeast;
    use core::num::traits::{Sqrt};
    use death_mountain::models::adventurer::adventurer::{Adventurer, ImplAdventurer};
    use death_mountain::models::beast::{ImplBeast};
    use death_mountain::models::combat::{CombatResult, CombatSpec, ImplCombat, SpecialPowers};
    use death_mountain::systems::adventurer::contracts::{
        IAdventurerSystemsDispatcher, IAdventurerSystemsDispatcherTrait,
    };
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use dojo::world::WorldStorage;

    use openzeppelin_token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};

    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};

    use summit::constants::{
        BASE_REVIVAL_TIME_SECONDS, BEAST_MAX_BONUS_HEALTH, BEAST_MAX_BONUS_LVLS, DEFAULT_NS, EIGHT_BITS_MAX,
        MAX_REVIVAL_COUNT, MINIMUM_DAMAGE, SUMMIT_ID, TOKEN_DECIMALS, errors,
    };
    use summit::erc20::interface::{
        ConsumableERC20Dispatcher, ConsumableERC20DispatcherTrait, RewardERC20Dispatcher, RewardERC20DispatcherTrait,
    };
    use summit::models::adventurer::{AdventurerConsumed};
    use summit::models::beast::{Beast, LiveBeastStats};
    use summit::models::summit::{
        AttackEvent, BeastEvent, FeedEvent, GameEvent, GameEventDetails, Summit, SummitConfig, SummitEvent,
        SummitHistory,
    };

    /// @title Dojo Init
    /// @notice Initializes the contract
    /// @dev This is the constructor for the contract. It is called once when the contract is
    /// deployed.
    ///
    /// @param creator_address: the address of the creator of the game
    fn dojo_init(
        ref self: ContractState,
        adventurer_address: ContractAddress,
        denshokan_address: ContractAddress,
        dungeon_address: ContractAddress,
        beast_address: ContractAddress,
        reward_address: ContractAddress,
        attack_potion_address: ContractAddress,
        revive_potion_address: ContractAddress,
        extra_life_potion_address: ContractAddress,
    ) {
        let mut world: WorldStorage = self.world(@DEFAULT_NS());

        let start_token_id = 1;
        let mut beast = InternalSummitImpl::_get_beast(world, start_token_id);
        beast.live.current_health = beast.fixed.health;
        world.write_model(@beast.live);
        
        InternalSummitImpl::_init_summit_history(ref world, start_token_id);
        InternalSummitImpl::_set_summit_beast(ref world, start_token_id);

        world
            .write_model(
                @SummitConfig {
                    summit_id: SUMMIT_ID,
                    adventurer_address: adventurer_address,
                    denshokan_address: denshokan_address,
                    dungeon_address: dungeon_address,
                    beast_address: beast_address,
                    reward_address: reward_address,
                    attack_potion_address: attack_potion_address,
                    revive_potion_address: revive_potion_address,
                    extra_life_potion_address: extra_life_potion_address,
                },
            );
    }

    #[abi(embed_v0)]
    impl SummitSystemImpl of super::ISummitSystem<ContractState> {
        fn attack(
            ref self: ContractState,
            defending_beast_token_id: u32,
            attacking_beast_token_ids: Span<u32>,
            revival_potions: u8,
            attack_potions: u8,
            extra_life_potions: u8,
        ) {
            let mut world = self.world(@DEFAULT_NS());

            // assert the provided defending beast is the summit beast
            let summit_beast_token_id = InternalSummitImpl::_get_summit_beast_token_id(world);
            assert(defending_beast_token_id == summit_beast_token_id, errors::SUMMIT_BEAST_CHANGED);

            // assert consumable amounts
            assert(attack_potions <= EIGHT_BITS_MAX, errors::MAX_ATTACK_POTION);
            assert(extra_life_potions <= EIGHT_BITS_MAX, errors::BEAST_MAX_EXTRA_LIVES);

            let summit_config: SummitConfig = world.read_model(SUMMIT_ID);
            let beast_dispatcher = IERC721Dispatcher { contract_address: summit_config.beast_address };

            let summit_owner = beast_dispatcher.owner_of(summit_beast_token_id.into());

            let mut defending_beast = InternalSummitImpl::_get_beast(world, summit_beast_token_id);

            let mut remaining_attack_potions = attack_potions;
            let mut remaining_revival_potions = revival_potions;

            let mut game_events: Array<GameEventDetails> = array![];
            let current_time = get_block_timestamp();

            let mut i = 0;
            while (i < attacking_beast_token_ids.len()) {
                let attacking_beast_token_id = *attacking_beast_token_ids.at(i);

                // assert the caller owns the beast they attacking with
                let beast_owner = beast_dispatcher.owner_of(attacking_beast_token_id.into());
                assert(beast_owner == get_caller_address(), errors::NOT_TOKEN_OWNER);

                // assert not attacking own beast
                assert(beast_owner != summit_owner, errors::BEAST_ATTACKING_OWN_BEAST);

                // get stats for the beast that is attacking
                let mut attacking_beast = InternalSummitImpl::_get_beast(world, attacking_beast_token_id);

                // assert the attacking beast is alive
                remaining_revival_potions =
                    InternalSummitImpl::_use_revival_potions(ref attacking_beast, ref remaining_revival_potions);

                // reset health to starting health plus any bonus health they have accrued
                // @dev beasts attack till death so we don't need any additional logic

                // Add the bonus health to the beast
                attacking_beast.live.current_health = attacking_beast.fixed.health + attacking_beast.live.bonus_health;

                // Add bonus xp to the beast
                let total_xp = attacking_beast.fixed.level * attacking_beast.fixed.level
                    + attacking_beast.live.bonus_xp;
                attacking_beast.fixed.level = total_xp.sqrt().into();

                let summit_health = defending_beast.live.current_health;

                // loop until the attacking beast is dead or the summit beast is dead
                loop {
                    InternalSummitImpl::_use_extra_life(ref defending_beast);

                    // if either beast is dead, break
                    if attacking_beast.live.current_health == 0 || defending_beast.live.current_health == 0 {
                        break;
                    }

                    // attack the summit beast
                    let (_, defender_died) = InternalSummitImpl::_attack(
                        ref world, attacking_beast, ref defending_beast, remaining_attack_potions,
                    );

                    // if the defending beast is still alive
                    if !defender_died {
                        // it counter attacks
                        InternalSummitImpl::_attack(ref world, defending_beast, ref attacking_beast, 0);
                    }
                };

                game_events
                    .append(
                        GameEventDetails::attack(
                            AttackEvent {
                                beast: InternalSummitImpl::_get_beast_event(attacking_beast),
                                live_stats: attacking_beast.live,
                                attack_potions: remaining_attack_potions,
                                damage: summit_health - defending_beast.live.current_health,
                                defending_beast_token_id,
                                owner: beast_owner,
                                timestamp: current_time,
                            },
                        ),
                    );

                // reset attack streak if 2x base revival time has passed since last death
                if attacking_beast.live.last_death_timestamp + BASE_REVIVAL_TIME_SECONDS * 2 < get_block_timestamp() {
                    attacking_beast.live.attack_streak = 0;
                }

                // check if max xp is reached
                if InternalSummitImpl::_beast_can_get_xp(attacking_beast) {
                    attacking_beast.live.bonus_xp += 10 + attacking_beast.live.attack_streak.into();
                }

                // increase attack streak if less than 10
                if attacking_beast.live.attack_streak < 10 {
                    attacking_beast.live.attack_streak += 1;
                }

                // Remove attack potions
                remaining_attack_potions = 0;

                if attacking_beast.live.current_health == 0 {
                    // set death timestamp for prev summit beast
                    attacking_beast.live.last_death_timestamp = get_block_timestamp();
                    attacking_beast.live.num_deaths += 1;
                    attacking_beast.live.last_killed_by = summit_beast_token_id;
                    // update the live stats of the attacking beast
                    world.write_model(@attacking_beast.live);
                } else if defending_beast.live.current_health == 0 {
                    // finalize the summit history for prev summit beast
                    InternalSummitImpl::_finalize_summit_history(ref world, ref defending_beast, summit_owner);

                    // set death timestamp for prev summit beast
                    defending_beast.live.last_death_timestamp = get_block_timestamp();

                    // initialize summit history for the new beast
                    InternalSummitImpl::_init_summit_history(ref world, attacking_beast_token_id);

                    // set the new summit beast
                    InternalSummitImpl::_set_summit_beast(ref world, attacking_beast_token_id);

                    // Apply extra life potions
                    attacking_beast.live.extra_lives = extra_life_potions;
                    InternalSummitImpl::_burn_consumable(summit_config.extra_life_potion_address, extra_life_potions);

                    // update the live stats of the attacking beast
                    world.write_model(@attacking_beast.live);

                    game_events
                        .append(
                            GameEventDetails::summit(
                                SummitEvent {
                                    beast: InternalSummitImpl::_get_beast_event(attacking_beast),
                                    live_stats: attacking_beast.live,
                                    owner: beast_owner,
                                    timestamp: current_time,
                                    defending_beast_token_id,
                                },
                            ),
                        );
                    break;
                }

                i += 1;
            };

            // update the live stats of the defending beast after all attacks
            world.write_model(@defending_beast.live);

            // Burn consumables
            assert(remaining_revival_potions == 0, 'Unused revival potions');
            InternalSummitImpl::_burn_consumable(summit_config.revive_potion_address, revival_potions);
            InternalSummitImpl::_burn_consumable(summit_config.attack_potion_address, attack_potions);

            while (game_events.len() > 0) {
                let event = game_events.pop_front().unwrap();
                InternalSummitImpl::_emit_game_event(ref world, event);
            }
        }

        fn feed(ref self: ContractState, beast_token_id: u32, adventurer_ids: Span<u64>) {
            let mut world = self.world(@DEFAULT_NS());
            let summit_config: SummitConfig = world.read_model(SUMMIT_ID);

            // assert the caller owns the beast they are feeding
            let beast_dispatcher = IERC721Dispatcher { contract_address: summit_config.beast_address };
            assert(beast_dispatcher.owner_of(beast_token_id.into()) == get_caller_address(), errors::NOT_TOKEN_OWNER);

            let mut beast = InternalSummitImpl::_get_beast(world, beast_token_id);
            let summit_beast_token_id = InternalSummitImpl::_get_summit_beast_token_id(world);
            let previous_bonus_health = beast.live.bonus_health;

            let mut i = 0;
            while (i < adventurer_ids.len()) {
                let adventurer_id = *adventurer_ids.at(i);
                let adventurer = InternalSummitImpl::_get_adventurer(summit_config, adventurer_id);

                InternalSummitImpl::_assert_beast_can_consume(world, beast, adventurer_id, adventurer.health);

                let level: u16 = adventurer.get_level().into();
                beast.live.bonus_health += level;
                if (beast.live.bonus_health > BEAST_MAX_BONUS_HEALTH) {
                    beast.live.bonus_health = BEAST_MAX_BONUS_HEALTH;
                }

                if beast_token_id == summit_beast_token_id {
                    beast.live.current_health += level;
                }

                world.write_model(@AdventurerConsumed { adventurer_id, beast_token_id });
                i += 1;
            };

            InternalSummitImpl::_emit_game_event(
                ref world,
                GameEventDetails::feed(
                    FeedEvent {
                        beast: InternalSummitImpl::_get_beast_event(beast),
                        live_stats: beast.live,
                        health_increase: beast.live.bonus_health - previous_bonus_health,
                        adventurer_count: adventurer_ids.len(),
                        owner: get_caller_address(),
                        timestamp: get_block_timestamp(),
                    },
                ),
            );

            world.write_model(@beast.live);
        }

        fn claim_starter_kit(ref self: ContractState, beast_token_ids: Span<u32>) {
            let mut world = self.world(@DEFAULT_NS());

            let mut unclaimed_revive_potions = array![];
            let mut unclaimed_attack_potions = array![];
            let mut unclaimed_extra_life_potions = array![];

            let summit_config: SummitConfig = world.read_model(SUMMIT_ID);
            let revive_dispatcher = ConsumableERC20Dispatcher { contract_address: summit_config.revive_potion_address };
            let attack_dispatcher = ConsumableERC20Dispatcher { contract_address: summit_config.attack_potion_address };
            let extra_life_dispatcher = ConsumableERC20Dispatcher {
                contract_address: summit_config.extra_life_potion_address,
            };

            let mut i = 0;
            while (i < beast_token_ids.len()) {
                let beast_token_id = *beast_token_ids.at(i);
                let mut beast = InternalSummitImpl::_get_beast(world, beast_token_id);

                if !beast.live.has_claimed_starter_kit {
                    if !revive_dispatcher.claimed_starter_kit(beast_token_id) {
                        unclaimed_revive_potions.append(beast_token_id);
                    }

                    if !attack_dispatcher.claimed_starter_kit(beast_token_id) {
                        unclaimed_attack_potions.append(beast_token_id);
                    }

                    if !extra_life_dispatcher.claimed_starter_kit(beast_token_id) {
                        unclaimed_extra_life_potions.append(beast_token_id);
                    }

                    beast.live.has_claimed_starter_kit = true;
                    world.write_model(@beast.live);
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

        fn get_summit_data(self: @ContractState) -> (Beast, SummitHistory, ContractAddress) {
            let world = self.world(@DEFAULT_NS());
            let summit_config: SummitConfig = world.read_model(SUMMIT_ID);
            let token_id = InternalSummitImpl::_get_summit_beast_token_id(world);
            let beast = InternalSummitImpl::_get_beast(world, token_id);
            let summit_history: SummitHistory = world.read_model((token_id, 0));
            let beast_dispatcher = IERC721Dispatcher { contract_address: summit_config.beast_address };
            let summit_owner = beast_dispatcher.owner_of(token_id.into());
            (beast, summit_history, summit_owner)
        }

        fn get_summit_beast_token_id(self: @ContractState) -> u32 {
            InternalSummitImpl::_get_summit_beast_token_id(self.world(@DEFAULT_NS()))
        }

        fn get_summit_beast(self: @ContractState) -> Beast {
            let world = self.world(@DEFAULT_NS());
            let token_id = InternalSummitImpl::_get_summit_beast_token_id(world);
            InternalSummitImpl::_get_beast(world, token_id)
        }

        fn get_summit_history(self: @ContractState, beast_token_id: u32, lost_at: u64) -> SummitHistory {
            let mut summit_history: SummitHistory = self.world(@DEFAULT_NS()).read_model((beast_token_id, lost_at));
            summit_history
        }

        fn get_beast(self: @ContractState, beast_token_id: u32) -> Beast {
            InternalSummitImpl::_get_beast(self.world(@DEFAULT_NS()), beast_token_id)
        }

        fn get_summit_config(self: @ContractState) -> SummitConfig {
            self.world(@DEFAULT_NS()).read_model(SUMMIT_ID)
        }
    }


    #[generate_trait]
    pub impl InternalSummitImpl of InternalSummitUtils {
        fn _get_summit_beast_token_id(world: WorldStorage) -> u32 {
            let summit: Summit = world.read_model(SUMMIT_ID);
            summit.beast_token_id
        }

        /// @title get_beast
        /// @notice this function is used to get a beast from the contract
        /// @param token_id the id of the beast
        /// @return Beast the beast
        fn _get_beast(world: WorldStorage, token_id: u32) -> Beast {
            let summit_config: SummitConfig = world.read_model(SUMMIT_ID);
            let fixed: PackableBeast = IBeastsDispatcher { contract_address: summit_config.beast_address }
                .get_beast(token_id.into());
            let live: LiveBeastStats = world.read_model(token_id);
            Beast { fixed, live }
        }

        fn get_combat_spec(self: Beast) -> CombatSpec {
            let beast_tier = ImplBeast::get_tier(self.fixed.id);
            let beast_type = ImplBeast::get_type(self.fixed.id);
            let level = self.fixed.level;

            // TODO: disable specials until we think of a good way to use them
            let specials = SpecialPowers { special1: 0, special2: 0, special3: 0 };

            CombatSpec { tier: beast_tier, item_type: beast_type, level, specials }
        }

        fn _get_adventurer(summit_config: SummitConfig, id: u64) -> Adventurer {
            let adventurer_systems_address = summit_config.adventurer_address;
            let adventurer_systems = IAdventurerSystemsDispatcher { contract_address: adventurer_systems_address };
            let dungeon = adventurer_systems.get_adventurer_dungeon(id);
            assert!(dungeon == summit_config.dungeon_address, "Adventurer not from beast mode dungeon");

            let adventurer_token = IERC721Dispatcher { contract_address: summit_config.denshokan_address };
            assert!(adventurer_token.owner_of(id.into()) == get_caller_address(), "Not Owner");

            adventurer_systems.get_adventurer(id)
        }

        /// @title finalize_summit_history
        /// @notice this function is used to finalize the summit history for a beast
        /// @dev we use beast id and lost_at as the key which allows us to get the record of the
        /// current beast using (id, 0)
        ///     we then set the lost_at to the current timestamp to mark the end of the current
        ///     beast's summit if the beast takes the hill again, it'll have a different key pair
        /// @param token_id the id of the beast
        fn _finalize_summit_history(ref world: WorldStorage, ref beast: Beast, summit_owner: ContractAddress) {
            let mut summit_history: SummitHistory = world.read_model((beast.live.token_id, 0));
            let current_time = get_block_timestamp();
            let time_on_summit = current_time - summit_history.taken_at;
            summit_history.lost_at = current_time;
            world.write_model(@summit_history);

            // Mint reward
            // if (time_on_summit > 0) {
            //     let summit_config: SummitConfig = world.read_model(SUMMIT_ID);
            //     let reward_dispatcher = RewardERC20Dispatcher { contract_address: summit_config.reward_address };
            //     reward_dispatcher.mint(summit_owner, time_on_summit.into() * TOKEN_DECIMALS);
            //     beast.live.rewards_earned += time_on_summit;
            // }
        }

        /// @title new_summit_history
        /// @notice this function is used to create a new summit history for a beast
        /// @param token_id the id of the beast that is taking the summits
        fn _init_summit_history(ref world: WorldStorage, token_id: u32) {
            world
                .write_model(
                    @SummitHistory {
                        beast_token_id: token_id, lost_at: 0, taken_at: get_block_timestamp(),
                    },
                );
        }

        /// @title set_summit_beast
        /// @notice this function is used to set the summit beast
        /// @param beast_token_id the token_id of the beast that is taking the summit
        fn _set_summit_beast(ref world: WorldStorage, beast_token_id: u32) {
            world.write_model(@Summit { summit_id: SUMMIT_ID, beast_token_id });
        }

        /// @title attack
        /// @notice this function is used to process a beast attacking another beast
        /// @param attacker the beast that is attacking
        /// @param defender a ref to the beast that is defending
        /// @return a tuple containing the combat result and a bool indicating if the defender died
        /// @dev this function only mutates the defender
        fn _attack(
            ref world: WorldStorage, attacker: Beast, ref defender: Beast, attack_potions: u8,
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
                critical_hit_rnd,
            );

            if combat_result.total_damage >= defender.live.current_health {
                defender.live.current_health = 0;
            } else {
                defender.live.current_health -= combat_result.total_damage;
            }

            let defender_died = defender.live.current_health == 0;

            (combat_result, defender_died)
        }

        fn _burn_consumable(consumable_address: ContractAddress, amount: u8) {
            if amount > 0 {
                let amount_with_decimals: u256 = amount.into() * TOKEN_DECIMALS;
                ConsumableERC20Dispatcher { contract_address: consumable_address }
                    .burn_from(get_caller_address(), amount_with_decimals);
            }
        }

        /// @title _use_revival_potions
        /// @notice this function is used to apply revival potions if needed
        /// @param live_beast_stats the stats of the beast to check
        fn _use_revival_potions(ref beast: Beast, ref remaining_potions: u8) -> u8 {
            let last_death_timestamp = beast.live.last_death_timestamp;
            let current_time = get_block_timestamp();
            let time_since_death = current_time - last_death_timestamp;

            if time_since_death < BASE_REVIVAL_TIME_SECONDS {
                Self::_assert_beast_can_be_revived(beast, remaining_potions);

                remaining_potions -= beast.live.revival_count + 1;

                if beast.live.revival_count < MAX_REVIVAL_COUNT {
                    beast.live.revival_count += 1;
                }
            }

            remaining_potions
        }

        /// @title beast_can_get_xp
        /// @notice this function is used to check if a beast can get xp
        /// @param beast the beast to check
        /// @return bool true if the beast can get xp, false otherwise
        fn _beast_can_get_xp(beast: Beast) -> bool {
            let base_xp = beast.fixed.level * beast.fixed.level;
            let max_xp = (beast.fixed.level + BEAST_MAX_BONUS_LVLS) * (beast.fixed.level + BEAST_MAX_BONUS_LVLS);

            beast.live.bonus_xp < max_xp - base_xp
        }

        /// @title assert_beast_can_consume
        /// @notice this function is used to assert that a beast can consume an adventurer
        /// @param beast the beast to check
        /// @param adventurer_id the id of the adventurer to check
        /// @param health the health of the adventurer to check
        fn _assert_beast_can_consume(world: WorldStorage, beast: Beast, adventurer_id: u64, health: u16) {
            assert(beast.live.bonus_health < BEAST_MAX_BONUS_HEALTH, errors::BEAST_MAX_BONUS_HEALTH);
            assert(health == 0, errors::ADVENTURER_ALIVE);

            let adventurer_consumed: AdventurerConsumed = world.read_model((adventurer_id));
            assert(adventurer_consumed.beast_token_id == 0, errors::ADVENTURER_ALREADY_CONSUMED);
        }

        fn _assert_beast_can_be_revived(beast: Beast, potion_count: u8) {
            assert(beast.live.current_health == 0, errors::BEAST_ALIVE);
            assert(potion_count >= beast.live.revival_count + 1, errors::NOT_ENOUGH_CONSUMABLES);
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
            if beast.live.current_health == 0 && beast.live.extra_lives > 0 {
                beast.live.extra_lives -= 1;
                beast.live.current_health = beast.fixed.health.into() + beast.live.bonus_health;
            }
        }


        fn _get_beast_event(beast: Beast) -> BeastEvent {
            BeastEvent {
                id: beast.fixed.id,
                prefix: beast.fixed.prefix,
                suffix: beast.fixed.suffix,
                level: beast.fixed.level,
                health: beast.fixed.health,
                shiny: beast.fixed.shiny,
                animated: beast.fixed.animated,
            }
        }

        // ------------------------------------------ //
        // ------------ Emit events ----------------- //
        // ------------------------------------------ //
        fn _emit_game_event(ref world: WorldStorage, event: GameEventDetails) {
            world.emit_event(@GameEvent { summit_id: SUMMIT_ID, details: event });
        }
    }
}

#[cfg(test)]
mod tests {
    use dojo::model::{Model, ModelEntityTest, ModelIndex, ModelTest};
    use dojo::utils::test::deploy_contract;
    use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait};
    use summit::constants::TESTING_CHAIN_ID;
    use summit::models::beast::{Beast, BeastDetails, BeastDetailsStore, BeastStats, BeastStatsStore, Tier, Type};
    use summit::models::consumable::{Consumable, ConsumableDetails, ConsumableDetailsStore};
    use summit::models::summit::{Summit, SummitHistory, SummitHistoryStore, SummitStore};
    use super::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait, summit_systems};

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
        let summit_beast_stats = BeastStats { id: defender_id, health: 100, dead_at: 0 };
        let summit_beast_details = BeastDetails {
            id: defender_id, _type: Type::Magic_or_Cloth, tier: Tier::T1, level: 5, starting_health: 100,
        };

        let attacker_id = 2;
        let attacking_beast_stats = BeastStats { id: attacker_id, health: 100, dead_at: 0 };
        let attacking_beast_details = BeastDetails {
            id: attacker_id, _type: Type::Blade_or_Hide, tier: Tier::T2, level: 10, starting_health: 100,
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
        assert(prev_summit_beast.live.current_health == 0, 'prev summit beast health');
        assert(prev_summit_beast.live.dead_at == summit_change_time, 'prev summit beast dead_at');

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
