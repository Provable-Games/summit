/**
 * Summit API Database Schema
 *
 * Copy of the indexer schema for API queries.
 * 9 tables for all contract events:
 * 1. beast_stats - Current beast state (upsert on token_id)
 * 2. battles - Combat history (append-only)
 * 3. rewards - Reward distribution (append-only)
 * 4. rewards_claimed - Rewards claimed by players (append-only)
 * 5. poison_events - Poison attacks (append-only)
 * 6. diplomacy_groups - Diplomacy configurations (append-only)
 * 7. summit_history - Summit takeovers (append-only)
 * 8. corpse_events - Corpse creation (append-only)
 * 9. skull_events - Skull claims (append-only)
 */

import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  smallint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Beast Stats table - current state of each beast
 */
export const beastStats = pgTable(
  "beast_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenId: integer("token_id").notNull().unique(),
    currentHealth: smallint("current_health").notNull(),
    bonusHealth: smallint("bonus_health").notNull(),
    bonusXp: smallint("bonus_xp").notNull(),
    attackStreak: smallint("attack_streak").notNull(),
    lastDeathTimestamp: bigint("last_death_timestamp", { mode: "bigint" }).notNull(),
    revivalCount: smallint("revival_count").notNull(),
    extraLives: smallint("extra_lives").notNull(),
    hasClaimedPotions: smallint("has_claimed_potions").notNull(),
    blocksHeld: integer("blocks_held").notNull(),
    spirit: smallint("spirit").notNull(),
    luck: smallint("luck").notNull(),
    specials: smallint("specials").notNull(),
    wisdom: smallint("wisdom").notNull(),
    diplomacy: smallint("diplomacy").notNull(),
    rewardsEarned: integer("rewards_earned").notNull(),
    rewardsClaimed: integer("rewards_claimed").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
  },
  (table) => [
    index("beast_stats_current_health_idx").on(table.currentHealth),
    index("beast_stats_blocks_held_idx").on(table.blocksHeld.desc()),
    index("beast_stats_updated_at_idx").on(table.updatedAt.desc()),
  ]
);

/**
 * Battles table - combat history
 */
export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attackingBeastTokenId: integer("attacking_beast_token_id").notNull(),
    attackIndex: smallint("attack_index").notNull(),
    defendingBeastTokenId: integer("defending_beast_token_id").notNull(),
    attackCount: smallint("attack_count").notNull(),
    attackDamage: smallint("attack_damage").notNull(),
    criticalAttackCount: smallint("critical_attack_count").notNull(),
    criticalAttackDamage: smallint("critical_attack_damage").notNull(),
    counterAttackCount: smallint("counter_attack_count").notNull(),
    counterAttackDamage: smallint("counter_attack_damage").notNull(),
    criticalCounterAttackCount: smallint("critical_counter_attack_count").notNull(),
    criticalCounterAttackDamage: smallint("critical_counter_attack_damage").notNull(),
    attackPotions: smallint("attack_potions").notNull(),
    xpGained: smallint("xp_gained").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("battles_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("battles_attacking_beast_idx").on(table.attackingBeastTokenId),
    index("battles_defending_beast_idx").on(table.defendingBeastTokenId),
    index("battles_created_at_idx").on(table.createdAt.desc()),
    index("battles_block_number_idx").on(table.blockNumber),
  ]
);

/**
 * Rewards table - token reward distribution
 */
