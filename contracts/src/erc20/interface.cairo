use starknet::ContractAddress;

#[starknet::interface]
pub trait SummitERC20<TContractState> {
    fn burn_from(ref self: TContractState, from: ContractAddress, amount: u256);
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
}
