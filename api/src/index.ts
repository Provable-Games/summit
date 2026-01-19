/**
 * Summit API Server
 * REST endpoints + WebSocket subscriptions for real-time game updates
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

import beastsRoute from "./routes/beasts.js";
import battlesRoute from "./routes/battles.js";
import summitRoute from "./routes/summit.js";
import rewardsRoute from "./routes/rewards.js";
import eventsRoute from "./routes/events.js";
import { checkDatabaseHealth, pool } from "./db/client.js";
import { getSubscriptionHub } from "./ws/subscriptions.js";

const isDevelopment = process.env.NODE_ENV !== "production";

const app = new Hono();

// Middleware
app.use("*", logger());

// CORS Configuration
const corsOrigins = process.env.CORS_ORIGIN?.split(",");
if (!corsOrigins && !isDevelopment) {
  console.warn(
    "[CORS] WARNING: CORS_ORIGIN not set in production. Using development fallback origins (localhost)."
  );
}

app.use(
  "*",
  cors({
    origin: corsOrigins || [
      "http://localhost:5173",
      "https://localhost:5173",
      "http://localhost:3000",
      "https://localhost:3000",
    ],
    credentials: true,
  })
);

// Health check endpoint
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

// Debug endpoints - only available in development
if (isDevelopment) {
  // Debug endpoint to send a test NOTIFY for beast_update
  app.post("/debug/test-beast-update", async (c) => {
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
        block_number: "0",
        transaction_hash: "0x0",
        created_at: new Date().toISOString(),
        indexed_at: new Date().toISOString(),
        inserted_at: new Date().toISOString(),
      });

      await client.query(`SELECT pg_notify('beast_update', $1)`, [testPayload]);

      return c.json({
        success: true,
        message: "Test NOTIFY sent on 'beast_update' channel",
        payload: JSON.parse(testPayload),
      });
    } finally {
      client.release();
    }
  });

  // Debug endpoint to send a test NOTIFY for battle
  app.post("/debug/test-battle", async (c) => {
    const client = await pool.connect();

    try {
      const testPayload = JSON.stringify({
        attacking_beast_token_id: 1,
        attack_index: 0,
        defending_beast_token_id: 2,
        attack_count: 3,
        attack_damage: 50,
        critical_attack_count: 1,
        critical_attack_damage: 25,
        counter_attack_count: 2,
        counter_attack_damage: 30,
        critical_counter_attack_count: 0,
        critical_counter_attack_damage: 0,
        attack_potions: 0,
        xp_gained: 10,
        block_number: "0",
        transaction_hash: "0x0",
        created_at: new Date().toISOString(),
        indexed_at: new Date().toISOString(),
        inserted_at: new Date().toISOString(),
      });

      await client.query(`SELECT pg_notify('battle', $1)`, [testPayload]);

      return c.json({
        success: true,
        message: "Test NOTIFY sent on 'battle' channel",
        payload: JSON.parse(testPayload),
      });
    } finally {
      client.release();
    }
  });

  // Debug endpoint to send a test NOTIFY for summit
  app.post("/debug/test-summit", async (c) => {
    const client = await pool.connect();

    try {
      const testPayload = JSON.stringify({
        beast_token_id: 1,
        beast_id: 5,
        beast_prefix: 1,
        beast_suffix: 2,
        beast_level: 10,
        beast_health: 100,
        beast_shiny: 0,
        beast_animated: 0,
        current_health: 95,
        bonus_health: 50,
        blocks_held: 500,
        owner: "0x123",
        block_number: "0",
        transaction_hash: "0x0",
        created_at: new Date().toISOString(),
        indexed_at: new Date().toISOString(),
        inserted_at: new Date().toISOString(),
      });

      await client.query(`SELECT pg_notify('summit', $1)`, [testPayload]);

      return c.json({
        success: true,
        message: "Test NOTIFY sent on 'summit' channel",
        payload: JSON.parse(testPayload),
      });
    } finally {
      client.release();
    }
  });
}

// Mount REST routes
app.route("/beasts", beastsRoute);
app.route("/battles", battlesRoute);
app.route("/summit", summitRoute);
app.route("/rewards", rewardsRoute);
app.route("/events", eventsRoute);

// Root endpoint
app.get("/", (c) => {
  const endpoints: Record<string, unknown> = {
    health: "GET /health",
    beasts: {
      list: "GET /beasts",
      leaderboard: "GET /beasts/leaderboard",
      get: "GET /beasts/:tokenId",
    },
    battles: {
      list: "GET /battles",
      byBeast: "GET /battles/beast/:tokenId",
    },
    summit: {
      current: "GET /summit/current",
      history: "GET /summit/history",
      byBeast: "GET /summit/beast/:tokenId",
      byOwner: "GET /summit/owner/:address",
    },
    rewards: {
      list: "GET /rewards",
      byPlayer: "GET /rewards/player/:address",
      byBeast: "GET /rewards/beast/:tokenId",
      claimed: "GET /rewards/claimed",
      claimedByPlayer: "GET /rewards/claimed/player/:address",
    },
    events: {
      poison: "GET /events/poison",
      poisonByBeast: "GET /events/poison/beast/:tokenId",
      poisonByPlayer: "GET /events/poison/player/:address",
      corpse: "GET /events/corpse",
      corpseByPlayer: "GET /events/corpse/player/:address",
      skull: "GET /events/skull",
      skullByBeast: "GET /events/skull/beast/:tokenId",
      skullLeaderboard: "GET /events/skull/leaderboard",
    },
    websocket: "WS /ws",
  };

  // Only include debug endpoints in development
  if (isDevelopment) {
    endpoints.debug = {
      testBeastUpdate: "POST /debug/test-beast-update",
      testBattle: "POST /debug/test-battle",
      testSummit: "POST /debug/test-summit",
    };
  }

  return c.json({
    name: "Summit API",
    version: "1.0.0",
    endpoints,
  });
});

// Create WebSocket upgrade handler
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket endpoint for real-time subscriptions
app.get(
  "/ws",
  upgradeWebSocket(() => {
    const clientId = uuidv4();
    const hub = getSubscriptionHub();

    return {
      onOpen(_event, ws) {
        hub.addClient(
          clientId,
          ws.raw as unknown as Parameters<typeof hub.addClient>[1]
        );
        console.log(`[WebSocket] Client connected: ${clientId}`);
      },

      onMessage(event, _ws) {
        const message =
          typeof event.data === "string" ? event.data : event.data.toString();
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

// Inject WebSocket handling
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
