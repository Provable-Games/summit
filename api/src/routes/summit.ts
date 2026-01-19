/**
 * Summit History REST API Routes
 */

import { Hono } from "hono";
import { db } from "../db/client.js";
import { summitHistory } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

const app = new Hono();

/**
 * Serialize a summit record for JSON response
 */
function serializeSummit(summit: typeof summitHistory.$inferSelect) {
  return {
    id: summit.id,
    // Beast identifiers
    beastTokenId: summit.beastTokenId,
    beastId: summit.beastId,
    beastPrefix: summit.beastPrefix,
    beastSuffix: summit.beastSuffix,
    beastLevel: summit.beastLevel,
    beastHealth: summit.beastHealth,
    beastShiny: summit.beastShiny,
    beastAnimated: summit.beastAnimated,
    // Live stats
    tokenId: summit.tokenId,
    currentHealth: summit.currentHealth,
    bonusHealth: summit.bonusHealth,
    bonusXp: summit.bonusXp,
    attackStreak: summit.attackStreak,
    lastDeathTimestamp: summit.lastDeathTimestamp.toString(),
    revivalCount: summit.revivalCount,
    extraLives: summit.extraLives,
    hasClaimedPotions: summit.hasClaimedPotions,
    blocksHeld: summit.blocksHeld,
    spirit: summit.spirit,
    luck: summit.luck,
    specials: summit.specials,
    wisdom: summit.wisdom,
    diplomacyStat: summit.diplomacyStat,
    rewardsEarned: summit.rewardsEarned,
    rewardsClaimed: summit.rewardsClaimed,
    // Owner
    owner: summit.owner,
    // Timestamps
    createdAt: summit.createdAt.toISOString(),
    indexedAt: summit.indexedAt.toISOString(),
    insertedAt: summit.insertedAt?.toISOString() ?? null,
    blockNumber: summit.blockNumber.toString(),
    transactionHash: summit.transactionHash,
    eventIndex: summit.eventIndex,
  };
}

/**
 * GET /current - Get current summit holder (latest from summit_history)
 */
app.get("/current", async (c) => {
  const results = await db
    .select()
    .from(summitHistory)
    .orderBy(desc(summitHistory.createdAt))
    .limit(1);

  if (results.length === 0) {
    return c.json({ error: "No summit history found" }, 404);
  }

  return c.json(serializeSummit(results[0]));
});

/**
 * GET /history - Summit takeover history (paginated)
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
app.get("/history", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(summitHistory)
    .orderBy(desc(summitHistory.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(summitHistory);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeSummit),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /beast/:tokenId - Summit history for a specific beast
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
app.get("/beast/:tokenId", async (c) => {
  const tokenId = parseInt(c.req.param("tokenId"), 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  if (isNaN(tokenId)) {
    return c.json({ error: "Invalid token ID" }, 400);
  }

  const results = await db
    .select()
    .from(summitHistory)
    .where(eq(summitHistory.beastTokenId, tokenId))
    .orderBy(desc(summitHistory.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(summitHistory)
    .where(eq(summitHistory.beastTokenId, tokenId));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeSummit),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /owner/:address - Summit history for a specific owner
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
app.get("/owner/:address", async (c) => {
  const address = c.req.param("address");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(summitHistory)
    .where(eq(summitHistory.owner, address))
    .orderBy(desc(summitHistory.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(summitHistory)
    .where(eq(summitHistory.owner, address));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeSummit),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

export default app;
