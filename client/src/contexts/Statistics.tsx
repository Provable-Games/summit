import { getSwapQuote } from "@/api/ekubo";
import { useGameTokens } from "@/dojo/useGameTokens";
import { NETWORKS } from "@/utils/networkConfig";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useDynamicConnector } from "./starknet";

export interface Top5000Cutoff {
  blocks_held: number;
  bonus_xp: number;
  last_death_timestamp: number;
}

export interface StatisticsContext {
  beastsRegistered: number;
  beastsAlive: number;
  top5000Cutoff: Top5000Cutoff | null;
  refreshBeastsAlive: () => void;
  refreshTop5000Cutoff: () => void;
  refreshTokenPrices: () => Promise<void>;
  tokenPrices: Record<string, string>;
}

// Create a context
const StatisticsContext = createContext<StatisticsContext>(
  {} as StatisticsContext
);

const USDC_ADDRESS = NETWORKS.SN_MAIN.paymentTokens.find(
  (token) => token.name === "TEST USD"
)?.address!;

// Create a provider component
export const StatisticsProvider = ({ children }: PropsWithChildren) => {
  const { currentNetworkConfig } = useDynamicConnector();
  const { countRegisteredBeasts, countAliveBeasts, getTop5000Cutoff } = useGameTokens();
  const [beastsRegistered, setBeastsRegistered] = useState(0);
  const [beastsAlive, setBeastsAlive] = useState(0);
  const [top5000Cutoff, setTop5000Cutoff] = useState<Top5000Cutoff | null>(null);
  const [tokenPrices, setTokenPrices] = useState<Record<string, string>>({});

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

  const fetchTokenPrice = async (token: any) => {
    const swap = await getSwapQuote(-1n * 10n ** 18n, token.address, USDC_ADDRESS);
    setTokenPrices((prev) => ({ ...prev, [token.name]: ((swap.total * -1) / 1e18).toFixed(4) }));
  };

  const refreshBeastsAlive = () => {
    fetchCollectedBeasts();
    fetchAliveBeasts();
  };

  const refreshTop5000Cutoff = () => {
    fetchTop5000Cutoff();
  };

  const refreshTokenPrices = async () => {
    const tokenNames = ["ATTACK", "REVIVE", "EXTRA LIFE", "POISON", "SKULL", "CORPSE"];

    for (const tokenName of tokenNames) {
      fetchTokenPrice(currentNetworkConfig.tokens.erc20.find(token => token.name === tokenName));
    }
  };

  useEffect(() => {
    refreshBeastsAlive();
    refreshTop5000Cutoff();
    refreshTokenPrices();
  }, []);

  return (
    <StatisticsContext.Provider
      value={{
        beastsRegistered,
        beastsAlive,
        top5000Cutoff,
        refreshBeastsAlive,
        refreshTop5000Cutoff,
        refreshTokenPrices,
        tokenPrices,
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
