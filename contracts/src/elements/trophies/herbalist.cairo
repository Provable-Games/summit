use savage_summit::elements::trophies::interface::{TrophyTrait, BushidoTask, Task, TaskTrait};

impl Herbalist of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        match level {
            0 => 'HERBALIST_I',
            1 => 'HERBALIST_II',
            2 => 'HERBALIST_III',
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
            0 => 'fa-leaf',
            1 => 'fa-leaf-oak',
            2 => 'fa-leaf-maple',
            _ => '',
        }
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        match level {
            0 => 'Herbalist I',
            1 => 'Herbalist II',
            2 => 'Herbalist III',
            _ => '',
        }
    }

    #[inline]
    fn description(level: u8) -> ByteArray {
        match level {
            0 => "Success is not final, failure is not fatal", // — Winston Churchill
            1 => "The harder the conflict, the greater the triumph", // George Washington
            2 => "Courage is resistance to fear, mastery of fear", // — Mark Twain
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
        Task::Reviving.tasks(level, total, total)
    }
}
