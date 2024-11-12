use savage_summit::elements::tasks::interface::TaskTrait;

impl Boosting of TaskTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'BOOSTING'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        format!("Use {} attack potions", count)
    }
}
