import { useDynamicConnector } from "@/contexts/starknet";
import { Summit } from "@/types/game";
import { getBeastCurrentLevel, getBeastDetails } from "@/utils/beasts";
import { parseBalances } from "@/utils/utils";
import { getContractByName } from "@dojoengine/core";
import { useAccount } from "@starknet-react/core";

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

  const getSummitData = async (): Promise<Summit> => {
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
              contract_address: getContractByName(currentNetworkConfig.manifest, currentNetworkConfig.namespace, "summit_systems")?.address,
              entry_point_selector: "0x00fcd0b0b7e39516dcbf65e688512d37b784f66a37624adad7349669bd7db496",
              calldata: [],
            },
            "latest",
          ],
          id: 0,
        }),
      });

      const data = await response.json();
      let beast = {
        id: parseInt(data?.result[0], 16),
        prefix: parseInt(data?.result[1], 16),
        suffix: parseInt(data?.result[2], 16),
        level: parseInt(data?.result[3], 16),
        health: parseInt(data?.result[4], 16),
        shiny: parseInt(data?.result[5], 16),
        animated: parseInt(data?.result[6], 16),
        token_id: parseInt(data?.result[7], 16),
        current_health: parseInt(data?.result[8], 16),
        bonus_health: parseInt(data?.result[9], 16),
        bonus_xp: parseInt(data?.result[10], 16),
        attack_streak: parseInt(data?.result[11], 16),
        last_death_timestamp: parseInt(data?.result[12], 16),
        revival_count: parseInt(data?.result[13], 16),
        extra_lives: parseInt(data?.result[14], 16),
        has_claimed_starter_kit: Boolean(parseInt(data?.result[15], 16)),
        rewards_earned: parseInt(data?.result[16], 16),
        stats: {
          spirit: Boolean(parseInt(data?.result[17], 16)),
          luck: Boolean(parseInt(data?.result[18], 16)),
          specials: Boolean(parseInt(data?.result[19], 16)),
        }
      }
      beast.level = getBeastCurrentLevel(beast.level, beast.bonus_xp);
      return {
        beast: {
          ...beast,
          ...getBeastDetails(beast.id, beast.prefix, beast.suffix, beast.level),
          revival_time: 0,
        },
        taken_at: parseInt(data?.result[22], 16),
        owner: data?.result[23],
      }
    } catch (error) {
      console.log('error', error)
    }

    return null;
  }

  return {
    getSummitData,
    getTokenBalances,
  }
}