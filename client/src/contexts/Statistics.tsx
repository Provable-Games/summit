import { useGameTokens } from "@/dojo/useGameTokens";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

export interface StatisticsContext {
  beastsRegistered: number;
  beastsAlive: number;
  refreshBeastsAlive: () => void;
}

// Create a context
const StatisticsContext = createContext<StatisticsContext>(
  {} as StatisticsContext
);

// Create a provider component
export const StatisticsProvider = ({ children }: PropsWithChildren) => {
  const { countRegisteredBeasts, countAliveBeasts } = useGameTokens();
  const [beastsRegistered, setBeastsRegistered] = useState(0);
  const [beastsAlive, setBeastsAlive] = useState(0);

  const fetchCollectedBeasts = async () => {
    const result = await countRegisteredBeasts();
    setBeastsRegistered(result);
  };

  const fetchAliveBeasts = async () => {
    const result = await countAliveBeasts();
    setBeastsAlive(result);
  };

  const refreshBeastsAlive = () => {
    // fire and forget; UI doesn't need to await
    fetchCollectedBeasts();
    fetchAliveBeasts();
  };

  useEffect(() => {
    refreshBeastsAlive();
  }, []);

  return (
    <StatisticsContext.Provider
      value={{
        beastsRegistered,
        beastsAlive,
        refreshBeastsAlive,
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
