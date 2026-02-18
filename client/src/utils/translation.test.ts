import { describe, it, expect } from "vitest";

import { unpackLiveBeastStats, type LiveBeastStats } from "./translation";

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function packLiveBeastStats(stats: LiveBeastStats): bigint {
  const low =
    BigInt(stats.last_death_timestamp) |
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
    (BigInt(stats.specials ? 1 : 0) << 116n) |
    (BigInt(stats.wisdom ? 1 : 0) << 117n) |
    (BigInt(stats.diplomacy ? 1 : 0) << 118n) |
    (BigInt(stats.captured_summit ? 1 : 0) << 119n) |
    (BigInt(stats.used_revival_potion ? 1 : 0) << 120n) |
    (BigInt(stats.used_attack_potion ? 1 : 0) << 121n) |
    (BigInt(stats.max_attack_streak ? 1 : 0) << 122n);

  return low | (high << 128n);
}

const CROSS_LAYER_PARITY_EXPECTED: LiveBeastStats = {
  token_id: 4242,
  current_health: 1337,
  bonus_health: 777,
  bonus_xp: 12345,
  attack_streak: 9,
  last_death_timestamp: 1735689600,
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
  last_death_timestamp: 0,
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
  last_death_timestamp: Number.MAX_SAFE_INTEGER,
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

const CROSS_LAYER_PARITY_PACKED =
  "0x6dc75813f7e39148cb039612a721092075bcd153ade68b10000000067748580";

type BooleanFlagKey =
  | "specials"
  | "wisdom"
  | "diplomacy"
  | "captured_summit"
  | "used_revival_potion"
  | "used_attack_potion"
  | "max_attack_streak";

const FLAG_CASES: Array<{ name: string; key: BooleanFlagKey }> = [
  { name: "specials", key: "specials" },
  { name: "wisdom", key: "wisdom" },
  { name: "diplomacy", key: "diplomacy" },
  { name: "captured_summit", key: "captured_summit" },
  { name: "used_revival_potion", key: "used_revival_potion" },
  { name: "used_attack_potion", key: "used_attack_potion" },
  { name: "max_attack_streak", key: "max_attack_streak" },
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
