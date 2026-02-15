export interface Summit {
  beast: Beast;
  block_timestamp: number;
  owner: string;
  poison_count: number;
  poison_timestamp: number;
  diplomacy?: Diplomacy;
}

export interface DiplomacyBeast {
  token_id: number;
  owner: string | null;
  name: string;
  prefix: string;
  suffix: string;
  level: number;
  current_level: number;
  power: number;
}

export interface Diplomacy {
  beasts: DiplomacyBeast[];
  totalPower: number;
  bonus: number;
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
  captured_summit: boolean;
  used_revival_potion: boolean;
  used_attack_potion: boolean;
  max_attack_streak: boolean;
  summit_held_seconds: number;
  spirit: number;
  luck: number;
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
  kills_claimed: number;
  rewards_earned: number;
  rewards_claimed: number;
  quest_rewards_claimed?: number;
  entity_hash?: string;
  rank?: number;
  last_dm_death_timestamp?: number;
  adventurers_killed?: number;
  last_killed_by?: number;
  combat?: Combat;
  battle?: BattleEvent;
  owner?: string;
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
  attackPotions?: number;
}

export interface Adventurer {
  id: number;
  name: string;
  level: number;
  metadata: unknown;
  soulbound: boolean;
}


export type selection = [Beast, number, number][];

interface BaseGameAction {
  pauseUpdates?: boolean;
}

export type AttackGameAction = BaseGameAction & {
  type: "attack";
  beasts: selection;
  safeAttack: boolean;
  vrf: boolean;
  extraLifePotions: number;
  attackPotions?: number;
  revivePotions?: number;
};

export type AttackUntilCaptureGameAction = BaseGameAction & {
  type: "attack_until_capture";
  beasts: selection;
  extraLifePotions: number;
};

export type ClaimCorpseRewardGameAction = BaseGameAction & {
  type: "claim_corpse_reward";
  adventurerIds: number[];
};

export type ClaimSkullRewardGameAction = BaseGameAction & {
  type: "claim_skull_reward";
  beastIds: number[];
};

export type ClaimQuestRewardGameAction = BaseGameAction & {
  type: "claim_quest_reward";
  beastIds: number[];
};

export type ClaimSummitRewardGameAction = BaseGameAction & {
  type: "claim_summit_reward";
  beastIds: number[];
};

export type AddExtraLifeGameAction = BaseGameAction & {
  type: "add_extra_life";
  beastId: number;
  extraLifePotions: number;
};

export type UpgradeBeastGameAction = BaseGameAction & {
  type: "upgrade_beast";
  beastId: number;
  stats: Stats;
  bonusHealth: number;
  killTokens: number;
  corpseTokens: number;
};

export type ApplyPoisonGameAction = BaseGameAction & {
  type: "apply_poison";
  beastId: number;
  count: number;
};

export type GameAction =
  | AttackGameAction
  | AttackUntilCaptureGameAction
  | ClaimCorpseRewardGameAction
  | ClaimSkullRewardGameAction
  | ClaimQuestRewardGameAction
  | ClaimSummitRewardGameAction
  | AddExtraLifeGameAction
  | UpgradeBeastGameAction
  | ApplyPoisonGameAction;

// BattleEvent matches Cairo struct - used for transaction event parsing
export interface BattleEvent {
  attacking_beast_token_id: number;
  attack_index: number;
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
  revive_potions: number;
  xp_gained: number;
}

// SpectatorBattleEvent - enriched data from WebSocket/summit_log for spectator view
export interface SpectatorBattleEvent extends BattleEvent {
  attacking_beast_owner: string | null;
  attacking_beast_id: number;
  attacking_beast_shiny: number;
  attacking_beast_animated: number;
  beast_count: number;
  total_damage: number;
}

export interface PoisonEvent {
  beast_token_id: number;
  block_timestamp: number;
  count: number;
  player: string | null;
}

export interface DiplomacyEvent {
  beast_token_id: number;
  power: number;
  owner: string | null;
}
