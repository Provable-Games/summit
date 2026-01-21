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
 * - DiplomacyEvent: Diplomacy group formations
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
  decodeDiplomacyEvent,
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
  entityStatsDungeon: string;
  collectableEntityDungeon: string;
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
async function getBeastOwner(db: any, tokenId: number): Promise<string | null> {
  const result = await db
    .select({ owner: schema.beastOwners.owner })
    .from(schema.beastOwners)
    .where(eq(schema.beastOwners.tokenId, tokenId))
    .limit(1);
  return result.length > 0 ? result[0].owner : null;
}

/**
 * Beast stats for comparison (used for derived events)
 */
interface BeastStatsSnapshot {
  tokenId: number;
  spirit: number;
  luck: number;
  specials: number;
  wisdom: number;
  diplomacy: number;
  bonusHealth: number;
  extraLives: number;
  hasClaimedPotions: number;
  currentHealth?: number;
}

/**
 * Beast metadata for log enrichment
 */
interface BeastMetadata {
  beastId: number;
  prefix: number;
  suffix: number;
}

/**
 * Log entry data structure
 */
interface LogEntry {
  blockNumber: bigint;
  eventIndex: number;
  category: string;
  subCategory: string;
  data: Record<string, unknown>;
  player?: string | null;
  tokenId?: number | null;
  transactionHash: string;
  createdAt: Date;
  indexedAt: Date;
}

/**
 * Helper to insert a summit log entry
 */
async function insertSummitLog(db: any, entry: LogEntry): Promise<void> {
  await db.insert(schema.summitLog).values({
    blockNumber: entry.blockNumber,
    eventIndex: entry.eventIndex,
    category: entry.category,
    subCategory: entry.subCategory,
    data: entry.data,
    player: entry.player,
    tokenId: entry.tokenId,
    transactionHash: entry.transactionHash,
    createdAt: entry.createdAt,
    indexedAt: entry.indexedAt,
  }).onConflictDoNothing();
}

/**
 * Helper to get previous beast stats for comparison (before upsert)
 */
