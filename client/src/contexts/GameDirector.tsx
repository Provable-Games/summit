import { useStarknetApi } from "@/api/starknet";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useGameStore } from "@/stores/gameStore";
import { BattleEvent, Beast, GameAction, getEntityModel } from "@/types/game";
import { useQueries } from '@/utils/queries';
import { delay } from "@/utils/utils";
import { useDojoSDK } from '@dojoengine/sdk/react';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState
} from "react";
import { useController } from "./controller";
import { getBeastCurrentHealth, getBeastRevivalTime } from "@/utils/beasts";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<boolean>;
  actionFailed: number;
  setPauseUpdates: (pause: boolean) => void;
}

export const START_TIMESTAMP = 1760947200;

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { sdk } = useDojoSDK();
  const { summit, setSummit, setAttackInProgress, setFeedingInProgress,
    collection, setCollection, setAppliedPotions, appliedPotions,
    setBattleEvent } = useGameStore();
  const { gameModelsQuery } = useQueries();
  const { getSummitData } = useStarknetApi();
  const { executeAction, attack, feed, claimStarterKit, addExtraLife, selectUpgrades } = useSystemCalls();
  const { tokenBalances, setTokenBalances } = useController();

  const [subscription, setSubscription] = useState<any>(null);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [eventQueue, setEventQueue] = useState<any[]>([]);
  const [pauseUpdates, setPauseUpdates] = useState(false);

  useEffect(() => {
    fetchSummitData();
    subscribeBeastUpdates();
  }, []);

  useEffect(() => {
    setAttackInProgress(false);
    setFeedingInProgress(false);
  }, [actionFailed]);

  useEffect(() => {
    const processNextEvent = async () => {
      if (eventQueue.length > 0 && !pauseUpdates) {
        const event = eventQueue[0];
        processBeastUpdate(event);
        setEventQueue((prev) => prev.slice(1));
      }
    };

    processNextEvent();
  }, [eventQueue, pauseUpdates]);

  const fetchSummitData = useCallback(async () => {
    const summitBeast = await getSummitData();

    if (summitBeast && (
      !summit ||
      (summitBeast.beast.current_health < summit?.beast.current_health && summitBeast.beast.extra_lives <= summit?.beast.extra_lives) ||
      summitBeast.beast.extra_lives < summit?.beast.extra_lives ||
      summitBeast.beast.bonus_health > summit?.beast.bonus_health ||
      summitBeast.beast.token_id !== summit?.beast.token_id
    )) {
      setSummit(summitBeast);
    }
  }, [summit]);

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

  const processBeastUpdate = (update: any) => {
    if (update.token_id === summit?.beast.token_id) {
      setSummit({
        ...summit,
        beast: {
          ...summit?.beast,
          ...update,
        },
      });
    } else if (update.current_health > 0) {
      fetchSummitData();
    }

    if (collection.find((beast: Beast) => beast.token_id === update.token_id)) {
      setCollection(collection.map((beast: Beast) => {
        if (beast.token_id === update.token_id) {
          let newBeast = { ...beast, ...update };
          newBeast.current_health = getBeastCurrentHealth(newBeast);
          newBeast.revival_time = getBeastRevivalTime(newBeast);
          return newBeast;
        }

        return beast;
      }));
    }
  }

  const processBattleEvents = async (events: BattleEvent[]) => {
    setPauseUpdates(true);

    events = events.filter(event => event.defending_beast_token_id === summit?.beast.token_id);

    for (const event of events) {
      setBattleEvent(event);
      await delay(event.attacks.length * 50);
    }

    setBattleEvent(null);
    setPauseUpdates(false);
  };

  const executeGameAction = async (action: GameAction) => {
    let txs: any[] = [];

    if (action.type === 'feed') {
      txs.push(feed(action.beastId, action.adventurerIds));
    }

    if (action.type === 'attack') {
      txs.push(
        ...attack(action.beastIds, action.appliedPotions, action.safeAttack, action.vrf)
      );
    }

    if (action.type === 'claim_starter_kit') {
      txs.push(claimStarterKit(action.beastIds));
    }

    if (action.type === 'add_extra_life') {
      txs.push(addExtraLife(action.beastId, appliedPotions.extraLife));
    }

    if (action.type === 'select_upgrades') {
      txs.push(...selectUpgrades(action.upgrades));
    }

    const events = await executeAction(txs, setActionFailed);

    if (!events || events.length === 0) {
      return false;
    }

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

      processBattleEvents(events);
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
    }

    return true;
  };

  return (
    <GameDirectorContext.Provider
      value={{
        executeGameAction,
        actionFailed,
        setPauseUpdates,
      }}
    >
      {children}
    </GameDirectorContext.Provider>
  );
};

export const useGameDirector = () => {
  return useContext(GameDirectorContext);
};
