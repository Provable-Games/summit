/**
 * Summit REST API Client Hook
 * Provides typed methods for interacting with the Summit API
 */

import { useDynamicConnector } from "@/contexts/starknet";

// Response types matching the API schema
export interface BeastResponse {
  id: number;
  tokenId: number;
  currentHealth: number;
  bonusHealth: number;
  bonusXp: number;
  attackStreak: number;
  lastDeathTimestamp: string;
  revivalCount: number;
  extraLives: number;
  hasClaimedPotions: number;
  blocksHeld: number;
  spirit: number;
  luck: number;
  specials: number;
  wisdom: number;
  diplomacy: number;
  rewardsEarned: number;
  rewardsClaimed: number;
  createdAt: string;
  indexedAt: string;
  insertedAt: string | null;
  updatedAt: string | null;
  blockNumber: string;
  transactionHash: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface GetBeastsParams {
  limit?: number;
  offset?: number;
  sortBy?: "blocks_held" | "current_health" | "rewards_earned" | "updated_at";
  sortOrder?: "asc" | "desc";
}

export interface SummitResponse {
  id: number;
  beastTokenId: number;
  beastId: number;
  beastPrefix: number;
  beastSuffix: number;
  beastLevel: number;
  beastHealth: number;
  beastShiny: number;
  beastAnimated: number;
  tokenId: number;
  currentHealth: number;
  bonusHealth: number;
  bonusXp: number;
  attackStreak: number;
  lastDeathTimestamp: string;
  revivalCount: number;
  extraLives: number;
  hasClaimedPotions: number;
  blocksHeld: number;
  spirit: number;
  luck: number;
  specials: number;
  wisdom: number;
  diplomacyStat: number;
  rewardsEarned: number;
  rewardsClaimed: number;
  owner: string;
  createdAt: string;
  indexedAt: string;
  insertedAt: string | null;
  blockNumber: string;
  transactionHash: string;
  eventIndex: number;
}

export interface BattleResponse {
  id: number;
  attackingBeastTokenId: number;
  attackIndex: number;
  defendingBeastTokenId: number;
  attackCount: number;
  attackDamage: number;
  criticalAttackCount: number;
  criticalAttackDamage: number;
  counterAttackCount: number;
  counterAttackDamage: number;
  criticalCounterAttackCount: number;
  criticalCounterAttackDamage: number;
  attackPotions: number;
  xpGained: number;
  createdAt: string;
  indexedAt: string;
  insertedAt: string | null;
  blockNumber: string;
  transactionHash: string;
  eventIndex: number;
}

export interface SkullEventResponse {
  id: string;
  beastTokenId: number;
  skulls: string;
  createdAt: string;
  indexedAt: string;
  insertedAt: string | null;
  blockNumber: string;
  transactionHash: string;
  eventIndex: number;
}

export const useSummitApi = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  /**
   * Get beasts with pagination and sorting
   */
  const getBeasts = async (
    params: GetBeastsParams = {}
  ): Promise<PaginatedResponse<BeastResponse>> => {
    const url = new URL(`${currentNetworkConfig.apiUrl}/beasts`);

    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }
    if (params.sortBy) {
      url.searchParams.set("sortBy", params.sortBy);
    }
    if (params.sortOrder) {
      url.searchParams.set("sortOrder", params.sortOrder);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch beasts: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get a single beast by token ID
   */
  const getBeast = async (tokenId: number): Promise<BeastResponse> => {
    const response = await fetch(
      `${currentNetworkConfig.apiUrl}/beasts/${tokenId}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch beast ${tokenId}: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get beast leaderboard
   */
  const getBeastLeaderboard = async (
    limit: number = 10
  ): Promise<{ data: (BeastResponse & { rank: number })[] }> => {
    const response = await fetch(
      `${currentNetworkConfig.apiUrl}/beasts/leaderboard?limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get battles with pagination
   */
  const getBattles = async (params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<PaginatedResponse<BattleResponse>> => {
    const url = new URL(`${currentNetworkConfig.apiUrl}/battles`);

    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch battles: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get battles for a specific beast
   */
  const getBattlesByBeast = async (
    tokenId: number,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<BattleResponse>> => {
    const url = new URL(
      `${currentNetworkConfig.apiUrl}/battles/beast/${tokenId}`
    );

    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(
        `Failed to fetch battles for beast ${tokenId}: ${response.status}`
      );
    }
    return response.json();
  };

  /**
   * Get current summit holder
   */
  const getCurrentSummit = async (): Promise<SummitResponse> => {
    const response = await fetch(
      `${currentNetworkConfig.apiUrl}/summit/current`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch current summit: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get summit history with pagination
   */
  const getSummitHistory = async (params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<PaginatedResponse<SummitResponse>> => {
    const url = new URL(`${currentNetworkConfig.apiUrl}/summit/history`);

    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch summit history: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get summit history for a specific beast
   */
  const getSummitByBeast = async (
    tokenId: number,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<SummitResponse>> => {
    const url = new URL(
      `${currentNetworkConfig.apiUrl}/summit/beast/${tokenId}`
    );

    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(
        `Failed to fetch summit history for beast ${tokenId}: ${response.status}`
      );
    }
    return response.json();
  };

  /**
   * Get summit history for a specific owner
   */
  const getSummitByOwner = async (
    address: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<SummitResponse>> => {
    const url = new URL(
      `${currentNetworkConfig.apiUrl}/summit/owner/${address}`
    );

    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(
        `Failed to fetch summit history for owner ${address}: ${response.status}`
      );
    }
    return response.json();
  };

  /**
   * Get battle statistics
   */
  const getBattleStats = async (): Promise<{
    activeBeasts24h: number;
    totalBattles: number;
  }> => {
    const response = await fetch(
      `${currentNetworkConfig.apiUrl}/battles/stats`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch battle stats: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get rewards leaderboard
   */
  const getRewardsLeaderboard = async (
    limit: number = 100
  ): Promise<{
    data: { rank: number; owner: string; amount: number }[];
  }> => {
    const response = await fetch(
      `${currentNetworkConfig.apiUrl}/rewards/leaderboard?limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch rewards leaderboard: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get diplomacy group by specials hash
   */
  const getDiplomacy = async (
    specialsHash: string
  ): Promise<{
    specials_hash: string;
    total_power: number;
    beast_token_ids: number[];
  }> => {
    const response = await fetch(
      `${currentNetworkConfig.apiUrl}/diplomacy/${specialsHash}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch diplomacy: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get multiple beasts by token IDs (bulk fetch)
   */
  const getBeastsBulk = async (
    tokenIds: number[]
  ): Promise<{ data: BeastResponse[] }> => {
    const response = await fetch(
      `${currentNetworkConfig.apiUrl}/beasts/bulk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenIds }),
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch beasts bulk: ${response.status}`);
    }
    return response.json();
  };

  /**
   * Get skull events for multiple beasts (bulk fetch)
   */
  const getSkullsBulk = async (
    tokenIds: number[]
  ): Promise<{ data: SkullEventResponse[] }> => {
    const response = await fetch(
      `${currentNetworkConfig.apiUrl}/events/skull/bulk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenIds }),
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch skulls bulk: ${response.status}`);
    }
    return response.json();
  };

  return {
    getBeasts,
    getBeast,
    getBeastsBulk,
    getBeastLeaderboard,
    getBattles,
    getBattlesByBeast,
    getBattleStats,
    getCurrentSummit,
    getSummitHistory,
    getSummitByBeast,
    getSummitByOwner,
    getRewardsLeaderboard,
    getDiplomacy,
    getSkullsBulk,
  };
};
