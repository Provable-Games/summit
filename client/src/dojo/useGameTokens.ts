import { useDynamicConnector } from "@/contexts/starknet";
import { Top5000Cutoff } from "@/contexts/Statistics";
import { Beast } from "@/types/game";
import { ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";
import { getBeastCurrentHealth, getBeastCurrentLevel, getBeastRevivalTime, getEntityHash } from "@/utils/beasts";
import { addAddressPadding } from "starknet";

export const useGameTokens = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const getBeastCollection = async (accountAddress: string, cachedCollection: Beast[]) => {
    const contractAddress = '0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4';

    // Step 1: Get token balances with hex IDs (fast query using index)
    const tokenBalancesQuery = `
      SELECT
        token_id,
        LOWER(CASE WHEN SUBSTR(suf,1,2)='0x' THEN SUBSTR(suf,3) ELSE suf END) AS token_hex64
      FROM (
        SELECT token_id, SUBSTR(token_id, INSTR(token_id, ':')+1) AS suf
        FROM token_balances
        WHERE account_address = '${addAddressPadding(accountAddress.toLowerCase())}'
          AND contract_address = '${contractAddress}'
          AND balance = '0x0000000000000000000000000000000000000000000000000000000000000001'
        LIMIT 10000
      )
    `;

    const tokenBalancesUrl = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(tokenBalancesQuery)}`;
    let tokenBalancesData: any[];

    try {
      const tokenBalancesResponse = await fetch(tokenBalancesUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!tokenBalancesResponse.ok) {
        console.error("Failed to fetch token balances:", tokenBalancesResponse.status);
        return [];
      }

      const result = await tokenBalancesResponse.json();
      tokenBalancesData = Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Error fetching token balances:", error);
      return [];
    const contractAddress = currentNetworkConfig.beasts;

    if (tokenBalancesData.length === 0) {
      return [];
    }

    // Step 2: Convert hex to integer IDs in JS and build lookup map
    const tokenMap = new Map<number, { token_id: string; token_hex64: string }>();
    const integerIds: number[] = [];

    for (const row of tokenBalancesData) {
      const intId = parseInt(row.token_hex64, 16);
      tokenMap.set(intId, row);
      integerIds.push(intId);
    }

    // Step 3: Query stats and skulls in parallel with integer IDs (uses index)
    const integerIdsList = integerIds.join(',');

    const statsQuery = `
      SELECT
        token_id,
        "live_stats.attack_streak",
        "live_stats.bonus_health",
        "live_stats.bonus_xp",
        "live_stats.current_health",
        "live_stats.extra_lives",
        "live_stats.has_claimed_potions",
        "live_stats.last_death_timestamp",
        "live_stats.stats.luck",
        "live_stats.stats.spirit",
        "live_stats.stats.specials",
        "live_stats.revival_count",
        "live_stats.blocks_held",
        "live_stats.stats.wisdom",
        "live_stats.stats.diplomacy"
      FROM "${currentNetworkConfig.namespace}-LiveBeastStatsEvent"
      WHERE token_id IN (${integerIdsList})
    `;

    const skullsQuery = `
      SELECT beast_token_id, skulls
      FROM "${currentNetworkConfig.namespace}-SkullEvent"
      WHERE beast_token_id IN (${integerIdsList})
    `;

    // Step 4: Get metadata (uses existing join pattern which is fast)
    const metadataQuery = `
      WITH tbf AS (
        SELECT
          token_id,
          LOWER(CASE WHEN SUBSTR(suf,1,2)='0x' THEN SUBSTR(suf,3) ELSE suf END) AS token_hex64
        FROM (
          SELECT token_id, SUBSTR(token_id, INSTR(token_id, ':')+1) AS suf
          FROM token_balances
          WHERE account_address = '${addAddressPadding(accountAddress.toLowerCase())}'
            AND contract_address = '${contractAddress}'
            AND balance = '0x0000000000000000000000000000000000000000000000000000000000000001'
          LIMIT 10000
        )
      )
      SELECT tbf.token_hex64, t.metadata
      FROM tbf
      LEFT JOIN tokens t ON t.contract_address = '${contractAddress}'
        AND t.token_id = ('0x' || tbf.token_hex64)
    `;

    // Execute all three queries in parallel
    let statsData: any[] = [];
    let skullsData: any[] = [];
    let metadataData: any[] = [];

    try {
      const [statsResponse, skullsResponse, metadataResponse] = await Promise.all([
        fetch(`${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(statsQuery)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }),
        fetch(`${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(skullsQuery)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }),
        fetch(`${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(metadataQuery)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })
      ]);

      const results = await Promise.all([
        statsResponse.ok ? statsResponse.json() : [],
        skullsResponse.ok ? skullsResponse.json() : [],
        metadataResponse.ok ? metadataResponse.json() : []
      ]);

      statsData = Array.isArray(results[0]) ? results[0] : [];
      skullsData = Array.isArray(results[1]) ? results[1] : [];
      metadataData = Array.isArray(results[2]) ? results[2] : [];
    } catch (error) {
      console.error("Error fetching beast collection data:", error);
      return [];
    }

    // Build lookup maps for O(1) access
    // Note: SQL JSON responses may return numeric IDs as strings, so we
    // explicitly convert to Number to ensure consistent Map key types
    const statsMap = new Map<number, any>();
    for (const row of statsData) {
      statsMap.set(Number(row.token_id), row);
    }

    const skullsMap = new Map<number, string>();
    for (const row of skullsData) {
      skullsMap.set(Number(row.beast_token_id), row.skulls);
    }

    const metadataMap = new Map<string, any>();
    for (const row of metadataData) {
      if (row.metadata) {
        metadataMap.set(row.token_hex64, row.metadata);
      }
    }

    // Step 5: Combine all data into Beast objects
    let beasts: Beast[] = integerIds.map((numericTokenId) => {
      const tokenInfo = tokenMap.get(numericTokenId)!;
      const stats = statsMap.get(numericTokenId) || {};
      const skulls = skullsMap.get(numericTokenId);
      const rawMetadata = metadataMap.get(tokenInfo.token_hex64);

      if (!rawMetadata) {
        return null;
      }

      // Parse metadata JSON
      let metadata: any;
      try {
        metadata = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : rawMetadata;
      } catch (e) {
        console.error("Failed to parse beast metadata:", e, rawMetadata);
        return null;
      }

      // Parse attributes array into a map
      const attrs: { [key: string]: string } = {};
      if (metadata.attributes && Array.isArray(metadata.attributes)) {
        metadata.attributes.forEach((attr: any) => {
          attrs[attr.trait_type] = attr.value;
        });
      }

      let cachedBeast = cachedCollection.find((beast: Beast) => beast.token_id === numericTokenId);
      let beast: any = {
        id: Number(attrs["Beast ID"]),
        token_id: numericTokenId,
        name: attrs["Beast"]?.replace(" ", "") || "",
        level: Number(attrs["Level"]),
        health: Number(attrs["Health"]),
        prefix: attrs["Prefix"],
        suffix: attrs["Suffix"],
        power: Number(attrs["Power"]),
        tier: Number(attrs["Tier"]),
        type: attrs["Type"],
        shiny: Number(attrs["Shiny"]),
        animated: Number(attrs["Animated"]),
        rank: Number(attrs["Rank"]),
        adventurers_killed: Number(attrs["Adventurers Killed"]),
        last_dm_death_timestamp: Number(attrs["Last Death Timestamp"]),
        attack_streak: stats["live_stats.attack_streak"] || 0,
        bonus_health: Math.max(cachedBeast?.bonus_health || 0, stats["live_stats.bonus_health"] || 0),
        bonus_xp: Math.max(cachedBeast?.bonus_xp || 0, stats["live_stats.bonus_xp"] || 0),
        current_health: stats["live_stats.current_health"] ?? null,
        extra_lives: stats["live_stats.extra_lives"] || 0,
        has_claimed_potions: cachedBeast?.has_claimed_potions || Boolean(stats["live_stats.has_claimed_potions"]),
        last_death_timestamp: stats["live_stats.last_death_timestamp"] ? parseInt(stats["live_stats.last_death_timestamp"], 16) : 0,
        revival_count: Math.max(cachedBeast?.revival_count || 0, stats["live_stats.revival_count"] || 0),
        blocks_held: parseInt(stats["live_stats.blocks_held"], 16) || 0,
        revival_time: 0,
        stats: {
          spirit: Math.max(cachedBeast?.stats.spirit || 0, stats["live_stats.stats.spirit"] || 0),
          luck: Math.max(cachedBeast?.stats.luck || 0, stats["live_stats.stats.luck"] || 0),
          specials: cachedBeast?.stats.specials || Boolean(stats["live_stats.stats.specials"]),
          wisdom: cachedBeast?.stats.wisdom || Boolean(stats["live_stats.stats.wisdom"]),
          diplomacy: cachedBeast?.stats.diplomacy || Boolean(stats["live_stats.stats.diplomacy"]),
        },
        kills_claimed: Math.max(cachedBeast?.kills_claimed || 0, parseInt(skulls || "0", 16) || 0),
      }
      beast.revival_time = getBeastRevivalTime(beast);
      beast.current_health = getBeastCurrentHealth(beast)
      beast.current_level = getBeastCurrentLevel(beast.level, beast.bonus_xp)
      beast.power = (6 - beast.tier) * beast.current_level;

      let prefix = Object.keys(ITEM_NAME_PREFIXES).find((key: any) => ITEM_NAME_PREFIXES[key] === beast.prefix) || 0;
      let suffix = Object.keys(ITEM_NAME_SUFFIXES).find((key: any) => ITEM_NAME_SUFFIXES[key] === beast.suffix) || 0;
      beast.entity_hash = getEntityHash(beast.id, Number(prefix), Number(suffix));

      return beast
    }).filter(Boolean) as Beast[];

    return beasts
  }

  const getDungeonStats = async (specialHashes: string[]) => {
    try {
      let q = `
      WITH special(entity_hash) AS (
        VALUES ${specialHashes.map((hash: string) => `('${addAddressPadding(hash.toLowerCase())}')`).join(',')}
      ),
      mx AS (
        SELECT c.entity_hash, MAX(c."index") AS max_index
        FROM "ls_0_0_9-CollectableEntity" c
        JOIN special s USING(entity_hash)
        WHERE c.dungeon = '${currentNetworkConfig.dungeon}'
        GROUP BY c.entity_hash
      ),
      last_row AS (
        SELECT c.entity_hash, c.killed_by, c."timestamp"
        FROM "ls_0_0_9-CollectableEntity" c
        JOIN mx
          ON c.entity_hash = mx.entity_hash
        AND c."index"     = mx.max_index
        WHERE c.dungeon = '${currentNetworkConfig.dungeon}'
      )
      SELECT
        l.entity_hash,
        l.killed_by,
        l."timestamp",
        es.adventurers_killed AS adventurers_killed
      FROM last_row l
      LEFT JOIN "ls_0_0_9-EntityStats" es
        ON es.dungeon = '0x0000000000000000000000000000000000000000000000000000000000000006'
      AND es.entity_hash = l.entity_hash;
    `
      const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
      const sql = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      })

      const data = await sql.json()
      return data
    } catch (error) {
      console.error("Error getting dungeon stats:", error);
      return [];
    }
  }

  const countAliveBeasts = async () => {
    let q = `
      SELECT COUNT(DISTINCT attacking_beast_id) as count
      FROM "summit_relayer_3-BattleEvent"
      WHERE internal_created_at > datetime('now', '-24 hours');
    `

    let url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;

    try {
      const sql = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      })

      let data = await sql.json()
      return data[0].count || 0;
    } catch (error) {
      console.error("Error counting beasts:", error);
      return 0;
    }
  }

  const countRegisteredBeasts = async () => {
    let q = `
      SELECT COUNT(*) as count
      FROM "${currentNetworkConfig.namespace}-LiveBeastStatsEvent"
    `
    let url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;

    try {
      const sql = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      })

      let data = await sql.json()
      return data[0].count || 0;
    } catch (error) {
      console.error("Error counting beasts:", error);
      return 0;
    }
  }

  const getLeaderboard = async () => {
    // Fetch all rewards (within time window) and aggregate in JS since
    // the amount column is now stored as a hex string.
    const q = `
      SELECT owner, amount
      FROM "${currentNetworkConfig.namespace}-RewardEvent"
      WHERE internal_created_at > '2025-12-10 18:00:00'
    `;

    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;

    try {
      const sql = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const rows: any[] = await sql.json();

      // Aggregate totals per owner using BigInt for precise hex handling.
      const totals = new Map<string, bigint>();

      for (const row of rows) {
        const owner = row.owner;
        const rawAmount = row.amount;

        if (!owner || rawAmount == null) continue;

        let valueBigInt: bigint | null = null;

        if (typeof rawAmount === "string") {
          // Handle hex strings like "0x0000..."
          if (/^0x[0-9a-fA-F]+$/.test(rawAmount)) {
            try {
              valueBigInt = BigInt(rawAmount);
            } catch {
              valueBigInt = null;
            }
          } else {
            // Fallback for decimal strings
            try {
              valueBigInt = BigInt(rawAmount);
            } catch {
              const numVal = Number(rawAmount);
              if (!Number.isNaN(numVal) && Number.isFinite(numVal)) {
                valueBigInt = BigInt(Math.floor(numVal));
              }
            }
          }
        } else if (typeof rawAmount === "number") {
          if (Number.isFinite(rawAmount)) {
            valueBigInt = BigInt(Math.floor(rawAmount));
          }
        }

        if (valueBigInt === null) continue;

        const prev = totals.get(owner) ?? 0n;
        totals.set(owner, prev + valueBigInt);
      }

      // Convert to the expected Leaderboard shape with numeric amounts.
      //
      // Amounts are currently in 18‑decimals (wei-style). The UI expects
      // `amount` to be scaled such that `amount / 100` gives the final
      // whole-number display value. To achieve:
      //   1e18 (wei) -> 1 (display),
      // we first divide by 1e16 here, then the UI divides by 1e2.
      const scaleDivisor = 10000000000000000n; // 10^16

      const leaderboard = Array.from(totals.entries())
        .map(([owner, total]) => {
          const scaled = total / scaleDivisor;
          return {
            owner,
            amount: Number(scaled),
          };
        })
        .sort((a, b) => b.amount - a.amount);

      return leaderboard;
    } catch (error) {
      console.error("Error getting big five:", error);
      return [];
    }
  }



  const getValidAdventurers = async (adventurerIds: number[]) => {
    let q = `
      SELECT adventurer_id
      FROM "summit_relayer_3-CorpseEvent"
      WHERE adventurer_id IN (${adventurerIds.map((id: number) => `'0x${id.toString(16).padStart(16, '0')}'`).join(',')})
    `
    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    let data = await sql.json()
    return adventurerIds.filter((id: number) => !data.some((row: any) => parseInt(row.adventurer_id, 16) === id))
  }

  const getTop5000Cutoff = async (): Promise<Top5000Cutoff | null> => {
    try {
      // Query 1: Get blocks_held sorted DESC (fast, no joins)
      const statsQuery = `
        SELECT 
          "live_stats.blocks_held" as blocks_held,
          "live_stats.bonus_xp" as bonus_xp,
          "live_stats.last_death_timestamp" as last_death_timestamp
        FROM "${currentNetworkConfig.namespace}-LiveBeastStatsEvent"
        WHERE "live_stats.blocks_held" > 0
        ORDER BY 
          "live_stats.blocks_held" DESC,
          "live_stats.bonus_xp" DESC,
          "live_stats.last_death_timestamp" DESC
        LIMIT 5000
      `;

      const statsUrl = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(statsQuery)}`;
      const statsResponse = await fetch(statsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      const statsData = await statsResponse.json();

      if (!statsData || statsData.length < 5000) {
        return {
          blocks_held: 0,
          bonus_xp: 0,
          last_death_timestamp: 0,
        }
      }

      // Get the 5000th beast's blocks_held
      const lastBeast = statsData[4999];

      return {
        blocks_held: lastBeast.blocks_held,
        bonus_xp: lastBeast.bonus_xp,
        last_death_timestamp: lastBeast.last_death_timestamp,
      }
    } catch (error) {
      console.error("Error getting top 5000 cutoff:", error);
      return null;
    }
  }

  const countBeastsWithBlocksHeld = async () => {
    const q = `
      SELECT COUNT(*) as count
      FROM "${currentNetworkConfig.namespace}-LiveBeastStatsEvent"
      WHERE "live_stats.blocks_held" > 0
    `;

    try {
      const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
      const sql = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const data = await sql.json();
      return data[0]?.count || 0;
    } catch (error) {
      console.error("Error counting beasts with blocks_held:", error);
      return 0;
    }
  };

  const getTopBeastsByBlocksHeld = async (limit: number, offset: number) => {
    try {
      const q = `
        SELECT 
          token_id,
          "live_stats.blocks_held" as blocks_held,
          "live_stats.bonus_xp" as bonus_xp,
          "live_stats.last_death_timestamp" as last_death_timestamp
        FROM "${currentNetworkConfig.namespace}-LiveBeastStatsEvent"
        WHERE "live_stats.blocks_held" > 0
        ORDER BY 
          "live_stats.blocks_held" DESC,
          "live_stats.bonus_xp" DESC,
          "live_stats.last_death_timestamp" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
      const sql = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const data = await sql.json();
      return data || [];
    } catch (error) {
      console.error("Error getting top beasts by blocks_held:", error);
      return [];
    }
  }

  const getDiplomacy = async (beast: Beast) => {
    let q = `
      SELECT total_power, beast_token_ids
      FROM "${currentNetworkConfig.namespace}-DiplomacyEvent"
      WHERE specials_hash = '${beast.specials_hash}'
    `
    try {
      const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
      const sql = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      })

      let data = await sql.json()

      return {
        specials_hash: beast.specials_hash,
        total_power: data[0].total_power,
        beast_token_ids: JSON.parse(data[0].beast_token_ids),
      }
    } catch (error) {
      return {
        specials_hash: beast.specials_hash,
        total_power: 0,
        beast_token_ids: [],
      }
    }
  }

  return {
    getBeastCollection,
    countRegisteredBeasts,
    getLeaderboard,
    getValidAdventurers,
    countAliveBeasts,
    getTop5000Cutoff,
    getDiplomacy,
    getTopBeastsByBlocksHeld,
    countBeastsWithBlocksHeld,
    getDungeonStats
  };
};
