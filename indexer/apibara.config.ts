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
      // Consumable ERC20 token addresses (mainnet)
      xlifeTokenAddress: "0x06db32714906b760273f33a1f9cfd1a7a3c9a03d9405014f0a9de8dda1f279cb",
      attackTokenAddress: "0x03e2d0ba6993e2662ba7d14f2faf5f60678fd99651db4f93b3994c71e089ee9f",
      reviveTokenAddress: "0x0581959744ccce11c168ce02186e4d9a8221b28a8e8336a5f28b44302aedf2c7",
      poisonTokenAddress: "0x0802c53c6007540e57390eec9b3dde3c370b54d90fff220bb3fd9e1e0d16c68",
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
