import type { Beast, Combat, Summit, selection } from '@/types/game';
import { BEAST_NAMES, BEAST_TIERS, BEAST_TYPES, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from './BeastData';
import type { SoundName } from '@/contexts/sound';
import * as starknet from "@scure/starknet";
import { addAddressPadding } from 'starknet';

export const fetchBeastTypeImage = (type: string): string => {
  try {
    return new URL(`../assets/types/${type.toLowerCase()}.svg`, import.meta.url).href
  } catch {
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

  return "bludgeon";
}

export const fetchBeastImage = (
  beast: Pick<Beast, "name"> & { shiny: number | boolean; animated: number | boolean }
) => {
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

function elementalDamage(
  attacker: Pick<Beast, "type" | "power">,
  defender: Pick<Beast, "type" | "power">
): number {
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

  if (!attacker.specials) return damage;

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

  const elemental = elementalDamage(beast, summit);
  const summitElemental = elementalDamage(summit, beast);
  const beastNameMatch = nameMatchBonus(beast, summit, elemental);
  const summitNameMatch = nameMatchBonus(summit, beast, elemental);
  const diplomacyBonus = _summit.diplomacy?.bonus || 0;

  const beastDamage = Math.max(MINIMUM_DAMAGE, Math.floor((elemental * (1 + 0.1 * potions) + beastNameMatch) - summit.power))
  const summitDamage = Math.max(MINIMUM_DAMAGE, Math.floor(summitElemental * (1 + 0.1 * diplomacyBonus) + summitNameMatch) - beast.power)

  const beastCritChance = getLuckCritChancePercent(beast.luck);
  const summitCritChance = getLuckCritChancePercent(summit.luck);

  const beastCritDamage = beastCritChance > 0 ? Math.max(MINIMUM_DAMAGE, Math.floor(((elemental * 2) * (1 + 0.1 * potions) + beastNameMatch) - summit.power)) : 0;
  const summitCritDamage = summitCritChance > 0 ? Math.max(MINIMUM_DAMAGE, Math.floor((summitElemental * 2) * (1 + 0.1 * diplomacyBonus) + summitNameMatch) - beast.power) : 0;

  let beastAverageDamage = beastCritChance > 0 ? (beastDamage * (100 - beastCritChance) + beastCritDamage * beastCritChance) / 100 : beastDamage;
  const summitAverageDamage = summitCritChance > 0 ? (summitDamage * (100 - summitCritChance) + summitCritDamage * summitCritChance) / 100 : summitDamage;

  const beastAttackCount = Math.ceil((beast.health + beast.bonus_health) / summitAverageDamage);
  beastAverageDamage = Math.min(beastAverageDamage, summit.health + summit.bonus_health);

  const estimatedDamage = Math.max(MINIMUM_DAMAGE, beastAverageDamage) * beastAttackCount;

  return {
    attack: beastDamage,
    defense: summitDamage,
    attackCritDamage: beastCritDamage,
    defenseCritDamage: summitCritDamage,
    score: beastDamage - summitDamage,
    estimatedDamage,
    attackPotions: potions
  }
}

export const getBeastRevivalTime = (beast: Beast): number => {
  let revivalTime = 86400000;

  if (beast.spirit > 0) {
    revivalTime -= getSpiritRevivalReductionSeconds(beast.spirit) * 1000;
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

// A beast is "locked" for 24 hours after its last death.
// During this window it cannot be selected as an attacker.
export const BEAST_LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export const isBeastLocked = (beast: Beast): boolean => {
  if (!beast.last_dm_death_timestamp) return false;

  const lastDeathMs = beast.last_dm_death_timestamp * 1000;
  return Date.now() - lastDeathMs < BEAST_LOCK_DURATION_MS;
}

export const getBeastLockedTimeRemaining = (beast: Beast): { hours: number; minutes: number } => {
  if (!beast.last_dm_death_timestamp) {
    return { hours: 0, minutes: 0 };
  }

  const lastDeathMs = beast.last_dm_death_timestamp * 1000;
  const elapsedMs = Date.now() - lastDeathMs;
  const remainingMs = Math.max(0, BEAST_LOCK_DURATION_MS - elapsedMs);

  // Work in whole minutes, rounding up so there is always at least 1 minute while locked.
  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  if (totalMinutes <= 0) {
    return { hours: 0, minutes: 0 };
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes };
}

export const getExperienceDefending = (attackingBeast: Beast): number => {
  return Math.floor(attackingBeast.power / 100) + 1;
}

export const formatBeastName = (beast: Beast): string => {
  return `'${beast.prefix} ${beast.suffix}' ${beast.name}`
}

export const getBeastDetails = (id: number, prefix: number, suffix: number, level: number) => {
  const beastNames = BEAST_NAMES as Record<number, string>;
  const beastTiers = BEAST_TIERS as Record<number, number>;
  const beastTypes = BEAST_TYPES as Record<number, string>;
  const prefixes = ITEM_NAME_PREFIXES as Record<number, string>;
  const suffixes = ITEM_NAME_SUFFIXES as Record<number, string>;
  const tier = beastTiers[id] ?? 5;

  return {
    name: beastNames[id] ?? "Unknown",
    prefix: prefixes[prefix] ?? "",
    suffix: suffixes[suffix] ?? "",
    tier,
    type: beastTypes[id] ?? "Magic",
    power: (6 - tier) * level,
  }
}

// Luck crit chance percent calculation mirrored from contracts/src/models/beast.cairo
export const getLuckCritChancePercent = (points: number): number => {
  const p = Math.max(0, Math.floor(points));
  let totalBp = 0; // basis points

  if (p <= 5) {
    switch (p) {
      case 0: totalBp = 0; break;
      case 1: totalBp = 1000; break;
      case 2: totalBp = 1400; break;
      case 3: totalBp = 1700; break;
      case 4: totalBp = 1900; break;
      case 5: totalBp = 2000; break;
    }
  } else if (p <= 70) {
    totalBp = 2000 + (p - 5) * 100;
  } else {
    totalBp = 8500 + (p - 70) * 50;
  }

  // integer division like Cairo
  return Math.floor(totalBp / 100);
}

// Spirit revival time reduction in seconds mirrored from contracts/src/models/beast.cairo
export const getSpiritRevivalReductionSeconds = (points: number): number => {
  const p = Math.max(0, Math.floor(points));
  let reduction = 0;

  if (p <= 5) {
    switch (p) {
      case 0: reduction = 0; break;
      case 1: reduction = 7200; break;
      case 2: reduction = 10080; break;
      case 3: reduction = 12240; break;
      case 4: reduction = 13680; break;
      case 5: reduction = 14400; break;
    }
  } else if (p <= 70) {
    reduction = 14400 + (p - 5) * 720;
  } else {
    reduction = 61200 + (p - 70) * 360;
  }

  return reduction;
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

export const getEntityHash = (id: number, prefix: number, suffix: number): string => {
  const params = [BigInt(id), BigInt(prefix), BigInt(suffix)];
  const hash = starknet.poseidonHashMany(params);
  return addAddressPadding(hash.toString(16));
}

export const calculateOptimalAttackPotions = (selection: any, summit: Summit, maxAllowed: number) => {
  const beast = selection[0];
  const attacks = selection[1];

  const targetDamage = ((summit.beast.health + summit.beast.bonus_health) * summit.beast.extra_lives)
    + Math.max(1, summit.beast.current_health || 0);
  const target = (summit.beast.extra_lives > 0)
    ? (summit.beast.health + summit.beast.bonus_health)
    : Math.max(1, summit.beast.current_health || 0);


  let bestRequired = Number.POSITIVE_INFINITY;
  if (beast) {
    for (let n = 0; n <= maxAllowed; n++) {
      const combat = calculateBattleResult(beast, summit, n);
      if ((combat.estimatedDamage * attacks) > targetDamage || combat.attack >= target) {
        bestRequired = n;
        break;
      }
    }
  }

  const value = Number.isFinite(bestRequired) ? Math.min(maxAllowed, bestRequired) : maxAllowed;
  return value;
}

export const calculateMaxAttackPotions = (selection: any, summit: Summit, maxAllowed: number) => {
  const beast = selection[0];
  const attacks = selection[1];

  const target = (summit.beast.extra_lives > 0)
    ? (summit.beast.health + summit.beast.bonus_health)
    : Math.max(1, summit.beast.current_health || 0);
  let bestRequired = Number.POSITIVE_INFINITY;
  if (beast && beast.current_health > 0) {
    for (let n = 0; n <= maxAllowed; n++) {
      const combat = calculateBattleResult(beast, summit, n);
      if ((combat.attack * attacks) >= target) {
        bestRequired = n;
        break;
      }
    }
  }
  const value = Number.isFinite(bestRequired) ? Math.min(maxAllowed, bestRequired) : maxAllowed;
  return value;
}

export const calculateRevivalRequired = (selectedBeasts: selection) => {
  return selectedBeasts.reduce((sum: number, selectedBeast) => {
    const [beast, attacks] = selectedBeast;
    if (beast.current_health === 0) {
      return sum + (attacks * beast.revival_count) + (attacks * (attacks + 1) / 2);
    } else {
      const revivals = attacks - 1;
      return sum + (revivals * beast.revival_count) + (revivals * (revivals + 1) / 2);
    }
  }, 0);
}
