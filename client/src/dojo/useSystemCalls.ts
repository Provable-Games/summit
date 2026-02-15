import { useController } from "@/contexts/controller";
import { useDynamicConnector } from "@/contexts/starknet";
import { useGameStore } from "@/stores/gameStore";
import type { selection, Stats } from "@/types/game";
import { calculateRevivalRequired } from "@/utils/beasts";
import { translateGameEvent } from "@/utils/translation";
import type { TranslatedGameEvent } from "@/utils/translation";
import { delay } from "@/utils/utils";
import { useAccount } from "@starknet-react/core";
import { useSnackbar } from "notistack";
import { CallData } from "starknet";
import type { Call } from "starknet";

type TransactionReceiptLike = {
  execution_status?: string;
  actual_fee?: { amount?: string | number | bigint } | string | number | bigint;
  events?: unknown[];
};
export type { TranslatedGameEvent } from "@/utils/translation";

/**
 * Extracts a human-readable error message from a Starknet execution error.
 * Looks for quoted strings that aren't standard error codes.
 */
const parseExecutionError = (error: unknown): string => {
  const fallback = "Error executing action";
  const isValidMessage = (m: string) =>
    m.length > 3 && !m.includes("FAILED") && !m.includes("argent/") && !m.startsWith("0x");
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  try {
    if (!error || typeof error !== "string") return fallback;

    // Try single quotes in parentheses: ('message') - common format
    const singleQuoteMatches = error.match(/\('([^']+)'\)/g);
    if (singleQuoteMatches && singleQuoteMatches.length > 0) {
      const message = singleQuoteMatches
        .map(m => m.slice(2, -2)) // Remove ('...')
        .find(isValidMessage);
      if (message) return capitalize(message);
    }

    // Try escaped double quotes: \"message\"
    const escapedMatches = error.match(/\\"([^"\\]+)\\"/g);
    if (escapedMatches && escapedMatches.length > 0) {
      const message = escapedMatches
        .map(m => m.replace(/\\"/g, ""))
        .find(isValidMessage);
      if (message) return capitalize(message);
    }

    // Try regular double quotes: "message"
    const doubleQuoteMatches = error.match(/"([^"]+)"/g);
    if (doubleQuoteMatches && doubleQuoteMatches.length > 0) {
      const message = doubleQuoteMatches
        .map(m => m.slice(1, -1)) // Remove "..."
        .find(isValidMessage);
      if (message) return capitalize(message);
    }

    return fallback;
  } catch {
    return fallback;
  }
};

