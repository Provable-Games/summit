/**
 * Summit Indexer
 *
 * Indexes events from both contracts:
 * 1. Beasts NFT Contract - Transfer events for ownership tracking
 * 2. Summit Game Contract - All game events
 *
 * Beasts NFT Events:
 * - Transfer: Updates beast_owners table, fetches metadata for new tokens
 *
 * Summit Game Events (9 total):
 * - BeastUpdatesEvent: Batch beast stat updates (packed)
 * - LiveBeastStatsEvent: Single beast stat update (packed into felt252)
 * - BattleEvent: Combat results
 * - RewardsEarnedEvent: Token rewards earned
 * - RewardsClaimedEvent: Rewards claimed by player
 * - PoisonEvent: Poison attacks
 * - CorpseEvent: Corpse creation
 * - SkullEvent: Skull claims
 *
 * Architecture Notes:
 * - Single indexer handles both contracts for data consistency
 * - Events processed in order as received from DNA stream
 * - beast_stats table uses upsert (onConflictDoUpdate) for latest state
 * - All other tables use append-only with onConflictDoNothing for idempotency
 */

import { defineIndexer } from "apibara/indexer";
import { useLogger } from "apibara/plugins";
import { StarknetStream } from "@apibara/starknet";
import {
  drizzle,
  drizzleStorage,
  useDrizzleStorage,
} from "@apibara/plugin-drizzle";
import type { ApibaraRuntimeConfig } from "apibara/types";

import { eq, inArray, sql } from "drizzle-orm";
import * as schema from "../src/lib/schema.js";
import {
  EVENT_SELECTORS,
  BEAST_EVENT_SELECTORS,
  DOJO_EVENT_SELECTORS,
  decodeBeastUpdatesEvent,
  decodeLiveBeastStatsEvent,
  decodeBattleEvent,
  decodeRewardsEarnedEvent,
  decodeRewardsClaimedEvent,
  decodePoisonEvent,
  decodeCorpseEvent,
  decodeSkullEvent,
  decodeTransferEvent,
  decodeEntityStatsEvent,
  decodeCollectableEntityEvent,
  computeEntityHash,
  unpackLiveBeastStats,
  feltToHex,
} from "../src/lib/decoder.js";

interface SummitConfig {
  summitContractAddress: string;
  beastsContractAddress: string;
  dojoWorldAddress: string;
  streamUrl: string;
  startingBlock: string;
  databaseUrl: string;
  rpcUrl: string;
}

// In-memory cache to track tokens we've already fetched metadata for
const fetchedTokens = new Set<number>();

// Zero address for burn detection
const ZERO_ADDRESS = "0x0";

// Progress tracking
let lastEventBlock = 0n;
let blocksWithoutEvents = 0;
let lastProgressLog = Date.now();

/**
 * Helper to look up beast owner from beast_owners table
 */
async function getBeastOwner(db: any, token_id: number): Promise<string | null> {
  const result = await db
    .select({ owner: schema.beast_owners.owner })
    .from(schema.beast_owners)
    .where(eq(schema.beast_owners.token_id, token_id))
    .limit(1);
  return result.length > 0 ? result[0].owner : null;
}

/**
 * Beast stats for comparison (used for derived events)
 */
interface BeastStatsSnapshot {
  token_id: number;
  spirit: number;
  luck: number;
  specials: number;
  wisdom: number;
  diplomacy: number;
  bonus_health: number;
  extra_lives: number;
  has_claimed_potions: number;
  current_health?: number;
}

/**
 * Beast metadata for log enrichment
 */
interface BeastMetadata {
  beast_id: number;
  prefix: number;
  suffix: number;
  shiny: number;
  animated: number;
}

/**
 * Log entry data structure
 */
interface LogEntry {
  block_number: bigint;
  event_index: number;
  category: string;
  sub_category: string;
  data: Record<string, unknown>;
  player?: string | null;
  token_id?: number | null;
  transaction_hash: string;
  created_at: Date;
  indexed_at: Date;
}

/**
 * Beast context result combining stats, metadata, and owner in a single query
 */
interface BeastContext {
  prev_stats: BeastStatsSnapshot | null;
  metadata: BeastMetadata | null;
  owner: string | null;
}

/**
 * Batch lookup beast context for multiple token IDs in a single query
 * Returns timing info for logging
 */
async function getBeastContextBatch(
  db: any,
  token_ids: number[],
  logger?: { info: (msg: string) => void }
): Promise<{ result: Map<number, BeastContext>; joinQueryTime: number; fallbackQueryTime: number }> {
  if (token_ids.length === 0) {
    return { result: new Map(), joinQueryTime: 0, fallbackQueryTime: 0 };
  }

  const uniqueIds = [...new Set(token_ids)];
  const resultMap = new Map<number, BeastContext>();

  // Initialize all entries with null values
  for (const id of uniqueIds) {
    resultMap.set(id, { prev_stats: null, metadata: null, owner: null });
  }

  // Batch query: beast_stats LEFT JOIN beasts LEFT JOIN beast_owners
  const joinQueryStart = Date.now();
  const withStatsResult = await db
    .select({
      bs_token_id: schema.beast_stats.token_id,
      bs_spirit: schema.beast_stats.spirit,
      bs_luck: schema.beast_stats.luck,
      bs_specials: schema.beast_stats.specials,
      bs_wisdom: schema.beast_stats.wisdom,
      bs_diplomacy: schema.beast_stats.diplomacy,
      bs_bonus_health: schema.beast_stats.bonus_health,
      bs_extra_lives: schema.beast_stats.extra_lives,
      bs_has_claimed_potions: schema.beast_stats.has_claimed_potions,
      bs_current_health: schema.beast_stats.current_health,
      b_beast_id: schema.beasts.beast_id,
      b_prefix: schema.beasts.prefix,
      b_suffix: schema.beasts.suffix,
      b_shiny: schema.beasts.shiny,
      b_animated: schema.beasts.animated,
      bo_owner: schema.beast_owners.owner,
    })
    .from(schema.beast_stats)
    .leftJoin(schema.beasts, eq(schema.beast_stats.token_id, schema.beasts.token_id))
    .leftJoin(schema.beast_owners, eq(schema.beast_stats.token_id, schema.beast_owners.token_id))
    .where(inArray(schema.beast_stats.token_id, uniqueIds));
  const joinQueryTime = Date.now() - joinQueryStart;

  // Process results from beast_stats query
  const foundInStats = new Set<number>();
  for (const row of withStatsResult) {
    foundInStats.add(row.bs_token_id);
    resultMap.set(row.bs_token_id, {
      prev_stats: {
        token_id: row.bs_token_id,
        spirit: row.bs_spirit,
        luck: row.bs_luck,
        specials: row.bs_specials,
        wisdom: row.bs_wisdom,
        diplomacy: row.bs_diplomacy,
        bonus_health: row.bs_bonus_health,
        extra_lives: row.bs_extra_lives,
        has_claimed_potions: row.bs_has_claimed_potions,
        current_health: row.bs_current_health,
      },
      metadata: row.b_beast_id !== null ? {
        beast_id: row.b_beast_id,
        prefix: row.b_prefix,
        suffix: row.b_suffix,
        shiny: row.b_shiny,
        animated: row.b_animated,
      } : null,
      owner: row.bo_owner ?? null,
    });
  }

  // For tokens not found in beast_stats, query beasts and beast_owners
  let fallbackQueryTime = 0;
  const missingIds = uniqueIds.filter(id => !foundInStats.has(id));
  if (missingIds.length > 0) {
    const fallbackStart = Date.now();
    const [metadataResults, ownerResults] = await Promise.all([
      db.select({
        token_id: schema.beasts.token_id,
        beast_id: schema.beasts.beast_id,
        prefix: schema.beasts.prefix,
        suffix: schema.beasts.suffix,
        shiny: schema.beasts.shiny,
        animated: schema.beasts.animated,
      })
        .from(schema.beasts)
        .where(inArray(schema.beasts.token_id, missingIds)),

      db.select({
        token_id: schema.beast_owners.token_id,
        owner: schema.beast_owners.owner,
      })
        .from(schema.beast_owners)
        .where(inArray(schema.beast_owners.token_id, missingIds)),
    ]);
    fallbackQueryTime = Date.now() - fallbackStart;

    // Build maps for quick lookup with proper types
    type MetadataRow = { token_id: number; beast_id: number; prefix: number; suffix: number; shiny: number; animated: number };
    type OwnerRow = { token_id: number; owner: string };
    const metadataMap = new Map<number, MetadataRow>((metadataResults as MetadataRow[]).map(r => [r.token_id, r]));
    const ownerMap = new Map<number, string>((ownerResults as OwnerRow[]).map(r => [r.token_id, r.owner]));

    for (const id of missingIds) {
      const metadata = metadataMap.get(id);
      resultMap.set(id, {
        prev_stats: null,
        metadata: metadata ? {
          beast_id: metadata.beast_id,
          prefix: metadata.prefix,
          suffix: metadata.suffix,
          shiny: metadata.shiny,
          animated: metadata.animated,
        } : null,
        owner: ownerMap.get(id) ?? null,
      });
    }

    if (logger && fallbackQueryTime > 50) {
      logger.info(`Context fallback: ${missingIds.length} missing IDs in ${fallbackQueryTime}ms`);
    }
  }

  return { result: resultMap, joinQueryTime, fallbackQueryTime };
}

