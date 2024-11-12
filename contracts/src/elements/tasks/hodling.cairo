use savage_summit::elements::tasks::interface::TaskTrait;

impl Hodling of TaskTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'HODLING'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        if count == 1 {
            "Hold the summit for 1 hour total"
        } else {
            format!("Hold the summit for {} hours total", count / 3600)
        }
    }
}
