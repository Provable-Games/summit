import { useDynamicConnector } from "@/contexts/starknet";
import { useGameStore } from "@/stores/gameStore";
import { AppliedPotions } from "@/types/game";
import { delay } from "@/utils/utils";
import { getContractByName } from "@dojoengine/core";
import { useAccount } from "@starknet-react/core";
import { useSnackbar } from "notistack";
import { CallData } from "starknet";

export const useSystemCalls = () => {
  const { summit } = useGameStore()
  const { enqueueSnackbar } = useSnackbar();
  const { account } = useAccount();
  const { currentNetworkConfig } = useDynamicConnector();

  const namespace = currentNetworkConfig.namespace;
  const SUMMIT_ADDRESS = getContractByName(
    currentNetworkConfig.manifest,
    namespace,
    "summit_systems"
  )?.address;

  /**
   * Custom hook to handle system calls and state management in the Dojo application.
   * Provides functionality for game actions and managing optimistic updates.
   *
   * @returns An object containing system call functions:
   *   - mintAndStartGame: Function to mint a new game
   *   - startGame: Function to start a new game with a weapon
   *   - explore: Function to explore the world
   *   - attack: Function to attack a beast
   *   - flee: Function to flee from a beast
   *   - equip: Function to equip items
   *   - drop: Function to drop items
   *   - levelUp: Function to level up and purchase items
   */
  const executeAction = async (calls: any[], forceResetAction: () => void) => {
    try {
      let tx = await account!.execute(calls);
      let receipt: any = await waitForTransaction(tx.transaction_hash, 0);

      if (receipt.execution_status === "REVERTED") {
        forceResetAction();
        enqueueSnackbar('Action failed', { variant: 'warning', anchorOrigin: { vertical: 'top', horizontal: 'center' } })
        return
      }

      return true;
    } catch (error) {
      console.error("Error executing action:", error);
      forceResetAction();
      throw error;
    }
  };

  const waitForTransaction = async (txHash: string, retries: number) => {
    if (retries > 9) {
      throw new Error("Transaction failed");
    }

    try {
      const receipt: any = await account!.waitForTransaction(
        txHash,
        { retryInterval: 350 }
      );

      return receipt;
    } catch (error) {
      console.error("Error waiting for transaction :", error);
      await delay(500);
      return waitForTransaction(txHash, retries + 1);
    }
  }

  /**
   * Explores the world, optionally until encountering a beast.
   * @param beastId The ID of the beast
   * @param tillBeast Whether to explore until encountering a beast
   */
  const feed = (beastId: number, adventurerIds: number[]) => {
    return {
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "feed",
      calldata: CallData.compile([beastId, adventurerIds]),
    };
  };

  /**
   * Attacks a beast, optionally fighting to the death.
   * @param beastIds The IDs of the beasts to attack
   * @param appliedPotions The potions to apply to the beasts
   */
  const attack = (beastIds: number[], appliedPotions: AppliedPotions) => {
    return {
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "attack",
      calldata: CallData.compile([summit.beast.token_id, beastIds, appliedPotions.revive, appliedPotions.attack, appliedPotions.extraLife]),
    };
  };

  const claimStarterKit = (beastIds: number[]) => {
    return {
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "claim_starter_kit",
      calldata: CallData.compile([beastIds]),
    };
  };

  return {
    feed,
    attack,
    claimStarterKit,
    executeAction,
  };
};
