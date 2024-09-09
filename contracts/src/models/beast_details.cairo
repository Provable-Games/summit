use combat::constants::CombatEnums::{Type, Tier};
use combat::combat::ImplCombat;

#[derive(Copy, Drop, Introspect, Serde)]
#[dojo::event]
#[dojo::model]
pub struct BeastDetails {
    #[key]
    pub name: felt252,
    pub elemental: Type,
    pub tier: Tier,
}

#[generate_trait]
impl ImplBeastDetails of IBeastDetails {
    fn get_beast_details(id: u8) -> BeastDetails {
        // TODO: Create constants or reuse constants from beasts contract
        if id == 1 {
            GET_WARLOCK()
        } else if id == 2 {
            GET_TYPHON()
        } else if id == 3 {
            GET_JIANGSHI()
        } else if id == 4 {
            GET_ANANSI()
        } else if id == 5 {
            GET_BASILISK()
        } else if id == 6 {
            GET_GORGON()
        } else if id == 7 {
            GET_KITSUNE()
        } else if id == 8 {
            GET_LICH()
        } else if id == 9 {
            GET_CHIMERA()
        } else if id == 10 {
            GET_WENDIGO()
        } else if id == 11 {
            GET_RAKSHASA()
        } else if id == 12 {
            GET_WEREWOLF()
        } else if id == 13 {
            GET_BANSHEE()
        } else if id == 14 {
            GET_DRAUGR()
        } else if id == 15 {
            GET_VAMPIRE()
        } else if id == 16 {
            GET_GOBLIN()
        } else if id == 17 {
            GET_GHOUL()
        } else if id == 18 {
            GET_WRAITH()
        } else if id == 19 {
            GET_SPRITE()
        } else if id == 20 {
            GET_KAPPA()
        } else if id == 21 {
            GET_FAIRY()
        } else if id == 22 {
            GET_LEPRECHAUN()
        } else if id == 23 {
            GET_KELPIE()
        } else if id == 24 {
            GET_PIXIE()
        } else if id == 25 {
            GET_GNOME()
        } else if id == 26 {
            GET_GRIFFIN()
        } else if id == 27 {
            GET_MANTICORE()
        } else if id == 28 {
            GET_PHOENIX()
        } else if id == 29 {
            GET_DRAGON()
        } else if id == 30 {
            GET_MINOTAUR()
        } else if id == 31 {
            GET_QILIN()
        } else if id == 32 {
            GET_AMMIT()
        } else if id == 33 {
            GET_NUE()
        } else if id == 34 {
            GET_SKINWALKER()
        } else if id == 35 {
            GET_CHUPACABRA()
        } else if id == 36 {
            GET_WERETIGER()
        } else if id == 37 {
            GET_WYVERN()
        } else if id == 38 {
            GET_ROC()
        } else if id == 39 {
            GET_HARPY()
        } else if id == 40 {
            GET_PEGASUS()
        } else if id == 41 {
            GET_HIPPOGRIFF()
        } else if id == 42 {
            GET_FENRIR()
        } else if id == 43 {
            GET_JAGUAR()
        } else if id == 44 {
            GET_SATORI()
        } else if id == 45 {
            GET_DIREWOLF()
        } else if id == 46 {
            GET_BEAR()
        } else if id == 47 {
            GET_WOLF()
        } else if id == 48 {
            GET_MANTIS()
        } else if id == 49 {
            GET_SPIDER()
        } else if id == 50 {
            GET_RAT()
        } else if id == 51 {
            GET_KRAKEN()
        } else if id == 52 {
            GET_COLOSSUS()
        } else if id == 53 {
            GET_BALROG()
        } else if id == 54 {
            GET_LEVIATHAN()
        } else if id == 55 {
            GET_TARRASQUE()
        } else if id == 56 {
            GET_TITAN()
        } else if id == 57 {
            GET_NEPHILIM()
        } else if id == 58 {
            GET_BEHEMOTH()
        } else if id == 59 {
            GET_HYDRA()
        } else if id == 60 {
            GET_JUGGERNAUT()
        } else if id == 61 {
            GET_ONI()
        } else if id == 62 {
            GET_JOTUNN()
        } else if id == 63 {
            GET_ETTIN()
        } else if id == 64 {
            GET_CYCLOPS()
        } else if id == 65 {
            GET_GIANT()
        } else if id == 66 {
            GET_NEMEANLION()
        } else if id == 67 {
            GET_BERSERKER()
        } else if id == 68 {
            GET_YETI()
        } else if id == 69 {
            GET_GOLEM()
        } else if id == 70 {
            GET_ENT()
        } else if id == 71 {
            GET_TROLL()
        } else if id == 72 {
            GET_BIGFOOT()
        } else if id == 73 {
            GET_OGRE()
        } else if id == 74 {
            GET_ORC()
        } else if id == 75 {
            GET_SKELETON()
        } else {
            panic!("Beast ID out of range")
        }
    }
}


