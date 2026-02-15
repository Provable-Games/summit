-- Migration: Backfill beast_stats flag columns to boolean + refresh realtime triggers.
--
-- Context:
-- Existing environments may already have integer-backed flag columns from older schema
-- revisions. This migration converges those environments to the current boolean schema
-- without editing baseline migrations.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beast_stats'
      AND column_name = 'captured_summit'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE 'ALTER TABLE "beast_stats" ALTER COLUMN "captured_summit" TYPE boolean USING ("captured_summit" > 0)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beast_stats'
      AND column_name = 'used_revival_potion'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE 'ALTER TABLE "beast_stats" ALTER COLUMN "used_revival_potion" TYPE boolean USING ("used_revival_potion" > 0)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beast_stats'
      AND column_name = 'used_attack_potion'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE 'ALTER TABLE "beast_stats" ALTER COLUMN "used_attack_potion" TYPE boolean USING ("used_attack_potion" > 0)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beast_stats'
      AND column_name = 'max_attack_streak'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE 'ALTER TABLE "beast_stats" ALTER COLUMN "max_attack_streak" TYPE boolean USING ("max_attack_streak" > 0)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beast_stats'
      AND column_name = 'specials'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE 'ALTER TABLE "beast_stats" ALTER COLUMN "specials" TYPE boolean USING ("specials" > 0)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beast_stats'
      AND column_name = 'wisdom'
      AND data_type <> 'boolean'
  ) THEN
    EXECUTE 'ALTER TABLE "beast_stats" ALTER COLUMN "wisdom" TYPE boolean USING ("wisdom" > 0)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beast_stats'
      AND column_name = 'diplomacy'
      AND data_type <> 'boolean'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'beast_stats'
        AND indexname = 'beast_stats_diplomacy_token_idx'
    ) THEN
      EXECUTE 'DROP INDEX IF EXISTS "beast_stats_diplomacy_token_idx"';
    END IF;

    EXECUTE 'ALTER TABLE "beast_stats" ALTER COLUMN "diplomacy" TYPE boolean USING ("diplomacy" > 0)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS "beast_stats_diplomacy_token_idx" ON "beast_stats" USING btree ("token_id") WHERE "diplomacy"';
  END IF;
END
$$;

-- Refresh NOTIFY trigger function for summit updates.
CREATE OR REPLACE FUNCTION notify_summit_update()
RETURNS TRIGGER AS $$
DECLARE
  beast_data RECORD;
BEGIN
  IF NEW.current_health > 0 THEN
    SELECT b.beast_id, b.prefix, b.suffix, b.level, b.health, b.shiny, b.animated, bo.owner
    INTO beast_data
    FROM beasts b
    LEFT JOIN beast_owners bo ON bo.token_id = b.token_id
    WHERE b.token_id = NEW.token_id;

    PERFORM pg_notify(
      'summit_update',
      json_build_object(
        'token_id', NEW.token_id,
        'current_health', NEW.current_health,
        'bonus_health', NEW.bonus_health,
        'bonus_xp', NEW.bonus_xp,
        'attack_streak', NEW.attack_streak,
        'last_death_timestamp', NEW.last_death_timestamp,
        'revival_count', NEW.revival_count,
        'extra_lives', NEW.extra_lives,
        'captured_summit', NEW.captured_summit,
        'used_revival_potion', NEW.used_revival_potion,
        'used_attack_potion', NEW.used_attack_potion,
        'max_attack_streak', NEW.max_attack_streak,
        'summit_held_seconds', NEW.summit_held_seconds,
        'spirit', NEW.spirit,
        'luck', NEW.luck,
        'specials', NEW.specials,
        'wisdom', NEW.wisdom,
        'diplomacy', NEW.diplomacy,
        'rewards_earned', NEW.rewards_earned,
        'rewards_claimed', NEW.rewards_claimed,
        'block_number', NEW.block_number,
        'transaction_hash', NEW.transaction_hash,
        'beast_id', beast_data.beast_id,
        'prefix', beast_data.prefix,
        'suffix', beast_data.suffix,
        'level', beast_data.level,
        'health', beast_data.health,
        'shiny', beast_data.shiny,
        'animated', beast_data.animated,
        'owner', beast_data.owner
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS beast_stats_summit_update_trigger ON beast_stats;
CREATE TRIGGER beast_stats_summit_update_trigger
  AFTER INSERT OR UPDATE ON beast_stats
  FOR EACH ROW
  EXECUTE FUNCTION notify_summit_update();

-- Refresh NOTIFY trigger function for summit log inserts.
CREATE OR REPLACE FUNCTION notify_summit_log_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'summit_log_insert',
    json_build_object(
      'id', NEW.id,
      'block_number', NEW.block_number,
      'event_index', NEW.event_index,
      'category', NEW.category,
      'sub_category', NEW.sub_category,
      'data', NEW.data,
      'player', NEW.player,
      'token_id', NEW.token_id,
      'transaction_hash', NEW.transaction_hash,
      'created_at', NEW.created_at,
      'indexed_at', NEW.indexed_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS summit_log_insert_trigger ON summit_log;
CREATE TRIGGER summit_log_insert_trigger
  AFTER INSERT ON summit_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_summit_log_insert();
