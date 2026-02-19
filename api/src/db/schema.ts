/**
 * Summit API Database Schema
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

/**
 * Beasts table - NFT beast metadata
 */
export const beasts = pgTable(
  "beasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token_id: integer("token_id").notNull().unique(),
    beast_id: smallint("beast_id").notNull(),
    prefix: smallint("prefix").notNull(),
    suffix: smallint("suffix").notNull(),
    level: smallint("level").notNull(),
    health: smallint("health").notNull(),
    shiny: smallint("shiny").notNull(),
    animated: smallint("animated").notNull(),
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
 * Beast Owners table - current owner of each beast
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
 * Beast Data table - Loot Survivor stats (adventurers killed, etc.)
 */
export const beast_data = pgTable(
  "beast_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entity_hash: text("entity_hash").notNull().unique(),
    adventurers_killed: bigint("adventurers_killed", { mode: "bigint" }).notNull(),
    last_death_timestamp: bigint("last_death_timestamp", { mode: "bigint" }).notNull(),
    last_killed_by: bigint("last_killed_by", { mode: "bigint" }).notNull(),
    token_id: integer("token_id"),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("beast_data_token_id_idx").on(table.token_id),
    index("beast_data_entity_hash_idx").on(table.entity_hash),
  ]
);

/**
 * Beast Stats table - current Summit game state of each beast
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
    spirit: smallint("spirit").notNull(),
    luck: smallint("luck").notNull(),
    specials: boolean("specials").notNull(),
    wisdom: boolean("wisdom").notNull(),
    diplomacy: boolean("diplomacy").notNull(),
    rewards_earned: integer("rewards_earned").notNull(),
    rewards_claimed: integer("rewards_claimed").notNull(),
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
  },
  (table) => [
    index("beast_stats_current_health_idx").on(table.current_health),
    index("beast_stats_summit_held_seconds_idx").on(table.summit_held_seconds.desc()),
    index("beast_stats_updated_at_idx").on(table.updated_at.desc()),
  ]
);

/**
 * Battles table - combat history
 */
export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attacking_beast_token_id: integer("attacking_beast_token_id").notNull(),
    attacking_player: text("attacking_player"),
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
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("battles_block_tx_event_idx").on(
      table.block_number,
      table.transaction_hash,
      table.event_index
    ),
    index("battles_attacking_beast_idx").on(table.attacking_beast_token_id),
    index("battles_attacking_player_idx").on(table.attacking_player),
    index("battles_defending_beast_idx").on(table.defending_beast_token_id),
    index("battles_created_at_idx").on(table.created_at.desc()),
    index("battles_block_number_idx").on(table.block_number),
  ]
);

/**
 * Rewards Earned table - token reward distribution
 */
export const rewards_earned = pgTable(
  "rewards_earned",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beast_token_id: integer("beast_token_id").notNull(),
    owner: text("owner"),
    amount: integer("amount").notNull(),
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("rewards_earned_block_tx_event_idx").on(
      table.block_number,
      table.transaction_hash,
      table.event_index
    ),
    index("rewards_earned_owner_idx").on(table.owner),
    index("rewards_earned_beast_token_id_idx").on(table.beast_token_id),
    index("rewards_earned_created_at_idx").on(table.created_at.desc()),
  ]
);

/**
 * Rewards Claimed table - tracks reward claims by players
 */
export const rewards_claimed = pgTable(
  "rewards_claimed",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    player: text("player").notNull(),
    beast_token_ids: text("beast_token_ids").notNull(),
    amount: text("amount").notNull(),
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("rewards_claimed_block_tx_event_idx").on(
      table.block_number,
      table.transaction_hash,
      table.event_index
    ),
    index("rewards_claimed_player_idx").on(table.player),
    index("rewards_claimed_created_at_idx").on(table.created_at.desc()),
  ]
);

/**
 * Poison Events table - poison attack history
 */
export const poison_events = pgTable(
  "poison_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beast_token_id: integer("beast_token_id").notNull(),
    block_timestamp: bigint("block_timestamp", { mode: "bigint" }).notNull(),
    count: smallint("count").notNull(),
    player: text("player").notNull(),
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("poison_events_block_tx_event_idx").on(
      table.block_number,
      table.transaction_hash,
      table.event_index
    ),
    index("poison_events_beast_token_id_idx").on(table.beast_token_id),
    index("poison_events_player_idx").on(table.player),
    index("poison_events_created_at_idx").on(table.created_at.desc()),
  ]
);

/**
 * Corpse Events table - corpse creation history
 */
export const corpse_events = pgTable(
  "corpse_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adventurer_id: bigint("adventurer_id", { mode: "bigint" }).notNull(),
    player: text("player").notNull(),
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
    block_number: bigint("block_number", { mode: "bigint" }).notNull(),
    transaction_hash: text("transaction_hash").notNull(),
    event_index: integer("event_index").notNull(),
  },
  (table) => [
    uniqueIndex("corpse_events_block_tx_event_idx").on(
      table.block_number,
      table.transaction_hash,
      table.event_index
    ),
    index("corpse_events_adventurer_id_idx").on(table.adventurer_id),
    index("corpse_events_player_idx").on(table.player),
    index("corpse_events_created_at_idx").on(table.created_at.desc()),
  ]
);

/**
 * Skulls Claimed table - total skulls claimed per beast
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
 * Quest Rewards Claimed table - quest rewards per beast
 */
export const quest_rewards_claimed = pgTable(
  "quest_rewards_claimed",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beast_token_id: integer("beast_token_id").notNull().unique(),
    amount: smallint("amount").notNull(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("quest_rewards_claimed_beast_token_id_idx").on(table.beast_token_id)]
);

/**
 * Summit Log table - unified activity feed
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
    player: text("player"),
    token_id: integer("token_id"),
    transaction_hash: text("transaction_hash").notNull(),
    created_at: timestamp("created_at").notNull(),
    indexed_at: timestamp("indexed_at").notNull(),
    inserted_at: timestamp("inserted_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("summit_log_block_tx_event_idx").on(
      table.block_number,
      table.transaction_hash,
      table.event_index
    ),
    index("summit_log_order_idx").on(table.block_number.desc(), table.event_index.desc()),
    index("summit_log_category_idx").on(table.category),
    index("summit_log_player_idx").on(table.player),
    index("summit_log_token_id_idx").on(table.token_id),
  ]
);

/**
 * Consumables table - ERC20 token balances per owner
 */
export const consumables = pgTable(
  "consumables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner: text("owner").notNull().unique(),
    xlife_count: integer("xlife_count").notNull().default(0),
    attack_count: integer("attack_count").notNull().default(0),
    revive_count: integer("revive_count").notNull().default(0),
    poison_count: integer("poison_count").notNull().default(0),
    updated_at: timestamp("updated_at").defaultNow(),
  }
);

// Export all schema tables
export const schema = {
  beasts,
  beast_owners,
  beast_data,
  beast_stats,
  summit_log,
  battles,
  rewards_earned,
  rewards_claimed,
  poison_events,
  corpse_events,
  skulls_claimed,
  quest_rewards_claimed,
  consumables,
};
