/**
 * Summit Indexer Database Schema
 *
 * 12 tables for all contract events:
 * 1. beast_stats - Current beast state (upsert on token_id)
 * 2. battles - Combat history (append-only)
 * 3. rewards_earned - Reward distribution (append-only)
 * 4. rewards_claimed - Rewards claimed by players (append-only)
 * 5. poison_events - Poison attacks (append-only)
 * 6. diplomacy_groups - Diplomacy configurations (append-only)
 * 7. corpse_events - Corpse creation (append-only)
 * 8. skull_events - Skull claims (append-only)
 * 9. beast_owners - Current NFT ownership (upsert on token_id)
 * 10. beasts - NFT metadata (insert once)
 * 11. beast_data - Dojo event data (upsert on entity_hash)
 * 12. summit_log - Unified activity feed (append-only with derived events)
 *
 * All tables include:
 * - UUID primary key (required by Apibara Drizzle plugin for reorg handling)
 * - Three timestamps: created_at (Starknet), indexed_at (DNA), inserted_at (DB)
 * - Unique index on (block_number, tx_hash, event_index) for idempotency
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
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Beast Stats table - current state of each beast
 *
 * Upserted on each LiveBeastStatsEvent and BeastUpdatesEvent.
 * Primary key is token_id since we only care about latest state.
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
    // Stats struct fields
    spirit: smallint("spirit").notNull(),
    luck: smallint("luck").notNull(),
    specials: smallint("specials").notNull(),
    wisdom: smallint("wisdom").notNull(),
    diplomacy: smallint("diplomacy").notNull(),
    // Rewards tracking
    rewardsEarned: integer("rewards_earned").notNull(),
    rewardsClaimed: integer("rewards_claimed").notNull(),
    // Timestamps
    createdAt: timestamp("created_at").notNull(), // Starknet block timestamp
    indexedAt: timestamp("indexed_at").notNull(), // When DNA delivered block
    insertedAt: timestamp("inserted_at").defaultNow(), // When row inserted (set by PostgreSQL)
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
 *
 * Append-only history of all battles.
 */
export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attackingBeastTokenId: integer("attacking_beast_token_id").notNull(),
    attackingPlayer: text("attacking_player"), // Owner of attacking beast (joined from beast_owners)
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
    revivePotions: smallint("revive_potions").notNull(),
    xpGained: smallint("xp_gained").notNull(),
    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("battles_block_tx_event_idx").on(table.blockNumber, table.transactionHash, table.eventIndex),
    index("battles_attacking_beast_idx").on(table.attackingBeastTokenId),
    index("battles_attacking_player_idx").on(table.attackingPlayer),
    index("battles_defending_beast_idx").on(table.defendingBeastTokenId),
    index("battles_created_at_idx").on(table.createdAt.desc()),
    index("battles_block_number_idx").on(table.blockNumber),
  ]
);

/**
 * Rewards Earned table - token reward distribution
 *
 * Append-only history of rewards earned.
 */
export const rewardsEarned = pgTable(
  "rewards_earned",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beastTokenId: integer("beast_token_id").notNull(),
    owner: text("owner"), // Owner of the beast (joined from beast_owners)
    amount: integer("amount").notNull(),
    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("rewards_earned_block_tx_event_idx").on(table.blockNumber, table.transactionHash, table.eventIndex),
    index("rewards_earned_owner_idx").on(table.owner),
    index("rewards_earned_beast_token_id_idx").on(table.beastTokenId),
    index("rewards_earned_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Rewards Claimed table - tracks reward claims by players
 *
 * Append-only history of claimed rewards.
 */
export const rewardsClaimed = pgTable(
  "rewards_claimed",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    player: text("player").notNull(),
    beastTokenIds: text("beast_token_ids").notNull(), // Comma-separated u32 values
    amount: text("amount").notNull(), // u256 stored as string
    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("rewards_claimed_block_tx_event_idx").on(table.blockNumber, table.transactionHash, table.eventIndex),
    index("rewards_claimed_player_idx").on(table.player),
    index("rewards_claimed_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Poison Events table - poison attack history
 *
 * Append-only history of poison attacks.
 */
export const poisonEvents = pgTable(
  "poison_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beastTokenId: integer("beast_token_id").notNull(),
    blockTimestamp: bigint("block_timestamp", { mode: "bigint" }).notNull(),
    count: smallint("count").notNull(),
    player: text("player").notNull(),
    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("poison_events_block_tx_event_idx").on(table.blockNumber, table.transactionHash, table.eventIndex),
    index("poison_events_beast_token_id_idx").on(table.beastTokenId),
    index("poison_events_player_idx").on(table.player),
    index("poison_events_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Diplomacy Groups table - diplomacy configuration history
 *
 * Append-only history of diplomacy group formations.
 * beast_token_ids stored as comma-separated string for simplicity.
 */
export const diplomacyGroups = pgTable(
  "diplomacy_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    specialsHash: text("specials_hash").notNull(),
    beastTokenIds: text("beast_token_ids").notNull(), // Comma-separated u32 values
    totalPower: smallint("total_power").notNull(),
    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("diplomacy_groups_block_tx_event_idx").on(table.blockNumber, table.transactionHash, table.eventIndex),
    index("diplomacy_groups_specials_hash_idx").on(table.specialsHash),
    index("diplomacy_groups_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Corpse Events table - corpse creation history
 *
 * Append-only history of corpse collection.
 */
export const corpseEvents = pgTable(
  "corpse_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adventurerId: bigint("adventurer_id", { mode: "bigint" }).notNull(),
    player: text("player").notNull(),
    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("corpse_events_block_tx_event_idx").on(table.blockNumber, table.transactionHash, table.eventIndex),
    index("corpse_events_adventurer_id_idx").on(table.adventurerId),
    index("corpse_events_player_idx").on(table.player),
    index("corpse_events_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Skull Events table - skull claim history
 *
 * Append-only history of skull claims.
 */
export const skullEvents = pgTable(
  "skull_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beastTokenId: integer("beast_token_id").notNull(),
    skulls: bigint("skulls", { mode: "bigint" }).notNull(),
    player: text("player"), // Owner of the beast (joined from beast_owners)
    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    transactionHash: text("transaction_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("skull_events_block_tx_event_idx").on(table.blockNumber, table.transactionHash, table.eventIndex),
    index("skull_events_beast_token_id_idx").on(table.beastTokenId),
    index("skull_events_skulls_idx").on(table.skulls.desc()),
    index("skull_events_player_idx").on(table.player),
    index("skull_events_created_at_idx").on(table.createdAt.desc()),
  ]
);

/**
 * Beast Owners table - current ownership of Beasts NFTs
 *
 * Upserted on each Transfer event from Beasts contract.
 * Primary key is token_id since we only care about current owner.
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
  ]
);

/**
 * Beasts table - NFT metadata (immutable)
 *
 * Inserted once when a beast is first seen via Transfer event.
 * Metadata is fetched via RPC and stored permanently.
 */
export const beasts = pgTable(
  "beasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenId: integer("token_id").notNull().unique(),
    // Unpacked beast metadata
    beastId: smallint("beast_id").notNull(), // Species 1-75 (7 bits)
    prefix: smallint("prefix").notNull(), // Name prefix (7 bits)
    suffix: smallint("suffix").notNull(), // Name suffix (5 bits)
    level: smallint("level").notNull(), // Level (16 bits)
    health: smallint("health").notNull(), // Health (16 bits)
    shiny: smallint("shiny").notNull(), // Visual trait (1 bit)
    animated: smallint("animated").notNull(), // Visual trait (1 bit)
    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow(),
  },
  (table) => [
    index("beasts_token_id_idx").on(table.tokenId),
    index("beasts_beast_id_idx").on(table.beastId),
    index("beasts_prefix_idx").on(table.prefix),
    index("beasts_suffix_idx").on(table.suffix),
    index("beasts_level_idx").on(table.level.desc()),
  ]
);

/**
 * Beast Data table - Dojo event data linked to beasts
 *
 * Stores data from Loot Survivor Dojo events:
 * - EntityStats: adventurers_killed count
 * - CollectableEntity: last_death_timestamp
 *
 * Linked to beasts table via entity_hash (poseidon_hash(id, prefix, suffix))
 */
export const beastData = pgTable(
  "beast_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityHash: text("entity_hash").notNull().unique(),
    adventurersKilled: bigint("adventurers_killed", { mode: "bigint" }).notNull(),
    lastDeathTimestamp: bigint("last_death_timestamp", { mode: "bigint" }).notNull(),
    tokenId: integer("token_id"), // Nullable, linked after beast mint
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("beast_data_token_id_idx").on(table.tokenId),
    index("beast_data_adventurers_killed_idx").on(table.adventurersKilled.desc()),
    index("beast_data_updated_at_idx").on(table.updatedAt.desc()),
  ]
);

/**
 * Summit Log table - unified activity feed
 *
 * Consolidates all game events into a single table for activity feeds.
 * Categories: Battle, Beast Upgrade, Rewards, Arriving to Summit, LS Events
 * Includes both direct events and derived events (stat changes detected by comparing old vs new state).
 */
export const summitLog = pgTable(
  "summit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    eventIndex: integer("event_index").notNull(),
    category: text("category").notNull(),
    subCategory: text("sub_category").notNull(),
    data: jsonb("data").notNull(),
    player: text("player"), // Nullable, for filtering
    tokenId: integer("token_id"), // Nullable, for filtering
    transactionHash: text("transaction_hash").notNull(),
    // Timestamps
    createdAt: timestamp("created_at").notNull(), // Starknet block timestamp
    indexedAt: timestamp("indexed_at").notNull(), // When DNA delivered block
    insertedAt: timestamp("inserted_at").defaultNow(), // When row inserted
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("summit_log_block_tx_event_idx").on(table.blockNumber, table.transactionHash, table.eventIndex),
    // Ordering index
    index("summit_log_order_idx").on(table.blockNumber.desc(), table.eventIndex.desc()),
    // Filter indexes
    index("summit_log_category_idx").on(table.category),
    index("summit_log_player_idx").on(table.player),
    index("summit_log_token_id_idx").on(table.tokenId),
    // Combined index for player activity feed
    index("summit_log_player_order_idx").on(table.player, table.blockNumber.desc(), table.eventIndex.desc()),
  ]
);

// Export all schema tables for Drizzle
export const schema = {
  beastStats,
  battles,
  rewardsEarned,
  rewardsClaimed,
  poisonEvents,
  diplomacyGroups,
  corpseEvents,
  skullEvents,
  beastOwners,
  beasts,
  beastData,
  summitLog,
};
