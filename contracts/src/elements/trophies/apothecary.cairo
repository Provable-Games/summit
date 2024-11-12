use savage_summit::elements::trophies::interface::{TrophyTrait, BushidoTask, Task, TaskTrait};

impl Apothecary of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        match level {
            0 => 'APOTHECARY_I',
            1 => 'APOTHECARY_II',
            2 => 'APOTHECARY_III',
            _ => '',
        }
    }

    #[inline]
    fn hidden(level: u8) -> bool {
        false
    }

    #[inline]
    fn index(level: u8) -> u8 {
        level
    }

    #[inline]
    fn points(level: u8) -> u16 {
        match level {
            0 => 20,
            1 => 40,
            2 => 80,
            _ => 0,
        }
    }

    #[inline]
    fn group() -> felt252 {
        'Enchanter'
    }

    #[inline]
    fn icon(level: u8) -> felt252 {
        match level {
            0 => 'fa-heart-half',
            1 => 'fa-heart-half-stroke',
            2 => 'fa-heart-pulse',
            _ => '',
        }
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        match level {
            0 => 'Apothecary I',
            1 => 'Apothecary II',
            2 => 'Apothecary III',
            _ => '',
        }
    }

    #[inline]
    fn description(level: u8) -> ByteArray {
        match level {
            0 => "The art of the apothecary lies not in curing, but in the quiet mastery of nature's secrets",
            1 => "An apothecary's shelves hold not just potions, but whispered cures, quiet fears, and ancient lore",
            2 => "From the right hands, a simple tincture becomes a life saved",
            _ => "",
        }
    }

    #[inline]
    fn count(level: u8) -> u32 {
        match level {
            0 => 100,
            1 => 500,
            2 => 1000,
            _ => 0,
        }
    }

    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        let total: u32 = Self::count(level);
        Task::Boosting.tasks(level, total, total)
    }
}
