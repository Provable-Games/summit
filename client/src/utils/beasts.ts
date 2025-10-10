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

  return multiplier
}

export const calculateBattleResult = (beast: Beast, summit: Beast, potions: number): Combat => {
  const MINIMUM_DAMAGE = 4

  let elemental = elementalDamage(beast, summit);

  let beastDamage = Math.max(MINIMUM_DAMAGE, Math.floor((beast.power * elemental * (1 + 0.1 * potions)) - summit.power))
  let summitDamage = Math.max(MINIMUM_DAMAGE, Math.floor((summit.power) * elementalDamage(summit, beast)) - beast.power)

  let summitHealth = summit.current_health
  let beastHealth = beast.current_health > 0 ? beast.current_health : beast.health + beast.bonus_health

  let summitExtraLives = summit.extra_lives

  let totalBeastDamage = 0

  while (true) {
    totalBeastDamage += Math.min(beastDamage, summitHealth)
    summitHealth -= beastDamage;

    if (summitHealth <= 0) {
      if (summitExtraLives > 0) {
        summitExtraLives -= 1
        summitHealth = summit.health + summit.bonus_health
      } else {
        return {
          capture: true,
          healthLeft: beastHealth,
          beastDamage,
          summitDamage,
          elemental,
          damage: totalBeastDamage
        }
      }
    }

    beastHealth -= summitDamage

    if (beastHealth <= 0) {
      return {
        capture: false,
        damage: totalBeastDamage,
        elemental,
      }
    }
  }
}

export const getBeastCurrentHealth = (beast: Beast): number => {
  if (beast.current_health === null || (beast.last_death_timestamp === 0 && beast.current_health === 0)) {
    return beast.health + beast.bonus_health
  }

  if (beast.current_health === 0) {
    const revivalTimestamp = (beast.last_death_timestamp * 1000) + (23 * 60 * 60 * 1000);
    const timeRemaining = revivalTimestamp - Date.now();

    if (timeRemaining <= 0) {
      return beast.health + beast.bonus_health
    }
  }

  return beast.current_health
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