import { useDynamicConnector } from "@/contexts/starknet";
import { useGameStore } from "@/stores/gameStore";
import { selection, Stats } from "@/types/game";
import { calculateRevivalRequired } from "@/utils/beasts";
import { translateGameEvent } from "@/utils/translation";
import { delay } from "@/utils/utils";
import { useAccount } from "@starknet-react/core";
import { useSnackbar } from "notistack";
import { CallData } from "starknet";

export const useSystemCalls = () => {
  const { summit, appliedExtraLifePotions } = useGameStore()
  const { enqueueSnackbar } = useSnackbar();
  const { account } = useAccount();
  const { currentNetworkConfig } = useDynamicConnector();

  const VRF_PROVIDER_ADDRESS = "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f"
  const SUMMIT_ADDRESS = import.meta.env.VITE_PUBLIC_SUMMIT_ADDRESS

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

      const translatedEvents = receipt.events.map((event: any) =>
        translateGameEvent(event, currentNetworkConfig.manifest)
      );

      return translatedEvents.filter(Boolean);
    } catch (error) {
      console.error("Error executing action:", error);
      forceResetAction();
    }
  };

  const waitForTransaction = async (txHash: string, retries: number) => {
    if (retries > 9) {
      throw new Error("Transaction failed");
    }

    try {
      const receipt: any = await account!.waitForTransaction(
        txHash,
        { retryInterval: 500, successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"] }
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
  const feed = (beastId: number, amount: number, corpseRequired: number) => {
    let txs: any[] = [];

    // if (corpseRequired > 0) {
    //   let corpseTokenAddress = currentNetworkConfig.tokens.erc20.find(token => token.name === "CORPSE")?.address;
    //   txs.push(approveTokens(corpseTokenAddress, corpseRequired));
    // }

    txs.push({
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "feed",
      calldata: CallData.compile([beastId, amount]),
    });

    return txs;
  };

  /**
   * Attacks a beast, optionally fighting to the death.
   * @param beasts The beasts to attack
   * @param safeAttack Whether to attack safely
   * @param vrf Whether to use VRF
   */
  const attack = (beasts: selection, safeAttack: boolean, vrf: boolean, extraLifePotions: number) => {
    let txs: any[] = [];

    let revivalPotions = calculateRevivalRequired(beasts);

    // if (revivalPotions > 0) {
    //   let reviveAddress = currentNetworkConfig.tokens.erc20.find(token => token.name === "REVIVE")?.address;
    //   txs.push(approveTokens(reviveAddress, revivalPotions));
    // }

    // if (attackPotions > 0) {
    //   let attackAddress = currentNetworkConfig.tokens.erc20.find(token => token.name === "ATTACK")?.address;
    //   txs.push(approveTokens(attackAddress, attackPotions));
    // }

    // if (extraLifePotions > 0) {
    //   let extraLifeAddress = currentNetworkConfig.tokens.erc20.find(token => token.name === "EXTRA LIFE")?.address;
    //   txs.push(approveTokens(extraLifeAddress, extraLifePotions));
    // }

    if (vrf || !safeAttack) {
      txs.push(requestRandom());
    }

    const beastsData = beasts.map(beast => [beast[0].token_id, beast[1], beast[2]]);
    txs.push({
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "attack",
      calldata: [
        safeAttack ? summit.beast.token_id : 0,
        beastsData.length,
        ...beastsData.flat(),
        revivalPotions,
        extraLifePotions,
        vrf ? 1 : 0,
      ],
    });

    return txs;
  };

  const addExtraLife = (beastId: number, extraLifePotions: number) => {
    let txs: any[] = [];

    // if (extraLifePotions > 0) {
    //   let extraLifeAddress = currentNetworkConfig.tokens.erc20.find(token => token.name === "EXTRA LIFE")?.address;
    //   txs.push(approveTokens(extraLifeAddress, extraLifePotions));
    // }

    txs.push({
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "add_extra_life",
      calldata: CallData.compile([beastId, extraLifePotions]),
    });

    return txs;
  };

  const applyStatPoints = (beastId: number, stats: Stats, skullRequired: number) => {
    let txs: any[] = [];

    // if (skullRequired > 0) {
    //   let skullTokenAddress = currentNetworkConfig.tokens.erc20.find(token => token.name === "SKULL")?.address;
    //   txs.push(approveTokens(skullTokenAddress, skullRequired));
    // }

    txs.push({
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "apply_stat_points",
      calldata: CallData.compile([beastId, stats]),
    });

    return txs;
  };

  const approveTokens = (address: string, amount: number) => {
    return {
      contractAddress: address,
      entrypoint: "approve",
      calldata: CallData.compile([SUMMIT_ADDRESS, BigInt(amount * 1e18), "0"]),
    };
  };

  const claimBeastReward = (beastIds: number[]) => {
    return {
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "claim_beast_reward",
      calldata: CallData.compile([beastIds]),
    };
  };

  const claimCorpses = (adventurerIds: number[]) => {
    return {
      contractAddress: currentNetworkConfig.tokens.erc20.find(token => token.name === "CORPSE")?.address,
      entrypoint: "claim_efficient",
      calldata: CallData.compile([adventurerIds]),
    };
  };

  const claimSkulls = (beastIds: number[]) => {
    return {
      contractAddress: currentNetworkConfig.tokens.erc20.find(token => token.name === "SKULL")?.address,
      entrypoint: "claim",
      calldata: CallData.compile([beastIds]),
    };
  };

  const applyPoison = (beastId: number, count: number) => {
    let txs: any[] = [];

    // if (count > 0) {
    //   let poisonAddress = currentNetworkConfig.tokens.erc20.find(token => token.name === "POISON")?.address;
    //   txs.push(approveTokens(poisonAddress, count));
    // }

    txs.push({
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "apply_poison",
      calldata: CallData.compile([beastId, count]),
    });

    return txs;
  };

  const requestRandom = () => {
    return {
      contractAddress: VRF_PROVIDER_ADDRESS,
      entrypoint: "request_random",
      calldata: CallData.compile({
        caller: SUMMIT_ADDRESS,
        source: { type: 0, address: account!.address },
      }),
    };
  };

  return {
    feed,
    attack,
    claimBeastReward,
    claimCorpses,
    claimSkulls,
    executeAction,
    addExtraLife,
    applyStatPoints,
    applyPoison,
    requestRandom,
  };
};
