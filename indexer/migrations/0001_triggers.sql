-- Migration: Add NOTIFY triggers for real-time client updates

-- Channel: summit_update
-- Triggered when beast_stats is updated/inserted with current_health > 0
-- This indicates a beast is currently holding the summit

CREATE OR REPLACE FUNCTION notify_summit_update()
RETURNS TRIGGER AS $$
DECLARE
  beast_data RECORD;
BEGIN
  -- Only notify if beast has health (is on summit)
  IF NEW.current_health > 0 THEN
    -- Fetch beast and owner data in single query
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
        'captured_summit', NEW.captured_summit > 0,
        'used_revival_potion', NEW.used_revival_potion > 0,
        'used_attack_potion', NEW.used_attack_potion > 0,
        'max_attack_streak', NEW.max_attack_streak > 0,
        'summit_held_seconds', NEW.summit_held_seconds,
        'spirit', NEW.spirit,
        'luck', NEW.luck,
        'specials', NEW.specials > 0,
        'wisdom', NEW.wisdom > 0,
        'diplomacy', NEW.diplomacy > 0,
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

-- Channel: summit_log_insert
-- Triggered on every summit_log insert for activity feed updates

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
