use starknet::ContractAddress;

#[starknet::interface]
pub trait ISavageERC20<TContractState> {
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn is_terminal(self: @TContractState) -> bool;
    fn get_terminal_timestamp(self: @TContractState) -> u64;
}

#[starknet::contract]
mod SavageERC20 {
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::ERC20Component::ComponentState;
    use openzeppelin_token::erc20::{ERC20Component};
    use starknet::{ContractAddress, get_block_timestamp};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    // Ownable Mixin
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // ERC20 Mixin
    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        terminal_timestamp: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        ERC20Event: ERC20Component::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: ByteArray,
        symbol: ByteArray,
        summit_address: ContractAddress,
        terminal_timestamp: u64
    ) {
        self.erc20.initializer(name, symbol);
        self.ownable.initializer(summit_address);
        self.terminal_timestamp.write(terminal_timestamp);
    }

    #[external(v0)]
    fn mint(
        ref self: ContractState,
        recipient: ContractAddress,
        amount: u256
    ) {
        self.ownable.assert_only_owner();
        self.erc20.mint(recipient, amount);
    }

    fn is_terminal(self: @ContractState) -> bool {
        let current_timestamp = get_block_timestamp();
        current_timestamp >= self.terminal_timestamp.read()
    }

    fn get_terminal_timestamp(self: @ContractState) -> u64 {
        self.terminal_timestamp.read()
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
            ref self: ComponentState<ContractState>,
            from: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) {
            let contract = self.get_contract();
            InternalFunctions::assert_not_terminal(contract);
        }

        fn after_update(
            ref self: ComponentState<ContractState>,
            from: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) {// Your code here (if needed)
        }
    }
}
