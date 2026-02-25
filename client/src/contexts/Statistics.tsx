import { getSwapQuote } from "@/api/ekubo";
import { useSummitApi } from "@/api/summitApi";
import { QUEST_REWARDS_TOTAL_AMOUNT } from "@/contexts/GameDirector";
import { NETWORKS } from "@/utils/networkConfig";
import type {
  PropsWithChildren
} from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import { useDynamicConnector } from "./starknet";

export interface ConsumablesSupply {
  xlife: number;
  attack: number;
  revive: number;
  poison: number;
}

export interface StatisticsContext {
  beastsRegistered: number;
  beastsAlive: number;
  consumablesSupply: ConsumablesSupply;
  fetchStats: () => void;
  fetchBeastCounts: () => void;
  refreshTokenPrices: (tokenNames?: string[]) => Promise<void>;
  tokenPrices: Record<string, string>;
  questRewardsRemaining: number;
}

// Create a context
const StatisticsContext = createContext<StatisticsContext>(
  {} as StatisticsContext
);

const USDC_ADDRESS = NETWORKS.SN_MAIN.paymentTokens.find(
  (token) => token.name === "USDC"
)?.address as string;

type PriceToken = {
  name: string;
  address: string;
};

// Create a provider component
export const StatisticsProvider = ({ children }: PropsWithChildren) => {
  const { currentNetworkConfig } = useDynamicConnector();
  const { getBeastCounts, getConsumablesSupply, getQuestRewardsTotal } = useSummitApi();
  const [beastsRegistered, setBeastsRegistered] = useState(0);
  const [beastsAlive, setBeastsAlive] = useState(0);
  const [consumablesSupply, setConsumablesSupply] = useState<ConsumablesSupply>({ xlife: 0, attack: 0, revive: 0, poison: 0 });
  const [tokenPrices, setTokenPrices] = useState<Record<string, string>>({});
  const [questRewardsRemaining, setQuestRewardsRemaining] = useState(QUEST_REWARDS_TOTAL_AMOUNT);

  const fetchBeastCounts = async () => {
    try {
      const counts = await getBeastCounts();
      setBeastsRegistered(counts.total);
      setBeastsAlive(counts.alive);
    } catch (error) {
      console.error("Error fetching beast counts:", error);
    }
  };

  const fetchConsumablesSupply = async () => {
    try {
      const supply = await getConsumablesSupply();
      setConsumablesSupply(supply);
    } catch (error) {
      console.error("Error fetching consumables supply:", error);
    }
  };

  const fetchStats = () => {
    fetchBeastCounts();
    fetchConsumablesSupply();
  };

  const fetchTokenPrice = async (token: PriceToken) => {
    try {
      const swap = await getSwapQuote(-1n * 10n ** 18n, token.address, USDC_ADDRESS);
      setTokenPrices((prev) => ({ ...prev, [token.name]: (Math.abs(swap.totalDisplay) / 1e6).toFixed(4) }));
    } catch (err) {
      console.warn("refreshTokenPrices: failed to fetch price", token?.name, err);
    }
  };

  const refreshTokenPrices = async () => {
    const tokenNames = ["ATTACK", "REVIVE", "EXTRA LIFE", "POISON", "SKULL", "CORPSE", "SURVIVOR"];

    for (const tokenName of tokenNames) {
      const token = currentNetworkConfig.tokens.erc20.find(
        (candidate: PriceToken) => candidate.name === tokenName
      ) as PriceToken | undefined;
      if (!token) continue;
      await fetchTokenPrice(token);
    }
  };

  useEffect(() => {
    fetchBeastCounts();
    fetchConsumablesSupply();
    refreshTokenPrices();
    getQuestRewardsTotal()
      .then((claimed) => setQuestRewardsRemaining(Math.max(0, QUEST_REWARDS_TOTAL_AMOUNT - claimed)))
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StatisticsContext.Provider
      value={{
        beastsRegistered,
        beastsAlive,
        consumablesSupply,
        fetchStats,
        fetchBeastCounts,
        refreshTokenPrices,
        tokenPrices,
        questRewardsRemaining,
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
