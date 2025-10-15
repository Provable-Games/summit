export interface Summit {
  beast: Beast;
  taken_at: number;
  owner: string;
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
  bonus_xp: number;
  attack_streak: number;
  num_deaths: number;
  last_death_timestamp: number;
  last_killed_by: number;
  revival_count: number;
  extra_lives: number;
  has_claimed_starter_kit: boolean;
  rewards_earned: number;
  rank?: number;
  last_dm_death_timestamp?: number;
  adventurers_killed?: number;
  combat?: Combat;
}

export interface Combat {
  capture: boolean;
  damage: number;
  healthLeft?: number;
  beastDamage?: number;
  summitDamage?: number;
  elemental?: number;
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
}

import { NETWORKS } from '@/utils/networkConfig';
import { HistoricalToriiQueryBuilder } from '@dojoengine/sdk';

export class GameQueryBuilder extends HistoricalToriiQueryBuilder<any> { }

export const getEntityModel = (entity: any, modelName: string) => {
  let namespace = NETWORKS.SN_MAIN.namespace
  return entity?.models[`${namespace}`]?.[modelName]
};