import { defineConfig } from "apibara/config";
import { summitRuntimeConfig } from "./src/lib/config.js";

export default defineConfig({
  runtimeConfig: {
    summit: summitRuntimeConfig,
  },
});
