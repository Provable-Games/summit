import React from "react";
import { mainnet, sepolia } from "@starknet-react/chains";
import {
  StarknetConfig,
  argent,
  braavos,
  jsonRpcProvider,
  useInjectedConnectors,
  voyager
} from "@starknet-react/core";
import CartridgeConnector from "@cartridge/connector";
import { dojoConfig } from "../../dojoConfig";
import { getContractByName } from "@dojoengine/core";

const summit_systems = getContractByName(dojoConfig.manifest, "savage_summit", "summit_systems")?.address

const cartridge = new CartridgeConnector({
  policies: [
    {
      target: summit_systems,
      method: "attack",
    },
    {
      target: summit_systems,
      method: "feed",
    }
  ],
  rpc: dojoConfig.rpcUrl,
  theme: "savage-summit",
})

export function StarknetProvider({ children }) {
  const { connectors } = useInjectedConnectors({
    recommended: [
      argent(),
      braavos(),
    ],
    includeRecommended: "onlyIfNoConnectors",
  });

  return (
    <StarknetConfig
      chains={[mainnet, sepolia]}
      provider={jsonRpcProvider({ rpc: () => ({ nodeUrl: import.meta.env.VITE_PUBLIC_NODE_URL }) })}
      connectors={[...connectors, cartridge]}
      explorer={voyager}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}