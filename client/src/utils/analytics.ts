import { usePostHog } from "posthog-js/react";

export const useAnalytics = () => {
  const posthog = usePostHog();

  const identifyAddress = ({ address }: { address: string }) => {
    posthog.identify(address, {
      wallet: address, // custom property on the person
      login_method: "controller", // optional metadata
    });
  };

  const txRevertedEvent = ({ txHash }: { txHash: string }) => {
    posthog?.capture("tx_reverted", {
      txHash,
    });
  };

  return {
    identifyAddress,
    txRevertedEvent,
  };
};
