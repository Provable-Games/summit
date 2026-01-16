#!/usr/bin/env node
/**
 * DNA Server Status Checker
 *
 * Verifies DNA server connectivity before starting the indexer.
 */

import { createAuthenticatedClient } from "@apibara/protocol";
import { StarknetStream } from "@apibara/starknet";

async function checkDnaStatus() {
  const streamUrl = (process.env.STREAM_URL || "https://mainnet.starknet.a5a.ch").trim();
  const startingBlock = BigInt((process.env.STARTING_BLOCK || "2125240").trim());

  console.log(`[DNA Status] Stream: ${streamUrl}`);

  try {
    const client = createAuthenticatedClient(StarknetStream, streamUrl);
    const status = await client.status();

    const serverBlock = status.lastIngested?.orderKey;
    const serverEarliest = status.starting?.orderKey ?? 0n;

    if (serverBlock) {
      const blocksToSync = serverBlock - startingBlock;
      console.log(`[DNA Status] Server block: ${serverBlock}, Starting from: ${startingBlock} (${blocksToSync} to sync)`);

      // Warnings for edge cases
      if (startingBlock < serverEarliest) {
        console.warn(`[DNA Status] WARNING: Starting block ${startingBlock} is before server's earliest (${serverEarliest})`);
      }
      if (startingBlock > serverBlock) {
        console.warn(`[DNA Status] WARNING: Starting block ${startingBlock} is ahead of server (${serverBlock})`);
      }
    } else {
      console.log(`[DNA Status] Server block: unknown, Starting from: ${startingBlock}`);
    }

    console.log("[DNA Status] Ready");
    process.exit(0);
  } catch (error) {
    console.error("[DNA Status] Failed to connect:", error);
    process.exit(1);
  }
}

checkDnaStatus();
