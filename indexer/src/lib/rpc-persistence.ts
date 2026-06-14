import { eq, sql } from "drizzle-orm";
import type { EventCursor, NormalizedReorg } from "@apibara/starknet-rpc";
import * as schema from "./schema.js";
import type { BulkInsertBatches } from "./summit-processor.js";

export const RPC_CURSOR_ID = "summit-rpc";
const MAX_CURSOR_TRANSACTION_HASH = `0x${"f".repeat(64)}`;
const MAX_CURSOR_EVENT_INDEX = 2_147_483_647;

export const CHAIN_DERIVED_APPEND_TABLES = [
  "battles",
  "rewards_earned",
  "rewards_claimed",
  "poison_events",
  "corpse_events",
  "corpse_new_events",
  "summit_log",
] as const;

export const STATE_SNAPSHOT_TABLES = [
  { tableName: "beast_stats", keyColumn: "token_id" },
  { tableName: "beast_owners", keyColumn: "token_id" },
  { tableName: "beasts", keyColumn: "token_id" },
  { tableName: "beast_data", keyColumn: "entity_hash" },
  { tableName: "skulls_claimed", keyColumn: "beast_token_id" },
  { tableName: "quest_rewards_claimed", keyColumn: "beast_token_id" },
  { tableName: "consumables", keyColumn: "owner" },
] as const;

export const ROLLBACK_EXCLUDED_TABLES = ["cartridge_names"] as const;

export interface ReorgRollbackPlan {
  fromBlock: number;
  appendTables: readonly string[];
  stateTables: readonly string[];
  excludedTables: readonly string[];
}

export function getReorgRollbackPlan(fromBlock: number): ReorgRollbackPlan {
  return {
    fromBlock,
    appendTables: CHAIN_DERIVED_APPEND_TABLES,
    stateTables: STATE_SNAPSHOT_TABLES.map(table => table.tableName),
    excludedTables: ROLLBACK_EXCLUDED_TABLES,
  };
}

export async function loadRpcCursor(db: any): Promise<EventCursor | undefined> {
  const rows = await db
    .select({
      block_number: schema.indexer_cursor.block_number,
      transaction_hash: schema.indexer_cursor.transaction_hash,
      event_index: schema.indexer_cursor.event_index,
    })
    .from(schema.indexer_cursor)
    .where(eq(schema.indexer_cursor.id, RPC_CURSOR_ID))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  return {
    blockNumber: row.block_number,
    transactionHash: row.transaction_hash,
    eventIndex: row.event_index,
  };
}

export async function saveRpcCursor(db: any, cursor: EventCursor): Promise<void> {
  await db
    .insert(schema.indexer_cursor)
    .values({
      id: RPC_CURSOR_ID,
      block_number: cursor.blockNumber,
      transaction_hash: cursor.transactionHash,
      event_index: cursor.eventIndex,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.indexer_cursor.id,
      set: {
        block_number: sql`excluded.block_number`,
        transaction_hash: sql`excluded.transaction_hash`,
        event_index: sql`excluded.event_index`,
        updated_at: sql`excluded.updated_at`,
      },
    });
}

export async function persistStateSnapshots(
  db: any,
  batches: BulkInsertBatches,
  cursor: EventCursor,
): Promise<void> {
  const snapshotBlockNumber = BigInt(cursor.blockNumber);
  const snapshotCursor = {
    blockNumber: snapshotBlockNumber,
    transactionHash: cursor.transactionHash,
    eventIndex: cursor.eventIndex,
  };

  await snapshotTable(db, STATE_SNAPSHOT_TABLES[0], uniqueKeys(batches.beast_stats.map(row => row.token_id)), snapshotCursor);
  await snapshotTable(db, STATE_SNAPSHOT_TABLES[1], uniqueKeys(batches.beast_owners.map(row => row.token_id)), snapshotCursor);
  await snapshotTable(db, STATE_SNAPSHOT_TABLES[2], uniqueKeys(batches.beasts.map(row => row.token_id)), snapshotCursor);
  await snapshotTable(db, STATE_SNAPSHOT_TABLES[3], uniqueKeys(batches.beast_data.map(row => row.entity_hash)), snapshotCursor);
  await snapshotTable(db, STATE_SNAPSHOT_TABLES[4], uniqueKeys(batches.skulls_claimed.map(row => row.beast_token_id)), snapshotCursor);
  await snapshotTable(db, STATE_SNAPSHOT_TABLES[5], uniqueKeys(batches.quest_rewards_claimed.map(row => row.beast_token_id)), snapshotCursor);
  await snapshotTable(db, STATE_SNAPSHOT_TABLES[6], uniqueKeys(batches.consumables.map(row => row.owner)), snapshotCursor);
}

