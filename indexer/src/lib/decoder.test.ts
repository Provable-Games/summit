import { describe, it, expect } from "vitest";

import {
  unpackLiveBeastStats,
  unpackQuestRewardsClaimed,
  hexToBigInt,
  hexToNumber,
  feltToHex,
  decodeBeastUpdatesEvent,
  decodeLiveBeastStatsEvent,
  decodeBattleEvent,
  decodeRewardsEarnedEvent,
  decodeRewardsClaimedEvent,
  decodePoisonEvent,
  decodeCorpseEvent,
  decodeSkullEvent,
  decodeQuestRewardsClaimedEvent,
  decodeTransferEvent,
  decodeEntityStatsEvent,
  decodeCollectableEntityEvent,
  computeEntityHash,
  EVENT_SELECTORS,
  BEAST_EVENT_SELECTORS,
  DOJO_EVENT_SELECTORS,
  type LiveBeastStats,
} from "./decoder";

function boolToBit(value: boolean): bigint {
  return value ? 1n : 0n;
}

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function packLiveBeastStats(stats: LiveBeastStats): bigint {
  const low =
    stats.last_death_timestamp |
    (BigInt(stats.rewards_earned) << 64n) |
    (BigInt(stats.rewards_claimed) << 96n);

  const high =
    BigInt(stats.token_id) |
    (BigInt(stats.current_health) << 17n) |
    (BigInt(stats.bonus_health) << 29n) |
    (BigInt(stats.bonus_xp) << 40n) |
    (BigInt(stats.attack_streak) << 55n) |
    (BigInt(stats.revival_count) << 59n) |
    (BigInt(stats.extra_lives) << 65n) |
    (BigInt(stats.summit_held_seconds) << 77n) |
    (BigInt(stats.spirit) << 100n) |
    (BigInt(stats.luck) << 108n) |
    (boolToBit(stats.specials) << 116n) |
    (boolToBit(stats.wisdom) << 117n) |
    (boolToBit(stats.diplomacy) << 118n) |
    (boolToBit(stats.captured_summit) << 119n) |
    (boolToBit(stats.used_revival_potion) << 120n) |
    (boolToBit(stats.used_attack_potion) << 121n) |
    (boolToBit(stats.max_attack_streak) << 122n);

  return low | (high << 128n);
}

function packQuestRewardsClaimed(
  beast_token_id: number,
  amount: number,
): bigint {
  return BigInt(amount) | (BigInt(beast_token_id) << 8n);
}

const CROSS_LAYER_PARITY_EXPECTED: LiveBeastStats = {
  token_id: 4242,
  current_health: 1337,
  bonus_health: 777,
  bonus_xp: 12345,
  attack_streak: 9,
  last_death_timestamp: 1735689600n,
  revival_count: 17,
  extra_lives: 3210,
  summit_held_seconds: 654321,
  spirit: 88,
  luck: 199,
  specials: true,
  wisdom: false,
  diplomacy: true,
  rewards_earned: 987654321,
  rewards_claimed: 123456789,
  captured_summit: true,
  used_revival_potion: false,
  used_attack_potion: true,
  max_attack_streak: true,
};

const ZERO_VECTOR: LiveBeastStats = {
  token_id: 0,
  current_health: 0,
  bonus_health: 0,
  bonus_xp: 0,
  attack_streak: 0,
  last_death_timestamp: 0n,
  revival_count: 0,
  extra_lives: 0,
  summit_held_seconds: 0,
  spirit: 0,
  luck: 0,
  specials: false,
  wisdom: false,
  diplomacy: false,
  rewards_earned: 0,
  rewards_claimed: 0,
  captured_summit: false,
  used_revival_potion: false,
  used_attack_potion: false,
  max_attack_streak: false,
};

const MAX_VECTOR: LiveBeastStats = {
  token_id: 0x1ffff,
  current_health: 0xfff,
  bonus_health: 0x7ff,
  bonus_xp: 0x7fff,
  attack_streak: 0xf,
  last_death_timestamp: 0xffffffffffffffffn,
  revival_count: 0x3f,
  extra_lives: 0xfff,
  summit_held_seconds: 0x7fffff,
  spirit: 0xff,
  luck: 0xff,
  specials: true,
  wisdom: true,
  diplomacy: true,
  rewards_earned: 0xffffffff,
  rewards_claimed: 0xffffffff,
  captured_summit: true,
  used_revival_potion: true,
  used_attack_potion: true,
  max_attack_streak: true,
};

