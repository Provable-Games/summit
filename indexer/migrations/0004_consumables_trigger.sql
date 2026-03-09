-- Migration: Add NOTIFY trigger for real-time consumables balance updates
--
-- Channel: consumables_update
-- Triggered when consumables row is inserted or updated
-- Publishes owner address and all four potion counts

CREATE OR REPLACE FUNCTION notify_consumables_update()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consumables_update_trigger ON consumables;
CREATE TRIGGER consumables_update_trigger
  AFTER INSERT OR UPDATE ON consumables
  FOR EACH ROW
  EXECUTE FUNCTION notify_consumables_update();
