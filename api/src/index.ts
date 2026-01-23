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
import { beasts, beastOwners, beastData, beastStats, summitLog } from "./db/schema.js";
import { getSubscriptionHub } from "./ws/subscriptions.js";

const isDevelopment = process.env.NODE_ENV !== "production";

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
 * GET /beasts/:owner - Get all beasts for an owner with stats and data joined
 */
app.get("/beasts/:owner", async (c) => {
  const owner = c.req.param("owner");

  const results = await db
    .select({
      // Beast NFT metadata
      tokenId: beasts.tokenId,
      beastId: beasts.beastId,
      prefix: beasts.prefix,
      suffix: beasts.suffix,
      level: beasts.level,
      health: beasts.health,
      shiny: beasts.shiny,
      animated: beasts.animated,
      // Beast data (Loot Survivor stats)
      adventurersKilled: beastData.adventurersKilled,
      lastDeathTimestamp: beastData.lastDeathTimestamp,
      // Beast stats (Summit game state)
      currentHealth: beastStats.currentHealth,
      bonusHealth: beastStats.bonusHealth,
      bonusXp: beastStats.bonusXp,
      attackStreak: beastStats.attackStreak,
      revivalCount: beastStats.revivalCount,
      extraLives: beastStats.extraLives,
      hasClaimedPotions: beastStats.hasClaimedPotions,
      blocksHeld: beastStats.blocksHeld,
      spirit: beastStats.spirit,
      luck: beastStats.luck,
      specials: beastStats.specials,
      wisdom: beastStats.wisdom,
      diplomacy: beastStats.diplomacy,
      rewardsEarned: beastStats.rewardsEarned,
      rewardsClaimed: beastStats.rewardsClaimed,
    })
    .from(beastOwners)
    .innerJoin(beasts, eq(beasts.tokenId, beastOwners.tokenId))
    .leftJoin(beastData, eq(beastData.tokenId, beastOwners.tokenId))
    .leftJoin(beastStats, eq(beastStats.tokenId, beastOwners.tokenId))
    .where(eq(beastOwners.owner, owner));

  return c.json(
    results.map((r) => ({
      tokenId: r.tokenId,
      beastId: r.beastId,
      prefix: r.prefix,
      suffix: r.suffix,
      level: r.level,
      health: r.health,
      shiny: r.shiny,
      animated: r.animated,
      adventurersKilled: r.adventurersKilled?.toString() ?? "0",
      lastDeathTimestamp: r.lastDeathTimestamp?.toString() ?? "0",
      currentHealth: r.currentHealth ?? 0,
      bonusHealth: r.bonusHealth ?? 0,
      bonusXp: r.bonusXp ?? 0,
      attackStreak: r.attackStreak ?? 0,
      revivalCount: r.revivalCount ?? 0,
      extraLives: r.extraLives ?? 0,
      hasClaimedPotions: r.hasClaimedPotions ?? 0,
      blocksHeld: r.blocksHeld ?? 0,
      spirit: r.spirit ?? 0,
      luck: r.luck ?? 0,
      specials: r.specials ?? 0,
      wisdom: r.wisdom ?? 0,
      diplomacy: r.diplomacy ?? 0,
      rewardsEarned: r.rewardsEarned ?? 0,
      rewardsClaimed: r.rewardsClaimed ?? 0,
    }))
  );
});

/**
 * GET /logs - Get paginated summit_log with optional filters
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - category: Filter by category (optional)
 * - subCategory: Filter by sub_category (optional)
 * - player: Filter by player address (optional)
 */
app.get("/logs", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const category = c.req.query("category");
  const subCategory = c.req.query("subCategory");
  const player = c.req.query("player");

  // Build where conditions
  const conditions = [];
  if (category) conditions.push(eq(summitLog.category, category));
  if (subCategory) conditions.push(eq(summitLog.subCategory, subCategory));
  if (player) conditions.push(eq(summitLog.player, player));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get results
  const results = await db
    .select()
    .from(summitLog)
    .where(whereClause)
    .orderBy(desc(summitLog.blockNumber), desc(summitLog.eventIndex))
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(summitLog)
    .where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map((r) => ({
      id: r.id,
      blockNumber: r.blockNumber.toString(),
      eventIndex: r.eventIndex,
      category: r.category,
      subCategory: r.subCategory,
      data: JSON.parse(r.data),
      player: r.player,
      tokenId: r.tokenId,
      transactionHash: r.transactionHash,
      createdAt: r.createdAt.toISOString(),
    })),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

// Debug endpoints - only available in development
if (isDevelopment) {
  app.post("/debug/test-summit-update", async (c) => {
    const client = await pool.connect();
    try {
      const body = await c.req.json().catch(() => ({}));
      const tokenId = body.token_id || 1;

      const testPayload = JSON.stringify({
        token_id: tokenId,
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
        data: body.data || { attackingBeastTokenId: 1, defendingBeastTokenId: 2 },
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
      byOwner: "GET /beasts/:owner",
    },
    websocket: {
      endpoint: "WS /ws",
      channels: ["summit_update", "summit_log"],
      subscribe: '{"type":"subscribe","channels":["summit_update","summit_log"]}',
    },
  };

  if (isDevelopment) {
    endpoints.debug = {
      testSummitUpdate: "POST /debug/test-summit-update",
      testSummitLog: "POST /debug/test-summit-log",
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
