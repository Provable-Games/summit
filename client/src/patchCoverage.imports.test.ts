import { describe, expect, it, vi } from "vitest";

describe("lint-touched module imports", () => {
  it("loads modules with top-level runtime deltas", async () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });

    const modules = [
      "@/components/AttackingBeasts",
      "@/components/GameNotificationFeed",
      "@/components/dialogs/AutopilotConfigModal",
      "@/components/dialogs/BeastUpgradeModal",
      "@/components/dialogs/SummitGiftModal",
      "@/components/FinalShowdown",
      "@/contexts/QuestGuide",
      "@/contexts/sound",
      "@/utils/utils",
    ];

    for (const modulePath of modules) {
      await expect(import(modulePath)).resolves.toBeTruthy();
    }
  });
});
