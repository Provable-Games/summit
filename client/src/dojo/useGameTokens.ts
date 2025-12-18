import { useDynamicConnector } from "@/contexts/starknet";
import { Top5000Cutoff } from "@/contexts/Statistics";
import { Beast } from "@/types/game";
import { ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";
import { getBeastCurrentHealth, getBeastCurrentLevel, getBeastRevivalTime, getEntityHash } from "@/utils/beasts";
import { addAddressPadding } from "starknet";

export const useGameTokens = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const getBeastCollection = async (accountAddress: string, cachedCollection: Beast[]) => {
    let q = `
      WITH tbf AS (
        SELECT tb.token_id, tb.account_address, tb.contract_address, tb.balance
        FROM token_balances tb
        WHERE tb.account_address = '${addAddressPadding(accountAddress.toLowerCase())}'
          AND tb.contract_address = '0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4'
          AND tb.balance = '0x0000000000000000000000000000000000000000000000000000000000000001'
        LIMIT 10000
      ),
      tbn AS (
        SELECT
          tb.token_id,
          tb.account_address,
          tb.contract_address,
          tb.balance,
          LOWER(CASE WHEN SUBSTR(suf,1,2)='0x' THEN SUBSTR(suf,3) ELSE suf END) AS token_hex64
        FROM (
          SELECT
            tbf.token_id,
            tbf.account_address,
            tbf.contract_address,
            tbf.balance,
            SUBSTR(tbf.token_id, INSTR(tbf.token_id, ':')+1) AS suf
          FROM tbf
        ) AS tb
      ),
      stats AS (
        SELECT
          LOWER(printf('%064x', CAST(token_id AS INTEGER))) AS token_hex64,
          "live_stats.attack_streak", "live_stats.bonus_health", "live_stats.bonus_xp", "live_stats.current_health", "live_stats.extra_lives",
          "live_stats.has_claimed_potions", "live_stats.last_death_timestamp", "live_stats.stats.luck", "live_stats.stats.spirit", "live_stats.stats.specials",
          "live_stats.revival_count", "live_stats.blocks_held", "live_stats.stats.wisdom", "live_stats.stats.diplomacy"
        FROM "${currentNetworkConfig.namespace}-LiveBeastStatsEvent"
      ),
      skulls AS (
        SELECT
          LOWER(printf('%064x', CAST(beast_token_id AS INTEGER))) AS token_hex64,
          skulls
        FROM "${currentNetworkConfig.namespace}-SkullEvent"
      )
      SELECT
        tbn.token_id,
        tbn.token_hex64,
        tbn.account_address,
        tbn.contract_address,
        tbn.balance,
        t.metadata,
        s."live_stats.attack_streak",
        s."live_stats.bonus_health",
        s."live_stats.bonus_xp",
        s."live_stats.current_health",
        s."live_stats.extra_lives",
        s."live_stats.has_claimed_potions",
        s."live_stats.last_death_timestamp",
        s."live_stats.revival_count",
        s."live_stats.blocks_held",
        s."live_stats.stats.luck",
        s."live_stats.stats.spirit",
        s."live_stats.stats.specials",
        s."live_stats.stats.wisdom",
        s."live_stats.stats.diplomacy",
        sk.skulls
      FROM tbn
      LEFT JOIN tokens t ON t.contract_address = tbn.contract_address AND t.token_id = ('0x' || tbn.token_hex64)
      LEFT JOIN stats s  ON s.token_hex64 = tbn.token_hex64
      LEFT JOIN skulls sk ON sk.token_hex64 = tbn.token_hex64;
    `

    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })

    let data = await sql.json()

    let beasts: Beast[] = data.filter((data: any) => data.metadata).map((data: any) => {
      // Parse metadata JSON
      let metadata: any;
      try {
        metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      } catch (e) {
        console.error("Failed to parse beast metadata:", e, data.metadata);
        return null;
      }

      // Parse attributes array into a map
      const attrs: { [key: string]: string } = {};
      if (metadata.attributes && Array.isArray(metadata.attributes)) {
        metadata.attributes.forEach((attr: any) => {
          attrs[attr.trait_type] = attr.value;
        });
      }

      // Extract numeric token ID from composite format
      const tokenIdHex = data.token_hex64 || data.token_id.split(':')[1];
      const numericTokenId = parseInt(tokenIdHex, 16);

      let cachedBeast = cachedCollection.find((beast: Beast) => beast.token_id === numericTokenId);
      let beast: any = {
        id: Number(attrs["Beast ID"]),
        token_id: numericTokenId,
        name: attrs["Beast"].replace(" ", ""),
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
        adventurers_killed: cachedBeast?.adventurers_killed || 0,
        last_dm_death_timestamp: cachedBeast?.last_dm_death_timestamp || 0,
        last_killed_by: cachedBeast?.last_killed_by || 0,
        attack_streak: data["live_stats.attack_streak"] || 0,
        bonus_health: Math.max(cachedBeast?.bonus_health || 0, data["live_stats.bonus_health"]),
        bonus_xp: Math.max(cachedBeast?.bonus_xp || 0, data["live_stats.bonus_xp"]),
        current_health: data["live_stats.current_health"],
        extra_lives: data["live_stats.extra_lives"] || 0,
        has_claimed_potions: cachedBeast?.has_claimed_potions || Boolean(data["live_stats.has_claimed_potions"]),
        last_death_timestamp: Math.max(cachedBeast?.last_death_timestamp || 0, parseInt(data["live_stats.last_death_timestamp"], 16)),
        revival_count: Math.max(cachedBeast?.revival_count || 0, data["live_stats.revival_count"]),
        blocks_held: parseInt(data["live_stats.blocks_held"], 16) || 0,
        revival_time: 0,
        stats: {
          spirit: Math.max(cachedBeast?.stats.spirit || 0, data["live_stats.stats.spirit"]),
          luck: Math.max(cachedBeast?.stats.luck || 0, data["live_stats.stats.luck"]),
          specials: cachedBeast?.stats.specials || Boolean(data["live_stats.stats.specials"]),
          wisdom: cachedBeast?.stats.wisdom || Boolean(data["live_stats.stats.wisdom"]),
          diplomacy: cachedBeast?.stats.diplomacy || Boolean(data["live_stats.stats.diplomacy"]),
        },
        kills_claimed: Math.max(cachedBeast?.kills_claimed || 0, parseInt(data["skulls"], 16) || 0),
      }
      beast.revival_time = getBeastRevivalTime(beast);
      beast.current_health = getBeastCurrentHealth(beast)
      beast.current_level = getBeastCurrentLevel(beast.level, beast.bonus_xp)
      beast.power = (6 - beast.tier) * beast.current_level;

      let prefix = Object.keys(ITEM_NAME_PREFIXES).find((key: any) => ITEM_NAME_PREFIXES[key] === beast.prefix) || 0;
      let suffix = Object.keys(ITEM_NAME_SUFFIXES).find((key: any) => ITEM_NAME_SUFFIXES[key] === beast.suffix) || 0;
      beast.entity_hash = getEntityHash(beast.id, Number(prefix), Number(suffix));

      return beast
    })

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
