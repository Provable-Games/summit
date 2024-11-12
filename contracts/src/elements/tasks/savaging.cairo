use savage_summit::elements::tasks::interface::TaskTrait;

impl Savaging of TaskTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'SAVAGING'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        format!("Take the summit {} times", count)
    }
}
