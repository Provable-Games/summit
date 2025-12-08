use starknet::ContractAddress;
use summit::models::beast::{LiveBeastStats};
use summit::models::summit::{BeastEvent};

#[starknet::interface]
trait ISummitEvents<T> {
    fn emit_beast_event(ref self: T, live_stats: LiveBeastStats);
    fn emit_battle_event(
        ref self: T,
        attacking_beast_owner: ContractAddress,
        attacking_beast_token_id: u32,
        attacking_beast_id: u8,
        shiny: u8,
        animated: u8,
        defending_beast_token_id: u32,
        attack_count: u16,
        attack_damage: u16,
        critical_attack_count: u16,
        critical_attack_damage: u16,
        counter_attack_count: u16,
        counter_attack_damage: u16,
        critical_counter_attack_count: u16,
        critical_counter_attack_damage: u16,
        attack_potions: u8,
        xp_gained: u8,
    );
    fn emit_reward_event(ref self: T, beast_token_id: u32, owner: ContractAddress, amount: u32);
    fn emit_poison_event(ref self: T, beast_token_id: u32, count: u16, player: ContractAddress);
    fn emit_diplomacy_event(ref self: T, specials_hash: felt252, beast_token_ids: Span<u32>, total_power: u16);
    fn emit_summit_event(ref self: T, beast: BeastEvent, live_stats: LiveBeastStats, owner: ContractAddress);
    fn emit_corpse_event(ref self: T, adventurer_id: u64, player: ContractAddress);
    fn emit_skull_event(ref self: T, beast_token_id: u32, skulls: u64);

    fn get_summit_address(self: @T) -> ContractAddress;
    fn get_corpse_address(self: @T) -> ContractAddress;
    fn get_skull_address(self: @T) -> ContractAddress;

    fn set_corpse_address(ref self: T, corpse_address: ContractAddress);
    fn set_skull_address(ref self: T, skull_address: ContractAddress);
    fn set_summit_address(ref self: T, summit_address: ContractAddress);
}

#[dojo::contract]
pub mod summit_events {
    use dojo::event::EventStorage;
    use dojo::world::WorldStorage;
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use summit::constants::DEFAULT_NS;
    use summit::models::beast::{LiveBeastStats};
    use summit::models::summit::{
        BattleEvent, BeastEvent, CorpseEvent, DiplomacyEvent, LiveBeastStatsEvent, PoisonEvent, RewardEvent, SkullEvent,
        SummitEvent,
    };

    #[storage]
    struct Storage {
        summit_address: ContractAddress,
        corpse_address: ContractAddress,
        skull_address: ContractAddress,
    }

    fn dojo_init(
        ref self: ContractState,
        summit_address: ContractAddress,
        corpse_address: ContractAddress,
        skull_address: ContractAddress,
    ) {
        self.summit_address.write(summit_address);
        self.corpse_address.write(corpse_address);
        self.skull_address.write(skull_address);
    }

    #[abi(embed_v0)]
    impl SummitEventsImpl of super::ISummitEvents<ContractState> {
        fn emit_beast_event(ref self: ContractState, live_stats: LiveBeastStats) {
            self.validate_caller_is_summit();
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world.emit_event(@LiveBeastStatsEvent { token_id: live_stats.token_id, live_stats: live_stats });
        }

        fn emit_battle_event(
            ref self: ContractState,
            attacking_beast_owner: ContractAddress,
            attacking_beast_token_id: u32,
            attacking_beast_id: u8,
            shiny: u8,
            animated: u8,
            defending_beast_token_id: u32,
            attack_count: u16,
            attack_damage: u16,
            critical_attack_count: u16,
            critical_attack_damage: u16,
            counter_attack_count: u16,
            counter_attack_damage: u16,
            critical_counter_attack_count: u16,
            critical_counter_attack_damage: u16,
            attack_potions: u8,
            xp_gained: u8,
        ) {
            self.validate_caller_is_summit();
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world
                .emit_event(
                    @BattleEvent {
                        attacking_beast_owner,
                        attacking_beast_token_id,
                        attacking_beast_id,
                        shiny,
                        animated,
                        defending_beast_token_id,
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
                    },
                );
        }

        fn emit_reward_event(ref self: ContractState, beast_token_id: u32, owner: ContractAddress, amount: u32) {
            self.validate_caller_is_summit();
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world
                .emit_event(@RewardEvent { block_number: starknet::get_block_number(), beast_token_id, owner, amount });
        }

        fn emit_poison_event(ref self: ContractState, beast_token_id: u32, count: u16, player: ContractAddress) {
            self.validate_caller_is_summit();
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world
                .emit_event(
                    @PoisonEvent { beast_token_id, block_timestamp: starknet::get_block_timestamp(), count, player },
                );
        }

        fn emit_diplomacy_event(
            ref self: ContractState, specials_hash: felt252, beast_token_ids: Span<u32>, total_power: u16,
        ) {
            self.validate_caller_is_summit();
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world.emit_event(@DiplomacyEvent { specials_hash, beast_token_ids, total_power });
        }

        fn emit_summit_event(
            ref self: ContractState, beast: BeastEvent, live_stats: LiveBeastStats, owner: ContractAddress,
        ) {
            self.validate_caller_is_summit();
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world.emit_event(@SummitEvent { taken_at: starknet::get_block_number(), beast, live_stats, owner });
        }

        fn emit_corpse_event(ref self: ContractState, adventurer_id: u64, player: ContractAddress) {
            let corpse_address = self.corpse_address.read();
            assert(corpse_address == starknet::get_caller_address(), 'Invalid caller');
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world.emit_event(@CorpseEvent { adventurer_id, player });
        }

        fn emit_skull_event(ref self: ContractState, beast_token_id: u32, skulls: u64) {
            let skull_address = self.skull_address.read();
            assert(skull_address == starknet::get_caller_address(), 'Invalid caller');
            let mut world: WorldStorage = self.world(@DEFAULT_NS());
            world.emit_event(@SkullEvent { beast_token_id, skulls });
        }

        fn set_corpse_address(ref self: ContractState, corpse_address: ContractAddress) {
            self.corpse_address.write(corpse_address);
        }

        fn set_skull_address(ref self: ContractState, skull_address: ContractAddress) {
            self.skull_address.write(skull_address);
        }

        fn set_summit_address(ref self: ContractState, summit_address: ContractAddress) {
            self.summit_address.write(summit_address);
        }

        fn get_summit_address(self: @ContractState) -> ContractAddress {
            self.summit_address.read()
        }

        fn get_corpse_address(self: @ContractState) -> ContractAddress {
            self.corpse_address.read()
        }

        fn get_skull_address(self: @ContractState) -> ContractAddress {
            self.skull_address.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn validate_caller_is_summit(ref self: ContractState) {
            let summit_address = self.summit_address.read();
            assert(summit_address == starknet::get_caller_address(), 'Invalid caller');
        }
    }
}
