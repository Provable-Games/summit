CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attacking_player" text NOT NULL,
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
	"revive_potions" smallint NOT NULL,
	"xp_gained" smallint NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "poison_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beast_token_id" integer NOT NULL,
	"count" smallint NOT NULL,
	"player" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
);
--> statement-breakpoint
CREATE TABLE "rewards_earned" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beast_token_id" integer NOT NULL,
	"player" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
);
--> statement-breakpoint
CREATE TABLE "rewards_claimed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
);
--> statement-breakpoint
CREATE TABLE "skull_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player" text NOT NULL,
	"beast_token_id" integer NOT NULL,
	"skulls" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
);
--> statement-breakpoint
CREATE TABLE "summit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beast_token_id" integer NOT NULL,
	"player" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"indexed_at" timestamp NOT NULL,
	"inserted_at" timestamp DEFAULT now(),
	"block_number" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
);
--> statement-breakpoint
--> beast_stats indexes
CREATE INDEX "beast_stats_token_id_idx" ON "beast_stats" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "beast_stats_blocks_held_idx" ON "beast_stats" USING btree ("blocks_held" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "beast_stats_last_death_timestamp_idx" ON "beast_stats" USING btree ("last_death_timestamp" DESC NULLS LAST);--> statement-breakpoint
--> battles indexes
CREATE INDEX "battles_attacking_player_idx" ON "battles" USING btree ("attacking_player");--> statement-breakpoint
CREATE INDEX "battles_created_at_idx" ON "battles" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
--> corpse_events indexes
CREATE INDEX "corpse_events_player_idx" ON "corpse_events" USING btree ("player");--> statement-breakpoint
CREATE INDEX "corpse_events_adventurer_id_idx" ON "corpse_events" USING btree ("adventurer_id");--> statement-breakpoint
CREATE INDEX "corpse_events_created_at_idx" ON "corpse_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
--> diplomacy_groups indexes
CREATE INDEX "diplomacy_groups_specials_hash_idx" ON "diplomacy_groups" USING btree ("specials_hash");--> statement-breakpoint
--> poison_events indexes
CREATE INDEX "poison_events_player_idx" ON "poison_events" USING btree ("player");--> statement-breakpoint
CREATE INDEX "poison_events_created_at_idx" ON "poison_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
--> rewards_earned indexes
CREATE INDEX "rewards_earned_player_idx" ON "rewards_earned" USING btree ("player");--> statement-breakpoint
CREATE INDEX "rewards_earned_created_at_idx" ON "rewards_earned" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
--> rewards_claimed indexes
CREATE INDEX "rewards_claimed_player_idx" ON "rewards_claimed" USING btree ("player");--> statement-breakpoint
CREATE INDEX "rewards_claimed_created_at_idx" ON "rewards_claimed" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
--> skull_events indexes
CREATE INDEX "skull_events_player_idx" ON "skull_events" USING btree ("player");--> statement-breakpoint
CREATE INDEX "skull_events_created_at_idx" ON "skull_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
--> summit_history indexes
CREATE INDEX "summit_history_player_idx" ON "summit_history" USING btree ("player");--> statement-breakpoint
CREATE INDEX "summit_history_beast_token_id_idx" ON "summit_history" USING btree ("beast_token_id");--> statement-breakpoint
CREATE INDEX "summit_history_created_at_idx" ON "summit_history" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint