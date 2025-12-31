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
  useCallback,
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

  const fetchCollectedBeasts = useCallback(async () => {
    const result = await countRegisteredBeasts();
    setBeastsRegistered(result);
  }, [countRegisteredBeasts]);

  const fetchAliveBeasts = useCallback(async () => {
    const result = await countAliveBeasts();
    setBeastsAlive(result);
  }, [countAliveBeasts]);

  const fetchTop5000Cutoff = useCallback(async () => {
    const result = await getTop5000Cutoff();
    setTop5000Cutoff(result);
  }, [getTop5000Cutoff]);

  const fetchTokenPrice = useCallback(async (token: any) => {
    try {
      const swap = await getSwapQuote(-1n * 10n ** 18n, token.address, USDC_ADDRESS);
      setTokenPrices((prev) => ({ ...prev, [token.name]: ((swap.total * -1) / 1e18).toFixed(4) }));
    } catch (err) {
      console.warn("refreshTokenPrices: failed to fetch price", token?.name, err);
    }
  }, []);

  const refreshBeastsAlive = useCallback(() => {
    fetchCollectedBeasts();
    fetchAliveBeasts();
  }, [fetchCollectedBeasts, fetchAliveBeasts]);

  const refreshTop5000Cutoff = useCallback(() => {
    fetchTop5000Cutoff();
  }, [fetchTop5000Cutoff]);

  const refreshTokenPrices = useCallback(async () => {
    const tokenNames = ["ATTACK", "REVIVE", "EXTRA LIFE", "POISON", "SKULL", "CORPSE"];

    for (const tokenName of tokenNames) {
      const token = currentNetworkConfig.tokens.erc20.find(token => token.name === tokenName);
      if (!token) continue;
      await fetchTokenPrice(token);
    }
  }, [currentNetworkConfig.tokens.erc20, fetchTokenPrice]);

  useEffect(() => {
    refreshBeastsAlive();
    refreshTop5000Cutoff();
    refreshTokenPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
