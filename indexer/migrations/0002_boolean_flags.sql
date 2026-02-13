-- Migration: convert packed 1-bit summit flags from smallint to boolean
-- Apply this migration to any database that uses the summit beast_stats schema.

ALTER TABLE beast_stats
  ALTER COLUMN captured_summit TYPE boolean USING (captured_summit > 0),
  ALTER COLUMN used_revival_potion TYPE boolean USING (used_revival_potion > 0),
  ALTER COLUMN used_attack_potion TYPE boolean USING (used_attack_potion > 0),
  ALTER COLUMN max_attack_streak TYPE boolean USING (max_attack_streak > 0),
  ALTER COLUMN specials TYPE boolean USING (specials > 0),
  ALTER COLUMN wisdom TYPE boolean USING (wisdom > 0),
  ALTER COLUMN diplomacy TYPE boolean USING (diplomacy > 0);

DROP INDEX IF EXISTS beast_stats_diplomacy_token_idx;
CREATE INDEX beast_stats_diplomacy_token_idx ON beast_stats (token_id) WHERE diplomacy;
