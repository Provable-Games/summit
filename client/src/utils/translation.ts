import { hash } from "starknet";

// Event names that we support
const EVENT_NAMES = [
  "BattleEvent",
  "LiveBeastStatsEvent",
  "BeastUpdatesEvent",
] as const;

// Create reverse lookup map: selector -> event name
const SELECTOR_TO_NAME = new Map<string, string>();
for (const eventName of EVENT_NAMES) {
  const selector = hash.getSelectorFromName(eventName);
  const normalized = `0x${BigInt(selector).toString(16).padStart(64, '0')}`;
  SELECTOR_TO_NAME.set(normalized, eventName);
}

// Helper to normalize selector for comparison
const normalizeSelector = (selector: string | bigint): string => {
  const value = typeof selector === 'string' ? BigInt(selector) : selector;
  return `0x${value.toString(16).padStart(64, '0')}`;
};

// ============ Bit manipulation constants ============
// Mirrors Cairo pow module for unpacking packed felt252

const TWO_POW_4 = 0x10n;
const TWO_POW_6 = 0x40n;
const TWO_POW_8 = 0x100n;
const TWO_POW_12 = 0x1000n;
const TWO_POW_16 = 0x10000n;
const TWO_POW_17 = 0x20000n;
const TWO_POW_32 = 0x100000000n;
const TWO_POW_64 = 0x10000000000000000n;

const MASK_1 = 0x1n;
const MASK_4 = 0xFn;
const MASK_6 = 0x3Fn;
const MASK_8 = 0xFFn;
const MASK_12 = 0xFFFn;
const MASK_16 = 0xFFFFn;
const MASK_17 = 0x1FFFFn;
const MASK_32 = 0xFFFFFFFFn;
const MASK_64 = 0xFFFFFFFFFFFFFFFFn;

// ============ Packed Data Types ============

export interface LiveBeastStats {
  token_id: number;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  attack_streak: number;
  last_death_timestamp: number;
  revival_count: number;
  extra_lives: number;
  has_claimed_potions: boolean;
  summit_held_seconds: number;
  spirit: number;
  luck: number;
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
  rewards_earned: number;
  rewards_claimed: number;
}

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
 * - summit_held_seconds: 17 bits
 * - spirit: 8 bits
 * - luck: 8 bits
 * - specials: 1 bit
 * - wisdom: 1 bit
 * - diplomacy: 1 bit
 * - rewards_earned: 32 bits
 * - rewards_claimed: 32 bits
 */
function unpackLiveBeastStats(packedFelt: string): LiveBeastStats {
  let packed = BigInt(packedFelt);

  const token_id = Number(packed & MASK_17);
  packed = packed / TWO_POW_17;

  const current_health = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  const bonus_health = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  const bonus_xp = Number(packed & MASK_16);
  packed = packed / TWO_POW_16;

  const attack_streak = Number(packed & MASK_4);
  packed = packed / TWO_POW_4;

  const last_death_timestamp = Number(packed & MASK_64);
  packed = packed / TWO_POW_64;

  const revival_count = Number(packed & MASK_6);
  packed = packed / TWO_POW_6;

  const extra_lives = Number(packed & MASK_12);
  packed = packed / TWO_POW_12;

  const has_claimed_potions = (packed & MASK_1) === 1n;
  packed = packed / 2n;

  const summit_held_seconds = Number(packed & MASK_17);
  packed = packed / TWO_POW_17;

  const spirit = Number(packed & MASK_8);
  packed = packed / TWO_POW_8;

  const luck = Number(packed & MASK_8);
  packed = packed / TWO_POW_8;

  const flags = packed & 7n;
  const specials = (flags & 1n) === 1n;
  const wisdom = ((flags / 2n) & 1n) === 1n;
  const diplomacy = ((flags / 4n) & 1n) === 1n;
  packed = packed / 8n;

  const rewards_earned = Number(packed & MASK_32);
  packed = packed / TWO_POW_32;

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

function hexToNumber(hex: string): number {
  return Number(BigInt(hex));
}

function decodeBattleEvent(data: string[]): any {
  return {
    componentName: 'BattleEvent',
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

function decodeLiveBeastStatsEvent(data: string[]): any {
  const stats = unpackLiveBeastStats(data[0]);
  return {
    componentName: 'LiveBeastStatsEvent',
    ...stats,
  };
}

function decodeBeastUpdatesEvent(data: string[]): any[] {
  // Data format: [length, packed1, packed2, ...]
  // Returns array of LiveBeastStatsEvent objects
  const length = hexToNumber(data[0]);
  const events: any[] = [];

  for (let i = 0; i < length; i++) {
    const stats = unpackLiveBeastStats(data[1 + i]);
    events.push({
      componentName: 'LiveBeastStatsEvent',
      ...stats,
    });
  }

  return events;
}

export const translateGameEvent = (event: any, address: string): any[] => {
  let name: string | null = null;

  // Check keys[0] for standard Starknet events
  if (event.keys?.[0]) {
    const normalizedSelector = normalizeSelector(event.keys[0]);
    name = SELECTOR_TO_NAME.get(normalizedSelector) || null;
  }

  // Fallback: Summit contract event from user's address
  if (!name && event.from_address === address) {
    return [{
      componentName: 'Summit',
      attack_potions: parseInt(event.data[event.data.length - 3], 16),
      revival_potions: parseInt(event.data[event.data.length - 2], 16),
      extra_life_potions: parseInt(event.data[event.data.length - 1], 16),
    }];
  }

  if (!name) return [];

  const data = event.data;

  switch (name) {
    case 'BattleEvent':
      return [decodeBattleEvent(data)];
    case 'LiveBeastStatsEvent':
      return [decodeLiveBeastStatsEvent(data)];
    case 'BeastUpdatesEvent':
      return decodeBeastUpdatesEvent(data); // Already returns array
    default:
      return [];
  }
};
