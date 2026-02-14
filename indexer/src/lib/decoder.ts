/**
 * Summit Event Decoder Utilities
 *
 * Decodes standard Starknet events from the Summit contract.
 * Uses standard sn_keccak selectors (not Dojo namespace patterns).
 *
 * Cairo types are serialized as follows:
 * - felt252: 1 field element
 * - u128: 1 field element
 * - u64: 1 field element
 * - u32: 1 field element
 * - u16: 1 field element
 * - u8: 1 field element
 * - bool: 1 field element (0 or 1)
 * - ContractAddress: 1 field element
 * - Span<T>: [length, elem1, elem2, ...]
 *
 * Summit Events (10 total):
 * - BeastUpdatesEvent: Batch beast stat updates (packed)
 * - LiveBeastStatsEvent: Single beast stat update (packed into felt252)
 * - RewardEvent: Token rewards
 * - RewardsClaimedEvent: Rewards claimed by player
 * - PoisonEvent: Poison attacks
 * - CorpseEvent: Corpse creation
 * - SkullEvent: Skull claims
 * - BattleEvent: Combat results
 */

import { hash } from "starknet";

/**
 * Helper to get padded selector (64 hex chars after 0x)
 */
function getPaddedSelector(name: string): string {
  const selector = hash.getSelectorFromName(name);
  return `0x${BigInt(selector).toString(16).padStart(64, '0')}`;
}

/**
 * Event selectors for Summit contract events
 * Standard Starknet events use sn_keccak(event_name)
 * Padded to 64 chars to match feltToHex output for comparison
 */
export const EVENT_SELECTORS = {
  BeastUpdatesEvent: getPaddedSelector("BeastUpdatesEvent"),
  LiveBeastStatsEvent: getPaddedSelector("LiveBeastStatsEvent"),
  RewardsEarnedEvent: getPaddedSelector("RewardsEarnedEvent"),
  RewardsClaimedEvent: getPaddedSelector("RewardsClaimedEvent"),
  PoisonEvent: getPaddedSelector("PoisonEvent"),
  CorpseEvent: getPaddedSelector("CorpseEvent"),
  SkullEvent: getPaddedSelector("SkullEvent"),
  BattleEvent: getPaddedSelector("BattleEvent"),
  QuestRewardsClaimedEvent: getPaddedSelector("QuestRewardsClaimedEvent"),
} as const;

/**
 * Event selectors for Beasts NFT contract (ERC721)
 * Padded to 64 chars to match feltToHex output for comparison
 */
export const BEAST_EVENT_SELECTORS = {
  Transfer: getPaddedSelector("Transfer"),
} as const;

/**
 * Event selectors for Dojo world contract (Loot Survivor)
 * Dojo events have structure: keys[0]=StoreSelector, keys[1]=ModelSelector, keys[2+]=ModelKeys
 */
export const DOJO_EVENT_SELECTORS = {
  // Dojo StoreSetRecord event selector (keys[0]) - padded to 64 hex chars
  StoreSetRecord: "0x01a2f334228cee715f1f0f54053bb6b5eac54fa336e0bc1aacf7516decb0471d",
  // EntityStats model selector (keys[1]) - padded to 64 hex chars
  EntityStats: "0x029d69b1d6c3d402e03d5394145fba858744dc4e0ca8ffcc22729acbfe71dd4a",
  // CollectableEntity model selector (keys[1]) - padded to 64 hex chars
  CollectableEntity: "0x03b1af01c5bd9e48f92fa49ba31d96b18a03ac4eb4a389c0a694a11c8aa733df",
} as const;

/**
 * Convert a hex string to bigint
 */
export function hexToBigInt(hex: string | undefined | null): bigint {
  if (!hex) return 0n;
  return BigInt(hex);
}

/**
 * Convert felt252 to number (for small values)
 */
export function hexToNumber(hex: string | undefined | null): number {
  return Number(hexToBigInt(hex));
}

