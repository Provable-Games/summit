use savage_summit::elements::trophies::interface::{TrophyTrait, BushidoTask, Task, TaskTrait};

impl Hodler of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        match level {
            0 => 'HODLER_I',
            1 => 'HODLER_II',
            2 => 'HODLER_III',
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
        'Holder'
    }

    #[inline]
    fn icon(level: u8) -> felt252 {
        match level {
            0 => 'fa-fish',
            1 => 'fa-dolphin',
            2 => 'fa-whale',
            _ => '',
        }
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        match level {
            0 => 'Keeper',
            1 => 'Survivor',
            2 => 'Untouchable',
            _ => '',
        }
    }

    #[inline]
    fn description(level: u8) -> ByteArray {
        match level {
            0 => "A good offense is the best defense", // — Jack Dempsey
            1 => "What doesn't kill you makes you stronger", // — Friedrich Nietzsche
            2 => "To be the best, you must be able to handle the worst", // — Wilson Kanadi
            _ => "",
        }
    }

    #[inline]
    fn count(level: u8) -> u32 {
        match level {
            0 => 3600, // 1 hour
            1 => 14400, // 4 hours
            2 => 86400, // 24 hours
            _ => 0,
        }
    }

    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        let count: u32 = Self::count(level);
        let total: u32 = 1;
        Task::Hodling.tasks(level, count, total)
    }
}
