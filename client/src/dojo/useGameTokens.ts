import { useDynamicConnector } from "@/contexts/starknet";
import { addAddressPadding } from "starknet";
import { useCallback, useMemo } from "react";

export interface ValidAdventurer {
  // felt252 decimal string — exceeds Number.MAX_SAFE_INTEGER
  token_id: string;
  score: number;
  player_name?: string;
}

interface ClaimableResponse {
  adventurers?: Array<{ id: string; score: number; player_name?: string }>;
}

export const useGameTokens = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const getValidAdventurers = useCallback(async (owner?: string): Promise<ValidAdventurer[]> => {
    if (!owner) {
      return [];
    }

    const url = `${currentNetworkConfig.apiUrl}/adventurers/claimable?owner=${encodeURIComponent(addAddressPadding(owner.toLowerCase()))}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return [];
    }

    const body = (await response.json()) as ClaimableResponse;
    return (body.adventurers ?? []).map((a) => ({
      token_id: a.id,
      score: a.score,
      player_name: a.player_name,
    }));
  }, [currentNetworkConfig.apiUrl])

  return useMemo(() => ({
    getValidAdventurers,
  }), [getValidAdventurers]);
};
