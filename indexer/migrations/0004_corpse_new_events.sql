-- Migration: Create corpse_new_events table for the new corpse contract.
--
-- The new corpse contract emits adventurer_ids as felt252 (up to 251 bits).
-- The legacy corpse_events table uses bigint, which is too narrow, and contains
-- frozen history from the deprecated contract. Rather than migrate the existing
-- table destructively, we add a new sibling table and route new-contract events
-- there. The old table is preserved untouched for historical reads.

CREATE TABLE IF NOT EXISTS corpse_new_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    adventurer_id numeric(78, 0) NOT NULL,
    player text NOT NULL,
    created_at timestamp NOT NULL,
    indexed_at timestamp NOT NULL,
    inserted_at timestamp DEFAULT now(),
    block_number bigint NOT NULL,
    transaction_hash text NOT NULL,
    event_index integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS corpse_new_events_block_tx_event_adv_idx
    ON corpse_new_events (block_number, transaction_hash, event_index, adventurer_id);

CREATE INDEX IF NOT EXISTS corpse_new_events_adventurer_id_idx
    ON corpse_new_events (adventurer_id);

CREATE INDEX IF NOT EXISTS corpse_new_events_player_idx
    ON corpse_new_events (player);

CREATE INDEX IF NOT EXISTS corpse_new_events_created_at_idx
    ON corpse_new_events (created_at DESC);
