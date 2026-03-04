/**
 * Retention cleanup script for append-only history tables.
 *
 * Deletes rows older than 7 days from: summit_log, battles, corpse_events,
 * rewards_earned, poison_events, rewards_claimed, and airfoil.reorg_rollback.
 *
 * Usage:
 *   pnpm cleanup                  # 7-day retention (default)
 *   pnpm cleanup -- --days 14     # 14-day retention
 *
 * Can be run manually or scheduled via Railway cron service.
 */

import pg from "pg";

const RETENTION_DAYS = (() => {
  const idx = process.argv.indexOf("--days");
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 7;
})();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const TABLES = [
  "summit_log",
  "battles",
  "corpse_events",
  "rewards_earned",
  "poison_events",
  "rewards_claimed",
] as const;

const BATCH_SIZE = 5000;

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    statement_timeout: 120_000,
  });

  await client.connect();
  console.log(`Retention cleanup: deleting rows older than ${RETENTION_DAYS} days\n`);

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  let grandTotal = 0;

  for (const table of TABLES) {
    let total = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await client.query(
        `DELETE FROM ${table} WHERE ctid IN (SELECT ctid FROM ${table} WHERE created_at < $1 LIMIT $2)`,
        [cutoff, BATCH_SIZE]
      );
      total += result.rowCount ?? 0;
      if ((result.rowCount ?? 0) < BATCH_SIZE) break;
    }
    if (total > 0) console.log(`  ${table}: ${total} rows deleted`);
    grandTotal += total;
  }

  // Clean airfoil reorg_rollback
  const reorg = await client.query("DELETE FROM airfoil.reorg_rollback");
  const reorgCount = reorg.rowCount ?? 0;
  if (reorgCount > 0) console.log(`  airfoil.reorg_rollback: ${reorgCount} rows deleted`);
  grandTotal += reorgCount;

  // Run regular VACUUM (not FULL) to mark space as reusable without locking
  for (const table of TABLES) {
    await client.query(`VACUUM ${table}`);
  }
  await client.query("VACUUM airfoil.reorg_rollback");

  console.log(`\nTotal: ${grandTotal} rows deleted`);

  // Report current table sizes
  const sizes = await client.query(`
    SELECT t.relname AS table_name,
           pg_size_pretty(pg_total_relation_size(t.relid)) AS total_size,
           t.n_live_tup AS live_rows
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(t.relid) DESC
  `);
  console.log("\nCurrent table sizes:");
  console.table(sizes.rows);

  const dbSize = await client.query("SELECT pg_size_pretty(pg_database_size('railway')) AS size");
  console.log("Total DB size:", dbSize.rows[0].size);

  await client.end();
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
