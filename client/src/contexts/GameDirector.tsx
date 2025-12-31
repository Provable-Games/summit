import { useStarknetApi } from "@/api/starknet";
import { useSound } from "@/contexts/sound";
import { useGameTokens } from "@/dojo/useGameTokens";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useAutopilotStore } from "@/stores/autopilotStore";
import { useGameStore } from "@/stores/gameStore";
import { BattleEvent, Beast, Diplomacy, GameAction, getDeathMountainModel, getEntityModel, selection, Summit } from "@/types/game";
import {
  applyPoisonDamage, calculateBattleResult, calculateOptimalAttackPotions, getBeastCurrentHealth,
  getBeastCurrentLevel, getBeastDetails, getBeastRevivalTime
} from "@/utils/beasts";
import { useQueries } from '@/utils/queries';
import { useDojoSDK } from '@dojoengine/sdk/react';
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

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<boolean>;
  actionFailed: number;
  setPauseUpdates: (pause: boolean) => void;
  pauseUpdates: boolean;
}

export const START_TIMESTAMP = 1760947200;
export const TERMINAL_BLOCK = 6000000;

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { sdk } = useDojoSDK();
  const { summit, setSummit, setAttackInProgress, collection, setCollection,
    setBattleEvents, setSpectatorBattleEvents, setApplyingPotions, setPoisonEvent, poisonEvent,
    setAppliedExtraLifePotions, setSelectedBeasts } = useGameStore();
  const { setRevivePotionsUsed, setAttackPotionsUsed, setExtraLifePotionsUsed, setPoisonPotionsUsed } = useAutopilotStore();
  const { gameEventsQuery, dungeonStatsQuery } = useQueries();
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
  const summitSubscriptionRef = useRef<any | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const retryCountRef = useRef(0);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [eventQueue, setEventQueue] = useState<any[]>([]);
  const [pauseUpdates, setPauseUpdates] = useState(false);

  useEffect(() => {
    fetchSummitData();
    subscribeSummitUpdates();
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
        bonus: newSummit.beast.stats.diplomacy
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
          bonus: prevSummit.beast.stats.diplomacy
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

  const subscribeSummitUpdates = async () => {
    if (summitSubscriptionRef.current) {
      try {
        summitSubscriptionRef.current.cancel();
      } catch (error) { }
    }

    try {
      const [_, sub] = await sdk.subscribeEventQuery({
        query: gameEventsQuery(),
        callback: ({ data, error }: { data?: any[]; error?: Error }) => {
          if (data && data.length > 0) {
            // Successful event received; reset retry counter
            retryCountRef.current = 0;

            let liveBeastStatsEvent = data.filter((entity: any) => Boolean(getEntityModel(entity, "LiveBeastStatsEvent")))
              .map((entity: any) => getEntityModel(entity, "LiveBeastStatsEvent"))

            let summitEvent = data.filter((entity: any) => Boolean(getEntityModel(entity, "SummitEvent")))
              .map((entity: any) => getEntityModel(entity, "SummitEvent"))

            let battleEvent = data.filter((entity: any) => Boolean(getEntityModel(entity, "BattleEvent")))
              .map((entity: any) => getEntityModel(entity, "BattleEvent"))

            let poison_event = data.filter((entity: any) => Boolean(getEntityModel(entity, "PoisonEvent")))
              .map((entity: any) => getEntityModel(entity, "PoisonEvent"))

            let diplomacyEvent = data.filter((entity: any) => Boolean(getEntityModel(entity, "DiplomacyEvent")))
              .map((entity: any) => getEntityModel(entity, "DiplomacyEvent"))

            if (diplomacyEvent.length > 0) {
              setDiplomacyEvent(diplomacyEvent[0]);
            }

            if (liveBeastStatsEvent.length > 0) {
              setEventQueue((prev) => [...prev, ...liveBeastStatsEvent.map(liveStatEvent => liveStatEvent.live_stats)]);
            }

            if (poison_event.length > 0) {
              setPoisonEvent(poison_event[0]);
            }

            if (battleEvent.length > 0) {
              setSpectatorBattleEvents(prev => [...prev, ...battleEvent]);
            }

            if (summitEvent.length > 0) {
              let summit = summitEvent[0];
              let newSummitBeast = { ...summit.beast, ...summit.live_stats };
              newSummitBeast.current_level = getBeastCurrentLevel(newSummitBeast.level, newSummitBeast.bonus_xp);

              setNextSummit({
                beast: {
                  ...newSummitBeast,
                  ...getBeastDetails(newSummitBeast.id, newSummitBeast.prefix, newSummitBeast.suffix, newSummitBeast.current_level),
                  revival_time: 0,
                },
                taken_at: summit.taken_at,
                owner: summit.owner,
                poison_count: 0,
                poison_timestamp: 0,
              })
            }
          }
        },
      });

      summitSubscriptionRef.current = sub;
    } catch (error) {
      console.error("Failed to subscribe to summit updates:", error);
      retryCountRef.current += 1;
      const delay = Math.min(30000, 2000 * retryCountRef.current);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        subscribeSummitUpdates();
      }, delay);
    }
  };

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
      setBattleEvents([]);
      setAttackInProgress(true);

      let beasts = action.beasts.slice(0, 75);

      if (beasts.length === 0) {
        setActionFailed();
        return false;
      }

      txs.push(
        ...attack(beasts, false, true, action.extraLifePotions)
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
    } else if (action.type === 'attack_until_capture') {
      if (!captured) {
        executeGameAction({
          type: 'attack_until_capture',
          beasts: action.beasts.slice(75),
          extraLifePotions: action.extraLifePotions
        });
      } else {
        setAttackInProgress(false);
      }
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
