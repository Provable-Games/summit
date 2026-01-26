/**
 * Summit REST API Client
 */

import { useDynamicConnector } from "@/contexts/starknet";
import { Beast, DiplomacyBeast } from "@/types/game";
import { BEAST_NAMES, BEAST_TIERS, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";

// Reverse lookup: name -> id
const PREFIX_NAME_TO_ID = Object.fromEntries(
  Object.entries(ITEM_NAME_PREFIXES).map(([id, name]) => [name, parseInt(id)])
);
const SUFFIX_NAME_TO_ID = Object.fromEntries(
  Object.entries(ITEM_NAME_SUFFIXES).map(([id, name]) => [name, parseInt(id)])
);

export interface AllBeast {
  token_id: number;
  beast_id: number;
  prefix: number;
  suffix: number;
  level: number;
  health: number;
  bonus_health: number;
  bonus_xp: number;
  blocks_held: number;
  spirit: number;
  luck: number;
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
  extra_lives: number;
  owner: string | null;
  shiny: number;
  animated: number;
}

export interface AllBeastsResponse {
  data: AllBeast[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface GetAllBeastsParams {
  limit?: number;
  offset?: number;
  prefix?: number;
  suffix?: number;
  name?: string;
  owner?: string;
  sort?: 'power' | 'level' | 'blocks_held';
}

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

export interface LogEntry {
  id: string;
  block_number: string;
  event_index: number;
  category: string;
  sub_category: string;
  data: Record<string, unknown>;
  player: string | null;
  token_id: number | null;
  transaction_hash: string;
  created_at: string;
}

export interface LogsResponse {
  data: LogEntry[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface GetLogsParams {
  limit?: number;
  offset?: number;
  category?: string;
  sub_category?: string;
  player?: string;
}

// Raw response from /diplomacy endpoint
interface RawDiplomacyResponse {
  token_id: number;
  beast_id: number;
  prefix: number;
  suffix: number;
  level: number;
  health: number;
  owner: string | null;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  blocks_held: number;
  spirit: number;
  luck: number;
}

interface RawDiplomacyAllBeast {
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
   * Get paginated list of all beasts with filtering
   */
  const getAllBeasts = async (params: GetAllBeastsParams = {}): Promise<AllBeastsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    if (params.prefix) searchParams.set('prefix', params.prefix.toString());
    if (params.suffix) searchParams.set('suffix', params.suffix.toString());
    if (params.name) searchParams.set('name', params.name);
    if (params.owner) searchParams.set('owner', params.owner);
    if (params.sort) searchParams.set('sort', params.sort);

    const response = await fetch(`${currentNetworkConfig.apiUrl}/beasts/all?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch all beasts: ${response.status}`);
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
   * Accepts either numeric IDs or string names
   */
  const getDiplomacy = async (prefix: number | string, suffix: number | string): Promise<DiplomacyBeast[]> => {
    const prefixId = typeof prefix === "string" ? PREFIX_NAME_TO_ID[prefix] : prefix;
    const suffixId = typeof suffix === "string" ? SUFFIX_NAME_TO_ID[suffix] : suffix;

    if (!prefixId || !suffixId) {
      console.error("[getDiplomacy] Invalid prefix/suffix:", prefix, suffix);
      return [];
    }

    const response = await fetch(`${currentNetworkConfig.apiUrl}/diplomacy?prefix=${prefixId}&suffix=${suffixId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch diplomacy beasts: ${response.status}`);
    }
    const raw: RawDiplomacyResponse[] = await response.json();

    return raw.map(b => {
      const tier = BEAST_TIERS[b.beast_id as keyof typeof BEAST_TIERS] ?? 5;
      const current_level = Math.floor(Math.sqrt(b.bonus_xp + Math.pow(b.level, 2)));
      return {
        token_id: b.token_id,
        owner: b.owner,
        name: BEAST_NAMES[b.beast_id as keyof typeof BEAST_NAMES] ?? "",
        prefix: ITEM_NAME_PREFIXES[b.prefix as keyof typeof ITEM_NAME_PREFIXES] ?? "",
        suffix: ITEM_NAME_SUFFIXES[b.suffix as keyof typeof ITEM_NAME_SUFFIXES] ?? "",
        level: b.level,
        current_level,
        power: (6 - tier) * current_level,
      };
    });
  };

  /**
   * Get diplomacy leaderboard grouped by prefix/suffix with total power
   */
  const getDiplomacyLeaderboard = async (): Promise<DiplomacyGroup[]> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/diplomacy/all`);
    if (!response.ok) {
      throw new Error(`Failed to fetch diplomacy beasts: ${response.status}`);
    }
    const beasts: RawDiplomacyAllBeast[] = await response.json();

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

  /**
   * Get paginated event logs with optional filters
   */
  const getLogs = async (params: GetLogsParams = {}): Promise<LogsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    if (params.category) searchParams.set('category', params.category);
    if (params.sub_category) searchParams.set('sub_category', params.sub_category);
    if (params.player) searchParams.set('player', params.player);

    const response = await fetch(`${currentNetworkConfig.apiUrl}/logs?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }
    return response.json();
  };

  return {
    getBeastsByOwner,
    getAllBeasts,
    getBeastCounts,
    getLeaderboard,
    getTop5000Cutoff,
    getTopBeasts,
    getDiplomacy,
    getDiplomacyLeaderboard,
    getLogs,
  };
};
