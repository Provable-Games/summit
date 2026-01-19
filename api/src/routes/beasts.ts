/**
 * Beast Stats REST API Routes
 */

import { Hono } from "hono";
import { db } from "../db/client.js";
import { beastStats } from "../db/schema.js";
import { eq, desc, asc, sql, inArray } from "drizzle-orm";

const app = new Hono();

/**
 * Serialize a beast record for JSON response
 * BigInts are converted to strings for JSON compatibility
 */
function serializeBeast(beast: typeof beastStats.$inferSelect) {
  return {
    id: beast.id,
    tokenId: beast.tokenId,
    currentHealth: beast.currentHealth,
    bonusHealth: beast.bonusHealth,
    bonusXp: beast.bonusXp,
    attackStreak: beast.attackStreak,
    lastDeathTimestamp: beast.lastDeathTimestamp.toString(),
    revivalCount: beast.revivalCount,
    extraLives: beast.extraLives,
    hasClaimedPotions: beast.hasClaimedPotions,
    blocksHeld: beast.blocksHeld,
    spirit: beast.spirit,
    luck: beast.luck,
    specials: beast.specials,
    wisdom: beast.wisdom,
    diplomacy: beast.diplomacy,
    rewardsEarned: beast.rewardsEarned,
    rewardsClaimed: beast.rewardsClaimed,
    createdAt: beast.createdAt.toISOString(),
    indexedAt: beast.indexedAt.toISOString(),
    insertedAt: beast.insertedAt?.toISOString() ?? null,
    updatedAt: beast.updatedAt?.toISOString() ?? null,
    blockNumber: beast.blockNumber.toString(),
    transactionHash: beast.transactionHash,
  };
}

/**
 * GET / - List all beasts (paginated, sorted by blocks_held by default)
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - sortBy: Sort field (blocks_held, current_health, rewards_earned, updated_at)
 * - sortOrder: asc or desc (default: desc)
 */
app.get("/", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const sortBy = c.req.query("sortBy") || "blocks_held";
  const sortOrder = c.req.query("sortOrder") || "desc";

  // Build orderBy based on sortBy and sortOrder
  const getOrderBy = () => {
    const direction = sortOrder === "asc" ? asc : desc;
    switch (sortBy) {
      case "current_health":
        return direction(beastStats.currentHealth);
      case "rewards_earned":
        return direction(beastStats.rewardsEarned);
      case "updated_at":
        return direction(beastStats.updatedAt);
      case "blocks_held":
      default:
        return direction(beastStats.blocksHeld);
    }
  };

  const results = await db
    .select()
    .from(beastStats)
    .orderBy(getOrderBy())
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(beastStats);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeBeast),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /leaderboard - Top beasts by blocks_held
 *
 * Query params:
 * - limit: Number of results (default: 10, max: 100)
 */
app.get("/leaderboard", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "10", 10), 100);

  const results = await db
    .select()
    .from(beastStats)
    .orderBy(desc(beastStats.blocksHeld))
    .limit(limit);

  return c.json({
    data: results.map((beast, index) => ({
      rank: index + 1,
      ...serializeBeast(beast),
    })),
  });
});

/**
 * POST /bulk - Get multiple beasts by token IDs
 *
 * Body: { tokenIds: number[] }
 * Returns beasts for the specified token IDs (max 1000)
 */
app.post("/bulk", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const tokenIds = body.tokenIds;

  if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
    return c.json({ error: "tokenIds must be a non-empty array" }, 400);
  }

  // Limit to 1000 token IDs to prevent abuse
  const limitedTokenIds = tokenIds.slice(0, 1000).map(Number).filter(id => !isNaN(id));

  if (limitedTokenIds.length === 0) {
    return c.json({ data: [] });
  }

  const results = await db
    .select()
    .from(beastStats)
    .where(inArray(beastStats.tokenId, limitedTokenIds));

  return c.json({
    data: results.map(serializeBeast),
  });
});

/**
 * GET /:tokenId - Get single beast by token ID
 */
app.get("/:tokenId", async (c) => {
  const tokenId = parseInt(c.req.param("tokenId"), 10);

  if (isNaN(tokenId)) {
    return c.json({ error: "Invalid token ID" }, 400);
  }

  const results = await db
    .select()
    .from(beastStats)
    .where(eq(beastStats.tokenId, tokenId))
    .limit(1);

  if (results.length === 0) {
    return c.json({ error: "Beast not found" }, 404);
  }

  return c.json(serializeBeast(results[0]));
});

export default app;
