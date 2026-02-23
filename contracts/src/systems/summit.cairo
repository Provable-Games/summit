use starknet::ContractAddress;
use summit::models::beast::{Beast, LiveBeastStats, Stats};

#[starknet::interface]
pub trait ISummitSystem<T> {
    fn start_summit(ref self: T);
    fn attack(
        ref self: T,
        defending_beast_token_id: u32,
        attacking_beasts: Span<(u32, u16, u8)>, // (beast token id, attack count, attack potions)
        revival_potions: u32,
        extra_life_potions: u16,
        vrf: bool,
    ) -> (u32, u32, u16);
    fn feed(ref self: T, beast_token_id: u32, amount: u16);
    fn claim_rewards(ref self: T, beast_token_ids: Span<u32>);
    fn claim_quest_rewards(ref self: T, beast_token_ids: Span<u32>);

    fn add_extra_life(ref self: T, beast_token_id: u32, extra_life_potions: u16);
    fn apply_stat_points(ref self: T, beast_token_id: u32, stats: Stats);
    fn apply_poison(ref self: T, beast_token_id: u32, count: u16);

    fn set_summit_reward(ref self: T, amount: u128);
    fn set_start_timestamp(ref self: T, start_timestamp: u64);
    fn set_reward_address(ref self: T, reward_address: ContractAddress);
    fn set_attack_potion_address(ref self: T, attack_potion_address: ContractAddress);
    fn set_revive_potion_address(ref self: T, revive_potion_address: ContractAddress);
    fn set_extra_life_potion_address(ref self: T, extra_life_potion_address: ContractAddress);
    fn set_poison_potion_address(ref self: T, poison_potion_address: ContractAddress);
    fn set_skull_token_address(ref self: T, skull_token_address: ContractAddress);
    fn set_corpse_token_address(ref self: T, corpse_token_address: ContractAddress);
    fn withdraw_funds(ref self: T, token_address: ContractAddress, amount: u256);

    fn get_summit_data(ref self: T) -> (Beast, u64, ContractAddress, u16, u64, felt252);
    fn get_summit_beast_token_id(self: @T) -> u32;
    fn get_summit_beast(self: @T) -> Beast;
    fn get_beast(self: @T, beast_token_id: u32) -> Beast;
    fn get_live_stats(self: @T, beast_token_ids: Span<u32>) -> Span<LiveBeastStats>;
    fn get_live_stats_packed(self: @T, beast_token_ids: Span<u32>) -> Span<felt252>;

    fn get_start_timestamp(self: @T) -> u64;
    fn get_terminal_timestamp(self: @T) -> u64;
    fn get_summit_duration_seconds(self: @T) -> u64;
    fn get_summit_reward_amount_per_second(self: @T) -> u128;
    fn get_diplomacy_reward_amount_per_second(self: @T) -> u128;

    fn get_diplomacy_beast(self: @T, specials_hash: felt252, index: u8) -> u32;
    fn get_diplomacy_count(self: @T, specials_hash: felt252) -> u8;
    fn get_quest_rewards_claimed(self: @T, beast_token_id: u32) -> u8;
    fn get_quest_rewards_total_amount(self: @T) -> u128;
    fn get_quest_rewards_total_claimed(self: @T) -> u128;

    fn migrate_live_stats(ref self: T, limit: u32);
    fn migrate_quest_rewards_total_claimed(ref self: T);
    fn get_migration_progress(self: @T) -> u32;

    fn get_dungeon_address(self: @T) -> ContractAddress;
    fn get_beast_address(self: @T) -> ContractAddress;
    fn get_beast_data_address(self: @T) -> ContractAddress;
    fn get_reward_address(self: @T) -> ContractAddress;
    fn get_attack_potion_address(self: @T) -> ContractAddress;
    fn get_revive_potion_address(self: @T) -> ContractAddress;
    fn get_extra_life_potion_address(self: @T) -> ContractAddress;
    fn get_poison_potion_address(self: @T) -> ContractAddress;
    fn get_skull_token_address(self: @T) -> ContractAddress;
    fn get_corpse_token_address(self: @T) -> ContractAddress;
}