impl TypeIntoU8 of Into<Type, u8> {
    fn into(self: Type) -> u8 {
        ImplCombat::type_to_u8(self)
    }
}

impl TierIntoU8 of Into<Tier, u8> {
    fn into(self: Tier) -> u8 {
        ImplCombat::tier_to_u8(self)
    }
}

impl U8IntoTier of Into<u8, Tier> {
    fn into(self: u8) -> Tier {
        ImplCombat::u8_to_tier(self)
    }
}
impl U8IntoType of Into<u8, Type> {
    fn into(self: u8) -> Type {
        ImplCombat::u8_to_type(self)
    }
}


fn GET_WARLOCK() -> BeastDetails {
    BeastDetails { name: 'Warlock', elemental: Type::Magic_or_Cloth, tier: Tier::T1, }
}

fn GET_TYPHON() -> BeastDetails {
    BeastDetails { name: 'Typhon', elemental: Type::Magic_or_Cloth, tier: Tier::T1, }
}

fn GET_JIANGSHI() -> BeastDetails {
    BeastDetails { name: 'Jiangshi', elemental: Type::Magic_or_Cloth, tier: Tier::T1, }
}

fn GET_ANANSI() -> BeastDetails {
    BeastDetails { name: 'Anansi', elemental: Type::Magic_or_Cloth, tier: Tier::T1, }
}

fn GET_BASILISK() -> BeastDetails {
    BeastDetails { name: 'Basilisk', elemental: Type::Magic_or_Cloth, tier: Tier::T1, }
}

fn GET_GORGON() -> BeastDetails {
    BeastDetails { name: 'Gorgon', elemental: Type::Magic_or_Cloth, tier: Tier::T2, }
}

fn GET_KITSUNE() -> BeastDetails {
    BeastDetails { name: 'Kitsune', elemental: Type::Magic_or_Cloth, tier: Tier::T2, }
}

fn GET_LICH() -> BeastDetails {
    BeastDetails { name: 'Lich', elemental: Type::Magic_or_Cloth, tier: Tier::T2, }
}

fn GET_CHIMERA() -> BeastDetails {
    BeastDetails { name: 'Chimera', elemental: Type::Magic_or_Cloth, tier: Tier::T2, }
}

fn GET_WENDIGO() -> BeastDetails {
    BeastDetails { name: 'Wendigo', elemental: Type::Magic_or_Cloth, tier: Tier::T2, }
}

fn GET_RAKSHASA() -> BeastDetails {
    BeastDetails { name: 'Rakshasa', elemental: Type::Magic_or_Cloth, tier: Tier::T3, }
}

fn GET_WEREWOLF() -> BeastDetails {
    BeastDetails { name: 'Werewolf', elemental: Type::Magic_or_Cloth, tier: Tier::T3, }
}

fn GET_BANSHEE() -> BeastDetails {
    BeastDetails { name: 'Banshee', elemental: Type::Magic_or_Cloth, tier: Tier::T3, }
}

fn GET_DRAUGR() -> BeastDetails {
    BeastDetails { name: 'Draugr', elemental: Type::Magic_or_Cloth, tier: Tier::T3, }
}

fn GET_VAMPIRE() -> BeastDetails {
    BeastDetails { name: 'Vampire', elemental: Type::Magic_or_Cloth, tier: Tier::T3, }
}

fn GET_GOBLIN() -> BeastDetails {
    BeastDetails { name: 'Goblin', elemental: Type::Magic_or_Cloth, tier: Tier::T4, }
}

fn GET_GHOUL() -> BeastDetails {
    BeastDetails { name: 'Ghoul', elemental: Type::Magic_or_Cloth, tier: Tier::T4, }
}

fn GET_WRAITH() -> BeastDetails {
    BeastDetails { name: 'Wraith', elemental: Type::Magic_or_Cloth, tier: Tier::T4, }
}

fn GET_SPRITE() -> BeastDetails {
    BeastDetails { name: 'Sprite', elemental: Type::Magic_or_Cloth, tier: Tier::T4, }
}

fn GET_KAPPA() -> BeastDetails {
    BeastDetails { name: 'Kappa', elemental: Type::Magic_or_Cloth, tier: Tier::T4, }
}

fn GET_FAIRY() -> BeastDetails {
    BeastDetails { name: 'Fairy', elemental: Type::Magic_or_Cloth, tier: Tier::T5, }
}

fn GET_LEPRECHAUN() -> BeastDetails {
    BeastDetails { name: 'Leprechaun', elemental: Type::Magic_or_Cloth, tier: Tier::T5, }
}

