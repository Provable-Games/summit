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
 * - DiplomacyEvent: Diplomacy group formations
 * - CorpseEvent: Corpse creation
 * - SkullEvent: Skull claims
 * - BattleEvent: Combat results
 */

import { hash } from "starknet";

/**
 * Event selectors for Summit contract events
 * Standard Starknet events use sn_keccak(event_name)
 */
export const EVENT_SELECTORS = {
  BeastUpdatesEvent: hash.getSelectorFromName("BeastUpdatesEvent"),
  LiveBeastStatsEvent: hash.getSelectorFromName("LiveBeastStatsEvent"),
  RewardsEarnedEvent: hash.getSelectorFromName("RewardsEarnedEvent"),
  RewardsClaimedEvent: hash.getSelectorFromName("RewardsClaimedEvent"),
  PoisonEvent: hash.getSelectorFromName("PoisonEvent"),
  DiplomacyEvent: hash.getSelectorFromName("DiplomacyEvent"),
  CorpseEvent: hash.getSelectorFromName("CorpseEvent"),
  SkullEvent: hash.getSelectorFromName("SkullEvent"),
  BattleEvent: hash.getSelectorFromName("BattleEvent"),
} as const;

/**
 * Event selectors for Beasts NFT contract (ERC721)
 */
export const BEAST_EVENT_SELECTORS = {
  Transfer: hash.getSelectorFromName("Transfer"),
} as const;

/**
 * Event selectors for Dojo world contract (Loot Survivor)
 * Dojo events have structure: keys[0]=StoreSelector, keys[1]=ModelSelector, keys[2+]=ModelKeys
 */
