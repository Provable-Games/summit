use savage_summit::models::beast_stats::BeastStats;
use savage_summit::models::beast_details::BeastDetails;
use combat::combat::{CombatSpec, SpecialPowers};

#[derive(Copy, Drop, Introspect, Serde)]
#[dojo::model]
pub struct Beast {
    #[key]
    pub token_id: u32,
    pub details: BeastDetails,
    pub stats: BeastStats,
}

#[generate_trait]
impl ImplBeast of IBeast {
    fn get_combat_spec(self: Beast) -> CombatSpec {
        CombatSpec {
            tier: self.details.tier,
            item_type: self.details.elemental,
            level: self.stats.fixed.level,
            // TODO: diisable specials until we think of a good way to use them
            specials: SpecialPowers { special1: 0, special2: 0, special3: 0, },
        }
    }
}