/**
 * Stat upgrade configuration for derived events
 */
const STAT_UPGRADES = [
  { field: "spirit" as const, sub_category: "Spirit" },
  { field: "luck" as const, sub_category: "Luck" },
  { field: "specials" as const, sub_category: "Specials" },
  { field: "wisdom" as const, sub_category: "Wisdom" },
  { field: "diplomacy" as const, sub_category: "Diplomacy" },
  { field: "bonus_health" as const, sub_category: "Bonus Health" },
  { field: "extra_lives" as const, sub_category: "Applied Extra Life" },
] as const;

/**
 * Convert address string to BigInt for comparison
 * This handles any formatting differences (leading zeros, case, etc.)
 */
function addressToBigInt(address: string): bigint {
  return BigInt(address);
}

/**
 * Type definitions for bulk insert batches
 */
type BeastStatsRow = {
  token_id: number;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  attack_streak: number;
  last_death_timestamp: bigint;
  revival_count: number;
  extra_lives: number;
  has_claimed_potions: number;
  summit_held_seconds: number;
  spirit: number;
  luck: number;
  specials: number;
  wisdom: number;
  diplomacy: number;
  rewards_earned: number;
  rewards_claimed: number;
  created_at: Date;
  indexed_at: Date;
  block_number: bigint;
  transaction_hash: string;
};

type BattleRow = typeof schema.battles.$inferInsert;
type RewardsEarnedRow = typeof schema.rewards_earned.$inferInsert;
type RewardsClaimedRow = typeof schema.rewards_claimed.$inferInsert;
type PoisonEventRow = typeof schema.poison_events.$inferInsert;
type CorpseEventRow = typeof schema.corpse_events.$inferInsert;
type SkullsClaimedRow = typeof schema.skulls_claimed.$inferInsert;
type SummitLogRow = typeof schema.summit_log.$inferInsert;
type BeastOwnerRow = typeof schema.beast_owners.$inferInsert;
type BeastRow = typeof schema.beasts.$inferInsert;
type BeastDataRow = typeof schema.beast_data.$inferInsert;

/**
 * Bulk insert batches collected during block processing
 */
interface BulkInsertBatches {
  beast_stats: BeastStatsRow[];
  battles: BattleRow[];
  rewards_earned: RewardsEarnedRow[];
  rewards_claimed: RewardsClaimedRow[];
  poison_events: PoisonEventRow[];
  corpse_events: CorpseEventRow[];
  skulls_claimed: SkullsClaimedRow[];
  summit_log: SummitLogRow[];
  beast_owners: BeastOwnerRow[];
  beasts: BeastRow[];
  beast_data: BeastDataRow[];
}

/**
 * Execute bulk inserts for all collected batches
 * Uses true batch upserts (single query per table) instead of individual queries
 */
