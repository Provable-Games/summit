import { useStarknetApi } from "@/api/starknet";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useGameStore } from "@/stores/gameStore";
import { GameAction } from "@/types/game";
import { delay } from "@/utils/utils";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => void;
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
  attack: 2000,
};

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { setSummit } = useGameStore();
  const { getSummitData } = useStarknetApi();
  const { executeAction, attack, feed, claimStarterKit } = useSystemCalls();

  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventQueue, setEventQueue] = useState<any[]>([]);
  const [eventsProcessed, setEventsProcessed] = useState(0);
  const [videoQueue, setVideoQueue] = useState<string[]>([]);

  useEffect(() => {
    const fetchSummitBeast = async () => {
      const summitBeast = await getSummitData();
      setSummit(summitBeast);
    };

    fetchSummitBeast();
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

  const processEvent = async (event: any, skipDelay: boolean = false) => {
    if (event.type === "attack") {
    }

    if (delayTimes[event.type] && !skipDelay) {
      await delay(delayTimes[event.type]);
    }
  };

  const executeGameAction = async (action: GameAction) => {
    let txs: any[] = [];

    if (action.type === 'feed') {
      txs.push(feed(action.beastId, action.adventurerIds));
    }

    if (action.type === 'attack') {
      txs.push(attack(action.beastIds));
    }

    if (action.type === 'claim_starter_kit') {
      txs.push(claimStarterKit(action.beastIds));
    }

    const events = await executeAction(txs, setActionFailed);
    setEventQueue((prev) => [...prev, ...events]);
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
