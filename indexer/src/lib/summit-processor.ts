import { eq, inArray, sql } from "drizzle-orm";
import * as schema from "./schema.js";
import type { SummitConfig } from "./config.js";
import type { SummitIndexedEvent } from "./starknet-rpc-events.js";
import {
  EVENT_SELECTORS,
  BEAST_EVENT_SELECTORS,
  GAME_EVENT_SELECTOR,
  GAME_EVENT_VARIANT,
  decodeGameEvent,
  decodeBeastUpdatesEvent,
  decodeLiveBeastStatsEvent,
  decodeBattleEvent,
  decodeRewardsEarnedEvent,
  decodeRewardsClaimedEvent,
  decodePoisonEvent,
  decodeCorpseEvent,
  decodeSkullEvent,
  decodeQuestRewardsClaimedEvent,
  unpackQuestRewardsClaimed,
  decodeTransferEvent,
  decodeERC20TransferEvent,
  decodeCollectableStatsEvent,
  computeEntityHash,
  computeCollectableId,
  unpackLiveBeastStats,
  feltToHex,
  isZeroFeltAddress,
} from "./decoder.js";

export interface ProcessorLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface SummitBlockInput {
  blockNumber: bigint;
  blockTimestamp: Date;
  indexedAt: Date;
  events: SummitIndexedEvent[];
}

export interface SummitBlockProcessingResult {
  batches: BulkInsertBatches;
  metrics: {
    preScanTime: number;
    rpcTime: number;
    contextLookupTime: number;
    joinQueryTime: number;
    fallbackQueryTime: number;
    beastDataQueryTime: number;
    lsMetadataQueryTime: number;
    eventProcessingTime: number;
  };
}

interface BeastStatsSnapshot {
  token_id: number;
  spirit: number;
  luck: number;
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
  bonus_health: number;
  extra_lives: number;
  captured_summit: boolean;
  used_revival_potion: boolean;
  used_attack_potion: boolean;
  max_attack_streak: boolean;
  current_health?: number;
}

interface BeastMetadata {
  beast_id: number;
  prefix: number;
  suffix: number;
  shiny: number;
  animated: number;
}

interface BeastContext {
  prev_stats: BeastStatsSnapshot | null;
  metadata: BeastMetadata | null;
  owner: string | null;
}

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

type BeastStatsRow = {
  token_id: number;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  attack_streak: number;
  last_death_timestamp: bigint;
  revival_count: number;
  extra_lives: number;
  captured_summit: boolean;
  used_revival_potion: boolean;
  used_attack_potion: boolean;
  max_attack_streak: boolean;
  summit_held_seconds: number;
  spirit: number;
  luck: number;
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
  rewards_earned: number;
  rewards_claimed: number;
  created_at: Date;
  updated_at: Date;
  indexed_at: Date;
  block_number: bigint;
  transaction_hash: string;
};

type BattleRow = typeof schema.battles.$inferInsert;
type RewardsEarnedRow = typeof schema.rewards_earned.$inferInsert;
type RewardsClaimedRow = typeof schema.rewards_claimed.$inferInsert;
type PoisonEventRow = typeof schema.poison_events.$inferInsert;
type CorpseEventRow = typeof schema.corpse_events.$inferInsert;
type CorpseNewEventRow = typeof schema.corpse_new_events.$inferInsert;
type SkullsClaimedRow = typeof schema.skulls_claimed.$inferInsert;
type QuestRewardsClaimedRow = typeof schema.quest_rewards_claimed.$inferInsert;
type SummitLogRow = typeof schema.summit_log.$inferInsert;
type BeastOwnerRow = typeof schema.beast_owners.$inferInsert;
type BeastRow = typeof schema.beasts.$inferInsert;
type BeastDataRow = typeof schema.beast_data.$inferInsert;

type ConsumablesRow = {
  owner: string;
  xlife_count: number;
  attack_count: number;
  revive_count: number;
  poison_count: number;
  updated_at: Date;
};

export interface BulkInsertBatches {
  beast_stats: BeastStatsRow[];
  battles: BattleRow[];
  rewards_earned: RewardsEarnedRow[];
  rewards_claimed: RewardsClaimedRow[];
  poison_events: PoisonEventRow[];
  corpse_events: CorpseEventRow[];
  corpse_new_events: CorpseNewEventRow[];
  skulls_claimed: SkullsClaimedRow[];
  quest_rewards_claimed: QuestRewardsClaimedRow[];
  summit_log: SummitLogRow[];
  beast_owners: BeastOwnerRow[];
  beasts: BeastRow[];
  beast_data: BeastDataRow[];
  consumables: ConsumablesRow[];
}

export interface ProcessorConfig {
  summitAddressBigInt: bigint;
  beastsAddressBigInt: bigint;
  collectableAddressBigInt: bigint;
  corpseAddressBigInt: bigint;
  skullAddressBigInt: bigint;
  ekuboCoreAddressBigInt: bigint;
  consumableAddressMap: Map<bigint, "xlife_count" | "attack_count" | "revive_count" | "poison_count">;
  consumableTokenNames: Record<string, string>;
  fetchBeastMetadata(tokenId: number): Promise<BeastMetadataResult | null>;
}

