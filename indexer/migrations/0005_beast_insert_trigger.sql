-- Migration: Add NOTIFY trigger for new beast mints

-- Channel: beast_insert
-- Triggered AFTER INSERT on beasts (i.e. when a new beast NFT is observed
-- for the first time). Owner is intentionally not included; clients that
-- need it should fetch via GET /beasts/:owner.

CREATE OR REPLACE FUNCTION notify_beast_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'beast_insert',
    json_build_object(
      'token_id', NEW.token_id,
      'beast_id', NEW.beast_id,
      'prefix', NEW.prefix,
      'suffix', NEW.suffix,
      'level', NEW.level,
      'health', NEW.health,
      'shiny', NEW.shiny,
      'animated', NEW.animated,
      'created_at', NEW.created_at,
      'indexed_at', NEW.indexed_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS beast_owners_insert_trigger ON beast_owners;
DROP TRIGGER IF EXISTS beasts_insert_trigger ON beasts;
CREATE TRIGGER beasts_insert_trigger
  AFTER INSERT ON beasts
  FOR EACH ROW
  EXECUTE FUNCTION notify_beast_insert();
