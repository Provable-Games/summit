/**
 * Summit Indexer Database Schema
 *
 * 11 tables for all contract events:
 * 1. beast_stats - Current beast state (upsert on token_id)
 * 2. battles - Combat history (append-only)
 * 3. rewards_earned - Reward distribution (append-only)
 * 4. rewards_claimed - Rewards claimed by players (append-only)
 * 5. poison_events - Poison attacks (append-only)
 * 6. corpse_events - Corpse creation (append-only)
 * 7. skulls_claimed - Total skulls claimed per beast (upsert on beast_token_id)
 * 8. beast_owners - Current NFT ownership (upsert on token_id)
 * 9. beasts - NFT metadata (insert once)
 * 10. beast_data - Dojo event data (upsert on entity_hash)
 * 11. summit_log - Unified activity feed (append-only with derived events)
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
  boolean,
  smallint,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Beast Stats table - current state of each beast
 *
 * Upserted on each LiveBeastStatsEvent and BeastUpdatesEvent.
 * Primary key is token_id since we only care about latest state.
 */
export const beast_stats = pgTable(
  "beast_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token_id: integer("token_id").notNull().unique(),
    current_health: smallint("current_health").notNull(),
    bonus_health: smallint("bonus_health").notNull(),
    bonus_xp: smallint("bonus_xp").notNull(),
    attack_streak: smallint("attack_streak").notNull(),
    last_death_timestamp: bigint("last_death_timestamp", { mode: "bigint" }).notNull(),
    revival_count: smallint("revival_count").notNull(),
    extra_lives: smallint("extra_lives").notNull(),
    captured_summit: boolean("captured_summit").notNull(),
    used_revival_potion: boolean("used_revival_potion").notNull(),
    used_attack_potion: boolean("used_attack_potion").notNull(),
    max_attack_streak: boolean("max_attack_streak").notNull(),
    summit_held_seconds: integer("summit_held_seconds").notNull(),
    // Stats struct fields
    spirit: smallint("spirit").notNull(),
    luck: smallint("luck").notNull(),
    specials: boolean("specials").notNull(),
    wisdom: boolean("wisdom").notNull(),
    diplomacy: boolean("diplomacy").notNull(),
    // Rewards tracking
    rewards_earned: integer("rewards_earned").notNull(),
    rewards_claimed: integer("rewards_claimed").notNull(),
    // Timestamps
    created_at: timestamp("created_at").notNull(), // Starknet block timestamp
    indexed_at: timestamp("indexed_at").notNull(), // When DNA delivered block
    inserted_at: timestamp("inserted_at").defaultNow(), // When row inserted (set by PostgreSQL)
    updated_at: timestamp("updated_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
  },
  (table) => [
    index("beast_stats_current_health_idx").on(table.current_health),
    index("beast_stats_summit_held_seconds_idx").on(table.summit_held_seconds.desc()),
    index("beast_stats_updated_at_idx").on(table.updated_at.desc()),
    // Partial index for beasts with diplomacy upgrade
    index("beast_stats_diplomacy_token_idx").on(table.token_id).where(sql`diplomacy`),
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
    attacking_beast_token_id: integer("attacking_beast_token_id").notNull(),
    attacking_player: text("attacking_player"), // Owner of attacking beast (joined from beast_owners)
    attack_index: smallint("attack_index").notNull(),
    defending_beast_token_id: integer("defending_beast_token_id").notNull(),
    attack_count: smallint("attack_count").notNull(),
    attack_damage: smallint("attack_damage").notNull(),
    critical_attack_count: smallint("critical_attack_count").notNull(),
    critical_attack_damage: smallint("critical_attack_damage").notNull(),
    counter_attack_count: smallint("counter_attack_count").notNull(),
    counter_attack_damage: smallint("counter_attack_damage").notNull(),
    critical_counter_attack_count: smallint("critical_counter_attack_count").notNull(),
    critical_counter_attack_damage: smallint("critical_counter_attack_damage").notNull(),
    attack_potions: smallint("attack_potions").notNull(),
    revive_potions: smallint("revive_potions").notNull(),
    xp_gained: smallint("xp_gained").notNull(),
    // Timestamps
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("battles_block_tx_event_idx").on(table.block_number, table.transaction_hash, table.event_index),
    index("battles_attacking_beast_idx").on(table.attacking_beast_token_id),
    index("battles_attacking_player_idx").on(table.attacking_player),
    index("battles_defending_beast_idx").on(table.defending_beast_token_id),
    index("battles_created_at_idx").on(table.created_at.desc()),
    index("battles_block_number_idx").on(table.block_number),
  ]
);

