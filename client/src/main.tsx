import { createRoot } from "react-dom/client";

import App from "./App";

// Dojo related imports
import { SoundProvider } from "@/contexts/sound";
import { QuestGuideProvider } from "@/contexts/QuestGuide";
import {
  DynamicConnectorProvider
} from "@/contexts/starknet.tsx";
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "posthog-js/react";
import "./index.css";

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2025-05-24" as const,
};

async function main() {
  createRoot(document.getElementById("root")!).render(
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={options}
    >
      <DynamicConnectorProvider>
        <Analytics />
        <SoundProvider>
          <QuestGuideProvider>
            <App />
          </QuestGuideProvider>
        </SoundProvider>
      </DynamicConnectorProvider>
    </PostHogProvider>
  );
}

main().catch((error) => {
  console.error("Failed to initialize the application:", error);
});
