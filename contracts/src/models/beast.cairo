use beasts_nft::pack::PackableBeast;

#[derive(Introspect, Drop, Copy, Serde)]
pub struct LiveBeastStats {
    pub token_id: u32, // 17 bits
    pub current_health: u16, // 12 bits
    pub bonus_health: u16, // 12 bits
    pub bonus_xp: u16, // 16 bits
    pub attack_streak: u8, // 4 bits
    pub last_death_timestamp: u64, // 64 bits
    pub revival_count: u8, // 5 bits
    pub extra_lives: u8, // 8 bits
    pub has_claimed_potions: u8, // 1 bit
    pub rewards_earned: u32, // 17 bits
    pub stats: Stats,
    pub kills_claimed: u8,
}

#[derive(Introspect, Copy, Drop, Serde)]
pub struct Stats {
    pub spirit: u8, // 8 bits
    pub luck: u8, // 8 bits
    pub specials: u8, // 1 bit
    pub wisdom: u8, // 1 bit
    pub diplomacy: u8,
}

#[derive(Copy, Drop, Serde)]
pub struct Beast {
    pub fixed: PackableBeast,
    pub live: LiveBeastStats,
}

/// Power of 2 constants for bit manipulation
mod pow {
    pub const TWO_POW_4: u256 = 0x10;
    pub const TWO_POW_5: u256 = 0x20;
    pub const TWO_POW_8: u256 = 0x100;
    pub const TWO_POW_12: u256 = 0x1000;
    pub const TWO_POW_16: u256 = 0x10000;
    pub const TWO_POW_17: u256 = 0x20000;
    pub const TWO_POW_29: u256 = 0x20000000;
    pub const TWO_POW_41: u256 = 0x20000000000;
    pub const TWO_POW_57: u256 = 0x1FFFFFFFFFFFFFE;
    pub const TWO_POW_61: u256 = 0x2000000000000030;
    pub const TWO_POW_64: u256 = 0x10000000000000180;
    pub const TWO_POW_125: u256 = 0x20000000000000700E78E777D2C00000;
    pub const TWO_POW_130: u256 = 0x40000000000001EF29E233CCFEA000000;
    pub const TWO_POW_138: u256 = 0x40000000000000B186B87D999A2E8000000;
    pub const TWO_POW_139: u256 = 0xFFFFFFFFFFFFFE1DCD3C940ADFE235980000000;
    pub const TWO_POW_156: u256 = 0xFFFFFFFFFFFFFE1DCD3C940ADFE235980000000;
    pub const TWO_POW_164: u256 = 0x100000000000000F38DC1CCD2B325A5B5600000000;
    pub const TWO_POW_172: u256 = 0x100000000000007C9D6C04E749D8475D543000000000;
    pub const TWO_POW_173: u256 = 0x2000000000000038A3098E058C9ADB6F095000000000;
    pub const TWO_POW_174: u256 = 0x3FFFFFFFFFFFFFB0AE44A04212200392739000000000;
    pub const TWO_POW_182: u256 = 0x40000000000001AA3CC2A531C4B8FA38F51A0000000000;
}

// Storage packing implementation for PackableBeast
pub impl PackableLiveStatsStorePacking of starknet::storage_access::StorePacking<LiveBeastStats, felt252> {
    fn pack(value: LiveBeastStats) -> felt252 {
        // Pack according to structure:
        (value.token_id.into()
            + value.current_health.into() * pow::TWO_POW_17
            + value.bonus_health.into() * pow::TWO_POW_29
            + value.bonus_xp.into() * pow::TWO_POW_41
            + value.attack_streak.into() * pow::TWO_POW_57
            + value.last_death_timestamp.into() * pow::TWO_POW_61
            + value.revival_count.into() * pow::TWO_POW_125
            + value.extra_lives.into() * pow::TWO_POW_130
            + value.has_claimed_potions.into() * pow::TWO_POW_138
            + value.rewards_earned.into() * pow::TWO_POW_139
            + value.stats.spirit.into() * pow::TWO_POW_156
            + value.stats.luck.into() * pow::TWO_POW_164
            + value.stats.specials.into() * pow::TWO_POW_172
            + value.stats.wisdom.into() * pow::TWO_POW_173
            + value.stats.diplomacy.into() * pow::TWO_POW_174
            + value.kills_claimed.into() * pow::TWO_POW_182)
            .try_into()
            .expect('pack beast overflow')
    }

