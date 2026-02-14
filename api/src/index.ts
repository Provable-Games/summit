/**
 * Summit API Server
 */

import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { v4 as uuidv4 } from "uuid";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import "dotenv/config";

import { checkDatabaseHealth, db, pool } from "./db/client.js";
import {
  beasts,
  beast_owners,
  beast_data,
  beast_stats,
  summit_log,
  skulls_claimed,
  quest_rewards_claimed,
  rewards_earned,
  corpse_events,
} from "./db/schema.js";
import { getSubscriptionHub } from "./ws/subscriptions.js";
import {
  BEAST_NAMES,
  BEAST_TIERS,
  BEAST_TYPES,
  ITEM_NAME_PREFIXES,
  ITEM_NAME_SUFFIXES,
} from "./lib/beastData.js";
import { getSpiritRevivalReductionSeconds, getBeastRevivalTime, getBeastCurrentLevel, normalizeAddress } from "./lib/helpers.js";

const isDevelopment = process.env.NODE_ENV !== "production";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", compress());
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
 * GET /beasts/all - Get paginated list of all beasts with filtering
 *
 * Query params:
 * - limit: Number of results (default: 25, max: 100)
 * - offset: Pagination offset (default: 0)
 * - prefix: Filter by prefix ID (optional, indexed)
 * - suffix: Filter by suffix ID (optional, indexed)
 * - beast_id: Filter by beast type ID (optional, indexed)
 * - name: Filter by beast name search (optional, uses beast_id index)
 * - owner: Filter by owner address (optional, indexed)
 * - sort: Sort by "summit_held_seconds" or "level" (default: summit_held_seconds, both indexed)
 */
