use starknet::ContractAddress;

#[starknet::interface]
trait ConsumableERC20<TState> {
    fn burn(ref self: TState, account: ContractAddress, amount: u256);
    fn claim_starter_kit(ref self: TState, beast_token_id: u32);
}

#[starknet::interface]
trait RewardERC20<TState> {
    fn mint(ref self: TState, recipient: ContractAddress, amount: u256);
}
