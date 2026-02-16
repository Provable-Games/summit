import { useDynamicConnector } from "@/contexts/starknet";
import type { Summit } from "@/types/game";
import { getBeastCurrentLevel, getBeastDetails } from "@/utils/beasts";
import { parseBalances } from "@/utils/utils";
import { useAccount } from "@starknet-react/core";

const hexToFlag = (hex: string | undefined): boolean => parseInt(hex || "0x0", 16) === 1;
const parseHex = (hex: string | undefined): number => parseInt(hex || "0x0", 16);

type RpcToken = {
  name: string;
  address: string;
  displayDecimals: number;
  decimals?: number;
};

export const useStarknetApi = () => {
  const { currentNetworkConfig } = useDynamicConnector();
  const { address } = useAccount();

  const getTokenBalances = async (tokens: RpcToken[]): Promise<Record<string, number>> => {
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

      const data = await response.json() as { result?: string[] };
      const result = data?.result;
      if (!Array.isArray(result) || result.length < 31) return null;

      const beast = {
        id: parseHex(result[0]),
        prefix: parseHex(result[1]),
        suffix: parseHex(result[2]),
        level: parseHex(result[3]),
        health: parseHex(result[4]),
        shiny: parseHex(result[5]),
        animated: parseHex(result[6]),
        token_id: parseHex(result[7]),
        current_health: parseHex(result[8]),
        bonus_health: parseHex(result[9]),
        bonus_xp: parseHex(result[10]),
        attack_streak: parseHex(result[11]),
        last_death_timestamp: parseHex(result[12]),
        revival_count: parseHex(result[13]),
        extra_lives: parseHex(result[14]),
        summit_held_seconds: parseHex(result[15]),
        spirit: parseHex(result[16]),
        luck: parseHex(result[17]),
        specials: hexToFlag(result[18]),
        wisdom: hexToFlag(result[19]),
        diplomacy: hexToFlag(result[20]),
        rewards_earned: parseHex(result[21]),
        rewards_claimed: parseHex(result[22]),
        captured_summit: hexToFlag(result[23]),
        used_revival_potion: hexToFlag(result[24]),
        used_attack_potion: hexToFlag(result[25]),
        max_attack_streak: hexToFlag(result[26]),
        kills_claimed: 0,
      }
      const current_level = getBeastCurrentLevel(beast.level, beast.bonus_xp);
      
      return {
        beast: {
          ...beast,
          ...getBeastDetails(beast.id, beast.prefix, beast.suffix, current_level),
          current_level,
          revival_time: 0,
        },
        block_timestamp: parseHex(result[27]),
        owner: result[28] || "",
        poison_count: parseHex(result[29]),
        poison_timestamp: parseHex(result[30]),
      }
    } catch (error) {
      console.log('error', error)
    }

    return null;
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

      const data = await response.json();
      return data?.result || 0;
    } catch (error) {
      console.log('error fetching block number', error);
      return 0;
    }
  }

  return {
    getSummitData,
    getTokenBalances,
    getCurrentBlock,
  }
}