/**
 * Convert felt252 to string (for contract addresses and hashes)
 * Normalizes to padded lowercase hex (64 chars after 0x) for consistent comparison
 */
export function feltToHex(felt: string | undefined | null): string {
  if (!felt) return `0x${'0'.repeat(64)}`;
  // Pad to 64 chars for consistent hash/address comparison
  return `0x${BigInt(felt).toString(16).padStart(64, '0')}`;
}

/**
 * Decode a Span<u32> from data array
 * Format: [length, elem1, elem2, ...]
 * Returns: array of numbers and the number of elements consumed
 */
function decodeSpanU32(data: string[], startIndex: number): { values: number[]; consumed: number } {
  const length = hexToNumber(data[startIndex]);
  const values: number[] = [];

  for (let i = 0; i < length; i++) {
    values.push(hexToNumber(data[startIndex + 1 + i]));
  }

  return { values, consumed: 1 + length };
}

/**
 * Decode a Span<felt252> from data array
 * Format: [length, elem1, elem2, ...]
 * Returns: array of hex strings and the number of elements consumed
 */
function decodeSpanFelt252(data: string[], startIndex: number): { values: string[]; consumed: number } {
  const length = hexToNumber(data[startIndex]);
  const values: string[] = [];

  for (let i = 0; i < length; i++) {
    values.push(data[startIndex + 1 + i]);
  }

  return { values, consumed: 1 + length };
}

/**
 * Decode a Span<u64> from data array
 * Format: [length, elem1, elem2, ...]
 * Returns: array of bigints and the number of elements consumed
 */
function decodeSpanU64(data: string[], startIndex: number): { values: bigint[]; consumed: number } {
  const length = hexToNumber(data[startIndex]);
  const values: bigint[] = [];

  for (let i = 0; i < length; i++) {
    values.push(hexToBigInt(data[startIndex + 1 + i]));
  }

  return { values, consumed: 1 + length };
}

// ============ Bit manipulation constants ============
// Mirrors contracts/src/models/beast.cairo packed layout.

const MASK_1 = 0x1n;
const MASK_4 = 0xFn;
const MASK_6 = 0x3Fn;
const MASK_8 = 0xFFn;
const MASK_11 = 0x7FFn;
const MASK_12 = 0xFFFn;
const MASK_15 = 0x7FFFn;
const MASK_17 = 0x1FFFFn;
const MASK_23 = 0x7FFFFFn;
const MASK_32 = 0xFFFFFFFFn;
const MASK_64 = 0xFFFFFFFFFFFFFFFFn;
const MASK_128 = (1n << 128n) - 1n;

// ============ Event Data Interfaces ============

export interface LiveBeastStats {
  token_id: number;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  attack_streak: number;
  last_death_timestamp: bigint;
  revival_count: number;
  extra_lives: number;
  summit_held_seconds: number;
  // Stats struct
  spirit: number;
  luck: number;
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
  // Rewards
  rewards_earned: number;
  rewards_claimed: number;
  // Quest struct
  captured_summit: boolean;
  used_revival_potion: boolean;
  used_attack_potion: boolean;
  max_attack_streak: boolean;
}

export interface BeastUpdatesEventData {
  packed_updates: string[]; // Raw packed felt252 values
}

export interface LiveBeastStatsEventData {
  live_stats: LiveBeastStats;
}

export interface BattleEventData {
  attacking_beast_token_id: number;
  attack_index: number;
  defending_beast_token_id: number;
  attack_count: number;
  attack_damage: number;
  critical_attack_count: number;
  critical_attack_damage: number;
  counter_attack_count: number;
  counter_attack_damage: number;
  critical_counter_attack_count: number;
  critical_counter_attack_damage: number;
  attack_potions: number;
  revive_potions: number;
  xp_gained: number;
}

export interface RewardsEarnedEventData {
  beast_token_id: number;
  amount: number;
}

export interface RewardsClaimedEventData {
  player: string;
  amount: number;
}

export interface PoisonEventData {
  beast_token_id: number;
  count: number;
  player: string;
}

