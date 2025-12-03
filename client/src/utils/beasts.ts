import { Beast, Combat, Summit } from '@/types/game';
import { BEAST_NAMES, BEAST_TIERS, BEAST_TYPES, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from './BeastData';
import { SoundName } from '@/contexts/sound';
import * as starknet from "@scure/starknet";
import { Top5000Cutoff } from '@/contexts/Statistics';

export const fetchBeastTypeImage = (type: string): string => {
  try {
    return new URL(`../assets/types/${type.toLowerCase()}.svg`, import.meta.url).href
  } catch (ex) {
    return ""
  }
}

export const fetchBeastSummitImage = (beast: Beast) => {
  return `/images/beasts/${beast.name.toLowerCase()}.png`;
};

export const fetchBeastSound = (beastId: number): SoundName => {
  if (beastId <= 25) {
    return "wand";
  } else if (beastId <= 50) {
    return "blade";
  } else if (beastId <= 75) {
    return "bludgeon";
  }
}

export const fetchBeastImage = (beast: Beast) => {
  if (beast.shiny && beast.animated) {
    return `/images/nfts/animated/shiny/${beast.name.toLowerCase()}.gif`;
  } else if (beast.animated) {
    return `/images/nfts/animated/regular/${beast.name.toLowerCase()}.gif`;
  } else if (beast.shiny) {
    return `/images/nfts/static/shiny/${beast.name.toLowerCase()}.png`;
  } else {
    return `/images/nfts/static/regular/${beast.name.toLowerCase()}.png`;
  }
};

export function normaliseHealth(value: number, max: number): number {
  return Math.min(100, (value * 100) / max)
}

function elementalDamage(attacker: any, defender: any): number {
  let multiplier = 1

  if ((attacker.type === 'Hunter' && defender.type === 'Magic') || (attacker.type === 'Magic' && defender.type === 'Brute') || (attacker.type === 'Brute' && defender.type === 'Hunter')) {
    multiplier = 1.5
  }

  if ((attacker.type === 'Hunter' && defender.type === 'Brute') || (attacker.type === 'Magic' && defender.type === 'Hunter') || (attacker.type === 'Brute' && defender.type === 'Magic')) {
    multiplier = 0.5
  }

  return attacker.power * multiplier
}

function nameMatchBonus(attacker: Beast, defender: Beast, elementalDamage: number): number {
  let damage = 0;

  if (!attacker.stats.specials) return damage;

  if (attacker.prefix === defender.prefix) {
    damage += elementalDamage * 2
  }

  if (attacker.suffix === defender.suffix) {
    damage += elementalDamage * 8
  }

  return damage;
}

export const calculateBattleResult = (beast: Beast, _summit: Summit, potions: number): Combat => {
  const summit = _summit.beast;
  const MINIMUM_DAMAGE = 4

  let elemental = elementalDamage(beast, summit);
  let summitElemental = elementalDamage(summit, beast);
  let beastNameMatch = nameMatchBonus(beast, summit, elemental);
  let summitNameMatch = nameMatchBonus(summit, beast, elemental);

  let beastDamage = Math.max(MINIMUM_DAMAGE, Math.floor((elemental * (1 + 0.1 * potions) + beastNameMatch) - summit.power))
  let summitDamage = Math.max(MINIMUM_DAMAGE, Math.floor(summitElemental * (1 + 0.1 * _summit.diplomacy?.bonus) + summitNameMatch) - beast.power)

  let beastCritChance = getLuckCritChancePercent(beast.stats.luck);
  let summitCritChance = getLuckCritChancePercent(summit.stats.luck);

  let beastCritDamage = beastCritChance > 0 ? Math.max(MINIMUM_DAMAGE, Math.floor(((elemental * 2) * (1 + 0.1 * potions) + beastNameMatch) - summit.power)) : 0;
  let summitCritDamage = summitCritChance > 0 ? Math.max(MINIMUM_DAMAGE, Math.floor((summitElemental * 2) * (1 + 0.1 * _summit.diplomacy?.bonus) + summitNameMatch) - beast.power) : 0;

  let beastAverageDamage = beastCritChance > 0 ? (beastDamage * (100 - beastCritChance) + beastCritDamage * beastCritChance) / 100 : beastDamage;
  let summitAverageDamage = summitCritChance > 0 ? (summitDamage * (100 - summitCritChance) + summitCritDamage * summitCritChance) / 100 : summitDamage;

  let estimatedDamage = Math.max(MINIMUM_DAMAGE, Math.floor(Math.ceil(beast.current_health / summitAverageDamage) * beastAverageDamage));

  return {
    attack: beastDamage,
    defense: summitDamage,
    attackCritDamage: beastCritDamage,
    defenseCritDamage: summitCritDamage,
    score: beastDamage - summitDamage,
    estimatedDamage,
  }
}

export const getBeastRevivalTime = (beast: Beast): number => {
  let revivalTime = 86400000;

  if ((beast.last_dm_death_timestamp * 1000) < Date.now() - 1209600000) {
    revivalTime -= 14400000;
  }

  if (beast.stats.spirit > 0) {
    revivalTime -= getSpiritRevivalReductionSeconds(beast.stats.spirit) * 1000;
  }

  return revivalTime;
}

export const getBeastCurrentLevel = (level: number, bonusXp: number): number => {
  return Math.floor(Math.sqrt(bonusXp + Math.pow(level, 2)));
}

export const getBeastCurrentHealth = (beast: Beast): number => {
  if (beast.current_health === null || (beast.last_death_timestamp === 0 && beast.current_health === 0)) {
    return beast.health + beast.bonus_health
  }

  if (beast.current_health === 0 && beast.last_death_timestamp * 1000 + beast.revival_time < Date.now()) {
    return beast.health + beast.bonus_health
  }

  return beast.current_health
}

export const getExperienceDefending = (attackingBeast: Beast): number => {
  return Math.floor(attackingBeast.power / 100) + 1;
}

export const formatBeastName = (beast: Beast): string => {
  return `'${beast.prefix} ${beast.suffix}' ${beast.name}`
}

export const getBeastDetails = (id: number, prefix: number, suffix: number, level: number) => {
  const specialsHash = getSpecialsHash(prefix, suffix);

  return {
    name: BEAST_NAMES[id],
    prefix: ITEM_NAME_PREFIXES[prefix],
    suffix: ITEM_NAME_SUFFIXES[suffix],
    tier: BEAST_TIERS[id],
    type: BEAST_TYPES[id],
    power: (6 - BEAST_TIERS[id]) * level,
    specials_hash: specialsHash,
  }
}

// Luck crit chance percent calculation mirrored from contracts/src/models/beast.cairo
export const getLuckCritChancePercent = (points: number): number => {
  const p = Math.max(0, Math.floor(points));
  let totalBp = 0; // basis points
  switch (p) {
    case 0: totalBp = 0; break;
    case 1: totalBp = 1200; break;
    case 2: totalBp = 2100; break;
    case 3: totalBp = 2775; break;
    case 4: totalBp = 3281; break;
    case 5: totalBp = 3660; break;
    case 6: totalBp = 3944; break;
    case 7: totalBp = 4157; break;
    case 8: totalBp = 4316; break;
    case 9: totalBp = 4435; break;
    case 10: totalBp = 4524; break;
    case 11: totalBp = 4590; break;
    case 12: totalBp = 4639; break;
    case 13: totalBp = 4675; break;
    case 14: totalBp = 4702; break;
    case 15: totalBp = 4722; break;
    default:
      totalBp = 4722 + (p - 15) * 20;
  }
  // integer division like Cairo
  return Math.floor(totalBp / 100);
}

// Spirit revival time reduction in seconds mirrored from contracts/src/models/beast.cairo
export const getSpiritRevivalReductionSeconds = (points: number): number => {
  const p = Math.max(0, Math.floor(points));
  switch (p) {
    case 0: return 0;
    case 1: return 10800;
    case 2: return 18900;
    case 3: return 24975;
    case 4: return 29531;
    case 5: return 32948;
    case 6: return 35511;
    case 7: return 37433;
    case 8: return 38874;
    case 9: return 39954;
    case 10: return 40764;
    case 11: return 41372;
    case 12: return 41828;
    case 13: return 42170;
    case 14: return 42427;
    case 15: return 42620;
    default:
      return 42620 + (p - 15) * 100;
  }
}

/**
 * Apply poison damage to a beast given poison stacks and timestamp.
 * Returns updated current health and extra lives without mutating inputs.
 *
 * Damage model: 1 damage per second per poison stack since poisonTimestamp.
 * Damage rolls over extra lives in a pooled-health fashion.
 */
export function applyPoisonDamage(
  summit: Summit,
): { currentHealth: number; extraLives: number } {
  console.log('SUMMIT', summit);
  const count = Math.max(0, summit.poison_count || 0);
  const ts = Math.max(0, summit.poison_timestamp || 0);
  if (count === 0 || ts === 0) {
    return {
      currentHealth: Math.max(0, summit.beast.current_health ?? 0),
      extraLives: Math.max(0, summit.beast.extra_lives ?? 0),
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const elapsedSeconds = Math.max(0, nowSec - ts);
  const poisonDamage = count * elapsedSeconds;

  if (poisonDamage <= 0) {
    return {
      currentHealth: summit.beast.current_health,
      extraLives: summit.beast.extra_lives,
    };
  }

  const maxHealth = summit.beast.health + summit.beast.bonus_health;
  const totalPoolBefore = summit.beast.extra_lives * maxHealth + summit.beast.current_health;
  const totalPoolAfter = totalPoolBefore - poisonDamage;

  if (totalPoolAfter <= 0) {
    return { currentHealth: 1, extraLives: 0 };
  }

  const extraLivesAfter = Math.floor((totalPoolAfter - 1) / maxHealth);
  const currentHealthAfter = totalPoolAfter - (extraLivesAfter * maxHealth);

  return {
    currentHealth: currentHealthAfter,
    extraLives: extraLivesAfter,
  };
}

export const getSpecialsHash = (prefix: number, suffix: number): bigint => {
  const params = [BigInt(prefix), BigInt(suffix)];
  return starknet.poseidonHashMany(params);
}

export const isBeastInTop5000 = (beast: Beast, top5000Cutoff: Top5000Cutoff): boolean => {
  if (!top5000Cutoff) return false;

  return beast.blocks_held > top5000Cutoff.blocks_held
    || (beast.blocks_held === top5000Cutoff.blocks_held && beast.bonus_xp > top5000Cutoff.bonus_xp)
    || (beast.blocks_held === top5000Cutoff.blocks_held && beast.bonus_xp === top5000Cutoff.bonus_xp && beast.last_death_timestamp > top5000Cutoff.last_death_timestamp);
}