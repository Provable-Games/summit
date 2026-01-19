import { useStarknetApi } from "@/api/starknet";
import { useSound } from "@/contexts/sound";
import { useGameTokens } from "@/dojo/useGameTokens";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import {
  BattleData,
  BeastUpdateData,
  PoisonData,
  SummitData,
  useWebSocket,
} from "@/hooks/useWebSocket";
import { useAutopilotStore } from "@/stores/autopilotStore";
import { useGameStore } from "@/stores/gameStore";
import { BattleEvent, Beast, Diplomacy, GameAction, getDeathMountainModel, Summit } from "@/types/game";
import {
  applyPoisonDamage,
  getBeastCurrentHealth,
  getBeastCurrentLevel, getBeastDetails, getBeastRevivalTime
} from "@/utils/beasts";
import { useQueries } from '@/utils/queries';
import { useDojoSDK } from '@dojoengine/sdk/react';
import {
  createContext,
  PropsWithChildren,
  useCallback,
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

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { sdk } = useDojoSDK();
  const { currentNetworkConfig } = useDynamicConnector();
  const { summit, setSummit, setAttackInProgress, collection, setCollection,
    setBattleEvents, setSpectatorBattleEvents, setApplyingPotions, setPoisonEvent, poisonEvent,
    setAppliedExtraLifePotions, setSelectedBeasts } = useGameStore();
  const { setRevivePotionsUsed, setAttackPotionsUsed, setExtraLifePotionsUsed, setPoisonPotionsUsed } = useAutopilotStore();
  const { dungeonStatsQuery } = useQueries();
  const { getSummitData } = useStarknetApi();
  const { executeAction, attack, feed, claimBeastReward, claimCorpses, claimSkulls, addExtraLife, applyStatPoints, applyPoison } = useSystemCalls();
  const { tokenBalances, setTokenBalances } = useController();
  const { play } = useSound();
  const { getDiplomacy } = useGameTokens();

  const [nextSummit, setNextSummit] = useState<Summit | null>(null);
  const [diplomacyEvent, setDiplomacyEvent] = useState<Diplomacy>();
  const [collectableEntity, setCollectableEntity] = useState<any>();
  const [entityStats, setEntityStats] = useState<any>();

  const dungeonSubscriptionRef = useRef<any | null>(null);

  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [eventQueue, setEventQueue] = useState<any[]>([]);
  const [pauseUpdates, setPauseUpdates] = useState(false);

  // WebSocket callbacks for real-time updates
  const handleBeastUpdate = useCallback((data: BeastUpdateData) => {
    // Data is already in snake_case format with flattened stats
    const liveStats = {
      token_id: data.token_id,
      current_health: data.current_health,
      bonus_health: data.bonus_health,
      bonus_xp: data.bonus_xp,
      attack_streak: data.attack_streak,
      last_death_timestamp: parseInt(data.last_death_timestamp),
      revival_count: data.revival_count,
      extra_lives: data.extra_lives,
      has_claimed_potions: Boolean(data.has_claimed_potions),
      blocks_held: data.blocks_held,
      spirit: data.spirit,
      luck: data.luck,
      specials: Boolean(data.specials),
      wisdom: Boolean(data.wisdom),
      diplomacy: Boolean(data.diplomacy),
    };
    setEventQueue((prev) => [...prev, liveStats]);
  }, []);

  const handleSummit = useCallback((data: SummitData) => {
    const newSummitBeast = {
      id: data.beast_id,
      prefix: data.beast_prefix,
      suffix: data.beast_suffix,
      level: data.beast_level,
      health: data.beast_health,
      shiny: data.beast_shiny,
      animated: data.beast_animated,
      token_id: data.beast_token_id,
      current_health: data.current_health,
      bonus_health: data.bonus_health,
      bonus_xp: 0, // Not provided in summit event
      attack_streak: 0,
      last_death_timestamp: 0,
      revival_count: 0,
      extra_lives: 0,
      has_claimed_potions: false,
      blocks_held: data.blocks_held,
      spirit: 0,
      luck: 0,
      specials: false,
      wisdom: false,
      diplomacy: false,
      kills_claimed: 0,
    };

    const currentLevel = getBeastCurrentLevel(newSummitBeast.level, newSummitBeast.bonus_xp);

    setNextSummit({
      beast: {
        ...newSummitBeast,
        current_level: currentLevel,
        ...getBeastDetails(newSummitBeast.id, newSummitBeast.prefix, newSummitBeast.suffix, currentLevel),
        revival_time: 0,
      },
      taken_at: new Date(data.created_at).getTime() / 1000,
      owner: data.owner,
      poison_count: 0,
      poison_timestamp: 0,
    });
  }, []);

  const handleBattle = useCallback((data: BattleData) => {
    // Data is already in snake_case format matching BattleEvent type
    setSpectatorBattleEvents((prev) => [...prev, data as unknown as BattleEvent]);
  }, [setSpectatorBattleEvents]);

  const handlePoison = useCallback((data: PoisonData) => {
    // Data is already in snake_case format
    setPoisonEvent({
      beast_token_id: data.beast_token_id,
      count: data.count,
      player: data.player,
      block_timestamp: parseInt(data.block_timestamp),
    });
  }, [setPoisonEvent]);

  // WebSocket subscription for real-time game updates
  useWebSocket({
    url: currentNetworkConfig.wsUrl,
    channels: ["beast_update", "battle", "summit", "poison"],
    onBeastUpdate: handleBeastUpdate,
    onBattle: handleBattle,
    onSummit: handleSummit,
    onPoison: handlePoison,
    onConnectionChange: (state) => {
      console.log("[GameDirector] WebSocket connection state:", state);
    },
  });

  useEffect(() => {
    fetchSummitData();
    subscribeDungeonUpdates();
  }, []);

  useEffect(() => {
    setAttackInProgress(false);
    setApplyingPotions(false);
  }, [actionFailed]);

  useEffect(() => {
    if (poisonEvent) {
      if (poisonEvent.beast_token_id === summit?.beast.token_id) {
        setSummit(prevSummit => ({
          ...prevSummit,
          poison_count: (prevSummit?.poison_count || 0) + poisonEvent.count,
          poison_timestamp: poisonEvent.block_timestamp,
        }));
      } else if (poisonEvent.beast_token_id === nextSummit?.beast.token_id) {
        setNextSummit(prevSummit => ({
          ...prevSummit,
          poison_count: (prevSummit?.poison_count || 0) + poisonEvent.count,
          poison_timestamp: poisonEvent.block_timestamp,
        }));
      }
    }
  }, [poisonEvent]);

  useEffect(() => {
    const processNextEvent = async () => {
      if (eventQueue.length > 0 && !pauseUpdates) {
        const event = eventQueue[0];
        processSummitUpdate(event);
        setEventQueue((prev) => prev.slice(1));
      }
    };

    processNextEvent();
  }, [eventQueue, pauseUpdates]);

  useEffect(() => {
    async function processNextSummit() {
      let newSummit = { ...nextSummit };
      const { currentHealth, extraLives } = applyPoisonDamage(newSummit);
      newSummit.beast.current_health = currentHealth;
      newSummit.beast.extra_lives = extraLives;

      const diplomacy = await getDiplomacy(newSummit.beast);
      newSummit.diplomacy = {
        ...diplomacy,
        bonus: newSummit.beast.diplomacy
          ? Math.floor((diplomacy.total_power - newSummit.beast.power) / 250)
          : Math.floor(diplomacy.total_power / 250),
      };

      setSelectedBeasts([]);
      setSummit(newSummit);
      setNextSummit(null);
      play("roar");
    }

    if (nextSummit && !pauseUpdates) {
      processNextSummit();
    }
  }, [nextSummit, pauseUpdates]);

  useEffect(() => {
    if (diplomacyEvent && diplomacyEvent.specials_hash === summit?.beast.specials_hash) {
      setSummit(prevSummit => ({
        ...prevSummit,
        diplomacy: {
          ...diplomacyEvent,
          bonus: prevSummit.beast.diplomacy
            ? Math.floor((diplomacyEvent.total_power - prevSummit.beast.power) / 250)
            : Math.floor(diplomacyEvent.total_power / 250),
        },
      }));
    }
  }, [diplomacyEvent]);

  useEffect(() => {
    if (collectableEntity && collectableEntity.index > 0) {
      if (collection.find((beast: Beast) => beast.entity_hash === collectableEntity.entity_hash)) {
        setCollection(prevCollection => prevCollection.map((beast: Beast) =>
          beast.entity_hash === collectableEntity.entity_hash
            ? { ...beast, last_killed_by: collectableEntity.killed_by, last_dm_death_timestamp: collectableEntity.timestamp }
            : beast
        ));
      }
    }
  }, [collectableEntity]);

  useEffect(() => {
    if (entityStats) {
      if (collection.find((beast: Beast) => beast.entity_hash === entityStats.entity_hash)) {
        setCollection(prevCollection => prevCollection.map((beast: Beast) =>
          beast.entity_hash === entityStats.entity_hash
            ? { ...beast, adventurers_killed: entityStats.adventurers_killed }
            : beast
        ));
      }
    }
  }, [entityStats]);

  const fetchSummitData = async () => {
    const summitBeast = await getSummitData();

    if (summitBeast) {
      setNextSummit(summitBeast);
    }
  };

  const subscribeDungeonUpdates = async () => {
    if (dungeonSubscriptionRef.current) {
      try {
        dungeonSubscriptionRef.current.cancel();
      } catch (error) { }
    }

    try {
      const [_, sub] = await sdk.subscribeEntityQuery({
        query: dungeonStatsQuery(),
        callback: ({ data, error }: { data?: any[]; error?: Error }) => {
          if (error) {
            console.error("Dungeon subscription error:", error);
            return;
          }

          if (data && data.length > 0) {
            let collectableEntity = data.filter((entity: any) => Boolean(getDeathMountainModel(entity, "CollectableEntity")))
              .map((entity: any) => getDeathMountainModel(entity, "CollectableEntity"))

            let entityStats = data.filter((entity: any) => Boolean(getDeathMountainModel(entity, "EntityStats")))
              .map((entity: any) => getDeathMountainModel(entity, "EntityStats"))

            if (collectableEntity.length > 0) {
              setCollectableEntity(collectableEntity[0]);
            }

            if (entityStats.length > 0) {
              setEntityStats(entityStats[0]);
            }
          }
        },
      });

      dungeonSubscriptionRef.current = sub;
    } catch (error) {
      console.error("Failed to subscribe to dungeon updates:", error);
      setTimeout(() => {
        subscribeDungeonUpdates();
      }, 30000);
    }
  }

  const processSummitUpdate = (update: any) => {
    if (update.token_id === summit?.beast.token_id) {
      let updatedBeast = { ...summit?.beast, ...update };
      updatedBeast.current_level = getBeastCurrentLevel(updatedBeast.level, updatedBeast.bonus_xp);
      updatedBeast.power = (6 - updatedBeast.tier) * updatedBeast.current_level;

      setSummit(prevSummit => ({
        ...prevSummit,
        beast: updatedBeast,
      }));
    }

    let myBeast = collection.find((beast: Beast) => beast.token_id === update.token_id);
    if (myBeast) {
      let newBeast = { ...myBeast, ...update };
      newBeast.current_health = getBeastCurrentHealth(newBeast);
      newBeast.revival_time = getBeastRevivalTime(newBeast);
      newBeast.current_level = getBeastCurrentLevel(newBeast.level, newBeast.bonus_xp);
      newBeast.power = (6 - newBeast.tier) * newBeast.current_level;
      setCollection(prevCollection => prevCollection.map((beast: Beast) => beast.token_id === update.token_id ? newBeast : beast));
    }
  }

  const updateLiveStats = (beastLiveStats: any[]) => {
    if (beastLiveStats.length === 0) return;

    beastLiveStats = beastLiveStats.reverse();

    setCollection(prevCollection => prevCollection.map((beast: Beast) => {
      let beastLiveStat = beastLiveStats.find((liveStat: any) => liveStat.token_id === beast.token_id);

      if (beastLiveStat) {
        let newBeast = { ...beast, ...beastLiveStat };
        newBeast.current_health = getBeastCurrentHealth(newBeast);
        newBeast.revival_time = getBeastRevivalTime(newBeast);
        newBeast.current_level = getBeastCurrentLevel(newBeast.level, newBeast.bonus_xp);
        newBeast.power = (6 - newBeast.tier) * newBeast.current_level;
        return newBeast;
      } else {
        return beast;
      }
    }));
  }

  const executeGameAction = async (action: GameAction) => {
    let txs: any[] = [];

    if (action.pauseUpdates) {
      setPauseUpdates(true);
    }

    if (action.type === 'attack') {
      setBattleEvents([]);
      setAttackInProgress(true);
      txs.push(
        ...attack(action.beasts, action.safeAttack, action.vrf, action.extraLifePotions)
      );
    }

    if (action.type === 'attack_until_capture') {
      if (action.beasts.length === 0) {
        setActionFailed();
        return false;
      }

      txs.push(
        ...attack(action.beasts, false, true, action.extraLifePotions)
      );
    }

    if (action.type === 'claim_beast_reward') {
      txs.push(claimBeastReward(action.beastIds));
    }

    if (action.type === 'claim_corpse_reward') {
      txs.push(claimCorpses(action.adventurerIds));
    }

    if (action.type === 'claim_skull_reward') {
      txs.push(claimSkulls(action.beastIds));
    }

    if (action.type === 'add_extra_life') {
      txs.push(...addExtraLife(action.beastId, action.extraLifePotions));
    }

    if (action.type === 'upgrade_beast') {
      if (action.bonusHealth > 0) {
        txs.push(...feed(action.beastId, action.bonusHealth, action.corpseTokens));
      }
      if (action.killTokens > 0) {
        txs.push(...applyStatPoints(action.beastId, action.stats, action.killTokens));
      }
    }

    if (action.type === 'apply_poison') {
      txs.push(...applyPoison(action.beastId, action.count));
    }

    const events = await executeAction(txs, setActionFailed);

    if (!events) {
      setActionFailed();
      return false;
    }

    updateLiveStats(events.filter((event: any) => event.componentName === 'LiveBeastStatsEvent'));
    let captured = events.filter((event: any) => event.componentName === 'BattleEvent')
      .find((event: BattleEvent) => (event.attack_count + event.critical_attack_count) > (event.counter_attack_count + event.critical_counter_attack_count)
      );

    if (action.type === 'attack' || action.type === 'attack_until_capture') {
      let summitEvent = events.find((event: any) => event.componentName === 'Summit');
      if (summitEvent) {
        setTokenBalances({
          ...tokenBalances,
          ATTACK: tokenBalances["ATTACK"] - summitEvent.attack_potions,
          EXTRA_LIFE: tokenBalances["EXTRA LIFE"] - (captured ? summitEvent.extra_life_potions : 0),
          REVIVE: tokenBalances["REVIVE"] - summitEvent.revival_potions,
        });

        setAttackPotionsUsed(prev => prev + summitEvent.attack_potions);
        setRevivePotionsUsed(prev => prev + summitEvent.revival_potions);
        setExtraLifePotionsUsed(prev => prev + summitEvent.extra_life_potions);
        setAppliedExtraLifePotions(0);
      }
    }

    if (action.type === 'attack') {
      if (action.pauseUpdates) {
        setBattleEvents(events.filter((event: any) => event.componentName === 'BattleEvent'));
      } else {
        setAttackInProgress(false);
      }
    } else if (action.type === 'attack_until_capture' && captured) {
      setAttackInProgress(false);
      return false;
    } else if (action.type === 'add_extra_life') {
      setTokenBalances({
        ...tokenBalances,
        EXTRA_LIFE: tokenBalances["EXTRA LIFE"] - action.extraLifePotions,
      });
      setApplyingPotions(false);
      setAppliedExtraLifePotions(0);
      setExtraLifePotionsUsed(prev => prev + action.extraLifePotions);
    } else if (action.type === 'apply_poison') {
      setTokenBalances({
        ...tokenBalances,
        POISON: tokenBalances["POISON"] - action.count,
      });
      setApplyingPotions(false);
      setPoisonPotionsUsed(prev => prev + action.count);
    } else if (action.type === 'upgrade_beast') {
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
