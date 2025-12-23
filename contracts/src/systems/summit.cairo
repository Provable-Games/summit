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
    );
    fn feed(ref self: T, beast_token_id: u32, amount: u16);
    fn claim_beast_reward(ref self: T, beast_token_ids: Span<u32>);

    fn add_extra_life(ref self: T, beast_token_id: u32, extra_life_potions: u16);
    fn apply_stat_points(ref self: T, beast_token_id: u32, stats: Stats);
    fn apply_poison(ref self: T, beast_token_id: u32, count: u16);

    fn claim_summit(ref self: T);
    fn add_beast_to_leaderboard(ref self: T, beast_token_id: u32, position: u32);
    fn distribute_beast_tokens(ref self: T, limit: u32);

    fn set_start_timestamp(ref self: T, start_timestamp: u64);
    fn set_event_address(ref self: T, event_address: ContractAddress);
    fn set_attack_potion_address(ref self: T, attack_potion_address: ContractAddress);
    fn set_revive_potion_address(ref self: T, revive_potion_address: ContractAddress);
    fn set_extra_life_potion_address(ref self: T, extra_life_potion_address: ContractAddress);
    fn set_poison_potion_address(ref self: T, poison_potion_address: ContractAddress);
    fn set_skull_token_address(ref self: T, skull_token_address: ContractAddress);
    fn set_corpse_token_address(ref self: T, corpse_token_address: ContractAddress);
    fn set_test_money_address(ref self: T, test_money_address: ContractAddress);
    fn withdraw_funds(ref self: T, token_address: ContractAddress, amount: u256);

    fn get_summit_data(ref self: T) -> (Beast, u64, ContractAddress, u16, u64, felt252);
    fn get_summit_beast_token_id(self: @T) -> u32;
    fn get_summit_beast(self: @T) -> Beast;
    fn get_beast(self: @T, beast_token_id: u32) -> Beast;
    fn get_live_stats(self: @T, beast_token_ids: Span<u32>) -> Span<LiveBeastStats>;

    fn get_start_timestamp(self: @T) -> u64;
    fn get_terminal_block(self: @T) -> u64;
    fn get_summit_claimed(self: @T) -> bool;
    fn get_summit_duration_blocks(self: @T) -> u64;
    fn get_summit_reward_amount(self: @T) -> u128;
    fn get_showdown_duration_seconds(self: @T) -> u64;
    fn get_showdown_reward_amount(self: @T) -> u128;
    fn get_beast_tokens_amount(self: @T) -> u128;
    fn get_beast_submission_blocks(self: @T) -> u64;
    fn get_beast_top_spots(self: @T) -> u32;

    fn get_event_address(self: @T) -> ContractAddress;
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
    use core::num::traits::Sqrt;
    use core::poseidon::poseidon_hash_span;
    use death_mountain_beast::beast::ImplBeast;
    use death_mountain_combat::combat::{CombatSpec, ImplCombat, SpecialPowers};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use openzeppelin_upgrades::UpgradeableComponent;
    use openzeppelin_upgrades::interface::IUpgradeable;
    use starknet::storage::{Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ClassHash, ContractAddress, get_block_number, get_block_timestamp, get_caller_address};
    use summit::constants::{
        BASE_REVIVAL_TIME_SECONDS, BEAST_MAX_ATTRIBUTES, BEAST_MAX_BONUS_HEALTH, BEAST_MAX_BONUS_LVLS,
        BEAST_MAX_EXTRA_LIVES, DAY_SECONDS, DIPLOMACY_COST, MAX_REVIVAL_COUNT, MINIMUM_DAMAGE, SPECIALS_COST,
        TOKEN_DECIMALS, WISDOM_COST, errors,
    };
    use summit::erc20::interface::{SummitERC20Dispatcher, SummitERC20DispatcherTrait};
    use summit::interfaces::{
        IBeastSystemsDispatcher, IBeastSystemsDispatcherTrait, ISummitEventsDispatcher, ISummitEventsDispatcherTrait,
    };
    use summit::models::beast::{Beast, BeastUtilsImpl, LiveBeastStats, Stats};
    use summit::utils::{felt_to_u32, u32_to_u8s};
    use summit::vrf::VRFImpl;

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
        live_beast_stats: Map<u32, LiveBeastStats>,
        poison_timestamp: u64,
        poison_count: u16,
        summit_history: Map<u32, u64>,
        showdown_taken_at: u64,
        diplomacy_beast: Map<felt252, Map<u8, u32>>, // (prefix-suffix hash) -> (index) -> beast token id
        diplomacy_count: Map<felt252, u8>,
        start_timestamp: u64,
        summit_duration_blocks: u64,
        showdown_duration_seconds: u64,
        terminal_block: u64,
        summit_claimed: bool,
        summit_reward_amount: u128, // Total amount being distributed
        showdown_reward_amount: u128, // Showdown winner reward
        beast_leaderboard: Map<u32, u32>, // position -> beast token id
        beast_submission_blocks: u64,
        beast_tokens_distributed: u32,
        beast_tokens_amount: u128, // Amount each top beast get
        beast_top_spots: u32, // Number of beasts getting reward
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
        summit_events_dispatcher: ISummitEventsDispatcher,
        test_money_dispatcher: IERC20Dispatcher,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        start_timestamp: u64,
        summit_duration_blocks: u64,
        summit_reward_amount: u128,
        showdown_duration_seconds: u64,
        showdown_reward_amount: u128,
        beast_tokens_amount: u128,
        beast_submission_blocks: u64,
        beast_top_spots: u32,
        dungeon_address: ContractAddress,
        beast_address: ContractAddress,
        beast_data_address: ContractAddress,
        reward_address: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        self.start_timestamp.write(start_timestamp);
        self.summit_duration_blocks.write(summit_duration_blocks);
        self.summit_reward_amount.write(summit_reward_amount);
        self.showdown_duration_seconds.write(showdown_duration_seconds);
        self.showdown_reward_amount.write(showdown_reward_amount);
        self.beast_tokens_amount.write(beast_tokens_amount);
        self.beast_submission_blocks.write(beast_submission_blocks);
        self.beast_top_spots.write(beast_top_spots);
        self.dungeon_address.write(dungeon_address);
        self.beast_dispatcher.write(IERC721Dispatcher { contract_address: beast_address });
        self.beast_nft_dispatcher.write(IBeastsDispatcher { contract_address: beast_address });
        self.beast_data_dispatcher.write(IBeastSystemsDispatcher { contract_address: beast_data_address });
        self.reward_dispatcher.write(IERC20Dispatcher { contract_address: reward_address });
    }

    #[abi(embed_v0)]
    impl SummitSystemImpl of super::ISummitSystem<ContractState> {
        fn claim_summit(ref self: ContractState) {
            assert(!self.summit_claimed.read(), 'Summit already claimed');
            assert(!InternalSummitImpl::_summit_playable(@self), 'Summit not over');

            let token_id = self.summit_beast_token_id.read();

            let summit_owner = self.beast_dispatcher.read().owner_of(token_id.into());
            assert(summit_owner == get_caller_address(), errors::NOT_TOKEN_OWNER);

            self.summit_claimed.write(true);
        }

        fn attack(
            ref self: ContractState,
            defending_beast_token_id: u32,
            attacking_beasts: Span<(u32, u16, u8)>,
            revival_potions: u32,
            extra_life_potions: u16,
            vrf: bool,
        ) {
            InternalSummitImpl::_attack_summit(
                ref self, attacking_beasts, revival_potions, extra_life_potions, vrf, defending_beast_token_id,
            );
        }

        fn feed(ref self: ContractState, beast_token_id: u32, amount: u16) {
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');
            assert(amount > 0, 'No amount to feed');

            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);
            let new_bonus_health = beast.live.bonus_health + amount;
            assert(new_bonus_health <= BEAST_MAX_BONUS_HEALTH, errors::BEAST_MAX_BONUS_HEALTH);

            beast.live.bonus_health = new_bonus_health;

            if beast_token_id == self.summit_beast_token_id.read() {
                beast.live.current_health += amount;
            }

            self.corpse_token_dispatcher.read().burn_from(get_caller_address(), amount.into() * TOKEN_DECIMALS);
            self._save_beast(beast, false);
        }

        fn claim_beast_reward(ref self: ContractState, beast_token_ids: Span<u32>) {
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');

            let beast_dispatcher = self.beast_dispatcher.read();

            let mut potion_rewards: u256 = 0;

            let mut i = 0;
            while (i < beast_token_ids.len()) {
                let beast_token_id = *beast_token_ids.at(i);
                assert(
                    beast_dispatcher.owner_of(beast_token_id.into()) == get_caller_address(), errors::NOT_TOKEN_OWNER,
                );

                let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);
                assert(beast.live.has_claimed_potions == 0, 'Already claimed potions');

                potion_rewards += InternalSummitImpl::get_potion_amount(beast.fixed.id).into();
                beast.live.has_claimed_potions = 1;

                self._save_beast(beast, false);
                i += 1;
            }

            self.attack_potion_dispatcher.read().transfer(get_caller_address(), 3 * potion_rewards * TOKEN_DECIMALS);
            self.poison_potion_dispatcher.read().transfer(get_caller_address(), 3 * potion_rewards * TOKEN_DECIMALS);
            self.revive_potion_dispatcher.read().transfer(get_caller_address(), 2 * potion_rewards * TOKEN_DECIMALS);
            self.extra_life_potion_dispatcher.read().transfer(get_caller_address(), potion_rewards * TOKEN_DECIMALS);

            self
                .test_money_dispatcher
                .read()
                .transfer(get_caller_address(), beast_token_ids.len().into() * TOKEN_DECIMALS);
        }

        fn add_extra_life(ref self: ContractState, beast_token_id: u32, extra_life_potions: u16) {
            assert(extra_life_potions > 0, 'No extra lives');
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');

            let summit_beast_token_id = self.summit_beast_token_id.read();
            assert(beast_token_id == summit_beast_token_id, 'Not summit beast');

            assert(extra_life_potions <= BEAST_MAX_EXTRA_LIVES, errors::BEAST_MAX_EXTRA_LIVES);

            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);

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
            self._save_beast(beast, false);
        }


        fn apply_stat_points(ref self: ContractState, beast_token_id: u32, stats: Stats) {
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');

            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);

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
            self._save_beast(beast, true);
        }

        fn apply_poison(ref self: ContractState, beast_token_id: u32, count: u16) {
            assert(count > 0, 'No poison to apply');
            assert(InternalSummitImpl::_summit_playable(@self), 'Summit not playable');

            let summit_beast_token_id = self.summit_beast_token_id.read();
            assert(beast_token_id == summit_beast_token_id, errors::SUMMIT_BEAST_CHANGED);

            let mut beast = InternalSummitImpl::_get_beast(@self, beast_token_id);

            let current_poison_count = self.poison_count.read();
            let damage = self._apply_poison_damage(ref beast);

            if damage > 0 {
                self._save_beast(beast, false);
            }

            self.poison_potion_dispatcher.read().burn_from(get_caller_address(), count.into() * TOKEN_DECIMALS);
            self.poison_count.write(current_poison_count + count);

            self.summit_events_dispatcher.read().emit_poison_event(beast_token_id, count, get_caller_address());
        }

        fn start_summit(ref self: ContractState) {
            assert(get_block_timestamp() >= self.start_timestamp.read(), 'Summit not open yet');
            assert(self.summit_beast_token_id.read() == 0, 'Summit already started');

            let current_block = get_block_number();
            self.terminal_block.write(current_block + self.summit_duration_blocks.read());

            let start_token_id = 1;
            self.summit_history.entry(start_token_id).write(current_block);
            self.summit_beast_token_id.write(start_token_id);

            let mut beast: Beast = InternalSummitImpl::_get_beast(@self, start_token_id);
            beast.live.current_health = 100;
            self._save_beast(beast, false);
        }

        fn add_beast_to_leaderboard(ref self: ContractState, beast_token_id: u32, position: u32) {
            let current_block = get_block_number();
            assert(current_block >= self.terminal_block.read(), 'Summit not over');
            assert(
                current_block < self.terminal_block.read() + self.beast_submission_blocks.read(),
                'Submission period over',
            );

            assert(position > 0 && position <= self.beast_top_spots.read(), 'Invalid position');

            let new_beast: Beast = InternalSummitImpl::_get_beast(@self, beast_token_id);
            assert!(new_beast.live.blocks_held > 0, "Beast has no rewards earned");

            if position > 1 {
                let previous_position_id = self.beast_leaderboard.entry(position - 1).read();
                let previous_beast: Beast = InternalSummitImpl::_get_beast(@self, previous_position_id);
                assert(InternalSummitImpl::_is_beast_stronger(previous_beast, new_beast), 'Previous beast weaker');
            }

            let current_position_id = self.beast_leaderboard.entry(position).read();
            if current_position_id != 0 {
                let current_beast: Beast = InternalSummitImpl::_get_beast(@self, current_position_id);
                assert(InternalSummitImpl::_is_beast_stronger(new_beast, current_beast), 'Current beast stronger');

                let next_position_id = self.beast_leaderboard.entry(position + 1).read();
                if next_position_id != 0 {
                    let next_beast: Beast = InternalSummitImpl::_get_beast(@self, next_position_id);
                    assert(InternalSummitImpl::_is_beast_stronger(current_beast, next_beast), 'next beast stronger');
                }
            }

            self.beast_leaderboard.entry(position).write(beast_token_id);
        }

        fn distribute_beast_tokens(ref self: ContractState, limit: u32) {
            assert(
                get_block_number() > self.terminal_block.read() + self.beast_submission_blocks.read(),
                'Submission not over',
            );

            let beast_top_spots = self.beast_top_spots.read();
            let beast_tokens_amount = self.beast_tokens_amount.read();
            let beast_dispatcher = self.beast_dispatcher.read();
            let reward_dispatcher = self.reward_dispatcher.read();

            let mut current_position = self.beast_tokens_distributed.read();
            assert(current_position < beast_top_spots, 'All rewards distributed');

            let new_limit = current_position + limit;

            while current_position < new_limit {
                current_position += 1;

                if current_position > beast_top_spots {
                    break;
                }

                let beast_token_id = self.beast_leaderboard.entry(current_position).read();
                let beast_owner = beast_dispatcher.owner_of(beast_token_id.into());
                reward_dispatcher.transfer(beast_owner, beast_tokens_amount.into());
            }

            self.beast_tokens_distributed.write(current_position);
        }

        fn set_start_timestamp(ref self: ContractState, start_timestamp: u64) {
            self.ownable.assert_only_owner();
            assert(self.start_timestamp.read() > get_block_timestamp(), 'Summit already started');
            self.start_timestamp.write(start_timestamp);
        }

        fn set_event_address(ref self: ContractState, event_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.summit_events_dispatcher.write(ISummitEventsDispatcher { contract_address: event_address });
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

        fn set_test_money_address(ref self: ContractState, test_money_address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.test_money_dispatcher.write(IERC20Dispatcher { contract_address: test_money_address });
        }

        fn withdraw_funds(ref self: ContractState, token_address: ContractAddress, amount: u256) {
            self.ownable.assert_only_owner();
            let token = IERC20Dispatcher { contract_address: token_address };
            token.transfer(self.ownable.Ownable_owner.read(), amount);
        }

        fn get_start_timestamp(self: @ContractState) -> u64 {
            self.start_timestamp.read()
        }

        fn get_event_address(self: @ContractState) -> ContractAddress {
            self.summit_events_dispatcher.read().contract_address
        }

        fn get_terminal_block(self: @ContractState) -> u64 {
            self.terminal_block.read()
        }

        fn get_beast_submission_blocks(self: @ContractState) -> u64 {
            self.beast_submission_blocks.read()
        }

        fn get_summit_claimed(self: @ContractState) -> bool {
            self.summit_claimed.read()
        }

        fn get_summit_duration_blocks(self: @ContractState) -> u64 {
            self.summit_duration_blocks.read()
        }

        fn get_summit_reward_amount(self: @ContractState) -> u128 {
            self.summit_reward_amount.read()
        }

        fn get_showdown_duration_seconds(self: @ContractState) -> u64 {
            self.showdown_duration_seconds.read()
        }

        fn get_showdown_reward_amount(self: @ContractState) -> u128 {
            self.showdown_reward_amount.read()
        }

        fn get_beast_tokens_amount(self: @ContractState) -> u128 {
            self.beast_tokens_amount.read()
        }

        fn get_beast_top_spots(self: @ContractState) -> u32 {
            self.beast_top_spots.read()
        }

        fn get_summit_data(ref self: ContractState) -> (Beast, u64, ContractAddress, u16, u64, felt252) {
            let token_id = self.summit_beast_token_id.read();
            let beast = InternalSummitImpl::_get_beast(@self, token_id);
            let taken_at: u64 = self.summit_history.entry(token_id).read();
            let summit_owner = self.beast_dispatcher.read().owner_of(token_id.into());
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

        fn get_live_stats(self: @ContractState, beast_token_ids: Span<u32>) -> Span<LiveBeastStats> {
            let mut live_stats = array![];
            let mut i = 0;
            while i < beast_token_ids.len() {
                let token_id = *beast_token_ids.at(i);
                let live_stat: LiveBeastStats = self.live_beast_stats.entry(token_id).read();
                live_stats.append(live_stat);
                i += 1;
            }
            live_stats.span()
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
            let current_timestamp = get_block_timestamp();
            let taken_at = self.showdown_taken_at.read();

            if taken_at > 0 && current_timestamp - taken_at >= self.showdown_duration_seconds.read() {
                return false;
            }

            true
        }

        /// @title get_beast
        /// @notice this function is used to get a beast from the contract
        /// @param token_id the id of the beast
        /// @return Beast the beast
        fn _get_beast(self: @ContractState, token_id: u32) -> Beast {
            let fixed: PackableBeast = self.beast_nft_dispatcher.read().get_beast(token_id.into());
            let mut live: LiveBeastStats = self.live_beast_stats.entry(token_id).read();
            live.token_id = token_id;
            Beast { fixed, live }
        }

        fn _save_beast(ref self: ContractState, beast: Beast, update_diplomacy: bool) {
            self.live_beast_stats.entry(beast.live.token_id).write(beast.live);

            self.summit_events_dispatcher.read().emit_beast_event(beast.live);

            if update_diplomacy && beast.live.stats.diplomacy == 1 {
                let (specials_hash, total_power, beast_token_ids) = Self::_get_diplomacy_data(@self, beast);
                self.summit_events_dispatcher.read().emit_diplomacy_event(specials_hash, beast_token_ids, total_power);
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

        /// @title finalize_summit_history
        /// @notice this function is used to finalize the summit history for a beast
        /// @dev we use beast id and lost_at as the key which allows us to get the record of the
        /// current beast using (id, 0)
        ///     we then set the lost_at to the current timestamp to mark the end of the current
        ///     beast's summit if the beast takes the hill again, it'll have a different key pair
        /// @param token_id the id of the beast
        fn _finalize_summit_history(ref self: ContractState, ref beast: Beast, summit_owner: ContractAddress) {
            let mut taken_at: u64 = self.summit_history.entry(beast.live.token_id).read();
            let terminal_block = self.terminal_block.read();

            if taken_at >= terminal_block {
                return;
            }

            let current_block = get_block_number();

            let blocks_on_summit = if current_block > terminal_block {
                terminal_block - taken_at
            } else {
                current_block - taken_at
            };

            // Mint reward
            if blocks_on_summit > 0 {
                beast.live.blocks_held += blocks_on_summit.try_into().unwrap();
                let block_reward = self.summit_reward_amount.read() / self.summit_duration_blocks.read().into();
                let total_reward_amount = blocks_on_summit.into() * block_reward;
                let diplomacy_reward_amount = total_reward_amount / 100;

                let specials_hash = Self::_get_specials_hash(beast.fixed.prefix, beast.fixed.suffix);
                let diplomacy_count = self.diplomacy_count.entry(specials_hash).read();
                if diplomacy_count > 0 {
                    let mut index = 0;
                    loop {
                        if index >= diplomacy_count {
                            break;
                        }

                        let diplomacy_beast_token_id = self.diplomacy_beast.entry(specials_hash).entry(index).read();
                        let diplomacy_beast_owner = self
                            .beast_dispatcher
                            .read()
                            .owner_of(diplomacy_beast_token_id.into());
                        Self::_reward_beast(
                            ref self, diplomacy_beast_token_id, diplomacy_beast_owner, diplomacy_reward_amount,
                        );
                        index += 1;
                    }
                }

                let summit_reward_amount = total_reward_amount - (diplomacy_reward_amount * diplomacy_count.into());
                Self::_reward_beast(ref self, beast.live.token_id, summit_owner, summit_reward_amount);
            }
        }

        fn _attack_summit(
            ref self: ContractState,
            attacking_beasts: Span<(u32, u16, u8)>,
            revival_potions: u32,
            extra_life_potions: u16,
            vrf: bool,
            defending_beast_token_id: u32,
        ) {
            let summit_beast_token_id = self.summit_beast_token_id.read();

            assert(summit_beast_token_id != 0, 'Summit not started');
            Self::_summit_playable(@self);

            let safe_attack = defending_beast_token_id != 0;

            if safe_attack {
                assert(defending_beast_token_id == summit_beast_token_id, errors::SUMMIT_BEAST_CHANGED);
            }

            // assert consumable amounts
            assert(extra_life_potions <= BEAST_MAX_EXTRA_LIVES, errors::BEAST_MAX_EXTRA_LIVES);

            let beast_dispatcher = self.beast_dispatcher.read();
            let event_dispatcher = self.summit_events_dispatcher.read();

            let summit_owner = beast_dispatcher.owner_of(summit_beast_token_id.into());
            assert(get_caller_address() != summit_owner, errors::BEAST_ATTACKING_OWN_BEAST);

            let mut defending_beast = Self::_get_beast(@self, summit_beast_token_id);
            let diplomacy_bonus = Self::_get_diplomacy_bonus(@self, defending_beast);

            self._apply_poison_damage(ref defending_beast);

            let random_seed = if vrf {
                VRFImpl::seed()
            } else {
                0
            };

            let current_time = get_block_timestamp();

            let mut total_attack_potions: u32 = 0;
            let mut remaining_revival_potions = revival_potions;
            let mut beast_attacked = false;
            let mut i = 0;
            while (i < attacking_beasts.len()) {
                let (attacking_beast_token_id, attack_count, attack_potions) = *attacking_beasts.at(i);

                assert!(attack_count > 0, "Attack count must be greater than 0");
                // assert the caller owns the beast they attacking with
                let beast_owner = beast_dispatcher.owner_of(attacking_beast_token_id.into());
                assert(beast_owner == get_caller_address(), errors::NOT_TOKEN_OWNER);

                // get stats for the beast that is attacking
                let mut attacking_beast = Self::_get_beast(@self, attacking_beast_token_id);

                if Self::_is_killed_recently_in_death_mountain(@self, attacking_beast) {
                    if safe_attack {
                        assert!(false, "Beast {} has been killed in the last day", attacking_beast_token_id);
                    } else {
                        i += 1;
                        continue;
                    }
                }

                let mut attack_counter = 0;
                while (attack_counter < attack_count) {
                    // check if it needs revival potions
                    let potions_required = Self::_revival_potions_required(@self, attacking_beast);
                    if potions_required > 0 {
                        if remaining_revival_potions < potions_required {
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

                        remaining_revival_potions -= potions_required;
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

                    // precompute combat specs and crit chances before battle loop
                    let attacker_has_specials = attacking_beast.live.stats.specials == 1;
                    let defender_has_specials = defending_beast.live.stats.specials == 1;

                    // combat specs for when attacking_beast attacks
                    let attacker_spec_as_attacker = attacking_beast.get_combat_spec(attacker_has_specials);
                    let defender_spec_when_attacked = defending_beast.get_combat_spec(attacker_has_specials);

                    // combat specs for when defending_beast counter-attacks
                    let defender_spec_as_attacker = defending_beast.get_combat_spec(defender_has_specials);
                    let attacker_spec_when_attacked = attacking_beast.get_combat_spec(defender_has_specials);

                    // precompute critical hit chances
                    let attacker_crit_chance = attacking_beast.crit_chance();
                    let defender_crit_chance = defending_beast.crit_chance();

                    if (attack_counter == 0) {
                        total_attack_potions += attack_potions.into();
                    }

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
                                attacker_spec_as_attacker,
                                defender_spec_when_attacked,
                                ref defending_beast,
                                attack_potions,
                                attacker_crit_hit_rnd,
                                attacker_crit_chance,
                                vrf,
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
                                ._attack(
                                    defender_spec_as_attacker,
                                    attacker_spec_when_attacked,
                                    ref attacking_beast,
                                    diplomacy_bonus,
                                    defender_crit_hit_rnd,
                                    defender_crit_chance,
                                    vrf,
                                );

                            if defender_crit_hit {
                                critical_counter_attack_count += 1;
                                critical_counter_attack_damage = damage;
                            } else {
                                counter_attack_count += 1;
                                counter_attack_damage = damage;
                            }
                        }

                        battle_counter += 1;
                    }

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

                    beast_attacked = true;

                    // emit battle event
                    event_dispatcher
                        .emit_battle_event(
                            beast_owner,
                            attacking_beast_token_id,
                            attacking_beast.fixed.id,
                            attacking_beast.fixed.shiny,
                            attacking_beast.fixed.animated,
                            summit_beast_token_id,
                            attack_count,
                            attack_damage,
                            critical_attack_count,
                            critical_attack_damage,
                            counter_attack_count,
                            counter_attack_damage,
                            critical_counter_attack_count,
                            critical_counter_attack_damage,
                            attack_potions,
                            xp_gained,
                        );

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
                        // Timestamp in showdown, otherwise block number
                        let current_block = get_block_number();
                        if (current_block >= self.terminal_block.read()) {
                            self.showdown_taken_at.write(current_time);
                        } else {
                            self.summit_history.entry(attacking_beast_token_id).write(current_block);
                        }

                        // set the new summit beast
                        self.summit_beast_token_id.write(attacking_beast_token_id);

                        // Apply extra life potions
                        if extra_life_potions > 0 {
                            attacking_beast.live.extra_lives = extra_life_potions;
                            self
                                .extra_life_potion_dispatcher
                                .read()
                                .burn_from(get_caller_address(), extra_life_potions.into() * TOKEN_DECIMALS);
                        }

                        // update the live stats of the attacking beast
                        self._save_beast(attacking_beast, true);

                        // remove poison count
                        self.poison_count.write(0);

                        // emit summit event
                        event_dispatcher.emit_summit_event(attacking_beast.fixed, attacking_beast.live, beast_owner);

                        break;
                    }
                    attack_counter += 1;
                }
                if (defending_beast.live.current_health == 0) {
                    break;
                }
                i += 1;
            }

            assert(beast_attacked, 'No beast attacked');

            // update the live stats of the defending beast after all attacks
            self._save_beast(defending_beast, true);

            let revival_potions_used = revival_potions - remaining_revival_potions;
            if revival_potions_used > 0 {
                self
                    .revive_potion_dispatcher
                    .read()
                    .burn_from(get_caller_address(), revival_potions_used.into() * TOKEN_DECIMALS);
            }

            if total_attack_potions > 0 {
                self
                    .attack_potion_dispatcher
                    .read()
                    .burn_from(get_caller_address(), total_attack_potions.into() * TOKEN_DECIMALS);
            }
        }

        /// @notice this function is used to process a beast attacking another beast
        /// @param attacker_combat_spec precomputed combat spec for the attacker
        /// @param defender_combat_spec precomputed combat spec for the defender
        /// @param defender a ref to the beast that is defending
        /// @param attack_potions number of attack potions to use
        /// @param critical_hit_rnd random number for critical hit calculation
        /// @param critical_hit_chance precomputed critical hit chance for the attacker
        /// @param vrf whether VRF is being used
        /// @return a tuple containing the combat result and a bool indicating if the defender died
        /// @dev this function only mutates the defender
        fn _attack(
            ref self: ContractState,
            attacker_combat_spec: CombatSpec,
            defender_combat_spec: CombatSpec,
            ref defender: Beast,
            attack_potions: u8,
            critical_hit_rnd: u8,
            critical_hit_chance: u8,
            vrf: bool,
        ) -> (u16, bool) {
            let minimum_damage = MINIMUM_DAMAGE;

            let attacker_strength = attack_potions;
            let defender_strength = 0;

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

        fn _is_killed_recently_in_death_mountain(self: @ContractState, beast: Beast) -> bool {
            let last_killed_timestamp = Self::_get_last_killed_timestamp(self, beast);
            last_killed_timestamp > get_block_timestamp() - DAY_SECONDS
        }

        /// @notice this function is used to apply revival potions if needed
        /// @param live_beast_stats the stats of the beast to check
        fn _revival_potions_required(self: @ContractState, beast: Beast) -> u32 {
            let last_death_timestamp = beast.live.last_death_timestamp;
            let current_time = get_block_timestamp();
            let time_since_death = current_time - last_death_timestamp;

            let mut revival_time = BASE_REVIVAL_TIME_SECONDS;
            let mut potions_required = 0;

            if time_since_death < revival_time {
                // spirit reduction
                revival_time -= beast.spirit_reduction();

                if time_since_death < revival_time {
                    potions_required = beast.live.revival_count.into() + 1;
                }
            }

            potions_required
        }

        fn _get_last_killed_timestamp(self: @ContractState, beast: Beast) -> u64 {
            let beast_hash = ImplBeast::get_beast_hash(beast.fixed.id, beast.fixed.prefix, beast.fixed.suffix);
            let beast_data_dispatcher = self.beast_data_dispatcher.read();

            let num_deaths = beast_data_dispatcher.get_collectable_count(self.dungeon_address.read(), beast_hash);
            let collectable_entity = beast_data_dispatcher
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

        fn _is_beast_stronger(beast1: Beast, beast2: Beast) -> bool {
            if beast1.live.blocks_held == beast2.live.blocks_held {
                if beast1.live.bonus_xp == beast2.live.bonus_xp {
                    return beast1.live.last_death_timestamp > beast2.live.last_death_timestamp;
                }

                return beast1.live.bonus_xp > beast2.live.bonus_xp;
            }

            beast1.live.blocks_held > beast2.live.blocks_held
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
            let rnd1_u64 = felt_to_u32(poseidon);
            u32_to_u8s(rnd1_u64)
        }

        fn get_potion_amount(id: u8) -> u8 {
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
            }

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
            }

            (bonus / 250).try_into().unwrap()
        }

        fn _reward_beast(
            ref self: ContractState, beast_token_id: u32, beast_owner: ContractAddress, reward_amount: u128,
        ) {
            // self.reward_dispatcher.read().transfer(beast_owner, reward_amount);

            let reward_amount_u32: u32 = (reward_amount / 100_000_000_000_000).try_into().unwrap();
            self.summit_events_dispatcher.read().emit_reward_event(beast_token_id, beast_owner, reward_amount_u32);
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
