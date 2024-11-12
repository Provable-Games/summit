use savage_summit::elements::trophies::interface::{TrophyTrait, BushidoTask, Task, TaskTrait};

impl Alchemist of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        match level {
            0 => 'ALCHEMIST_I',
            1 => 'ALCHEMIST_II',
            2 => 'ALCHEMIST_III',
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
            0 => 'fa-vial',
            1 => 'fa-flask',
            2 => 'fa-flask-vial',
            _ => '',
        }
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        match level {
            0 => 'Alchemist I',
            1 => 'Alchemist II',
            2 => 'Alchemist III',
            _ => '',
        }
    }

    #[inline]
    fn description(level: u8) -> ByteArray {
        match level {
            0 => "To the alchemist, transformation is life's highest art",
            1 => "Alchemy is the journey from what is to what could be",
            2 => "The alchemist sees gold not as a metal, but as the soul's final form",
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
