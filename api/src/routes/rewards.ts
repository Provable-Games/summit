/**
 * Rewards REST API Routes
 */

import { Hono } from "hono";
import { db } from "../db/client.js";
import { rewards, rewardsClaimed } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

const app = new Hono();

/**
 * Serialize a reward record for JSON response
 */
function serializeReward(reward: typeof rewards.$inferSelect) {
  return {
    id: reward.id,
    rewardBlockNumber: reward.rewardBlockNumber.toString(),
    beastTokenId: reward.beastTokenId,
    owner: reward.owner,
    amount: reward.amount,
    createdAt: reward.createdAt.toISOString(),
    indexedAt: reward.indexedAt.toISOString(),
    insertedAt: reward.insertedAt?.toISOString() ?? null,
    blockNumber: reward.blockNumber.toString(),
    transactionHash: reward.transactionHash,
    eventIndex: reward.eventIndex,
  };
}

/**
 * Serialize a reward claimed record for JSON response
 */
function serializeRewardClaimed(claimed: typeof rewardsClaimed.$inferSelect) {
  return {
    id: claimed.id,
    player: claimed.player,
    beastTokenIds: claimed.beastTokenIds.split(",").map(Number),
    amount: claimed.amount,
    createdAt: claimed.createdAt.toISOString(),
    indexedAt: claimed.indexedAt.toISOString(),
    insertedAt: claimed.insertedAt?.toISOString() ?? null,
    blockNumber: claimed.blockNumber.toString(),
    transactionHash: claimed.transactionHash,
    eventIndex: claimed.eventIndex,
  };
}

/**
 * GET / - List recent rewards (paginated)
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
app.get("/", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(rewards)
    .orderBy(desc(rewards.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(rewards);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeReward),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /player/:address - Rewards for a specific player
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
app.get("/player/:address", async (c) => {
  const address = c.req.param("address");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(rewards)
    .where(eq(rewards.owner, address))
    .orderBy(desc(rewards.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(rewards)
    .where(eq(rewards.owner, address));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeReward),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /beast/:tokenId - Rewards for a specific beast
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
    .from(rewards)
    .where(eq(rewards.beastTokenId, tokenId))
    .orderBy(desc(rewards.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(rewards)
    .where(eq(rewards.beastTokenId, tokenId));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeReward),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /claimed - Claimed rewards history (paginated)
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
app.get("/claimed", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(rewardsClaimed)
    .orderBy(desc(rewardsClaimed.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(rewardsClaimed);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeRewardClaimed),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /claimed/player/:address - Claimed rewards for a specific player
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
app.get("/claimed/player/:address", async (c) => {
  const address = c.req.param("address");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const results = await db
    .select()
    .from(rewardsClaimed)
    .where(eq(rewardsClaimed.player, address))
    .orderBy(desc(rewardsClaimed.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(rewardsClaimed)
    .where(eq(rewardsClaimed.player, address));
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeRewardClaimed),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /leaderboard - Player rewards leaderboard
 * Aggregates rewards by owner, sorted by total amount
 *
 * Query params:
 * - limit: Number of results (default: 100, max: 500)
 */
app.get("/leaderboard", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "100", 10), 500);

  const results = await db
    .select({
      owner: rewards.owner,
      amount: sql<number>`SUM(${rewards.amount})`.as("amount"),
    })
    .from(rewards)
    .groupBy(rewards.owner)
    .orderBy(sql`SUM(${rewards.amount}) DESC`)
    .limit(limit);

  return c.json({
    data: results.map((row, index) => ({
      rank: index + 1,
      owner: row.owner,
      amount: Number(row.amount) / 10000, // Convert to display units
    })),
  });
});

export default app;
