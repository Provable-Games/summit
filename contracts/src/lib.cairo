pub mod constants;
pub mod models {
    pub mod beast;
    pub mod events;
}
pub mod systems {
    pub mod summit;
}
pub mod logic {
    pub mod beast_utils;
    pub mod combat;
    pub mod poison;
    pub mod revival;
    pub mod rewards;
}
pub mod erc20 {
    pub mod interface;
}
mod interfaces;
pub mod utils;
mod vrf;
