import { useDynamicConnector } from "@/contexts/starknet";
import { Beast } from "@/types/game";
import { getBeastCurrentHealth } from "@/utils/beasts";
import { addAddressPadding } from "starknet";


export const useGameTokens = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const getBeastCollection = async (accountAddress: string) => {
    let q = `
      WITH tbf AS (
        SELECT tb.token_id, tb.account_address, tb.contract_address, tb.balance
        FROM token_balances tb
        WHERE tb.account_address = '${addAddressPadding(accountAddress.toLowerCase())}'
          AND tb.contract_address = '${addAddressPadding(currentNetworkConfig.beasts.toLowerCase())}'
          AND tb.balance = '0x0000000000000000000000000000000000000000000000000000000000000001'
        LIMIT 1000
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
          attack_streak, bonus_health, bonus_xp, current_health, extra_lives,
          has_claimed_starter_kit, last_death_timestamp, last_killed_by, num_deaths,
          revival_count, rewards_earned
        FROM "${currentNetworkConfig.namespace}-LiveBeastStats"
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
        s.attack_streak,
        s.bonus_health,
        s.bonus_xp,
        s.current_health,
        s.extra_lives,
        s.has_claimed_starter_kit,
        s.last_death_timestamp,
        s.last_killed_by,
        s.num_deaths,
        s.revival_count,
        s.rewards_earned
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

    let beasts: Beast[] = data.map((data: any) => {
      let beast = {
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
        attack_streak: data.attack_streak || 0,
        bonus_health: data.bonus_health || 0,
        bonus_xp: data.bonus_xp || 0,
        current_health: data.current_health,
        extra_lives: data.extra_lives || 0,
        has_claimed_starter_kit: data.has_claimed_starter_kit || 0,
        last_death_timestamp: parseInt(data.last_death_timestamp, 16) || 0,
        last_killed_by: data.last_killed_by || 0,
        num_deaths: data.num_deaths || 0,
        revival_count: data.revival_count || 0,
        rewards_earned: parseInt(data.rewards_earned, 16) || 0,
      }
      beast.current_health = getBeastCurrentHealth(beast)
      return beast
    })

    return beasts
  }

  const countRegisteredBeasts = async () => {
    let url = `${currentNetworkConfig.toriiUrl}/sql?query=
      SELECT COUNT(*) as count FROM "${currentNetworkConfig.namespace}-LiveBeastStats"
    `

    try {
      const sql = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      })

      let data = await sql.json()
      return data[0].count
    } catch (error) {
      console.error("Error counting beasts:", error);
      return 0;
    }
  }

  const getBigFive = async () => {
    let q = `
      WITH top5 AS (
        SELECT 
          token_id,
          rewards_earned,
          LOWER(printf('%064x', CAST(token_id AS INTEGER))) AS token_hex64
        FROM "${currentNetworkConfig.namespace}-LiveBeastStats"
        ORDER BY rewards_earned DESC
        LIMIT 5
      ),
      attrs AS (
        SELECT
          ta.token_hex64,
          MAX(CASE WHEN ta.trait_name = 'Beast'  THEN ta.trait_value END) AS "Beast",
          MAX(CASE WHEN ta.trait_name = 'Prefix' THEN ta.trait_value END) AS "Prefix",
          MAX(CASE WHEN ta.trait_name = 'Suffix' THEN ta.trait_value END) AS "Suffix"
        FROM (
          SELECT
            LOWER(CASE WHEN SUBSTR(suf,1,2)='0x' THEN SUBSTR(suf,3) ELSE suf END) AS token_hex64,
            trait_name,
            trait_value
          FROM (
            SELECT
              SUBSTR(token_id, INSTR(token_id, ':')+1) AS suf,
              trait_name,
              trait_value
            FROM token_attributes
          )
        ) AS ta
        WHERE ta.trait_name IN ('Beast','Prefix','Suffix')
        GROUP BY ta.token_hex64
      )
      SELECT
        t.token_id,
        a."Prefix",
        a."Beast",
        a."Suffix",
        t.rewards_earned
      FROM top5 AS t
      LEFT JOIN attrs AS a
        ON a.token_hex64 = t.token_hex64
      ORDER BY t.rewards_earned DESC;
    `

    try {
      const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
      const sql = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
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

  return {
    getBeastCollection,
    countRegisteredBeasts,
    getBigFive,
    getValidAdventurers,
  };
};
