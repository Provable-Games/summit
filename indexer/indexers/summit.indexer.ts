/**
 * Summit Indexer
 *
 * Indexes all Summit contract events and persists them to PostgreSQL.
 * Uses the Apibara SDK with Drizzle ORM for storage.
 *
 * Events (10 total):
 * - BeastUpdatesEvent: Batch beast stat updates (packed)
 * - LiveBeastStatsEvent: Single beast stat update (packed into felt252)
 * - BattleEvent: Combat results
 * - RewardEvent: Token rewards
 * - RewardsClaimedEvent: Rewards claimed by player
 * - PoisonEvent: Poison attacks
 * - DiplomacyEvent: Diplomacy group formations
 * - SummitEvent: Summit takeovers
 * - CorpseEvent: Corpse creation
 * - SkullEvent: Skull claims
 *
 * Architecture Notes:
 * - Uses high-level defineIndexer API
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

import * as schema from "../src/lib/schema.js";
import {
  EVENT_SELECTORS,
  decodeBeastUpdatesEvent,
  decodeLiveBeastStatsEvent,
  decodeBattleEvent,
  decodeRewardEvent,
  decodeRewardsClaimedEvent,
  decodePoisonEvent,
  decodeDiplomacyEvent,
  decodeSummitEvent,
  decodeCorpseEvent,
  decodeSkullEvent,
  unpackLiveBeastStats,
  feltToHex,
} from "../src/lib/decoder.js";

interface SummitConfig {
  contractAddress: string;
  streamUrl: string;
  startingBlock: string;
  databaseUrl: string;
}

export default function indexer(runtimeConfig: ApibaraRuntimeConfig) {
  // Get configuration from runtime config
  const config = runtimeConfig.summit as SummitConfig;
  const {
    contractAddress,
    streamUrl,
    startingBlock: startBlockStr,
    databaseUrl,
  } = config;
  const startingBlock = BigInt(startBlockStr);

  // Normalize contract address to ensure proper format
  const normalizedAddress = contractAddress.toLowerCase().startsWith("0x")
    ? contractAddress.toLowerCase()
    : `0x${contractAddress.toLowerCase()}`;

  // Log configuration on startup
  console.log("[Summit Indexer] Contract Address:", contractAddress);
  console.log("[Summit Indexer] Stream:", streamUrl);
  console.log("[Summit Indexer] Starting Block:", startingBlock.toString());

  // Create Drizzle database instance
  const database = drizzle({ schema, connectionString: databaseUrl });

  return defineIndexer(StarknetStream)({
    streamUrl,
    finality: "pending",
    startingBlock,
    filter: {
      events: [
        {
          address: normalizedAddress as `0x${string}`,
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

      for (const event of events) {
        const keys = event.keys;
        const data = event.data;
        const transactionHash = event.transactionHash;
        const eventIndex = event.eventIndex;

        if (keys.length === 0) continue;

        const selector = feltToHex(keys[0]);

        try {
          switch (selector) {
            case EVENT_SELECTORS.BeastUpdatesEvent: {
              const decoded = decodeBeastUpdatesEvent(keys, data);
              logger.info(`BeastUpdatesEvent: ${decoded.packedUpdates.length} updates`);

              // Process each packed update
              for (const packed of decoded.packedUpdates) {
                const stats = unpackLiveBeastStats(packed);

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
                  indexedAt: indexedAt,
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
                    indexedAt: indexedAt,
                    updatedAt: blockTimestamp,
                    blockNumber,
                    transactionHash,
                  },
                });
              }
              break;
            }

            case EVENT_SELECTORS.LiveBeastStatsEvent: {
              const decoded = decodeLiveBeastStatsEvent(keys, data);
              const stats = decoded.liveStats;
              logger.info(`LiveBeastStatsEvent: token_id=${stats.tokenId}, health=${stats.currentHealth}`);

              // Upsert beast stats - we only care about latest state
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
                indexedAt: indexedAt,
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
                  indexedAt: indexedAt,
                  updatedAt: blockTimestamp,
                  blockNumber,
                  transactionHash,
                },
              });
              break;
            }

            case EVENT_SELECTORS.BattleEvent: {
              const decoded = decodeBattleEvent(keys, data);
              logger.info(`BattleEvent: attacker=${decoded.attackingBeastTokenId}, defender=${decoded.defendingBeastTokenId}, damage=${decoded.attackDamage}`);

              await db.insert(schema.battles).values({
                attackingBeastTokenId: decoded.attackingBeastTokenId,
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
                xpGained: decoded.xpGained,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();
              break;
            }

            case EVENT_SELECTORS.RewardEvent: {
              const decoded = decodeRewardEvent(keys, data);
              logger.info(`RewardEvent: beast=${decoded.beastTokenId}, owner=${decoded.owner}, amount=${decoded.amount}`);

              await db.insert(schema.rewards).values({
                rewardBlockNumber: decoded.blockNumber,
                beastTokenId: decoded.beastTokenId,
                owner: decoded.owner,
                amount: decoded.amount,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();
              break;
            }

            case EVENT_SELECTORS.RewardsClaimedEvent: {
              const decoded = decodeRewardsClaimedEvent(keys, data);
              logger.info(`RewardsClaimedEvent: player=${decoded.player}, beasts=${decoded.beastTokenIds.length}, amount=${decoded.amount}`);

              await db.insert(schema.rewardsClaimed).values({
                player: decoded.player,
                beastTokenIds: decoded.beastTokenIds.join(","),
                amount: decoded.amount.toString(),
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();
              break;
            }

            case EVENT_SELECTORS.PoisonEvent: {
              const decoded = decodePoisonEvent(keys, data);
              logger.info(`PoisonEvent: beast=${decoded.beastTokenId}, player=${decoded.player}, count=${decoded.count}`);

              await db.insert(schema.poisonEvents).values({
                beastTokenId: decoded.beastTokenId,
                blockTimestamp: decoded.blockTimestamp,
                count: decoded.count,
                player: decoded.player,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();
              break;
            }

            case EVENT_SELECTORS.DiplomacyEvent: {
              const decoded = decodeDiplomacyEvent(keys, data);
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

            case EVENT_SELECTORS.SummitEvent: {
              const decoded = decodeSummitEvent(keys, data);
              logger.info(`SummitEvent: beast_token_id=${decoded.beastTokenId}, owner=${decoded.owner}`);

              await db.insert(schema.summitHistory).values({
                // Beast identifiers
                beastTokenId: decoded.beastTokenId,
                beastId: decoded.beastId,
                beastPrefix: decoded.prefix,
                beastSuffix: decoded.suffix,
                beastLevel: decoded.level,
                beastHealth: decoded.health,
                beastShiny: decoded.shiny,
                beastAnimated: decoded.animated,
                // LiveBeastStats fields
                tokenId: decoded.liveStats.tokenId,
                currentHealth: decoded.liveStats.currentHealth,
                bonusHealth: decoded.liveStats.bonusHealth,
                bonusXp: decoded.liveStats.bonusXp,
                attackStreak: decoded.liveStats.attackStreak,
                lastDeathTimestamp: decoded.liveStats.lastDeathTimestamp,
                revivalCount: decoded.liveStats.revivalCount,
                extraLives: decoded.liveStats.extraLives,
                hasClaimedPotions: decoded.liveStats.hasClaimedPotions,
                blocksHeld: decoded.liveStats.blocksHeld,
                spirit: decoded.liveStats.spirit,
                luck: decoded.liveStats.luck,
                specials: decoded.liveStats.specials,
                wisdom: decoded.liveStats.wisdom,
                diplomacyStat: decoded.liveStats.diplomacy,
                rewardsEarned: decoded.liveStats.rewardsEarned,
                rewardsClaimed: decoded.liveStats.rewardsClaimed,
                // Owner
                owner: decoded.owner,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();
              break;
            }

            case EVENT_SELECTORS.CorpseEvent: {
              const decoded = decodeCorpseEvent(keys, data);
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
              break;
            }

            case EVENT_SELECTORS.SkullEvent: {
              const decoded = decodeSkullEvent(keys, data);
              logger.info(`SkullEvent: beast=${decoded.beastTokenId}, skulls=${decoded.skulls}`);

              await db.insert(schema.skullEvents).values({
                beastTokenId: decoded.beastTokenId,
                skulls: decoded.skulls,
                createdAt: blockTimestamp,
                indexedAt: indexedAt,
                blockNumber,
                transactionHash,
                eventIndex,
              }).onConflictDoNothing();
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