export const rewards = pgTable(
  "rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rewardBlockNumber: bigint("reward_block_number", { mode: "bigint" }).notNull(),
    beastTokenId: integer("beast_token_id").notNull(),
    owner: text("owner").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("rewards_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("rewards_owner_idx").on(table.owner),
    index("rewards_beast_token_id_idx").on(table.beastTokenId),
    index("rewards_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Rewards Claimed table - tracks reward claims by players
 */
export const rewardsClaimed = pgTable(
  "rewards_claimed",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    player: text("player").notNull(),
    beastTokenIds: text("beast_token_ids").notNull(),
    amount: text("amount").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("rewards_claimed_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("rewards_claimed_player_idx").on(table.player),
    index("rewards_claimed_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Poison Events table - poison attack history
 */
export const poisonEvents = pgTable(
  "poison_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beastTokenId: integer("beast_token_id").notNull(),
    blockTimestamp: bigint("block_timestamp", { mode: "bigint" }).notNull(),
    count: smallint("count").notNull(),
    player: text("player").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("poison_events_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("poison_events_beast_token_id_idx").on(table.beastTokenId),
    index("poison_events_player_idx").on(table.player),
    index("poison_events_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Diplomacy Groups table - diplomacy configuration history
 */
export const diplomacyGroups = pgTable(
  "diplomacy_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    specialsHash: text("specials_hash").notNull(),
    beastTokenIds: text("beast_token_ids").notNull(),
    totalPower: smallint("total_power").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("diplomacy_groups_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("diplomacy_groups_specials_hash_idx").on(table.specialsHash),
    index("diplomacy_groups_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Summit History table - summit takeover history
 */
export const summitHistory = pgTable(
  "summit_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beastTokenId: integer("beast_token_id").notNull(),
    beastId: smallint("beast_id").notNull(),
    beastPrefix: smallint("beast_prefix").notNull(),
    beastSuffix: smallint("beast_suffix").notNull(),
    beastLevel: smallint("beast_level").notNull(),
    beastHealth: smallint("beast_health").notNull(),
    beastShiny: smallint("beast_shiny").notNull(),
    beastAnimated: smallint("beast_animated").notNull(),
    tokenId: integer("token_id").notNull(),
    currentHealth: smallint("current_health").notNull(),
    bonusHealth: smallint("bonus_health").notNull(),
    bonusXp: smallint("bonus_xp").notNull(),
    attackStreak: smallint("attack_streak").notNull(),
    lastDeathTimestamp: bigint("last_death_timestamp", { mode: "bigint" }).notNull(),
    revivalCount: smallint("revival_count").notNull(),
    extraLives: smallint("extra_lives").notNull(),
    hasClaimedPotions: smallint("has_claimed_potions").notNull(),
    blocksHeld: integer("blocks_held").notNull(),
    spirit: smallint("spirit").notNull(),
    luck: smallint("luck").notNull(),
    specials: smallint("specials").notNull(),
    wisdom: smallint("wisdom").notNull(),
    diplomacyStat: smallint("diplomacy_stat").notNull(),
    rewardsEarned: integer("rewards_earned").notNull(),
    rewardsClaimed: integer("rewards_claimed").notNull(),
    owner: text("owner").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("summit_history_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("summit_history_beast_token_id_idx").on(table.beastTokenId),
    index("summit_history_owner_idx").on(table.owner),
    index("summit_history_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Corpse Events table - corpse creation history
 */
export const corpseEvents = pgTable(
  "corpse_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adventurerId: bigint("adventurer_id", { mode: "bigint" }).notNull(),
    player: text("player").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("corpse_events_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("corpse_events_adventurer_id_idx").on(table.adventurerId),
    index("corpse_events_player_idx").on(table.player),
    index("corpse_events_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Skull Events table - skull claim history
 */
export const skullEvents = pgTable(
  "skull_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beastTokenId: integer("beast_token_id").notNull(),
    skulls: bigint("skulls", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("skull_events_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("skull_events_beast_token_id_idx").on(table.beastTokenId),
    index("skull_events_skulls_idx").on(table.skulls.desc()),
    index("skull_events_created_at_idx").on(table.createdAt.desc()),
  ]
);

// Export all schema tables
export const schema = {
  beastStats,
  battles,
  rewards,
  rewardsClaimed,
  poisonEvents,
  diplomacyGroups,
  summitHistory,
  corpseEvents,
  skullEvents,
};