export interface BeastMetadataResult {
  id: number;
  prefix: number;
  suffix: number;
  level: number;
  health: number;
  shiny: number;
  animated: number;
}

const fetchedTokens = new Set<number>();
const MINTED_BY_BEAST = 19;

const STAT_UPGRADES = [
  { field: "spirit" as const, sub_category: "Spirit" },
  { field: "luck" as const, sub_category: "Luck" },
  { field: "specials" as const, sub_category: "Specials" },
  { field: "wisdom" as const, sub_category: "Wisdom" },
  { field: "diplomacy" as const, sub_category: "Diplomacy" },
  { field: "bonus_health" as const, sub_category: "Bonus Health" },
  { field: "extra_lives" as const, sub_category: "Applied Extra Life" },
] as const;

export function resetSummitProcessorCache(): void {
  fetchedTokens.clear();
}

export function createSummitProcessorConfig(config: SummitConfig): ProcessorConfig {
  const xlifeAddressBigInt = addressToBigInt(config.xlifeTokenAddress);
  const attackAddressBigInt = addressToBigInt(config.attackTokenAddress);
  const reviveAddressBigInt = addressToBigInt(config.reviveTokenAddress);
  const poisonAddressBigInt = addressToBigInt(config.poisonTokenAddress);

  return {
    summitAddressBigInt: addressToBigInt(config.summitContractAddress),
    beastsAddressBigInt: addressToBigInt(config.beastsContractAddress),
    collectableAddressBigInt: addressToBigInt(config.collectableContractAddress),
    corpseAddressBigInt: addressToBigInt(config.corpseContractAddress),
    skullAddressBigInt: addressToBigInt(config.skullContractAddress),
    ekuboCoreAddressBigInt: addressToBigInt("0x00000005dd3d2f4429af886cd1a3b08289dbcea99a294197e9eb43b0e0325b4b"),
    consumableAddressMap: new Map([
      [xlifeAddressBigInt, "xlife_count"],
      [attackAddressBigInt, "attack_count"],
      [reviveAddressBigInt, "revive_count"],
      [poisonAddressBigInt, "poison_count"],
    ]),
    consumableTokenNames: {
      xlife_count: "EXTRA LIFE",
      attack_count: "ATTACK",
      revive_count: "REVIVE",
      poison_count: "POISON",
    },
    fetchBeastMetadata: createBeastMetadataFetcher(config),
  };
}

export function createEmptyBatches(): BulkInsertBatches {
  return {
    beast_stats: [],
    battles: [],
    rewards_earned: [],
    rewards_claimed: [],
    poison_events: [],
    corpse_events: [],
    corpse_new_events: [],
    skulls_claimed: [],
    quest_rewards_claimed: [],
    summit_log: [],
    beast_owners: [],
    beasts: [],
    beast_data: [],
    consumables: [],
  };
}

