import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import mkcert from "vite-plugin-mkcert";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        wasm(),
        topLevelAwait(),
        mkcert(),
        checker({ typescript: true }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        // Disable source maps in production for faster builds
        sourcemap: false,

        // Use esbuild for faster minification
        minify: "esbuild",

        // Optimize chunk splitting for better caching
        rollupOptions: {
            output: {
                manualChunks: {
                    "vendor-react": ["react", "react-dom", "react-router-dom"],
                    "vendor-mui": ["@mui/material", "@mui/icons-material"],
                    "vendor-starknet": ["starknet", "@starknet-react/core"],
                    "vendor-dojo": [
                        "@dojoengine/core",
                        "@dojoengine/sdk",
                        "@dojoengine/utils",
                    ],
                    "vendor-animation": ["framer-motion", "lottie-react"],
                },
            },
        },
    },
});
