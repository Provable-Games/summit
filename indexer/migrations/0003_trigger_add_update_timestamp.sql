-- Migration: Add update_timestamp (Starknet block timestamp) to summit_update NOTIFY payload.
--
-- Context:
-- The notify_summit_update trigger broadcasts beast stats via pg_notify but does not
-- include the Starknet block timestamp (created_at column on beast_stats). Adding it as
-- update_timestamp makes it available to WebSocket clients for timing-dependent logic.

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
        'update_timestamp', extract(epoch from NEW.updated_at),
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