export async function collectSummitBlockBatches(
  db: any,
  processorConfig: ProcessorConfig,
  logger: ProcessorLogger,
  input: SummitBlockInput,
): Promise<SummitBlockProcessingResult> {
  const { blockNumber: block_number, blockTimestamp: block_timestamp, indexedAt: indexed_at, events } = input;
  const batches = createEmptyBatches();
  const allConsumableTransfers: Array<{
    transaction_hash: string;
    token: string;
    address: string;
    amount: number;
    event_index: number;
    involvesEkubo: boolean;
  }> = [];

  const skullEventTokenIds: number[] = [];
  const beastStatsTokenIds: number[] = [];
  const battleTokenIds: number[] = [];
  const rewardsEarnedTokenIds: number[] = [];
  const transferTokenIds: number[] = [];
  const lsEventEntityHashes: string[] = [];

  const preScanStart = Date.now();
  for (const event of events) {
    const keys = event.keys;
    if (keys.length === 0) continue;

    const selector = feltToHex(keys[0]);
    const event_address = feltToHex(event.address);
    const eventAddressBigInt = addressToBigInt(event_address);

    if (eventAddressBigInt === processorConfig.beastsAddressBigInt && selector === BEAST_EVENT_SELECTORS.Transfer) {
      const decoded = decodeTransferEvent([...keys], [...event.data]);
      if (!isZeroFeltAddress(decoded.to)) {
        const token_id = Number(decoded.token_id);
        if (!fetchedTokens.has(token_id)) {
          transferTokenIds.push(token_id);
        }
      }
    }

    if (
      eventAddressBigInt === processorConfig.collectableAddressBigInt &&
      selector === GAME_EVENT_SELECTOR &&
      event.data.length >= 3
    ) {
      const envelope = decodeGameEvent([...event.data]);
      if (envelope.variant_index === GAME_EVENT_VARIANT.CollectableStats) {
        const decoded = decodeCollectableStatsEvent(envelope.variant_data);
        const entity_hash = computeEntityHash(decoded.beast_id, decoded.prefix, decoded.suffix);
        if (computeCollectableId(MINTED_BY_BEAST, entity_hash) !== decoded.collectable_id) continue;
        lsEventEntityHashes.push(entity_hash);
      }
    }

    if (eventAddressBigInt === processorConfig.skullAddressBigInt && selector === EVENT_SELECTORS.SkullEvent) {
      const decoded = decodeSkullEvent([...keys], [...event.data]);
      skullEventTokenIds.push(...decoded.beast_token_ids);
    }

    if (eventAddressBigInt === processorConfig.summitAddressBigInt) {
      switch (selector) {
        case EVENT_SELECTORS.BeastUpdatesEvent: {
          const decoded = decodeBeastUpdatesEvent([...keys], [...event.data]);
          for (const packed of decoded.packed_updates) {
            beastStatsTokenIds.push(unpackLiveBeastStats(packed).token_id);
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
      }
    }
  }
  const preScanTime = Date.now() - preScanStart;

  let rpcTime = 0;
  const metadataMap = new Map<number, Awaited<ReturnType<ProcessorConfig["fetchBeastMetadata"]>>>();
  if (transferTokenIds.length > 0) {
    const uniqueTransferIds = [...new Set(transferTokenIds)];
    const rpcStartTime = Date.now();
    const results = await Promise.all(uniqueTransferIds.map(id => processorConfig.fetchBeastMetadata(id)));
    uniqueTransferIds.forEach((id, idx) => {
      metadataMap.set(id, results[idx]);
    });
    rpcTime = Date.now() - rpcStartTime;
    logger.info(`RPC metadata fetch: ${uniqueTransferIds.length} tokens in ${rpcTime}ms`);
  }

  const allBeastContextTokenIds = [...new Set([
    ...beastStatsTokenIds,
    ...battleTokenIds,
    ...rewardsEarnedTokenIds,
    ...skullEventTokenIds,
  ])];
  const { result: beastContextMap, joinQueryTime, fallbackQueryTime } = await getBeastContextBatch(
    db,
    allBeastContextTokenIds,
    logger,
  );

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

  let lsMetadataQueryTime = 0;
  const lsMetadataMap = new Map<string, { token_id: number; beast_id: number; prefix: number; suffix: number; owner: string | null }>();
  if (lsEventEntityHashes.length > 0) {
    const lsMetadataStart = Date.now();
    const uniqueHashes = [...new Set(lsEventEntityHashes)];
    const lsMetadataResult = await db
      .select({
        entity_hash: schema.beast_data.entity_hash,
        token_id: schema.beast_data.token_id,
        beast_id: schema.beasts.beast_id,
        prefix: schema.beasts.prefix,
        suffix: schema.beasts.suffix,
        owner: schema.beast_owners.owner,
      })
      .from(schema.beast_data)
      .innerJoin(schema.beasts, eq(schema.beast_data.token_id, schema.beasts.token_id))
      .leftJoin(schema.beast_owners, eq(schema.beast_data.token_id, schema.beast_owners.token_id))
      .where(inArray(schema.beast_data.entity_hash, uniqueHashes));

    for (const row of lsMetadataResult) {
      if (row.token_id !== null && row.beast_id !== null && row.prefix !== null && row.suffix !== null) {
        lsMetadataMap.set(row.entity_hash, {
          token_id: row.token_id,
          beast_id: row.beast_id,
          prefix: row.prefix,
          suffix: row.suffix,
          owner: row.owner ?? null,
        });
      }
    }
    lsMetadataQueryTime = Date.now() - lsMetadataStart;
  }

  const eventProcessingStart = Date.now();
  for (const event of events) {
    const keys = event.keys;
    const data = event.data;
    const transaction_hash = event.transactionHash;
    const event_index = event.eventIndex;
    const event_address = feltToHex(event.address);

    if (keys.length === 0) continue;

    const selector = feltToHex(keys[0]);
    const eventAddressBigInt = addressToBigInt(event_address);

    try {
      if (eventAddressBigInt === processorConfig.beastsAddressBigInt && selector === BEAST_EVENT_SELECTORS.Transfer) {
        const decoded = decodeTransferEvent([...keys], [...data]);
        const token_id = Number(decoded.token_id);
        if (isZeroFeltAddress(decoded.to)) {
          logger.debug(`Skipping burn event for token ${token_id}`);
          continue;
        }

        batches.beast_owners.push({
          token_id,
          owner: decoded.to,
          updated_at: block_timestamp,
        });

        if (!fetchedTokens.has(token_id)) {
          const beast_data = metadataMap.get(token_id);
          if (beast_data) {
            const { id, prefix, suffix, level, health, shiny, animated } = beast_data;
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

            const entity_hash = computeEntityHash(id, prefix, suffix);
            batches.beast_data.push({
              entity_hash,
              token_id,
              adventurers_killed: 0n,
              last_death_timestamp: 0n,
              last_killed_by: 0n,
              updated_at: block_timestamp,
            });
            fetchedTokens.add(token_id);
          }
        }
        continue;
      }

      const consumableColumn = processorConfig.consumableAddressMap.get(eventAddressBigInt);
      if (consumableColumn && selector === BEAST_EVENT_SELECTORS.Transfer) {
        const decoded = decodeERC20TransferEvent([...keys], [...data]);
        const wholeUnits = Number(decoded.amount / 1_000_000_000_000_000_000n);
        if (wholeUnits === 0) continue;

        const fromAddr = addressToBigInt(decoded.from);
        const toAddr = addressToBigInt(decoded.to);
        const isExcluded = (addr: bigint) => addr === 0n || addr === processorConfig.ekuboCoreAddressBigInt;

        if (!isExcluded(fromAddr)) {
          const row: ConsumablesRow = {
            owner: decoded.from,
            xlife_count: 0,
            attack_count: 0,
            revive_count: 0,
            poison_count: 0,
            updated_at: block_timestamp,
          };
          row[consumableColumn] = -wholeUnits;
          batches.consumables.push(row);
        }

        if (!isExcluded(toAddr)) {
          const row: ConsumablesRow = {
            owner: decoded.to,
            xlife_count: 0,
            attack_count: 0,
            revive_count: 0,
            poison_count: 0,
            updated_at: block_timestamp,
          };
          row[consumableColumn] = wholeUnits;
          batches.consumables.push(row);
        }

        const involvesEkubo = fromAddr === processorConfig.ekuboCoreAddressBigInt || toAddr === processorConfig.ekuboCoreAddressBigInt;
        const tokenName = processorConfig.consumableTokenNames[consumableColumn];
        if (!isExcluded(toAddr)) {
          allConsumableTransfers.push({
            transaction_hash,
            token: tokenName,
            address: decoded.to,
            amount: wholeUnits,
            event_index,
            involvesEkubo,
          });
        }
        if (!isExcluded(fromAddr)) {
          allConsumableTransfers.push({
            transaction_hash,
            token: tokenName,
            address: decoded.from,
            amount: -wholeUnits,
            event_index,
            involvesEkubo,
          });
        }
        continue;
      }

      if (
        eventAddressBigInt === processorConfig.collectableAddressBigInt &&
        selector === GAME_EVENT_SELECTOR &&
        data.length >= 3
      ) {
        const envelope = decodeGameEvent([...data]);
        if (envelope.variant_index !== GAME_EVENT_VARIANT.CollectableStats) continue;

        const decoded = decodeCollectableStatsEvent(envelope.variant_data);
        const entity_hash = computeEntityHash(decoded.beast_id, decoded.prefix, decoded.suffix);
        if (computeCollectableId(MINTED_BY_BEAST, entity_hash) !== decoded.collectable_id) continue;

        const entityMetadata = lsMetadataMap.get(entity_hash);
        logger.info(`CollectableStatsEvent: adventurers_killed=${decoded.adventurers_killed}, token_id=${entityMetadata?.token_id ?? "unknown"}`);

        batches.beast_data.push({
          entity_hash,
          adventurers_killed: decoded.adventurers_killed,
          last_death_timestamp: 0n,
          last_killed_by: 0n,
          updated_at: block_timestamp,
        });

        if (entityMetadata && entityMetadata.token_id >= 76 && entityMetadata.prefix && entityMetadata.suffix) {
          collectSummitLog(batches, {
            block_number,
            event_index,
            category: "LS Events",
            sub_category: "EntityStats",
            data: {
              entity_hash,
              adventurers_killed: decoded.adventurers_killed.toString(),
              token_id: entityMetadata.token_id,
              beast_id: entityMetadata.beast_id,
              prefix: entityMetadata.prefix,
              suffix: entityMetadata.suffix,
              owner: entityMetadata.owner,
            },
            player: entityMetadata.owner,
            token_id: entityMetadata.token_id,
            transaction_hash,
            created_at: block_timestamp,
            indexed_at,
          });
        }
        continue;
      }

      if (eventAddressBigInt === processorConfig.corpseAddressBigInt && selector === EVENT_SELECTORS.CorpseEvent) {
        const decoded = decodeCorpseEvent([...keys], [...data]);
        for (const adventurer_id of decoded.adventurer_ids) {
          batches.corpse_new_events.push({
            adventurer_id: adventurer_id.toString(),
            player: decoded.player,
            created_at: block_timestamp,
            indexed_at,
            block_number,
            transaction_hash,
            event_index,
          });
        }

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
        continue;
      }

      if (eventAddressBigInt === processorConfig.skullAddressBigInt && selector === EVENT_SELECTORS.SkullEvent) {
        const decoded = decodeSkullEvent([...keys], [...data]);
        const firstContext = beastContextMap.get(decoded.beast_token_ids[0]) ?? { prev_stats: null, metadata: null, owner: null };
        const skull_player = firstContext.owner;

        for (const beast_token_id of decoded.beast_token_ids) {
          const skulls = beastDataSkullsMap.get(beast_token_id) ?? 0n;
          batches.skulls_claimed.push({
            beast_token_id,
            skulls,
            updated_at: block_timestamp,
          });
        }

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
          token_id: null,
          transaction_hash,
          created_at: block_timestamp,
          indexed_at,
        });
        continue;
      }

      if (eventAddressBigInt !== processorConfig.summitAddressBigInt) continue;

      switch (selector) {
        case EVENT_SELECTORS.BeastUpdatesEvent: {
          const decoded = decodeBeastUpdatesEvent([...keys], [...data]);
          for (let i = 0; i < decoded.packed_updates.length; i++) {
            const stats = unpackLiveBeastStats(decoded.packed_updates[i]);
            const context = beastContextMap.get(stats.token_id) ?? { prev_stats: null, metadata: null, owner: null };
            const { prev_stats, metadata: beast_metadata, owner: beast_owner } = context;

            batches.beast_stats.push(toBeastStatsRow(stats, block_timestamp, indexed_at, block_number, transaction_hash));

            if ((prev_stats === null || prev_stats.current_health === 0) && stats.current_health > 0) {
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
                  extra_lives: stats.extra_lives,
                },
                player: beast_owner,
                token_id: stats.token_id,
                transaction_hash,
                created_at: block_timestamp,
                indexed_at,
              });
            }

            collectBeastStatChangeLogs(
              batches,
              prev_stats,
              stats,
              beast_metadata,
              beast_owner,
              event_index * 100 + i,
              block_number,
              transaction_hash,
              block_timestamp,
              indexed_at,
            );

            beastContextMap.set(stats.token_id, {
              prev_stats: toBeastStatsSnapshot(stats),
              metadata: beast_metadata,
              owner: beast_owner,
            });
          }
          break;
        }

        case EVENT_SELECTORS.LiveBeastStatsEvent: {
          const decoded = decodeLiveBeastStatsEvent([...keys], [...data]);
          const stats = decoded.live_stats;
          const context = beastContextMap.get(stats.token_id) ?? { prev_stats: null, metadata: null, owner: null };
          const { prev_stats, metadata, owner: live_beast_owner } = context;

          batches.beast_stats.push(toBeastStatsRow(stats, block_timestamp, indexed_at, block_number, transaction_hash));
          collectBeastStatChangeLogs(
            batches,
            prev_stats,
            stats,
            metadata,
            live_beast_owner,
            event_index,
            block_number,
            transaction_hash,
            block_timestamp,
            indexed_at,
          );

          beastContextMap.set(stats.token_id, {
            prev_stats: toBeastStatsSnapshot(stats),
            metadata,
            owner: live_beast_owner,
          });
          break;
        }

        case EVENT_SELECTORS.BattleEvent: {
          const decoded = decodeBattleEvent([...keys], [...data]);
          const context = beastContextMap.get(decoded.attacking_beast_token_id) ?? { prev_stats: null, metadata: null, owner: null };
          const attacking_player = context.owner;
          const attacking_beast_metadata = context.metadata;

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
            indexed_at,
            block_number,
            transaction_hash,
            event_index,
          });

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
          const context = beastContextMap.get(decoded.beast_token_id) ?? { prev_stats: null, metadata: null, owner: null };
          const owner = context.owner;
          const rewards_metadata = context.metadata;

          batches.rewards_earned.push({
            beast_token_id: decoded.beast_token_id,
            owner,
            amount: decoded.amount,
            created_at: block_timestamp,
            indexed_at,
            block_number,
            transaction_hash,
            event_index,
          });

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
          batches.rewards_claimed.push({
            player: decoded.player,
            beast_token_ids: "",
            amount: decoded.amount.toString(),
            created_at: block_timestamp,
            indexed_at,
            block_number,
            transaction_hash,
            event_index,
          });

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
          batches.poison_events.push({
            beast_token_id: decoded.beast_token_id,
            block_timestamp: BigInt(Math.floor(block_timestamp.getTime() / 1000)),
            count: decoded.count,
            player: decoded.player,
            created_at: block_timestamp,
            indexed_at,
            block_number,
            transaction_hash,
            event_index,
          });

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

        case EVENT_SELECTORS.QuestRewardsClaimedEvent: {
          const decoded = decodeQuestRewardsClaimedEvent([...keys], [...data]);
          const rewardsByBeast = new Map<number, number>();
          for (const packed of decoded.packed_rewards) {
            const { beast_token_id, amount } = unpackQuestRewardsClaimed(packed);
            rewardsByBeast.set(beast_token_id, (rewardsByBeast.get(beast_token_id) ?? 0) + amount);
          }

          const firstBeastId = Array.from(rewardsByBeast.keys())[0];
          const firstQuestContext = beastContextMap.get(firstBeastId);
          const quest_player = firstQuestContext?.owner ?? null;

          for (const [beast_token_id, total_amount] of rewardsByBeast.entries()) {
            batches.quest_rewards_claimed.push({
              beast_token_id,
              amount: total_amount,
              updated_at: block_timestamp,
            });
          }

          collectSummitLog(batches, {
            block_number,
            event_index,
            category: "Rewards",
            sub_category: "Claimed Quest Rewards",
            data: {
              player: quest_player,
              beast_count: rewardsByBeast.size,
              total_amount: Array.from(rewardsByBeast.values()).reduce((sum, amt) => sum + amt, 0),
            },
            player: quest_player,
            token_id: null,
            transaction_hash,
            created_at: block_timestamp,
            indexed_at,
          });
          break;
        }

        default:
          logger.debug(`Unknown event selector: ${selector}`);
      }
    } catch (error) {
      logger.error(`Error processing event at block ${block_number}, index ${event_index}: ${error}`);
      logger.error(`Event selector: ${selector}`);
      logger.error(`Keys: ${JSON.stringify(keys)}`);
      logger.error(`Data: ${JSON.stringify(data)}`);
    }
  }

  if (allConsumableTransfers.length > 0) {
    const txTokenMap = new Map<string, typeof allConsumableTransfers>();
    for (const transfer of allConsumableTransfers) {
      const key = `${transfer.transaction_hash}:${transfer.token}`;
      const existing = txTokenMap.get(key) ?? [];
      existing.push(transfer);
      txTokenMap.set(key, existing);
    }

    for (const [, transfers] of txTokenMap) {
      if (!transfers.some(transfer => transfer.involvesEkubo)) continue;

      const netFlow = new Map<string, number>();
      for (const transfer of transfers) {
        netFlow.set(transfer.address, (netFlow.get(transfer.address) ?? 0) + transfer.amount);
      }

      for (const [address, net] of netFlow) {
        if (net === 0) continue;
        const first = transfers[0];
        const isBuy = net > 0;
        collectSummitLog(batches, {
          block_number,
          event_index: first.event_index,
          category: "Market",
          sub_category: isBuy ? "Bought Potions" : "Sold Potions",
          data: {
            player: address,
            token: first.token,
            amount: Math.abs(net),
          },
          player: address,
          token_id: null,
          transaction_hash: first.transaction_hash,
          created_at: block_timestamp,
          indexed_at,
        });
      }
    }
  }

  const eventProcessingTime = Date.now() - eventProcessingStart;

  return {
    batches,
    metrics: {
      preScanTime,
      rpcTime,
      contextLookupTime: joinQueryTime + fallbackQueryTime + beastDataQueryTime + lsMetadataQueryTime,
      joinQueryTime,
      fallbackQueryTime,
      beastDataQueryTime,
      lsMetadataQueryTime,
      eventProcessingTime,
    },
  };
}

