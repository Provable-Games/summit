import { describe, it, expect } from "vitest";

import {
  unpackLiveBeastStats,
  unpackQuestRewardsClaimed,
  type LiveBeastStats,
} from "./decoder";

type BitFlag = 0 | 1;

function bit(value: number): BitFlag {
  return value === 1 ? 1 : 0;
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
    (BigInt(stats.specials) << 116n) |
    (BigInt(stats.wisdom) << 117n) |
    (BigInt(stats.diplomacy) << 118n) |
    (BigInt(stats.captured_summit) << 119n) |
    (BigInt(stats.used_revival_potion) << 120n) |
    (BigInt(stats.used_attack_potion) << 121n) |
    (BigInt(stats.max_attack_streak) << 122n);

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
  specials: 1,
  wisdom: 0,
  diplomacy: 1,
  rewards_earned: 987654321,
  rewards_claimed: 123456789,
  captured_summit: 1,
  used_revival_potion: 0,
  used_attack_potion: 1,
  max_attack_streak: 1,
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
  specials: 0,
  wisdom: 0,
  diplomacy: 0,
  rewards_earned: 0,
  rewards_claimed: 0,
  captured_summit: 0,
  used_revival_potion: 0,
  used_attack_potion: 0,
  max_attack_streak: 0,
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
  specials: 1,
  wisdom: 1,
  diplomacy: 1,
  rewards_earned: 0xffffffff,
  rewards_claimed: 0xffffffff,
  captured_summit: 1,
  used_revival_potion: 1,
  used_attack_potion: 1,
  max_attack_streak: 1,
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
  specials: 1,
  wisdom: 0,
  diplomacy: 1,
  rewards_earned: 13579,
  rewards_claimed: 2468,
  captured_summit: 0,
  used_revival_potion: 1,
  used_attack_potion: 0,
  max_attack_streak: 1,
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
    const vector: LiveBeastStats = { ...ZERO_VECTOR, [key]: bit(1) };
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
