import { BEAST_NAMES, BEAST_TIERS, BEAST_TYPES, ITEM_NAME_PREFIXES } from './BeastData';

export const fetchBeastImage = (name) => {
  try {
    return new URL(`../assets/beasts/${name.toLowerCase()}.png`, import.meta.url).href
  } catch (ex) {
    return ""
  }
}

export function normaliseHealth(value, max) {
  return Math.min(100, (value * 100) / max)
}

function elementalDamage(attacker, defender) {
  let multiplier = 1

  if ((attacker.type === 'Hunter' && defender.type === 'Magical') || (attacker.type === 'Magical' && defender.type === 'Brute') || (attacker.type === 'Brute' && defender.type === 'Hunter')) {
    multiplier = 1.5
  }

  if ((attacker.type === 'Hunter' && defender.type === 'Brute') || (attacker.type === 'Magical' && defender.type === 'Hunter') || (attacker.type === 'Brute' && defender.type === 'Magical')) {
    multiplier = 0.5
  }

  return multiplier
}

export const calculateBattleResult = (beast, summit) => {
  const MINIMUM_DAMAGE = 4
  let beastPower = (6 - beast.tier) * beast.level

  if (beast.currentHealth < 1) {
    return {
      capture: false,
      damage: 0,
      power: beastPower
    }
  }

  let elemental = elementalDamage(beast, summit);

  let summitPower = (6 - summit.tier) * summit.level

  let beastDamage = Math.max(MINIMUM_DAMAGE, Math.floor((beastPower * elemental) - summitPower))
  let summitDamage = Math.max(MINIMUM_DAMAGE, Math.floor((summitPower) * elementalDamage(summit, beast)) - beastPower)

  let summitHealth = summit.currentHealth
  let beastHealth = beast.currentHealth

  while (true) {

    summitHealth -= beastDamage;

    if (summitHealth <= 0) {
      return {
        capture: true,
        healthLeft: beastHealth,
        beastDamage,
        summitDamage,
        elemental,
        power: beastPower
      }
    }

    beastHealth -= summitDamage

    if (beastHealth <= 0) {
      return {
        capture: false,
        damage: summit.currentHealth - summitHealth,
        elemental,
        power: beastPower
      }
    }
  }
}

export const formatBeastName = (beast) => {

  return `'${beast.prefix} ${beast.suffix}' ${beast.name}`
}

export const beastDetails = (id, prefix, suffix) => {
  return {
    name: BEAST_NAMES[id],
    fullName: `${ITEM_NAME_PREFIXES[prefix]} ${ITEM_NAME_PREFIXES[suffix]} ${BEAST_NAMES[id]}`,
    tier: BEAST_TIERS[id],
    type: BEAST_TYPES[id]
  }
}

export const beastElementalColor = (beast) => {
  switch (beast.elemental) {
    case 0.5:
      return 'red'
    case 1:
      return 'gray'
    case 1.5:
      return 'green'
  }
}