fn GET_KELPIE() -> BeastDetails {
    BeastDetails { name: 'Kelpie', elemental: Type::Magic_or_Cloth, tier: Tier::T5, }
}

fn GET_PIXIE() -> BeastDetails {
    BeastDetails { name: 'Pixie', elemental: Type::Magic_or_Cloth, tier: Tier::T5, }
}

fn GET_GNOME() -> BeastDetails {
    BeastDetails { name: 'Gnome', elemental: Type::Magic_or_Cloth, tier: Tier::T5, }
}

fn GET_GRIFFIN() -> BeastDetails {
    BeastDetails { name: 'Griffin', elemental: Type::Blade_or_Hide, tier: Tier::T1, }
}

fn GET_MANTICORE() -> BeastDetails {
    BeastDetails { name: 'Manticore', elemental: Type::Blade_or_Hide, tier: Tier::T1, }
}

fn GET_PHOENIX() -> BeastDetails {
    BeastDetails { name: 'Phoenix', elemental: Type::Blade_or_Hide, tier: Tier::T1, }
}

fn GET_DRAGON() -> BeastDetails {
    BeastDetails { name: 'Dragon', elemental: Type::Blade_or_Hide, tier: Tier::T1, }
}

fn GET_MINOTAUR() -> BeastDetails {
    BeastDetails { name: 'Minotaur', elemental: Type::Blade_or_Hide, tier: Tier::T1, }
}

fn GET_QILIN() -> BeastDetails {
    BeastDetails { name: 'Qilin', elemental: Type::Blade_or_Hide, tier: Tier::T2, }
}

fn GET_AMMIT() -> BeastDetails {
    BeastDetails { name: 'Ammit', elemental: Type::Blade_or_Hide, tier: Tier::T2, }
}

fn GET_NUE() -> BeastDetails {
    BeastDetails { name: 'Nue', elemental: Type::Blade_or_Hide, tier: Tier::T2, }
}

fn GET_SKINWALKER() -> BeastDetails {
    BeastDetails { name: 'Skinwalker', elemental: Type::Blade_or_Hide, tier: Tier::T2, }
}

fn GET_CHUPACABRA() -> BeastDetails {
    BeastDetails { name: 'Chupacabra', elemental: Type::Blade_or_Hide, tier: Tier::T2, }
}

fn GET_WERETIGER() -> BeastDetails {
    BeastDetails { name: 'Weretiger', elemental: Type::Blade_or_Hide, tier: Tier::T3, }
}

fn GET_WYVERN() -> BeastDetails {
    BeastDetails { name: 'Wyvern', elemental: Type::Blade_or_Hide, tier: Tier::T3, }
}

fn GET_ROC() -> BeastDetails {
    BeastDetails { name: 'Roc', elemental: Type::Blade_or_Hide, tier: Tier::T3, }
}

fn GET_HARPY() -> BeastDetails {
    BeastDetails { name: 'Harpy', elemental: Type::Blade_or_Hide, tier: Tier::T3, }
}

fn GET_PEGASUS() -> BeastDetails {
    BeastDetails { name: 'Pegasus', elemental: Type::Blade_or_Hide, tier: Tier::T3, }
}

fn GET_HIPPOGRIFF() -> BeastDetails {
    BeastDetails { name: 'Hippogriff', elemental: Type::Blade_or_Hide, tier: Tier::T4, }
}

fn GET_FENRIR() -> BeastDetails {
    BeastDetails { name: 'Fenrir', elemental: Type::Blade_or_Hide, tier: Tier::T4, }
}

fn GET_JAGUAR() -> BeastDetails {
    BeastDetails { name: 'Jaguar', elemental: Type::Blade_or_Hide, tier: Tier::T4, }
}

fn GET_SATORI() -> BeastDetails {
    BeastDetails { name: 'Satori', elemental: Type::Blade_or_Hide, tier: Tier::T4, }
}

fn GET_DIREWOLF() -> BeastDetails {
    BeastDetails { name: 'Direwolf', elemental: Type::Blade_or_Hide, tier: Tier::T4, }
}

fn GET_BEAR() -> BeastDetails {
    BeastDetails { name: 'Bear', elemental: Type::Blade_or_Hide, tier: Tier::T5, }
}

fn GET_WOLF() -> BeastDetails {
    BeastDetails { name: 'Wolf', elemental: Type::Blade_or_Hide, tier: Tier::T5, }
}

fn GET_MANTIS() -> BeastDetails {
    BeastDetails { name: 'Mantis', elemental: Type::Blade_or_Hide, tier: Tier::T5, }
}

fn GET_SPIDER() -> BeastDetails {
    BeastDetails { name: 'Spider', elemental: Type::Blade_or_Hide, tier: Tier::T5, }
}

