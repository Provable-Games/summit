import { defineConfig } from "apibara/config";

export default defineConfig({
  runtimeConfig: {
    summit: {
      // Summit game contract address (mainnet)
      summitContractAddress: "0x0214d382e80781f8c1059a751563d6b46e717c652bb670bf230e8a64a68e6064",
      // Beasts NFT contract address (mainnet)
      beastsContractAddress: "0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4",
      // Dojo World contract address (Loot Survivor mainnet)
      dojoWorldAddress: "0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a",
      // EntityStats dungeon filter (Beast dungeon)
      entityStatsDungeon: "0x0000000000000000000000000000000000000000000000000000000000000006",
      // CollectableEntity dungeon filter (Loot Survivor dungeon)
      collectableEntityDungeon: "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42",
      // Corpse contract address (mainnet)
      corpseContractAddress: "0x0103eafe79f8631932530cc687dfcdeb013c883a82619ebf81be393e2953a87a",
      // Skull contract address (mainnet)
      skullContractAddress: "0x01c3c8284d7eed443b42f47e764032a56eaf50a9079d67993b633930e3689814",
      // Consumable ERC20 token addresses (mainnet) - from client/src/utils/networkConfig.ts
      xlifeTokenAddress: "0x016dea82a6588ca9fb7200125fa05631b1c1735a313e24afe9c90301e441a796",
      attackTokenAddress: "0x016f9def00daef9f1874dd932b081096f50aec2fe61df31a81bc5707a7522443",
      reviveTokenAddress: "0x029023e0a455d19d6887bc13727356070089527b79e6feb562ffe1afd6711dbe",
      poisonTokenAddress: "0x049eaed2a1ba2f2eb6ac2661ffd2d79231cdd7d5293d9448df49c5986c9897ae",
      // Mainnet DNA stream URL
      streamUrl: process.env.STREAM_URL,
      // Starting block - use earliest block needed for Dojo events
      startingBlock: "6866000",
      // PostgreSQL connection string
      databaseUrl: process.env.DATABASE_URL,
      // RPC URL for fetching beast metadata
      rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10",
    },
  },
});
