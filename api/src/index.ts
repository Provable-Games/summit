/**
 * Summit API Server
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { v4 as uuidv4 } from "uuid";
import { eq, sql, desc, and } from "drizzle-orm";
import "dotenv/config";

import { checkDatabaseHealth, db, pool } from "./db/client.js";
import { beasts, beast_owners, beast_data, beast_stats, summit_log, skulls_claimed } from "./db/schema.js";
import { getSubscriptionHub } from "./ws/subscriptions.js";
import {
  BEAST_NAMES,
  BEAST_TIERS,
  BEAST_TYPES,
  ITEM_NAME_PREFIXES,
  ITEM_NAME_SUFFIXES,
} from "./lib/beastData.js";

const isDevelopment = process.env.NODE_ENV !== "production";

// Helper functions for beast calculations
function getSpiritRevivalReductionSeconds(points: number): number {
  const p = Math.max(0, Math.floor(points));
  if (p <= 5) {
    switch (p) {
      case 0: return 0;
      case 1: return 7200;
      case 2: return 10080;
      case 3: return 12240;
      case 4: return 13680;
      case 5: return 14400;
    }
  } else if (p <= 70) {
    return 14400 + (p - 5) * 720;
  }
  return 61200 + (p - 70) * 360;
}

function getBeastRevivalTime(spirit: number): number {
  const revivalTime = 86400000; // 24 hours in ms
  if (spirit > 0) {
    return revivalTime - getSpiritRevivalReductionSeconds(spirit) * 1000;
  }
  return revivalTime;
}

function getBeastCurrentLevel(level: number, bonusXp: number): number {
  return Math.floor(Math.sqrt(bonusXp + Math.pow(level, 2)));
}

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/health", async (c) => {
  const dbHealthy = await checkDatabaseHealth();
  const wsStatus = getSubscriptionHub().getStatus();

  return c.json({
    status: dbHealthy ? "healthy" : "degraded",
    database: dbHealthy ? "connected" : "disconnected",
    websocket: wsStatus,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Normalize a Starknet address to match database format
 * - Lowercase
 * - Pad to 66 chars (0x + 64 hex chars)
 */
function normalizeAddress(address: string): string {
  const lower = address.toLowerCase();
  const withoutPrefix = lower.startsWith("0x") ? lower.slice(2) : lower;
  return "0x" + withoutPrefix.padStart(64, "0");
}

/**
 * GET /beasts/:owner - Get all beasts for an owner with stats and data joined
 * Returns data in Beast interface format compatible with getBeastCollection
 */
