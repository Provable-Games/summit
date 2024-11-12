use arcade_trophy::types::task::{Task as ArcadeTask};
use savage_summit::elements::trophies;

// Constants

pub const TROPHY_COUNT: u8 = 19;

// Types

#[derive(Copy, Drop)]
enum Trophy {
    None,
    Challenger,
    RelentlessFighter,
    UnyieldingAttacker,
    CookingMaster,
    Keeper,
    Survivor,
    Untouchable,
    FirstSteps,
    Veteran,
    Champion,
    AlchemistI,
    AlchemistII,
    AlchemistIII,
    ApothecaryI,
    ApothecaryII,
    ApothecaryIII,
    HerbalistI,
    HerbalistII,
    HerbalistIII,
}

#[generate_trait]
impl TrophyImpl of TrophyTrait {
    #[inline]
    fn level(self: Trophy) -> u8 {
        match self {
            Trophy::None => 0,
            Trophy::Challenger => 0,
            Trophy::RelentlessFighter => 1,
            Trophy::UnyieldingAttacker => 2,
            Trophy::CookingMaster => 0,
            Trophy::Keeper => 0,
            Trophy::Survivor => 1,
            Trophy::Untouchable => 2,
            Trophy::FirstSteps => 0,
            Trophy::Veteran => 1,
            Trophy::Champion => 2,
            Trophy::AlchemistI => 0,
            Trophy::AlchemistII => 1,
            Trophy::AlchemistIII => 2,
            Trophy::ApothecaryI => 0,
            Trophy::ApothecaryII => 1,
            Trophy::ApothecaryIII => 2,
            Trophy::HerbalistI => 0,
            Trophy::HerbalistII => 1,
            Trophy::HerbalistIII => 2,
        }
    }

