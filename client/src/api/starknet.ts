import { useDynamicConnector } from "@/contexts/starknet";
import { Summit } from "@/types/game";
import { getBeastCurrentLevel, getBeastDetails } from "@/utils/beasts";
import { logger } from "@/utils/logger";
import { parseBalances } from "@/utils/utils";
import { useAccount } from "@starknet-react/core";

/**
 * Validates that the summit RPC response has the expected format.
 */
function isValidSummitResponse(data: unknown): data is { result: string[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'result' in data &&
    Array.isArray((data as { result: unknown }).result) &&
    (data as { result: string[] }).result.length >= 26
  );
}

export const useStarknetApi = () => {
  const { currentNetworkConfig } = useDynamicConnector();
  const { address } = useAccount();

  const getTokenBalances = async (tokens: any[]): Promise<Record<string, number>> => {
    const calls = tokens.map((token, i) => ({
      id: i + 1,
      jsonrpc: "2.0",
      method: "starknet_call",
      params: [
        {
          contract_address: token.address,
          entry_point_selector: "0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e",
          calldata: [address]
        },
        "latest"
      ]
    }));

    const response = await fetch(currentNetworkConfig.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calls),
    });

    const data = await response.json();

    return parseBalances(data || [], tokens);
  }

  const getSummitData = async (): Promise<Summit | null> => {
    try {
      const response = await fetch(currentNetworkConfig.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "starknet_call",
          params: [
            {
              contract_address: import.meta.env.VITE_PUBLIC_SUMMIT_ADDRESS,
              entry_point_selector: "0x00fcd0b0b7e39516dcbf65e688512d37b784f66a37624adad7349669bd7db496",
              calldata: [],
            },
            "latest",
          ],
          id: 0,
        }),
      });

      if (!response.ok) {
        logger.error('Summit RPC request failed:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      // Validate response format
      if (!isValidSummitResponse(data)) {
        logger.error('Invalid summit response format:', data);
        return null;
      }

      const result = data.result;
      const beast = {
        id: parseInt(result[0], 16),
        prefix: parseInt(result[1], 16),
        suffix: parseInt(result[2], 16),
        level: parseInt(result[3], 16),
        health: parseInt(result[4], 16),
        shiny: parseInt(result[5], 16),
        animated: parseInt(result[6], 16),
        token_id: parseInt(result[7], 16),
        current_health: parseInt(result[8], 16),
        bonus_health: parseInt(result[9], 16),
        bonus_xp: parseInt(result[10], 16),
        attack_streak: parseInt(result[11], 16),
        last_death_timestamp: parseInt(result[12], 16),
        revival_count: parseInt(result[13], 16),
        extra_lives: parseInt(result[14], 16),
        has_claimed_potions: Boolean(parseInt(result[15], 16)),
        blocks_held: parseInt(result[16], 16),
        stats: {
          spirit: parseInt(result[17], 16),
          luck: parseInt(result[18], 16),
          specials: Boolean(parseInt(result[19], 16)),
          wisdom: Boolean(parseInt(result[20], 16)),
          diplomacy: Boolean(parseInt(result[21], 16)),
        },
        kills_claimed: 0,
        current_level: 0, // Will be calculated below
      };
      beast.current_level = getBeastCurrentLevel(beast.level, beast.bonus_xp);

      return {
        beast: {
          ...beast,
          ...getBeastDetails(beast.id, beast.prefix, beast.suffix, beast.current_level),
          revival_time: 0,
        },
        taken_at: parseInt(result[22], 16),
        owner: result[23],
        poison_count: parseInt(result[24], 16),
        poison_timestamp: parseInt(result[25], 16),
      };
    } catch (error) {
      logger.error('Error fetching summit data:', error);
      return null;
    }
  }

  const getCurrentBlock = async (): Promise<number> => {
    try {
      const response = await fetch(currentNetworkConfig.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "starknet_blockNumber",
          params: [],
          id: 0,
        }),
      });

      if (!response.ok) {
        logger.error('Block number request failed:', response.status);
        return 0;
      }

      const data = await response.json();
      return data?.result || 0;
    } catch (error) {
      logger.error('Error fetching block number:', error);
      return 0;
    }
  }

  return {
    getSummitData,
    getTokenBalances,
    getCurrentBlock,
  }
}