app.get("/beasts/:owner", async (c) => {
  const owner = normalizeAddress(c.req.param("owner"));

  // Get beast data with all joins including skulls
  const results = await db
    .select({
      // Beast NFT metadata
      token_id: beasts.token_id,
      beast_id: beasts.beast_id,
      prefix: beasts.prefix,
      suffix: beasts.suffix,
      level: beasts.level,
      health: beasts.health,
      shiny: beasts.shiny,
      animated: beasts.animated,
      // Beast data (Loot Survivor stats)
      adventurers_killed: beast_data.adventurers_killed,
      last_death_loot_survivor: beast_data.last_death_timestamp,
      last_killed_by: beast_data.last_killed_by,
      entity_hash: beast_data.entity_hash,
      // Beast stats (Summit game state)
      current_health: beast_stats.current_health,
      bonus_health: beast_stats.bonus_health,
      bonus_xp: beast_stats.bonus_xp,
      attack_streak: beast_stats.attack_streak,
      last_death_summit: beast_stats.last_death_timestamp,
      revival_count: beast_stats.revival_count,
      extra_lives: beast_stats.extra_lives,
      has_claimed_potions: beast_stats.has_claimed_potions,
      blocks_held: beast_stats.blocks_held,
      spirit: beast_stats.spirit,
      luck: beast_stats.luck,
      specials: beast_stats.specials,
      wisdom: beast_stats.wisdom,
      diplomacy: beast_stats.diplomacy,
      rewards_earned: beast_stats.rewards_earned,
      rewards_claimed: beast_stats.rewards_claimed,
      // Skulls claimed (one row per beast)
      skulls: skulls_claimed.skulls,
    })
    .from(beast_owners)
    .innerJoin(beasts, eq(beasts.token_id, beast_owners.token_id))
    .leftJoin(beast_data, eq(beast_data.token_id, beast_owners.token_id))
    .leftJoin(beast_stats, eq(beast_stats.token_id, beast_owners.token_id))
    .leftJoin(skulls_claimed, eq(skulls_claimed.beast_token_id, beast_owners.token_id))
    .where(eq(beast_owners.owner, owner));

  // Transform to Beast interface format
  return c.json(
    results.map((r) => {
      const beastId = r.beast_id;
      const prefixId = r.prefix;
      const suffixId = r.suffix;
      const tier = BEAST_TIERS[beastId] ?? 5;
      const spirit = r.spirit ?? 0;
      const bonusXp = r.bonus_xp ?? 0;
      const bonusHealth = r.bonus_health ?? 0;
      const currentLevel = getBeastCurrentLevel(r.level, bonusXp);
      const revivalTime = getBeastRevivalTime(spirit);
      const lastDeathTimestamp = Number(r.last_death_summit ?? 0n);

      // Compute current health based on revival logic
      let currentHealth = r.current_health ?? null;
      if (currentHealth === null || (lastDeathTimestamp === 0 && currentHealth === 0)) {
        currentHealth = r.health + bonusHealth;
      } else if (currentHealth === 0 && lastDeathTimestamp * 1000 + revivalTime < Date.now()) {
        currentHealth = r.health + bonusHealth;
      }

      return {
        // Identity
        id: beastId,
        token_id: r.token_id,
        name: BEAST_NAMES[beastId] ?? "Unknown",
        prefix: ITEM_NAME_PREFIXES[prefixId] ?? "",
        suffix: ITEM_NAME_SUFFIXES[suffixId] ?? "",

        // Type info
        tier,
        type: BEAST_TYPES[beastId] ?? "Unknown",
        power: (6 - tier) * currentLevel,

        // Base stats
        level: r.level,
        health: r.health,
        shiny: r.shiny,
        animated: r.animated,

        // Computed stats
        current_level: currentLevel,
        current_health: currentHealth,
        revival_time: revivalTime,

        // Summit game state
        bonus_health: bonusHealth,
        bonus_xp: bonusXp,
        attack_streak: r.attack_streak ?? 0,
        last_death_timestamp: lastDeathTimestamp,
        revival_count: r.revival_count ?? 0,
        extra_lives: r.extra_lives ?? 0,
        has_claimed_potions: Boolean(r.has_claimed_potions),
        blocks_held: r.blocks_held ?? 0,

        // Upgrades
        spirit,
        luck: r.luck ?? 0,
        specials: Boolean(r.specials),
        wisdom: Boolean(r.wisdom),
        diplomacy: Boolean(r.diplomacy),

        // Rewards
        rewards_earned: r.rewards_earned ?? 0,
        rewards_claimed: r.rewards_claimed ?? 0,
        kills_claimed: Number(r.skulls ?? 0n),

        // Loot Survivor data
        adventurers_killed: Number(r.adventurers_killed ?? 0n),
        last_dm_death_timestamp: Number(r.last_death_loot_survivor ?? 0n),
        last_killed_by: Number(r.last_killed_by ?? 0n),

        // Hash from beast_data (if linked)
        entity_hash: r.entity_hash ?? undefined,
      };
    })
  );
});

/**
 * GET /logs - Get paginated summit_log with optional filters
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - category: Filter by category (optional)
 * - sub_category: Filter by sub_category (optional)
 * - player: Filter by player address (optional)
 */
app.get("/logs", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const category = c.req.query("category");
  const sub_category = c.req.query("sub_category");
  const player = c.req.query("player");

  // Build where conditions
  const conditions = [];
  if (category) conditions.push(eq(summit_log.category, category));
  if (sub_category) conditions.push(eq(summit_log.sub_category, sub_category));
  if (player) conditions.push(eq(summit_log.player, player));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get results
  const results = await db
    .select()
    .from(summit_log)
    .where(whereClause)
    .orderBy(desc(summit_log.block_number), desc(summit_log.event_index))
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(summit_log)
    .where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map((r) => ({
      id: r.id,
      block_number: r.block_number.toString(),
      event_index: r.event_index,
      category: r.category,
      sub_category: r.sub_category,
      data: r.data,
      player: r.player,
      token_id: r.token_id,
      transaction_hash: r.transaction_hash,
      created_at: r.created_at.toISOString(),
    })),
    pagination: {
      limit,
      offset,
      total,
      has_more: offset + results.length < total,
    },
  });
});