async function executeBulkInserts(db: any, batches: BulkInsertBatches): Promise<void> {
  // Execute all inserts in parallel
  const insertPromises: Promise<unknown>[] = [];

  // beast_stats - batch upsert (dedupe first, then single query)
  if (batches.beast_stats.length > 0) {
    const deduped = new Map<number, BeastStatsRow>();
    for (const row of batches.beast_stats) {
      deduped.set(row.token_id, row);
    }
    insertPromises.push(
      db.insert(schema.beast_stats).values([...deduped.values()]).onConflictDoUpdate({
        target: schema.beast_stats.token_id,
        set: {
          current_health: sql`excluded.current_health`,
          bonus_health: sql`excluded.bonus_health`,
          bonus_xp: sql`excluded.bonus_xp`,
          attack_streak: sql`excluded.attack_streak`,
          last_death_timestamp: sql`excluded.last_death_timestamp`,
          revival_count: sql`excluded.revival_count`,
          extra_lives: sql`excluded.extra_lives`,
          has_claimed_potions: sql`excluded.has_claimed_potions`,
          summit_held_seconds: sql`excluded.summit_held_seconds`,
          spirit: sql`excluded.spirit`,
          luck: sql`excluded.luck`,
          specials: sql`excluded.specials`,
          wisdom: sql`excluded.wisdom`,
          diplomacy: sql`excluded.diplomacy`,
          rewards_earned: sql`excluded.rewards_earned`,
          rewards_claimed: sql`excluded.rewards_claimed`,
          indexed_at: sql`excluded.indexed_at`,
          updated_at: sql`excluded.created_at`,
          block_number: sql`excluded.block_number`,
          transaction_hash: sql`excluded.transaction_hash`,
        },
      })
    );
  }

  // battles - bulk insert with onConflictDoNothing
  if (batches.battles.length > 0) {
    insertPromises.push(
      db.insert(schema.battles).values(batches.battles).onConflictDoNothing()
    );
  }

  // rewards_earned - bulk insert with onConflictDoNothing
  if (batches.rewards_earned.length > 0) {
    insertPromises.push(
      db.insert(schema.rewards_earned).values(batches.rewards_earned).onConflictDoNothing()
    );
  }

  // rewards_claimed - bulk insert with onConflictDoNothing
  if (batches.rewards_claimed.length > 0) {
    insertPromises.push(
      db.insert(schema.rewards_claimed).values(batches.rewards_claimed).onConflictDoNothing()
    );
  }

  // poison_events - bulk insert with onConflictDoNothing
  if (batches.poison_events.length > 0) {
    insertPromises.push(
      db.insert(schema.poison_events).values(batches.poison_events).onConflictDoNothing()
    );
  }

  // corpse_events - bulk insert with onConflictDoNothing
  if (batches.corpse_events.length > 0) {
    insertPromises.push(
      db.insert(schema.corpse_events).values(batches.corpse_events).onConflictDoNothing()
    );
  }

  // skulls_claimed - batch upsert
  if (batches.skulls_claimed.length > 0) {
    const deduped = new Map<number, SkullsClaimedRow>();
    for (const row of batches.skulls_claimed) {
      deduped.set(row.beast_token_id, row);
    }
    insertPromises.push(
      db.insert(schema.skulls_claimed).values([...deduped.values()]).onConflictDoUpdate({
        target: schema.skulls_claimed.beast_token_id,
        set: {
          skulls: sql`excluded.skulls`,
          updated_at: sql`excluded.updated_at`,
        },
      })
    );
  }

  // summit_log - bulk insert with onConflictDoNothing
  if (batches.summit_log.length > 0) {
    insertPromises.push(
      db.insert(schema.summit_log).values(batches.summit_log).onConflictDoNothing()
    );
  }

  // beast_owners - batch upsert
  if (batches.beast_owners.length > 0) {
    const deduped = new Map<number, BeastOwnerRow>();
    for (const row of batches.beast_owners) {
      deduped.set(row.token_id, row);
    }
    insertPromises.push(
      db.insert(schema.beast_owners).values([...deduped.values()]).onConflictDoUpdate({
        target: schema.beast_owners.token_id,
        set: {
          owner: sql`excluded.owner`,
          updated_at: sql`excluded.updated_at`,
        },
      })
    );
  }

  // beasts - bulk insert with onConflictDoNothing
  if (batches.beasts.length > 0) {
    insertPromises.push(
      db.insert(schema.beasts).values(batches.beasts).onConflictDoNothing()
    );
  }

  // beast_data - batch upsert
  if (batches.beast_data.length > 0) {
    const deduped = new Map<string, BeastDataRow>();
    for (const row of batches.beast_data) {
      deduped.set(row.entity_hash, row);
    }
    insertPromises.push(
      db.insert(schema.beast_data).values([...deduped.values()]).onConflictDoUpdate({
        target: schema.beast_data.entity_hash,
        set: {
          adventurers_killed: sql`excluded.adventurers_killed`,
          last_death_timestamp: sql`excluded.last_death_timestamp`,
          last_killed_by: sql`excluded.last_killed_by`,
          token_id: sql`excluded.token_id`,
          updated_at: sql`excluded.updated_at`,
        },
      })
    );
  }

  await Promise.all(insertPromises);
}

/**
 * Create empty bulk insert batches
 */
function createEmptyBatches(): BulkInsertBatches {
  return {
    beast_stats: [],
    battles: [],
    rewards_earned: [],
    rewards_claimed: [],
    poison_events: [],
    corpse_events: [],
    skulls_claimed: [],
    summit_log: [],
    beast_owners: [],
    beasts: [],
    beast_data: [],
  };
}

/**
 * Helper to collect summit log entries into batch (replaces insertSummitLog)
 */
function collectSummitLog(batches: BulkInsertBatches, entry: LogEntry): void {
  batches.summit_log.push({
    block_number: entry.block_number,
    event_index: entry.event_index,
    category: entry.category,
    sub_category: entry.sub_category,
    data: entry.data,
    player: entry.player,
    token_id: entry.token_id,
    transaction_hash: entry.transaction_hash,
    created_at: entry.created_at,
    indexed_at: entry.indexed_at,
  });
}

/**
 * Helper to detect and collect beast stat change logs (derived events)
 * Returns the number of derived events created (for event index offset)
 */
function collectBeastStatChangeLogs(
  batches: BulkInsertBatches,
  prev_stats: BeastStatsSnapshot | null,
  new_stats: BeastStatsSnapshot,
  metadata: BeastMetadata | null,
  player: string | null,
  base_event_index: number,
  block_number: bigint,
  transaction_hash: string,
  block_timestamp: Date,
  indexed_at: Date,
): number {
  let derived_offset = 0;

  // If no previous stats, this is a new beast - no changes to detect
  if (!prev_stats) {
    return derived_offset;
  }

  // Check each stat for increases
  for (const { field, sub_category } of STAT_UPGRADES) {
    const old_value = prev_stats[field];
    const new_value = new_stats[field];

    if (new_value > old_value) {
      derived_offset++;
      const event_index = base_event_index * 100 + derived_offset;

      // Determine category based on field
      const category = field === "extra_lives" ? "Battle" : "Beast Upgrade";

      collectSummitLog(batches, {
        block_number,
        event_index,
        category,
        sub_category,
        data: {
          player,
          token_id: new_stats.token_id,
          beast_id: metadata?.beast_id ?? null,
          prefix: metadata?.prefix ?? null,
          suffix: metadata?.suffix ?? null,
          old_value,
          new_value,
          difference: new_value - old_value,
        },
        player,
        token_id: new_stats.token_id,
        transaction_hash,
        created_at: block_timestamp,
        indexed_at,
      });
    }
  }

  return derived_offset;
}

