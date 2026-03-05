#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const apiPath = resolve(repoRoot, "api/src/lib/metrics.ts");
const indexerPath = resolve(repoRoot, "indexer/src/lib/metrics.ts");

const apiContents = readFileSync(apiPath, "utf8");
const indexerContents = readFileSync(indexerPath, "utf8");

if (apiContents !== indexerContents) {
  console.error("metrics.ts files are out of sync:");
  console.error(`- ${apiPath}`);
  console.error(`- ${indexerPath}`);
  process.exit(1);
}

console.log("metrics.ts files are in sync.");
