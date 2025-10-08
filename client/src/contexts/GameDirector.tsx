import { useStarknetApi } from "@/api/starknet";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useGameStore } from "@/stores/gameStore";
import { Beast, GameAction, getEntityModel } from "@/types/game";
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
  attack: 500,
};

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { sdk } = useDojoSDK();
  const { summit, setSummit, setNewSummit, setLastAttack, setAttackInProgress,
    collection, setCollection, setSelectedBeasts, setFeedingInProgress } = useGameStore();
  const { gameEventsQuery } = useQueries();
  const { getSummitData } = useStarknetApi();
  const { executeAction, attack, feed, claimStarterKit } = useSystemCalls();

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
            .map((entity: any) => processEvent(getEntityModel(entity, "GameEvent")));

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
          current_health: Math.max(0, summit?.beast.current_health - event.damage),
        },
      });

      if (collection.find((beast: Beast) => beast.token_id === event.beast.token_id)) {
        setCollection(collection.map((beast: Beast) => beast.token_id === event.beast.token_id
          ? { ...beast, ...event.beast, ...event.live_stats }
          : beast
        ));

        setSelectedBeasts([]);
        setAttackInProgress(false);
      }
    }

    if (event.type === "summit") {
      setNewSummit({
        beast: {
          ...event.beast,
          ...event.live_stats,
        },
        taken_at: event.timestamp,
        owner: event.owner,
      });
    }

    if (event.type === "feed") {
      setCollection(collection.map((beast: Beast) => beast.token_id === event.beast.token_id
        ? { ...beast, ...event.beast, ...event.live_stats }
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
      txs.push(attack(action.beastIds, action.appliedPotions));
    }

    if (action.type === 'claim_starter_kit') {
      txs.push(claimStarterKit(action.beastIds));
    }

    const events = await executeAction(txs, setActionFailed);

    if (!events || events.length === 0) {
      return false;
    }

    setEventQueue((prev) => [...prev, ...events]);
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
