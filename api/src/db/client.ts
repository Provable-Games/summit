/**
 * Database client for the Summit API server
 * Uses the same schema as the indexer
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("[DB CONFIG] DATABASE_URL is required");
}

const databaseSsl = process.env.DATABASE_SSL;
if (typeof databaseSsl !== "undefined" && databaseSsl !== "true" && databaseSsl !== "false") {
  throw new Error('[DB CONFIG] DATABASE_SSL must be "true" or "false" when provided');
}

if (process.env.NODE_ENV === "production" && typeof databaseSsl === "undefined") {
  console.warn('[DB CONFIG] DATABASE_SSL not set in production, defaulting to SSL enabled');
}

// Create a connection pool for queries
// Pool size is configurable via DB_POOL_MAX (default: 15)
const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: parseInt(process.env.DB_POOL_MAX || "15", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: databaseSsl === "true" || (process.env.NODE_ENV === "production" && typeof databaseSsl === "undefined")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Handle pool errors to prevent crashes from unexpected disconnections
// pg-pool will automatically replace dead clients, so we just log here
pool.on("error", (err) => {
  console.error("[PG POOL ERROR]", err.message);
});

// Create Drizzle ORM instance
export const db = drizzle(pool);

// Export pool for raw queries and LISTEN/NOTIFY
export { pool };

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    console.error("[DB HEALTH CHECK] Failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
