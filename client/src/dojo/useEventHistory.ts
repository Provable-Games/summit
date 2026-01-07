import { useDynamicConnector } from "@/contexts/starknet";
import { useState, useCallback, useEffect } from "react";
import { addAddressPadding } from "starknet";
import { lookupAddressNames } from "@/utils/addressNameCache";

export interface BattleEvent {
  type: "battle";
  attacking_beast_token_id: number;
  attacking_beast_owner: string;
  attacking_beast_id: number;
  shiny: number;
  animated: number;
  defending_beast_token_id: number;
  attack_damage: number;
  critical_attack_damage: number;
  counter_attack_damage: number;
  critical_counter_attack_damage: number;
  timestamp: number;
}

export interface PoisonEvent {
  type: "poison";
  beast_token_id: number;
  count: number;
  player: string;
  timestamp: number;
}

export interface DiplomacyEvent {
  type: "diplomacy";
  specials_hash: string;
  beast_token_ids: number[];
  total_power: number;
  timestamp: number;
}

export interface SummitEvent {
  type: "summit";
  taken_at: number;
  beast_id: number;
  beast_level: number;
  beast_health: number;
  beast_prefix: number;
  beast_suffix: number;
  beast_shiny: number;
  beast_animated: number;
  owner: string;
  timestamp: number;
}

export interface RewardEvent {
  type: "reward";
  block_number: number;
  beast_token_id: number;
  owner: string;
  amount: number;
  timestamp: number;
}

export type GameEvent = BattleEvent | PoisonEvent | DiplomacyEvent | SummitEvent | RewardEvent;

interface UseEventHistoryOptions {
  limit?: number;
  offset?: number;
  beastTokenId?: number;
  playerAddress?: string;
  eventTypes?: ("battle" | "poison" | "diplomacy" | "summit" | "reward")[];
  enabled?: boolean;
}