const MIXED_VECTOR: LiveBeastStats = {
  token_id: 90210,
  current_health: 2048,
  bonus_health: 33,
  bonus_xp: 2222,
  attack_streak: 7,
  last_death_timestamp: 1712345678n,
  revival_count: 31,
  extra_lives: 1111,
  summit_held_seconds: 6543,
  spirit: 12,
  luck: 222,
  specials: true,
  wisdom: false,
  diplomacy: true,
  rewards_earned: 13579,
  rewards_claimed: 2468,
  captured_summit: false,
  used_revival_potion: true,
  used_attack_potion: false,
  max_attack_streak: true,
};

const CROSS_LAYER_PARITY_PACKED =
  "0x6dc75813f7e39148cb039612a721092075bcd153ade68b10000000067748580";

type FlagKey =
  | "specials"
  | "wisdom"
  | "diplomacy"
  | "captured_summit"
  | "used_revival_potion"
  | "used_attack_potion"
  | "max_attack_streak";

const FLAG_CASES: Array<{ name: string; key: FlagKey }> = [
  { name: "specials", key: "specials" },
  { name: "wisdom", key: "wisdom" },
  { name: "diplomacy", key: "diplomacy" },
  { name: "captured_summit", key: "captured_summit" },
  { name: "used_revival_potion", key: "used_revival_potion" },
  { name: "used_attack_potion", key: "used_attack_potion" },
  { name: "max_attack_streak", key: "max_attack_streak" },
];

const QUEST_CASES = [
  { name: "quest zero", beast_token_id: 0, amount: 0 },
  { name: "quest mixed", beast_token_id: 4242, amount: 95 },
  { name: "quest max", beast_token_id: 0xffffffff, amount: 0xff },
];

describe("unpackLiveBeastStats", () => {
  it("cross-layer parity", () => {
    const packed = packLiveBeastStats(CROSS_LAYER_PARITY_EXPECTED);
    const decoded = unpackLiveBeastStats(toHex(packed));
    expect(decoded).toEqual(CROSS_LAYER_PARITY_EXPECTED);
  });

  it("all-zero values", () => {
    const packed = packLiveBeastStats(ZERO_VECTOR);
    const decoded = unpackLiveBeastStats(toHex(packed));
    expect(decoded).toEqual(ZERO_VECTOR);
  });

  it("max values", () => {
    const packed = packLiveBeastStats(MAX_VECTOR);
    const decoded = unpackLiveBeastStats(toHex(packed));
    expect(decoded).toEqual(MAX_VECTOR);
  });

  it("mixed values", () => {
    const packed = packLiveBeastStats(MIXED_VECTOR);
    const decoded = unpackLiveBeastStats(toHex(packed));
    expect(decoded).toEqual(MIXED_VECTOR);
  });

  it.each(FLAG_CASES)("flag isolation: $name", ({ key }) => {
    const vector: LiveBeastStats = { ...ZERO_VECTOR, [key]: true };
    const packed = packLiveBeastStats(vector);
    const decoded = unpackLiveBeastStats(toHex(packed));
    expect(decoded).toEqual(vector);
  });

  it("cross-layer packed constant is stable", () => {
    expect(toHex(packLiveBeastStats(CROSS_LAYER_PARITY_EXPECTED))).toBe(
      CROSS_LAYER_PARITY_PACKED,
    );
  });
});

describe("unpackQuestRewardsClaimed", () => {
  it.each(QUEST_CASES)("$name", ({ beast_token_id, amount }) => {
    const packed = packQuestRewardsClaimed(beast_token_id, amount);
    const unpacked = unpackQuestRewardsClaimed(toHex(packed));
    expect(unpacked).toEqual({ beast_token_id, amount });
  });
});

// ============ Hex Utility Functions ============

describe("hexToBigInt", () => {
  it("returns 0n for null", () => {
    expect(hexToBigInt(null)).toBe(0n);
  });

  it("returns 0n for undefined", () => {
    expect(hexToBigInt(undefined)).toBe(0n);
  });

  it("returns 0n for empty string", () => {
    expect(hexToBigInt("")).toBe(0n);
  });

  it("converts valid hex 0xA to 10n", () => {
    expect(hexToBigInt("0xA")).toBe(10n);
  });

  it("converts 0x0 to 0n", () => {
    expect(hexToBigInt("0x0")).toBe(0n);
  });

  it("converts large hex value correctly", () => {
    const largeHex = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    expect(hexToBigInt(largeHex)).toBe((1n << 128n) - 1n);
  });

  it("converts lowercase hex correctly", () => {
    expect(hexToBigInt("0xff")).toBe(255n);
  });
});

