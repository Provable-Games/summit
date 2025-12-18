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
import { getBeastCurrentHealth, getBeastRevivalTime } from "@/utils/beasts";

export interface ControllerContext {
  playerName: string | undefined;
  isPending: boolean;
  tokenBalances: Record<string, number>;
  setTokenBalances: (tokenBalances: Record<string, number>) => void;
  fetchTokenBalances: () => void;
  fetchPaymentTokenBalances: () => void;
  fetchBeastCollection: () => void;
  filterValidAdventurers: () => void;
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
  const { collection, setCollection, setAdventurerCollection, setLoadingCollection, setOnboarding, setCollectionSyncing } = useGameStore();
  const { getTokenBalances } = useStarknetApi();
  const { getBeastCollection, getValidAdventurers, getDungeonStats } = useGameTokens();
  const [userName, setUserName] = useState<string>();
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});

  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const { identifyAddress } = useAnalytics();

  const { games: adventurers } = useMetagameTokens({
    mintedByAddress: addAddressPadding(currentNetworkConfig.dungeon),
    owner: account?.address || "0x0",
    gameOver: true,
    sortBy: "minted_at",
    sortOrder: "desc",
    limit: 10000,
  });

  const filterValidAdventurers = async () => {
    const adventurerIds = adventurers.map(adventurer => adventurer.token_id);
    const validIds = await getValidAdventurers(adventurerIds);

    const validAdventurers = adventurers.filter(adventurer =>
      validIds.includes(adventurer.token_id)
    );

    setAdventurerCollection(
      validAdventurers.map((adventurer) => ({
        id: adventurer.token_id,
        name: adventurer.player_name,
        level: Math.floor(Math.sqrt(adventurer.score)),
        metadata: JSON.parse(adventurer.metadata || "{}"),
        soulbound: adventurer.soulbound,
      }))
    );
  };

  useEffect(() => {
    if (adventurers) {
      filterValidAdventurers();
    }
  }, [adventurers]);

  // Persist collection changes to localStorage
  useEffect(() => {
    if (collection.length > 0 && account?.address) {
      saveBeastCollectionToCache(collection, account.address);
    }
  }, [collection]);

  useEffect(() => {
    if (collection.length > 0) {
      fetchDungeonStats();
    }
  }, [collection.length]);

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

    setCollectionSyncing(true);

    // Load from cache immediately
    const cachedCollection = loadBeastCollectionFromCache(account.address);
    if (cachedCollection && cachedCollection.length > 0) {
      setCollection(cachedCollection.map((beast: Beast) => {
        let newBeast = { ...beast }
        newBeast.revival_time = getBeastRevivalTime(newBeast);
        newBeast.current_health = getBeastCurrentHealth(newBeast)
        return newBeast
      }));
      setLoadingCollection(false);

      if (cachedCollection.length > 0 && cachedCollection.every((beast: Beast) => !beast.has_claimed_potions)) {
        setOnboarding(true);
      } else {
        setOnboarding(false);
      }
    } else {
      setLoadingCollection(true);
    }

    // Fetch fresh data in the background
    try {
      const freshBeasts = await getBeastCollection(account.address);

      if (freshBeasts.length > 0 && freshBeasts.every((beast: Beast) => !beast.has_claimed_potions)) {
        setOnboarding(true);
      } else {
        setOnboarding(false);
      }

      setCollection(prevCollection => freshBeasts.map(freshBeast => {
        const beast = prevCollection.find(beast => freshBeast.token_id === beast.token_id);
        if (!beast) return freshBeast;

        return {
          ...beast,
          bonus_health: Math.max(beast.bonus_health, freshBeast.bonus_health),
          bonus_xp: Math.max(beast.bonus_xp, freshBeast.bonus_xp),
          has_claimed_potions: beast.has_claimed_potions || freshBeast.has_claimed_potions,
          revival_count: Math.max(beast.revival_count, freshBeast.revival_count),
          last_death_timestamp: Math.max(beast.last_death_timestamp, freshBeast.last_death_timestamp),
          stats: {
            spirit: Math.max(beast.stats.spirit, freshBeast.stats.spirit),
            luck: Math.max(beast.stats.luck, freshBeast.stats.luck),
            specials: beast.stats.specials || freshBeast.stats.specials,
            wisdom: beast.stats.wisdom || freshBeast.stats.wisdom,
            diplomacy: beast.stats.diplomacy || freshBeast.stats.diplomacy,
          },
          kills_claimed: Math.max(beast.kills_claimed, freshBeast.kills_claimed),
          revival_time: Math.min(beast.revival_time, freshBeast.revival_time),
          current_health: Math.max(beast.current_health, freshBeast.current_health),
          current_level: Math.max(beast.current_level, freshBeast.current_level),
          power: Math.max(beast.power, freshBeast.power),
        }
      }));
    } catch (error) {
      console.error('Error fetching beast collection:', error);
      // If fetch fails and we have cached data, keep using it
      if (!cachedCollection || cachedCollection.length === 0) {
        setCollection([]);
      }
    } finally {
      setLoadingCollection(false);
      setCollectionSyncing(false);
    }
  }

  async function fetchDungeonStats() {
    const dungeonStats = await getDungeonStats(collection.map(beast => beast.entity_hash));

    if (dungeonStats.length > 0) {
      setCollection(prevCollection => prevCollection.map(beast => {
        const dungeonStat = dungeonStats.find(stat => stat.entity_hash === beast.entity_hash);

        return {
          ...beast,
          adventurers_killed: parseInt(dungeonStat?.adventurers_killed || "0", 16),
          last_killed_by: parseInt(dungeonStat?.killed_by || "0", 16),
          last_dm_death_timestamp: parseInt(dungeonStat?.timestamp || "0", 16),
        };
      }));
    }
  }

  async function fetchTokenBalances() {
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
