use starknet::ContractAddress;

#[starknet::interface]
pub trait ConsumableERC20<TContractState> {
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn burn(ref self: TContractState, amount: u256);
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
}
