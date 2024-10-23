use starknet::ContractAddress;

#[starknet::interface]
trait ConsumableERC20<TContractState> {
    fn burn(ref self: TContractState, account: ContractAddress, amount: u256);
    fn claim_starter_kit(ref self: TContractState, beast_token_ids: Array<u32>);
    fn claim_starter_kits_for_owner(ref self: TContractState, owner: ContractAddress, beast_token_ids: Array<u32>);
    fn claimed_starter_kit(self: @TContractState, beast_token_id: u32) -> bool;
}

#[starknet::interface]
trait RewardERC20<TState> {
    fn mint(ref self: TState, recipient: ContractAddress, amount: u256);
}
