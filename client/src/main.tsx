import { createRoot } from "react-dom/client";

import App from "./App";

// Dojo related imports
import { SoundProvider } from "@/contexts/sound";
import {
  DynamicConnectorProvider,
  useDynamicConnector,
} from "@/contexts/starknet.tsx";
import { createDojoConfig } from "@dojoengine/core";
import { init } from "@dojoengine/sdk";
import { DojoSdkProvider } from "@dojoengine/sdk/react";
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { logger } from "@/utils/logger";
import "./index.css";

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2025-05-24" as const,
};

/**
 * Loading screen component displayed while the SDK initializes.
 */
function LoadingScreen() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        gap: 2,
      }}
    >
      <CircularProgress sx={{ color: '#ffd700' }} />
      <Typography sx={{ color: '#fff', fontSize: '1.1rem' }}>
        Initializing game...
      </Typography>
    </Box>
  );
}

function DojoApp() {
  const { currentNetworkConfig } = useDynamicConnector();
  const [sdk, setSdk] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeSdk() {
      try {
        const initializedSdk = await init({
          client: {
            toriiUrl: currentNetworkConfig.subscriptionUrl,
            worldAddress: currentNetworkConfig.manifest.world.address,
          },
          domain: {
            name: "Summit",
            version: "1.0",
            chainId: currentNetworkConfig.chainId,
            revision: "1",
          },
        });
        setSdk(initializedSdk);
        setInitError(null);
      } catch (error) {
        logger.error("Failed to initialize SDK:", error);
        setInitError("Failed to connect to game server. Please refresh the page.");
      }
    }

    if (currentNetworkConfig) {
      initializeSdk();
    }
  }, [currentNetworkConfig]);

  if (initError) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#1a1a2e',
          gap: 2,
          padding: 3,
        }}
      >
        <Typography sx={{ color: '#ff6b6b', fontSize: '1.1rem', textAlign: 'center' }}>
          {initError}
        </Typography>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2d5a2d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Retry
        </button>
      </Box>
    );
  }

  if (!sdk) {
    return <LoadingScreen />;
  }

  return (
    <DojoSdkProvider
      sdk={sdk}
      dojoConfig={createDojoConfig(currentNetworkConfig)}
      clientFn={() => { }}
    >
      <SoundProvider>
        <App />
      </SoundProvider>
    </DojoSdkProvider>
  );
}

async function main() {
  createRoot(document.getElementById("root")!).render(
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={options}
    >
      <DynamicConnectorProvider>
        <Analytics />
        <DojoApp />
      </DynamicConnectorProvider>
    </PostHogProvider>
  );
}

main().catch((error) => {
  console.error("Failed to initialize the application:", error);
});
