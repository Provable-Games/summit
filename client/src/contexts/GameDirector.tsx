import { useStarknetApi } from "@/api/starknet";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useGameStore } from "@/stores/gameStore";
import { Beast, GameAction, getEntityModel } from "@/types/game";
import { getBeastCurrentHealth, getBeastDetails } from "@/utils/beasts";
import { processGameEvent } from "@/utils/events";
import { useQueries } from '@/utils/queries';
import { delay } from "@/utils/utils";
import { useDojoSDK } from '@dojoengine/sdk/react';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { useController } from "./controller";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<boolean>;
  actionFailed: number;
  videoQueue: string[];
  setVideoQueue: (videoQueue: string[]) => void;
  processEvent: (event: any, skipDelay?: boolean) => void;
  eventsProcessed: number;
  setEventQueue: (events: any) => void;
  setEventsProcessed: (eventsProcessed: number) => void;
}

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

/**
 * Wait times for events in milliseconds
 */
const delayTimes: any = {
  attack: 1000,
};

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { sdk } = useDojoSDK();
  const { summit, setSummit, setLastAttack, setAttackInProgress, setFeedingInProgress,
    collection, setCollection, setSelectedBeasts, setAppliedPotions, appliedPotions } = useGameStore();
  const { gameEventsQuery } = useQueries();
  const { getSummitData } = useStarknetApi();
  const { executeAction, attack, feed, claimStarterKit } = useSystemCalls();
  const { tokenBalances, setTokenBalances } = useController();

  const [subscription, setSubscription] = useState<any>(null);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventQueue, setEventQueue] = useState<any[]>([]);
  const [eventsProcessed, setEventsProcessed] = useState(0);
  const [videoQueue, setVideoQueue] = useState<string[]>([]);

  const fetchSummitBeast = async () => {
    const summitBeast = await getSummitData();
    setSummit(summitBeast);
  };

  useEffect(() => {
    setAttackInProgress(false);
    setFeedingInProgress(false);
  }, [actionFailed]);

  useEffect(() => {
    fetchSummitBeast();
    subscribeEvents();
  }, []);

  useEffect(() => {
    const processNextEvent = async () => {
      if (eventQueue.length > 0 && !isProcessing) {
        setIsProcessing(true);
        const event = eventQueue[0];
        await processEvent(event);
        setEventQueue((prev) => prev.slice(1));
        setIsProcessing(false);
        setEventsProcessed((prev) => prev + 1);
      }
    };

    processNextEvent();
  }, [eventQueue, isProcessing]);

  const subscribeEvents = async () => {
    if (subscription) {
      try {
        subscription.cancel();
      } catch (error) { }
    }

    const [_, sub] = await sdk.subscribeEventQuery({
      query: gameEventsQuery(1),
      callback: ({ data, error }: { data?: any[]; error?: Error }) => {
        if (data && data.length > 0) {
          let events = data
            .filter((entity: any) => Boolean(getEntityModel(entity, "GameEvent")))
            .map((entity: any) => processGameEvent(getEntityModel(entity, "GameEvent")));

          setEventQueue((prev: any) => [...prev, ...events]);
        }
      },
    });

    setSubscription(sub);
  };

  const processEvent = async (event: any) => {
    if (event.type === "attack" && event.defending_beast_token_id === summit?.beast.token_id) {
      setLastAttack(event.damage);
      setSummit({
        ...summit,
        beast: {
          ...summit?.beast,
          ...event.summit_live_stats,
        },
      });

      if (collection.find((beast: Beast) => beast.token_id === event.live_stats.token_id)) {
        setCollection(collection.map((beast: Beast) => beast.token_id === event.live_stats.token_id
          ? { ...beast, ...event.live_stats }
          : beast
        ));

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
    }

    if (event.type === "summit") {
      setSummit({
        beast: {
          ...event.beast,
          ...event.live_stats,
          ...getBeastDetails(event.beast.id, event.beast.prefix, event.beast.suffix, event.beast.level),
        },
        taken_at: event.timestamp,
        owner: event.owner,
      });
    }

    if (event.type === "feed") {
      let updatedBeast = { ...event.live_stats, health: event.beast.health }
      updatedBeast.current_health = getBeastCurrentHealth(updatedBeast)

      setCollection(collection.map((beast: Beast) => beast.token_id === event.live_stats.token_id
        ? { ...beast, ...updatedBeast }
        : beast
      ));
    }

    if (delayTimes[event.type]) {
      await delay(delayTimes[event.type]);
    }
  };

  const executeGameAction = async (action: GameAction) => {
    let txs: any[] = [];

    if (action.type === 'feed') {
      txs.push(feed(action.beastId, action.adventurerIds));
    }

    if (action.type === 'attack') {
      txs.push(
        ...attack(action.beastIds, action.appliedPotions)
      );
    }

    if (action.type === 'claim_starter_kit') {
      txs.push(claimStarterKit(action.beastIds));
    }

    const success = await executeAction(txs, setActionFailed);

    if (!success) {
      return false;
    }

    return true;
  };

  return (
    <GameDirectorContext.Provider
      value={{
        executeGameAction,
        actionFailed,
        videoQueue,
        setVideoQueue,
        eventsProcessed,
        setEventsProcessed,
        processEvent,
        setEventQueue,
      }}
    >
      {children}
    </GameDirectorContext.Provider>
  );
};

export const useGameDirector = () => {
  return useContext(GameDirectorContext);
};
