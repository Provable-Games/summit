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
}

// Create a context
const StatisticsContext = createContext<StatisticsContext>(
  {} as StatisticsContext
);

// Create a provider component
export const StatisticsProvider = ({ children }: PropsWithChildren) => {
  const { countRegisteredBeasts } = useGameTokens();

  const [beastsRegistered, setBeastsRegistered] = useState(0);

  const fetchCollectedBeasts = async () => {
    const result = await countRegisteredBeasts();
    setBeastsRegistered(result);
  };

  useEffect(() => {
    fetchCollectedBeasts();
  }, []);

  return (
    <StatisticsContext.Provider
      value={{
        beastsRegistered,
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