app.get("/beasts/all", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "25", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const prefix = c.req.query("prefix");
  const suffix = c.req.query("suffix");
  const beastId = c.req.query("beast_id");
  const name = c.req.query("name");
  const owner = c.req.query("owner");
  const sort = c.req.query("sort") || "summit_held_seconds";

  // Build where conditions (all filters use indexed columns)
  const conditions = [];
  if (prefix) conditions.push(eq(beasts.prefix, parseInt(prefix, 10)));
  if (suffix) conditions.push(eq(beasts.suffix, parseInt(suffix, 10)));
  if (beastId) conditions.push(eq(beasts.beast_id, parseInt(beastId, 10)));
  if (owner) conditions.push(eq(beast_owners.owner, normalizeAddress(owner)));
  if (name) {
    // Find beast IDs that match the name search (uses beast_id index)
    const lowerName = name.toLowerCase();
    const matchingBeastIds = Object.entries(BEAST_NAMES)
      .filter(([, beastName]) => beastName.toLowerCase().includes(lowerName))
      .map(([id]) => parseInt(id, 10));
    if (matchingBeastIds.length > 0) {
      conditions.push(sql`${beasts.beast_id} IN (${sql.raw(matchingBeastIds.join(","))})`);
    } else {
      // No matches, return empty result
      return c.json({
        data: [],
        pagination: { limit, offset, total: 0, has_more: false },
      });
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Both sort options use indexed columns
  const orderByClause = sort === "level"
    ? desc(beasts.level)
    : desc(beast_stats.summit_held_seconds);

  // Get paginated results
  const results = await db
    .select({
      token_id: beasts.token_id,
      beast_id: beasts.beast_id,
      prefix: beasts.prefix,
      suffix: beasts.suffix,
      level: beasts.level,
      health: beasts.health,
      shiny: beasts.shiny,
      animated: beasts.animated,
      bonus_health: beast_stats.bonus_health,
      bonus_xp: beast_stats.bonus_xp,
      summit_held_seconds: beast_stats.summit_held_seconds,
      spirit: beast_stats.spirit,
      luck: beast_stats.luck,
      specials: beast_stats.specials,
      wisdom: beast_stats.wisdom,
      diplomacy: beast_stats.diplomacy,
      extra_lives: beast_stats.extra_lives,
      owner: beast_owners.owner,
    })
    .from(beasts)
    .leftJoin(beast_stats, eq(beast_stats.token_id, beasts.token_id))
    .leftJoin(beast_owners, eq(beast_owners.token_id, beasts.token_id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(beasts)
    .leftJoin(beast_stats, eq(beast_stats.token_id, beasts.token_id))
    .leftJoin(beast_owners, eq(beast_owners.token_id, beasts.token_id))
    .where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map((r) => ({
      token_id: r.token_id,
      beast_id: r.beast_id,
      prefix: r.prefix,
      suffix: r.suffix,
      level: r.level,
      health: r.health,
      bonus_health: r.bonus_health ?? 0,
      bonus_xp: r.bonus_xp ?? 0,
      summit_held_seconds: r.summit_held_seconds ?? 0,
      spirit: r.spirit ?? 0,
      luck: r.luck ?? 0,
      specials: r.specials ?? false,
      wisdom: r.wisdom ?? false,
      diplomacy: r.diplomacy ?? false,
      extra_lives: r.extra_lives ?? 0,
      owner: r.owner,
      shiny: r.shiny,
      animated: r.animated,
    })),
    pagination: {
      limit,
      offset,
      total,
      has_more: offset + results.length < total,
    },
  });
});

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
      captured_summit: beast_stats.captured_summit,
      used_revival_potion: beast_stats.used_revival_potion,
      used_attack_potion: beast_stats.used_attack_potion,
      max_attack_streak: beast_stats.max_attack_streak,
      summit_held_seconds: beast_stats.summit_held_seconds,
      spirit: beast_stats.spirit,
      luck: beast_stats.luck,
      specials: beast_stats.specials,
      wisdom: beast_stats.wisdom,
      diplomacy: beast_stats.diplomacy,
      rewards_earned: beast_stats.rewards_earned,
      rewards_claimed: beast_stats.rewards_claimed,
      // Skulls claimed (one row per beast)
      skulls: skulls_claimed.skulls,
      // Quest rewards claimed
      quest_rewards_amount: quest_rewards_claimed.amount,
    })
    .from(beast_owners)
    .innerJoin(beasts, eq(beasts.token_id, beast_owners.token_id))
    .leftJoin(beast_data, eq(beast_data.token_id, beast_owners.token_id))
    .leftJoin(beast_stats, eq(beast_stats.token_id, beast_owners.token_id))
    .leftJoin(skulls_claimed, eq(skulls_claimed.beast_token_id, beast_owners.token_id))
    .leftJoin(quest_rewards_claimed, eq(quest_rewards_claimed.beast_token_id, beast_owners.token_id))
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
        captured_summit: r.captured_summit ?? false,
        used_revival_potion: r.used_revival_potion ?? false,
        used_attack_potion: r.used_attack_potion ?? false,
        max_attack_streak: r.max_attack_streak ?? false,
        summit_held_seconds: r.summit_held_seconds ?? 0,

        // Upgrades
        spirit,
        luck: r.luck ?? 0,
        specials: r.specials ?? false,
        wisdom: r.wisdom ?? false,
        diplomacy: r.diplomacy ?? false,

        // Rewards
        rewards_earned: r.rewards_earned ?? 0,
        rewards_claimed: r.rewards_claimed ?? 0,
        kills_claimed: Number(r.skulls ?? 0n),
        quest_rewards_claimed: r.quest_rewards_amount ?? 0,

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
 * - category: Filter by category (optional, comma-separated for multiple)
 * - sub_category: Filter by sub_category (optional, comma-separated for multiple)
 * - player: Filter by player address (optional)
 */
