import assert from "node:assert/strict";

import {
  unpackLiveBeastStats,
  unpackQuestRewardsClaimed,
  type LiveBeastStats,
} from "../src/lib/decoder.ts";

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

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function flag(value: boolean): bigint {
  return value ? 1n : 0n;
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
    (flag(stats.specials) << 116n) |
    (flag(stats.wisdom) << 117n) |
    (flag(stats.diplomacy) << 118n) |
    (flag(stats.captured_summit) << 119n) |
    (flag(stats.used_revival_potion) << 120n) |
    (flag(stats.used_attack_potion) << 121n) |
    (flag(stats.max_attack_streak) << 122n);

  return low | (high << 128n);
}

function runLiveStatsVector(name: string, stats: LiveBeastStats): void {
  const packed = packLiveBeastStats(stats);
  const decoded = unpackLiveBeastStats(toHex(packed));
  assert.deepStrictEqual(decoded, stats, `${name}: unpack mismatch`);
}

function packQuestRewardsClaimed(beast_token_id: number, amount: number): bigint {
  return BigInt(amount) | (BigInt(beast_token_id) << 8n);
}

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

type FlagField =
  | "specials"
  | "wisdom"
  | "diplomacy"
  | "captured_summit"
  | "used_revival_potion"
  | "used_attack_potion"
  | "max_attack_streak";

const FLAG_CASES: Array<{ name: string; key: FlagField }> = [
  { name: "specials", key: "specials" },
  { name: "wisdom", key: "wisdom" },
  { name: "diplomacy", key: "diplomacy" },
  { name: "captured_summit", key: "captured_summit" },
  { name: "used_revival_potion", key: "used_revival_potion" },
  { name: "used_attack_potion", key: "used_attack_potion" },
  { name: "max_attack_streak", key: "max_attack_streak" },
];

runLiveStatsVector("cross-layer parity", CROSS_LAYER_PARITY_EXPECTED);
runLiveStatsVector("all-zero values", ZERO_VECTOR);
runLiveStatsVector("max values", MAX_VECTOR);
runLiveStatsVector("mixed values", MIXED_VECTOR);

for (const { name, key } of FLAG_CASES) {
  const vector: LiveBeastStats = { ...ZERO_VECTOR, [key]: true };
  runLiveStatsVector(`flag isolation: ${name}`, vector);
}

// Ensure packed parity vector remains stable across layers.
const CROSS_LAYER_PARITY_PACKED =
  "0x6dc75813f7e39148cb039612a721092075bcd153ade68b10000000067748580";
assert.equal(
  toHex(packLiveBeastStats(CROSS_LAYER_PARITY_EXPECTED)),
  CROSS_LAYER_PARITY_PACKED,
  "cross-layer packed constant mismatch"
);

const QUEST_CASES: Array<{ name: string; beast_token_id: number; amount: number }> = [
  { name: "quest zero", beast_token_id: 0, amount: 0 },
  { name: "quest mixed", beast_token_id: 4242, amount: 95 },
  { name: "quest max", beast_token_id: 0xffffffff, amount: 0xff },
];

for (const c of QUEST_CASES) {
  const packed = packQuestRewardsClaimed(c.beast_token_id, c.amount);
  const unpacked = unpackQuestRewardsClaimed(toHex(packed));
  assert.deepStrictEqual(
    unpacked,
    { beast_token_id: c.beast_token_id, amount: c.amount },
    `${c.name}: unpack mismatch`
  );
}

console.log("LiveBeastStats and quest packing/unpacking tests passed.");