/**
 * Rewards Earned table - token reward distribution
 *
 * Append-only history of rewards earned.
 */
export const rewards_earned = pgTable(
  "rewards_earned",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beast_token_id: integer("beast_token_id").notNull(),
    owner: text("owner"), // Owner of the beast (joined from beast_owners)
    amount: integer("amount").notNull(),
    // Timestamps
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("rewards_earned_block_tx_event_idx").on(table.block_number, table.transaction_hash, table.event_index),
    index("rewards_earned_owner_idx").on(table.owner),
    index("rewards_earned_beast_token_id_idx").on(table.beast_token_id),
    index("rewards_earned_created_at_idx").on(table.created_at.desc()),
  ]
);

/**
 * Rewards Claimed table - tracks reward claims by players
 *
 * Append-only history of claimed rewards.
 */
export const rewards_claimed = pgTable(
  "rewards_claimed",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    player: text("player").notNull(),
    beast_token_ids: text("beast_token_ids").notNull(), // Comma-separated u32 values
    amount: text("amount").notNull(), // u256 stored as string
    // Timestamps
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("rewards_claimed_block_tx_event_idx").on(table.block_number, table.transaction_hash, table.event_index),
    index("rewards_claimed_player_idx").on(table.player),
    index("rewards_claimed_created_at_idx").on(table.created_at.desc()),
  ]
);

/**
 * Poison Events table - poison attack history
 *
 * Append-only history of poison attacks.
 */
export const poison_events = pgTable(
  "poison_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beast_token_id: integer("beast_token_id").notNull(),
    block_timestamp: bigint("block_timestamp", { mode: "bigint" }).notNull(),
    count: smallint("count").notNull(),
    player: text("player").notNull(),
    // Timestamps
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("poison_events_block_tx_event_idx").on(table.block_number, table.transaction_hash, table.event_index),
    index("poison_events_beast_token_id_idx").on(table.beast_token_id),
    index("poison_events_player_idx").on(table.player),
    index("poison_events_created_at_idx").on(table.created_at.desc()),
  ]
);

/**
 * Skulls Claimed table - total skulls claimed per beast
 *
 * Upserted on each SkullEvent. Stores cumulative total skulls claimed.
 */
export const skulls_claimed = pgTable(
  "skulls_claimed",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beast_token_id: integer("beast_token_id").notNull().unique(),
    skulls: bigint("skulls", { mode: "bigint" }).notNull(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("skulls_claimed_skulls_idx").on(table.skulls.desc())]
);

/**
 * Quest Rewards Claimed table - tracks quest rewards claimed per beast
 *
 * Upserted on each QuestRewardsClaimedEvent. Stores total quest rewards claimed.
 */
export const quest_rewards_claimed = pgTable(
  "quest_rewards_claimed",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beast_token_id: integer("beast_token_id").notNull().unique(),
    amount: smallint("amount").notNull(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("quest_rewards_claimed_beast_token_id_idx").on(table.beast_token_id),
  ]
);

/**
 * Corpse Events table - corpse creation history
 *
 * Append-only history of corpse collection.
 */
export const corpse_events = pgTable(
  "corpse_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adventurer_id: bigint("adventurer_id", { mode: "bigint" }).notNull(),
    player: text("player").notNull(),
    // Timestamps
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    // Unique constraint for idempotent re-indexing (includes adventurer_id for batch events)
    uniqueIndex("corpse_events_block_tx_event_adv_idx").on(
      table.block_number, table.transaction_hash, table.event_index, table.adventurer_id
    ),
    index("corpse_events_adventurer_id_idx").on(table.adventurer_id),
    index("corpse_events_player_idx").on(table.player),
    index("corpse_events_created_at_idx").on(table.created_at.desc()),
  ]
);

