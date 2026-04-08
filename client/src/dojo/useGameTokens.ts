import { useDynamicConnector } from "@/contexts/starknet";
import { addAddressPadding } from "starknet";
import { useCallback, useMemo } from "react";

export interface ValidAdventurer {
  token_id: number;
  score: number;
}

interface ValidAdventurerRow {
  token_id: string;
  score: string;
}

export const useGameTokens = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const getValidAdventurers = useCallback(async (owner?: string): Promise<ValidAdventurer[]> => {
    if (!owner) {
      return [];
    }

    const namespace = "relayer_0_0_1"

    // Step 1: Query Torii for all game-over tokens owned by this player
    const q = `
      SELECT o.token_id, tm.minted_by, tm.id, tm.game_over, s.score
      FROM '${namespace}-TokenMetadataUpdate' tm
      LEFT JOIN '${namespace}-TokenScoreUpdate' s on s.id = tm.id
      LEFT JOIN '${namespace}-OwnersUpdate' o ON o.token_id = tm.id
      LEFT JOIN '${namespace}-MinterRegistryUpdate' mr ON mr.id = tm.minted_by
      WHERE o.owner = "${addAddressPadding(owner.toLowerCase())}"
      AND mr.minter_address = "${addAddressPadding(currentNetworkConfig.dungeon)}"
      AND tm.game_over = 1
    `
    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sqlResponse = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    const data = await sqlResponse.json() as ValidAdventurerRow[]

    if (data.length === 0) {
      return [];
    }

    // Step 2: Batch-check which IDs have been claimed (by anyone)
    const adventurerIds = data.map((row) => parseInt(row.token_id, 16));
    const claimedResponse = await fetch(
      `${currentNetworkConfig.apiUrl}/adventurers/claimed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: adventurerIds }),
      }
    );
    const claimedData = await claimedResponse.json();
    const claimedSet = new Set(
      (claimedData.claimed_ids as string[]).map((id: string) => Number(id))
    );

    // Step 3: Filter out claimed adventurers
    return data
      .filter((row) => !claimedSet.has(parseInt(row.token_id, 16)))
      .map((row) => ({
        token_id: parseInt(row.token_id, 16),
        score: parseInt(row.score, 16),
      }));
  }, [currentNetworkConfig.apiUrl, currentNetworkConfig.dungeon, currentNetworkConfig.toriiUrl])

  return useMemo(() => ({
    getValidAdventurers,
  }), [getValidAdventurers]);
};