app.get("/logs", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const categoryParam = c.req.query("category");
  const subCategoryParam = c.req.query("sub_category");
  const player = c.req.query("player");

  // Parse comma-separated values into arrays
  const categories = categoryParam ? categoryParam.split(',').filter(Boolean) : [];
  const subCategories = subCategoryParam ? subCategoryParam.split(',').filter(Boolean) : [];

  // Build where conditions
  const conditions = [];
  if (categories.length > 0) conditions.push(inArray(summit_log.category, categories));
  if (subCategories.length > 0) conditions.push(inArray(summit_log.sub_category, subCategories));
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

/**
 * GET /beasts/stats/counts - Get total beasts vs alive beasts
 * Total = all beast_stats records
 * Alive = beasts where death was > 24 hours ago (or never died)
 */
app.get("/beasts/stats/counts", async (c) => {
  const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 86400;

  const result = await db
    .select({
      total: sql<number>`count(*)`,
      alive: sql<number>`count(*) filter (where ${beast_stats.last_death_timestamp} < ${twentyFourHoursAgo})`,
    })
    .from(beast_stats);

  const { total, alive } = result[0] ?? { total: 0, alive: 0 };

  return c.json({
    total: Number(total),
    alive: Number(alive),
    dead: Number(total) - Number(alive),
  });
});

/**
 * GET /beasts/stats/top - Get paginated top beasts by summit_held_seconds with metadata
 *
 * Query params:
 * - limit: Number of results (default: 25, max: 100)
 * - offset: Pagination offset (default: 0)
 *
 * Returns beasts with full metadata and pagination info including total count
 */
app.get("/beasts/stats/top", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "25", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  // Get paginated results with beast metadata
  const results = await db
    .select({
      token_id: beast_stats.token_id,
      summit_held_seconds: beast_stats.summit_held_seconds,
      bonus_xp: beast_stats.bonus_xp,
      last_death_timestamp: beast_stats.last_death_timestamp,
      beast_id: beasts.beast_id,
      prefix: beasts.prefix,
      suffix: beasts.suffix,
      owner: beast_owners.owner,
    })
    .from(beast_stats)
    .innerJoin(beasts, eq(beasts.token_id, beast_stats.token_id))
    .leftJoin(beast_owners, eq(beast_owners.token_id, beast_stats.token_id))
    .where(sql`${beast_stats.summit_held_seconds} > 0`)
    .orderBy(
      desc(beast_stats.summit_held_seconds),
      desc(beast_stats.bonus_xp),
      desc(beast_stats.last_death_timestamp)
    )
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(beast_stats)
    .where(sql`${beast_stats.summit_held_seconds} > 0`);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map((r) => {
      const beastName = BEAST_NAMES[r.beast_id] ?? "Unknown";
      const prefix = ITEM_NAME_PREFIXES[r.prefix] ?? "";
      const suffix = ITEM_NAME_SUFFIXES[r.suffix] ?? "";
      const fullName = prefix && suffix ? `"${prefix} ${suffix}" ${beastName}` : beastName;

      return {
        token_id: r.token_id,
        summit_held_seconds: r.summit_held_seconds,
        bonus_xp: r.bonus_xp,
        last_death_timestamp: Number(r.last_death_timestamp),
        owner: r.owner,
        beast_name: beastName,
        prefix,
        suffix,
        full_name: fullName,
      };
    }),
    pagination: {
      limit,
      offset,
      total,
      has_more: offset + results.length < total,
    },
  });
});

/**
 * GET /diplomacy - Get beasts with diplomacy unlocked matching prefix/suffix
 *
 * Query params:
 * - prefix: The prefix ID to match
 * - suffix: The suffix ID to match
 *
 * Returns beasts with owner and stats that have diplomacy unlocked
 */
app.get("/diplomacy", async (c) => {
  const prefix = parseInt(c.req.query("prefix") || "0", 10);
  const suffix = parseInt(c.req.query("suffix") || "0", 10);

  if (!prefix || !suffix) {
    return c.json({ error: "prefix and suffix are required" }, 400);
  }

  const results = await db
    .select({
      token_id: beasts.token_id,
      beast_id: beasts.beast_id,
      prefix: beasts.prefix,
      suffix: beasts.suffix,
      level: beasts.level,
      health: beasts.health,
      owner: beast_owners.owner,
      current_health: beast_stats.current_health,
      bonus_health: beast_stats.bonus_health,
      bonus_xp: beast_stats.bonus_xp,
      summit_held_seconds: beast_stats.summit_held_seconds,
      spirit: beast_stats.spirit,
      luck: beast_stats.luck,
    })
    .from(beasts)
    .innerJoin(beast_stats, eq(beast_stats.token_id, beasts.token_id))
    .leftJoin(beast_owners, eq(beast_owners.token_id, beasts.token_id))
    .where(
      and(
        eq(beasts.prefix, prefix),
        eq(beasts.suffix, suffix),
        eq(beast_stats.diplomacy, true)
      )
    );

  return c.json(
    results.map((r) => {
      const beastName = BEAST_NAMES[r.beast_id] ?? "Unknown";
      const prefixName = ITEM_NAME_PREFIXES[r.prefix] ?? "";
      const suffixName = ITEM_NAME_SUFFIXES[r.suffix] ?? "";
      const currentLevel = getBeastCurrentLevel(r.level, r.bonus_xp);

      return {
        token_id: r.token_id,
        beast_id: r.beast_id,
        name: beastName,
        prefix: prefixName,
        suffix: suffixName,
        prefix_id: r.prefix,
        suffix_id: r.suffix,
        full_name: `"${prefixName} ${suffixName}" ${beastName}`,
        level: r.level,
        current_level: currentLevel,
        health: r.health,
        current_health: r.current_health,
        bonus_health: r.bonus_health,
        bonus_xp: r.bonus_xp,
        summit_held_seconds: r.summit_held_seconds,
        spirit: r.spirit,
        luck: r.luck,
        owner: r.owner,
      };
    })
  );
});