export interface CorpseEventData {
  adventurer_ids: bigint[];
  corpse_amount: number;
  player: string;
}

export interface SkullEventData {
  beast_token_ids: number[];
  skulls_claimed: bigint;
}

export interface QuestRewardsClaimedEventData {
  packed_rewards: string[];
}

// ============ Packed Data Decoders ============

/**
 * Unpack LiveBeastStats from a single felt252
 * Bit layout (total 251 bits, u128-aligned):
 * Low u128: last_death_timestamp(64) | rewards_earned(32) | rewards_claimed(32)
 * High u128: token_id(17) | current_health(12) | bonus_health(11) | bonus_xp(15)
 *   | attack_streak(4) | revival_count(6) | extra_lives(12) | summit_held_seconds(23)
 *   | spirit(8) | luck(8) | specials(1) | wisdom(1) | diplomacy(1)
 *   | captured_summit(1) | used_revival_potion(1) | used_attack_potion(1) | max_attack_streak(1)
 */
export function unpackLiveBeastStats(packedFelt: string): LiveBeastStats {
  const packed = hexToBigInt(packedFelt);
  let low = packed & MASK_128;
  let high = packed >> 128n;

  const last_death_timestamp = low & MASK_64;
  low = low >> 64n;
  const rewards_earned = Number(low & MASK_32);
  low = low >> 32n;
  const rewards_claimed = Number(low & MASK_32);

  const token_id = Number(high & MASK_17);
  high = high >> 17n;
  const current_health = Number(high & MASK_12);
  high = high >> 12n;
  const bonus_health = Number(high & MASK_11);
  high = high >> 11n;
  const bonus_xp = Number(high & MASK_15);
  high = high >> 15n;
  const attack_streak = Number(high & MASK_4);
  high = high >> 4n;
  const revival_count = Number(high & MASK_6);
  high = high >> 6n;
  const extra_lives = Number(high & MASK_12);
  high = high >> 12n;
  const summit_held_seconds = Number(high & MASK_23);
  high = high >> 23n;
  const spirit = Number(high & MASK_8);
  high = high >> 8n;
  const luck = Number(high & MASK_8);
  high = high >> 8n;
  const specials = (high & MASK_1) === 1n;
  high = high >> 1n;
  const wisdom = (high & MASK_1) === 1n;
  high = high >> 1n;
  const diplomacy = (high & MASK_1) === 1n;
  high = high >> 1n;
  const captured_summit = (high & MASK_1) === 1n;
  high = high >> 1n;
  const used_revival_potion = (high & MASK_1) === 1n;
  high = high >> 1n;
  const used_attack_potion = (high & MASK_1) === 1n;
  high = high >> 1n;
  const max_attack_streak = (high & MASK_1) === 1n;

  return {
    token_id,
    current_health,
    bonus_health,
    bonus_xp,
    attack_streak,
    last_death_timestamp,
    revival_count,
    extra_lives,
    summit_held_seconds,
    spirit,
    luck,
    specials,
    wisdom,
    diplomacy,
    rewards_earned,
    rewards_claimed,
    captured_summit,
    used_revival_potion,
    used_attack_potion,
    max_attack_streak,
  };
}

// ============ Event Decoders ============

/**
 * Decode BeastUpdatesEvent
 * Data: beast_updates (Span<felt252>)
 */
export function decodeBeastUpdatesEvent(keys: string[], data: string[]): BeastUpdatesEventData {
  const { values } = decodeSpanFelt252(data, 0);
  return { packed_updates: values };
}

/**
 * Decode LiveBeastStatsEvent
 * Data: live_stats (felt252 - packed)
 */
export function decodeLiveBeastStatsEvent(keys: string[], data: string[]): LiveBeastStatsEventData {
  const live_stats = unpackLiveBeastStats(data[0]);
  return { live_stats };
}

