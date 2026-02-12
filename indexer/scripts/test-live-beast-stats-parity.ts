import assert from "node:assert/strict";

import { unpackLiveBeastStats, type LiveBeastStats } from "../src/lib/decoder.ts";

const CROSS_LAYER_PARITY_PACKED =
  "0x6dc75813f7e39148cb039612a721092075bcd153ade68b10000000067748580";

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

const decoded = unpackLiveBeastStats(CROSS_LAYER_PARITY_PACKED);
assert.deepStrictEqual(decoded, CROSS_LAYER_PARITY_EXPECTED);

console.log("LiveBeastStats parity test passed.");
