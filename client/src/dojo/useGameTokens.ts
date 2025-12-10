import { useDynamicConnector } from "@/contexts/starknet";
import { Top5000Cutoff } from "@/contexts/Statistics";
import { Beast } from "@/types/game";
import { ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";
import { getBeastCurrentHealth, getBeastCurrentLevel, getBeastRevivalTime } from "@/utils/beasts";
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
      attrs AS (
        SELECT
          ta.token_id,
          MAX(CASE WHEN ta.trait_name='Beast'  THEN ta.trait_value END) AS "Beast",
          MAX(CASE WHEN ta.trait_name='Type'   THEN ta.trait_value END) AS "Type",
          MAX(CASE WHEN ta.trait_name='Prefix' THEN ta.trait_value END) AS "Prefix",
          MAX(CASE WHEN ta.trait_name='Suffix' THEN ta.trait_value END) AS "Suffix",
          MAX(CASE WHEN ta.trait_name='Token ID'             THEN ta.trait_value END) AS "Token ID",
          MAX(CASE WHEN ta.trait_name='Beast ID'             THEN ta.trait_value END) AS "Beast ID",
          MAX(CASE WHEN ta.trait_name='Tier'                 THEN ta.trait_value END) AS "Tier",
          MAX(CASE WHEN ta.trait_name='Level'                THEN ta.trait_value END) AS "Level",
          MAX(CASE WHEN ta.trait_name='Health'               THEN ta.trait_value END) AS "Health",
          MAX(CASE WHEN ta.trait_name='Power'                THEN ta.trait_value END) AS "Power",
          MAX(CASE WHEN ta.trait_name='Rank'                 THEN ta.trait_value END) AS "Rank",
          MAX(CASE WHEN ta.trait_name='Adventurers Killed'   THEN ta.trait_value END) AS "Adventurers Killed",
          MAX(CASE WHEN ta.trait_name='Last Death Timestamp' THEN ta.trait_value END) AS "Last Death Timestamp",
          MAX(CASE WHEN ta.trait_name='Shiny'                THEN ta.trait_value END) AS "Shiny",
          MAX(CASE WHEN ta.trait_name='Animated'             THEN ta.trait_value END) AS "Animated"
        FROM token_attributes AS ta
        JOIN tbf ON tbf.token_id = ta.token_id
        GROUP BY ta.token_id
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
        tbn.account_address,
        tbn.contract_address,
        tbn.balance,
        a."Token ID",
        a."Beast ID",
        a."Beast",
        a."Type",
        a."Tier",
        a."Prefix",
        a."Suffix",
        a."Level",
        a."Health",
        a."Power",
        a."Rank",
        a."Adventurers Killed",
        a."Last Death Timestamp",
        a."Shiny",
        a."Animated",
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
      LEFT JOIN attrs a  ON a.token_id    = tbn.token_id
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

    let beasts: Beast[] = data.filter((data: any) => data["Beast"]).map((data: any) => {
      let cachedBeast = cachedCollection.find((beast: Beast) => beast.token_id === Number(data["Token ID"]));
      let beast: any = {
        id: Number(data["Beast ID"]),
        token_id: Number(data["Token ID"]),
        name: data["Beast"].replace(" ", ""),
        level: Number(data["Level"]),
        health: Number(data["Health"]),
        prefix: data["Prefix"],
        suffix: data["Suffix"],
        power: Number(data["Power"]),
        tier: Number(data["Tier"]),
        type: data["Type"],
        shiny: Number(data["Shiny"]),
        animated: Number(data["Animated"]),
        rank: Number(data["Rank"]),
        adventurers_killed: Number(data["Adventurers Killed"]),
        last_dm_death_timestamp: Number(data["Last Death Timestamp"]),
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
      return beast
    })

    return beasts
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
    console.log("q", q);
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
      WHERE internal_created_at > '2025-12-10 16:23:00'
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

      console.log("leaderboard", leaderboard);
      return leaderboard;
    } catch (error) {
      console.error("Error getting big five:", error);
      return [];
    }
  }

  const getKilledBy = async (beast: Beast) => {
    let prefix =
      Object.keys(ITEM_NAME_PREFIXES).find(
        (key: any) => ITEM_NAME_PREFIXES[key] === beast.prefix
      ) || 0;
    let suffix =
      Object.keys(ITEM_NAME_SUFFIXES).find(
        (key: any) => ITEM_NAME_SUFFIXES[key] === beast.suffix
      ) || 0;

    let q = `
      SELECT killed_by
      FROM "ls_0_0_9-CollectableEntity"
      WHERE dungeon = '${currentNetworkConfig.dungeon}' AND killed_by != "0x0000000000000000"
      AND id = ${beast.id} AND suffix = ${suffix} AND prefix = ${prefix}
      LIMIT 1000;
    `

    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    let data = await sql.json()
    return data.map((row: any) => parseInt(row.killed_by, 16))
  }

  const getKilledBeasts = async (adventurer_id: number) => {
    let q = `
      SELECT *
      FROM "ls_0_0_9-CollectableEntity"
      WHERE dungeon = '${currentNetworkConfig.dungeon}'
      AND killed_by = '0x${adventurer_id.toString(16).padStart(16, '0')}'
      LIMIT 1000;
    `

    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    let data = await sql.json()
    return data
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
      WHERE specials_hash = ${beast.specials_hash}
    `
    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    let data = await sql.json()

    if (!data || data.length === 0) {
      return {
        specials_hash: beast.specials_hash,
        total_power: 0,
        beast_token_ids: [],
      }
    }

    return {
      specials_hash: beast.specials_hash,
      total_power: data[0].total_power,
      beast_token_ids: data[0].beast_token_ids,
    }
  }

  return {
    getBeastCollection,
    countRegisteredBeasts,
    getLeaderboard,
    getKilledBy,
    getKilledBeasts,
    getValidAdventurers,
    countAliveBeasts,
    getTop5000Cutoff,
    getDiplomacy,
    getTopBeastsByBlocksHeld,
    countBeastsWithBlocksHeld,
  };
};
