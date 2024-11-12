use savage_summit::elements::tasks::interface::TaskTrait;

impl Feeding of TaskTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'FEEDING'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        format!("Feed your beasts {} times", count)
    }
}
