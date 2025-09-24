use starknet::ContractAddress;

#[starknet::interface]
pub trait ConsumableERC20<TContractState> {
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256);
    fn burn_from(ref self: TContractState, from: ContractAddress, amount: u256);
    fn claim_starter_kit(ref self: TContractState, beast_token_ids: Array<u32>);
    fn claim_starter_kits_for_owner(ref self: TContractState, owner: ContractAddress, beast_token_ids: Array<u32>);
    fn claimed_starter_kit(self: @TContractState, beast_token_id: u32) -> bool;
}

#[starknet::interface]
pub trait RewardERC20<TState> {
    fn mint(ref self: TState, recipient: ContractAddress, amount: u256);
}
