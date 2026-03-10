CREATE INDEX IF NOT EXISTS "beast_stats_top_order_idx" ON "beast_stats" USING btree (
  "summit_held_seconds" DESC NULLS LAST,
  "bonus_xp" DESC NULLS LAST,
  "last_death_timestamp" DESC NULLS LAST,
  "token_id"
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "beast_owners_owner_token_idx" ON "beast_owners" USING btree (
  "owner",
  "token_id"
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "beasts_prefix_suffix_token_idx" ON "beasts" USING btree (
  "prefix",
  "suffix",
  "token_id"
);