/**
 * Beast Owners table - current ownership of Beasts NFTs
 *
 * Upserted on each Transfer event from Beasts contract.
 * Primary key is token_id since we only care about current owner.
 */
export const beast_owners = pgTable(
  "beast_owners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token_id: integer("token_id").notNull().unique(),
    owner: text("owner").notNull(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("beast_owners_owner_idx").on(table.owner),
    index("beast_owners_token_id_idx").on(table.token_id),
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
    token_id: integer("token_id").notNull().unique(),
    // Unpacked beast metadata
    beast_id: smallint("beast_id").notNull(), // Species 1-75 (7 bits)
    prefix: smallint("prefix").notNull(), // Name prefix (7 bits)
    suffix: smallint("suffix").notNull(), // Name suffix (5 bits)
    level: smallint("level").notNull(), // Level (16 bits)
    health: smallint("health").notNull(), // Health (16 bits)
    shiny: smallint("shiny").notNull(), // Visual trait (1 bit)
    animated: smallint("animated").notNull(), // Visual trait (1 bit)
    // Timestamps
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
  },
  (table) => [
    index("beasts_token_id_idx").on(table.token_id),
    index("beasts_beast_id_idx").on(table.beast_id),
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
export const beast_data = pgTable(
  "beast_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entity_hash: text("entity_hash").notNull().unique(),
    adventurers_killed: bigint("adventurers_killed", { mode: "bigint" }).notNull(),
    last_death_timestamp: bigint("last_death_timestamp", { mode: "bigint" }).notNull(),
    last_killed_by: bigint("last_killed_by", { mode: "bigint" }).notNull(),
    token_id: integer("token_id"), // Nullable, linked after beast mint
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("beast_data_token_id_idx").on(table.token_id),
    index("beast_data_adventurers_killed_idx").on(table.adventurers_killed.desc()),
    index("beast_data_updated_at_idx").on(table.updated_at.desc()),
  ]
);

/**
 * Summit Log table - unified activity feed
 *
 * Consolidates all game events into a single table for activity feeds.
 * Categories: Battle, Beast Upgrade, Rewards, LS Events
 * Includes both direct events and derived events (stat changes detected by comparing old vs new state).
 */
export const summit_log = pgTable(
  "summit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    event_index: integer("event_index").notNull(),
    category: text("category").notNull(),
    sub_category: text("sub_category").notNull(),
    data: jsonb("data").notNull(),
    player: text("player"), // Nullable, for filtering
    token_id: integer("token_id"), // Nullable, for filtering
    transaction_hash: text("transaction_hash").notNull(),
    // Timestamps
    created_at: timestamp("created_at").notNull(), // Starknet block timestamp
    indexed_at: timestamp("indexed_at").notNull(), // When DNA delivered block
    inserted_at: timestamp("inserted_at").defaultNow(), // When row inserted
  },
  (table) => [
    // Unique constraint for idempotent re-indexing
    uniqueIndex("summit_log_block_tx_event_idx").on(table.block_number, table.transaction_hash, table.event_index),
    // Ordering index
    index("summit_log_order_idx").on(table.block_number.desc(), table.event_index.desc()),
    // Filter indexes
    index("summit_log_category_idx").on(table.category),
    index("summit_log_sub_category_idx").on(table.sub_category),
    index("summit_log_player_idx").on(table.player),
    index("summit_log_token_id_idx").on(table.token_id),
    // Combined indexes for filtered activity feeds
    index("summit_log_category_order_idx").on(table.category, table.block_number.desc(), table.event_index.desc()),
    index("summit_log_player_order_idx").on(table.player, table.block_number.desc(), table.event_index.desc()),
  ]
);

// Export all schema tables for Drizzle
export const schema = {
  beast_stats,
  battles,
  rewards_earned,
  rewards_claimed,
  poison_events,
  corpse_events,
  skulls_claimed,
  quest_rewards_claimed,
  beast_owners,
  beasts,
  beast_data,
  summit_log,
};