async function getPreviousBeastStats(db: any, tokenId: number): Promise<BeastStatsSnapshot | null> {
  const result = await db
    .select({
      tokenId: schema.beastStats.tokenId,
      spirit: schema.beastStats.spirit,
      luck: schema.beastStats.luck,
      specials: schema.beastStats.specials,
      wisdom: schema.beastStats.wisdom,
      diplomacy: schema.beastStats.diplomacy,
      bonusHealth: schema.beastStats.bonusHealth,
      extraLives: schema.beastStats.extraLives,
      hasClaimedPotions: schema.beastStats.hasClaimedPotions,
      currentHealth: schema.beastStats.currentHealth,
    })
    .from(schema.beastStats)
    .where(eq(schema.beastStats.tokenId, tokenId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Helper to get beast metadata for log enrichment
 */
async function getBeastMetadata(db: any, tokenId: number): Promise<BeastMetadata | null> {
  const result = await db
    .select({
      beastId: schema.beasts.beastId,
      prefix: schema.beasts.prefix,
      suffix: schema.beasts.suffix,
    })
    .from(schema.beasts)
    .where(eq(schema.beasts.tokenId, tokenId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Stat upgrade configuration for derived events
 */
const STAT_UPGRADES = [
  { field: "spirit" as const, subCategory: "Spirit" },
  { field: "luck" as const, subCategory: "Luck" },
  { field: "specials" as const, subCategory: "Specials" },
  { field: "wisdom" as const, subCategory: "Wisdom" },
  { field: "diplomacy" as const, subCategory: "Diplomacy" },
  { field: "bonusHealth" as const, subCategory: "Bonus Health" },
  { field: "extraLives" as const, subCategory: "Applied Extra Life" },
] as const;

/**
 * Helper to detect and log beast stat changes (derived events)
 * Returns the number of derived events created (for event index offset)
 */
async function logBeastStatChanges(
  db: any,
  prevStats: BeastStatsSnapshot | null,
  newStats: BeastStatsSnapshot,
  metadata: BeastMetadata | null,
  player: string | null,
  baseEventIndex: number,
  blockNumber: bigint,
  transactionHash: string,
  blockTimestamp: Date,
  indexedAt: Date,
  logger: any
): Promise<number> {
  let derivedOffset = 0;

  // If no previous stats, this is a new beast - no changes to detect
  if (!prevStats) {
    return derivedOffset;
  }

  // Check each stat for increases
  for (const { field, subCategory } of STAT_UPGRADES) {
    const oldValue = prevStats[field];
    const newValue = newStats[field];

    if (newValue > oldValue) {
      derivedOffset++;
      const eventIndex = baseEventIndex * 100 + derivedOffset;

      // Determine category based on field
      const category = field === "extraLives" ? "Battle" : "Beast Upgrade";

      await insertSummitLog(db, {
        blockNumber,
        eventIndex,
        category,
        subCategory,
        data: {
          player,
          tokenId: newStats.tokenId,
          beastId: metadata?.beastId ?? null,
          prefix: metadata?.prefix ?? null,
          suffix: metadata?.suffix ?? null,
          oldValue,
          newValue,
          difference: newValue - oldValue,
        },
        player,
        tokenId: newStats.tokenId,
        transactionHash,
        createdAt: blockTimestamp,
        indexedAt,
      });

      logger.info(`[Summit Log] ${category}/${subCategory}: token ${newStats.tokenId} ${oldValue} -> ${newValue}`);
    }
  }

  // Check for hasClaimedPotions flip (0 -> 1)
  if (prevStats.hasClaimedPotions === 0 && newStats.hasClaimedPotions === 1) {
    derivedOffset++;
    const eventIndex = baseEventIndex * 100 + derivedOffset;

    await insertSummitLog(db, {
      blockNumber,
      eventIndex,
      category: "Arriving to Summit",
      subCategory: "Claimed Potions",
      data: {
        player,
        tokenId: newStats.tokenId,
        beastId: metadata?.beastId ?? null,
        prefix: metadata?.prefix ?? null,
        suffix: metadata?.suffix ?? null,
      },
      player,
      tokenId: newStats.tokenId,
      transactionHash,
      createdAt: blockTimestamp,
      indexedAt,
    });

    logger.info(`[Summit Log] Arriving to Summit/Claimed Potions: token ${newStats.tokenId}`);
  }

  return derivedOffset;
}

/**
 * Helper to upsert beast stats
 */
async function upsertBeastStats(
  db: any,
  stats: {
    tokenId: number;
    currentHealth: number;
    bonusHealth: number;
    bonusXp: number;
    attackStreak: number;
    lastDeathTimestamp: bigint;
    revivalCount: number;
    extraLives: number;
    hasClaimedPotions: number;
    blocksHeld: number;
    spirit: number;
    luck: number;
    specials: number;
    wisdom: number;
    diplomacy: number;
    rewardsEarned: number;
    rewardsClaimed: number;
  },
  blockTimestamp: Date,
  indexedAt: Date,
  blockNumber: bigint,
  transactionHash: string
): Promise<void> {
  await db.insert(schema.beastStats).values({
    tokenId: stats.tokenId,
    currentHealth: stats.currentHealth,
    bonusHealth: stats.bonusHealth,
    bonusXp: stats.bonusXp,
    attackStreak: stats.attackStreak,
    lastDeathTimestamp: stats.lastDeathTimestamp,
    revivalCount: stats.revivalCount,
    extraLives: stats.extraLives,
    hasClaimedPotions: stats.hasClaimedPotions,
    blocksHeld: stats.blocksHeld,
    spirit: stats.spirit,
    luck: stats.luck,
    specials: stats.specials,
    wisdom: stats.wisdom,
    diplomacy: stats.diplomacy,
    rewardsEarned: stats.rewardsEarned,
    rewardsClaimed: stats.rewardsClaimed,
    createdAt: blockTimestamp,
    indexedAt,
    blockNumber,
    transactionHash,
  }).onConflictDoUpdate({
    target: schema.beastStats.tokenId,
    set: {
      currentHealth: stats.currentHealth,
      bonusHealth: stats.bonusHealth,
      bonusXp: stats.bonusXp,
      attackStreak: stats.attackStreak,
      lastDeathTimestamp: stats.lastDeathTimestamp,
      revivalCount: stats.revivalCount,
      extraLives: stats.extraLives,
      hasClaimedPotions: stats.hasClaimedPotions,
      blocksHeld: stats.blocksHeld,
      spirit: stats.spirit,
      luck: stats.luck,
      specials: stats.specials,
      wisdom: stats.wisdom,
      diplomacy: stats.diplomacy,
      rewardsEarned: stats.rewardsEarned,
      rewardsClaimed: stats.rewardsClaimed,
      indexedAt,
      updatedAt: blockTimestamp,
      blockNumber,
      transactionHash,
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
    entityStatsDungeon,
    collectableEntityDungeon,
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
  const entityStatsDungeonBigInt = addressToBigInt(entityStatsDungeon);
  const collectableEntityDungeonBigInt = addressToBigInt(collectableEntityDungeon);

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
  async function fetchBeastMetadata(tokenId: number): Promise<{
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
              calldata: [`0x${tokenId.toString(16)}`, "0x0"], // u256: low, high
            },
            block_id: "latest",
          },
          id: 1,
        }),
      });

      const json = await response.json();
      if (json.error) {
        console.error(`RPC error for token ${tokenId}:`, json.error);
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
      console.error(`Failed to fetch metadata for token ${tokenId}:`, error);
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
        // Dojo World contract - ALL events (temporarily no key filter for debugging)
        {
          address: dojoWorldAddress.toLowerCase() as `0x${string}`,
        },
      ],
    },
    plugins: [
      drizzleStorage({
        db: database,
        persistState: true,
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
      const indexedAt = new Date();

      const logger = useLogger();
      const { db } = useDrizzleStorage();
      const { events, header } = block;

      if (!header) {
        logger.warn("No header in block, skipping");
        return;
      }

      const blockNumber = header.blockNumber ?? 0n;
      const blockTimestamp = header.timestamp ?? new Date();

      if (events.length > 0) {
        logger.info(`Processing ${events.length} events at block ${blockNumber}`);
      }

      // Process all events in order
      for (const event of events) {
        const keys = event.keys;
        const data = event.data;
        const transactionHash = event.transactionHash;
        const eventIndex = event.eventIndex;
        const eventAddress = feltToHex(event.address);

        if (keys.length === 0) continue;

        const selector = feltToHex(keys[0]);

        // DEBUG: Log every event to see what's coming through
        logger.info(`[DEBUG] Event from ${eventAddress} selector=${selector} keys=${JSON.stringify(keys.map(k => feltToHex(k)))}`);

        try {
          // Beasts NFT contract - Transfer events
          if (addressToBigInt(eventAddress) === beastsAddressBigInt && selector === BEAST_EVENT_SELECTORS.Transfer) {
            const decoded = decodeTransferEvent([...keys], [...data]);
            const tokenId = Number(decoded.tokenId);

            // Skip burn events (transfer to 0x0)
            if (decoded.to === ZERO_ADDRESS) {
              logger.debug(`Skipping burn event for token ${tokenId}`);
              continue;
            }

            logger.info(`Transfer: token ${tokenId} from ${decoded.from} to ${decoded.to}`);

            // Upsert beast_owners with new owner
            await db.insert(schema.beastOwners).values({
              tokenId,
              owner: decoded.to,
              updatedAt: blockTimestamp,
            }).onConflictDoUpdate({
              target: schema.beastOwners.tokenId,
              set: {
                owner: decoded.to,
                updatedAt: blockTimestamp,
              },
            });

            // Check if we need to fetch metadata (only once per token)
            if (!fetchedTokens.has(tokenId)) {
              // Fetch beast metadata via RPC
              logger.info(`Fetching metadata for token ${tokenId}`);
              const beastData = await fetchBeastMetadata(tokenId);

              if (beastData) {
                const { id, prefix, suffix, level, health, shiny, animated } = beastData;

                // Insert beast metadata (ignore if already exists)
                await db.insert(schema.beasts).values({
                  tokenId,
                  beastId: id,
                  prefix,
                  suffix,
                  level,
                  health,
                  shiny,
                  animated,
                  createdAt: blockTimestamp,
                  indexedAt,
                }).onConflictDoNothing();

                // Compute entity_hash and link token_id in beast_data
                const entityHash = computeEntityHash(id, prefix, suffix);
                await db.insert(schema.beastData).values({
                  entityHash,
                  tokenId,
                  adventurersKilled: 0n,
                  lastDeathTimestamp: 0n,
                  updatedAt: blockTimestamp,
                }).onConflictDoUpdate({
                  target: schema.beastData.entityHash,
                  set: {
                    tokenId,
                    updatedAt: blockTimestamp,
                  },
                });
                logger.info(`Linked token ${tokenId} to entity_hash ${entityHash}`);

                // Mark as fetched in cache
                fetchedTokens.add(tokenId);
                logger.info(`Stored metadata for token ${tokenId}: beast_id=${id}, level=${level}`);
              }
            }
            continue;
          }

          // Dojo World contract - EntityStats events
          if (addressToBigInt(eventAddress) === dojoWorldAddressBigInt && selector === DOJO_EVENT_SELECTORS.EntityStats) {
            // Filter by dungeon address (keys[1])
            const dungeonAddress = feltToHex(keys[2]);
            if (addressToBigInt(dungeonAddress) !== entityStatsDungeonBigInt) {
              logger.debug(`Skipping EntityStats from non-target dungeon: ${dungeonAddress}`);
              continue;
            }

            const decoded = decodeEntityStatsEvent([...keys], [...data]);
            logger.info(`EntityStats: entity_hash=${decoded.entityHash}, adventurers_killed=${decoded.adventurersKilled}`);

            // Upsert beast_data with adventurers_killed
            await db.insert(schema.beastData).values({
              entityHash: decoded.entityHash,
              adventurersKilled: decoded.adventurersKilled,
              lastDeathTimestamp: 0n,
              updatedAt: blockTimestamp,
            }).onConflictDoUpdate({
              target: schema.beastData.entityHash,
              set: {
                adventurersKilled: decoded.adventurersKilled,
                updatedAt: blockTimestamp,
              },
            });

            // Log: LS Events/EntityStats
            await insertSummitLog(db, {
              blockNumber,
              eventIndex,
              category: "LS Events",
              subCategory: "EntityStats",
              data: {
                entityHash: decoded.entityHash,
                adventurersKilled: decoded.adventurersKilled.toString(),
              },
              player: null,
              tokenId: null,
              transactionHash,
              createdAt: blockTimestamp,
              indexedAt,
            });
            continue;
          }

          // Dojo World contract - CollectableEntity events
          if (addressToBigInt(eventAddress) === dojoWorldAddressBigInt && selector === DOJO_EVENT_SELECTORS.CollectableEntity) {
            // Filter by dungeon address (keys[1])
            const dungeonAddress = feltToHex(keys[2]);
            if (addressToBigInt(dungeonAddress) !== collectableEntityDungeonBigInt) {
              logger.debug(`Skipping CollectableEntity from non-target dungeon: ${dungeonAddress}`);
              continue;
            }

            const decoded = decodeCollectableEntityEvent([...keys], [...data]);
            logger.info(`CollectableEntity: entity_hash=${decoded.entityHash}, timestamp=${decoded.timestamp}`);

            // Upsert beast_data with last_death_timestamp
            await db.insert(schema.beastData).values({
              entityHash: decoded.entityHash,
              adventurersKilled: 0n,
              lastDeathTimestamp: decoded.timestamp,
              updatedAt: blockTimestamp,
            }).onConflictDoUpdate({
              target: schema.beastData.entityHash,
              set: {
                lastDeathTimestamp: decoded.timestamp,
                updatedAt: blockTimestamp,
              },
            });

            // Log: LS Events/CollectableEntity
            await insertSummitLog(db, {
              blockNumber,
              eventIndex,
              category: "LS Events",
              subCategory: "CollectableEntity",
              data: {
                entityHash: decoded.entityHash,
                timestamp: decoded.timestamp.toString(),
              },
              player: null,
              tokenId: null,
              transactionHash,
              createdAt: blockTimestamp,
              indexedAt,
            });
            continue;
          }

          // Summit contract events
          if (addressToBigInt(eventAddress) !== summitAddressBigInt) continue;

          switch (selector) {
            case EVENT_SELECTORS.BeastUpdatesEvent: {
              const decoded = decodeBeastUpdatesEvent([...keys], [...data]);
              logger.info(`BeastUpdatesEvent: ${decoded.packedUpdates.length} updates`);

              for (let i = 0; i < decoded.packedUpdates.length; i++) {
                const packed = decoded.packedUpdates[i];
                const stats = unpackLiveBeastStats(packed);

                // Get previous stats for derived event detection
                const prevStats = await getPreviousBeastStats(db, stats.tokenId);
                const metadata = await getBeastMetadata(db, stats.tokenId);
                const beastOwner = await getBeastOwner(db, stats.tokenId);

                // Upsert beast stats
                await upsertBeastStats(db, stats, blockTimestamp, indexedAt, blockNumber, transactionHash);

                // Log derived events (stat changes)
                // Use sub-index offset based on position in batch to avoid collision
                const baseEventIndex = eventIndex * 1000 + i;
                await logBeastStatChanges(
                  db,
                  prevStats,
                  {
                    tokenId: stats.tokenId,
                    spirit: stats.spirit,
                    luck: stats.luck,
                    specials: stats.specials,
                    wisdom: stats.wisdom,
                    diplomacy: stats.diplomacy,
                    bonusHealth: stats.bonusHealth,
                    extraLives: stats.extraLives,
                    hasClaimedPotions: stats.hasClaimedPotions,
                  },
                  metadata,
                  beastOwner,
                  baseEventIndex,
                  blockNumber,
                  transactionHash,
                  blockTimestamp,
                  indexedAt,
                  logger
                );

                // Detect Summit Change: attacker wins if total attack damage > total counter damage
                if (prevStats?.currentHealth === 0 && stats.currentHealth > 0) {
                  await insertSummitLog(db, {
                    blockNumber,
                    eventIndex: eventIndex * 100 + 1, // Derived event offset
                    category: "Battle",
                    subCategory: "Summit Change",
                    data: {
                      attackingPlayer: beastOwner,
                      attackingBeastTokenId: stats.tokenId,
                      defendingBeastTokenId: stats.tokenId,
                    },
                    player: beastOwner,
                    tokenId: stats.tokenId,
                    transactionHash,
                    createdAt: blockTimestamp,
                    indexedAt,
                  });
                  logger.info(`[Summit Log] Battle/Summit Change: ${stats.tokenId} took summit from ${stats.tokenId}`);
                }
              }
              break;
            }

            case EVENT_SELECTORS.LiveBeastStatsEvent: {
              const decoded = decodeLiveBeastStatsEvent([...keys], [...data]);
              const stats = decoded.liveStats;
              logger.info(`LiveBeastStatsEvent: token_id=${stats.tokenId}, health=${stats.currentHealth}`);

              // Get previous stats for derived event detection
              const prevStats = await getPreviousBeastStats(db, stats.tokenId);
              const metadata = await getBeastMetadata(db, stats.tokenId);
              const liveBeastOwner = await getBeastOwner(db, stats.tokenId);

              // Upsert beast stats
              await upsertBeastStats(db, stats, blockTimestamp, indexedAt, blockNumber, transactionHash);

              // Log derived events (stat changes)
              await logBeastStatChanges(
                db,
                prevStats,
                {
                  tokenId: stats.tokenId,
                  spirit: stats.spirit,
                  luck: stats.luck,
                  specials: stats.specials,
                  wisdom: stats.wisdom,
                  diplomacy: stats.diplomacy,
                  bonusHealth: stats.bonusHealth,
                  extraLives: stats.extraLives,
                  hasClaimedPotions: stats.hasClaimedPotions,
                },
                metadata,
                liveBeastOwner,
                eventIndex,
                blockNumber,
                transactionHash,
                blockTimestamp,
                indexedAt,
                logger
              );
              break;
            }

            case EVENT_SELECTORS.BattleEvent: {
              const decoded = decodeBattleEvent([...keys], [...data]);
              // Look up attacking player from beast_owners
              const attackingPlayer = await getBeastOwner(db, decoded.attackingBeastTokenId);
              logger.info(`BattleEvent: attacker=${decoded.attackingBeastTokenId} (${attackingPlayer}), defender=${decoded.defendingBeastTokenId}, damage=${decoded.attackDamage}`);

              await db.insert(schema.battles).values({
                attackingBeastTokenId: decoded.attackingBeastTokenId,
                attackingPlayer,
                attackIndex: decoded.attackIndex,
                defendingBeastTokenId: decoded.defendingBeastTokenId,
                attackCount: decoded.attackCount,
                attackDamage: decoded.attackDamage,
                criticalAttackCount: decoded.criticalAttackCount,
                criticalAttackDamage: decoded.criticalAttackDamage,
                counterAttackCount: decoded.counterAttackCount,
                counterAttackDamage: decoded.counterAttackDamage,
                criticalCounterAttackCount: decoded.criticalCounterAttackCount,
                criticalCounterAttackDamage: decoded.criticalCounterAttackDamage,
                attackPotions: decoded.attackPotions,
                revivePotions: decoded.revivePotions,
                xpGained: decoded.xpGained,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();

              // Log: Battle/BattleEvent
              await insertSummitLog(db, {
                blockNumber,
                eventIndex,
                category: "Battle",
                subCategory: "BattleEvent",
                data: {
                  attackingPlayer,
                  attackingBeastTokenId: decoded.attackingBeastTokenId,
                  defendingBeastTokenId: decoded.defendingBeastTokenId,
                  attackDamage: decoded.attackDamage,
                  criticalAttackDamage: decoded.criticalAttackDamage,
                  attackPotions: decoded.attackPotions,
                  revivePotions: decoded.revivePotions,
                  xpGained: decoded.xpGained,
                },
                player: attackingPlayer,
                tokenId: decoded.attackingBeastTokenId,
                transactionHash,
                createdAt: blockTimestamp,
                indexedAt,
              });
              break;
            }

            case EVENT_SELECTORS.RewardsEarnedEvent: {
              const decoded = decodeRewardsEarnedEvent([...keys], [...data]);
              // Look up owner from beast_owners
              const owner = await getBeastOwner(db, decoded.beastTokenId);
              logger.info(`RewardsEarnedEvent: beast=${decoded.beastTokenId} (${owner}), amount=${decoded.amount}`);

              await db.insert(schema.rewardsEarned).values({
                beastTokenId: decoded.beastTokenId,
                owner,
                amount: decoded.amount,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();

              // Log: Rewards/$SURVIVOR Earned
              await insertSummitLog(db, {
                blockNumber,
                eventIndex,
                category: "Rewards",
                subCategory: "$SURVIVOR Earned",
                data: {
                  owner,
                  beastTokenId: decoded.beastTokenId,
                  amount: decoded.amount,
                },
                player: owner,
                tokenId: decoded.beastTokenId,
                transactionHash,
                createdAt: blockTimestamp,
                indexedAt,
              });
              break;
            }

            case EVENT_SELECTORS.RewardsClaimedEvent: {
              const decoded = decodeRewardsClaimedEvent([...keys], [...data]);
              logger.info(`RewardsClaimedEvent: player=${decoded.player}, amount=${decoded.amount}`);

              await db.insert(schema.rewardsClaimed).values({
                player: decoded.player,
                beastTokenIds: "", // Not included in event
                amount: decoded.amount.toString(),
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();

              // Log: Rewards/Claimed $SURVIVOR
              await insertSummitLog(db, {
                blockNumber,
                eventIndex,
                category: "Rewards",
                subCategory: "Claimed $SURVIVOR",
                data: {
                  player: decoded.player,
                  amount: decoded.amount.toString(),
                },
                player: decoded.player,
                tokenId: null,
                transactionHash,
                createdAt: blockTimestamp,
                indexedAt,
              });
              break;
            }

            case EVENT_SELECTORS.PoisonEvent: {
              const decoded = decodePoisonEvent([...keys], [...data]);
              logger.info(`PoisonEvent: beast=${decoded.beastTokenId}, player=${decoded.player}, count=${decoded.count}`);

              await db.insert(schema.poisonEvents).values({
                beastTokenId: decoded.beastTokenId,
                blockTimestamp: BigInt(Math.floor(blockTimestamp.getTime() / 1000)),
                count: decoded.count,
                player: decoded.player,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();

              // Log: Battle/Applied Poison
              await insertSummitLog(db, {
                blockNumber,
                eventIndex,
                category: "Battle",
                subCategory: "Applied Poison",
                data: {
                  player: decoded.player,
                  beastTokenId: decoded.beastTokenId,
                  count: decoded.count,
                },
                player: decoded.player,
                tokenId: decoded.beastTokenId,
                transactionHash,
                createdAt: blockTimestamp,
                indexedAt,
              });
              break;
            }

            case EVENT_SELECTORS.DiplomacyEvent: {
              const decoded = decodeDiplomacyEvent([...keys], [...data]);
              logger.info(`DiplomacyEvent: specials_hash=${decoded.specialsHash}, beasts=${decoded.beastTokenIds.length}, power=${decoded.totalPower}`);

              await db.insert(schema.diplomacyGroups).values({
                specialsHash: decoded.specialsHash,
                beastTokenIds: decoded.beastTokenIds.join(","),
                totalPower: decoded.totalPower,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();
              break;
            }

            case EVENT_SELECTORS.CorpseEvent: {
              const decoded = decodeCorpseEvent([...keys], [...data]);
              logger.info(`CorpseEvent: adventurer_id=${decoded.adventurerId}, player=${decoded.player}`);

              await db.insert(schema.corpseEvents).values({
                adventurerId: decoded.adventurerId,
                player: decoded.player,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();

              // Log: Rewards/Claimed Corpse
              await insertSummitLog(db, {
                blockNumber,
                eventIndex,
                category: "Rewards",
                subCategory: "Claimed Corpse",
                data: {
                  player: decoded.player,
                  adventurerId: decoded.adventurerId.toString(),
                },
                player: decoded.player,
                tokenId: null,
                transactionHash,
                createdAt: blockTimestamp,
                indexedAt,
              });
              break;
            }

            case EVENT_SELECTORS.SkullEvent: {
              const decoded = decodeSkullEvent([...keys], [...data]);
              // Look up player from beast_owners
              const skullPlayer = await getBeastOwner(db, decoded.beastTokenId);
              logger.info(`SkullEvent: beast=${decoded.beastTokenId} (${skullPlayer}), skulls=${decoded.skulls}`);

              await db.insert(schema.skullEvents).values({
                beastTokenId: decoded.beastTokenId,
                skulls: decoded.skulls,
                player: skullPlayer,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();

              // Log: Rewards/Claimed Skulls
              await insertSummitLog(db, {
                blockNumber,
                eventIndex,
                category: "Rewards",
                subCategory: "Claimed Skulls",
                data: {
                  player: skullPlayer,
                  beastTokenId: decoded.beastTokenId,
                  skulls: decoded.skulls.toString(),
                },
                player: skullPlayer,
                tokenId: decoded.beastTokenId,
                transactionHash,
                createdAt: blockTimestamp,
                indexedAt,
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
            `Error processing event at block ${blockNumber}, index ${eventIndex}: ${error}`
          );
          logger.error(`Event selector: ${selector}`);
          logger.error(`Keys: ${JSON.stringify(keys)}`);
          logger.error(`Data: ${JSON.stringify(data)}`);
          // Don't re-throw - let the indexer continue processing other events
          // Reorgs are handled automatically by the Drizzle plugin via message:invalidate hook
        }
      }

      // Log processing duration for latency diagnostics
      if (events.length > 0) {
        const processingMs = Date.now() - indexedAt.getTime();
        logger.info(`[TIMING] Block ${blockNumber}: ${events.length} events processed in ${processingMs}ms`);
      }
    },
  });
}