export const useSystemCalls = () => {
  const { summit, autopilotEnabled } = useGameStore();
  const { account } = useAccount();
  const { currentNetworkConfig } = useDynamicConnector();
  const { triggerGasSpent, setTokenBalances } = useController();
  const { enqueueSnackbar } = useSnackbar();

  const VRF_PROVIDER_ADDRESS = "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f"
  const SUMMIT_ADDRESS = import.meta.env.VITE_PUBLIC_SUMMIT_ADDRESS
  const PAYMASTER = true;

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
  const executeAction = async (
    calls: Call[],
    forceResetAction: () => void
  ): Promise<TranslatedGameEvent[] | null | undefined> => {
    if (!account) {
      forceResetAction();
      return null;
    }

    try {
      const tx = await account.execute(calls);
      const receipt = await waitForTransaction(tx.transaction_hash, 0);

      if (receipt.execution_status === "REVERTED") {
        console.log('action failed reverted', receipt);
        forceResetAction();
        return
      }

      // Extract fee from receipt and trigger gas animation
      if (receipt.actual_fee && !PAYMASTER) {
        const rawFee: string | number | bigint =
          typeof receipt.actual_fee === "object" && receipt.actual_fee !== null
            ? receipt.actual_fee.amount ?? 0
            : receipt.actual_fee;
        const feeInWei = BigInt(rawFee || 0);
        const feeAmount = Number(feeInWei) / 1e18;

        if (feeAmount > 0) {
          triggerGasSpent(feeAmount);
          // Update STRK balance after a short delay to sync with animation
          setTimeout(() => {
            setTokenBalances((prev: Record<string, number>) => ({
              ...prev,
              STRK: Math.max(0, (prev["STRK"] || 0) - feeAmount),
            }));
          }, 1400); // Delay to let the animation start before balance updates
        }
      }

      const translatedEvents = (receipt.events || [])
        .map((event) =>
          translateGameEvent(event as Parameters<typeof translateGameEvent>[0], account.address)
        )
        .flat()
        .filter(Boolean) as TranslatedGameEvent[];

      return translatedEvents;
    } catch (error) {
      console.error("Error executing action:", error);
      if (!autopilotEnabled) {
        const executionError =
          typeof error === "object" &&
          error !== null &&
          "data" in error &&
          typeof (error as { data?: unknown }).data === "object" &&
          (error as { data?: unknown }).data !== null &&
          "execution_error" in ((error as { data: Record<string, unknown> }).data)
            ? (error as { data: { execution_error?: unknown } }).data.execution_error
            : undefined;

        enqueueSnackbar(parseExecutionError(executionError), { variant: "error" });
      }
      forceResetAction();
      return null;
    }
  };

  const waitForTransaction = async (
    txHash: string,
    retries: number
  ): Promise<TransactionReceiptLike> => {
    if (retries > 9) {
      throw new Error("Transaction failed");
    }

    if (!account) {
      throw new Error("Wallet not connected");
    }

    try {
      const receipt = await account.waitForTransaction(
        txHash,
        {
          retryInterval: 500,
          successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
        }
      );

      return receipt as unknown as TransactionReceiptLike;
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
  const feed = (beastId: number, amount: number, _corpseRequired: number) => {
    const txs: Call[] = [];

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
    const txs: Call[] = [];

    const revivalPotions = calculateRevivalRequired(beasts);

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
    const summitTokenId = safeAttack ? (summit?.beast.token_id ?? 0) : 0;
    txs.push({
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "attack",
      calldata: [
        summitTokenId,
        beastsData.length,
        ...beastsData.flat(),
        revivalPotions,
        extraLifePotions,
        (vrf || !safeAttack) ? 1 : 0,
      ],
    });

    return txs;
  };

  const addExtraLife = (beastId: number, extraLifePotions: number) => {
    const txs: Call[] = [];

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

  const applyStatPoints = (beastId: number, stats: Stats, _skullRequired: number) => {
    const txs: Call[] = [];

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

  const _approveTokens = (address: string, amount: number) => {
    return {
      contractAddress: address,
      entrypoint: "approve",
      calldata: CallData.compile([SUMMIT_ADDRESS, BigInt(amount * 1e18), "0"]),
    };
  };

  const claimRewards = (beastIds: number[]) => {
    return {
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "claim_rewards",
      calldata: CallData.compile([beastIds]),
    };
  };

  const claimQuestRewards = (beastIds: number[]) => {
    return {
      contractAddress: SUMMIT_ADDRESS,
      entrypoint: "claim_quest_rewards",
      calldata: CallData.compile([beastIds]),
    };
  };

  const claimCorpses = (adventurerIds: number[]) => {
    const corpseAddress = currentNetworkConfig.tokens.erc20.find((token: { name: string; address: string }) => token.name === "CORPSE")?.address;

    if (!corpseAddress) {
      throw new Error("CORPSE token contract not configured");
    }

    return {
      contractAddress: corpseAddress,
      entrypoint: "claim",
      calldata: CallData.compile([adventurerIds]),
    };
  };

  const claimSkulls = (beastIds: number[]) => {
    const skullAddress = currentNetworkConfig.tokens.erc20.find((token: { name: string; address: string }) => token.name === "SKULL")?.address;

    if (!skullAddress) {
      throw new Error("SKULL token contract not configured");
    }

    return {
      contractAddress: skullAddress,
      entrypoint: "claim",
      calldata: CallData.compile([beastIds]),
    };
  };

  const applyPoison = (beastId: number, count: number) => {
    const txs: Call[] = [];

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
    claimRewards,
    claimQuestRewards,
    claimCorpses,
    claimSkulls,
    executeAction,
    addExtraLife,
    applyStatPoints,
    applyPoison,
    requestRandom,
  };
};
