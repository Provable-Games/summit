-- Cursor and state snapshots for the accepted-L2 Starknet RPC indexer path.

CREATE TABLE IF NOT EXISTS "indexer_cursor" (
  "id" text PRIMARY KEY NOT NULL,
  "block_number" integer NOT NULL,
  "transaction_hash" text NOT NULL,
  "event_index" integer NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "indexer_state_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "block_number" bigint NOT NULL,
  "transaction_hash" text NOT NULL,
  "event_index" integer NOT NULL,
  "table_name" text NOT NULL,
  "row_key" text NOT NULL,
  "previous_row" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "indexer_state_snapshots_unique_idx"
  ON "indexer_state_snapshots" (
    "table_name",
    "row_key",
    "block_number",
    "transaction_hash",
    "event_index"
  );

CREATE INDEX IF NOT EXISTS "indexer_state_snapshots_block_idx"
  ON "indexer_state_snapshots" ("block_number");

CREATE INDEX IF NOT EXISTS "indexer_state_snapshots_row_idx"
  ON "indexer_state_snapshots" ("table_name", "row_key");
