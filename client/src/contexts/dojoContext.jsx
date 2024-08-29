import { DojoProvider } from "@dojoengine/core";
import { useSnackbar } from "notistack";
import React, { createContext, useMemo, useState } from "react";
import { RpcProvider } from 'starknet';
import { dojoConfig } from "../../dojoConfig";
import { Account } from "starknet";

export const DojoContext = createContext()

export const Dojo = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar()

  const dojoProvider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);
  const rpcProvider = useMemo(() => new RpcProvider({ nodeUrl: dojoConfig.rpcUrl, }), []);

  const [account, setAccount] = useState();

  const executeTx = async (contractName, entrypoint, calldata) => {
    if (!account) {
      return
    }

    try {
      const tx = await dojoProvider.execute(account, {
        contractName,
        entrypoint,
        calldata
      }, 'savage_summit', { maxFee: 0 });

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
        address: account?.address,
        executeTx,
      }}
    >
      {children}
    </DojoContext.Provider>
  );
};