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
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function bigintToSafeNumber(value: bigint, fieldName: string): number {
  if (value > MAX_SAFE_INTEGER_BIGINT) {
    throw new Error(`${fieldName} exceeds Number.MAX_SAFE_INTEGER`);
  }
  return Number(value);
}

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
  summit_held_seconds: number;
  spirit: number;
  luck: number;
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
  rewards_earned: number;
  rewards_claimed: number;
  captured_summit: boolean;
  used_revival_potion: boolean;
  used_attack_potion: boolean;
  max_attack_streak: boolean;
}

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
  const packed = BigInt(packedFelt);
  let low = packed & MASK_128;
  let high = packed >> 128n;

  const last_death_timestamp = bigintToSafeNumber(low & MASK_64, "last_death_timestamp");
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
