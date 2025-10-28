import { Beast, Combat } from '@/types/game';
import { BEAST_NAMES, BEAST_TIERS, BEAST_TYPES, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from './BeastData';

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
    damage += elementalDamage * 8
  }

  if (attacker.suffix === defender.suffix) {
    damage += elementalDamage * 8
  }

  return damage;
}

export const calculateBattleResult = (beast: Beast, summit: Beast, potions: number): Combat => {
  const MINIMUM_DAMAGE = 4

  let elemental = elementalDamage(beast, summit);
  let summitElemental = elementalDamage(summit, beast);
  let beastNameMatch = nameMatchBonus(beast, summit, elemental);
  let summitNameMatch = nameMatchBonus(summit, beast, elemental);

  let beastDamage = Math.max(MINIMUM_DAMAGE, Math.floor((elemental * (1 + 0.1 * potions) + beastNameMatch) - summit.power))
  let summitDamage = Math.max(MINIMUM_DAMAGE, Math.floor(summitElemental + summitNameMatch) - beast.power)

  let beastCritDamage = beast.stats.luck ? Math.max(MINIMUM_DAMAGE, Math.floor(((elemental * 2) * (1 + 0.1 * potions) + beastNameMatch) - summit.power)) : 0;
  let summitCritDamage = summit.stats.luck ? Math.max(MINIMUM_DAMAGE, Math.floor((summitElemental * 2) + summitNameMatch) - beast.power) : 0;

  let beastAverageDamage = beast.stats.luck ? (beastDamage + beastCritDamage) / 2 : beastDamage;
  let summitAverageDamage = summit.stats.luck ? (summitDamage + summitCritDamage) / 2 : summitDamage;
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
    revivalTime -= 28800000;
  }

  if (beast.stats.spirit) {
    revivalTime -= 43200000;
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
  return {
    name: BEAST_NAMES[id],
    prefix: ITEM_NAME_PREFIXES[prefix],
    suffix: ITEM_NAME_SUFFIXES[suffix],
    tier: BEAST_TIERS[id],
    type: BEAST_TYPES[id],
    power: (6 - BEAST_TIERS[id]) * level
  }
}