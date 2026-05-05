import { defineConfig } from "apibara/config";

export default defineConfig({
  runtimeConfig: {
    summit: {
      // Summit game contract address (mainnet)
      summitContractAddress: "0x01aa95ea66e7e01acf7dc3fda8be0d8661230c4c36b0169e2bab8ab4d6700dfc",
      // Beasts NFT contract address (mainnet)
      beastsContractAddress: "0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4",
      // Collectable contract address (mainnet) - emits CollectableEvent / CollectableStatsEvent
      collectableContractAddress: "0x023f86f5b4702f6ba114b82fb73448c58aad8f37a28b508b80bf129ee1edc405",
      // Corpse contract address (mainnet)
      corpseContractAddress: "0x00c0337454f4dc908da50ca78e9c76b34f6846c39a50e901d2c375b4dd8eaa4d",
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
      startingBlock: "7077225",
      // PostgreSQL connection string
      databaseUrl: process.env.DATABASE_URL,
      // RPC URL for fetching beast metadata
      rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10",
    },
  },
});
