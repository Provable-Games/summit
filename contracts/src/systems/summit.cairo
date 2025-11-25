use starknet::ContractAddress;
use summit::models::beast::{Beast, Stats};

#[starknet::interface]
trait ISummitSystem<T> {
    fn start_summit(ref self: T);
    fn attack(
        ref self: T,
        defending_beast_token_id: u32,
        attacking_beast_token_ids: Span<u32>,
        revival_potions: u16,
        attack_potions: u8,
        extra_life_potions: u8,
        vrf: bool,
    );
    fn attack_unsafe(
        ref self: T,
        attacking_beast_token_ids: Span<u32>,
        revival_potions: u16,
        attack_potions: u8,
        extra_life_potions: u8,
    );
    fn feed(ref self: T, beast_token_id: u32, amount: u16);
    fn claim_beast_reward(ref self: T, beast_token_ids: Span<u32>);
    fn claim_corpse_reward(ref self: T, adventurer_ids: Span<u64>);

    fn add_extra_life(ref self: T, beast_token_id: u32, extra_life_potions: u8);
    fn apply_stat_points(ref self: T, beast_token_id: u32, stats: Stats);
    fn apply_poison(ref self: T, beast_token_id: u32, count: u16);
    fn get_summit_data(ref self: T) -> (Beast, u64, ContractAddress, u16, u64, felt252);

    fn get_start_timestamp(self: @T) -> u64;
    fn get_summit_beast_token_id(self: @T) -> u32;
    fn get_summit_beast(self: @T) -> Beast;
    fn get_beast(self: @T, beast_token_id: u32) -> Beast;
}

