import { useStarknetApi } from "@/api/starknet";
import { useSummitApi } from "@/api/summitApi";
import { useSound } from "@/contexts/sound";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useWebSocket, SummitData, EventData } from "@/hooks/useWebSocket";
import { useAutopilotStore } from "@/stores/autopilotStore";
import { useGameStore } from "@/stores/gameStore";
import { BattleEvent, Beast, Diplomacy, GameAction, SpectatorBattleEvent, Summit } from "@/types/game";
import {
  applyPoisonDamage,
  getBeastCurrentHealth,
  getBeastCurrentLevel,
  getBeastDetails,
  getBeastRevivalTime,
} from "@/utils/beasts";
import { ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useController } from "./controller";
import { useDynamicConnector } from "./starknet";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<boolean>;
  actionFailed: number;
  setPauseUpdates: (pause: boolean) => void;
  pauseUpdates: boolean;
}

export const START_TIMESTAMP = 1760947200;
export const TERMINAL_BLOCK = 7000000;

// Maximum number of seen transaction hashes to keep (LRU-style)
const MAX_SEEN_TX_HASHES = 100;

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { currentNetworkConfig } = useDynamicConnector();
  const {
    summit,
    setSummit,
    setAttackInProgress,
    collection,
    setCollection,
    setBattleEvents,
    setSpectatorBattleEvents,
    setApplyingPotions,
    setAppliedExtraLifePotions,
    setSelectedBeasts,
  } = useGameStore();
  const {
    setRevivePotionsUsed,
    setAttackPotionsUsed,
    setExtraLifePotionsUsed,
    setPoisonPotionsUsed,
  } = useAutopilotStore();
  const { getSummitData } = useStarknetApi();
  const { getDiplomacy } = useSummitApi();
  const {
    executeAction,
    attack,
    feed,
    claimBeastReward,
    claimCorpses,
    claimSkulls,
    addExtraLife,
    applyStatPoints,
    applyPoison,
  } = useSystemCalls();
  const { tokenBalances, setTokenBalances } = useController();
  const { play } = useSound();

  const [nextSummit, setNextSummit] = useState<Summit | null>(null);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [pauseUpdates, setPauseUpdates] = useState(false);

  // Track seen transaction hashes for deduplication of optimistic broadcasts
  const seenTxHashesRef = useRef<Set<string>>(new Set());

  /**
   * Check if a transaction hash has been seen and mark it as seen.
   * Returns true if this is the first time seeing this hash, false if duplicate.
   * Maintains LRU-style cleanup to limit memory usage.
   */
  const markTxSeen = (txHash: string | undefined): boolean => {
    if (!txHash) return true; // No hash to dedupe, process the event

    if (seenTxHashesRef.current.has(txHash)) {
      console.log("[GameDirector] Skipping duplicate event:", txHash.slice(0, 10) + "...");
      return false;
    }

    // Add to seen set
    seenTxHashesRef.current.add(txHash);

    // LRU-style cleanup: if over limit, remove oldest entries
    if (seenTxHashesRef.current.size > MAX_SEEN_TX_HASHES) {
      const entries = Array.from(seenTxHashesRef.current);
      const toRemove = entries.slice(0, entries.length - MAX_SEEN_TX_HASHES);
      toRemove.forEach(hash => seenTxHashesRef.current.delete(hash));
    }

    return true;
  };

  const handleSummit = (data: SummitData) => {
    // Deduplicate based on transaction_hash
    if (!markTxSeen(data.transaction_hash)) {
      return;
    }

    console.log("[GameDirector] Summit update:", data);

    const current_level = getBeastCurrentLevel(data.level, data.bonus_xp);
    const sameBeast = summit?.beast.token_id === data.token_id;

    // If summit beast changed and we owned it, mark it as dead in our collection
    if (!sameBeast && summit?.beast.token_id) {
      if (collection.some(b => b.token_id === summit.beast.token_id)) {
        const now = Math.floor(Date.now() / 1000);
        setCollection(prevCollection =>
          prevCollection.map(beast =>
            beast.token_id === summit.beast.token_id
              ? { ...beast, last_death_timestamp: now, current_health: 0 }
              : beast
          )
        );
      }
    }

    setNextSummit({
      beast: {
        ...data,
        ...getBeastDetails(data.beast_id, data.prefix, data.suffix, current_level),
        id: data.beast_id,
        current_level,
        revival_time: 0,
        kills_claimed: 0,
      } as Beast,
      owner: data.owner,
      taken_at: sameBeast ? summit.taken_at : data.block_number,
      poison_count: sameBeast ? summit.poison_count : 0,
      poison_timestamp: sameBeast ? summit.poison_timestamp : 0,
    });
  };

  const handleEvent = (data: EventData) => {
    // Deduplicate based on transaction_hash
    if (!markTxSeen(data.transaction_hash)) {
      return;
    }

    console.log("[GameDirector] Event:", data.category, data.sub_category, data.data);

    const { category, sub_category, data: eventData } = data;

    // Handle Battle events
    if (category === "Battle") {
      if (sub_category === "BattleEvent") {
        // Add to spectator battle events for activity feed
        setSpectatorBattleEvents(prev => [...prev, eventData as unknown as SpectatorBattleEvent]);
      } else if (sub_category === "Applied Poison") {
        const beastTokenId = eventData.beast_token_id as number;
        const count = eventData.count as number;
        const blockTimestamp = Math.floor(new Date(data.created_at).getTime() / 1000);

        // Update summit poison stats directly
        if (nextSummit && nextSummit.beast.token_id === beastTokenId) {
          setNextSummit(prev => prev ? {
            ...prev,
            poison_count: prev.poison_count + count,
            poison_timestamp: blockTimestamp,
          } : prev);
        } else if (summit && summit.beast.token_id === beastTokenId) {
          setSummit(prev => prev ? {
            ...prev,
            poison_count: prev.poison_count + count,
            poison_timestamp: blockTimestamp,
          } : prev);
        }
      }
    }

    // Handle LS (Loot Survivor) Events - update collection beasts
    if (category === "LS Events") {
      const entityHash = eventData.entity_hash as string;

      if (sub_category === "EntityStats") {
        setCollection(prevCollection =>
          prevCollection.map(beast =>
            beast.entity_hash === entityHash
              ? { ...beast, adventurers_killed: Number(eventData.adventurers_killed) }
              : beast
          )
        );
      } else if (sub_category === "CollectableEntity") {
        setCollection(prevCollection =>
          prevCollection.map(beast =>
            beast.entity_hash === entityHash
              ? {
                  ...beast,
                  last_killed_by: Number(eventData.last_killed_by),
                  last_dm_death_timestamp: Number(eventData.timestamp),
                }
              : beast
          )
        );
      }
    }

    // Handle Beast Upgrade/Diplomacy - refresh diplomacy bonus if a matching beast upgraded
    if (category === "Beast Upgrade" && sub_category === "Diplomacy") {
      const prefix = eventData.prefix as number;
      const suffix = eventData.suffix as number;
      const prefixName = ITEM_NAME_PREFIXES[prefix as keyof typeof ITEM_NAME_PREFIXES];
      const suffixName = ITEM_NAME_SUFFIXES[suffix as keyof typeof ITEM_NAME_SUFFIXES];

      // Refresh diplomacy bonus if upgraded beast's name matches summit beast
      if (summit?.beast.prefix === prefixName && summit?.beast.suffix === suffixName) {
        getDiplomacy(prefix, suffix).then(beasts => {
          if (beasts.length > 0) {
            const totalPower = beasts.reduce((sum, b) => sum + b.power, 0);
            // Exclude summit beast's own power if it has diplomacy (can't give bonus to itself)
            const adjustedPower = summit.beast.diplomacy ? totalPower - summit.beast.power : totalPower;
            const bonus = Math.floor(adjustedPower / 250);
            setSummit(prev => prev ? { ...prev, diplomacy: { beasts, totalPower, bonus } } : prev);
          }
        });
      }
    }
  };

  // WebSocket subscription for real-time updates
  useWebSocket({
    url: currentNetworkConfig.wsUrl,
    channels: ["summit", "event"],
    onSummit: handleSummit,
    onEvent: handleEvent,
    onConnectionChange: (state) => {
      console.log("[GameDirector] WebSocket connection state:", state);
    },
  });

  useEffect(() => {
    fetchSummitData();
  }, []);

  useEffect(() => {
    setAttackInProgress(false);
    setApplyingPotions(false);
  }, [actionFailed]);

  useEffect(() => {
    async function processNextSummit() {
      let newSummit = { ...nextSummit };
      const { currentHealth, extraLives } = applyPoisonDamage(newSummit);
      newSummit.beast.current_health = currentHealth;
      newSummit.beast.extra_lives = extraLives;

      setSelectedBeasts([]);
      setSummit(newSummit);
      setNextSummit(null);
    }

    if (nextSummit && !pauseUpdates) {
      processNextSummit();
    }
  }, [nextSummit, pauseUpdates]);

  // Play roar and fetch diplomacy when summit beast changes
  useEffect(() => {
    if (!summit?.beast.token_id) return;

    play("roar");

    // Fetch diplomacy if not already set
    if (!summit.diplomacy && summit.beast.diplomacy) {
      const fetchDiplomacy = async () => {
        try {
          const beasts = await getDiplomacy(
            summit.beast.prefix,
            summit.beast.suffix
          );

          if (beasts.length > 0) {
            const totalPower = beasts.reduce((sum, b) => sum + b.power, 0);
            const adjustedPower = summit.beast.diplomacy ? totalPower - summit.beast.power : totalPower;
            const bonus = Math.floor(adjustedPower / 250);

            setSummit(prev => prev ? { ...prev, diplomacy: { beasts, totalPower, bonus } } : prev);
          }
        } catch (error) {
          console.error("[GameDirector] Failed to fetch diplomacy:", error);
        }
      };

      fetchDiplomacy();
    }
  }, [summit?.beast.token_id]);

  const fetchSummitData = async () => {
    const summitBeast = await getSummitData();
    if (summitBeast) {
      setNextSummit(summitBeast);
    }
  };

  const updateLiveStats = (beastLiveStats: any[]) => {
    if (beastLiveStats.length === 0) return;

    beastLiveStats = beastLiveStats.reverse();

    setCollection((prevCollection) =>
      prevCollection.map((beast: Beast) => {
        let beastLiveStat = beastLiveStats.find(
          (liveStat: any) => liveStat.token_id === beast.token_id
        );

        if (beastLiveStat) {
          let newBeast = { ...beast, ...beastLiveStat };
          newBeast.current_health = getBeastCurrentHealth(newBeast);
          newBeast.revival_time = getBeastRevivalTime(newBeast);
          newBeast.current_level = getBeastCurrentLevel(
            newBeast.level,
            newBeast.bonus_xp
          );
          newBeast.power = (6 - newBeast.tier) * newBeast.current_level;
          return newBeast;
        } else {
          return beast;
        }
      })
    );
  };

  const executeGameAction = async (action: GameAction) => {
    let txs: any[] = [];

    if (action.pauseUpdates) {
      setPauseUpdates(true);
    }

    if (action.type === "attack") {
      setBattleEvents([]);
      setAttackInProgress(true);
      txs.push(
        ...attack(
          action.beasts,
          action.safeAttack,
          action.vrf,
          action.extraLifePotions
        )
      );
    }

    if (action.type === "attack_until_capture") {
      if (action.beasts.length === 0) {
        setActionFailed();
        return false;
      }

      txs.push(...attack(action.beasts, false, true, action.extraLifePotions));
    }

    if (action.type === "claim_starter_pack") {
      txs.push(claimBeastReward(action.beastIds));
    }

    if (action.type === "claim_corpse_reward") {
      txs.push(claimCorpses(action.adventurerIds));
    }

    if (action.type === "claim_skull_reward") {
      txs.push(claimSkulls(action.beastIds));
    }

    if (action.type === "add_extra_life") {
      txs.push(...addExtraLife(action.beastId, action.extraLifePotions));
    }

    if (action.type === "upgrade_beast") {
      if (action.bonusHealth > 0) {
        txs.push(...feed(action.beastId, action.bonusHealth, action.corpseTokens));
      }
      if (action.killTokens > 0) {
        txs.push(
          ...applyStatPoints(action.beastId, action.stats, action.killTokens)
        );
      }
    }

    if (action.type === "apply_poison") {
      txs.push(...applyPoison(action.beastId, action.count));
    }

    const result = await executeAction(txs, setActionFailed);

    if (!result) {
      setActionFailed();
      return false;
    }

    const { events, transactionHash } = result;

    updateLiveStats(
      events.filter((event: any) => event.componentName === "LiveBeastStatsEvent")
    );
    let captured = events
      .filter((event: any) => event.componentName === "BattleEvent")
      .find(
        (event: BattleEvent) =>
          event.attack_count + event.critical_attack_count >
          event.counter_attack_count + event.critical_counter_attack_count
      );

    // Mark this transaction as seen to deduplicate when indexer sends the same event
    if (transactionHash) {
      markTxSeen(transactionHash);
    }

    if (action.type === "attack" || action.type === "attack_until_capture") {
      let summitEvent = events.find(
        (event: any) => event.componentName === "Summit"
      );
      if (summitEvent) {
        setTokenBalances({
          ...tokenBalances,
          ATTACK: tokenBalances["ATTACK"] - summitEvent.attack_potions,
          EXTRA_LIFE:
            tokenBalances["EXTRA LIFE"] -
            (captured ? summitEvent.extra_life_potions : 0),
          REVIVE: tokenBalances["REVIVE"] - summitEvent.revival_potions,
        });

        setAttackPotionsUsed((prev) => prev + summitEvent.attack_potions);
        setRevivePotionsUsed((prev) => prev + summitEvent.revival_potions);
        setExtraLifePotionsUsed((prev) => prev + summitEvent.extra_life_potions);
        setAppliedExtraLifePotions(0);
      }
    }

    if (action.type === "attack") {
      if (action.pauseUpdates) {
        setBattleEvents(
          events.filter((event: any) => event.componentName === "BattleEvent")
        );
      } else {
        setAttackInProgress(false);
      }
    } else if (action.type === "attack_until_capture" && captured) {
      setAttackInProgress(false);
      return false;
    } else if (action.type === "add_extra_life") {
      setTokenBalances({
        ...tokenBalances,
        EXTRA_LIFE: tokenBalances["EXTRA LIFE"] - action.extraLifePotions,
      });
      setApplyingPotions(false);
      setAppliedExtraLifePotions(0);
      setExtraLifePotionsUsed((prev) => prev + action.extraLifePotions);
    } else if (action.type === "apply_poison") {
      setTokenBalances({
        ...tokenBalances,
        POISON: tokenBalances["POISON"] - action.count,
      });
      setApplyingPotions(false);
      setPoisonPotionsUsed((prev) => prev + action.count);
    } else if (action.type === "upgrade_beast") {
      setTokenBalances({
        ...tokenBalances,
        SKULL: tokenBalances["SKULL"] - action.killTokens,
        CORPSE: tokenBalances["CORPSE"] - action.corpseTokens,
      });
    }

    return true;
  };

  return (
    <GameDirectorContext.Provider
      value={{
        executeGameAction,
        actionFailed,
        setPauseUpdates,
        pauseUpdates,
      }}
    >
      {children}
    </GameDirectorContext.Provider>
  );
};

export const useGameDirector = () => {
  return useContext(GameDirectorContext);
};
