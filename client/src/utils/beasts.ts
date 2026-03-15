import type { Beast, Combat, Summit, selection } from '@/types/game';
import type { IgnoredPlayer, TargetedPoisonPlayer } from '@/stores/autopilotStore';
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

type AttackSelection = selection[number];

export const calculateOptimalAttackPotions = (selection: AttackSelection, summit: Summit, maxAllowed: number) => {
  const [beast, attacks] = selection;

  const targetDamage = ((summit.beast.health + summit.beast.bonus_health) * summit.beast.extra_lives)
    + Math.max(1, summit.beast.current_health || 0);
  const target = (summit.beast.extra_lives > 0)
    ? (summit.beast.health + summit.beast.bonus_health)
    : Math.max(1, summit.beast.current_health || 0);

  // Check if 0 potions already suffices
  const baseCombat = calculateBattleResult(beast, summit, 0);
  if ((baseCombat.estimatedDamage * attacks) > targetDamage || baseCombat.attack >= target) {
    return 0;
  }

  // Check if max potions can meet the threshold at all
  const maxCombat = calculateBattleResult(beast, summit, maxAllowed);
  if ((maxCombat.estimatedDamage * attacks) <= targetDamage && maxCombat.attack < target) {
    return maxAllowed;
  }

  // Binary search for minimum potions needed (damage is monotonic with potion count)
  let lo = 1;
  let hi = maxAllowed;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const combat = calculateBattleResult(beast, summit, mid);
    if ((combat.estimatedDamage * attacks) > targetDamage || combat.attack >= target) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  return lo;
}

