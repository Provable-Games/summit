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

export interface StatisticsContext {
  beastsRegistered: number;
  beastsAlive: number;
  fetchBeastCounts: () => void;
  refreshTokenPrices: (tokenNames?: string[]) => Promise<void>;
  tokenPrices: Record<string, string>;
}

// Create a context
const StatisticsContext = createContext<StatisticsContext>(
  {} as StatisticsContext
);

const USDC_ADDRESS = NETWORKS.SN_MAIN.paymentTokens.find(
  (token) => token.name === "TEST USD"
)?.address as string;

// Create a provider component
export const StatisticsProvider = ({ children }: PropsWithChildren) => {
  const { currentNetworkConfig } = useDynamicConnector();
  const { getBeastCounts } = useSummitApi();
  const [beastsRegistered, setBeastsRegistered] = useState(0);
  const [beastsAlive, setBeastsAlive] = useState(0);
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
    refreshTokenPrices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StatisticsContext.Provider
      value={{
        beastsRegistered,
        beastsAlive,
        fetchBeastCounts,
        refreshTokenPrices,
        tokenPrices,
      }}
    >
      {children}
    </StatisticsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStatistics = () => {
  const context = useContext(StatisticsContext);
  if (!context) {
    throw new Error("useStatistics must be used within a StatisticsProvider");
  }
  return context;
};
