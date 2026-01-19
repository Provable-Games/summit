-- ===========================================
-- Summit API pg_notify Triggers
-- ===========================================
-- These triggers broadcast real-time updates to the API server
-- via PostgreSQL LISTEN/NOTIFY for WebSocket subscriptions.
--
-- Channels:
-- - beast_update: Beast stat changes
-- - beast_upgrade: Beast skill upgrades (spirit, luck, specials, wisdom, diplomacy)
-- - battle: Combat events
-- - summit: Summit takeover events
-- - poison: Poison attack events
-- - reward: Reward distribution events
-- ===========================================

-- ===========================================
-- Beast Update Notifications (INSERT/UPDATE on beast_stats)
-- ===========================================
CREATE OR REPLACE FUNCTION notify_beast_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('beast_update', json_build_object(
    'token_id', NEW.token_id,
    'current_health', NEW.current_health,
    'bonus_health', NEW.bonus_health,
    'bonus_xp', NEW.bonus_xp,
    'attack_streak', NEW.attack_streak,
    'last_death_timestamp', NEW.last_death_timestamp::text,
    'revival_count', NEW.revival_count,
    'extra_lives', NEW.extra_lives,
    'has_claimed_potions', NEW.has_claimed_potions,
    'blocks_held', NEW.blocks_held,
    'spirit', NEW.spirit,
    'luck', NEW.luck,
    'specials', NEW.specials,
    'wisdom', NEW.wisdom,
    'diplomacy', NEW.diplomacy,
    'rewards_earned', NEW.rewards_earned,
    'rewards_claimed', NEW.rewards_claimed,
    'block_number', NEW.block_number::text,
    'transaction_hash', NEW.transaction_hash,
    'created_at', NEW.created_at,
    'indexed_at', NEW.indexed_at,
    'inserted_at', NEW.inserted_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS beast_stats_notify ON beast_stats;
CREATE TRIGGER beast_stats_notify
  AFTER INSERT OR UPDATE ON beast_stats
  FOR EACH ROW
  EXECUTE FUNCTION notify_beast_update();

-- ===========================================
-- Beast Upgrade Notifications (UPDATE on beast_stats skill columns)
-- ===========================================
CREATE OR REPLACE FUNCTION notify_beast_upgrade() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('beast_upgrade', json_build_object(
    'token_id', NEW.token_id,
    'spirit', NEW.spirit - OLD.spirit,
    'luck', NEW.luck - OLD.luck,
    'specials', NEW.specials - OLD.specials,
    'wisdom', NEW.wisdom - OLD.wisdom,
    'diplomacy', NEW.diplomacy - OLD.diplomacy,
    'block_number', NEW.block_number::text,
    'transaction_hash', NEW.transaction_hash
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS beast_upgrade_notify ON beast_stats;
CREATE TRIGGER beast_upgrade_notify
  AFTER UPDATE OF spirit, luck, specials, wisdom, diplomacy ON beast_stats
  FOR EACH ROW
  EXECUTE FUNCTION notify_beast_upgrade();

-- ===========================================
-- Battle Notifications (INSERT on battles)
-- ===========================================
CREATE OR REPLACE FUNCTION notify_battle() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('battle', json_build_object(
    'attacking_beast_token_id', NEW.attacking_beast_token_id,
    'attack_index', NEW.attack_index,
    'defending_beast_token_id', NEW.defending_beast_token_id,
    'attack_count', NEW.attack_count,
    'attack_damage', NEW.attack_damage,
    'critical_attack_count', NEW.critical_attack_count,
    'critical_attack_damage', NEW.critical_attack_damage,
    'counter_attack_count', NEW.counter_attack_count,
    'counter_attack_damage', NEW.counter_attack_damage,
    'critical_counter_attack_count', NEW.critical_counter_attack_count,
    'critical_counter_attack_damage', NEW.critical_counter_attack_damage,
    'attack_potions', NEW.attack_potions,
    'xp_gained', NEW.xp_gained,
    -- 'block_number', NEW.block_number::text,
    -- 'transaction_hash', NEW.transaction_hash,
    -- 'created_at', NEW.created_at,
    -- 'indexed_at', NEW.indexed_at,
    -- 'inserted_at', NEW.inserted_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS battles_notify ON battles;
CREATE TRIGGER battles_notify
  AFTER INSERT ON battles
  FOR EACH ROW
  EXECUTE FUNCTION notify_battle();

-- ===========================================
-- Summit Notifications (INSERT on summit_history)
-- ===========================================
CREATE OR REPLACE FUNCTION notify_summit() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('summit', json_build_object(
    'beast_token_id', NEW.beast_token_id,
    'beast_id', NEW.beast_id,
    'beast_prefix', NEW.beast_prefix,
    'beast_suffix', NEW.beast_suffix,
    'beast_level', NEW.beast_level,
    'beast_health', NEW.beast_health,
    'beast_shiny', NEW.beast_shiny,
    'beast_animated', NEW.beast_animated,
    'current_health', NEW.current_health,
    'bonus_health', NEW.bonus_health,
    'blocks_held', NEW.blocks_held,
    'owner', NEW.owner,
    -- 'block_number', NEW.block_number::text,
    -- 'transaction_hash', NEW.transaction_hash,
    -- 'created_at', NEW.created_at,
    -- 'indexed_at', NEW.indexed_at,
    -- 'inserted_at', NEW.inserted_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS summit_history_notify ON summit_history;
CREATE TRIGGER summit_history_notify
  AFTER INSERT ON summit_history
  FOR EACH ROW
  EXECUTE FUNCTION notify_summit();

-- ===========================================
-- Poison Notifications (INSERT on poison_events)
-- ===========================================
CREATE OR REPLACE FUNCTION notify_poison() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('poison', json_build_object(
    'beast_token_id', NEW.beast_token_id,
    'block_timestamp', NEW.block_timestamp::text,
    'count', NEW.count,
    'player', NEW.player,
    'block_number', NEW.block_number::text,
    'transaction_hash', NEW.transaction_hash,
    'created_at', NEW.created_at,
    'indexed_at', NEW.indexed_at,
    'inserted_at', NEW.inserted_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS poison_events_notify ON poison_events;
CREATE TRIGGER poison_events_notify
  AFTER INSERT ON poison_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_poison();

-- ===========================================
-- Reward Notifications (INSERT on rewards)
-- ===========================================
CREATE OR REPLACE FUNCTION notify_reward() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('reward', json_build_object(
    'reward_block_number', NEW.reward_block_number::text,
    'beast_token_id', NEW.beast_token_id,
    'owner', NEW.owner,
    'amount', NEW.amount,
    'block_number', NEW.block_number::text,
    'transaction_hash', NEW.transaction_hash,
    'created_at', NEW.created_at,
    'indexed_at', NEW.indexed_at,
    'inserted_at', NEW.inserted_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rewards_notify ON rewards;
CREATE TRIGGER rewards_notify
  AFTER INSERT ON rewards
  FOR EACH ROW
  EXECUTE FUNCTION notify_reward();
