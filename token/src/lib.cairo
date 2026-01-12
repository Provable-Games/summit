use starknet::ContractAddress;

#[starknet::interface]
pub trait IConsumableERC20<TContractState> {
    fn burn(ref self: TContractState, amount: u256);
    fn burn_from(ref self: TContractState, from: ContractAddress, amount: u256);

    fn is_terminal(self: @TContractState) -> bool;
    fn get_terminal_timestamp(self: @TContractState) -> u64;
}


#[starknet::contract]
mod ConsumableERC20 {
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::{DefaultConfig, ERC20Component};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_block_timestamp};
    use super::IConsumableERC20;

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // ERC20
    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        terminal_timestamp: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        name: ByteArray,
        symbol: ByteArray,
        summit_address: ContractAddress,
        terminal_timestamp: u64,
    ) {
        self.ownable.initializer(owner);
        self.erc20.initializer(name, symbol);
        self.terminal_timestamp.write(terminal_timestamp);
        self.erc20.mint(summit_address, 1_000_000_000_000_000_000_000_000);
    }

    #[abi(embed_v0)]
    impl ConsumableERC20Impl of IConsumableERC20<ContractState> {
        fn burn(ref self: ContractState, amount: u256) {
            let caller = starknet::get_caller_address();
            self.erc20.burn(caller, amount);
        }

        fn burn_from(ref self: ContractState, from: ContractAddress, amount: u256) {
            let caller = starknet::get_caller_address();
            self.erc20._spend_allowance(from, caller, amount);
            self.erc20.burn(from, amount);
        }

        fn is_terminal(self: @ContractState) -> bool {
            let current_timestamp = get_block_timestamp();
            current_timestamp >= self.terminal_timestamp.read()
        }

        fn get_terminal_timestamp(self: @ContractState) -> u64 {
            self.terminal_timestamp.read()
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn assert_not_terminal(self: @ContractState) {
            let current_timestamp = get_block_timestamp();
            let terminal_timestamp = self.terminal_timestamp.read();
            assert(current_timestamp < terminal_timestamp, 'Contract is terminal');
        }
    }

    impl ERC20Hooks of ERC20Component::ERC20HooksTrait<ContractState> {
        fn before_update(
            ref self: ERC20Component::ComponentState<ContractState>,
            from: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) {
            let contract = self.get_contract();
            InternalFunctions::assert_not_terminal(contract);
        }
    }
}