export const DOJO_EVENT_SELECTORS = {
  // Dojo StoreSetRecord event selector (keys[0])
  StoreSetRecord: "0x1a2f334228cee715f1f0f54053bb6b5eac54fa336e0bc1aacf7516decb0471d",
  // EntityStats model selector (keys[1])
  EntityStats: "0x29d69b1d6c3d402e03d5394145fba858744dc4e0ca8ffcc22729acbfe71dd4a",
  // CollectableEntity model selector (keys[1])
  CollectableEntity: "0x3b1af01c5bd9e48f92fa49ba31d96b18a03ac4eb4a389c0a694a11c8aa733df",
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
 * Convert felt252 to string (for contract addresses)
 * Normalizes to unpadded lowercase hex (e.g., "0x2e0a..." not "0x02e0a...")
 */
export function feltToHex(felt: string | undefined | null): string {
  if (!felt) return "0x0";
  return `0x${BigInt(felt).toString(16)}`;
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

// ============ Bit manipulation constants ============
// Mirrors Cairo pow module for unpacking

const TWO_POW_17 = 0x20000n;
const TWO_POW_12 = 0x1000n;
const TWO_POW_16 = 0x10000n;
const TWO_POW_4 = 0x10n;
const TWO_POW_64 = 0x10000000000000000n;
const TWO_POW_6 = 0x40n;
const TWO_POW_8 = 0x100n;
const TWO_POW_32 = 0x100000000n;

const MASK_1 = 0x1n;
const MASK_4 = 0xFn;
const MASK_6 = 0x3Fn;
const MASK_8 = 0xFFn;
const MASK_12 = 0xFFFn;
const MASK_16 = 0xFFFFn;
const MASK_17 = 0x1FFFFn;
const MASK_32 = 0xFFFFFFFFn;
const MASK_64 = 0xFFFFFFFFFFFFFFFFn;

// ============ Event Data Interfaces ============

export interface LiveBeastStats {
  tokenId: number;
  currentHealth: number;
  bonusHealth: number;
  bonusXp: number;
  attackStreak: number;
  lastDeathTimestamp: bigint;
  revivalCount: number;
  extraLives: number;
  hasClaimedPotions: number;
  blocksHeld: number;
  // Stats struct
  spirit: number;
  luck: number;
  specials: number;
  wisdom: number;
  diplomacy: number;
  // Rewards
  rewardsEarned: number;
  rewardsClaimed: number;
}

export interface BeastUpdatesEventData {
  packedUpdates: string[]; // Raw packed felt252 values
}

export interface LiveBeastStatsEventData {
  liveStats: LiveBeastStats;
}

export interface BattleEventData {
  attackingBeastTokenId: number;
  attackIndex: number;
  defendingBeastTokenId: number;
  attackCount: number;
  attackDamage: number;
  criticalAttackCount: number;
  criticalAttackDamage: number;
  counterAttackCount: number;
  counterAttackDamage: number;
  criticalCounterAttackCount: number;
  criticalCounterAttackDamage: number;
  attackPotions: number;
  revivePotions: number;
  xpGained: number;
}

export interface RewardsEarnedEventData {
  beastTokenId: number;
  amount: number;
}

export interface RewardsClaimedEventData {
  player: string;
  amount: number;
}

export interface PoisonEventData {
  beastTokenId: number;
  count: number;
  player: string;
}

export interface DiplomacyEventData {
  specialsHash: string;
  beastTokenIds: number[];
  totalPower: number;
}

export interface CorpseEventData {
  adventurerId: bigint;
  player: string;
}

export interface SkullEventData {
  beastTokenId: number;
  skulls: bigint;
}

// ============ Packed Data Decoders ============

/**
 * Unpack LiveBeastStats from a single felt252
 * Bit layout (total 244 bits):
 * - token_id: 17 bits
 * - current_health: 12 bits
 * - bonus_health: 12 bits
 * - bonus_xp: 16 bits
 * - attack_streak: 4 bits
 * - last_death_timestamp: 64 bits
 * - revival_count: 6 bits
 * - extra_lives: 12 bits
 * - has_claimed_potions: 1 bit
 * - blocks_held: 17 bits
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
  const tokenId = Number(packed & MASK_17);
  packed = packed / TWO_POW_17;

  // Extract current_health (12 bits)
  const currentHealth = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  // Extract bonus_health (12 bits)
  const bonusHealth = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  // Extract bonus_xp (16 bits)
  const bonusXp = Number(packed & MASK_16);
  packed = packed / TWO_POW_16;

  // Extract attack_streak (4 bits)
  const attackStreak = Number(packed & MASK_4);
  packed = packed / TWO_POW_4;

  // Extract last_death_timestamp (64 bits)
  const lastDeathTimestamp = packed & MASK_64;
  packed = packed / TWO_POW_64;

  // Extract revival_count (6 bits)
  const revivalCount = Number(packed & MASK_6);
  packed = packed / TWO_POW_6;

  // Extract extra_lives (12 bits)
  const extraLives = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  // Extract has_claimed_potions (1 bit)
  const hasClaimedPotions = Number(packed & MASK_1);
  packed = packed / 2n;

  // Extract blocks_held (17 bits)
  const blocksHeld = Number(packed & MASK_17);
  packed = packed / TWO_POW_17;

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
  const rewardsEarned = Number(packed & MASK_32);
  packed = packed / TWO_POW_32;

  // Extract rewards_claimed (32 bits)
  const rewardsClaimed = Number(packed & MASK_32);

  return {
    tokenId,
    currentHealth,
    bonusHealth,
    bonusXp,
    attackStreak,
    lastDeathTimestamp,
    revivalCount,
    extraLives,
    hasClaimedPotions,
    blocksHeld,
    spirit,
    luck,
    specials,
    wisdom,
    diplomacy,
    rewardsEarned,
    rewardsClaimed,
  };
}

// ============ Event Decoders ============

/**
 * Decode BeastUpdatesEvent
 * Data: beast_updates (Span<felt252>)
 */
export function decodeBeastUpdatesEvent(keys: string[], data: string[]): BeastUpdatesEventData {
  const { values } = decodeSpanFelt252(data, 0);
  return { packedUpdates: values };
}

/**
 * Decode LiveBeastStatsEvent
 * Data: live_stats (felt252 - packed)
 */
export function decodeLiveBeastStatsEvent(keys: string[], data: string[]): LiveBeastStatsEventData {
  const liveStats = unpackLiveBeastStats(data[0]);
  return { liveStats };
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
    attackingBeastTokenId: hexToNumber(data[0]),
    attackIndex: hexToNumber(data[1]),
    defendingBeastTokenId: hexToNumber(data[2]),
    attackCount: hexToNumber(data[3]),
    attackDamage: hexToNumber(data[4]),
    criticalAttackCount: hexToNumber(data[5]),
    criticalAttackDamage: hexToNumber(data[6]),
    counterAttackCount: hexToNumber(data[7]),
    counterAttackDamage: hexToNumber(data[8]),
    criticalCounterAttackCount: hexToNumber(data[9]),
    criticalCounterAttackDamage: hexToNumber(data[10]),
    attackPotions: hexToNumber(data[11]),
    revivePotions: hexToNumber(data[12]),
    xpGained: hexToNumber(data[13]),
  };
}

/**
 * Decode RewardsEarnedEvent
 * Data: beast_token_id, amount
 */
export function decodeRewardsEarnedEvent(keys: string[], data: string[]): RewardsEarnedEventData {
  return {
    beastTokenId: hexToNumber(data[0]),
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
    beastTokenId: hexToNumber(data[0]),
    count: hexToNumber(data[1]),
    player: feltToHex(data[2]),
  };
}

/**
 * Decode DiplomacyEvent
 * Data: specials_hash, beast_token_ids (Span<u32>), total_power
 */
export function decodeDiplomacyEvent(keys: string[], data: string[]): DiplomacyEventData {
  const specialsHash = feltToHex(data[0]);
  const { values: beastTokenIds, consumed } = decodeSpanU32(data, 1);
  const totalPower = hexToNumber(data[1 + consumed]);

  return {
    specialsHash,
    beastTokenIds,
    totalPower,
  };
}

/**
 * Decode CorpseEvent
 * Data: adventurer_id, player
 */
export function decodeCorpseEvent(keys: string[], data: string[]): CorpseEventData {
  return {
    adventurerId: hexToBigInt(data[0]),
    player: feltToHex(data[1]),
  };
}

/**
 * Decode SkullEvent
 * Data: beast_token_id, skulls
 */
export function decodeSkullEvent(keys: string[], data: string[]): SkullEventData {
  return {
    beastTokenId: hexToNumber(data[0]),
    skulls: hexToBigInt(data[1]),
  };
}

// ============ Beasts NFT Data Interfaces ============

export interface TransferEventData {
  from: string;
  to: string;
  tokenId: bigint;
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
  const tokenIdLow = hexToBigInt(keys[3]);
  const tokenIdHigh = hexToBigInt(keys[4] ?? "0x0");
  const tokenId = tokenIdLow + (tokenIdHigh * (2n ** 128n));

  return {
    from,
    to,
    tokenId,
  };
}

// ============ Dojo Event Data Interfaces ============

export interface EntityStatsEventData {
  entityHash: string;
  adventurersKilled: bigint;
}

export interface CollectableEntityEventData {
  entityHash: string;
  timestamp: bigint;
}

// ============ Dojo Event Decoders ============

/**
 * Decode EntityStats Dojo event
 * Keys: [StoreSetRecord, EntityStats_model, entity_hash]
 * Data: [adventurers_killed_low, adventurers_killed_high] (u64 as u256)
 */
export function decodeEntityStatsEvent(keys: string[], data: string[]): EntityStatsEventData {
  // Keys: [StoreSetRecord, EntityStats_model, entity_hash]
  const entityHash = feltToHex(keys[2]);

  // Data: adventurers_killed as u64 (stored as u256 low/high parts)
  const adventurersKilledLow = hexToBigInt(data[0]);
  const adventurersKilledHigh = hexToBigInt(data[1] ?? "0x0");
  const adventurersKilled = adventurersKilledLow + (adventurersKilledHigh * (2n ** 128n));

  return {
    entityHash,
    adventurersKilled,
  };
}

/**
 * Decode CollectableEntity Dojo event
 * Keys: [StoreSetRecord, CollectableEntity_model, entity_hash, index_low, index_high]
 * Data: [seed, id, level, health, prefix, suffix, killed_by, timestamp] (packed)
 *
 * The timestamp is the last field and represents when the entity was collected (death time)
 */
export function decodeCollectableEntityEvent(keys: string[], data: string[]): CollectableEntityEventData {
  // Keys: [StoreSetRecord, CollectableEntity_model, entity_hash, index_low, index_high]
  const entityHash = feltToHex(keys[2]);

  // Data layout: [seed, id, level, health, prefix, suffix, killed_by, timestamp]
  // Each field is a separate felt252, timestamp is at index 7
  const timestamp = hexToBigInt(data[7]);

  return {
    entityHash,
    timestamp,
  };
}

/**
 * Compute entity hash from beast id, prefix, and suffix
 * Uses Poseidon hash: poseidon_hash(id, prefix, suffix)
 */
export function computeEntityHash(id: number, prefix: number, suffix: number): string {
  // Use starknet.js Poseidon hash
  const entityHash = hash.computePoseidonHashOnElements([id, prefix, suffix]);
  return feltToHex(entityHash);
}
