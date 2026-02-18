export interface TokenConfig {
  name: string;
  address: string;
  displayDecimals: number;
  decimals?: number;
  symbol?: string;
}

export interface NetworkTokenConfig {
  erc20: TokenConfig[];
}

export interface NetworkConfig {
  chainId: ChainId;
  slot: string;
  preset: string;
  policies: Record<string, unknown> | undefined;
  rpcUrl: string;
  toriiUrl: string;
  apiUrl: string;
  wsUrl: string;
  chains: Array<{
    rpcUrl: string;
  }>;
  tokens: NetworkTokenConfig;
  denshokan: string;
  ekuboRouter: string;
  ekuboPositions: string;
  beasts: string;
  dungeon: string;
  paymentTokens: TokenConfig[];
}

export enum ChainId {
  SN_MAIN = "SN_MAIN",
  SN_SEPOLIA = "SN_SEPOLIA",
  WP_PG_SLOT = "WP_PG_SLOT",
}

export const TOKEN_ADDRESS = {
  ATTACK: "0x016f9def00daef9f1874dd932b081096f50aec2fe61df31a81bc5707a7522443",
  REVIVE: "0x029023e0a455d19d6887bc13727356070089527b79e6feb562ffe1afd6711dbe",
  EXTRA_LIFE: "0x016dea82a6588ca9fb7200125fa05631b1c1735a313e24afe9c90301e441a796",
  POISON: "0x049eaed2a1bA2F2Eb6Ac2661ffd2d79231CdD7d5293D9448Df49c5986C9897aE",
  SKULL: "0x01c3c8284d7eed443b42f47e764032a56eaf50a9079d67993b633930e3689814",
  CORPSE: "0x0103eafe79f8631932530cc687dfcdeb013c883a82619ebf81be393e2953a87a",
  SURVIVOR: "0x042DD777885AD2C116be96d4D634abC90A26A790ffB5871E037Dd5Ae7d2Ec86B",
  STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  USDC: "0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb",
}

export const NETWORKS = {
  SN_MAIN: {
    chainId: ChainId.SN_MAIN,
    slot: "pg-summit-1",
    rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9",
    torii: "https://api.cartridge.gg/x/pg-mainnet-10/torii",
    apiUrl: "https://summit-production-69ed.up.railway.app",
    wsUrl: "wss://summit-production-69ed.up.railway.app/ws",
    tokens: {
      erc20: [
        {
          name: "SURVIVOR",
          address: TOKEN_ADDRESS.SURVIVOR,
          displayDecimals: 0,
        },
        {
          name: "STRK",
          address: TOKEN_ADDRESS.STRK,
          displayDecimals: 2,
        },
        {
          name: "USDC",
          address: TOKEN_ADDRESS.USDC,
          displayDecimals: 2,
          decimals: 6,
        },
        {
          name: "ATTACK",
          address: TOKEN_ADDRESS.ATTACK,
          displayDecimals: 0,
        },
        {
          name: "REVIVE",
          address: TOKEN_ADDRESS.REVIVE,
          displayDecimals: 0,
        },
        {
          name: "EXTRA LIFE",
          address: TOKEN_ADDRESS.EXTRA_LIFE,
          displayDecimals: 0,
        },
        {
          name: "POISON",
          address: TOKEN_ADDRESS.POISON,
          displayDecimals: 0,
        },
        {
          name: "SKULL",
          address: TOKEN_ADDRESS.SKULL,
          displayDecimals: 0,
        },
        {
          name: "CORPSE",
          address: TOKEN_ADDRESS.CORPSE,
          displayDecimals: 0,
        }
      ],
    },
    denshokan:
      "0x036017e69d21d6d8c13e266eabb73ef1f1d02722d86bdcabe5f168f8e549d3cd",
    dungeon:
      "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42",
    beasts:
      "0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4",
    ekuboRouter:
      "0x04505a9f06f2bd639b6601f37a4dc0908bb70e8e0e0c34b1220827d64f4fc066",
    ekuboPositions:
      "0x02e0af29598b407c8716b17f6d2795eca1b471413fa03fb145a5e33722184067",
    paymentTokens: [
      {
        name: "SURVIVOR",
        address: TOKEN_ADDRESS.SURVIVOR,
        displayDecimals: 0,
      },
      {
        name: "STRK",
        address: TOKEN_ADDRESS.STRK,
        displayDecimals: 2,
      },
      {
        name: "USDC",
        address: TOKEN_ADDRESS.USDC,
        displayDecimals: 2,
        decimals: 6,
      },
      {
        name: "ATTACK",
        address: TOKEN_ADDRESS.ATTACK,
        displayDecimals: 0,
      },
      {
        name: "REVIVE",
        address: TOKEN_ADDRESS.REVIVE,
        displayDecimals: 0,
      },
      {
        name: "EXTRA LIFE",
        address: TOKEN_ADDRESS.EXTRA_LIFE,
        displayDecimals: 0,
      },
      {
        name: "POISON",
        address: TOKEN_ADDRESS.POISON,
        displayDecimals: 0,
      },
      {
        name: "SKULL",
        address: TOKEN_ADDRESS.SKULL,
        displayDecimals: 0,
      },
      {
        name: "CORPSE",
        address: TOKEN_ADDRESS.CORPSE,
        displayDecimals: 0,
      },
    ],
  },
};

