/**
 * Diplomacy REST API Routes
 */

import { Hono } from "hono";
import { db } from "../db/client.js";
import { diplomacyGroups } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const app = new Hono();

/**
 * GET /:specialsHash - Get diplomacy group by specials hash
 * Returns the latest diplomacy configuration for a given specials hash
 */
app.get("/:specialsHash", async (c) => {
  const specialsHash = c.req.param("specialsHash");

  const result = await db
    .select()
    .from(diplomacyGroups)
    .where(eq(diplomacyGroups.specialsHash, specialsHash))
    .orderBy(desc(diplomacyGroups.createdAt))
    .limit(1);

  if (result.length === 0) {
    return c.json({
      specials_hash: specialsHash,
      total_power: 0,
      beast_token_ids: [],
    });
  }

  const group = result[0];
  return c.json({
    specials_hash: group.specialsHash,
    total_power: group.totalPower,
    beast_token_ids: JSON.parse(group.beastTokenIds),
  });
});

export default app;