fn GET_RAT() -> BeastDetails {
    BeastDetails { name: 'Rat', elemental: Type::Blade_or_Hide, tier: Tier::T5, }
}

fn GET_KRAKEN() -> BeastDetails {
    BeastDetails { name: 'Kraken', elemental: Type::Bludgeon_or_Metal, tier: Tier::T1, }
}

fn GET_COLOSSUS() -> BeastDetails {
    BeastDetails { name: 'Colossus', elemental: Type::Bludgeon_or_Metal, tier: Tier::T1, }
}

fn GET_BALROG() -> BeastDetails {
    BeastDetails { name: 'Balrog', elemental: Type::Bludgeon_or_Metal, tier: Tier::T1, }
}

fn GET_LEVIATHAN() -> BeastDetails {
    BeastDetails { name: 'Leviathan', elemental: Type::Bludgeon_or_Metal, tier: Tier::T1, }
}

fn GET_TARRASQUE() -> BeastDetails {
    BeastDetails { name: 'Tarrasque', elemental: Type::Bludgeon_or_Metal, tier: Tier::T1, }
}

fn GET_TITAN() -> BeastDetails {
    BeastDetails { name: 'Titan', elemental: Type::Bludgeon_or_Metal, tier: Tier::T2, }
}

fn GET_NEPHILIM() -> BeastDetails {
    BeastDetails { name: 'Nephilim', elemental: Type::Bludgeon_or_Metal, tier: Tier::T2, }
}

fn GET_BEHEMOTH() -> BeastDetails {
    BeastDetails { name: 'Behemoth', elemental: Type::Bludgeon_or_Metal, tier: Tier::T2, }
}

fn GET_HYDRA() -> BeastDetails {
    BeastDetails { name: 'Hydra', elemental: Type::Bludgeon_or_Metal, tier: Tier::T2, }
}

fn GET_JUGGERNAUT() -> BeastDetails {
    BeastDetails { name: 'Juggernaut', elemental: Type::Bludgeon_or_Metal, tier: Tier::T2, }
}

fn GET_ONI() -> BeastDetails {
    BeastDetails { name: 'Oni', elemental: Type::Bludgeon_or_Metal, tier: Tier::T3, }
}

fn GET_JOTUNN() -> BeastDetails {
    BeastDetails { name: 'Jotunn', elemental: Type::Bludgeon_or_Metal, tier: Tier::T3, }
}

fn GET_ETTIN() -> BeastDetails {
    BeastDetails { name: 'Ettin', elemental: Type::Bludgeon_or_Metal, tier: Tier::T3, }
}

fn GET_CYCLOPS() -> BeastDetails {
    BeastDetails { name: 'Cyclops', elemental: Type::Bludgeon_or_Metal, tier: Tier::T3, }
}

fn GET_GIANT() -> BeastDetails {
    BeastDetails { name: 'Giant', elemental: Type::Bludgeon_or_Metal, tier: Tier::T3, }
}

fn GET_NEMEANLION() -> BeastDetails {
    BeastDetails { name: 'NemeanLion', elemental: Type::Bludgeon_or_Metal, tier: Tier::T4, }
}

fn GET_BERSERKER() -> BeastDetails {
    BeastDetails { name: 'Berserker', elemental: Type::Bludgeon_or_Metal, tier: Tier::T4, }
}

fn GET_YETI() -> BeastDetails {
    BeastDetails { name: 'Yeti', elemental: Type::Bludgeon_or_Metal, tier: Tier::T4, }
}

fn GET_GOLEM() -> BeastDetails {
    BeastDetails { name: 'Golem', elemental: Type::Bludgeon_or_Metal, tier: Tier::T4, }
}

fn GET_ENT() -> BeastDetails {
    BeastDetails { name: 'Ent', elemental: Type::Bludgeon_or_Metal, tier: Tier::T4, }
}

fn GET_TROLL() -> BeastDetails {
    BeastDetails { name: 'Troll', elemental: Type::Bludgeon_or_Metal, tier: Tier::T5, }
}

fn GET_BIGFOOT() -> BeastDetails {
    BeastDetails { name: 'Bigfoot', elemental: Type::Bludgeon_or_Metal, tier: Tier::T5, }
}

fn GET_OGRE() -> BeastDetails {
    BeastDetails { name: 'Ogre', elemental: Type::Bludgeon_or_Metal, tier: Tier::T5, }
}

fn GET_ORC() -> BeastDetails {
    BeastDetails { name: 'Orc', elemental: Type::Bludgeon_or_Metal, tier: Tier::T5, }
}

fn GET_SKELETON() -> BeastDetails {
    BeastDetails { name: 'Skeleton', elemental: Type::Bludgeon_or_Metal, tier: Tier::T5, }
}
