use savage_summit::elements::tasks::interface::TaskTrait;

impl Attacking of TaskTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'ATTACKING'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        format!("Attack the summit {} times", count)
    }
}
