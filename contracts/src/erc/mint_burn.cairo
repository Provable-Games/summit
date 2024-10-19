use starknet::ContractAddress;

#[starknet::interface]
trait MintBurn<TState> {
    fn mint(ref self: TState, recipient: ContractAddress, amount: u256);
    fn burn(ref self: TState, account: ContractAddress, amount: u256);
}
