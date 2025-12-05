use starknet::ContractAddress;

#[starknet::interface]
pub trait ISummitERC20<TContractState> {
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn burn_from(ref self: TContractState, from: ContractAddress, amount: u256);
    fn set_summit(ref self: TContractState, address: ContractAddress);
    fn is_terminal(self: @TContractState) -> bool;
    fn get_terminal_timestamp(self: @TContractState) -> u64;
}

#[starknet::contract]
mod SummitERC20 {
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::ERC20Component;
    use openzeppelin_token::erc20::ERC20Component::ComponentState;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // ERC20 Mixin
    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        summit_address: ContractAddress,
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
        terminal_timestamp: u64,
        summit_address: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        self.erc20.initializer(name, symbol);
        self.terminal_timestamp.write(terminal_timestamp);
        self.summit_address.write(summit_address);
    }

    #[abi(embed_v0)]
    impl SummitERC20Impl of super::ISummitERC20<ContractState> {
        fn burn_from(ref self: ContractState, from: ContractAddress, amount: u256) {
            self.erc20.burn(from, amount);
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            assert(get_caller_address() == self.summit_address.read(), 'Not summit contract');
            self.erc20.mint(recipient, amount);
        }

        fn set_summit(ref self: ContractState, address: ContractAddress) {
            self.ownable.assert_only_owner();
            self.summit_address.write(address);
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
            ref self: ComponentState<ContractState>, from: ContractAddress, recipient: ContractAddress, amount: u256,
        ) {
            let contract = self.get_contract();
            InternalFunctions::assert_not_terminal(contract);
        }

        fn after_update(
            ref self: ComponentState<ContractState>, from: ContractAddress, recipient: ContractAddress, amount: u256,
        ) { // Your code here (if needed)
        }
    }
}
