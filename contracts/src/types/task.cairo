// External imports

use arcade_trophy::types::task::{Task as ArcadeTask, TaskTrait as ArcadeTaskTrait};

// Internal imports

use savage_summit::elements::tasks;

// Types

#[derive(Copy, Drop)]
enum Task {
    None,
    Attacking,
    Boosting,
    Feeding,
    Healing,
    Reviving,
    Hodling,
    Savaging,
}

// Implementations

#[generate_trait]
impl TaskImpl of TaskTrait {
    #[inline]
    fn identifier(self: Task, level: u8) -> felt252 {
        match self {
            Task::None => 0,
            Task::Attacking => tasks::attacking::Attacking::identifier(level),
            Task::Boosting => tasks::boosting::Boosting::identifier(level),
            Task::Feeding => tasks::feeding::Feeding::identifier(level),
            Task::Healing => tasks::healing::Healing::identifier(level),
            Task::Reviving => tasks::reviving::Reviving::identifier(level),
            Task::Hodling => tasks::hodling::Hodling::identifier(level),
            Task::Savaging => tasks::savaging::Savaging::identifier(level),
        }
    }

    #[inline]
    fn description(self: Task, count: u32) -> ByteArray {
        match self {
            Task::None => "",
            Task::Attacking => tasks::attacking::Attacking::description(count),
            Task::Boosting => tasks::boosting::Boosting::description(count),
            Task::Feeding => tasks::feeding::Feeding::description(count),
            Task::Healing => tasks::healing::Healing::description(count),
            Task::Reviving => tasks::reviving::Reviving::description(count),
            Task::Hodling => tasks::hodling::Hodling::description(count),
            Task::Savaging => tasks::savaging::Savaging::description(count),
        }
    }

    #[inline]
    fn tasks(self: Task, level: u8, count: u32, total: u32) -> Span<ArcadeTask> {
        let task_id: felt252 = self.identifier(level);
        let description: ByteArray = self.description(count);
        array![ArcadeTaskTrait::new(task_id, total, description)].span()
    }
}

impl IntoTaskU8 of core::Into<Task, u8> {
    #[inline]
    fn into(self: Task) -> u8 {
        match self {
            Task::None => 0,
            Task::Attacking => 1,
            Task::Boosting => 2,
            Task::Feeding => 3,
            Task::Healing => 4,
            Task::Reviving => 5,
            Task::Hodling => 6,
            Task::Savaging => 7,
        }
    }
}

impl IntoU8Task of core::Into<u8, Task> {
    #[inline]
    fn into(self: u8) -> Task {
        let card: felt252 = self.into();
        match card {
            0 => Task::None,
            1 => Task::Attacking,
            2 => Task::Boosting,
            3 => Task::Feeding,
            4 => Task::Healing,
            5 => Task::Reviving,
            6 => Task::Hodling,
            7 => Task::Savaging,
            _ => Task::None,
        }
    }
}
