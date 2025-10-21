import { useDynamicConnector } from "@/contexts/starknet";
import { Beast } from "@/types/game";
import { ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";
import { getBeastCurrentHealth, getBeastRevivalTime } from "@/utils/beasts";
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
          attack_streak, bonus_health, bonus_xp, current_health, extra_lives,
          has_claimed_starter_kit, last_death_timestamp, "stats.luck", "stats.spirit", "stats.specials",
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
        s.revival_count,
        s.rewards_earned,
        s."stats.luck",
        s."stats.spirit",
        s."stats.specials"
      FROM tbn
      LEFT JOIN attrs a  ON a.token_id    = tbn.token_id
      LEFT JOIN stats s  ON s.token_hex64 = tbn.token_hex64;
    `

    console.log(q)
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
        revival_time: 0,
        stats: {
          spirit: Boolean(data["stats.spirit"]),
          luck: Boolean(data["stats.luck"]),
          specials: Boolean(data["stats.specials"]),
        }
      }
      beast.revival_time = getBeastRevivalTime(beast);
      beast.current_health = getBeastCurrentHealth(beast)
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

  const getBigFive = async () => {
    try {
      // Query 1: Get all beast owners (fast with index on contract_address)
      const ownersQuery = `
        SELECT 
          account_address,
          token_id
        FROM token_balances
        WHERE contract_address = '${addAddressPadding(currentNetworkConfig.beasts.toLowerCase())}'
          AND balance = '0x0000000000000000000000000000000000000000000000000000000000000001'
      `;

      // Query 2: Get all beast rewards (fast, no filtering)
      const rewardsQuery = `
        SELECT 
          token_id,
          rewards_earned
        FROM "${currentNetworkConfig.namespace}-LiveBeastStats"
        WHERE rewards_earned IS NOT NULL AND rewards_earned != '0x0'
      `;

      // Execute both queries in parallel
      const [ownersResponse, rewardsResponse] = await Promise.all([
        fetch(`${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(ownersQuery)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }),
        fetch(`${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(rewardsQuery)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })
      ]);

      const [owners, rewards] = await Promise.all([
        ownersResponse.json(),
        rewardsResponse.json()
      ]);

      // Build a map of token_id -> rewards for fast lookup
      const rewardsMap = new Map();
      rewards.forEach((beast: any) => {
        const rewardValue = parseInt(beast.rewards_earned, 16) || 0;
        if (rewardValue > 0) {
          rewardsMap.set(beast.token_id.toString(), rewardValue);
        }
      });

      // Aggregate rewards by player
      const playerRewards = new Map();
      owners.forEach((owner: any) => {
        // Extract token_id from the full token_id string (contract:token_id)
        const tokenIdPart = owner.token_id.split(':')[1];
        if (tokenIdPart) {
          // Convert hex to decimal if needed
          const tokenIdInt = tokenIdPart.startsWith('0x')
            ? parseInt(tokenIdPart, 16).toString()
            : tokenIdPart;

          const beastReward = rewardsMap.get(tokenIdInt) || 0;
          if (beastReward > 0) {
            const current = playerRewards.get(owner.account_address) || 0;
            playerRewards.set(owner.account_address, current + beastReward);
          }
        }
      });

      // Sort and get top 5
      const sortedPlayers = Array.from(playerRewards.entries())
        .map(([account_address, total_rewards]) => ({ account_address, total_rewards }))
        .sort((a, b) => b.total_rewards - a.total_rewards)
        .slice(0, 5);

      return sortedPlayers;
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
      WHERE dungeon = '${currentNetworkConfig.dungeon}'
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
    getBigFive,
    getValidAdventurers,
    getKilledBy,
    getKilledBeasts,
  };
};
