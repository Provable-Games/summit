import { defineConfig } from "apibara/config";

export default defineConfig({
  runtimeConfig: {
    summit: {
      // Summit contract address (mainnet)
      contractAddress: (process.env.CONTRACT_ADDRESS ?? "0x06015596D10cBc6DD695a964827eEe290d3487ffFCF60d02264b81524Dd275E4").trim(),
      // Mainnet DNA stream URL
      streamUrl: (process.env.STREAM_URL ?? "https://mainnet.starknet.a5a.ch").trim(),
      // Starting block - Summit deployment block
      startingBlock: (process.env.STARTING_BLOCK ?? "2125240").trim(),
      // PostgreSQL connection string
      databaseUrl: (process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/summit").trim(),
    },
  },
});
