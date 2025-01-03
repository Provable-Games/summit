use starknet::ContractAddress;

// TODO: Check out universal deployer account UDC
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Consumable {
    #[key]
    pub consumable: ConsumableType,
    pub address: ContractAddress,
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum ConsumableType {
    Revive,
    Attack,
    ExtraLife,
}
