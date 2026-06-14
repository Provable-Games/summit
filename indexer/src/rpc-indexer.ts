import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  StarknetBlockCache,
  streamEvents,
  type EventCursor,
  type NormalizedEvent,
} from "@apibara/starknet-rpc";
import * as schema from "./lib/schema.js";
import { summitRuntimeConfig } from "./lib/config.js";
import { adaptRpcEvent, buildSummitRpcEventFilter, type SummitIndexedEvent } from "./lib/starknet-rpc-events.js";
import {
  collectSummitBlockBatches,
  createSummitProcessorConfig,
  executeBulkInserts,
  resetSummitProcessorCache,
  type ProcessorLogger,
} from "./lib/summit-processor.js";
import {
  loadRpcCursor,
  persistStateSnapshots,
  rollbackFromReorg,
  saveRpcCursor,
} from "./lib/rpc-persistence.js";

interface PendingBlock {
  blockNumber: number;
  events: SummitIndexedEvent[];
  cursor: EventCursor;
}

const logger: ProcessorLogger = {
  debug: (message: string) => console.debug(`[Summit RPC] ${message}`),
  info: (message: string) => console.info(`[Summit RPC] ${message}`),
  warn: (message: string) => console.warn(`[Summit RPC] ${message}`),
  error: (message: string) => console.error(`[Summit RPC] ${message}`),
};

async function main(): Promise<void> {
  const config = summitRuntimeConfig;
  const databaseUrl = requireEnv("DATABASE_URL", config.databaseUrl);
  const starknetRpcUrl = requireEnv("STARKNET_RPC_URL", config.starknetRpcUrl);
  const starknetWsUrl = requireEnv("STARKNET_WS_URL", config.starknetWsUrl);
  const startingBlock = Number(config.startingBlock);

  if (!Number.isInteger(startingBlock) || startingBlock < 0) {
    throw new Error(`STARTING_BLOCK must be a non-negative integer, got ${config.startingBlock}`);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (error) => {
    logger.error(`Pool background connection error: ${error.message}`);
  });

  const db = drizzle(pool, { schema });
  const abortController = new AbortController();
  const shutdown = () => abortController.abort(new Error("RPC indexer shutdown requested"));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  try {
    const cursor = await loadRpcCursor(db);
    const filter = buildSummitRpcEventFilter(config);
    const processorConfig = createSummitProcessorConfig(config);
    const blockCache = new StarknetBlockCache({
      url: starknetRpcUrl,
      signal: abortController.signal,
    });

    logger.info(`HTTP RPC: ${starknetRpcUrl}`);
    logger.info(`WS RPC: ${starknetWsUrl}`);
    logger.info(`Starting block: ${startingBlock}`);
    logger.info(cursor ? `Loaded cursor: ${formatCursor(cursor)}` : "No RPC cursor found");
    logger.info("Finality: ACCEPTED_ON_L2");

    let pending: PendingBlock | undefined;

    const flushPendingBlock = async (): Promise<void> => {
      if (!pending) return;
      const block = pending;
      pending = undefined;
      await persistBlock(db, processorConfig, blockCache, block);
    };

    for await (const message of streamEvents({
      url: starknetRpcUrl,
      wsUrl: starknetWsUrl,
      fromBlock: { block_number: startingBlock },
      cursor,
      addresses: filter.addresses,
      keys: filter.keys,
      finalityStatus: "ACCEPTED_ON_L2",
      signal: abortController.signal,
    })) {
      if (message.type === "reorg") {
        if (pending && pending.blockNumber < message.reorg.startingBlockNumber) {
          await flushPendingBlock();
        } else if (pending) {
          logger.warn(`Discarding buffered block ${pending.blockNumber} because reorg starts at ${message.reorg.startingBlockNumber}`);
          pending = undefined;
        }

        const plan = await rollbackFromReorg(db, message.reorg);
        resetSummitProcessorCache();
        blockCache.invalidateFrom(message.reorg.startingBlockNumber);
        logger.warn(`Handled reorg ${message.reorg.startingBlockNumber}-${message.reorg.endingBlockNumber}; append tables rolled back: ${plan.appendTables.join(", ")}`);
        continue;
      }

      const event = message.event as NormalizedEvent;
      if (!pending) {
        pending = {
          blockNumber: event.blockNumber,
          events: [],
          cursor: message.cursor,
        };
      }

      if (event.blockNumber !== pending.blockNumber) {
        await flushPendingBlock();
        pending = {
          blockNumber: event.blockNumber,
          events: [],
          cursor: message.cursor,
        };
      }

      pending.events.push(adaptRpcEvent(event));
      pending.cursor = message.cursor;
    }

    await flushPendingBlock();
  } finally {
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
    await pool.end();
  }
}

async function persistBlock(
  db: any,
  processorConfig: ReturnType<typeof createSummitProcessorConfig>,
  blockCache: StarknetBlockCache,
  block: PendingBlock,
): Promise<void> {
  const startedAt = Date.now();
  const rpcBlock = await blockCache.getBlockWithTxHashes({ block_number: block.blockNumber });
  if (typeof rpcBlock.timestamp !== "number") {
    throw new Error(`Block ${block.blockNumber} is missing timestamp`);
  }

  const blockTimestamp = new Date(rpcBlock.timestamp * 1000);
  const indexedAt = new Date();
  const { batches, metrics } = await collectSummitBlockBatches(
    db,
    processorConfig,
    logger,
    {
      blockNumber: BigInt(block.blockNumber),
      blockTimestamp,
      indexedAt,
      events: block.events,
    },
  );

  const insertStart = Date.now();
  await db.transaction(async (tx: any) => {
    await persistStateSnapshots(tx, batches, block.cursor);
    await executeBulkInserts(tx, batches);
    await saveRpcCursor(tx, block.cursor);
  });
  const insertTime = Date.now() - insertStart;
  const totalTime = Date.now() - startedAt;

  logger.info(
    `Block ${block.blockNumber}: ${block.events.length} events ${totalTime}ms ` +
      `[scan:${metrics.preScanTime} rpc:${metrics.rpcTime} ctx:${metrics.contextLookupTime}` +
      `(j:${metrics.joinQueryTime} f:${metrics.fallbackQueryTime} bd:${metrics.beastDataQueryTime} ls:${metrics.lsMetadataQueryTime}) ` +
      `proc:${metrics.eventProcessingTime} ins:${insertTime}] ` +
      `{bs:${batches.beast_stats.length} bt:${batches.battles.length} log:${batches.summit_log.length} own:${batches.beast_owners.length} con:${batches.consumables.length}} ` +
      `cursor:${formatCursor(block.cursor)}`,
  );
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function formatCursor(cursor: EventCursor): string {
  return `${cursor.blockNumber}:${cursor.transactionHash}:${cursor.eventIndex}`;
}

main().catch((error) => {
  console.error("[Summit RPC] Fatal error:", error);
  process.exitCode = 1;
});