    fn unpack(value: felt252) -> LiveBeastStats {
        let mut packed: u256 = value.into();

        // Extract id (7 bits)
        let token_id = (packed % pow::TWO_POW_17).try_into().expect('unpack token_id');
        packed = packed / pow::TWO_POW_17;

        // Extract current_health (12 bits)
        let current_health = (packed % pow::TWO_POW_12).try_into().expect('unpack current_health');
        packed = packed / pow::TWO_POW_12;

        // Extract bonus_health (12 bits)
        let bonus_health = (packed % pow::TWO_POW_12).try_into().expect('unpack bonus_health');
        packed = packed / pow::TWO_POW_12;

        // Extract bonus_xp (16 bits)
        let bonus_xp = (packed % pow::TWO_POW_16).try_into().expect('unpack bonus_xp');
        packed = packed / pow::TWO_POW_16;

        // Extract attack_streak (4 bits)
        let attack_streak = (packed % pow::TWO_POW_4).try_into().expect('unpack attack_streak');
        packed = packed / pow::TWO_POW_4;

        // Extract last_death_timestamp (64 bits)
        let last_death_timestamp = (packed % pow::TWO_POW_64).try_into().expect('unpack last_death_timestamp');
        packed = packed / pow::TWO_POW_64;

        // Extract revival_count (5 bits)
        let revival_count = (packed % pow::TWO_POW_5).try_into().expect('unpack revival_count');
        packed = packed / pow::TWO_POW_5;

        // Extract extra_lives (8 bits)
        let extra_lives = (packed % pow::TWO_POW_8).try_into().expect('unpack extra_lives');
        packed = packed / pow::TWO_POW_8;

        // Extract has_claimed_potions (1 bit)
        let has_claimed_potions = (packed % 2_u256).try_into().expect('unpack has_claimed_potions');
        packed = packed / 2_u256;

        // Extract rewards_earned (17 bits)
        let rewards_earned = (packed % pow::TWO_POW_17).try_into().expect('unpack rewards_earned');
        packed = packed / pow::TWO_POW_17;

        let spirit = (packed % pow::TWO_POW_8).try_into().expect('unpack spirit');
        packed = packed / pow::TWO_POW_8;

        let luck = (packed % pow::TWO_POW_8).try_into().expect('unpack luck');
        packed = packed / pow::TWO_POW_8;

        let specials = (packed % 2_u256).try_into().expect('unpack specials');
        packed = packed / 2_u256;

        let wisdom = (packed % 2_u256).try_into().expect('unpack wisdom');
        packed = packed / 2_u256;

        let diplomacy = (packed % 2_u256).try_into().expect('unpack diplomacy');
        packed = packed / 2_u256;

        let kills_claimed = (packed % pow::TWO_POW_8).try_into().expect('unpack kills_claimed');
        packed = packed / pow::TWO_POW_8;

        let stats = Stats { spirit, luck, specials, wisdom, diplomacy };

        LiveBeastStats {
            token_id,
            current_health,
            bonus_health,
            bonus_xp,
            attack_streak,
            last_death_timestamp,
            revival_count,
            extra_lives,
            has_claimed_potions,
            rewards_earned,
            stats,
            kills_claimed,
        }
    }
}

#[generate_trait]
pub impl BeastUtilsImpl of BeastUtilsTrait {
    fn crit_chance(self: Beast) -> u8 {
        let points: u16 = self.live.stats.luck.into();
        let total_bp: u16 = match points {
            0 => 0,
            1 => 1200,
            2 => 2100,
            3 => 2775,
            4 => 3281,
            5 => 3660,
            6 => 3944,
            7 => 4157,
            8 => 4316,
            9 => 4435,
            10 => 4524,
            11 => 4590,
            12 => 4639,
            13 => 4675,
            14 => 4702,
            15 => 4722,
            _ => {
                let extra = (points - 15) * 20;
                4722 + extra
            },
        };

        let percent = total_bp / 100;
        percent.try_into().unwrap()
    }

    fn spirit_reduction(self: Beast) -> u64 {
        let points: u64 = self.live.stats.spirit.into();
        let reduction: u64 = match points {
            0 => 0,
            1 => 10800,
            2 => 18900,
            3 => 24975,
            4 => 29531,
            5 => 32948,
            6 => 35511,
            7 => 37433,
            8 => 38874,
            9 => 39954,
            10 => 40764,
            11 => 41372,
            12 => 41828,
            13 => 42170,
            14 => 42427,
            15 => 42620,
            _ => 42620 + ((points - 15) * 120),
        };

        reduction
    }
}
