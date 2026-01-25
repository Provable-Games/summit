/**
 * Summit REST API Client
 */

import { useDynamicConnector } from "@/contexts/starknet";
import { Beast } from "@/types/game";
import { BEAST_TIERS, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";

export interface TopBeast {
  token_id: number;
  blocks_held: number;
  bonus_xp: number;
  last_death_timestamp: number;
  owner: string | null;
  beast_name: string;
  prefix: string;
  suffix: string;
  full_name: string;
}

export interface TopBeastsResponse {
  data: TopBeast[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface DiplomacyBeast {
  token_id: number;
  beast_id: number;
  name: string;
  prefix: string;
  suffix: string;
  full_name: string;
  level: number;
  current_level: number;
  health: number;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  blocks_held: number;
  spirit: number;
  luck: number;
  owner: string | null;
}

interface RawDiplomacyBeast {
  token_id: number;
  beast_id: number;
  prefix: number;
  suffix: number;
  level: number;
  bonus_xp: number;
}

export interface DiplomacyGroup {
  prefix: number;
  suffix: number;
  prefixName: string;
  suffixName: string;
  fullName: string;
  count: number;
  totalPower: number;
}

export const useSummitApi = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  /**
   * Get all beasts owned by a player
   */
  const getBeastsByOwner = async (owner: string): Promise<Beast[]> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/beasts/${owner}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch beasts for owner ${owner}: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get beast counts (total vs alive)
   */
  const getBeastCounts = async (): Promise<{ total: number; alive: number; dead: number }> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/beasts/stats/counts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch beast counts: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get rewards leaderboard
   */
  const getLeaderboard = async (): Promise<{ owner: string; amount: number }[]> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/leaderboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get top 5000 cutoff values
   */
  const getTop5000Cutoff = async (): Promise<{ blocks_held: number; bonus_xp: number; last_death_timestamp: number }> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/beasts/stats/top5000-cutoff`);
    if (!response.ok) {
      throw new Error(`Failed to fetch top 5000 cutoff: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get paginated top beasts by blocks_held
   */
  const getTopBeasts = async (limit: number = 25, offset: number = 0): Promise<TopBeastsResponse> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/beasts/stats/top?limit=${limit}&offset=${offset}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch top beasts: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get beasts with diplomacy unlocked matching prefix/suffix
   */
  const getDiplomacy = async (prefix: number, suffix: number): Promise<DiplomacyBeast[]> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/diplomacy?prefix=${prefix}&suffix=${suffix}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch diplomacy beasts: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get diplomacy leaderboard grouped by prefix/suffix with total power
   */
  const getDiplomacyLeaderboard = async (): Promise<DiplomacyGroup[]> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/diplomacy/all`);
    if (!response.ok) {
      throw new Error(`Failed to fetch diplomacy beasts: ${response.status}`);
    }
    const beasts: RawDiplomacyBeast[] = await response.json();

    const groups = new Map<string, DiplomacyGroup>();

    for (const beast of beasts) {
      const key = `${beast.prefix}-${beast.suffix}`;
      const tier = BEAST_TIERS[beast.beast_id as keyof typeof BEAST_TIERS] ?? 5;
      const power = (6 - tier) * beast.level;

      let group = groups.get(key);
      if (!group) {
        const prefixName = ITEM_NAME_PREFIXES[beast.prefix as keyof typeof ITEM_NAME_PREFIXES] ?? "";
        const suffixName = ITEM_NAME_SUFFIXES[beast.suffix as keyof typeof ITEM_NAME_SUFFIXES] ?? "";
        group = {
          prefix: beast.prefix,
          suffix: beast.suffix,
          prefixName,
          suffixName,
          fullName: `${prefixName} ${suffixName}`,
          count: 0,
          totalPower: 0,
        };
        groups.set(key, group);
      }

      group.count++;
      group.totalPower += power;
    }

    return Array.from(groups.values()).sort((a, b) => b.totalPower - a.totalPower);
  };

  return {
    getBeastsByOwner,
    getBeastCounts,
    getLeaderboard,
    getTop5000Cutoff,
    getTopBeasts,
    getDiplomacy,
    getDiplomacyLeaderboard,
  };
};