export async function executeBulkInserts(db: any, batches: BulkInsertBatches): Promise<void> {
  const insertPromises: Promise<unknown>[] = [];

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
          captured_summit: sql`excluded.captured_summit`,
          used_revival_potion: sql`excluded.used_revival_potion`,
          used_attack_potion: sql`excluded.used_attack_potion`,
          max_attack_streak: sql`excluded.max_attack_streak`,
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
      }),
    );
  }

  if (batches.battles.length > 0) {
    insertPromises.push(db.insert(schema.battles).values(batches.battles).onConflictDoNothing());
  }
  if (batches.rewards_earned.length > 0) {
    insertPromises.push(db.insert(schema.rewards_earned).values(batches.rewards_earned).onConflictDoNothing());
  }
  if (batches.rewards_claimed.length > 0) {
    insertPromises.push(db.insert(schema.rewards_claimed).values(batches.rewards_claimed).onConflictDoNothing());
  }
  if (batches.poison_events.length > 0) {
    insertPromises.push(db.insert(schema.poison_events).values(batches.poison_events).onConflictDoNothing());
  }
  if (batches.corpse_new_events.length > 0) {
    insertPromises.push(db.insert(schema.corpse_new_events).values(batches.corpse_new_events).onConflictDoNothing());
  }

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
      }),
    );
  }

  if (batches.quest_rewards_claimed.length > 0) {
    const deduped = new Map<number, QuestRewardsClaimedRow>();
    for (const row of batches.quest_rewards_claimed) {
      deduped.set(row.beast_token_id, row);
    }
    insertPromises.push(
      db.insert(schema.quest_rewards_claimed).values([...deduped.values()]).onConflictDoUpdate({
        target: schema.quest_rewards_claimed.beast_token_id,
        set: {
          amount: sql`excluded.amount`,
          updated_at: sql`excluded.updated_at`,
        },
      }),
    );
  }

  if (batches.summit_log.length > 0) {
    insertPromises.push(db.insert(schema.summit_log).values(aggregateBattleEvents(batches.summit_log)).onConflictDoNothing());
  }

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
      }),
    );
  }

  if (batches.beasts.length > 0) {
    insertPromises.push(db.insert(schema.beasts).values(batches.beasts).onConflictDoNothing());
  }

  if (batches.beast_data.length > 0) {
    const deduped = new Map<string, BeastDataRow>();
    for (const row of batches.beast_data) {
      deduped.set(row.entity_hash, row);
    }
    insertPromises.push(
      db.insert(schema.beast_data).values([...deduped.values()]).onConflictDoUpdate({
        target: schema.beast_data.entity_hash,
        set: {
          adventurers_killed: sql`GREATEST(beast_data.adventurers_killed, excluded.adventurers_killed)`,
          last_death_timestamp: sql`GREATEST(beast_data.last_death_timestamp, excluded.last_death_timestamp)`,
          last_killed_by: sql`COALESCE(NULLIF(excluded.last_killed_by, 0), beast_data.last_killed_by)`,
          token_id: sql`COALESCE(beast_data.token_id, excluded.token_id)`,
          updated_at: sql`excluded.updated_at`,
        },
      }),
    );
  }

  if (batches.consumables.length > 0) {
    const deduped = new Map<string, ConsumablesRow>();
    for (const row of batches.consumables) {
      const existing = deduped.get(row.owner);
      if (existing) {
        existing.xlife_count += row.xlife_count;
        existing.attack_count += row.attack_count;
        existing.revive_count += row.revive_count;
        existing.poison_count += row.poison_count;
        existing.updated_at = row.updated_at;
      } else {
        deduped.set(row.owner, { ...row });
      }
    }
    insertPromises.push(
      db.insert(schema.consumables).values([...deduped.values()]).onConflictDoUpdate({
        target: schema.consumables.owner,
        set: {
          xlife_count: sql`GREATEST(${schema.consumables.xlife_count} + excluded.xlife_count, 0)`,
          attack_count: sql`GREATEST(${schema.consumables.attack_count} + excluded.attack_count, 0)`,
          revive_count: sql`GREATEST(${schema.consumables.revive_count} + excluded.revive_count, 0)`,
          poison_count: sql`GREATEST(${schema.consumables.poison_count} + excluded.poison_count, 0)`,
          updated_at: sql`excluded.updated_at`,
        },
      }),
    );
  }

  await Promise.all(insertPromises);
}

