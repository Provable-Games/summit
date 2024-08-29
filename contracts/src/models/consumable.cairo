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
    Health,
    Attack,
    Armor,
    Revive
}

impl ConsumableTypeIntoFelt252 of Into<ConsumableType, felt252> {
    fn into(self: ConsumableType) -> felt252 {
        match self {
            ConsumableType::Health => 0,
            ConsumableType::Attack => 1,
            ConsumableType::Armor => 2,
            ConsumableType::Revive => 3,
        }
    }
}