/**
 * Decode BattleEvent
 * Data: attacking_beast_token_id, attack_index, defending_beast_token_id,
 *       attack_count, attack_damage, critical_attack_count, critical_attack_damage,
 *       counter_attack_count, counter_attack_damage,
 *       critical_counter_attack_count, critical_counter_attack_damage,
 *       attack_potions, revive_potions, xp_gained
 */
export function decodeBattleEvent(keys: string[], data: string[]): BattleEventData {
  return {
    attacking_beast_token_id: hexToNumber(data[0]),
    attack_index: hexToNumber(data[1]),
    defending_beast_token_id: hexToNumber(data[2]),
    attack_count: hexToNumber(data[3]),
    attack_damage: hexToNumber(data[4]),
    critical_attack_count: hexToNumber(data[5]),
    critical_attack_damage: hexToNumber(data[6]),
    counter_attack_count: hexToNumber(data[7]),
    counter_attack_damage: hexToNumber(data[8]),
    critical_counter_attack_count: hexToNumber(data[9]),
    critical_counter_attack_damage: hexToNumber(data[10]),
    attack_potions: hexToNumber(data[11]),
    revive_potions: hexToNumber(data[12]),
    xp_gained: hexToNumber(data[13]),
  };
}

/**
 * Decode RewardsEarnedEvent
 * Data: beast_token_id, amount
 */
export function decodeRewardsEarnedEvent(keys: string[], data: string[]): RewardsEarnedEventData {
  return {
    beast_token_id: hexToNumber(data[0]),
    amount: hexToNumber(data[1]),
  };
}

/**
 * Decode RewardsClaimedEvent
 * Data: player, amount
 * Data: amount (u32)
 */
export function decodeRewardsClaimedEvent(keys: string[], data: string[]): RewardsClaimedEventData {
  const player = feltToHex(data[0]);
  const amount = hexToNumber(data[1]);

  return { player, amount };
}

/**
 * Decode PoisonEvent
 * Data: beast_token_id, count, player
 */
export function decodePoisonEvent(keys: string[], data: string[]): PoisonEventData {
  return {
    beast_token_id: hexToNumber(data[0]),
    count: hexToNumber(data[1]),
    player: feltToHex(data[2]),
  };
}

/**
 * Decode CorpseEvent
 * Data: adventurer_ids (Span<u64>), corpse_amount (u32), player (ContractAddress)
 */
export function decodeCorpseEvent(keys: string[], data: string[]): CorpseEventData {
  const { values: adventurer_ids, consumed } = decodeSpanU64(data, 0);
  const corpse_amount = hexToNumber(data[consumed]);
  const player = feltToHex(data[consumed + 1]);
  return { adventurer_ids, corpse_amount, player };
}

/**
 * Decode SkullEvent
 * Data: beast_token_ids (Span<u32>), skulls_claimed (u64)
 */
export function decodeSkullEvent(keys: string[], data: string[]): SkullEventData {
  const { values: beast_token_ids, consumed } = decodeSpanU32(data, 0);
  const skulls_claimed = hexToBigInt(data[consumed]);
  return { beast_token_ids, skulls_claimed };
}

/**
 * Unpack quest rewards claimed from a single felt252
 * Bit layout:
 * - amount: 8 bits
 * - beast_token_id: 32 bits
 */
export function unpackQuestRewardsClaimed(packed: string): { beast_token_id: number; amount: number } {
  const packed_u256 = hexToBigInt(packed);
  const amount = Number(packed_u256 & MASK_8);
  const beast_token_id = Number((packed_u256 >> 8n) & MASK_32);
  return { beast_token_id, amount };
}

/**
 * Decode QuestRewardsClaimedEvent
 * Data: packed_rewards (Span<felt252>)
 */
export function decodeQuestRewardsClaimedEvent(keys: string[], data: string[]): QuestRewardsClaimedEventData {
  const { values } = decodeSpanFelt252(data, 0);
  return { packed_rewards: values };
}

// ============ Beasts NFT Data Interfaces ============

export interface TransferEventData {
  from: string;
  to: string;
  token_id: bigint;
}

