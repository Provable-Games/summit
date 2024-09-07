use savage_summit::models::beast_details::BeastDetails;
use savage_summit::models::beast_stats::{StaticBeastStats};

#[dojo::interface]
trait IBeastUtils {
    fn get_details(self: @ContractState, beast_id: u32) -> BeastDetails;
    fn get_stats(self: @ContractState, beast_id: u32) -> StaticBeastStats;
}

#[dojo::contract]
pub mod beast_utils {
    use savage_summit::utils::{BEAST_ADDRESS_MAINNET};
    use savage_summit::models::beast::Beast;
    use beasts::interfaces::{IBeasts, IBeastsDispatcher, IBeastsDispatcherTrait};
    use beasts::pack::PackableBeast;

    #[abi(embed_v0)]
    impl BeastUtilsImpl of super::IBeastUtils<ContractState> {
        fn get_beast_details(self: @ContractState, beast_id: u32) -> BeastDetails {
            ImplBeastDetails::get_beast_details(beast_id)
        }
        fn get_beast_stats(self: @ContractState, beast_id: u32) -> StaticBeastStats {
            let beast_address = BEAST_ADDRESS_MAINNET();
            let beasts_dispatcher = IBeastsDispatcher { contract_address: beast_address };
            let beast = beasts_dispatcher.getBeast(beast_id.into());
            StaticBeastStats {
                id: beast_id,
                special_1: beast.prefix,
                special_2: beast.suffix,
                level: beast.level,
                health: beast.health,
            }
        }
    }
}
