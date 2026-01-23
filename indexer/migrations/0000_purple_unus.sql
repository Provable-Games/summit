CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attacking_beast_token_id" integer NOT NULL,
	"attacking_player" text,
	"attack_index" smallint NOT NULL,
	"defending_beast_token_id" integer NOT NULL,
	"attack_count" smallint NOT NULL,
	"attack_damage" smallint NOT NULL,
	"critical_attack_count" smallint NOT NULL,
	"critical_attack_damage" smallint NOT NULL,
	"counter_attack_count" smallint NOT NULL,
	"counter_attack_damage" smallint NOT NULL,
	"critical_counter_attack_count" smallint NOT NULL,
	"critical_counter_attack_damage" smallint NOT NULL,
	"attack_potions" smallint NOT NULL,
	"revive_potions" smallint NOT NULL,
	"xp_gained" smallint NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beast_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_hash" text NOT NULL,
	"adventurers_killed" bigint NOT NULL,
	"last_death_timestamp" bigint NOT NULL,
	"last_killed_by" bigint NOT NULL,
	"token_id" integer,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "beast_data_entity_hash_unique" UNIQUE("entity_hash")
);
--> statement-breakpoint
CREATE TABLE "beast_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" integer NOT NULL,
	"owner" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "beast_owners_token_id_unique" UNIQUE("token_id")
);
--> statement-breakpoint
CREATE TABLE "beast_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" integer NOT NULL,
	"current_health" smallint NOT NULL,
	"bonus_health" smallint NOT NULL,
	"bonus_xp" smallint NOT NULL,
	"attack_streak" smallint NOT NULL,
	"last_death_timestamp" bigint NOT NULL,
	"revival_count" smallint NOT NULL,
	"extra_lives" smallint NOT NULL,
	"has_claimed_potions" smallint NOT NULL,
	"blocks_held" integer NOT NULL,
	"spirit" smallint NOT NULL,
	"luck" smallint NOT NULL,
	"specials" smallint NOT NULL,
	"wisdom" smallint NOT NULL,
	"diplomacy" smallint NOT NULL,
	"rewards_earned" integer NOT NULL,
	"rewards_claimed" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	CONSTRAINT "beast_stats_token_id_unique" UNIQUE("token_id")
);
--> statement-breakpoint
CREATE TABLE "beasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" integer NOT NULL,
	"beast_id" smallint NOT NULL,
	"prefix" smallint NOT NULL,
	"suffix" smallint NOT NULL,
	"level" smallint NOT NULL,
	"health" smallint NOT NULL,
	"shiny" smallint NOT NULL,
	"animated" smallint NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	CONSTRAINT "beasts_token_id_unique" UNIQUE("token_id")
);
--> statement-breakpoint
CREATE TABLE "corpse_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventurer_id" bigint NOT NULL,
	"player" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diplomacy_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"specials_hash" text NOT NULL,
	"beast_token_ids" text NOT NULL,
	"total_power" smallint NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poison_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beast_token_id" integer NOT NULL,
	"block_timestamp" bigint NOT NULL,
	"count" smallint NOT NULL,
	"player" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewards_claimed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player" text NOT NULL,
	"beast_token_ids" text NOT NULL,
	"amount" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewards_earned" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beast_token_id" integer NOT NULL,
	"owner" text,
	"amount" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skull_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beast_token_id" integer NOT NULL,
	"skulls" bigint NOT NULL,
	"player" text,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_number" bigint NOT NULL,
	"event_index" integer NOT NULL,
	"category" text NOT NULL,
	"sub_category" text NOT NULL,
	"data" jsonb NOT NULL,
	"player" text,
	"token_id" integer,
	"transaction_hash" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "battles_block_tx_event_idx" ON "battles" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "battles_attacking_beast_idx" ON "battles" USING btree ("attacking_beast_token_id");--> statement-breakpoint
CREATE INDEX "battles_attacking_player_idx" ON "battles" USING btree ("attacking_player");--> statement-breakpoint

CREATE INDEX "beast_data_token_id_idx" ON "beast_data" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "beast_data_entity_hash_idx" ON "beast_data" USING btree ("entity_hash");--> statement-breakpoint

CREATE INDEX "beast_owners_owner_idx" ON "beast_owners" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "beast_owners_token_id_idx" ON "beast_owners" USING btree ("token_id");--> statement-breakpoint

CREATE INDEX "beast_stats_token_id_idx" ON "beast_stats" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "beast_stats_current_health_idx" ON "beast_stats" USING btree ("current_health" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "beast_stats_beast_order_idx" ON "beast_stats" USING btree ("blocks_held" DESC NULLS LAST,"bonus_xp" DESC NULLS LAST,"last_death_timestamp" DESC NULLS LAST);--> statement-breakpoint


CREATE INDEX "beasts_token_id_idx" ON "beasts" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "beasts_beast_id_idx" ON "beasts" USING btree ("beast_id");--> statement-breakpoint
CREATE INDEX "beasts_prefix_idx" ON "beasts" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "beasts_suffix_idx" ON "beasts" USING btree ("suffix");--> statement-breakpoint
CREATE INDEX "beasts_level_idx" ON "beasts" USING btree ("level" DESC NULLS LAST);--> statement-breakpoint

CREATE UNIQUE INDEX "corpse_events_block_tx_event_idx" ON "corpse_events" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "corpse_events_adventurer_id_idx" ON "corpse_events" USING btree ("adventurer_id");--> statement-breakpoint
CREATE INDEX "corpse_events_player_idx" ON "corpse_events" USING btree ("player");--> statement-breakpoint

CREATE UNIQUE INDEX "diplomacy_groups_block_tx_event_idx" ON "diplomacy_groups" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "diplomacy_groups_specials_hash_idx" ON "diplomacy_groups" USING btree ("specials_hash");--> statement-breakpoint

CREATE UNIQUE INDEX "poison_events_block_tx_event_idx" ON "poison_events" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "poison_events_player_idx" ON "poison_events" USING btree ("player");--> statement-breakpoint

CREATE UNIQUE INDEX "rewards_claimed_block_tx_event_idx" ON "rewards_claimed" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "rewards_claimed_player_idx" ON "rewards_claimed" USING btree ("player");--> statement-breakpoint

CREATE UNIQUE INDEX "rewards_earned_block_tx_event_idx" ON "rewards_earned" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "rewards_earned_owner_idx" ON "rewards_earned" USING btree ("owner");--> statement-breakpoint

CREATE UNIQUE INDEX "skull_events_block_tx_event_idx" ON "skull_events" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "skull_events_beast_token_id_idx" ON "skull_events" USING btree ("beast_token_id");--> statement-breakpoint
CREATE INDEX "skull_events_player_idx" ON "skull_events" USING btree ("player");--> statement-breakpoint

CREATE UNIQUE INDEX "summit_log_block_tx_event_idx" ON "summit_log" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "summit_log_order_idx" ON "summit_log" USING btree ("block_number" DESC NULLS LAST,"event_index" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "summit_log_category_idx" ON "summit_log" USING btree ("category");--> statement-breakpoint
CREATE INDEX "summit_log_player_idx" ON "summit_log" USING btree ("player");--> statement-breakpoint
CREATE INDEX "summit_log_token_id_idx" ON "summit_log" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "summit_log_player_order_idx" ON "summit_log" USING btree ("player","block_number" DESC NULLS LAST,"event_index" DESC NULLS LAST);