export async function rollbackFromReorg(db: any, reorg: NormalizedReorg): Promise<ReorgRollbackPlan> {
  const plan = getReorgRollbackPlan(reorg.startingBlockNumber);
  const startingBlock = BigInt(reorg.startingBlockNumber);

  await db.transaction(async (tx: any) => {
    await tx.execute(sql`DELETE FROM ${sql.raw("battles")} WHERE block_number >= ${startingBlock}`);
    await tx.execute(sql`DELETE FROM ${sql.raw("rewards_earned")} WHERE block_number >= ${startingBlock}`);
    await tx.execute(sql`DELETE FROM ${sql.raw("rewards_claimed")} WHERE block_number >= ${startingBlock}`);
    await tx.execute(sql`DELETE FROM ${sql.raw("poison_events")} WHERE block_number >= ${startingBlock}`);
    await tx.execute(sql`DELETE FROM ${sql.raw("corpse_events")} WHERE block_number >= ${startingBlock}`);
    await tx.execute(sql`DELETE FROM ${sql.raw("corpse_new_events")} WHERE block_number >= ${startingBlock}`);
    await tx.execute(sql`DELETE FROM ${sql.raw("summit_log")} WHERE block_number >= ${startingBlock}`);

    for (const table of STATE_SNAPSHOT_TABLES) {
      await restoreStateTable(tx, table, startingBlock);
    }

    await tx.execute(sql`DELETE FROM indexer_state_snapshots WHERE block_number >= ${startingBlock}`);

    if (reorg.startingBlockNumber === 0) {
      await tx.delete(schema.indexer_cursor).where(eq(schema.indexer_cursor.id, RPC_CURSOR_ID));
    } else {
      await saveRpcCursor(tx, {
        blockNumber: reorg.startingBlockNumber - 1,
        transactionHash: MAX_CURSOR_TRANSACTION_HASH,
        eventIndex: MAX_CURSOR_EVENT_INDEX,
      });
    }
  });

  return plan;
}

async function snapshotTable(
  db: any,
  table: (typeof STATE_SNAPSHOT_TABLES)[number],
  keys: string[],
  cursor: { blockNumber: bigint; transactionHash: string; eventIndex: number },
): Promise<void> {
  if (keys.length === 0) return;

  await db.execute(sql`
    WITH snapshot_keys(row_key) AS (
      VALUES ${sql.join(keys.map(key => sql`(${key})`), sql`, `)}
    )
    INSERT INTO indexer_state_snapshots (
      block_number,
      transaction_hash,
      event_index,
      table_name,
      row_key,
      previous_row
    )
    SELECT
      ${cursor.blockNumber},
      ${cursor.transactionHash},
      ${cursor.eventIndex},
      ${table.tableName},
      snapshot_keys.row_key,
      to_jsonb(existing)
    FROM snapshot_keys
    LEFT JOIN ${sql.raw(table.tableName)} AS existing
      ON (${sql.raw(`existing.${table.keyColumn}`)})::text = snapshot_keys.row_key
    ON CONFLICT DO NOTHING
  `);
}

async function restoreStateTable(
  db: any,
  table: (typeof STATE_SNAPSHOT_TABLES)[number],
  startingBlock: bigint,
): Promise<void> {
  await db.execute(sql`
    WITH snapshots AS (
      SELECT DISTINCT ON (row_key)
        row_key,
        previous_row
      FROM indexer_state_snapshots
      WHERE table_name = ${table.tableName}
        AND block_number >= ${startingBlock}
      ORDER BY row_key, block_number ASC, transaction_hash ASC, event_index ASC
    ),
    deleted AS (
      DELETE FROM ${sql.raw(table.tableName)} AS target
      USING snapshots
      WHERE (${sql.raw(`target.${table.keyColumn}`)})::text = snapshots.row_key
      RETURNING 1
    )
    INSERT INTO ${sql.raw(table.tableName)}
    SELECT *
    FROM jsonb_populate_recordset(
      NULL::${sql.raw(table.tableName)},
      COALESCE(
        (SELECT jsonb_agg(previous_row) FROM snapshots WHERE previous_row IS NOT NULL),
        '[]'::jsonb
      )
    )
  `);
}

function uniqueKeys(values: Array<string | number>): string[] {
  return [...new Set(values.map(value => String(value)))];
}
