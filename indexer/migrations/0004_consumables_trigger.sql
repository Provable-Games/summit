-- Migration: Add NOTIFY triggers for real-time consumables updates
--
-- Channel: consumables_update
-- Triggered when consumables row is inserted or updated
-- Publishes owner address and all four potion counts
--
-- Channel: consumables_supply
-- Triggered on same events, publishes aggregate player-held supply
-- per ERC20 token (keyed by token name for extensibility)

CREATE OR REPLACE FUNCTION notify_consumables_update()
RETURNS TRIGGER AS $$
DECLARE
  supply RECORD;
BEGIN
  -- Per-owner balance update
  PERFORM pg_notify(
    'consumables_update',
    json_build_object(
      'owner', NEW.owner,
      'xlife_count', NEW.xlife_count,
      'attack_count', NEW.attack_count,
      'revive_count', NEW.revive_count,
      'poison_count', NEW.poison_count
    )::text
  );

  -- Aggregate supply across all players (per ERC20 token)
  SELECT
    coalesce(sum(xlife_count), 0) AS xlife,
    coalesce(sum(attack_count), 0) AS attack,
    coalesce(sum(revive_count), 0) AS revive,
    coalesce(sum(poison_count), 0) AS poison
  INTO supply
  FROM consumables;

  PERFORM pg_notify(
    'consumables_supply',
    json_build_object(
      'EXTRA LIFE', supply.xlife,
      'ATTACK', supply.attack,
      'REVIVE', supply.revive,
      'POISON', supply.poison
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consumables_update_trigger ON consumables;
CREATE TRIGGER consumables_update_trigger
  AFTER INSERT OR UPDATE ON consumables
  FOR EACH ROW
  EXECUTE FUNCTION notify_consumables_update();