#[dojo::contract]
pub mod summit_systems {
    use beasts_nft::interfaces::{IBeastsDispatcher, IBeastsDispatcherTrait};
    use beasts_nft::pack::PackableBeast;
    use core::num::traits::{Sqrt};
    use core::poseidon::poseidon_hash_span;
    use death_mountain::models::adventurer::adventurer::{Adventurer, ImplAdventurer};
    use death_mountain::models::beast::{ImplBeast};
    use death_mountain::models::combat::{CombatSpec, ImplCombat, SpecialPowers};
    use death_mountain::systems::adventurer::contracts::{
        IAdventurerSystemsDispatcher, IAdventurerSystemsDispatcherTrait,
    };
    use death_mountain::systems::beast::contracts::{IBeastSystemsDispatcher, IBeastSystemsDispatcherTrait};
    use dojo::event::EventStorage;
    use dojo::world::WorldStorage;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    use openzeppelin_token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};

    use starknet::storage::{Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_block_number, get_block_timestamp, get_caller_address};

    use summit::constants::{
        BASE_REVIVAL_TIME_SECONDS, BEAST_MAX_BONUS_HEALTH, BEAST_MAX_BONUS_LVLS, DAY_SECONDS, DEFAULT_NS,
        EIGHT_BITS_MAX, MAX_REVIVAL_COUNT, MINIMUM_DAMAGE, TOKEN_DECIMALS, errors,
    };
    use summit::erc20::interface::{SummitERC20Dispatcher, SummitERC20DispatcherTrait};
    use summit::models::beast::{Beast, BeastUtilsImpl, LiveBeastStats, Stats};
    use summit::models::summit::{
        BattleEvent, BeastEvent, CorpseRewardEvent, DiplomacyEvent, LiveBeastStatsEvent, PoisonEvent, RewardEvent,
        SummitEvent,
    };
    use summit::vrf::VRFImpl;

    #[storage]
    struct Storage {
        summit_beast_token_id: u32,
        live_beast_stats: Map<u32, LiveBeastStats>,
        poison_timestamp: u64,
        poison_count: u16,
        summit_history: Map<u32, u64>,
        adventurer_consumed: Map<u64, bool>,
        diplomacy_beast: Map<felt252, Map<u8, u32>>, // (prefix-suffix hash) -> (index) -> beast token id
        diplomacy_count: Map<felt252, u8>,
        start_timestamp: u64,
        adventurer_address: ContractAddress,
        denshokan_address: ContractAddress,
        dungeon_address: ContractAddress,
        beast_address: ContractAddress,
        beast_data_address: ContractAddress,
        reward_address: ContractAddress,
        attack_potion_address: ContractAddress,
        revive_potion_address: ContractAddress,
        extra_life_potion_address: ContractAddress,
        poison_potion_address: ContractAddress,
        kill_token_address: ContractAddress,
        corpse_token_address: ContractAddress,
    }

    /// @title Dojo Init
    /// @notice Initializes the contract
    /// @dev This is the constructor for the contract. It is called once when the contract is
    /// deployed.
    ///
    /// @param creator_address: the address of the creator of the game
    fn dojo_init(
        ref self: ContractState,
        start_timestamp: u64,
        adventurer_address: ContractAddress,
        denshokan_address: ContractAddress,
        dungeon_address: ContractAddress,
        beast_address: ContractAddress,
        beast_data_address: ContractAddress,
        reward_address: ContractAddress,
        attack_potion_address: ContractAddress,
        revive_potion_address: ContractAddress,
        extra_life_potion_address: ContractAddress,
        poison_potion_address: ContractAddress,
        kill_token_address: ContractAddress,
        corpse_token_address: ContractAddress,
    ) {
        self.start_timestamp.write(start_timestamp);
        self.adventurer_address.write(adventurer_address);
        self.denshokan_address.write(denshokan_address);
        self.dungeon_address.write(dungeon_address);
        self.beast_address.write(beast_address);
        self.beast_data_address.write(beast_data_address);
        self.reward_address.write(reward_address);
        self.attack_potion_address.write(attack_potion_address);
        self.revive_potion_address.write(revive_potion_address);
        self.extra_life_potion_address.write(extra_life_potion_address);
        self.poison_potion_address.write(poison_potion_address);
        self.kill_token_address.write(kill_token_address);
        self.corpse_token_address.write(corpse_token_address);
    }

    #[abi(embed_v0)]
    impl SummitSystemImpl of super::ISummitSystem<ContractState> {
        fn attack(
            ref self: ContractState,
            defending_beast_token_id: u32,
            attacking_beast_token_ids: Span<u32>,
            revival_potions: u16,
            attack_potions: u8,
            extra_life_potions: u8,
            vrf: bool,
        ) {
            InternalSummitImpl::_attack_summit(
                ref self,
                attacking_beast_token_ids,
                revival_potions,
                attack_potions,
                extra_life_potions,
                vrf,
                defending_beast_token_id,
            );
        }

        fn attack_unsafe(
            ref self: ContractState,
            attacking_beast_token_ids: Span<u32>,
            revival_potions: u16,
            attack_potions: u8,
            extra_life_potions: u8,
        ) {
            InternalSummitImpl::_attack_summit(
                ref self, attacking_beast_token_ids, revival_potions, attack_potions, extra_life_potions, true, 0,
            );
        }

        fn feed(ref self: ContractState, beast_token_id: u32, amount: u16) {
            // assert the caller owns the beast they are feeding
            let beast_dispatcher = IERC721Dispatcher { contract_address: self.beast_address.read() };
            assert(beast_dispatcher.owner_of(beast_token_id.into()) == get_caller_address(), errors::NOT_TOKEN_OWNER);

            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);
            let new_bonus_health = beast.live.bonus_health + amount;
            assert(new_bonus_health <= BEAST_MAX_BONUS_HEALTH, errors::BEAST_MAX_BONUS_HEALTH);

            beast.live.bonus_health = new_bonus_health;

            if beast_token_id == self.summit_beast_token_id.read() {
                beast.live.current_health += amount;
            }

            InternalSummitImpl::_burn_consumable(self.corpse_token_address.read(), amount);
            self._save_beast(beast, false);
        }

        fn claim_beast_reward(ref self: ContractState, beast_token_ids: Span<u32>) {
            let beast_dispatcher = IERC721Dispatcher { contract_address: self.beast_address.read() };
            let kill_token_dispatcher = SummitERC20Dispatcher { contract_address: self.kill_token_address.read() };
            let beast_data = IBeastSystemsDispatcher { contract_address: self.beast_data_address.read() };
            
            let mut potion_rewards = 0;
            let mut kills_rewards = 0;

            let mut i = 0;
            while (i < beast_token_ids.len()) {
                let beast_token_id = *beast_token_ids.at(i);
                assert(
                    beast_dispatcher.owner_of(beast_token_id.into()) == get_caller_address(), errors::NOT_TOKEN_OWNER,
                );

                let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);

                let beast_hash = ImplBeast::get_beast_hash(beast.fixed.id, beast.fixed.prefix, beast.fixed.suffix);
                let kill_count = beast_data
                    .get_entity_stats(self.dungeon_address.read(), beast_hash)
                    .adventurers_killed;

                assert(
                    kill_count > beast.live.kills_claimed.into() || beast.live.has_claimed_potions == 0,
                    'No rewards to claim',
                );

                if kill_count > beast.live.kills_claimed.into() {
                    kills_rewards += kill_count.into() - beast.live.kills_claimed.into();
                    beast.live.kills_claimed = kill_count.try_into().unwrap();
                }

                if (beast.live.has_claimed_potions == 0) {
                    potion_rewards += InternalSummitImpl::get_potion_amount(beast.fixed.id);
                    beast.live.has_claimed_potions = 1;
                }

                self._save_beast(beast, false);
                i += 1;
            };

            assert(potion_rewards + kills_rewards > 0, 'No rewards to claim');

            if potion_rewards > 0 {
                let attack_potion = IERC20Dispatcher { contract_address: self.attack_potion_address.read() };
                attack_potion.transfer(get_caller_address(), 3 * potion_rewards.into() * TOKEN_DECIMALS);

                let poison_potion = IERC20Dispatcher { contract_address: self.poison_potion_address.read() };
                poison_potion.transfer(get_caller_address(), 3 * potion_rewards.into() * TOKEN_DECIMALS);

                let revive_potion = IERC20Dispatcher { contract_address: self.revive_potion_address.read() };
                revive_potion.transfer(get_caller_address(), 2 * potion_rewards.into() * TOKEN_DECIMALS);

                let extra_life_potion = IERC20Dispatcher { contract_address: self.extra_life_potion_address.read() };
                extra_life_potion.transfer(get_caller_address(), potion_rewards.into() * TOKEN_DECIMALS);
            }

            if kills_rewards > 0 {
                kill_token_dispatcher.mint(get_caller_address(), kills_rewards * TOKEN_DECIMALS);
            }
        }

        fn claim_corpse_reward(ref self: ContractState, adventurer_ids: Span<u64>) {
            let mut world: WorldStorage = self.world(@DEFAULT_NS());

            let mut corpse_tokens = 0;
            let mut i = 0;
            while (i < adventurer_ids.len()) {
                let adventurer_id = *adventurer_ids.at(i);
                let adventurer_consumed = self.adventurer_consumed.entry(adventurer_id).read();
                assert(!adventurer_consumed, errors::ADVENTURER_ALREADY_CONSUMED);

                let adventurer = InternalSummitImpl::_get_adventurer(@self, adventurer_id);
                let mut level: u16 = adventurer.get_level().into();
                corpse_tokens += level.into();

                self.adventurer_consumed.entry(adventurer_id).write(true);
                world.emit_event(@CorpseRewardEvent { adventurer_id, player: get_caller_address() });
                i += 1;
            };

            assert(corpse_tokens > 0, 'No corpse to claim');

            let corpse_token_dispatcher = SummitERC20Dispatcher { contract_address: self.corpse_token_address.read() };
            corpse_token_dispatcher.mint(get_caller_address(), corpse_tokens * TOKEN_DECIMALS);
        }

        fn add_extra_life(ref self: ContractState, beast_token_id: u32, extra_life_potions: u8) {
            let summit_beast_token_id = self.summit_beast_token_id.read();
            assert(beast_token_id == summit_beast_token_id, 'Not summit beast');

            assert(extra_life_potions <= EIGHT_BITS_MAX, errors::BEAST_MAX_EXTRA_LIVES);

            let beast_dispatcher = IERC721Dispatcher { contract_address: self.beast_address.read() };

            let summit_owner = beast_dispatcher.owner_of(summit_beast_token_id.into());
            assert(summit_owner == get_caller_address(), errors::NOT_TOKEN_OWNER);

            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);

            // Apply extra life potions
            let mut potions_to_use = extra_life_potions;

            // Prevent u8 overflow
            if beast.live.extra_lives > EIGHT_BITS_MAX - extra_life_potions {
                potions_to_use = EIGHT_BITS_MAX - beast.live.extra_lives;
            }

            // apply poison damage before adding extra lives
            self._apply_poison_damage(ref beast);

            beast.live.extra_lives += potions_to_use;
            InternalSummitImpl::_burn_consumable(self.extra_life_potion_address.read(), potions_to_use.into());

            // update the live stats of the beast
            self._save_beast(beast, false);
        }


        fn apply_stat_points(ref self: ContractState, beast_token_id: u32, stats: Stats) {
            let beast_dispatcher = IERC721Dispatcher { contract_address: self.beast_address.read() };
            assert(beast_dispatcher.owner_of(beast_token_id.into()) == get_caller_address(), errors::NOT_TOKEN_OWNER);

            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);

            let mut tokens_required: u16 = 0;
            if stats.specials == 1 {
                assert(beast.live.stats.specials == 0, 'Specials already unlocked');
                beast.live.stats.specials = 1;
                tokens_required += 1;
            }

            if stats.wisdom == 1 {
                assert(beast.live.stats.wisdom == 0, 'Wisdom already unlocked');
                beast.live.stats.wisdom = 1;
                tokens_required += 10;
            }

            if stats.diplomacy == 1 {
                assert(beast.live.stats.diplomacy == 0, 'Diplomacy already unlocked');
                let specials_hash = InternalSummitImpl::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);

                let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();
                self.diplomacy_beast.entry(specials_hash).entry(diplomacy_count).write(beast_token_id);
                self.diplomacy_count.entry(specials_hash).write(diplomacy_count + 1);
                beast.live.stats.diplomacy = 1;
                tokens_required += 5;
            }

            beast.live.stats.spirit += stats.spirit;
            beast.live.stats.luck += stats.luck;
            tokens_required += stats.spirit.into() + stats.luck.into();

            InternalSummitImpl::_burn_consumable(self.kill_token_address.read(), tokens_required);
            self._save_beast(beast, true);
        }

        fn apply_poison(ref self: ContractState, beast_token_id: u32, count: u16) {
            assert(count > 0, 'No poison to apply');

            let summit_beast_token_id = self.summit_beast_token_id.read();
            assert(beast_token_id == summit_beast_token_id, errors::SUMMIT_BEAST_CHANGED);

            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);

            let current_poison_count = self.poison_count.read();
            let damage = self._apply_poison_damage(ref beast);

            if damage > 0 {
                self._save_beast(beast, false);
            }

            InternalSummitImpl::_burn_consumable(self.poison_potion_address.read(), count);
            self.poison_count.write(current_poison_count + count);

            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world
                .emit_event(
                    @PoisonEvent {
                        beast_token_id,
                        block_timestamp: get_block_timestamp(),
                        count: count,
                        player: get_caller_address(),
                    },
                );
        }

        fn start_summit(ref self: ContractState) {
            assert(get_block_timestamp() >= self.start_timestamp.read(), 'Summit not open yet');
            assert(self.summit_beast_token_id.read() == 0, 'Summit already started');

            let start_token_id = 1;
            self.summit_history.entry(start_token_id).write(get_block_number());
            self.summit_beast_token_id.write(start_token_id);

            let mut beast: Beast = InternalSummitImpl::_get_beast(@self, start_token_id);
            beast.live.current_health = 100;
            self._save_beast(beast, false);
        }

        fn get_start_timestamp(self: @ContractState) -> u64 {
            self.start_timestamp.read()
        }

        fn get_summit_data(ref self: ContractState) -> (Beast, u64, ContractAddress, u16, u64, felt252) {
            let token_id = self.summit_beast_token_id.read();
            let beast = InternalSummitImpl::_get_beast(@self, token_id);
            let taken_at: u64 = self.summit_history.entry(token_id).read();
            let beast_dispatcher = IERC721Dispatcher { contract_address: self.beast_address.read() };
            let summit_owner = beast_dispatcher.owner_of(token_id.into());
            let specials_hash = InternalSummitImpl::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);

            let poison_count = self.poison_count.read();
            let poison_timestamp = self.poison_timestamp.read();

            (beast, taken_at, summit_owner, poison_count, poison_timestamp, specials_hash)
        }

        fn get_summit_beast_token_id(self: @ContractState) -> u32 {
            self.summit_beast_token_id.read()
        }

        fn get_summit_beast(self: @ContractState) -> Beast {
            let token_id = self.summit_beast_token_id.read();
            InternalSummitImpl::_get_beast(self, token_id)
        }

        fn get_beast(self: @ContractState, beast_token_id: u32) -> Beast {
            InternalSummitImpl::_get_beast(self, beast_token_id)
        }
    }


    #[generate_trait]
    pub impl InternalSummitImpl of InternalSummitUtils {
        /// @title get_beast
        /// @notice this function is used to get a beast from the contract
        /// @param token_id the id of the beast
        /// @return Beast the beast
        fn _get_beast(self: @ContractState, token_id: u32) -> Beast {
            let fixed: PackableBeast = IBeastsDispatcher { contract_address: self.beast_address.read() }
                .get_beast(token_id.into());
            let mut live: LiveBeastStats = self.live_beast_stats.entry(token_id).read();
            live.token_id = token_id;
            Beast { fixed, live }
        }

        fn _save_beast(ref self: ContractState, beast: Beast, update_diplomacy: bool) {
            self.live_beast_stats.entry(beast.live.token_id).write(beast.live);

            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world.emit_event(@LiveBeastStatsEvent { token_id: beast.live.token_id, live_stats: beast.live });

            if update_diplomacy && beast.live.stats.diplomacy == 1 {
                let (specials_hash, total_power, beast_token_ids) = Self::_get_diplomacy_data(@self, beast);
                world.emit_event(@DiplomacyEvent { specials_hash, beast_token_ids, total_power });
            }
        }

        fn get_combat_spec(self: Beast, include_specials: bool) -> CombatSpec {
            let beast_tier = ImplBeast::get_tier(self.fixed.id);
            let beast_type = ImplBeast::get_type(self.fixed.id);
            let beast_xp = self.fixed.level.into() * self.fixed.level.into() + self.live.bonus_xp.into();
            let level = Self::_get_level_from_xp(beast_xp);

            let specials = if include_specials {
                SpecialPowers { special1: 0, special2: self.fixed.prefix, special3: self.fixed.suffix }
            } else {
                SpecialPowers { special1: 0, special2: 0, special3: 0 }
            };

            CombatSpec { tier: beast_tier, item_type: beast_type, level, specials }
        }

        fn _get_adventurer(self: @ContractState, id: u64) -> Adventurer {
            let adventurer_systems_address = self.adventurer_address.read();
            let adventurer_systems = IAdventurerSystemsDispatcher { contract_address: adventurer_systems_address };
            let dungeon = adventurer_systems.get_adventurer_dungeon(id);
            assert!(dungeon == self.dungeon_address.read(), "Adventurer not from beast mode dungeon");

            let adventurer_token = IERC721Dispatcher { contract_address: self.denshokan_address.read() };
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
        fn _finalize_summit_history(ref self: ContractState, ref beast: Beast, summit_owner: ContractAddress) {
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            let mut taken_at: u64 = self.summit_history.entry(beast.live.token_id).read();
            let current_block = get_block_number();
            let blocks_on_summit = current_block - taken_at;

            // Mint reward
            if (blocks_on_summit > 0) {
                // let summit_config: SummitConfig = world.read_model(SUMMIT_ID);
                // let reward_dispatcher = RewardERC20Dispatcher { contract_address: summit_config.reward_address };
                // reward_dispatcher.mint(summit_owner, reward_amount * TOKEN_DECIMALS);
                let beast_dispatcher = IERC721Dispatcher { contract_address: self.beast_address.read() };
                let total_reward_amount = blocks_on_summit.try_into().unwrap() * 100;
                let diplomacy_reward_amount = total_reward_amount / 100;

                let specials_hash = Self::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);
                let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();
                if diplomacy_count > 1 {
                    let mut index = 0;
                    loop {
                        if index >= diplomacy_count {
                            break;
                        }

                        let diplomacy_beast_token_id = self.diplomacy_beast.entry(specials_hash).entry(index).read();
                        let mut diplomacy_beast = Self::_get_beast(@self, diplomacy_beast_token_id);
                        let diplomacy_beast_owner = beast_dispatcher.owner_of(diplomacy_beast_token_id.into());
                        diplomacy_beast.live.rewards_earned += diplomacy_reward_amount;
                        world
                            .emit_event(
                                @RewardEvent {
                                    block_number: current_block,
                                    beast_token_id: diplomacy_beast_token_id,
                                    owner: diplomacy_beast_owner,
                                    amount: diplomacy_reward_amount,
                                },
                            );
                        index += 1;
                    }
                }

                let summit_reward_amount = total_reward_amount - (diplomacy_reward_amount * diplomacy_count.into());
                beast.live.rewards_earned += summit_reward_amount;
                world
                    .emit_event(
                        @RewardEvent {
                            block_number: current_block,
                            beast_token_id: beast.live.token_id,
                            owner: summit_owner,
                            amount: summit_reward_amount,
                        },
                    );
            }
        }

        fn _attack_summit(
            ref self: ContractState,
            attacking_beast_token_ids: Span<u32>,
            revival_potions: u16,
            attack_potions: u8,
            extra_life_potions: u8,
            vrf: bool,
            defending_beast_token_id: u32,
        ) {
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            let summit_beast_token_id = self.summit_beast_token_id.read();
            assert(summit_beast_token_id != 0, 'Summit not started');

            if defending_beast_token_id != 0 {
                assert(defending_beast_token_id == summit_beast_token_id, errors::SUMMIT_BEAST_CHANGED);
            }

            // assert consumable amounts
            assert(attack_potions <= EIGHT_BITS_MAX, errors::MAX_ATTACK_POTION);
            assert(extra_life_potions <= EIGHT_BITS_MAX, errors::BEAST_MAX_EXTRA_LIVES);

            let beast_dispatcher = IERC721Dispatcher { contract_address: self.beast_address.read() };
            let beast_data = IBeastSystemsDispatcher { contract_address: self.beast_data_address.read() };

            let summit_owner = beast_dispatcher.owner_of(summit_beast_token_id.into());
            assert(get_caller_address() != summit_owner, errors::BEAST_ATTACKING_OWN_BEAST);

            let mut defending_beast = Self::_get_beast(@self, summit_beast_token_id);
            self._apply_poison_damage(ref defending_beast);

            let diplomacy_bonus = Self::_get_diplomacy_bonus(@self, defending_beast);

            let mut remaining_attack_potions = attack_potions;
            let mut remaining_revival_potions = revival_potions;

            let current_time = get_block_timestamp();

            let random_seed = if vrf {
                VRFImpl::seed()
            } else {
                0
            };

            let mut i = 0;
            while (i < attacking_beast_token_ids.len()) {
                let attacking_beast_token_id = *attacking_beast_token_ids.at(i);

                // assert the caller owns the beast they attacking with
                let beast_owner = beast_dispatcher.owner_of(attacking_beast_token_id.into());
                assert(beast_owner == get_caller_address(), errors::NOT_TOKEN_OWNER);

                // get stats for the beast that is attacking
                let mut attacking_beast = Self::_get_beast(@self, attacking_beast_token_id);

                // assert the attacking beast is alive
                remaining_revival_potions =
                    Self::_use_revival_potions(@self, ref attacking_beast, ref remaining_revival_potions, beast_data);

                // reset health to starting health plus any bonus health they have accrued
                // @dev beasts attack till death so we don't need any additional logic
                attacking_beast.live.current_health = attacking_beast.fixed.health + attacking_beast.live.bonus_health;

                let mut battle_counter: u32 = 0;
                let mut attack_count = 0;
                let mut attack_damage = 0;
                let mut critical_attack_count = 0;
                let mut critical_attack_damage = 0;
                let mut counter_attack_count = 0;
                let mut counter_attack_damage = 0;
                let mut critical_counter_attack_count = 0;
                let mut critical_counter_attack_damage = 0;

                // loop until the attacking beast is dead or the summit beast is dead
                loop {
                    // if either beast is dead, break
                    if attacking_beast.live.current_health == 0 || defending_beast.live.current_health == 0 {
                        break;
                    }

                    let (_, attacker_crit_hit_rnd, defender_crit_hit_rnd, _) = Self::_get_battle_randomness(
                        attacking_beast_token_id,
                        random_seed,
                        attacking_beast.live.last_death_timestamp,
                        battle_counter,
                    );

                    let (damage, attacker_crit_hit) = self
                        ._attack(
                            attacking_beast, ref defending_beast, remaining_attack_potions, attacker_crit_hit_rnd, vrf,
                        );

                    if attacker_crit_hit {
                        critical_attack_count += 1;
                        critical_attack_damage = damage;
                    } else {
                        attack_count += 1;
                        attack_damage = damage;
                    }

                    defending_beast._use_extra_life();

                    if defending_beast.live.current_health != 0 {
                        let (damage, defender_crit_hit) = self
                            ._attack(defending_beast, ref attacking_beast, diplomacy_bonus, defender_crit_hit_rnd, vrf);

                        if defender_crit_hit {
                            critical_counter_attack_count += 1;
                            critical_counter_attack_damage = damage;
                        } else {
                            counter_attack_count += 1;
                            counter_attack_damage = damage;
                        }
                    }

                    battle_counter += 1;
                };

                // reset attack streak if 2x base revival time has passed since last death
                if attacking_beast.live.last_death_timestamp + BASE_REVIVAL_TIME_SECONDS * 2 < current_time {
                    attacking_beast.live.attack_streak = 0;
                }

                let mut xp_gained = 0;
                // check if max xp is reached
                if Self::_beast_can_get_xp(attacking_beast) {
                    xp_gained = 10 + attacking_beast.live.attack_streak;
                    attacking_beast.live.bonus_xp += xp_gained.into();
                }

                // increase attack streak if less than 10
                if attacking_beast.live.attack_streak < 10 {
                    attacking_beast.live.attack_streak += 1;
                }

                // emit battle event
                world
                    .emit_event(
                        @BattleEvent {
                            attacking_beast_owner: beast_owner,
                            attacking_beast_token_id,
                            attacking_beast_id: attacking_beast.fixed.id,
                            shiny: attacking_beast.fixed.shiny,
                            animated: attacking_beast.fixed.animated,
                            defending_beast_token_id: summit_beast_token_id,
                            attack_count,
                            attack_damage,
                            critical_attack_count,
                            critical_attack_damage,
                            counter_attack_count,
                            counter_attack_damage,
                            critical_counter_attack_count,
                            critical_counter_attack_damage,
                            attack_potions: remaining_attack_potions,
                            xp_gained,
                        },
                    );

                // Remove attack potions
                remaining_attack_potions = 0;

                if attacking_beast.live.current_health == 0 {
                    // add xp to summit beast if wisdom unlocked
                    if defending_beast.live.stats.wisdom == 1 {
                        defending_beast
                            .live
                            .bonus_xp += ImplCombat::get_attack_hp(attacking_beast.get_combat_spec(false))
                            / 100;
                    }
                    // set death timestamp for prev summit beast
                    attacking_beast.live.last_death_timestamp = current_time;
                    // update the live stats of the attacking beast
                    self._save_beast(attacking_beast, true);
                } else if defending_beast.live.current_health == 0 {
                    // finalize the summit history for prev summit beast
                    self._finalize_summit_history(ref defending_beast, summit_owner);

                    // set death timestamp for prev summit beast
                    defending_beast.live.last_death_timestamp = current_time;

                    // initialize summit history for the new beast
                    self.summit_history.entry(attacking_beast_token_id).write(get_block_number());

                    // set the new summit beast
                    self.summit_beast_token_id.write(attacking_beast_token_id);

                    // Apply extra life potions
                    attacking_beast.live.extra_lives = extra_life_potions;
                    Self::_burn_consumable(self.extra_life_potion_address.read(), extra_life_potions.into());

                    // update the live stats of the attacking beast
                    self._save_beast(attacking_beast, true);

                    // remove poison count
                    self.poison_count.write(0);

                    // emit summit event
                    world
                        .emit_event(
                            @SummitEvent {
                                taken_at: get_block_number(),
                                beast: Self::_get_beast_event(attacking_beast),
                                live_stats: attacking_beast.live,
                                owner: beast_owner,
                            },
                        );

                    break;
                }

                i += 1;
            };

            // update the live stats of the defending beast after all attacks
            self._save_beast(defending_beast, true);

            // Burn consumables
            assert(remaining_revival_potions == 0, 'Unused revival potions');
            Self::_burn_consumable(self.revive_potion_address.read(), revival_potions);
            Self::_burn_consumable(self.attack_potion_address.read(), attack_potions.into());
        }

        /// @title attack
        /// @notice this function is used to process a beast attacking another beast
        /// @param attacker the beast that is attacking
        /// @param defender a ref to the beast that is defending
        /// @return a tuple containing the combat result and a bool indicating if the defender died
        /// @dev this function only mutates the defender
        fn _attack(
            ref self: ContractState,
            attacker: Beast,
            ref defender: Beast,
            attack_potions: u8,
            critical_hit_rnd: u8,
            vrf: bool,
        ) -> (u16, bool) {
            let attacker_combat_spec = attacker.get_combat_spec(attacker.live.stats.specials == 1);
            let defender_combat_spec = defender.get_combat_spec(attacker.live.stats.specials == 1);
            let minimum_damage = MINIMUM_DAMAGE;

            let attacker_strength = attack_potions;
            let defender_strength = 0;

            let critical_hit_chance = attacker.crit_chance();
            if (critical_hit_chance > 0) {
                assert(vrf, 'missing VRF seed');
            }

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

            (combat_result.total_damage, combat_result.critical_hit_bonus > 0)
        }

        fn _burn_consumable(consumable_address: ContractAddress, amount: u16) {
            if amount > 0 {
                let dispatcher = SummitERC20Dispatcher { contract_address: consumable_address };
                dispatcher.burn_from(get_caller_address(), amount.into() * TOKEN_DECIMALS);
            }
        }

        /// @title _use_revival_potions
        /// @notice this function is used to apply revival potions if needed
        /// @param live_beast_stats the stats of the beast to check
        fn _use_revival_potions(
            self: @ContractState, ref beast: Beast, ref remaining_potions: u16, beast_data: IBeastSystemsDispatcher,
        ) -> u16 {
            let last_death_timestamp = beast.live.last_death_timestamp;
            let current_time = get_block_timestamp();
            let time_since_death = current_time - last_death_timestamp;

            let mut revival_time = BASE_REVIVAL_TIME_SECONDS;

            if time_since_death < revival_time {
                // if the beast has not been killed in the last 14 days, reduce the revival time by 4 hours
                let last_killed_timestamp = Self::_get_last_killed_timestamp(self, beast, beast_data);
                if last_killed_timestamp < current_time - (DAY_SECONDS * 14) {
                    revival_time -= 14400;
                }

                // spirit reduction
                revival_time -= beast.spirit_reduction();

                if time_since_death < revival_time {
                    Self::_assert_beast_can_be_revived(beast, remaining_potions);

                    remaining_potions -= beast.live.revival_count.into() + 1;

                    if beast.live.revival_count < MAX_REVIVAL_COUNT {
                        beast.live.revival_count += 1;
                    }
                }
            }

            remaining_potions
        }

        fn _get_last_killed_timestamp(self: @ContractState, beast: Beast, beast_data: IBeastSystemsDispatcher) -> u64 {
            let beast_hash = ImplBeast::get_beast_hash(beast.fixed.id, beast.fixed.prefix, beast.fixed.suffix);

            let num_deaths = beast_data.get_collectable_count(self.dungeon_address.read(), beast_hash);
            let collectable_entity = beast_data
                .get_collectable(self.dungeon_address.read(), beast_hash, num_deaths - 1);
            collectable_entity.timestamp
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

        fn _assert_beast_can_be_revived(beast: Beast, potion_count: u16) {
            assert(beast.live.current_health == 0, errors::BEAST_ALIVE);
            assert(potion_count >= beast.live.revival_count.into() + 1, errors::NOT_ENOUGH_CONSUMABLES);
        }

        /// @notice: gets level from xp
        /// @param xp: the xp to get the level for
        /// @return u8: the level for the given xp
        fn _get_level_from_xp(xp: u32) -> u16 {
            if (xp == 0) {
                1
            } else {
                xp.sqrt()
            }
        }

        fn _use_extra_life(ref self: Beast) {
            if self.live.current_health == 0 && self.live.extra_lives > 0 {
                self.live.extra_lives -= 1;
                self.live.current_health = self.fixed.health.into() + self.live.bonus_health;
            }
        }

        fn _get_specials_hash(prefix: u8, suffix: u8) -> felt252 {
            let mut hash_span = ArrayTrait::<felt252>::new();
            hash_span.append(prefix.into());
            hash_span.append(suffix.into());
            poseidon_hash_span(hash_span.span()).into()
        }

        fn _get_battle_randomness(
            token_id: u32, seed: felt252, last_death_timestamp: u64, battle_counter: u32,
        ) -> (u8, u8, u8, u8) {
            if seed == 0 {
                return (0, 0, 0, 0);
            }

            let mut hash_span = ArrayTrait::<felt252>::new();
            hash_span.append(token_id.into());
            hash_span.append(seed);
            hash_span.append(last_death_timestamp.into());
            hash_span.append(battle_counter.into());
            let poseidon = poseidon_hash_span(hash_span.span());
            let rnd1_u64 = ImplAdventurer::felt_to_u32(poseidon);
            ImplAdventurer::u32_to_u8s(rnd1_u64)
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

        fn get_potion_amount(id: u8) -> u256 {
            if (id >= 1 && id <= 5) || (id >= 26 && id < 31) || (id >= 51 && id < 56) {
                5
            } else if (id >= 6 && id < 11) || (id >= 31 && id < 36) || (id >= 56 && id < 61) {
                4
            } else if (id >= 11 && id < 16) || (id >= 36 && id < 41) || (id >= 61 && id < 66) {
                3
            } else if (id >= 16 && id < 21) || (id >= 41 && id < 46) || (id >= 66 && id < 71) {
                2
            } else {
                1
            }
        }

        fn _apply_poison_damage(ref self: ContractState, ref beast: Beast) -> u64 {
            let poison_count = self.poison_count.read();
            let time_since_poison = get_block_timestamp() - self.poison_timestamp.read();
            let damage: u64 = time_since_poison * poison_count.into();

            if damage == 0 {
                self.poison_timestamp.write(get_block_timestamp());
                return 0;
            }

            let current_health: u64 = beast.live.current_health.into();
            let full_health: u64 = (beast.fixed.health + beast.live.bonus_health).into();

            if damage < current_health {
                beast.live.current_health = (current_health - damage).try_into().unwrap();
            } else {
                let damage_after_current = damage - current_health;
                let lives_needed: u64 = damage_after_current / full_health;
                let extra_lives_u64: u64 = beast.live.extra_lives.into();

                if lives_needed >= extra_lives_u64 {
                    beast.live.extra_lives = 0;
                    beast.live.current_health = 1;
                } else {
                    beast.live.extra_lives = (extra_lives_u64 - lives_needed).try_into().unwrap();
                    let remaining_damage = damage_after_current - (lives_needed * full_health);
                    let final_health = full_health - remaining_damage;

                    if final_health < 1 {
                        beast.live.current_health = 1;
                    } else {
                        beast.live.current_health = final_health.try_into().unwrap();
                    }
                }
            }

            self.poison_timestamp.write(get_block_timestamp());

            damage
        }

        fn _get_diplomacy_data(self: @ContractState, beast: Beast) -> (felt252, u16, Span<u32>) {
            let specials_hash = Self::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);
            let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();

            let mut index = 0;
            let mut total_power = 0;
            let mut beast_token_ids = array![];

            loop {
                if index >= diplomacy_count {
                    break;
                }

                let diplomacy_beast_token_id = self.diplomacy_beast.entry(specials_hash).entry(index).read();
                beast_token_ids.append(diplomacy_beast_token_id);

                let diplomacy_beast = Self::_get_beast(self, diplomacy_beast_token_id);
                let power = ImplCombat::get_attack_hp(diplomacy_beast.get_combat_spec(false));
                total_power += power;

                index += 1;
            };

            (specials_hash, total_power, beast_token_ids.span())
        }

        fn _get_diplomacy_bonus(self: @ContractState, beast: Beast) -> u8 {
            let specials_hash = Self::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);
            let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();

            if diplomacy_count <= 1 {
                return 0;
            }

            let mut index = 0;
            let mut bonus: u16 = 0;

            loop {
                if index >= diplomacy_count {
                    break;
                }

                let diplomacy_beast_token_id = self.diplomacy_beast.entry(specials_hash).entry(index).read();

                if diplomacy_beast_token_id != beast.live.token_id {
                    let diplomacy_beast = Self::_get_beast(self, diplomacy_beast_token_id);
                    let power = ImplCombat::get_attack_hp(diplomacy_beast.get_combat_spec(false));

                    bonus += power;
                }

                index += 1;
            };

            (bonus / 500).try_into().unwrap()
        }
    }
}
// #[cfg(test)]
// mod tests {
//     use dojo::model::{ModelStorage};
//     use dojo::world::{WorldStorage, WorldStorageTrait};
//     use dojo_cairo_test::{
//         ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait, spawn_test_world,
//     };
//     use starknet::contract_address_const;
//     use summit::constants::{DEFAULT_NS, SUMMIT_ID, TESTING_CHAIN_ID};
//     use summit::models::adventurer::m_AdventurerConsumed;
//     use summit::models::beast::{LiveBeastStats, m_LiveBeastStats};
//     use summit::models::summit::{m_Summit, m_SummitConfig, m_SummitHistory};
//     use super::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait, summit_systems};

