/**
 * Summit API Database Schema
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
 * Beasts table - NFT beast metadata
 */
export const beasts = pgTable(
  "beasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenId: integer("token_id").notNull().unique(),
    beastId: smallint("beast_id").notNull(),
    prefix: smallint("prefix").notNull(),
    suffix: smallint("suffix").notNull(),
    level: smallint("level").notNull(),
    health: smallint("health").notNull(),
    shiny: smallint("shiny").notNull(),
    animated: smallint("animated").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
  },
  (table) => [
    index("beasts_token_id_idx").on(table.tokenId),
    index("beasts_beast_id_idx").on(table.beastId),
  ]
);

/**
 * Beast Owners table - current owner of each beast
 */
export const beastOwners = pgTable(
  "beast_owners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenId: integer("token_id").notNull().unique(),
    owner: text("owner").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("beast_owners_owner_idx").on(table.owner),
    index("beast_owners_token_id_idx").on(table.tokenId),
  ]
);

/**
 * Beast Data table - Loot Survivor stats (adventurers killed, etc.)
 */
export const beastData = pgTable(
  "beast_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityHash: text("entity_hash").notNull().unique(),
    adventurersKilled: bigint("adventurers_killed", { mode: "bigint" }).notNull(),
    lastDeathTimestamp: bigint("last_death_timestamp", { mode: "bigint" }).notNull(),
    tokenId: integer("token_id"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("beast_data_token_id_idx").on(table.tokenId),
    index("beast_data_entity_hash_idx").on(table.entityHash),
  ]
);

/**
 * Beast Stats table - current Summit game state of each beast
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

/**
 * Summit Log table - unified activity feed
 */
export const summitLog = pgTable(
  "summit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    eventIndex: integer("event_index").notNull(),
    category: text("category").notNull(),
    subCategory: text("sub_category").notNull(),
    data: text("data").notNull(), // jsonb stored as text
    player: text("player"),
    tokenId: integer("token_id"),
    transactionHash: text("transaction_hash").notNull(),
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("summit_log_block_tx_event_idx").on(
      table.blockNumber,
      table.transactionHash,
      table.eventIndex
    ),
    index("summit_log_order_idx").on(table.blockNumber.desc(), table.eventIndex.desc()),
    index("summit_log_category_idx").on(table.category),
    index("summit_log_player_idx").on(table.player),
    index("summit_log_token_id_idx").on(table.tokenId),
  ]
);

// Export all schema tables
export const schema = {
  beasts,
  beastOwners,
  beastData,
  beastStats,
  summitLog,
  battles,
  rewards,
  rewardsClaimed,
  poisonEvents,
  diplomacyGroups,
  corpseEvents,
  skullEvents,
};