#[starknet::contract]
pub mod summit_systems {
    use beasts_nft::interfaces::{IBeastsDispatcher, IBeastsDispatcherTrait};
    use beasts_nft::pack::PackableBeast;
    use death_mountain_beast::beast::ImplBeast;
    use death_mountain_combat::combat::{CombatSpec, ImplCombat};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_interfaces::erc721::{IERC721Dispatcher, IERC721DispatcherTrait};
    use openzeppelin_interfaces::upgrades::IUpgradeable;
    use openzeppelin_upgrades::UpgradeableComponent;
    use starknet::storage::{Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ClassHash, ContractAddress, get_block_timestamp, get_caller_address};
    use summit::constants::{
        BASE_REVIVAL_TIME_SECONDS, BEAST_MAX_ATTRIBUTES, BEAST_MAX_BONUS_HEALTH, BEAST_MAX_BONUS_LVLS,
        BEAST_MAX_EXTRA_LIVES, DAY_SECONDS, DIPLOMACY_COST, MAX_REVIVAL_COUNT, MAX_U32, MINIMUM_DAMAGE, SPECIALS_COST,
        TOKEN_DECIMALS, WISDOM_COST, errors,
    };
    use summit::erc20::interface::{SummitERC20Dispatcher, SummitERC20DispatcherTrait};
    use summit::interfaces::{IBeastSystemsDispatcher, IBeastSystemsDispatcherTrait};
    use summit::logic::{beast_utils, combat, poison, quest, revival};
    use summit::models::beast::{Beast, BeastUtilsImpl, LiveBeastStats, PackableLiveStatsStorePacking, Stats};
    use summit::models::events::{
        BattleEvent, BeastUpdatesEvent, LiveBeastStatsEvent, PoisonEvent, QuestRewardsClaimedEvent, RewardsClaimedEvent,
        RewardsEarnedEvent,
    };
    use summit::vrf::VRFImpl;
    use super::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    // Ownable Mixin
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // Upgradeable
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        summit_beast_token_id: u32,
        live_beast_stats: Map<u32, felt252>,
        poison_state: felt252, // Packed poison state: timestamp (64 bits) | count (16 bits)
        summit_history: Map<u32, u64>,
        diplomacy_beast: Map<felt252, Map<u8, u32>>, // (prefix-suffix hash) -> (index) -> beast token id
        diplomacy_count: Map<felt252, u8>,
        start_timestamp: u64,
        terminal_timestamp: u64,
        summit_duration_seconds: u64,
        summit_reward_amount_per_second: u128,
        quest_rewards_claimed: Map<u32, u8>,
        quest_rewards_total_amount: u128,
        quest_rewards_total_claimed: u128,
        // Addresses
        dungeon_address: ContractAddress,
        beast_dispatcher: IERC721Dispatcher,
        beast_nft_dispatcher: IBeastsDispatcher,
        beast_data_dispatcher: IBeastSystemsDispatcher,
        reward_dispatcher: IERC20Dispatcher,
        attack_potion_dispatcher: SummitERC20Dispatcher,
        revive_potion_dispatcher: SummitERC20Dispatcher,
        extra_life_potion_dispatcher: SummitERC20Dispatcher,
        poison_potion_dispatcher: SummitERC20Dispatcher,
        skull_token_dispatcher: SummitERC20Dispatcher,
        corpse_token_dispatcher: SummitERC20Dispatcher,
        // IMPORTANT: append-only storage. New fields must be added at the end.
        diplomacy_reward_amount_per_second: u128,
        old_summit_dispatcher: ISummitSystemDispatcher,
        migration_progress: u32,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        LiveBeastStatsEvent: LiveBeastStatsEvent,
        BattleEvent: BattleEvent,
        BeastUpdatesEvent: BeastUpdatesEvent,
        RewardsEarnedEvent: RewardsEarnedEvent,
        RewardsClaimedEvent: RewardsClaimedEvent,
        PoisonEvent: PoisonEvent,
        QuestRewardsClaimedEvent: QuestRewardsClaimedEvent,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        start_timestamp: u64,
        summit_duration_seconds: u64,
        summit_reward_amount_per_second: u128,
        diplomacy_reward_amount_per_second: u128,
        quest_rewards_total_amount: u128,
        dungeon_address: ContractAddress,
        beast_address: ContractAddress,
        beast_data_address: ContractAddress,
        reward_address: ContractAddress,
        attack_potion_address: ContractAddress,
        revive_potion_address: ContractAddress,
        extra_life_potion_address: ContractAddress,
        poison_potion_address: ContractAddress,
        skull_token_address: ContractAddress,
        corpse_token_address: ContractAddress,
        old_summit_address: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        self.start_timestamp.write(start_timestamp);
        self.summit_duration_seconds.write(summit_duration_seconds);
        self.summit_reward_amount_per_second.write(summit_reward_amount_per_second);
        self.diplomacy_reward_amount_per_second.write(diplomacy_reward_amount_per_second);
        self.quest_rewards_total_amount.write(quest_rewards_total_amount);
        self.dungeon_address.write(dungeon_address);
        self.beast_dispatcher.write(IERC721Dispatcher { contract_address: beast_address });
        self.beast_nft_dispatcher.write(IBeastsDispatcher { contract_address: beast_address });
        self.beast_data_dispatcher.write(IBeastSystemsDispatcher { contract_address: beast_data_address });
        self.reward_dispatcher.write(IERC20Dispatcher { contract_address: reward_address });
        self.attack_potion_dispatcher.write(SummitERC20Dispatcher { contract_address: attack_potion_address });
        self.revive_potion_dispatcher.write(SummitERC20Dispatcher { contract_address: revive_potion_address });
        self.extra_life_potion_dispatcher.write(SummitERC20Dispatcher { contract_address: extra_life_potion_address });
        self.poison_potion_dispatcher.write(SummitERC20Dispatcher { contract_address: poison_potion_address });
        self.skull_token_dispatcher.write(SummitERC20Dispatcher { contract_address: skull_token_address });
        self.corpse_token_dispatcher.write(SummitERC20Dispatcher { contract_address: corpse_token_address });
        self.old_summit_dispatcher.write(ISummitSystemDispatcher { contract_address: old_summit_address });
    }

    #[abi(embed_v0)]
    impl SummitSystemImpl of super::ISummitSystem<ContractState> {
        fn attack(
            ref self: ContractState,
            defending_beast_token_id: u32,
            attacking_beasts: Span<(u32, u16, u8)>,
            revival_potions: u32,
            extra_life_potions: u16,
            vrf: bool,
        ) -> (u32, u32, u16) {
            InternalSummitImpl::_attack_summit(
                ref self, attacking_beasts, revival_potions, extra_life_potions, vrf, defending_beast_token_id,
            )
        }

        fn feed(ref self: ContractState, beast_token_id: u32, amount: u16) {
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');
            assert(amount > 0, 'No amount to feed');

            let mut beast_live_stats = InternalSummitImpl::_get_live_stats(@self, beast_token_id);
            let new_bonus_health = beast_live_stats.bonus_health + amount;
            assert(new_bonus_health <= BEAST_MAX_BONUS_HEALTH, errors::BEAST_MAX_BONUS_HEALTH);

            beast_live_stats.bonus_health = new_bonus_health;

            if beast_token_id == self.summit_beast_token_id.read() {
                beast_live_stats.current_health += amount;
            }

            self.corpse_token_dispatcher.read().burn_from(get_caller_address(), amount.into() * TOKEN_DECIMALS);

            let packed_beast = self._save_live_stats(beast_live_stats);
            self.emit(LiveBeastStatsEvent { live_stats: packed_beast });
        }

        fn claim_rewards(ref self: ContractState, beast_token_ids: Span<u32>) {
            let caller = get_caller_address();
            let beast_dispatcher = self.beast_dispatcher.read();

            let mut total_claimable: u32 = 0;
            let mut beast_updates: Array<felt252> = array![];

            for beast_token_id_ref in beast_token_ids {
                let beast_token_id = *beast_token_id_ref;

                // Verify caller owns the beast
                let beast_owner = beast_dispatcher.owner_of(beast_token_id.into());
                assert(beast_owner == caller, errors::NOT_TOKEN_OWNER);

                // Get beast and calculate claimable rewards
                let mut beast_live_stats = InternalSummitImpl::_get_live_stats(@self, beast_token_id);
                let claimable = beast_live_stats.rewards_earned - beast_live_stats.rewards_claimed;

                if claimable > 0 {
                    // Update rewards_claimed
                    beast_live_stats.rewards_claimed = beast_live_stats.rewards_earned;

                    // Add to total (will convert to full decimals later)
                    total_claimable += claimable;

                    // Write beast and collect packed stats
                    let packed = self._save_live_stats(beast_live_stats);
                    beast_updates.append(packed);
                }
            }

            assert!(total_claimable > 0, "No rewards to claim");

            // Convert back to 18 decimals (add back the 13 decimals we removed)
            let transfer_amount: u256 = total_claimable.into() * 10_000_000_000_000;

            // Transfer rewards to caller
            self.reward_dispatcher.read().transfer(caller, transfer_amount);

            // Emit events
            self.emit(BeastUpdatesEvent { beast_updates: beast_updates.span() });
            self.emit(RewardsClaimedEvent { player: caller, amount: total_claimable });
        }

        fn claim_quest_rewards(ref self: ContractState, beast_token_ids: Span<u32>) {
            let quest_rewards_total_claimed = self.quest_rewards_total_claimed.read();
            let quest_rewards_total_amount = self.quest_rewards_total_amount.read();
            assert!(quest_rewards_total_claimed < quest_rewards_total_amount, "Quest rewards pool is empty");

            let caller = get_caller_address();

            let beast_dispatcher = self.beast_dispatcher.read();
            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();

            let mut total_claimable: u128 = 0;
            let mut quest_rewards_claimed: Array<felt252> = array![];

            for beast_token_id_ref in beast_token_ids {
                let beast_token_id = *beast_token_id_ref;

                // Verify caller owns the beast
                let beast_owner = beast_dispatcher.owner_of(beast_token_id.into());
                assert(beast_owner == caller, errors::NOT_TOKEN_OWNER);

                let beast = InternalSummitImpl::_get_beast(@self, beast_token_id, beast_nft_dispatcher);
                let claimed = self.quest_rewards_claimed.entry(beast_token_id).read();
                let quest_rewards = quest::calculate_quest_rewards(beast);

                let rewards_available = quest_rewards - claimed;
                if rewards_available > 0 {
                    total_claimable += rewards_available.into();
                    self.quest_rewards_claimed.entry(beast_token_id).write(quest_rewards);
                    quest_rewards_claimed.append(quest::pack_quest_rewards_claimed(beast_token_id, quest_rewards));
                }
            }

            assert!(total_claimable > 0, "No quest rewards to claim");

            let total_claimable_tokens = total_claimable * 10_000_000_000_000_000;

            let claimable_tokens = if quest_rewards_total_claimed
                + total_claimable_tokens > quest_rewards_total_amount {
                quest_rewards_total_amount - quest_rewards_total_claimed
            } else {
                total_claimable_tokens
            };

            self.quest_rewards_total_claimed.write(quest_rewards_total_claimed + claimable_tokens);

            // Transfer rewards to caller
            let transfer_amount: u256 = claimable_tokens.into();
            self.reward_dispatcher.read().transfer(caller, transfer_amount);

            // Emit events - use slice() to avoid copying
            const BATCH_SIZE: u32 = 295;
            let rewards_span = quest_rewards_claimed.span();
            let total_items = rewards_span.len();

            if total_items <= BATCH_SIZE {
                // Fast path: single event, no slicing needed
                self.emit(QuestRewardsClaimedEvent { quest_rewards_claimed: rewards_span });
            } else {
                // Batch using slice - zero-copy sub-spans
                let mut offset: u32 = 0;
                while offset < total_items {
                    let remaining = total_items - offset;
                    let batch_len = if remaining < BATCH_SIZE {
                        remaining
                    } else {
                        BATCH_SIZE
                    };
                    self
                        .emit(
                            QuestRewardsClaimedEvent { quest_rewards_claimed: rewards_span.slice(offset, batch_len) },
                        );
                    offset += batch_len;
                }
            }
        }

        fn add_extra_life(ref self: ContractState, beast_token_id: u32, extra_life_potions: u16) {
            assert(extra_life_potions > 0, 'No extra lives');
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');

            let summit_beast_token_id = self.summit_beast_token_id.read();
            assert(beast_token_id == summit_beast_token_id, 'Not summit beast');

            assert(extra_life_potions <= BEAST_MAX_EXTRA_LIVES, errors::BEAST_MAX_EXTRA_LIVES);

            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();
            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id, beast_nft_dispatcher);

            // Apply extra life potions
            let mut potions_to_use = extra_life_potions;

            // Prevent overflow
            if beast.live.extra_lives > BEAST_MAX_EXTRA_LIVES - extra_life_potions {
                potions_to_use = BEAST_MAX_EXTRA_LIVES - beast.live.extra_lives;
            }

            // apply poison damage before adding extra lives
            self._apply_poison_damage(ref beast);

            beast.live.extra_lives += potions_to_use;
            self
                .extra_life_potion_dispatcher
                .read()
                .burn_from(get_caller_address(), potions_to_use.into() * TOKEN_DECIMALS);

            // update the live stats of the beast
            let packed_beast = self._save_live_stats(beast.live);
            self.emit(LiveBeastStatsEvent { live_stats: packed_beast });
        }


        fn apply_stat_points(ref self: ContractState, beast_token_id: u32, stats: Stats) {
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');

            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();
            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id, beast_nft_dispatcher);

            let mut tokens_required: u16 = 0;
            if stats.specials == 1 {
                assert(beast.live.stats.specials == 0, 'Specials already unlocked');
                beast.live.stats.specials = 1;
                tokens_required += SPECIALS_COST;
            }

            if stats.wisdom == 1 {
                assert(beast.live.stats.wisdom == 0, 'Wisdom already unlocked');
                beast.live.stats.wisdom = 1;
                tokens_required += WISDOM_COST;
            }

            if stats.diplomacy == 1 {
                assert(beast.live.stats.diplomacy == 0, 'Diplomacy already unlocked');
                let specials_hash = InternalSummitImpl::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);

                let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();
                self.diplomacy_beast.entry(specials_hash).entry(diplomacy_count).write(beast_token_id);
                self.diplomacy_count.entry(specials_hash).write(diplomacy_count + 1);
                beast.live.stats.diplomacy = 1;

                tokens_required += DIPLOMACY_COST;
            }

            beast.live.stats.spirit += stats.spirit;
            beast.live.stats.luck += stats.luck;

            assert(beast.live.stats.spirit <= BEAST_MAX_ATTRIBUTES, errors::BEAST_MAX_ATTRIBUTES);
            assert(beast.live.stats.luck <= BEAST_MAX_ATTRIBUTES, errors::BEAST_MAX_ATTRIBUTES);

            tokens_required += stats.spirit.into() + stats.luck.into();

            assert(tokens_required > 0, 'No upgrades chosen');
            self.skull_token_dispatcher.read().burn_from(get_caller_address(), tokens_required.into() * TOKEN_DECIMALS);
            let packed_beast = self._save_live_stats(beast.live);
            self.emit(LiveBeastStatsEvent { live_stats: packed_beast });
        }

        fn apply_poison(ref self: ContractState, beast_token_id: u32, count: u16) {
            assert(count > 0, 'No poison to apply');
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');

            let caller = get_caller_address();
            let summit_beast_token_id = self.summit_beast_token_id.read();
            assert(beast_token_id == summit_beast_token_id, 'Not summit beast');

            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();
            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id, beast_nft_dispatcher);

            // Read current poison state and apply damage
            let damage = self._apply_poison_damage(ref beast);

            if damage > 0 {
                let packed_beast = self._save_live_stats(beast.live);
                self.emit(LiveBeastStatsEvent { live_stats: packed_beast });
            }

            // Update poison count (timestamp was already updated in _apply_poison_damage)
            let (current_timestamp, current_count) = poison::unpack_poison_state(self.poison_state.read());
            self.poison_state.write(poison::pack_poison_state(current_timestamp, current_count + count));

            self.poison_potion_dispatcher.read().burn_from(caller, count.into() * TOKEN_DECIMALS);

            self.emit(PoisonEvent { beast_token_id, count, player: caller });
        }

        fn start_summit(ref self: ContractState) {
            let block_timestamp = get_block_timestamp();
            assert(block_timestamp >= self.start_timestamp.read(), 'Summit not open yet');
            assert(self.summit_beast_token_id.read() == 0, 'Summit already started');

            self.terminal_timestamp.write(block_timestamp + self.summit_duration_seconds.read());

            let start_token_id = 1;
            self.summit_history.entry(start_token_id).write(block_timestamp);
            self.summit_beast_token_id.write(start_token_id);

            let mut beast_live_stats: LiveBeastStats = InternalSummitImpl::_get_live_stats(@self, start_token_id);
            beast_live_stats.current_health = 100;
            let packed_beast = self._save_live_stats(beast_live_stats);
            self.emit(LiveBeastStatsEvent { live_stats: packed_beast });
        }

        fn set_summit_reward(ref self: ContractState, amount: u128) {
            self.ownable.assert_only_owner();
            self.summit_reward_amount_per_second.write(amount);
        }

        fn set_start_timestamp(ref self: ContractState, start_timestamp: u64) {
            self.ownable.assert_only_owner();
            assert(self.start_timestamp.read() > get_block_timestamp(), 'Summit already started');
            self.start_timestamp.write(start_timestamp);
        }

        fn set_reward_address(ref self: ContractState, reward_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.reward_dispatcher.write(IERC20Dispatcher { contract_address: reward_address });
        }

        fn set_attack_potion_address(ref self: ContractState, attack_potion_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.attack_potion_dispatcher.write(SummitERC20Dispatcher { contract_address: attack_potion_address });
        }

        fn set_revive_potion_address(ref self: ContractState, revive_potion_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.revive_potion_dispatcher.write(SummitERC20Dispatcher { contract_address: revive_potion_address });
        }

        fn set_extra_life_potion_address(ref self: ContractState, extra_life_potion_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self
                .extra_life_potion_dispatcher
                .write(SummitERC20Dispatcher { contract_address: extra_life_potion_address });
        }

        fn set_poison_potion_address(ref self: ContractState, poison_potion_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.poison_potion_dispatcher.write(SummitERC20Dispatcher { contract_address: poison_potion_address });
        }

        fn set_skull_token_address(ref self: ContractState, skull_token_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.skull_token_dispatcher.write(SummitERC20Dispatcher { contract_address: skull_token_address });
        }

        fn set_corpse_token_address(ref self: ContractState, corpse_token_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.corpse_token_dispatcher.write(SummitERC20Dispatcher { contract_address: corpse_token_address });
        }

        fn withdraw_funds(ref self: ContractState, token_address: ContractAddress, amount: u256) {
            self.ownable.assert_only_owner();
            let token = IERC20Dispatcher { contract_address: token_address };
            token.transfer(self.ownable.Ownable_owner.read(), amount);
        }

        fn get_start_timestamp(self: @ContractState) -> u64 {
            self.start_timestamp.read()
        }

        fn get_terminal_timestamp(self: @ContractState) -> u64 {
            self.terminal_timestamp.read()
        }

        fn get_summit_duration_seconds(self: @ContractState) -> u64 {
            self.summit_duration_seconds.read()
        }

        fn get_summit_reward_amount_per_second(self: @ContractState) -> u128 {
            self.summit_reward_amount_per_second.read()
        }

        fn get_diplomacy_reward_amount_per_second(self: @ContractState) -> u128 {
            self.diplomacy_reward_amount_per_second.read()
        }

        fn get_summit_data(ref self: ContractState) -> (Beast, u64, ContractAddress, u16, u64, felt252) {
            let token_id = self.summit_beast_token_id.read();
            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();
            let beast = InternalSummitImpl::_get_beast(@self, token_id, beast_nft_dispatcher);
            let taken_at: u64 = self.summit_history.entry(token_id).read();
            let summit_owner = self.beast_dispatcher.read().owner_of(token_id.into());
            let specials_hash = InternalSummitImpl::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);

            let (poison_timestamp, poison_count) = poison::unpack_poison_state(self.poison_state.read());

            (beast, taken_at, summit_owner, poison_count, poison_timestamp, specials_hash)
        }

        fn get_summit_beast_token_id(self: @ContractState) -> u32 {
            self.summit_beast_token_id.read()
        }

        fn get_summit_beast(self: @ContractState) -> Beast {
            let token_id = self.summit_beast_token_id.read();
            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();
            InternalSummitImpl::_get_beast(self, token_id, beast_nft_dispatcher)
        }

        fn get_beast(self: @ContractState, beast_token_id: u32) -> Beast {
            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();
            InternalSummitImpl::_get_beast(self, beast_token_id, beast_nft_dispatcher)
        }

        fn get_live_stats(self: @ContractState, beast_token_ids: Span<u32>) -> Span<LiveBeastStats> {
            let mut live_stats = array![];
            for token_id_ref in beast_token_ids {
                let token_id = *token_id_ref;
                let packed = self.live_beast_stats.entry(token_id).read();
                let live_stat: LiveBeastStats = PackableLiveStatsStorePacking::unpack(packed);
                live_stats.append(live_stat);
            }
            live_stats.span()
        }

        fn get_live_stats_packed(self: @ContractState, beast_token_ids: Span<u32>) -> Span<felt252> {
            let mut packed_stats = array![];
            for token_id_ref in beast_token_ids {
                let token_id = *token_id_ref;
                let packed = self.live_beast_stats.entry(token_id).read();
                packed_stats.append(packed);
            }
            packed_stats.span()
        }

        fn get_diplomacy_beast(self: @ContractState, specials_hash: felt252, index: u8) -> u32 {
            self.diplomacy_beast.entry(specials_hash).entry(index).read()
        }

        fn get_diplomacy_count(self: @ContractState, specials_hash: felt252) -> u8 {
            self.diplomacy_count.entry(specials_hash).read()
        }

        fn get_quest_rewards_claimed(self: @ContractState, beast_token_id: u32) -> u8 {
            self.quest_rewards_claimed.entry(beast_token_id).read()
        }

        fn get_quest_rewards_total_amount(self: @ContractState) -> u128 {
            self.quest_rewards_total_amount.read()
        }

        fn get_quest_rewards_total_claimed(self: @ContractState) -> u128 {
            self.quest_rewards_total_claimed.read()
        }

        fn migrate_live_stats(ref self: ContractState, limit: u32) {
            assert(self.terminal_timestamp.read() == 0, 'Summit already started');

            let old_summit = self.old_summit_dispatcher.read();
            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();
            let progress = self.migration_progress.read();
            let start_token_id = 76 + progress;

            // Build array of token IDs for the batch
            let mut token_ids: Array<u32> = array![];
            for i in 0..limit {
                token_ids.append(start_token_id + i);
            }

            // Batch-fetch live stats from old summit
            let old_stats = old_summit.get_live_stats(token_ids.span());

            // Process each beast (skip beasts that were never stored — token_id is 0)
            for old_stat in old_stats {
                let live_stats = *old_stat;
                let token_id = live_stats.token_id;

                if token_id == 0 {
                    continue;
                }

                // Write live stats to new contract storage
                self._save_live_stats(live_stats);

                // Migrate quest rewards claimed
                let quest_rewards = old_summit.get_quest_rewards_claimed(token_id);
                if quest_rewards > 0 {
                    self.quest_rewards_claimed.entry(token_id).write(quest_rewards);
                }

                // Migrate diplomacy tracking
                if live_stats.stats.diplomacy == 1 {
                    let fixed = beast_nft_dispatcher.get_beast(token_id.into());
                    let specials_hash = beast_utils::get_specials_hash(fixed.prefix, fixed.suffix);
                    let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();
                    self.diplomacy_beast.entry(specials_hash).entry(diplomacy_count).write(token_id);
                    self.diplomacy_count.entry(specials_hash).write(diplomacy_count + 1);
                }
            }

            self.migration_progress.write(progress + limit);
        }

        fn migrate_quest_rewards_total_claimed(ref self: ContractState) {
            assert!(self.quest_rewards_total_claimed.read() == 0, "Quest rewards total claimed already migrated");

            let old_summit = self.old_summit_dispatcher.read();
            let total_claimed = old_summit.get_quest_rewards_total_claimed();
            self.quest_rewards_total_claimed.write(total_claimed);
        }

        fn get_migration_progress(self: @ContractState) -> u32 {
            self.migration_progress.read()
        }

        fn get_dungeon_address(self: @ContractState) -> ContractAddress {
            self.dungeon_address.read()
        }

        fn get_beast_address(self: @ContractState) -> ContractAddress {
            self.beast_dispatcher.read().contract_address
        }

        fn get_beast_data_address(self: @ContractState) -> ContractAddress {
            self.beast_data_dispatcher.read().contract_address
        }

        fn get_reward_address(self: @ContractState) -> ContractAddress {
            self.reward_dispatcher.read().contract_address
        }

        fn get_attack_potion_address(self: @ContractState) -> ContractAddress {
            self.attack_potion_dispatcher.read().contract_address
        }

        fn get_revive_potion_address(self: @ContractState) -> ContractAddress {
            self.revive_potion_dispatcher.read().contract_address
        }

        fn get_extra_life_potion_address(self: @ContractState) -> ContractAddress {
            self.extra_life_potion_dispatcher.read().contract_address
        }

        fn get_poison_potion_address(self: @ContractState) -> ContractAddress {
            self.poison_potion_dispatcher.read().contract_address
        }

        fn get_skull_token_address(self: @ContractState) -> ContractAddress {
            self.skull_token_dispatcher.read().contract_address
        }

        fn get_corpse_token_address(self: @ContractState) -> ContractAddress {
            self.corpse_token_dispatcher.read().contract_address
        }
    }

    #[generate_trait]
    pub impl InternalSummitImpl of InternalSummitUtils {
        fn _summit_playable(self: @ContractState) -> bool {
            let terminal_timestamp = self.terminal_timestamp.read();
            let summit_beast_token_id = self.summit_beast_token_id.read();
            let taken_at = self.summit_history.entry(summit_beast_token_id).read();
            terminal_timestamp == 0 || taken_at < terminal_timestamp
        }

        /// @title get_beast
        /// @notice this function is used to get a beast from the contract
        /// @param token_id the id of the beast
        /// @return Beast the beast
        fn _get_beast(self: @ContractState, token_id: u32, beast_nft_dispatcher: IBeastsDispatcher) -> Beast {
            let fixed: PackableBeast = beast_nft_dispatcher.get_beast(token_id.into());
            let packed = self.live_beast_stats.entry(token_id).read();
            let mut live: LiveBeastStats = PackableLiveStatsStorePacking::unpack(packed);
            live.token_id = token_id;
            Beast { fixed, live }
        }

        fn _get_live_stats(self: @ContractState, token_id: u32) -> LiveBeastStats {
            let packed = self.live_beast_stats.entry(token_id).read();
            let mut live = PackableLiveStatsStorePacking::unpack(packed);
            live.token_id = token_id;
            live
        }

        fn _save_live_stats(ref self: ContractState, live_stats: LiveBeastStats) -> felt252 {
            let packed = PackableLiveStatsStorePacking::pack(live_stats);
            self.live_beast_stats.entry(live_stats.token_id).write(packed);
            packed
        }

        fn get_combat_spec(self: Beast, include_specials: bool) -> CombatSpec {
            combat::build_combat_spec(
                self.fixed.id,
                self.fixed.level,
                self.fixed.prefix,
                self.fixed.suffix,
                self.live.bonus_xp,
                include_specials,
            )
        }

        /// @title finalize_summit_history
        /// @notice this function is used to finalize the summit history for a beast
        /// @dev we use beast id and lost_at as the key which allows us to get the record of the
        /// current beast using (id, 0)
        ///     we then set the lost_at to the current timestamp to mark the end of the current
        ///     beast's summit if the beast takes the hill again, it'll have a different key pair
        /// @param token_id the id of the beast
        fn _finalize_summit_history(ref self: ContractState, ref beast: Beast, ref beast_updates: Array<felt252>) {
            let mut taken_at: u64 = self.summit_history.entry(beast.live.token_id).read();
            let terminal_timestamp = self.terminal_timestamp.read();

            if taken_at >= terminal_timestamp {
                return;
            }

            let current_timestamp = get_block_timestamp();

            let time_on_summit = if current_timestamp > terminal_timestamp {
                terminal_timestamp - taken_at
            } else {
                current_timestamp - taken_at
            };

            // Mint reward
            if time_on_summit > 0 {
                beast.live.summit_held_seconds += time_on_summit.try_into().unwrap();
                let total_reward_amount = time_on_summit.into() * self.summit_reward_amount_per_second.read();
                let mut diplomacy_reward_amount_per_beast = time_on_summit.into()
                    * self.diplomacy_reward_amount_per_second.read();

                let specials_hash = Self::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);
                let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();
                if diplomacy_count > 0 {
                    // Clamp diplomacy payout so total diplomacy rewards never exceed total summit rewards.
                    let max_diplomacy_reward_amount_per_beast = total_reward_amount / diplomacy_count.into();
                    if diplomacy_reward_amount_per_beast > max_diplomacy_reward_amount_per_beast {
                        diplomacy_reward_amount_per_beast = max_diplomacy_reward_amount_per_beast;
                    }

                    let diplomacy_reward_amount_u32: u32 = (diplomacy_reward_amount_per_beast / 10_000_000_000_000)
                        .try_into()
                        .unwrap();
                    let mut index = 0;
                    while index < diplomacy_count {
                        let diplomacy_beast_token_id = self.diplomacy_beast.entry(specials_hash).entry(index).read();
                        let mut diplomacy_live_stats = Self::_get_live_stats(@self, diplomacy_beast_token_id);
                        diplomacy_live_stats.rewards_earned += diplomacy_reward_amount_u32;
                        let packed_beast = self._save_live_stats(diplomacy_live_stats);
                        beast_updates.append(packed_beast);
                        self
                            .emit(
                                RewardsEarnedEvent {
                                    beast_token_id: diplomacy_beast_token_id, amount: diplomacy_reward_amount_u32,
                                },
                            );

                        index += 1;
                    }
                }

                let total_diplomacy_reward_amount = diplomacy_reward_amount_per_beast * diplomacy_count.into();
                let summit_reward_amount = total_reward_amount - total_diplomacy_reward_amount;

                // Store rewards earned with 13 decimals removed
                let reward_amount_u32: u32 = (summit_reward_amount / 10_000_000_000_000).try_into().unwrap();

                if (MAX_U32 - reward_amount_u32) < beast.live.rewards_earned {
                    beast.live.rewards_earned = MAX_U32;
                } else {
                    beast.live.rewards_earned += reward_amount_u32;
                }

                self.emit(RewardsEarnedEvent { beast_token_id: beast.live.token_id, amount: reward_amount_u32 });
            }
        }

        fn _attack_summit(
            ref self: ContractState,
            attacking_beasts: Span<(u32, u16, u8)>,
            revival_potions: u32,
            extra_life_potions: u16,
            vrf: bool,
            defending_beast_token_id: u32,
        ) -> (u32, u32, u16) {
            let summit_beast_token_id = self.summit_beast_token_id.read();

            assert(summit_beast_token_id != 0, 'Summit not started');
            assert(Self::_summit_playable(@self), 'Summit not playable');

            let safe_attack = defending_beast_token_id != 0;

            if safe_attack {
                assert(defending_beast_token_id == summit_beast_token_id, errors::SUMMIT_BEAST_CHANGED);
            }

            // assert consumable amounts
            assert(extra_life_potions <= BEAST_MAX_EXTRA_LIVES, errors::BEAST_MAX_EXTRA_LIVES);

            let caller = get_caller_address();
            let beast_dispatcher = self.beast_dispatcher.read();
            let beast_nft_dispatcher = self.beast_nft_dispatcher.read();

            let summit_owner = beast_dispatcher.owner_of(summit_beast_token_id.into());
            assert(caller != summit_owner, errors::BEAST_ATTACKING_OWN_BEAST);

            let mut defending_beast = Self::_get_beast(@self, summit_beast_token_id, beast_nft_dispatcher);
            let diplomacy_bonus = Self::_get_diplomacy_bonus(@self, defending_beast, beast_nft_dispatcher);
            let defender_has_specials = defending_beast.live.stats.specials == 1;
            let defender_crit_chance = defending_beast.crit_chance();

            self._apply_poison_damage(ref defending_beast);

            let random_seed = if vrf {
                VRFImpl::seed()
            } else {
                0
            };

            let current_time = get_block_timestamp();

            // Array to collect beast updates for batch emission at the end
            let mut beast_updates: Array<felt252> = array![];

            let mut total_attack_potions: u32 = 0;
            let mut remaining_revival_potions = revival_potions;
            let mut beast_attacked = false;
            for attacking_beast_entry in attacking_beasts {
                let (attacking_beast_token_id, attack_count, attack_potions) = *attacking_beast_entry;

                assert!(attack_count > 0, "Attack count must be greater than 0");
                // assert the caller owns the beast they attacking with
                let beast_owner = beast_dispatcher.owner_of(attacking_beast_token_id.into());
                assert(beast_owner == caller, errors::NOT_TOKEN_OWNER);

                // get stats for the beast that is attacking
                let mut attacking_beast = Self::_get_beast(@self, attacking_beast_token_id, beast_nft_dispatcher);

                if Self::_is_killed_recently_in_death_mountain(@self, attacking_beast) {
                    if safe_attack {
                        assert!(false, "Beast {} has been killed in the last day", attacking_beast_token_id);
                    } else {
                        continue;
                    }
                }

                // precompute combat specs and crit chances before battle loop
                let attacker_has_specials = attacking_beast.live.stats.specials == 1;

                // precompute damage for normal and critical attacks
                let attacker_combat_result = ImplCombat::calculate_combat_outcomes(
                    attacking_beast.get_combat_spec(attacker_has_specials),
                    defending_beast.get_combat_spec(attacker_has_specials),
                    MINIMUM_DAMAGE,
                    attack_potions,
                );
                let defender_combat_result = ImplCombat::calculate_combat_outcomes(
                    defending_beast.get_combat_spec(defender_has_specials),
                    attacking_beast.get_combat_spec(defender_has_specials),
                    MINIMUM_DAMAGE,
                    diplomacy_bonus,
                );

                // precompute critical hit chances
                let attacker_crit_chance = attacking_beast.crit_chance();

                if (attacker_crit_chance > 0 || defender_crit_chance > 0) {
                    assert(vrf, 'missing VRF seed');
                }

                if attack_potions > 0 {
                    total_attack_potions += attack_potions.into();
                    attacking_beast.live.quest.used_attack_potion = 1;
                }

                for attack_index in 0_u16..attack_count {
                    // check if it needs revival potions
                    let potions_required = Self::_revival_potions_required(@self, attacking_beast);
                    let potions_required_u32: u32 = potions_required.into();
                    if potions_required > 0 {
                        if remaining_revival_potions < potions_required_u32 {
                            if safe_attack {
                                assert!(
                                    false,
                                    "Beast {} requires {} revival potions",
                                    attacking_beast_token_id,
                                    potions_required,
                                );
                            } else {
                                break;
                            }
                        }

                        if attacking_beast.live.revival_count < MAX_REVIVAL_COUNT {
                            attacking_beast.live.revival_count += 1;
                        }

                        attacking_beast.live.quest.used_revival_potion = 1;
                        remaining_revival_potions -= potions_required_u32;
                    }

                    // reset health to starting health plus any bonus health they have accrued
                    // @dev beasts attack till death so we don't need any additional logic
                    attacking_beast.live.current_health = attacking_beast.fixed.health
                        + attacking_beast.live.bonus_health;

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
                    while attacking_beast.live.current_health != 0 && defending_beast.live.current_health != 0 {
                        let (_, attacker_crit_hit_rnd, defender_crit_hit_rnd, _) = Self::_get_battle_randomness(
                            attacking_beast_token_id,
                            random_seed,
                            attacking_beast.live.last_death_timestamp,
                            battle_counter,
                        );

                        let attacker_crit_hit = ImplCombat::is_critical_hit(
                            attacker_crit_chance, attacker_crit_hit_rnd,
                        );
                        let attacker_damage = if attacker_crit_hit {
                            attacker_combat_result.total_crit_damage
                        } else {
                            attacker_combat_result.total_damage
                        };

                        if attacker_damage >= defending_beast.live.current_health {
                            defending_beast.live.current_health = 0;
                            defending_beast._use_extra_life();
                        } else {
                            defending_beast.live.current_health -= attacker_damage;
                        }

                        if attacker_crit_hit {
                            critical_attack_count += 1;
                            critical_attack_damage = attacker_damage;
                        } else {
                            attack_count += 1;
                            attack_damage = attacker_damage;
                        }

                        if defending_beast.live.current_health != 0 {
                            let defender_crit_hit = ImplCombat::is_critical_hit(
                                defender_crit_chance, defender_crit_hit_rnd,
                            );
                            let defender_damage = if defender_crit_hit {
                                defender_combat_result.total_crit_damage
                            } else {
                                defender_combat_result.total_damage
                            };

                            if defender_damage >= attacking_beast.live.current_health {
                                attacking_beast.live.current_health = 0;
                            } else {
                                attacking_beast.live.current_health -= defender_damage;
                            }

                            if defender_crit_hit {
                                critical_counter_attack_count += 1;
                                critical_counter_attack_damage = defender_damage;
                            } else {
                                counter_attack_count += 1;
                                counter_attack_damage = defender_damage;
                            }
                        }

                        battle_counter += 1;
                    }

                    // reset attack streak if 2x base revival time has passed since last death
                    if attacking_beast.live.last_death_timestamp + BASE_REVIVAL_TIME_SECONDS * 2 < current_time {
                        attacking_beast.live.attack_streak = 0;
                    }

                    let mut xp_gained: u16 = 0;
                    // check if max xp is reached
                    if Self::_beast_can_get_xp(attacking_beast) {
                        xp_gained = 10 + attacking_beast.live.attack_streak.into();
                        attacking_beast.live.bonus_xp += xp_gained;
                    }

                    // increase attack streak if less than 10
                    if attacking_beast.live.attack_streak < 10 {
                        attacking_beast.live.attack_streak += 1;
                    }

                    if (attacking_beast.live.attack_streak == 10) {
                        attacking_beast.live.quest.max_attack_streak = 1;
                    }

                    beast_attacked = true;

                    // emit battle event
                    self
                        .emit(
                            BattleEvent {
                                attacking_beast_token_id,
                                attack_index,
                                defending_beast_token_id: summit_beast_token_id,
                                attack_count,
                                attack_damage,
                                critical_attack_count,
                                critical_attack_damage,
                                counter_attack_count,
                                counter_attack_damage,
                                critical_counter_attack_count,
                                critical_counter_attack_damage,
                                attack_potions,
                                revive_potions: potions_required,
                                xp_gained,
                            },
                        );

                    if attacking_beast.live.current_health == 0 {
                        // add xp to summit beast if wisdom unlocked
                        if defending_beast.live.stats.wisdom == 1 && Self::_beast_can_get_xp(defending_beast) {
                            let xp_gained = ImplCombat::get_attack_hp(attacking_beast.get_combat_spec(false)) / 100;
                            defending_beast.live.bonus_xp += xp_gained;
                        }

                        // set death timestamp for prev summit beast
                        attacking_beast.live.last_death_timestamp = current_time;
                        // write beast and collect live stats for batch emission
                        let packed_attacking_beast = self._save_live_stats(attacking_beast.live);
                        beast_updates.append(packed_attacking_beast);
                    } else if defending_beast.live.current_health == 0 {
                        // finalize the summit history for prev summit beast
                        self._finalize_summit_history(ref defending_beast, ref beast_updates);

                        // set death timestamp for prev summit beast
                        defending_beast.live.last_death_timestamp = current_time;

                        // initialize summit history for the new beast
                        self.summit_history.entry(attacking_beast_token_id).write(current_time);

                        // set the new summit beast
                        self.summit_beast_token_id.write(attacking_beast_token_id);
                        attacking_beast.live.quest.captured_summit = 1;

                        // Apply extra life potions
                        if extra_life_potions > 0 {
                            attacking_beast.live.extra_lives = extra_life_potions;
                            self
                                .extra_life_potion_dispatcher
                                .read()
                                .burn_from(caller, extra_life_potions.into() * TOKEN_DECIMALS);
                        }

                        // write beast and collect live stats for batch emission
                        let packed_attacking_beast = self._save_live_stats(attacking_beast.live);
                        beast_updates.append(packed_attacking_beast);

                        // reset poison state (count = 0, timestamp = current)
                        self.poison_state.write(poison::pack_poison_state(get_block_timestamp(), 0));

                        break;
                    }
                }
                if (defending_beast.live.current_health == 0) {
                    break;
                }
            }

            assert(beast_attacked, 'No beast attacked');

            // write defending beast and collect live stats for batch emission
            let packed_defending_beast = self._save_live_stats(defending_beast.live);
            beast_updates.append(packed_defending_beast);

            // emit batch events
            self.emit(BeastUpdatesEvent { beast_updates: beast_updates.span() });

            // Burn consumables
            if safe_attack {
                assert(remaining_revival_potions == 0, 'Unused revival potions');
            }

            let revival_potions_used = revival_potions - remaining_revival_potions;
            if revival_potions_used > 0 {
                self.revive_potion_dispatcher.read().burn_from(caller, revival_potions_used.into() * TOKEN_DECIMALS);
            }

            if total_attack_potions > 0 {
                self.attack_potion_dispatcher.read().burn_from(caller, total_attack_potions.into() * TOKEN_DECIMALS);
            }

            let extra_life_potions_used = if defending_beast.live.current_health == 0 {
                extra_life_potions
            } else {
                0
            };
            (total_attack_potions, revival_potions_used, extra_life_potions_used)
        }

        fn _is_killed_recently_in_death_mountain(self: @ContractState, beast: Beast) -> bool {
            let last_killed_timestamp = Self::_get_last_killed_timestamp(self, beast);
            revival::is_killed_recently(last_killed_timestamp, get_block_timestamp(), DAY_SECONDS)
        }

        /// @notice this function is used to apply revival potions if needed
        /// @param live_beast_stats the stats of the beast to check
        fn _revival_potions_required(self: @ContractState, beast: Beast) -> u16 {
            revival::calculate_revival_potions(
                beast.live.last_death_timestamp,
                get_block_timestamp(),
                beast.live.revival_count,
                beast.spirit_reduction(),
            )
        }

        fn _get_last_killed_timestamp(self: @ContractState, beast: Beast) -> u64 {
            let beast_hash = ImplBeast::get_beast_hash(beast.fixed.id, beast.fixed.prefix, beast.fixed.suffix);
            let beast_data_dispatcher = self.beast_data_dispatcher.read();

            let num_deaths = beast_data_dispatcher.get_collectable_count(self.dungeon_address.read(), beast_hash);
            // Don't lock newly collected beasts
            if num_deaths == 1 {
                0
            } else {
                let collectable_entity = beast_data_dispatcher
                    .get_collectable(self.dungeon_address.read(), beast_hash, num_deaths - 1);
                collectable_entity.timestamp
            }
        }

        /// @title beast_can_get_xp
        /// @notice this function is used to check if a beast can get xp
        /// @param beast the beast to check
        /// @return bool true if the beast can get xp, false otherwise
        fn _beast_can_get_xp(beast: Beast) -> bool {
            beast_utils::can_gain_xp(beast.fixed.level, beast.live.bonus_xp, BEAST_MAX_BONUS_LVLS)
        }

        fn _use_extra_life(ref self: Beast) {
            let (new_health, new_lives) = combat::use_extra_life(
                self.live.current_health, self.live.extra_lives, self.fixed.health, self.live.bonus_health,
            );
            self.live.current_health = new_health;
            self.live.extra_lives = new_lives;
        }

        fn _get_specials_hash(prefix: u8, suffix: u8) -> felt252 {
            beast_utils::get_specials_hash(prefix, suffix)
        }

        fn _is_beast_stronger(beast1: LiveBeastStats, beast2: LiveBeastStats) -> bool {
            beast_utils::is_beast_stronger(
                beast1.summit_held_seconds,
                beast1.bonus_xp,
                beast1.last_death_timestamp,
                beast2.summit_held_seconds,
                beast2.bonus_xp,
                beast2.last_death_timestamp,
            )
        }

        fn _get_battle_randomness(
            token_id: u32, seed: felt252, last_death_timestamp: u64, battle_counter: u32,
        ) -> (u8, u8, u8, u8) {
            combat::get_battle_randomness(token_id, seed, last_death_timestamp, battle_counter)
        }

        fn _apply_poison_damage(ref self: ContractState, ref beast: Beast) -> u64 {
            let (poison_timestamp, poison_count) = poison::unpack_poison_state(self.poison_state.read());
            let current_time = get_block_timestamp();
            let time_since_poison = current_time - poison_timestamp;

            // Use pure function for damage calculation
            let result = poison::calculate_poison_damage(
                beast.live.current_health,
                beast.live.extra_lives,
                beast.fixed.health,
                beast.live.bonus_health,
                poison_count,
                time_since_poison,
            );

            // Apply results to beast
            beast.live.current_health = result.new_health;
            beast.live.extra_lives = result.new_extra_lives;

            // Update storage with packed state (timestamp updated, count unchanged)
            self.poison_state.write(poison::pack_poison_state(current_time, poison_count));

            result.damage
        }

        fn _get_diplomacy_bonus(self: @ContractState, beast: Beast, beast_nft_dispatcher: IBeastsDispatcher) -> u8 {
            let specials_hash = Self::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);
            let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();

            if diplomacy_count <= 1 {
                return 0;
            }

            let mut index = 0;
            let mut bonus: u16 = 0;
            while index < diplomacy_count {
                let diplomacy_beast_token_id = self.diplomacy_beast.entry(specials_hash).entry(index).read();

                if diplomacy_beast_token_id != beast.live.token_id {
                    let diplomacy_beast = Self::_get_beast(self, diplomacy_beast_token_id, beast_nft_dispatcher);
                    let power = ImplCombat::get_attack_hp(diplomacy_beast.get_combat_spec(false));

                    bonus += power;
                }

                index += 1;
            }

            (bonus / 250).try_into().unwrap()
        }
    }

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }
}