/**
 * GET /diplomacy/all - Get all beasts with diplomacy unlocked
 * Used for building diplomacy leaderboard (grouped by prefix/suffix with power calculation)
 */
app.get("/diplomacy/all", async (c) => {
  const results = await db
    .select({
      token_id: beasts.token_id,
      beast_id: beasts.beast_id,
      prefix: beasts.prefix,
      suffix: beasts.suffix,
      level: beasts.level,
      bonus_xp: beast_stats.bonus_xp,
    })
    .from(beasts)
    .innerJoin(beast_stats, eq(beast_stats.token_id, beasts.token_id))
    .where(eq(beast_stats.diplomacy, true));

  return c.json(results);
});

/**
 * GET /leaderboard - Get rewards leaderboard grouped by owner
 */
app.get("/leaderboard", async (c) => {
  const results = await db
    .select({
      owner: rewards_earned.owner,
      amount: sql<number>`sum(${rewards_earned.amount})`,
    })
    .from(rewards_earned)
    .groupBy(rewards_earned.owner)
    .orderBy(sql`sum(${rewards_earned.amount}) desc`);

  return c.json(
    results.map((r) => ({
      owner: r.owner,
      amount: Number(r.amount) / 100000,
    }))
  );
});

/**
 * GET /quest-rewards/total - Get total quest rewards claimed
 */
app.get("/quest-rewards/total", async (c) => {
  const result = await db
    .select({ total: sql<number>`coalesce(sum(${quest_rewards_claimed.amount}), 0)` })
    .from(quest_rewards_claimed);

  return c.json({ total: Number(result[0]?.total ?? 0) });
});

/**
 * GET /adventurers/:player - Get all adventurer_ids for a player address
 * - Not paginated
 * - Returns distinct adventurer_ids as strings
 */
app.get("/adventurers/:player", async (c) => {
  const player = normalizeAddress(c.req.param("player"));

  const results = await db
    .selectDistinct({
      adventurer_id: corpse_events.adventurer_id,
    })
    .from(corpse_events)
    .where(eq(corpse_events.player, player));

  const adventurerIds = results.map((r) => r.adventurer_id.toString());

  return c.json({
    player,
    adventurer_ids: adventurerIds,
  });
});

// Root endpoint
app.get("/", (c) => {
  const endpoints: Record<string, unknown> = {
    health: "GET /health",
    beasts: {
      by_owner: "GET /beasts/:owner",
      all: "GET /beasts/all?limit=25&offset=0&prefix=&suffix=&beast_id=&name=&owner=&sort=summit_held_seconds",
      counts: "GET /beasts/stats/counts",
      top: "GET /beasts/stats/top?limit=25&offset=0",
      top5000_cutoff: "GET /beasts/stats/top5000-cutoff",
    },
    adventurers: {
      by_player: "GET /adventurers/:player",
    },
    leaderboard: "GET /leaderboard",
    quest_rewards: {
      total: "GET /quest-rewards/total",
    },
    websocket: {
      endpoint: "WS /ws",
      channels: ["summit", "event"],
      subscribe: '{"type":"subscribe","channels":["summit","event"]}',
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