function createBeastMetadataFetcher(config: SummitConfig): ProcessorConfig["fetchBeastMetadata"] {
  const metadataRpcUrl = config.rpcUrl;
  const GET_BEAST_SELECTOR = "0x0385b69551f247794fe651459651cdabc76b6cdf4abacafb5b28ceb3b1ac2e98";

  return async (token_id: number) => {
    if (!metadataRpcUrl) {
      throw new Error("STARKNET_METADATA_RPC_URL or STARKNET_RPC_URL is required for beast metadata calls");
    }

    try {
      const response = await fetch(metadataRpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "starknet_call",
          params: {
            request: {
              contract_address: config.beastsContractAddress,
              entry_point_selector: GET_BEAST_SELECTOR,
              calldata: [`0x${token_id.toString(16)}`, "0x0"],
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
  };
}

async function getBeastContextBatch(
  db: any,
  token_ids: number[],
  logger?: { info: (msg: string) => void },
): Promise<{ result: Map<number, BeastContext>; joinQueryTime: number; fallbackQueryTime: number }> {
  if (token_ids.length === 0) {
    return { result: new Map(), joinQueryTime: 0, fallbackQueryTime: 0 };
  }

  const uniqueIds = [...new Set(token_ids)];
  const resultMap = new Map<number, BeastContext>();
  for (const id of uniqueIds) {
    resultMap.set(id, { prev_stats: null, metadata: null, owner: null });
  }

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
      bs_captured_summit: schema.beast_stats.captured_summit,
      bs_used_revival_potion: schema.beast_stats.used_revival_potion,
      bs_used_attack_potion: schema.beast_stats.used_attack_potion,
      bs_max_attack_streak: schema.beast_stats.max_attack_streak,
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
        captured_summit: row.bs_captured_summit,
        used_revival_potion: row.bs_used_revival_potion,
        used_attack_potion: row.bs_used_attack_potion,
        max_attack_streak: row.bs_max_attack_streak,
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

    type MetadataRow = { token_id: number; beast_id: number; prefix: number; suffix: number; shiny: number; animated: number };
    type OwnerRow = { token_id: number; owner: string };
    const metadataMap = new Map<number, MetadataRow>((metadataResults as MetadataRow[]).map(row => [row.token_id, row]));
    const ownerMap = new Map<number, string>((ownerResults as OwnerRow[]).map(row => [row.token_id, row.owner]));

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
  const toNumericUpgradeValue = (value: number | boolean): number =>
    typeof value === "boolean" ? Number(value) : value;

  const effective_prev_stats: BeastStatsSnapshot = prev_stats ?? {
    token_id: new_stats.token_id,
    spirit: 0,
    luck: 0,
    specials: false,
    wisdom: false,
    diplomacy: false,
    bonus_health: 0,
    extra_lives: 0,
    captured_summit: false,
    used_revival_potion: false,
    used_attack_potion: false,
    max_attack_streak: false,
  };

  for (const { field, sub_category } of STAT_UPGRADES) {
    const old_value = toNumericUpgradeValue(effective_prev_stats[field]);
    const new_value = toNumericUpgradeValue(new_stats[field]);
    if (new_value > old_value) {
      derived_offset++;
      collectSummitLog(batches, {
        block_number,
        event_index: base_event_index * 100 + derived_offset,
        category: field === "extra_lives" ? "Battle" : "Beast Upgrade",
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

function aggregateBattleEvents(logs: SummitLogRow[]): SummitLogRow[] {
  const battleEvents: SummitLogRow[] = [];
  const otherEvents: SummitLogRow[] = [];

  for (const log of logs) {
    if (log.category === "Battle" && log.sub_category === "BattleEvent") {
      battleEvents.push(log);
    } else {
      otherEvents.push(log);
    }
  }

  const battlesByTx = new Map<string, SummitLogRow[]>();
  for (const event of battleEvents) {
    const existing = battlesByTx.get(event.transaction_hash) ?? [];
    existing.push(event);
    battlesByTx.set(event.transaction_hash, existing);
  }

  const aggregatedBattles: SummitLogRow[] = [];
  for (const [, events] of battlesByTx) {
    if (events.length === 1) {
      const single = events[0];
      const data = single.data as Record<string, unknown>;
      const totalDamage =
        (Number(data.attack_count) || 0) * (Number(data.attack_damage) || 0) +
        (Number(data.critical_attack_count) || 0) * (Number(data.critical_attack_damage) || 0);
      single.data = { ...data, beast_count: 1, total_damage: totalDamage };
      aggregatedBattles.push(single);
    } else {
      aggregatedBattles.push(createAggregatedBattleEntry(events));
    }
  }

  return [...otherEvents, ...aggregatedBattles];
}

function createAggregatedBattleEntry(events: SummitLogRow[]): SummitLogRow {
  const first = events[0];
  const dataList = events.map(event => event.data as Record<string, unknown>);
  const firstData = dataList[0];
  const sumField = (field: string) => dataList.reduce((sum, data) => sum + (Number(data[field]) || 0), 0);
  const totalDamage = dataList.reduce((sum, data) => {
    const attackDmg = (Number(data.attack_count) || 0) * (Number(data.attack_damage) || 0);
    const critDmg = (Number(data.critical_attack_count) || 0) * (Number(data.critical_attack_damage) || 0);
    return sum + attackDmg + critDmg;
  }, 0);

  return {
    ...first,
    data: {
      attacking_beast_token_id: firstData.attacking_beast_token_id,
      attack_index: firstData.attack_index,
      defending_beast_token_id: firstData.defending_beast_token_id,
      attacking_beast_owner: firstData.attacking_beast_owner,
      attacking_beast_id: firstData.attacking_beast_id,
      attacking_beast_prefix: firstData.attacking_beast_prefix,
      attacking_beast_suffix: firstData.attacking_beast_suffix,
      attacking_beast_shiny: firstData.attacking_beast_shiny,
      attacking_beast_animated: firstData.attacking_beast_animated,
      attack_count: sumField("attack_count"),
      attack_damage: sumField("attack_damage"),
      critical_attack_count: sumField("critical_attack_count"),
      critical_attack_damage: sumField("critical_attack_damage"),
      counter_attack_count: sumField("counter_attack_count"),
      counter_attack_damage: sumField("counter_attack_damage"),
      critical_counter_attack_count: sumField("critical_counter_attack_count"),
      critical_counter_attack_damage: sumField("critical_counter_attack_damage"),
      attack_potions: sumField("attack_potions"),
      revive_potions: sumField("revive_potions"),
      xp_gained: sumField("xp_gained"),
      beast_count: events.length,
      total_damage: totalDamage,
    },
  };
}

function toBeastStatsRow(
  stats: BeastStatsSnapshot & {
    current_health: number;
    bonus_xp: number;
    attack_streak: number;
    last_death_timestamp: bigint;
    revival_count: number;
    summit_held_seconds: number;
    rewards_earned: number;
    rewards_claimed: number;
  },
  block_timestamp: Date,
  indexed_at: Date,
  block_number: bigint,
  transaction_hash: string,
): BeastStatsRow {
  return {
    token_id: stats.token_id,
    current_health: stats.current_health,
    bonus_health: stats.bonus_health,
    bonus_xp: stats.bonus_xp,
    attack_streak: stats.attack_streak,
    last_death_timestamp: stats.last_death_timestamp,
    revival_count: stats.revival_count,
    extra_lives: stats.extra_lives,
    captured_summit: stats.captured_summit,
    used_revival_potion: stats.used_revival_potion,
    used_attack_potion: stats.used_attack_potion,
    max_attack_streak: stats.max_attack_streak,
    summit_held_seconds: stats.summit_held_seconds,
    spirit: stats.spirit,
    luck: stats.luck,
    specials: stats.specials,
    wisdom: stats.wisdom,
    diplomacy: stats.diplomacy,
    rewards_earned: stats.rewards_earned,
    rewards_claimed: stats.rewards_claimed,
    created_at: block_timestamp,
    updated_at: block_timestamp,
    indexed_at,
    block_number,
    transaction_hash,
  };
}

function toBeastStatsSnapshot(stats: BeastStatsSnapshot): BeastStatsSnapshot {
  return {
    token_id: stats.token_id,
    spirit: stats.spirit,
    luck: stats.luck,
    specials: stats.specials,
    wisdom: stats.wisdom,
    diplomacy: stats.diplomacy,
    bonus_health: stats.bonus_health,
    extra_lives: stats.extra_lives,
    captured_summit: stats.captured_summit,
    used_revival_potion: stats.used_revival_potion,
    used_attack_potion: stats.used_attack_potion,
    max_attack_streak: stats.max_attack_streak,
    current_health: stats.current_health,
  };
}

function addressToBigInt(address: string): bigint {
  return BigInt(address);
}
