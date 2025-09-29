import { ERC20Balances, useStarknetApi } from "@/api/starknet";
import { useAnalytics } from "@/utils/analytics";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

export interface ControllerContext {
  playerName: string | undefined;
  isPending: boolean;
  tokenBalances: ERC20Balances;
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
  const { account, isConnecting } = useAccount();
  const { connector, connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { getERC20Balances } = useStarknetApi();
  const [userName, setUserName] = useState<string>();
  const [tokenBalances, setTokenBalances] = useState<ERC20Balances>({
    revivePotions: 0,
    attackPotions: 0,
    extraLifePotions: 0,
    survivor: 0,
  });

  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const { identifyAddress } = useAnalytics();

  useEffect(() => {
    if (account) {
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

  async function fetchTokenBalances() {
    let balances = await getERC20Balances();
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
        tokenBalances,
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
