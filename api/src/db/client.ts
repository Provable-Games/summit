/**
 * Database client for the Summit API server
 * Uses the same schema as the indexer
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// Create a connection pool for queries
// Pool size is configurable via DB_POOL_MAX (default: 15)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || "15", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Render PostgreSQL requires SSL for external connections
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined,
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
  } catch {
    return false;
  }
}