export const useEventHistory = (options: UseEventHistoryOptions = {}) => {
  const { currentNetworkConfig } = useDynamicConnector();
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [playerNames, setPlayerNames] = useState<{ [address: string]: string | null }>({});
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const {
    limit = 50,
    offset = 0,
    beastTokenId,
    playerAddress,
    eventTypes = ["battle", "poison", "diplomacy", "summit", "reward"],
    enabled = true
  } = options;

  const fetchEvents = useCallback(async () => {
    if (!enabled || !currentNetworkConfig?.toriiUrl || !currentNetworkConfig?.namespace) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const eventPromises: Promise<GameEvent[]>[] = [];

      // Fetch BattleEvents
      if (eventTypes.includes("battle")) {
        const battleQuery = `
          SELECT 
            attacking_beast_token_id,
            attacking_beast_owner,
            attacking_beast_id,
            shiny,
            animated,
            defending_beast_token_id,
            attack_damage,
            critical_attack_damage,
            counter_attack_damage,
            critical_counter_attack_damage,
            internal_created_at
          FROM "${currentNetworkConfig.namespace}-BattleEvent"
          ${beastTokenId ? `WHERE (attacking_beast_token_id = ${beastTokenId} OR defending_beast_token_id = ${beastTokenId})` : ""}
          ORDER BY internal_created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
        
        const battlePromise = fetch(
          `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(battleQuery)}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        )
          .then(res => res.json())
          .then(data => 
            (Array.isArray(data) ? data : []).map((row: any) => ({
              type: "battle" as const,
              attacking_beast_token_id: parseInt(row.attacking_beast_token_id),
              attacking_beast_owner: row.attacking_beast_owner,
              attacking_beast_id: parseInt(row.attacking_beast_id),
              shiny: parseInt(row.shiny),
              animated: parseInt(row.animated),
              defending_beast_token_id: parseInt(row.defending_beast_token_id),
              attack_damage: parseInt(row.attack_damage),
              critical_attack_damage: parseInt(row.critical_attack_damage),
              counter_attack_damage: parseInt(row.counter_attack_damage),
              critical_counter_attack_damage: parseInt(row.critical_counter_attack_damage),
              timestamp: new Date(row.internal_created_at).getTime()
            }))
          );
        eventPromises.push(battlePromise);
      }

      // Fetch PoisonEvents
      if (eventTypes.includes("poison")) {
        const poisonQuery = `
          SELECT 
            beast_token_id,
            count,
            player,
            internal_created_at
          FROM "${currentNetworkConfig.namespace}-PoisonEvent"
          ${beastTokenId ? `WHERE beast_token_id = ${beastTokenId}` : ""}
          ${playerAddress ? `${beastTokenId ? 'AND' : 'WHERE'} player = '${addAddressPadding(playerAddress.toLowerCase())}'` : ""}
          ORDER BY internal_created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
        
        const poisonPromise = fetch(
          `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(poisonQuery)}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        )
          .then(res => res.json())
          .then(data => 
            (Array.isArray(data) ? data : []).map((row: any) => ({
              type: "poison" as const,
              beast_token_id: parseInt(row.beast_token_id),
              count: parseInt(row.count),
              player: row.player,
              timestamp: new Date(row.internal_created_at).getTime()
            }))
          );
        eventPromises.push(poisonPromise);
      }

      // Fetch DiplomacyEvents
      if (eventTypes.includes("diplomacy")) {
        const diplomacyQuery = `
          SELECT 
            specials_hash,
            beast_token_ids,
            total_power,
            internal_created_at
          FROM "${currentNetworkConfig.namespace}-DiplomacyEvent"
          ORDER BY internal_created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
        
        const diplomacyPromise = fetch(
          `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(diplomacyQuery)}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        )
          .then(res => res.json())
          .then(data => 
            (Array.isArray(data) ? data : []).map((row: any) => ({
              type: "diplomacy" as const,
              specials_hash: row.specials_hash,
              beast_token_ids: JSON.parse(row.beast_token_ids),
              total_power: parseInt(row.total_power),
              timestamp: new Date(row.internal_created_at).getTime()
            }))
          );
        eventPromises.push(diplomacyPromise);
      }

      // Fetch SummitEvents
      if (eventTypes.includes("summit")) {
        const summitQuery = `
          SELECT 
            taken_at,
            "beast.id" as beast_id,
            "beast.level" as beast_level,
            "beast.health" as beast_health,
            "beast.prefix" as beast_prefix,
            "beast.suffix" as beast_suffix,
            "beast.shiny" as beast_shiny,
            "beast.animated" as beast_animated,
            owner,
            internal_created_at
          FROM "${currentNetworkConfig.namespace}-SummitEvent"
          ${playerAddress ? `WHERE owner = '${addAddressPadding(playerAddress.toLowerCase())}'` : ""}
          ORDER BY internal_created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
        
        const summitPromise = fetch(
          `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(summitQuery)}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        )
          .then(res => res.json())
          .then(data => 
            (Array.isArray(data) ? data : []).map((row: any) => ({
              type: "summit" as const,
              taken_at: parseInt(row.taken_at, 16),
              beast_id: parseInt(row.beast_id),
              beast_level: parseInt(row.beast_level),
              beast_health: parseInt(row.beast_health),
              beast_prefix: parseInt(row.beast_prefix),
              beast_suffix: parseInt(row.beast_suffix),
              beast_shiny: parseInt(row.beast_shiny),
              beast_animated: parseInt(row.beast_animated),
              owner: row.owner,
              timestamp: new Date(row.internal_created_at).getTime()
            }))
          );
        eventPromises.push(summitPromise);
      }

      // Fetch RewardEvents
      if (eventTypes.includes("reward")) {
        const rewardQuery = `
          SELECT 
            block_number,
            beast_token_id,
            owner,
            amount,
            internal_created_at
          FROM "${currentNetworkConfig.namespace}-RewardEvent"
          ${beastTokenId ? `WHERE beast_token_id = ${beastTokenId}` : ""}
          ${playerAddress ? `${beastTokenId ? 'AND' : 'WHERE'} owner = '${addAddressPadding(playerAddress.toLowerCase())}'` : ""}
          ORDER BY internal_created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
        
        const rewardPromise = fetch(
          `${currentNetworkConfig.toriiUrl}/sql?query=${encodeURIComponent(rewardQuery)}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        )
          .then(res => res.json())
          .then(data => 
            (Array.isArray(data) ? data : []).map((row: any) => ({
              type: "reward" as const,
              block_number: parseInt(row.block_number, 16),
              beast_token_id: parseInt(row.beast_token_id),
              owner: row.owner,
              amount: parseInt(row.amount),
              timestamp: new Date(row.internal_created_at).getTime()
            }))
          );
        eventPromises.push(rewardPromise);
      }

      // Fetch all events in parallel
      const allEvents = await Promise.all(eventPromises);
      const mergedEvents = allEvents.flat();
      
      // Sort by timestamp descending
      mergedEvents.sort((a, b) => b.timestamp - a.timestamp);
      
      // Take only the requested limit
      const limitedEvents = mergedEvents.slice(0, limit);
      
      // Extract all unique addresses from events
      const addresses = new Set<string>();
      limitedEvents.forEach(event => {
        if ('attacking_beast_owner' in event && event.attacking_beast_owner) {
          addresses.add(event.attacking_beast_owner);
        }
        if ('player' in event && event.player) {
          addresses.add(event.player);
        }
        if ('owner' in event && event.owner) {
          addresses.add(event.owner);
        }
      });

      // Pre-load all player names before setting events
      if (addresses.size > 0) {
        try {
          const nameMap = await lookupAddressNames(Array.from(addresses));
          const namesObject: { [address: string]: string | null } = {};
          nameMap.forEach((name, address) => {
            namesObject[address] = name;
          });
          setPlayerNames(namesObject);
        } catch (error) {
          console.error("Error loading player names:", error);
          setPlayerNames({});
        }
      }
      
      setEvents(limitedEvents);
      setHasMore(mergedEvents.length === limit);
    } catch (error) {
      console.error("Error fetching event history:", error);
      setError("Failed to load events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, JSON.stringify(eventTypes)]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    playerNames,
    loading,
    hasMore,
    error,
    refetch: fetchEvents
  };
};