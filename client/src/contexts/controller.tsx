import { useStarknetApi } from "@/api/starknet";
import { useGameTokens } from "@/dojo/useGameTokens";
import { useGameStore } from "@/stores/gameStore";
import { useAnalytics } from "@/utils/analytics";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useGameTokens as useMetagameTokens } from "metagame-sdk/sql";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { addAddressPadding } from "starknet";
import { useDynamicConnector } from "./starknet";
import {
  loadBeastCollectionFromCache,
  saveBeastCollectionToCache,
} from "@/utils/beastCache";
import { Beast } from "@/types/game";

export interface ControllerContext {
  playerName: string | undefined;
  isPending: boolean;
  tokenBalances: Record<string, number>;
  setTokenBalances: (tokenBalances: Record<string, number>) => void;
  fetchTokenBalances: () => void;
  fetchBeastCollection: () => void;
  openProfile: () => void;
  login: () => void;
  logout: () => void;
  showTermsOfService: boolean;
  acceptTermsOfService: () => void;
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
  const { collection, setCollection, setAdventurerCollection, setLoadingCollection, setOnboarding } = useGameStore();
  const { getTokenBalances } = useStarknetApi();
  const { getBeastCollection } = useGameTokens();
  const [userName, setUserName] = useState<string>();
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});

  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const { identifyAddress } = useAnalytics();

  const { games: adventurers, loading: adventurersLoading } = useMetagameTokens({
    mintedByAddress: addAddressPadding(currentNetworkConfig.dungeon),
    owner: account?.address || "0x0",
    gameOver: true,
    sortBy: "minted_at",
    sortOrder: "desc",
    limit: 10000,
  });

  useEffect(() => {
    if (adventurers) {
      setAdventurerCollection(adventurers.map(adventurer => ({
        id: adventurer.token_id,
        name: adventurer.player_name,
        level: Math.floor(Math.sqrt(adventurer.score)),
        metadata: JSON.parse(adventurer.metadata || "{}"),
        soulbound: adventurer.soulbound,
      })));
    }
  }, [adventurers]);

  // Persist collection changes to localStorage
  useEffect(() => {
    if (account?.address && collection.length > 0) {
      saveBeastCollectionToCache(collection, account.address);
    }
  }, [collection, account?.address]);

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

    // Load from cache immediately
    const cachedCollection = loadBeastCollectionFromCache(account.address);
    if (cachedCollection && cachedCollection.length > 0) {
      setCollection(cachedCollection);
      setLoadingCollection(false);
    } else {
      setLoadingCollection(true);
    }

    // Fetch fresh data in the background
    try {
      const freshCollection = await getBeastCollection(account.address, cachedCollection);

      if (freshCollection.length > 0 && freshCollection.every((beast: Beast) => !beast.has_claimed_potions)) {
        setOnboarding(true);
      } else {
        setOnboarding(false);
      }

      // Update state with fresh/merged data
      setCollection(freshCollection);

      // Save to cache
      saveBeastCollectionToCache(freshCollection, account.address);
    } catch (error) {
      console.error('Error fetching beast collection:', error);
      // If fetch fails and we have cached data, keep using it
      if (!cachedCollection || cachedCollection.length === 0) {
        setCollection([]);
      }
    } finally {
      setLoadingCollection(false);
    }
  }

  async function fetchTokenBalances() {
    let balances = await getTokenBalances(currentNetworkConfig.tokens.erc20);
    setTokenBalances(balances);
  }

  const acceptTermsOfService = () => {
    setShowTermsOfService(false);
  };

  return (
    <ControllerContext.Provider
      value={{
        playerName: userName,
        isPending: isConnecting || isPending,
        setTokenBalances,
        tokenBalances,
        fetchTokenBalances,
        fetchBeastCollection,
        showTermsOfService,
        acceptTermsOfService,

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
