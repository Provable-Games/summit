export interface Summit {
  beast: Beast;
  taken_at: number;
  owner: string;
  poison_count: number;
  poison_timestamp: number;
  diplomacy?: Diplomacy;
}

export interface Diplomacy {
  specials_hash: string;
  bonus: number;
  total_power: number;
  beast_token_ids: number[];
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
  has_claimed_potions: boolean;
  blocks_held: number;
  stats: Stats;
  kills_claimed: number;
  entity_hash?: string;
  specials_hash?: string;
  rank?: number;
  last_dm_death_timestamp?: number;
  adventurers_killed?: number;
  last_killed_by?: number;
  combat?: Combat;
  battle?: BattleEvent;
}

export interface Stats {
  spirit: number; // 0-100
  luck: number; // 0-100
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
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


export type selection = [Beast, number, number][];
export interface GameAction {
  type: string;
  pauseUpdates?: boolean;
  beasts?: selection;
  beastId?: number;
  beastIds?: number[];
  adventurerIds?: number[];
  safeAttack?: boolean;
  vrf?: boolean;
  stats?: Stats;
  count?: number;
  bonusHealth?: number;
  killTokens?: number;
  corpseTokens?: number;
  extraLifePotions?: number;
}

export interface BattleEvent {
  attacking_beast_token_id: number;
  attacking_beast_owner: string | null;
  attacking_beast_id: number;
  attacking_beast_shiny: number;
  attacking_beast_animated: number;
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

export interface PoisonEvent {
  beast_token_id: number;
  block_timestamp: number;
  count: number;
  player: string | null;
}

export interface DiplomacyEvent {
  beast_token_id: number;
  specials_hash: string;
  power: number;
  owner: string | null;
}

import { NETWORKS } from '@/utils/networkConfig';
import { HistoricalToriiQueryBuilder } from '@dojoengine/sdk';

export class GameQueryBuilder extends HistoricalToriiQueryBuilder<any> { }

export const getEntityModel = (entity: any, modelName: string) => {
  let namespace = NETWORKS.SN_MAIN.namespace
  return entity?.models[`${namespace}`]?.[modelName]
};

export const getDeathMountainModel = (entity: any, modelName: string) => {
  let namespace = "ls_0_0_9"
  return entity?.models[`${namespace}`]?.[modelName]
};