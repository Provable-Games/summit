import { useGameTokens } from "@/dojo/useGameTokens";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Top5000Cutoff {
  rewards_earned: number;
  power: number;
  health: number;
}

export interface StatisticsContext {
  beastsRegistered: number;
  beastsAlive: number;
  top5000Cutoff: Top5000Cutoff | null;
  refreshBeastsAlive: () => void;
  refreshTop5000Cutoff: () => void;
}

// Create a context
const StatisticsContext = createContext<StatisticsContext>(
  {} as StatisticsContext
);

// Create a provider component
export const StatisticsProvider = ({ children }: PropsWithChildren) => {
  const { countRegisteredBeasts, countAliveBeasts, getTop5000Cutoff } = useGameTokens();
  const [beastsRegistered, setBeastsRegistered] = useState(0);
  const [beastsAlive, setBeastsAlive] = useState(0);
  const [top5000Cutoff, setTop5000Cutoff] = useState<Top5000Cutoff | null>(null);

  const fetchCollectedBeasts = async () => {
    const result = await countRegisteredBeasts();
    setBeastsRegistered(result);
  };

  const fetchAliveBeasts = async () => {
    const result = await countAliveBeasts();
    setBeastsAlive(result);
  };

  const fetchTop5000Cutoff = async () => {
    const result = await getTop5000Cutoff();
    setTop5000Cutoff(result);
  };

  const refreshBeastsAlive = () => {
    fetchCollectedBeasts();
    fetchAliveBeasts();
  };

  const refreshTop5000Cutoff = () => {
    fetchTop5000Cutoff();
  };

  useEffect(() => {
    refreshBeastsAlive();
    refreshTop5000Cutoff();
  }, []);

  return (
    <StatisticsContext.Provider
      value={{
        beastsRegistered,
        beastsAlive,
        top5000Cutoff,
        refreshBeastsAlive,
        refreshTop5000Cutoff,
      }}
    >
      {children}
    </StatisticsContext.Provider>
  );
};

export const useStatistics = () => {
  const context = useContext(StatisticsContext);
  if (!context) {
    throw new Error("useStatistics must be used within a StatisticsProvider");
  }
  return context;
};
