use savage_summit::elements::trophies::interface::{TrophyTrait, BushidoTask, Task, TaskTrait};

impl Savager of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        match level {
            0 => 'SAVAGER_I',
            1 => 'SAVAGER_II',
            2 => 'SAVAGER_III',
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
            0 => 10,
            1 => 100,
            2 => 1000,
            _ => 0,
        }
    }

    #[inline]
    fn group() -> felt252 {
        'Savager'
    }

    #[inline]
    fn icon(level: u8) -> felt252 {
        match level {
            0 => 'fa-shrimp',
            1 => 'fa-crab',
            2 => 'fa-lobster',
            _ => '',
        }
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        match level {
            0 => 'First Steps',
            1 => 'Veteran',
            2 => 'Champion',
            _ => '',
        }
    }

    #[inline]
    fn description(level: u8) -> ByteArray {
        match level {
            0 => "Fall seven times, stand up eight",
            1 => "Strength does not come from physical capacity. It comes from an indomitable will", // — Mahatma Gandhi
            2 => "Never give up. Today is hard, tomorrow will be worse, but the day after tomorrow will be sunshine", // Jack Ma
            _ => "",
        }
    }

    #[inline]
    fn count(level: u8) -> u32 {
        match level {
            0 => 3,
            1 => 6,
            2 => 9,
            _ => 0,
        }
    }

    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        let count: u32 = Self::count(level);
        let total: u32 = 1;
        Task::Savaging.tasks(level, count, total)
    }
}