    #[inline]
    fn identifier(self: Trophy) -> felt252 {
        let level = self.level();
        match self {
            Trophy::None => 0,
            Trophy::Challenger => trophies::attacker::Attacker::identifier(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::identifier(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::identifier(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::identifier(level),
            Trophy::Keeper => trophies::hodler::Hodler::identifier(level),
            Trophy::Survivor => trophies::hodler::Hodler::identifier(level),
            Trophy::Untouchable => trophies::hodler::Hodler::identifier(level),
            Trophy::FirstSteps => trophies::savager::Savager::identifier(level),
            Trophy::Veteran => trophies::savager::Savager::identifier(level),
            Trophy::Champion => trophies::savager::Savager::identifier(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::identifier(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::identifier(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::identifier(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::identifier(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::identifier(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::identifier(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::identifier(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::identifier(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::identifier(level),
        }
    }

    #[inline]
    fn hidden(self: Trophy) -> bool {
        let level = self.level();
        match self {
            Trophy::None => true,
            Trophy::Challenger => trophies::attacker::Attacker::hidden(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::hidden(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::hidden(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::hidden(level),
            Trophy::Keeper => trophies::hodler::Hodler::hidden(level),
            Trophy::Survivor => trophies::hodler::Hodler::hidden(level),
            Trophy::Untouchable => trophies::hodler::Hodler::hidden(level),
            Trophy::FirstSteps => trophies::savager::Savager::hidden(level),
            Trophy::Veteran => trophies::savager::Savager::hidden(level),
            Trophy::Champion => trophies::savager::Savager::hidden(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::hidden(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::hidden(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::hidden(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::hidden(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::hidden(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::hidden(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::hidden(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::hidden(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::hidden(level),
        }
    }

    #[inline]
    fn index(self: Trophy) -> u8 {
        let level = self.level();
        match self {
            Trophy::None => 0,
            Trophy::Challenger => trophies::attacker::Attacker::index(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::index(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::index(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::index(level),
            Trophy::Keeper => trophies::hodler::Hodler::index(level),
            Trophy::Survivor => trophies::hodler::Hodler::index(level),
            Trophy::Untouchable => trophies::hodler::Hodler::index(level),
            Trophy::FirstSteps => trophies::savager::Savager::index(level),
            Trophy::Veteran => trophies::savager::Savager::index(level),
            Trophy::Champion => trophies::savager::Savager::index(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::index(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::index(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::index(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::index(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::index(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::index(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::index(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::index(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::index(level),
        }
    }

    #[inline]
    fn points(self: Trophy) -> u16 {
        let level = self.level();
        match self {
            Trophy::None => 0,
            Trophy::Challenger => trophies::attacker::Attacker::points(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::points(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::points(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::points(level),
            Trophy::Keeper => trophies::hodler::Hodler::points(level),
            Trophy::Survivor => trophies::hodler::Hodler::points(level),
            Trophy::Untouchable => trophies::hodler::Hodler::points(level),
            Trophy::FirstSteps => trophies::savager::Savager::points(level),
            Trophy::Veteran => trophies::savager::Savager::points(level),
            Trophy::Champion => trophies::savager::Savager::points(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::points(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::points(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::points(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::points(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::points(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::points(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::points(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::points(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::points(level),
        }
    }

    #[inline]
    fn start(self: Trophy) -> u64 {
        // TODO: Update start time if you want to create ephemeral trophies
        0
    }

    #[inline]
    fn end(self: Trophy) -> u64 {
        // TODO: Update end time if you want to create ephemeral trophies
        // Note: End time must be greater than start time
        0
    }

    #[inline]
    fn group(self: Trophy) -> felt252 {
        match self {
            Trophy::None => 0,
            Trophy::Challenger => trophies::attacker::Attacker::group(),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::group(),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::group(),
            Trophy::CookingMaster => trophies::feeder::Feeder::group(),
            Trophy::Keeper => trophies::hodler::Hodler::group(),
            Trophy::Survivor => trophies::hodler::Hodler::group(),
            Trophy::Untouchable => trophies::hodler::Hodler::group(),
            Trophy::FirstSteps => trophies::savager::Savager::group(),
            Trophy::Veteran => trophies::savager::Savager::group(),
            Trophy::Champion => trophies::savager::Savager::group(),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::group(),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::group(),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::group(),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::group(),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::group(),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::group(),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::group(),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::group(),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::group(),
        }
    }

    #[inline]
    fn icon(self: Trophy) -> felt252 {
        let level = self.level();
        match self {
            Trophy::None => 0,
            Trophy::Challenger => trophies::attacker::Attacker::icon(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::icon(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::icon(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::icon(level),
            Trophy::Keeper => trophies::hodler::Hodler::icon(level),
            Trophy::Survivor => trophies::hodler::Hodler::icon(level),
            Trophy::Untouchable => trophies::hodler::Hodler::icon(level),
            Trophy::FirstSteps => trophies::savager::Savager::icon(level),
            Trophy::Veteran => trophies::savager::Savager::icon(level),
            Trophy::Champion => trophies::savager::Savager::icon(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::icon(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::icon(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::icon(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::icon(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::icon(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::icon(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::icon(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::icon(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::icon(level),
        }
    }

    #[inline]
    fn title(self: Trophy) -> felt252 {
        let level = self.level();
        match self {
            Trophy::None => 0,
            Trophy::Challenger => trophies::attacker::Attacker::title(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::title(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::title(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::title(level),
            Trophy::Keeper => trophies::hodler::Hodler::title(level),
            Trophy::Survivor => trophies::hodler::Hodler::title(level),
            Trophy::Untouchable => trophies::hodler::Hodler::title(level),
            Trophy::FirstSteps => trophies::savager::Savager::title(level),
            Trophy::Veteran => trophies::savager::Savager::title(level),
            Trophy::Champion => trophies::savager::Savager::title(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::title(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::title(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::title(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::title(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::title(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::title(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::title(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::title(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::title(level),
        }
    }

    #[inline]
    fn description(self: Trophy) -> ByteArray {
        let level = self.level();
        match self {
            Trophy::None => "",
            Trophy::Challenger => trophies::attacker::Attacker::description(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::description(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::description(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::description(level),
            Trophy::Keeper => trophies::hodler::Hodler::description(level),
            Trophy::Survivor => trophies::hodler::Hodler::description(level),
            Trophy::Untouchable => trophies::hodler::Hodler::description(level),
            Trophy::FirstSteps => trophies::savager::Savager::description(level),
            Trophy::Veteran => trophies::savager::Savager::description(level),
            Trophy::Champion => trophies::savager::Savager::description(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::description(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::description(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::description(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::description(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::description(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::description(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::description(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::description(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::description(level),
        }
    }

    #[inline]
    fn count(self: Trophy, level: u8) -> u32 {
        match self {
            Trophy::None => 0,
            Trophy::Challenger => trophies::attacker::Attacker::count(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::count(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::count(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::count(level),
            Trophy::Keeper => trophies::hodler::Hodler::count(level),
            Trophy::Survivor => trophies::hodler::Hodler::count(level),
            Trophy::Untouchable => trophies::hodler::Hodler::count(level),
            Trophy::FirstSteps => trophies::savager::Savager::count(level),
            Trophy::Veteran => trophies::savager::Savager::count(level),
            Trophy::Champion => trophies::savager::Savager::count(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::count(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::count(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::count(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::count(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::count(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::count(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::count(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::count(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::count(level),
        }
    }

    #[inline]
    fn tasks(self: Trophy) -> Span<ArcadeTask> {
        let level = self.level();
        match self {
            Trophy::None => [].span(),
            Trophy::Challenger => trophies::attacker::Attacker::tasks(level),
            Trophy::RelentlessFighter => trophies::attacker::Attacker::tasks(level),
            Trophy::UnyieldingAttacker => trophies::attacker::Attacker::tasks(level),
            Trophy::CookingMaster => trophies::feeder::Feeder::tasks(level),
            Trophy::Keeper => trophies::hodler::Hodler::tasks(level),
            Trophy::Survivor => trophies::hodler::Hodler::tasks(level),
            Trophy::Untouchable => trophies::hodler::Hodler::tasks(level),
            Trophy::FirstSteps => trophies::savager::Savager::tasks(level),
            Trophy::Veteran => trophies::savager::Savager::tasks(level),
            Trophy::Champion => trophies::savager::Savager::tasks(level),
            Trophy::AlchemistI => trophies::alchemist::Alchemist::tasks(level),
            Trophy::AlchemistII => trophies::alchemist::Alchemist::tasks(level),
            Trophy::AlchemistIII => trophies::alchemist::Alchemist::tasks(level),
            Trophy::ApothecaryI => trophies::apothecary::Apothecary::tasks(level),
            Trophy::ApothecaryII => trophies::apothecary::Apothecary::tasks(level),
            Trophy::ApothecaryIII => trophies::apothecary::Apothecary::tasks(level),
            Trophy::HerbalistI => trophies::herbalist::Herbalist::tasks(level),
            Trophy::HerbalistII => trophies::herbalist::Herbalist::tasks(level),
            Trophy::HerbalistIII => trophies::herbalist::Herbalist::tasks(level),
        }
    }

    #[inline]
    fn data(self: Trophy) -> ByteArray {
        ""
    }
}

impl IntoTrophyU8 of core::Into<Trophy, u8> {
    #[inline]
    fn into(self: Trophy) -> u8 {
        match self {
            Trophy::None => 0,
            Trophy::Challenger => 1,
            Trophy::RelentlessFighter => 2,
            Trophy::UnyieldingAttacker => 3,
            Trophy::CookingMaster => 4,
            Trophy::Keeper => 5,
            Trophy::Survivor => 6,
            Trophy::Untouchable => 7,
            Trophy::FirstSteps => 8,
            Trophy::Veteran => 9,
            Trophy::Champion => 10,
            Trophy::AlchemistI => 11,
            Trophy::AlchemistII => 12,
            Trophy::AlchemistIII => 13,
            Trophy::ApothecaryI => 14,
            Trophy::ApothecaryII => 15,
            Trophy::ApothecaryIII => 16,
            Trophy::HerbalistI => 17,
            Trophy::HerbalistII => 18,
            Trophy::HerbalistIII => 19,
        }
    }
}

impl IntoU8Trophy of core::Into<u8, Trophy> {
    #[inline]
    fn into(self: u8) -> Trophy {
        let card: felt252 = self.into();
        match card {
            0 => Trophy::None,
            1 => Trophy::Challenger,
            2 => Trophy::RelentlessFighter,
            3 => Trophy::UnyieldingAttacker,
            4 => Trophy::CookingMaster,
            5 => Trophy::Keeper,
            6 => Trophy::Survivor,
            7 => Trophy::Untouchable,
            8 => Trophy::FirstSteps,
            9 => Trophy::Veteran,
            10 => Trophy::Champion,
            11 => Trophy::AlchemistI,
            12 => Trophy::AlchemistII,
            13 => Trophy::AlchemistIII,
            14 => Trophy::ApothecaryI,
            15 => Trophy::ApothecaryII,
            16 => Trophy::ApothecaryIII,
            17 => Trophy::HerbalistI,
            18 => Trophy::HerbalistII,
            19 => Trophy::HerbalistIII,
            _ => Trophy::None,
        }
    }
}

impl TrophyPrint of core::debug::PrintTrait<Trophy> {
    #[inline]
    fn print(self: Trophy) {
        self.identifier().print();
    }
}
