use starknet::ContractAddress;

#[starknet::interface]
pub trait SummitERC20<TContractState> {
    fn transfer(ref self: TContractState, to: ContractAddress, amount: u256);
    fn burn_from(ref self: TContractState, from: ContractAddress, amount: u256);
}