export const calculateMaxAttackPotions = (selection: AttackSelection, summit: Summit, maxAllowed: number) => {
  const [beast, attacks] = selection;

  const target = (summit.beast.extra_lives > 0)
    ? (summit.beast.health + summit.beast.bonus_health)
    : Math.max(1, summit.beast.current_health || 0);

  if (!beast || beast.current_health <= 0) return maxAllowed;

  // Check if 0 potions already suffices
  const baseCombat = calculateBattleResult(beast, summit, 0);
  if ((baseCombat.attack * attacks) >= target) return 0;

  // Check if max potions can meet the threshold at all
  const maxCombat = calculateBattleResult(beast, summit, maxAllowed);
  if ((maxCombat.attack * attacks) < target) return maxAllowed;

  // Binary search for minimum potions needed
  let lo = 1;
  let hi = maxAllowed;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const combat = calculateBattleResult(beast, summit, mid);
    if ((combat.attack * attacks) >= target) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  return lo;
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

function normalizeAddress(address: string): string {
  return address.replace(/^0x0+/, '0x').toLowerCase();
}

export function isOwnerIgnored(summitOwner: string, ignoredPlayers: IgnoredPlayer[]): boolean {
  if (ignoredPlayers.length === 0) return false;
  const normalized = normalizeAddress(summitOwner);
  return ignoredPlayers.some((p) => p.address === normalized);
}

export function isOwnerTargetedForPoison(summitOwner: string, targetedPlayers: TargetedPoisonPlayer[]): boolean {
  if (targetedPlayers.length === 0) return false;
  const normalized = normalizeAddress(summitOwner);
  return targetedPlayers.some((p) => p.address === normalized);
}

export function getTargetedPoisonAmount(summitOwner: string, targetedPlayers: { address: string; amount: number }[]): number {
  if (targetedPlayers.length === 0) return 0;
  const normalized = normalizeAddress(summitOwner);
  const match = targetedPlayers.find((p) => p.address === normalized);
  return match?.amount ?? 0;
}

export function isBeastTargetedForPoison(beastTokenId: number, targetedBeasts: { tokenId: number }[]): boolean {
  return targetedBeasts.length > 0 && targetedBeasts.some((b) => b.tokenId === beastTokenId);
}

export function getTargetedBeastPoisonAmount(beastTokenId: number, targetedBeasts: { tokenId: number; amount: number }[]): number {
  if (targetedBeasts.length === 0) return 0;
  return targetedBeasts.find((b) => b.tokenId === beastTokenId)?.amount ?? 0;
}

export function getStrongType(defenderType: string): string {
  if (defenderType === 'Magic') return 'Hunter';
  if (defenderType === 'Brute') return 'Magic';
  if (defenderType === 'Hunter') return 'Brute';
  return 'Hunter';
}

export function isWithinPoisonSchedule(startH: number, startM: number, endH: number, endM: number): boolean {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  if (start <= end) return current >= start && current < end;
  return current >= start || current < end; // overnight wrap
}

export function hasDiplomacyMatch(playerBeasts: Beast[], summitBeast: Beast): boolean {
  return playerBeasts.some(
    (beast) => beast.diplomacy && beast.prefix === summitBeast.prefix && beast.suffix === summitBeast.suffix
  );
}

export interface SelectedBeast {
  beast: Beast;
  reviveCost: number;
  attackPotions: number;
}

export interface SelectOptimalBeastsConfig {
  useRevivePotions: boolean;
  revivePotionMax: number;
  revivePotionMaxPerBeast: number;
  revivePotionsUsed: number;
  useAttackPotions: boolean;
  attackPotionMax: number;
  attackPotionMaxPerBeast: number;
  attackPotionsUsed: number;
  autopilotEnabled: boolean;
  questMode: boolean;
  questFilters: string[];
  maxBeasts?: number; // limit total beasts selected
}

export function selectOptimalBeasts(
  collection: Beast[],
  summit: Summit,
  config: SelectOptimalBeastsConfig,
): Beast[] {
  const revivePotionsEnabled = config.autopilotEnabled && config.useRevivePotions && config.revivePotionsUsed < config.revivePotionMax;
  const attackPotionsEnabled = config.autopilotEnabled && config.useAttackPotions && config.attackPotionsUsed < config.attackPotionMax;

  // Compute combat and filter locked beasts
  let filtered = collection.map((beast: Beast) => {
    const newBeast = { ...beast };
    newBeast.revival_time = getBeastRevivalTime(newBeast);
    newBeast.current_health = getBeastCurrentHealth(beast);
    newBeast.combat = calculateBattleResult(newBeast, summit, 0);
    return newBeast;
  }).filter((beast: Beast) => !isBeastLocked(beast));

  // Separate alive and dead pools
  const alive = filtered.filter((b) => b.current_health > 0);
  const dead = filtered.filter((b) => b.current_health === 0);

  // Build quest predicate set for prioritization
  const questPredicates = config.questMode
    ? config.questFilters.map(questNeedsPredicate).filter((p): p is (b: Beast) => boolean => p !== null)
    : [];
  const needsAnyQuest = (b: Beast) => questPredicates.some((p) => p(b));

  // Sort both by combat score desc, with quest-needing beasts boosted
  const hasUrgencyQuest = config.questMode && config.questFilters.some(f =>
    f === 'max_attack_streak' || f === 'level_up_3' || f === 'level_up_5' || f === 'level_up_10'
  );
  const sortWithQuestBoost = (a: Beast, b: Beast) => {
    if (questPredicates.length > 0) {
      const aNeeds = needsAnyQuest(a);
      const bNeeds = needsAnyQuest(b);
      if (aNeeds && !bNeeds) {
        // Boost a if its damage is at least 50% of b's
        if ((a.combat?.estimatedDamage ?? 0) >= (b.combat?.estimatedDamage ?? 0) * 0.5) return -1;
      }
      if (bNeeds && !aNeeds) {
        if ((b.combat?.estimatedDamage ?? 0) >= (a.combat?.estimatedDamage ?? 0) * 0.5) return 1;
      }
      // Both need quests — prefer higher urgency (e.g. streak about to expire)
      if (aNeeds && bNeeds && hasUrgencyQuest) {
        const aUrgency = questUrgencyScore(a, config.questFilters);
        const bUrgency = questUrgencyScore(b, config.questFilters);
        if (aUrgency !== bUrgency) return bUrgency - aUrgency;
      }
    }
    return (b.combat?.score ?? -Infinity) - (a.combat?.score ?? -Infinity);
  };
  alive.sort(sortWithQuestBoost);
  dead.sort(sortWithQuestBoost);

  if (!revivePotionsEnabled) {
    // No revives — just use alive beasts, optionally with attack potions on top beast
    filtered = config.maxBeasts ? alive.slice(0, config.maxBeasts) : alive;

    if (attackPotionsEnabled && filtered.length > 0) {
      const attackSelection: selection[number] = [filtered[0], 1, 0];
      const potions = calculateOptimalAttackPotions(
        attackSelection,
        summit,
        Math.min(config.attackPotionMax - config.attackPotionsUsed, config.attackPotionMaxPerBeast, 255),
      );
      filtered[0] = { ...filtered[0], combat: calculateBattleResult(filtered[0], summit, potions) };
    }

    // Quest boosting for alive-only path
    if (config.questMode && config.questFilters.length > 0) {
      filtered = applyQuestBoost(filtered, dead, summit, config, attackPotionsEnabled);
    }

    return filtered;
  }

  // Cost-aware selection with revives
  let reviveBudget = config.revivePotionMax - config.revivePotionsUsed;
  const attackBudget = attackPotionsEnabled
    ? config.attackPotionMax - config.attackPotionsUsed
    : 0;

  // Revive potions are ~10x more expensive than attack potions in practice.
  // Weight revive cost accordingly so the algorithm prefers cheap revive + attack potions
  // over expensive revive alone.
  const REVIVE_WEIGHT = 10;

  interface Candidate {
    beast: Beast;
    damage: number;
    reviveCost: number;
    attackPotions: number;
    weightedCost: number; // reviveCost * REVIVE_WEIGHT + attackPotions
  }

  const buildCandidate = (beast: Beast, reviveCost: number): Candidate => {
    const baseDamage = beast.combat?.estimatedDamage ?? 0;
    let bestDamage = baseDamage;
    let bestPotions = 0;

    if (attackPotionsEnabled && attackBudget > 0) {
      const maxPotions = Math.min(attackBudget, config.attackPotionMaxPerBeast, 255);
      const potions = calculateOptimalAttackPotions([beast, 1, 0], summit, maxPotions);
      if (potions > 0) {
        const boostedCombat = calculateBattleResult(beast, summit, potions);
        if (boostedCombat.estimatedDamage > bestDamage) {
          bestDamage = boostedCombat.estimatedDamage;
          bestPotions = potions;
        }
      }
    }

    return {
      beast,
      damage: bestDamage,
      reviveCost,
      attackPotions: bestPotions,
      weightedCost: reviveCost * REVIVE_WEIGHT + bestPotions,
    };
  };

  const candidates: Candidate[] = [];

  for (const beast of alive) {
    candidates.push(buildCandidate(beast, 0));
  }

  for (const beast of dead) {
    const reviveCost = beast.revival_count + 1;
    if (reviveCost > reviveBudget || reviveCost > config.revivePotionMaxPerBeast) continue;
    candidates.push(buildCandidate(beast, reviveCost));
  }

  // Compute the summit damage threshold to inform selection.
  // In "guaranteed" mode the autopilot requires totalEstimatedDamage >= summitHealth * 1.1.
  const summitHealth = ((summit.beast.health + summit.beast.bonus_health) * summit.beast.extra_lives)
    + Math.max(1, summit.beast.current_health || 0);

  // The minimum damage a beast must deal to be worth considering for the first slot.
  // Any beast above this threshold can contribute to taking the summit.
  const damageThreshold = summitHealth * 1.1;

  // Quest-aware sorting: if quest mode is on, beasts that can pass the threshold AND
  // satisfy a quest get a boost. This way a free alive beast that needs "Summit Conqueror"
  // sorts ahead of an expensive revived beast when both can take the summit.
  const questActive = config.questMode && questPredicates.length > 0;

  candidates.sort((a, b) => {
    const aCanSolo = a.damage >= damageThreshold;
    const bCanSolo = b.damage >= damageThreshold;
    const aFree = a.reviveCost === 0;
    const bFree = b.reviveCost === 0;

    if (aCanSolo && bCanSolo) {
      // Both can solo — prefer alive over revive first
      if (aFree && !bFree) return -1;
      if (bFree && !aFree) return 1;
      // Same cost tier — prefer quest beasts
      if (questActive) {
        const aQuest = needsAnyQuest(a.beast);
        const bQuest = needsAnyQuest(b.beast);
        if (aQuest && !bQuest) return -1;
        if (bQuest && !aQuest) return 1;
        if (aQuest && bQuest && hasUrgencyQuest) {
          const aUrg = questUrgencyScore(a.beast, config.questFilters);
          const bUrg = questUrgencyScore(b.beast, config.questFilters);
          if (aUrg !== bUrg) return bUrg - aUrg;
        }
      }
      if (a.weightedCost !== b.weightedCost) return a.weightedCost - b.weightedCost;
      return b.damage - a.damage;
    }

    // One can solo, one can't — prefer the one that can solo
    if (aCanSolo && !bCanSolo) return -1;
    if (bCanSolo && !aCanSolo) return 1;

    // Neither can solo — alive quest beasts always before dead quest beasts
    if (questActive) {
      const aQuest = needsAnyQuest(a.beast);
      const bQuest = needsAnyQuest(b.beast);
      if (aQuest && bQuest) {
        // Both need quests — alive first, then urgency, then damage
        if (aFree && !bFree) return -1;
        if (bFree && !aFree) return 1;
        if (hasUrgencyQuest) {
          const aUrg = questUrgencyScore(a.beast, config.questFilters);
          const bUrg = questUrgencyScore(b.beast, config.questFilters);
          if (aUrg !== bUrg) return bUrg - aUrg;
        }
        return b.damage - a.damage;
      }
      // One needs quest, one doesn't — prefer quest beast if damage is at least 50%
      if (aQuest && !bQuest && a.damage >= b.damage * 0.5) return -1;
      if (bQuest && !aQuest && b.damage >= a.damage * 0.5) return 1;
    }

    // Same quest status — prefer alive at similar damage
    const maxDmg = Math.max(a.damage, b.damage);
    const minDmg = Math.min(a.damage, b.damage);
    if (maxDmg > 0 && minDmg / maxDmg >= 0.8) {
      if (aFree && !bFree) return -1;
      if (bFree && !aFree) return 1;
      if (a.weightedCost !== b.weightedCost) return a.weightedCost - b.weightedCost;
    }
    return b.damage - a.damage;
  });

  const maxBeasts = config.maxBeasts ?? Infinity;
  const selected: Beast[] = [];
  let usedAttackBudget = 0;

  for (const candidate of candidates) {
    if (selected.length >= maxBeasts) break;
    if (candidate.reviveCost > reviveBudget) continue;
    if (candidate.attackPotions > attackBudget - usedAttackBudget) {
      // Try without attack potions
      candidate.attackPotions = 0;
      candidate.damage = candidate.beast.combat?.estimatedDamage ?? 0;
    }

    reviveBudget -= candidate.reviveCost;
    usedAttackBudget += candidate.attackPotions;

    const beastCopy = { ...candidate.beast };
    if (candidate.attackPotions > 0) {
      beastCopy.combat = calculateBattleResult(beastCopy, summit, candidate.attackPotions);
    }
    selected.push(beastCopy);
  }

  return selected;
}

export function questNeedsPredicate(quest: string): ((beast: Beast) => boolean) | null {
  switch (quest) {
    case 'attack_summit': return (b) => b.bonus_xp === 0;
    case 'max_attack_streak': return (b) => !b.max_attack_streak;
    case 'take_summit': return (b) => !b.captured_summit;
    case 'hold_summit_10s': return (b) => b.summit_held_seconds < 10;
    case 'level_up_3': return (b) => b.current_level - b.level < 3;
    case 'level_up_5': return (b) => b.current_level - b.level < 5;
    case 'level_up_10': return (b) => b.current_level - b.level < 10;
    case 'revival_potion': return (b) => !b.used_revival_potion;
    case 'attack_potion': return (b) => !b.used_attack_potion;
    default: return null;
  }
}

// Streak resets after 2 × BASE_REVIVAL_TIME_SECONDS (48h) since last death.
const STREAK_RESET_SECONDS = 86400 * 2;

/**
 * Score 0-100 for how urgently a beast needs to attack to preserve/complete its streak.
 *  - Progress component (0-50): higher streak = more to lose and closer to completing the quest.
 *  - Time pressure component (0-50): increases as the 48h reset window runs out.
 * Returns 0 for beasts that have already completed the quest or have no active streak.
 */
export function streakUrgencyScore(beast: Beast): number {
  if (beast.max_attack_streak) return 0; // quest already done
  if (beast.attack_streak === 0) return 0; // no progress to lose

  const now = Date.now() / 1000;
  const timeUntilReset = (beast.last_death_timestamp + STREAK_RESET_SECONDS) - now;

  if (timeUntilReset <= 0) return 0; // streak already reset

  // Progress: 0-50 based on how close to streak 10
  const progressScore = (beast.attack_streak / 10) * 50;

  // Time pressure: 0-50, increases as deadline approaches
  const timeScore = Math.max(0, 1 - timeUntilReset / STREAK_RESET_SECONDS) * 50;

  return progressScore + timeScore;
}

/**
 * Score 0-100 for how urgently a beast needs levels.
 * Lower bonus levels = higher urgency (more room to grow).
 */
export function levelUrgencyScore(beast: Beast, targetLevels: number): number {
  const bonusLevels = beast.current_level - beast.level;
  if (bonusLevels >= targetLevels) return 0;
  // Invert: 0 bonus levels = 100, close to target = low score
  return ((targetLevels - bonusLevels) / targetLevels) * 100;
}

/**
 * Aggregate urgency score across active quest filters.
 * Streak quests have time-sensitive urgency; level quests prioritize lower-level beasts.
 */
export function questUrgencyScore(beast: Beast, questFilters: string[]): number {
  let maxScore = 0;
  for (const quest of questFilters) {
    if (quest === 'max_attack_streak') {
      maxScore = Math.max(maxScore, streakUrgencyScore(beast));
    } else if (quest === 'level_up_3') {
      maxScore = Math.max(maxScore, levelUrgencyScore(beast, 3));
    } else if (quest === 'level_up_5') {
      maxScore = Math.max(maxScore, levelUrgencyScore(beast, 5));
    } else if (quest === 'level_up_10') {
      maxScore = Math.max(maxScore, levelUrgencyScore(beast, 10));
    }
  }
  return maxScore;
}

function applyQuestBoost(
  selected: Beast[],
  deadPool: Beast[],
  summit: Summit,
  config: SelectOptimalBeastsConfig,
  attackPotionsEnabled: boolean,
): Beast[] {
  const result = [...selected];
  const selectedIds = new Set(result.map((b) => b.token_id));

  for (const quest of config.questFilters) {
    const needsQuest = questNeedsPredicate(quest);
    if (!needsQuest) continue;

    if (quest === 'revival_potion') {
      // Special: include a dead beast that hasn't used revival potion
      if (config.useRevivePotions) {
        const alreadyIncluded = result.some((b) => needsQuest(b) && b.current_health === 0);
        if (!alreadyIncluded) {
          const reviveBudget = config.revivePotionMax - config.revivePotionsUsed;
          const questCandidate = deadPool.find(
            (b) => needsQuest(b) && !selectedIds.has(b.token_id) && (b.revival_count + 1) <= reviveBudget && (b.revival_count + 1) <= config.revivePotionMaxPerBeast
          );
          if (questCandidate) {
            const beastCopy = { ...questCandidate };
            beastCopy.combat = calculateBattleResult(beastCopy, summit, 0);
            if ((beastCopy.combat?.estimatedDamage ?? 0) > 0) {
              result.push(beastCopy);
              selectedIds.add(beastCopy.token_id);
            }
          }
        }
      }
    } else if (quest === 'attack_potion') {
      // Special: ensure at least one beast gets attack potions
      if (attackPotionsEnabled) {
        const hasAttackPotions = result.some((b) => (b.combat?.attackPotions ?? 0) > 0);
        if (!hasAttackPotions) {
          const questBeast = result.find((b) => needsQuest(b));
          if (questBeast) {
            const maxPotions = Math.min(config.attackPotionMax - config.attackPotionsUsed, config.attackPotionMaxPerBeast, 255);
            if (maxPotions > 0) {
              const idx = result.indexOf(questBeast);
              const boosted = { ...questBeast };
              boosted.combat = calculateBattleResult(boosted, summit, Math.min(1, maxPotions));
              result[idx] = boosted;
            }
          }
        }
      }
    } else {
      // Generic: ensure at least one beast needing this quest is included
      const alreadyIncluded = result.some(needsQuest);
      if (alreadyIncluded) continue;

      // Try to swap in a viable beast from outside the selection
      // For now, the quest boost is best-effort — beasts are already sorted by efficiency,
      // so if none in the selection need this quest, the remaining beasts likely all completed it.
    }
  }

  return result;
}
