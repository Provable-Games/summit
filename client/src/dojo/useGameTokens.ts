import { useDynamicConnector } from "@/contexts/starknet";
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
          AND tb.contract_address = '${addAddressPadding(currentNetworkConfig.beasts.toLowerCase())}'
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
          "live_stats.revival_count", "live_stats.rewards_earned", "live_stats.stats.wisdom", "live_stats.stats.diplomacy", "live_stats.kills_claimed"
        FROM "${currentNetworkConfig.namespace}-LiveBeastStatsEvent"
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
        s."live_stats.rewards_earned",
        s."live_stats.stats.luck",
        s."live_stats.stats.spirit",
        s."live_stats.stats.specials",
        s."live_stats.stats.wisdom",
        s."live_stats.stats.diplomacy",
        s."live_stats.kills_claimed"
      FROM tbn
      LEFT JOIN attrs a  ON a.token_id    = tbn.token_id
      LEFT JOIN stats s  ON s.token_hex64 = tbn.token_hex64;
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
        has_claimed_potions: data["live_stats.has_claimed_potions"] || 0,
        last_death_timestamp: Math.max(cachedBeast?.last_death_timestamp || 0, parseInt(data["live_stats.last_death_timestamp"], 16)),
        revival_count: Math.max(cachedBeast?.revival_count || 0, data["live_stats.revival_count"]),
        rewards_earned: parseInt(data["live_stats.rewards_earned"], 16) || 0,
        revival_time: 0,
        stats: {
          spirit: cachedBeast?.stats.spirit || data["live_stats.stats.spirit"],
          luck: cachedBeast?.stats.luck || data["live_stats.stats.luck"],
          specials: cachedBeast?.stats.specials || Boolean(data["live_stats.stats.specials"]),
          wisdom: cachedBeast?.stats.wisdom || Boolean(data["live_stats.stats.wisdom"]),
          diplomacy: cachedBeast?.stats.diplomacy || Boolean(data["live_stats.stats.diplomacy"]),
        },
        kills_claimed: cachedBeast?.kills_claimed || data["live_stats.kills_claimed"] || 0,
      }
      beast.revival_time = getBeastRevivalTime(beast);
      beast.current_health = getBeastCurrentHealth(beast)
      beast.current_level = getBeastCurrentLevel(beast.level, beast.bonus_xp)
      beast.power = (6 - beast.tier) * beast.current_level;
      return beast
    })

    return beasts
  }

  const countRegisteredBeasts = async () => {
    // Calculate timestamp for 24 hours ago (in seconds)
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

    let q = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN CAST(last_death_timestamp AS INTEGER) < ${twentyFourHoursAgo} THEN 1 END) as alive_count
      FROM "${currentNetworkConfig.namespace}-LiveBeastStats"
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
      return {
        total: data[0].total_count,
        alive: data[0].alive_count
      }
    } catch (error) {
      console.error("Error counting beasts:", error);
      return { total: 0, alive: 0 };
    }
  }

  const getLeaderboard = async () => {
    const q = `
        SELECT owner, SUM(amount) AS amount
        FROM "${currentNetworkConfig.namespace}-RewardEvent"
        GROUP BY owner
        ORDER BY amount DESC
      `;

    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    try {
      const sql = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      })
      let data = await sql.json()
      return data
    } catch (error) {
      console.error("Error getting big five:", error);
      return [];
    }
  }

  const getValidAdventurers = async (adventurerIds: number[]) => {
    // Convert integer IDs to hex format for database query
    const hexIds = adventurerIds.map(id => `0x${id.toString(16).padStart(16, '0')}`)

    let q = `
      SELECT adventurer_id
      FROM "${currentNetworkConfig.namespace}-AdventurerConsumed"
      WHERE adventurer_id IN (${hexIds.map(id => `'${id}'`).join(',')})
      LIMIT 1000;
    `

    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })

    let data = await sql.json()
    const eatenHexIds = data.map((row: any) => row.adventurer_id)
    const validIds = adventurerIds.filter(id => {
      const hexId = `0x${id.toString(16).padStart(16, '0')}`
      return !eatenHexIds.includes(hexId)
    })
    return validIds
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

  return {
    getBeastCollection,
    countRegisteredBeasts,
    getLeaderboard,
    getValidAdventurers,
    getKilledBy,
    getKilledBeasts,
  };
};
