import { BEAST_NAMES, BEAST_TIERS, BEAST_TYPES, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from './BeastData';

export const fetchBeastTypeImage = (type: string): string => {
  try {
    return new URL(`../assets/types/${type.toLowerCase()}.svg`, import.meta.url).href
  } catch (ex) {
    return ""
  }
}

export const fetchBeastImage = (name: string): string => {
  try {
    return new URL(`../assets/beasts/${name.toLowerCase()}.png`, import.meta.url).href
  } catch (ex) {
    return ""
  }
}

export function normaliseHealth(value: number, max: number): number {
  return Math.min(100, (value * 100) / max)
}

function elementalDamage(attacker: any, defender: any): number {
  let multiplier = 1

  if ((attacker.type === 'Hunter' && defender.type === 'Magical') || (attacker.type === 'Magical' && defender.type === 'Brute') || (attacker.type === 'Brute' && defender.type === 'Hunter')) {
    multiplier = 1.5
  }

  if ((attacker.type === 'Hunter' && defender.type === 'Brute') || (attacker.type === 'Magical' && defender.type === 'Hunter') || (attacker.type === 'Brute' && defender.type === 'Magical')) {
    multiplier = 0.5
  }

  return multiplier
}

export const calculateBattleResult = (beast: any, summit: any, potions: number): any => {
  const MINIMUM_DAMAGE = 4
  let beastPower = (6 - beast.tier) * beast.level

  let elemental = elementalDamage(beast, summit);

  let summitPower = (6 - summit.tier) * summit.level

  let beastDamage = Math.max(MINIMUM_DAMAGE, Math.floor((beastPower * elemental * (1 + 0.1 * potions)) - summitPower))
  let summitDamage = Math.max(MINIMUM_DAMAGE, Math.floor((summitPower) * elementalDamage(summit, beast)) - beastPower)

  let summitHealth = summit.current_health
  let beastHealth = beast.current_health > 0 ? beast.current_health : beast.health

  let summitExtraLives = summit.extra_lives

  let totalBeastDamage = 0

  while (true) {
    summitHealth -= beastDamage;
    totalBeastDamage += beastDamage

    if (summitHealth <= 0) {
      if (summitExtraLives > 0) {
        summitExtraLives -= 1
        summitHealth = summit.health + (summit.bonus_health || 0)
      } else {
        return {
          capture: true,
          healthLeft: beastHealth,
          beastDamage,
          summitDamage,
          elemental,
          power: beastPower,
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
        power: beastPower
      }
    }
  }
}

export const formatBeastName = (beast: any): string => {

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

export const beastElementalColor = (beast: any): string | undefined => {
  switch (beast.elemental) {
    case 0.5:
      return 'red'
    case 1:
      return 'gray'
    case 1.5:
      return 'green'
  }
}