import { defineConfig } from "apibara/config";

export default defineConfig({
  runtimeConfig: {
    summit: {
      // Summit game contract address (mainnet)
      summitContractAddress: (process.env.SUMMIT_CONTRACT_ADDRESS ?? "0x06015596D10cBc6DD695a964827eEe290d3487ffFCF60d02264b81524Dd275E4").trim(),
      // Beasts NFT contract address (mainnet)
      beastsContractAddress: (process.env.BEASTS_CONTRACT_ADDRESS ?? "0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4").trim(),
      // Dojo World contract address (Loot Survivor mainnet)
      dojoWorldAddress: (process.env.DOJO_WORLD_ADDRESS ?? "0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a").trim(),
      // EntityStats dungeon filter (Beast dungeon)
      entityStatsDungeon: (process.env.ENTITY_STATS_DUNGEON ?? "0x0000000000000000000000000000000000000000000000000000000000000006").trim(),
      // CollectableEntity dungeon filter (Loot Survivor dungeon)
      collectableEntityDungeon: (process.env.COLLECTABLE_ENTITY_DUNGEON ?? "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42").trim(),
      // Mainnet DNA stream URL
      streamUrl: (process.env.STREAM_URL ?? "https://mainnet.starknet.a5a.ch").trim(),
      // Starting block - use earliest block needed for Dojo events
      startingBlock: (process.env.STARTING_BLOCK ?? "2021270").trim(),
      // PostgreSQL connection string
      databaseUrl: (process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/summit").trim(),
      // RPC URL for fetching beast metadata
      rpcUrl: (process.env.RPC_URL ?? "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10").trim(),
    },
  },
});
