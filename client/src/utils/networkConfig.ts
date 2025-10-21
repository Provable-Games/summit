import manifest_mainnet from "../../manifest.json";

export interface NetworkConfig {
  chainId: ChainId;
  namespace: string;
  manifest: any;
  slot: string;
  preset: string;
  policies:
  | Array<{
    target: string;
    method: string;
  }>
  | undefined;
  rpcUrl: string;
  toriiUrl: string;
  subscriptionUrl: string;
  chains: Array<{
    rpcUrl: string;
  }>;
  tokens: any;
  denshokan: string;
  ekuboRouter: string;
  beasts: string;
  dungeon: string;
}

export enum ChainId {
  SN_MAIN = "SN_MAIN",
  SN_SEPOLIA = "SN_SEPOLIA",
  WP_PG_SLOT = "WP_PG_SLOT",
}

export const NETWORKS = {
  SN_MAIN: {
    chainId: ChainId.SN_MAIN,
    namespace: "summit_0_0_5_preview",
    manifest: manifest_mainnet,
    slot: "pg-mainnet-8",
    rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9",
    torii: "https://api.cartridge.gg/x/pg-mainnet-8/torii",
    subscriptionUrl: "https://api.cartridge.gg/x/summit/torii",
    tokens: {
      erc20: [
        {
          name: "SURVIVOR",
          address:
            "0x07c7fe4ef54a91f030b668d7de1a5eacaba2bc6f970fdab436d3a29228de830b",
          displayDecimals: 0,
        },
        {
          name: "ATTACK",
          address:
            "0x07c7fe4ef54a91f030b668d7de1a5eacaba2bc6f970fdab436d3a29228de830b",
          displayDecimals: 0,
        },
        {
          name: "REVIVE",
          address:
            "0x068292fdfa280f371fabd1d6e49c346f11b341e1d3fe80d4ac320648ab03539c",
          displayDecimals: 0,
        },
        {
          name: "EXTRA LIFE",
          address:
            "0x0793f1104a3b0d2316abc92039421f7160a7f4caad0ed405b6f8732271717328",
          displayDecimals: 0,
        },
      ],
    },
    denshokan:
      "0x036017e69d21d6d8c13e266eabb73ef1f1d02722d86bdcabe5f168f8e549d3cd",
    dungeon:
      "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42",
    beasts:
      "0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4",
    ekuboRouter:
      "0x0199741822c2dc722f6f605204f35e56dbc23bceed54818168c4c49e4fb8737e",
  },
};

export function getNetworkConfig(networkKey: ChainId): NetworkConfig {
  const network = NETWORKS[networkKey as keyof typeof NETWORKS];
  if (!network) throw new Error(`Network ${networkKey} not found`);

  const policies = undefined;

  return {
    chainId: network.chainId,
    namespace: network.namespace,
    manifest: network.manifest,
    slot: network.slot,
    preset: "savage-summit",
    policies,
    rpcUrl: network.rpcUrl,
    toriiUrl: network.torii,
    subscriptionUrl: network.subscriptionUrl,
    chains: [{ rpcUrl: network.rpcUrl }],
    tokens: network.tokens,
    denshokan: network.denshokan,
    ekuboRouter: network.ekuboRouter,
    beasts: network.beasts,
    dungeon: network.dungeon,
  };
}

export function translateName(network: string): ChainId | null {
  network = network.toLowerCase();

  if (network === "mainnet") {
    return ChainId.SN_MAIN;
  } else if (network === "sepolia") {
    return ChainId.SN_SEPOLIA;
  } else if (network === "katana") {
    return ChainId.WP_PG_SLOT;
  }

  return null;
}
