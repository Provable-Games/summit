import { useDynamicConnector } from "@/contexts/starknet";
import { Summit } from "@/types/game";
import { getBeastDetails } from "@/utils/beasts";
import { getContractByName } from "@dojoengine/core";
import { useAccount } from "@starknet-react/core";

// Type definitions for the API responses
interface BeastAttribute {
  trait_type: string;
  value: string | number;
}

interface BeastNFT {
  tokenId: string;
  tokenUri: string;
  ownerAddress?: string;
}

interface BeastData {
  id: number;
  [key: string]: string | number;
}

interface AdventurerAttribute {
  trait: string;
  value: string | number;
}

interface AdventurerMetadata {
  attributes: AdventurerAttribute[];
}

interface AdventurerNFT {
  tokenId: string;
  tokenMetadata: string;
}

interface AdventurerData {
  id: number;
  name: string;
  health?: number;
  level?: number;
  rank?: number;
}

interface TokenBalance {
  contractAddress: string;
  balance: string;
}

interface TokenBalancesResponse {
  tokenBalances: TokenBalance[];
}

export interface ERC20Balances {
  revivePotions: number;
  attackPotions: number;
  extraLifePotions: number;
  survivor: number;
}

interface NFTResponse {
  nfts: BeastNFT[] | AdventurerNFT[];
  nextPageKey?: string;
}

interface CollectionResponse {
  totalSupply: number;
}

interface HoldersResponse {
  holders: string[];
}

const BLAST_URL = import.meta.env.VITE_PUBLIC_BLAST_API;

export const useStarknetApi = () => {
  const { currentNetworkConfig } = useDynamicConnector();
  const { address } = useAccount();

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
        num_deaths: parseInt(data?.result[13], 16),
        last_killed_by: parseInt(data?.result[14], 16),
        revival_count: parseInt(data?.result[15], 16),
        extra_lives: parseInt(data?.result[16], 16),
        has_claimed_starter_kit: Boolean(parseInt(data?.result[17], 16)),
        rewards_earned: parseInt(data?.result[18], 16),
      }
      return {
        beast: {
          ...beast,
          ...getBeastDetails(beast.id, beast.prefix, beast.suffix, beast.level),
        },
        taken_at: parseInt(data?.result[21], 16),
        owner: data?.result[23],
      }
    } catch (error) {
      console.log('error', error)
    }

    return null;
  }

  const getBeasts = async (): Promise<BeastData[]> => {
    let env = import.meta.env.VITE_PUBLIC_CHAIN

    if (env === 'mainnet') {
      return getBeastsMainnet()
    }

    return [];
  }

  const getBeastHolders = async (): Promise<string[]> => {
    let url = `${BLAST_URL}/builder/getNFTCollectionHolders?contractAddress=${currentNetworkConfig.beasts}&pageSize=100`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data: HoldersResponse = await response.json();
    return data.holders
  }

  const getTotalBeasts = async (): Promise<number> => {
    let url = `${BLAST_URL}/builder/getNFTCollection?contractAddress=${currentNetworkConfig.beasts}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data: CollectionResponse = await response.json();
    return data.totalSupply
  }

  const getBeastsMainnet = async (): Promise<BeastData[]> => {
    const recursiveFetchBeast = async (beasts: BeastNFT[], nextPageKey: string | null): Promise<BeastNFT[]> => {
      let url = `${BLAST_URL}/builder/getWalletNFTs?contractAddress=${currentNetworkConfig.beasts}&walletAddress=${address}&pageSize=100`

      if (nextPageKey) {
        url += `&pageKey=${nextPageKey}`
      }

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data: NFTResponse = await response.json();
        beasts = beasts.concat(data.nfts as BeastNFT[])

        if (data.nextPageKey) {
          return recursiveFetchBeast(beasts, data.nextPageKey)
        }
      } catch (ex) {
        console.log('error fetching beasts', ex)
        await new Promise(resolve => setTimeout(resolve, 1000));
        return recursiveFetchBeast(beasts, nextPageKey);
      }

      return beasts
    }

    let beasts = await recursiveFetchBeast([], null)

    return beasts.map(beast => {
      const attributesString = beast.tokenUri.match(/"attributes":\[(.*?)\]/)?.[0];
      if (!attributesString) {
        throw new Error('Invalid token URI format');
      }

      const attributesObject = JSON.parse(`{${attributesString}}`).attributes as BeastAttribute[];

      const attributesMap = attributesObject.reduce((acc: Record<string, string | number>, attr: BeastAttribute) => {
        acc[attr.trait_type] = isNaN(Number(attr.value)) ? attr.value : Number(attr.value);
        return acc;
      }, {});

      return {
        id: Number(beast.tokenId),
        ...attributesMap
      }
    })
  };

  const getAdventurers = async (): Promise<AdventurerData[]> => {
    const recursiveFetch = async (adventurers: AdventurerData[], nextPageKey: string | null): Promise<AdventurerData[]> => {
      let url = `${BLAST_URL}/builder/getWalletNFTs?contractAddress=${currentNetworkConfig.denshokan}&walletAddress=${address}&pageSize=100`

      if (nextPageKey) {
        url += `&pageKey=${nextPageKey}`
      }

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data: NFTResponse = await response.json();
        const adventurerNFTs = data.nfts as AdventurerNFT[];
        adventurers = adventurers.concat(adventurerNFTs?.map((adventurer: AdventurerNFT) => {
          const metadata: AdventurerMetadata = JSON.parse(adventurer.tokenMetadata);

          const attributesMap = metadata.attributes.reduce((acc: Record<string, string | number>, attr: AdventurerAttribute) => {
            acc[attr.trait] = isNaN(Number(attr.value)) ? attr.value : Number(attr.value);
            return acc;
          }, {});

          return {
            id: Number(adventurer.tokenId),
            name: attributesMap.Name as string
          }
        }) || [])

        if (data.nextPageKey) {
          return recursiveFetch(adventurers, data.nextPageKey)
        }
      } catch (ex) {
        console.log('error fetching adventurers', ex)
      }

      return adventurers
    }

    let adventurers = await recursiveFetch([], null)
    return adventurers
  }

  const getERC20Balances = async (): Promise<ERC20Balances> => {
    let revivePotions = currentNetworkConfig.tokens.erc20.find(token => token.name === 'REVIVE')?.address
    let attackPotions = currentNetworkConfig.tokens.erc20.find(token => token.name === 'ATTACK')?.address
    let extraLifePotions = currentNetworkConfig.tokens.erc20.find(token => token.name === 'EXTRA LIFE')?.address
    let survivor = currentNetworkConfig.tokens.erc20.find(token => token.name === 'SURVIVOR')?.address

    let url = `${BLAST_URL}/builder/getWalletTokenBalances?walletAddress=${address}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data: TokenBalancesResponse = await response.json();

    return {
      revivePotions: Math.floor(Number(data.tokenBalances.find(balance => balance.contractAddress === revivePotions)?.balance || 0) / 1e18),
      attackPotions: Math.floor(Number(data.tokenBalances.find(balance => balance.contractAddress === attackPotions)?.balance || 0) / 1e18),
      extraLifePotions: Math.floor(Number(data.tokenBalances.find(balance => balance.contractAddress === extraLifePotions)?.balance || 0) / 1e18),
      survivor: Math.floor(Number(data.tokenBalances.find(balance => balance.contractAddress === survivor)?.balance || 0) / 1e18),
    }
  }

  return {
    getSummitData,
    getBeasts,
    getBeastHolders,
    getTotalBeasts,
    getAdventurers,
    getERC20Balances,
  }
}