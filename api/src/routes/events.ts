/**
 * Events REST API Routes
 * Handles poison, corpse, and skull events
 */

import { Hono } from "hono";
import { db } from "../db/client.js";
import { poisonEvents, corpseEvents, skullEvents } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

const app = new Hono();

/**
 * Serialize a poison event for JSON response
 */
function serializePoisonEvent(event: typeof poisonEvents.$inferSelect) {
  return {
    id: event.id,
    beastTokenId: event.beastTokenId,
    blockTimestamp: event.blockTimestamp.toString(),
    count: event.count,
    player: event.player,
    createdAt: event.createdAt.toISOString(),
    indexedAt: event.indexedAt.toISOString(),
    insertedAt: event.insertedAt?.toISOString() ?? null,
    blockNumber: event.blockNumber.toString(),
    transactionHash: event.transactionHash,
    eventIndex: event.eventIndex,
  };
}

/**
 * Serialize a corpse event for JSON response
 */
function serializeCorpseEvent(event: typeof corpseEvents.$inferSelect) {
  return {
    id: event.id,
    adventurerId: event.adventurerId.toString(),
    player: event.player,
    createdAt: event.createdAt.toISOString(),
    indexedAt: event.indexedAt.toISOString(),
    insertedAt: event.insertedAt?.toISOString() ?? null,
    blockNumber: event.blockNumber.toString(),
    transactionHash: event.transactionHash,
    eventIndex: event.eventIndex,
  };
}

/**
 * Serialize a skull event for JSON response
 */
function serializeSkullEvent(event: typeof skullEvents.$inferSelect) {
  return {
    id: event.id,
    beastTokenId: event.beastTokenId,
    skulls: event.skulls.toString(),
    createdAt: event.createdAt.toISOString(),
    indexedAt: event.indexedAt.toISOString(),
    insertedAt: event.insertedAt?.toISOString() ?? null,
    blockNumber: event.blockNumber.toString(),
    transactionHash: event.transactionHash,
    eventIndex: event.eventIndex,
  };
}

// =====================
// Poison Events
// =====================

/**
 * GET /poison - List poison events (paginated)
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
app.get("/poison", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(poisonEvents)
    .orderBy(desc(poisonEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(poisonEvents);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializePoisonEvent),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /poison/beast/:tokenId - Poison events for a specific beast
 */
app.get("/poison/beast/:tokenId", async (c) => {
  const tokenId = parseInt(c.req.param("tokenId"), 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  if (isNaN(tokenId)) {
    return c.json({ error: "Invalid token ID" }, 400);
  }

  const results = await db
    .select()
    .from(poisonEvents)
    .where(eq(poisonEvents.beastTokenId, tokenId))
    .orderBy(desc(poisonEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(poisonEvents)
    .where(eq(poisonEvents.beastTokenId, tokenId));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializePoisonEvent),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /poison/player/:address - Poison events by a specific player
 */
app.get("/poison/player/:address", async (c) => {
  const address = c.req.param("address");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(poisonEvents)
    .where(eq(poisonEvents.player, address))
    .orderBy(desc(poisonEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(poisonEvents)
    .where(eq(poisonEvents.player, address));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializePoisonEvent),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

// =====================
// Corpse Events
// =====================

/**
 * GET /corpse - List corpse events (paginated)
 */
app.get("/corpse", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(corpseEvents)
    .orderBy(desc(corpseEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(corpseEvents);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeCorpseEvent),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /corpse/player/:address - Corpse events for a specific player
 */
app.get("/corpse/player/:address", async (c) => {
  const address = c.req.param("address");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(corpseEvents)
    .where(eq(corpseEvents.player, address))
    .orderBy(desc(corpseEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(corpseEvents)
    .where(eq(corpseEvents.player, address));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeCorpseEvent),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

// =====================
// Skull Events
// =====================

/**
 * GET /skull - List skull events (paginated)
 */
app.get("/skull", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(skullEvents)
    .orderBy(desc(skullEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(skullEvents);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeSkullEvent),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /skull/beast/:tokenId - Skull events for a specific beast
 */
app.get("/skull/beast/:tokenId", async (c) => {
  const tokenId = parseInt(c.req.param("tokenId"), 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  if (isNaN(tokenId)) {
    return c.json({ error: "Invalid token ID" }, 400);
  }

  const results = await db
    .select()
    .from(skullEvents)
    .where(eq(skullEvents.beastTokenId, tokenId))
    .orderBy(desc(skullEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(skullEvents)
    .where(eq(skullEvents.beastTokenId, tokenId));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeSkullEvent),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /skull/leaderboard - Top beasts by skulls claimed
 */
app.get("/skull/leaderboard", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "10", 10), 100);

  const results = await db
    .select()
    .from(skullEvents)
    .orderBy(desc(skullEvents.skulls))
    .limit(limit);

  return c.json({
    data: results.map((event, index) => ({
      rank: index + 1,
      ...serializeSkullEvent(event),
    })),
  });
});

export default app;
