use savage_summit::elements::trophies::interface::{TrophyTrait, BushidoTask, Task, TaskTrait};

impl Attacker of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        match level {
            0 => 'ATTACKER_I',
            1 => 'ATTACKER_II',
            2 => 'ATTACKER_III',
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
        'Attacker'
    }

    #[inline]
    fn icon(level: u8) -> felt252 {
        match level {
            0 => 'fa-paw-simple',
            1 => 'fa-paw',
            2 => 'fa-paw-claws',
            _ => '',
        }
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        match level {
            0 => 'Challenger',
            1 => 'Relentless Fighter',
            2 => 'Unyielding Attacker',
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
            1 => 1000,
            2 => 10000,
            _ => 0,
        }
    }

    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        let total: u32 = Self::count(level);
        Task::Attacking.tasks(level, total, total)
    }
}
