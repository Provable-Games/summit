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
  if (!felt) return "0x0";
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
// Mirrors Cairo pow module for unpacking

const TWO_POW_17 = 0x20000n;
const TWO_POW_12 = 0x1000n;
const TWO_POW_16 = 0x10000n;
const TWO_POW_4 = 0x10n;
const TWO_POW_64 = 0x10000000000000000n;
const TWO_POW_6 = 0x40n;
const TWO_POW_8 = 0x100n;
const TWO_POW_23 = 0x800000n;
const TWO_POW_32 = 0x100000000n;

const MASK_1 = 0x1n;
const MASK_4 = 0xFn;
const MASK_6 = 0x3Fn;
const MASK_8 = 0xFFn;
const MASK_12 = 0xFFFn;
const MASK_16 = 0xFFFFn;
const MASK_17 = 0x1FFFFn;
const MASK_23 = 0x7FFFFFn;
const MASK_32 = 0xFFFFFFFFn;
const MASK_64 = 0xFFFFFFFFFFFFFFFFn;

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
  has_claimed_potions: number;
  summit_held_seconds: number;
  // Stats struct
  spirit: number;
  luck: number;
  specials: number;
  wisdom: number;
  diplomacy: number;
  // Rewards
  rewards_earned: number;
  rewards_claimed: number;
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

// ============ Packed Data Decoders ============

/**
 * Unpack LiveBeastStats from a single felt252
 * Bit layout (total 250 bits):
 * - token_id: 17 bits
 * - current_health: 12 bits
 * - bonus_health: 12 bits
 * - bonus_xp: 16 bits
 * - attack_streak: 4 bits
 * - last_death_timestamp: 64 bits
 * - revival_count: 6 bits
 * - extra_lives: 12 bits
 * - has_claimed_potions: 1 bit
 * - summit_held_seconds: 23 bits
 * - spirit: 8 bits
 * - luck: 8 bits
 * - specials: 1 bit
 * - wisdom: 1 bit
 * - diplomacy: 1 bit
 * - rewards_earned: 32 bits
 * - rewards_claimed: 32 bits
 */
export function unpackLiveBeastStats(packedFelt: string): LiveBeastStats {
  let packed = hexToBigInt(packedFelt);

  // Extract token_id (17 bits)
  const token_id = Number(packed & MASK_17);
  packed = packed / TWO_POW_17;

  // Extract current_health (12 bits)
  const current_health = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  // Extract bonus_health (12 bits)
  const bonus_health = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  // Extract bonus_xp (16 bits)
  const bonus_xp = Number(packed & MASK_16);
  packed = packed / TWO_POW_16;

  // Extract attack_streak (4 bits)
  const attack_streak = Number(packed & MASK_4);
  packed = packed / TWO_POW_4;

  // Extract last_death_timestamp (64 bits)
  const last_death_timestamp = packed & MASK_64;
  packed = packed / TWO_POW_64;

  // Extract revival_count (6 bits)
  const revival_count = Number(packed & MASK_6);
  packed = packed / TWO_POW_6;

  // Extract extra_lives (12 bits)
  const extra_lives = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  // Extract has_claimed_potions (1 bit)
  const has_claimed_potions = Number(packed & MASK_1);
  packed = packed / 2n;

  // Extract summit_held_seconds (23 bits)
  const summit_held_seconds = Number(packed & MASK_23);
  packed = packed / TWO_POW_23;

  // Extract spirit (8 bits)
  const spirit = Number(packed & MASK_8);
  packed = packed / TWO_POW_8;

  // Extract luck (8 bits)
  const luck = Number(packed & MASK_8);
  packed = packed / TWO_POW_8;

  // Extract all 3 flags at once (3 bits)
  const flags = packed & 7n;
  const specials = Number(flags & 1n);
  const wisdom = Number((flags / 2n) & 1n);
  const diplomacy = Number((flags / 4n) & 1n);
  packed = packed / 8n;

  // Extract rewards_earned (32 bits)
  const rewards_earned = Number(packed & MASK_32);
  packed = packed / TWO_POW_32;

  // Extract rewards_claimed (32 bits)
  const rewards_claimed = Number(packed & MASK_32);

  return {
    token_id,
    current_health,
    bonus_health,
    bonus_xp,
    attack_streak,
    last_death_timestamp,
    revival_count,
    extra_lives,
    has_claimed_potions,
    summit_held_seconds,
    spirit,
    luck,
    specials,
    wisdom,
    diplomacy,
    rewards_earned,
    rewards_claimed,
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

// Bit masks for PackableBeast unpacking
const MASK_5 = 0x1Fn;
const MASK_7 = 0x7Fn;

const TWO_POW_5 = 0x20n;
const TWO_POW_7 = 0x80n;

/**
 * Unpack PackableBeast from a single felt252
 * Bit layout (total 53 bits):
 * - bits 0-6: id (7 bits) - beast species
 * - bits 7-13: prefix (7 bits) - name prefix
 * - bits 14-18: suffix (5 bits) - name suffix
 * - bits 19-34: level (16 bits)
 * - bits 35-50: health (16 bits)
 * - bit 51: shiny (1 bit)
 * - bit 52: animated (1 bit)
 */
export function unpackPackableBeast(packedFelt: string): PackableBeast {
  let packed = hexToBigInt(packedFelt);

  // Extract id (7 bits)
  const id = Number(packed & MASK_7);
  packed = packed / TWO_POW_7;

  // Extract prefix (7 bits)
  const prefix = Number(packed & MASK_7);
  packed = packed / TWO_POW_7;

  // Extract suffix (5 bits)
  const suffix = Number(packed & MASK_5);
  packed = packed / TWO_POW_5;

  // Extract level (16 bits)
  const level = Number(packed & MASK_16);
  packed = packed / TWO_POW_16;

  // Extract health (16 bits)
  const health = Number(packed & MASK_16);
  packed = packed / TWO_POW_16;

  // Extract shiny (1 bit)
  const shiny = Number(packed & MASK_1);
  packed = packed / 2n;

  // Extract animated (1 bit)
  const animated = Number(packed & MASK_1);

  return {
    id,
    prefix,
    suffix,
    level,
    health,
    shiny,
    animated,
  };
}

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
 * Data: [field_count, dungeon, entity_hash, adventurers_killed, ...]
 */
export function decodeEntityStatsEvent(_keys: string[], data: string[]): EntityStatsEventData {
  // Data layout:
  // data[0] = field_count (skip)
  // data[1] = dungeon
  // data[2] = entity_hash
  // data[3] = adventurers_killed
  const dungeon = feltToHex(data[1]);
  const entity_hash = feltToHex(data[2]);
  const adventurers_killed = hexToBigInt(data[3]);

  return {
    dungeon,
    entity_hash,
    adventurers_killed,
  };
}

/**
 * Decode CollectableEntity Dojo event
 * Keys: [StoreSetRecord, CollectableEntity_model, key_hash]
 * Data: [field_count, dungeon, entity_hash, ...other_fields, timestamp]
 *
 * The timestamp is the last field and represents when the entity was collected (death time)
 */
export function decodeCollectableEntityEvent(_keys: string[], data: string[]): CollectableEntityEventData {
  // Data layout (similar to EntityStats):
  // data[0] = field_count
  // data[1] = dungeon
  // data[2] = entity_hash
  // ... other fields
  // last_killed_by at data[data.length - 2]
  // timestamp at the end
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
