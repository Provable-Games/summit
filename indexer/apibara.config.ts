import { defineConfig } from "apibara/config";

export default defineConfig({
  runtimeConfig: {
    summit: {
      // Summit game contract address (mainnet)
      summitContractAddress: "0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa",
      // Beasts NFT contract address (mainnet)
      beastsContractAddress: "0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4",
      // Dojo World contract address (Loot Survivor mainnet)
      dojoWorldAddress: "0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a",
      // EntityStats dungeon filter (Beast dungeon)
      entityStatsDungeon: "0x0000000000000000000000000000000000000000000000000000000000000006",
      // CollectableEntity dungeon filter (Loot Survivor dungeon)
      collectableEntityDungeon: "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42",
      // Corpse contract address (mainnet)
      corpseContractAddress: "0x01f40a78e8d3e0687e30fc173a28cc62cdf976187f23f778b792a71f16e4482f",
      // Skull contract address (mainnet)
      skullContractAddress: "0x05dff27b8cdef20e537b5a33bf1feb4dbc5fb0ebfcb59e33cd95a075f5eb8916",
      // Mainnet DNA stream URL
      streamUrl: process.env.STREAM_URL,
      // Starting block - use earliest block needed for Dojo events
      startingBlock: "6767900",
      // PostgreSQL connection string
      databaseUrl: process.env.DATABASE_URL,
      // RPC URL for fetching beast metadata
      rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10",
    },
  },
});
