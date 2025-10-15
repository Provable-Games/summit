import { useStarknetApi } from "@/api/starknet";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useGameStore } from "@/stores/gameStore";
import { Beast, GameAction, getEntityModel } from "@/types/game";
import { useQueries } from '@/utils/queries';
import { useDojoSDK } from '@dojoengine/sdk/react';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useState,
  useRef,
} from "react";
import { useController } from "./controller";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<boolean>;
  actionFailed: number;
}

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { sdk } = useDojoSDK();
  const { summit, setSummit, setAttackInProgress, setFeedingInProgress,
    collection, setCollection, setSelectedBeasts, setAppliedPotions, appliedPotions } = useGameStore();
  const { gameModelsQuery } = useQueries();
  const { getSummitData } = useStarknetApi();
  const { executeAction, attack, feed, claimStarterKit } = useSystemCalls();
  const { tokenBalances, setTokenBalances } = useController();

  const [subscription, setSubscription] = useState<any>(null);
  const summitIntervalRef = useRef<number | null>(null);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [eventQueue, setEventQueue] = useState<any[]>([]);

  useEffect(() => {
    fetchSummitData();
    subscribeSummitBeast();
    subscribeBeastUpdates();
  }, []);

  useEffect(() => {
    setAttackInProgress(false);
    setFeedingInProgress(false);
  }, [actionFailed]);

  useEffect(() => {
    const processNextEvent = async () => {
      if (eventQueue.length > 0) {
        const event = eventQueue[0];
        processBeastUpdate(event);
        setEventQueue((prev) => prev.slice(1));
      }
    };

    processNextEvent();
  }, [eventQueue]);

  const fetchSummitData = async () => {
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
  }

  const subscribeSummitBeast = async () => {
    if (summitIntervalRef.current) {
      clearInterval(summitIntervalRef.current);
    }

    const interval = setInterval(async () => {
      fetchSummitData();
    }, 2000);

    summitIntervalRef.current = interval;
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
          let events = data.filter((entity: any) => Boolean(getEntityModel(entity, "LiveBeastStats"))).map((entity: any) => getEntityModel(entity, "LiveBeastStats"))
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
    }

    if (collection.find((beast: Beast) => beast.token_id === update.token_id)) {
      setCollection(collection.map((beast: Beast) => beast.token_id === update.token_id
        ? { ...beast, ...update }
        : beast
      ));
    }
  }

  const executeGameAction = async (action: GameAction) => {
    let txs: any[] = [];

    if (action.type === 'feed') {
      txs.push(feed(action.beastId, action.adventurerIds));
    }

    if (action.type === 'attack') {
      txs.push(
        ...attack(action.beastIds, action.appliedPotions, action.safeAttack)
      );
    }

    if (action.type === 'claim_starter_kit') {
      txs.push(claimStarterKit(action.beastIds));
    }

    const success = await executeAction(txs, setActionFailed);

    if (!success) {
      return false;
    }

    if (action.type === 'attack') {
      setSelectedBeasts([]);
      setAttackInProgress(false);

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
    }

    return true;
  };

  return (
    <GameDirectorContext.Provider
      value={{
        executeGameAction,
        actionFailed,
      }}
    >
      {children}
    </GameDirectorContext.Provider>
  );
};

export const useGameDirector = () => {
  return useContext(GameDirectorContext);
};
