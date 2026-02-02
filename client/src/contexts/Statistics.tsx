import { getSwapQuote } from "@/api/ekubo";
import { useSummitApi } from "@/api/summitApi";
import { NETWORKS } from "@/utils/networkConfig";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState
} from "react";
import { useDynamicConnector } from "./starknet";

export interface Top5000Cutoff {
  summit_held_seconds: number;
  bonus_xp: number;
  last_death_timestamp: number;
}

export interface StatisticsContext {
  beastsRegistered: number;
  beastsAlive: number;
  top5000Cutoff: Top5000Cutoff | null;
  fetchBeastCounts: () => void;
  fetchTop5000Cutoff: () => void;
  refreshTokenPrices: (tokenNames?: string[]) => Promise<void>;
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
  const { getBeastCounts, getTop5000Cutoff } = useSummitApi();
  const [beastsRegistered, setBeastsRegistered] = useState(0);
  const [beastsAlive, setBeastsAlive] = useState(0);
  const [top5000Cutoff, setTop5000Cutoff] = useState<Top5000Cutoff | null>(null);
  const [tokenPrices, setTokenPrices] = useState<Record<string, string>>({});

  const fetchBeastCounts = async () => {
    try {
      const counts = await getBeastCounts();
      setBeastsRegistered(counts.total);
      setBeastsAlive(counts.alive);
    } catch (error) {
      console.error("Error fetching beast counts:", error);
    }
  };

  const fetchTop5000Cutoff = async () => {
    const result = await getTop5000Cutoff();
    setTop5000Cutoff(result);
  };

  const fetchTokenPrice = async (token: any) => {
    try {
      const swap = await getSwapQuote(-1n * 10n ** 18n, token.address, USDC_ADDRESS);
      setTokenPrices((prev) => ({ ...prev, [token.name]: ((swap.total * -1) / 1e18).toFixed(4) }));
    } catch (err) {
      console.warn("refreshTokenPrices: failed to fetch price", token?.name, err);
    }
  };

  const refreshTokenPrices = async () => {
    const tokenNames = ["ATTACK", "REVIVE", "EXTRA LIFE", "POISON", "SKULL", "CORPSE"];

    for (const tokenName of tokenNames) {
      const token = currentNetworkConfig.tokens.erc20.find(token => token.name === tokenName);
      if (!token) continue;
      await fetchTokenPrice(token);
    }
  };

  useEffect(() => {
    fetchBeastCounts();
    fetchTop5000Cutoff();
    refreshTokenPrices();
  }, []);

  return (
    <StatisticsContext.Provider
      value={{
        beastsRegistered,
        beastsAlive,
        top5000Cutoff,
        fetchBeastCounts,
        fetchTop5000Cutoff,
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