describe("hexToNumber", () => {
  it("returns 0 for null", () => {
    expect(hexToNumber(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(hexToNumber(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(hexToNumber("")).toBe(0);
  });

  it("converts valid hex 0xA to 10", () => {
    const result = hexToNumber("0xA");
    expect(result).toBe(10);
    expect(typeof result).toBe("number");
  });

  it("converts 0x0 to 0", () => {
    expect(hexToNumber("0x0")).toBe(0);
  });

  it("converts 0xFF to 255", () => {
    expect(hexToNumber("0xFF")).toBe(255);
  });
});

describe("feltToHex", () => {
  it("returns padded zero for null", () => {
    expect(feltToHex(null)).toBe(`0x${"0".repeat(64)}`);
    expect(feltToHex(null)).toHaveLength(66);
  });

  it("returns padded zero for undefined", () => {
    expect(feltToHex(undefined)).toBe(`0x${"0".repeat(64)}`);
    expect(feltToHex(undefined)).toHaveLength(66);
  });

  it("returns padded zero for empty string", () => {
    expect(feltToHex("")).toBe(`0x${"0".repeat(64)}`);
    expect(feltToHex("")).toHaveLength(66);
  });

  it("pads 0x0 to 66 characters", () => {
    const result = feltToHex("0x0");
    expect(result).toHaveLength(66);
    expect(result).toBe("0x" + "0".repeat(64));
  });

  it("pads short hex to 66 characters", () => {
    const result = feltToHex("0x1");
    expect(result).toHaveLength(66);
    expect(result).toBe("0x" + "0".repeat(63) + "1");
  });

  it("keeps already-padded hex the same", () => {
    const padded = "0x" + "a".repeat(64);
    expect(feltToHex(padded)).toBe(padded);
  });

  it("normalizes to lowercase", () => {
    const result = feltToHex("0xABC");
    expect(result).toContain("abc");
  });
});

// ============ Event Selectors ============

describe("EVENT_SELECTORS", () => {
  const selectorEntries = Object.entries(EVENT_SELECTORS);

  it.each(selectorEntries)("%s is a 66-char padded hex string", (_name, value) => {
    expect(value).toHaveLength(66);
    expect(value).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("has all expected event names", () => {
    const expectedNames = [
      "BeastUpdatesEvent",
      "LiveBeastStatsEvent",
      "RewardsEarnedEvent",
      "RewardsClaimedEvent",
      "PoisonEvent",
      "CorpseEvent",
      "SkullEvent",
      "BattleEvent",
      "QuestRewardsClaimedEvent",
    ];
    for (const name of expectedNames) {
      expect(EVENT_SELECTORS).toHaveProperty(name);
    }
  });
});

describe("BEAST_EVENT_SELECTORS", () => {
  it("Transfer is a 66-char padded hex string", () => {
    expect(BEAST_EVENT_SELECTORS.Transfer).toHaveLength(66);
    expect(BEAST_EVENT_SELECTORS.Transfer).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("DOJO_EVENT_SELECTORS", () => {
  const dojoEntries = Object.entries(DOJO_EVENT_SELECTORS);

  it.each(dojoEntries)("%s is a 66-char padded hex string", (_name, value) => {
    expect(value).toHaveLength(66);
    expect(value).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("has StoreSetRecord, EntityStats, and CollectableEntity", () => {
    expect(DOJO_EVENT_SELECTORS).toHaveProperty("StoreSetRecord");
    expect(DOJO_EVENT_SELECTORS).toHaveProperty("EntityStats");
    expect(DOJO_EVENT_SELECTORS).toHaveProperty("CollectableEntity");
  });
});

// ============ Event Decoders ============

describe("decodeBeastUpdatesEvent", () => {
  it("decodes empty span", () => {
    const result = decodeBeastUpdatesEvent([], ["0x0"]);
    expect(result.packed_updates).toEqual([]);
  });

  it("decodes single element span", () => {
    const result = decodeBeastUpdatesEvent([], ["0x1", "0xABC"]);
    expect(result.packed_updates).toEqual(["0xABC"]);
  });

  it("decodes multiple element span", () => {
    const result = decodeBeastUpdatesEvent([], ["0x3", "0xA", "0xB", "0xC"]);
    expect(result.packed_updates).toEqual(["0xA", "0xB", "0xC"]);
  });
});

describe("decodeLiveBeastStatsEvent", () => {
  it("delegates to unpackLiveBeastStats correctly", () => {
    const packed = packLiveBeastStats(CROSS_LAYER_PARITY_EXPECTED);
    const packedHex = toHex(packed);
    const result = decodeLiveBeastStatsEvent([], [packedHex]);
    expect(result.live_stats).toEqual(CROSS_LAYER_PARITY_EXPECTED);
  });

  it("handles zero packed value", () => {
    const result = decodeLiveBeastStatsEvent([], ["0x0"]);
    expect(result.live_stats).toEqual(ZERO_VECTOR);
  });
});

describe("decodeBattleEvent", () => {
  it("decodes all 14 fields correctly", () => {
    const data = [
      "0x1",   // attacking_beast_token_id = 1
      "0x2",   // attack_index = 2
      "0x3",   // defending_beast_token_id = 3
      "0xA",   // attack_count = 10
      "0x64",  // attack_damage = 100
      "0x5",   // critical_attack_count = 5
      "0xC8",  // critical_attack_damage = 200
      "0x7",   // counter_attack_count = 7
      "0x32",  // counter_attack_damage = 50
      "0x2",   // critical_counter_attack_count = 2
      "0x19",  // critical_counter_attack_damage = 25
      "0x3",   // attack_potions = 3
      "0x1",   // revive_potions = 1
      "0xF",   // xp_gained = 15
    ];
    const result = decodeBattleEvent([], data);
    expect(result).toEqual({
      attacking_beast_token_id: 1,
      attack_index: 2,
      defending_beast_token_id: 3,
      attack_count: 10,
      attack_damage: 100,
      critical_attack_count: 5,
      critical_attack_damage: 200,
      counter_attack_count: 7,
      counter_attack_damage: 50,
      critical_counter_attack_count: 2,
      critical_counter_attack_damage: 25,
      attack_potions: 3,
      revive_potions: 1,
      xp_gained: 15,
    });
  });

  it("handles all-zero data", () => {
    const data = Array(14).fill("0x0");
    const result = decodeBattleEvent([], data);
    expect(result.attacking_beast_token_id).toBe(0);
    expect(result.xp_gained).toBe(0);
  });
});

describe("decodeRewardsEarnedEvent", () => {
  it("decodes beast_token_id and amount", () => {
    const result = decodeRewardsEarnedEvent([], ["0x10", "0x64"]);
    expect(result).toEqual({
      beast_token_id: 16,
      amount: 100,
    });
  });

  it("handles zero values", () => {
    const result = decodeRewardsEarnedEvent([], ["0x0", "0x0"]);
    expect(result).toEqual({ beast_token_id: 0, amount: 0 });
  });
});

describe("decodeRewardsClaimedEvent", () => {
  it("decodes player address with padding and amount", () => {
    const result = decodeRewardsClaimedEvent([], ["0xDEAD", "0x64"]);
    expect(result.player).toHaveLength(66);
    expect(result.player).toBe("0x" + "0".repeat(60) + "dead");
    expect(result.amount).toBe(100);
  });

  it("handles zero values", () => {
    const result = decodeRewardsClaimedEvent([], ["0x0", "0x0"]);
    expect(result.player).toBe("0x" + "0".repeat(64));
    expect(result.amount).toBe(0);
  });
});

describe("decodePoisonEvent", () => {
  it("decodes beast_token_id, count, and player", () => {
    const result = decodePoisonEvent([], ["0x5", "0x3", "0xABCD"]);
    expect(result.beast_token_id).toBe(5);
    expect(result.count).toBe(3);
    expect(result.player).toHaveLength(66);
    expect(result.player).toContain("abcd");
  });

  it("handles zero values", () => {
    const result = decodePoisonEvent([], ["0x0", "0x0", "0x0"]);
    expect(result.beast_token_id).toBe(0);
    expect(result.count).toBe(0);
    expect(result.player).toBe("0x" + "0".repeat(64));
  });
});

describe("decodeCorpseEvent", () => {
  it("decodes empty span with corpse_amount and player", () => {
    // data: [span_length=0, corpse_amount, player]
    const result = decodeCorpseEvent([], ["0x0", "0xA", "0xBEEF"]);
    expect(result.adventurer_ids).toEqual([]);
    expect(result.corpse_amount).toBe(10);
    expect(result.player).toHaveLength(66);
    expect(result.player).toContain("beef");
  });

  it("decodes span with 2 adventurer IDs", () => {
    // data: [span_length=2, id1, id2, corpse_amount, player]
    const result = decodeCorpseEvent([], ["0x2", "0x64", "0xC8", "0x5", "0xCAFE"]);
    expect(result.adventurer_ids).toEqual([100n, 200n]);
    expect(result.corpse_amount).toBe(5);
    expect(result.player).toContain("cafe");
  });

  it("decodes span with single adventurer ID", () => {
    const result = decodeCorpseEvent([], ["0x1", "0xFF", "0x3", "0x1234"]);
    expect(result.adventurer_ids).toEqual([255n]);
    expect(result.corpse_amount).toBe(3);
  });
});

describe("decodeSkullEvent", () => {
  it("decodes empty span with skulls_claimed", () => {
    // data: [span_length=0, skulls_claimed]
    const result = decodeSkullEvent([], ["0x0", "0x64"]);
    expect(result.beast_token_ids).toEqual([]);
    expect(result.skulls_claimed).toBe(100n);
  });

  it("decodes span with beast token IDs", () => {
    // data: [span_length=3, id1, id2, id3, skulls_claimed]
    const result = decodeSkullEvent([], ["0x3", "0x1", "0x2", "0x3", "0xA"]);
    expect(result.beast_token_ids).toEqual([1, 2, 3]);
    expect(result.skulls_claimed).toBe(10n);
  });

  it("handles single beast token ID", () => {
    const result = decodeSkullEvent([], ["0x1", "0xFF", "0x0"]);
    expect(result.beast_token_ids).toEqual([255]);
    expect(result.skulls_claimed).toBe(0n);
  });
});

describe("decodeQuestRewardsClaimedEvent", () => {
  it("decodes empty span", () => {
    const result = decodeQuestRewardsClaimedEvent([], ["0x0"]);
    expect(result.packed_rewards).toEqual([]);
  });

  it("decodes span with packed rewards", () => {
    const packed1 = toHex(packQuestRewardsClaimed(4242, 95));
    const packed2 = toHex(packQuestRewardsClaimed(100, 50));
    const result = decodeQuestRewardsClaimedEvent([], ["0x2", packed1, packed2]);
    expect(result.packed_rewards).toHaveLength(2);
    // Verify the packed values can be unpacked
    const unpacked1 = unpackQuestRewardsClaimed(result.packed_rewards[0]);
    expect(unpacked1).toEqual({ beast_token_id: 4242, amount: 95 });
    const unpacked2 = unpackQuestRewardsClaimed(result.packed_rewards[1]);
    expect(unpacked2).toEqual({ beast_token_id: 100, amount: 50 });
  });
});

describe("decodeTransferEvent", () => {
  it("decodes from, to, and token_id from keys", () => {
    const keys = [
      BEAST_EVENT_SELECTORS.Transfer,     // Transfer selector (unused in decode but correct for context)
      "0xAABB",                           // from
      "0xCCDD",                           // to
      "0x5",                              // token_id_low
      "0x0",                              // token_id_high
    ];
    const result = decodeTransferEvent(keys, []);
    expect(result.from).toHaveLength(66);
    expect(result.from).toContain("aabb");
    expect(result.to).toHaveLength(66);
    expect(result.to).toContain("ccdd");
    expect(result.token_id).toBe(5n);
  });

  it("combines low and high token_id parts", () => {
    const keys = [
      "0x0",
      "0x1",
      "0x2",
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", // low (128-bit max)
      "0x1",                                  // high
    ];
    const result = decodeTransferEvent(keys, []);
    const expected = ((1n << 128n) - 1n) + (1n * (2n ** 128n));
    expect(result.token_id).toBe(expected);
  });

  it("defaults missing token_id_high to 0", () => {
    const keys = [
      "0x0",
      "0x1",
      "0x2",
      "0xA", // token_id_low only
      // keys[4] is undefined
    ];
    const result = decodeTransferEvent(keys, []);
    expect(result.token_id).toBe(10n);
  });

  it("pads from and to addresses", () => {
    const keys = ["0x0", "0x0", "0x0", "0x1"];
    const result = decodeTransferEvent(keys, []);
    expect(result.from).toBe("0x" + "0".repeat(64));
    expect(result.to).toBe("0x" + "0".repeat(64));
  });
});

describe("decodeEntityStatsEvent", () => {
  it("decodes dungeon, entity_hash, and adventurers_killed", () => {
    const data = [
      "0x2",      // keys_length
      "0xD",      // dungeon
      "0xE",      // entity_hash
      "0x1",      // values_length
      "0x2A",     // adventurers_killed = 42
    ];
    const result = decodeEntityStatsEvent([], data);
    expect(result.dungeon).toHaveLength(66);
    expect(result.dungeon).toContain("d");
    expect(result.entity_hash).toHaveLength(66);
    expect(result.entity_hash).toContain("e");
    expect(result.adventurers_killed).toBe(42n);
  });

  it("handles zero adventurers_killed", () => {
    const data = ["0x2", "0x1", "0x2", "0x1", "0x0"];
    const result = decodeEntityStatsEvent([], data);
    expect(result.adventurers_killed).toBe(0n);
  });

  it("pads dungeon and entity_hash to 66 chars", () => {
    const data = ["0x2", "0xABC", "0xDEF", "0x1", "0x5"];
    const result = decodeEntityStatsEvent([], data);
    expect(result.dungeon).toHaveLength(66);
    expect(result.entity_hash).toHaveLength(66);
  });
});

describe("decodeCollectableEntityEvent", () => {
  it("decodes dungeon, entity_hash, last_killed_by, and timestamp", () => {
    // data: [keys_length=3, dungeon, entity_hash, third_key, values_length=8,
    //        val1, val2, val3, val4, val5, val6, last_killed_by, timestamp]
    const data = [
      "0x3",    // keys_length
      "0xD1",   // dungeon
      "0xE1",   // entity_hash
      "0xF1",   // third key
      "0x8",    // values_length
      "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", // 6 value fields
      "0x2A",   // last_killed_by = 42
      "0x67748580", // timestamp
    ];
    const result = decodeCollectableEntityEvent([], data);
    expect(result.dungeon).toHaveLength(66);
    expect(result.dungeon).toContain("d1");
    expect(result.entity_hash).toHaveLength(66);
    expect(result.entity_hash).toContain("e1");
    expect(result.last_killed_by).toBe(42n);
    expect(result.timestamp).toBe(0x67748580n);
  });

  it("extracts last two elements regardless of values_length", () => {
    // Shorter data set -- the function uses data.length - 2 and data.length - 1
    const data = [
      "0x3",     // keys_length
      "0xA",     // dungeon
      "0xB",     // entity_hash
      "0xC",     // third key
      "0x2",     // values_length (only 2 values)
      "0x99",    // last_killed_by
      "0x12345", // timestamp
    ];
    const result = decodeCollectableEntityEvent([], data);
    expect(result.last_killed_by).toBe(0x99n);
    expect(result.timestamp).toBe(0x12345n);
  });

  it("handles zero values for last_killed_by and timestamp", () => {
    const data = [
      "0x3", "0x1", "0x2", "0x3",
      "0x8",
      "0x0", "0x0", "0x0", "0x0", "0x0", "0x0",
      "0x0", // last_killed_by
      "0x0", // timestamp
    ];
    const result = decodeCollectableEntityEvent([], data);
    expect(result.last_killed_by).toBe(0n);
    expect(result.timestamp).toBe(0n);
  });
});

// ============ computeEntityHash ============

describe("computeEntityHash", () => {
  it("returns a 66-char padded hex string", () => {
    const result = computeEntityHash(1, 1, 1);
    expect(result).toHaveLength(66);
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic -- same inputs produce same output", () => {
    const a = computeEntityHash(42, 10, 5);
    const b = computeEntityHash(42, 10, 5);
    expect(a).toBe(b);
  });

  it("different inputs produce different outputs", () => {
    const a = computeEntityHash(1, 1, 1);
    const b = computeEntityHash(1, 1, 2);
    const c = computeEntityHash(2, 1, 1);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });

  it("handles zero inputs", () => {
    const result = computeEntityHash(0, 0, 0);
    expect(result).toHaveLength(66);
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
