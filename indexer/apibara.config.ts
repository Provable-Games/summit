import { defineConfig } from "apibara/config";

export default defineConfig({
  runtimeConfig: {
    summit: {
      // Summit game contract address (mainnet)
      summitContractAddress: "0x0784e5bac3de23ad40cf73e61c7b559dafb2495136ca474d1603815bb223408c",
      // Beasts NFT contract address (mainnet)
      beastsContractAddress: "0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4",
      // Dojo World contract address (Loot Survivor mainnet)
      dojoWorldAddress: "0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a",
      // EntityStats dungeon filter (Beast dungeon)
      entityStatsDungeon: "0x0000000000000000000000000000000000000000000000000000000000000006",
      // CollectableEntity dungeon filter (Loot Survivor dungeon)
      collectableEntityDungeon: "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42",
      // Corpse contract address (mainnet)
      corpseContractAddress: "0x07789e427db2c690c9089e9d11298f99db6eadbb0bcf931a77f9d0c4d13254e2",
      // Skull contract address (mainnet)
      skullContractAddress: "0x05c2a56002a95c5c1dd5cc44055bcad05c59778274482cee58b074adeb9dd738",
      // Mainnet DNA stream URL
      streamUrl: process.env.STREAM_URL,
      // Starting block - use earliest block needed for Dojo events
      startingBlock: "2209828",
      // PostgreSQL connection string
      databaseUrl: process.env.DATABASE_URL,
      // RPC URL for fetching beast metadata
      rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10",
    },
  },
});