export function getNetworkConfig(networkKey: ChainId): NetworkConfig {
  const network = NETWORKS[networkKey as keyof typeof NETWORKS];
  if (!network) throw new Error(`Network ${networkKey} not found`);

  const SUMMIT_ADDRESS = import.meta.env.VITE_PUBLIC_SUMMIT_ADDRESS

  const policies = {
    "contracts": {
      [SUMMIT_ADDRESS]: {
        "name": "Summit Game",
        "description": "Main game contract for Summit gameplay",
        "methods": [
          {
            "name": "Attack",
            "description": "Attack the Summit",
            "entrypoint": "attack"
          },
          {
            "name": "Attack Unsafe",
            "description": "Attack the Summit without safety checks",
            "entrypoint": "attack_unsafe"
          },
          {
            "name": "Feed",
            "description": "Feed beast dead adventurers",
            "entrypoint": "feed"
          },
          {
            "name": "Claim Quest Reward",
            "description": "Claim quest rewards",
            "entrypoint": "claim_quest_rewards"
          },
          {
            "name": "Claim Beast Reward",
            "description": "Claim beast rewards",
            "entrypoint": "claim_rewards"
          },
          {
            "name": "Add Extra Life",
            "description": "Add extra life to beast",
            "entrypoint": "add_extra_life"
          },
          {
            "name": "Apply Stat Points",
            "description": "Apply stat points to beast",
            "entrypoint": "apply_stat_points"
          },
          {
            "name": "Apply Poison",
            "description": "Apply poison to beast",
            "entrypoint": "apply_poison"
          },
        ]
      },
      [TOKEN_ADDRESS.ATTACK]: {
        "name": "Attack Potion",
        "description": "ERC 20 token for Attack Potion",
        "methods": [
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Attack Potion",
            "entrypoint": "approve"
          },
        ]
      },
      [TOKEN_ADDRESS.REVIVE]: {
        "name": "Revive Potion",
        "description": "ERC 20 token for Revive Potion",
        "methods": [
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Revive Potion",
            "entrypoint": "approve"
          },
        ]
      },
      [TOKEN_ADDRESS.EXTRA_LIFE]: {
        "name": "Extra Life Potion",
        "description": "ERC 20 token for Extra Life Potion",
        "methods": [
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Extra Life Potion",
            "entrypoint": "approve"
          },
        ]
      },
      [TOKEN_ADDRESS.POISON]: {
        "name": "Poison Potion",
        "description": "ERC 20 token for Poison Potion",
        "methods": [
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Poison Potion",
            "entrypoint": "approve"
          },
        ]
      },
      [TOKEN_ADDRESS.SKULL]: {
        "name": "Skull Token",
        "description": "ERC 20 token for Skull Token",
        "methods": [
          {
            "name": "Claim Skulls",
            "description": "Claim skulls",
            "entrypoint": "claim"
          },
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Skull Token",
            "entrypoint": "approve"
          },
        ]
      },
      [TOKEN_ADDRESS.CORPSE]: {
        "name": "Corpse Token",
        "description": "ERC 20 token for Corpse Token",
        "methods": [
          {
            "name": "Claim Corpses",
            "description": "Claim corpses",
            "entrypoint": "claim"
          },
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Corpse Token",
            "entrypoint": "approve"
          },
        ]
      },
      "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f": {
        "name": "Cartridge VRF Provider",
        "description": "Verifiable Random Function contract, allows randomness in the game",
        "methods": [
          {
            "name": "Request Random",
            "description": "Allows requesting random numbers from the VRF provider",
            "entrypoint": "request_random"
          }
        ]
      },
    }
  };

  return {
    chainId: network.chainId,
    slot: network.slot,
    preset: "savage-summit",
    policies: policies,
    rpcUrl: network.rpcUrl,
    toriiUrl: network.torii,
    apiUrl: network.apiUrl,
    wsUrl: network.wsUrl,
    chains: [{ rpcUrl: network.rpcUrl }],
    tokens: network.tokens,
    denshokan: network.denshokan,
    ekuboRouter: network.ekuboRouter,
    ekuboPositions: network.ekuboPositions,
    beasts: network.beasts,
    dungeon: network.dungeon,
    paymentTokens: network.paymentTokens,
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