export interface PackableBeast {
  id: number; // Beast species 1-75 (7 bits)
  prefix: number; // Name prefix (7 bits)
  suffix: number; // Name suffix (5 bits)
  level: number; // Level (16 bits)
  health: number; // Health (16 bits)
  shiny: number; // Visual trait (1 bit)
  animated: number; // Visual trait (1 bit)
}

// ============ Beasts NFT Decoders ============
/**
 * Decode ERC721 Transfer event
 * Keys: [selector, from, to, token_id_low, token_id_high]
 * Note: token_id is u256, split into low/high parts in keys for indexed events
 */
export function decodeTransferEvent(keys: string[], data: string[]): TransferEventData {
  // For ERC721 Transfer events, the from/to/tokenId are in keys (indexed)
  // Keys format: [selector, from, to, tokenId_low, tokenId_high]
  const from = feltToHex(keys[1]);
  const to = feltToHex(keys[2]);
  // token_id is u256, combine low and high parts
  const token_id_low = hexToBigInt(keys[3]);
  const token_id_high = hexToBigInt(keys[4] ?? "0x0");
  const token_id = token_id_low + (token_id_high * (2n ** 128n));

  return {
    from,
    to,
    token_id,
  };
}

// ============ Dojo Event Data Interfaces ============

export interface EntityStatsEventData {
  dungeon: string;
  entity_hash: string;
  adventurers_killed: bigint;
}

export interface CollectableEntityEventData {
  dungeon: string;
  entity_hash: string;
  last_killed_by: bigint;
  timestamp: bigint;
}

// ============ Dojo Event Decoders ============

/**
 * Decode EntityStats Dojo event
 * Keys: [StoreSetRecord, EntityStats_model, key_hash]
 * Data: [keys_length, dungeon, entity_hash, values_length, adventurers_killed]
 */
export function decodeEntityStatsEvent(_keys: string[], data: string[]): EntityStatsEventData {
  // Data layout (Dojo StoreSetRecord format: keys span then values span):
  // data[0] = keys_length (2)
  // data[1] = dungeon (key)
  // data[2] = entity_hash (key)
  // data[3] = values_length (1)
  // data[4] = adventurers_killed (value)
  const dungeon = feltToHex(data[1]);
  const entity_hash = feltToHex(data[2]);
  const adventurers_killed = hexToBigInt(data[4]);

  return {
    dungeon,
    entity_hash,
    adventurers_killed,
  };
}

/**
 * Decode CollectableEntity Dojo event
 * Keys: [StoreSetRecord, CollectableEntity_model, key_hash]
 * Data: [keys_length, dungeon, entity_hash, key3, values_length, ...values, last_killed_by, timestamp]
 *
 * The timestamp is the last field and represents when the entity was collected (death time)
 */
export function decodeCollectableEntityEvent(_keys: string[], data: string[]): CollectableEntityEventData {
  // Data layout (Dojo StoreSetRecord format: keys span then values span):
  // data[0] = keys_length (3)
  // data[1] = dungeon (key)
  // data[2] = entity_hash (key)
  // data[3] = third key
  // data[4] = values_length (8)
  // data[5..12] = value fields, with last_killed_by and timestamp at the end
  const dungeon = feltToHex(data[1]);
  const entity_hash = feltToHex(data[2]);
  const last_killed_by = hexToBigInt(data[data.length - 2]);
  const timestamp = hexToBigInt(data[data.length - 1]); // Last field

  return {
    dungeon,
    entity_hash,
    last_killed_by,
    timestamp,
  };
}

/**
 * Compute entity hash from beast id, prefix, and suffix
 * Uses Poseidon hash: poseidon_hash(id, prefix, suffix)
 */
export function computeEntityHash(id: number, prefix: number, suffix: number): string {
  // Use starknet.js Poseidon hash
  const entity_hash = hash.computePoseidonHashOnElements([id, prefix, suffix]);
  return feltToHex(entity_hash);
}
