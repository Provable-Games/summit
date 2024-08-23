use loot_survivor::combat::constants::CombatEnums::{Tier, Type, Slot}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Summit {
    #[key]
    pub id: u8,
    pub beast_id: u32,
}

pub struct SummitHistory {
    #[key]
    pub id: u32,
    #[key]
    pub taken_at: u64,
    pub lost_at: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Beast {
    #[key]
    pub id: u32,
    pub health: u16,
    pub dead_at: u64
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Consumable {
    #[key]
    pub id: u8,
    pub amount: u8,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ConsumableDetails {
    #[key]
    pub id: u8,
    pub name: felt252,
    pub _type: ConsumableType
}

pub struct BeastDetails {
    #[key]
    pub id: u32,
    pub _type: Type,
    pub tier: Tier,
    pub level: u16,
    pub starting_health: u16
}

pub enum ConsumableType {
    Health: u16,
    Attack: u16,
    Armor: u16,
    Revive: u32
}