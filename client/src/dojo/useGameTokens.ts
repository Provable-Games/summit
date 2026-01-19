import { useSummitApi } from "@/api/summitApi";
import { useDynamicConnector } from "@/contexts/starknet";
import { Top5000Cutoff } from "@/contexts/Statistics";
import { Beast } from "@/types/game";
import { ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";
import { getBeastCurrentHealth, getBeastCurrentLevel, getBeastRevivalTime, getEntityHash } from "@/utils/beasts";
import { addAddressPadding } from "starknet";

export const useGameTokens = () => {
  const { currentNetworkConfig } = useDynamicConnector();
  const summitApi = useSummitApi();

  const getBeastCollection = async (accountAddress: string) => {
    const contractAddress = currentNetworkConfig.beasts;

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
    }

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

    // Step 3: Fetch stats from Summit API and metadata from Torii in parallel
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

    // Execute API calls and metadata query in parallel
    let statsData: any[] = [];
    let skullsData: any[] = [];
    let metadataData: any[] = [];

    try {
      const [statsResponse, skullsResponse, metadataResponse] = await Promise.all([
        // Fetch stats from Summit API
        summitApi.getBeastsBulk(integerIds),
        // Fetch skulls from Summit API
        summitApi.getSkullsBulk(integerIds),
        // Fetch metadata from Torii (NFT metadata still lives there)
        fetch(`${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(metadataQuery)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })
      ]);

      statsData = statsResponse.data || [];
      skullsData = skullsResponse.data || [];
      metadataData = metadataResponse.ok ? await metadataResponse.json() : [];
      metadataData = Array.isArray(metadataData) ? metadataData : [];
    } catch (error) {
      console.error("Error fetching beast collection data:", error);
      return [];
    }

    // Build lookup maps for O(1) access
    const statsMap = new Map<number, any>();
    for (const row of statsData) {
      statsMap.set(row.tokenId, row);
    }

    const skullsMap = new Map<number, string>();
    for (const row of skullsData) {
      skullsMap.set(row.beastTokenId, row.skulls);
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
        // Stats from Summit API (camelCase format, already numeric)
        attack_streak: stats.attackStreak || 0,
        bonus_health: stats.bonusHealth || 0,
        bonus_xp: stats.bonusXp || 0,
        current_health: stats.currentHealth ?? null,
        extra_lives: stats.extraLives || 0,
        has_claimed_potions: Boolean(stats.hasClaimedPotions),
        last_death_timestamp: stats.lastDeathTimestamp ? parseInt(stats.lastDeathTimestamp) : 0,
        revival_count: stats.revivalCount || 0,
        blocks_held: stats.blocksHeld || 0,
        revival_time: 0,
        spirit: stats.spirit || 0,
        luck: stats.luck || 0,
        specials: Boolean(stats.specials),
        wisdom: Boolean(stats.wisdom),
        diplomacy: Boolean(stats.diplomacy),
        // Skulls from Summit API (skulls is a string)
        kills_claimed: parseInt(skulls || "0"),
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
    if (!specialHashes || specialHashes.length === 0) {
      return [];
    }

    const BATCH_SIZE = 800;
    const allResults: any[] = [];

    try {
      for (let i = 0; i < specialHashes.length; i += BATCH_SIZE) {
        const batch = specialHashes.slice(i, i + BATCH_SIZE);
        if (batch.length === 0) continue;

        const valuesClause = batch
          .map((hash: string) => `('${addAddressPadding(hash.toLowerCase())}')`)
          .join(',');

        const q = `
          WITH special(entity_hash) AS (
            VALUES ${valuesClause}
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
        `;

        const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
        const sql = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        });

        const data = await sql.json();
        if (Array.isArray(data)) {
          allResults.push(...data);
        }
      }

      return allResults;
    } catch (error) {
      console.error("Error getting dungeon stats:", error);
      return [];
    }
  }

  const countAliveBeasts = async () => {
    try {
      const stats = await summitApi.getBattleStats();
      return stats.activeBeasts24h;
    } catch (error) {
      console.error("Error counting beasts:", error);
      return 0;
    }
  }

  const countRegisteredBeasts = async () => {
    try {
      const response = await summitApi.getBeasts({ limit: 1 });
      return response.pagination.total;
    } catch (error) {
      console.error("Error counting beasts:", error);
      return 0;
    }
  }

  const getLeaderboard = async () => {
    try {
      const response = await summitApi.getRewardsLeaderboard(500);
      return response.data.map((row) => ({
        owner: row.owner,
        amount: row.amount,
      }));
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  }

  const getValidAdventurers = async (owner: string) => {
    let namespace = "relayer_0_0_1"

    let q = `
      SELECT o.token_id, tm.minted_by, tm.id, tm.game_over, ce.adventurer_id, s.score
      FROM '${namespace}-TokenMetadataUpdate' tm
      LEFT JOIN '${namespace}-TokenScoreUpdate' s on s.id = tm.id
      LEFT JOIN '${namespace}-OwnersUpdate' o ON o.token_id = tm.id
      LEFT JOIN '${namespace}-MinterRegistryUpdate' mr ON mr.id = tm.minted_by
      LEFT JOIN '${currentNetworkConfig.namespace}-CorpseEvent' ce ON ce.adventurer_id = tm.id
      WHERE o.owner = "${addAddressPadding(owner.toLowerCase())}"
      AND mr.minter_address = "${addAddressPadding(currentNetworkConfig.dungeon)}"
      AND tm.game_over = 1
      AND ce.adventurer_id IS NULL
    `
    const url = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(q)}`;
    const sql = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })

    let data = await sql.json()
    return data.map((row: any) => ({
      token_id: parseInt(row.token_id, 16),
      score: parseInt(row.score, 16),
    }))
  }

  const getTop5000Cutoff = async (): Promise<Top5000Cutoff | null> => {
    try {
      // Get the 5000th beast (offset 4999 with limit 1)
      const response = await summitApi.getBeasts({
        sortBy: "blocks_held",
        sortOrder: "desc",
        limit: 1,
        offset: 4999,
      });

      if (response.data.length === 0 || response.pagination.total < 5000) {
        return {
          blocks_held: 0,
          bonus_xp: 0,
          last_death_timestamp: 0,
        };
      }

      const beast = response.data[0];
      return {
        blocks_held: beast.blocksHeld,
        bonus_xp: beast.bonusXp,
        last_death_timestamp: parseInt(beast.lastDeathTimestamp),
      };
    } catch (error) {
      console.error("Error getting top 5000 cutoff:", error);
      return null;
    }
  }

  const countBeastsWithBlocksHeld = async () => {
    try {
      // Use the beasts API with a filter - get just count via pagination
      const response = await summitApi.getBeasts({
        sortBy: "blocks_held",
        sortOrder: "desc",
        limit: 1,
      });
      return response.pagination.total;
    } catch (error) {
      console.error("Error counting beasts with blocks_held:", error);
      return 0;
    }
  };

  const getTopBeastsByBlocksHeld = async (limit: number, offset: number) => {
    try {
      const response = await summitApi.getBeasts({
        sortBy: "blocks_held",
        sortOrder: "desc",
        limit,
        offset,
      });

      // Map API response to expected format
      return response.data.map((beast) => ({
        token_id: beast.tokenId,
        blocks_held: beast.blocksHeld,
        bonus_xp: beast.bonusXp,
        last_death_timestamp: beast.lastDeathTimestamp,
      }));
    } catch (error) {
      console.error("Error getting top beasts by blocks_held:", error);
      return [];
    }
  }

  const getTopBeastsWithMetadata = async (limit: number, offset: number) => {
    try {
      const contractAddress = currentNetworkConfig.beasts;

      // Step 1: Get the top beasts by blocks_held (simple query)
      const topBeastsQuery = `
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

      const topBeastsUrl = `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(topBeastsQuery)}`;
      const topBeastsResponse = await fetch(topBeastsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const topBeastsData = await topBeastsResponse.json();
      if (!Array.isArray(topBeastsData) || topBeastsData.length === 0) {
        return [];
      }

      // Step 2: Get token IDs and convert to hex for metadata lookup
      const tokenIds = topBeastsData.map(row => parseInt(row.token_id));
      const tokenHexMap = new Map<number, string>();
      
      tokenIds.forEach(tokenId => {
        const hexId = tokenId.toString(16);
        tokenHexMap.set(tokenId, hexId);
      });

      // Step 3: Get metadata for these tokens (use proper hex format with padding)
      const hexIds = Array.from(tokenHexMap.values());
      const paddedHexIds = hexIds.map(hex => {
        // Pad to 64 characters (32 bytes)
        const padded = hex.padStart(64, '0');
        return `0x${padded}`;
      });

      const metadataQuery = `
        SELECT token_id, metadata
        FROM tokens
        WHERE contract_address = '${contractAddress}'
          AND token_id IN (${paddedHexIds.map(hex => `'${hex}'`).join(',')})
      `;

      // Step 4: Get owners for these tokens
      const ownerQuery = `
        SELECT 
          token_id,
          account_address,
          SUBSTR(token_id, INSTR(token_id, ':')+1) AS extracted_hex
        FROM token_balances
        WHERE contract_address = '${contractAddress}'
          AND balance = '0x0000000000000000000000000000000000000000000000000000000000000001'
          AND SUBSTR(token_id, INSTR(token_id, ':')+1) IN (${paddedHexIds.map(hex => `'${hex}'`).join(',')})
      `;

      // Execute metadata and owner queries in parallel
      const [metadataResponse, ownerResponse] = await Promise.all([
        fetch(`${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(metadataQuery)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }),
        fetch(`${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(ownerQuery)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })
      ]);

      const [metadataData, ownerData] = await Promise.all([
        metadataResponse.ok ? metadataResponse.json() : [],
        ownerResponse.ok ? ownerResponse.json() : []
      ]);

      // Create lookup maps
      const metadataMap = new Map<string, any>();
      (Array.isArray(metadataData) ? metadataData : []).forEach((row: any) => {
        if (row.metadata && row.token_id) {
          const tokenIdNum = parseInt(row.token_id, 16);
          metadataMap.set(tokenIdNum.toString(), row.metadata);
        }
      });

      const ownerMap = new Map<string, string>();
      (Array.isArray(ownerData) ? ownerData : []).forEach((row: any) => {
        if (row.extracted_hex && row.account_address) {
          // Remove 0x prefix if present and parse
          const cleanHex = row.extracted_hex.replace(/^0x/, '');
          const tokenIdNum = parseInt(cleanHex, 16);
          ownerMap.set(tokenIdNum.toString(), row.account_address);
        }
      });

      // Step 5: Combine all data
      const enrichedData = topBeastsData.map(row => {
        const tokenId = parseInt(row.token_id);
        const tokenIdStr = tokenId.toString();
        const rawMetadata = metadataMap.get(tokenIdStr);
        const owner = ownerMap.get(tokenIdStr);

        let beastName = '';
        let prefix = '';
        let suffix = '';

        if (rawMetadata) {
          try {
            const metadata = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : rawMetadata;
            
            // Parse attributes array into a map
            const attrs: { [key: string]: string } = {};
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
              metadata.attributes.forEach((attr: any) => {
                attrs[attr.trait_type] = attr.value;
              });
            }

            beastName = attrs["Beast"]?.replace(" ", "") || "";
            prefix = attrs["Prefix"] || "";
            suffix = attrs["Suffix"] || "";
          } catch (e) {
            console.error("Failed to parse beast metadata:", e);
          }
        }

        return {
          token_id: tokenId,
          blocks_held: parseInt(row.blocks_held, 16) || 0,
          bonus_xp: parseInt(row.bonus_xp, 16) || 0,
          last_death_timestamp: parseInt(row.last_death_timestamp, 16) || 0,
          owner: owner || null,
          beast_name: beastName,
          prefix: prefix,
          suffix: suffix,
          full_name: prefix && suffix && beastName ? `"${prefix} ${suffix}" ${beastName}` : beastName || `Beast #${tokenId}`
        };
      });

      return enrichedData;
    } catch (error) {
      console.error("Error getting top beasts with metadata:", error);
      return [];
    }
  }

  const getDiplomacy = async (beast: Beast) => {
    try {
      if (!beast.specials_hash) {
        return {
          specials_hash: beast.specials_hash || "",
          total_power: 0,
          beast_token_ids: [],
        };
      }
      return await summitApi.getDiplomacy(beast.specials_hash);
    } catch (error) {
      return {
        specials_hash: beast.specials_hash || "",
        total_power: 0,
        beast_token_ids: [],
      };
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
    getTopBeastsWithMetadata,
    countBeastsWithBlocksHeld,
    getDungeonStats
  };
};
