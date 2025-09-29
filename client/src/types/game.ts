export interface Summit {
  beast: Beast;
  taken_at: number;
  lost_at: number;
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
  last_death_timestamp: number;
  num_deaths: number;
  last_killed_by: number;
  revival_count: number;
  extra_lives: number;
  has_claimed_starter_kit: boolean;
  rewards_earned: number;
  combat?: Combat;
}

export interface Combat {
  capture: boolean;
  damage: number;
  healthLeft: number;
  attack_potions: number;
}

export interface Adventurer {
  id: number;
  level: number;
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
}
