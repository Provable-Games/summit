/**
 * Battles REST API Routes
 */

import { Hono } from "hono";
import { db } from "../db/client.js";
import { battles } from "../db/schema.js";
import { eq, desc, or, sql } from "drizzle-orm";

const app = new Hono();

/**
 * Serialize a battle record for JSON response
 */
function serializeBattle(battle: typeof battles.$inferSelect) {
  return {
    id: battle.id,
    attackingBeastTokenId: battle.attackingBeastTokenId,
    attackIndex: battle.attackIndex,
    defendingBeastTokenId: battle.defendingBeastTokenId,
    attackCount: battle.attackCount,
    attackDamage: battle.attackDamage,
    criticalAttackCount: battle.criticalAttackCount,
    criticalAttackDamage: battle.criticalAttackDamage,
    counterAttackCount: battle.counterAttackCount,
    counterAttackDamage: battle.counterAttackDamage,
    criticalCounterAttackCount: battle.criticalCounterAttackCount,
    criticalCounterAttackDamage: battle.criticalCounterAttackDamage,
    attackPotions: battle.attackPotions,
    xpGained: battle.xpGained,
    createdAt: battle.createdAt.toISOString(),
    indexedAt: battle.indexedAt.toISOString(),
    insertedAt: battle.insertedAt?.toISOString() ?? null,
    blockNumber: battle.blockNumber.toString(),
    transactionHash: battle.transactionHash,
    eventIndex: battle.eventIndex,
  };
}

/**
 * GET / - List recent battles (paginated)
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
    .from(battles)
    .orderBy(desc(battles.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(battles);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeBattle),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

/**
 * GET /beast/:tokenId - Get battles for a specific beast (as attacker or defender)
 *
 * Query params:
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - role: Filter by role (attacker, defender, or both - default)
 */
app.get("/beast/:tokenId", async (c) => {
  const tokenId = parseInt(c.req.param("tokenId"), 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const role = c.req.query("role") || "both";

  if (isNaN(tokenId)) {
    return c.json({ error: "Invalid token ID" }, 400);
  }

  // Build where clause based on role filter
  let whereClause;
  if (role === "attacker") {
    whereClause = eq(battles.attackingBeastTokenId, tokenId);
  } else if (role === "defender") {
    whereClause = eq(battles.defendingBeastTokenId, tokenId);
  } else {
    whereClause = or(
      eq(battles.attackingBeastTokenId, tokenId),
      eq(battles.defendingBeastTokenId, tokenId)
    );
  }

  const results = await db
    .select()
    .from(battles)
    .where(whereClause)
    .orderBy(desc(battles.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(battles)
    .where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(serializeBattle),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    },
  });
});

export default app;
