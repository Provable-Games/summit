import { useDynamicConnector } from "@/contexts/starknet";
import { addAddressPadding } from "starknet";

export const useGameTokens = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const getValidAdventurers = async (owner: string) => {
    let namespace = "relayer_0_0_1"

    let q = `
      SELECT o.token_id, tm.minted_by, tm.id, tm.game_over, ce.adventurer_id, s.score
      FROM '${namespace}-TokenMetadataUpdate' tm
      LEFT JOIN '${namespace}-TokenScoreUpdate' s on s.id = tm.id
      LEFT JOIN '${namespace}-OwnersUpdate' o ON o.token_id = tm.id
      LEFT JOIN '${namespace}-MinterRegistryUpdate' mr ON mr.id = tm.minted_by
      LEFT JOIN '${currentNetworkConfig.namespace}-CorpseEvent' ce ON ce.adventurer_id = tm.id
      WHERE o.owner = "${addAddressPadding(owner.toLowerCase())}"
      AND mr.minter_address = "${addAddressPadding(currentNetworkConfig.dungeon)}"
      AND tm.game_over = 1
      AND ce.adventurer_id IS NULL
    `
    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    let data = await sql.json()
    return data.map((row: any) => ({
      token_id: parseInt(row.token_id, 16),
      score: parseInt(row.score, 16),
    }))
  }

  return {
    getValidAdventurers,
  };
};
