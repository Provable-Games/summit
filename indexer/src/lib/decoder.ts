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
 * - SummitEvent: Summit takeovers
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
  RewardEvent: hash.getSelectorFromName("RewardEvent"),
  RewardsClaimedEvent: hash.getSelectorFromName("RewardsClaimedEvent"),
  PoisonEvent: hash.getSelectorFromName("PoisonEvent"),
  DiplomacyEvent: hash.getSelectorFromName("DiplomacyEvent"),
  SummitEvent: hash.getSelectorFromName("SummitEvent"),
  CorpseEvent: hash.getSelectorFromName("CorpseEvent"),
  SkullEvent: hash.getSelectorFromName("SkullEvent"),
  BattleEvent: hash.getSelectorFromName("BattleEvent"),
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
  xpGained: number;
}

export interface RewardEventData {
  blockNumber: bigint;
  beastTokenId: number;
  owner: string;
  amount: number;
}

export interface RewardsClaimedEventData {
  player: string;
  beastTokenIds: number[];
  amount: bigint;
}

export interface PoisonEventData {
  beastTokenId: number;
  blockTimestamp: bigint;
  count: number;
  player: string;
}

export interface DiplomacyEventData {
  specialsHash: string;
  beastTokenIds: number[];
  totalPower: number;
}

export interface SummitEventData {
  beastTokenId: number;
  beastId: number;
  prefix: number;
  suffix: number;
  level: number;
  health: number;
  shiny: number;
  animated: number;
  liveStats: LiveBeastStats;
  owner: string;
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
 *       attack_potions, xp_gained
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
    xpGained: hexToNumber(data[12]),
  };
}

/**
 * Decode RewardEvent
 * Data: block_number, beast_token_id, owner, amount
 */
export function decodeRewardEvent(keys: string[], data: string[]): RewardEventData {
  return {
    blockNumber: hexToBigInt(data[0]),
    beastTokenId: hexToNumber(data[1]),
    owner: feltToHex(data[2]),
    amount: hexToNumber(data[3]),
  };
}

/**
 * Decode RewardsClaimedEvent
 * Keys: [selector, player]
 * Data: beast_token_ids (Span<u32>), amount (u256 = low + high)
 */
export function decodeRewardsClaimedEvent(keys: string[], data: string[]): RewardsClaimedEventData {
  const player = feltToHex(keys[1]);
  const { values: beastTokenIds, consumed } = decodeSpanU32(data, 0);
  // u256 is serialized as two felt252s (low, high)
  const amountLow = hexToBigInt(data[consumed]);
  const amountHigh = hexToBigInt(data[consumed + 1]);
  const amount = amountLow + (amountHigh << 128n);

  return { player, beastTokenIds, amount };
}

/**
 * Decode PoisonEvent
 * Data: beast_token_id, block_timestamp, count, player
 */
export function decodePoisonEvent(keys: string[], data: string[]): PoisonEventData {
  return {
    beastTokenId: hexToNumber(data[0]),
    blockTimestamp: hexToBigInt(data[1]),
    count: hexToNumber(data[2]),
    player: feltToHex(data[3]),
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
 * Decode SummitEvent
 * Data: beast_token_id, beast_id, prefix, suffix, level, health, shiny, animated,
 *       live_stats (LiveBeastStats struct - serialized), owner
 */
export function decodeSummitEvent(keys: string[], data: string[]): SummitEventData {
  const beastTokenId = hexToNumber(data[0]);
  const beastId = hexToNumber(data[1]);
  const prefix = hexToNumber(data[2]);
  const suffix = hexToNumber(data[3]);
  const level = hexToNumber(data[4]);
  const health = hexToNumber(data[5]);
  const shiny = hexToNumber(data[6]);
  const animated = hexToNumber(data[7]);

  // LiveBeastStats is Serde-serialized (17 fields)
  let idx = 8;
  const tokenId = hexToNumber(data[idx++]);
  const currentHealth = hexToNumber(data[idx++]);
  const bonusHealth = hexToNumber(data[idx++]);
  const bonusXp = hexToNumber(data[idx++]);
  const attackStreak = hexToNumber(data[idx++]);
  const lastDeathTimestamp = hexToBigInt(data[idx++]);
  const revivalCount = hexToNumber(data[idx++]);
  const extraLives = hexToNumber(data[idx++]);
  const hasClaimedPotions = hexToNumber(data[idx++]);
  const blocksHeld = hexToNumber(data[idx++]);
  // Stats struct inline
  const spirit = hexToNumber(data[idx++]);
  const luck = hexToNumber(data[idx++]);
  const specials = hexToNumber(data[idx++]);
  const wisdom = hexToNumber(data[idx++]);
  const diplomacy = hexToNumber(data[idx++]);
  const rewardsEarned = hexToNumber(data[idx++]);
  const rewardsClaimed = hexToNumber(data[idx++]);

  const owner = feltToHex(data[idx]);

  return {
    beastTokenId,
    beastId,
    prefix,
    suffix,
    level,
    health,
    shiny,
    animated,
    liveStats: {
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
    },
    owner,
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
