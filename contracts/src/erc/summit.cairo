use starknet::ContractAddress;

#[starknet::interface]
trait SummitERC20<TState> {
    fn mint(ref self: TState, recipient: ContractAddress, amount: u256);
    fn burn(ref self: TState, account: ContractAddress, amount: u256);
    fn claim_starter_kit(ref self: TState, beast_token_id: u32);
}
