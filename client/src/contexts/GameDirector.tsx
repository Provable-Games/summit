import { useStarknetApi } from "@/api/starknet";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useGameStore } from "@/stores/gameStore";
import { BattleEvent, Beast, GameAction, getEntityModel, Summit } from "@/types/game";
import { getBeastCurrentHealth, getBeastCurrentLevel, getBeastDetails, getBeastRevivalTime } from "@/utils/beasts";
import { useQueries } from '@/utils/queries';
import { delay } from "@/utils/utils";
import { useDojoSDK } from '@dojoengine/sdk/react';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useState
} from "react";
import { useController } from "./controller";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<boolean>;
  actionFailed: number;
  setPauseUpdates: (pause: boolean) => void;
  pauseUpdates: boolean;
}

export const START_TIMESTAMP = 1760947200;

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { sdk } = useDojoSDK();
  const { summit, setSummit, setAttackInProgress, setFeedingInProgress,
    collection, setCollection, setAppliedPotions, appliedPotions,
    setBattleEvents, setApplyingPotions } = useGameStore();
  const { gameModelsQuery, gameEventsQuery } = useQueries();
  const { getSummitData } = useStarknetApi();
  const { executeAction, attack, feed, claimStarterKit, addExtraLife, selectUpgrades } = useSystemCalls();
  const { tokenBalances, setTokenBalances } = useController();

  const [nextSummit, setNextSummit] = useState<Summit | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [summitSubscription, setSummitSubscription] = useState<any>(null);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [eventQueue, setEventQueue] = useState<any[]>([]);
  const [pauseUpdates, setPauseUpdates] = useState(false);

  useEffect(() => {
    fetchSummitData();
    subscribeBeastUpdates();
    subscribeSummitUpdates();
  }, []);

  useEffect(() => {
    setAttackInProgress(false);
    setFeedingInProgress(false);
    setApplyingPotions(false);
  }, [actionFailed]);

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
    if (nextSummit && !pauseUpdates) {
      setSummit(nextSummit);
    }
  }, [nextSummit, pauseUpdates]);

  const fetchSummitData = async () => {
    const summitBeast = await getSummitData();

    if (!summitBeast) {
      await delay(1000);
      return fetchSummitData();
    } else {
      setSummit(summitBeast);
    }
  };

  const subscribeSummitUpdates = async () => {
    if (summitSubscription) {
      try {
        summitSubscription.cancel();
      } catch (error) { }
    }

    const [_, sub] = await sdk.subscribeEventQuery({
      query: gameEventsQuery(),
      callback: ({ data, error }: { data?: any[]; error?: Error }) => {
        if (data && data.length > 0) {
          let summitEvent = data.filter((entity: any) => Boolean(getEntityModel(entity, "SummitEvent")))
            .map((entity: any) => getEntityModel(entity, "SummitEvent"))

          let battleEvent = data.filter((entity: any) => Boolean(getEntityModel(entity, "BattleEvent")))
            .map((entity: any) => getEntityModel(entity, "BattleEvent"))

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
            })
          }
        }
      },
    });

    setSummitSubscription(sub);
  };

  const subscribeBeastUpdates = async () => {
    if (subscription) {
      try {
        subscription.cancel();
      } catch (error) { }
    }

    const [_, sub] = await sdk.subscribeEntityQuery({
      query: gameModelsQuery(),
      callback: ({ data, error }: { data?: any[]; error?: Error }) => {
        if (data && data.length > 0) {
          let events = data.filter((entity: any) => Boolean(getEntityModel(entity, "LiveBeastStats")))
            .map((entity: any) => getEntityModel(entity, "LiveBeastStats"))

          setEventQueue((prev) => [...prev, ...events]);
        }
      },
    });

    setSubscription(sub);
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
  }

  const updateLiveStats = (beastLiveStats: any[]) => {
    if (beastLiveStats.length === 0) return;

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

    if (action.type === 'feed') {
      txs.push(feed(action.beastId, action.adventurerIds));
    }

    if (action.type === 'attack') {
      setBattleEvents([]);
      setAttackInProgress(true);
      setPauseUpdates(true);

      txs.push(
        ...attack(action.beastIds, action.appliedPotions, action.safeAttack, action.vrf)
      );
    }

    if (action.type === 'attack_until_capture') {
      setBattleEvents([]);
      setAttackInProgress(true);

      let beastIds = action.beastIds.slice(0, 50);

      if (beastIds.length === 0) {
        setActionFailed();
        return false;
      }

      txs.push(
        ...attack(beastIds, { revive: 0, attack: 0, extraLife: 0 }, false, true)
      );
    }

    if (action.type === 'claim_starter_kit') {
      txs.push(claimStarterKit(action.beastIds));
    }

    if (action.type === 'add_extra_life') {
      txs.push(...addExtraLife(action.beastId, appliedPotions.extraLife));
    }

    if (action.type === 'select_upgrades') {
      txs.push(...selectUpgrades(action.upgrades));
    }

    const events = await executeAction(txs, setActionFailed);

    if (!events) {
      setActionFailed();
      return false;
    }

    updateLiveStats(events.filter((event: any) => event.componentName === 'LiveBeastStats'));

    if (action.type === 'attack') {
      setTokenBalances({
        ...tokenBalances,
        ATTACK: tokenBalances["ATTACK"] - appliedPotions.attack,
        EXTRA_LIFE: tokenBalances["EXTRA LIFE"] - appliedPotions.extraLife,
        REVIVE: tokenBalances["REVIVE"] - appliedPotions.revive,
      });
      setAppliedPotions({
        revive: 0,
        attack: 0,
        extraLife: 0,
      });

      setBattleEvents(events.filter((event: any) => event.componentName === 'BattleEvent'));
    } else if (action.type === 'attack_until_capture') {
      if (!events.filter((event: any) => event.componentName === 'BattleEvent')
        .find((event: BattleEvent) => (event.attack_count + event.critical_attack_count) > (event.counter_attack_count + event.critical_counter_attack_count))) {
        executeGameAction({
          type: 'attack_until_capture',
          beastIds: action.beastIds.slice(50),
        });
      } else {
        setAttackInProgress(false);
      }
    } else if (action.type === 'add_extra_life') {
      setTokenBalances({
        ...tokenBalances,
        EXTRA_LIFE: tokenBalances["EXTRA LIFE"] - appliedPotions.extraLife,
      });
      setAppliedPotions({
        revive: 0,
        attack: 0,
        extraLife: 0,
      });
      setApplyingPotions(false);
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
