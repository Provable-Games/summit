use starknet::ContractAddress;

#[starknet::interface]
trait MintBurn<TState> {
    fn mint(ref self: TState, recipient: ContractAddress, amount: u128);
    fn burn(ref self: TState, account: ContractAddress, amount: u128);
}