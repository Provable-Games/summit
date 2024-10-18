#[derive(Copy, Drop, Serde, Introspect)]
pub struct Consumable {
    #[key]
    pub id: u8,
    pub amount: u8,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ConsumableDetails {
    #[key]
    pub id: u32,
    pub name: felt252,
    pub effect: ConsumableType,
    pub amount: u16
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum ConsumableType {
    Revive,
    Attack,
    ExtraLife,
}
