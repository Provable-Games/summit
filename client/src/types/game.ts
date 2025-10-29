export interface Summit {
  beast: Beast;
  taken_at: number;
  owner: string;
}

export interface Leaderboard {
  owner: string;
  amount: number;
}

export interface Beast {
  id: number;
  name: string;
  prefix: string;
  suffix: string;
  power: number;
  tier: number;
  type: string;
  level: number;
  health: number;
  shiny: number;
  animated: number;
  token_id: number;
  current_health: number;
  bonus_health: number;
  current_level: number;
  bonus_xp: number;
  attack_streak: number;
  last_death_timestamp: number;
  revival_count: number;
  revival_time: number;
  extra_lives: number;
  has_claimed_starter_kit: boolean;
  rewards_earned: number;
  stats: Stats;
  rank?: number;
  last_dm_death_timestamp?: number;
  adventurers_killed?: number;
  combat?: Combat;
  battle?: BattleEvent;
}

export interface Stats {
  spirit: boolean;
  luck: boolean;
  specials: boolean;
}
export interface Combat {
  attack: number;
  defense: number;
  attackCritDamage: number;
  defenseCritDamage: number;
  score: number;
  estimatedDamage: number;
}

export interface Adventurer {
  id: number;
  name: string;
  level: number;
  metadata: any;
  soulbound: boolean;
}

export interface AppliedPotions {
  revive: number;
  attack: number;
  extraLife: number;
}

export interface GameAction {
  type: string;
  beastId?: number;
  beastIds?: number[];
  adventurerIds?: number[];
  appliedPotions?: AppliedPotions;
  safeAttack?: boolean;
  vrf?: boolean;
  upgrades?: { [beastId: number]: Stats }
}

export interface BattleEvent {
  attacking_beast_owner: string | null;
  attacking_beast_token_id: number;
  defending_beast_token_id: number;
  attack_count: number;
  attack_damage: number;
  critical_attack_count: number;
  critical_attack_damage: number;
  counter_attack_count: number;
  counter_attack_damage: number;
  critical_counter_attack_count: number;
  critical_counter_attack_damage: number;
  attack_potions: number;
  xp_gained: number;
}

import { NETWORKS } from '@/utils/networkConfig';
import { HistoricalToriiQueryBuilder } from '@dojoengine/sdk';

export class GameQueryBuilder extends HistoricalToriiQueryBuilder<any> { }

export const getEntityModel = (entity: any, modelName: string) => {
  let namespace = NETWORKS.SN_MAIN.namespace
  return entity?.models[`${namespace}`]?.[modelName]
};