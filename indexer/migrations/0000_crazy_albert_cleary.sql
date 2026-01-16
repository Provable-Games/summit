CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attacking_beast_token_id" integer NOT NULL,
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
	"xp_gained" smallint NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
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
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reward_block_number" bigint NOT NULL,
	"beast_token_id" integer NOT NULL,
	"owner" text NOT NULL,
	"amount" integer NOT NULL,
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
CREATE TABLE "skull_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beast_token_id" integer NOT NULL,
	"skulls" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beast_token_id" integer NOT NULL,
	"beast_id" smallint NOT NULL,
	"beast_prefix" smallint NOT NULL,
	"beast_suffix" smallint NOT NULL,
	"beast_level" smallint NOT NULL,
	"beast_health" smallint NOT NULL,
	"beast_shiny" smallint NOT NULL,
	"beast_animated" smallint NOT NULL,
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
	"diplomacy_stat" smallint NOT NULL,
	"rewards_earned" integer NOT NULL,
	"rewards_claimed" integer NOT NULL,
	"owner" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"event_index" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "battles_block_tx_event_idx" ON "battles" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "battles_attacking_beast_idx" ON "battles" USING btree ("attacking_beast_token_id");--> statement-breakpoint
CREATE INDEX "battles_defending_beast_idx" ON "battles" USING btree ("defending_beast_token_id");--> statement-breakpoint
CREATE INDEX "battles_created_at_idx" ON "battles" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "battles_block_number_idx" ON "battles" USING btree ("block_number");--> statement-breakpoint
CREATE INDEX "beast_stats_current_health_idx" ON "beast_stats" USING btree ("current_health");--> statement-breakpoint
CREATE INDEX "beast_stats_blocks_held_idx" ON "beast_stats" USING btree ("blocks_held" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "beast_stats_updated_at_idx" ON "beast_stats" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "corpse_events_block_tx_event_idx" ON "corpse_events" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "corpse_events_adventurer_id_idx" ON "corpse_events" USING btree ("adventurer_id");--> statement-breakpoint
CREATE INDEX "corpse_events_player_idx" ON "corpse_events" USING btree ("player");--> statement-breakpoint
CREATE INDEX "corpse_events_created_at_idx" ON "corpse_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "diplomacy_groups_block_tx_event_idx" ON "diplomacy_groups" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "diplomacy_groups_specials_hash_idx" ON "diplomacy_groups" USING btree ("specials_hash");--> statement-breakpoint
CREATE INDEX "diplomacy_groups_created_at_idx" ON "diplomacy_groups" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "poison_events_block_tx_event_idx" ON "poison_events" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "poison_events_beast_token_id_idx" ON "poison_events" USING btree ("beast_token_id");--> statement-breakpoint
CREATE INDEX "poison_events_player_idx" ON "poison_events" USING btree ("player");--> statement-breakpoint
CREATE INDEX "poison_events_created_at_idx" ON "poison_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "rewards_block_tx_event_idx" ON "rewards" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "rewards_owner_idx" ON "rewards" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "rewards_beast_token_id_idx" ON "rewards" USING btree ("beast_token_id");--> statement-breakpoint
CREATE INDEX "rewards_created_at_idx" ON "rewards" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "rewards_claimed_block_tx_event_idx" ON "rewards_claimed" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "rewards_claimed_player_idx" ON "rewards_claimed" USING btree ("player");--> statement-breakpoint
CREATE INDEX "rewards_claimed_created_at_idx" ON "rewards_claimed" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "skull_events_block_tx_event_idx" ON "skull_events" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "skull_events_beast_token_id_idx" ON "skull_events" USING btree ("beast_token_id");--> statement-breakpoint
CREATE INDEX "skull_events_skulls_idx" ON "skull_events" USING btree ("skulls" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "skull_events_created_at_idx" ON "skull_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "summit_history_block_tx_event_idx" ON "summit_history" USING btree ("block_number","transaction_hash","event_index");--> statement-breakpoint
CREATE INDEX "summit_history_beast_token_id_idx" ON "summit_history" USING btree ("beast_token_id");--> statement-breakpoint
CREATE INDEX "summit_history_owner_idx" ON "summit_history" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "summit_history_created_at_idx" ON "summit_history" USING btree ("created_at" DESC NULLS LAST);