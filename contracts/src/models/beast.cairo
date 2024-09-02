use super::consumable::Consumable;

#[derive(Copy, Drop, Serde)]
pub struct Beast {
    pub id: u32,
    pub details: BeastDetails,
    pub stats: BeastStats
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct BeastStats {
    #[key]
    pub id: u32,
    pub health: u16,
    pub dead_at: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct BeastDetails {
    #[key]
    pub id: u32,
    pub _type: Type,
    pub tier: Tier,
    pub level: u16,
    pub starting_health: u16
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum Type {
    None,
    Magic_or_Cloth,
    Blade_or_Hide,
    Bludgeon_or_Metal,
    Necklace,
    Ring,
}

impl TypeIntoFelt252 of Into<Type, felt252> {
    fn into(self: Type) -> felt252 {
        match self {
            Type::None => 0,
            Type::Magic_or_Cloth => 1,
            Type::Blade_or_Hide => 2,
            Type::Bludgeon_or_Metal => 3,
            Type::Necklace => 4,
            Type::Ring => 5,
        }
    }
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum Tier {
    None,
    T1,
    T2,
    T3,
    T4,
    T5,
}

impl TierIntoFelt252 of Into<Tier, felt252> {
    fn into(self: Tier) -> felt252 {
        match self {
            Tier::None => 0,
            Tier::T1 => 1,
            Tier::T2 => 2,
            Tier::T3 => 3,
            Tier::T4 => 4,
            Tier::T5 => 5,
        }
    }
}

impl U8IntoTier of Into<u8, Tier> {
    fn into(self: u8) -> Tier {
        if self == 0 {
            Tier::None
        } else if self == 1 {
            Tier::T1
        } else if self == 2 {
            Tier::T2
        } else if self == 3 {
            Tier::T3
        } else if self == 4 {
            Tier::T4
        } else if self == 5 {
            Tier::T5
        } else {
            panic_with_felt252('Invalid tier')
        }
    }
}
impl U8IntoType of Into<u8, Type> {
    fn into(self: u8) -> Type {
        if self == 0 {
            Type::None
        } else if self == 1 {
            Type::Magic_or_Cloth
        } else if self == 2 {
            Type::Blade_or_Hide
        } else if self == 3 {
            Type::Bludgeon_or_Metal
        } else {
            panic_with_felt252('Invalid type')
        }
    }
}
