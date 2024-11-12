use savage_summit::elements::tasks::interface::TaskTrait;

impl Healing of TaskTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'HEALING'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        format!("Heal your beast holding the summit {} times", count)
    }
}
