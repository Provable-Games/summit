import { useStarknetApi } from "@/api/starknet";
import { useSummitApi } from "@/api/summitApi";
import { useGameTokens } from "@/dojo/useGameTokens";
import { useGameStore } from "@/stores/gameStore";
import { useAnalytics } from "@/utils/analytics";
import { delay } from "@/utils/utils";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { useDynamicConnector } from "./starknet";

export interface ControllerContext {
  playerName: string | undefined;
  isPending: boolean;
  tokenBalances: Record<string, number>;
  setTokenBalances: (tokenBalances: Record<string, number>) => void;
  fetchTokenBalances: (delayMs: number) => void;
  fetchPaymentTokenBalances: () => void;
  fetchBeastCollection: () => void;
  filterValidAdventurers: () => void;
  openProfile: () => void;
  login: () => void;
  logout: () => void;
  showTermsOfService: boolean;
  acceptTermsOfService: () => void;
  gasSpent: number | null;
  triggerGasSpent: (amount: number) => void;
}

// Create a context
const ControllerContext = createContext<ControllerContext>(
  {} as ControllerContext
);

// Create a provider component
export const ControllerProvider = ({ children }: PropsWithChildren) => {
  const { currentNetworkConfig } = useDynamicConnector();
  const { account, isConnecting } = useAccount();
  const { connector, connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { setCollection, setAdventurerCollection, setLoadingCollection, setCollectionSyncing } = useGameStore();
  const { getTokenBalances } = useStarknetApi();
  const { getBeastsByOwner } = useSummitApi();
  const { getValidAdventurers } = useGameTokens();
  const [userName, setUserName] = useState<string>();
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});
  const [gasSpent, setGasSpent] = useState<number | null>(null);

  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const { identifyAddress } = useAnalytics();

  const filterValidAdventurers = async () => {
    const validAdventurers = await getValidAdventurers(account?.address);

    setAdventurerCollection(validAdventurers.map((adventurer: any) => ({
      id: adventurer.token_id,
      level: Math.floor(Math.sqrt(adventurer.score)),
    })));
  };

  useEffect(() => {
    if (account?.address) {
      filterValidAdventurers();
    }
  }, [account?.address]);

  useEffect(() => {
    if (account) {
      fetchBeastCollection();
      fetchTokenBalances();
      identifyAddress({ address: account.address });

      // Check if terms have been accepted
      const termsAccepted = typeof window !== 'undefined'
        ? localStorage.getItem('termsOfServiceAccepted')
        : null;

      if (!termsAccepted) {
        setShowTermsOfService(true);
      }
    } else {
      setCollection([]);
    }
  }, [account]);

  // Get username when connector changes
  useEffect(() => {
    const getUsername = async () => {
      try {
        const name = await (connector as any)?.username();
        if (name) setUserName(name);
      } catch (error) {
        console.error("Error getting username:", error);
      }
    };

    if (connector) getUsername();
  }, [connector]);

  async function fetchBeastCollection() {
    if (!account?.address) return;

    setLoadingCollection(true);
    setCollectionSyncing(true);

    try {
      const beasts = await getBeastsByOwner(account.address);
      setCollection(beasts);
    } catch (error) {
      console.error('Error fetching beast collection:', error);
      setCollection([]);
    } finally {
      setLoadingCollection(false);
      setCollectionSyncing(false);
    }
  }

  async function fetchTokenBalances(delayMs: number = 0) {
    await delay(delayMs);
    let balances = await getTokenBalances(currentNetworkConfig.tokens.erc20);
    setTokenBalances(prev => ({ ...prev, ...balances }));
  }

  async function fetchPaymentTokenBalances() {
    let balances = await getTokenBalances(currentNetworkConfig.paymentTokens);
    setTokenBalances(prev => ({ ...prev, ...balances }));
  }

  const acceptTermsOfService = () => {
    setShowTermsOfService(false);
  };

  const triggerGasSpent = async (amount: number) => {
    await delay(1000);
    setGasSpent(amount);
    // Auto-clear after animation duration
    setTimeout(() => setGasSpent(null), 2500);
  };

  return (
    <ControllerContext.Provider
      value={{
        playerName: userName,
        isPending: isConnecting || isPending,
        setTokenBalances,
        tokenBalances,
        fetchPaymentTokenBalances,
        fetchTokenBalances,
        fetchBeastCollection,
        filterValidAdventurers,
        showTermsOfService,
        acceptTermsOfService,
        gasSpent,
        triggerGasSpent,

        openProfile: () => (connector as any)?.controller?.openProfile(),
        login: () =>
          connect({
            connector: connectors.find((conn) => conn.id === "controller"),
          }),
        logout: () => disconnect(),
      }}
    >
      {children}
    </ControllerContext.Provider>
  );
};

export const useController = () => {
  const context = useContext(ControllerContext);
  if (!context) {
    throw new Error("useController must be used within a ControllerProvider");
  }
  return context;
};