export default function indexer(runtimeConfig: ApibaraRuntimeConfig) {
  // Get configuration from runtime config
  const config = runtimeConfig.summit as SummitConfig;
  const {
    summitContractAddress,
    beastsContractAddress,
    dojoWorldAddress,
    streamUrl,
    startingBlock: startBlockStr,
    databaseUrl,
    rpcUrl,
  } = config;
  const startingBlock = BigInt(startBlockStr);

  // Convert contract addresses to BigInt for comparison
  const summitAddressBigInt = addressToBigInt(summitContractAddress);
  const beastsAddressBigInt = addressToBigInt(beastsContractAddress);
  const dojoWorldAddressBigInt = addressToBigInt(dojoWorldAddress);

  // Log configuration on startup
  console.log("[Summit Indexer] Summit Contract:", summitContractAddress);
  console.log("[Summit Indexer] Beasts Contract:", beastsContractAddress);
  console.log("[Summit Indexer] Dojo World:", dojoWorldAddress);
  console.log("[Summit Indexer] Stream:", streamUrl);
  console.log("[Summit Indexer] Starting Block:", startingBlock.toString());
  console.log("[Summit Indexer] RPC URL:", rpcUrl);

  // Create Drizzle database instance
  const database = drizzle({ schema, connectionString: databaseUrl });

  // getBeast selector: starknet_keccak("getBeast")
  const GET_BEAST_SELECTOR = "0x0385b69551f247794fe651459651cdabc76b6cdf4abacafb5b28ceb3b1ac2e98";

  /**
   * Fetch beast metadata via raw RPC call
   */
  async function fetchBeastMetadata(token_id: number): Promise<{
    id: number;
    prefix: number;
    suffix: number;
    level: number;
    health: number;
    shiny: number;
    animated: number;
  } | null> {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "starknet_call",
          params: {
            request: {
              contract_address: beastsContractAddress,
              entry_point_selector: GET_BEAST_SELECTOR,
              calldata: [`0x${token_id.toString(16)}`, "0x0"], // u256: low, high
            },
            block_id: "latest",
          },
          id: 1,
        }),
      });

      const json = await response.json();
      if (json.error) {
        console.error(`RPC error for token ${token_id}:`, json.error);
        return null;
      }

      // Result is array of felt252: [id, prefix, suffix, level, health, shiny, animated]
      const result = json.result as string[];
      return {
        id: Number(BigInt(result[0])),
        prefix: Number(BigInt(result[1])),
        suffix: Number(BigInt(result[2])),
        level: Number(BigInt(result[3])),
        health: Number(BigInt(result[4])),
        shiny: Number(BigInt(result[5])),
        animated: Number(BigInt(result[6])),
      };
    } catch (error) {
      console.error(`Failed to fetch metadata for token ${token_id}:`, error);
      return null;
    }
  }

  return defineIndexer(StarknetStream)({
    streamUrl,
    finality: "pending",
    startingBlock,
    filter: {
      events: [
        // Summit contract - all events
        // Use original addresses for filter (DNA needs full format)
        {
          address: summitContractAddress.toLowerCase() as `0x${string}`,
        },
        // Beasts NFT contract - Transfer events only
        {
          address: beastsContractAddress.toLowerCase() as `0x${string}`,
          keys: [BEAST_EVENT_SELECTORS.Transfer as `0x${string}`],
        },
        // Dojo World contract - EntityStats events (keys[0]=StoreSetRecord, keys[1]=EntityStats model)
        {
          address: dojoWorldAddress.toLowerCase() as `0x${string}`,
          keys: [
            DOJO_EVENT_SELECTORS.StoreSetRecord as `0x${string}`,
            DOJO_EVENT_SELECTORS.EntityStats as `0x${string}`,
          ],
        },
        // Dojo World contract - CollectableEntity events (keys[0]=StoreSetRecord, keys[1]=CollectableEntity model)
        {
          address: dojoWorldAddress.toLowerCase() as `0x${string}`,
          keys: [
            DOJO_EVENT_SELECTORS.StoreSetRecord as `0x${string}`,
            DOJO_EVENT_SELECTORS.CollectableEntity as `0x${string}`,
          ],
        },
      ],
    },
    plugins: [
      drizzleStorage({
        db: database,
        persistState: false, // Always start from startingBlock, don't resume from checkpoint
        indexerName: "summit",
        idColumn: "id",
        migrate: {
          migrationsFolder: "./migrations",
        },
      }),
    ],
    hooks: {
      "run:before": () => {
        console.log("[Summit Indexer] Starting indexer run");
      },
      "run:after": async () => {
        console.log("[Summit Indexer] Indexer run completed");
      },
      "connect:before": ({ request }) => {
        // Keep connection alive with periodic heartbeats (30 seconds)
        request.heartbeatInterval = { seconds: 30n, nanos: 0 };
      },
      "connect:after": () => {
        console.log("[Summit Indexer] Connected to DNA stream");
      },
    },
    async transform({ block }) {
      // Capture DNA delivery time FIRST - before any processing
      const indexed_at = new Date();
      const blockStartTime = Date.now();

      const logger = useLogger();
      const { db } = useDrizzleStorage();
      const { events, header } = block;

      if (!header) {
        logger.warn("No header in block, skipping");
        return;
      }

      const block_number = header.blockNumber ?? 0n;
      const block_timestamp = header.timestamp ?? new Date();

      // Track blocks without events
      if (events.length === 0) {
        blocksWithoutEvents++;

        // Log progress every 5 seconds or every 1000 empty blocks
        const now = Date.now();
        if (now - lastProgressLog > 5000 || blocksWithoutEvents >= 1000) {
          const blockGap = lastEventBlock > 0n ? block_number - lastEventBlock : 0n;
          logger.info(`Progress: block ${block_number} (${blocksWithoutEvents} empty blocks since last event, gap: ${blockGap})`);
          lastProgressLog = now;
          blocksWithoutEvents = 0;
        }
        return; // Skip processing for empty blocks
      }

      // Log block with events
      const blockGap = lastEventBlock > 0n ? block_number - lastEventBlock : 0n;
      if (blockGap > 100n) {
        logger.info(`Block ${block_number}: ${events.length} events (gap: ${blockGap} blocks since last event)`);
      } else {
        logger.info(`Block ${block_number}: ${events.length} events`);
      }
      lastEventBlock = block_number;
      blocksWithoutEvents = 0;

      // Initialize bulk insert batches for this block
      const batches = createEmptyBatches();

      // Track skull events that need beast_data lookup for adventurers_killed (must be done before processing)
      const skullEventTokenIds: number[] = [];
      const skullEventData: Array<{ decoded: { beast_token_ids: number[]; skulls_claimed: bigint }; event_index: number; transaction_hash: string }> = [];

      // First pass: collect token IDs that need context lookup and skull events
      const beastStatsTokenIds: number[] = [];
      const battleTokenIds: number[] = [];
      const rewardsEarnedTokenIds: number[] = [];
      const transferTokenIds: number[] = []; // For batching metadata fetches

      // Collect entity_hashes for LS Events (EntityStats and CollectableEntity)
      const lsEventEntityHashes: string[] = [];

      // Dungeon constants for filtering LS Events
      const BEAST_DUNGEON = "0x0000000000000000000000000000000000000000000000000000000000000006";
      const LS_DUNGEON = "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42";

      // Pre-scan events to collect token IDs for batch lookups
      const preScanStart = Date.now();
      for (const event of events) {
        const keys = event.keys;
        if (keys.length === 0) continue;

        const selector = feltToHex(keys[0]);
        const event_address = feltToHex(event.address);

        // Collect Transfer token IDs for batch metadata fetch
        if (addressToBigInt(event_address) === beastsAddressBigInt && selector === BEAST_EVENT_SELECTORS.Transfer) {
          const decoded = decodeTransferEvent([...keys], [...event.data]);
          if (decoded.to !== ZERO_ADDRESS) {
            const token_id = Number(decoded.token_id);
            if (!fetchedTokens.has(token_id)) {
              transferTokenIds.push(token_id);
            }
          }
        }

        // Collect entity_hashes for LS Events (Dojo World events)
        if (addressToBigInt(event_address) === dojoWorldAddressBigInt &&
          selector === DOJO_EVENT_SELECTORS.StoreSetRecord) {
          const model_selector = keys.length > 1 ? feltToHex(keys[1]) : "";

          if (model_selector === DOJO_EVENT_SELECTORS.EntityStats) {
            const decoded = decodeEntityStatsEvent([...keys], [...event.data]);
            if (decoded.dungeon === BEAST_DUNGEON) {
              lsEventEntityHashes.push(decoded.entity_hash);
            }
          } else if (model_selector === DOJO_EVENT_SELECTORS.CollectableEntity) {
            const decoded = decodeCollectableEntityEvent([...keys], [...event.data]);
            if (decoded.dungeon === LS_DUNGEON) {
              lsEventEntityHashes.push(decoded.entity_hash);
            }
          }
        }

        if (addressToBigInt(event_address) === summitAddressBigInt) {
          switch (selector) {
            case EVENT_SELECTORS.BeastUpdatesEvent: {
              const decoded = decodeBeastUpdatesEvent([...keys], [...event.data]);
              for (const packed of decoded.packed_updates) {
                const stats = unpackLiveBeastStats(packed);
                beastStatsTokenIds.push(stats.token_id);
              }
              break;
            }
            case EVENT_SELECTORS.LiveBeastStatsEvent: {
              const decoded = decodeLiveBeastStatsEvent([...keys], [...event.data]);
              beastStatsTokenIds.push(decoded.live_stats.token_id);
              break;
            }
            case EVENT_SELECTORS.BattleEvent: {
              const decoded = decodeBattleEvent([...keys], [...event.data]);
              battleTokenIds.push(decoded.attacking_beast_token_id);
              break;
            }
            case EVENT_SELECTORS.RewardsEarnedEvent: {
              const decoded = decodeRewardsEarnedEvent([...keys], [...event.data]);
              rewardsEarnedTokenIds.push(decoded.beast_token_id);
              break;
            }
            case EVENT_SELECTORS.SkullEvent: {
              const decoded = decodeSkullEvent([...keys], [...event.data]);
              // Collect all token IDs from the span for batch lookup
              skullEventTokenIds.push(...decoded.beast_token_ids);
              skullEventData.push({
                decoded,
                event_index: event.eventIndex,
                transaction_hash: event.transactionHash,
              });
              break;
            }
          }
        }
      }

      const preScanTime = Date.now() - preScanStart;

      // Batch fetch metadata for Transfer events (parallel RPC calls)
      let rpcTime = 0;
      const metadataMap = new Map<number, Awaited<ReturnType<typeof fetchBeastMetadata>>>();
      if (transferTokenIds.length > 0) {
        const uniqueTransferIds = [...new Set(transferTokenIds)];
        const rpcStartTime = Date.now();

        // Fetch all in parallel (new mints are rare)
        const results = await Promise.all(uniqueTransferIds.map(id => fetchBeastMetadata(id)));
        uniqueTransferIds.forEach((id, idx) => {
          metadataMap.set(id, results[idx]);
        });

        rpcTime = Date.now() - rpcStartTime;
        logger.info(`RPC metadata fetch: ${uniqueTransferIds.length} tokens in ${rpcTime}ms`);
      }

      // Batch lookup beast context for all needed token IDs
      const allBeastContextTokenIds = [...new Set([
        ...beastStatsTokenIds,
        ...battleTokenIds,
        ...rewardsEarnedTokenIds,
        ...skullEventTokenIds,
      ])];
      const { result: beastContextMap, joinQueryTime, fallbackQueryTime } = await getBeastContextBatch(db, allBeastContextTokenIds, logger);

      // Batch lookup adventurers_killed from beast_data for skull calculations
      let beastDataQueryTime = 0;
      const beastDataSkullsMap = new Map<number, bigint>();
      if (skullEventTokenIds.length > 0) {
        const beastDataStart = Date.now();
        const uniqueSkullTokenIds = [...new Set(skullEventTokenIds)];
        const beastDataResult = await db
          .select({
            token_id: schema.beast_data.token_id,
            adventurers_killed: schema.beast_data.adventurers_killed,
          })
          .from(schema.beast_data)
          .where(inArray(schema.beast_data.token_id, uniqueSkullTokenIds));
        for (const row of beastDataResult) {
          if (row.token_id !== null) {
            beastDataSkullsMap.set(row.token_id, row.adventurers_killed);
          }
        }
        beastDataQueryTime = Date.now() - beastDataStart;
      }

      // Batch lookup beast metadata for LS Events via entity_hash → beast_data → beasts
      let lsMetadataQueryTime = 0;
      const lsMetadataMap = new Map<string, { token_id: number; beast_id: number; prefix: number; suffix: number }>();

      if (lsEventEntityHashes.length > 0) {
        const lsMetadataStart = Date.now();
        const uniqueHashes = [...new Set(lsEventEntityHashes)];

        // Join beast_data with beasts to get metadata
        const lsMetadataResult = await db
          .select({
            entity_hash: schema.beast_data.entity_hash,
            token_id: schema.beast_data.token_id,
            beast_id: schema.beasts.beast_id,
            prefix: schema.beasts.prefix,
            suffix: schema.beasts.suffix,
          })
          .from(schema.beast_data)
          .innerJoin(schema.beasts, eq(schema.beast_data.token_id, schema.beasts.token_id))
          .where(inArray(schema.beast_data.entity_hash, uniqueHashes));

        for (const row of lsMetadataResult) {
          if (row.token_id !== null && row.beast_id !== null && row.prefix !== null && row.suffix !== null) {
            lsMetadataMap.set(row.entity_hash, {
              token_id: row.token_id,
              beast_id: row.beast_id,
              prefix: row.prefix,
              suffix: row.suffix,
            });
          }
        }

        lsMetadataQueryTime = Date.now() - lsMetadataStart;
      }

      const contextLookupTime = joinQueryTime + fallbackQueryTime + beastDataQueryTime + lsMetadataQueryTime;

      // Process all events in order, collecting into batches
      const eventProcessingStart = Date.now();
      for (const event of events) {
        const keys = event.keys;
        const data = event.data;
        const transaction_hash = event.transactionHash;
        const event_index = event.eventIndex;
        const event_address = feltToHex(event.address);

        if (keys.length === 0) continue;

        const selector = feltToHex(keys[0]);

        try {
          // Beasts NFT contract - Transfer events
          if (addressToBigInt(event_address) === beastsAddressBigInt && selector === BEAST_EVENT_SELECTORS.Transfer) {
            const decoded = decodeTransferEvent([...keys], [...data]);
            const token_id = Number(decoded.token_id);

            // Skip burn events (transfer to 0x0)
            if (decoded.to === ZERO_ADDRESS) {
              logger.debug(`Skipping burn event for token ${token_id}`);
              continue;
            }

            // Collect beast_owners upsert
            batches.beast_owners.push({
              token_id,
              owner: decoded.to,
              updated_at: block_timestamp,
            });

            // Use pre-fetched metadata from batch lookup (only for tokens not in cache)
            if (!fetchedTokens.has(token_id)) {
              const beast_data = metadataMap.get(token_id);

              if (beast_data) {
                const { id, prefix, suffix, level, health, shiny, animated } = beast_data;

                // Collect beasts insert
                batches.beasts.push({
                  token_id,
                  beast_id: id,
                  prefix,
                  suffix,
                  level,
                  health,
                  shiny,
                  animated,
                  created_at: block_timestamp,
                  indexed_at,
                });

                // Compute entity_hash and collect beast_data upsert
                const entity_hash = computeEntityHash(id, prefix, suffix);
                batches.beast_data.push({
                  entity_hash,
                  token_id,
                  adventurers_killed: 0n,
                  last_death_timestamp: 0n,
                  last_killed_by: 0n,
                  updated_at: block_timestamp,
                });

                // Mark as fetched in cache
                fetchedTokens.add(token_id);
              }
            }
            continue;
          }

          // Dojo World contract - EntityStats events
          const model_selector = keys.length > 1 ? feltToHex(keys[1]) : "";
          if (addressToBigInt(event_address) === dojoWorldAddressBigInt &&
            selector === DOJO_EVENT_SELECTORS.StoreSetRecord &&
            model_selector === DOJO_EVENT_SELECTORS.EntityStats) {

            const decoded = decodeEntityStatsEvent([...keys], [...data]);

            // Filter by dungeon - only process Beast dungeon (0x6) events
            if (decoded.dungeon !== BEAST_DUNGEON) {
              continue;
            }

            // Get beast metadata from lookup
            const entityMetadata = lsMetadataMap.get(decoded.entity_hash);

            logger.info(`EntityStats: adventurers_killed=${decoded.adventurers_killed}, token_id=${entityMetadata?.token_id ?? 'unknown'}`);

            // Always save to beast_data table
            batches.beast_data.push({
              entity_hash: decoded.entity_hash,
              adventurers_killed: decoded.adventurers_killed,
              last_death_timestamp: 0n,
              last_killed_by: 0n,
              updated_at: block_timestamp,
            });

            // Only add to summit_log if beast is minted (token_id >= 76 with prefix+suffix)
            if (entityMetadata && entityMetadata.token_id >= 76 && entityMetadata.prefix && entityMetadata.suffix) {
              collectSummitLog(batches, {
                block_number,
                event_index,
                category: "LS Events",
                sub_category: "EntityStats",
                data: {
                  entity_hash: decoded.entity_hash,
                  adventurers_killed: decoded.adventurers_killed.toString(),
                  token_id: entityMetadata.token_id,
                  beast_id: entityMetadata.beast_id,
                  prefix: entityMetadata.prefix,
                  suffix: entityMetadata.suffix,
                },
                player: null,
                token_id: entityMetadata.token_id,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
            }
            continue;
          }

          // Dojo World contract - CollectableEntity events
          if (addressToBigInt(event_address) === dojoWorldAddressBigInt &&
            selector === DOJO_EVENT_SELECTORS.StoreSetRecord &&
            model_selector === DOJO_EVENT_SELECTORS.CollectableEntity) {

            const decoded = decodeCollectableEntityEvent([...keys], [...data]);

            // Filter by dungeon - only process Loot Survivor dungeon events
            if (decoded.dungeon !== LS_DUNGEON) {
              continue;
            }

            // Get beast metadata from lookup
            const collectableMetadata = lsMetadataMap.get(decoded.entity_hash);

            logger.info(`CollectableEntity: last_killed_by=${decoded.last_killed_by}, timestamp=${decoded.timestamp}, token_id=${collectableMetadata?.token_id ?? 'unknown'}`);

            // Collect beast_data upsert
            batches.beast_data.push({
              entity_hash: decoded.entity_hash,
              adventurers_killed: 0n,
              last_death_timestamp: decoded.timestamp,
              last_killed_by: decoded.last_killed_by,
              updated_at: block_timestamp,
            });

            // Collect summit_log with beast metadata
            if (collectableMetadata && collectableMetadata.token_id >= 76 && collectableMetadata.prefix && collectableMetadata.suffix) {
              collectSummitLog(batches, {
                block_number,
                event_index,
                category: "LS Events",
                sub_category: "CollectableEntity",
                data: {
                  entity_hash: decoded.entity_hash,
                  last_killed_by: decoded.last_killed_by.toString(),
                  timestamp: decoded.timestamp.toString(),
                  token_id: collectableMetadata?.token_id ?? null,
                  beast_id: collectableMetadata?.beast_id ?? null,
                  prefix: collectableMetadata?.prefix ?? null,
                  suffix: collectableMetadata?.suffix ?? null,
                },
                player: null,
                token_id: collectableMetadata?.token_id ?? null,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
            }
            continue;
          }

          // Summit contract events
          if (addressToBigInt(event_address) !== summitAddressBigInt) continue;

          switch (selector) {
            case EVENT_SELECTORS.BeastUpdatesEvent: {
              const decoded = decodeBeastUpdatesEvent([...keys], [...data]);

              for (let i = 0; i < decoded.packed_updates.length; i++) {
                const packed = decoded.packed_updates[i];
                const stats = unpackLiveBeastStats(packed);

                // Get context from batch lookup
                const context = beastContextMap.get(stats.token_id) ?? { prev_stats: null, metadata: null, owner: null };
                const { prev_stats, metadata: beast_metadata, owner: beast_owner } = context;

                // Collect beast_stats upsert
                batches.beast_stats.push({
                  token_id: stats.token_id,
                  current_health: stats.current_health,
                  bonus_health: stats.bonus_health,
                  bonus_xp: stats.bonus_xp,
                  attack_streak: stats.attack_streak,
                  last_death_timestamp: stats.last_death_timestamp,
                  revival_count: stats.revival_count,
                  extra_lives: stats.extra_lives,
                  has_claimed_potions: stats.has_claimed_potions,
                  summit_held_seconds: stats.summit_held_seconds,
                  spirit: stats.spirit,
                  luck: stats.luck,
                  specials: stats.specials,
                  wisdom: stats.wisdom,
                  diplomacy: stats.diplomacy,
                  rewards_earned: stats.rewards_earned,
                  rewards_claimed: stats.rewards_claimed,
                  created_at: block_timestamp,
                  indexed_at,
                  block_number,
                  transaction_hash,
                });

                // Detect Summit Change (health goes 0 → positive)
                if (prev_stats?.current_health === 0 && stats.current_health > 0) {
                  collectSummitLog(batches, {
                    block_number,
                    event_index: event_index * 100 + 1,
                    category: "Battle",
                    sub_category: "Summit Change",
                    data: {
                      attacking_player: beast_owner,
                      attacking_beast_token_id: stats.token_id,
                      defending_beast_token_id: stats.token_id,
                      beast_id: beast_metadata?.beast_id ?? null,
                      prefix: beast_metadata?.prefix ?? null,
                      suffix: beast_metadata?.suffix ?? null,
                    },
                    player: beast_owner,
                    token_id: stats.token_id,
                    transaction_hash,
                    created_at: block_timestamp,
                    indexed_at,
                  });
                }

                // Update context map with new stats so subsequent events in same block see updated state
                beastContextMap.set(stats.token_id, {
                  prev_stats: {
                    token_id: stats.token_id,
                    spirit: stats.spirit,
                    luck: stats.luck,
                    specials: stats.specials,
                    wisdom: stats.wisdom,
                    diplomacy: stats.diplomacy,
                    bonus_health: stats.bonus_health,
                    extra_lives: stats.extra_lives,
                    has_claimed_potions: stats.has_claimed_potions,
                    current_health: stats.current_health,
                  },
                  metadata: beast_metadata,
                  owner: beast_owner,
                });
              }
              break;
            }

            case EVENT_SELECTORS.LiveBeastStatsEvent: {
              const decoded = decodeLiveBeastStatsEvent([...keys], [...data]);
              const stats = decoded.live_stats;

              // Get context from batch lookup
              const context = beastContextMap.get(stats.token_id) ?? { prev_stats: null, metadata: null, owner: null };
              const { prev_stats, metadata, owner: live_beast_owner } = context;

              // Collect beast_stats upsert
              batches.beast_stats.push({
                token_id: stats.token_id,
                current_health: stats.current_health,
                bonus_health: stats.bonus_health,
                bonus_xp: stats.bonus_xp,
                attack_streak: stats.attack_streak,
                last_death_timestamp: stats.last_death_timestamp,
                revival_count: stats.revival_count,
                extra_lives: stats.extra_lives,
                has_claimed_potions: stats.has_claimed_potions,
                summit_held_seconds: stats.summit_held_seconds,
                spirit: stats.spirit,
                luck: stats.luck,
                specials: stats.specials,
                wisdom: stats.wisdom,
                diplomacy: stats.diplomacy,
                rewards_earned: stats.rewards_earned,
                rewards_claimed: stats.rewards_claimed,
                created_at: block_timestamp,
                indexed_at,
                block_number,
                transaction_hash,
              });

              // Collect derived events (stat changes)
              collectBeastStatChangeLogs(
                batches,
                prev_stats,
                {
                  token_id: stats.token_id,
                  spirit: stats.spirit,
                  luck: stats.luck,
                  specials: stats.specials,
                  wisdom: stats.wisdom,
                  diplomacy: stats.diplomacy,
                  bonus_health: stats.bonus_health,
                  extra_lives: stats.extra_lives,
                  has_claimed_potions: stats.has_claimed_potions,
                },
                metadata,
                live_beast_owner,
                event_index,
                block_number,
                transaction_hash,
                block_timestamp,
                indexed_at,
              );

              // Update context map with new stats so subsequent events in same block see updated state
              // This prevents duplicate derived events when multiple LiveBeastStatsEvent occur for same beast
              beastContextMap.set(stats.token_id, {
                prev_stats: {
                  token_id: stats.token_id,
                  spirit: stats.spirit,
                  luck: stats.luck,
                  specials: stats.specials,
                  wisdom: stats.wisdom,
                  diplomacy: stats.diplomacy,
                  bonus_health: stats.bonus_health,
                  extra_lives: stats.extra_lives,
                  has_claimed_potions: stats.has_claimed_potions,
                  current_health: stats.current_health,
                },
                metadata,
                owner: live_beast_owner,
              });
              break;
            }

            case EVENT_SELECTORS.BattleEvent: {
              const decoded = decodeBattleEvent([...keys], [...data]);

              // Get context from batch lookup
              const context = beastContextMap.get(decoded.attacking_beast_token_id) ?? { prev_stats: null, metadata: null, owner: null };
              const attacking_player = context.owner;
              const attacking_beast_metadata = context.metadata;

              // Collect battles insert
              batches.battles.push({
                attacking_beast_token_id: decoded.attacking_beast_token_id,
                attacking_player,
                attack_index: decoded.attack_index,
                defending_beast_token_id: decoded.defending_beast_token_id,
                attack_count: decoded.attack_count,
                attack_damage: decoded.attack_damage,
                critical_attack_count: decoded.critical_attack_count,
                critical_attack_damage: decoded.critical_attack_damage,
                counter_attack_count: decoded.counter_attack_count,
                counter_attack_damage: decoded.counter_attack_damage,
                critical_counter_attack_count: decoded.critical_counter_attack_count,
                critical_counter_attack_damage: decoded.critical_counter_attack_damage,
                attack_potions: decoded.attack_potions,
                revive_potions: decoded.revive_potions,
                xp_gained: decoded.xp_gained,
                created_at: block_timestamp,
                indexed_at: indexed_at,
                block_number,
                transaction_hash,
                event_index,
              });

              // Collect summit_log
              collectSummitLog(batches, {
                block_number,
                event_index,
                category: "Battle",
                sub_category: "BattleEvent",
                data: {
                  attacking_beast_token_id: decoded.attacking_beast_token_id,
                  attack_index: decoded.attack_index,
                  defending_beast_token_id: decoded.defending_beast_token_id,
                  attack_count: decoded.attack_count,
                  attack_damage: decoded.attack_damage,
                  critical_attack_count: decoded.critical_attack_count,
                  critical_attack_damage: decoded.critical_attack_damage,
                  counter_attack_count: decoded.counter_attack_count,
                  counter_attack_damage: decoded.counter_attack_damage,
                  critical_counter_attack_count: decoded.critical_counter_attack_count,
                  critical_counter_attack_damage: decoded.critical_counter_attack_damage,
                  attack_potions: decoded.attack_potions,
                  revive_potions: decoded.revive_potions,
                  xp_gained: decoded.xp_gained,
                  attacking_beast_owner: attacking_player,
                  attacking_beast_id: attacking_beast_metadata?.beast_id ?? 0,
                  attacking_beast_prefix: attacking_beast_metadata?.prefix ?? 0,
                  attacking_beast_suffix: attacking_beast_metadata?.suffix ?? 0,
                  attacking_beast_shiny: attacking_beast_metadata?.shiny ?? 0,
                  attacking_beast_animated: attacking_beast_metadata?.animated ?? 0,
                },
                player: attacking_player,
                token_id: decoded.attacking_beast_token_id,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
              break;
            }

            case EVENT_SELECTORS.RewardsEarnedEvent: {
              const decoded = decodeRewardsEarnedEvent([...keys], [...data]);

              // Get owner and metadata from batch lookup
              const context = beastContextMap.get(decoded.beast_token_id) ?? { prev_stats: null, metadata: null, owner: null };
              const owner = context.owner;
              const rewards_metadata = context.metadata;

              // Collect rewards_earned insert
              batches.rewards_earned.push({
                beast_token_id: decoded.beast_token_id,
                owner,
                amount: decoded.amount,
                created_at: block_timestamp,
                indexed_at: indexed_at,
                block_number,
                transaction_hash,
                event_index,
              });

              // Collect summit_log
              collectSummitLog(batches, {
                block_number,
                event_index,
                category: "Rewards",
                sub_category: "$SURVIVOR Earned",
                data: {
                  owner,
                  beast_token_id: decoded.beast_token_id,
                  amount: decoded.amount,
                  beast_id: rewards_metadata?.beast_id ?? null,
                  prefix: rewards_metadata?.prefix ?? null,
                  suffix: rewards_metadata?.suffix ?? null,
                },
                player: owner,
                token_id: decoded.beast_token_id,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
              break;
            }

            case EVENT_SELECTORS.RewardsClaimedEvent: {
              const decoded = decodeRewardsClaimedEvent([...keys], [...data]);

              // Collect rewards_claimed insert
              batches.rewards_claimed.push({
                player: decoded.player,
                beast_token_ids: "",
                amount: decoded.amount.toString(),
                created_at: block_timestamp,
                indexed_at: indexed_at,
                block_number,
                transaction_hash,
                event_index,
              });

              // Collect summit_log
              collectSummitLog(batches, {
                block_number,
                event_index,
                category: "Rewards",
                sub_category: "Claimed $SURVIVOR",
                data: {
                  player: decoded.player,
                  amount: decoded.amount.toString(),
                },
                player: decoded.player,
                token_id: null,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
              break;
            }

            case EVENT_SELECTORS.PoisonEvent: {
              const decoded = decodePoisonEvent([...keys], [...data]);

              // Collect poison_events insert
              batches.poison_events.push({
                beast_token_id: decoded.beast_token_id,
                block_timestamp: BigInt(Math.floor(block_timestamp.getTime() / 1000)),
                count: decoded.count,
                player: decoded.player,
                created_at: block_timestamp,
                indexed_at: indexed_at,
                block_number,
                transaction_hash,
                event_index,
              });

              // Collect summit_log
              collectSummitLog(batches, {
                block_number,
                event_index,
                category: "Battle",
                sub_category: "Applied Poison",
                data: {
                  player: decoded.player,
                  beast_token_id: decoded.beast_token_id,
                  count: decoded.count,
                },
                player: decoded.player,
                token_id: decoded.beast_token_id,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
              break;
            }

            case EVENT_SELECTORS.CorpseEvent: {
              const decoded = decodeCorpseEvent([...keys], [...data]);

              // Process each adventurer_id individually into corpse_events
              for (const adventurer_id of decoded.adventurer_ids) {
                batches.corpse_events.push({
                  adventurer_id,
                  player: decoded.player,
                  created_at: block_timestamp,
                  indexed_at: indexed_at,
                  block_number,
                  transaction_hash,
                  event_index,
                });
              }

              // Single summit_log entry for the batch
              collectSummitLog(batches, {
                block_number,
                event_index,
                category: "Rewards",
                sub_category: "Claimed Corpses",
                data: {
                  player: decoded.player,
                  adventurer_count: decoded.adventurer_ids.length,
                  corpse_amount: decoded.corpse_amount,
                },
                player: decoded.player,
                token_id: null,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
              break;
            }

            case EVENT_SELECTORS.SkullEvent: {
              const decoded = decodeSkullEvent([...keys], [...data]);

              // Get player from first beast's owner (all beasts in batch belong to same player)
              const firstContext = beastContextMap.get(decoded.beast_token_ids[0]) ?? { prev_stats: null, metadata: null, owner: null };
              const skull_player = firstContext.owner;

              // Process each beast_token_id individually
              for (const beast_token_id of decoded.beast_token_ids) {
                // Get skulls (adventurers_killed) from beast_data lookup
                const skulls = beastDataSkullsMap.get(beast_token_id) ?? 0n;

                // Collect skulls_claimed upsert for each beast
                batches.skulls_claimed.push({
                  beast_token_id,
                  skulls,
                  updated_at: block_timestamp,
                });
              }

              // Single summit_log entry for the batch
              collectSummitLog(batches, {
                block_number,
                event_index,
                category: "Rewards",
                sub_category: "Claimed Skulls",
                data: {
                  player: skull_player,
                  beast_count: decoded.beast_token_ids.length,
                  skulls_claimed: decoded.skulls_claimed.toString(),
                },
                player: skull_player,
                token_id: null,  // No single token_id for batch
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
              break;
            }

            default:
              logger.debug(`Unknown event selector: ${selector}`);
              break;
          }
        } catch (error) {
          logger.error(
            `Error processing event at block ${block_number}, index ${event_index}: ${error}`
          );
          logger.error(`Event selector: ${selector}`);
          logger.error(`Keys: ${JSON.stringify(keys)}`);
          logger.error(`Data: ${JSON.stringify(data)}`);
        }
      }

      const eventProcessingTime = Date.now() - eventProcessingStart;

      // Execute all bulk inserts at the end of block processing
      const insertStartTime = Date.now();
      await executeBulkInserts(db, batches);
      const insertTime = Date.now() - insertStartTime;

      // Log performance metrics for blocks with events
      if (events.length > 0) {
        const totalTime = Date.now() - blockStartTime;

        // Detailed timing breakdown
        // scan = pre-scan to collect token IDs
        // rpc = RPC calls for new beast metadata (rare)
        // ctx = context lookup (join + fallback + skulls + ls metadata queries)
        // proc = event processing loop
        // ins = database inserts
        const timingStr = `scan:${preScanTime} rpc:${rpcTime} ctx:${contextLookupTime}(j:${joinQueryTime} f:${fallbackQueryTime} bd:${beastDataQueryTime} ls:${lsMetadataQueryTime}) proc:${eventProcessingTime} ins:${insertTime}`;
        const countsStr = `bs:${batches.beast_stats.length} bt:${batches.battles.length} log:${batches.summit_log.length} own:${batches.beast_owners.length}`;

        logger.info(`Block ${block_number}: ${totalTime}ms [${timingStr}] {${countsStr}}`);
      }
    },
  });
}
