import manifest_mainnet from "../../manifest.json";

export interface NetworkConfig {
  chainId: ChainId;
  namespace: string;
  manifest: any;
  slot: string;
  preset: string;
  policies: | any | undefined;
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
  paymentTokens: any[];
}

export enum ChainId {
  SN_MAIN = "SN_MAIN",
  SN_SEPOLIA = "SN_SEPOLIA",
  WP_PG_SLOT = "WP_PG_SLOT",
}

export const NETWORKS = {
  SN_MAIN: {
    chainId: ChainId.SN_MAIN,
    namespace: "summit_relayer_5",
    manifest: manifest_mainnet,
    slot: "pg-mainnet-10",
    rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9",
    torii: "https://api.cartridge.gg/x/pg-mainnet-10/torii",
    subscriptionUrl: "https://api.cartridge.gg/x/summit-6/torii",
    tokens: {
      erc20: [
        // {
        //   name: "SURVIVOR",
        //   address:
        //     "0x07c7fe4ef54a91f030b668d7de1a5eacaba2bc6f970fdab436d3a29228de830b",
        //   displayDecimals: 0,
        // },
        {
          name: "ATTACK",
          address:
            "0x63eb1e13f9a5e237aa8b4a4b649db577a67641217ab9eb7cbbfd837bc4a11ee",
          displayDecimals: 0,
        },
        {
          name: "REVIVE",
          address:
            "0x2c90c8bfc60cbab2064fcd271039d633c7f30a0544f5727bbb06767d35bd3c0",
          displayDecimals: 0,
        },
        {
          name: "EXTRA LIFE",
          address:
            "0x7fdef6a5d5376d346eb1d830ad28aead5bdc1f02e53c7fb4584a17288f4b20d",
          displayDecimals: 0,
        },
        {
          name: "POISON",
          address:
            "0x7664d9c661c2d794d0d227369821088b21003e8fd9bd8885b39b6a769be4f43",
          displayDecimals: 0,
        },
        {
          name: "SKULL",
          address:
            "0x0168acb060a52a3acdf8b844afaf8172c0709a1469bee07f251d7ea21b1a436a",
          displayDecimals: 0,
        },
        {
          name: "CORPSE",
          address:
            "0x061b9d0477476fb87b84fdb33f7742595fb14352762367c63c45b5dd2207f105",
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
    paymentTokens: [
      {
        name: "TEST USD",
        address:
          "0x03c8559b31a325f9f45ce98f709e8e7c655805c6ca4eecb78ff7761f202acba3",
        displayDecimals: 0,
      },
      {
        name: "ATTACK",
        address:
          "0x63eb1e13f9a5e237aa8b4a4b649db577a67641217ab9eb7cbbfd837bc4a11ee",
        displayDecimals: 0,
      },
      {
        name: "REVIVE",
        address:
          "0x2c90c8bfc60cbab2064fcd271039d633c7f30a0544f5727bbb06767d35bd3c0",
        displayDecimals: 0,
      },
      {
        name: "EXTRA LIFE",
        address:
          "0x7fdef6a5d5376d346eb1d830ad28aead5bdc1f02e53c7fb4584a17288f4b20d",
        displayDecimals: 0,
      },
      {
        name: "POISON",
        address:
          "0x7664d9c661c2d794d0d227369821088b21003e8fd9bd8885b39b6a769be4f43",
        displayDecimals: 0,
      },
      {
        name: "SKULL",
        address:
          "0x0168acb060a52a3acdf8b844afaf8172c0709a1469bee07f251d7ea21b1a436a",
        displayDecimals: 0,
      },
      {
        name: "CORPSE",
        address:
          "0x061b9d0477476fb87b84fdb33f7742595fb14352762367c63c45b5dd2207f105",
        displayDecimals: 0,
      }
      // {
      //   name: "ETH",
      //   address:
      //     "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      //   displayDecimals: 4,
      // },
      // {
      //   name: "STRK",
      //   address:
      //     "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      //   displayDecimals: 2,
      // },
      // {
      //   name: "USDC",
      //   address:
      //     "0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb",
      //   displayDecimals: 2,
      //   decimals: 6,
      // },
      // {
      //   name: "SURVIVOR",
      //   address:
      //     "0x042DD777885AD2C116be96d4D634abC90A26A790ffB5871E037Dd5Ae7d2Ec86B",
      //   displayDecimals: 0,
      // },
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
            "name": "Claim Beast Reward",
            "description": "Claim beast rewards",
            "entrypoint": "claim_beast_reward"
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
          {
            "name": "Claim Summit",
            "description": "Claim summit",
            "entrypoint": "claim_summit"
          },
        ]
      },
      "0x63eb1e13f9a5e237aa8b4a4b649db577a67641217ab9eb7cbbfd837bc4a11ee": {
        "name": "Attack Potion",
        "description": "ERC 20 token for Attack Potion",
        "methods": [
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Attack Potion",
            "entrypoint": "approve"
          }
        ]
      },
      "0x2c90c8bfc60cbab2064fcd271039d633c7f30a0544f5727bbb06767d35bd3c0": {
        "name": "Revive Potion",
        "description": "ERC 20 token for Revive Potion",
        "methods": [
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Revive Potion",
            "entrypoint": "approve"
          }
        ]
      },
      "0x7fdef6a5d5376d346eb1d830ad28aead5bdc1f02e53c7fb4584a17288f4b20d": {
        "name": "Extra Life Potion",
        "description": "ERC 20 token for Extra Life Potion",
        "methods": [
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Extra Life Potion",
            "entrypoint": "approve"
          }
        ]
      },
      "0x7664d9c661c2d794d0d227369821088b21003e8fd9bd8885b39b6a769be4f43": {
        "name": "Poison Potion",
        "description": "ERC 20 token for Poison Potion",
        "methods": [
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Poison Potion",
            "entrypoint": "approve"
          }
        ]
      },
      "0x056747f477c306759134c89ed8fb9c477ca96a229e6c0fd2b44731878f58e66d": {
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
          }
        ]
      },
      "0x0773fc83a286a1a05131012d97c1e5970a930b5862641d750510959a7b8cb290": {
        "name": "Corpse Token",
        "description": "ERC 20 token for Corpse Token",
        "methods": [
          {
            "name": "Claim Corpses",
            "description": "Claim corpses",
            "entrypoint": "claim"
          },
          {
            "name": "Claim Corpse Reward",
            "description": "Claim corpse rewards",
            "entrypoint": "claim_efficient"
          },
          {
            "name": "Approve",
            "amount": "50000000000000000000000",
            "spender": SUMMIT_ADDRESS,
            "description": "Approve Corpse Token",
            "entrypoint": "approve"
          }
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
    namespace: network.namespace,
    manifest: network.manifest,
    slot: network.slot,
    preset: "savage-summit_2",
    policies: policies,
    rpcUrl: network.rpcUrl,
    toriiUrl: network.torii,
    subscriptionUrl: network.subscriptionUrl,
    chains: [{ rpcUrl: network.rpcUrl }],
    tokens: network.tokens,
    denshokan: network.denshokan,
    ekuboRouter: network.ekuboRouter,
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
