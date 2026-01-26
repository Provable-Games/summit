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

import { eq } from "drizzle-orm";
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
 * Helper to insert a summit log entry
 */
async function insertSummitLog(db: any, entry: LogEntry): Promise<void> {
  await db.insert(schema.summit_log).values({
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
  }).onConflictDoNothing();
}

/**
 * Helper to get previous beast stats for comparison (before upsert)
 */
async function getPreviousBeastStats(db: any, token_id: number): Promise<BeastStatsSnapshot | null> {
  const result = await db
    .select({
      token_id: schema.beast_stats.token_id,
      spirit: schema.beast_stats.spirit,
      luck: schema.beast_stats.luck,
      specials: schema.beast_stats.specials,
      wisdom: schema.beast_stats.wisdom,
      diplomacy: schema.beast_stats.diplomacy,
      bonus_health: schema.beast_stats.bonus_health,
      extra_lives: schema.beast_stats.extra_lives,
      has_claimed_potions: schema.beast_stats.has_claimed_potions,
      current_health: schema.beast_stats.current_health,
    })
    .from(schema.beast_stats)
    .where(eq(schema.beast_stats.token_id, token_id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Helper to get beast metadata for log enrichment
 */
async function getBeastMetadata(db: any, token_id: number): Promise<BeastMetadata | null> {
  const result = await db
    .select({
      beast_id: schema.beasts.beast_id,
      prefix: schema.beasts.prefix,
      suffix: schema.beasts.suffix,
    })
    .from(schema.beasts)
    .where(eq(schema.beasts.token_id, token_id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
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
 * Helper to detect and log beast stat changes (derived events)
 * Returns the number of derived events created (for event index offset)
 */
async function logBeastStatChanges(
  db: any,
  prev_stats: BeastStatsSnapshot | null,
  new_stats: BeastStatsSnapshot,
  metadata: BeastMetadata | null,
  player: string | null,
  base_event_index: number,
  block_number: bigint,
  transaction_hash: string,
  block_timestamp: Date,
  indexed_at: Date,
  _logger: any // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<number> {
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

      await insertSummitLog(db, {
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

      // logger.info(`[Summit Log] ${category}/${sub_category}: token ${new_stats.token_id} ${old_value} -> ${new_value}`);
    }
  }

  // Check for has_claimed_potions flip (0 -> 1)
  if (prev_stats.has_claimed_potions === 0 && new_stats.has_claimed_potions === 1) {
    derived_offset++;
    const event_index = base_event_index * 100 + derived_offset;

    await insertSummitLog(db, {
      block_number,
      event_index,
      category: "Arriving to Summit",
      sub_category: "Claimed Potions",
      data: {
        player,
        token_id: new_stats.token_id,
        beast_id: metadata?.beast_id ?? null,
        prefix: metadata?.prefix ?? null,
        suffix: metadata?.suffix ?? null,
      },
      player,
      token_id: new_stats.token_id,
      transaction_hash,
      created_at: block_timestamp,
      indexed_at,
    });

    // logger.info(`[Summit Log] Arriving to Summit/Claimed Potions: token ${new_stats.token_id}`);
  }

  return derived_offset;
}

/**
 * Helper to upsert beast stats
 */
async function upsertBeastStats(
  db: any,
  stats: {
    token_id: number;
    current_health: number;
    bonus_health: number;
    bonus_xp: number;
    attack_streak: number;
    last_death_timestamp: bigint;
    revival_count: number;
    extra_lives: number;
    has_claimed_potions: number;
    blocks_held: number;
    spirit: number;
    luck: number;
    specials: number;
    wisdom: number;
    diplomacy: number;
    rewards_earned: number;
    rewards_claimed: number;
  },
  block_timestamp: Date,
  indexed_at: Date,
  block_number: bigint,
  transaction_hash: string
): Promise<void> {
  await db.insert(schema.beast_stats).values({
    token_id: stats.token_id,
    current_health: stats.current_health,
    bonus_health: stats.bonus_health,
    bonus_xp: stats.bonus_xp,
    attack_streak: stats.attack_streak,
    last_death_timestamp: stats.last_death_timestamp,
    revival_count: stats.revival_count,
    extra_lives: stats.extra_lives,
    has_claimed_potions: stats.has_claimed_potions,
    blocks_held: stats.blocks_held,
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
  }).onConflictDoUpdate({
    target: schema.beast_stats.token_id,
    set: {
      current_health: stats.current_health,
      bonus_health: stats.bonus_health,
      bonus_xp: stats.bonus_xp,
      attack_streak: stats.attack_streak,
      last_death_timestamp: stats.last_death_timestamp,
      revival_count: stats.revival_count,
      extra_lives: stats.extra_lives,
      has_claimed_potions: stats.has_claimed_potions,
      blocks_held: stats.blocks_held,
      spirit: stats.spirit,
      luck: stats.luck,
      specials: stats.specials,
      wisdom: stats.wisdom,
      diplomacy: stats.diplomacy,
      rewards_earned: stats.rewards_earned,
      rewards_claimed: stats.rewards_claimed,
      indexed_at,
      updated_at: block_timestamp,
      block_number,
      transaction_hash,
    },
  });
}

/**
 * Convert address string to BigInt for comparison
 * This handles any formatting differences (leading zeros, case, etc.)
 */
function addressToBigInt(address: string): bigint {
  return BigInt(address);
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

      const logger = useLogger();
      const { db } = useDrizzleStorage();
      const { events, header } = block;

      if (!header) {
        logger.warn("No header in block, skipping");
        return;
      }

      const block_number = header.blockNumber ?? 0n;
      const block_timestamp = header.timestamp ?? new Date();

      // Only log blocks with events
      if (events.length > 0) {
        logger.info(`Block ${block_number}: ${events.length} events`);
      }

      // Process all events in order
      for (const event of events) {
        const keys = event.keys;
        const data = event.data;
        const transaction_hash = event.transactionHash;
        const event_index = event.eventIndex;
        const event_address = feltToHex(event.address);

        if (keys.length === 0) continue;

        const selector = feltToHex(keys[0]);

        // DEBUG: Uncomment to log every event
        // logger.info(`[DEBUG] Event from ${event_address} selector=${selector} keys=${JSON.stringify(keys.map(k => feltToHex(k)))}`);

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

            // logger.info(`Transfer: token ${token_id} from ${decoded.from} to ${decoded.to}`);

            // Upsert beast_owners with new owner
            await db.insert(schema.beast_owners).values({
              token_id,
              owner: decoded.to,
              updated_at: block_timestamp,
            }).onConflictDoUpdate({
              target: schema.beast_owners.token_id,
              set: {
                owner: decoded.to,
                updated_at: block_timestamp,
              },
            });

            // Check if we need to fetch metadata (only once per token)
            if (!fetchedTokens.has(token_id)) {
              // Fetch beast metadata via RPC
              // logger.info(`Fetching metadata for token ${token_id}`);
              const beast_data = await fetchBeastMetadata(token_id);

              if (beast_data) {
                const { id, prefix, suffix, level, health, shiny, animated } = beast_data;

                // Insert beast metadata (ignore if already exists)
                await db.insert(schema.beasts).values({
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
                }).onConflictDoNothing();

                // Compute entity_hash and link token_id in beast_data
                const entity_hash = computeEntityHash(id, prefix, suffix);
                await db.insert(schema.beast_data).values({
                  entity_hash,
                  token_id,
                  adventurers_killed: 0n,
                  last_death_timestamp: 0n,
                  last_killed_by: 0n,
                  updated_at: block_timestamp,
                }).onConflictDoUpdate({
                  target: schema.beast_data.entity_hash,
                  set: {
                    token_id,
                    updated_at: block_timestamp,
                  },
                });
                // logger.info(`Linked token ${token_id} to entity_hash ${entity_hash}`);

                // Mark as fetched in cache
                fetchedTokens.add(token_id);
                // logger.info(`Stored metadata for token ${token_id}: beast_id=${id}, level=${level}`);
              }
            }
            continue;
          }

          // Dojo World contract - EntityStats events
          const model_selector = feltToHex(keys[1]);
          if (addressToBigInt(event_address) === dojoWorldAddressBigInt &&
              selector === DOJO_EVENT_SELECTORS.StoreSetRecord &&
              model_selector === DOJO_EVENT_SELECTORS.EntityStats) {

            const decoded = decodeEntityStatsEvent([...keys], [...data]);

            // Filter by dungeon - only process Beast dungeon (0x6) events
            const BEAST_DUNGEON = "0x0000000000000000000000000000000000000000000000000000000000000006";
            if (decoded.dungeon !== BEAST_DUNGEON) {
              continue;
            }

            logger.info(`EntityStats: adventurers_killed=${decoded.adventurers_killed}`);

            // Upsert beast_data with adventurers_killed
            await db.insert(schema.beast_data).values({
              entity_hash: decoded.entity_hash,
              adventurers_killed: decoded.adventurers_killed,
              last_death_timestamp: 0n,
              last_killed_by: 0n,
              updated_at: block_timestamp,
            }).onConflictDoUpdate({
              target: schema.beast_data.entity_hash,
              set: {
                adventurers_killed: decoded.adventurers_killed,
                updated_at: block_timestamp,
              },
            });

            // Log: LS Events/EntityStats
            await insertSummitLog(db, {
              block_number,
              event_index,
              category: "LS Events",
              sub_category: "EntityStats",
              data: {
                entity_hash: decoded.entity_hash,
                adventurers_killed: decoded.adventurers_killed.toString(),
              },
              player: null,
              token_id: null,
              transaction_hash,
              created_at: block_timestamp,
              indexed_at,
            });
            continue;
          }

          // Dojo World contract - CollectableEntity events (keys[0]=StoreSetRecord, keys[1]=CollectableEntity model)
          if (addressToBigInt(event_address) === dojoWorldAddressBigInt &&
              selector === DOJO_EVENT_SELECTORS.StoreSetRecord &&
              model_selector === DOJO_EVENT_SELECTORS.CollectableEntity) {

            const decoded = decodeCollectableEntityEvent([...keys], [...data]);

            // Filter by dungeon - only process Loot Survivor dungeon events
            const LS_DUNGEON = "0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42";
            if (decoded.dungeon !== LS_DUNGEON) {
              continue;
            }

            logger.info(`CollectableEntity: last_killed_by=${decoded.last_killed_by}, timestamp=${decoded.timestamp}`);

            // Upsert beast_data with last_death_timestamp and last_killed_by
            await db.insert(schema.beast_data).values({
              entity_hash: decoded.entity_hash,
              adventurers_killed: 0n,
              last_death_timestamp: decoded.timestamp,
              last_killed_by: decoded.last_killed_by,
              updated_at: block_timestamp,
            }).onConflictDoUpdate({
              target: schema.beast_data.entity_hash,
              set: {
                last_death_timestamp: decoded.timestamp,
                last_killed_by: decoded.last_killed_by,
                updated_at: block_timestamp,
              },
            });

            // Log: LS Events/CollectableEntity
            await insertSummitLog(db, {
              block_number,
              event_index,
              category: "LS Events",
              sub_category: "CollectableEntity",
              data: {
                entity_hash: decoded.entity_hash,
                last_killed_by: decoded.last_killed_by.toString(),
                timestamp: decoded.timestamp.toString(),
              },
              player: null,
              token_id: null,
              transaction_hash,
              created_at: block_timestamp,
              indexed_at,
            });
            continue;
          }

          // Summit contract events
          if (addressToBigInt(event_address) !== summitAddressBigInt) continue;

          switch (selector) {
            case EVENT_SELECTORS.BeastUpdatesEvent: {
              const decoded = decodeBeastUpdatesEvent([...keys], [...data]);
              // logger.info(`BeastUpdatesEvent: ${decoded.packed_updates.length} updates`);

              for (let i = 0; i < decoded.packed_updates.length; i++) {
                const packed = decoded.packed_updates[i];
                const stats = unpackLiveBeastStats(packed);

                // Get previous stats for derived event detection
                const prev_stats = await getPreviousBeastStats(db, stats.token_id);
                const metadata = await getBeastMetadata(db, stats.token_id);
                const beast_owner = await getBeastOwner(db, stats.token_id);

                // Upsert beast stats
                await upsertBeastStats(db, stats, block_timestamp, indexed_at, block_number, transaction_hash);

                // Log derived events (stat changes)
                // Use sub-index offset based on position in batch to avoid collision
                const base_event_index = event_index * 1000 + i;
                await logBeastStatChanges(
                  db,
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
                  beast_owner,
                  base_event_index,
                  block_number,
                  transaction_hash,
                  block_timestamp,
                  indexed_at,
                  logger
                );

                // Detect Summit Change: attacker wins if total attack damage > total counter damage
                if (prev_stats?.current_health === 0 && stats.current_health > 0) {
                  await insertSummitLog(db, {
                    block_number,
                    event_index: event_index * 100 + 1, // Derived event offset
                    category: "Battle",
                    sub_category: "Summit Change",
                    data: {
                      attacking_player: beast_owner,
                      attacking_beast_token_id: stats.token_id,
                      defending_beast_token_id: stats.token_id,
                    },
                    player: beast_owner,
                    token_id: stats.token_id,
                    transaction_hash,
                    created_at: block_timestamp,
                    indexed_at,
                  });
                  // logger.info(`[Summit Log] Battle/Summit Change: ${stats.token_id} took summit from ${stats.token_id}`);
                }
              }
              break;
            }

            case EVENT_SELECTORS.LiveBeastStatsEvent: {
              const decoded = decodeLiveBeastStatsEvent([...keys], [...data]);
              const stats = decoded.live_stats;
              // logger.info(`LiveBeastStatsEvent: token_id=${stats.token_id}, health=${stats.current_health}`);

              // Get previous stats for derived event detection
              const prev_stats = await getPreviousBeastStats(db, stats.token_id);
              const metadata = await getBeastMetadata(db, stats.token_id);
              const live_beast_owner = await getBeastOwner(db, stats.token_id);

              // Upsert beast stats
              await upsertBeastStats(db, stats, block_timestamp, indexed_at, block_number, transaction_hash);

              // Log derived events (stat changes)
              await logBeastStatChanges(
                db,
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
                logger
              );
              break;
            }

            case EVENT_SELECTORS.BattleEvent: {
              const decoded = decodeBattleEvent([...keys], [...data]);
              // Look up attacking player from beast_owners
              const attacking_player = await getBeastOwner(db, decoded.attacking_beast_token_id);
              // logger.info(`BattleEvent: attacker=${decoded.attacking_beast_token_id} (${attacking_player}), defender=${decoded.defending_beast_token_id}, damage=${decoded.attack_damage}`);

              await db.insert(schema.battles).values({
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
              }).onConflictDoNothing();

              // Log: Battle/BattleEvent
              await insertSummitLog(db, {
                block_number,
                event_index,
                category: "Battle",
                sub_category: "BattleEvent",
                data: {
                  attacking_player,
                  attacking_beast_token_id: decoded.attacking_beast_token_id,
                  defending_beast_token_id: decoded.defending_beast_token_id,
                  attack_damage: decoded.attack_damage,
                  critical_attack_damage: decoded.critical_attack_damage,
                  attack_potions: decoded.attack_potions,
                  revive_potions: decoded.revive_potions,
                  xp_gained: decoded.xp_gained,
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
              // Look up owner from beast_owners
              const owner = await getBeastOwner(db, decoded.beast_token_id);
              // logger.info(`RewardsEarnedEvent: beast=${decoded.beast_token_id} (${owner}), amount=${decoded.amount}`);

              await db.insert(schema.rewards_earned).values({
                beast_token_id: decoded.beast_token_id,
                owner,
                amount: decoded.amount,
                created_at: block_timestamp,
                indexed_at: indexed_at,
                block_number,
                transaction_hash,
                event_index,
              }).onConflictDoNothing();

              // Log: Rewards/$SURVIVOR Earned
              await insertSummitLog(db, {
                block_number,
                event_index,
                category: "Rewards",
                sub_category: "$SURVIVOR Earned",
                data: {
                  owner,
                  beast_token_id: decoded.beast_token_id,
                  amount: decoded.amount,
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
              // logger.info(`RewardsClaimedEvent: player=${decoded.player}, amount=${decoded.amount}`);

              await db.insert(schema.rewards_claimed).values({
                player: decoded.player,
                beast_token_ids: "", // Not included in event
                amount: decoded.amount.toString(),
                created_at: block_timestamp,
                indexed_at: indexed_at,
                block_number,
                transaction_hash,
                event_index,
              }).onConflictDoNothing();

              // Log: Rewards/Claimed $SURVIVOR
              await insertSummitLog(db, {
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

              await db.insert(schema.poison_events).values({
                beast_token_id: decoded.beast_token_id,
                block_timestamp: BigInt(Math.floor(block_timestamp.getTime() / 1000)),
                count: decoded.count,
                player: decoded.player,
                created_at: block_timestamp,
                indexed_at: indexed_at,
                block_number,
                transaction_hash,
                event_index,
              }).onConflictDoNothing();

              // Log: Battle/Applied Poison
              await insertSummitLog(db, {
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
              // logger.info(`CorpseEvent: adventurer_id=${decoded.adventurer_id}, player=${decoded.player}`);

              await db.insert(schema.corpse_events).values({
                adventurer_id: decoded.adventurer_id,
                player: decoded.player,
                created_at: block_timestamp,
                indexed_at: indexed_at,
                block_number,
                transaction_hash,
                event_index,
              }).onConflictDoNothing();

              // Log: Rewards/Claimed Corpse
              await insertSummitLog(db, {
                block_number,
                event_index,
                category: "Rewards",
                sub_category: "Claimed Corpse",
                data: {
                  player: decoded.player,
                  adventurer_id: decoded.adventurer_id.toString(),
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
              // Look up player from beast_owners
              const skull_player = await getBeastOwner(db, decoded.beast_token_id);

              // Get old skulls value to calculate delta
              const oldSkullsResult = await db
                .select({ skulls: schema.skulls_claimed.skulls })
                .from(schema.skulls_claimed)
                .where(eq(schema.skulls_claimed.beast_token_id, decoded.beast_token_id))
                .limit(1);
              const oldSkulls = oldSkullsResult.length > 0 ? oldSkullsResult[0].skulls : 0n;
              const skullsClaimed = decoded.skulls - oldSkulls;

              // logger.info(`SkullEvent: beast=${decoded.beast_token_id} (${skull_player}), claimed=${skullsClaimed}, total=${decoded.skulls}`);

              // Upsert skulls_claimed - skulls value is cumulative total
              await db.insert(schema.skulls_claimed).values({
                beast_token_id: decoded.beast_token_id,
                skulls: decoded.skulls,
                updated_at: block_timestamp,
              }).onConflictDoUpdate({
                target: schema.skulls_claimed.beast_token_id,
                set: {
                  skulls: decoded.skulls,
                  updated_at: block_timestamp,
                },
              });

              // Log: Rewards/Claimed Skulls (with delta, not total)
              await insertSummitLog(db, {
                block_number,
                event_index,
                category: "Rewards",
                sub_category: "Claimed Skulls",
                data: {
                  beast_token_id: decoded.beast_token_id,
                  skulls_claimed: skullsClaimed.toString(),
                },
                player: skull_player,
                token_id: decoded.beast_token_id,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
              break;
            }

            default:
              // Unknown event - could be other contract events
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
          // Don't re-throw - let the indexer continue processing other events
          // Reorgs are handled automatically by the Drizzle plugin via message:invalidate hook
        }
      }

      // Log processing duration for latency diagnostics
      // if (events.length > 0) {
      //   const processingMs = Date.now() - indexed_at.getTime();
      //   logger.info(`[TIMING] Block ${block_number}: ${events.length} events processed in ${processingMs}ms`);
      // }
    },
  });
}
