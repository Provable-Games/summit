use savage_summit::elements::tasks::interface::TaskTrait;

impl Reviving of TaskTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'REVIVING'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        format!("Revive your beast {} times", count)
    }
}