//     fn namespace_def() -> NamespaceDef {
//         NamespaceDef {
//             namespace: DEFAULT_NS(),
//             resources: [
//                 TestResource::Model(m_Summit::TEST_CLASS_HASH.try_into().unwrap()),
//                 TestResource::Model(m_SummitHistory::TEST_CLASS_HASH.try_into().unwrap()),
//                 TestResource::Model(m_SummitConfig::TEST_CLASS_HASH.try_into().unwrap()),
//                 TestResource::Model(m_LiveBeastStats::TEST_CLASS_HASH.try_into().unwrap()),
//                 TestResource::Model(m_AdventurerConsumed::TEST_CLASS_HASH.try_into().unwrap()),
//                 TestResource::Contract(summit_systems::TEST_CLASS_HASH),
//             ]
//                 .span(),
//         }
//     }

//     fn contract_defs() -> Span<ContractDef> {
//         [
//             ContractDefTrait::new(@DEFAULT_NS(), @"summit_systems")
//                 .with_writer_of([dojo::utils::bytearray_hash(@DEFAULT_NS())].span())
//                 .with_init_calldata(
//                     [
//                         1724927366_u64.into(), // start_timestamp
//                         contract_address_const::<'adventurer'>().into(),
//                         contract_address_const::<'denshokan'>().into(), contract_address_const::<'dungeon'>().into(),
//                         contract_address_const::<'beast'>().into(), contract_address_const::<'beast_data'>().into(),
//                         contract_address_const::<'reward'>().into(),
//                         contract_address_const::<'attack_potion'>().into(),
//                         contract_address_const::<'revive_potion'>().into(),
//                         contract_address_const::<'extra_life_potion'>().into(),
//                     ]
//                         .span(),
//                 ),
//         ]
//             .span()
//     }

//     /// @title setup_world
//     /// @notice this function is used to setup the world for testing
//     /// @return world the world storage
//     /// @return summit_system the summit system dispatcher
//     fn setup_world() -> (WorldStorage, ISummitSystemDispatcher) {
//         starknet::testing::set_chain_id(TESTING_CHAIN_ID);
//         starknet::testing::set_block_timestamp(1724927366);
//         starknet::testing::set_block_number(100);

//         let ndef = namespace_def();
//         let mut world = spawn_test_world([ndef].span());
//         world.sync_perms_and_inits(contract_defs());

//         let (contract_address, _) = world.dns(@"summit_systems").unwrap();
//         let summit_system = ISummitSystemDispatcher { contract_address };

//         (world, summit_system)
//     }
// }


