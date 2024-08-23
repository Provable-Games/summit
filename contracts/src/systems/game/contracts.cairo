#[dojo::interface]
trait IGameContract {
    fn attack(ref world: IWorldDispatcher, beast_id: u32);
    fn consumable(ref world: IWorldDispatcher, beast_id: u32);
}

#[dojo::contract]
mod game_systems {
    use savage_summit::models::game::{Summit, Beast, Consumable};

    #[abi(embed_v0)]
    impl GameContractImpl of super::IGameContract<ContractState> {
        fn attack(ref world: IWorldDispatcher, beast_id: u32) {
            let summit = get!(world, (1)
        }

        fn consumable(ref world: IWorldDispatcher, beast_id: u32) {
        }
    }
}