import { useStarknetApi } from "@/api/starknet";
import { useSummitApi } from "@/api/summitApi";
import { useGameTokens } from "@/dojo/useGameTokens";
import { useGameStore } from "@/stores/gameStore";
import { useAnalytics } from "@/utils/analytics";
import { delay } from "@/utils/utils";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import type {
  PropsWithChildren} from "react";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Adventurer } from "@/types/game";
import { useDynamicConnector } from "./starknet";

export interface ControllerContext {
  playerName: string | undefined;
  isPending: boolean;
  tokenBalances: Record<string, number>;
  setTokenBalances: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  fetchTokenBalances: (delayMs: number) => void;
  fetchPaymentTokenBalances: () => void;
  fetchBeastCollection: () => void;
  filterValidAdventurers: () => Promise<void>;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getConnectorUsername = async (activeConnector: unknown): Promise<string | undefined> => {
  if (!isRecord(activeConnector)) return undefined;

  const usernameFn = activeConnector.username;
  if (typeof usernameFn !== "function") return undefined;

  const username = await usernameFn.call(activeConnector);
  return typeof username === "string" && username.length > 0 ? username : undefined;
};

const openConnectorProfile = (activeConnector: unknown): void => {
  if (!isRecord(activeConnector)) return;

  const controller = activeConnector.controller;
  if (!isRecord(controller)) return;

  const openProfile = controller.openProfile;
  if (typeof openProfile === "function") {
    openProfile.call(controller);
  }
};

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

  const filterValidAdventurers = useCallback(async () => {
    const accountAddress = account?.address;
    if (!accountAddress) {
      setAdventurerCollection([]);
      return;
    }

    const validAdventurers = await getValidAdventurers(accountAddress);

    setAdventurerCollection(validAdventurers.map((adventurer): Adventurer => ({
      id: adventurer.token_id,
      name: `Adventurer #${adventurer.token_id}`,
      level: Math.floor(Math.sqrt(adventurer.score)),
      metadata: null,
      soulbound: false,
    })));
  }, [account?.address, getValidAdventurers, setAdventurerCollection]);

  useEffect(() => {
    if (account?.address) {
      filterValidAdventurers();
    }
  }, [account?.address, filterValidAdventurers]);

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
        console.log('Showing terms of service');
        setShowTermsOfService(true);
      }
    } else {
      setCollection([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  // Get username when connector changes
  useEffect(() => {
    const getUsername = async () => {
      try {
        const name = await getConnectorUsername(connector);
        if (name) setUserName(name);
      } catch (error) {
        console.error("Error getting username:", error);
      }
    };

    if (connector) getUsername();
  }, [connector]);

  const openProfile = useCallback(() => {
    openConnectorProfile(connector);
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
    const balances = await getTokenBalances(currentNetworkConfig.tokens.erc20);
    setTokenBalances(prev => ({ ...prev, ...balances }));
  }

  async function fetchPaymentTokenBalances() {
    const balances = await getTokenBalances(currentNetworkConfig.paymentTokens);
    setTokenBalances(prev => ({ ...prev, ...balances }));
  }

  const acceptTermsOfService = () => {
    setShowTermsOfService(false);
  };

  const triggerGasSpent = async (amount: number) => {
    await delay(1000);
    setGasSpent(amount);
    // Auto-clear after animation duration
    setTimeout(() => setGasSpent(null), 4000);
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

        openProfile,
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