// Debug endpoints - only available in development
if (isDevelopment) {
  app.post("/debug/test-summit-update", async (c) => {
    const client = await pool.connect();
    try {
      const body = await c.req.json().catch(() => ({}));
      const token_id = body.token_id || 1;

      const testPayload = JSON.stringify({
        token_id: token_id,
        current_health: 100,
        bonus_health: 50,
        bonus_xp: 10,
        attack_streak: 5,
        last_death_timestamp: "0",
        revival_count: 0,
        extra_lives: 0,
        has_claimed_potions: 0,
        blocks_held: 1000,
        spirit: 10,
        luck: 5,
        specials: 0,
        wisdom: 0,
        diplomacy: 0,
        rewards_earned: 100,
        rewards_claimed: 50,
        block_number: "123456",
        transaction_hash: "0x123",
        created_at: new Date().toISOString(),
        indexed_at: new Date().toISOString(),
      });

      await client.query(`SELECT pg_notify('summit_update', $1)`, [testPayload]);

      return c.json({
        success: true,
        message: "Test NOTIFY sent on 'summit_update' channel",
        payload: JSON.parse(testPayload),
      });
    } finally {
      client.release();
    }
  });

  app.post("/debug/test-summit-log", async (c) => {
    const client = await pool.connect();
    try {
      const body = await c.req.json().catch(() => ({}));

      const testPayload = JSON.stringify({
        id: "test-" + Date.now(),
        block_number: "123456",
        event_index: 0,
        category: body.category || "Battle",
        sub_category: body.sub_category || "BattleEvent",
        data: body.data || { attacking_beast_token_id: 1, defending_beast_token_id: 2 },
        player: body.player || "0x123",
        token_id: body.token_id || 1,
        transaction_hash: "0x456",
        created_at: new Date().toISOString(),
        indexed_at: new Date().toISOString(),
      });

      await client.query(`SELECT pg_notify('summit_log_insert', $1)`, [testPayload]);

      return c.json({
        success: true,
        message: "Test NOTIFY sent on 'summit_log_insert' channel",
        payload: JSON.parse(testPayload),
      });
    } finally {
      client.release();
    }
  });
}

// Root endpoint
app.get("/", (c) => {
  const endpoints: Record<string, unknown> = {
    health: "GET /health",
    beasts: {
      by_owner: "GET /beasts/:owner",
    },
    websocket: {
      endpoint: "WS /ws",
      channels: ["summit_update", "summit_log"],
      subscribe: '{"type":"subscribe","channels":["summit_update","summit_log"]}',
    },
  };

  if (isDevelopment) {
    endpoints.debug = {
      test_summit_update: "POST /debug/test-summit-update",
      test_summit_log: "POST /debug/test-summit-log",
    };
  }

  return c.json({
    name: "Summit API",
    version: "1.0.0",
    endpoints,
  });
});

// WebSocket
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
  "/ws",
  upgradeWebSocket(() => {
    const clientId = uuidv4();
    const hub = getSubscriptionHub();

    return {
      onOpen(_event, ws) {
        hub.addClient(clientId, ws.raw as unknown as Parameters<typeof hub.addClient>[1]);
        console.log(`[WebSocket] Client connected: ${clientId}`);
      },

      onMessage(event, _ws) {
        const message = typeof event.data === "string" ? event.data : event.data.toString();
        hub.handleMessage(clientId, message);
      },

      onClose() {
        hub.removeClient(clientId);
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
      },

      onError(error) {
        console.error(`[WebSocket] Error for client ${clientId}:`, error);
        hub.removeClient(clientId);
      },
    };
  })
);

// Start server
const port = parseInt(process.env.PORT || "3001", 10);

console.log(`Starting Summit API server on port ${port}...`);

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`[API] Server running at http://localhost:${info.port}`);
    console.log(`[API] WebSocket available at ws://localhost:${info.port}/ws`);
  }
);

injectWebSocket(server);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await getSubscriptionHub().shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down...");
  await getSubscriptionHub().shutdown();
  process.exit(0);
});

export default app;
