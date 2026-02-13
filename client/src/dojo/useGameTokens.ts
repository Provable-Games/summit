import { useDynamicConnector } from "@/contexts/starknet";
import { addAddressPadding } from "starknet";

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

  const getValidAdventurers = async (owner: string): Promise<ValidAdventurer[]> => {
    const namespace = "relayer_0_0_1"

    // Fetch adventurer_ids that already have corpse events from the API
    const corpseResponse = await fetch(`${currentNetworkConfig.apiUrl}/adventurers/${owner}`);
    const corpseData = await corpseResponse.json();
    const claimedAdventurerIds: string[] = corpseData.adventurer_ids || [];

    // Find the maximum claimed adventurer_id and filter token_id > max
    let greaterThanClause = "";
    if (claimedAdventurerIds.length > 0) {
      const maxClaimedId = claimedAdventurerIds.reduce(
        (max, id) => BigInt(id) > max ? BigInt(id) : max,
        BigInt(0)
      );
      const maxHex = '0x' + maxClaimedId.toString(16).padStart(16, '0');
      greaterThanClause = `AND tm.id > "${maxHex}"`;
    }

    const q = `
      SELECT o.token_id, tm.minted_by, tm.id, tm.game_over, s.score
      FROM '${namespace}-TokenMetadataUpdate' tm
      LEFT JOIN '${namespace}-TokenScoreUpdate' s on s.id = tm.id
      LEFT JOIN '${namespace}-OwnersUpdate' o ON o.token_id = tm.id
      LEFT JOIN '${namespace}-MinterRegistryUpdate' mr ON mr.id = tm.minted_by
      WHERE o.owner = "${addAddressPadding(owner.toLowerCase())}"
      AND mr.minter_address = "${addAddressPadding(currentNetworkConfig.dungeon)}"
      AND tm.game_over = 1
      ${greaterThanClause}
    `
    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    const data = await sql.json() as ValidAdventurerRow[]
    return data.map((row) => ({
      token_id: parseInt(row.token_id, 16),
      score: parseInt(row.score, 16),
    }))
  }

  return {
    getValidAdventurers,
  };
};
