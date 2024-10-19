import { DojoProvider } from "@dojoengine/core";
import { useAccount } from "@starknet-react/core";
import { useSnackbar } from "notistack";
import React, { createContext, useMemo } from "react";
import { Contract, RpcProvider, constants } from 'starknet';
import { StarknetIdNavigator } from "starknetid.js";
import { dojoConfig } from "../../dojoConfig";
import ROUTER_ABI from "../abi/router-abi.json";

export const DojoContext = createContext()

export const Dojo = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar()

  const dojoProvider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);
  const rpcProvider = useMemo(() => new RpcProvider({ nodeUrl: dojoConfig.rpcUrl, }), []);

  const starknetIdNavigator = useMemo(() => {
    return new StarknetIdNavigator(
      rpcProvider,
      constants.StarknetChainId.SN_MAIN
    );
  }, []);

  const routerContract = new Contract(
    ROUTER_ABI,
    import.meta.env.VITE_PUBLIC_EKUBO_ROUTER_ADDRESS,
    rpcProvider
  );

  const { account } = useAccount()

  const executeTx = async (calls) => {
    if (!account) {
      enqueueSnackbar('No Wallet Connected', { variant: 'warning', anchorOrigin: { vertical: 'bottom', horizontal: 'right' } })
      return
    }

    try {
      const tx = await dojoProvider.execute(account, calls, 'savage_summit');

      const receipt = await account.waitForTransaction(tx.transaction_hash, { retryInterval: 100 })

      if (receipt.execution_status === "REVERTED") {
        enqueueSnackbar('Contract error', { variant: 'error', anchorOrigin: { vertical: 'bottom', horizontal: 'right' } })
        return
      }

      return true
    } catch (ex) {
      console.log(ex)
      enqueueSnackbar(ex.issues ? ex.issues[0].message : 'Something went wrong', { variant: 'error', anchorOrigin: { vertical: 'bottom', horizontal: 'right' } })
    }
  }

  return (
    <DojoContext.Provider
      value={{
        executeTx,
        starknetIdNavigator,
        routerContract
      }}
    >
      {children}
    </DojoContext.Provider>
  );
};